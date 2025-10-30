import { BrowserWindow, app, ipcMain, nativeTheme, protocol, type IpcMainEvent } from "electron";
import { join } from "path";
import { SettingsService } from "./services/SettingsService";
import { registerIpcHandlers } from "./ipc/handlers";
import { DEFAULT_STORAGE_PATH } from "./electronConfigs";
import { join as pathJoin, normalize as pathNormalize } from "path";

// Register custom protocol privileges before app ready
protocol.registerSchemesAsPrivileged([
    {
        scheme: "reimbursement",
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            corsEnabled: true,
            stream: true,
        },
    },
]);

const createBrowserWindow = (): BrowserWindow => {
    const preloadScriptFilePath = join(__dirname, "..", "dist-preload", "index.js");

    return new BrowserWindow({
        autoHideMenuBar: true,
        // backgroundMaterial: "mica", // only available on Win11
        // vibrancy: "header",
        backgroundColor: "#ffffff", // required for Win10
        width: 1280,
        height: 800,
        webPreferences: {
            preload: preloadScriptFilePath,
        },
        icon: join(__dirname, "..", "build", "logo-img.png"),
    });
};

const loadFileOrUrl = (browserWindow: BrowserWindow) => {
    if (process.env.VITE_DEV_SERVER_URL) {
        browserWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        browserWindow.loadFile(join(__dirname, "..", "dist-renderer", "index.html"));
    }
};

const registerIpcEventListeners = () => {
    ipcMain.on("themeShouldUseDarkColors", (event: IpcMainEvent) => {
        event.returnValue = nativeTheme.shouldUseDarkColors;
    });
};

const registerNativeThemeEventListeners = (allBrowserWindows: BrowserWindow[]) => {
    nativeTheme.addListener("updated", () => {
        for (const browserWindow of allBrowserWindows) {
            browserWindow.webContents.send("nativeThemeChanged");
        }
    });
};

(async () => {
    await app.whenReady();
    // Register reimbursement:// protocol to serve files from app storage
    const settingsService = new SettingsService();
    protocol.registerFileProtocol("reimbursement", (request, callback) => {
        try {
            const storageRoot = pathJoin(settingsService.getDefaultStoragePath() || DEFAULT_STORAGE_PATH);
            const url = new URL(request.url);
            const host = url.hostname || url.host || "";
            const pathname = url.pathname || "/";

            let rel: string | null = null;
            // Form 1: reimbursement://attachments/<rel>
            if (host === "attachments") {
                rel = decodeURIComponent(pathname.replace(/^\//, ""));
            }
            // Form 2: reimbursement:///attachments/<rel>
            const prefix = "/attachments/";
            if (!rel && pathname.startsWith(prefix)) {
                rel = decodeURIComponent(pathname.slice(prefix.length));
            }
            if (!rel || rel.length === 0) {
                return callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND
            }
            // Relative path under storage root
            // Prevent path traversal
            const resolved = pathNormalize(pathJoin(storageRoot, rel));
            if (!resolved.startsWith(storageRoot)) {
                return callback({ error: -10 }); // net::ERR_ACCESS_DENIED
            }
            callback({ path: resolved });
        } catch {
            callback({ error: -2 }); // net::FAILED
        }
    });
    const mainWindow = createBrowserWindow();
    loadFileOrUrl(mainWindow);
    registerIpcEventListeners();
    registerIpcHandlers(); // Register all API handlers
    registerNativeThemeEventListeners(BrowserWindow.getAllWindows());
})();
