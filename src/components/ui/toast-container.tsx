"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { subscribeToasts, getToastsSnapshot, toast as toastStore } from "@/lib/toast";
import type { Toast } from "@/lib/toast";

/* ---- Per-type styling ---- */

const STYLES: Record<Toast["type"], { wrapper: string; icon: React.ReactNode }> = {
  success: {
    wrapper: "border-green-border bg-green-surface text-green-text",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 mt-0.5">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="m9 11 3 3L22 4" />
      </svg>
    ),
  },
  info: {
    wrapper: "border-blue-border bg-blue-surface text-blue-text",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 mt-0.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    ),
  },
  warning: {
    wrapper: "border-amber-border bg-amber-surface text-amber-text",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 mt-0.5">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    ),
  },
  error: {
    wrapper: "border-red-border bg-red-surface text-red-text",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 mt-0.5">
        <circle cx="12" cy="12" r="10" />
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
      </svg>
    ),
  },
};

/* ---- Single toast card ---- */

function ToastItem({ toast }: { toast: Toast }) {
  const { wrapper, icon } = STYLES[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-medium shadow-lg ${wrapper}`}
    >
      {icon}
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        type="button"
        onClick={() => toastStore.dismiss(toast.id)}
        aria-label="Dismiss"
        className="shrink-0 opacity-50 transition-opacity hover:opacity-100"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </motion.div>
  );
}

/* ---- Container (rendered once in the layout) ---- */

const SERVER_SNAPSHOT: readonly Toast[] = [];

export function ToastContainer() {
  const toasts = useSyncExternalStore(subscribeToasts, getToastsSnapshot, () => SERVER_SNAPSHOT);

  return (
    /*
     * Top-right: toasts never overlap the sticky ResultBar, drawer footers,
     * or any action buttons regardless of screen size.
     * Always rendered so AnimatePresence can play exit animations.
     */
    <div className="fixed right-3 top-3 z-[300] flex w-72 max-w-[calc(100vw-1.5rem)] flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
