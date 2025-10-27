import { createRoot } from "react-dom/client";
import { RouterProvider, createHashRouter, Navigate } from "react-router-dom";
import { App } from "./App";
import { I18nProvider } from "./i18n";
import { TemplateListPage } from "./pages/TemplateListPage";
import { TemplateEditorPage } from "./pages/TemplateEditorPage";
import { TemplateViewPage } from "./pages/TemplateViewPage";
import { DocumentListPage } from "./pages/DocumentListPage";
import { DocumentEditorPage } from "./pages/DocumentEditorPage";
import { ProjectListPage } from "./pages/ProjectListPage";
import { ProjectEditorPage } from "./pages/ProjectEditorPage";
import { ProjectPreviewPage } from "./pages/ProjectPreviewPage";
import { PrintPreviewPage } from "./pages/PrintPreviewPage";
import { SettingsPage } from "./pages/SettingsPage";

document.addEventListener("DOMContentLoaded", () => {
    const router = createHashRouter([
        {
            path: "/",
            element: <App />,
            children: [
                { index: true, element: <Navigate to="/projects" replace /> },
                { path: "/templates", element: <TemplateListPage /> },
                { path: "/templates/new", element: <TemplateEditorPage /> },
                { path: "/templates/:id", element: <TemplateViewPage /> },
                { path: "/templates/:id/edit", element: <TemplateEditorPage /> },
                { path: "/documents", element: <DocumentListPage /> },
                { path: "/documents/new", element: <DocumentEditorPage /> },
                { path: "/documents/:id", element: <DocumentEditorPage /> },
                { path: "/projects", element: <ProjectListPage /> },
                { path: "/projects/new", element: <ProjectEditorPage /> },
                { path: "/projects/:id", element: <ProjectPreviewPage /> },
                { path: "/projects/:id/print", element: <PrintPreviewPage /> },
                { path: "/projects/:id/edit", element: <ProjectEditorPage /> },
                { path: "/settings", element: <SettingsPage /> },
                { path: "*", element: <Navigate to="/templates" replace /> },
            ],
        },
    ]);
    createRoot(document.getElementById("react-app") as HTMLDivElement).render(
        <I18nProvider>
            <RouterProvider router={router} />
        </I18nProvider>,
    );
});
