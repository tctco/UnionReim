import { useCallback, useEffect, useState } from "react";
import { 
  Toast, 
  ToastTitle, 
  ToastBody, 
  useToastController,
  ToastTrigger,
  Button,
  ProgressBar,
  makeStyles,
  tokens
} from "@fluentui/react-components";
import { DismissRegular } from "@fluentui/react-icons";
import { useI18n } from "../i18n";

// A single global toaster id so toasts survive route changes
export const GLOBAL_TOASTER_ID = "app-global-toaster";

// Default toast timeout in milliseconds
const DEFAULT_TOAST_TIMEOUT = 3000;

const useToastStyles = makeStyles({
  progressBar: {
    marginTop: tokens.spacingVerticalS,
  },
});

export interface ToastConfig {
  successTitle?: string;
  successMessage?: string;
  errorTitle?: string;
  errorMessage?: string;
  timeout?: number; // Custom timeout in milliseconds
}

export interface AsyncOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Success toast component with progress bar countdown
 */
interface SuccessToastProps {
  title: string;
  message?: string;
  timeout?: number;
}

/**
 * Countdown progress bar component for success toasts
 */
interface CountdownProgressBarProps {
  timeout: number;
}

function CountdownProgressBar({ timeout }: CountdownProgressBarProps) {
  const styles = useToastStyles();
  const updateInterval = 50; // Update every 50ms
  const totalSteps = timeout / updateInterval;
  const decrement = 100 / totalSteps;
  
  const [value, setValue] = useState(100);

  useEffect(() => {
    if (value > 0) {
      const timer = setTimeout(() => {
        setValue((v) => Math.max(v - decrement, 0));
      }, updateInterval);

      return () => clearTimeout(timer);
    }
  }, [value, decrement]);

  return <ProgressBar className={styles.progressBar} value={value} max={100} />;
}

function SuccessToast({ title, message, timeout = DEFAULT_TOAST_TIMEOUT }: SuccessToastProps) {
  return (
    <Toast>
      <ToastTitle
        action={
          <ToastTrigger>
            <Button 
              appearance="transparent" 
              icon={<DismissRegular />}
              size="small"
            />
          </ToastTrigger>
        }
      >
        {title}
      </ToastTitle>
      <ToastBody>
        {message}
        <CountdownProgressBar timeout={timeout + 1} />
      </ToastBody>
    </Toast>
  );
}

/**
 * Error toast component that requires manual dismissal
 */
interface ErrorToastProps {
  title: string;
  message?: string;
}

function ErrorToast({ title, message }: ErrorToastProps) {
  return (
    <Toast>
      <ToastTitle
        action={
          <ToastTrigger>
            <Button 
              appearance="transparent" 
              icon={<DismissRegular />}
              size="small"
            />
          </ToastTrigger>
        }
      >
        {title}
      </ToastTitle>
      {message && <ToastBody>{message}</ToastBody>}
    </Toast>
  );
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
  const { t } = useI18n();
  const { dispatchToast } = useToastController(GLOBAL_TOASTER_ID);

  return useCallback(
    async <T extends unknown[], R>(
      operation: (...args: T) => Promise<AsyncOperationResult<R> | R>,
      ...args: T
    ): Promise<R | null> => {
      try {
        const result = await operation(...args);

        // Structured result support
        if (result && typeof result === "object" && "success" in (result as object)) {
          const operationResult = result as AsyncOperationResult<R>;
          if (operationResult.success) {
            if (toastConfig.successTitle) {
              dispatchToast(
                <SuccessToast
                  title={toastConfig.successTitle}
                  message={toastConfig.successMessage}
                  timeout={toastConfig.timeout}
                />,
                { 
                  intent: "success",
                  timeout: toastConfig.timeout || DEFAULT_TOAST_TIMEOUT,
                },
              );
            }
            return operationResult.data || null;
          } else {
            throw new Error(operationResult.error || t("toast.operationFailed"));
          }
        }

        // Plain result success path
        if (toastConfig.successTitle) {
          dispatchToast(
            <SuccessToast
              title={toastConfig.successTitle}
              message={toastConfig.successMessage}
              timeout={toastConfig.timeout}
            />,
            { 
              intent: "success",
              timeout: toastConfig.timeout || DEFAULT_TOAST_TIMEOUT,
            },
          );
        }
        return result as R;
      } catch (error) {
        dispatchToast(
          <ErrorToast
            title={toastConfig.errorTitle || t("toast.operationFailed")}
            message={toastConfig.errorMessage || (error instanceof Error ? error.message : t("toast.unknownError"))}
          />,
          { 
            intent: "error",
            timeout: -1, // Error toasts do not auto-dismiss, require manual dismissal
          },
        );
        return null;
      }
    },
    [dispatchToast, toastConfig, t],
  );
}

/** Handy success/error defaults for Save-like operations. */
export function useSaveHandler(config?: Partial<ToastConfig>) {
  const { t } = useI18n();
  return useToastHandler({
    successTitle: t("toast.savedTitle"),
    successMessage: t("toast.savedMessage"),
    errorTitle: t("toast.saveFailedTitle"),
    errorMessage: t("toast.saveFailedMessage"),
    ...config,
  });
}

/** Handy success/error defaults for Delete-like operations. */
export function useDeleteHandler(config?: Partial<ToastConfig>) {
  const { t } = useI18n();
  return useToastHandler({
    successTitle: t("toast.deletedTitle"),
    successMessage: t("toast.deletedMessage"),
    errorTitle: t("toast.deleteFailedTitle"),
    errorMessage: t("toast.deleteFailedMessage"),
    ...config,
  });
}

/** Handy success/error defaults for Update-like operations. */
export function useUpdateHandler(config?: Partial<ToastConfig>) {
  const { t } = useI18n();
  return useToastHandler({
    successTitle: t("toast.updatedTitle"),
    successMessage: t("toast.updatedMessage"),
    errorTitle: t("toast.updateFailedTitle"),
    errorMessage: t("toast.updateFailedMessage"),
    ...config,
  });
}
