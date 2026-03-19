"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import type { SavedEntry } from "@/hooks/useSaved";
import type { CalculationInput } from "@/lib/calculator/types";
import { HistoryPanel } from "./history-panel";

interface DesktopThirdColumnProps {
  saved: SavedEntry[];
  onLoad: (input: CalculationInput) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: { name?: string; notes?: string }) => void;
}

/** Desktop-only narrow column: bookmarked calculations (same data as Saved drawer). */
export const DesktopThirdColumn = memo(function DesktopThirdColumn({
  saved,
  onLoad,
  onRemove,
  onUpdate,
}: DesktopThirdColumnProps) {
  const tSaved = useTranslations("saved");

  return (
    <section className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex shrink-0 items-center gap-2 border-b border-border-faint px-3 py-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5 text-muted"
          aria-hidden
        >
          <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
        <h2 className="text-xs font-semibold text-foreground-secondary">{tSaved("title")}</h2>
        {saved.length > 0 && (
          <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-surface px-1.5 text-[10px] font-bold text-accent">
            {saved.length}
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-native p-3">
        <HistoryPanel saved={saved} onLoad={onLoad} onRemove={onRemove} onUpdate={onUpdate} />
      </div>
    </section>
  );
});
