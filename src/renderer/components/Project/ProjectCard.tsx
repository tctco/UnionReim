import type { Project } from "@common/types";
import {
  Body1,
  Caption1,
  Card,
  CardHeader,
  Button,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Badge,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { Edit24Regular, ArrowUpload24Regular, Delete24Regular, MoreVertical24Regular } from "@fluentui/react-icons";
import { useI18n } from "../../i18n";

const useStyles = makeStyles({
  card: {
    cursor: "pointer",
    ":hover": { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  content: { padding: "12px 16px" },
});

export function ProjectCard({
  project,
  onClick,
  onEdit,
  onExport,
  onDelete,
}: {
  project: Project;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onExport: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const styles = useStyles();
  const { t } = useI18n();

  const getStatusBadge = (status: string) => {
    const colorMap: Record<string, "warning" | "success" | "informative" | "subtle"> = {
      incomplete: "warning",
      complete: "success",
      exported: "informative",
    };
    return <Badge color={colorMap[status] || "subtle"}>{status}</Badge>;
  };

  return (
    <Card className={styles.card} onClick={onClick}>
      <CardHeader
        header={<Body1>{project.name}</Body1>}
        action={
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button appearance="subtle" icon={<MoreVertical24Regular />} onClick={(e) => e.stopPropagation()} />
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem icon={<Edit24Regular />} onClick={onEdit}>
                  {t("common.edit")}
                </MenuItem>
                <MenuItem icon={<ArrowUpload24Regular />} onClick={onExport}>
                  {t("common.export")}
                </MenuItem>
                <MenuItem icon={<Delete24Regular />} onClick={onDelete}>
                  {t("common.delete")}
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        }
      />
      <div className={styles.content}>
        <div style={{ marginBottom: 8 }}>{getStatusBadge(project.status)}</div>
        <div style={{ display: "flex", gap: 12, color: tokens.colorNeutralForeground4 }}>
          <Caption1>
            {t("projects.creator")}: {project.creator || t("common.unknown")}
          </Caption1>
          <Caption1>
            {t("projects.created")}: {new Date(project.create_time).toLocaleDateString()}
          </Caption1>
        </div>
      </div>
    </Card>
  );
}

export default ProjectCard;

