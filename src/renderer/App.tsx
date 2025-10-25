import {
    FluentProvider,
    webDarkTheme,
    webLightTheme,
    type Theme,
} from "@fluentui/react-components";
import { useEffect, useState } from "react";
import type { AppSettings } from "@common/types";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/Layout/AppLayout";
import { ProjectEditorPage } from "./pages/ProjectEditorPage";
import { ProjectListPage } from "./pages/ProjectListPage";
import { ProjectPreviewPage } from "./pages/ProjectPreviewPage";
import { PrintPreviewPage } from "./pages/PrintPreviewPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TemplateEditorPage } from "./pages/TemplateEditorPage";
import { TemplateListPage } from "./pages/TemplateListPage";
import { TemplateViewPage } from "./pages/TemplateViewPage";
import { DocumentListPage } from "./pages/DocumentListPage";
import { DocumentEditorPage } from "./pages/DocumentEditorPage";
// import { ProjectDocumentEditorPage } from "./pages/ProjectDocumentEditorPage";

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
            <AppLayout>
                <Routes>
                    <Route path="/" element={<Navigate to="/projects" replace />} />
                    <Route path="/templates" element={<TemplateListPage />} />
                    <Route path="/templates/new" element={<TemplateEditorPage />} />
                    <Route path="/templates/:id" element={<TemplateViewPage />} />
                    <Route path="/templates/:id/edit" element={<TemplateEditorPage />} />
                    <Route path="/documents" element={<DocumentListPage />} />
                    <Route path="/documents/new" element={<DocumentEditorPage />} />
                    <Route path="/documents/:id" element={<DocumentEditorPage />} />
                    <Route path="/projects" element={<ProjectListPage />} />
                    <Route path="/projects/new" element={<ProjectEditorPage />} />
                    <Route path="/projects/:id" element={<ProjectPreviewPage />} />
                    <Route path="/projects/:id/print" element={<PrintPreviewPage />} />
                    <Route path="/projects/:id/edit" element={<ProjectEditorPage />} />
                    {/* <Route path="/projects/:pid/documents/:pdid/edit" element={<ProjectDocumentEditorPage />} /> */}
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/templates" replace />} />
                </Routes>
            </AppLayout>
        </FluentProvider>
    );
};
