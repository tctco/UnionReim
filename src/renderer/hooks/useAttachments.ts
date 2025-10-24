import type { Attachment } from "@common/types";
import { useCallback } from "react";
import { callIpc, useAsyncTask } from "./useAsync";
/**
 * Hooks for Attachment operations with consistent error handling.
 */

export function useAttachments() {
    const { loading, error, run, reset } = useAsyncTask();

    const uploadAttachment = useCallback(async (project_item_id: number) => {
        return await run(async () => {
            const data = await callIpc(() => window.ContextBridge.attachment.upload(project_item_id), "Failed to upload attachment");
            return data as Attachment[];
        });
    }, []);

    const listAttachments = useCallback(async (project_item_id: number) => {
        const data = await callIpc(() => window.ContextBridge.attachment.list(project_item_id), "Failed to list attachments");
        return data || [];
    }, []);

    const deleteAttachment = useCallback(async (attachment_id: number) => {
        reset();
        await callIpc(() => window.ContextBridge.attachment.delete(attachment_id), "Failed to delete attachment");
        return true;
    }, []);

    const getAttachmentPath = useCallback(async (attachment_id: number, use_watermarked: boolean = false) => {
        const data = await callIpc(() => window.ContextBridge.attachment.getPath(attachment_id, use_watermarked), "Failed to get attachment path");
        return data || null;
    }, []);

    const openExternal = useCallback(async (attachment_id: number, use_watermarked: boolean = false) => {
        reset();
        await callIpc(() => window.ContextBridge.attachment.openExternal(attachment_id, use_watermarked), "Failed to open file");
    }, []);

    const uploadFromPaths = useCallback(
        async (
            project_item_id: number,
            files: Array<{ path: string; original_name?: string }>,
        ) => {
            return await run(async () => {
                const data = await callIpc(() => window.ContextBridge.attachment.uploadFromPaths(project_item_id, files), "Failed to upload from paths");
                return data as Attachment[];
            });
        },
        [],
    );

    const uploadFromData = useCallback(
        async (
            project_item_id: number,
            files: Array<{ data: ArrayBuffer | Uint8Array; name?: string; mime?: string }>,
        ) => {
            // Normalize to Uint8Array for IPC
            const payload = files.map((f) => ({
                data: f.data instanceof Uint8Array ? Array.from(f.data) : Array.from(new Uint8Array(f.data)),
                name: f.name,
                mime: f.mime,
            }));
            return await run(async () => {
                const data = await callIpc(() => window.ContextBridge.attachment.uploadFromData(project_item_id, payload), "Failed to upload from data");
                return data as Attachment[];
            });
        },
        [],
    );

    const renameAttachment = useCallback(async (attachment_id: number, new_name: string) => {
        reset();
        return await callIpc(() => window.ContextBridge.attachment.rename(attachment_id, new_name), "Failed to rename attachment");
    }, []);

    const applyWatermark = useCallback(async (attachment_id: number) => {
        return await run(async () => {
            const data = await callIpc(() => window.ContextBridge.watermark.apply(attachment_id), "Failed to apply watermark");
            return data as string;
        });
    }, []);

    const applyWatermarkWithOptions = useCallback(async (attachment_id: number, req?: { watermark_text?: string; config?: any }) => {
        return await run(async () => {
            const data = await callIpc(() => window.ContextBridge.watermark.apply(attachment_id, req), "Failed to apply watermark");
            return data as string;
        });
    }, []);

    const removeWatermark = useCallback(async (attachment_id: number) => {
        reset();
        await callIpc(() => window.ContextBridge.watermark.delete(attachment_id), "Failed to delete watermark");
        return true;
    }, []);

    return {
        loading,
        error,
        uploadAttachment,
        listAttachments,
        deleteAttachment,
        getAttachmentPath,
        openExternal,
        renameAttachment,
        uploadFromPaths,
        uploadFromData,
        applyWatermark,
        applyWatermarkWithOptions,
        removeWatermark,
    };
}
