"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import type { ColumnPanelId } from "@/lib/column-layout";
import { ALL_PANEL_IDS, COLUMN_PANEL_LABELS } from "@/lib/column-layout";
import { ColumnContent } from "./column-content";

interface ColumnPanelProps {
  id: string;
  panelId: ColumnPanelId;
  isFirst: boolean;
  isLast: boolean;
  canClose: boolean;
  onSetPanel: (panelId: ColumnPanelId) => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onClose: () => void;
  contentMap: Record<ColumnPanelId, React.ReactNode>;
}

export const ColumnPanel = memo(function ColumnPanel({
  id,
  panelId,
  isFirst,
  isLast,
  canClose,
  onSetPanel,
  onMoveLeft,
  onMoveRight,
  onClose,
  contentMap,
}: ColumnPanelProps) {
  const t = useTranslations();

  return (
    <div
      id={`column-${id}`}
      data-column-id={id}
      className="flex min-h-0 min-w-[280px] flex-1 flex-col rounded-xl border border-border bg-surface shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-border-faint px-3 py-2">
        {/* Panel selector */}
        <select
          value={panelId}
          onChange={(e) => onSetPanel(e.target.value as ColumnPanelId)}
          className="min-w-0 flex-1 truncate rounded-md border border-border bg-transparent px-2 py-1 text-xs font-semibold text-foreground outline-none transition-colors hover:bg-surface-raised focus:ring-1 focus:ring-blue-strong"
        >
          {ALL_PANEL_IDS.map((pid) => (
            <option key={pid} value={pid}>
              {t(COLUMN_PANEL_LABELS[pid])}
            </option>
          ))}
        </select>

        {/* Move left */}
        <button
          type="button"
          onClick={onMoveLeft}
          disabled={isFirst}
          className="rounded-md p-1 text-muted-faint transition-colors hover:bg-surface-raised hover:text-foreground disabled:opacity-30"
          aria-label={t("columns.moveLeft")}
          title={t("columns.moveLeft")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        {/* Move right */}
        <button
          type="button"
          onClick={onMoveRight}
          disabled={isLast}
          className="rounded-md p-1 text-muted-faint transition-colors hover:bg-surface-raised hover:text-foreground disabled:opacity-30"
          aria-label={t("columns.moveRight")}
          title={t("columns.moveRight")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        {/* Close */}
        {canClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-faint transition-colors hover:bg-red-surface hover:text-red-interactive"
            aria-label={t("columns.close")}
            title={t("columns.close")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scroll-native">
        <ColumnContent panelId={panelId} contentMap={contentMap} />
      </div>
    </div>
  );
});
