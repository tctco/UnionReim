import { Combobox, Field, Input, Option, ToggleButton, makeStyles, tokens, Textarea } from "@fluentui/react-components";
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
    // Optional: preview target image url (reimbursement protocol or http) for contextual preview
    previewImageSrc?: string;
    // Optional controlled preview text (fallbacks to internal state if undefined)
    previewText?: string;
    onPreviewTextChange?: (text: string) => void;
}) {
    const { wm, fonts, onChange, previewImageSrc, previewText: previewTextControlled, onPreviewTextChange } = props;
    const styles = useStyles();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [previewTextUncontrolled, setPreviewTextUncontrolled] = useState<string>("Watermark Preview");
    const [fontQuery, setFontQuery] = useState<string>("");
    const imgRef = useRef<HTMLImageElement | null>(null);
    const [imgLoadedTick, setImgLoadedTick] = useState<number>(0);

    const fontOptions = useMemo(() => {
        const base = fontQuery ? fonts.filter((f) => f.toLowerCase().includes(fontQuery.toLowerCase())) : fonts;
        const fallback = ["Arial", "Helvetica", "Times New Roman", "Courier New"];
        const merged = (base.length > 0 ? base : fallback);
        return merged;
    }, [fonts, fontQuery]);

    useEffect(() => {
        if (!previewImageSrc) {
            imgRef.current = null;
            return;
        }
        const img = new Image();
        img.onload = () => {
            imgRef.current = img;
            // trigger a redraw
            setImgLoadedTick((v) => v + 1);
        };
        img.onerror = () => {
            imgRef.current = null;
        };
        img.src = previewImageSrc;
        return () => {
            // allow GC
            imgRef.current = null;
        };
    }, [previewImageSrc]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const bgImg = imgRef.current;
        let width = 480;
        let height = 320;
        if (bgImg && bgImg.naturalWidth > 0 && bgImg.naturalHeight > 0) {
            // Use original image dimensions to match real watermark proportions
            width = bgImg.naturalWidth;
            height = bgImg.naturalHeight;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, width, height);

        if (bgImg && bgImg.naturalWidth > 0 && bgImg.naturalHeight > 0) {
            // Draw original image at 1:1; CSS scales the canvas for display
            ctx.drawImage(bgImg, 0, 0, width, height);
        } else {
            // Neutral background grid fallback
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
        }

        // Draw watermark exactly as main service does (percent + px font in image space)
        const text = (previewTextControlled ?? previewTextUncontrolled) || "Watermark Preview";
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
        const lines = String(text).split(/\r?\n/);
        const lineHeight = Math.max(1, Math.round(fontSize * 1.2));
        const startY = -((lines.length - 1) * lineHeight) / 2;
        for (let i = 0; i < lines.length; i++) {
            const ly = startY + i * lineHeight;
            const line = lines[i];
            ctx.fillText(line, 0, ly);
            if (wm.underline) {
                const metrics = ctx.measureText(line);
                const underlineY = ly + (metrics.actualBoundingBoxDescent || 0) * 0.2;
                const widthPx = metrics.width;
                ctx.beginPath();
                ctx.moveTo(-widthPx / 2, underlineY);
                ctx.lineTo(widthPx / 2, underlineY);
                ctx.lineWidth = Math.max(1, Math.round(fontSize / 15));
                ctx.strokeStyle = wm.color || "#000000";
                ctx.stroke();
            }
        }
        ctx.restore();
    }, [wm.fontFamily, wm.fontSize, wm.bold, wm.italic, wm.underline, wm.color, wm.opacity, wm.rotation, wm.xPercent, wm.yPercent, previewTextControlled, previewTextUncontrolled, previewImageSrc, imgLoadedTick]);

    return (
        <div>
            <div className={styles.grid}>
                <Field label="Preview Text" className={styles.controlFull}>
                    <Textarea
                        value={previewTextControlled ?? previewTextUncontrolled}
                        onChange={(_, d) => {
                            if (onPreviewTextChange) onPreviewTextChange(d.value);
                            else setPreviewTextUncontrolled(d.value);
                        }}
                        resize="vertical"
                        placeholder="Type watermark text here (multi-line supported)"
                    />
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


