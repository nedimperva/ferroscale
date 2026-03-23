"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { useDrawerBehavior } from "@/hooks/useDrawerBehavior";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { SavedEntry } from "@/hooks/useSaved";
import type { CalculationInput } from "@/lib/calculator/types";
import { HistoryPanel } from "./history-panel";
import { AnimatedDrawer } from "@/components/ui/animated-drawer";
import { BottomSheet } from "@/components/ui/bottom-sheet";

interface SavedDrawerProps {
  open: boolean;
  onClose: () => void;
  saved: SavedEntry[];
  onLoad: (input: CalculationInput) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: { name?: string; notes?: string }) => void;
  weightAsMain?: boolean;
}

export const HistoryDrawer = memo(function HistoryDrawer({
  open,
  onClose,
  saved,
  onLoad,
  onRemove,
  onUpdate,
  weightAsMain = false,
}: SavedDrawerProps) {
  const t = useTranslations("saved");
  const isMobile = useIsMobile();

  useDrawerBehavior(!isMobile && open, onClose);

  const content = (
    <>
      {/* Drawer header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {/* Bookmark icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
          {t("title")}
          {saved.length > 0 && (
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-surface px-1 text-[10px] font-bold text-accent">
              {saved.length}
            </span>
          )}
        </h2>
        {!isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
            aria-label={t("close")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scroll-native safe-area-bottom p-4">
        <HistoryPanel
          saved={saved}
          onLoad={(loadedInput) => {
            onLoad(loadedInput);
            onClose();
          }}
          onRemove={onRemove}
          onUpdate={onUpdate}
          layout={isMobile ? "mobile" : "drawer"}
          weightAsMain={weightAsMain}
        />
      </div>
    </>
  );

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()} title={t("title")}>
        {content}
      </BottomSheet>
    );
  }

  return (
    <AnimatedDrawer open={open} onClose={onClose} widthClass="w-[400px]" ariaLabel={t("drawerAria")}>
      {content}
    </AnimatedDrawer>
  );
});
