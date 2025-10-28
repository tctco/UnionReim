import { Input } from "@fluentui/react-components";
import React, { useCallback, useEffect, useRef, useState } from "react";
import AutocompleteOverlay from "./AutocompleteOverlay";
import type { WatermarkPlaceholder } from "../../../common/watermarkPlaceholders";
import { WATERMARK_PLACEHOLDERS } from "../../../common/watermarkPlaceholders";

type TokenAutocompleteInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  items?: readonly WatermarkPlaceholder[];
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  "data-testid"?: string;
  style?: React.CSSProperties;
};

/**
 * Single-line input with "{" placeholder autocomplete overlay.
 * - Opens when user types "{" and shows WATERMARK_PLACEHOLDERS suggestions
 * - Filters as user types; supports ArrowUp/Down, Enter, Escape
 * - Positions overlay near caret using a mirror element for measurement
 */
export default function TokenAutocompleteInput(props: TokenAutocompleteInputProps) {
  const { value, onChange, placeholder, disabled, items = WATERMARK_PLACEHOLDERS, onBlur, style, ...rest } = props;

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  // mirror element is created lazily via getOrCreateMirror

  const [visible, setVisible] = useState(false);
  const [filtered, setFiltered] = useState<typeof items>(items);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const triggerIndexRef = useRef<number | null>(null);
  const caretIndexRef = useRef<number>(0);

  useEffect(() => {
    setFiltered(items);
  }, [items]);

  const norm = (s: string) => s.toLowerCase();

  const updateOverlayPosition = useCallback(() => {
    const input = inputRef.current;
    const wrapper = wrapperRef.current;
    const overlay = overlayRef.current;
    if (!input || !wrapper) return;

    const caretIndex = caretIndexRef.current;
    const mirror = getOrCreateMirror(input, wrapper);

    // Copy input visual text up to caret into mirror
    const before = (value || "").slice(0, caretIndex)
      .replace(/\n/g, " ")
      .replace(/ /g, "\u00A0");
    mirror.innerHTML = `${escapeHtml(before)}<span data-caret></span>`;

    const caretEl = mirror.querySelector("[data-caret]") as HTMLElement | null;
    const wrapperRect = wrapper.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();
    const caretRect = caretEl?.getBoundingClientRect();
    const gapY = 6;
    const edge = 8;

    // Compute overlay position relative to wrapper (app container), not just input offsets
    const caretLeftInWrapper = (caretRect ? caretRect.left : inputRect.left + Math.min(input.clientWidth - 40, 10)) - wrapperRect.left;
    const inputBottomInWrapper = inputRect.bottom - wrapperRect.top;
    const inputTopInWrapper = inputRect.top - wrapperRect.top;

    // Horizontal position (prefer right of caret)
    let left = caretLeftInWrapper + 10;
    const panelW = overlay?.offsetWidth ?? 200;
    const maxLeft = (wrapper as HTMLElement).clientWidth - panelW - edge;
    left = Math.max(edge, Math.min(left, Math.max(edge, maxLeft)));

    // Vertical position with dynamic up/down decision based on viewport
    const panelH = overlay?.offsetHeight ?? 140;
    const belowGlobalBottom = inputRect.bottom + gapY + panelH; // px from viewport top
    const fitsDown = belowGlobalBottom <= (window.innerHeight || document.documentElement.clientHeight) - edge;
    let top = 0;
    if (fitsDown) {
      // place below
      top = inputBottomInWrapper + gapY;
    } else {
      // place above
      top = inputTopInWrapper - panelH - gapY;
      // Ensure not out of viewport top
      const globalTop = wrapperRect.top + top;
      const minGlobalTop = edge;
      if (globalTop < minGlobalTop) {
        top = minGlobalTop - wrapperRect.top;
      }
    }

    setPos({ top, left });
  }, [value]);

  const closeOverlay = useCallback(() => {
    setVisible(false);
    triggerIndexRef.current = null;
  }, []);

  const openAndFilter = useCallback(
    (currentValue: string, caretIndex: number) => {
      // Find last '{' before caret, without a matching '}' in between
      const lastOpen = currentValue.lastIndexOf("{", caretIndex - 1);
      if (lastOpen < 0) {
        closeOverlay();
        return;
      }
      const closing = currentValue.lastIndexOf("}", caretIndex - 1);
      if (closing > lastOpen) {
        closeOverlay();
        return;
      }
      // Also avoid spaces immediately after '{' (treat as no trigger)
      const q = currentValue.slice(lastOpen + 1, caretIndex);
      const query = q.trimStart();
      triggerIndexRef.current = lastOpen;
      caretIndexRef.current = caretIndex;
      const qLower = norm(query);

      const matched = items.filter((it) => {
        const tokenLower = norm(it.token);
        const labelLower = norm(it.label);
        return tokenLower.includes(qLower) || labelLower.includes(qLower);
      });
      setFiltered(matched);
      setSelectedIndex(0);
      setVisible(true);
      requestAnimationFrame(updateOverlayPosition);
    },
    [items, updateOverlayPosition, closeOverlay],
  );

  const applySelection = useCallback(
    (token: string) => {
      const start = triggerIndexRef.current;
      const caret = caretIndexRef.current;
      if (start == null || caret == null) return;
      const next = (value || "").slice(0, start) + token + (value || "").slice(caret);
      const nextCaret = start + token.length;
      onChange(next);
      // After parent updates, restore caret near next tick
      requestAnimationFrame(() => {
        const inp = inputRef.current;
        if (!inp) return;
        try {
          inp.focus();
          inp.setSelectionRange(nextCaret, nextCaret);
        } catch {}
      });
      closeOverlay();
    },
    [value, onChange, closeOverlay],
  );

  const onInputChange = useCallback<NonNullable<React.ComponentProps<typeof Input>["onChange"]>>(
    (_, data) => {
      const nextValue = data.value;
      onChange(nextValue);
      // Use current selectionStart after React's value assignment
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        const caretIndex = el.selectionStart ?? nextValue.length;
        caretIndexRef.current = caretIndex;
        // Check for trigger
        openAndFilter(nextValue, caretIndex);
      });
    },
  [onChange, openAndFilter]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!visible) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const len = Math.max(1, filtered.length);
      setSelectedIndex((i) => (i + 1) % len);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const len = Math.max(1, filtered.length);
      setSelectedIndex((i) => (i - 1 + len) % len);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[selectedIndex] || filtered[0] || items[0];
      if (item) applySelection(item.token);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeOverlay();
    }
  }, [visible, filtered, selectedIndex, items, applySelection, closeOverlay]);

  // Track caret index when user clicks/moves within input
  const onSelect = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const caretIndex = el.selectionStart ?? (value || "").length;
    caretIndexRef.current = caretIndex;
    // If moving caret breaks the trigger range, recompute
    openAndFilter(value, caretIndex);
  }, [value, openAndFilter]);

  // Dismiss when clicking outside
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const panel = overlayRef.current;
      const input = inputRef.current;
      if (!panel || !input) {
        closeOverlay();
        return;
      }
      const t = e.target as Node | null;
      if (panel.contains(t) || input.contains(t as Node)) return;
      closeOverlay();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [closeOverlay]);

  // Keep overlay positioned on window resize
  useEffect(() => {
    const onResize = () => requestAnimationFrame(updateOverlayPosition);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [updateOverlayPosition]);

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%", ...style }}>
      <Input
        {...rest}
        ref={inputRef as any}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        style={{ width: "100%" }}
        onChange={onInputChange}
        onKeyDown={onKeyDown}
        onSelect={onSelect}
        onBlur={(e) => {
          onBlur?.(e);
        }}
      />

      <AutocompleteOverlay
        ref={overlayRef}
        visible={!!visible && !disabled}
        top={pos.top}
        left={pos.left}
        items={filtered}
        selectedIndex={selectedIndex}
        onHoverIndex={(i) => setSelectedIndex(i)}
        onSelect={(token) => applySelection(token)}
      />
    </div>
  );
}

function getOrCreateMirror(input: HTMLInputElement, wrapper: HTMLDivElement): HTMLDivElement {
  let mirror = (input as any).__mirror as HTMLDivElement | undefined;
  if (!mirror) {
    mirror = document.createElement("div");
    (input as any).__mirror = mirror;
    wrapper.appendChild(mirror);
    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.whiteSpace = "pre";
    mirror.style.pointerEvents = "none";
    mirror.style.left = `${input.offsetLeft}px`;
    mirror.style.top = `${input.offsetTop}px`;
  }
  const cs = window.getComputedStyle(input);
  mirror.style.fontFamily = cs.fontFamily;
  mirror.style.fontSize = cs.fontSize;
  mirror.style.fontWeight = cs.fontWeight;
  mirror.style.letterSpacing = cs.letterSpacing;
  mirror.style.padding = cs.padding;
  mirror.style.border = cs.border;
  mirror.style.height = cs.height;
  mirror.style.width = cs.width;
  return mirror;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
