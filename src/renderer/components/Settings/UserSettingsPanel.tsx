import { Field, Input, Image, Caption1, Button, makeStyles, tokens } from "@fluentui/react-components";
import { useI18n } from "../../i18n";
import FileUploader from "../Common/FileUploader";
import { toReimbursementUrlFromRelative } from "@common/urlHelpers";
import { DEFAULT_SIGNATURE_IMAGE_HEIGHT_CM } from "@common/constants";
import { useEffect, useRef, useState } from "react";

const useStyles = makeStyles({
    sigBox: {
        border: `1px dashed ${tokens.colorNeutralStroke1}`,
        borderRadius: tokens.borderRadiusMedium,
        padding: "12px",
        display: "flex",
        gap: "12px",
        alignItems: "center",
        minHeight: "80px",
        cursor: "pointer",
    },
    sigBoxActive: {
        border: `1px solid ${tokens.colorBrandForeground1}`,
        backgroundColor: tokens.colorTransparentBackgroundHover,
    },
    sigPreview: {
        width: "160px",
        height: "80px",
        objectFit: "contain",
        backgroundColor: tokens.colorNeutralBackground3,
        borderRadius: tokens.borderRadiusSmall,
    },
});

export default function UserSettingsPanel(props: {
    defaultUserName?: string;
    studentId?: string;
    signatureImagePath?: string; // relative path under storage root
    signatureImageHeightCm?: number;
    onChange: (patch: { defaultUserName?: string; studentId?: string; signatureImagePath?: string; signatureImageHeightCm?: number }) => void;
}) {
    const { defaultUserName, studentId, signatureImagePath, signatureImageHeightCm, onChange } = props;
    const { t } = useI18n();
    const styles = useStyles();

    const imageUrl = signatureImagePath ? toReimbursementUrlFromRelative(signatureImagePath) : undefined;
    const [active, setActive] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const boxRef = useRef<HTMLDivElement | null>(null);

    const isAllowed = (name: string) => {
        const ext = (name.split(".").pop() || "").toLowerCase();
        return ["png", "jpg", "jpeg"].includes(ext);
    };

    useEffect(() => {
        function onPaste(e: ClipboardEvent) {
            if (!active) return;
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

            const pathCandidates: Array<{ path: string; original_name?: string }> = [];
            const dataCandidates: Array<{ data: ArrayBuffer; name?: string; mime?: string }> = [];
            const readPromises: Array<Promise<void>> = [];

            const fileList = e.clipboardData?.files;
            if (fileList && fileList.length > 0) {
                for (const f of Array.from(fileList)) {
                    const path = (f as unknown as { path?: string }).path as string | undefined;
                    const name = f.name || path || "image";
                    const mime = (f as File).type || "";
                    const allowedByMime = mime.startsWith("image/");
                    if (!name && !allowedByMime) continue;
                    if (!isAllowed(name) && !allowedByMime) continue;
                    if (path) {
                        pathCandidates.push({ path, original_name: name });
                    } else {
                        readPromises.push(
                            (f as File)
                                .arrayBuffer()
                                .then((buf) => { dataCandidates.push({ data: buf, name, mime }); })
                                .catch(() => void 0),
                        );
                    }
                }
            }

            const text = e.clipboardData?.getData("text") || "";
            const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
            for (const line of lines) {
                let p = line;
                if (p.startsWith("file://")) {
                    try { p = decodeURI(p.replace(/^file:\/\//, "")); } catch { /* ignore */ }
                }
                const nameFromPath = p.split(/[\\/]/).pop() || "image";
                if (isAllowed(nameFromPath)) pathCandidates.push({ path: p, original_name: nameFromPath });
            }

            if (readPromises.length > 0) {
                Promise.all(readPromises).then(async () => {
                    if (pathCandidates.length === 0 && dataCandidates.length === 0) return;
                    e.preventDefault();
                    try {
                        if (pathCandidates.length > 0) {
                            const f = pathCandidates[0];
                            const res = await window.ContextBridge.settings.signatureUploadFromPath({ path: f.path, original_name: f.original_name });
                            if (res.success && res.data) onChange({ signatureImagePath: res.data });
                        }
                        if (dataCandidates.length > 0) {
                            const f = dataCandidates[0];
                            const payload = { data: Array.from(new Uint8Array(f.data)), name: f.name, mime: f.mime };
                            const res = await window.ContextBridge.settings.signatureUploadFromData(payload);
                            if (res.success && res.data) onChange({ signatureImagePath: res.data });
                        }
                    } catch {
                        // ignore
                    }
                });
            } else {
                if (pathCandidates.length === 0 && dataCandidates.length === 0) return;
                e.preventDefault();
                (async () => {
                    try {
                        if (pathCandidates.length > 0) {
                            const f = pathCandidates[0];
                            const res = await window.ContextBridge.settings.signatureUploadFromPath({ path: f.path, original_name: f.original_name });
                            if (res.success && res.data) onChange({ signatureImagePath: res.data });
                        }
                        if (dataCandidates.length > 0) {
                            const f = dataCandidates[0];
                            const payload = { data: Array.from(new Uint8Array(f.data)), name: f.name, mime: f.mime };
                            const res = await window.ContextBridge.settings.signatureUploadFromData(payload);
                            if (res.success && res.data) onChange({ signatureImagePath: res.data });
                        }
                    } catch {
                        // ignore
                    }
                })();
            }
        }
        window.addEventListener("paste", onPaste);
        return () => window.removeEventListener("paste", onPaste);
    }, [active, onChange]);

    return (
        <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12 }}>
                <Field label={t("user.defaultUserNameLabel")} style={{ flex: 1 }}>
                    <Input
                        id="defaultUserName"
                        value={defaultUserName || ""}
                        onChange={(_, data) => onChange({ defaultUserName: data.value })}
                        placeholder={t("user.defaultUserNamePlaceholder")}
                    />
                </Field>
                <Field label={t("user.studentIdLabel")} style={{ flex: 1 }}>
                    <Input
                        id="studentId"
                        value={studentId || ""}
                        onChange={(_, data) => onChange({ studentId: data.value })}
                        placeholder={t("user.studentIdPlaceholder")}
                    />
                </Field>
                <Field label={t("user.signatureHeightLabel")} style={{ flex: 1 }}>
                    <Input
                        id="signatureImageHeightCm"
                        type="number"
                        min={0.5}
                        step={0.1}
                        value={String(signatureImageHeightCm ?? DEFAULT_SIGNATURE_IMAGE_HEIGHT_CM)}
                        onChange={(_, data) => {
                            const v = Number(data.value);
                            if (!Number.isNaN(v)) onChange({ signatureImageHeightCm: v });
                        }}
                        placeholder={t("user.signatureHeightPlaceholder")}
                    />
                </Field>
            </div>

            <Field label={t("user.signatureLabel")}>
                <FileUploader
                    acceptExts={["png", "jpg", "jpeg"]}
                    onUpload={async (files) => {
                        const f = files[0];
                        if (!f) return;
                        try {
                            const res = await window.ContextBridge.settings.signatureUploadFromPath({ path: f.path, original_name: f.original_name });
                            if (res.success && res.data) {
                                onChange({ signatureImagePath: res.data });
                            }
                        } catch {
                            // ignore
                        }
                    }}
                    onUploadData={async (files) => {
                        const f = files[0];
                        if (!f) return;
                        try {
                            const payload = { data: Array.from(new Uint8Array(f.data)), name: f.name, mime: f.mime };
                            const res = await window.ContextBridge.settings.signatureUploadFromData(payload);
                            if (res.success && res.data) {
                                onChange({ signatureImagePath: res.data });
                            }
                        } catch {
                            // ignore
                        }
                    }}
                >
                    {({ isDragging }) => (
                        <div
                            ref={boxRef}
                            className={`${styles.sigBox} ${active ? styles.sigBoxActive : ""}`}
                            tabIndex={0}
                            onFocus={() => setActive(true)}
                            onBlur={(e) => {
                                // only deactivate when focus leaves the box entirely
                                if (!e.currentTarget.contains(e.relatedTarget as Node)) setActive(false);
                            }}
                            onClick={() => {
                                setActive(true);
                            }}
                            aria-label={t("user.signatureLabel") as string}
                        >
                            {imageUrl ? (
                                <Image className={styles.sigPreview} src={imageUrl} alt={t("user.signatureAlt") as string} fit="contain"/>
                            ) : (
                                <div className={styles.sigPreview} />
                            )}
                            <div>
                                <Caption1>{t("user.signatureHint")}</Caption1>
                                {imageUrl && <Caption1>{t("user.signatureReplaceHint")}</Caption1>}
                                {isDragging && <Caption1>{t("user.signatureDropping")}</Caption1>}
                                <div style={{ marginTop: 8 }}>
                                    <Button onClick={() => { setActive(true); if (inputRef.current) inputRef.current.click(); }}>
                                        {t("common.browse")}
                                    </Button>
                                </div>
                            </div>
                            <input
                                ref={inputRef}
                                type="file"
                                accept="image/png,image/jpeg"
                                style={{ display: "none" }}
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const path = (file as unknown as { path?: string }).path as string | undefined;
                                    try {
                                        if (path) {
                                            const res = await window.ContextBridge.settings.signatureUploadFromPath({ path, original_name: file.name });
                                            if (res.success && res.data) onChange({ signatureImagePath: res.data });
                                        } else {
                                            const buf = await file.arrayBuffer();
                                            const res = await window.ContextBridge.settings.signatureUploadFromData({ data: Array.from(new Uint8Array(buf)), name: file.name, mime: file.type });
                                            if (res.success && res.data) onChange({ signatureImagePath: res.data });
                                        }
                                    } catch {
                                        // ignore
                                    } finally {
                                        // reset value to allow re-selecting same file
                                        (e.target as HTMLInputElement).value = "";
                                    }
                                }}
                            />
                        </div>
                    )}
                </FileUploader>
            </Field>

            
        </div>
    );
}


