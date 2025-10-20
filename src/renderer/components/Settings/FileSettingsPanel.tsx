import { Button, Field, Input } from "@fluentui/react-components";
import { Folder24Regular } from "@fluentui/react-icons";

export default function FileSettingsPanel(props: {
    defaultStoragePath?: string;
    onChange: (path: string) => void;
    onBrowse: () => void;
}) {
    const { defaultStoragePath, onChange, onBrowse } = props;
    return (
        <Field>
            <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
                <Input
                    id="defaultStoragePath"
                    value={defaultStoragePath || ""}
                    onChange={(_, data) => onChange(data.value)}
                    placeholder="输入默认文件存储路径"
                />
                <Button appearance="outline" onClick={onBrowse} icon={<Folder24Regular />}>浏览</Button>
            </div>
        </Field>
    );
}


