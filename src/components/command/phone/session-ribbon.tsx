"use client";

import { useTranslations } from "next-intl";
import { fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";

export interface SessionSummary {
  count: number;
  kg: number;
  amount: number;
}

/**
 * SESSION RIBBON — the tape, at phone size. It carries the same two actions
 * the workspace pane does: open it, or turn it into a project. Nothing typed
 * is lost by not deciding where it goes, which is the point of the tape.
 */
export function SessionRibbon({
  summary,
  hasHistory,
  isWeight,
  sym,
  onOpen,
  onSaveAsProject,
  onAdd,
}: {
  summary: SessionSummary;
  /** Older lines exist even when today has none — the tap leads to them. */
  hasHistory: boolean;
  isWeight: boolean;
  sym: string;
  onOpen: () => void;
  onSaveAsProject: () => void;
  onAdd: () => void;
}) {
  const t = useTranslations("command");
  return (
    <div
      data-session-ribbon=""
      className="flex items-center gap-2 w-full rounded-none flex-shrink-0"
      // A fixed-height hairline adding-machine tape docked flush under the top
      // bar so nothing shifts vertically when the session fills and the middle
      // of the phone stays calm paper for the answer.
      style={{
        height: 32,
        padding: "0 14px 0 18px",
        background: "var(--surface)",
        borderTop: "1px solid var(--border-faint)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={t("aria.openSession")}
        // overflow-hidden, because the figure and the label inside are
        // both nowrap: without it a long total simply drew over the
        // button to its right instead of giving way.
        className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden bg-transparent border-0 p-0 text-left cursor-pointer"
      >
        <h2 className="fs-track-wide text-[10px] font-bold uppercase text-muted whitespace-nowrap flex-shrink-0">
          {t("desktop.session")}
        </h2>
        <span className="font-mono text-[13px] font-bold whitespace-nowrap flex-shrink-0">
          {summary.count === 0
            ? hasHistory
              ? <span className="text-muted font-normal">{t("history.open")}</span>
              : "—"
            : isWeight
              ? `${fsWeight(summary.kg)} ${fsWeightUnit()}`
              : `${sym}${fsMoney(summary.amount)}`}
        </span>
      </button>
      {summary.count > 0 && (
        <button
          type="button"
          onClick={onSaveAsProject}
          className="fs-track-wide flex-shrink-0 whitespace-nowrap text-[10px] font-bold uppercase bg-transparent border-0 cursor-pointer"
          style={{ padding: "4px 6px", color: "var(--accent-text)" }}
        >
          {t("desktop.saveSessionAsProjectShort")}
        </button>
      )}
      <button
        type="button"
        onClick={onAdd}
        aria-label={t("aria.addToSession")}
        className="flex items-center justify-center rounded-none text-[15px] font-bold leading-none flex-shrink-0 cursor-pointer"
        style={{
          width: 24,
          height: 24,
          border: "1px solid var(--accent-border)",
          background: "var(--accent-surface)",
          color: "var(--accent-text)",
        }}
      >
        +
      </button>
    </div>
  );
}
