import {
    Button,
    Card,
    CardHeader,
    Checkbox,
    Field,
    Input,
    Label,
    Switch,
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
import { useEffect, useState } from "react";
import { useSaveHandler } from "../utils/toastHelpers";
import type { AppSettings } from "@common/types";

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
    card: {
        padding: "24px",
    },
    cardTitle: {
        fontSize: tokens.fontSizeBase500,
        fontWeight: tokens.fontWeightSemibold,
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
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
});

export function SettingsPage() {
    const styles = useStyles();
    const [settings, setSettings] = useState<AppSettings>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState<AppSettings>({});

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
            
            <div className={styles.header}>
                <Settings24Regular />
                <h1 className={styles.title}>应用设置</h1>
            </div>

            <div className={styles.settingsGrid}>
                {/* 用户设置 */}
                <Card className={styles.card}>
                    <CardHeader>
                        <div className={styles.cardTitle}>
                            <Person24Regular />
                            用户设置
                        </div>
                    </CardHeader>
                    
                    <Field className={styles.field}>
                        <Label htmlFor="defaultUserName">默认用户名</Label>
                        <Input
                            id="defaultUserName"
                            value={formData.defaultUserName || ""}
                            onChange={(_, data) => 
                                setFormData({ ...formData, defaultUserName: data.value })
                            }
                            placeholder="输入默认用户名"
                        />
                    </Field>
                </Card>

                {/* 外观设置 */}
                <Card className={styles.card}>
                    <CardHeader>
                        <div className={styles.cardTitle}>
                            <DarkTheme24Regular />
                            外观设置
                        </div>
                    </CardHeader>
                    
                    <Field className={styles.field}>
                        <Label>主题设置</Label>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <Checkbox
                                checked={formData.theme === "system"}
                                onChange={(_, data) => {
                                    if (data.checked) {
                                        setFormData({ ...formData, theme: "system" });
                                    } else {
                                        setFormData({ ...formData, theme: "light" });
                                    }
                                }}
                                label="跟随系统主题"
                            />
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <DarkTheme24Regular />
                                <Label>深色模式</Label>
                                <Switch
                                    checked={formData.theme === "dark"}
                                    disabled={formData.theme === "system"}
                                    onChange={(_, data) => {
                                        if (formData.theme !== "system") {
                                            setFormData({ 
                                                ...formData, 
                                                theme: data.checked ? "dark" : "light" 
                                            });
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </Field>
                </Card>

                {/* 文件设置 */}
                <Card className={styles.card}>
                    <CardHeader>
                        <div className={styles.cardTitle}>
                            <Folder24Regular />
                            文件设置
                        </div>
                    </CardHeader>
                    
                    <Field className={styles.field}>
                        <Label htmlFor="defaultStoragePath">默认存储路径</Label>
                        <div className={styles.pathField}>
                            <Input
                                id="defaultStoragePath"
                                className={styles.pathInput}
                                value={formData.defaultStoragePath || ""}
                                onChange={(_, data) => 
                                    setFormData({ ...formData, defaultStoragePath: data.value })
                                }
                                placeholder="输入默认文件存储路径"
                            />
                            <Button 
                                appearance="outline" 
                                onClick={selectDefaultStoragePath}
                                icon={<Folder24Regular />}
                            >
                                浏览
                            </Button>
                        </div>
                    </Field>
                </Card>

                {/* 预览设置 */}
                <Card className={styles.card}>
                    <CardHeader>
                        <div className={styles.cardTitle}>
                            <Settings24Regular />
                            预览设置
                        </div>
                    </CardHeader>

                    <Field className={styles.field}>
                        <Label htmlFor="hoverPreviewWidth">预览宽度（px）</Label>
                        <Input
                            id="hoverPreviewWidth"
                            type="number"
                            value={String(formData.hoverPreviewWidth ?? 400)}
                            onChange={(_, data) =>
                                setFormData({ ...formData, hoverPreviewWidth: Number(data.value || 0) })
                            }
                            min={120}
                            step={10}
                        />
                    </Field>

                    <Field className={styles.field}>
                        <Label htmlFor="hoverPreviewHeight">预览高度（px）</Label>
                        <Input
                            id="hoverPreviewHeight"
                            type="number"
                            value={String(formData.hoverPreviewHeight ?? 240)}
                            onChange={(_, data) =>
                                setFormData({ ...formData, hoverPreviewHeight: Number(data.value || 0) })
                            }
                            min={80}
                            step={10}
                        />
                    </Field>
                </Card>
            </div>

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
