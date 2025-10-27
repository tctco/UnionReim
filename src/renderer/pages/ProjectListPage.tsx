import type { Project } from "@common/types";
import { Body1, Button, makeStyles, Spinner, Title3, tokens } from "@fluentui/react-components";
import { Add24Regular } from "@fluentui/react-icons";
import { useState } from "react";
import { useNavigate } from "react-router";
import { ConfirmDialog } from "../components/Common/ConfirmDialog";
import { SearchRow } from "../components/Common/SearchRow";
import ProjectCard from "../components/Project/ProjectCard";
import { useProjects } from "../hooks/useProjects";
import { useI18n } from "../i18n";

const useStyles = makeStyles({
    container: {
        padding: "24px",
        maxWidth: "1400px",
        margin: "0 auto",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px",
    },
    searchBar: {
        display: "flex",
        gap: "12px",
        marginBottom: "24px",
        alignItems: "center",
    },
    searchInput: {
        maxWidth: "400px",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
        gap: "16px",
    },
    card: {
        cursor: "pointer",
        ":hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
        },
    },
    cardContent: {
        padding: "12px 16px",
    },
    metadata: {
        marginTop: "8px",
        display: "flex",
        gap: "12px",
        color: tokens.colorNeutralForeground4,
    },
    emptyState: {
        textAlign: "center",
        padding: "64px 24px",
        color: tokens.colorNeutralForeground3,
    },
});

export function ProjectListPage() {
    const styles = useStyles();
    const navigate = useNavigate();
    const { projects, loading, error, deleteProject, exportProject, importProject } = useProjects();
    const { t } = useI18n();
    const [searchText, setSearchText] = useState("");
    const [deleteDialogProject, setDeleteDialogProject] = useState<Project | null>(null);

    const handleSearch = () => {
        // Implement search if needed
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
            <div className={styles.container}>
                <div style={{ textAlign: "center", padding: "64px" }}>
                    <Spinner size="large" label={t("projects.loading")} />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Title3>{t("projects.title")}</Title3>
                <div style={{ display: "flex", gap: "8px" }}>
                    <Button onClick={handleImport}>
                        {t("projects.importProject")}
                    </Button>
                    <Button appearance="primary" icon={<Add24Regular />} onClick={handleCreate}>
                        {t("projects.newProject")}
                    </Button>
                </div>
            </div>

            <SearchRow
                value={searchText}
                onChange={setSearchText}
                onSearch={handleSearch}
                placeholder={t("projects.searchPlaceholder")}
                buttonText={t("common.search")}
                className={styles.searchBar}
                inputClassName={styles.searchInput}
            />

            {error && (
                <div style={{ color: tokens.colorPaletteRedForeground1, marginBottom: "16px" }}>
                    {error}
                </div>
            )}

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
        </div>
    );
}
