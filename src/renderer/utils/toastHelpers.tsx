import { useCallback } from "react";
import {
    Toast,
    ToastTitle,
    ToastBody,
    useToastController,
} from "@fluentui/react-components";

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
 * 创建一个带有toast通知的操作处理hook
 * @param toastConfig toast配置
 * @returns 包装函数
 */
export function useToastHandler(toastConfig: ToastConfig) {
    const { dispatchToast } = useToastController();
    
    return useCallback(
        async <T extends unknown[], R>(
            operation: (...args: T) => Promise<AsyncOperationResult<R> | R>,
            ...args: T
        ): Promise<R | null> => {
            try {
                const result = await operation(...args);
                
                // 检查是否是包装过的结果对象
                if (result && typeof result === 'object' && 'success' in result) {
                    const operationResult = result as AsyncOperationResult<R>;
                    if (operationResult.success) {
                        if (toastConfig.successTitle) {
                            dispatchToast(
                                <Toast>
                                    <ToastTitle>{toastConfig.successTitle}</ToastTitle>
                                    {toastConfig.successMessage && (
                                        <ToastBody>{toastConfig.successMessage}</ToastBody>
                                    )}
                                </Toast>,
                                { intent: "success" }
                            );
                        }
                        return operationResult.data || null;
                    } else {
                        throw new Error(operationResult.error || "操作失败");
                    }
                } else {
                    // 直接返回结果，显示成功toast
                    if (toastConfig.successTitle) {
                        dispatchToast(
                            <Toast>
                                <ToastTitle>{toastConfig.successTitle}</ToastTitle>
                                {toastConfig.successMessage && (
                                    <ToastBody>{toastConfig.successMessage}</ToastBody>
                                )}
                            </Toast>,
                            { intent: "success" }
                        );
                    }
                    return result as R;
                }
            } catch (error) {
                console.error("Operation failed:", error);
                dispatchToast(
                    <Toast>
                        <ToastTitle>{toastConfig.errorTitle || "操作失败"}</ToastTitle>
                        <ToastBody>
                            {toastConfig.errorMessage || 
                             (error instanceof Error ? error.message : "未知错误")}
                        </ToastBody>
                    </Toast>,
                    { intent: "error" }
                );
                return null;
            }
        },
        [dispatchToast, toastConfig]
    );
}

/**
 * 创建保存操作的toast处理hook
 * @param config toast配置
 */
export function useSaveHandler(config?: Partial<ToastConfig>) {
    return useToastHandler({
        successTitle: "保存成功",
        successMessage: "数据已成功保存",
        errorTitle: "保存失败",
        errorMessage: "无法保存数据",
        ...config,
    });
}

/**
 * 创建删除操作的toast处理hook
 * @param config toast配置
 */
export function useDeleteHandler(config?: Partial<ToastConfig>) {
    return useToastHandler({
        successTitle: "删除成功",
        successMessage: "项目已成功删除",
        errorTitle: "删除失败",
        errorMessage: "无法删除项目",
        ...config,
    });
}

/**
 * 创建更新操作的toast处理hook
 * @param config toast配置
 */
export function useUpdateHandler(config?: Partial<ToastConfig>) {
    return useToastHandler({
        successTitle: "更新成功",
        successMessage: "数据已成功更新",
        errorTitle: "更新失败",
        errorMessage: "无法更新数据",
        ...config,
    });
}
