import Database from "better-sqlite3";
import { app } from "electron";
import { join } from "path";

const SCHEMA_SQL = `
-- Templates table: stores template metadata
CREATE TABLE IF NOT EXISTS templates (
    template_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    creator TEXT,
    is_default INTEGER DEFAULT 0,
    create_time INTEGER NOT NULL,
    update_time INTEGER NOT NULL
);

-- Template items table: defines items within each template
CREATE TABLE IF NOT EXISTS template_items (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_required INTEGER DEFAULT 0,
    file_types TEXT,
    needs_watermark INTEGER DEFAULT 0,
    watermark_template TEXT,
    allows_multiple_files INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    category TEXT,
    FOREIGN KEY (template_id) REFERENCES templates(template_id) ON DELETE CASCADE
);

-- Projects table: stores reimbursement project instances
CREATE TABLE IF NOT EXISTS projects (
    project_id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    creator TEXT,
    status TEXT DEFAULT 'incomplete',
    metadata TEXT,
    create_time INTEGER NOT NULL,
    update_time INTEGER NOT NULL,
    FOREIGN KEY (template_id) REFERENCES templates(template_id)
);

-- Project items table: stores item instances in each project
CREATE TABLE IF NOT EXISTS project_items (
    project_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    template_item_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    upload_time INTEGER,
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (template_item_id) REFERENCES template_items(item_id)
);

-- Attachments table: stores file records for each project item
CREATE TABLE IF NOT EXISTS attachments (
    attachment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_item_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    has_watermark INTEGER DEFAULT 0,
    watermarked_path TEXT,
    upload_time INTEGER NOT NULL,
    metadata TEXT,
    FOREIGN KEY (project_item_id) REFERENCES project_items(project_item_id) ON DELETE CASCADE
);

-- Settings table: stores application settings
CREATE TABLE IF NOT EXISTS settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    update_time INTEGER NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_template_items_template ON template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_projects_template ON projects(template_id);
CREATE INDEX IF NOT EXISTS idx_project_items_project ON project_items(project_id);
CREATE INDEX IF NOT EXISTS idx_project_items_template ON project_items(template_item_id);
CREATE INDEX IF NOT EXISTS idx_attachments_project_item ON attachments(project_item_id);

-- Document templates table: stores free-form document templates
CREATE TABLE IF NOT EXISTS documents (
    document_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    creator TEXT,
    content_html TEXT NOT NULL,
    create_time INTEGER NOT NULL,
    update_time INTEGER NOT NULL
);

-- Project documents table: documents attached to a project
CREATE TABLE IF NOT EXISTS project_documents (
    project_document_id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    content_html TEXT NOT NULL,
    pdf_path TEXT,
    create_time INTEGER NOT NULL,
    update_time INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);
`;

export class DatabaseService {
    private db: Database.Database;
    private static instance: DatabaseService;

    private constructor() {
        const userDataPath = app.getPath("userData");
        const dbPath = join(userDataPath, "reimbursement.db");

        this.db = new Database(dbPath);
        this.db.pragma("foreign_keys = ON");
        this.initializeSchema();
    }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    private initializeSchema(): void {
        // Execute schema in a transaction
        this.db.exec(SCHEMA_SQL);
        
        // Run migrations
        this.runMigrations();
    }

    private runMigrations(): void {
        // Get current schema version
        const versionResult = this.db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='schema_version'
        `).get();

        let currentVersion = 0;
        if (versionResult) {
            const versionRow = this.db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as { version: number } | undefined;
            currentVersion = versionRow?.version || 0;
        } else {
            // Create schema_version table
            this.db.exec(`
                CREATE TABLE schema_version (
                    version INTEGER PRIMARY KEY,
                    applied_at INTEGER NOT NULL
                )
            `);
        }

        // Migration 1: Add creator field to templates table
        if (currentVersion < 1) {
            try {
                // Check if creator column already exists
                const columnExists = this.db.prepare(`
                    SELECT COUNT(*) as count FROM pragma_table_info('templates') 
                    WHERE name = 'creator'
                `).get() as { count: number };

                if (columnExists.count === 0) {
                    this.db.exec('ALTER TABLE templates ADD COLUMN creator TEXT');
                    console.log('Migration 1: Added creator column to templates table');
                }

                // Record migration
                this.db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(1, Date.now());
            } catch (error) {
                console.error('Migration 1 failed:', error);
            }
        }

        // Migration 2: Ensure documents tables exist (no-op if created by SCHEMA_SQL)
        if (currentVersion < 2) {
            try {
                // just record version, tables are created via SCHEMA_SQL above
                this.db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(2, Date.now());
            } catch (error) {
                console.error('Migration 2 failed:', error);
            }
        }

        // Migration 3: Add creator field to documents table
        if (currentVersion < 3) {
            try {
                const columnExists = this.db.prepare(`
                    SELECT COUNT(*) as count FROM pragma_table_info('documents')
                    WHERE name = 'creator'
                `).get() as { count: number };

                if (columnExists.count === 0) {
                    this.db.exec('ALTER TABLE documents ADD COLUMN creator TEXT');
                    console.log('Migration 3: Added creator column to documents table');
                }

                this.db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(3, Date.now());
            } catch (error) {
                console.error('Migration 3 failed:', error);
            }
        }

        console.log(`Database migrations completed. Current version: ${Math.max(currentVersion, 3)}`);
    }

    public getDatabase(): Database.Database {
        return this.db;
    }

    public close(): void {
        this.db.close();
    }

    // Transaction helpers
    public transaction<T>(fn: () => T): T {
        const transaction = this.db.transaction(fn);
        return transaction();
    }

    public async asyncTransaction<T>(fn: () => Promise<T>): Promise<T> {
        return fn();
    }
}
