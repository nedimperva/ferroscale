"use client";

import { memo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useDrawerBehavior } from "@/hooks/useDrawerBehavior";
import { useIsMobile } from "@/hooks/useIsMobile";
import { AnimatedDrawer } from "@/components/ui/animated-drawer";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { CHANGELOG } from "@/lib/changelog";

interface ChangelogDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const ChangelogDrawer = memo(function ChangelogDrawer({
  open,
  onClose,
}: ChangelogDrawerProps) {
  const t = useTranslations("changelog");
  const locale = useLocale();
  const isMobile = useIsMobile();
  const isBosnian = locale === "bs";

  useDrawerBehavior(!isMobile && open, onClose);

  const entries = (
    <div className="flex-1 overflow-y-auto scroll-native safe-area-bottom">
      {CHANGELOG.map((entry, idx) => {
        const added = isBosnian ? (entry.added_bs ?? entry.added) : entry.added;
        const changed = isBosnian ? (entry.changed_bs ?? entry.changed) : entry.changed;
        const fixed = isBosnian ? (entry.fixed_bs ?? entry.fixed) : entry.fixed;

        return (
          <div key={entry.version} className={`px-4 py-4 ${idx !== CHANGELOG.length - 1 ? "border-b border-border-faint" : ""}`}>
            {/* Version header */}
            <div className="mb-3 flex items-center gap-2.5">
              <span className="rounded-md bg-surface-inset px-2 py-0.5 text-xs font-semibold text-foreground tabular-nums">
                v{entry.version}
              </span>
              <span className="text-xs text-muted">{entry.date}</span>
              {idx === 0 && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  {t("latest")}
                </span>
              )}
            </div>

            {/* Added */}
            {added && added.length > 0 && (
              <div className="mb-2">
                <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                  {t("added")}
                </span>
                <ul className="mt-1 space-y-1">
                  {added.map((item) => (
                    <li key={item} className="flex gap-2 text-xs text-foreground-secondary">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-faint" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Changed */}
            {changed && changed.length > 0 && (
              <div className="mb-2">
                <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {t("changed")}
                </span>
                <ul className="mt-1 space-y-1">
                  {changed.map((item) => (
                    <li key={item} className="flex gap-2 text-xs text-foreground-secondary">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-faint" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Fixed */}
            {fixed && fixed.length > 0 && (
              <div>
                <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                  {t("fixed")}
                </span>
                <ul className="mt-1 space-y-1">
                  {fixed.map((item) => (
                    <li key={item} className="flex gap-2 text-xs text-foreground-secondary">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-faint" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()} title={t("title")}>
        {/* No internal header — BottomSheet already renders the title */}
        {entries}
      </BottomSheet>
    );
  }

  return (
    <AnimatedDrawer open={open} onClose={onClose} widthClass="w-[480px]" ariaLabel={t("ariaLabel")}>
      {/* Desktop drawer header */}
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
            <path d="M12 20h9" />
            <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
          </svg>
          {t("title")}
        </h2>
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
      </div>
      {entries}
    </AnimatedDrawer>
  );
});
