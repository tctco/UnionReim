import { Combobox, Option } from "@fluentui/react-components";
import { WeatherMoon24Regular, WeatherSunny24Regular } from "@fluentui/react-icons";
import { useI18n } from "../../i18n";

type Theme = "light" | "dark" | "system";

export default function AppearanceSettingsPanel(props: { theme?: Theme; onChange: (theme: Theme) => void }) {
    const { t } = useI18n();
    const { theme = "system", onChange } = props;
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
        <Combobox
            placeholder={themeOption.label}
            selectedOptions={[theme]}
            onOptionSelect={(_, d) => onChange((d.optionValue as Theme) || "system")}
        >
            {Object.entries(themeOptions).map(([value, option]) => (
                <Option key={value} value={value} text={option.label}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>{option.icon} {option.label}</span>
                </Option>
            ))}
        </Combobox>
    );
}
