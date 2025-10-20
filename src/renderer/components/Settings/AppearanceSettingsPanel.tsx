import { Combobox, Option } from "@fluentui/react-components";
import { WeatherSunny24Regular, WeatherMoon24Regular } from "@fluentui/react-icons";

type Theme = 'light' | 'dark' | 'system';

export default function AppearanceSettingsPanel(props: {
    theme?: Theme;
    onChange: (theme: Theme) => void;
}) {
    const { theme = 'system', onChange } = props;
    return (
        <Combobox selectedOptions={[theme]} onOptionSelect={(_, d) => onChange((d.optionValue as Theme) || 'system')}>
            <Option value="system" text="System">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <WeatherSunny24Regular />/<WeatherMoon24Regular /> System
                </span>
            </Option>
            <Option value="light" text="Light">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <WeatherSunny24Regular /> Light
                </span>
            </Option>
            <Option value="dark" text="Dark">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <WeatherMoon24Regular /> Dark
                </span>
            </Option>
        </Combobox>
    );
}


