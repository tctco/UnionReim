import { Combobox, Option } from "@fluentui/react-components";
import { useI18n } from "../../i18n";

type Locale = "en" | "zh";

export default function LanguageSettingsPanel(props: { language?: Locale; onChange: (lang: Locale) => void }) {
  const { t, setLocale } = useI18n();
  const { language = "en", onChange } = props;

  const options: Array<{ value: Locale; label: string }> = [
    { value: "en", label: t("language.en") },
    { value: "zh", label: t("language.zh") },
  ];

  const current = options.find(o => o.value === language) || options[0];

  return (
    <Combobox
      placeholder={current.label || t("language.placeholder")}
      selectedOptions={[language]}
      onOptionSelect={(_, d) => {
        const value = (d.optionValue as Locale) || "en";
        // Update form state for persistence and switch locale immediately
        onChange(value);
        setLocale(value);
      }}
    >
      {options.map(o => (
        <Option key={o.value} value={o.value} text={o.label}>{o.label}</Option>
      ))}
    </Combobox>
  );
}
