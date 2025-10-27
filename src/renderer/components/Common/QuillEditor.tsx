import { Spinner } from "@fluentui/react-components";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from "react";
import { QUILL_DEFAULT_FONT_FAMILY, QUILL_DEFAULT_FONT_SIZE_PT } from "../../../common/constants";
import { DEFAULT_FONT_FAMILIES, getFontKeysAndCss, getSizeTokensAndCss } from "../../../common/quillStyle";
import { WATERMARK_PLACEHOLDERS } from "../../../common/watermarkPlaceholders";
import { useI18n } from "../../i18n";
import AutocompleteOverlay from "./AutocompleteOverlay";

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
        const { t } = useI18n();
        const containerRef = useRef<HTMLDivElement | null>(null);
        const initialHtmlRef = useRef(initialHtml);
        const onHtmlChangeRef = useRef(onHtmlChange);
        const localRef = useRef<Quill | null>(null);
        const [fontKeys, setFontKeys] = useState<string[] | null>(null);
        const [sizeKeys, setSizeKeys] = useState<string[] | null>(null);
        // Map css px value -> our registered size token (e.g. '14px' -> 'n-14px', '35px' -> 'cn-2')
        const sizePxToTokenRef = useRef<Record<string, string>>({});
        const styleTagRef = useRef<HTMLStyleElement | null>(null);
        const wrapperRef = useRef<HTMLDivElement | null>(null);

        // Autocomplete state
        const [acVisible, setAcVisible] = useState(false);
        const [acItems, setAcItems] = useState<typeof WATERMARK_PLACEHOLDERS>(WATERMARK_PLACEHOLDERS);
        const [acSelected, setAcSelected] = useState(0);
        const [acPos, setAcPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
        const triggerIndexRef = useRef<number | null>(null);
        const queryRef = useRef<string>("");
        const overlayRef = useRef<HTMLDivElement | null>(null);
        // Live refs to avoid stale closures in key handlers
        const acItemsRef = useRef<typeof WATERMARK_PLACEHOLDERS>(WATERMARK_PLACEHOLDERS);
        const acSelectedRef = useRef(0);
        const acVisibleRef = useRef(false);
        useEffect(() => {
            acItemsRef.current = acItems;
        }, [acItems]);
        useEffect(() => {
            acSelectedRef.current = acSelected;
        }, [acSelected]);
        useEffect(() => {
            acVisibleRef.current = acVisible;
        }, [acVisible]);

        useLayoutEffect(() => {
            onHtmlChangeRef.current = onHtmlChange;
        });

        useEffect(() => {
            initialHtmlRef.current = initialHtml;
        }, [initialHtml]);

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
            ].join("\n");
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
            (quill.root as HTMLElement).style.fontSize = QUILL_DEFAULT_FONT_SIZE_PT;
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
                const defaultSizeToken = `n-${QUILL_DEFAULT_FONT_SIZE_PT.replace(".", "_")}`;
                // Set a collapsed selection to apply active format for upcoming input and reflect in toolbar
                quill.setSelection(1, 1, Quill.sources.SILENT);
                quill.format("size", defaultSizeToken, Quill.sources.SILENT);
            } catch {console.error("Failed to set default size token");}

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
            // Helper to position the autocomplete panel near the caret while avoiding container edges
            const setPosFromBounds = (bounds: { left: number; top: number; height: number }) => {
                try {
                    const wrapper = wrapperRef.current;
                    const panelW = overlayRef.current?.offsetWidth ?? 200;
                    const panelH = overlayRef.current?.offsetHeight ?? 140;
                    const edge = 8; // clamp margin to container edges
                    const gapX = 10; // horizontal gap from caret

                    const caretLeft = bounds.left || 0;
                    const caretTop = bounds.top || 0;
                    const caretBottom = caretTop + (bounds.height || 0);

                    // Prefer right and below
                    let left = caretLeft + gapX;
                    let top = caretBottom + panelH / 3 + 6;
                    console.log({ panelH, panelW, caretLeft, caretTop, caretBottom });

                    if (wrapper) {
                        const ww = wrapper.clientWidth;
                        const wh = wrapper.clientHeight;

                        // Horizontal placement: try right, else left, else clamp
                        const fitsRight = left + panelW <= ww - edge;
                        const leftIfLeft = caretLeft - panelW - gapX;
                        if (!fitsRight) {
                            left = leftIfLeft;
                        }

                        // Vertical placement: try below, else above, else clamp
                        const fitsDown = top + panelH <= wh;
                        const topIfUp = caretTop - panelH / 2 - 24;
                        if (!fitsDown) {
                            top = topIfUp;
                        }
                    }

                    setAcPos({ top, left });
                } catch {}
            };
            // Track user typing to trigger autocomplete
            quill.on(Quill.events.TEXT_CHANGE, (delta: any, _old: any, source: any) => {
                if (source !== Quill.sources.USER) return;
                if (readOnly) return;
                try {
                    const sel = quill.getSelection();
                    const index = sel?.index ?? null;
                    // Determine if '{' was just inserted
                    const ops = Array.isArray(delta.ops) ? delta.ops : [];
                    const lastInsert = ops.map((o: any) => (typeof o.insert === "string" ? o.insert : "")).join("");
                    if (lastInsert.includes("{")) {
                        // Trigger at the exact index of '{' (caret is after it)
                        const triggerIndex = index !== null ? Math.max(0, index - 1) : null;
                        if (triggerIndex !== null) {
                            triggerIndexRef.current = triggerIndex;
                            queryRef.current = "";
                            setAcItems(WATERMARK_PLACEHOLDERS);
                            setAcSelected(0);
                            const caretIndex = index || 0;
                            try {
                                setPosFromBounds(quill.getBounds(caretIndex) as any);
                            } catch {}
                            setAcVisible(true);
                            return;
                        }
                    }

                    // If panel open, update query and filter, or close on invalidation
                    console.log("acVisible", acVisible, triggerIndexRef.current, index);
                    if (acVisibleRef.current && triggerIndexRef.current !== null && index !== null) {
                        const start = triggerIndexRef.current;
                        if (index < start) {
                            setAcVisible(false);
                            triggerIndexRef.current = null;
                            return;
                        }
                        const len = index - start;
                        const text = quill.getText(start, len);
                        // text includes the '{' at position 0
                        if (!text || text[0] !== "{") {
                            setAcVisible(false);
                            triggerIndexRef.current = null;
                            return;
                        }
                        const q = text.slice(1); // query after '{'
                        queryRef.current = q;
                        // If query contains invalid characters (space, punctuation, etc), close
                        if (q.length > 0 && !/^[a-zA-Z]+$/.test(q)) {
                            setAcVisible(false);
                            triggerIndexRef.current = null;
                            return;
                        }
                        const items = WATERMARK_PLACEHOLDERS.filter((p) =>
                            p.token.toLowerCase().includes(`{${q}`.toLowerCase()),
                        );
                        setAcItems(items.length > 0 ? items : WATERMARK_PLACEHOLDERS);
                        setAcSelected(0);
                        try {
                            setPosFromBounds(quill.getBounds(index) as any);
                        } catch {}
                        // Close when '}' typed (query contains '}')
                        if (q.includes("}")) {
                            setAcVisible(false);
                            triggerIndexRef.current = null;
                        }
                    }
                } catch {}
            });

            // Keyboard navigation while panel open
            const root = quill.root as HTMLElement;
            const onKeyDown = (e: KeyboardEvent) => {
                if (!acVisibleRef.current && triggerIndexRef.current == null) return;
                if (readOnly) return;
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const len = Math.max(1, acItemsRef.current.length);
                    setAcSelected((i) => (i + 1) % len);
                } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const len = Math.max(1, acItemsRef.current.length);
                    setAcSelected((i) => (i - 1 + len) % len);
                } else if (e.key === "Enter") {
                    e.preventDefault();
                    // apply selected token
                    const list = acItemsRef.current;
                    const idx = acSelectedRef.current;
                    const fallback = WATERMARK_PLACEHOLDERS[0];
                    const item = list[idx] || list[0] || fallback;
                    applyAutocomplete(quill, item.token);
                } else if (e.key === "Escape") {
                    e.preventDefault();
                    setAcVisible(false);
                    triggerIndexRef.current = null;
                }
            };
            root.addEventListener("keydown", onKeyDown);

            // Dismiss on clicking anywhere outside the suggestion panel
            const onDocMouseDown = (e: MouseEvent) => {
                const panel = overlayRef.current;
                if (!panel) {
                    setAcVisible(false);
                    triggerIndexRef.current = null;
                    return;
                }
                const target = e.target as Node | null;
                if (target && panel.contains(target)) return; // handled by panel
                // Clicking anywhere else closes the panel
                setAcVisible(false);
                triggerIndexRef.current = null;
            };
            document.addEventListener("mousedown", onDocMouseDown);

            const applyAutocomplete = (q: Quill, token: string) => {
                try {
                    const sel = q.getSelection();
                    const endIndex = sel?.index ?? null;
                    const start = triggerIndexRef.current;
                    if (start == null || endIndex == null) return;
                    const len = Math.max(0, endIndex - start);
                    q.deleteText(start, len, Quill.sources.USER);
                    q.insertText(start, token, Quill.sources.USER);
                    q.setSelection(start + token.length, 0, Quill.sources.SILENT);
                } finally {
                    setAcVisible(false);
                    triggerIndexRef.current = null;
                }
            };

            // Make apply function available to click handler via closure
            (quill as any).__applyAutocomplete = applyAutocomplete;

            return () => {
                console.log("set null");
                localRef.current = null;
                // @ts-expect-error – clean up
                if (ref && typeof ref === "object") ref.current = null;
                container.innerHTML = "";
                try {
                    (quill.root as HTMLElement).removeEventListener("keydown", onKeyDown);
                } catch {}
                try {
                    document.removeEventListener("mousedown", onDocMouseDown);
                } catch {}
            };
        }, [fontKeys, sizeKeys]);

        // respond to readOnly changes
        useEffect(() => {
            const q = localRef.current;
            if (q) q.enable(!readOnly);
        }, [readOnly]);

        const isLoading = fontKeys === null || sizeKeys === null;

        return (
            <div ref={wrapperRef} style={{ position: "relative" }}>
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
                        <Spinner label={t("documents.loading")} />
                    </div>
                )}
                <div ref={containerRef} style={{ opacity: isLoading ? 0 : 1, minHeight }} />
                <AutocompleteOverlay
                    ref={overlayRef}
                    visible={!!(acVisible && !readOnly)}
                    top={acPos.top}
                    left={acPos.left}
                    items={acItems}
                    selectedIndex={acSelected}
                    onHoverIndex={(i) => setAcSelected(i)}
                    onSelect={(token) => {
                        const q = localRef.current;
                        if (!q) return;
                        const apply = (q as any).__applyAutocomplete as (q: Quill, token: string) => void;
                        apply?.(q, token);
                    }}
                />
            </div>
        );
    },
);

QuillEditor.displayName = "QuillEditor";

export default QuillEditor;
