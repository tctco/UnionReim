export type WatermarkPlaceholder = {
  token: string;
  label: string;
  description: string;
};

export const WATERMARK_PLACEHOLDERS: readonly WatermarkPlaceholder[] = [
  { token: "{userName}", label: "User Name", description: "Project creator name" },
  { token: "{itemName}", label: "Item Name", description: "Template item name" },
  { token: "{projectName}", label: "Project Name", description: "Project name" },
  { token: "{date}", label: "Date", description: "Current date (locale)" },
] as const;

export function formatWatermarkPlaceholderList(): string {
  return WATERMARK_PLACEHOLDERS.map(p => p.token).join(", ");
}

export function resolveWatermarkTemplate(
  template: string,
  ctx: Record<string, string | number | boolean | undefined>,
): string {
  let text = template;
  for (const [key, value] of Object.entries(ctx)) {
    if (value === undefined) continue;
    const token = new RegExp(`\\{${key}\\}`, "g");
    text = text.replace(token, String(value));
  }
  return text;
}
