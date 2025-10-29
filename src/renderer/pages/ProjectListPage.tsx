import type { Project } from "@common/types";
import { Body1, Button, Caption1, Card, CardHeader, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Spinner, Badge, makeStyles, tokens } from "@fluentui/react-components";
import { Add24Regular, ArrowUpload24Regular, Edit24Regular, Delete24Regular, MoreVertical24Regular } from "@fluentui/react-icons";
import { useState } from "react";
import { useNavigate } from "react-router";
import { ConfirmDialog } from "../components/Common/ConfirmDialog";
import { ListPageLayout } from "../components/Layout/ListPageLayout";
import { useProjects } from "../hooks/useProjects";
import { useI18n } from "../i18n";

const useStyles = makeStyles({
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
        gap: "16px",
    },
    card: {
        width: "100%",
        cursor: "pointer",
        ":hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
        },
    },
    description: {
        marginTop: "8px",
        color: tokens.colorNeutralForeground3,
    },
    metadata: {
        marginTop: "12px",
        display: "flex",
        gap: "16px",
        color: tokens.colorNeutralForeground4,
    },
    emptyState: {
        textAlign: "center",
        padding: "64px 24px",
        color: tokens.colorNeutralForeground3,
    },
    centerSpinner: {
        textAlign: "center",
        padding: "64px",
    },
});

export function ProjectListPage() {
    const styles = useStyles();
    const navigate = useNavigate();
    const { projects, loading, error, loadProjects, deleteProject, exportProject, importProject } = useProjects();
    const { t } = useI18n();
    const [searchText, setSearchText] = useState("");
    const [deleteDialogProject, setDeleteDialogProject] = useState<Project | null>(null);

    const handleSearch = () => {
        loadProjects({ search: searchText });
    };

    const handleCreate = () => {
        navigate("/projects/new");
    };

    const handleView = (project: Project) => {
        navigate(`/projects/${project.project_id}`);
    };

    const handleEdit = (project: Project) => {
        navigate(`/projects/${project.project_id}/edit`);
    };


    const handleExport = async (project: Project, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await exportProject(project.project_id);
            alert(t("projects.exportSuccess"));
        } catch (err) {
            console.error("Failed to export project:", err);
        }
    };

    const handleImport = async () => {
        try {
            await importProject();
            alert(t("projects.importSuccess"));
        } catch (err) {
            console.error("Failed to import project:", err);
        }
    };

    const handleDelete = async () => {
        if (!deleteDialogProject) return;
        
        try {
            await deleteProject(deleteDialogProject.project_id);
        } catch (err) {
            console.error("Failed to delete project:", err);
        }
        setDeleteDialogProject(null);
    };

    // moved into ProjectCard

    if (loading && projects.length === 0) {
        return (
            <ListPageLayout title={t("projects.title")}>
                <div className={styles.centerSpinner}>
                    <Spinner size="large" label={t("projects.loading")} />
                </div>
            </ListPageLayout>
        );
    }

    return (
        <ListPageLayout
            title={t("projects.title")}
            actions={
                <>
                    <Button onClick={handleImport}>
                        {t("projects.importProject")}
                    </Button>
                    <Button appearance="primary" icon={<Add24Regular />} onClick={handleCreate}>
                        {t("projects.newProject")}
                    </Button>
                </>
            }
            searchBar={{
                value: searchText,
                onChange: setSearchText,
                onSearch: handleSearch,
                placeholder: t("projects.searchPlaceholder"),
                buttonText: t("common.search"),
            }}
            error={error}
        >
            {projects.length === 0 ? (
                <div className={styles.emptyState}>
                    <Body1>{t("projects.empty")}</Body1>
                </div>
            ) : (
                <div className={styles.grid}>
                    {projects.map((project) => {
                        const statusColorMap: Record<string, "warning" | "success" | "informative" | "subtle"> = {
                            incomplete: "warning",
                            complete: "success",
                            exported: "informative",
                        };
                        return (
                            <Card key={project.project_id} className={styles.card} onClick={() => handleView(project)}>
                                <CardHeader
                                    header={
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <Body1>{project.name}</Body1>
                                            <Badge color={statusColorMap[project.status] || "subtle"}>{project.status}</Badge>
                                        </div>
                                    }
                                    action={
                                        <Menu>
                                            <MenuTrigger disableButtonEnhancement>
                                                <Button appearance="subtle" icon={<MoreVertical24Regular />} onClick={(e) => e.stopPropagation()} />
                                            </MenuTrigger>
                                            <MenuPopover>
                                                <MenuList>
                                                    <MenuItem icon={<Edit24Regular />} onClick={(e) => { e.stopPropagation(); handleEdit(project); }}>
                                                        {t("common.edit")}
                                                    </MenuItem>
                                                    <MenuItem icon={<ArrowUpload24Regular />} onClick={(e) => handleExport(project, e)}>
                                                        {t("common.export")}
                                                    </MenuItem>
                                                    <MenuItem icon={<Delete24Regular />} onClick={(e) => { e.stopPropagation(); setDeleteDialogProject(project); }}>
                                                        {t("common.delete")}
                                                    </MenuItem>
                                                </MenuList>
                                            </MenuPopover>
                                        </Menu>
                                    }
                                />
                                <div className={styles.metadata}>
                                    <Caption1>
                                        {t("projects.created")}: {new Date(project.create_time).toLocaleDateString()}
                                    </Caption1>
                                    <Caption1>
                                        {t("projects.creator")}: {project.creator || t("common.unknown")}
                                    </Caption1>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <ConfirmDialog
                title="Delete Project"
                message={deleteDialogProject ? `Are you sure you want to delete "${deleteDialogProject.name}"? This action cannot be undone.` : ""}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={handleDelete}
                onCancel={() => setDeleteDialogProject(null)}
                open={!!deleteDialogProject}
                onOpenChange={(open) => !open && setDeleteDialogProject(null)}
                destructive
            />
        </ListPageLayout>
    );
}
