import type { Attachment, ProjectItemWithDetails, Template, AppSettings } from "@common/types";
import {
    Badge,
    Body1,
    Button,
    Caption1,
    Card,
    Field,
    Input,
    makeStyles,
    Spinner,
    Textarea,
    Title3,
    tokens,
    Tooltip,
    Toaster,
    useToastController,
    Toast,
    ToastTitle,
    Dialog,
    DialogSurface,
    DialogBody,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@fluentui/react-components";
import {
    ArrowUpload24Regular,
    Delete24Regular,
    DocumentRegular,
    Eye24Regular,
    Save24Regular,
    Sparkle24Regular,
    Copy24Regular,
    Rename24Regular,
} from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { ConfirmDialog } from "../components/Common/ConfirmDialog";
import { useAttachments } from "../hooks/useAttachments";
import AttachmentHoverPreview from "../components/Preview/AttachmentHoverPreview";
import { useProject, useProjects } from "../hooks/useProjects";
import { useTemplates } from "../hooks/useTemplates";

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
    section: {
        marginBottom: "24px",
        padding: "16px",
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusMedium,
    },
    formField: {
        marginBottom: "16px",
    },
    itemCard: {
        marginBottom: "16px",
        padding: "16px",
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: tokens.borderRadiusMedium,
    },
    itemHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "12px",
    },
    attachmentList: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        marginTop: "12px",
    },
    attachmentItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 12px",
        backgroundColor: tokens.colorNeutralBackground3,
        borderRadius: tokens.borderRadiusSmall,
    },
    templateSelector: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
        gap: "12px",
        marginTop: "16px",
    },
    templateCard: {
        cursor: "pointer",
        padding: "16px",
        ":hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
        },
    },
});

export function ProjectEditorPage() {
    const styles = useStyles();
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams<{ id: string }>();

    // 检查路径来判断是新建还是编辑模式
    const isNew = location.pathname === "/projects/new";
    const projectId = isNew ? null : parseInt(id || "0");

    const { templates } = useTemplates();
    const { createProject } = useProjects();
    const { project, loading, loadProject } = useProject(projectId);
    const { uploadAttachment, deleteAttachment, applyWatermark, renameAttachment } = useAttachments();
    const { dispatchToast } = useToastController();

    const [name, setName] = useState("");
    const [creator, setCreator] = useState("");
    const [description, setDescription] = useState("");
    const [deleteConfirmAttachment, setDeleteConfirmAttachment] = useState<Attachment | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

    useEffect(() => {
        if (project) {
            setName(project.name);
            setCreator(project.creator || "");
            setDescription(project.metadata?.description || "");
        }
    }, [project]);

    // hover preview state (reuse same logic as ProjectPreviewPage)
    const [hoveredAttachment, setHoveredAttachment] = useState<Pick<Attachment, "attachment_id" | "file_type"> | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [previewSize, setPreviewSize] = useState<{ width: number; height: number }>({ width: 360, height: 240 });

    useEffect(() => {
        let mounted = true;
        async function load() {
            const res = await window.ContextBridge.settings.get();
            if (mounted && res.success && res.data) {
                const s = res.data as AppSettings;
                setPreviewSize({ width: s.hoverPreviewWidth ?? 360, height: s.hoverPreviewHeight ?? 240 });
            }
        }
        load();
        window.ContextBridge.onSettingsChanged((s: AppSettings) => {
            setPreviewSize({ width: s.hoverPreviewWidth ?? 360, height: s.hoverPreviewHeight ?? 240 });
        });
        return () => {
            mounted = false;
        };
    }, []);

    const handleCreateProject = async () => {
        if (!selectedTemplate) {
            alert("Please select a template");
            return;
        }

        try {
            const newProject = await createProject({
                template_id: selectedTemplate.template_id,
                name,
                creator,
                metadata: { description },
            });
            navigate(`/projects/${newProject.project_id}`);
        } catch (err) {
            console.error("Failed to create project:", err);
        }
    };

    const handleUpload = async (item: ProjectItemWithDetails) => {
        try {
            await uploadAttachment(item.project_item_id);
            if (projectId) {
                await loadProject(projectId);
            }
        } catch (err) {
            console.error("Failed to upload file:", err);
        }
    };

    const handleDeleteClick = (attachment: Attachment) => {
        setDeleteConfirmAttachment(attachment);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirmAttachment) return;

        try {
            await deleteAttachment(deleteConfirmAttachment.attachment_id);
            if (projectId) {
                await loadProject(projectId);
            }
        } catch (err) {
            console.error("Failed to delete attachment:", err);
        } finally {
            setDeleteConfirmAttachment(null);
        }
    };

    const handleWatermark = async (attachment: Attachment) => {
        console.log(attachment);
        try {
            await applyWatermark(attachment.attachment_id);
            if (projectId) {
                await loadProject(projectId);
            }
        } catch (err) {
            console.error("Failed to apply watermark:", err);
        }
    };

    const handlePreview = async (attachment: Attachment) => {
        try {
            await window.ContextBridge.attachment.openExternal(attachment.attachment_id);
        } catch (err) {
            console.error("Failed to preview file:", err);
        }
    };

    const handleCopyPath = async (attachment: Attachment) => {
        try {
            const abs = await window.ContextBridge.attachment.getPath(attachment.attachment_id, false);
            if (abs.success && abs.data) {
                await navigator.clipboard.writeText(abs.data);
                dispatchToast(
                    <Toast>
                        <ToastTitle>Copied</ToastTitle>
                    </Toast>,
                    { intent: "success", timeout: 1500 }
                );
            }
        } catch (err) {
            console.error("Failed to copy path:", err);
        }
    };

    const [renameTarget, setRenameTarget] = useState<Attachment | null>(null);
    const [renameInput, setRenameInput] = useState<string>("");
    const openRenameDialog = (attachment: Attachment) => {
        setRenameTarget(attachment);
        setRenameInput(attachment.original_name.replace(/\.[^.]+$/, ""));
    };
    const closeRenameDialog = () => {
        setRenameTarget(null);
        setRenameInput("");
    };
    const confirmRename = async () => {
        const trimmed = renameInput.trim();
        if (!trimmed || !renameTarget) {
            closeRenameDialog();
            return;
        }
        try {
            await renameAttachment(renameTarget.attachment_id, trimmed);
            if (projectId) {
                await loadProject(projectId);
            }
        } catch (err) {
            console.error("Failed to rename attachment:", err);
        } finally {
            closeRenameDialog();
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div style={{ textAlign: "center", padding: "64px" }}>
                    <Spinner size="large" label="Loading project..." />
                </div>
            </div>
        );
    }

    // New project - template selection
    if (isNew && !selectedTemplate) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <Title3>Create New Project</Title3>
                    <Button onClick={() => navigate("/projects")}>Cancel</Button>
                </div>

                <Body1 style={{ marginBottom: "16px" }}>Select a template to get started:</Body1>

                <div className={styles.templateSelector}>
                    {templates.map((template) => (
                        <Card
                            key={template.template_id}
                            className={styles.templateCard}
                            onClick={() => setSelectedTemplate(template)}
                        >
                            <Body1 style={{ fontWeight: tokens.fontWeightSemibold }}>{template.name}</Body1>
                            {template.description && (
                                <Caption1 style={{ color: tokens.colorNeutralForeground3, marginTop: "4px" }}>
                                    {template.description}
                                </Caption1>
                            )}
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    // New project - metadata entry
    if (isNew && selectedTemplate) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <Title3>New Project - {selectedTemplate.name}</Title3>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <Button onClick={() => setSelectedTemplate(null)}>Back</Button>
                        <Button appearance="primary" icon={<Save24Regular />} onClick={handleCreateProject}>
                            Create
                        </Button>
                    </div>
                </div>

                <div className={styles.section}>
                    <Field label="Project Name" required>
                        <Input
                            value={name}
                            onChange={(_, data) => setName(data.value)}
                            placeholder="e.g., 2025 ISICDM Conference"
                        />
                    </Field>
                    <Field label="Creator">
                        <Input value={creator} onChange={(_, data) => setCreator(data.value)} placeholder="Your name" />
                    </Field>
                    <Field label="Description">
                        <Textarea
                            value={description}
                            onChange={(_, data) => setDescription(data.value)}
                            placeholder="Optional description"
                        />
                    </Field>
                </div>
            </div>
        );
    }

    // Edit existing project
    if (!project) return null;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <Title3>{project.name}</Title3>
                    <Caption1>Template: {project.template.name}</Caption1>
                </div>
                <Button appearance="primary" onClick={() => navigate(`/projects/${project.project_id}`)}>
                    Preview
                </Button>
            </div>

            <div className={styles.section}>
                <Body1 style={{ fontWeight: tokens.fontWeightSemibold, marginBottom: "16px" }}>Project Items</Body1>

                {project.items.map((item) => (
                    <div key={item.project_item_id} className={styles.itemCard}>
                        <div className={styles.itemHeader}>
                            <div>
                                <Body1>{item.template_item.name}</Body1>
                                {item.template_item.is_required && (
                                    <Badge color="danger" style={{ marginLeft: "8px" }}>
                                        Required
                                    </Badge>
                                )}
                                {item.template_item.needs_watermark && (
                                    <Badge color="informative" style={{ marginLeft: "8px" }}>
                                        Watermark
                                    </Badge>
                                )}
                            </div>
                            <Button
                                icon={<ArrowUpload24Regular />}
                                onClick={() => handleUpload(item)}
                                disabled={!item.template_item.allows_multiple_files && item.attachments.length > 0}
                            >
                                Upload
                            </Button>
                        </div>

                        {item.template_item.description && (
                            <Caption1 style={{ color: tokens.colorNeutralForeground3, marginBottom: "8px" }}>
                                {item.template_item.description}
                            </Caption1>
                        )}

                        {item.attachments.length > 0 && (
                            <div className={styles.attachmentList}>
                                {item.attachments.map((attachment) => (
                                    <div
                                        key={attachment.attachment_id}
                                        className={styles.attachmentItem}
                                        onMouseEnter={(e) => {
                                            setHoveredAttachment({ attachment_id: attachment.attachment_id, file_type: attachment.file_type });
                                            setMousePos({ x: e.clientX, y: e.clientY });
                                        }}
                                        onMouseMove={(e) => {
                                            setMousePos({ x: e.clientX, y: e.clientY });
                                        }}
                                        onMouseLeave={() => setHoveredAttachment(null)}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <DocumentRegular />
                                            <Caption1>{attachment.original_name}</Caption1>
                                            {attachment.has_watermark ? (
                                                <Badge color="success">Watermarked</Badge>
                                            ) : (
                                                <></>
                                            )}
                                        </div>
                                        <div style={{ display: "flex", gap: "4px" }}>
                                            <Tooltip content="Preview file" relationship="label">
                                                <Button
                                                    size="small"
                                                    icon={<Eye24Regular />}
                                                    onClick={() => handlePreview(attachment)}
                                                    appearance="subtle"
                                                />
                                            </Tooltip>
                                            <Tooltip content="Copy path" relationship="label">
                                                <Button
                                                    size="small"
                                                    icon={<Copy24Regular />}
                                                    onClick={() => handleCopyPath(attachment)}
                                                    appearance="subtle"
                                                />
                                            </Tooltip>
                                            <Tooltip content="Rename" relationship="label">
                                                <Button
                                                    size="small"
                                                    icon={<Rename24Regular />}
                                                    onClick={() => openRenameDialog(attachment)}
                                                    appearance="subtle"
                                                />
                                            </Tooltip>
                                            {item.template_item.needs_watermark && !attachment.has_watermark && (
                                                <Tooltip content="Apply watermark" relationship="label">
                                                    <Button
                                                        size="small"
                                                        icon={<Sparkle24Regular />}
                                                        onClick={() => handleWatermark(attachment)}
                                                        appearance="subtle"
                                                    />
                                                </Tooltip>
                                            )}
                                            <Tooltip content="Delete file" relationship="label">
                                                <Button
                                                    size="small"
                                                    icon={<Delete24Regular />}
                                                    onClick={() => handleDeleteClick(attachment)}
                                                    appearance="subtle"
                                                />
                                            </Tooltip>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
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

            {/* Rename Dialog */}
            <Dialog open={!!renameTarget} onOpenChange={(_, data) => !data.open && closeRenameDialog()}>
                <DialogSurface>
                    <DialogBody>
                        <DialogTitle>重命名文件</DialogTitle>
                        <DialogContent>
                            <Field label="新文件名（不含扩展名）">
                                <Input
                                    value={renameInput}
                                    onChange={(_, data) => setRenameInput(data.value)}
                                    placeholder="请输入新文件名"
                                />
                            </Field>
                        </DialogContent>
                        <DialogActions>
                            <Button appearance="secondary" onClick={closeRenameDialog}>取消</Button>
                            <Button appearance="primary" onClick={confirmRename}>确定</Button>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface>
            </Dialog>

            {/* Toaster for copied feedback */}
            <Toaster />

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                title="删除文件"
                message={
                    deleteConfirmAttachment
                        ? `确定要删除文件 "${deleteConfirmAttachment.original_name}"？此操作无法撤销。`
                        : ""
                }
                confirmText="删除"
                cancelText="取消"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteConfirmAttachment(null)}
                open={!!deleteConfirmAttachment}
                onOpenChange={(open) => !open && setDeleteConfirmAttachment(null)}
                destructive
            />
        </div>
    );
}
