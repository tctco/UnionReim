import { Button, Popover, PopoverSurface, PopoverTrigger, ColorPicker, ColorArea, ColorSlider, AlphaSlider, tokens } from "@fluentui/react-components";
import { useEffect, useState } from "react";

interface HsvColor { h: number; s: number; v: number; a?: number }

export function ColorPickerPopover(props: {
    colorHex: string;
    opacity?: number;
    buttonText?: string;
    onConfirm: (hex: string, alpha: number) => void;
}) {
    const { colorHex, opacity = 1, buttonText = "Choose color", onConfirm } = props;
    const [open, setOpen] = useState(false);
    const [preview, setPreview] = useState<HsvColor>({ h: 0, s: 0, v: 0, a: opacity });

    useEffect(() => {
        const base = colorHex && /^#?[0-9a-fA-F]{6,8}$/.test(colorHex) ? colorHex : "#000000";
        const { r, g, b } = hexToRgb(base.startsWith("#") ? base : `#${base}`);
        setPreview(rgbToHsv(r, g, b, opacity));
    }, [colorHex, opacity]);

    const confirm = () => {
        const { hex, alpha } = hsvToHexAlpha(preview);
        onConfirm(hex, alpha);
        setOpen(false);
    };

    return (
        <Popover open={open} trapFocus onOpenChange={(_e, d) => setOpen(!!d.open)}>
            <PopoverTrigger disableButtonEnhancement>
                <Button>{buttonText}</Button>
            </PopoverTrigger>
            <PopoverSurface>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <ColorPicker color={preview} onColorChange={(_e, d) => setPreview(d.color)}>
                        <ColorArea inputX={{ "aria-label": "Saturation" }} inputY={{ "aria-label": "Brightness" }} />
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <div style={{ width: 180 }}>
                                <ColorSlider aria-label="Hue" />
                                <AlphaSlider aria-label="Alpha" />
                            </div>
                            <div style={{ width: 24, height: 24, borderRadius: 4, border: `1px solid ${tokens.colorNeutralStroke1}`, background: hsvToRgbaString(preview) }} />
                        </div>
                    </ColorPicker>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <Button appearance="primary" onClick={confirm}>Ok</Button>
                        <Button onClick={() => setOpen(false)}>Cancel</Button>
                    </div>
                </div>
            </PopoverSurface>
        </Popover>
    );
}

// Helpers
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return { r, g, b };
}

function rgbToHsv(r: number, g: number, b: number, a: number = 1): HsvColor {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
        switch (max) {
            case rn: h = ((gn - bn) / d) % 6; break;
            case gn: h = (bn - rn) / d + 2; break;
            default: h = (rn - gn) / d + 4; break;
        }
        h *= 60;
        if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : d / max;
    const v = max;
    return { h, s, v, a };
}

function hsvToRgbaString(c: HsvColor): string {
    const { h, s, v, a = 1 } = c;
    const C = v * s;
    const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - C;
    let rp = 0, gp = 0, bp = 0;
    if (h >= 0 && h < 60) { rp = C; gp = X; bp = 0; }
    else if (h < 120) { rp = X; gp = C; bp = 0; }
    else if (h < 180) { rp = 0; gp = C; bp = X; }
    else if (h < 240) { rp = 0; gp = X; bp = C; }
    else if (h < 300) { rp = X; gp = 0; bp = C; }
    else { rp = C; gp = 0; bp = X; }
    const r = Math.round((rp + m) * 255);
    const g = Math.round((gp + m) * 255);
    const b = Math.round((bp + m) * 255);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function hsvToHexAlpha(c: HsvColor): { hex: string; alpha: number } {
    const rgba = hsvToRgbaString(c);
    const match = rgba.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9]*\.?[0-9]+)\)$/);
    if (!match) return { hex: '#000000', alpha: 1 };
    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    const a = parseFloat(match[4]);
    const to2 = (n: number) => n.toString(16).padStart(2, '0');
    return { hex: `#${to2(r)}${to2(g)}${to2(b)}`, alpha: a };
}

export default ColorPickerPopover;

