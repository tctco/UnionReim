import { Button, Field, Input } from "@fluentui/react-components";

export default function UserSettingsPanel(props: {
    defaultUserName?: string;
    studentId?: string;
    signatureImagePath?: string;
    onChange: (patch: { defaultUserName?: string; studentId?: string; signatureImagePath?: string }) => void;
}) {
    const { defaultUserName, studentId, signatureImagePath, onChange } = props;
    const pickSignature = async () => {
        const res = await window.ContextBridge.system.selectDirectory();
        // Above API is directory; fallback to manual path paste for now
        // If directory chooser was opened, we won't use it here. Keep simple input.
    };
    return (
        <div style={{ display: 'grid', gap: 12 }}>
            <Field label="默认用户名">
                <Input
                    id="defaultUserName"
                    value={defaultUserName || ""}
                    onChange={(_, data) => onChange({ defaultUserName: data.value })}
                    placeholder="输入默认用户名"
                />
            </Field>
            <Field label="学号">
                <Input
                    id="studentId"
                    value={studentId || ""}
                    onChange={(_, data) => onChange({ studentId: data.value })}
                    placeholder="输入学号"
                />
            </Field>
            <Field label="电子签名图片路径">
                <Input
                    id="signatureImagePath"
                    value={signatureImagePath || ""}
                    onChange={(_, data) => onChange({ signatureImagePath: data.value })}
                    placeholder="输入本地图片绝对路径，例如 C:\\Users\\me\\sign.png"
                />
            </Field>
        </div>
    );
}


