"use client";

import { memo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const SHORTCUTS = [
  { id: "quickCalc", keys: [`${mod}+K`] },
  { id: "saved", keys: [`${mod}+H`] },
  { id: "settings", keys: [`${mod}+,`] },
  { id: "projects", keys: [`${mod}+P`] },
  { id: "undo", keys: [`${mod}+Z`] },
  { id: "redo", keys: [`${mod}+Shift+Z`] },
  { id: "resetForm", keys: [`${mod}+Shift+R`] },
  { id: "showShortcuts", keys: ["?"] },
] as const;

export const ShortcutsModal = memo(function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  const t = useTranslations("shortcuts");

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="sc-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-[90] bg-overlay"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            key="sc-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: "spring", damping: 28, stiffness: 380, mass: 0.7 }}
            className="fixed left-1/2 top-[15vh] z-[91] w-[90vw] max-w-sm -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl"
          >
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
            </div>
            <div className="px-4 py-3 space-y-2">
              {SHORTCUTS.map((s) => (
                <div key={s.id} className="flex items-center justify-between">
                  <span className="text-sm text-foreground-secondary">{t(s.id)}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k) => (
                      <kbd
                        key={k}
                        className="rounded-md border border-border-faint bg-surface-inset px-2 py-0.5 text-xs font-medium text-muted"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border-faint px-4 py-2">
              <p className="text-center text-2xs text-muted-faint">
                Press <kbd className="rounded border border-border-faint bg-surface-inset px-1 py-0.5 text-2xs">?</kbd> or <kbd className="rounded border border-border-faint bg-surface-inset px-1 py-0.5 text-2xs">ESC</kbd> to close
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
