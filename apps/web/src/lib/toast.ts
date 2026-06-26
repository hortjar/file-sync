import { toast as sonnerToast } from "sonner";

import { type NotificationType, recordNotification } from "../stores/notifications";

type ToastFn = (message: unknown, options?: { description?: unknown }) => string | number;

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asDescription(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Wrap a sonner toast fn so every call is also recorded in the notification history. */
function wrap(type: NotificationType, fn: ToastFn): ToastFn {
  return (message, options) => {
    recordNotification({
      type,
      title: asText(message),
      description: asDescription(options?.description),
    });
    return fn(message, options);
  };
}

/**
 * Drop-in replacement for sonner's `toast`. Records every toast into
 * `notificationsStore` (for the bell/history page) then forwards to sonner.
 */
export const toast = Object.assign(wrap("message", sonnerToast as unknown as ToastFn), {
  success: wrap("success", sonnerToast.success as ToastFn),
  error: wrap("error", sonnerToast.error as ToastFn),
  info: wrap("info", sonnerToast.info as ToastFn),
  warning: wrap("warning", sonnerToast.warning as ToastFn),
  message: sonnerToast.message,
  loading: sonnerToast.loading,
  dismiss: sonnerToast.dismiss,
});
