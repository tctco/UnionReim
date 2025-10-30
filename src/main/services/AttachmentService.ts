import type { Attachment } from "@common/types";
import type Database from "better-sqlite3";
import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, renameSync, writeFileSync, readdirSync, statSync, rmSync } from "fs";
import { basename, extname, join, dirname } from "path";
import { DatabaseService } from "../database/Database";
import { SettingsService } from "./SettingsService";
import { DEFAULT_STORAGE_PATH } from "../electronConfigs";

export class AttachmentService {
    private db: Database.Database;
    private storagePath: string;
    private settingsService: SettingsService;

    constructor() {
        this.db = DatabaseService.getInstance().getDatabase();
        this.settingsService = new SettingsService();
        const configured = this.settingsService.getDefaultStoragePath();
        this.storagePath = configured || DEFAULT_STORAGE_PATH;

        // Ensure storage directory exists
        if (!existsSync(this.storagePath)) {
            mkdirSync(this.storagePath, { recursive: true });
        }
    }

    // Upload and store a file
    uploadAttachment(project_item_id: number, source_file_path: string, original_name: string): Attachment {
        // Get project_id from project_item
        const projectItemStmt = this.db.prepare("SELECT project_id FROM project_items WHERE project_item_id = ?");
        const projectItem = projectItemStmt.get(project_item_id) as { project_id: number } | undefined;

        if (!projectItem) {
            throw new Error(`Project item ${project_item_id} not found`);
        }

        const project_id = projectItem.project_id;

        // Create directory structure: storage/projects/<project_id>/items/<item_id>/original/
        const itemStoragePath = join(this.getStoragePath(), String(project_id), "items", String(project_item_id), "original");
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

    // Upload and store a file from memory buffer (used for clipboard/drag without path)
    uploadAttachmentFromBuffer(
        project_item_id: number,
        data: Buffer,
        original_name?: string,
        mime_type?: string,
    ): Attachment {
        // Get project_id from project_item
        const projectItemStmt = this.db.prepare("SELECT project_id FROM project_items WHERE project_item_id = ?");
        const projectItem = projectItemStmt.get(project_item_id) as { project_id: number } | undefined;
        if (!projectItem) {
            throw new Error(`Project item ${project_item_id} not found`);
        }

        const project_id = projectItem.project_id;

        // Ensure item storage directory exists
        const itemStoragePath = join(this.getStoragePath(), String(project_id), "items", String(project_item_id), "original");
        if (!existsSync(itemStoragePath)) {
            mkdirSync(itemStoragePath, { recursive: true });
        }

        // Determine base name and extension
        const nameFallback = original_name && original_name.trim().length > 0 ? original_name : this.nameFromMime(mime_type) || "file";
        let ext = extname(nameFallback);
        let baseName = basename(nameFallback, ext);
        if (!ext) {
            const extFromMime = this.extFromMime(mime_type);
            if (extFromMime) {
                ext = `.${extFromMime}`;
            }
        }
        if (!baseName || baseName.trim().length === 0) baseName = "file";

        // Generate unique filename
        const timestamp = Date.now();
        const file_name = `${baseName}_${timestamp}${ext || ""}`;
        const destination_path = join(itemStoragePath, file_name);

        // Write file
        writeFileSync(destination_path, data);

        // Build metadata
        const file_size = data.length;
        const file_type = (ext || "").toLowerCase().replace(".", "");
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
            nameFallback,
            relative_path,
            file_type,
            file_size,
            0,
            Date.now(),
        );

        // Update project_item status if pending
        const updateStmt = this.db.prepare(`
            UPDATE project_items
            SET status = 'uploaded', upload_time = ?
            WHERE project_item_id = ? AND status = 'pending'
        `);
        updateStmt.run(Date.now(), project_item_id);

        return this.getAttachment(Number(result.lastInsertRowid))!;
    }

    private extFromMime(mime?: string): string | undefined {
        if (!mime) return undefined;
        const map: Record<string, string> = {
            "image/png": "png",
            "image/jpeg": "jpg",
            "image/jpg": "jpg",
            "image/gif": "gif",
            "application/pdf": "pdf",
            "application/octet-stream": "bin",
        };
        return map[mime];
    }

    private nameFromMime(mime?: string): string | undefined {
        if (!mime) return undefined;
        if (mime.startsWith("image/")) return "image";
        if (mime === "application/pdf") return "document";
        return undefined;
    }

    getAttachment(attachment_id: number): Attachment | null {
        const stmt = this.db.prepare(`
            SELECT attachment_id, project_item_id, file_name, original_name, file_path,
                   file_type, file_size, has_watermark, watermarked_path, upload_time, metadata
            FROM attachments
            WHERE attachment_id = ?
        `);

        const row = stmt.get(attachment_id) as
            | {
                  attachment_id: number;
                  project_item_id: number;
                  file_name: string;
                  original_name: string;
                  file_path: string;
                  file_type: string;
                  file_size: number;
                  has_watermark: number;
                  watermarked_path?: string | null;
                  upload_time: number;
                  metadata?: string | null;
              }
            | undefined;
        if (!row) return null;

        const res: Attachment = {
            attachment_id: row.attachment_id,
            project_item_id: row.project_item_id,
            file_name: row.file_name,
            original_name: row.original_name,
            file_path: row.file_path,
            file_type: row.file_type,
            file_size: row.file_size,
            has_watermark: Boolean(row.has_watermark),
            watermarked_path: row.watermarked_path || undefined,
            upload_time: row.upload_time,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        };
        return res;
    }

    listAttachments(project_item_id: number): Attachment[] {
        const stmt = this.db.prepare(`
            SELECT attachment_id, project_item_id, file_name, original_name, file_path,
                   file_type, file_size, has_watermark, watermarked_path, upload_time, metadata
            FROM attachments
            WHERE project_item_id = ?
            ORDER BY upload_time ASC
        `);

        const rows = stmt.all(project_item_id) as Array<{
            attachment_id: number;
            project_item_id: number;
            file_name: string;
            original_name: string;
            file_path: string;
            file_type: string;
            file_size: number;
            has_watermark: number;
            watermarked_path?: string | null;
            upload_time: number;
            metadata?: string | null;
        }>;
        return rows.map((row) => ({
            attachment_id: row.attachment_id,
            project_item_id: row.project_item_id,
            file_name: row.file_name,
            original_name: row.original_name,
            file_path: row.file_path,
            file_type: row.file_type,
            file_size: row.file_size,
            has_watermark: Boolean(row.has_watermark),
            watermarked_path: row.watermarked_path || undefined,
            upload_time: row.upload_time,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        }));
    }

    deleteAttachment(attachment_id: number): boolean {
        const attachment = this.getAttachment(attachment_id);
        if (!attachment) return false;

        return DatabaseService.getInstance().transaction(() => {
            // Delete files from filesystem
            const originalPath = join(this.getStoragePath(), attachment.file_path);
            if (existsSync(originalPath)) {
                unlinkSync(originalPath);
            }

            if (attachment.watermarked_path) {
                const watermarkedPath = join(this.getStoragePath(), attachment.watermarked_path);
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

        return join(this.getStoragePath(), path);
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

    // Remove watermarked file and reset flags
    clearWatermark(attachment_id: number): boolean {
        const attachment = this.getAttachment(attachment_id);
        if (!attachment) return false;

        // Remove watermarked file from disk if present
        if (attachment.watermarked_path) {
            const abs = join(this.getStoragePath(), attachment.watermarked_path);
            if (existsSync(abs)) {
                try { unlinkSync(abs); } catch { /* ignore unlink errors */ }
            }
        }

        // Reset DB flags
        const stmt = this.db.prepare(`
            UPDATE attachments
            SET has_watermark = 0, watermarked_path = NULL
            WHERE attachment_id = ?
        `);
        const result = stmt.run(attachment_id);

        // Update project item status back to 'uploaded'
        const updateStmt = this.db.prepare(`
            UPDATE project_items
            SET status = 'uploaded'
            WHERE project_item_id = ?
        `);
        updateStmt.run(attachment.project_item_id);

        return result.changes > 0;
    }

    getStoragePath(): string {
        // Keep in sync with settings in case changed elsewhere
        const configured = this.settingsService.getDefaultStoragePath();
        if (configured && configured !== this.storagePath) {
            this.storagePath = configured;
            if (!existsSync(this.storagePath)) {
                mkdirSync(this.storagePath, { recursive: true });
            }
        }
        return this.storagePath;
    }

    /**
     * Migrate entire storage root to a new path, preserving relative layout.
     * Updates internal storagePath after successful move.
     */
    migrateStorage(newRoot: string): boolean {
        const currentRoot = this.getStoragePath();
        if (!newRoot || newRoot === currentRoot) return true;

        // Ensure parent directory exists
        try { mkdirSync(dirname(newRoot), { recursive: true }); } catch { /* ignore mkdir errors */ }

        // If target does not exist, try rename for efficiency
        const performCopyRecursive = () => {
            // Copy contents currentRoot/* -> newRoot/*
            const copyDir = (src: string, dest: string) => {
                if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
                for (const entry of readdirSync(src)) {
                    const s = join(src, entry);
                    const d = join(dest, entry);
                    const st = statSync(s);
                    if (st.isDirectory()) {
                        copyDir(s, d);
                    } else {
                        copyFileSync(s, d);
                    }
                }
            };
            copyDir(currentRoot, newRoot);
            // Remove old directory tree
            try { rmSync(currentRoot, { recursive: true, force: true }); } catch { /* ignore removal errors */ }
        };

        if (!existsSync(newRoot)) {
            try {
                // Try to move the whole directory
                renameSync(currentRoot, newRoot);
            } catch {
                performCopyRecursive();
            }
        } else {
            // Target exists, copy into it
            performCopyRecursive();
        }

        // Update internal state
        this.storagePath = newRoot;
        // Ensure exists
        if (!existsSync(this.storagePath)) {
            mkdirSync(this.storagePath, { recursive: true });
        }
        return true;
    }

    // Sanitize base file name (without extension)
    private sanitizeFileNameBase(name: string): string {
        const replaced = name
            .replace(/[\\/:*?"<>|]/g, "_")
            .replace(/\s+/g, " ")
            .trim();
        // Avoid empty names
        return replaced.length > 0 ? replaced : "file";
    }

    // Rename attachment file and update DB (preserving extension)
    renameAttachment(attachment_id: number, newBaseName: string): Attachment | null {
        const attachment = this.getAttachment(attachment_id);
        if (!attachment) return null;

        const oldAbsPath = join(this.getStoragePath(), attachment.file_path);
        const directoryPath = dirname(oldAbsPath);

        const ext = extname(attachment.file_name) || (attachment.file_type ? `.${attachment.file_type}` : "");
        let base = this.sanitizeFileNameBase(newBaseName);
        if (base.toLowerCase().endsWith(ext.toLowerCase())) {
            // If user mistakenly includes extension, strip it to avoid double ext
            base = base.slice(0, -ext.length);
        }

        // Ensure unique file name in the same directory
        let candidate = `${base}${ext}`;
        let counter = 1;
        while (existsSync(join(directoryPath, candidate))) {
            candidate = `${base}-${counter}${ext}`;
            counter += 1;
        }

        const newAbsPath = join(directoryPath, candidate);
        renameSync(oldAbsPath, newAbsPath);

        // Build new relative path from storage root
        const relativeDirFromStorage = dirname(attachment.file_path); // e.g., <project_id>/items/<item_id>/original
        const newRelativePath = join(relativeDirFromStorage, candidate);

        // If a watermarked file exists, rename it to keep base name consistent
        let newWatermarkedRelativePath: string | undefined = undefined;
        if (attachment.watermarked_path) {
            const oldWaterAbs = join(this.getStoragePath(), attachment.watermarked_path);
            if (existsSync(oldWaterAbs)) {
                const waterDir = dirname(oldWaterAbs);
                const waterExt = extname(oldWaterAbs) || ".png";
                // Keep the `_wm` suffix pattern used by WatermarkService
                let waterCandidate = `${base}_wm${waterExt}`;
                let wcounter = 1;
                while (existsSync(join(waterDir, waterCandidate))) {
                    waterCandidate = `${base}-${wcounter}_wm${waterExt}`;
                    wcounter += 1;
                }
                const newWaterAbs = join(waterDir, waterCandidate);
                try { renameSync(oldWaterAbs, newWaterAbs); } catch { /* ignore rename errors */ }

                // Build watermarked relative path from storage root
                const waterRelDirFromStorage = dirname(attachment.watermarked_path);
                newWatermarkedRelativePath = join(waterRelDirFromStorage, waterCandidate);
            }
        }

        // Update DB (and watermarked path if changed)
        const stmt = this.db.prepare(`
            UPDATE attachments
            SET file_name = ?, original_name = ?, file_path = ?, watermarked_path = COALESCE(?, watermarked_path)
            WHERE attachment_id = ?
        `);
        stmt.run(candidate, candidate, newRelativePath, newWatermarkedRelativePath ?? null, attachment_id);

        return this.getAttachment(attachment_id);
    }
}


