import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { makeStyles, tokens } from "@fluentui/react-components";
import { Attach24Regular } from "@fluentui/react-icons";

type UploadCandidate = { path: string; original_name?: string };
type UploadData = { data: ArrayBuffer; name?: string; mime?: string };

type FileUploaderContextValue = {
    isDragging: boolean;
};

const FileUploaderContext = createContext<FileUploaderContextValue | null>(null);

export function useFileUploader(): FileUploaderContextValue {
    const ctx = useContext(FileUploaderContext);
    if (!ctx) return { isDragging: false };
    return ctx;
}

const useStyles = makeStyles({
    wrapper: {
        position: "relative",
    },
    overlay: {
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: tokens.colorTransparentBackgroundHover,
        border: `2px dashed ${tokens.colorBrandForeground1}`,
        borderRadius: tokens.borderRadiusMedium,
    },
});

export interface FileUploaderProps {
    onUpload: (files: UploadCandidate[]) => void | Promise<void>;
    onUploadData?: (files: UploadData[]) => void | Promise<void>;
    acceptExts?: string[]; // e.g. ["png","jpg","jpeg","pdf","ofd"]
    children: React.ReactNode | ((api: { isDragging: boolean }) => React.ReactNode);
}

export function FileUploader(props: FileUploaderProps) {
    const { onUpload, onUploadData, acceptExts = ["png", "jpg", "jpeg", "pdf", "ofd"], children } = props;
    const styles = useStyles();
    const [isDragging, setIsDragging] = useState(false);
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
        if (candidates.length > 0) await onUpload(candidates);
        if (onUploadData && dataCandidates.length > 0) await onUploadData(dataCandidates);
    };

    const ctxValue = useMemo(() => ({ isDragging }), [isDragging]);

    const content = typeof children === "function" ? (children as (api: { isDragging: boolean }) => React.ReactNode)({ isDragging }) : children;

    return (
        <FileUploaderContext.Provider value={ctxValue}>
            <div className={styles.wrapper} onDragOver={onDragOver} onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDrop={onDrop}>
                {content}
                {isDragging && (
                    <div className={styles.overlay}>
                        <Attach24Regular />
                    </div>
                )}
            </div>
        </FileUploaderContext.Provider>
    );
}

export default FileUploader;


