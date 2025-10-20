import { Combobox, Field, Input, Option, ToggleButton, makeStyles, tokens } from "@fluentui/react-components";
import { TextBold24Regular, TextItalic24Regular, TextUnderline24Regular } from "@fluentui/react-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import type { WatermarkSettings } from "@common/types";
import ColorPickerPopover from "../Common/ColorPickerPopover";

const useStyles = makeStyles({
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "12px 16px",
    },
    controlFull: {
        gridColumn: "1 / -1",
    },
    toolbar: {
        display: "flex",
        columnGap: "4px",
        alignItems: "center",
    },
    previewWrap: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: tokens.colorNeutralBackground3,
        borderRadius: tokens.borderRadiusMedium,
        padding: "8px",
        marginTop: "8px",
    },
    canvas: {
        width: "100%",
        maxWidth: "480px",
        height: "auto",
        borderRadius: tokens.borderRadiusSmall,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        display: "block",
    },
});

export default function WatermarkSettingsPanel(props: {
    wm: WatermarkSettings;
    fonts: string[];
    onChange: (patch: Partial<WatermarkSettings>) => void;
}) {
    const { wm, fonts, onChange } = props;
    const styles = useStyles();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [previewText, setPreviewText] = useState<string>("Watermark Preview");
    const [fontQuery, setFontQuery] = useState<string>("");

    const fontOptions = useMemo(() => {
        const base = fontQuery ? fonts.filter((f) => f.toLowerCase().includes(fontQuery.toLowerCase())) : fonts;
        const fallback = ["Arial", "Helvetica", "Times New Roman", "Courier New"];
        const merged = (base.length > 0 ? base : fallback);
        return merged;
    }, [fonts, fontQuery]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const width = 480;
        const height = 320;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#f7f7f7";
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = "#e0e0e0";
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 24) {
            ctx.beginPath();
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, height);
            ctx.stroke();
        }
        for (let y = 0; y < height; y += 24) {
            ctx.beginPath();
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(width, y + 0.5);
            ctx.stroke();
        }

        const text = previewText || "Watermark Preview";
        const x = (Math.max(0, Math.min(100, wm.xPercent ?? 50)) / 100) * width;
        const y = (Math.max(0, Math.min(100, wm.yPercent ?? 50)) / 100) * height;
        const fontSize = wm.fontSize ?? 48;
        const fontFamily = wm.fontFamily || "Arial";
        const fontWeight = wm.bold ? "bold " : "";
        const fontItalic = wm.italic ? "italic " : "";

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(((wm.rotation ?? -45) * Math.PI) / 180);
        ctx.globalAlpha = wm.opacity ?? 0.3;
        ctx.fillStyle = wm.color || "#000000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `${fontItalic}${fontWeight}${fontSize}px ${fontFamily}`;
        ctx.fillText(text, 0, 0);
        if (wm.underline) {
            const metrics = ctx.measureText(text);
            const underlineY = (metrics.actualBoundingBoxDescent || 0) * 0.2 + 0;
            const widthPx = metrics.width;
            ctx.beginPath();
            ctx.moveTo(-widthPx / 2, underlineY);
            ctx.lineTo(widthPx / 2, underlineY);
            ctx.lineWidth = Math.max(1, Math.round(fontSize / 15));
            ctx.strokeStyle = wm.color || "#000000";
            ctx.stroke();
        }
        ctx.restore();
    }, [wm.fontFamily, wm.fontSize, wm.bold, wm.italic, wm.underline, wm.color, wm.opacity, wm.rotation, wm.xPercent, wm.yPercent, previewText]);

    return (
        <div>
            <div className={styles.grid}>
                <Field label="Preview Text" className={styles.controlFull}>
                    <Input value={previewText} onChange={(_, d) => setPreviewText(d.value)} placeholder="Type here to preview (not saved)" />
                </Field>

                <Field label="Font Family">
                    <Combobox
                        selectedOptions={[wm.fontFamily || "Arial"]}
                        defaultValue={wm.fontFamily || "Arial"}
                        onOptionSelect={(_e, d) => onChange({ fontFamily: d.optionValue || undefined })}
                        onInput={(ev) => setFontQuery((ev.currentTarget as HTMLInputElement).value.trim())}
                    >
                        {fontOptions.map((f) => (
                            <Option key={f} value={f}>{f}</Option>
                        ))}
                    </Combobox>
                </Field>

                <Field label="Font Size (px)">
                    <Input
                        type="number"
                        value={String(wm.fontSize ?? 48)}
                        onChange={(_, d) => onChange({ fontSize: Number(d.value || 0) })}
                        min={8}
                        step={1}
                    />
                </Field>

                <Field label="Text Style">
                    <div className={styles.toolbar}>
                        <ToggleButton appearance={wm.bold ? 'primary' : 'outline'} onClick={() => onChange({ bold: !wm.bold })} aria-label="Bold">
                            <TextBold24Regular />
                        </ToggleButton>
                        <ToggleButton appearance={wm.italic ? 'primary' : 'outline'} onClick={() => onChange({ italic: !wm.italic })} aria-label="Italic">
                            <TextItalic24Regular />
                        </ToggleButton>
                        <ToggleButton appearance={wm.underline ? 'primary' : 'outline'} onClick={() => onChange({ underline: !wm.underline })} aria-label="Underline">
                            <TextUnderline24Regular />
                        </ToggleButton>
                    </div>
                </Field>

                <Field label="Color">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 4, border: `1px solid ${tokens.colorNeutralStroke1}`, background: wm.color || "#000000" }} />
                        <ColorPickerPopover
                            colorHex={wm.color || "#000000"}
                            opacity={wm.opacity ?? 1}
                            onConfirm={(hex, alpha) => onChange({ color: hex, opacity: alpha })}
                        />
                    </div>
                </Field>

                <Field label="Rotation (deg)">
                    <Input type="number" value={String(wm.rotation ?? -45)} onChange={(_, d) => onChange({ rotation: Number(d.value || 0) })} min={-180} max={180} step={1} />
                </Field>

                <Field label="X Position (%)">
                    <Input type="number" value={String(wm.xPercent ?? 50)} onChange={(_, d) => onChange({ xPercent: Number(d.value || 0) })} min={0} max={100} />
                </Field>

                <Field label="Y Position (%)">
                    <Input type="number" value={String(wm.yPercent ?? 50)} onChange={(_, d) => onChange({ yPercent: Number(d.value || 0) })} min={0} max={100} />
                </Field>
            </div>

            <div className={styles.previewWrap}>
                <canvas ref={canvasRef} className={styles.canvas} />
            </div>
        </div>
    );
}


