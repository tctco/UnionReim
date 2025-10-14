import type { ContextBridge } from "@common/ContextBridge";
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("ContextBridge", <ContextBridge>{
    onNativeThemeChanged: (callback: () => void) => ipcRenderer.on("nativeThemeChanged", callback),
    themeShouldUseDarkColors: () => ipcRenderer.sendSync("themeShouldUseDarkColors"),
    onSettingsChanged: (callback: (settings: any) => void) =>
        ipcRenderer.on("settings:changed", (_event, settings) => callback(settings)),

    // Settings operations
    settings: {
        get: () => ipcRenderer.invoke("settings:get"),
        update: (request) => ipcRenderer.invoke("settings:update", request),
        getSetting: (key) => ipcRenderer.invoke("settings:getSetting", key),
        setSetting: (key, value) => ipcRenderer.invoke("settings:setSetting", key, value),
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
    },

    // Attachment operations
    attachment: {
        upload: (project_item_id) => ipcRenderer.invoke("attachment:upload", project_item_id),
        list: (project_item_id) => ipcRenderer.invoke("attachment:list", project_item_id),
        delete: (attachment_id) => ipcRenderer.invoke("attachment:delete", attachment_id),
        getPath: (attachment_id, use_watermarked) => ipcRenderer.invoke("attachment:getPath", attachment_id, use_watermarked),
        openExternal: (attachment_id) => ipcRenderer.invoke("attachment:openExternal", attachment_id),
    },

    // Watermark operations
    watermark: {
        apply: (attachment_id) => ipcRenderer.invoke("watermark:apply", attachment_id),
    },
});
