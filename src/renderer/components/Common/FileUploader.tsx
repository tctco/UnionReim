import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { makeStyles, tokens, Spinner } from "@fluentui/react-components";
import { ALLOWED_ATTACHMENT_EXTS } from "@common/constants";
import { Attach24Regular } from "@fluentui/react-icons";

type UploadCandidate = { path: string; original_name?: string };
type UploadData = { data: ArrayBuffer; name?: string; mime?: string };

type FileUploaderContextValue = {
    isDragging: boolean;
    isUploading: boolean;
};

const FileUploaderContext = createContext<FileUploaderContextValue | null>(null);

export function useFileUploader(): FileUploaderContextValue {
    const ctx = useContext(FileUploaderContext);
    if (!ctx) return { isDragging: false, isUploading: false };
    return ctx;
}

const useStyles = makeStyles({
    wrapper: {
        position: "relative",
    },
    overlay: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: tokens.colorTransparentBackgroundHover,
        border: `2px dashed ${tokens.colorBrandForeground1}`,
        borderRadius: tokens.borderRadiusMedium,
    },
    busyOverlay: {
        position: "absolute",
        inset: 0,
        pointerEvents: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: tokens.colorTransparentBackground,
        borderRadius: tokens.borderRadiusMedium,
        backdropFilter: "blur(2px)",
    },
});

export interface FileUploaderProps {
    onUpload: (files: UploadCandidate[]) => void | Promise<void>;
    onUploadData?: (files: UploadData[]) => void | Promise<void>;
    acceptExts?: string[]; // e.g. ["png","jpg","jpeg","pdf","ofd"]
    busy?: boolean; // external control to force uploading overlay
    children: React.ReactNode | ((api: { isDragging: boolean }) => React.ReactNode);
}

export function FileUploader(props: FileUploaderProps) {
    const { onUpload, onUploadData, acceptExts = [...ALLOWED_ATTACHMENT_EXTS], busy, children } = props;
    const styles = useStyles();
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const dragCounterRef = useRef(0);

    const isAllowed = useCallback(
        (name: string) => {
            const ext = (name.split(".").pop() || "").toLowerCase();
            return acceptExts.includes(ext);
        },
        [acceptExts],
    );

    const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const onDragEnter: React.DragEventHandler<HTMLDivElement> = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current += 1;
        setIsDragging(true);
    };
    const onDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
        if (dragCounterRef.current === 0) setIsDragging(false);
    };
    const onDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = 0;
        setIsDragging(false);
        const dtFiles = e.dataTransfer?.files;
        const files = Array.from(dtFiles || []);
        const candidates: UploadCandidate[] = [];
        const dataCandidates: UploadData[] = [];
        for (const f of files) {
            // Electron File has a .path; fall back to ignoring entries without path
            const filePath = (f as unknown as { path?: string }).path as string | undefined;
            const name = (f as File).name || filePath || "file";
            if (!name) continue;
            if (!isAllowed(name)) continue;
            if (filePath) {
                candidates.push({ path: filePath, original_name: name });
            } else if (onUploadData) {
                try {
                    const buf = await (f as File).arrayBuffer();
                    dataCandidates.push({ data: buf, name, mime: (f as File).type || undefined });
                } catch {
                    // ignore
                }
            }
        }
        if (candidates.length === 0 && (!onUploadData || dataCandidates.length === 0)) return;
        try {
            setIsUploading(true);
            if (candidates.length > 0) await onUpload(candidates);
            if (onUploadData && dataCandidates.length > 0) await onUploadData(dataCandidates);
        } finally {
            setIsUploading(false);
        }
    };

    const effectiveUploading = !!(busy || isUploading);
    const ctxValue = useMemo(() => ({ isDragging, isUploading: effectiveUploading }), [isDragging, effectiveUploading]);

    const content = typeof children === "function" ? (children as (api: { isDragging: boolean }) => React.ReactNode)({ isDragging }) : children;

    return (
        <FileUploaderContext.Provider value={ctxValue}>
            <div
                className={styles.wrapper}
                aria-busy={effectiveUploading}
                onDragOver={effectiveUploading ? undefined : onDragOver}
                onDragEnter={effectiveUploading ? undefined : onDragEnter}
                onDragLeave={effectiveUploading ? undefined : onDragLeave}
                onDrop={effectiveUploading ? undefined : onDrop}
            >
                {content}
                {isDragging && !effectiveUploading && (
                    <div className={styles.overlay} style={{ pointerEvents: "none" }}>
                        <Attach24Regular />
                    </div>
                )}
                {effectiveUploading && (
                    <div className={styles.busyOverlay}>
                        <Spinner label="Uploading..." />
                    </div>
                )}
            </div>
        </FileUploaderContext.Provider>
    );
}

export default FileUploader;
