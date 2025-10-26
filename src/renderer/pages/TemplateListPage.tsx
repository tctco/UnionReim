import type { Template } from "@common/types";
import {
    Body1,
    Button,
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    Input,
    makeStyles,
    Spinner,
    Title3,
    tokens,
} from "@fluentui/react-components";
import { Add24Regular, Search24Regular, ArrowDownload24Regular } from "@fluentui/react-icons";
import { useState } from "react";
import { useNavigate } from "react-router";
import { ConfirmDialog } from "../components/Common/ConfirmDialog";
import { TemplateCard } from "../components/Template/TemplateCard";
import { useTemplates } from "../hooks/useTemplates";
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
    emptyState: {
        textAlign: "center",
        padding: "64px 24px",
        color: tokens.colorNeutralForeground3,
    },
});

export function TemplateListPage() {
    const styles = useStyles();
    const navigate = useNavigate();
    const { templates, loading, error, loadTemplates, deleteTemplate, cloneTemplate } = useTemplates();
    const { t } = useI18n();
    const [searchText, setSearchText] = useState("");
    const [cloneDialogTemplate, setCloneDialogTemplate] = useState<Template | null>(null);
    const [deleteDialogTemplate, setDeleteDialogTemplate] = useState<Template | null>(null);
    const [cloneName, setCloneName] = useState("");

    const handleSearch = () => {
        loadTemplates({ search: searchText });
    };

    const handleCreate = () => {
        navigate("/templates/new");
    };

    const handleImport = async () => {
        try {
            const response = await window.ContextBridge.template.import({
                file_path: "" // 这个参数实际上在IPC handler中被忽略，使用file dialog
            });
            if (response.success) {
                alert(`模板导入成功！模板ID: ${response.data}`);
                // Refresh template list
                window.location.reload();
            } else {
                alert(`导入失败: ${response.error}`);
            }
        } catch (error) {
            console.error("Failed to import template:", error);
            alert("导入失败");
        }
    };

    const handleExport = async (template: Template, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const response = await window.ContextBridge.template.export({
                template_id: template.template_id,
            });
            if (response.success) {
                alert(`模板导出成功！文件已保存至: ${response.data}`);
            } else {
                alert(`导出失败: ${response.error}`);
            }
        } catch (error) {
            console.error("Failed to export template:", error);
            alert("导出失败");
        }
    };

    const handleView = (template: Template) => {
        navigate(`/templates/${template.template_id}`);
    };

    const handleEdit = (template: Template) => {
        navigate(`/templates/${template.template_id}/edit`);
    };

    const handleClone = async () => {
        if (!cloneDialogTemplate || !cloneName) return;
        
        try {
            await cloneTemplate(cloneDialogTemplate.template_id, cloneName);
        } catch (err) {
            console.error("Failed to clone template:", err);
        }
        setCloneDialogTemplate(null);
        setCloneName("");
    };

    const handleDelete = async () => {
        if (!deleteDialogTemplate) return;
        
        try {
            await deleteTemplate(deleteDialogTemplate.template_id);
        } catch (err) {
            console.error("Failed to delete template:", err);
        }
        setDeleteDialogTemplate(null);
    };

    if (loading && templates.length === 0) {
        return (
            <div className={styles.container}>
                <div style={{ textAlign: "center", padding: "64px" }}>
                    <Spinner size="large" label={t("templates.loading")} />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Title3>{t("templates.title")}</Title3>
                <div style={{ display: "flex", gap: "12px" }}>
                    <Button appearance="outline" icon={<ArrowDownload24Regular />} onClick={handleImport}>
                        {t("templates.import")}
                    </Button>
                    <Button appearance="primary" icon={<Add24Regular />} onClick={handleCreate}>
                        {t("templates.newTemplate")}
                    </Button>
                </div>
            </div>

            <div className={styles.searchBar}>
                <Input
                    className={styles.searchInput}
                    placeholder={t("templates.searchPlaceholder")}
                    value={searchText}
                    onChange={(_, data) => setSearchText(data.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    contentBefore={<Search24Regular />}
                />
                <Button onClick={handleSearch}>{t("common.search")}</Button>
            </div>

            {error && (
                <div style={{ color: tokens.colorPaletteRedForeground1, marginBottom: "16px" }}>
                    {error}
                </div>
            )}

            {templates.length === 0 ? (
                <div className={styles.emptyState}>
                    <Body1>{t("templates.empty")}</Body1>
                </div>
            ) : (
                <div className={styles.grid}>
                    {templates.map((template) => (
                        <div key={template.template_id}>
                            <TemplateCard
                                template={template}
                                onView={handleView}
                                onEdit={handleEdit}
                                onClone={(t) => {
                                    setCloneDialogTemplate(t);
                                    setCloneName(`${t.name} (Copy)`);
                                }}
                                onDelete={(t) => setDeleteDialogTemplate(t)}
                                onExport={handleExport}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Clone Dialog */}
            {cloneDialogTemplate && (
                <Dialog open onOpenChange={(_, data) => !data.open && setCloneDialogTemplate(null)}>
                    <DialogSurface>
                        <DialogBody>
                            <DialogTitle>{t("templates.cloneDialogTitle")}</DialogTitle>
                            <DialogContent>
                                <Input
                                    value={cloneName}
                                    onChange={(_, data) => setCloneName(data.value)}
                                    placeholder={t("templates.cloneDialogPlaceholder")}
                                />
                            </DialogContent>
                            <DialogActions>
                                <Button appearance="secondary" onClick={() => setCloneDialogTemplate(null)}>
                                    {t("common.cancel")}
                                </Button>
                                <Button appearance="primary" onClick={handleClone}>
                                    {t("common.clone")}
                                </Button>
                            </DialogActions>
                        </DialogBody>
                    </DialogSurface>
                </Dialog>
            )}

            {/* Delete Dialog */}
            <ConfirmDialog
                title={t("templates.deleteDialogTitle")}
                message={deleteDialogTemplate ? t("templates.deleteDialogMessage", { name: deleteDialogTemplate.name }) : ""}
                confirmText={t("common.delete")}
                cancelText={t("common.cancel")}
                onConfirm={handleDelete}
                onCancel={() => setDeleteDialogTemplate(null)}
                open={!!deleteDialogTemplate}
                onOpenChange={(open) => !open && setDeleteDialogTemplate(null)}
                destructive
            />
        </div>
    );
}
