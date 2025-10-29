import type {
    AppSettings,
    Attachment,
    CreateDocumentTemplateRequest,
    CreateProjectRequest,
    CreateProjectDocumentRequest,
    CreateTemplateItemRequest,
    CreateTemplateRequest,
    MultipleTemplateExportRequest,
    Project,
    ProjectDocument,
    ProjectWithDetails,
    SafeDeleteResult,
    SettingsUpdateRequest,
    Template,
    TemplateExportRequest,
    TemplateImportRequest,
    TemplateItem,
    TemplateModificationCheckResult,
    TemplateWithItems,
    DocumentTemplate,
    UpdateProjectRequest,
    UpdateProjectDocumentRequest,
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
        signatureUploadFromPath: (payload: { path: string; original_name?: string }) => Promise<ApiResponse<string>>;
        signatureUploadFromData: (payload: { data: number[]; name?: string; mime?: string }) => Promise<ApiResponse<string>>;
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
        print: (project_id: number) => Promise<ApiResponse<string>>;
        printConfirm: (file_path: string) => Promise<ApiResponse<void>>;
    };

    // Attachment operations
    attachment: {
        upload: (project_item_id: number) => Promise<ApiResponse<Attachment[]>>;
        list: (project_item_id: number) => Promise<ApiResponse<Attachment[]>>;
        delete: (attachment_id: number) => Promise<ApiResponse<boolean>>;
        getPath: (attachment_id: number, use_watermarked?: boolean) => Promise<ApiResponse<string>>;
        getRelativePath: (attachment_id: number, use_watermarked?: boolean) => Promise<ApiResponse<string>>;
        openExternal: (attachment_id: number, use_watermarked?: boolean) => Promise<ApiResponse<void>>;
        rename: (attachment_id: number, new_name: string) => Promise<ApiResponse<Attachment>>;
        uploadFromPaths: (
            project_item_id: number,
            files: Array<{ path: string; original_name?: string }>,
        ) => Promise<ApiResponse<Attachment[]>>;
        uploadFromData: (
            project_item_id: number,
            files: Array<{ data: number[]; name?: string; mime?: string }>,
        ) => Promise<ApiResponse<Attachment[]>>;
        migrateStorage: (newRoot: string) => Promise<ApiResponse<boolean>>;
    };

    // Watermark operations
    watermark: {
        apply: (attachment_id: number, req?: { watermark_text?: string; config?: import('./types').WatermarkConfig }) => Promise<ApiResponse<string>>;
        delete: (attachment_id: number) => Promise<ApiResponse<boolean>>;
        resolveText: (attachment_id: number) => Promise<ApiResponse<string>>;
    };

    // Fonts operations
    fonts: {
        list: () => Promise<ApiResponse<string[]>>;
    };

    // System utilities
    system: {
        selectDirectory: () => Promise<ApiResponse<string | null>>;
        resolveStoragePath: (relative: string) => Promise<ApiResponse<string>>;
        openPath: (absPath: string) => Promise<ApiResponse<boolean>>;
    };

    // Document template operations
    document: {
        create: (request: CreateDocumentTemplateRequest) => Promise<ApiResponse<DocumentTemplate>>;
        list: (filter?: { search?: string }) => Promise<ApiResponse<DocumentTemplate[]>>;
        get: (document_id: number) => Promise<ApiResponse<DocumentTemplate>>;
        update: (request: import('./types').UpdateDocumentTemplateRequest) => Promise<ApiResponse<DocumentTemplate>>;
        delete: (document_id: number) => Promise<ApiResponse<boolean>>;
        export: (request: import('./types').DocumentExportRequest) => Promise<ApiResponse<string>>;
        import: (request: import('./types').DocumentImportRequest) => Promise<ApiResponse<number>>;
    };

    // Project document operations
    projectDocument: {
        create: (request: CreateProjectDocumentRequest) => Promise<ApiResponse<ProjectDocument>>;
        list: (project_id: number) => Promise<ApiResponse<ProjectDocument[]>>;
        get: (project_document_id: number) => Promise<ApiResponse<ProjectDocument>>;
        update: (request: UpdateProjectDocumentRequest) => Promise<ApiResponse<ProjectDocument>>;
        delete: (project_document_id: number) => Promise<ApiResponse<boolean>>;
        exportPdf: (project_document_id: number) => Promise<ApiResponse<string>>; // returns relative path
    };
};
