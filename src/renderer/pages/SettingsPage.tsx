import {
    Button,
    Accordion,
    AccordionItem,
    AccordionHeader,
    AccordionPanel,
    makeStyles,
    tokens,
    Toaster,
} from "@fluentui/react-components";
import {
    Folder24Regular,
    Person24Regular,
    DarkTheme24Regular,
    Settings24Regular,
} from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import { useSaveHandler } from "../utils/toastHelpers";
import type { AppSettings, WatermarkSettings } from "@common/types";
import WatermarkSettingsPanel from "../components/Settings/WatermarkSettingsPanel";
import UserSettingsPanel from "../components/Settings/UserSettingsPanel";
import AppearanceSettingsPanel from "../components/Settings/AppearanceSettingsPanel";
import FileSettingsPanel from "../components/Settings/FileSettingsPanel";
import PreviewSettingsPanel from "../components/Settings/PreviewSettingsPanel";
import { ConfirmDialog } from "../components/Common/ConfirmDialog";
// (local hsv type is defined inside ColorPickerPopover)

const useStyles = makeStyles({
    container: {
        padding: "24px",
        maxWidth: "800px",
        margin: "0 auto",
    },
    header: {
        marginBottom: "24px",
        display: "flex",
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

    // 使用toast处理器
    const saveWithToast = useSaveHandler({
        successTitle: "设置已保存",
        successMessage: "应用设置已成功更新",
        errorTitle: "保存设置失败",
        errorMessage: "无法保存应用设置",
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const response = await window.ContextBridge.settings.get();
            if (response.success && response.data) {
                console.log("response.data", response.data);
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

    const selectDefaultStoragePath = async () => {
        try {
            // For now, we'll use a simple input field
            // In a real app, you might want to add a folder picker dialog
            alert("请在输入框中直接输入文件夹路径");
        } catch (error) {
            console.error("Failed to select path:", error);
        }
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
        const text = "Watermark Preview";
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
                <div>加载设置中...</div>
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
                title="迁移文件"
                message="更改默认存储位置将迁移所有文件到新位置，可能需要一些时间。是否继续？"
                confirmText="迁移并应用"
                cancelText="取消"
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
                <Settings24Regular />
                <h1 className={styles.title}>应用设置</h1>
            </div>

            <Accordion multiple collapsible defaultOpenItems={["wm", "user", "appearance", "files", "preview"]}>
                <AccordionItem value="wm">
                    <AccordionHeader>
                        <Settings24Regular />&nbsp;Watermark
                    </AccordionHeader>
                    <AccordionPanel>
                        <WatermarkSettingsPanel wm={wm} fonts={fonts} onChange={updateWatermark} />
                    </AccordionPanel>
                </AccordionItem>
                    
                <AccordionItem value="user">
                    <AccordionHeader>
                        <Person24Regular />&nbsp;用户设置
                    </AccordionHeader>
                    <AccordionPanel>
                    <UserSettingsPanel
                        defaultUserName={formData.defaultUserName}
                        onChange={(name) => setFormData({ ...formData, defaultUserName: name })}
                    />
                    </AccordionPanel>
                </AccordionItem>

                <AccordionItem value="appearance">
                    <AccordionHeader>
                        <DarkTheme24Regular />&nbsp;外观设置
                    </AccordionHeader>
                    <AccordionPanel>
                    <AppearanceSettingsPanel
                        theme={formData.theme as 'light'|'dark'|'system' | undefined}
                        onChange={(t) => setFormData({ ...formData, theme: t })}
                    />
                    </AccordionPanel>
                </AccordionItem>

                <AccordionItem value="files">
                    <AccordionHeader>
                        <Folder24Regular />&nbsp;文件设置
                    </AccordionHeader>
                    <AccordionPanel>
                    <FileSettingsPanel
                        defaultStoragePath={formData.defaultStoragePath}
                        onChange={(p) => {
                            // If changed from current, ask to migrate immediately
                            const current = settings.defaultStoragePath;
                            if (p && p !== current) {
                                setPendingStoragePath(p);
                                setConfirmOpen(true);
                            } else {
                                setFormData({ ...formData, defaultStoragePath: p });
                            }
                        }}
                        onBrowse={selectDefaultStoragePath}
                    />
                    </AccordionPanel>
                </AccordionItem>

                <AccordionItem value="preview">
                    <AccordionHeader>
                        <Settings24Regular />&nbsp;预览设置
                    </AccordionHeader>
                    <AccordionPanel>
                    <PreviewSettingsPanel
                        width={formData.hoverPreviewWidth}
                        height={formData.hoverPreviewHeight}
                        onChange={(p) => setFormData({ ...formData, hoverPreviewWidth: p.width ?? formData.hoverPreviewWidth, hoverPreviewHeight: p.height ?? formData.hoverPreviewHeight })}
                    />
                    </AccordionPanel>
                </AccordionItem>
            </Accordion>

            {/* 操作按钮 */}
            <div className={styles.actionButtons}>
                <Button 
                    appearance="secondary" 
                    onClick={handleReset}
                    disabled={!hasChanges || saving}
                >
                    重置
                </Button>
                <Button 
                    appearance="primary" 
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                >
                    {saving ? "保存中..." : "保存设置"}
                </Button>
            </div>
        </div>
    );
}
