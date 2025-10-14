import type { Attachment } from "@common/types";
import { useCallback, useState } from "react";

export function useAttachments() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const uploadAttachment = useCallback(async (project_item_id: number) => {
        setLoading(true);
        setError(null);
        try {
            const response = await window.ContextBridge.attachment.upload(project_item_id);
            if (response.success && response.data) {
                return response.data;
            } else {
                setError(response.error || "Failed to upload attachment");
                throw new Error(response.error);
            }
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const listAttachments = useCallback(async (project_item_id: number) => {
        const response = await window.ContextBridge.attachment.list(project_item_id);
        if (response.success && response.data) {
            return response.data;
        }
        return [];
    }, []);

    const deleteAttachment = useCallback(async (attachment_id: number) => {
        setError(null);
        const response = await window.ContextBridge.attachment.delete(attachment_id);
        if (response.success) {
            return true;
        } else {
            setError(response.error || "Failed to delete attachment");
            throw new Error(response.error);
        }
    }, []);

    const getAttachmentPath = useCallback(async (attachment_id: number, use_watermarked: boolean = false) => {
        const response = await window.ContextBridge.attachment.getPath(attachment_id, use_watermarked);
        if (response.success && response.data) {
            return response.data;
        }
        return null;
    }, []);

    const openExternal = useCallback(async (attachment_id: number) => {
        setError(null);
        const response = await window.ContextBridge.attachment.openExternal(attachment_id);
        if (!response.success) {
            setError(response.error || "Failed to open file");
            throw new Error(response.error);
        }
    }, []);

    const applyWatermark = useCallback(async (attachment_id: number) => {
        setLoading(true);
        setError(null);
        try {
            const response = await window.ContextBridge.watermark.apply(attachment_id);
            if (response.success && response.data) {
                return response.data;
            } else {
                setError(response.error || "Failed to apply watermark");
                throw new Error(response.error);
            }
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        uploadAttachment,
        listAttachments,
        deleteAttachment,
        getAttachmentPath,
        openExternal,
        applyWatermark,
    };
}


