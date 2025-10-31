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
    Field,
    ProgressBar,
} from "@fluentui/react-components";
import { ArrowUpload24Regular, Edit24Regular, Print24Regular } from "@fluentui/react-icons";
import { useParams, useNavigate } from "react-router";
import { useProject, useProjects } from "../hooks/useProjects";
import AttachmentHoverPreview from "../components/Preview/AttachmentHoverPreview";
import type { AppSettings, Attachment } from "@common/types";
import { useEffect, useState } from "react";
import { DEFAULT_HOVER_PREVIEW } from "@common/constants";
import { useI18n } from "../i18n";

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
    const { t } = useI18n();

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
                    width: s.hoverPreviewWidth ?? DEFAULT_HOVER_PREVIEW.width,
                    height: s.hoverPreviewHeight ?? DEFAULT_HOVER_PREVIEW.height,
                });
            }
        }
        load();
        window.ContextBridge.onSettingsChanged((s: AppSettings) => {
            setPreviewSize({
                width: s.hoverPreviewWidth ?? DEFAULT_HOVER_PREVIEW.width,
                height: s.hoverPreviewHeight ?? DEFAULT_HOVER_PREVIEW.height,
            });
        });
        return () => {
            mounted = false;
        };
    }, []);

    const handleExport = async () => {
        try {
            await exportProject(projectId);
            alert(t("projects.exportSuccess"));
        } catch (err) {
            console.error("Failed to export project:", err);
        }
    };

    const handlePrint = async () => {
        navigate(`/projects/${projectId}/print`);
    };

    if (loading || !project) {
        return (
            <div className={styles.container}>
                <div style={{ textAlign: "center", padding: "64px" }}>
                    <Spinner size="large" label={t("projects.loadingOne")} />
                </div>
            </div>
        );
    }

    // Calculate required fields completion
    const requiredItems = project.items.filter(item => item.template_item.is_required);
    const completedRequiredItems = requiredItems.filter(item => item.attachments.length > 0);
    const requiredFieldsProgress = requiredItems.length > 0 
        ? completedRequiredItems.length / requiredItems.length 
        : 0;
    
    // Determine progress bar color and validation state
    const progressColor: "success" | "error" = requiredFieldsProgress === 1 ? "success" : "error";
    const validationState: "success" | "error" = requiredFieldsProgress === 1 ? "success" : "error";
    const validationMessage = requiredItems.length > 0
        ? `${t("projects.requiredFieldsProgress")}：${completedRequiredItems.length}/${requiredItems.length} ${t("projects.completed")}`
        : "";

    // Calculate total project expenditure from all attachments
    const projectExpenditure = project.items.reduce((sum, item) => {
        const itemSum = item.attachments.reduce((acc, a) => acc + ((a as unknown as { expenditure?: number }).expenditure ?? 0), 0);
        return sum + itemSum;
    }, 0);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Title1>{project.name}</Title1>
                <div style={{ display: "flex", gap: "12px" }}>
                    <Button
                        icon={<Edit24Regular />}
                        onClick={() => navigate(`/projects/${projectId}/edit`)}
                    >
                        {t("common.edit")}
                    </Button>
                    <Button onClick={handlePrint} icon={<Print24Regular />}>
                        {t("nav.print")}
                    </Button>
                    <Button
                        appearance="primary"
                        icon={<ArrowUpload24Regular />}
                        onClick={handleExport}
                    >
                        {t("projects.export")}
                    </Button>
                </div>
            </div>

            <div className={styles.metadata}>
                <Title3>{t("projects.infoTitle")}</Title3>
                <div className={styles.metadataGrid}>
                    <div className={styles.metadataItem}>
                        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>{t("projects.creator")}</Caption1>
                        <Body1>{project.creator || "Not specified"}</Body1>
                    </div>
                    <div className={styles.metadataItem}>
                        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>{t("projects.template")}</Caption1>
                        <Body1>{project.template.name}</Body1>
                    </div>
                    <div className={styles.metadataItem}>
                        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>{t("projects.created")}</Caption1>
                        <Body1>{new Date(project.create_time).toLocaleString()}</Body1>
                    </div>
                    <div className={styles.metadataItem}>
                        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>{t("projects.status")}</Caption1>
                        <Body1>{project.status}</Body1>
                    </div>
                    <div className={styles.metadataItem}>
                        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>{t("projects.totalExpenditure") || "Total Expenditure"}</Caption1>
                        <Body1>{projectExpenditure}</Body1>
                    </div>
                    {project.metadata?.description && (
                        <div className={styles.metadataItem} style={{ gridColumn: "1 / -1" }}>
                            <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>{t("projects.description")}</Caption1>
                            <Body1>{project.metadata.description}</Body1>
                        </div>
                    )}
                    {/* Required fields progress bar - only show if there are required fields */}
                    {requiredItems.length > 0 && (
                        <div className={styles.metadataItem} style={{ gridColumn: "1 / -1" }}>
                            <Field validationMessage={validationMessage} validationState={validationState}>
                                <ProgressBar value={requiredFieldsProgress} color={progressColor} />
                            </Field>
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.itemsSection}>
                <Title3 style={{ marginBottom: "16px" }}>{t("projects.materials")}</Title3>

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
                                {t("projects.noFiles")}
                            </Caption1>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHeaderCell>{t("attachments.table.fileName")}</TableHeaderCell>
                                        <TableHeaderCell>{t("attachments.table.size")}</TableHeaderCell>
                                        <TableHeaderCell>{t("attachments.table.type")}</TableHeaderCell>
                                        <TableHeaderCell>{t("attachments.table.status")}</TableHeaderCell>
                                        <TableHeaderCell>{t("attachments.table.expenditure")}</TableHeaderCell>
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
                                                        ✓ {t("attachments.status.watermarked")}
                                                    </Caption1>
                                                ) : (
                                                    <Caption1>{t("attachments.status.original")}</Caption1>
                                                )}
                                            </TableCell>
                                            <TableCell>{(attachment as unknown as { expenditure?: number }).expenditure ?? 0}</TableCell>
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
