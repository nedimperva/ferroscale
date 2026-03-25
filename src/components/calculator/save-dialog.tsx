"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useDrawerBehavior } from "@/hooks/useDrawerBehavior";
import { BottomSheet } from "@/components/ui/bottom-sheet";

interface SaveDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, notes?: string, tags?: string[]) => void;
  defaultName: string;
}

function SaveDialogFields({
  open,
  onClose,
  onSave,
  defaultName,
}: SaveDialogProps) {
  const t = useTranslations("saveDialog");
  const [name, setName] = useState(defaultName);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with prop on open
      setName(defaultName);
      setNotes("");
      setTags("");
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [open, defaultName]);

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const normalizedTags = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8);
    onSave(trimmedName, notes.trim() || undefined, normalizedTags.length > 0 ? normalizedTags : undefined);
  }, [name, notes, onSave, tags]);

  const canSave = name.trim().length > 0;

  return (
    <>
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
        <p className="mt-0.5 text-xs text-muted">{t("subtitle")}</p>
      </div>

      {/* Fields */}
      <div className="space-y-3 px-4 py-3">
        <div>
          <label
            htmlFor="save-dialog-name"
            className="mb-1.5 block text-xs font-medium text-foreground-secondary"
          >
            {t("labelName")}
          </label>
          <input
            ref={inputRef}
            id="save-dialog-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("placeholderName")}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-faint outline-none transition-colors focus:border-blue-border focus:ring-2 focus:ring-blue-surface"
            maxLength={80}
          />
        </div>
        <div>
          <label
            htmlFor="save-dialog-notes"
            className="mb-1.5 block text-xs font-medium text-foreground-secondary"
          >
            {t("labelNotes")}
            <span className="ml-1 text-muted-faint">{t("optional")}</span>
          </label>
          <textarea
            id="save-dialog-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("placeholderNotes")}
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-faint outline-none transition-colors focus:border-blue-border focus:ring-2 focus:ring-blue-surface"
            maxLength={200}
          />
        </div>
        <div>
          <label
            htmlFor="save-dialog-tags"
            className="mb-1.5 block text-xs font-medium text-foreground-secondary"
          >
            {t("labelTags")}
            <span className="ml-1 text-muted-faint">{t("optional")}</span>
          </label>
          <input
            id="save-dialog-tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={t("placeholderTags")}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-faint outline-none transition-colors focus:border-blue-border focus:ring-2 focus:ring-blue-surface"
            maxLength={140}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 border-t border-border-faint px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border-faint bg-surface px-3 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:border-border hover:bg-surface-raised"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="inline-flex items-center gap-1.5 rounded-lg border border-accent-border bg-accent-surface px-3 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-3.5 w-3.5"
          >
            <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
          {t("save")}
        </button>
      </div>
    </>
  );
}

export const SaveDialog = memo(function SaveDialog(props: SaveDialogProps) {
  const { open, onClose } = props;
  const isMobile = useIsMobile();

  useDrawerBehavior(!isMobile && open, onClose);

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()} title="">
        <SaveDialogFields {...props} />
      </BottomSheet>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="sd-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-85 bg-overlay"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            key="sd-modal"
            role="dialog"
            aria-modal="true"
            aria-label=""
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: "spring", damping: 28, stiffness: 380, mass: 0.7 }}
            className="fixed left-1/2 top-[20vh] z-86 w-[90vw] max-w-sm -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SaveDialogFields {...props} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
