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
  textMode: 'template',
  fontFamily: 'Arial',
  fontSize: 48,
  bold: false,
  italic: false,
  underline: false,
  color: '#000000',
  opacity: 0.3,
  rotation: -45,
  xPercent: 50,
  yPercent: 50,
};

// Extensions supported by the current image watermark implementation
export const WATERMARK_IMAGE_EXTS = ["jpg", "jpeg", "png"] as const;

// Hover preview default sizes (used when app settings are absent)
export const DEFAULT_HOVER_PREVIEW_EDITOR = { width: 360, height: 240 } as const;
export const DEFAULT_HOVER_PREVIEW_PREVIEW = { width: 400, height: 400 } as const;

