import type {
    CreateProjectRequest,
    CreateTemplateItemRequest,
    CreateTemplateRequest,
    MultipleTemplateExportRequest,
    SettingsUpdateRequest,
    TemplateExportRequest,
    TemplateImportRequest,
    UpdateProjectRequest,
    UpdateTemplateItemRequest,
    UpdateTemplateRequest,
    Attachment,
} from "@common/types";
import { BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from "electron";
import { respond } from "./ipcUtils";
import { ALLOWED_ATTACHMENT_EXTS } from "@common/constants";
import { getFonts } from "font-list";
import { AttachmentService } from "../services/AttachmentService";
import { ExportImportService } from "../services/ExportImportService";
import { ProjectService } from "../services/ProjectService";
import { SettingsService } from "../services/SettingsService";
import { TemplateService } from "../services/TemplateService";
import { WatermarkService } from "../services/WatermarkService";
import { PrintService } from "../services/PrintService";
import { basename } from "path";

export function registerIpcHandlers(): void {
    const settingsService = new SettingsService();
    const templateService = new TemplateService();
    const projectService = new ProjectService();
    const attachmentService = new AttachmentService();
    const watermarkService = new WatermarkService();
    const exportImportService = new ExportImportService();
    const printService = new PrintService();

    // Settings handlers
    ipcMain.handle("settings:get", respond(() => settingsService.getAppSettings()));

    // Fonts handlers
    ipcMain.handle("fonts:list", respond(async () => {
        const fonts = await getFonts({ disableQuoting: true });
        return fonts;
    }));

    ipcMain.handle("settings:update", respond((request: SettingsUpdateRequest) => {
        settingsService.updateAppSettings(request.settings);
        const updatedSettings = settingsService.getAppSettings();
        // Broadcast settings change to all renderer windows
        for (const win of BrowserWindow.getAllWindows()) {
            win.webContents.send("settings:changed", updatedSettings);
        }
        return updatedSettings;
    }));

    ipcMain.handle("settings:getSetting", respond((key: string) => settingsService.getSetting(key)));

    ipcMain.handle("settings:setSetting", respond((key: string, value: string) => {
        settingsService.setSetting(key, value);
        const updatedSettings = settingsService.getAppSettings();
        for (const win of BrowserWindow.getAllWindows()) {
            win.webContents.send("settings:changed", updatedSettings);
        }
        return true;
    }, { successFromBoolean: true }));

    // Template handlers
    ipcMain.handle("template:create", respond((request: CreateTemplateRequest) => templateService.createTemplate(request)));

    ipcMain.handle("template:list", respond((filter?: { search?: string }) => templateService.listTemplates(filter)));

    ipcMain.handle("template:get", respond((template_id: number) => {
        const template = templateService.getTemplateWithItems(template_id);
        if (!template) {
            throw new Error("Template not found");
        }
        return template;
    }));

    ipcMain.handle("template:update", respond((request: UpdateTemplateRequest) => {
        const template = templateService.updateTemplate(request);
        if (!template) throw new Error("Template not found");
        return template;
    }));

    ipcMain.handle("template:delete", respond((template_id: number) => templateService.deleteTemplate(template_id), { successFromBoolean: true }));

    ipcMain.handle("template:safeDelete", respond((template_id: number) => templateService.safeDeleteTemplate(template_id)));

    ipcMain.handle("template:checkModification", respond((template_id: number, critical_changes?: boolean) => templateService.canModifyTemplateItem(template_id, critical_changes)));

    ipcMain.handle("template:getAssociatedProjects", respond((template_id: number) => templateService.getAssociatedProjects(template_id)));

    ipcMain.handle("template:export", respond(async (request: TemplateExportRequest) => {
        // Get template details for generating default filename
        const template = templateService.getTemplate(request.template_id);
        let defaultFileName = `template_${request.template_id}.json`;
        if (template) {
            const templateName = template.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_");
            defaultFileName = `template_${templateName}.json`;
        }
        const result = await dialog.showSaveDialog({
            defaultPath: defaultFileName,
            filters: [{ name: "JSON Files", extensions: ["json"] }],
        });
        if (result.canceled || !result.filePath) {
            throw new Error("Export canceled");
        }
        const exportPath = await exportImportService.exportTemplate(request.template_id, result.filePath);
        return exportPath;
    }));

    // System utilities
    ipcMain.handle("system:selectDirectory", respond(async () => {
        const result = await dialog.showOpenDialog({
            properties: ["openDirectory", "createDirectory"],
        });
        if (result.canceled || result.filePaths.length === 0) {
            return null; // signify canceled selection
        }
        return result.filePaths[0];
    }));

    ipcMain.handle("template:import", respond(async (_request: TemplateImportRequest) => {
        const result = await dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [{ name: "JSON Files", extensions: ["json"] }],
        });
        if (result.canceled || result.filePaths.length === 0) {
            throw new Error("Import canceled");
        }
        const template_id = await exportImportService.importTemplate(result.filePaths[0]);
        return template_id;
    }));

    ipcMain.handle("template:exportMultiple", respond(async (request: MultipleTemplateExportRequest) => {
        const result = await dialog.showSaveDialog({
            defaultPath: `templates_batch_${Date.now()}.zip`,
            filters: [{ name: "ZIP Files", extensions: ["zip"] }],
        });
        if (result.canceled || !result.filePath) {
            throw new Error("Export canceled");
        }
        const exportPath = await exportImportService.exportMultipleTemplates(request.template_ids, result.filePath);
        return exportPath;
    }));

    ipcMain.handle("template:importFromZip", respond(async (_zip_path: string) => {
        const result = await dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [{ name: "ZIP Files", extensions: ["zip"] }],
        });
        if (result.canceled || result.filePaths.length === 0) {
            throw new Error("Import canceled");
        }
        const template_ids = await exportImportService.importTemplatesFromZip(result.filePaths[0]);
        return template_ids;
    }));

    ipcMain.handle("template:clone", respond((template_id: number, new_name: string) => {
        const template = templateService.cloneTemplate(template_id, new_name);
        if (!template) throw new Error("Failed to clone template");
        return template;
    }));

    // Template item handlers
    ipcMain.handle("templateItem:create", respond((request: CreateTemplateItemRequest) => templateService.createTemplateItem(request)));

    ipcMain.handle("templateItem:update", respond((request: UpdateTemplateItemRequest) => {
        const item = templateService.updateTemplateItem(request);
        if (!item) throw new Error("Template item not found");
        return item;
    }));

    ipcMain.handle("templateItem:delete", respond((item_id: number) => templateService.deleteTemplateItem(item_id), { successFromBoolean: true }));

    ipcMain.handle("templateItem:safeDelete", respond((item_id: number) => templateService.safeDeleteTemplateItem(item_id)));

    // Project handlers
    ipcMain.handle("project:create", respond((request: CreateProjectRequest) => projectService.createProject(request)));

    ipcMain.handle("project:list", respond((filter?: { search?: string; status?: string; template_id?: number }) => projectService.listProjects(filter)));

    ipcMain.handle("project:get", respond((project_id: number) => {
        const project = projectService.getProjectWithDetails(project_id);
        if (!project) throw new Error("Project not found");
        return project;
    }));

    ipcMain.handle("project:update", respond((request: UpdateProjectRequest) => {
        const project = projectService.updateProject(request);
        if (!project) throw new Error("Project not found");
        return project;
    }));

    ipcMain.handle("project:delete", respond((project_id: number) => projectService.deleteProject(project_id), { successFromBoolean: true }));

    ipcMain.handle("project:checkComplete", respond((project_id: number) => projectService.checkProjectComplete(project_id)));

    // Attachment handlers
    ipcMain.handle("attachment:upload", respond(async (project_item_id: number) => {
        // Show file picker
        const result = await dialog.showOpenDialog({
            properties: ["openFile", "multiSelections"],
            filters: [
                { name: "Documents", extensions: [...ALLOWED_ATTACHMENT_EXTS] as string[] },
                { name: "All Files", extensions: ["*"] },
            ],
        });
        if (result.canceled || result.filePaths.length === 0) {
            throw new Error("No file selected");
        }
        const attachments: Attachment[] = [];
        for (const filePath of result.filePaths) {
            const fileName = filePath.split(/[\\/]/).pop() || "file";
            const attachment = attachmentService.uploadAttachment(project_item_id, filePath, fileName);
            attachments.push(attachment);
        }
        return attachments;
    }));

    ipcMain.handle("attachment:list", respond((project_item_id: number) => attachmentService.listAttachments(project_item_id)));

    ipcMain.handle("attachment:delete", respond((attachment_id: number) => attachmentService.deleteAttachment(attachment_id), { successFromBoolean: true }));

    ipcMain.handle(
        "attachment:getPath",
        respond((attachment_id: number, use_watermarked: boolean = false) => {
            const path = attachmentService.getAttachmentFilePath(attachment_id, use_watermarked);
            if (!path) throw new Error("Attachment not found");
            return path;
        }),
    );

    ipcMain.handle(
        "attachment:getRelativePath",
        respond((attachment_id: number, use_watermarked: boolean = false) => {
            const a = attachmentService.getAttachment(attachment_id);
            if (!a) throw new Error("Attachment not found");
            const rel = use_watermarked && a.watermarked_path ? a.watermarked_path : a.file_path;
            return rel;
        }),
    );

    ipcMain.handle("attachment:rename", respond((attachment_id: number, new_name: string) => {
        const updated = attachmentService.renameAttachment(attachment_id, new_name);
        if (!updated) throw new Error("Attachment not found");
        return updated;
    }));

    // Migrate storage root and persist the setting
    ipcMain.handle("attachment:migrateStorage", respond((newRoot: string) => {
        if (!newRoot || typeof newRoot !== 'string') {
            throw new Error('Invalid path');
        }
        const ok = attachmentService.migrateStorage(newRoot);
        if (!ok) throw new Error('Migration failed');
        settingsService.setDefaultStoragePath(newRoot);
        const updatedSettings = settingsService.getAppSettings();
        for (const win of BrowserWindow.getAllWindows()) {
            win.webContents.send("settings:changed", updatedSettings);
        }
        return true;
    }, { successFromBoolean: true }));

    ipcMain.handle(
        "attachment:uploadFromPaths",
        respond((project_item_id: number, files: Array<{ path: string; original_name?: string }>) => {
            const attachments: Attachment[] = [];
            for (const f of files || []) {
                const filePath = f.path;
                const nameFromPath = basename(filePath) || "file";
                const originalName = f.original_name || nameFromPath;
                const a = attachmentService.uploadAttachment(project_item_id, filePath, originalName);
                attachments.push(a);
            }
            return attachments;
        }),
    );

    ipcMain.handle(
        "attachment:uploadFromData",
        respond((project_item_id: number, files: Array<{ data: Uint8Array | number[]; name?: string; mime?: string }>) => {
            const attachments: Attachment[] = [];
            for (const f of files || []) {
                const bytes = Array.isArray(f.data) ? Buffer.from(f.data) : Buffer.from(f.data as Uint8Array);
                const a = attachmentService.uploadAttachmentFromBuffer(project_item_id, bytes, f.name, f.mime);
                attachments.push(a);
            }
            return attachments;
        }),
    );

    ipcMain.handle("attachment:openExternal", respond(async (attachment_id: number, use_watermarked?: boolean) => {
        const path = attachmentService.getAttachmentFilePath(attachment_id, !!use_watermarked);
        if (!path) throw new Error("File not found");
        await shell.openPath(path);
        return true;
    }, { successFromBoolean: true }));

    // Watermark handlers
    ipcMain.handle("watermark:apply", respond((attachment_id: number, req?: { watermark_text?: string; config?: any }) =>
        watermarkService.applyWatermark(attachment_id, req?.watermark_text, req?.config)
    ));
    ipcMain.handle("watermark:delete", respond((attachment_id: number) => attachmentService.clearWatermark(attachment_id), { successFromBoolean: true }));
    ipcMain.handle("watermark:resolveText", respond((attachment_id: number) => watermarkService.resolveWatermarkText(attachment_id)));

    // Export/Import handlers
    ipcMain.handle("project:export", async (event: IpcMainInvokeEvent, project_id: number) => {
        try {
            // Get project details for generating default filename
            const project = projectService.getProject(project_id);
            let defaultFileName = `project_${project_id}.zip`;
            
            if (project) {
                const projectName = project.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_");
                const creator = project.creator ? project.creator.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_") : "";
                defaultFileName = creator ? `${projectName}_${creator}.zip` : `${projectName}.zip`;
            }

            const result = await dialog.showSaveDialog({
                defaultPath: defaultFileName,
                filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
            });

            if (result.canceled || !result.filePath) {
                return { success: false, error: "Export canceled" };
            }

            const exportPath = await exportImportService.exportProject(project_id, result.filePath);
            return { success: true, data: exportPath };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("project:import", async (event: IpcMainInvokeEvent) => {
        try {
            const result = await dialog.showOpenDialog({
                properties: ["openFile"],
                filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
            });

            if (result.canceled || result.filePaths.length === 0) {
                return { success: false, error: "Import canceled" };
            }

            const project_id = await exportImportService.importProject(result.filePaths[0]);
            return { success: true, data: project_id };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Print handlers
    // Generate merged PDF and return its absolute path (no immediate print)
    ipcMain.handle("project:print", respond((project_id: number) => printService.printProject(project_id)));
    // Confirm print: load the generated PDF and open system print dialog
    ipcMain.handle("project:printConfirm", respond(async (file_path: string) => {
        await printService.printFile(file_path);
        return true;
    }, { successFromBoolean: true }));
}
