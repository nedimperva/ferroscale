"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import type { ColumnPanelId } from "@/lib/column-layout";
import { COLUMN_PANEL_LABELS, MIN_COLUMN_WIDTH } from "@/lib/column-layout";
import { ColumnContent } from "./column-content";

interface ColumnPanelProps {
  id: string;
  panelId: ColumnPanelId;
  panelOptions: ColumnPanelId[];
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
  panelOptions,
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
      data-panel-type={panelId}
      className="panel-base flex min-h-0 flex-1 flex-col rounded-[1.35rem]"
      style={{ minWidth: `${MIN_COLUMN_WIDTH}px` }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border-faint bg-linear-to-b from-surface to-surface-raised/45 px-3.5 py-2.5">
        {/* Panel selector */}
        <select
          value={panelId}
          onChange={(e) => onSetPanel(e.target.value as ColumnPanelId)}
          aria-label={t("columns.panelType")}
          className="premium-control min-w-0 flex-1 truncate bg-transparent px-3 py-2 text-xs font-semibold text-foreground outline-none"
        >
          {panelOptions.map((pid) => (
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
          className="premium-icon-button h-8 w-8 text-muted-faint disabled:opacity-30"
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
          className="premium-icon-button h-8 w-8 text-muted-faint disabled:opacity-30"
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
            className="premium-icon-button h-8 w-8 text-muted-faint hover:border-red-border hover:bg-red-surface hover:text-red-interactive"
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
      <div data-column-scroll className="flex-1 overflow-y-auto scroll-native">
        <ColumnContent panelId={panelId} contentMap={contentMap} />
      </div>
    </div>
  );
});
