import type {
    CreateTemplateItemRequest,
    CreateTemplateRequest,
    Template,
    TemplateWithItems,
    UpdateTemplateItemRequest,
    UpdateTemplateRequest,
} from "@common/types";
import { useCallback, useEffect, useState } from "react";

export function useTemplates() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadTemplates = useCallback(async (filter?: { search?: string }) => {
        setLoading(true);
        setError(null);
        try {
            const response = await window.ContextBridge.template.list(filter);
            if (response.success && response.data) {
                setTemplates(response.data);
            } else {
                setError(response.error || "Failed to load templates");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createTemplate = useCallback(async (request: CreateTemplateRequest) => {
        setError(null);
        const response = await window.ContextBridge.template.create(request);
        if (response.success) {
            await loadTemplates();
            return response.data!;
        } else {
            setError(response.error || "Failed to create template");
            throw new Error(response.error);
        }
    }, [loadTemplates]);

    const updateTemplate = useCallback(async (request: UpdateTemplateRequest) => {
        setError(null);
        const response = await window.ContextBridge.template.update(request);
        if (response.success) {
            await loadTemplates();
            return response.data!;
        } else {
            setError(response.error || "Failed to update template");
            throw new Error(response.error);
        }
    }, [loadTemplates]);

    const deleteTemplate = useCallback(async (template_id: number) => {
        setError(null);
        const response = await window.ContextBridge.template.delete(template_id);
        if (response.success) {
            await loadTemplates();
        } else {
            setError(response.error || "Failed to delete template");
            throw new Error(response.error);
        }
    }, [loadTemplates]);

    const cloneTemplate = useCallback(async (template_id: number, new_name: string) => {
        setError(null);
        const response = await window.ContextBridge.template.clone(template_id, new_name);
        if (response.success) {
            await loadTemplates();
            return response.data!;
        } else {
            setError(response.error || "Failed to clone template");
            throw new Error(response.error);
        }
    }, [loadTemplates]);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    return {
        templates,
        loading,
        error,
        loadTemplates,
        createTemplate,
        updateTemplate,
        deleteTemplate,
        cloneTemplate,
    };
}

export function useTemplate(template_id: number | null) {
    const [template, setTemplate] = useState<TemplateWithItems | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadTemplate = useCallback(async (id: number) => {
        setLoading(true);
        setError(null);
        try {
            const response = await window.ContextBridge.template.get(id);
            if (response.success && response.data) {
                setTemplate(response.data);
            } else {
                setError(response.error || "Failed to load template");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createItem = useCallback(async (request: CreateTemplateItemRequest) => {
        setError(null);
        const response = await window.ContextBridge.templateItem.create(request);
        if (response.success && template_id) {
            await loadTemplate(template_id);
            return response.data!;
        } else {
            setError(response.error || "Failed to create item");
            throw new Error(response.error);
        }
    }, [template_id, loadTemplate]);

    const updateItem = useCallback(async (request: UpdateTemplateItemRequest) => {
        setError(null);
        const response = await window.ContextBridge.templateItem.update(request);
        if (response.success && template_id) {
            await loadTemplate(template_id);
            return response.data!;
        } else {
            setError(response.error || "Failed to update item");
            throw new Error(response.error);
        }
    }, [template_id, loadTemplate]);

    const deleteItem = useCallback(async (item_id: number) => {
        setError(null);
        const response = await window.ContextBridge.templateItem.delete(item_id);
        if (response.success && template_id) {
            await loadTemplate(template_id);
        } else {
            setError(response.error || "Failed to delete item");
            throw new Error(response.error);
        }
    }, [template_id, loadTemplate]);

    useEffect(() => {
        if (template_id) {
            loadTemplate(template_id);
        }
    }, [template_id, loadTemplate]);

    return {
        template,
        loading,
        error,
        loadTemplate,
        createItem,
        updateItem,
        deleteItem,
    };
}


