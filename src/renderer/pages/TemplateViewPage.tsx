import {
    Body1,
    Button,
    Caption1,
    Card,
    makeStyles,
    Spinner,
    Title3,
    tokens,
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableHeaderCell,
    TableRow,
    Badge,
} from "@fluentui/react-components";
import { Edit24Regular } from "@fluentui/react-icons";
import { useNavigate, useParams } from "react-router";
import { useTemplate } from "../hooks/useTemplates";

const useStyles = makeStyles({
    container: {
        padding: "24px",
        maxWidth: "1000px",
        margin: "0 auto",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px",
    },
    section: {
        marginBottom: "24px",
        padding: "16px",
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusMedium,
    },
});

export function TemplateViewPage() {
    const styles = useStyles();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const templateId = parseInt(id || "0");

    const { template, loading } = useTemplate(templateId);

    if (loading || !template) {
        return (
            <div className={styles.container}>
                <div style={{ textAlign: "center", padding: "64px" }}>
                    <Spinner size="large" label="Loading template..." />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Title3>{template.name}</Title3>
                <Button
                    appearance="primary"
                    icon={<Edit24Regular />}
                    onClick={() => navigate(`/templates/${templateId}/edit`)}
                >
                    Edit Template
                </Button>
            </div>
            {template.description && (
                <Caption1 style={{ color: tokens.colorNeutralForeground3, marginBottom: "24px" }}>
                    {template.description}
                </Caption1>
            )}

            <div className={styles.section}>
                <Body1 style={{ fontWeight: tokens.fontWeightSemibold, marginBottom: "16px" }}>
                    Template Items ({template.items.length})
                </Body1>

                {template.items.length === 0 ? (
                    <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                        No items defined in this template
                    </Caption1>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHeaderCell>Item Name</TableHeaderCell>
                                <TableHeaderCell>Properties</TableHeaderCell>
                                <TableHeaderCell>Watermark Template</TableHeaderCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {template.items.map((item) => (
                                <TableRow key={item.item_id}>
                                    <TableCell>
                                        <Body1>{item.name}</Body1>
                                        {item.description && (
                                            <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                                                {item.description}
                                            </Caption1>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                            {item.is_required && <Badge color="danger">Required</Badge>}
                                            {item.needs_watermark && <Badge color="informative">Watermark</Badge>}
                                            {item.allows_multiple_files && <Badge>Multiple Files</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {item.watermark_template ? (
                                            <Caption1>{item.watermark_template}</Caption1>
                                        ) : (
                                            <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>-</Caption1>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}

