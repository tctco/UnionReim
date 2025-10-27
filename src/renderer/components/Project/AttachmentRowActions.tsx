import type { Attachment } from "@common/types";
import { Button, Tooltip, Menu, MenuTrigger, MenuPopover, MenuList, MenuItem } from "@fluentui/react-components";
import { Copy24Regular, Delete24Regular, Eye24Regular, Rename24Regular, Sparkle24Regular, Eraser24Regular } from "@fluentui/react-icons";
import { WATERMARK_IMAGE_EXTS } from "@common/constants";

/**
 * Small action bar for a single attachment row: preview/copy/rename/watermark/delete.
 * Kept presentational and stateless; parent wires handlers.
 */
export default function AttachmentRowActions(props: {
  attachment: Attachment;
  needsWatermark: boolean;
  onPreviewOriginal: (a: Attachment) => void;
  onPreviewWatermarked: (a: Attachment) => void;
  onCopyPathOriginal: (a: Attachment) => void;
  onCopyPathWatermarked: (a: Attachment) => void;
  onOpenRename: (a: Attachment) => void;
  onWatermark: (a: Attachment) => void;
  onRemoveWatermark?: (a: Attachment) => void;
  onDelete: (a: Attachment) => void;
}) {
  const { attachment, needsWatermark, onPreviewOriginal, onPreviewWatermarked, onCopyPathOriginal, onCopyPathWatermarked, onOpenRename, onWatermark, onRemoveWatermark, onDelete } = props;
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <Tooltip content="Preview" relationship="label">
            <Button size="small" icon={<Eye24Regular />} appearance="subtle" />
          </Tooltip>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem onClick={() => onPreviewOriginal(attachment)}>Preview original</MenuItem>
            <MenuItem disabled={!attachment.has_watermark} onClick={() => onPreviewWatermarked(attachment)}>Preview watermarked</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>

      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <Tooltip content="Copy path" relationship="label">
            <Button size="small" icon={<Copy24Regular />} appearance="subtle" />
          </Tooltip>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem onClick={() => onCopyPathOriginal(attachment)}>Copy original path</MenuItem>
            <MenuItem disabled={!attachment.has_watermark} onClick={() => onCopyPathWatermarked(attachment)}>Copy watermarked path</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>
      <Tooltip content="Rename" relationship="label">
        <Button size="small" icon={<Rename24Regular />} onClick={() => onOpenRename(attachment)} appearance="subtle" />
      </Tooltip>
      {needsWatermark && WATERMARK_IMAGE_EXTS.includes(attachment.file_type) && (
        attachment.has_watermark ? (
          <Tooltip content="Delete watermark" relationship="label">
            <Button size="small" icon={<Eraser24Regular />} onClick={() => onRemoveWatermark && onRemoveWatermark(attachment)} appearance="subtle" />
          </Tooltip>
        ) : (
          <Tooltip content="Apply watermark" relationship="label">
            <Button size="small" icon={<Sparkle24Regular />} onClick={() => onWatermark(attachment)} appearance="subtle" />
          </Tooltip>
        )
      )}
      <Tooltip content="Delete file" relationship="label">
        <Button size="small" icon={<Delete24Regular />} onClick={() => onDelete(attachment)} appearance="subtle" />
      </Tooltip>
    </div>
  );
}
