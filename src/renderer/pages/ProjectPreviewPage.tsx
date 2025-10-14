import {
    Body1,
    Button,
    Caption1,
    Card,
    makeStyles,
    Spinner,
    Title1,
    Title3,
    tokens,
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableHeaderCell,
    TableRow,
} from "@fluentui/react-components";
import { ArrowUpload24Regular, Edit24Regular } from "@fluentui/react-icons";
import { useParams, useNavigate } from "react-router";
import { useProject, useProjects } from "../hooks/useProjects";
import AttachmentHoverPreview from "../components/Preview/AttachmentHoverPreview";
import type { AppSettings, Attachment } from "@common/types";
import { useEffect, useState } from "react";

const useStyles = makeStyles({
    container: {
        padding: "24px",
        maxWidth: "1200px",
        margin: "0 auto",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px",
    },
    metadata: {
        padding: "24px",
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusMedium,
        marginBottom: "24px",
    },
    metadataGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        marginTop: "16px",
    },
    metadataItem: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
    },
    itemsSection: {
        marginBottom: "24px",
    },
    itemCard: {
        marginBottom: "16px",
        padding: "20px",
    },
    itemHeader: {
        marginBottom: "12px",
    },
    attachmentGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "12px",
        marginTop: "12px",
    },
    attachmentCard: {
        padding: "12px",
        backgroundColor: tokens.colorNeutralBackground3,
        borderRadius: tokens.borderRadiusSmall,
        textAlign: "center",
    },
    preview: {
        width: "100%",
        maxHeight: "200px",
        objectFit: "cover",
        borderRadius: tokens.borderRadiusSmall,
        marginBottom: "8px",
    },
});

export function ProjectPreviewPage() {
    const styles = useStyles();
    const { id } = useParams<{ id: string }>();
    const projectId = parseInt(id || "0");
    const navigate = useNavigate();

    const { project, loading } = useProject(projectId);
    const { exportProject } = useProjects();

    // hover preview state
    const [hoveredAttachment, setHoveredAttachment] = useState<Pick<Attachment, "attachment_id" | "file_type"> | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [previewSize, setPreviewSize] = useState<{ width: number; height: number }>({ width: 400, height: 400 });

    // load settings for preview size
    useEffect(() => {
        let mounted = true;
        async function load() {
            const res = await window.ContextBridge.settings.get();
            if (mounted && res.success && res.data) {
                const s = res.data as AppSettings;
                setPreviewSize({
                    width: s.hoverPreviewWidth ?? 400,
                    height: s.hoverPreviewHeight ?? 400,
                });
            }
        }
        load();
        window.ContextBridge.onSettingsChanged((s: AppSettings) => {
            setPreviewSize({
                width: s.hoverPreviewWidth ?? 400,
                height: s.hoverPreviewHeight ?? 400,
            });
        });
        return () => {
            mounted = false;
            // ipcRenderer.on 返回的是 void，此处无需显式移除，主进程广播足够轻量
        };
    }, []);

    const handleExport = async () => {
        try {
            await exportProject(projectId);
            alert("Project exported successfully!");
        } catch (err) {
            console.error("Failed to export project:", err);
        }
    };

    if (loading || !project) {
        return (
            <div className={styles.container}>
                <div style={{ textAlign: "center", padding: "64px" }}>
                    <Spinner size="large" label="Loading project..." />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Title1>{project.name}</Title1>
                <div style={{ display: "flex", gap: "12px" }}>
                    <Button
                        icon={<Edit24Regular />}
                        onClick={() => navigate(`/projects/${projectId}/edit`)}
                    >
                        Edit
                    </Button>
                    <Button
                        appearance="primary"
                        icon={<ArrowUpload24Regular />}
                        onClick={handleExport}
                    >
                        Export
                    </Button>
                </div>
            </div>

            <div className={styles.metadata}>
                <Title3>Project Information</Title3>
                <div className={styles.metadataGrid}>
                    <div className={styles.metadataItem}>
                        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>Creator</Caption1>
                        <Body1>{project.creator || "Not specified"}</Body1>
                    </div>
                    <div className={styles.metadataItem}>
                        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>Template</Caption1>
                        <Body1>{project.template.name}</Body1>
                    </div>
                    <div className={styles.metadataItem}>
                        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>Created</Caption1>
                        <Body1>{new Date(project.create_time).toLocaleString()}</Body1>
                    </div>
                    <div className={styles.metadataItem}>
                        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>Status</Caption1>
                        <Body1>{project.status}</Body1>
                    </div>
                    {project.metadata?.description && (
                        <div className={styles.metadataItem} style={{ gridColumn: "1 / -1" }}>
                            <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>Description</Caption1>
                            <Body1>{project.metadata.description}</Body1>
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.itemsSection}>
                <Title3 style={{ marginBottom: "16px" }}>Materials</Title3>

                {project.items.map((item) => (
                    <Card key={item.project_item_id} className={styles.itemCard}>
                        <div className={styles.itemHeader}>
                            <Title3>{item.template_item.name}</Title3>
                            {item.template_item.description && (
                                <Caption1 style={{ color: tokens.colorNeutralForeground3, marginTop: "4px" }}>
                                    {item.template_item.description}
                                </Caption1>
                            )}
                        </div>

                        {item.attachments.length === 0 ? (
                            <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                                No files uploaded
                            </Caption1>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHeaderCell>File Name</TableHeaderCell>
                                        <TableHeaderCell>Size</TableHeaderCell>
                                        <TableHeaderCell>Type</TableHeaderCell>
                                        <TableHeaderCell>Status</TableHeaderCell>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {item.attachments.map((attachment) => (
                                        <TableRow
                                            key={attachment.attachment_id}
                                            onMouseEnter={(e) => {
                                                setHoveredAttachment({ attachment_id: attachment.attachment_id, file_type: attachment.file_type });
                                                setMousePos({ x: e.clientX, y: e.clientY });
                                            }}
                                            onMouseMove={(e) => {
                                                setMousePos({ x: e.clientX, y: e.clientY });
                                            }}
                                            onMouseLeave={() => {
                                                setHoveredAttachment(null);
                                            }}
                                        >
                                            <TableCell>{attachment.original_name}</TableCell>
                                            <TableCell>{(attachment.file_size / 1024).toFixed(1)} KB</TableCell>
                                            <TableCell>{attachment.file_type.toUpperCase()}</TableCell>
                                            <TableCell>
                                                {attachment.has_watermark ? (
                                                    <Caption1 style={{ color: tokens.colorPaletteGreenForeground1 }}>
                                                        ✓ Watermarked
                                                    </Caption1>
                                                ) : (
                                                    <Caption1>Original</Caption1>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Card>
                ))}
            </div>

            <AttachmentHoverPreview
                visible={!!hoveredAttachment}
                x={mousePos.x}
                y={mousePos.y}
                attachment={hoveredAttachment}
                maxWidth={previewSize.width}
                maxHeight={previewSize.height}
            />
        </div>
    );
}


