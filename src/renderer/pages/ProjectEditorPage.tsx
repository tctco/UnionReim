import type { Attachment, ProjectItemWithDetails, Template, AppSettings } from "@common/types";
import {
    Body1,
    Button,
    Caption1,
    makeStyles,
    Spinner,
    Title3,
    tokens,
    Toaster,
    useToastController,
    Toast,
    ToastTitle,
} from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { ConfirmDialog } from "../components/Common/ConfirmDialog";
import RenameDialogSimple from "../components/Common/RenameDialogSimple";
import { useAttachments } from "../hooks/useAttachments";
import WatermarkApplyDialog from "../components/Watermark/WatermarkApplyDialog";
import AttachmentHoverPreview from "../components/Preview/AttachmentHoverPreview";
import TemplateSelectorGrid from "../components/Template/TemplateSelectorGrid";
import NewProjectMetadataForm from "../components/Project/NewProjectMetadataForm";
import FileUploader from "../components/Common/FileUploader";
import ProjectItemCard from "../components/Project/ProjectItemCard";
import { useProject, useProjects } from "../hooks/useProjects";
import { useTemplates } from "../hooks/useTemplates";
import { DEFAULT_HOVER_PREVIEW_EDITOR, isAllowedAttachmentName } from "@common/constants";

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
});

// ---- Helpers and Subcomponents ----

type UploadCandidate = { path: string; original_name?: string };

// Extracted to TemplateSelectorGrid component

// Extracted to components/Project/NewProjectMetadataForm

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
    const { uploadAttachment, deleteAttachment, applyWatermark, applyWatermarkWithOptions, removeWatermark, renameAttachment, uploadFromPaths, uploadFromData } = useAttachments();
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

    // (removed duplicate paste-to-upload effect; unified below)

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
                setPreviewSize({ width: s.hoverPreviewWidth ?? DEFAULT_HOVER_PREVIEW_EDITOR.width, height: s.hoverPreviewHeight ?? DEFAULT_HOVER_PREVIEW_EDITOR.height });
            }
        }
        load();
        window.ContextBridge.onSettingsChanged((s: AppSettings) => {
            setPreviewSize({ width: s.hoverPreviewWidth ?? DEFAULT_HOVER_PREVIEW_EDITOR.width, height: s.hoverPreviewHeight ?? DEFAULT_HOVER_PREVIEW_EDITOR.height });
        });
        return () => {
            mounted = false;
        };
    }, []);

    // 选中卡片用于粘贴上传（必须在任何 return 之前定义，保持 hooks 顺序稳定）
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

    useEffect(() => {
        async function onPaste(e: ClipboardEvent) {
            if (!selectedItemId) return;
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

            const pathCandidates: UploadCandidate[] = [];
            const dataCandidates: Array<{ data: ArrayBuffer; name?: string; mime?: string }> = [];
            const readPromises: Array<Promise<void>> = [];

            const fileList = e.clipboardData?.files;
            if (fileList && fileList.length > 0) {
                for (const f of Array.from(fileList)) {
                    const path = (f as unknown as { path?: string }).path as string | undefined;
                    const name = f.name || path || "file";
                    const mime = (f as File).type || "";
                    const allowedByMime = mime.startsWith("image/") || mime === "application/pdf";
                    if (!name && !allowedByMime) continue;
                    if (!isAllowedAttachmentName(name) && !allowedByMime) continue;
                    if (path) {
                        pathCandidates.push({ path, original_name: name });
                    } else {
                        // No path; read data (await later)
                        readPromises.push(
                            (f as File)
                                .arrayBuffer()
                                .then((buf) => {
                                    dataCandidates.push({ data: buf, name, mime });
                                })
                                .catch(() => void 0),
                        );
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
                const nameFromPath = p.split(/[\\/]/).pop() || "file";
                if (isAllowedAttachmentName(nameFromPath)) pathCandidates.push({ path: p, original_name: nameFromPath });
            }

            // Wait for reading all clipboard blobs without path
            if (readPromises.length > 0) {
                await Promise.all(readPromises);
            }

            if (pathCandidates.length === 0 && dataCandidates.length === 0) return;

            e.preventDefault();
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
        }
        window.addEventListener("paste", onPaste);
        return () => window.removeEventListener("paste", onPaste);
    }, [selectedItemId, projectId, loadProject]);

    const onUploadFromPaths = async (project_item_id: number, files: UploadCandidate[]) => {
        try {
            const filtered = files.filter((f) => isAllowedAttachmentName(f.original_name || f.path));
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

    const [wmAttachment, setWmAttachment] = useState<Attachment | null>(null);
    const [wmDialogOpen, setWmDialogOpen] = useState<boolean>(false);
    const handleWatermark = async (attachment: Attachment) => {
        setWmAttachment(attachment);
        setWmDialogOpen(true);
    };
    const handleRemoveWatermark = async (attachment: Attachment) => {
        try {
            await removeWatermark(attachment.attachment_id);
            if (projectId) await loadProject(projectId);
        } catch (err) {
            console.error("Failed to delete watermark:", err);
        }
    };

    const handlePreviewOriginal = async (attachment: Attachment) => {
        try { await window.ContextBridge.attachment.openExternal(attachment.attachment_id, false); } catch (err) { console.error("Failed to preview file:", err); }
    };
    const handlePreviewWatermarked = async (attachment: Attachment) => {
        try { await window.ContextBridge.attachment.openExternal(attachment.attachment_id, true); } catch (err) { console.error("Failed to preview file:", err); }
    };

    const copyPath = async (attachment: Attachment, use_watermarked: boolean) => {
        try {
            const abs = await window.ContextBridge.attachment.getPath(attachment.attachment_id, use_watermarked);
            if (abs.success && abs.data) {
                await navigator.clipboard.writeText(abs.data);
                dispatchToast(<Toast><ToastTitle>Copied</ToastTitle></Toast>, { intent: "success", timeout: 1500 });
            }
        } catch (err) { console.error("Failed to copy path:", err); }
    };
    const handleCopyPathOriginal = (a: Attachment) => copyPath(a, false);
    const handleCopyPathWatermarked = (a: Attachment) => copyPath(a, true);

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
                <TemplateSelectorGrid templates={templates} onSelect={(t) => setSelectedTemplate(t)} />
            </div>
        );
    }

    // New project - metadata entry
    if (isNew && selectedTemplate) {
        return (
            <NewProjectMetadataForm
                selectedTemplate={selectedTemplate}
                name={name}
                creator={creator}
                description={description}
                onChangeName={setName}
                onChangeCreator={setCreator}
                onChangeDescription={setDescription}
                onBack={() => setSelectedTemplate(null)}
                onCreate={handleCreateProject}
                classes={{ container: styles.container, header: styles.header, section: styles.section }}
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
                                <ProjectItemCard
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
                                    onPreviewOriginal={handlePreviewOriginal}
                                    onPreviewWatermarked={handlePreviewWatermarked}
                                    onCopyPathOriginal={handleCopyPathOriginal}
                                    onCopyPathWatermarked={handleCopyPathWatermarked}
                                    onOpenRename={(a) => openRenameDialog(a)}
                                    onWatermark={handleWatermark}
                                    onRemoveWatermark={handleRemoveWatermark}
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

            <WatermarkApplyDialog
                open={wmDialogOpen}
                attachment={wmAttachment}
                onCancel={() => { setWmDialogOpen(false); setWmAttachment(null); }}
                onApplied={async () => {
                    setWmDialogOpen(false);
                    setWmAttachment(null);
                    if (projectId) await loadProject(projectId);
                }}
            />
        </div>
    );
}
