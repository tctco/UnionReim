import type { Attachment, ProjectItemWithDetails } from "@common/types";
import { Badge, Body1, Button, Caption1, Card, tokens } from "@fluentui/react-components";
import { ArrowUpload24Regular, DocumentRegular } from "@fluentui/react-icons";
import React from "react";
import AttachmentRowActions from "./AttachmentRowActions";
import { isAllowedAttachmentName } from "@common/constants";

type UploadCandidate = { path: string; original_name?: string };

/**
 * Presentational card that displays a single project item, its attachments,
 * and actions (upload/preview/rename/watermark/delete).
 * Drag-and-drop of files is supported when the parent passes `onDropUpload`.
 */
export default function ProjectItemCard(props: {
  item: ProjectItemWithDetails;
  selected: boolean;
  onSelect: () => void;
  onUploadClick: (item: ProjectItemWithDetails) => void;
  onDropUpload: (project_item_id: number, files: UploadCandidate[]) => void;
  onHoverEnter: (a: Attachment, x: number, y: number) => void;
  onHoverMove: (x: number, y: number) => void;
  onHoverLeave: () => void;
  onPreview: (a: Attachment) => void;
  onCopyPath: (a: Attachment) => void;
  onOpenRename: (a: Attachment) => void;
  onWatermark: (a: Attachment) => void;
  onDelete: (a: Attachment) => void;
  classes: { itemCard: string; itemHeader: string; attachmentList: string; attachmentItem: string };
}) {
  const {
    item,
    selected,
    onSelect,
    onUploadClick,
    onDropUpload,
    onHoverEnter,
    onHoverMove,
    onHoverLeave,
    onPreview,
    onCopyPath,
    onOpenRename,
    onWatermark,
    onDelete,
    classes,
  } = props;


  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || []);
    const candidates: UploadCandidate[] = [];
    for (const f of files) {
      const filePath = (f as unknown as { path?: string }).path as string | undefined;
      const name = f.name || filePath || "file";
      if (!isAllowedAttachmentName(name)) continue;
      if (filePath) candidates.push({ path: filePath, original_name: name });
    }
    if (candidates.length > 0) onDropUpload(item.project_item_id, candidates);
  };

  return (
    <Card
      className={classes.itemCard}
      onClick={onSelect}
      aria-selected={selected}
      appearance="filled-alternative"
      style={{ border: selected ? `2px solid ${tokens.colorBrandStroke1}` : `1px solid ${tokens.colorNeutralStroke1}` }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={classes.itemHeader}>
        <div>
          <Body1>{item.template_item.name}</Body1>
          {item.template_item.is_required && (
            <Badge color="danger" style={{ marginLeft: 8 }}>Required</Badge>
          )}
          {item.template_item.needs_watermark && (
            <Badge color="informative" style={{ marginLeft: 8 }}>Watermark</Badge>
          )}
        </div>
        <Button icon={<ArrowUpload24Regular />} onClick={() => onUploadClick(item)}>Upload</Button>
      </div>

      {item.template_item.description && (
        <Caption1 style={{ color: tokens.colorNeutralForeground3, marginBottom: 8 }}>
          {item.template_item.description}
        </Caption1>
      )}

      {item.attachments.length > 0 && (
        <div className={classes.attachmentList}>
          {item.attachments.map((attachment) => (
            <div
              key={attachment.attachment_id}
              className={classes.attachmentItem}
              onMouseEnter={(e) => onHoverEnter(attachment, e.clientX, e.clientY)}
              onMouseMove={(e) => onHoverMove(e.clientX, e.clientY)}
              onMouseLeave={onHoverLeave}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <DocumentRegular />
                <Caption1>{attachment.original_name}</Caption1>
                {attachment.has_watermark && <Badge color="success">Watermarked</Badge>}
              </div>
              <AttachmentRowActions
                attachment={attachment}
                needsWatermark={!!item.template_item.needs_watermark}
                onPreview={onPreview}
                onCopyPath={onCopyPath}
                onOpenRename={onOpenRename}
                onWatermark={onWatermark}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>
      )}

      {selected && (
        <Caption1 style={{ color: tokens.colorNeutralForeground3, marginTop: 8 }}>
          Tip: Press Ctrl+V to paste files here
        </Caption1>
      )}
    </Card>
  );
}
