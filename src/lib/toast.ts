/**
 * Minimal toast store — no React context required.
 * Works as a plain external store; UI consumes it via useSyncExternalStore.
 */

export type ToastType = "success" | "info" | "warning" | "error";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

type Listener = () => void;

const MAX_TOASTS = 3;

const AUTO_DISMISS_MS: Record<ToastType, number> = {
  success: 3000,
  info: 3000,
  warning: 5000,
  error: 5000,
};

let _toasts: Toast[] = [];
let _listeners: Listener[] = [];
const _timers = new Map<string, ReturnType<typeof setTimeout>>();

function _notify() {
  for (const l of _listeners) l();
}

export function subscribeToasts(listener: Listener): () => void {
  _listeners = [..._listeners, listener];
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}

export function getToastsSnapshot(): readonly Toast[] {
  return _toasts;
}

function removeToast(id: string) {
  clearTimeout(_timers.get(id));
  _timers.delete(id);
  _toasts = _toasts.filter((t) => t.id !== id);
  _notify();
}

function addToast(message: string, type: ToastType): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Drop the oldest if we're at the limit.
  if (_toasts.length >= MAX_TOASTS) {
    const oldest = _toasts[0];
    clearTimeout(_timers.get(oldest.id));
    _timers.delete(oldest.id);
    _toasts = _toasts.slice(1);
  }

  _toasts = [..._toasts, { id, message, type }];
  _notify();

  const timer = setTimeout(() => removeToast(id), AUTO_DISMISS_MS[type]);
  _timers.set(id, timer);

  return id;
}

export const toast = {
  success: (message: string) => addToast(message, "success"),
  info: (message: string) => addToast(message, "info"),
  warning: (message: string) => addToast(message, "warning"),
  error: (message: string) => addToast(message, "error"),
  dismiss: removeToast,
};
