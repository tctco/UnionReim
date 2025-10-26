import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import { I18nProvider } from "./i18n";

document.addEventListener("DOMContentLoaded", () => {
    createRoot(document.getElementById("react-app") as HTMLDivElement).render(
        <HashRouter>
            <I18nProvider>
                <App />
            </I18nProvider>
        </HashRouter>,
    );
});
