import { Body1, Button, Caption1, Card, CardHeader, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Spinner, makeStyles, tokens } from "@fluentui/react-components";
import { Delete24Regular, MoreVertical24Regular, ArrowDownload24Regular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { Add24Regular } from "@fluentui/react-icons";
import type { DocumentTemplate } from "@common/types";
import { useNavigate } from "react-router";
import { useDocumentTemplates } from "../hooks/useDocuments";
import { useDeleteHandler } from "../utils/toastHelpers";
import { useI18n } from "../i18n";
import { ConfirmDialog } from "../components/Common/ConfirmDialog";
import { ListPageLayout } from "../components/Layout/ListPageLayout";

const useStyles = makeStyles({
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "16px" },
    card: { width: "100%", cursor: "pointer", ":hover": { backgroundColor: tokens.colorNeutralBackground1Hover } },
    description: { marginTop: "8px", color: tokens.colorNeutralForeground3 },
    metadata: { marginTop: "12px", display: "flex", gap: "16px", color: tokens.colorNeutralForeground4 },
});

type DocumentItem = DocumentTemplate;

export function DocumentListPage() {
    const styles = useStyles();
    const navigate = useNavigate();
    const { documents, loading, loadDocuments, deleteDocument } = useDocumentTemplates();
    const { t } = useI18n();
    const [search, setSearch] = useState("");
    const delWithToast = useDeleteHandler();
    const [deleteDialogDoc, setDeleteDialogDoc] = useState<DocumentItem | null>(null);

    useEffect(() => {
        loadDocuments(search ? { search } : undefined);
    }, [search]);

    const handleSearch = () => loadDocuments(search ? { search } : undefined);
    const handleOpen = (id: number) => navigate(`/documents/${id}`);
    const handleDelete = (id: number) => delWithToast(() => deleteDocument(id));

    const handleImport = async () => {
        try {
            const response = await window.ContextBridge.document.import({ file_path: "" });
            if (response.success) {
                alert(`文档模板导入成功！文档ID: ${response.data}`);
                window.location.reload();
            } else {
                alert(`导入失败: ${response.error}`);
            }
        } catch (error) {
            console.error("Failed to import document:", error);
            alert("导入失败");
        }
    };

    const handleExport = async (doc: DocumentItem, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const response = await window.ContextBridge.document.export({ document_id: doc.document_id });
            if (response.success) {
                alert(`文档模板导出成功！文件已保存至: ${response.data}`);
            } else {
                alert(`导出失败: ${response.error}`);
            }
        } catch (error) {
            console.error("Failed to export document:", error);
            alert("导出失败");
        }
    };

    return (
        <ListPageLayout
            title={t("documents.title")}
            actions={
                <>
                    <Button appearance="outline" icon={<ArrowDownload24Regular />} onClick={handleImport}>
                        {t("common.import")}
                    </Button>
                    <Button appearance="primary" icon={<Add24Regular />} onClick={() => navigate("/documents/new")}>
                        {t("nav.newDocument")}
                    </Button>
                </>
            }
            searchBar={{
                value: search,
                onChange: setSearch,
                onSearch: handleSearch,
                placeholder: t("documents.searchPlaceholder"),
                buttonText: t("common.search"),
            }}
        >
            {loading && <Spinner label={t("documents.loading")} />}
            {!loading && (
                <div className={styles.grid}>
                    {documents.map((d) => (
                        <Card key={d.document_id} className={styles.card} onClick={() => handleOpen(d.document_id)}>
                            <CardHeader
                                header={<Body1>{d.name}</Body1>}
                                action={
                                    <Menu>
                                        <MenuTrigger disableButtonEnhancement>
                                            <Button appearance="subtle" icon={<MoreVertical24Regular />} onClick={(e) => e.stopPropagation()} />
                                        </MenuTrigger>
                                        <MenuPopover>
                                            <MenuList>
                                                <MenuItem icon={<ArrowDownload24Regular />} onClick={(e) => handleExport(d, e)}>
                                                    {t("common.export")}
                                                </MenuItem>
                                                <MenuItem icon={<Delete24Regular />} onClick={(e) => { e.stopPropagation(); setDeleteDialogDoc(d); }}>
                                                    {t("common.delete")}
                                                </MenuItem>
                                            </MenuList>
                                        </MenuPopover>
                                    </Menu>
                                }
                            />
                            {d.description && (
                                <div className={styles.description}>
                                    <Caption1>{d.description}</Caption1>
                                </div>
                            )}
                            <div className={styles.metadata}>
                                <Caption1>{t("documents.updated")}: {new Date(d.update_time).toLocaleDateString()}</Caption1>
                                <Caption1>{t("common.creator")}: {d.creator || t("common.unknown")}</Caption1>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            <ConfirmDialog
                title={t("documents.deleteDialogTitle")}
                message={deleteDialogDoc ? t("documents.deleteDialogMessage", { name: deleteDialogDoc.name }) : ""}
                confirmText={t("common.delete")}
                cancelText={t("common.cancel")}
                onConfirm={() => {
                    if (deleteDialogDoc) {
                        handleDelete(deleteDialogDoc.document_id);
                    }
                    setDeleteDialogDoc(null);
                }}
                onCancel={() => setDeleteDialogDoc(null)}
                open={!!deleteDialogDoc}
                onOpenChange={(open) => !open && setDeleteDialogDoc(null)}
                destructive
            />
        </ListPageLayout>
    );
}
