import type {
    CreateTemplateItemRequest,
    CreateTemplateRequest,
    Template,
    TemplateWithItems,
    UpdateTemplateItemRequest,
    UpdateTemplateRequest,
} from "@common/types";
import { useCallback, useEffect, useState } from "react";
import { callIpc, useAsyncTask } from "./useAsync";
/**
 * Hooks for Template entities. These wrappers centralize
 * loading/error management and bridge error handling.
 */

export function useTemplates() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const { loading, error, run, reset } = useAsyncTask();

    const loadTemplates = useCallback(async (filter?: { search?: string }) => {
        await run(async () => {
            const data = await callIpc(() => window.ContextBridge.template.list(filter), "Failed to load templates");
            setTemplates(data || []);
            return data as unknown as void;
        });
    }, []);

    const createTemplate = useCallback(async (request: CreateTemplateRequest) => {
        reset();
        const created = await callIpc(() => window.ContextBridge.template.create(request), "Failed to create template");
        await loadTemplates();
        return created;
    }, [loadTemplates]);

    const updateTemplate = useCallback(async (request: UpdateTemplateRequest) => {
        reset();
        const updated = await callIpc(() => window.ContextBridge.template.update(request), "Failed to update template");
        await loadTemplates();
        return updated;
    }, [loadTemplates]);

    const deleteTemplate = useCallback(async (template_id: number) => {
        reset();
        await callIpc(() => window.ContextBridge.template.delete(template_id), "Failed to delete template");
        await loadTemplates();
    }, [loadTemplates]);

    const cloneTemplate = useCallback(async (template_id: number, new_name: string) => {
        reset();
        const cloned = await callIpc(() => window.ContextBridge.template.clone(template_id, new_name), "Failed to clone template");
        await loadTemplates();
        return cloned;
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
    const { loading, error, run, reset } = useAsyncTask();

    const loadTemplate = useCallback(async (id: number) => {
        await run(async () => {
            const data = await callIpc(() => window.ContextBridge.template.get(id), "Failed to load template");
            setTemplate(data || null);
            return undefined as unknown as void;
        });
    }, []);

    const createItem = useCallback(async (request: CreateTemplateItemRequest) => {
        reset();
        const newItem = await callIpc(() => window.ContextBridge.templateItem.create(request), "Failed to create item");
        setTemplate((prev) => {
            if (!prev) return prev;
            if (prev.template_id !== newItem.template_id) return prev;
            return { ...prev, items: [...prev.items, newItem] };
        });
        return newItem;
    }, []);

    const updateItem = useCallback(async (request: UpdateTemplateItemRequest) => {
        reset();
        const updatedItem = await callIpc(() => window.ContextBridge.templateItem.update(request), "Failed to update item");
        setTemplate((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                items: prev.items.map((i) => (i.item_id === updatedItem.item_id ? updatedItem : i)),
            };
        });
        return updatedItem;
    }, []);

    const deleteItem = useCallback(async (item_id: number) => {
        reset();
        await callIpc(() => window.ContextBridge.templateItem.delete(item_id), "Failed to delete item");
        setTemplate((prev) => {
            if (!prev) return prev;
            return { ...prev, items: prev.items.filter((i) => i.item_id !== item_id) };
        });
    }, []);

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


