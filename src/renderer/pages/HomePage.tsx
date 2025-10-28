import {
    Card,
    Text,
    Button,
    makeStyles,
    tokens,
    shorthands,
    Body1,
    Title1,
    Title3,
} from "@fluentui/react-components";
import {
    Folder24Regular,
    DocumentMultiple24Regular,
    DocumentText24Regular,
    ArrowRight24Regular,
} from "@fluentui/react-icons";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";

const useStyles = makeStyles({
    container: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: tokens.colorNeutralBackground1,
        height: "100%",
        marginLeft: "32px",
        marginRight: "32px",
    },
    logoSection: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        ...shorthands.gap("24px"),
        marginBottom: "48px",
        textAlign: "center",
    },
    logo: {
        maxWidth: "280px",
        height: "auto",
        ...shorthands.transition("opacity", "0.3s", "ease"),
        opacity: 1,
    },
    welcomeText: {
        fontSize: "32px",
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        marginBottom: "8px",
    },
    tagline: {
        fontSize: "18px",
        color: tokens.colorNeutralForeground3,
        maxWidth: "500px",
        lineHeight: "1.6",
    },
    cardsContainer: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        ...shorthands.gap("12px"),
        width: "100%",
        maxWidth: "1200px",
        marginBottom: "40px",
    },
    card: {
        backgroundColor: tokens.colorNeutralBackground1,
        ...shorthands.borderRadius(tokens.borderRadiusXLarge),
        boxShadow: tokens.shadow8,
        ...shorthands.transition("all", "0.2s", "ease"),
        cursor: "pointer",
        height: "100%",
        ":hover": {
            boxShadow: tokens.shadow16,
            transform: "translateY(-4px)",
        },
    },
    cardContent: {
        display: "flex",
        flexDirection: "column",
        ...shorthands.gap("16px"),
        ...shorthands.padding("24px"),
        height: "100%",
    },
    cardIcon: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "56px",
        height: "56px",
        ...shorthands.borderRadius(tokens.borderRadiusCircular),
        backgroundColor: tokens.colorBrandBackground,
        color: tokens.colorNeutralForegroundOnBrand,
    },
    cardTitle: {
        fontSize: tokens.fontSizeBase500,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },
    cardDescription: {
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground3,
        lineHeight: "1.5",
        flexGrow: 1,
    },
    cardFooter: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        ...shorthands.gap("8px"),
        marginTop: "auto",
    },
    statsSection: {
        display: "flex",
        ...shorthands.gap("32px"),
        ...shorthands.padding("32px"),
        backgroundColor: tokens.colorNeutralBackground2,
        ...shorthands.borderRadius(tokens.borderRadiusLarge),
        width: "100%",
        maxWidth: "1200px",
    },
    statItem: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        ...shorthands.gap("8px"),
        flex: 1,
    },
    statValue: {
        fontSize: "36px",
        fontWeight: tokens.fontWeightBold,
        color: tokens.colorBrandForeground1,
    },
    statLabel: {
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground3,
    },
});

interface QuickLinkCard {
    title: string;
    description: string;
    icon: JSX.Element;
    path: string;
    color: string;
}

export function HomePage() {
    const styles = useStyles();
    const navigate = useNavigate();
    const { t } = useI18n();


    const quickLinks: QuickLinkCard[] = [
        {
            title: t("home.cards.projects.title"),
            description: t("home.cards.projects.description"),
            icon: <Folder24Regular />,
            path: "/projects",
            color: tokens.colorPaletteBlueBorderActive,
        },
        {
            title: t("home.cards.templates.title"),
            description: t("home.cards.templates.description"),
            icon: <DocumentMultiple24Regular />,
            path: "/templates",
            color: tokens.colorPalettePurpleBorderActive,
        },
        {
            title: t("home.cards.documents.title"),
            description: t("home.cards.documents.description"),
            icon: <DocumentText24Regular />,
            path: "/documents",
            color: tokens.colorPaletteGreenBorderActive,
        },
    ];

    return (
        <div className={styles.container}>
            <div className={styles.logoSection}>
                <div>
                    <p><Title1 className={styles.welcomeText}>{t("home.welcome")}</Title1></p>
                    <p><Body1 className={styles.tagline}>{t("home.tagline")}</Body1></p>
                </div>
            </div>

            <div className={styles.cardsContainer}>
                {quickLinks.map((link) => (
                    <Card key={link.path} className={styles.card} onClick={() => navigate(link.path)}>
                        <div className={styles.cardContent}>
                            <div className={styles.cardIcon} style={{ backgroundColor: link.color }}>
                                {link.icon}
                            </div>
                            <Title3 className={styles.cardTitle}>{link.title}</Title3>
                            <Text className={styles.cardDescription}>{link.description}</Text>
                            <div className={styles.cardFooter}>
                                <Button
                                    appearance="transparent"
                                    icon={<ArrowRight24Regular />}
                                    iconPosition="after"
                                >
                                    {t("home.cards.goTo")}
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

