"use client";

import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  /** Defaults to "Confirm". */
  confirmLabel?: string;
  /** Defaults to "Cancel". */
  cancelLabel?: string;
  /** When true the confirm button uses the red destructive tone. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Branded confirm dialog — replaces window.confirm calls across the app so
 * destructive flows stay inside the cream-palette visual world. See review
 * §07 "Row menu uses native confirm".
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => confirmRef.current?.focus());
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onConfirm, onCancel]);

  const handleBackdropClick = useCallback(() => onCancel(), [onCancel]);

  const confirmTone = destructive
    ? "border-red-border bg-red-surface text-red-text hover:bg-red-surface/80"
    : "border-accent-border bg-accent-surface text-accent-text hover:bg-accent-surface/80";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="cd-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-[95] bg-overlay"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />
          <motion.div
            key="cd-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: "spring", damping: 28, stiffness: 380, mass: 0.7 }}
            className="fixed left-1/2 top-[24vh] z-[96] w-[90vw] max-w-sm -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pb-3 pt-5">
              <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
              <p className="mt-2 text-sm text-foreground-secondary">{message}</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-border-faint bg-surface px-4 py-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-border-faint bg-surface px-3 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:border-border hover:bg-surface-raised"
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={onConfirm}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${confirmTone}`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
