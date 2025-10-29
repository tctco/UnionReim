import { Button, Field, Input, Spinner, Title3, makeStyles, tokens } from "@fluentui/react-components";
import { Save24Regular } from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";
import { useBlocker, useLocation, useNavigate, useParams } from "react-router";
import QuillEditor from "../components/Common/QuillEditor";
import { useDocument, useDocumentTemplates } from "../hooks/useDocuments";
import { useSaveHandler } from "../utils/toastHelpers";
import { useI18n } from "../i18n";
import { formatWatermarkPlaceholderList } from "@common/watermarkPlaceholders";
import { ConfirmDialog } from "../components/Common/ConfirmDialog";
import type { DocumentTemplate } from "@common/types";

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
    const [creator, setCreator] = useState("");

    // Initial snapshot for dirty detection
    const [initialSnapshot, setInitialSnapshot] = useState({ name: "", description: "", creator: "", html: "<p></p>" });
    const [leaveOpen, setLeaveOpen] = useState(false);

    useEffect(() => {
        if (document) {
            const nextName = document.name;
            const nextDesc = document.description || "";
            const nextCreator = document.creator || "";
            const nextHtml = document.content_html || "<p></p>";
            setName(nextName);
            setDescription(nextDesc);
            setCreator(nextCreator);
            setHtml(nextHtml);
            setInitialSnapshot({ name: nextName, description: nextDesc, creator: nextCreator, html: nextHtml });
        } else if (isNew) {
            // Initial snapshot for new document
            setInitialSnapshot({ name: "", description: "", creator: "", html: "<p></p>" });
        }
    }, [document, isNew]);

    // Pre-fill creator for new documents from settings service defaultUserName
    useEffect(() => {
        if (!isNew) return;
        (async () => {
            try {
                const res = await window.ContextBridge.settings.get();
                const userName = res.success ? res.data?.defaultUserName : undefined;
                if (userName) {
                    setCreator(userName);
                    setInitialSnapshot((prev) => ({ ...prev, creator: userName || "" }));
                }
            } catch {
                // ignore
            }
        })();
    }, [isNew]);

    const isDirty = useMemo(() => {
        return (
            name !== initialSnapshot.name ||
            description !== initialSnapshot.description ||
            creator !== initialSnapshot.creator ||
            html !== initialSnapshot.html
        );
    }, [name, description, creator, html, initialSnapshot]);

    // Route blocker for navigation (React Router v7)
    const blocker = useBlocker(isDirty);

    useEffect(() => {
        if (blocker.state === "blocked") {
            setLeaveOpen(true);
        }
    }, [blocker.state]);

    // Warn user when closing/refreshing window
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (!isDirty) return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [isDirty]);

    const handleSave = async () => {
        if (!name.trim()) {
            // Surface validation via toast helper as an error path
            await saveWithToast(async () => {
                throw new Error("名称不能为空");
            });
            return;
        }

        if (isNew) {
            const created = (await saveWithToast(() => createDocument({ name, description, creator, content_html: html }))) as unknown;
            const hasId = (v: unknown): v is Pick<DocumentTemplate, "document_id"> => {
                if (typeof v !== "object" || v === null) return false;
                const maybe = v as Record<string, unknown>;
                return typeof maybe.document_id === "number";
            };
            if (created && hasId(created)) {
                // Reset snapshot after successful save to prevent navigation blocking
                setInitialSnapshot({ name, description, creator, html });
            }
            return;
        }
        if (documentId) {
            const updated = (await saveWithToast(() => updateDocument({ document_id: documentId, name, description, creator, content_html: html }))) as unknown;
            const hasId = (v: unknown): v is Pick<DocumentTemplate, "document_id"> => {
                if (typeof v !== "object" || v === null) return false;
                const maybe = v as Record<string, unknown>;
                return typeof maybe.document_id === "number";
            };
            if (updated && hasId(updated)) {
                // Reset snapshot after successful save to prevent navigation blocking
                setInitialSnapshot({ name, description, creator, html });
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
            <ConfirmDialog
                open={leaveOpen}
                onOpenChange={setLeaveOpen}
                title={"未保存的更改"}
                message={"你有未保存的更改，确定要离开此页面吗？"}
                confirmText={"离开"}
                cancelText={"留在此页"}
                onConfirm={() => {
                    setLeaveOpen(false);
                    blocker.proceed?.();
                }}
                onCancel={() => {
                    setLeaveOpen(false);
                    blocker.reset?.();
                }}
            />
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
                <Field label={t("documents.fieldCreator")}>
                    <Input value={creator} onChange={(_, d) => setCreator(d.value)} />
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
