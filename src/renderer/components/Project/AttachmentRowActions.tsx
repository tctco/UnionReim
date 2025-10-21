import type { Attachment } from "@common/types";
import { Button, Tooltip } from "@fluentui/react-components";
import { Copy24Regular, Delete24Regular, Eye24Regular, Rename24Regular, Sparkle24Regular } from "@fluentui/react-icons";
import React from "react";

/**
 * Small action bar for a single attachment row: preview/copy/rename/watermark/delete.
 * Kept presentational and stateless; parent wires handlers.
 */
export default function AttachmentRowActions(props: {
  attachment: Attachment;
  needsWatermark: boolean;
  onPreview: (a: Attachment) => void;
  onCopyPath: (a: Attachment) => void;
  onOpenRename: (a: Attachment) => void;
  onWatermark: (a: Attachment) => void;
  onDelete: (a: Attachment) => void;
}) {
  const { attachment, needsWatermark, onPreview, onCopyPath, onOpenRename, onWatermark, onDelete } = props;
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      <Tooltip content="Preview file" relationship="label">
        <Button size="small" icon={<Eye24Regular />} onClick={() => onPreview(attachment)} appearance="subtle" />
      </Tooltip>
      <Tooltip content="Copy path" relationship="label">
        <Button size="small" icon={<Copy24Regular />} onClick={() => onCopyPath(attachment)} appearance="subtle" />
      </Tooltip>
      <Tooltip content="Rename" relationship="label">
        <Button size="small" icon={<Rename24Regular />} onClick={() => onOpenRename(attachment)} appearance="subtle" />
      </Tooltip>
      {needsWatermark && !attachment.has_watermark && (
        <Tooltip content="Apply watermark" relationship="label">
          <Button size="small" icon={<Sparkle24Regular />} onClick={() => onWatermark(attachment)} appearance="subtle" />
        </Tooltip>
      )}
      <Tooltip content="Delete file" relationship="label">
        <Button size="small" icon={<Delete24Regular />} onClick={() => onDelete(attachment)} appearance="subtle" />
      </Tooltip>
    </div>
  );
}

