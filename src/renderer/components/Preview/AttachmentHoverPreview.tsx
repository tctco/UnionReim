import { useEffect, useMemo, useState } from "react";
import { makeStyles, tokens, Caption1 } from "@fluentui/react-components";

interface AttachmentHoverPreviewProps {
    visible: boolean;
    x: number;
    y: number;
    attachment: { attachment_id: number; file_type: string } | null;
    maxWidth: number;
    maxHeight: number;
}

const useStyles = makeStyles({
    container: {
        position: "fixed",
        zIndex: 10000,
        pointerEvents: "none",
        boxShadow: tokens.shadow16,
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: tokens.borderRadiusMedium,
        overflow: "hidden",
        border: `1px solid ${tokens.colorNeutralStroke1}`,
    },
    unsupported: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        color: tokens.colorNeutralForeground3,
        backgroundColor: tokens.colorNeutralBackground2,
    },
    embed: {
        width: "100%",
        height: "100%",
        border: 0,
        display: "block",
        backgroundColor: tokens.colorNeutralBackground1,
    },
    img: {
        width: "100%",
        height: "100%",
        objectFit: "contain",
        display: "block",
        backgroundColor: tokens.colorNeutralBackground1,
    },
});

function toReimbursementUrl(absOrRelPath: string): string {
    // absOrRelPath is absolute file path from main, like C:\\..\\storage\\projects\\1\\items\\...,
    // or already a path relative to storage root if we choose to pass that in future.
    // We only need the part after storage/projects/ to construct protocol URL.
    const normalized = absOrRelPath.replace(/\\/g, "/");
    const marker = "/storage/projects/";
    const idx = normalized.lastIndexOf(marker);
    const rel = idx >= 0 ? normalized.slice(idx + marker.length) : normalized;
    return `reimbursement://attachments/${encodeURI(rel.replace(/^\//, ""))}`;
}

export function AttachmentHoverPreview(props: AttachmentHoverPreviewProps) {
    const { visible, x, y, attachment, maxWidth, maxHeight } = props;
    const styles = useStyles();

    const [filePath, setFilePath] = useState<string | null>(null);
    const [viewport, setViewport] = useState<{ w: number; h: number }>({ w: window.innerWidth, h: window.innerHeight });
    const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: maxWidth, height: maxHeight });

    const fileType = attachment?.file_type?.toLowerCase();
    const isImage = fileType === "jpg" || fileType === "jpeg" || fileType === "png";
    const isPdf = fileType === "pdf";

    useEffect(() => {
        let active = true;
        async function fetchPath() {
            if (!attachment || !(isImage || isPdf)) {
                setFilePath(null);
                return;
            }
            try {
                const res = await window.ContextBridge.attachment.getPath(attachment.attachment_id, true);
                if (!active) return;
                if (res.success && res.data) {
                    setFilePath(res.data);
                } else {
                    setFilePath(null);
                }
            } catch {
                if (!active) return;
                setFilePath(null);
            }
        }
        fetchPath();
        return () => {
            active = false;
        };
    }, [attachment?.attachment_id]);

    // Track viewport resize for clamping size/position
    useEffect(() => {
        const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    // Compute container size based on maxWidth/maxHeight, viewport and content type
    useEffect(() => {
        const margin = 24; // keep away from edges a bit more for PDFs
        const maxW = Math.min(maxWidth, Math.max(160, viewport.w - margin * 2));
        const maxH = Math.min(maxHeight, Math.max(120, viewport.h - margin * 2));

        if (isImage && filePath) {
            const img = new Image();
            img.onload = () => {
                const naturalW = img.naturalWidth || maxW;
                const naturalH = img.naturalHeight || maxH;
                const scale = Math.min(maxW / naturalW, maxH / naturalH, 1);
                setContainerSize({ width: Math.max(1, Math.floor(naturalW * scale)), height: Math.max(1, Math.floor(naturalH * scale)) });
            };
            img.src = toReimbursementUrl(filePath);
            return;
        }

        if (isPdf && filePath) {
            // Without pdf.js we can't know first page size; use max bounds
            setContainerSize({ width: maxW, height: maxH });
            return;
        }

        // Unsupported or no filePath: use modest box within max
        setContainerSize({ width: Math.min(320, maxW), height: Math.min(180, maxH) });
    }, [isImage, isPdf, filePath, maxWidth, maxHeight, viewport.w, viewport.h]);

    const screenPos = useMemo(() => {
        const margin = 12;
        const vw = viewport.w;
        const vh = viewport.h;
        const width = containerSize.width;
        const height = containerSize.height;
        let left = x + margin;
        let top = y + margin;
        if (left + width > vw) left = Math.max(margin, x - width - margin);
        if (top + height > vh) top = Math.max(margin, y - height - margin);
        return { left, top };
    }, [x, y, containerSize.width, containerSize.height, viewport.w, viewport.h]);

    if (!visible) return null;

    const content = (() => {
        if (!attachment) {
            return (
                <div className={styles.unsupported}>
                    <Caption1>暂无可预览内容</Caption1>
                </div>
            );
        }
        if (isImage && filePath) {
            return <img className={styles.img} src={toReimbursementUrl(filePath)} alt="preview" />;
        }
        if (isPdf && filePath) {
            const src = `${toReimbursementUrl(filePath)}#toolbar=0&navpanes=0&scrollbar=0`;
            return <embed className={styles.embed} src={src} type="application/pdf" />;
        }
        return (
            <div className={styles.unsupported}>
                <Caption1>暂不支持预览</Caption1>
            </div>
        );
    })();

    return (
        <div
            className={styles.container}
            style={{
                left: `${screenPos.left}px`,
                top: `${screenPos.top}px`,
                width: `${containerSize.width}px`,
                height: `${containerSize.height}px`,
            }}
        >
            {content}
        </div>
    );
}

export default AttachmentHoverPreview;


