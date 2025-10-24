import { app } from "electron";
import { join } from "path";

// Full default storage path (under Electron userData)
export const DEFAULT_STORAGE_PATH = join(app.getPath("userData"), "storage/projects");

