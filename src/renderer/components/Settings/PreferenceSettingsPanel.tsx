import { WATERMARK_IMAGE_EXTS } from "@common/constants";
import { Button, Field, InfoLabel, Input, Switch } from "@fluentui/react-components";
import { Folder24Regular } from "@fluentui/react-icons";
import { useI18n } from "../../i18n";

export default function PreferenceSettingsPanel(props: {
    defaultStoragePath?: string;
    autoWatermarkImages?: boolean;
    onChange: (patch: { defaultStoragePath?: string; autoWatermarkImages?: boolean }) => void;
}) {
    const { defaultStoragePath, autoWatermarkImages = false, onChange } = props;
    const { t } = useI18n();

    const handleBrowse = async () => {
        try {
            const res = await window.ContextBridge.system.selectDirectory();
            if (res.success && res.data) {
                onChange({ defaultStoragePath: res.data });
            }
        } catch (e) {
            console.error("Failed to browse for directory", e);
        }
    };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <Field label={t("preferences.storageRootLabel")}>
                <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
                    <Input
                        id="defaultStoragePath"
                        value={defaultStoragePath || ""}
                        readOnly
                        title={defaultStoragePath || ""}
                        style={{ flex: 1, minWidth: 520 }}
                    />
                    <Button appearance="outline" onClick={handleBrowse} icon={<Folder24Regular />}>
                        {t("common.browse")}
                    </Button>
                </div>
            </Field>

            <Field
                label={
                    <InfoLabel
                        info={t("preferences.autoWatermarkHelp", {
                            exts: (WATERMARK_IMAGE_EXTS as unknown as string[]).join(", "),
                        })}
                    >
                        {t("preferences.autoWatermarkLabel")}
                    </InfoLabel>
                }
            >
                <Switch
                    checked={!!autoWatermarkImages}
                    onChange={(_, data) => onChange({ autoWatermarkImages: !!data.checked })}
                />
            </Field>
        </div>
    );
}
