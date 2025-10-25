import { Button, Field, Input, Spinner, Title3, Toaster, makeStyles, tokens } from "@fluentui/react-components";
import { Save24Regular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import QuillEditor from "../components/Common/QuillEditor";
import { useDocument, useDocumentTemplates } from "../hooks/useDocuments";

const useStyles = makeStyles({
    container: { padding: "24px", maxWidth: "1000px", margin: "0 auto" },
    section: {
        marginTop: "16px",
        padding: "16px",
        background: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusMedium,
    },
});

export function DocumentEditorPage() {
    const styles = useStyles();
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams<{ id: string }>();
    const isNew = location.pathname === "/documents/new";
    const documentId = isNew ? null : parseInt(id || "0");
    const { document, loading } = useDocument(documentId);
    const { createDocument, updateDocument } = useDocumentTemplates();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [html, setHtml] = useState<string>("<p></p>");

    useEffect(() => {
        if (document) {
            setName(document.name);
            setDescription(document.description || "");
            setHtml(document.content_html || "<p></p>");
        }
    }, [document]);

    const handleSave = async () => {
        if (isNew) {
            const created = await createDocument({ name, description, content_html: html });
            navigate(`/documents/${created.document_id}`);
            return;
        }
        if (documentId) {
            const updated = await updateDocument({ document_id: documentId, name, description, content_html: html });
            navigate(`/documents/${updated.document_id}`);
        }
    };

    if (!isNew && loading && !document) {
        return (
            <div className={styles.container}>
                <Spinner label="Loading document..." />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Toaster />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Title3>{isNew ? "New Document" : "Edit Document"}</Title3>
                <div style={{ display: "flex", gap: 8 }}>
                    <Button onClick={() => navigate("/documents")}>Cancel</Button>
                    <Button appearance="primary" icon={<Save24Regular />} onClick={handleSave}>
                        Save
                    </Button>
                </div>
            </div>
            <div className={styles.section}>
                <Field label="Name">
                    <Input value={name} onChange={(_, d) => setName(d.value)} />
                </Field>
                <Field label="Description">
                    <Input value={description} onChange={(_, d) => setDescription(d.value)} />
                </Field>
            </div>
            <div className={styles.section}>
                <div style={{ marginBottom: 8, color: tokens.colorNeutralForeground3 }}>
                    支持占位符：{`{userName}`}、{`{studentId}`}、{`{date}`} 等。可在项目中进一步补充。
                </div>
                <QuillEditor valueHtml={html} onHtmlChange={setHtml} />
            </div>
        </div>
    );
}
