import type { WatermarkSettings } from "./types";

/**
 * Global constants shared across main and renderer.
 * Keep values minimal and focused on app-wide configuration.
 */

// Attachment handling
export const ALLOWED_ATTACHMENT_EXTS = ["png", "jpg", "jpeg", "pdf", "ofd"] as const;
export const ALLOWED_ATTACHMENT_EXTS_SET = new Set<string>(ALLOWED_ATTACHMENT_EXTS as unknown as string[]);

export function getExtLower(name: string): string {
    return (name.split(".").pop() || "").toLowerCase();
}

export function isAllowedAttachmentName(name: string): boolean {
    return ALLOWED_ATTACHMENT_EXTS_SET.has(getExtLower(name));
}

// Watermark defaults
export const DEFAULT_WATERMARK_SETTINGS: WatermarkSettings = {
    textMode: "template",
    fontFamily: "Arial",
    fontSize: 96,
    bold: false,
    italic: false,
    underline: false,
    color: "#000000",
    opacity: 0.3,
    rotation: -45,
    xPercent: 50,
    yPercent: 50,
};

// Extensions supported by the current image watermark implementation
export const WATERMARK_IMAGE_EXTS = ["jpg", "jpeg", "png"] as const;

// Hover preview default sizes (used when app settings are absent)
export const DEFAULT_HOVER_PREVIEW = { width: 360, height: 240 } as const;

// Quill editor: CN font-size labels and numeric font-size values
export const QUILL_CN_FONT_SIZES = [
    { value: "56pt", label: "初号" },
    { value: "48pt", label: "小初" },
    { value: "35pt", label: "一号" },
    { value: "32pt", label: "小一" },
    { value: "29pt", label: "二号" },
    { value: "24pt", label: "小二" },
    { value: "21pt", label: "三号" },
    { value: "20pt", label: "小三" },
    { value: "19pt", label: "四号" },
    { value: "16pt", label: "小四" },
    { value: "14pt", label: "五号" },
    { value: "12pt", label: "小五" },
    { value: "10pt", label: "六号" },
    { value: "9pt", label: "小六" },
    { value: "8pt", label: "七号" },
    { value: "7pt", label: "八号" },
];

// Specific numeric sizes (non-linear progression)
export const QUILL_NUMERIC_FONT_SIZES = [
    '5pt', '5.5pt', '6.5pt', '7.5pt',
    '8pt', '9pt', '10pt', '10.5pt', '11pt', '12pt',
    '14pt', '16pt', '18pt', '20pt', '22pt', '24pt', '26pt', '28pt',
    '36pt', '48pt', '72pt',
] as const;

// Quill editor defaults
export const QUILL_DEFAULT_FONT_FAMILY = 'Arial';
export const QUILL_DEFAULT_FONT_SIZE_PT = '14pt';

export const A4_WIDTH_PT = 595.28; // 210mm at 72 DPI
export const A4_HEIGHT_PT = 841.89; // 297mm at 72 DPI

// Signature image defaults
export const DEFAULT_SIGNATURE_IMAGE_HEIGHT_CM = 1.7; // default signature height for PDF embedding