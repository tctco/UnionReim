import React, { forwardRef } from "react";
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
    // Always render so the parent can measure offsetWidth/Height even when hidden.
    return (
      <div
        ref={ref}
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
