import { app } from "electron";
import { join } from "path";
import { DEFAULT_STORAGE_SUBPATH } from "@common/constants";

// Full default storage path (under Electron userData)
export const DEFAULT_STORAGE_PATH = join(app.getPath("userData"), DEFAULT_STORAGE_SUBPATH);

