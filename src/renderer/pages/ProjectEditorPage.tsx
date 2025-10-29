import type { Attachment, ProjectItemWithDetails, Template, AppSettings } from "@common/types";
import {
    Body1,
    Button,
    Caption1,
    Tooltip,
    Select,
    makeStyles,
    Spinner,
    tokens,
    Input,
} from "@fluentui/react-components";
import { Edit16Regular, Save16Regular } from "@fluentui/react-icons";
import { useEffect, useState, useMemo, useRef } from "react";
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
import DocumentFromTemplateDialog from "../components/Project/DocumentFromTemplateDialog";
import { useProject, useProjects } from "../hooks/useProjects";
import { useProjectDocuments } from "../hooks/useDocuments";
import { useTemplates } from "../hooks/useTemplates";
import { DEFAULT_HOVER_PREVIEW, isAllowedAttachmentName } from "@common/constants";
import { useToastHandler, useUpdateHandler } from "../utils/toastHelpers";
import { useI18n } from "../i18n";
import { ListPageLayout } from "../components/Layout/ListPageLayout";

const useStyles = makeStyles({
    container: {
        padding: "12px",
        maxWidth: "1200px",
        margin: "0 auto",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "12px",
    },
    section: {
        marginBottom: "12px",
        padding: "8px",
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusMedium,
    },
    formField: {
        marginBottom: "16px",
    },
    itemCard: {
        marginBottom: "4px",
        padding: "6px 12px",
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: tokens.borderRadiusMedium,
    },
    itemHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    attachmentList: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
    },
    attachmentItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "4px 8px",
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
    const { t } = useI18n();

    // Check path to determine if new or edit mode
    const isNew = location.pathname === "/projects/new";
    const projectId = isNew ? null : parseInt(id || "0");

    const { templates } = useTemplates();
    const { createProject, updateProject } = useProjects(); 
    const { project, loading, loadProject, checkComplete } = useProject(projectId);
    const { load: loadProjectDocs } = useProjectDocuments(projectId);
    const { uploadAttachment, deleteAttachment, removeWatermark, renameAttachment, uploadFromPaths, uploadFromData } = useAttachments();
    
    // Toast handlers for various operations
    const showSuccessToast = useToastHandler({ successTitle: t("projects.uploadSuccess"), timeout: 1500 });
    const showWarningToast = useToastHandler({ errorTitle: t("projects.unsupportedFileType") });
    const showCopiedToast = useToastHandler({ successTitle: t("projects.copied"), timeout: 1500 });
    const showStatusSuccessToast = useToastHandler({ successTitle: t("projects.statusUpdated"), timeout: 1500 });

    const [name, setName] = useState("");
    const [creator, setCreator] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<'incomplete' | 'complete' | 'exported'>("incomplete");
    const [deleteConfirmAttachment, setDeleteConfirmAttachment] = useState<Attachment | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [searchText, setSearchText] = useState("");
    const [editingTitle, setEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState("");
    const titleTextRef = useRef<HTMLSpanElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [titleWidth, setTitleWidth] = useState<number | undefined>(undefined);
    const showUpdateToast = useUpdateHandler({ timeout: 1500 });

    useEffect(() => {
        if (project) {
            setName(project.name);
            setCreator(project.creator || "");
            setDescription(project.metadata?.description || "");
            setStatus(project.status as 'incomplete' | 'complete' | 'exported');
            setEditedTitle(project.name || "");
        }
    }, [project]);

    useEffect(() => {
        if (editingTitle) {
            // Focus input when entering edit mode and move caret to end
            const el = inputRef.current;
            if (el) {
                el.focus();
                const val = el.value;
                el.value = "";
                el.value = val;
            }
        }
    }, [editingTitle]);

    useEffect(() => {
        if (projectId) loadProjectDocs(projectId);
    }, [projectId, loadProjectDocs]);

    // Load default user name for new projects
    useEffect(() => {
        if (isNew) {
            const loadDefaultUser = async () => {
                try {
                    const response = await window.ContextBridge.settings.getSetting("defaultUserName");
                    if (response.success && response.data) {
                        setCreator(response.data);
                    }
                } catch (error) {
                    console.error("Failed to load default user name:", error);
                }
            };
            loadDefaultUser();
        }
    }, [isNew]);

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
                setPreviewSize({ width: s.hoverPreviewWidth ?? DEFAULT_HOVER_PREVIEW.width, height: s.hoverPreviewHeight ?? DEFAULT_HOVER_PREVIEW.height });
            }
        }
        load();
        window.ContextBridge.onSettingsChanged((s: AppSettings) => {
            setPreviewSize({ width: s.hoverPreviewWidth ?? DEFAULT_HOVER_PREVIEW.width, height: s.hoverPreviewHeight ?? DEFAULT_HOVER_PREVIEW.height });
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
            await showSuccessToast(async () => {
                if (pathCandidates.length > 0) {
                    await onUploadFromPaths(selectedItemId, pathCandidates);
                }
                if (dataCandidates.length > 0) {
                    await uploadFromData(selectedItemId, dataCandidates);
                }
                if (projectId) await loadProject(projectId);
            });
        }
        window.addEventListener("paste", onPaste);
        return () => window.removeEventListener("paste", onPaste);
    }, [selectedItemId, projectId, loadProject]);

    const onUploadFromPaths = async (project_item_id: number, files: UploadCandidate[]) => {
        const filtered = files.filter((f) => isAllowedAttachmentName(f.original_name || f.path));
        if (filtered.length === 0) {
            await showWarningToast(async () => {
                throw new Error(t("projects.unsupportedFileType"));
            });
            return;
        }
        await showSuccessToast(async () => {
            await uploadFromPaths(project_item_id, filtered);
            if (projectId) await loadProject(projectId);
        });
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

    const handleSaveProjectTitle = async () => {
        if (!projectId) return;
        const next = editedTitle.trim();
        if (!next || next === project?.name) {
            setEditingTitle(false);
            return;
        }
        try {
            await showUpdateToast(async () => {
                await updateProject({ project_id: projectId, name: next });
                return null as unknown as void;
            });
            await loadProject(projectId);
            setEditingTitle(false);
        } catch (err) {
            console.error("Failed to update project name:", err);
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
        await showCopiedToast(async () => {
            const abs = await window.ContextBridge.attachment.getPath(attachment.attachment_id, use_watermarked);
            if (abs.success && abs.data) {
                await navigator.clipboard.writeText(abs.data);
            }
        });
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

    // Document-from-template dialog state
    const [docDialogOpen, setDocDialogOpen] = useState(false);
    const [docTargetItemId, setDocTargetItemId] = useState<number | null>(null);
    const openDocDialog = (project_item_id: number) => {
        setDocTargetItemId(project_item_id);
        setDocDialogOpen(true);
    };

    // Filter items based on search text (must be before any conditional returns)
    const filteredItems = useMemo(() => {
        if (!project?.items) return [];
        if (!searchText.trim()) return project.items;
        const search = searchText.toLowerCase();
        return project.items.filter((item) => 
            item.template_item.name.toLowerCase().includes(search)
        );
    }, [project?.items, searchText]);

    // Only show the full-page spinner on initial load when no project data yet.
    // During background refreshes (e.g., after uploads), keep the page rendered to avoid scroll jumps.
    if (loading && !project) {
        return (
            <ListPageLayout title={t("projects.loading")}>
                <div style={{ textAlign: "center", padding: "64px" }}>
                    <Spinner size="large" label={t("projects.loading")} />
                </div>
            </ListPageLayout>
        );
    }

    // New project - template selection
    if (isNew && !selectedTemplate) {
        return (
            <ListPageLayout
                title={t("projects.newProject")}
                actions={
                    <Button onClick={() => navigate("/projects")}>{t("common.cancel")}</Button>
                }
            >
                <Body1 style={{ marginBottom: "16px" }}>{t("projects.selectTemplate") || "Select a template to get started:"}</Body1>
                <TemplateSelectorGrid templates={templates} onSelect={(t) => setSelectedTemplate(t)} />
            </ListPageLayout>
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

    const titleNode = !editingTitle ? (
        <span style={{ display: "inline-flex"}}>
            <span ref={titleTextRef}>{project.name}</span>
            <Tooltip content={t("common.edit")} relationship="label">
                <Button
                    size="small"
                    appearance="subtle"
                    icon={<Edit16Regular />}
                    onClick={() => {
                        setEditedTitle(project.name);
                        const w = titleTextRef.current?.offsetWidth;
                        setTitleWidth((w && w > 0) ? w : undefined);
                        setEditingTitle(true);
                    }}
                    style={{ marginLeft: 8 }}
                />
            </Tooltip>
        </span>
    ) : (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Input
                size="small"
                appearance="underline"
                value={editedTitle}
                onChange={(_, data) => setEditedTitle(data.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSaveProjectTitle(); } }}
                style={{
                    fontSize: tokens.fontSizeBase600,
                    fontWeight: tokens.fontWeightSemibold,
                    color: tokens.colorNeutralForeground1,
                    backgroundColor: "transparent",
                    padding: 0,
                    minWidth: titleWidth ? titleWidth : 160,
                    width: titleWidth,
                    boxSizing: "content-box",
                }}
                ref={inputRef}
            />
            <Tooltip content={t("common.save")} relationship="label">
                <Button
                    size="small"
                    appearance="subtle"
                    icon={<Save16Regular />}
                    onClick={handleSaveProjectTitle}
                />
            </Tooltip>
        </span>
    );

    return (
        <ListPageLayout
            title={titleNode}
            subtitle={<Caption1 style={{ marginLeft: 6}}>{project.template.name}</Caption1>}
            actions={
                <>
                    <Select
                        value={status}
                        onChange={async (e) => {
                            if (!projectId) return;
                            const next = (e.target as HTMLSelectElement).value as 'incomplete' | 'complete' | 'exported';
                            if (next === status) return;
                            if (next === 'complete') {
                                try {
                                    const ok = await checkComplete(projectId);
                                    if (!ok) {
                                        await showWarningToast(async () => {
                                            throw new Error(t("projects.requiredItemsMissing"));
                                        });
                                        setStatus('incomplete');
                                        return;
                                    }
                                } catch (err) {
                                    console.error("Status validation failed:", err);
                                }
                            }
                            const result = await showStatusSuccessToast(async () => {
                                await updateProject({ project_id: projectId, status: next });
                                setStatus(next);
                                await loadProject(projectId);
                            });
                            // Revert status if update failed
                            if (!result) {
                                setStatus(project?.status as 'incomplete' | 'complete' | 'exported' || 'incomplete');
                            }
                        }}
                        aria-label="Project status"
                    >
                        <option value="incomplete">incomplete</option>
                        <option value="complete">complete</option>
                        {project.status === 'exported' && <option value="exported">exported</option>}
                    </Select>
                    <Button appearance="primary" onClick={() => navigate(`/projects/${project.project_id}`)}>
                        Preview
                    </Button>
                </>
            }
            searchBar={{
                value: searchText,
                onChange: setSearchText,
                placeholder: t("projects.searchItemsPlaceholder") || "Filter by item name...",
                buttonText: t("common.search"),
            }}
        >
            <div className={styles.section}>
                {filteredItems.map((item) => (
                    <FileUploader
                        key={item.project_item_id}
                        onUpload={(files) => onUploadFromPaths(item.project_item_id, files)}
                        onUploadData={async (files) => {
                            await showSuccessToast(async () => {
                                await uploadFromData(item.project_item_id, files);
                                if (projectId) await loadProject(projectId);
                            });
                        }}
                    >
                                <ProjectItemCard
                                    item={item}
                                    selected={selectedItemId === item.project_item_id}
                                    onSelect={() =>
                                        setSelectedItemId((prev) =>
                                            prev === item.project_item_id ? null : item.project_item_id,
                                        )
                                    }
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
                                    onAddFromDocument={(pid) => openDocDialog(pid)}
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

            <DocumentFromTemplateDialog
                open={docDialogOpen}
                onOpenChange={setDocDialogOpen}
                projectId={project?.project_id || 0}
                projectItemId={docTargetItemId || 0}
                projectName={project?.name}
                projectCreator={project?.creator}
                onUploaded={async () => { if (projectId) await loadProject(projectId); }}
            />
        </ListPageLayout>
    );
}
