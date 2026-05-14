"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import type { AppTabId } from "@/lib/app-shell";

interface Props {
  currentTab: AppTabId;
  contextLabel?: string | null;
  onOpenQuickCalc: () => void;
  onReset: () => void;
}

/**
 * D1 "Workstation" top bar shown above the desktop main content.
 * Page title on the left, optional context chip, ⌘K search, and a
 * primary "New" action. Mirrors the desktop D1 mock from the
 * numpad-native handoff.
 */
export const DesktopWorkstationTopbar = memo(function DesktopWorkstationTopbar({
  currentTab,
  contextLabel,
  onOpenQuickCalc,
  onReset,
}: Props) {
  const t = useTranslations();
  const title = t(`tabs.${currentTab}`);

  return (
    <div className="hidden h-14 items-center justify-between gap-3 border-b border-border-faint px-4 lg:flex">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate text-lg font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {contextLabel && currentTab === "calculator" && (
          <span className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-faint">
            {contextLabel}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenQuickCalc}
          className="flex h-9 w-[240px] items-center gap-2 rounded-xl border border-border bg-surface px-3 text-xs text-muted-faint transition-colors hover:border-accent-border hover:text-foreground-secondary"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <span className="flex-1 text-left">{t("workstation.searchHint")}</span>
          <kbd className="inline-flex h-5 items-center rounded-md border border-border bg-surface-raised px-1.5 text-2xs font-semibold text-muted-faint">
            ⌘K
          </kbd>
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-foreground px-3 text-xs font-semibold text-background shadow-[0_10px_24px_rgba(20,18,15,0.18)] active:bg-foreground/90"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t("workstation.new")}
        </button>
      </div>
    </div>
  );
});
