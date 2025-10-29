import { Body1, Button, Caption1, Card, CardHeader, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Spinner, makeStyles, tokens } from "@fluentui/react-components";
import { Delete24Regular, MoreVertical24Regular } from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";
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
    card: { cursor: "pointer", ":hover": { backgroundColor: tokens.colorNeutralBackground1Hover } },
    cardContent: { padding: "12px 16px" },
});

type DocumentItem = DocumentTemplate;

function DocumentActions({ onDelete, onOpenMenu }: { onDelete: (e: React.MouseEvent) => void; onOpenMenu: (e: React.MouseEvent) => void }) {
    const { t } = useI18n();
    return (
        <Menu>
            <MenuTrigger disableButtonEnhancement>
                <Button appearance="subtle" icon={<MoreVertical24Regular />} onClick={onOpenMenu} />
            </MenuTrigger>
            <MenuPopover>
                <MenuList>
                    <MenuItem icon={<Delete24Regular />} onClick={onDelete}>
                        {t("common.delete")}
                    </MenuItem>
                </MenuList>
            </MenuPopover>
        </Menu>
    );
}

function DocumentCard({ d, onOpen, onDelete, className, contentClassName }: {
    d: DocumentItem;
    onOpen: () => void;
    onDelete: () => void;
    className: string;
    contentClassName: string;
}) {
    const { t } = useI18n();
    const stop = (e: React.MouseEvent) => e.stopPropagation();
    const updated = useMemo(() => new Date(d.update_time).toLocaleDateString(), [d.update_time]);
    return (
        <Card className={className} onClick={onOpen}>
            <CardHeader
                header={<Body1>{d.name}</Body1>}
                action={<DocumentActions onDelete={(e) => { stop(e); onDelete(); }} onOpenMenu={stop} />}
            />
            <div className={contentClassName}>
                <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>{d.description || ""}</Caption1>
                <div style={{ marginTop: 8, color: tokens.colorNeutralForeground4 }}>
                    <Caption1>{t("documents.updated")}: {updated}</Caption1>
                </div>
            </div>
        </Card>
    );
}

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

    return (
        <ListPageLayout
            title={t("documents.title")}
            actions={
                <Button appearance="primary" icon={<Add24Regular />} onClick={() => navigate("/documents/new")}>
                    {t("nav.newDocument")}
                </Button>
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
                        <DocumentCard
                            key={d.document_id}
                            d={d}
                            className={styles.card}
                            contentClassName={styles.cardContent}
                            onOpen={() => handleOpen(d.document_id)}
                            onDelete={() => setDeleteDialogDoc(d)}
                        />
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
