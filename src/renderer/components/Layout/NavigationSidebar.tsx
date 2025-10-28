import { Button, Caption1, Tab, TabList, makeStyles, tokens } from "@fluentui/react-components";
import {
    DocumentMultiple24Regular,
    Folder24Regular,
    Navigation24Regular,
    Settings24Regular,
    Home24Regular,
} from "@fluentui/react-icons";
import { useState } from "react";
import { useI18n } from "../../i18n";
import { useLocation, useNavigate } from "react-router";

const useStyles = makeStyles({
    sidebar: {
        display: "flex",
        flexDirection: "column",
        backgroundColor: tokens.colorNeutralBackground2,
        borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
        padding: "16px",
        gap: "8px",
        transition: "width 0.3s ease",
    },
    sidebarExpanded: {
        width: "200px",
    },
    sidebarCollapsed: {
        width: "38px",
        padding: "16px 8px",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "8px",
    },
    title: {
        padding: "8px 12px",
        fontWeight: tokens.fontWeightSemibold,
        fontSize: tokens.fontSizeBase400,
    },
    tabList: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
    },
});

export function NavigationSidebar() {
    const styles = useStyles();
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { t } = useI18n();

    const getCurrentTab = () => {
        if (location.pathname === "/" || location.pathname === "/home") return "home";
        if (location.pathname.startsWith("/projects")) return "projects";
        if (location.pathname.startsWith("/documents")) return "documents";
        if (location.pathname.startsWith("/templates")) return "templates";
        if (location.pathname.startsWith("/settings")) return "settings";
        return "home";
    };

    const currentTab = getCurrentTab();

    const handleTabSelect = (value: string) => {
        if (value === "home") {
            navigate("/home");
        } else if (value === "templates") {
            navigate("/templates");
        } else if (value === "projects") {
            navigate("/projects");
        } else if (value === "documents") {
            navigate("/documents");
        } else if (value === "settings") {
            navigate("/settings");
        }
    };

    return (
        <div className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : styles.sidebarExpanded}`}>
            <div className={styles.header}>
                {!isCollapsed && <div className={styles.title}>{t("app.title")}</div>}
                <Button
                    appearance="subtle"
                    icon={<Navigation24Regular />}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
                />
            </div>

            {!isCollapsed && (
                <Caption1 style={{ marginBottom: "16px", overflow: "hidden", whiteSpace: "nowrap"}}>
                    {t("sidebar.tagline")}
                </Caption1>
            )}

            <TabList
                selectedValue={currentTab}
                onTabSelect={(_, data) => handleTabSelect(data.value as string)}
                vertical
                className={styles.tabList}
            >
                <Tab value="home" icon={<Home24Regular />}>
                    {!isCollapsed && t("nav.home")}
                </Tab>
                <Tab value="projects" icon={<Folder24Regular />}>
                    {!isCollapsed && t("nav.projects")}
                </Tab>
                <Tab value="templates" icon={<DocumentMultiple24Regular />}>
                    {!isCollapsed && t("nav.templates")}
                </Tab>
                <Tab value="documents" icon={<DocumentMultiple24Regular />}>
                    {!isCollapsed && t("nav.documents")}
                </Tab>
                <Tab value="settings" icon={<Settings24Regular />}>
                    {!isCollapsed && t("settings.title")}
                </Tab>
            </TabList>
        </div>
    );
}
