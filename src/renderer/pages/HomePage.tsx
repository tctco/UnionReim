import { Body1, Button, Card, makeStyles, shorthands, Text, Title1, Title3, tokens } from "@fluentui/react-components";
import {
    ArrowRight24Regular,
    DocumentMultiple24Regular,
    DocumentText24Regular,
    Folder24Regular,
} from "@fluentui/react-icons";
import { createScope, animate, stagger, svg } from "animejs";
import { useEffect, useRef } from "react";
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
        marginBottom: "48px",
        textAlign: "center",
    },
    logo: {
        width: "100px",
        height: "auto",
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
    const rootRef = useRef<HTMLDivElement>(null);
    const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

    // Initialize logo animation on mount
    useEffect(() => {
        scopeRef.current = createScope({ root: rootRef }).add(() => {
            // Animate logo paths with staggered draw effect
            animate(svg.createDrawable('.line'), {
                draw: ['0 0', '0 1'],
                easing: "inOutQuad",
                duration: 1800,
                delay: stagger(100),
                loop: false,
            });
        });

        // Properly cleanup all anime.js instances declared inside the scope
        return () => scopeRef.current?.revert();
    }, []);

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
        <div ref={rootRef} className={styles.container}>
            <div className={styles.logoSection}>
                <svg className={styles.logo} viewBox="0 0 51.83 31.77" xmlns="http://www.w3.org/2000/svg">
                    <g stroke="currentColor" fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                    <path
                        className="line"
                        style={{ stroke: "#5fe9ad" }}
                        d="M2,23.84L22.18,3.66c2.21-2.21,5.8-2.21,8.02,0l2.78,2.78c2.21,2.21,2.21,5.8,0,8.02l-6.79,6.79"
                    />
                    <path
                        className="line"
                        style={{ stroke: "#ff6666" }}
                        d="M50.83,7.76l-20.18,20.18c-2.21,2.21-5.8,2.21-8.02,0l-2.78-2.78c-2.21-2.21-2.21-5.8,0-8.02l6.79-6.79"
                    />
                    </g>
                </svg>
                <div>
                    <p>
                        <Title1 className={styles.welcomeText}>{t("home.welcome")}</Title1>
                    </p>
                    <p>
                        <Body1 className={styles.tagline}>{t("home.tagline")}</Body1>
                    </p>
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
                                <Button appearance="transparent" icon={<ArrowRight24Regular />} iconPosition="after">
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
