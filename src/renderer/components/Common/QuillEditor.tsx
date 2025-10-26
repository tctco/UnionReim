import { Spinner } from "@fluentui/react-components";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from "react";
import { QUILL_DEFAULT_FONT_FAMILY, QUILL_DEFAULT_FONT_SIZE_PX } from "../../../common/constants";
import { getFontKeysAndCss, getSizeTokensAndCss, DEFAULT_FONT_FAMILIES } from "../../../common/quillStyle";

type QuillEditorProps = {
    readOnly?: boolean;
    initialHtml?: string; // applied on first mount
    onHtmlChange?: (html: string) => void;
    placeholder?: string;
    minHeight?: number;
    showToolbar?: boolean; // whether to render toolbar
};

// Minimal Quill wrapper using HTML as the interchange format
const QuillEditor = forwardRef<Quill | null, QuillEditorProps>(
    ({ readOnly, initialHtml, onHtmlChange, placeholder, minHeight = 240, showToolbar = true }, ref) => {
        const containerRef = useRef<HTMLDivElement | null>(null);
        const initialHtmlRef = useRef(initialHtml);
        const onHtmlChangeRef = useRef(onHtmlChange);
        const localRef = useRef<Quill | null>(null);
        const [fontKeys, setFontKeys] = useState<string[] | null>(null);
        const [sizeKeys, setSizeKeys] = useState<string[] | null>(null);
        // Map css px value -> our registered size token (e.g. '14px' -> 'n-14px', '35px' -> 'cn-2')
        const sizePxToTokenRef = useRef<Record<string, string>>({});
        const styleTagRef = useRef<HTMLStyleElement | null>(null);

        useLayoutEffect(() => {
            onHtmlChangeRef.current = onHtmlChange;
        });

        useEffect(() => {initialHtmlRef.current = initialHtml}, [initialHtml])

        // Load local fonts and register a dynamic font whitelist
        useEffect(() => {
            let mounted = true;
            (async () => {
                try {
                    const res = await (window as any).ContextBridge?.fonts?.list?.();
                    const available: string[] =
                        res && res.success && Array.isArray(res.data) ? (res.data as string[]) : [];
                    const preferred = DEFAULT_FONT_FAMILIES;
                    const chosen: string[] = [];
                    for (const p of preferred) if (available.includes(p)) chosen.push(p);
                    const max = 999;
                    for (const f of available) {
                        if (chosen.length >= max) break;
                        if (!chosen.includes(f)) chosen.push(f);
                    }
                    if (chosen.length === 0) chosen.push("Arial", "Times New Roman", "Courier New");

                    const { keys, css } = getFontKeysAndCss(chosen, { includePickerLabels: true });
                    if (!styleTagRef.current) {
                        styleTagRef.current = document.createElement("style");
                        document.head.appendChild(styleTagRef.current);
                    }
                    styleTagRef.current.textContent = css;

                    try {
                        const Font = Quill.import("formats/font") as any;
                        Font.whitelist = keys;
                        Quill.register(Font, true);
                    } catch {}
                    if (mounted) setFontKeys(keys);
                } catch {
                    try {
                        const Font = Quill.import("formats/font") as any;
                        Font.whitelist = [];
                        Quill.register(Font, true);
                    } catch {}
                    if (mounted) setFontKeys([]);
                }
            })();
            return () => {
                mounted = false;
            };
        }, []);

        // Build size options with class-based tokens so CN and numeric sizes coexist
        useEffect(() => {
            const { tokens, pxToToken, css } = getSizeTokensAndCss({ includePickerLabels: true });

            // Register class attributor so tokens are emitted as classes and resolved by CSS
            try {
                const Size: any = Quill.import("attributors/class/size");
                Size.whitelist = tokens;
                Quill.register(Size, true);
            } catch {
                // Fallback: attempt to create a class attributor via Parchment (Quill v2 ships it)
                try {
                    const Parchment: any = Quill.import("parchment");
                    const SizeClass = new Parchment.Attributor.Class("size", "ql-size", {
                        scope: Parchment.Scope.INLINE,
                        whitelist: tokens,
                    });
                    Quill.register(SizeClass, true);
                } catch {}
            }

            setSizeKeys(tokens);
            sizePxToTokenRef.current = pxToToken;

            // Inject CSS: size token mapping + picker UX helpers
            const tag = document.createElement("style");
            tag.textContent = [
                css,
                `.ql-snow .ql-picker.ql-font { width: 160px; }`,
                `.ql-snow .ql-picker.ql-size { width: 60px; }`,
                `.ql-snow .ql-picker-label { max-width: 210px; overflow: hidden; text-overflow: ellipsis; }`,
                `.ql-snow .ql-picker.ql-font .ql-picker-options, .ql-snow .ql-picker.ql-size .ql-picker-options { max-height: 260px; overflow-y: auto; }`,
            ].join('\n');
            document.head.appendChild(tag);
            return () => {
                try {
                    document.head.removeChild(tag);
                } catch {}
            };
        }, []);

        useEffect(() => {
            if (fontKeys === null || sizeKeys === null) return; // wait for fonts and sizes
            const container = containerRef.current!;
            const editorContainer = container.appendChild(container.ownerDocument.createElement("div"));
            // styling wrapper
            container.style.padding = "8px";
            const quill = new Quill(editorContainer, {
                theme: "snow",
                readOnly: !!readOnly,
                modules: {
                    toolbar: showToolbar
                        ? [
                              [{ font: fontKeys || [] }, { size: sizeKeys || [] }],
                              ["bold", "italic", "underline", "strike"],
                              [{ list: "ordered" }, { list: "bullet" }],
                              ["clean"],
                          ]
                        : false,
                },
            });
            (quill.root as HTMLElement).style.minHeight = `${minHeight}px`;
            (quill.root as HTMLElement).style.padding = "4px 8px";
            // Apply default editor font and size
            (quill.root as HTMLElement).style.fontFamily = QUILL_DEFAULT_FONT_FAMILY;
            (quill.root as HTMLElement).style.fontSize = QUILL_DEFAULT_FONT_SIZE_PX;
            if (placeholder) quill.root.setAttribute("data-placeholder", placeholder);

            localRef.current = quill;
            // @ts-expect-error – we assign quill to parent ref
            if (ref && typeof ref === "object") ref.current = quill;

            // Preserve span classes on paste: map ql-size-* and ql-font-* to formats.
            try {
                const fontKeySet = new Set(fontKeys || []);
                const pxToToken = sizePxToTokenRef.current || {};
                quill.clipboard.addMatcher("SPAN", (node: any, delta: any) => {
                    try {
                        const el = node as HTMLElement;
                        let sizeToken: string | null = null;
                        let fontToken: string | null = null;
                        if (el && el.classList) {
                            for (const cls of Array.from(el.classList)) {
                                if (!sizeToken && cls.startsWith("ql-size-")) sizeToken = cls.slice("ql-size-".length);
                                if (!fontToken && cls.startsWith("ql-font-")) fontToken = cls.slice("ql-font-".length);
                            }
                        }
                        // If no ql-size-* class, try inline style font-size
                        if (!sizeToken && el && (el.getAttribute?.("style") || "")) {
                            const style = el.getAttribute("style") || "";
                            const m = /font-size\s*:\s*([^;]+);?/i.exec(style);
                            if (m) {
                                const raw = m[1].trim();
                                // Normalize to px (Quill usually gives px), then map to token
                                const px = raw.endsWith("px") ? raw : raw;
                                if (pxToToken[px]) sizeToken = pxToToken[px];
                            }
                        }
                        // Apply found formats to all ops in this span
                        if (sizeToken || (fontToken && fontKeySet.has(fontToken))) {
                            delta.ops = (delta.ops || []).map((op: any) => {
                                if (typeof op.insert === "string") {
                                    op.attributes = op.attributes || {};
                                    if (sizeToken) op.attributes.size = sizeToken;
                                    if (fontToken && fontKeySet.has(fontToken)) op.attributes.font = fontToken;
                                }
                                return op;
                            });
                        }
                    } catch {}
                    return delta;
                });
            } catch {}

            // Initialize content
            if (initialHtmlRef.current) {
                try {
                    quill.clipboard.dangerouslyPasteHTML(initialHtmlRef.current);
                } catch {
                    quill.setText(initialHtmlRef.current || "");
                }
            }

            // Ensure toolbar default shows 14px label (numeric) regardless of first option order
            try {
                const defaultSizeToken = `n-${QUILL_DEFAULT_FONT_SIZE_PX.replace(".", "_")}`;
                // Set a collapsed selection to apply active format for upcoming input and reflect in toolbar
                quill.setSelection(0, 0, Quill.sources.SILENT);
                quill.format("size", defaultSizeToken, Quill.sources.SILENT);
            } catch {}

            const handler = () => {
                let html = "";
                // Prefer Quill v2 API if present
                // @ts-ignore
                if (typeof quill.getSemanticHTML === "function") {
                    // @ts-ignore
                    html = quill.getSemanticHTML();
                } else {
                    html = (quill.root as HTMLElement).innerHTML;
                }
                onHtmlChangeRef.current?.(html);
            };
            quill.on(Quill.events.TEXT_CHANGE, handler);

            return () => {
                console.log('set null')
                localRef.current = null;
                // @ts-expect-error – clean up
                if (ref && typeof ref === "object") ref.current = null;
                container.innerHTML = "";
            };
        }, [fontKeys, sizeKeys]);

        // respond to readOnly changes
        useEffect(() => {
            const q = localRef.current;
            if (q) q.enable(!readOnly);
        }, [readOnly]);

        const isLoading = fontKeys === null || sizeKeys === null;

        return (
            <div style={{ position: "relative" }}>
                {isLoading && (
                    <div
                        style={{
                            minHeight: `${minHeight}px`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 8,
                        }}
                    >
                        <Spinner label="正在加载字体…" />
                    </div>
                )}
                <div ref={containerRef} style={{ opacity: isLoading ? 0 : 1 }} />
            </div>
        );
    },
);

QuillEditor.displayName = "QuillEditor";

export default QuillEditor;
