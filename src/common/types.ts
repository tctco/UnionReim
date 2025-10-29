// Template related types
export interface Template {
    template_id: number;
    name: string;
    description?: string;
    creator?: string;
    is_default: boolean;
    create_time: number;
    update_time: number;
}

export interface TemplateItem {
    item_id: number;
    template_id: number;
    name: string;
    description?: string;
    is_required: boolean;
    file_types?: string[]; // Array of file extensions like ['pdf', 'jpg', 'png']
    needs_watermark: boolean;
    watermark_template?: string; // Template string with placeholders
    allows_multiple_files: boolean;
    display_order: number;
    category?: string;
}

// Project related types
export interface Project {
    project_id: number;
    template_id: number;
    name: string;
    creator?: string;
    status: 'incomplete' | 'complete' | 'exported';
    metadata?: ProjectMetadata;
    create_time: number;
    update_time: number;
}

export interface ProjectMetadata {
    location?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
    department?: string;
    budget_code?: string;
    notes?: string;
}

export interface ProjectItem {
    project_item_id: number;
    project_id: number;
    template_item_id: number;
    status: 'pending' | 'uploaded' | 'watermarked' | 'approved';
    notes?: string;
    upload_time?: number;
}

// Attachment related types
export interface Attachment {
    attachment_id: number;
    project_item_id: number;
    file_name: string;
    original_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    has_watermark: boolean;
    watermarked_path?: string;
    upload_time: number;
    metadata?: Record<string, unknown>;
}

// Watermark configuration
export interface WatermarkConfig {
    text: string;
    // New style: use percentage-based center anchor
    xPercent?: number; // 0-100, text center X
    yPercent?: number; // 0-100, text center Y
    fontSize?: number;
    opacity?: number;
    rotation?: number;
    color?: string;
    fontFamily?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
}

// Watermark UI settings stored in AppSettings
export interface WatermarkSettings {
    textMode: 'template' | 'custom';
    customText?: string; // when textMode = 'custom'
    fontFamily?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string; // hex #RRGGBB
    opacity?: number; // 0-1
    rotation?: number; // degrees
    xPercent?: number; // 0-100, text center X
    yPercent?: number; // 0-100, text center Y
}

// Settings related types
export interface AppSettings {
    defaultUserName?: string;
    studentId?: string;
    signatureImagePath?: string; // absolute path to signature image
    theme?: 'light' | 'dark' | 'system';
    defaultStoragePath?: string;
    language?: string;
    hoverPreviewWidth?: number;
    hoverPreviewHeight?: number;
    autoWatermarkImages?: boolean;
    watermark?: WatermarkSettings;
    signatureImageHeightCm?: number; // height for signature image when embedding into PDFs (cm)
}

export interface SettingsUpdateRequest {
    settings: Partial<AppSettings>;
}

// API Request/Response types
export interface CreateTemplateRequest {
    name: string;
    description?: string;
    creator?: string;
    is_default?: boolean;
}

export interface UpdateTemplateRequest {
    template_id: number;
    name?: string;
    description?: string;
    creator?: string;
    is_default?: boolean;
}

export interface CreateTemplateItemRequest {
    template_id: number;
    name: string;
    description?: string;
    is_required?: boolean;
    file_types?: string[];
    needs_watermark?: boolean;
    watermark_template?: string;
    allows_multiple_files?: boolean;
    display_order?: number;
    category?: string;
}

export interface UpdateTemplateItemRequest {
    item_id: number;
    name?: string;
    description?: string;
    is_required?: boolean;
    file_types?: string[];
    needs_watermark?: boolean;
    watermark_template?: string;
    allows_multiple_files?: boolean;
    display_order?: number;
    category?: string;
}

export interface CreateProjectRequest {
    template_id: number;
    name: string;
    creator?: string;
    metadata?: ProjectMetadata;
}

export interface UpdateProjectRequest {
    project_id: number;
    name?: string;
    creator?: string;
    status?: 'incomplete' | 'complete' | 'exported';
    metadata?: ProjectMetadata;
}

export interface UploadAttachmentRequest {
    project_item_id: number;
    file_path: string;
    original_name: string;
}

export interface ApplyWatermarkRequest {
    attachment_id: number;
    watermark_text: string;
    config?: WatermarkConfig;
}

export interface ExportProjectResponse {
    success: boolean;
    export_path?: string;
    error?: string;
}

export interface ImportProjectRequest {
    zip_path: string;
}

export interface TemplateExportRequest {
    template_id: number;
    destination_path?: string;
}

export interface TemplateImportRequest {
    file_path: string;
}

export interface MultipleTemplateExportRequest {
    template_ids: number[];
    destination_path?: string;
}

// Manifest used when exporting/importing templates as JSON
export interface TemplateExportManifest {
    version: string; // e.g. "1.0"
    export_time: number;
    template: {
        name: string;
        description?: string;
        creator?: string;
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
}

export interface TemplateModificationCheckResult {
    canModify: boolean;
    reason?: string;
    projects?: Array<{ project_id: number; name: string }>;
}

export interface SafeDeleteResult {
    success: boolean;
    error?: string;
    projects?: Array<{ project_id: number; name: string }>;
}

// Combined types for UI
export interface TemplateWithItems extends Template {
    items: TemplateItem[];
}

export interface ProjectWithDetails extends Project {
    template: Template;
    items: ProjectItemWithDetails[];
}

export interface ProjectItemWithDetails extends ProjectItem {
    template_item: TemplateItem;
    attachments: Attachment[];
}

// Filter and search types
export interface TemplateFilter {
    search?: string;
    category?: string;
}

export interface ProjectFilter {
    search?: string;
    status?: string;
    template_id?: number;
}

// Document templates (free-form text with placeholders)
export interface DocumentTemplate {
    document_id: number;
    name: string;
    description?: string;
    creator?: string;
    content_html: string; // stored HTML from Quill
    create_time: number;
    update_time: number;
}

// Project-specific document (instance from a template)
export interface ProjectDocument {
    project_document_id: number;
    project_id: number;
    name: string;
    content_html: string;
    pdf_path?: string; // relative to storage root after export
    create_time: number;
    update_time: number;
}

export interface CreateDocumentTemplateRequest {
    name: string;
    description?: string;
    creator?: string;
    content_html?: string;
}

export interface UpdateDocumentTemplateRequest {
    document_id: number;
    name?: string;
    description?: string;
    creator?: string;
    content_html?: string;
}

export interface CreateProjectDocumentRequest {
    project_id: number;
    name: string;
    content_html: string;
}

export interface UpdateProjectDocumentRequest {
    project_document_id: number;
    name?: string;
    content_html?: string;
}
