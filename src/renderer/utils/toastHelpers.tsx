import { useCallback } from "react";
import { Toast, ToastTitle, ToastBody, useToastController } from "@fluentui/react-components";

// A single global toaster id so toasts survive route changes
export const GLOBAL_TOASTER_ID = "app-global-toaster";

export interface ToastConfig {
  successTitle?: string;
  successMessage?: string;
  errorTitle?: string;
  errorMessage?: string;
}

export interface AsyncOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * A small helper hook to wrap async operations with success/error toasts.
 *
 * Notes
 * - If the operation returns a shape like { success, data, error }, we treat it as
 *   a structured result and render success/error accordingly.
 * - Otherwise, we treat the return value as the operation result and show a success toast.
 */
export function useToastHandler(toastConfig: ToastConfig) {
  const { dispatchToast } = useToastController(GLOBAL_TOASTER_ID);

  return useCallback(
    async <T extends unknown[], R>(
      operation: (...args: T) => Promise<AsyncOperationResult<R> | R>,
      ...args: T
    ): Promise<R | null> => {
      try {
        const result = await operation(...args);

        // Structured result support
        if (result && typeof result === "object" && "success" in (result as any)) {
          const operationResult = result as AsyncOperationResult<R>;
          if (operationResult.success) {
            if (toastConfig.successTitle) {
              dispatchToast(
                <Toast>
                  <ToastTitle>{toastConfig.successTitle}</ToastTitle>
                  {toastConfig.successMessage && <ToastBody>{toastConfig.successMessage}</ToastBody>}
                </Toast>,
                { intent: "success" },
              );
            }
            return operationResult.data || null;
          } else {
            throw new Error(operationResult.error || "Operation failed");
          }
        }

        // Plain result success path
        if (toastConfig.successTitle) {
          dispatchToast(
            <Toast>
              <ToastTitle>{toastConfig.successTitle}</ToastTitle>
              {toastConfig.successMessage && <ToastBody>{toastConfig.successMessage}</ToastBody>}
            </Toast>,
            { intent: "success" },
          );
        }
        return result as R;
      } catch (error) {
        dispatchToast(
          <Toast>
            <ToastTitle>{toastConfig.errorTitle || "Operation failed"}</ToastTitle>
            <ToastBody>{toastConfig.errorMessage || (error instanceof Error ? error.message : "Unknown error")}</ToastBody>
          </Toast>,
          { intent: "error" },
        );
        return null;
      }
    },
    [dispatchToast, toastConfig],
  );
}

/** Handy success/error defaults for Save-like operations. */
export function useSaveHandler(config?: Partial<ToastConfig>) {
  return useToastHandler({
    successTitle: "Saved",
    successMessage: "Changes saved successfully",
    errorTitle: "Save failed",
    errorMessage: "Unable to save changes",
    ...config,
  });
}

/** Handy success/error defaults for Delete-like operations. */
export function useDeleteHandler(config?: Partial<ToastConfig>) {
  return useToastHandler({
    successTitle: "Deleted",
    successMessage: "Item deleted successfully",
    errorTitle: "Delete failed",
    errorMessage: "Unable to delete item",
    ...config,
  });
}

/** Handy success/error defaults for Update-like operations. */
export function useUpdateHandler(config?: Partial<ToastConfig>) {
  return useToastHandler({
    successTitle: "Updated",
    successMessage: "Changes updated successfully",
    errorTitle: "Update failed",
    errorMessage: "Unable to update changes",
    ...config,
  });
}
