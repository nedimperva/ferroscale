"use client";

import { memo } from "react";
import { Drawer } from "vaul";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { triggerHaptic } from "@/lib/haptics";

interface ResultActionsSheetProps {
  open: boolean;
  onClose: () => void;
  /* Compare */
  canCompare: boolean;
  isInCompare: boolean;
  compareCount: number;
  maxCompare: number;
  onCompare: () => void;
  /* Save */
  isSaved: boolean;
  onSave: () => void;
  onRemoveSaved: () => void;
  /* Project */
  hasProjects: boolean;
  onAddToProject: () => void;
}

export const ResultActionsSheet = memo(function ResultActionsSheet({
  open,
  onClose,
  canCompare,
  isInCompare,
  compareCount,
  maxCompare,
  onCompare,
  isSaved,
  onSave,
  onRemoveSaved,
  hasProjects,
  onAddToProject,
}: ResultActionsSheetProps) {
  const t = useTranslations("result");

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          triggerHaptic("light");
          onClose();
        }
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[80] bg-overlay" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-[90] flex flex-col rounded-t-2xl bg-surface shadow-xl outline-none lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="h-1.5 w-10 rounded-full bg-border-strong" />
          </div>

          <Drawer.Title className="sr-only">{t("actionsTitle")}</Drawer.Title>

          {/* Action list */}
          <div className="flex flex-col gap-2 px-4 pb-4">
            {/* Compare */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onCompare();
                onClose();
              }}
              disabled={!canCompare && !isInCompare}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium transition-colors ${
                isInCompare
                  ? "border-blue-border bg-blue-surface text-blue-text"
                  : canCompare
                    ? "border-blue-border bg-blue-surface/70 text-blue-text hover:bg-blue-surface"
                    : "cursor-not-allowed border-border-faint text-muted-faint"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 shrink-0"
              >
                <rect x="3" y="3" width="7" height="18" rx="1" />
                <rect x="14" y="3" width="7" height="18" rx="1" />
              </svg>
              <span className="flex-1 text-left">
                {isInCompare
                  ? t("inCompareCount", { count: compareCount, max: maxCompare })
                  : canCompare
                    ? t("addToCompare")
                    : t("compareFull", { max: maxCompare })}
              </span>
            </button>

            {/* Save / Saved */}
            {isSaved ? (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onRemoveSaved();
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-accent-border bg-accent-surface px-4 py-3.5 text-sm font-medium text-accent transition-colors hover:bg-accent-surface/80"
              >
                <motion.svg
                  key="saved-icon"
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.25 }}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5 shrink-0"
                >
                  <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </motion.svg>
                <span className="flex-1 text-left">{t("savedRemove")}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("success");
                  onSave();
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3.5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-raised"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 shrink-0"
                >
                  <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
                <span className="flex-1 text-left">{t("save")}</span>
              </button>
            )}

            {/* Add to Project */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onAddToProject();
                onClose();
              }}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium transition-colors ${
                hasProjects
                  ? "border-purple-border bg-purple-surface text-purple-text hover:bg-purple-surface"
                  : "border-border text-foreground-secondary hover:bg-surface-raised"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 shrink-0"
              >
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
              </svg>
              <span className="flex-1 text-left">{t("project")}</span>
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
});
