import type { Project } from "@common/types";
import {
    Body1,
    Button,
    Card,
    CardHeader,
    Input,
    makeStyles,
    Spinner,
    Title3,
    tokens,
    Badge,
    Menu,
    MenuItem,
    MenuList,
    MenuPopover,
    MenuTrigger,
    Caption1,
} from "@fluentui/react-components";
import { Add24Regular, Search24Regular, Delete24Regular, ArrowUpload24Regular, Edit24Regular, MoreVertical24Regular } from "@fluentui/react-icons";
import { useState } from "react";
import { useNavigate } from "react-router";
import { ConfirmDialog } from "../components/Common/ConfirmDialog";
import { useProjects } from "../hooks/useProjects";

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
            alert("Project exported successfully!");
        } catch (err) {
            console.error("Failed to export project:", err);
        }
    };

    const handleImport = async () => {
        try {
            await importProject();
            alert("Project imported successfully!");
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

    const getStatusBadge = (status: string) => {
        const colorMap: Record<string, "warning" | "success" | "informative" | "subtle"> = {
            incomplete: "warning",
            complete: "success",
            exported: "informative",
        };
        return <Badge color={colorMap[status] || "subtle"}>{status}</Badge>;
    };

    if (loading && projects.length === 0) {
        return (
            <div className={styles.container}>
                <div style={{ textAlign: "center", padding: "64px" }}>
                    <Spinner size="large" label="Loading projects..." />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Title3>Projects</Title3>
                <div style={{ display: "flex", gap: "8px" }}>
                    <Button onClick={handleImport}>
                        Import Project
                    </Button>
                    <Button appearance="primary" icon={<Add24Regular />} onClick={handleCreate}>
                        New Project
                    </Button>
                </div>
            </div>

            <div className={styles.searchBar}>
                <Input
                    className={styles.searchInput}
                    placeholder="Search projects..."
                    value={searchText}
                    onChange={(_, data) => setSearchText(data.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    contentBefore={<Search24Regular />}
                />
                <Button onClick={handleSearch}>Search</Button>
            </div>

            {error && (
                <div style={{ color: tokens.colorPaletteRedForeground1, marginBottom: "16px" }}>
                    {error}
                </div>
            )}

            {projects.length === 0 ? (
                <div className={styles.emptyState}>
                    <Body1>No projects found. Create your first project to get started.</Body1>
                </div>
            ) : (
                <div className={styles.grid}>
                    {projects.map((project) => (
                        <Card key={project.project_id} className={styles.card} onClick={() => handleView(project)}>
                            <CardHeader
                                header={<Body1>{project.name}</Body1>}
                                action={
                                    <Menu>
                                        <MenuTrigger disableButtonEnhancement>
                                            <Button
                                                appearance="subtle"
                                                icon={<MoreVertical24Regular />}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </MenuTrigger>
                                        <MenuPopover>
                                            <MenuList>
                                                <MenuItem
                                                    icon={<Edit24Regular />}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(project);
                                                    }}
                                                >
                                                    Edit
                                                </MenuItem>
                                                <MenuItem
                                                    icon={<ArrowUpload24Regular />}
                                                    onClick={(e) => handleExport(project, e)}
                                                >
                                                    Export
                                                </MenuItem>
                                                <MenuItem
                                                    icon={<Delete24Regular />}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteDialogProject(project);
                                                    }}
                                                >
                                                    Delete
                                                </MenuItem>
                                            </MenuList>
                                        </MenuPopover>
                                    </Menu>
                                }
                            />
                            <div className={styles.cardContent}>
                                <div style={{ marginBottom: "8px" }}>
                                    {getStatusBadge(project.status)}
                                </div>
                                <div className={styles.metadata}>
                                    <Caption1>Creator: {project.creator || "Unknown"}</Caption1>
                                    <Caption1>
                                        Created: {new Date(project.create_time).toLocaleDateString()}
                                    </Caption1>
                                </div>
                            </div>
                        </Card>
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


