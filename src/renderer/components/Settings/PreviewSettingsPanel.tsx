import { Field, Input } from "@fluentui/react-components";

export default function PreviewSettingsPanel(props: {
    width?: number;
    height?: number;
    onChange: (patch: { width?: number; height?: number }) => void;
}) {
    const { width = 400, height = 240, onChange } = props;
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px 16px' }}>
            <Field label="预览宽度（px）">
                <Input type="number" value={String(width)} onChange={(_, d) => onChange({ width: Number(d.value || 0) })} min={120} step={10} />
            </Field>
            <Field label="预览高度（px）">
                <Input type="number" value={String(height)} onChange={(_, d) => onChange({ height: Number(d.value || 0) })} min={80} step={10} />
            </Field>
        </div>
    );
}


