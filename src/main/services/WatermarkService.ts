import type { WatermarkConfig } from "@common/types";
import type { Canvas, Image } from "canvas";
import { createCanvas, loadImage } from "canvas";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, extname, join } from "path";
import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { AttachmentService } from "./AttachmentService";
import { ProjectService } from "./ProjectService";
import { TemplateService } from "./TemplateService";

export class WatermarkService {
    private attachmentService: AttachmentService;
    private projectService: ProjectService;
    private templateService: TemplateService;

    constructor() {
        this.attachmentService = new AttachmentService();
        this.projectService = new ProjectService();
        this.templateService = new TemplateService();
    }

    // Apply watermark to an attachment
    async applyWatermark(attachment_id: number, watermark_text?: string, config?: WatermarkConfig): Promise<string> {
        const attachment = this.attachmentService.getAttachment(attachment_id);
        if (!attachment) {
            throw new Error(`Attachment ${attachment_id} not found`);
        }

        // Get the original file path
        const originalPath = this.attachmentService.getAttachmentFilePath(attachment_id, false);
        if (!originalPath || !existsSync(originalPath)) {
            throw new Error("Original file not found");
        }

        // Determine watermark text if not provided
        let finalWatermarkText = watermark_text;
        if (!finalWatermarkText) {
            finalWatermarkText = await this.generateWatermarkText(attachment.project_item_id);
        }

        // Default configuration
        const defaultConfig: WatermarkConfig = {
            text: finalWatermarkText,
            position: "center",
            fontSize: 48,
            opacity: 0.3,
            rotation: -45,
            color: "#000000",
        };

        const finalConfig = { ...defaultConfig, ...config, text: finalWatermarkText };

        // Process based on file type
        let watermarkedPath: string;
        const fileType = attachment.file_type.toLowerCase();

        if (["jpg", "jpeg", "png"].includes(fileType)) {
            watermarkedPath = await this.applyImageWatermark(originalPath, attachment, finalConfig);
        } else if (fileType === "pdf") {
            watermarkedPath = await this.applyPdfWatermark(originalPath, attachment, finalConfig);
        } else {
            throw new Error(`Unsupported file type for watermarking: ${fileType}`);
        }

        // Update attachment with watermarked path (relative)
        const storagePath = this.attachmentService.getStoragePath();
        const relativePath = watermarkedPath.replace(storagePath + "\\", "").replace(storagePath + "/", "");
        this.attachmentService.setWatermarkedPath(attachment_id, relativePath);

        return watermarkedPath;
    }

    // Generate watermark text from template
    private async generateWatermarkText(project_item_id: number): Promise<string> {
        const projectItem = this.projectService.getProjectItem(project_item_id);
        if (!projectItem) return "Reimbursement";

        const project = this.projectService.getProject(projectItem.project_id);
        if (!project) return "Reimbursement";

        const templateItem = this.templateService.getTemplateItem(projectItem.template_item_id);
        if (!templateItem || !templateItem.watermark_template) {
            return `${project.creator || "User"} - ${project.name}`;
        }

        // Replace placeholders
        let text = templateItem.watermark_template;
        text = text.replace(/{userName}/g, project.creator || "User");
        text = text.replace(/{itemName}/g, templateItem.name);
        text = text.replace(/{projectName}/g, project.name);
        text = text.replace(/{date}/g, new Date().toLocaleDateString());

        return text;
    }

    // Apply watermark to image using canvas
    private async applyImageWatermark(
        originalPath: string,
        attachment: any,
        config: WatermarkConfig,
    ): Promise<string> {
        const image = await loadImage(originalPath);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext("2d");

        // Draw original image
        ctx.drawImage(image, 0, 0);

        // Configure watermark text
        ctx.globalAlpha = config.opacity || 0.3;
        ctx.fillStyle = config.color || "#000000";
        ctx.font = `${config.fontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Calculate position
        let x = canvas.width / 2;
        let y = canvas.height / 2;

        if (config.position === "top-left") {
            x = canvas.width * 0.25;
            y = canvas.height * 0.25;
        } else if (config.position === "top-right") {
            x = canvas.width * 0.75;
            y = canvas.height * 0.25;
        } else if (config.position === "bottom-left") {
            x = canvas.width * 0.25;
            y = canvas.height * 0.75;
        } else if (config.position === "bottom-right") {
            x = canvas.width * 0.75;
            y = canvas.height * 0.75;
        }

        // Apply rotation
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(((config.rotation || 0) * Math.PI) / 180);
        ctx.fillText(config.text, 0, 0);
        ctx.restore();

        // Save watermarked image
        const watermarkedDir = dirname(originalPath).replace("original", "watermarked");
        if (!existsSync(watermarkedDir)) {
            mkdirSync(watermarkedDir, { recursive: true });
        }

        const ext = extname(originalPath);
        const watermarkedPath = join(watermarkedDir, attachment.file_name.replace(ext, `_wm${ext}`));

        const buffer = canvas.toBuffer("image/png");
        writeFileSync(watermarkedPath, buffer);

        return watermarkedPath;
    }

    // Apply watermark to PDF using pdf-lib
    private async applyPdfWatermark(originalPath: string, attachment: any, config: WatermarkConfig): Promise<string> {
        const pdfBytes = readFileSync(originalPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);

        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const fontSize = config.fontSize || 48;
        const opacity = config.opacity || 0.3;
        const rotation = config.rotation || -45;

        // Parse color (hex to RGB)
        const colorHex = config.color || "#000000";
        const r = parseInt(colorHex.slice(1, 3), 16) / 255;
        const g = parseInt(colorHex.slice(3, 5), 16) / 255;
        const b = parseInt(colorHex.slice(5, 7), 16) / 255;

        // Add watermark to each page
        for (const page of pages) {
            const { width, height } = page.getSize();
            const textWidth = font.widthOfTextAtSize(config.text, fontSize);

            // Calculate position
            let x = width / 2 - textWidth / 2;
            let y = height / 2;

            if (config.position === "top-left") {
                x = width * 0.1;
                y = height * 0.9;
            } else if (config.position === "top-right") {
                x = width * 0.9 - textWidth;
                y = height * 0.9;
            } else if (config.position === "bottom-left") {
                x = width * 0.1;
                y = height * 0.1;
            } else if (config.position === "bottom-right") {
                x = width * 0.9 - textWidth;
                y = height * 0.1;
            }

            page.drawText(config.text, {
                x,
                y,
                size: fontSize,
                font,
                color: rgb(r, g, b),
                opacity,
                rotate: degrees(rotation),
            });
        }

        // Save watermarked PDF
        const watermarkedDir = dirname(originalPath).replace("original", "watermarked");
        if (!existsSync(watermarkedDir)) {
            mkdirSync(watermarkedDir, { recursive: true });
        }

        const watermarkedPath = join(watermarkedDir, attachment.file_name.replace(".pdf", "_wm.pdf"));
        const watermarkedBytes = await pdfDoc.save();
        writeFileSync(watermarkedPath, watermarkedBytes);

        return watermarkedPath;
    }
}

