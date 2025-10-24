import type { WatermarkSettings } from "@common/types";
import { DEFAULT_WATERMARK_SETTINGS } from "@common/constants";
import {
    Button,
    Combobox,
    Field,
    Input,
    Option,
    Textarea,
    ToggleButton,
    Tooltip,
    makeStyles,
    tokens,
} from "@fluentui/react-components";
import { TextBold24Regular, TextItalic24Regular, TextUnderline24Regular } from "@fluentui/react-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import ColorPickerPopover from "../Common/ColorPickerPopover";

const useStyles = makeStyles({
    flex: {
        display: "flex",
        flexDirection: "row",
        gap: "8px",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    inlineFields: {
        display: "flex",
        alignItems: "end",
        gap: "12px",
        flexWrap: "nowrap",
        overflowX: "auto",
        paddingBottom: "4px",
    },
    toolbar: {
        display: "flex",
        columnGap: "4px",
        alignItems: "center",
    },
    iconToggle: {
        height: "28px",
        minWidth: "28px",
        padding: "2px",
    },
    compactField: {
        justifySelf: "start",
        width: "110px",
    },
    smallInput: {
        width: "70px",
    },
    group: {
        gridColumn: "1 / -1",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
    },
    groupRow: {
        display: "contents",
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
    const imgRef = useRef<HTMLImageElement | null>(null);
    const [imgLoadedTick, setImgLoadedTick] = useState<number>(0);

    // Build options: always include current font so UI is usable even if fonts is empty
    const fontOptions = useMemo(() => {
        const current = wm.fontFamily || DEFAULT_WATERMARK_SETTINGS.fontFamily;
        let merged = fonts;
        if (current && !merged.includes(current)) {
            merged = [current, ...merged];
        }
        const seen = new Set<string>();
        return merged.filter((f) => (seen.has(f) ? false : (seen.add(f), true)));
    }, [fonts, wm.fontFamily]);

    useEffect(() => {
        if (!previewImageSrc) {
            imgRef.current = null;
            return;
        }
        const img = new Image();
        img.onload = () => {
            imgRef.current = img;
            setImgLoadedTick((v) => v + 1);
        };
        img.onerror = () => {
            imgRef.current = null;
        };
        img.src = previewImageSrc;
        return () => {
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
            width = bgImg.naturalWidth;
            height = bgImg.naturalHeight;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Clear background
        ctx.clearRect(0, 0, width, height);

        if (bgImg && bgImg.naturalWidth > 0 && bgImg.naturalHeight > 0) {
            ctx.drawImage(bgImg, 0, 0, width, height);
        } else {
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

        const text = (previewTextControlled ?? previewTextUncontrolled) || "Watermark Preview";
        const x = (Math.max(0, Math.min(100, wm.xPercent ?? DEFAULT_WATERMARK_SETTINGS.xPercent!)) / 100) * width;
        const y = (Math.max(0, Math.min(100, wm.yPercent ?? DEFAULT_WATERMARK_SETTINGS.yPercent!)) / 100) * height;
        const fontSize = wm.fontSize ?? DEFAULT_WATERMARK_SETTINGS.fontSize!;
        const fontFamily = wm.fontFamily || DEFAULT_WATERMARK_SETTINGS.fontFamily!;
        const fontWeight = wm.bold ? "bold " : "";
        const fontItalic = wm.italic ? "italic " : "";

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(((wm.rotation ?? DEFAULT_WATERMARK_SETTINGS.rotation!) * Math.PI) / 180);
        ctx.globalAlpha = wm.opacity ?? DEFAULT_WATERMARK_SETTINGS.opacity!;
        ctx.fillStyle = wm.color || DEFAULT_WATERMARK_SETTINGS.color!;
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
                ctx.strokeStyle = wm.color || DEFAULT_WATERMARK_SETTINGS.color!;
                ctx.stroke();
            }
        }
        ctx.restore();
    }, [
        wm.fontFamily,
        wm.fontSize,
        wm.bold,
        wm.italic,
        wm.underline,
        wm.color,
        wm.opacity,
        wm.rotation,
        wm.xPercent,
        wm.yPercent,
        previewTextControlled,
        previewTextUncontrolled,
        previewImageSrc,
        imgLoadedTick,
    ]);

    return (
        <div className={styles.group}>
            <div className={styles.group}>
                <Tooltip content="Preview Text" relationship="label">
                    <Textarea
                        value={previewTextControlled ?? previewTextUncontrolled}
                        onChange={(_, d) => {
                            if (onPreviewTextChange) onPreviewTextChange(d.value);
                            else setPreviewTextUncontrolled(d.value);
                        }}
                        resize="vertical"
                        placeholder="Type watermark text here (multi-line supported)"
                    />
                </Tooltip>
            </div>
            <div className={styles.flex}>
                <Tooltip content="Font Family" relationship="label">
                    <Combobox
                        selectedOptions={[wm.fontFamily || DEFAULT_WATERMARK_SETTINGS.fontFamily!]}
                        onOptionSelect={(_e, d) => onChange({ fontFamily: d.optionValue || undefined })}
                    >
                        {fontOptions.map((f) => (
                            <Option key={f} value={f}>
                                {f}
                            </Option>
                        ))}
                    </Combobox>
                </Tooltip>

                <Tooltip content="Font Size (px)" relationship="label">
                    <Input
                        className={styles.smallInput}
                        type="number"
                        value={String(wm.fontSize ?? DEFAULT_WATERMARK_SETTINGS.fontSize!)}
                        onChange={(_, d) => onChange({ fontSize: Number(d.value || 0) })}
                        min={8}
                        step={1}
                    />
                </Tooltip>

                <div className={styles.toolbar}>
                    <Tooltip content="Bold" relationship="label">
                        <ToggleButton
                            className={styles.iconToggle}
                            appearance={wm.bold ? "primary" : "outline"}
                            onClick={() => onChange({ bold: !wm.bold })}
                            aria-label="Bold"
                        >
                            <TextBold24Regular style={{ width: 16, height: 16 }} />
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip content="Italic" relationship="label">
                        <ToggleButton
                            className={styles.iconToggle}
                            appearance={wm.italic ? "primary" : "outline"}
                            onClick={() => onChange({ italic: !wm.italic })}
                            aria-label="Italic"
                        >
                            <TextItalic24Regular style={{ width: 16, height: 16 }} />
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip content="Underline" relationship="label">
                        <ToggleButton
                            className={styles.iconToggle}
                            appearance={wm.underline ? "primary" : "outline"}
                            onClick={() => onChange({ underline: !wm.underline })}
                            aria-label="Underline"
                        >
                            <TextUnderline24Regular style={{ width: 16, height: 16 }} />
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip content="Color & Opacity" relationship="label">
                        <ColorPickerPopover
                            colorHex={wm.color || DEFAULT_WATERMARK_SETTINGS.color!}
                            opacity={wm.opacity ?? DEFAULT_WATERMARK_SETTINGS.opacity}
                            onConfirm={(hex, alpha) => onChange({ color: hex, opacity: alpha })}
                            trigger={
                                <Button className={styles.iconToggle} aria-label="Color and opacity">
                                    <div
                                        role="button"
                                        aria-label="Pick color"
                                        tabIndex={0}
                                        style={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: 4,
                                            cursor: "pointer",
                                            border: `1px solid ${tokens.colorNeutralStroke1}`,
                                            background: wm.color || DEFAULT_WATERMARK_SETTINGS.color!,
                                        }}
                                    />
                                </Button>
                            }
                        />
                    </Tooltip>
                </div>
                <div className={styles.groupRow}>
                    <Field className={styles.compactField}>
                        <Tooltip content="Rotation (deg)" relationship="label">
                            <Input
                                className={styles.smallInput}
                                type="number"
                                value={String(wm.rotation ?? DEFAULT_WATERMARK_SETTINGS.rotation!)}
                                onChange={(_, d) => onChange({ rotation: Number(d.value || 0) })}
                                min={-180}
                                max={180}
                                step={1}
                            />
                        </Tooltip>
                    </Field>

                    <Field className={styles.toolbar}>
                        <Tooltip content="X Position (%)" relationship="label">
                            <Input
                                className={styles.smallInput}
                                type="number"
                                value={String(wm.xPercent ?? DEFAULT_WATERMARK_SETTINGS.xPercent!)}
                                onChange={(_, d) => onChange({ xPercent: Number(d.value || 0) })}
                                min={0}
                                max={100}
                            />
                        </Tooltip>
                        <Tooltip content="Y Position (%)" relationship="label">
                            <Input
                                className={styles.smallInput}
                                type="number"
                                value={String(wm.yPercent ?? DEFAULT_WATERMARK_SETTINGS.yPercent!)}
                                onChange={(_, d) => onChange({ yPercent: Number(d.value || 0) })}
                                min={0}
                                max={100}
                            />
                        </Tooltip>
                    </Field>
                </div>
            </div>

            <div className={styles.previewWrap}>
                <canvas ref={canvasRef} className={styles.canvas} />
            </div>
        </div>
    );
}

