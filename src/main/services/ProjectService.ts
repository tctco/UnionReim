import type {
    CreateProjectRequest,
    Project,
    ProjectItem,
    ProjectItemWithDetails,
    ProjectMetadata,
    ProjectWithDetails,
    UpdateProjectRequest,
} from "@common/types";
import type Database from "better-sqlite3";
import { DatabaseService } from "../database/Database";
import { AttachmentService } from "./AttachmentService";
import { TemplateService } from "./TemplateService";

export class ProjectService {
    private db: Database.Database;
    private templateService: TemplateService;
    private attachmentService: AttachmentService;

    constructor() {
        this.db = DatabaseService.getInstance().getDatabase();
        this.templateService = new TemplateService();
        this.attachmentService = new AttachmentService();
    }

    // Project operations
    createProject(request: CreateProjectRequest): Project {
        const template = this.templateService.getTemplate(request.template_id);
        if (!template) {
            throw new Error(`Template with id ${request.template_id} not found`);
        }

        return DatabaseService.getInstance().transaction(() => {
            const now = Date.now();
            const stmt = this.db.prepare(`
                INSERT INTO projects (template_id, name, creator, status, metadata, create_time, update_time)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                request.template_id,
                request.name,
                request.creator || null,
                "incomplete",
                request.metadata ? JSON.stringify(request.metadata) : null,
                now,
                now,
            );

            const project_id = Number(result.lastInsertRowid);

            // Create project items from template items
            const templateItems = this.templateService.listTemplateItems(request.template_id);
            const itemStmt = this.db.prepare(`
                INSERT INTO project_items (project_id, template_item_id, status)
                VALUES (?, ?, ?)
            `);

            for (const templateItem of templateItems) {
                itemStmt.run(project_id, templateItem.item_id, "pending");
            }

            return this.getProject(project_id)!;
        });
    }

    getProject(project_id: number): Project | null {
        const stmt = this.db.prepare(`
            SELECT project_id, template_id, name, creator, status, metadata, create_time, update_time
            FROM projects
            WHERE project_id = ?
        `);

        const row = stmt.get(project_id) as any;
        if (!row) return null;

        return {
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        };
    }

    listProjects(filter?: { search?: string; status?: string; template_id?: number }): Project[] {
        let query = `
            SELECT project_id, template_id, name, creator, status, metadata, create_time, update_time
            FROM projects
            WHERE 1=1
        `;

        const params: any[] = [];

        if (filter?.search) {
            query += " AND (name LIKE ? OR creator LIKE ?)";
            const searchPattern = `%${filter.search}%`;
            params.push(searchPattern, searchPattern);
        }

        if (filter?.status) {
            query += " AND status = ?";
            params.push(filter.status);
        }

        if (filter?.template_id) {
            query += " AND template_id = ?";
            params.push(filter.template_id);
        }

        query += " ORDER BY update_time DESC";

        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params) as any[];

        return rows.map((row) => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        }));
    }

    updateProject(request: UpdateProjectRequest): Project | null {
        const updates: string[] = [];
        const params: any[] = [];

        if (request.name !== undefined) {
            updates.push("name = ?");
            params.push(request.name);
        }
        if (request.creator !== undefined) {
            updates.push("creator = ?");
            params.push(request.creator);
        }
        if (request.status !== undefined) {
            updates.push("status = ?");
            params.push(request.status);
        }
        if (request.metadata !== undefined) {
            updates.push("metadata = ?");
            params.push(JSON.stringify(request.metadata));
        }

        if (updates.length === 0) {
            return this.getProject(request.project_id);
        }

        updates.push("update_time = ?");
        params.push(Date.now());
        params.push(request.project_id);

        const stmt = this.db.prepare(`
            UPDATE projects
            SET ${updates.join(", ")}
            WHERE project_id = ?
        `);

        stmt.run(...params);
        return this.getProject(request.project_id);
    }

    deleteProject(project_id: number): boolean {
        return DatabaseService.getInstance().transaction(() => {
            // Get all project items
            const items = this.listProjectItems(project_id);

            // Delete all attachments for each item
            for (const item of items) {
                const attachments = this.attachmentService.listAttachments(item.project_item_id);
                for (const attachment of attachments) {
                    this.attachmentService.deleteAttachment(attachment.attachment_id);
                }
            }

            // Delete the project (CASCADE will handle project_items)
            const stmt = this.db.prepare("DELETE FROM projects WHERE project_id = ?");
            const result = stmt.run(project_id);
            return result.changes > 0;
        });
    }

    // Project item operations
    getProjectItem(project_item_id: number): ProjectItem | null {
        const stmt = this.db.prepare(`
            SELECT project_item_id, project_id, template_item_id, status, notes, upload_time
            FROM project_items
            WHERE project_item_id = ?
        `);

        return stmt.get(project_item_id) as ProjectItem | null;
    }

    listProjectItems(project_id: number): ProjectItem[] {
        const stmt = this.db.prepare(`
            SELECT pi.project_item_id, pi.project_id, pi.template_item_id, pi.status, pi.notes, pi.upload_time
            FROM project_items pi
            JOIN template_items ti ON pi.template_item_id = ti.item_id
            WHERE pi.project_id = ?
            ORDER BY ti.display_order ASC, ti.item_id ASC
        `);

        return stmt.all(project_id) as ProjectItem[];
    }

    updateProjectItem(project_item_id: number, status?: string, notes?: string): ProjectItem | null {
        const updates: string[] = [];
        const params: any[] = [];

        if (status !== undefined) {
            updates.push("status = ?");
            params.push(status);
        }
        if (notes !== undefined) {
            updates.push("notes = ?");
            params.push(notes);
        }

        if (updates.length === 0) {
            return this.getProjectItem(project_item_id);
        }

        params.push(project_item_id);

        const stmt = this.db.prepare(`
            UPDATE project_items
            SET ${updates.join(", ")}
            WHERE project_item_id = ?
        `);

        stmt.run(...params);
        return this.getProjectItem(project_item_id);
    }

    getProjectWithDetails(project_id: number): ProjectWithDetails | null {
        const project = this.getProject(project_id);
        if (!project) return null;

        const template = this.templateService.getTemplate(project.template_id);
        if (!template) return null;

        const projectItems = this.listProjectItems(project_id);
        const items: ProjectItemWithDetails[] = [];

        for (const projectItem of projectItems) {
            const templateItem = this.templateService.getTemplateItem(projectItem.template_item_id);
            if (!templateItem) continue;

            const attachments = this.attachmentService.listAttachments(projectItem.project_item_id);

            items.push({
                ...projectItem,
                template_item: templateItem,
                attachments,
            });
        }

        return {
            ...project,
            template,
            items,
        };
    }

    // Check if all required items have files
    checkProjectComplete(project_id: number): boolean {
        const details = this.getProjectWithDetails(project_id);
        if (!details) return false;

        for (const item of details.items) {
            if (item.template_item.is_required && item.attachments.length === 0) {
                return false;
            }
        }

        return true;
    }
}


