import { Button, Caption1, Tab, TabList, makeStyles, tokens } from "@fluentui/react-components";
import {
    DocumentMultiple24Regular,
    Folder24Regular,
    Navigation24Regular,
    Settings24Regular,
} from "@fluentui/react-icons";
import { useState } from "react";
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
        width: "240px",
    },
    sidebarCollapsed: {
        width: "60px",
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

    const getCurrentTab = () => {
        if (location.pathname.startsWith("/projects")) return "projects";
        if (location.pathname.startsWith("/settings")) return "settings";
        return "templates";
    };

    const currentTab = getCurrentTab();

    const handleTabSelect = (value: string) => {
        if (value === "templates") {
            navigate("/templates");
        } else if (value === "projects") {
            navigate("/projects");
        } else if (value === "settings") {
            navigate("/settings");
        }
    };

    return (
        <div className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : styles.sidebarExpanded}`}>
            <div className={styles.header}>
                {!isCollapsed && <div className={styles.title}>Reimbursement</div>}
                <Button
                    appearance="subtle"
                    icon={<Navigation24Regular />}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                />
            </div>

            {!isCollapsed && (
                <Caption1 style={{ marginBottom: "8px", overflow: "hidden", whiteSpace: "nowrap" }}>
                    Manage your reimbursement materials
                </Caption1>
            )}

            <TabList
                selectedValue={currentTab}
                onTabSelect={(_, data) => handleTabSelect(data.value as string)}
                vertical
                className={styles.tabList}
            >
                <Tab value="templates" icon={<DocumentMultiple24Regular />}>
                    {!isCollapsed && "Templates"}
                </Tab>
                <Tab value="projects" icon={<Folder24Regular />}>
                    {!isCollapsed && "Projects"}
                </Tab>
                <Tab value="settings" icon={<Settings24Regular />}>
                    {!isCollapsed && "Settings"}
                </Tab>
            </TabList>
        </div>
    );
}
