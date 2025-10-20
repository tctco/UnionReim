import { Field, Input } from "@fluentui/react-components";

export default function UserSettingsPanel(props: {
    defaultUserName?: string;
    onChange: (name: string) => void;
}) {
    const { defaultUserName, onChange } = props;
    return (
        <Field>
            <Input
                id="defaultUserName"
                value={defaultUserName || ""}
                onChange={(_, data) => onChange(data.value)}
                placeholder="输入默认用户名"
            />
        </Field>
    );
}


