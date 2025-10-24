import React, { useEffect, useMemo, useState } from "react";
import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle } from "@fluentui/react-components";
import type { Attachment, AppSettings, WatermarkSettings, WatermarkConfig } from "@common/types";
import WatermarkSettingsPanel from "../Settings/WatermarkSettingsPanel";

function toReimbursementUrl(absOrRelPath: string): string {
  const normalized = absOrRelPath.replace(/\\/g, "/");
  const marker = "/storage/projects/";
  const idx = normalized.lastIndexOf(marker);
  const rel = idx >= 0 ? normalized.slice(idx + marker.length) : normalized;
  return `reimbursement://attachments/${encodeURI(rel.replace(/^\//, ""))}`;
}

export default function WatermarkApplyDialog(props: {
  open: boolean;
  attachment: Attachment | null;
  onCancel: () => void;
  onApplied: () => void;
}) {
  const { open, attachment, onCancel, onApplied } = props;
  const [fonts, setFonts] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [wm, setWm] = useState<WatermarkSettings>({
    textMode: "template",
    fontFamily: "Arial",
    fontSize: 48,
    bold: false,
    italic: false,
    underline: false,
    color: "#000000",
    opacity: 0.3,
    rotation: -45,
    xPercent: 50,
    yPercent: 50,
  });
  const [text, setText] = useState<string>("");
  const [userEditedText, setUserEditedText] = useState<boolean>(false);
  const isImage = (attachment?.file_type || "").toLowerCase() === "jpg" || (attachment?.file_type || "").toLowerCase() === "jpeg" || (attachment?.file_type || "").toLowerCase() === "png";

  // Load initial settings and preview target on open
  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const s = await window.ContextBridge.settings.get();
        if (!active) return;
        if (s.success && s.data) {
          const app = s.data as AppSettings;
          if (app.watermark) setWm({ ...wm, ...app.watermark });
          setUserEditedText(false);
        }
        const fontsRes = await window.ContextBridge.fonts.list();
        if (!active) return;
        if (fontsRes.success && fontsRes.data) setFonts(fontsRes.data);
      } catch {}
    }
    if (open) init();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Load attachment image path
  useEffect(() => {
    let active = true;
    async function loadPath() {
      if (!open || !attachment) { setImageUrl(undefined); return; }
      try {
        const res = await window.ContextBridge.attachment.getPath(attachment.attachment_id, false);
        if (!active) return;
        if (res.success && res.data) {
          setImageUrl(toReimbursementUrl(res.data));
        } else {
          setImageUrl(undefined);
        }
      } catch {
        if (!active) return;
        setImageUrl(undefined);
      }
    }
    loadPath();
    return () => { active = false; };
  }, [open, attachment?.attachment_id]);

  // Resolve default preview text from main (template/custom)
  useEffect(() => {
    let active = true;
    async function resolveText() {
      if (!open || !attachment) return;
      try {
        const res = await window.ContextBridge.watermark.resolveText(attachment.attachment_id);
        if (!active) return;
        if (res.success && res.data) {
          // only set when user hasn't edited in this dialog session
          if (!userEditedText) setText(res.data);
        }
      } catch {}
    }
    resolveText();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, attachment?.attachment_id]);

  const canPreview = isImage && !!imageUrl;

  const handleConfirm = async () => {
    if (!attachment) return;
    // build config for one-off apply
    const config: WatermarkConfig = {
      text: text || "", // if empty, main will derive from template/settings
      fontFamily: wm.fontFamily,
      fontSize: wm.fontSize,
      bold: wm.bold,
      italic: wm.italic,
      underline: wm.underline,
      color: wm.color,
      opacity: wm.opacity,
      rotation: wm.rotation,
      xPercent: wm.xPercent,
      yPercent: wm.yPercent,
    };
    try {
      const res = await window.ContextBridge.watermark.apply(attachment.attachment_id, { watermark_text: text || undefined, config });
      if (res.success) {
        onApplied();
      }
    } catch {
      // swallow; parent can refresh regardless
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, d) => { if (!d.open) onCancel(); }}>
      <DialogSurface style={{ maxWidth: 860 }}>
        <DialogBody>
          <DialogTitle>Apply Watermark</DialogTitle>
          <DialogContent>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              <WatermarkSettingsPanel
                wm={wm}
                fonts={fonts}
                onChange={(patch) => setWm({ ...wm, ...patch })}
                previewImageSrc={canPreview ? imageUrl : undefined}
                previewText={text}
                onPreviewTextChange={(v) => { setUserEditedText(true); setText(v); }}
              />
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCancel}>Cancel</Button>
            <Button appearance="primary" onClick={handleConfirm}>Apply</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
