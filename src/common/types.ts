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
    position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    fontSize?: number;
    opacity?: number;
    rotation?: number;
    color?: string;
}

// Settings related types
export interface AppSettings {
    defaultUserName?: string;
    theme?: 'light' | 'dark' | 'system';
    defaultStoragePath?: string;
    language?: string;
    hoverPreviewWidth?: number;
    hoverPreviewHeight?: number;
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


