import {
    Button,
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    DialogTrigger,
} from "@fluentui/react-components";
import { useI18n } from "../../i18n";

interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    destructive?: boolean;
    // 支持两种模式：trigger模式和受控模式
    trigger?: React.ReactElement;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function ConfirmDialog({
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
    trigger,
    open,
    onOpenChange,
    destructive = false,
}: ConfirmDialogProps) {
    const { t } = useI18n();
    const confirm = confirmText ?? t("common.confirm");
    const cancel = cancelText ?? t("common.cancel");
    const handleConfirm = () => {
        onConfirm();
        onOpenChange?.(false);
    };

    const handleCancel = () => {
        onCancel?.();
        onOpenChange?.(false);
    };

    // 受控模式：通过 open prop 控制显示
    if (open !== undefined) {
        return (
            <Dialog open={open} onOpenChange={(_, data) => onOpenChange?.(data.open)}>
                <DialogSurface>
                    <DialogBody>
                        <DialogTitle>{title}</DialogTitle>
                        <DialogContent>{message}</DialogContent>
                        <DialogActions>
                            <Button appearance="secondary" onClick={handleCancel}>
                                {cancel}
                            </Button>
                            <Button 
                                appearance={destructive ? "primary" : "primary"} 
                                onClick={handleConfirm}
                            >
                                {confirm}
                            </Button>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface>
            </Dialog>
        );
    }

    // Trigger模式：通过点击trigger元素显示
    if (!trigger) {
        console.error('ConfirmDialog: Either "trigger" or "open" prop must be provided');
        return null;
    }

    return (
        <Dialog>
            <DialogTrigger disableButtonEnhancement>{trigger}</DialogTrigger>
            <DialogSurface>
                <DialogBody>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogContent>{message}</DialogContent>
                    <DialogActions>
                        <DialogTrigger disableButtonEnhancement>
                            <Button appearance="secondary" onClick={onCancel}>
                                {cancel}
                            </Button>
                        </DialogTrigger>
                        <DialogTrigger disableButtonEnhancement>
                            <Button 
                                appearance={destructive ? "primary" : "primary"} 
                                onClick={onConfirm}
                            >
                                {confirm}
                            </Button>
                        </DialogTrigger>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
}

