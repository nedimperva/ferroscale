"use client";

import { memo, useEffect } from "react";
import type { HistoryEntry } from "@/hooks/useHistory";
import type { CalculationInput } from "@/lib/calculator/types";
import { HistoryPanel } from "./history-panel";

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
  /* Lock body scroll when open */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  /* Close on Escape key */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-overlay transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        aria-label="History drawer"
        className={`fixed inset-y-0 right-0 z-50 flex w-[340px] max-w-[90vw] flex-col bg-surface-raised shadow-xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
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
            History
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
            aria-label="Close history"
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
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
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
      </aside>
    </>
  );
});
