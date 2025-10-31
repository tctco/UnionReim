import type { ProjectMetadata, TemplateExportManifest, DocumentTemplateExportManifest, TemplateWithItems } from "@common/types";
import AdmZip from "adm-zip";
import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { AttachmentService } from "./AttachmentService";
import { ProjectService } from "./ProjectService";
import { TemplateService } from "./TemplateService";
import { DocumentService } from "./DocumentService";

interface ExportManifest {
    version: string;
    export_time: number;
    project: {
        name: string;
        creator?: string;
        metadata?: ProjectMetadata;
    };
    template: {
        name: string;
        description?: string;
        items: Array<{
            name: string;
            description?: string;
            is_required: boolean;
            file_types?: string[];
            needs_watermark: boolean;
            watermark_template?: string;
            allows_multiple_files: boolean;
            display_order: number;
            category?: string;
        }>;
    };
    items: Array<{
        item_name: string;
        files: Array<{
            original_name: string;
            file_name: string;
            has_watermark: boolean;
            watermarked_file_name?: string;
            expenditure?: number;
        }>;
    }>;
}

export class ExportImportService {
    private projectService: ProjectService;
    private templateService: TemplateService;
    private attachmentService: AttachmentService;
    private documentService: DocumentService;

    constructor() {
        this.projectService = new ProjectService();
        this.templateService = new TemplateService();
        this.attachmentService = new AttachmentService();
        this.documentService = new DocumentService();
    }

    /**
     * Returns true if the manifest template definition is equivalent to an existing template with items.
     */
    private areTemplatesEquivalent(manifestTemplate: ExportManifest["template"], existing: TemplateWithItems): boolean {
        // Compare basic fields
        const manifestDesc = manifestTemplate.description ?? undefined;
        const existingDesc = existing.description ?? undefined;
        if (manifestDesc !== existingDesc) return false;

        // Compare items by name (order-insensitive)
        const manifestItems = manifestTemplate.items || [];
        const existingItems = existing.items || [];

        if (manifestItems.length !== existingItems.length) return false;

        const toKey = (arr?: string[]) => (arr || []).slice().sort().join("|");
        const existingByName = new Map(existingItems.map((i) => [i.name, i]));

        for (const mi of manifestItems) {
            const ei = existingByName.get(mi.name);
            if (!ei) return false;

            const miDesc = mi.description ?? undefined;
            const eiDesc = ei.description ?? undefined;

            if (miDesc !== eiDesc) return false;
            if (Boolean(mi.is_required) !== Boolean(ei.is_required)) return false;
            if (toKey(mi.file_types) !== toKey(ei.file_types)) return false;
            if (Boolean(mi.needs_watermark) !== Boolean(ei.needs_watermark)) return false;
            const miWm = mi.watermark_template ?? undefined;
            const eiWm = ei.watermark_template ?? undefined;
            if (miWm !== eiWm) return false;
            if (Boolean(mi.allows_multiple_files) !== Boolean(ei.allows_multiple_files)) return false;
            if ((mi.display_order ?? 0) !== (ei.display_order ?? 0)) return false;
            const miCat = mi.category ?? undefined;
            const eiCat = ei.category ?? undefined;
            if (miCat !== eiCat) return false;
        }

        return true;
    }

    // Export a project to ZIP
    async exportProject(project_id: number, destination_path?: string): Promise<string> {
        const projectDetails = this.projectService.getProjectWithDetails(project_id);
        if (!projectDetails) {
            throw new Error(`Project ${project_id} not found`);
        }

        // Create ZIP
        const zip = new AdmZip();

        // Build manifest
        const manifest: ExportManifest = {
            version: "1.0",
            export_time: Date.now(),
            project: {
                name: projectDetails.name,
                creator: projectDetails.creator,
                metadata: projectDetails.metadata,
            },
            template: {
                name: projectDetails.template.name,
                description: projectDetails.template.description,
                items: [],
            },
            items: [],
        };

        // Add template items to manifest
        for (const item of projectDetails.items) {
            manifest.template.items.push({
                name: item.template_item.name,
                description: item.template_item.description,
                is_required: item.template_item.is_required,
                file_types: item.template_item.file_types,
                needs_watermark: item.template_item.needs_watermark,
                watermark_template: item.template_item.watermark_template,
                allows_multiple_files: item.template_item.allows_multiple_files,
                display_order: item.template_item.display_order,
                category: item.template_item.category,
            });

            // Add files for this item
            const itemFiles: ExportManifest["items"][0]["files"] = [];

            for (const attachment of item.attachments) {
                const originalPath = this.attachmentService.getAttachmentFilePath(attachment.attachment_id, false);
                if (originalPath && existsSync(originalPath)) {
                    const fileBuffer = readFileSync(originalPath);
                    zip.addFile(`files/${item.template_item.name}/${attachment.file_name}`, fileBuffer);

                    itemFiles.push({
                        original_name: attachment.original_name,
                        file_name: attachment.file_name,
                        has_watermark: attachment.has_watermark,
                        expenditure: (attachment as unknown as { expenditure?: number }).expenditure ?? 0,
                    });

                    // Add watermarked version if exists
                    if (attachment.has_watermark && attachment.watermarked_path) {
                        const watermarkedPath = this.attachmentService.getAttachmentFilePath(
                            attachment.attachment_id,
                            true,
                        );
                        if (watermarkedPath && existsSync(watermarkedPath)) {
                            const watermarkedBuffer = readFileSync(watermarkedPath);
                            const watermarkedFileName = attachment.file_name.replace(
                                /(\.[^.]+)$/,
                                "_wm$1",
                            );
                            zip.addFile(`files/${item.template_item.name}/${watermarkedFileName}`, watermarkedBuffer);
                            itemFiles[itemFiles.length - 1].watermarked_file_name = watermarkedFileName;
                        }
                    }
                }
            }

            if (itemFiles.length > 0) {
                manifest.items.push({
                    item_name: item.template_item.name,
                    files: itemFiles,
                });
            }
        }

        // Add manifest to ZIP
        zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2)));

        // Determine export path
        let exportPath = destination_path;
        if (!exportPath) {
            const exportDir = join(
                this.attachmentService.getStoragePath(),
                String(project_id),
                "export",
            );
            if (!existsSync(exportDir)) {
                mkdirSync(exportDir, { recursive: true });
            }
            exportPath = join(exportDir, `${projectDetails.name.replace(/[^a-zA-Z0-9]/g, "_")}.zip`);
        }

        // Write ZIP file
        zip.writeZip(exportPath);

        // Update project status
        this.projectService.updateProject({
            project_id,
            status: "exported",
        });

        return exportPath;
    }

    // Export a document template to JSON
    async exportDocument(document_id: number, destination_path?: string): Promise<string> {
        const doc = this.documentService.getTemplate(document_id);
        if (!doc) {
            throw new Error(`Document ${document_id} not found`);
        }

        const manifest: DocumentTemplateExportManifest = {
            version: "1.0",
            export_time: Date.now(),
            document: {
                name: doc.name,
                description: doc.description,
                creator: doc.creator,
                content_html: doc.content_html,
            },
        };

        // Determine export path
        let exportPath = destination_path;
        if (!exportPath) {
            const safeName = doc.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_");
            const exportDir = join(app.getPath("documents"), "reimbursement_exports");
            if (!existsSync(exportDir)) {
                mkdirSync(exportDir, { recursive: true });
            }
            exportPath = join(exportDir, `document_${safeName}.json`);
        }

        writeFileSync(exportPath, JSON.stringify(manifest, null, 2), { encoding: "utf8" });
        return exportPath;
    }

    // Import a document template from JSON
    async importDocument(json_path: string): Promise<number> {
        if (!existsSync(json_path)) {
            throw new Error("Document file not found");
        }

        const manifestContent = readFileSync(json_path, "utf8");
        const manifest: DocumentTemplateExportManifest = JSON.parse(manifestContent);

        if (manifest.version !== "1.0") {
            throw new Error(`Unsupported document version: ${manifest.version}`);
        }

        const existing = this.documentService.listTemplates();
        const same = existing.find((d) => d.name === manifest.document.name);
        let name = manifest.document.name;
        if (same) {
            let counter = 1;
            while (existing.some((d) => d.name === `${manifest.document.name} (${counter})`)) {
                counter++;
            }
            name = `${manifest.document.name} (${counter})`;
        }

        const created = this.documentService.createTemplate({
            name,
            description: manifest.document.description,
            creator: manifest.document.creator,
            content_html: manifest.document.content_html,
        });

        return created.document_id;
    }

    // Import a project from ZIP
    async importProject(zip_path: string): Promise<number> {
        if (!existsSync(zip_path)) {
            throw new Error("ZIP file not found");
        }

        // Extract ZIP
        const zip = new AdmZip(zip_path);
        const zipEntries = zip.getEntries();

        // Find and parse manifest
        const manifestEntry = zipEntries.find((entry) => entry.entryName === "manifest.json");
        if (!manifestEntry) {
            throw new Error("Invalid export package: manifest.json not found");
        }

        const manifest: ExportManifest = JSON.parse(manifestEntry.getData().toString("utf8"));

        // Validate version
        if (manifest.version !== "1.0") {
            throw new Error(`Unsupported export version: ${manifest.version}`);
        }

        // Create or find template with deep equality check
        const templates = this.templateService.listTemplates();
        let template = templates.find((t) => t.name === manifest.template.name);

        let reuseExisting = false;
        if (template) {
            const existingWithItems = this.templateService.getTemplateWithItems(template.template_id);
            if (existingWithItems && this.areTemplatesEquivalent(manifest.template, existingWithItems)) {
                reuseExisting = true;
            }
        }

        if (!template || !reuseExisting) {
            // Create new template (generate unique name if needed)
            let templateName = manifest.template.name;
            if (templates.some((t) => t.name === templateName)) {
                let counter = 1;
                while (templates.some((t) => t.name === `${manifest.template.name} (${counter})`)) {
                    counter++;
                }
                templateName = `${manifest.template.name} (${counter})`;
            }

            template = this.templateService.createTemplate({
                name: templateName,
                description: manifest.template.description,
            });

            // Create template items
            for (const itemDef of manifest.template.items) {
                this.templateService.createTemplateItem({
                    template_id: template.template_id,
                    ...itemDef,
                });
            }
        }

        // Create project
        const project = this.projectService.createProject({
            template_id: template.template_id,
            name: manifest.project.name,
            creator: manifest.project.creator,
            metadata: manifest.project.metadata,
        });

        // Get project details to access project items
        const projectDetails = this.projectService.getProjectWithDetails(project.project_id);
        if (!projectDetails) {
            throw new Error("Failed to create project");
        }

        // Import files for each item
        for (const manifestItem of manifest.items) {
            // Find matching project item
            const projectItem = projectDetails.items.find(
                (pi) => pi.template_item.name === manifestItem.item_name,
            );

            if (!projectItem) continue;

            // Import each file
            for (const fileInfo of manifestItem.files) {
                const fileEntry = zipEntries.find(
                    (entry) => entry.entryName === `files/${manifestItem.item_name}/${fileInfo.file_name}`,
                );

                if (!fileEntry) continue;

                // Extract file to temp location
                const tempDir = join(app.getPath("temp"), "reimbursement-import", String(Date.now()));
                if (!existsSync(tempDir)) {
                    mkdirSync(tempDir, { recursive: true });
                }

                const tempFilePath = join(tempDir, fileInfo.file_name);
                writeFileSync(tempFilePath, fileEntry.getData());

                // Upload file
                const attachment = this.attachmentService.uploadAttachment(
                    projectItem.project_item_id,
                    tempFilePath,
                    fileInfo.original_name,
                );

                // Restore expenditure if present in manifest
                const exp = (fileInfo as unknown as { expenditure?: number }).expenditure;
                if (typeof exp === 'number' && Number.isFinite(exp)) {
                    try { this.attachmentService.setExpenditure(attachment.attachment_id, exp); } catch { /* ignore */ }
                }

                // Import watermarked version if exists
                if (fileInfo.has_watermark && fileInfo.watermarked_file_name) {
                    const watermarkedEntry = zipEntries.find(
                        (entry) =>
                            entry.entryName === `files/${manifestItem.item_name}/${fileInfo.watermarked_file_name}`,
                    );

                    if (watermarkedEntry) {
                        const watermarkedTempPath = join(tempDir, fileInfo.watermarked_file_name);
                        writeFileSync(watermarkedTempPath, watermarkedEntry.getData());

                        // Copy to watermarked directory
                        const watermarkedDir = join(
                            this.attachmentService.getStoragePath(),
                            String(project.project_id),
                            "items",
                            String(projectItem.project_item_id),
                            "watermarked",
                        );

                        if (!existsSync(watermarkedDir)) {
                            mkdirSync(watermarkedDir, { recursive: true });
                        }

                        const watermarkedDestPath = join(watermarkedDir, fileInfo.watermarked_file_name);
                        writeFileSync(watermarkedDestPath, watermarkedEntry.getData());

                        // Update attachment with watermarked path
                        const relativePath = join(
                            String(project.project_id),
                            "items",
                            String(projectItem.project_item_id),
                            "watermarked",
                            fileInfo.watermarked_file_name,
                        );
                        this.attachmentService.setWatermarkedPath(attachment.attachment_id, relativePath);
                    }
                }
            }
        }

        return project.project_id;
    }

    // Export a template to JSON file
    async exportTemplate(template_id: number, destination_path?: string): Promise<string> {
        const templateDetails = this.templateService.getTemplateWithItems(template_id);
        if (!templateDetails) {
            throw new Error(`Template ${template_id} not found`);
        }

        // Build manifest
        const manifest: TemplateExportManifest = {
            version: "1.0",
            export_time: Date.now(),
            template: {
                name: templateDetails.name,
                description: templateDetails.description,
                creator: templateDetails.creator,
                items: templateDetails.items.map(item => ({
                    name: item.name,
                    description: item.description,
                    is_required: item.is_required,
                    file_types: item.file_types,
                    needs_watermark: item.needs_watermark,
                    watermark_template: item.watermark_template,
                    allows_multiple_files: item.allows_multiple_files,
                    display_order: item.display_order,
                    category: item.category,
                })),
            },
        };

        // Determine export path
        let exportPath = destination_path;
        if (!exportPath) {
            const exportDir = join(app.getPath("userData"), "exports", "templates");
            if (!existsSync(exportDir)) {
                mkdirSync(exportDir, { recursive: true });
            }
            const fileName = `${templateDetails.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_")}_template.json`;
            exportPath = join(exportDir, fileName);
        }

        // Write JSON file
        writeFileSync(exportPath, JSON.stringify(manifest, null, 2), 'utf8');

        return exportPath;
    }

    // Import a template from JSON file
    async importTemplate(json_path: string): Promise<number> {
        if (!existsSync(json_path)) {
            throw new Error("Template file not found");
        }

        // Read and parse manifest
        const manifestContent = readFileSync(json_path, 'utf8');
        const manifest: TemplateExportManifest = JSON.parse(manifestContent);

        // Validate version
        if (manifest.version !== "1.0") {
            throw new Error(`Unsupported template version: ${manifest.version}`);
        }

        // Check if template with same name already exists
        const existingTemplates = this.templateService.listTemplates();
        const existingTemplate = existingTemplates.find(t => t.name === manifest.template.name);
        
        let templateName = manifest.template.name;
        if (existingTemplate) {
            // Generate unique name
            let counter = 1;
            while (existingTemplates.some(t => t.name === `${manifest.template.name} (${counter})`)) {
                counter++;
            }
            templateName = `${manifest.template.name} (${counter})`;
        }

        // Create template
        const template = this.templateService.createTemplate({
            name: templateName,
            description: manifest.template.description,
            creator: manifest.template.creator,
            is_default: false,
        });

        // Create template items
        for (const itemDef of manifest.template.items) {
            this.templateService.createTemplateItem({
                template_id: template.template_id,
                ...itemDef,
            });
        }

        return template.template_id;
    }

    // Export multiple templates to ZIP
    async exportMultipleTemplates(template_ids: number[], destination_path?: string): Promise<string> {
        if (template_ids.length === 0) {
            throw new Error("No templates selected for export");
        }

        // Create ZIP
        const zip = new AdmZip();
        const exportedTemplates: TemplateExportManifest[] = [];

        for (const template_id of template_ids) {
            const templateDetails = this.templateService.getTemplateWithItems(template_id);
            if (!templateDetails) continue;

            const manifest: TemplateExportManifest = {
                version: "1.0",
                export_time: Date.now(),
                template: {
                    name: templateDetails.name,
                    description: templateDetails.description,
                    creator: templateDetails.creator,
                    items: templateDetails.items.map(item => ({
                        name: item.name,
                        description: item.description,
                        is_required: item.is_required,
                        file_types: item.file_types,
                        needs_watermark: item.needs_watermark,
                        watermark_template: item.watermark_template,
                        allows_multiple_files: item.allows_multiple_files,
                        display_order: item.display_order,
                        category: item.category,
                    })),
                },
            };

            exportedTemplates.push(manifest);

            // Add individual template file to ZIP
            const fileName = `${templateDetails.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_")}.json`;
            zip.addFile(fileName, Buffer.from(JSON.stringify(manifest, null, 2)));
        }

        // Add batch manifest
        const batchManifest = {
            version: "1.0",
            export_time: Date.now(),
            template_count: exportedTemplates.length,
            templates: exportedTemplates.map(t => ({
                name: t.template.name,
                creator: t.template.creator,
                item_count: t.template.items.length,
            })),
        };
        zip.addFile("batch_manifest.json", Buffer.from(JSON.stringify(batchManifest, null, 2)));

        // Determine export path
        let exportPath = destination_path;
        if (!exportPath) {
            const exportDir = join(app.getPath("userData"), "exports", "templates");
            if (!existsSync(exportDir)) {
                mkdirSync(exportDir, { recursive: true });
            }
            exportPath = join(exportDir, `templates_batch_${Date.now()}.zip`);
        }

        // Write ZIP file
        zip.writeZip(exportPath);

        return exportPath;
    }

    // Import templates from ZIP
    async importTemplatesFromZip(zip_path: string): Promise<number[]> {
        if (!existsSync(zip_path)) {
            throw new Error("ZIP file not found");
        }

        // Extract ZIP
        const zip = new AdmZip(zip_path);
        const zipEntries = zip.getEntries();

        const importedTemplateIds: number[] = [];

        // Process each JSON file in the ZIP
        for (const entry of zipEntries) {
            if (entry.entryName.endsWith('.json') && entry.entryName !== 'batch_manifest.json') {
                try {
                    const manifestContent = entry.getData().toString('utf8');
                    const manifest: TemplateExportManifest = JSON.parse(manifestContent);

                    if (manifest.version !== "1.0") {
                        console.warn(`Skipping template with unsupported version: ${manifest.version}`);
                        continue;
                    }

                    // Check if template with same name already exists
                    const existingTemplates = this.templateService.listTemplates();
                    let templateName = manifest.template.name;
                    
                    if (existingTemplates.some(t => t.name === templateName)) {
                        // Generate unique name
                        let counter = 1;
                        while (existingTemplates.some(t => t.name === `${manifest.template.name} (${counter})`)) {
                            counter++;
                        }
                        templateName = `${manifest.template.name} (${counter})`;
                    }

                    // Create template
                    const template = this.templateService.createTemplate({
                        name: templateName,
                        description: manifest.template.description,
                        creator: manifest.template.creator,
                        is_default: false,
                    });

                    // Create template items
                    for (const itemDef of manifest.template.items) {
                        this.templateService.createTemplateItem({
                            template_id: template.template_id,
                            ...itemDef,
                        });
                    }

                    importedTemplateIds.push(template.template_id);
                } catch (error) {
                    console.error(`Failed to import template from ${entry.entryName}:`, error);
                }
            }
        }

        if (importedTemplateIds.length === 0) {
            throw new Error("No valid templates found in ZIP file");
        }

        return importedTemplateIds;
    }
}


