"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface SavePresetModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (label: string) => void;
  defaultLabel: string;
  profileName: string;
}

export const SavePresetModal = memo(function SavePresetModal({
  open,
  onClose,
  onSave,
  defaultLabel,
  profileName,
}: SavePresetModalProps) {
  const t = useTranslations("presets");
  const [label, setLabel] = useState(defaultLabel);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync label with prop when modal opens
      setLabel(defaultLabel);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, defaultLabel]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const trimmed = label.trim();
        if (trimmed) onSave(trimmed);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, onSave, label]);

  const handleSave = useCallback(() => {
    const trimmed = label.trim();
    if (trimmed) onSave(trimmed);
  }, [label, onSave]);

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  const trimmedLabel = label.trim();
  const canSave = trimmedLabel.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="sp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[85] bg-overlay"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />
          <motion.div
            key="sp-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t("modalTitle")}
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: "spring", damping: 28, stiffness: 380, mass: 0.7 }}
            className="fixed left-1/2 top-[20vh] z-[86] w-[90vw] max-w-sm -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">{t("modalTitle")}</h2>
              <p className="mt-1 text-xs text-muted">
                {t("modalContext", { profile: profileName })}
              </p>
            </div>
            <div className="px-4 py-3">
              <input
                ref={inputRef}
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t("modalPlaceholder")}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-faint outline-none transition-colors focus:border-blue-border focus:ring-2 focus:ring-blue-surface"
                aria-label={t("modalPlaceholder")}
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-border-faint px-4 py-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border-faint bg-surface px-3 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:border-border hover:bg-surface-raised"
              >
                {t("modalCancel")}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="rounded-lg border border-blue-border bg-blue-surface px-3 py-2 text-sm font-semibold text-blue-text transition-colors hover:bg-blue-surface/80 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-surface"
              >
                {t("modalSave")}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
