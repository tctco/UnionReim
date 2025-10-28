import { Combobox, Option, Field, Input, InfoLabel } from "@fluentui/react-components";
import { WeatherMoon24Regular, WeatherSunny24Regular } from "@fluentui/react-icons";
import { useI18n } from "../../i18n";

type Theme = "light" | "dark" | "system";
type PreviewSizePatch = { width?: number; height?: number };

export default function AppearanceSettingsPanel(props: {
    theme?: Theme;
    previewWidth?: number;
    previewHeight?: number;
    onThemeChange: (theme: Theme) => void;
    onPreviewChange: (patch: PreviewSizePatch) => void;
}) {
    const { t } = useI18n();
    const { theme = "system", previewWidth = 400, previewHeight = 240, onThemeChange, onPreviewChange } = props;
    const themeOptions = {
        system: {
            label: t("appearance.followSystem"),
            icon: <></>,
        },
        light: {
            label: t("appearance.light"),
            icon: <WeatherSunny24Regular />,
        },
        dark: {
            label: t("appearance.dark"),
            icon: <WeatherMoon24Regular />,
        },
    } as const;

    const themeOption = themeOptions[theme];
    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px 16px" }}>
            <Field label={t("appearance.themePlaceholder")}> 
                <Combobox
                    placeholder={themeOption.label}
                    selectedOptions={[theme]}
                    onOptionSelect={(_, d) => onThemeChange((d.optionValue as Theme) || "system")}
                >
                    {Object.entries(themeOptions).map(([value, option]) => (
                        <Option key={value} value={value} text={option.label}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>{option.icon} {option.label}</span>
                        </Option>
                    ))}
                </Combobox>
            </Field>
            <Field label={<InfoLabel info={t("previewSettings.sizeHelp")}>{t("previewSettings.widthLabel")}</InfoLabel>}>
                <Input
                    type="number"
                    value={String(previewWidth)}
                    onChange={(_, d) => onPreviewChange({ width: Number(d.value || 0) })}
                    min={120}
                    step={10}
                />
            </Field>
            <Field label={t("previewSettings.heightLabel")}>
                <Input
                    type="number"
                    value={String(previewHeight)}
                    onChange={(_, d) => onPreviewChange({ height: Number(d.value || 0) })}
                    min={80}
                    step={10}
                />
            </Field>
        </div>
    );
}
