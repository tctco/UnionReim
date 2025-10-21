import type { IpcMainInvokeEvent } from "electron";

/**
 * Helper to reduce boilerplate in ipcMain.handle try/catch blocks.
 * Wrap your async/sync handler and it will return a { success, data?, error? } shape.
 *
 * - When opts.successFromBoolean = true and your function returns a boolean,
 *   the boolean determines the response.success value and no data field is included.
 */
export function respond<T>(
  fn: (...args: any[]) => Promise<T> | T,
  opts?: { successFromBoolean?: boolean },
) {
  return async (_event: IpcMainInvokeEvent, ...args: any[]) => {
    try {
      const result = await fn(...args);
      if (opts?.successFromBoolean && typeof result === "boolean") {
        return { success: result as boolean };
      }
      return { success: true, data: result as T };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  };
}

