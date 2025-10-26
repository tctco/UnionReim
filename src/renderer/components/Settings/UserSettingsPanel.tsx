import { Field, Input } from "@fluentui/react-components";
import { useI18n } from "../../i18n";

export default function UserSettingsPanel(props: {
    defaultUserName?: string;
    studentId?: string;
    signatureImagePath?: string;
    onChange: (patch: { defaultUserName?: string; studentId?: string; signatureImagePath?: string }) => void;
}) {
    const { defaultUserName, studentId, signatureImagePath, onChange } = props;
    const { t } = useI18n();
    return (
        <div style={{ display: 'grid', gap: 12 }}>
            <Field label={t("user.defaultUserNameLabel")}>
                <Input
                    id="defaultUserName"
                    value={defaultUserName || ""}
                    onChange={(_, data) => onChange({ defaultUserName: data.value })}
                    placeholder={t("user.defaultUserNamePlaceholder")}
                />
            </Field>
            <Field label={t("user.studentIdLabel")}>
                <Input
                    id="studentId"
                    value={studentId || ""}
                    onChange={(_, data) => onChange({ studentId: data.value })}
                    placeholder={t("user.studentIdPlaceholder")}
                />
            </Field>
            <Field label={t("user.signaturePathLabel")}>
                <Input
                    id="signatureImagePath"
                    value={signatureImagePath || ""}
                    onChange={(_, data) => onChange({ signatureImagePath: data.value })}
                    placeholder={t("user.signaturePathPlaceholder")}
                />
            </Field>
        </div>
    );
}


