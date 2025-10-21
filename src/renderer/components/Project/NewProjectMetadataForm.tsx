import type { Template } from "@common/types";
import { Button, Field, Input, Textarea, Title3 } from "@fluentui/react-components";
import React from "react";

/**
 * NewProjectMetadataForm
 * Collects project-level metadata (name, creator, description) before creation.
 * Styling is provided by the parent via `classes` to keep visuals consistent.
 */
export default function NewProjectMetadataForm(props: {
  selectedTemplate: Template;
  name: string;
  creator: string;
  description: string;
  onChangeName: (v: string) => void;
  onChangeCreator: (v: string) => void;
  onChangeDescription: (v: string) => void;
  onBack: () => void;
  onCreate: () => void;
  classes: { container: string; header: string; section: string };
}) {
  const {
    selectedTemplate,
    name,
    creator,
    description,
    onChangeName,
    onChangeCreator,
    onChangeDescription,
    onBack,
    onCreate,
    classes,
  } = props;

  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <Title3>New Project - {selectedTemplate.name}</Title3>
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={onBack}>Back</Button>
          <Button appearance="primary" onClick={onCreate}>
            Create
          </Button>
        </div>
      </div>

      <div className={classes.section}>
        <Field label="Project Name" required>
          <Input value={name} onChange={(_, data) => onChangeName(data.value)} placeholder="e.g., 2025 ISICDM Conference" />
        </Field>
        <Field label="Creator">
          <Input value={creator} onChange={(_, data) => onChangeCreator(data.value)} placeholder="Your name" />
        </Field>
        <Field label="Description">
          <Textarea value={description} onChange={(_, data) => onChangeDescription(data.value)} placeholder="Optional description" />
        </Field>
      </div>
    </div>
  );
}

