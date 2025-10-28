import {
    Body1,
    Button,
    Checkbox,
    Field,
    InfoLabel,
    Input,
    makeStyles,
    Spinner,
    Textarea,
    Title3,
    Toaster,
    tokens,
} from "@fluentui/react-components";
import { Add24Regular, Delete24Regular, Save24Regular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { ConfirmDialog } from "../components/Common/ConfirmDialog";
import { useTemplate, useTemplates } from "../hooks/useTemplates";
import { useDeleteHandler, useSaveHandler } from "../utils/toastHelpers";
import type { TemplateItem } from "@common/types";
import { formatWatermarkPlaceholderList } from "@common/watermarkPlaceholders";
import { useI18n } from "../i18n";
import TokenAutocompleteInput from "../components/Common/TokenAutocompleteInput";

const useStyles = makeStyles({
    container: {
        padding: "24px",
        maxWidth: "1000px",
        margin: "0 auto",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px",
    },
    section: {
        marginBottom: "24px",
        padding: "16px",
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusMedium,
    },
    formField: {
        marginBottom: "16px",
    },
    itemList: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },
    itemCard: {
        padding: "16px",
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: tokens.borderRadiusMedium,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
    },
    itemHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "12px",
    },
    itemFields: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "16px",
        "@media (max-width: 600px)": {
            gridTemplateColumns: "1fr",
            gap: "12px",
        },
    },
});

export function TemplateEditorPage() {
    const styles = useStyles();
    const { t } = useI18n();
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams<{ id: string }>();
    
    // 修复isNew判断逻辑 - 检查路径而不是参数
    const isNew = location.pathname === "/templates/new";
    const templateId = isNew ? null : parseInt(id || "0");

    const { createTemplate, updateTemplate } = useTemplates();
    const { template, loading, createItem, updateItem, deleteItem } = useTemplate(templateId);

    // 使用toast处理器
    const saveWithToast = useSaveHandler({
        successTitle: isNew ? "模板创建成功" : "模板更新成功",
        successMessage: isNew ? "新模板已成功创建" : "模板已成功更新",
        errorTitle: isNew ? "创建失败" : "更新失败",
        errorMessage: isNew ? "无法创建模板" : "无法更新模板",
    });

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [creator, setCreator] = useState("");
    const [items, setItems] = useState<Partial<TemplateItem>[]>([]);
    const [deleteConfirmItem, setDeleteConfirmItem] = useState<TemplateItem | null>(null);
    
    // 删除操作的 toast 处理器：仅显示错误，自定义标题
    const deleteWithToast = useDeleteHandler({ successTitle: undefined, successMessage: undefined, errorTitle: "删除失败" });


    useEffect(() => {
        if (template) {
            setName(template.name);
            setDescription(template.description || "");
            setCreator(template.creator || "");
            setItems(template.items);
        }
    }, [template]);

    // Load default user name for new templates
    useEffect(() => {
        if (isNew) {
            const loadDefaultUser = async () => {
                try {
                    const response = await window.ContextBridge.settings.getSetting("defaultUserName");
                    if (response.success && response.data) {
                        setCreator(response.data);
                    }
                } catch (error) {
                    console.error("Failed to load default user name:", error);
                }
            };
            loadDefaultUser();
        }
    }, [isNew]);

    const handleSaveTemplate = async () => {
        await saveWithToast(async () => {
            if (isNew) {
                const newTemplate = await createTemplate({ name, description, creator });
                navigate(`/templates/${newTemplate.template_id}`);
                return newTemplate;
            }
            // Update existing template
            const updated = await updateTemplate({
                template_id: templateId!,
                name,
                description,
                creator,
            });
            navigate(`/templates/${updated.template_id}`);
            return updated;
        });
    };

    const handleAddItem = async () => {
        if (!templateId) return;

        try {
            await createItem({
                template_id: templateId,
                name: "New Item",
                is_required: false,
                needs_watermark: false,
                allows_multiple_files: false,
                display_order: items.length,
            });
        } catch (err) {
            console.error("Failed to add item:", err);
        }
    };

    const handleUpdateItem = async (itemId: number, field: string, value: unknown) => {
        try {
            await updateItem({
                item_id: itemId,
                [field]: value,
            });
        } catch (err) {
            console.error("Failed to update item:", err);
        }
    };

    const handleDeleteItemClick = (item: TemplateItem) => {
        setDeleteConfirmItem(item);
    };

    const handleDeleteItemConfirm = async () => {
        if (!deleteConfirmItem) return;
        await deleteWithToast(async () => {
            await deleteItem(deleteConfirmItem.item_id);
            return true as unknown as never; // 返回任意值以满足泛型
        });
        setDeleteConfirmItem(null);
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div style={{ textAlign: "center", padding: "64px" }}>
                    <Spinner size="large" label={t("templates.editorLoading")} />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Toaster />
            <div className={styles.header}>
                <Title3>{isNew ? t("templates.editorNewTitle") : t("templates.editorEditTitle")}</Title3>
                <div style={{ display: "flex", gap: "8px" }}>
                    <Button onClick={() => navigate("/templates")}>{t("templates.editorCancel")}</Button>
                    <Button appearance="primary" icon={<Save24Regular />} onClick={handleSaveTemplate}>
                        {t("templates.editorSave")}
                    </Button>
                </div>
            </div>

            <div className={styles.section}>
                <Field label={t("templates.fieldName")} required>
                    <Input
                        value={name}
                        onChange={(_, data) => setName(data.value)}
                        placeholder={t("templates.fieldNamePlaceholder")}
                    />
                </Field>
                <Field label={t("templates.fieldDesc")}>
                    <Textarea
                        value={description}
                        onChange={(_, data) => setDescription(data.value)}
                        placeholder={t("templates.fieldDescPlaceholder")}
                    />
                </Field>
                <Field label={t("templates.fieldCreator")}>
                    <Input
                        value={creator}
                        onChange={(_, data) => setCreator(data.value)}
                        placeholder={t("templates.fieldCreatorPlaceholder")}
                    />
                </Field>
            </div>

            {!isNew && (
                <div className={styles.section}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <Body1 style={{ fontWeight: tokens.fontWeightSemibold }}>{t("templates.itemsTitle")}</Body1>
                        <Button icon={<Add24Regular />} onClick={handleAddItem}>
                            {t("templates.addItem")}
                        </Button>
                    </div>

                    <div className={styles.itemList}>
                        {items.map((item) => (
                            <div key={item.item_id} className={styles.itemCard}>
                                <div className={styles.itemHeader}>
                                    <Input
                                        value={item.name || ""}
                                        onChange={(_, data) => {
                                            // Update local state immediately
                                            setItems(prevItems =>
                                                prevItems.map(i =>
                                                    i.item_id === item.item_id
                                                        ? { ...i, name: data.value }
                                                        : i
                                                )
                                            );
                                        }}
                                        onBlur={(e) => handleUpdateItem(item.item_id!, "name", e.target.value)}
                                        placeholder={t("templates.itemNamePlaceholder")}
                                        style={{ flex: 1, marginRight: "12px" }}
                                    />
                                    <Button
                                        icon={<Delete24Regular />}
                                        onClick={() => handleDeleteItemClick(item as TemplateItem)}
                                        appearance="subtle"
                                    />
                                </div>
                                <div className={styles.itemFields}>
                                    <Checkbox
                                        label={t("templates.required")}
                                        checked={item.is_required || false}
                                        onChange={(_, data) => handleUpdateItem(item.item_id!, "is_required", data.checked)}
                                    />
                                    <Checkbox
                                        label={t("templates.needsWatermark")}
                                        checked={item.needs_watermark || false}
                                        onChange={(_, data) => handleUpdateItem(item.item_id!, "needs_watermark", data.checked)}
                                    />
                                    <Checkbox
                                        label={t("templates.allowMultiple")}
                                        checked={item.allows_multiple_files || false}
                                        onChange={(_, data) => handleUpdateItem(item.item_id!, "allows_multiple_files", data.checked)}
                                    />
                                </div>
                                {item.needs_watermark && (
                                    <Field
                                        label={
                                            <InfoLabel info={t("templates.placeholdersInfo", { list: formatWatermarkPlaceholderList() })}>
                                                {t("templates.wmTemplate")}
                                            </InfoLabel>
                                        }
                                        style={{ marginTop: "12px" }}
                                    >
                                        <TokenAutocompleteInput
                                            value={item.watermark_template || ""}
                                            onChange={(next) => {
                                                setItems(prevItems =>
                                                    prevItems.map(i =>
                                                        i.item_id === item.item_id
                                                            ? { ...i, watermark_template: next }
                                                            : i
                                                    )
                                                );
                                            }}
                                            onBlur={(e) => handleUpdateItem(item.item_id!, "watermark_template", e.currentTarget.value)}
                                            placeholder={t("templates.wmTemplatePlaceholder")}
                                            style={{ width: "100%" }}
                                        />
                                    </Field>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Delete Item Confirmation Dialog */}
            <ConfirmDialog
                title="删除模板项目"
                message={deleteConfirmItem ? `确定要删除项目 "${deleteConfirmItem.name}"？此操作无法撤销。` : ""}
                confirmText="删除"
                cancelText="取消"
                onConfirm={handleDeleteItemConfirm}
                onCancel={() => setDeleteConfirmItem(null)}
                open={!!deleteConfirmItem}
                onOpenChange={(open) => !open && setDeleteConfirmItem(null)}
                destructive
            />
        </div>
    );
}
