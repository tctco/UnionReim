import type Database from "better-sqlite3";
import { DatabaseService } from "../database/Database";
import { DEFAULT_STORAGE_PATH } from "../electronConfigs";
import type { AppSettings, WatermarkSettings } from "@common/types";
import { DEFAULT_SIGNATURE_IMAGE_HEIGHT_CM, DEFAULT_WATERMARK_SETTINGS } from "@common/constants";
import { basename, extname, join } from "path";
import { existsSync, mkdirSync, copyFileSync, writeFileSync } from "fs";

export class SettingsService {
    private db: Database.Database;
    private cache: Map<string, string> = new Map();

    constructor() {
        this.db = DatabaseService.getInstance().getDatabase();
        this.initializeDefaults();
    }

    private initializeDefaults(): void {
        const defaults: AppSettings = {
            theme: 'system',
            language: 'zh-CN',
            hoverPreviewWidth: 400,
            hoverPreviewHeight: 400,
            autoWatermarkImages: false,
            // Default to a single resolved path constant in main
            defaultStoragePath: DEFAULT_STORAGE_PATH,
            signatureImageHeightCm: DEFAULT_SIGNATURE_IMAGE_HEIGHT_CM,
            // optional: defaultUserName, studentId, signatureImagePath are not set here
            watermark: DEFAULT_WATERMARK_SETTINGS,
        };

        for (const [key, value] of Object.entries(defaults)) {
            if (value === undefined) continue;
            const exists = this.getSetting(key);
            if (exists) continue;
            if (key === 'watermark') {
                this.setSetting(key, JSON.stringify(value));
            } else {
                this.setSetting(key, String(value));
            }
        }
    }

    getSetting(key: string): string | null {
        // Check cache first
        if (this.cache.has(key)) {
            return this.cache.get(key) || null;
        }

        const stmt = this.db.prepare(`
            SELECT setting_value FROM settings WHERE setting_key = ?
        `);
        
        const row = stmt.get(key) as { setting_value: string } | undefined;
        const value = row?.setting_value || null;
        
        // Cache the result
        if (value !== null) {
            this.cache.set(key, value);
        }
        
        return value;
    }

    setSetting(key: string, value: string): void {
        const now = Date.now();
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO settings (setting_key, setting_value, update_time)
            VALUES (?, ?, ?)
        `);
        
        stmt.run(key, value, now);
        
        // Update cache
        this.cache.set(key, value);
    }

    deleteSetting(key: string): boolean {
        const stmt = this.db.prepare(`
            DELETE FROM settings WHERE setting_key = ?
        `);
        
        const result = stmt.run(key);
        
        // Remove from cache
        this.cache.delete(key);
        
        return result.changes > 0;
    }

    getAllSettings(): Record<string, string> {
        const stmt = this.db.prepare(`
            SELECT setting_key, setting_value FROM settings
        `);
        
        const rows = stmt.all() as Array<{ setting_key: string; setting_value: string }>;
        const settings: Record<string, string> = {};
        
        for (const row of rows) {
            settings[row.setting_key] = row.setting_value;
            // Update cache
            this.cache.set(row.setting_key, row.setting_value);
        }
        
        return settings;
    }

    getAppSettings(): AppSettings {
        const allSettings = this.getAllSettings();
        let watermark: WatermarkSettings | undefined;
        const wmRaw = allSettings.watermark;
        if (wmRaw) {
            try {
                watermark = JSON.parse(wmRaw) as WatermarkSettings;
            } catch {
                watermark = undefined;
            }
        }

        return {
            defaultUserName: allSettings.defaultUserName || undefined,
            studentId: allSettings.studentId || undefined,
            signatureImagePath: allSettings.signatureImagePath || undefined,
            signatureImageHeightCm: allSettings.signatureImageHeightCm ? Number(allSettings.signatureImageHeightCm) : DEFAULT_SIGNATURE_IMAGE_HEIGHT_CM,
            theme: (allSettings.theme as 'light' | 'dark' | 'system') || 'system',
            defaultStoragePath: allSettings.defaultStoragePath || undefined,
            language: allSettings.language || 'zh-CN',
            hoverPreviewWidth: allSettings.hoverPreviewWidth ? Number(allSettings.hoverPreviewWidth) : 400,
            hoverPreviewHeight: allSettings.hoverPreviewHeight ? Number(allSettings.hoverPreviewHeight) : 400,
            autoWatermarkImages: allSettings.autoWatermarkImages ? String(allSettings.autoWatermarkImages) === 'true' || String(allSettings.autoWatermarkImages) === '1' : false,
            watermark: watermark,
        };
    }

    updateAppSettings(settings: Partial<AppSettings>): void {
        for (const [key, value] of Object.entries(settings)) {
            if (value === undefined) continue;
            if (key === 'watermark') {
                this.setSetting(key, JSON.stringify(value));
            } else {
                this.setSetting(key, String(value));
            }
        }
    }

    // Utility methods for common settings
    getDefaultUserName(): string | null {
        return this.getSetting('defaultUserName');
    }

    setDefaultUserName(name: string): void {
        this.setSetting('defaultUserName', name);
    }

    getTheme(): 'light' | 'dark' | 'system' {
        const theme = this.getSetting('theme');
        return (theme as 'light' | 'dark' | 'system') || 'system';
    }

    setTheme(theme: 'light' | 'dark' | 'system'): void {
        this.setSetting('theme', theme);
    }

    getDefaultStoragePath(): string | null {
        return this.getSetting('defaultStoragePath');
    }

    setDefaultStoragePath(path: string): void {
        this.setSetting('defaultStoragePath', path);
    }

    /**
     * Save signature image into app storage and update settings.signatureImagePath.
     * Returns the relative path under storage root (e.g., "user/signature/sign_1690000000000.png").
     */
    saveSignatureFromPath(source_file_path: string, original_name?: string): string {
        const storageRoot = this.getDefaultStoragePath() || DEFAULT_STORAGE_PATH;
        const targetDir = join(storageRoot, "user", "signature");
        if (!existsSync(targetDir)) {
            mkdirSync(targetDir, { recursive: true });
        }
        const ext = extname(original_name || source_file_path) || ".png";
        const base = basename(original_name || source_file_path, ext) || "signature";
        const fileName = `${base}_${Date.now()}${ext}`;
        const absDest = join(targetDir, fileName);
        copyFileSync(source_file_path, absDest);
        // store relative path for portability
        const rel = ["user", "signature", fileName].join("/");
        this.setSetting('signatureImagePath', rel);
        return rel;
    }

    /**
     * Save signature image from memory buffer into app storage.
     * Returns the relative path under storage root.
     */
    saveSignatureFromBuffer(data: Buffer, original_name?: string, mime?: string): string {
        const storageRoot = this.getDefaultStoragePath() || DEFAULT_STORAGE_PATH;
        const targetDir = join(storageRoot, "user", "signature");
        if (!existsSync(targetDir)) {
            mkdirSync(targetDir, { recursive: true });
        }
        let ext = extname(original_name || "");
        if (!ext) {
            ext = mime === "image/jpeg" || mime === "image/jpg" ? ".jpg" : mime === "image/png" ? ".png" : ".png";
        }
        const base = (original_name ? basename(original_name, ext) : "signature") || "signature";
        const fileName = `${base}_${Date.now()}${ext}`;
        const absDest = join(targetDir, fileName);
        writeFileSync(absDest, data);
        const rel = ["user", "signature", fileName].join("/");
        this.setSetting('signatureImagePath', rel);
        return rel;
    }
}
