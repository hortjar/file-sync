import { toast as sonnerToast } from "sonner";

import { type NotificationType, recordNotification } from "../stores/notifications";

type ToastFunction = (message: unknown, options?: { description?: unknown }) => string | number;

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asDescription(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Wrap a sonner toast fn so every call is also recorded in the notification history. */
function wrap(type: NotificationType, function_: ToastFunction): ToastFunction {
  return (message, options) => {
    recordNotification({
      type,
      title: asText(message),
      description: asDescription(options?.description),
    });
    return function_(message, options);
  };
}

/**
 * Drop-in replacement for sonner's `toast`. Records every toast into
 * `notificationsStore` (for the bell/history page) then forwards to sonner.
 */
export const toast = Object.assign(wrap("message", sonnerToast as unknown as ToastFunction), {
  success: wrap("success", sonnerToast.success as ToastFunction),
  error: wrap("error", sonnerToast.error as ToastFunction),
  info: wrap("info", sonnerToast.info as ToastFunction),
  warning: wrap("warning", sonnerToast.warning as ToastFunction),
  message: sonnerToast.message,
  loading: sonnerToast.loading,
  dismiss: sonnerToast.dismiss,
});
