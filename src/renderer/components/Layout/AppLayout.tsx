import { makeStyles, tokens } from "@fluentui/react-components";
import type { ReactNode } from "react";
import { NavigationSidebar } from "./NavigationSidebar";
import { AppBreadcrumb } from "./Breadcrumb";

const useStyles = makeStyles({
    layout: {
        display: "flex",
        height: "100vh",
        overflow: "hidden",
    },
    content: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        backgroundColor: tokens.colorNeutralBackground1,
    },
    breadcrumbContainer: {
        padding: "0 24px",
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        backgroundColor: tokens.colorNeutralBackground1,
    },
    pageContent: {
        flex: 1,
        overflow: "auto",
    },
});

interface AppLayoutProps {
    children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const styles = useStyles();

    return (
        <div className={styles.layout}>
            <NavigationSidebar />
            <div className={styles.content}>
                <div className={styles.breadcrumbContainer}>
                    <AppBreadcrumb />
                </div>
                <div className={styles.pageContent}>
                    {children}
                </div>
            </div>
        </div>
    );
}



