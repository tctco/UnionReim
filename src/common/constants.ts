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
    { value: "56px", label: "初号" },
    { value: "48px", label: "小初" },
    { value: "35px", label: "一号" },
    { value: "32px", label: "小一" },
    { value: "29px", label: "二号" },
    { value: "24px", label: "小二" },
    { value: "21px", label: "三号" },
    { value: "20px", label: "小三" },
    { value: "19px", label: "四号" },
    { value: "16px", label: "小四" },
    { value: "14px", label: "五号" },
    { value: "12px", label: "小五" },
    { value: "10px", label: "六号" },
    { value: "9px", label: "小六" },
    { value: "8px", label: "七号" },
    { value: "7px", label: "八号" },
];

// Specific numeric sizes (non-linear progression)
export const QUILL_NUMERIC_FONT_SIZES = [
    '5px', '5.5px', '6.5px', '7.5px',
    '8px', '9px', '10px', '10.5px', '11px', '12px',
    '14px', '16px', '18px', '20px', '22px', '24px', '26px', '28px',
    '36px', '48px', '72px',
] as const;

// Quill editor defaults
export const QUILL_DEFAULT_FONT_FAMILY = 'Arial';
export const QUILL_DEFAULT_FONT_SIZE_PX = '14px';
