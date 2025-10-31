import { forwardRef, useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { WatermarkPlaceholder } from "../../../common/watermarkPlaceholders";

type AutocompleteOverlayProps = {
  visible: boolean;
  top: number;
  left: number;
  items: readonly WatermarkPlaceholder[];
  selectedIndex: number;
  onSelect: (token: string) => void;
  onHoverIndex?: (index: number) => void;
};

const AutocompleteOverlay = forwardRef<HTMLDivElement, AutocompleteOverlayProps>(
  ({ visible, top, left, items, selectedIndex, onSelect, onHoverIndex }, ref) => {
    // Local ref for scroll calculations while preserving forwarded ref
    const innerRef = useRef<HTMLDivElement | null>(null);

    // Auto-scroll the selected item into view when selection or visibility changes
    useEffect(() => {
      if (!visible) return;
      const container = innerRef.current;
      if (!container) return;
      if (items.length === 0) return;
      const idx = selectedIndex;
      if (idx < 0 || idx >= items.length) return;
      const el = container.children[idx] as HTMLElement | undefined;
      if (!el) return;

      const itemTop = el.offsetTop;
      const itemBottom = itemTop + el.offsetHeight;
      const viewTop = container.scrollTop;
      const viewBottom = viewTop + container.clientHeight;
      const margin = 4;

      if (itemTop < viewTop) {
        container.scrollTop = itemTop - margin;
      } else if (itemBottom > viewBottom) {
        container.scrollTop = itemBottom - container.clientHeight + margin;
      }
    }, [selectedIndex, visible, items.length]);

    // Always render so the parent can measure offsetWidth/Height even when hidden.
    return (
      <div
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        style={{
          position: "absolute",
          top: top,
          left: left,
          zIndex: 10,
          background: "white",
          border: "1px solid #e5e5e5",
          borderRadius: 2,
          maxHeight: 180,
          overflowY: "auto",
          minWidth: 160,
          fontSize: 12,
          // Keep in layout but hidden when not visible so measurements work
          visibility: visible ? "visible" : "hidden",
          pointerEvents: visible ? "auto" : "none",
        }}
        onMouseDown={(e) => {
          // Prevent editor blur
          e.preventDefault();
        }}
      >
        {items.map((it, idx) => (
          <div
            key={it.token}
            onMouseEnter={() => onHoverIndex?.(idx)}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(it.token);
            }}
            style={{
              padding: "4px 8px",
              background: idx === selectedIndex ? "#f0f4ff" : "white",
              cursor: "pointer",
              borderBottom: "1px solid #f6f6f6",
            }}
          >
            <div style={{ color: "#333" }}>{it.token}</div>
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ padding: "8px 10px", color: "#999" }}>No matches</div>
        )}
      </div>
    );
  },
);

AutocompleteOverlay.displayName = "AutocompleteOverlay";

export default AutocompleteOverlay;
