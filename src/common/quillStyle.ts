import {
  QUILL_CN_FONT_SIZES,
  QUILL_NUMERIC_FONT_SIZES,
  QUILL_DEFAULT_FONT_FAMILY,
  QUILL_DEFAULT_FONT_SIZE_PX,
} from './constants';

export const DEFAULT_FONT_FAMILIES: string[] = [
  'Arial',
  'Times New Roman',
  'Courier New',
  'Calibri',
  'Microsoft YaHei',
  'SimSun',
  'SimHei',
  'PingFang SC',
  'Songti SC',
  'Helvetica',
  'Georgia',
  'Tahoma',
  'Verdana',
];

export function fontNameToKey(name: string): string {
  return name.replace(/\s+/g, '-');
}

export function getFontKeysAndCss(fontNames: string[], opts?: { includePickerLabels?: boolean }): {
  keys: string[];
  css: string;
} {
  const includePickerLabels = !!opts?.includePickerLabels;
  const keys = fontNames.map(fontNameToKey);
  const css: string[] = [];
  for (let i = 0; i < fontNames.length; i++) {
    const name = fontNames[i];
    const key = keys[i];
    css.push(`.ql-font-${key}{font-family:${JSON.stringify(name)}}`);
    if (includePickerLabels) {
      css.push(
        `.ql-snow .ql-picker.ql-font .ql-picker-label[data-value="${key}"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="${key}"]::before{content:${JSON.stringify(
          name,
        )};font-family:${JSON.stringify(name)}}`,
      );
    }
  }
  return { keys, css: css.join('\n') };
}

export function getSizeTokensAndCss(opts?: { includePickerLabels?: boolean }): {
  tokens: string[];
  pxToToken: Record<string, string>;
  css: string;
} {
  const includePickerLabels = !!opts?.includePickerLabels;
  const cnEntries = QUILL_CN_FONT_SIZES.map((s, idx) => ({ token: `cn-${idx}`, px: s.value, label: s.label }));
  const numEntries = (QUILL_NUMERIC_FONT_SIZES as readonly string[]).map((v) => ({
    token: `n-${v.replace('.', '_')}`,
    px: v,
    label: v.replace('px', ''),
  }));
  const all = [...cnEntries, ...numEntries];
  const tokens = all.map((e) => e.token);
  const pxToToken: Record<string, string> = {};
  for (const e of all) pxToToken[e.px] = e.token;

  const css: string[] = [];
  for (const e of all) {
    css.push(`.ql-size-${e.token}{font-size:${e.px}}`);
    if (includePickerLabels) {
      css.push(
        `.ql-snow .ql-picker.ql-size .ql-picker-label[data-value="${e.token}"]::before, .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="${e.token}"]::before{content:${JSON.stringify(
          e.label,
        )}}`,
      );
    }
  }
  return { tokens, pxToToken, css: css.join('\n') };
}

export function buildRuntimeCssForHtmlRender(fontNames?: string[], opts?: { noFontFallback?: boolean }): string {
  const names = fontNames && fontNames.length ? fontNames : (opts?.noFontFallback ? [] : DEFAULT_FONT_FAMILIES);
  const fontCss = names.length ? getFontKeysAndCss(names, { includePickerLabels: false }).css : '';
  const sizeCss = getSizeTokensAndCss({ includePickerLabels: false }).css;

  const base: string[] = [];
  base.push(
    `body{font-family:${JSON.stringify(QUILL_DEFAULT_FONT_FAMILY)};font-size:${QUILL_DEFAULT_FONT_SIZE_PX};padding:16px;}`,
  );
  base.push(`.ql-align-center{text-align:center}`);
  base.push(`.ql-align-right{text-align:right}`);
  base.push(`.ql-align-justify{text-align:justify}`);

  return [...base, sizeCss, fontCss].filter(Boolean).join('\n');
}
