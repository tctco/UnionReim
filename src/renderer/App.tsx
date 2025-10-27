import {
    FluentProvider,
    webDarkTheme,
    webLightTheme,
    type Theme,
    Toaster,
} from "@fluentui/react-components";
import { useEffect, useState } from "react";
import type { AppSettings } from "@common/types";
import { Outlet } from "react-router";
import { AppLayout } from "./components/Layout/AppLayout";
import { GLOBAL_TOASTER_ID } from "./utils/toastHelpers";

const shouldUseDarkColors = (): boolean => window.ContextBridge.themeShouldUseDarkColors();

const getTheme = () => (shouldUseDarkColors() ? webDarkTheme : webLightTheme);
const getThemeBySetting = (setting?: AppSettings["theme"]): Theme => {
    if (setting === "dark") return webDarkTheme;
    if (setting === "light") return webLightTheme;
    return getTheme();
};

export const App = () => {
    const [theme, setTheme] = useState<Theme>(getTheme());
    const [themeSetting, setThemeSetting] = useState<AppSettings["theme"] | undefined>(undefined);

    useEffect(() => {
        // Load initial settings and apply theme
        (async () => {
            try {
                const resp = await window.ContextBridge.settings.get();
                if (resp.success && resp.data) {
                    setThemeSetting(resp.data.theme);
                    setTheme(getThemeBySetting(resp.data.theme));
                } else {
                    setTheme(getTheme());
                }
            } catch {
                setTheme(getTheme());
            }
        })();

        // React to OS theme changes only when app theme is set to 'system'
        window.ContextBridge.onNativeThemeChanged(() => {
            if (!themeSetting || themeSetting === "system") {
                setTheme(getTheme());
            }
        });

        // React to settings changes immediately
        window.ContextBridge.onSettingsChanged((settings) => {
            setThemeSetting(settings.theme);
            setTheme(getThemeBySetting(settings.theme));
        });
    }, [themeSetting]);

    return (
        <FluentProvider theme={theme} style={{ height: "100vh"}}>
            {/* Global toaster to persist across route changes */}
            <Toaster toasterId={GLOBAL_TOASTER_ID} />
            <AppLayout>
                <Outlet />
            </AppLayout>
        </FluentProvider>
    );
};
