import { Combobox, Option } from "@fluentui/react-components";
import { WeatherMoon24Regular, WeatherSunny24Regular } from "@fluentui/react-icons";

type Theme = "light" | "dark" | "system";

const themeOptions = {
    system: {
        label: "Follow System",
        icon: <></>,
    },
    light: {
        label: "Light",
        icon: <WeatherSunny24Regular />,
    },
    dark: {
        label: "Dark",
        icon: <WeatherMoon24Regular />,
    },
};

export default function AppearanceSettingsPanel(props: { theme?: Theme; onChange: (theme: Theme) => void }) {
    const { theme = "system", onChange } = props;
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
