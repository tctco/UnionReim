import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, Field, Input } from "@fluentui/react-components";
import React from "react";

/**
 * Minimal reusable rename dialog.
 * Parent controls open/value and handles confirm/cancel.
 */
export default function RenameDialogSimple(props: {
  open: boolean;
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  label?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}) {
  const { open, value, onChange, onCancel, onConfirm, title = "Rename File", label = "Enter a new name (with extension)", placeholder = "New file name", confirmText = "Confirm", cancelText = "Cancel" } = props;
  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onCancel()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            <Field label={label}>
              <Input value={value} onChange={(_, data) => onChange(data.value)} placeholder={placeholder} />
            </Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCancel}>{cancelText}</Button>
            <Button appearance="primary" onClick={onConfirm}>{confirmText}</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

