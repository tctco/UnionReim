import type Database from "better-sqlite3";
import { DatabaseService } from "../database/Database";
import type {
  CreateDocumentTemplateRequest,
  CreateProjectDocumentRequest,
  DocumentTemplate,
  ProjectDocument,
  UpdateDocumentTemplateRequest,
  UpdateProjectDocumentRequest,
} from "@common/types";

export class DocumentService {
  private db: Database.Database;

  constructor() {
    this.db = DatabaseService.getInstance().getDatabase();
  }

  // ---- Document Templates ----
  createTemplate(req: CreateDocumentTemplateRequest): DocumentTemplate {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO documents (name, description, content_html, create_time, update_time)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(req.name, req.description || null, req.content_html || "", now, now);
    return this.getTemplate(result.lastInsertRowid as number)!;
  }

  listTemplates(filter?: { search?: string }): DocumentTemplate[] {
    const s = (filter?.search || "").trim();
    if (s) {
      const stmt = this.db.prepare(`
        SELECT * FROM documents WHERE name LIKE ? OR description LIKE ? ORDER BY update_time DESC
      `);
      const like = `%${s}%`;
      return stmt.all(like, like) as unknown as DocumentTemplate[];
    }
    const stmt = this.db.prepare(`SELECT * FROM documents ORDER BY update_time DESC`);
    return stmt.all() as unknown as DocumentTemplate[];
  }

  getTemplate(document_id: number): DocumentTemplate | null {
    const stmt = this.db.prepare(`SELECT * FROM documents WHERE document_id = ?`);
    const row = stmt.get(document_id) as DocumentTemplate | undefined;
    return row || null;
  }

  updateTemplate(req: UpdateDocumentTemplateRequest): DocumentTemplate | null {
    const prev = this.getTemplate(req.document_id);
    if (!prev) return null;
    const next = {
      name: req.name ?? prev.name,
      description: req.description ?? prev.description,
      content_html: req.content_html ?? prev.content_html,
    };
    const stmt = this.db.prepare(`
      UPDATE documents SET name = ?, description = ?, content_html = ?, update_time = ? WHERE document_id = ?
    `);
    stmt.run(next.name, next.description || null, next.content_html, Date.now(), req.document_id);
    return this.getTemplate(req.document_id);
  }

  deleteTemplate(document_id: number): boolean {
    const stmt = this.db.prepare(`DELETE FROM documents WHERE document_id = ?`);
    const result = stmt.run(document_id);
    return result.changes > 0;
  }

  // ---- Project Documents ----
  createProjectDocument(req: CreateProjectDocumentRequest): ProjectDocument {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO project_documents (project_id, name, content_html, create_time, update_time)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(req.project_id, req.name, req.content_html, now, now);
    return this.getProjectDocument(result.lastInsertRowid as number)!;
  }

  listProjectDocuments(project_id: number): ProjectDocument[] {
    const stmt = this.db.prepare(`SELECT * FROM project_documents WHERE project_id = ? ORDER BY update_time DESC`);
    return stmt.all(project_id) as unknown as ProjectDocument[];
  }

  getProjectDocument(project_document_id: number): ProjectDocument | null {
    const stmt = this.db.prepare(`SELECT * FROM project_documents WHERE project_document_id = ?`);
    const row = stmt.get(project_document_id) as ProjectDocument | undefined;
    return row || null;
  }

  updateProjectDocument(req: UpdateProjectDocumentRequest): ProjectDocument | null {
    const prev = this.getProjectDocument(req.project_document_id);
    if (!prev) return null;
    const next = {
      name: req.name ?? prev.name,
      content_html: req.content_html ?? prev.content_html,
    };
    const stmt = this.db.prepare(`
      UPDATE project_documents SET name = ?, content_html = ?, update_time = ? WHERE project_document_id = ?
    `);
    stmt.run(next.name, next.content_html, Date.now(), req.project_document_id);
    return this.getProjectDocument(req.project_document_id);
  }

  setProjectDocumentPdfPath(project_document_id: number, relPath: string): void {
    const stmt = this.db.prepare(`
      UPDATE project_documents SET pdf_path = ?, update_time = ? WHERE project_document_id = ?
    `);
    stmt.run(relPath, Date.now(), project_document_id);
  }

  deleteProjectDocument(project_document_id: number): boolean {
    const stmt = this.db.prepare(`DELETE FROM project_documents WHERE project_document_id = ?`);
    const result = stmt.run(project_document_id);
    return result.changes > 0;
  }
}

