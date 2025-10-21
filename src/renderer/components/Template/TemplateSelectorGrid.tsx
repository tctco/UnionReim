import type { Template } from "@common/types";
import { Body1, Caption1, Card, makeStyles, tokens } from "@fluentui/react-components";
import React from "react";

const useStyles = makeStyles({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: "12px",
    marginTop: "16px",
  },
  card: {
    cursor: "pointer",
    padding: "16px",
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
});

/**
 * TemplateSelectorGrid renders a responsive grid of template cards.
 * Clicking a card returns the selected template via onSelect.
 */
export default function TemplateSelectorGrid(props: {
  templates: Template[];
  onSelect: (t: Template) => void;
}) {
  const { templates, onSelect } = props;
  const styles = useStyles();
  return (
    <div className={styles.grid}>
      {templates.map((template) => (
        <Card key={template.template_id} className={styles.card} onClick={() => onSelect(template)}>
          <Body1 style={{ fontWeight: tokens.fontWeightSemibold }}>{template.name}</Body1>
          {template.description && (
            <Caption1 style={{ color: tokens.colorNeutralForeground3, marginTop: 4 }}>
              {template.description}
            </Caption1>
          )}
        </Card>
      ))}
    </div>
  );
}

