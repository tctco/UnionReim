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
import { useNavigate } from "react-router";
import { Delete24Regular, MoreVertical24Regular, Search24Regular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
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

    return (
        <div className={styles.container}>
            <Toaster />
            <div className={styles.header}>
                <Title3>Documents</Title3>
                {/* Navigation removed per request */}
            </div>
            <div className={styles.searchBar}>
                <Input
                    className={styles.searchInput}
                    placeholder="Search documents..."
                    value={search}
                    onChange={(_, d) => setSearch(d.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadDocuments(search ? { search } : undefined)}
                    contentBefore={<Search24Regular />}
                />
                <Button onClick={() => loadDocuments(search ? { search } : undefined)}>Search</Button>
            </div>
            {loading ? (
                <Spinner label="Loading..." />
            ) : (
                <div className={styles.grid}>
                    {documents.map((d) => (
                        <Card
                            key={d.document_id}
                            className={styles.card}
                            onClick={() => navigate(`/documents/${d.document_id}`)}
                        >
                            <CardHeader
                                header={<Body1>{d.name}</Body1>}
                                action={
                                    <Menu>
                                        <MenuTrigger disableButtonEnhancement>
                                            <Button appearance="subtle" icon={<MoreVertical24Regular />} />
                                        </MenuTrigger>
                                        <MenuPopover>
                                            <MenuList>
                                                <MenuItem
                                                    icon={<Delete24Regular />}
                                                    onClick={() => delWithToast(() => deleteDocument(d.document_id))}
                                                >
                                                    Delete
                                                </MenuItem>
                                            </MenuList>
                                        </MenuPopover>
                                    </Menu>
                                }
                            />
                            <div className={styles.cardContent}>
                                <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                                    {d.description || ""}
                                </Caption1>
                                <div style={{ marginTop: 8, color: tokens.colorNeutralForeground4 }}>
                                    <Caption1>Updated: {new Date(d.update_time).toLocaleDateString()}</Caption1>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
