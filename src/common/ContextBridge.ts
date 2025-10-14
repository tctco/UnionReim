import type {
    AppSettings,
    Attachment,
    CreateProjectRequest,
    CreateTemplateItemRequest,
    CreateTemplateRequest,
    MultipleTemplateExportRequest,
    Project,
    ProjectWithDetails,
    SafeDeleteResult,
    SettingsUpdateRequest,
    Template,
    TemplateExportRequest,
    TemplateImportRequest,
    TemplateItem,
    TemplateModificationCheckResult,
    TemplateWithItems,
    UpdateProjectRequest,
    UpdateTemplateItemRequest,
    UpdateTemplateRequest,
} from "./types";

export type ApiResponse<T> = {
    success: boolean;
    data?: T;
    error?: string;
};

export type ContextBridge = {
    onNativeThemeChanged: (callback: () => void) => void;
    themeShouldUseDarkColors: () => boolean;
    onSettingsChanged: (callback: (settings: AppSettings) => void) => void;

    // Settings operations
    settings: {
        get: () => Promise<ApiResponse<AppSettings>>;
        update: (request: SettingsUpdateRequest) => Promise<ApiResponse<AppSettings>>;
        getSetting: (key: string) => Promise<ApiResponse<string | null>>;
        setSetting: (key: string, value: string) => Promise<ApiResponse<void>>;
    };

    // Template operations
    template: {
        create: (request: CreateTemplateRequest) => Promise<ApiResponse<Template>>;
        list: (filter?: { search?: string }) => Promise<ApiResponse<Template[]>>;
        get: (template_id: number) => Promise<ApiResponse<TemplateWithItems>>;
        update: (request: UpdateTemplateRequest) => Promise<ApiResponse<Template>>;
        delete: (template_id: number) => Promise<ApiResponse<boolean>>;
        safeDelete: (template_id: number) => Promise<ApiResponse<SafeDeleteResult>>;
        clone: (template_id: number, new_name: string) => Promise<ApiResponse<Template>>;
        export: (request: TemplateExportRequest) => Promise<ApiResponse<string>>;
        import: (request: TemplateImportRequest) => Promise<ApiResponse<number>>;
        exportMultiple: (request: MultipleTemplateExportRequest) => Promise<ApiResponse<string>>;
        importFromZip: (zip_path: string) => Promise<ApiResponse<number[]>>;
        checkModification: (template_id: number, critical_changes?: boolean) => Promise<ApiResponse<TemplateModificationCheckResult>>;
        getAssociatedProjects: (template_id: number) => Promise<ApiResponse<Array<{ project_id: number; name: string; creator?: string }>>>;
    };

    // Template item operations
    templateItem: {
        create: (request: CreateTemplateItemRequest) => Promise<ApiResponse<TemplateItem>>;
        update: (request: UpdateTemplateItemRequest) => Promise<ApiResponse<TemplateItem>>;
        delete: (item_id: number) => Promise<ApiResponse<boolean>>;
        safeDelete: (item_id: number) => Promise<ApiResponse<SafeDeleteResult>>;
    };

    // Project operations
    project: {
        create: (request: CreateProjectRequest) => Promise<ApiResponse<Project>>;
        list: (filter?: { search?: string; status?: string; template_id?: number }) => Promise<ApiResponse<Project[]>>;
        get: (project_id: number) => Promise<ApiResponse<ProjectWithDetails>>;
        update: (request: UpdateProjectRequest) => Promise<ApiResponse<Project>>;
        delete: (project_id: number) => Promise<ApiResponse<boolean>>;
        checkComplete: (project_id: number) => Promise<ApiResponse<boolean>>;
        export: (project_id: number) => Promise<ApiResponse<string>>;
        import: () => Promise<ApiResponse<number>>;
    };

    // Attachment operations
    attachment: {
        upload: (project_item_id: number) => Promise<ApiResponse<Attachment[]>>;
        list: (project_item_id: number) => Promise<ApiResponse<Attachment[]>>;
        delete: (attachment_id: number) => Promise<ApiResponse<boolean>>;
        getPath: (attachment_id: number, use_watermarked?: boolean) => Promise<ApiResponse<string>>;
        openExternal: (attachment_id: number) => Promise<ApiResponse<void>>;
        rename: (attachment_id: number, new_name: string) => Promise<ApiResponse<Attachment>>;
    };

    // Watermark operations
    watermark: {
        apply: (attachment_id: number) => Promise<ApiResponse<string>>;
    };
};
