"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { useDrawerBehavior } from "@/hooks/useDrawerBehavior";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { HistoryEntry } from "@/hooks/useHistory";
import type { CalculationInput } from "@/lib/calculator/types";
import { HistoryPanel } from "./history-panel";
import { AnimatedDrawer } from "@/components/ui/animated-drawer";
import { BottomSheet } from "@/components/ui/bottom-sheet";

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  starred: HistoryEntry[];
  onLoad: (input: CalculationInput) => void;
  onToggleStar: (id: string) => void;
  onRemoveStarred: (id: string) => void;
  onClearHistory: () => void;
}

export const HistoryDrawer = memo(function HistoryDrawer({
  open,
  onClose,
  history,
  starred,
  onLoad,
  onToggleStar,
  onRemoveStarred,
  onClearHistory,
}: HistoryDrawerProps) {
  const t = useTranslations("history");
  const isMobile = useIsMobile();

  useDrawerBehavior(!isMobile && open, onClose);

  const content = (
    <>
      {/* Drawer header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
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
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l4 2" />
          </svg>
          {t("title")}
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
          history={history}
          starred={starred}
          onLoad={(loadedInput) => {
            onLoad(loadedInput);
            onClose();
          }}
          onToggleStar={onToggleStar}
          onRemoveStarred={onRemoveStarred}
          onClearHistory={onClearHistory}
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
    <AnimatedDrawer open={open} onClose={onClose} widthClass="w-[340px]" ariaLabel={t("drawerAria")}>
      {content}
    </AnimatedDrawer>
  );
});
