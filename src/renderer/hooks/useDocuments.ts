import { useCallback, useEffect, useState } from "react";
import type {
  CreateDocumentTemplateRequest,
  CreateProjectDocumentRequest,
  DocumentTemplate,
  ProjectDocument,
  UpdateDocumentTemplateRequest,
  UpdateProjectDocumentRequest,
} from "@common/types";
import { callIpc, useAsyncTask } from "./useAsync";

export function useDocumentTemplates() {
  const [documents, setDocuments] = useState<DocumentTemplate[]>([]);
  const { loading, error, run, reset } = useAsyncTask();

  const loadDocuments = useCallback(async (filter?: { search?: string }) => {
    await run(async () => {
      const data = await callIpc(() => window.ContextBridge.document.list(filter), "Failed to load documents");
      setDocuments(data || []);
      return undefined as unknown as void;
    });
  }, []);

  const createDocument = useCallback(async (req: CreateDocumentTemplateRequest) => {
    reset();
    const created = await callIpc(() => window.ContextBridge.document.create(req), "Failed to create document");
    await loadDocuments();
    return created;
  }, [loadDocuments]);

  const updateDocument = useCallback(async (req: UpdateDocumentTemplateRequest) => {
    reset();
    const updated = await callIpc(() => window.ContextBridge.document.update(req), "Failed to update document");
    await loadDocuments();
    return updated;
  }, [loadDocuments]);

  const deleteDocument = useCallback(async (document_id: number) => {
    reset();
    await callIpc(() => window.ContextBridge.document.delete(document_id), "Failed to delete document");
    await loadDocuments();
  }, [loadDocuments]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  return { documents, loading, error, loadDocuments, createDocument, updateDocument, deleteDocument };
}

export function useDocument(document_id: number | null) {
  const [document, setDocument] = useState<DocumentTemplate | null>(null);
  const { loading, error, run } = useAsyncTask();

  const loadDocument = useCallback(async (id: number) => {
    await run(async () => {
      const d = await callIpc(() => window.ContextBridge.document.get(id), "Failed to load document");
      setDocument(d || null);
      return undefined as unknown as void;
    });
  }, []);

  useEffect(() => { if (document_id) loadDocument(document_id); }, [document_id, loadDocument]);

  return { document, loading, error, loadDocument };
}

export function useProjectDocuments(project_id: number | null) {
  const [docs, setDocs] = useState<ProjectDocument[]>([]);
  const { loading, error, run, reset } = useAsyncTask();

  const load = useCallback(async (pid: number) => {
    await run(async () => {
      const data = await callIpc(() => window.ContextBridge.projectDocument.list(pid), "Failed to load project documents");
      setDocs(data || []);
      return undefined as unknown as void;
    });
  }, []);

  const create = useCallback(async (req: CreateProjectDocumentRequest) => {
    reset();
    const d = await callIpc(() => window.ContextBridge.projectDocument.create(req), "Failed to create project document");
    if (req.project_id) await load(req.project_id);
    return d;
  }, [load]);

  const update = useCallback(async (req: UpdateProjectDocumentRequest & { project_id?: number }) => {
    reset();
    const d = await callIpc(() => window.ContextBridge.projectDocument.update(req), "Failed to update project document");
    if ((req as any).project_id) await load((req as any).project_id);
    return d;
  }, [load]);

  const remove = useCallback(async (project_document_id: number, pid?: number) => {
    reset();
    await callIpc(() => window.ContextBridge.projectDocument.delete(project_document_id), "Failed to delete project document");
    if (pid) await load(pid);
  }, [load]);

  return { docs, loading, error, load, create, update, remove };
}

