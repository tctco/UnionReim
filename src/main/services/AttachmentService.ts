import type { Attachment } from "@common/types";
import type Database from "better-sqlite3";
import { app } from "electron";
import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from "fs";
import { basename, extname, join } from "path";
import { DatabaseService } from "../database/Database";

export class AttachmentService {
    private db: Database.Database;
    private storagePath: string;

    constructor() {
        this.db = DatabaseService.getInstance().getDatabase();
        this.storagePath = join(app.getPath("userData"), "storage", "projects");

        // Ensure storage directory exists
        if (!existsSync(this.storagePath)) {
            mkdirSync(this.storagePath, { recursive: true });
        }
    }

    // Upload and store a file
    uploadAttachment(project_item_id: number, source_file_path: string, original_name: string): Attachment {
        // Get project_id from project_item
        const projectItemStmt = this.db.prepare("SELECT project_id FROM project_items WHERE project_item_id = ?");
        const projectItem = projectItemStmt.get(project_item_id) as any;

        if (!projectItem) {
            throw new Error(`Project item ${project_item_id} not found`);
        }

        const project_id = projectItem.project_id;

        // Create directory structure: storage/projects/<project_id>/items/<item_id>/original/
        const itemStoragePath = join(this.storagePath, String(project_id), "items", String(project_item_id), "original");
        if (!existsSync(itemStoragePath)) {
            mkdirSync(itemStoragePath, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const ext = extname(original_name);
        const baseName = basename(original_name, ext);
        const file_name = `${baseName}_${timestamp}${ext}`;
        const destination_path = join(itemStoragePath, file_name);

        // Copy file to storage
        copyFileSync(source_file_path, destination_path);

        // Get file size
        const file_size = readFileSync(destination_path).length;
        const file_type = ext.toLowerCase().replace(".", "");

        // Store relative path from storage root
        const relative_path = join(String(project_id), "items", String(project_item_id), "original", file_name);

        // Insert into database
        const stmt = this.db.prepare(`
            INSERT INTO attachments (
                project_item_id, file_name, original_name, file_path,
                file_type, file_size, has_watermark, upload_time
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            project_item_id,
            file_name,
            original_name,
            relative_path,
            file_type,
            file_size,
            0,
            Date.now(),
        );

        // Update project_item status if it was pending
        const updateStmt = this.db.prepare(`
            UPDATE project_items
            SET status = 'uploaded', upload_time = ?
            WHERE project_item_id = ? AND status = 'pending'
        `);
        updateStmt.run(Date.now(), project_item_id);

        return this.getAttachment(Number(result.lastInsertRowid))!;
    }

    getAttachment(attachment_id: number): Attachment | null {
        const stmt = this.db.prepare(`
            SELECT attachment_id, project_item_id, file_name, original_name, file_path,
                   file_type, file_size, has_watermark, watermarked_path, upload_time, metadata
            FROM attachments
            WHERE attachment_id = ?
        `);

        const row = stmt.get(attachment_id) as any;
        if (!row) return null;

        return {
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        };
    }

    listAttachments(project_item_id: number): Attachment[] {
        const stmt = this.db.prepare(`
            SELECT attachment_id, project_item_id, file_name, original_name, file_path,
                   file_type, file_size, has_watermark, watermarked_path, upload_time, metadata
            FROM attachments
            WHERE project_item_id = ?
            ORDER BY upload_time ASC
        `);

        const rows = stmt.all(project_item_id) as any[];
        return rows.map((row) => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        }));
    }

    deleteAttachment(attachment_id: number): boolean {
        const attachment = this.getAttachment(attachment_id);
        if (!attachment) return false;

        return DatabaseService.getInstance().transaction(() => {
            // Delete files from filesystem
            const originalPath = join(this.storagePath, attachment.file_path);
            if (existsSync(originalPath)) {
                unlinkSync(originalPath);
            }

            if (attachment.watermarked_path) {
                const watermarkedPath = join(this.storagePath, attachment.watermarked_path);
                if (existsSync(watermarkedPath)) {
                    unlinkSync(watermarkedPath);
                }
            }

            // Delete from database
            const stmt = this.db.prepare("DELETE FROM attachments WHERE attachment_id = ?");
            const result = stmt.run(attachment_id);

            // Check if project item has any remaining attachments
            const remaining = this.listAttachments(attachment.project_item_id);
            if (remaining.length === 0) {
                // Reset project item status to pending
                const updateStmt = this.db.prepare(`
                    UPDATE project_items
                    SET status = 'pending', upload_time = NULL
                    WHERE project_item_id = ?
                `);
                updateStmt.run(attachment.project_item_id);
            }

            return result.changes > 0;
        });
    }

    // Get absolute file path for reading
    getAttachmentFilePath(attachment_id: number, use_watermarked: boolean = false): string | null {
        const attachment = this.getAttachment(attachment_id);
        if (!attachment) return null;

        const path = use_watermarked && attachment.watermarked_path ? attachment.watermarked_path : attachment.file_path;

        return join(this.storagePath, path);
    }

    // Update watermarked path
    setWatermarkedPath(attachment_id: number, watermarked_path: string): boolean {
        const stmt = this.db.prepare(`
            UPDATE attachments
            SET has_watermark = 1, watermarked_path = ?
            WHERE attachment_id = ?
        `);

        const result = stmt.run(watermarked_path, attachment_id);

        // Update project item status
        const attachment = this.getAttachment(attachment_id);
        if (attachment) {
            const updateStmt = this.db.prepare(`
                UPDATE project_items
                SET status = 'watermarked'
                WHERE project_item_id = ?
            `);
            updateStmt.run(attachment.project_item_id);
        }

        return result.changes > 0;
    }

    getStoragePath(): string {
        return this.storagePath;
    }
}


