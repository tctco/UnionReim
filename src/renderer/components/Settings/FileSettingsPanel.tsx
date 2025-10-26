import { Button, Field, Input } from "@fluentui/react-components";
import { Folder24Regular } from "@fluentui/react-icons";
import { useI18n } from "../../i18n";

export default function FileSettingsPanel(props: { defaultStoragePath?: string; onChange: (path: string) => void }) {
    const { defaultStoragePath, onChange } = props;
    const { t } = useI18n();

    const handleBrowse = async () => {
        try {
            const res = await window.ContextBridge.system.selectDirectory();
            if (res.success && res.data) {
                onChange(res.data);
            }
        } catch (e) {
            console.error("Failed to browse for directory", e);
        }
    };

    return (
        <Field>
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
    );
}
