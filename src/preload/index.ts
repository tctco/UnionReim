import type { ContextBridge } from "@common/ContextBridge";
import type { AppSettings } from "@common/types";
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("ContextBridge", <ContextBridge>{
    onNativeThemeChanged: (callback: () => void) => ipcRenderer.on("nativeThemeChanged", callback),
    themeShouldUseDarkColors: () => ipcRenderer.sendSync("themeShouldUseDarkColors"),
    onSettingsChanged: (callback: (settings: AppSettings) => void) =>
        ipcRenderer.on("settings:changed", (_event, settings: AppSettings) => callback(settings)),

    // Settings operations
    settings: {
        get: () => ipcRenderer.invoke("settings:get"),
        update: (request) => ipcRenderer.invoke("settings:update", request),
        getSetting: (key) => ipcRenderer.invoke("settings:getSetting", key),
        setSetting: (key, value) => ipcRenderer.invoke("settings:setSetting", key, value),
        signatureUploadFromPath: (payload: { path: string; original_name?: string }) => ipcRenderer.invoke("settings:signatureUploadFromPath", payload),
        signatureUploadFromData: (payload: { data: number[]; name?: string; mime?: string }) => ipcRenderer.invoke("settings:signatureUploadFromData", payload),
    },

    // System utilities
    system: {
        selectDirectory: () => ipcRenderer.invoke('system:selectDirectory'),
        resolveStoragePath: (relative: string) => ipcRenderer.invoke('system:resolveStoragePath', relative),
        openPath: (absPath: string) => ipcRenderer.invoke('system:openPath', absPath),
        isDirectoryEmpty: (absPath: string) => ipcRenderer.invoke('system:isDirectoryEmpty', absPath),
    },

    // Template operations
    template: {
        create: (request) => ipcRenderer.invoke("template:create", request),
        list: (filter) => ipcRenderer.invoke("template:list", filter),
        get: (template_id) => ipcRenderer.invoke("template:get", template_id),
        update: (request) => ipcRenderer.invoke("template:update", request),
        delete: (template_id) => ipcRenderer.invoke("template:delete", template_id),
        safeDelete: (template_id) => ipcRenderer.invoke("template:safeDelete", template_id),
        clone: (template_id, new_name) => ipcRenderer.invoke("template:clone", template_id, new_name),
        export: (request) => ipcRenderer.invoke("template:export", request),
        import: (request) => ipcRenderer.invoke("template:import", request),
        exportMultiple: (request) => ipcRenderer.invoke("template:exportMultiple", request),
        importFromZip: (zip_path) => ipcRenderer.invoke("template:importFromZip", zip_path),
        checkModification: (template_id, critical_changes) => ipcRenderer.invoke("template:checkModification", template_id, critical_changes),
        getAssociatedProjects: (template_id) => ipcRenderer.invoke("template:getAssociatedProjects", template_id),
    },

    // Template item operations
    templateItem: {
        create: (request) => ipcRenderer.invoke("templateItem:create", request),
        update: (request) => ipcRenderer.invoke("templateItem:update", request),
        delete: (item_id) => ipcRenderer.invoke("templateItem:delete", item_id),
        safeDelete: (item_id) => ipcRenderer.invoke("templateItem:safeDelete", item_id),
    },

    // Project operations
    project: {
        create: (request) => ipcRenderer.invoke("project:create", request),
        list: (filter) => ipcRenderer.invoke("project:list", filter),
        get: (project_id) => ipcRenderer.invoke("project:get", project_id),
        update: (request) => ipcRenderer.invoke("project:update", request),
        delete: (project_id) => ipcRenderer.invoke("project:delete", project_id),
        checkComplete: (project_id) => ipcRenderer.invoke("project:checkComplete", project_id),
        export: (project_id) => ipcRenderer.invoke("project:export", project_id),
        import: () => ipcRenderer.invoke("project:import"),
        print: (project_id) => ipcRenderer.invoke("project:print", project_id),
        printConfirm: (file_path) => ipcRenderer.invoke("project:printConfirm", file_path),
    },

    // Attachment operations
    attachment: {
        upload: (project_item_id) => ipcRenderer.invoke("attachment:upload", project_item_id),
        list: (project_item_id) => ipcRenderer.invoke("attachment:list", project_item_id),
        delete: (attachment_id) => ipcRenderer.invoke("attachment:delete", attachment_id),
        getPath: (attachment_id, use_watermarked) => ipcRenderer.invoke("attachment:getPath", attachment_id, use_watermarked),
        getRelativePath: (attachment_id, use_watermarked) => ipcRenderer.invoke("attachment:getRelativePath", attachment_id, use_watermarked),
        openExternal: (attachment_id, use_watermarked) => ipcRenderer.invoke("attachment:openExternal", attachment_id, use_watermarked),
        rename: (attachment_id, new_name) => ipcRenderer.invoke("attachment:rename", attachment_id, new_name),
        uploadFromPaths: (project_item_id, files) => ipcRenderer.invoke("attachment:uploadFromPaths", project_item_id, files),
        uploadFromData: (project_item_id, files) => ipcRenderer.invoke("attachment:uploadFromData", project_item_id, files),
        migrateStorage: (newRoot) => ipcRenderer.invoke("attachment:migrateStorage", newRoot),
    },

    // Watermark operations
    watermark: {
        apply: (attachment_id, req) => ipcRenderer.invoke("watermark:apply", attachment_id, req),
        delete: (attachment_id) => ipcRenderer.invoke("watermark:delete", attachment_id),
        resolveText: (attachment_id) => ipcRenderer.invoke("watermark:resolveText", attachment_id),
    },

    // Fonts operations
    fonts: {
        list: () => ipcRenderer.invoke('fonts:list'),
    },

    // Document template operations
    document: {
        create: (request) => ipcRenderer.invoke('document:create', request),
        list: (filter) => ipcRenderer.invoke('document:list', filter),
        get: (document_id) => ipcRenderer.invoke('document:get', document_id),
        update: (request) => ipcRenderer.invoke('document:update', request),
        delete: (document_id) => ipcRenderer.invoke('document:delete', document_id),
        export: (request) => ipcRenderer.invoke('document:export', request),
        import: (request) => ipcRenderer.invoke('document:import', request),
    },

    // Project document operations
    projectDocument: {
        create: (request) => ipcRenderer.invoke('projectDocument:create', request),
        list: (project_id) => ipcRenderer.invoke('projectDocument:list', project_id),
        get: (project_document_id) => ipcRenderer.invoke('projectDocument:get', project_document_id),
        update: (request) => ipcRenderer.invoke('projectDocument:update', request),
        delete: (project_document_id) => ipcRenderer.invoke('projectDocument:delete', project_document_id),
        exportPdf: (project_document_id) => ipcRenderer.invoke('projectDocument:exportPdf', project_document_id),
    },
});
