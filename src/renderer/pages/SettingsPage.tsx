import {
    Button,
    Accordion,
    AccordionItem,
    AccordionHeader,
    AccordionPanel,
    makeStyles,
    tokens,
    Toaster,
    Title3,
} from "@fluentui/react-components";
import { LocalLanguage24Regular } from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import { useSaveHandler } from "../utils/toastHelpers";
import type { AppSettings, WatermarkSettings } from "@common/types";
import WatermarkSettingsPanel from "../components/Settings/WatermarkSettingsPanel";
import UserSettingsPanel from "../components/Settings/UserSettingsPanel";
import AppearanceSettingsPanel from "../components/Settings/AppearanceSettingsPanel";
import PreferenceSettingsPanel from "../components/Settings/PreferenceSettingsPanel";
import { ConfirmDialog } from "../components/Common/ConfirmDialog";
import LanguageSettingsPanel from "../components/Settings/LanguageSettingsPanel";
import { useI18n } from "../i18n";
// (local hsv type is defined inside ColorPickerPopover)

const useStyles = makeStyles({
    container: {
        padding: "24px",
        maxWidth: "1400px",
        margin: "0 auto",
    },
    header: {
        marginBottom: "24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
    },
    title: {
        fontSize: tokens.fontSizeBase600,
        fontWeight: tokens.fontWeightSemibold,
        margin: 0,
    },
    settingsGrid: {
        display: "grid",
        gap: "24px",
        gridTemplateColumns: "1fr",
    },
    field: {
        marginBottom: "16px",
    },
    pathField: {
        display: "flex",
        gap: "8px",
        alignItems: "end",
    },
    pathInput: {
        flex: 1,
    },
    actionButtons: {
        display: "flex",
        gap: "12px",
        justifyContent: "flex-end",
        marginTop: "24px",
        paddingTop: "24px",
        borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
    },
    wmGrid: {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "16px",
    },
    wmControls: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "12px 16px",
    },
    toolbar: {
        display: "flex",
        columnGap: "4px",
        alignItems: "center",
    },
    wmControlFull: {
        gridColumn: "1 / -1",
    },
    wmPreviewWrap: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: tokens.colorNeutralBackground3,
        borderRadius: tokens.borderRadiusMedium,
        padding: "8px",
    },
    wmCanvas: {
        width: "100%",
        maxWidth: "480px",
        height: "auto",
        borderRadius: tokens.borderRadiusSmall,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        display: "block",
    },
});

export function SettingsPage() {
    const styles = useStyles();
    const { t } = useI18n();
    const [settings, setSettings] = useState<AppSettings>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState<AppSettings>({});
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingStoragePath, setPendingStoragePath] = useState<string | null>(null);
    const [fonts, setFonts] = useState<string[]>([]);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    // local states not needed after splitting panels
    // color popover handled by ColorPickerPopover component

    // 使用toast处理器（使用通用的 i18n 提示文案）
    const saveWithToast = useSaveHandler();

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const response = await window.ContextBridge.settings.get();
            if (response.success && response.data) {
                setSettings(response.data);
                setFormData(response.data);
            }
        } catch (error) {
            console.error("Failed to load settings:", error);
            // TODO: 可以考虑为加载操作也创建一个toast处理器
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        const result = await saveWithToast(async () => {
            return await window.ContextBridge.settings.update({
                settings: formData,
            });
        });
        
        if (result) {
            setSettings(result);
        }
        setSaving(false);
    };

    const handleReset = () => {
        setFormData(settings);
    };

    const loadFonts = async () => {
        try {
            const res = await window.ContextBridge.fonts.list();
            if (res.success && Array.isArray(res.data)) {
                setFonts(res.data);
            }
        } catch (error) {
            // ignore font load errors silently
            console.error("Failed to load fonts:", error);
        }
    };

    useEffect(() => {
        loadFonts();
    }, []);

    const getDefaultWatermark = (): WatermarkSettings => ({
        textMode: "template",
        fontFamily: "Arial",
        fontSize: 48,
        bold: false,
        color: "#000000",
        opacity: 0.3,
        rotation: -45,
        xPercent: 50,
        yPercent: 50,
    });

    const wm: WatermarkSettings = { ...getDefaultWatermark(), ...(formData.watermark || {}) };

    const updateWatermark = (patch: Partial<WatermarkSettings>) => {
        setFormData({ ...formData, watermark: { ...wm, ...patch } });
    };

    // color helpers are encapsulated in ColorPickerPopover
    // hsvToHexAlpha now inside ColorPickerPopover

    // no local preview color state; handled inside ColorPickerPopover

    // Draw patterned preview with current watermark config
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const width = 480;
        const height = 320;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // background pattern (light grid)
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#f7f7f7";
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = "#e0e0e0";
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 24) {
            ctx.beginPath();
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, height);
            ctx.stroke();
        }
        for (let y = 0; y < height; y += 24) {
            ctx.beginPath();
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(width, y + 0.5);
            ctx.stroke();
        }

        // watermark text (center-anchored with rotation)
        const text = t("settings.watermarkPreview");
        const x = (Math.max(0, Math.min(100, wm.xPercent ?? 50)) / 100) * width;
        const y = (Math.max(0, Math.min(100, wm.yPercent ?? 50)) / 100) * height;
        const fontSize = wm.fontSize ?? 48;
        const fontFamily = wm.fontFamily || "Arial";
        const fontWeight = wm.bold ? "bold " : "";

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(((wm.rotation ?? -45) * Math.PI) / 180);
        ctx.globalAlpha = wm.opacity ?? 0.3;
        ctx.fillStyle = wm.color || "#000000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `${fontWeight}${fontSize}px ${fontFamily}`;
        ctx.fillText(text, 0, 0);
        ctx.restore();
    }, [wm.fontFamily, wm.fontSize, wm.bold, wm.color, wm.opacity, wm.rotation, wm.xPercent, wm.yPercent]);

    const hasChanges = JSON.stringify(formData) !== JSON.stringify(settings);

    if (loading) {
        return (
            <div className={styles.container}>
                <div>{t("settings.loading")}</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Toaster />

            {/* Confirm migration dialog */}
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={t("settings.migrateTitle")}
                message={t("settings.migrateMessage")}
                confirmText={t("settings.migrateConfirm")}
                cancelText={t("settings.migrateCancel")}
                onConfirm={async () => {
                    if (!pendingStoragePath) return;
                    try {
                        const res = await window.ContextBridge.attachment.migrateStorage(pendingStoragePath);
                        if (res.success) {
                            // settings will be updated in main during migration; fetch fresh settings
                            const updated = await window.ContextBridge.settings.get();
                            if (updated.success && updated.data) {
                                setSettings(updated.data);
                                setFormData(updated.data);
                            }
                        }
                    } catch (e) {
                        console.error(e);
                    } finally {
                        setPendingStoragePath(null);
                    }
                }}
            />
            
            <div className={styles.header}>
                <Title3>{t("settings.title")}</Title3>
                <div style={{ display: "flex", gap: "8px" }}>
                    <Button 
                        appearance="secondary" 
                        onClick={handleReset}
                        disabled={!hasChanges || saving}
                    >
                        {t("settings.resetBtn")}
                    </Button>
                    <Button 
                        appearance="primary" 
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                    >
                        {saving ? t("settings.saving") : t("settings.saveBtn")}
                    </Button>
                </div>
            </div>

            <Accordion multiple collapsible defaultOpenItems={["user"]}>
                <AccordionItem value="user">
                    <AccordionHeader>
                        {t("settings.userSettings")}
                    </AccordionHeader>
                    <AccordionPanel>
                    <UserSettingsPanel
                        defaultUserName={formData.defaultUserName}
                        studentId={formData.studentId}
                        signatureImagePath={formData.signatureImagePath}
                        signatureImageHeightCm={formData.signatureImageHeightCm}
                        onChange={(patch) => setFormData({ ...formData, ...patch })}
                    />
                    </AccordionPanel>
                </AccordionItem>
                <AccordionItem value="appearance">
                    <AccordionHeader>
                        {t("settings.appearance")}
                    </AccordionHeader>
                    <AccordionPanel>
                    <AppearanceSettingsPanel
                        theme={formData.theme as 'light'|'dark'|'system' | undefined}
                        previewWidth={formData.hoverPreviewWidth}
                        previewHeight={formData.hoverPreviewHeight}
                        onThemeChange={(t) => setFormData({ ...formData, theme: t })}
                        onPreviewChange={(p) => setFormData({ ...formData, hoverPreviewWidth: p.width ?? formData.hoverPreviewWidth, hoverPreviewHeight: p.height ?? formData.hoverPreviewHeight })}
                    />
                    </AccordionPanel>
                </AccordionItem>

                <AccordionItem value="wm">
                    <AccordionHeader>
                        {t("settings.watermark")}
                    </AccordionHeader>
                    <AccordionPanel>
                        <WatermarkSettingsPanel wm={wm} fonts={fonts} onChange={updateWatermark} />
                    </AccordionPanel>
                </AccordionItem>
                <AccordionItem value="preferences">
                    <AccordionHeader>
                        {t("settings.preferences")}
                    </AccordionHeader>
                    <AccordionPanel>
                    <PreferenceSettingsPanel
                        defaultStoragePath={formData.defaultStoragePath}
                        autoWatermarkImages={formData.autoWatermarkImages}
                        onChange={(patch) => {
                            if (patch.defaultStoragePath !== undefined) {
                                const p = patch.defaultStoragePath;
                                const current = settings.defaultStoragePath;
                                if (p && p !== current) {
                                    setPendingStoragePath(p);
                                    setConfirmOpen(true);
                                } else {
                                    setFormData({ ...formData, defaultStoragePath: p });
                                }
                            }
                            if (patch.autoWatermarkImages !== undefined) {
                                setFormData({ ...formData, autoWatermarkImages: patch.autoWatermarkImages });
                            }
                        }}
                    />
                    </AccordionPanel>
                </AccordionItem>
                <AccordionItem value="language">
                    <AccordionHeader>
                        <LocalLanguage24Regular />&nbsp;{t("settings.language")}
                    </AccordionHeader>
                    <AccordionPanel>
                        <LanguageSettingsPanel
                            language={(formData.language as 'en'|'zh') || 'en'}
                            onChange={(lang) => setFormData({ ...formData, language: lang })}
                        />
                    </AccordionPanel>
                </AccordionItem>
            </Accordion>
            

            
        </div>
    );
}
