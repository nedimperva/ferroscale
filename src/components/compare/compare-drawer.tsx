"use client";

import { memo, useCallback, useEffect } from "react";
import type { CompareItem } from "@/hooks/useCompare";
import { CompareCard } from "./compare-card";

interface CompareDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CompareItem[];
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
}

function exportCompareCsv(items: CompareItem[]): void {
  if (items.length === 0) return;

  const headers = [
    "Profile",
    "Material",
    "Unit Weight (kg)",
    "Total Weight (kg)",
    "Subtotal",
    "Waste",
    "VAT",
    "Grand Total",
    "Currency",
  ];
  const rows = items.map((item) => {
    const r = item.result;
    return [
      r.profileLabel,
      r.gradeLabel,
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
  a.download = `compare-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export const CompareDrawer = memo(function CompareDrawer({
  open,
  onClose,
  items,
  onRemoveItem,
  onClearAll,
}: CompareDrawerProps) {
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

  const handleExport = useCallback(() => {
    exportCompareCsv(items);
  }, [items]);

  const reference = items.length > 0 ? items[0] : null;

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

      {/* Drawer panel — wider than other drawers to fit comparison cards */}
      <aside
        aria-label="Compare drawer"
        className={`fixed inset-y-0 right-0 z-50 flex w-[480px] max-w-[95vw] flex-col bg-surface-raised shadow-xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {/* compare / columns icon */}
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
            Compare
            <span className="ml-1 rounded-full bg-surface-inset px-1.5 py-0.5 text-[10px] font-bold text-foreground-secondary">
              {items.length}/3
            </span>
          </h2>
          <div className="flex items-center gap-1">
            {items.length >= 2 && (
              <button
                type="button"
                onClick={handleExport}
                className="rounded-md px-2 py-1 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-raised"
                title="Export comparison as CSV"
              >
                Export
              </button>
            )}
            {items.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="rounded-md px-2 py-1 text-xs font-medium text-red-interactive transition-colors hover:bg-red-surface"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
              aria-label="Close compare"
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
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
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
              <p className="text-sm text-muted-faint">
                No items to compare yet.
              </p>
              <p className="text-xs text-muted-faint">
                Click &ldquo;Compare&rdquo; on a result to add it here.
              </p>
            </div>
          ) : items.length === 1 ? (
            <div className="space-y-3">
              <CompareCard
                item={items[0]}
                reference={null}
                onRemove={onRemoveItem}
              />
              <div className="rounded-lg border-2 border-dashed border-border px-4 py-8 text-center">
                <p className="text-sm text-muted-faint">
                  Add a second calculation to compare.
                </p>
                <p className="mt-1 text-xs text-muted-faint">
                  Change inputs and click &ldquo;Compare&rdquo; again.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {items.map((item) => (
                <CompareCard
                  key={item.id}
                  item={item}
                  reference={reference}
                  onRemove={onRemoveItem}
                />
              ))}
              {items.length < 3 && (
                <div className="rounded-lg border-2 border-dashed border-border px-4 py-6 text-center">
                  <p className="text-xs text-muted-faint">
                    Slot available — add another calculation.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
});
