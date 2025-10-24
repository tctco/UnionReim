import type { AppSettings, WatermarkConfig } from "@common/types";
import { createCanvas, loadImage } from "canvas";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, extname, join } from "path";
import { AttachmentService } from "./AttachmentService";
import { ProjectService } from "./ProjectService";
import { TemplateService } from "./TemplateService";
import { SettingsService } from "./SettingsService";
import { DEFAULT_WATERMARK_SETTINGS, WATERMARK_IMAGE_EXTS } from "@common/constants";
/**
 * WatermarkService applies text watermarks to image attachments.
 * It relies on current AppSettings as defaults and supports overrides per call.
 */

export class WatermarkService {
    private attachmentService: AttachmentService;
    private projectService: ProjectService;
    private templateService: TemplateService;
    private settingsService: SettingsService;

    constructor() {
        this.attachmentService = new AttachmentService();
        this.projectService = new ProjectService();
        this.templateService = new TemplateService();
        this.settingsService = new SettingsService();
    }

    /**
     * Apply a watermark to an attachment, producing a new watermarked file on disk.
     * Returns the absolute path to the generated watermarked file.
     */
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

        // Merge settings and config
        const appSettings: AppSettings = this.settingsService.getAppSettings();
        const wm = appSettings.watermark || DEFAULT_WATERMARK_SETTINGS;

        // Determine watermark text
        let finalWatermarkText = watermark_text;
        if (!finalWatermarkText) {
            if (wm.textMode === 'custom' && wm.customText && wm.customText.trim()) {
                finalWatermarkText = wm.customText.trim();
            } else {
                finalWatermarkText = await this.generateWatermarkText(attachment.project_item_id);
            }
        }

        const defaultConfig: WatermarkConfig = {
            text: finalWatermarkText,
            xPercent: wm.xPercent ?? 50,
            yPercent: wm.yPercent ?? 50,
            fontSize: wm.fontSize ?? 48,
            opacity: wm.opacity ?? 0.3,
            rotation: wm.rotation ?? -45,
            color: wm.color ?? '#000000',
            fontFamily: wm.fontFamily ?? 'Arial',
            bold: wm.bold ?? false,
        };

        const finalConfig: WatermarkConfig = { ...defaultConfig, ...config, text: finalWatermarkText };

        // Process based on file type
        let watermarkedPath: string;
        const fileType = attachment.file_type.toLowerCase();

        if ((WATERMARK_IMAGE_EXTS as readonly string[]).includes(fileType)) {
            watermarkedPath = await this.applyImageWatermark(originalPath, attachment, finalConfig);
        } else {
            throw new Error(`Unsupported file type for watermarking: ${fileType}`);
        }

        // Update attachment with watermarked path (relative)
        const storagePath = this.attachmentService.getStoragePath();
        const relativePath = watermarkedPath.replace(storagePath + "\\", "").replace(storagePath + "/", "");
        this.attachmentService.setWatermarkedPath(attachment_id, relativePath);

        return watermarkedPath;
    }

    /** Return the resolved watermark text that would be used if applying now (without explicit override). */
    async resolveWatermarkText(attachment_id: number): Promise<string> {
        const attachment = this.attachmentService.getAttachment(attachment_id);
        if (!attachment) throw new Error(`Attachment ${attachment_id} not found`);

        const settingsService = new SettingsService();
        const appSettings = settingsService.getAppSettings();
        const wm = appSettings.watermark || DEFAULT_WATERMARK_SETTINGS;

        if (wm.textMode === 'custom' && wm.customText && wm.customText.trim().length > 0) {
            return wm.customText.trim();
        }
        // fallback to template-derived text
        return await this.generateWatermarkText(attachment.project_item_id);
    }

    /** Build watermark text from project/template placeholders if none is provided explicitly. */
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

    /** Render the watermark onto a raster image using node-canvas. */
    private async applyImageWatermark(
        originalPath: string,
        attachment: { file_name: string },
        config: WatermarkConfig,
    ): Promise<string> {
        // Load image from buffer to avoid platform-specific path resolution issues
        const imgBuffer = readFileSync(originalPath);
        const image = await loadImage(imgBuffer);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext("2d");

        // Draw original image
        ctx.drawImage(image, 0, 0);

        // Configure watermark text
        const opacity = config.opacity ?? 0.3;
        const color = config.color ?? "#000000";
        const fontSize = config.fontSize ?? 48;
        const fontFamily = config.fontFamily ?? 'Arial';
        const bold = config.bold ? 'bold ' : '';
        const xPercent = Math.max(0, Math.min(100, config.xPercent ?? 50));
        const yPercent = Math.max(0, Math.min(100, config.yPercent ?? 50));
        const rotation = config.rotation ?? -45;

        const x = (xPercent / 100) * canvas.width;
        const y = (yPercent / 100) * canvas.height;

        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        const italic = config.italic ? 'italic ' : '';
        ctx.font = `${italic}${bold}${fontSize}px ${fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Apply rotation with center anchor, support multi-line text (\n)
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(((rotation || 0) * Math.PI) / 180);

        const lines = String(config.text || "").split(/\r?\n/);
        const lineHeight = Math.max(1, Math.round(fontSize * 1.2));
        const startY = -((lines.length - 1) * lineHeight) / 2;
        for (let i = 0; i < lines.length; i++) {
            const ly = startY + i * lineHeight;
            const line = lines[i];
            ctx.fillText(line, 0, ly);
            if (config.underline) {
                const metrics = ctx.measureText(line);
                const underlineY = ly + (metrics.actualBoundingBoxDescent || 0) * 0.2;
                const width = metrics.width;
                ctx.beginPath();
                ctx.moveTo(-width / 2, underlineY);
                ctx.lineTo(width / 2, underlineY);
                ctx.lineWidth = Math.max(1, Math.round(fontSize / 15));
                ctx.strokeStyle = color;
                ctx.stroke();
            }
        }
        ctx.restore();

        // Save watermarked image
        const watermarkedDir = dirname(originalPath).replace("original", "watermarked");
        if (!existsSync(watermarkedDir)) {
            mkdirSync(watermarkedDir, { recursive: true });
        }

        const ext = extname(originalPath).toLowerCase();
        let outExt = ext;
        let outBuffer: Buffer;
        if (ext === ".jpg" || ext === ".jpeg") {
            outExt = ".jpg";
            // Encode as JPEG if original was JPEG
            outBuffer = canvas.toBuffer("image/jpeg");
        } else {
            outExt = ".png";
            outBuffer = canvas.toBuffer("image/png");
        }

        const watermarkedPath = join(
            watermarkedDir,
            attachment.file_name.replace(ext, `_wm${outExt}`),
        );

        writeFileSync(watermarkedPath, outBuffer);

        return watermarkedPath;
    }

    // PDF watermarking intentionally not supported in current version.
}
