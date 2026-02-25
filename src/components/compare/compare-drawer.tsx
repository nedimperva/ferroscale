"use client";

import { memo, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { CompareItem } from "@/hooks/useCompare";
import { CompareCard } from "./compare-card";
import { useDrawerBehavior } from "@/hooks/useDrawerBehavior";
import { useIsMobile } from "@/hooks/useIsMobile";
import { resolveGradeLabel } from "@/lib/calculator/grade-label";
import { AnimatedDrawer } from "@/components/ui/animated-drawer";
import { BottomSheet } from "@/components/ui/bottom-sheet";

interface CompareDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CompareItem[];
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  maxCompare: number;
}

function exportCompareCsv(
  items: CompareItem[],
  headers: string[],
  filePrefix: string,
  resolveGradeLabel: (label: string) => string,
  resolveProfileLabel: (profileId: string, fallback: string) => string,
): void {
  if (items.length === 0) return;

  const rows = items.map((item) => {
    const r = item.result;
    return [
      item.normalizedProfile.shortLabel,
      resolveProfileLabel(r.profileId, r.profileLabel),
      resolveGradeLabel(r.gradeLabel),
      r.unitWeightKg,
      r.totalWeightKg,
      r.subtotalAmount,
      r.wasteAmount,
      r.vatAmount,
      r.grandTotalAmount,
      r.currency,
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export const CompareDrawer = memo(function CompareDrawer({
  open,
  onClose,
  items,
  onRemoveItem,
  onClearAll,
  maxCompare,
}: CompareDrawerProps) {
  const tBase = useTranslations();
  const t = useTranslations("compare");
  const isMobile = useIsMobile();

  const csvHeaders = useMemo(
    () => [
      t("csvHeaders.profile"),
      t("csvHeaders.profileLabel"),
      t("csvHeaders.material"),
      t("csvHeaders.unitWeight"),
      t("csvHeaders.totalWeight"),
      t("csvHeaders.subtotal"),
      t("csvHeaders.waste"),
      t("csvHeaders.vat"),
      t("csvHeaders.grandTotal"),
      t("csvHeaders.currency"),
    ],
    [t],
  );

  useDrawerBehavior(!isMobile && open, onClose);

  const handleExport = useCallback(() => {
    exportCompareCsv(
      items,
      csvHeaders,
      t("csvFilePrefix"),
      (label) => resolveGradeLabel(label, tBase),
      (profileId, fallback) => {
        try {
          return tBase(`dataset.profiles.${profileId}`);
        } catch {
          return fallback;
        }
      },
    );
  }, [items, csvHeaders, t, tBase]);

  const reference = items.length > 0 ? items[0] : null;

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
            <rect x="3" y="3" width="7" height="18" rx="1" />
            <rect x="14" y="3" width="7" height="18" rx="1" />
          </svg>
          {t("title")}
          <span className="ml-1 rounded-full bg-surface-inset px-1.5 py-0.5 text-[10px] font-bold text-foreground-secondary">
            {items.length}/{maxCompare}
          </span>
        </h2>
        <div className="flex items-center gap-1">
          {items.length >= 2 && (
            <button
              type="button"
              onClick={handleExport}
              className="rounded-md px-2 py-1 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-raised"
              title={t("exportTitle")}
            >
              {t("export")}
            </button>
          )}
          {items.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="rounded-md px-2 py-1 text-xs font-medium text-red-interactive transition-colors hover:bg-red-surface"
            >
              {t("clear")}
            </button>
          )}
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
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scroll-native safe-area-bottom p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-10 w-10 text-border"
            >
              <rect x="3" y="3" width="7" height="18" rx="1" />
              <rect x="14" y="3" width="7" height="18" rx="1" />
            </svg>
            <p className="text-sm text-muted-faint">{t("empty")}</p>
            <p className="text-xs text-muted-faint">{t("emptyHint")}</p>
          </div>
        ) : items.length === 1 ? (
          <div className="space-y-3">
            <CompareCard item={items[0]} reference={null} onRemove={onRemoveItem} />
            <div className="rounded-lg border-2 border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm text-muted-faint">{t("needSecond")}</p>
              <p className="mt-1 text-xs text-muted-faint">{t("needSecondHint")}</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <CompareCard key={item.id} item={item} reference={reference} onRemove={onRemoveItem} />
            ))}
            {items.length < maxCompare && (
              <div className="rounded-lg border-2 border-dashed border-border px-4 py-6 text-center">
                <p className="text-xs text-muted-faint">{t("slotAvailable")}</p>
              </div>
            )}
          </div>
        )}
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
    <AnimatedDrawer open={open} onClose={onClose} widthClass="w-[480px]" ariaLabel={t("drawerAria")}>
      {content}
    </AnimatedDrawer>
  );
});
