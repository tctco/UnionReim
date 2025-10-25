import {
    Body1,
    Button,
    Caption1,
    Card,
    CardHeader,
    Input,
    Menu,
    MenuItem,
    MenuList,
    MenuPopover,
    MenuTrigger,
    Spinner,
    Title3,
    Toaster,
    makeStyles,
    tokens,
} from "@fluentui/react-components";
import { Delete24Regular, MoreVertical24Regular, Search24Regular } from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";
import type { DocumentTemplate } from "@common/types";
import { useNavigate } from "react-router";
import { useDocumentTemplates } from "../hooks/useDocuments";
import { useDeleteHandler } from "../utils/toastHelpers";

const useStyles = makeStyles({
    container: { padding: "24px", maxWidth: "1400px", margin: "0 auto" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
    searchBar: { display: "flex", gap: "12px", marginBottom: "24px", alignItems: "center" },
    searchInput: { maxWidth: "400px" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "16px" },
    card: { cursor: "pointer", ":hover": { backgroundColor: tokens.colorNeutralBackground1Hover } },
    cardContent: { padding: "12px 16px" },
});

type DocumentItem = DocumentTemplate;

function SearchRow({
    value,
    onChange,
    onSearch,
    className,
    inputClassName,
}: {
    value: string;
    onChange: (v: string) => void;
    onSearch: () => void;
    className: string;
    inputClassName: string;
}) {
    return (
        <div className={className}>
            <Input
                className={inputClassName}
                placeholder="Search documents..."
                value={value}
                onChange={(_, d) => onChange(d.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
                contentBefore={<Search24Regular />}
            />
            <Button onClick={onSearch}>Search</Button>
        </div>
    );
}

function DocumentActions({ onDelete, onOpenMenu }: { onDelete: (e: React.MouseEvent) => void; onOpenMenu: (e: React.MouseEvent) => void }) {
    return (
        <Menu>
            <MenuTrigger disableButtonEnhancement>
                <Button appearance="subtle" icon={<MoreVertical24Regular />} onClick={onOpenMenu} />
            </MenuTrigger>
            <MenuPopover>
                <MenuList>
                    <MenuItem icon={<Delete24Regular />} onClick={onDelete}>
                        Delete
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
                    <Caption1>Updated: {updated}</Caption1>
                </div>
            </div>
        </Card>
    );
}

export function DocumentListPage() {
    const styles = useStyles();
    const navigate = useNavigate();
    const { documents, loading, loadDocuments, deleteDocument } = useDocumentTemplates();
    const [search, setSearch] = useState("");
    const delWithToast = useDeleteHandler({
        successTitle: "删除成功",
        successMessage: "文档已删除",
        errorTitle: "删除失败",
        errorMessage: "无法删除文档",
    });

    useEffect(() => {
        loadDocuments(search ? { search } : undefined);
    }, [search]);

    const handleSearch = () => loadDocuments(search ? { search } : undefined);
    const handleOpen = (id: number) => navigate(`/documents/${id}`);
    const handleDelete = (id: number) => delWithToast(() => deleteDocument(id));

    return (
        <div className={styles.container}>
            <Toaster />
            <div className={styles.header}>
                <Title3>Documents</Title3>
            </div>
            <SearchRow
                value={search}
                onChange={setSearch}
                onSearch={handleSearch}
                className={styles.searchBar}
                inputClassName={styles.searchInput}
            />
            {loading && <Spinner label="Loading..." />}
            {!loading && (
                <div className={styles.grid}>
                    {documents.map((d) => (
                        <DocumentCard
                            key={d.document_id}
                            d={d}
                            className={styles.card}
                            contentClassName={styles.cardContent}
                            onOpen={() => handleOpen(d.document_id)}
                            onDelete={() => handleDelete(d.document_id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
