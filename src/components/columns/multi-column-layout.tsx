"use client";

import { memo, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import type { ColumnPanelId } from "@/lib/column-layout";
import { COLUMN_PANEL_LABELS, MAX_COLUMNS } from "@/lib/column-layout";
import type { useColumnLayout } from "@/hooks/useColumnLayout";
import { ColumnPanel } from "./column-panel";
import { ColumnResizeHandle } from "./column-resize-handle";

interface MultiColumnLayoutProps {
  layout: ReturnType<typeof useColumnLayout>;
  contentMap: Record<ColumnPanelId, React.ReactNode>;
  maxColumnsAllowed: number;
}

export const MultiColumnLayout = memo(function MultiColumnLayout({
  layout,
  contentMap,
  maxColumnsAllowed,
}: MultiColumnLayoutProps) {
  const t = useTranslations();

  const [liveWidths, setLiveWidths] = useState<Record<string, number> | null>(null);
  const [preferredPanelToAdd, setPreferredPanelToAdd] = useState<ColumnPanelId | "">("");

  const equalPercent = 100 / layout.columns.length;
  const availablePanelsToAdd = layout.getAvailablePanels();
  const panelToAdd = availablePanelsToAdd.includes(preferredPanelToAdd as ColumnPanelId)
    ? preferredPanelToAdd
    : (availablePanelsToAdd[0] ?? "");
  const canAddPanel =
    panelToAdd !== ""
    && availablePanelsToAdd.length > 0
    && layout.columns.length < Math.min(MAX_COLUMNS, maxColumnsAllowed);

  const handleResize = useCallback(
    (leftId: string, rightId: string, leftPercent: number, rightPercent: number) => {
      setLiveWidths((prev) => {
        const base = prev ?? {};
        const next = { ...base };

        for (const column of layout.columns) {
          if (column.id === leftId) next[column.id] = leftPercent;
          else if (column.id === rightId) next[column.id] = rightPercent;
          else if (!(column.id in next)) next[column.id] = column.widthPercent ?? equalPercent;
        }

        return next;
      });
    },
    [equalPercent, layout.columns],
  );

  const handleResizeEnd = useCallback(
    (widths: Record<string, number>) => {
      layout.setColumnWidths(widths);
      setLiveWidths(null);
    },
    [layout],
  );

  function getWidthPercent(columnId: string, storedPercent?: number): number {
    if (liveWidths && columnId in liveWidths) return liveWidths[columnId];
    return storedPercent ?? equalPercent;
  }

  return (
    <div className="hidden min-h-0 flex-1 flex-col lg:flex">
      <div className="panel-base mb-4 flex shrink-0 flex-wrap items-center gap-2 rounded-[1.25rem] px-3.5 py-3">
        <div className="flex items-center gap-2">
          <select
            value={panelToAdd}
            onChange={(event) => setPreferredPanelToAdd(event.target.value as ColumnPanelId | "")}
            aria-label={t("columns.addPanelLabel")}
            className="premium-control min-w-[190px] px-3 py-2 text-xs font-medium text-foreground-secondary outline-none disabled:opacity-50"
            disabled={availablePanelsToAdd.length === 0}
          >
            {availablePanelsToAdd.length === 0 ? (
              <option value="">{t("columns.noPanelsAvailable")}</option>
            ) : (
              availablePanelsToAdd.map((panelId) => (
                <option key={panelId} value={panelId}>
                  {t(COLUMN_PANEL_LABELS[panelId])}
                </option>
              ))
            )}
          </select>

          <button
            type="button"
            onClick={() => {
              if (panelToAdd) layout.addColumn(panelToAdd);
            }}
            disabled={!canAddPanel}
            className="premium-action-button inline-flex items-center gap-1.5 border border-border bg-surface-raised px-3 py-2 text-xs font-medium text-foreground-secondary hover:bg-surface disabled:opacity-40"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            {t("columns.addPanel")}
          </button>
        </div>

        <button
          type="button"
          onClick={layout.resetLayout}
          className="premium-action-button inline-flex items-center gap-1.5 border border-border bg-surface px-3 py-2 text-xs font-medium text-muted-faint hover:bg-surface-raised hover:text-foreground-secondary"
        >
          {t("columns.resetLayout")}
        </button>

        <div className="flex-1" />

        <span className="rounded-full border border-border bg-surface-raised px-2.5 py-1 text-2xs font-semibold text-foreground-secondary">
          {layout.columns.length}/{Math.min(MAX_COLUMNS, maxColumnsAllowed)}
        </span>

        <button
          type="button"
          onClick={layout.toggleEnabled}
          className="premium-action-button inline-flex items-center gap-1.5 border border-border bg-surface px-3 py-2 text-xs font-medium text-muted-faint hover:bg-surface-raised hover:text-foreground-secondary"
        >
          {t("columns.exitColumns")}
        </button>
      </div>

      <div data-columns-container className="flex min-h-0 flex-1 gap-0 overflow-x-auto scroll-native pb-2">
        {layout.columns.flatMap((column, index) => {
          const items: React.ReactNode[] = [];

          if (index > 0) {
            items.push(
              <ColumnResizeHandle
                key={`handle-${column.id}`}
                leftId={layout.columns[index - 1].id}
                rightId={column.id}
                onResize={handleResize}
                onResizeEnd={handleResizeEnd}
                columns={layout.columns}
              />,
            );
          }

          items.push(
            <div
              key={column.id}
              className="flex min-h-0 min-w-0 flex-col"
              style={{ flex: `${getWidthPercent(column.id, column.widthPercent)} 0 0%` }}
            >
              <ColumnPanel
                id={column.id}
                panelId={column.panelId}
                panelOptions={layout.getAvailablePanels(column.id)}
                isFirst={index === 0}
                isLast={index === layout.columns.length - 1}
                canClose={layout.columns.length > 1}
                onSetPanel={(panelId) => layout.setPanelForColumn(column.id, panelId)}
                onMoveLeft={() => layout.moveColumn(column.id, "left")}
                onMoveRight={() => layout.moveColumn(column.id, "right")}
                onClose={() => layout.removeColumn(column.id)}
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
