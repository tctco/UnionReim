import { makeStyles, Title3, tokens } from "@fluentui/react-components";
import { SearchRow } from "../Common/SearchRow";
import type { ReactNode } from "react";

const useStyles = makeStyles({
    container: {
        padding: "24px",
        maxWidth: "1400px",
        margin: "0 auto",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px",
    },
    searchBar: {
        display: "flex",
        gap: "12px",
        marginBottom: "24px",
        alignItems: "center",
    },
    searchInput: {
        maxWidth: "400px",
    },
    error: {
        color: tokens.colorPaletteRedForeground1,
        marginBottom: "16px",
    },
});

interface ListPageLayoutProps {
    /** Page title */
    title: string;
    /** Subtitle displayed below the title */
    subtitle?: ReactNode;
    /** Action buttons on the right side of the header */
    actions?: ReactNode;
    /** Search bar configuration (if not provided, the search bar will not be displayed) */
    searchBar?: {
        value: string;
        onChange: (value: string) => void;
        onSearch?: () => void;
        placeholder: string;
        buttonText?: string;
        /** If true, search bar will be hidden but still take up space for layout consistency */
        hideButton?: boolean;
    };
    /** Error message */
    error?: string | null;
    /** Main content area */
    children: ReactNode;
}

export function ListPageLayout({ 
    title, 
    subtitle,
    actions, 
    searchBar, 
    error, 
    children 
}: ListPageLayoutProps) {
    const styles = useStyles();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <Title3>{title}</Title3>
                    {subtitle}
                </div>
                {actions && <div style={{ display: "flex", gap: "8px" }}>{actions}</div>}
            </div>

            {searchBar && (
                <SearchRow
                    value={searchBar.value}
                    onChange={searchBar.onChange}
                    onSearch={searchBar.onSearch || (() => {})}
                    placeholder={searchBar.placeholder}
                    buttonText={searchBar.buttonText || "Search"}
                    className={styles.searchBar}
                    inputClassName={styles.searchInput}
                />
            )}

            {error && <div className={styles.error}>{error}</div>}

            {children}
        </div>
    );
}

