import type {
    CreateProjectRequest,
    CreateTemplateItemRequest,
    CreateTemplateRequest,
    ImportProjectRequest,
    MultipleTemplateExportRequest,
    SettingsUpdateRequest,
    TemplateExportRequest,
    TemplateImportRequest,
    UpdateProjectRequest,
    UpdateTemplateItemRequest,
    UpdateTemplateRequest,
    UploadAttachmentRequest,
} from "@common/types";
import { BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from "electron";
import { AttachmentService } from "../services/AttachmentService";
import { ExportImportService } from "../services/ExportImportService";
import { ProjectService } from "../services/ProjectService";
import { SettingsService } from "../services/SettingsService";
import { TemplateService } from "../services/TemplateService";
import { WatermarkService } from "../services/WatermarkService";

export function registerIpcHandlers(): void {
    const settingsService = new SettingsService();
    const templateService = new TemplateService();
    const projectService = new ProjectService();
    const attachmentService = new AttachmentService();
    const watermarkService = new WatermarkService();
    const exportImportService = new ExportImportService();

    // Settings handlers
    ipcMain.handle("settings:get", async (event: IpcMainInvokeEvent) => {
        try {
            const settings = settingsService.getAppSettings();
            return { success: true, data: settings };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("settings:update", async (event: IpcMainInvokeEvent, request: SettingsUpdateRequest) => {
        try {
            settingsService.updateAppSettings(request.settings);
            const updatedSettings = settingsService.getAppSettings();
            // Broadcast settings change to all renderer windows
            for (const win of BrowserWindow.getAllWindows()) {
                win.webContents.send("settings:changed", updatedSettings);
            }
            return { success: true, data: updatedSettings };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("settings:getSetting", async (event: IpcMainInvokeEvent, key: string) => {
        try {
            const value = settingsService.getSetting(key);
            return { success: true, data: value };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("settings:setSetting", async (event: IpcMainInvokeEvent, key: string, value: string) => {
        try {
            settingsService.setSetting(key, value);
            const updatedSettings = settingsService.getAppSettings();
            for (const win of BrowserWindow.getAllWindows()) {
                win.webContents.send("settings:changed", updatedSettings);
            }
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Template handlers
    ipcMain.handle("template:create", async (event: IpcMainInvokeEvent, request: CreateTemplateRequest) => {
        try {
            return { success: true, data: templateService.createTemplate(request) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("template:list", async (event: IpcMainInvokeEvent, filter?: { search?: string }) => {
        try {
            return { success: true, data: templateService.listTemplates(filter) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("template:get", async (event: IpcMainInvokeEvent, template_id: number) => {
        try {
            const template = templateService.getTemplateWithItems(template_id);
            if (!template) {
                return { success: false, error: "Template not found" };
            }
            return { success: true, data: template };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("template:update", async (event: IpcMainInvokeEvent, request: UpdateTemplateRequest) => {
        try {
            const template = templateService.updateTemplate(request);
            if (!template) {
                return { success: false, error: "Template not found" };
            }
            return { success: true, data: template };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("template:delete", async (event: IpcMainInvokeEvent, template_id: number) => {
        try {
            const result = templateService.deleteTemplate(template_id);
            return { success: result };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("template:safeDelete", async (event: IpcMainInvokeEvent, template_id: number) => {
        try {
            const result = templateService.safeDeleteTemplate(template_id);
            return { success: true, data: result };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("template:checkModification", async (event: IpcMainInvokeEvent, template_id: number, critical_changes?: boolean) => {
        try {
            const result = templateService.canModifyTemplateItem(template_id, critical_changes);
            return { success: true, data: result };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("template:getAssociatedProjects", async (event: IpcMainInvokeEvent, template_id: number) => {
        try {
            const projects = templateService.getAssociatedProjects(template_id);
            return { success: true, data: projects };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("template:export", async (event: IpcMainInvokeEvent, request: TemplateExportRequest) => {
        try {
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
                return { success: false, error: "Export canceled" };
            }

            const exportPath = await exportImportService.exportTemplate(request.template_id, result.filePath);
            return { success: true, data: exportPath };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("template:import", async (event: IpcMainInvokeEvent, request: TemplateImportRequest) => {
        try {
            const result = await dialog.showOpenDialog({
                properties: ["openFile"],
                filters: [{ name: "JSON Files", extensions: ["json"] }],
            });

            if (result.canceled || result.filePaths.length === 0) {
                return { success: false, error: "Import canceled" };
            }

            const template_id = await exportImportService.importTemplate(result.filePaths[0]);
            return { success: true, data: template_id };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("template:exportMultiple", async (event: IpcMainInvokeEvent, request: MultipleTemplateExportRequest) => {
        try {
            const result = await dialog.showSaveDialog({
                defaultPath: `templates_batch_${Date.now()}.zip`,
                filters: [{ name: "ZIP Files", extensions: ["zip"] }],
            });

            if (result.canceled || !result.filePath) {
                return { success: false, error: "Export canceled" };
            }

            const exportPath = await exportImportService.exportMultipleTemplates(request.template_ids, result.filePath);
            return { success: true, data: exportPath };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("template:importFromZip", async (event: IpcMainInvokeEvent, zip_path: string) => {
        try {
            const result = await dialog.showOpenDialog({
                properties: ["openFile"],
                filters: [{ name: "ZIP Files", extensions: ["zip"] }],
            });

            if (result.canceled || result.filePaths.length === 0) {
                return { success: false, error: "Import canceled" };
            }

            const template_ids = await exportImportService.importTemplatesFromZip(result.filePaths[0]);
            return { success: true, data: template_ids };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("template:clone", async (event: IpcMainInvokeEvent, template_id: number, new_name: string) => {
        try {
            const template = templateService.cloneTemplate(template_id, new_name);
            if (!template) {
                return { success: false, error: "Failed to clone template" };
            }
            return { success: true, data: template };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Template item handlers
    ipcMain.handle("templateItem:create", async (event: IpcMainInvokeEvent, request: CreateTemplateItemRequest) => {
        try {
            return { success: true, data: templateService.createTemplateItem(request) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("templateItem:update", async (event: IpcMainInvokeEvent, request: UpdateTemplateItemRequest) => {
        try {
            const item = templateService.updateTemplateItem(request);
            if (!item) {
                return { success: false, error: "Template item not found" };
            }
            return { success: true, data: item };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("templateItem:delete", async (event: IpcMainInvokeEvent, item_id: number) => {
        try {
            const result = templateService.deleteTemplateItem(item_id);
            return { success: result };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("templateItem:safeDelete", async (event: IpcMainInvokeEvent, item_id: number) => {
        try {
            const result = templateService.safeDeleteTemplateItem(item_id);
            return { success: true, data: result };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Project handlers
    ipcMain.handle("project:create", async (event: IpcMainInvokeEvent, request: CreateProjectRequest) => {
        try {
            return { success: true, data: projectService.createProject(request) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle(
        "project:list",
        async (event: IpcMainInvokeEvent, filter?: { search?: string; status?: string; template_id?: number }) => {
            try {
                return { success: true, data: projectService.listProjects(filter) };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
    );

    ipcMain.handle("project:get", async (event: IpcMainInvokeEvent, project_id: number) => {
        try {
            const project = projectService.getProjectWithDetails(project_id);
            if (!project) {
                return { success: false, error: "Project not found" };
            }
            return { success: true, data: project };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("project:update", async (event: IpcMainInvokeEvent, request: UpdateProjectRequest) => {
        try {
            const project = projectService.updateProject(request);
            if (!project) {
                return { success: false, error: "Project not found" };
            }
            return { success: true, data: project };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("project:delete", async (event: IpcMainInvokeEvent, project_id: number) => {
        try {
            const result = projectService.deleteProject(project_id);
            return { success: result };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("project:checkComplete", async (event: IpcMainInvokeEvent, project_id: number) => {
        try {
            const isComplete = projectService.checkProjectComplete(project_id);
            return { success: true, data: isComplete };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Attachment handlers
    ipcMain.handle("attachment:upload", async (event: IpcMainInvokeEvent, project_item_id: number) => {
        try {
            // Show file picker
            const result = await dialog.showOpenDialog({
                properties: ["openFile", "multiSelections"],
                filters: [
                    { name: "Documents", extensions: ["pdf", "jpg", "jpeg", "png", "ofd"] },
                    { name: "All Files", extensions: ["*"] },
                ],
            });

            if (result.canceled || result.filePaths.length === 0) {
                return { success: false, error: "No file selected" };
            }

            const attachments = [];
            for (const filePath of result.filePaths) {
                const fileName = filePath.split(/[\\/]/).pop() || "file";
                const attachment = attachmentService.uploadAttachment(project_item_id, filePath, fileName);
                attachments.push(attachment);
            }

            return { success: true, data: attachments };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("attachment:list", async (event: IpcMainInvokeEvent, project_item_id: number) => {
        try {
            return { success: true, data: attachmentService.listAttachments(project_item_id) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("attachment:delete", async (event: IpcMainInvokeEvent, attachment_id: number) => {
        try {
            const result = attachmentService.deleteAttachment(attachment_id);
            return { success: result };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle(
        "attachment:getPath",
        async (event: IpcMainInvokeEvent, attachment_id: number, use_watermarked: boolean = false) => {
            try {
                const path = attachmentService.getAttachmentFilePath(attachment_id, use_watermarked);
                if (!path) {
                    return { success: false, error: "Attachment not found" };
                }
                return { success: true, data: path };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
    );

    ipcMain.handle("attachment:openExternal", async (event: IpcMainInvokeEvent, attachment_id: number) => {
        try {
            const path = attachmentService.getAttachmentFilePath(attachment_id, false);
            if (!path) {
                return { success: false, error: "File not found" };
            }
            await shell.openPath(path);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Watermark handlers
    ipcMain.handle("watermark:apply", async (event: IpcMainInvokeEvent, attachment_id: number) => {
        try {
            const path = await watermarkService.applyWatermark(attachment_id);
            return { success: true, data: path };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

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
}

