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
import FileUploader from "../components/Common/FileUploader";
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

// ---- Helpers and Subcomponents ----
const ALLOWED_EXTS = new Set(["png", "jpg", "jpeg", "pdf", "ofd"]);
const getExtLower = (name: string) => (name.split(".").pop() || "").toLowerCase();
const isAllowed = (name: string) => ALLOWED_EXTS.has(getExtLower(name));

type UploadCandidate = { path: string; original_name?: string };

function AttachmentRowActions(props: {
    attachment: Attachment;
    needsWatermark: boolean;
    onPreview: (a: Attachment) => void;
    onCopyPath: (a: Attachment) => void;
    onOpenRename: (a: Attachment) => void;
    onWatermark: (a: Attachment) => void;
    onDelete: (a: Attachment) => void;
}) {
    const { attachment, needsWatermark, onPreview, onCopyPath, onOpenRename, onWatermark, onDelete } = props;
    return (
        <div style={{ display: "flex", gap: "4px" }}>
            <Tooltip content="Preview file" relationship="label">
                <Button size="small" icon={<Eye24Regular />} onClick={() => onPreview(attachment)} appearance="subtle" />
            </Tooltip>
            <Tooltip content="Copy path" relationship="label">
                <Button size="small" icon={<Copy24Regular />} onClick={() => onCopyPath(attachment)} appearance="subtle" />
            </Tooltip>
            <Tooltip content="Rename" relationship="label">
                <Button size="small" icon={<Rename24Regular />} onClick={() => onOpenRename(attachment)} appearance="subtle" />
            </Tooltip>
            {needsWatermark && !attachment.has_watermark && (
                <Tooltip content="Apply watermark" relationship="label">
                    <Button size="small" icon={<Sparkle24Regular />} onClick={() => onWatermark(attachment)} appearance="subtle" />
                </Tooltip>
            )}
            <Tooltip content="Delete file" relationship="label">
                <Button size="small" icon={<Delete24Regular />} onClick={() => onDelete(attachment)} appearance="subtle" />
            </Tooltip>
        </div>
    );
}

function RenameDialogSimple(props: {
    open: boolean;
    value: string;
    onChange: (v: string) => void;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const { open, value, onChange, onCancel, onConfirm } = props;
    return (
        <Dialog open={open} onOpenChange={(_, data) => !data.open && onCancel()}>
            <DialogSurface>
                <DialogBody>
                    <DialogTitle>重命名文件</DialogTitle>
                    <DialogContent>
                        <Field label="新文件名（不含扩展名）">
                            <Input value={value} onChange={(_, data) => onChange(data.value)} placeholder="请输入新文件名" />
                        </Field>
                    </DialogContent>
                    <DialogActions>
                        <Button appearance="secondary" onClick={onCancel}>取消</Button>
                        <Button appearance="primary" onClick={onConfirm}>确定</Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
}

function ItemCard(props: {
    item: ProjectItemWithDetails;
    selected: boolean;
    onSelect: () => void;
    onUploadClick: (item: ProjectItemWithDetails) => void;
    onDropUpload: (project_item_id: number, files: UploadCandidate[]) => void;
    onHoverEnter: (a: Attachment, x: number, y: number) => void;
    onHoverMove: (x: number, y: number) => void;
    onHoverLeave: () => void;
    onPreview: (a: Attachment) => void;
    onCopyPath: (a: Attachment) => void;
    onOpenRename: (a: Attachment) => void;
    onWatermark: (a: Attachment) => void;
    onDelete: (a: Attachment) => void;
    classes: { itemCard: string; itemHeader: string; attachmentList: string; attachmentItem: string };
}) {
    const { item, selected, onSelect, onUploadClick, onDropUpload, onHoverEnter, onHoverMove, onHoverLeave, onPreview, onCopyPath, onOpenRename, onWatermark, onDelete, classes } = props;

    const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer?.files || []);
        const candidates: UploadCandidate[] = [];
        for (const f of files) {
            const filePath = (f as unknown as { path?: string }).path as string | undefined;
            const name = f.name || filePath || "file";
            if (!isAllowed(name)) continue;
            if (filePath) candidates.push({ path: filePath, original_name: name });
        }
        if (candidates.length > 0) onDropUpload(item.project_item_id, candidates);
    };

    return (
        <Card
            className={classes.itemCard}
            onClick={onSelect}
            aria-selected={selected}
            appearance="filled-alternative"
            style={{ border: selected ? `2px solid ${tokens.colorBrandStroke1}` : `1px solid ${tokens.colorNeutralStroke1}` }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className={classes.itemHeader}>
                <div>
                    <Body1>{item.template_item.name}</Body1>
                    {item.template_item.is_required && (
                        <Badge color="danger" style={{ marginLeft: "8px" }}>Required</Badge>
                    )}
                    {item.template_item.needs_watermark && (
                        <Badge color="informative" style={{ marginLeft: "8px" }}>Watermark</Badge>
                    )}
                </div>
                <Button icon={<ArrowUpload24Regular />} onClick={() => onUploadClick(item)}>
                    Upload
                </Button>
            </div>

            {item.template_item.description && (
                <Caption1 style={{ color: tokens.colorNeutralForeground3, marginBottom: "8px" }}>
                    {item.template_item.description}
                </Caption1>
            )}

            {item.attachments.length > 0 && (
                <div className={classes.attachmentList}>
                    {item.attachments.map((attachment) => (
                        <div
                            key={attachment.attachment_id}
                            className={classes.attachmentItem}
                            onMouseEnter={(e) => onHoverEnter(attachment, e.clientX, e.clientY)}
                            onMouseMove={(e) => onHoverMove(e.clientX, e.clientY)}
                            onMouseLeave={onHoverLeave}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <DocumentRegular />
                                <Caption1>{attachment.original_name}</Caption1>
                                {attachment.has_watermark ? <Badge color="success">Watermarked</Badge> : <></>}
                            </div>
                            <AttachmentRowActions
                                attachment={attachment}
                                needsWatermark={item.template_item.needs_watermark}
                                onPreview={onPreview}
                                onCopyPath={onCopyPath}
                                onOpenRename={onOpenRename}
                                onWatermark={onWatermark}
                                onDelete={onDelete}
                            />
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

function NewProjectTemplateSelection(props: {
    templates: Template[];
    onCancel: () => void;
    onSelect: (template: Template) => void;
}) {
    const { templates, onCancel, onSelect } = props;
    const styles = useStyles();
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Title3>Create New Project</Title3>
                <Button onClick={onCancel}>Cancel</Button>
            </div>

            <Body1 style={{ marginBottom: "16px" }}>Select a template to get started:</Body1>

            <div className={styles.templateSelector}>
                {templates.map((template) => (
                    <Card key={template.template_id} className={styles.templateCard} onClick={() => onSelect(template)}>
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

function NewProjectMetadataEntry(props: {
    selectedTemplate: Template;
    name: string;
    creator: string;
    description: string;
    onChangeName: (v: string) => void;
    onChangeCreator: (v: string) => void;
    onChangeDescription: (v: string) => void;
    onBack: () => void;
    onCreate: () => void;
}) {
    const { selectedTemplate, name, creator, description, onChangeName, onChangeCreator, onChangeDescription, onBack, onCreate } = props;
    const styles = useStyles();
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Title3>New Project - {selectedTemplate.name}</Title3>
                <div style={{ display: "flex", gap: "8px" }}>
                    <Button onClick={onBack}>Back</Button>
                    <Button appearance="primary" icon={<Save24Regular />} onClick={onCreate}>
                        Create
                    </Button>
                </div>
            </div>

            <div className={styles.section}>
                <Field label="Project Name" required>
                    <Input value={name} onChange={(_, data) => onChangeName(data.value)} placeholder="e.g., 2025 ISICDM Conference" />
                </Field>
                <Field label="Creator">
                    <Input value={creator} onChange={(_, data) => onChangeCreator(data.value)} placeholder="Your name" />
                </Field>
                <Field label="Description">
                    <Textarea value={description} onChange={(_, data) => onChangeDescription(data.value)} placeholder="Optional description" />
                </Field>
            </div>
        </div>
    );
}

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
    const { uploadAttachment, deleteAttachment, applyWatermark, renameAttachment, uploadFromPaths, uploadFromData } = useAttachments();
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

    // 选中卡片用于粘贴上传（必须在任何 return 之前定义，保持 hooks 顺序稳定）
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

    useEffect(() => {
        function onPaste(e: ClipboardEvent) {
            if (!selectedItemId) return;
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

            const pathCandidates: UploadCandidate[] = [];
            const dataCandidates: Array<{ data: ArrayBuffer; name?: string; mime?: string }> = [];

            const fileList = e.clipboardData?.files;
            if (fileList && fileList.length > 0) {
                for (const f of Array.from(fileList)) {
                    const path = (f as unknown as { path?: string }).path as string | undefined;
                    const name = f.name || path || "file";
                    const mime = (f as File).type || "";
                    const allowedByMime = mime.startsWith("image/") || mime === "application/pdf";
                    if (!name && !allowedByMime) continue;
                    if (!isAllowed(name) && !allowedByMime) continue;
                    if (path) {
                        pathCandidates.push({ path, original_name: name });
                    } else {
                        // No path; read data
                        (f as File)
                            .arrayBuffer()
                            .then((buf) => {
                                dataCandidates.push({ data: buf, name, mime });
                            })
                            .catch(() => void 0);
                    }
                }
            }
            // Also parse plain text for file paths
            const text = e.clipboardData?.getData("text") || "";
            const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
            for (const line of lines) {
                let p = line;
                if (p.startsWith("file://")) {
                    try { p = decodeURI(p.replace(/^file:\/\//, "")); } catch { /* ignore */ }
                }
                if (isAllowed(p)) pathCandidates.push({ path: p });
            }

            if (pathCandidates.length === 0 && dataCandidates.length === 0) return;

            e.preventDefault();
            (async () => {
                try {
                    if (pathCandidates.length > 0) {
                        await onUploadFromPaths(selectedItemId, pathCandidates);
                    }
                    if (dataCandidates.length > 0) {
                        await uploadFromData(selectedItemId, dataCandidates);
                    }
                    if (projectId) await loadProject(projectId);
                    dispatchToast(<Toast><ToastTitle>上传成功</ToastTitle></Toast>, { intent: "success" });
                } catch (err) {
                    console.error("Paste upload failed:", err);
                    dispatchToast(<Toast><ToastTitle>上传失败</ToastTitle></Toast>, { intent: "error" });
                }
            })();
        }
        window.addEventListener("paste", onPaste);
        return () => window.removeEventListener("paste", onPaste);
    }, [selectedItemId, projectId, loadProject]);

    const onUploadFromPaths = async (project_item_id: number, files: UploadCandidate[]) => {
        try {
            const filtered = files.filter((f) => isAllowed(f.original_name || f.path));
            if (filtered.length === 0) {
                dispatchToast(<Toast><ToastTitle>不支持的文件类型</ToastTitle></Toast>, { intent: "warning" });
                return;
            }
            await uploadFromPaths(project_item_id, filtered);
            if (projectId) await loadProject(projectId);
            dispatchToast(<Toast><ToastTitle>上传成功</ToastTitle></Toast>, { intent: "success" });
        } catch (err) {
            console.error("Upload from paths failed:", err);
            dispatchToast(<Toast><ToastTitle>上传失败</ToastTitle></Toast>, { intent: "error" });
        }
    };

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
            navigate(`/projects/${newProject.project_id}/edit`);
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
            <NewProjectTemplateSelection
                templates={templates}
                onCancel={() => navigate("/projects")}
                onSelect={(t) => setSelectedTemplate(t)}
            />
        );
    }

    // New project - metadata entry
    if (isNew && selectedTemplate) {
        return (
            <NewProjectMetadataEntry
                selectedTemplate={selectedTemplate}
                name={name}
                creator={creator}
                description={description}
                onChangeName={setName}
                onChangeCreator={setCreator}
                onChangeDescription={setDescription}
                onBack={() => setSelectedTemplate(null)}
                onCreate={handleCreateProject}
            />
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
                {project.items.map((item) => (
                    <FileUploader
                        key={item.project_item_id}
                        onUpload={(files) => onUploadFromPaths(item.project_item_id, files)}
                        onUploadData={async (files) => {
                            try {
                                await uploadFromData(item.project_item_id, files);
                                if (projectId) await loadProject(projectId);
                                dispatchToast(<Toast><ToastTitle>上传成功</ToastTitle></Toast>, { intent: "success" });
                            } catch (err) {
                                console.error("Upload from data failed:", err);
                                dispatchToast(<Toast><ToastTitle>上传失败</ToastTitle></Toast>, { intent: "error" });
                            }
                        }}
                    >
                                <ItemCard
                                    item={item}
                                    selected={selectedItemId === item.project_item_id}
                                    onSelect={() => setSelectedItemId(item.project_item_id)}
                                    onUploadClick={handleUpload}
                                    onDropUpload={onUploadFromPaths}
                                    onHoverEnter={(a, x, y) => {
                                        setHoveredAttachment({ attachment_id: a.attachment_id, file_type: a.file_type });
                                        setMousePos({ x, y });
                                    }}
                                    onHoverMove={(x, y) => setMousePos({ x, y })}
                                    onHoverLeave={() => setHoveredAttachment(null)}
                                    onPreview={handlePreview}
                                    onCopyPath={handleCopyPath}
                                    onOpenRename={(a) => openRenameDialog(a)}
                                    onWatermark={handleWatermark}
                                    onDelete={handleDeleteClick}
                                    classes={{
                                        itemCard: styles.itemCard,
                                        itemHeader: styles.itemHeader,
                                        attachmentList: styles.attachmentList,
                                        attachmentItem: styles.attachmentItem,
                                    }}
                                />
                    </FileUploader>
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

            <RenameDialogSimple
                open={!!renameTarget}
                value={renameInput}
                onChange={setRenameInput}
                onCancel={closeRenameDialog}
                onConfirm={confirmRename}
            />

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
