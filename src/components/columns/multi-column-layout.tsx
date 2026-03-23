"use client";

import { memo, useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { ColumnPanelId } from "@/lib/column-layout";
import { MAX_COLUMNS } from "@/lib/column-layout";
import type { useColumnLayout } from "@/hooks/useColumnLayout";
import { ColumnPanel } from "./column-panel";
import { ColumnResizeHandle } from "./column-resize-handle";

interface MultiColumnLayoutProps {
  layout: ReturnType<typeof useColumnLayout>;
  contentMap: Record<ColumnPanelId, React.ReactNode>;
}

export const MultiColumnLayout = memo(function MultiColumnLayout({
  layout,
  contentMap,
}: MultiColumnLayoutProps) {
  const t = useTranslations();

  // Live resize overrides (not yet persisted — only during drag)
  const [liveWidths, setLiveWidths] = useState<Record<string, number> | null>(null);
  const liveWidthsRef = useRef(liveWidths);
  liveWidthsRef.current = liveWidths;

  const equalPercent = 100 / layout.columns.length;

  const handleResize = useCallback(
    (leftId: string, rightId: string, leftPercent: number, rightPercent: number) => {
      setLiveWidths((prev) => {
        const base = prev ?? {};
        const next = { ...base };
        for (const col of layout.columns) {
          if (col.id === leftId) next[col.id] = leftPercent;
          else if (col.id === rightId) next[col.id] = rightPercent;
          else if (!(col.id in next)) next[col.id] = col.widthPercent ?? 100 / layout.columns.length;
        }
        return next;
      });
    },
    [layout.columns],
  );

  const handleResizeEnd = useCallback(
    (widths: Record<string, number>) => {
      layout.setColumnWidths(widths);
      setLiveWidths(null);
    },
    [layout],
  );

  function getWidthPercent(colId: string, storedPercent?: number): number {
    if (liveWidths && colId in liveWidths) return liveWidths[colId];
    return storedPercent ?? equalPercent;
  }

  return (
    <div className="hidden min-h-0 flex-1 flex-col lg:flex">
      {/* Toolbar */}
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => layout.addColumn("saved")}
          disabled={layout.columns.length >= MAX_COLUMNS}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground-secondary shadow-sm transition-colors hover:bg-surface-raised disabled:opacity-40"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          {t("columns.addColumn")}
        </button>

        <button
          type="button"
          onClick={layout.resetLayout}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted-faint shadow-sm transition-colors hover:bg-surface-raised hover:text-foreground-secondary"
        >
          {t("columns.resetLayout")}
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={layout.toggleEnabled}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted-faint shadow-sm transition-colors hover:bg-surface-raised hover:text-foreground-secondary"
        >
          {t("columns.exitColumns")}
        </button>
      </div>

      {/* Columns with resize handles */}
      <div data-columns-container className="flex min-h-0 flex-1 gap-0 overflow-x-auto scroll-native pb-2">
        {layout.columns.flatMap((col, idx) => {
          const items: React.ReactNode[] = [];
          if (idx > 0) {
            items.push(
              <ColumnResizeHandle
                key={`handle-${col.id}`}
                leftId={layout.columns[idx - 1].id}
                rightId={col.id}
                onResize={handleResize}
                onResizeEnd={handleResizeEnd}
                columns={layout.columns}
              />,
            );
          }
          items.push(
            <div key={col.id} className="flex min-h-0 min-w-0 flex-col" style={{ flex: `${getWidthPercent(col.id, col.widthPercent)} 0 0%` }}>
              <ColumnPanel
                id={col.id}
                panelId={col.panelId}
                isFirst={idx === 0}
                isLast={idx === layout.columns.length - 1}
                canClose={layout.columns.length > 1}
                onSetPanel={(panelId) => layout.setPanelForColumn(col.id, panelId)}
                onMoveLeft={() => layout.moveColumn(col.id, "left")}
                onMoveRight={() => layout.moveColumn(col.id, "right")}
                onClose={() => layout.removeColumn(col.id)}
                contentMap={contentMap}
              />
            </div>,
          );
          return items;
        })}
      </div>
    </div>
  );
});
