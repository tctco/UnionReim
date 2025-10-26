import { Button, Field, Input, Spinner, Title3, Toaster, makeStyles, tokens } from "@fluentui/react-components";
import { Save24Regular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import QuillEditor from "../components/Common/QuillEditor";
import { useDocument, useDocumentTemplates } from "../hooks/useDocuments";
import { useSaveHandler } from "../utils/toastHelpers";
import { useI18n } from "../i18n";
import { formatWatermarkPlaceholderList } from "@common/watermarkPlaceholders";

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
    const { t } = useI18n();
    const saveWithToast = useSaveHandler({
        successTitle: "保存成功",
        successMessage: "文档已保存",
        errorTitle: "保存失败",
        errorMessage: "无法保存文档",
    });

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
        if (!name.trim()) {
            // Surface validation via toast helper as an error path
            await saveWithToast(async () => {
                throw new Error("名称不能为空");
            });
            return;
        }

        if (isNew) {
            const created = await saveWithToast(() => createDocument({ name, description, content_html: html }));
            if (created && (created as any).document_id) {
                navigate(`/documents/${(created as any).document_id}`);
            }
            return;
        }
        if (documentId) {
            const updated = await saveWithToast(() => updateDocument({ document_id: documentId, name, description, content_html: html }));
            if (updated && (updated as any).document_id) {
                navigate(`/documents/${(updated as any).document_id}`);
            }
        }
    };

    if (!isNew && loading && !document) {
        return (
            <div className={styles.container}>
                <Spinner label={t("documents.loadingOne")} />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Toaster />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Title3>{isNew ? t("documents.editorNewTitle") : t("documents.editorEditTitle")}</Title3>
                <div style={{ display: "flex", gap: 8 }}>
                    <Button onClick={() => navigate("/documents")}>{t("documents.editorCancel")}</Button>
                <Button appearance="primary" icon={<Save24Regular />} onClick={handleSave}>
                        {t("documents.editorSave")}
                    </Button>
                </div>
            </div>
            <div className={styles.section}>
                <Field label={t("documents.fieldName")}>
                    <Input value={name} onChange={(_, d) => setName(d.value)} />
                </Field>
                <Field label={t("documents.fieldDescription")}>
                    <Input value={description} onChange={(_, d) => setDescription(d.value)} />
                </Field>
            </div>
            <div className={styles.section}>
                <div style={{ marginBottom: 8, color: tokens.colorNeutralForeground3 }}>
                    {t("documents.placeholdersTip", { list: formatWatermarkPlaceholderList() })}
                </div>
                <QuillEditor initialHtml={html} onHtmlChange={setHtml} />
            </div>
        </div>
    );
}
