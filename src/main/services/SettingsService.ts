import type Database from "better-sqlite3";
import { DatabaseService } from "../database/Database";
import { DEFAULT_STORAGE_PATH } from "../electronConfigs";
import type { AppSettings, WatermarkSettings } from "@common/types";

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
            // Default to a single resolved path constant in main
            defaultStoragePath: DEFAULT_STORAGE_PATH,
            // optional: defaultUserName, studentId, signatureImagePath are not set here
            watermark: {
                textMode: 'template',
                fontFamily: 'Arial',
                fontSize: 48,
                bold: false,
                italic: false,
                underline: false,
                color: '#000000',
                opacity: 0.3,
                rotation: -45,
                xPercent: 50,
                yPercent: 50,
            },
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
            theme: (allSettings.theme as 'light' | 'dark' | 'system') || 'system',
            defaultStoragePath: allSettings.defaultStoragePath || undefined,
            language: allSettings.language || 'zh-CN',
            hoverPreviewWidth: allSettings.hoverPreviewWidth ? Number(allSettings.hoverPreviewWidth) : 400,
            hoverPreviewHeight: allSettings.hoverPreviewHeight ? Number(allSettings.hoverPreviewHeight) : 400,
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
}
