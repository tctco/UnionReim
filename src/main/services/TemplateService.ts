import type {
    CreateTemplateItemRequest,
    CreateTemplateRequest,
    Template,
    TemplateItem,
    TemplateWithItems,
    UpdateTemplateItemRequest,
    UpdateTemplateRequest,
} from "@common/types";
import type Database from "better-sqlite3";
import { DatabaseService } from "../database/Database";
/**
 * TemplateService encapsulates CRUD and query operations for templates and template items.
 * Uses a shared better-sqlite3 connection from DatabaseService.
 */

export class TemplateService {
    private db: Database.Database;

    constructor() {
        this.db = DatabaseService.getInstance().getDatabase();
    }

    // Template operations
    /** Create a template record and return the persisted row. */
    createTemplate(request: CreateTemplateRequest): Template {
        const now = Date.now();
        const stmt = this.db.prepare(`
            INSERT INTO templates (name, description, creator, is_default, create_time, update_time)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            request.name,
            request.description || null,
            request.creator || null,
            request.is_default ? 1 : 0,
            now,
            now,
        );

        return this.getTemplate(Number(result.lastInsertRowid))!;
    }

    /** Fetch a single template by id. */
    getTemplate(template_id: number): Template | null {
        const stmt = this.db.prepare(`
            SELECT template_id, name, description, creator, is_default, create_time, update_time
            FROM templates
            WHERE template_id = ?
        `);

        const row = stmt.get(template_id) as any;
        if (!row) return null;

        return {
            ...row,
            is_default: Boolean(row.is_default),
        };
    }

    /**
     * List templates with optional fuzzy `search` across name/description/creator.
     * Ordered by default flag then by last update time.
     */
    listTemplates(filter?: { search?: string }): Template[] {
        let query = `
            SELECT template_id, name, description, creator, is_default, create_time, update_time
            FROM templates
        `;

        const params: any[] = [];

        if (filter?.search) {
            query += " WHERE name LIKE ? OR description LIKE ? OR creator LIKE ?";
            const searchPattern = `%${filter.search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        query += " ORDER BY is_default DESC, update_time DESC";

        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params) as any[];

        return rows.map((row) => ({
            ...row,
            is_default: Boolean(row.is_default),
        }));
    }

    /** Patch-update template fields. Returns the updated row or null if missing. */
    updateTemplate(request: UpdateTemplateRequest): Template | null {
        const updates: string[] = [];
        const params: any[] = [];

        if (request.name !== undefined) {
            updates.push("name = ?");
            params.push(request.name);
        }
        if (request.description !== undefined) {
            updates.push("description = ?");
            params.push(request.description);
        }
        if (request.creator !== undefined) {
            updates.push("creator = ?");
            params.push(request.creator);
        }
        if (request.is_default !== undefined) {
            updates.push("is_default = ?");
            params.push(request.is_default ? 1 : 0);
        }

        if (updates.length === 0) {
            return this.getTemplate(request.template_id);
        }

        updates.push("update_time = ?");
        params.push(Date.now());
        params.push(request.template_id);

        const stmt = this.db.prepare(`
            UPDATE templates
            SET ${updates.join(", ")}
            WHERE template_id = ?
        `);

        stmt.run(...params);
        return this.getTemplate(request.template_id);
    }

    /** Delete a template. Returns true if any row was removed. */
    deleteTemplate(template_id: number): boolean {
        const stmt = this.db.prepare("DELETE FROM templates WHERE template_id = ?");
        const result = stmt.run(template_id);
        return result.changes > 0;
    }

    /** Deep-clone a template and all its items under a new name in a transaction. */
    cloneTemplate(template_id: number, new_name: string): Template | null {
        const original = this.getTemplateWithItems(template_id);
        if (!original) return null;

        return DatabaseService.getInstance().transaction(() => {
            const newTemplate = this.createTemplate({
                name: new_name,
                description: original.description,
                creator: original.creator,
                is_default: false,
            });

            // Clone all items
            for (const item of original.items) {
                this.createTemplateItem({
                    template_id: newTemplate.template_id,
                    name: item.name,
                    description: item.description,
                    is_required: item.is_required,
                    file_types: item.file_types,
                    needs_watermark: item.needs_watermark,
                    watermark_template: item.watermark_template,
                    allows_multiple_files: item.allows_multiple_files,
                    display_order: item.display_order,
                    category: item.category,
                });
            }

            return newTemplate;
        });
    }

    // Template item operations
    /** Create a template item for a given template. */
    createTemplateItem(request: CreateTemplateItemRequest): TemplateItem {
        const stmt = this.db.prepare(`
            INSERT INTO template_items (
                template_id, name, description, is_required, file_types,
                needs_watermark, watermark_template, allows_multiple_files,
                display_order, category
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            request.template_id,
            request.name,
            request.description || null,
            request.is_required ? 1 : 0,
            request.file_types ? JSON.stringify(request.file_types) : null,
            request.needs_watermark ? 1 : 0,
            request.watermark_template || null,
            request.allows_multiple_files ? 1 : 0,
            request.display_order ?? 0,
            request.category || null,
        );

        return this.getTemplateItem(Number(result.lastInsertRowid))!;
    }

    /** Fetch a template item by id. */
    getTemplateItem(item_id: number): TemplateItem | null {
        const stmt = this.db.prepare(`
            SELECT * FROM template_items WHERE item_id = ?
        `);

        const row = stmt.get(item_id) as any;
        if (!row) return null;

        return this.mapTemplateItemFromRow(row);
    }

    /** List items for a template ordered by display and id for stability. */
    listTemplateItems(template_id: number): TemplateItem[] {
        const stmt = this.db.prepare(`
            SELECT * FROM template_items
            WHERE template_id = ?
            ORDER BY display_order ASC, item_id ASC
        `);

        const rows = stmt.all(template_id) as any[];
        return rows.map((row) => this.mapTemplateItemFromRow(row));
    }

    /** Patch-update a template item. Returns updated item or null if missing. */
    updateTemplateItem(request: UpdateTemplateItemRequest): TemplateItem | null {
        const updates: string[] = [];
        const params: any[] = [];

        if (request.name !== undefined) {
            updates.push("name = ?");
            params.push(request.name);
        }
        if (request.description !== undefined) {
            updates.push("description = ?");
            params.push(request.description);
        }
        if (request.is_required !== undefined) {
            updates.push("is_required = ?");
            params.push(request.is_required ? 1 : 0);
        }
        if (request.file_types !== undefined) {
            updates.push("file_types = ?");
            params.push(JSON.stringify(request.file_types));
        }
        if (request.needs_watermark !== undefined) {
            updates.push("needs_watermark = ?");
            params.push(request.needs_watermark ? 1 : 0);
        }
        if (request.watermark_template !== undefined) {
            updates.push("watermark_template = ?");
            params.push(request.watermark_template);
        }
        if (request.allows_multiple_files !== undefined) {
            updates.push("allows_multiple_files = ?");
            params.push(request.allows_multiple_files ? 1 : 0);
        }
        if (request.display_order !== undefined) {
            updates.push("display_order = ?");
            params.push(request.display_order);
        }
        if (request.category !== undefined) {
            updates.push("category = ?");
            params.push(request.category);
        }

        if (updates.length === 0) {
            return this.getTemplateItem(request.item_id);
        }

        params.push(request.item_id);

        const stmt = this.db.prepare(`
            UPDATE template_items
            SET ${updates.join(", ")}
            WHERE item_id = ?
        `);

        stmt.run(...params);
        return this.getTemplateItem(request.item_id);
    }

    deleteTemplateItem(item_id: number): boolean {
        const stmt = this.db.prepare("DELETE FROM template_items WHERE item_id = ?");
        const result = stmt.run(item_id);
        return result.changes > 0;
    }

    getTemplateWithItems(template_id: number): TemplateWithItems | null {
        const template = this.getTemplate(template_id);
        if (!template) return null;

        const items = this.listTemplateItems(template_id);

        return {
            ...template,
            items,
        };
    }

    // Check if template has associated projects
    hasAssociatedProjects(template_id: number): boolean {
        const stmt = this.db.prepare(`
            SELECT COUNT(*) as count FROM projects WHERE template_id = ?
        `);
        
        const result = stmt.get(template_id) as { count: number };
        return result.count > 0;
    }

    // Get projects using this template
    getAssociatedProjects(template_id: number): Array<{ project_id: number; name: string; creator?: string }> {
        const stmt = this.db.prepare(`
            SELECT project_id, name, creator FROM projects WHERE template_id = ?
        `);
        
        return stmt.all(template_id) as Array<{ project_id: number; name: string; creator?: string }>;
    }

    // Check if a template item can be safely updated/deleted
    canModifyTemplateItem(template_id: number, critical_changes?: boolean): { canModify: boolean; reason?: string; projects?: Array<{ project_id: number; name: string }> } {
        if (!critical_changes) {
            return { canModify: true };
        }

        const projects = this.getAssociatedProjects(template_id);
        if (projects.length === 0) {
            return { canModify: true };
        }

        return {
            canModify: false,
            reason: "此模板已被以下项目使用，无法修改关键属性。请先删除相关项目后再进行修改。",
            projects: projects.map(p => ({ project_id: p.project_id, name: p.name }))
        };
    }

    // Safe delete template (only if no projects)
    safeDeleteTemplate(template_id: number): { success: boolean; error?: string; projects?: Array<{ project_id: number; name: string }> } {
        const projects = this.getAssociatedProjects(template_id);
        if (projects.length > 0) {
            return {
                success: false,
                error: "无法删除此模板，因为它正在被以下项目使用：",
                projects: projects.map(p => ({ project_id: p.project_id, name: p.name }))
            };
        }

        const success = this.deleteTemplate(template_id);
        return { success };
    }

    // Safe delete template item (only if no critical impact)
    safeDeleteTemplateItem(item_id: number): { success: boolean; error?: string; projects?: Array<{ project_id: number; name: string }> } {
        // Get template_id for this item
        const itemStmt = this.db.prepare(`
            SELECT template_id FROM template_items WHERE item_id = ?
        `);
        const item = itemStmt.get(item_id) as { template_id: number } | undefined;
        
        if (!item) {
            return { success: false, error: "模板项目不存在" };
        }

        const checkResult = this.canModifyTemplateItem(item.template_id, true);
        if (!checkResult.canModify) {
            return {
                success: false,
                error: checkResult.reason,
                projects: checkResult.projects
            };
        }

        const success = this.deleteTemplateItem(item_id);
        return { success };
    }

    private mapTemplateItemFromRow(row: any): TemplateItem {
        return {
            item_id: row.item_id,
            template_id: row.template_id,
            name: row.name,
            description: row.description,
            is_required: Boolean(row.is_required),
            file_types: row.file_types ? JSON.parse(row.file_types) : undefined,
            needs_watermark: Boolean(row.needs_watermark),
            watermark_template: row.watermark_template,
            allows_multiple_files: Boolean(row.allows_multiple_files),
            display_order: row.display_order,
            category: row.category,
        };
    }
}


