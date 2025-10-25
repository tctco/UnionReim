import type { DocumentTemplate } from "@common/types";
import {
    Button,
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    Field,
    Input,
    Select,
    Spinner,
    makeStyles,
    tokens,
} from "@fluentui/react-components";
import { useEffect, useMemo, useState } from "react";
import QuillEditor from "../Common/QuillEditor";

const useStyles = makeStyles({
    layout: { display: "grid", gridTemplateColumns: "1fr", gap: "16px", alignItems: "stretch" },
    form: { display: "grid", gap: "8px" },
    preview: {
        padding: '8px',
        background: tokens.colorNeutralBackground1,
    },
});

function extractPlaceholders(html: string): string[] {
    const set = new Set<string>();
    const re = /\{([a-zA-Z0-9_]+)\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) set.add(m[1]);
    return Array.from(set);
}

function apply(html: string, values: Record<string, string>): string {
    return html.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, k) => values[k] ?? `{${k}}`);
}

export default function DocumentFromTemplateDialog(props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: number;
    projectItemId: number;
    projectName?: string;
    projectCreator?: string;
    onUploaded: () => Promise<void> | void;
}) {
    const { open, onOpenChange, projectId, projectItemId, projectName, projectCreator, onUploaded } = props;
    const styles = useStyles();

    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [selectedId, setSelectedId] = useState<string>("");
    const [values, setValues] = useState<Record<string, string>>({});
    const [baseHtml, setBaseHtml] = useState<string>("");

    const selected = useMemo(
        () => templates.find((t) => String(t.document_id) === selectedId) || null,
        [templates, selectedId],
    );

    const placeholders = useMemo(() => (baseHtml ? extractPlaceholders(baseHtml) : []), [baseHtml]);
    const previewHtml = useMemo(() => apply(baseHtml, values), [baseHtml, values]);

    useEffect(() => {
        if (!open) return;
        let mounted = true;
        (async () => {
            setLoading(true);
            try {
                const res = await window.ContextBridge.document.list();
                if (mounted && res.success && res.data) setTemplates(res.data);
            } finally {
                setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [open]);

    useEffect(() => {
        (async () => {
            const s = await window.ContextBridge.settings.get();
            const v: Record<string, string> = {};
            if (s.success && s.data) {
                if (s.data.defaultUserName) v.userName = s.data.defaultUserName;
                if (s.data.studentId) v.studentId = s.data.studentId;
            }
            if (projectName) v.projectName = projectName;
            if (projectCreator) v.creator = projectCreator;
            v.date = new Date().toISOString().slice(0, 10);
            setValues(v);
        })();
    }, [projectName, projectCreator]);

    const onSelectTemplate = async (id: string) => {
        setSelectedId(id);
        const t = templates.find((x) => String(x.document_id) === id);
        setBaseHtml(t?.content_html || "");
    };

    const uploadPdf = async () => {
        if (!selected) return;
        setLoading(true);
        try {
            const html = previewHtml;
            // create project document and export to PDF in storage
            const created = await window.ContextBridge.projectDocument.create({
                project_id: projectId,
                name: selected.name,
                content_html: html,
            });
            const docId = created.success && created.data ? created.data.project_document_id : undefined;
            if (!docId) throw new Error("Failed to create project document");
            const exp = await window.ContextBridge.projectDocument.exportPdf(docId);
            if (!exp.success || !exp.data) throw new Error("Failed to export PDF");
            const rel = exp.data;
            const absRes = await window.ContextBridge.system.resolveStoragePath(rel);
            if (!absRes.success || !absRes.data) throw new Error("Failed to resolve path");
            const abs = absRes.data;
            // upload to project item
            await window.ContextBridge.attachment.uploadFromPaths(projectItemId, [
                { path: abs, original_name: `${selected.name}.pdf` },
            ]);
            await onUploaded();
            onOpenChange(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(_, data) => onOpenChange(!!data.open)}>
            <DialogSurface>
                <DialogBody>
                    <DialogTitle>从模板添加文档</DialogTitle>
                    <DialogContent>
                        {loading && <Spinner />}
                        <div className={styles.layout}>
                            <div className={styles.form}>
                                <Field label="选择模板">
                                    <Select value={selectedId} onChange={(_, d) => onSelectTemplate(d.value)}>
                                        <option value="" disabled>
                                            选择...
                                        </option>
                                        {templates.map((t) => (
                                            <option key={t.document_id} value={String(t.document_id)}>
                                                {t.name}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                                {placeholders.length > 0 && (
                                    <div style={{ display: "grid", gap: 8 }}>
                                        {placeholders.map((k) => (
                                            <Field key={k} label={k}>
                                                <Input
                                                    value={values[k] || ""}
                                                    onChange={(_, d) => setValues((v) => ({ ...v, [k]: d.value }))}
                                                />
                                            </Field>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className={styles.preview}>
                                <QuillEditor initialHtml={previewHtml} minHeight={420} />
                            </div>
                        </div>
                    </DialogContent>
                    <DialogActions>
                        <Button appearance="secondary" onClick={() => onOpenChange(false)}>
                            取消
                        </Button>
                        <Button appearance="primary" onClick={uploadPdf} disabled={!selectedId || loading}>
                            生成并上传PDF
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
}
