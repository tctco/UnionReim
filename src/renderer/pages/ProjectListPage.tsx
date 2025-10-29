import type { Project } from "@common/types";
import { Body1, Button, makeStyles, Spinner, tokens } from "@fluentui/react-components";
import { Add24Regular } from "@fluentui/react-icons";
import { useState } from "react";
import { useNavigate } from "react-router";
import { ConfirmDialog } from "../components/Common/ConfirmDialog";
import { ListPageLayout } from "../components/Layout/ListPageLayout";
import ProjectCard from "../components/Project/ProjectCard";
import { useProjects } from "../hooks/useProjects";
import { useI18n } from "../i18n";

const useStyles = makeStyles({
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
        gap: "16px",
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
                    {projects.map((project) => (
                        <ProjectCard
                          key={project.project_id}
                          project={project}
                          onClick={() => handleView(project)}
                          onEdit={(e) => { e.stopPropagation(); handleEdit(project); }}
                          onExport={(e) => handleExport(project, e)}
                          onDelete={(e) => { e.stopPropagation(); setDeleteDialogProject(project); }}
                        />
                    ))}
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
