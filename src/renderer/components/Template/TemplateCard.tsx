import type { Template } from "@common/types";
import {
    Body1,
    Button,
    Caption1,
    Card,
    CardHeader,
    makeStyles,
    Menu,
    MenuItem,
    MenuList,
    MenuPopover,
    MenuTrigger,
    tokens,
} from "@fluentui/react-components";
import {
    ArrowUpload24Regular,
    Copy24Regular,
    Delete24Regular,
    Edit24Regular,
    MoreVertical24Regular,
} from "@fluentui/react-icons";

const useStyles = makeStyles({
    card: {
        width: "100%",
        cursor: "pointer",
        ":hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
        },
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    actions: {
        display: "flex",
        gap: "8px",
    },
    description: {
        marginTop: "8px",
        color: tokens.colorNeutralForeground3,
    },
    metadata: {
        marginTop: "12px",
        display: "flex",
        gap: "16px",
        color: tokens.colorNeutralForeground4,
    },
});

interface TemplateCardProps {
    template: Template;
    onView: (template: Template) => void;
    onEdit: (template: Template) => void;
    onClone: (template: Template) => void;
    onDelete: (template: Template) => void;
    onExport: (template: Template, e: React.MouseEvent) => void;
}

export function TemplateCard({ template, onView, onEdit, onClone, onDelete, onExport }: TemplateCardProps) {
    const styles = useStyles();

    const handleCardClick = () => {
        onView(template);
    };

    return (
        <Card className={styles.card} onClick={handleCardClick}>
            <CardHeader
                header={<Body1>{template.name}</Body1>}
                action={
                    <Menu>
                        <MenuTrigger disableButtonEnhancement>
                            <Button
                                appearance="subtle"
                                icon={<MoreVertical24Regular />}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </MenuTrigger>
                        <MenuPopover>
                            <MenuList>
                                <MenuItem
                                    icon={<Edit24Regular />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(template);
                                    }}
                                >
                                    Edit
                                </MenuItem>
                                <MenuItem
                                    icon={<Copy24Regular />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClone(template);
                                    }}
                                >
                                    Clone
                                </MenuItem>
                                <MenuItem
                                    icon={<ArrowUpload24Regular />}
                                    onClick={(e) => onExport(template, e)}
                                >
                                    Export
                                </MenuItem>
                                <MenuItem
                                    icon={<Delete24Regular />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(template);
                                    }}
                                >
                                    Delete
                                </MenuItem>
                            </MenuList>
                        </MenuPopover>
                    </Menu>
                }
            />
            {template.description && (
                <div className={styles.description}>
                    <Caption1>{template.description}</Caption1>
                </div>
            )}
            <div className={styles.metadata}>
                <Caption1>
                    Created: {new Date(template.create_time).toLocaleDateString()}
                </Caption1>
                {template.creator && (
                    <Caption1>Creator: {template.creator}</Caption1>
                )}
                {template.is_default && (
                    <Caption1 style={{ color: tokens.colorPaletteBlueForeground2 }}>
                        Default
                    </Caption1>
                )}
            </div>
        </Card>
    );
}


