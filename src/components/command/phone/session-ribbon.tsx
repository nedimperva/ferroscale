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
  isWeight,
  sym,
  onOpen,
  onSaveAsProject,
  onAdd,
}: {
  summary: SessionSummary;
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
      className="flex items-center gap-2 mx-[18px] mt-2 rounded-none flex-shrink-0"
      // A fixed height, because everything on this screen is laid out by
      // flex spacers: a row that grows when the tape fills pushes the
      // answer up the screen as you work. Its tallest control is the
      // 28px "+", so 44 holds it with room either side.
      style={{
        height: 44,
        padding: "0 8px 0 11px",
        border: "1px dashed var(--border-strong)",
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={t("aria.openSession")}
        // overflow-hidden, because the figure and the label inside are
        // both nowrap: without it a long total simply drew over the
        // button to its right instead of giving way.
        className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden bg-transparent border-0 p-0 text-left cursor-pointer"
      >
        <h2 className="fs-track-wide text-[10px] font-bold uppercase text-muted whitespace-nowrap flex-shrink-0">
          {t("desktop.session")}
        </h2>
        {/* The total in whichever unit the hero is showing, then how many
            lines it came from. Showing weight and money side by side made
            the row two lines tall as soon as the session had anything in
            it, and truncating a number mid-digit is worse than omitting
            it — the full breakdown is one tap away. */}
        <span className="font-mono text-[13px] font-bold whitespace-nowrap flex-shrink-0">
          {summary.count === 0
            ? "—"
            : isWeight
              ? `${fsWeight(summary.kg)} ${fsWeightUnit()}`
              : `${sym}${fsMoney(summary.amount)}`}
        </span>
        {/* No line count here. It only ever had a value when the
            "→ project" button was showing too, and the two together do
            not fit a 390px row — it came out as "2 c…". The count is
            on the session tab, one tap away. */}
      </button>
      {summary.count > 0 && (
        <button
          type="button"
          onClick={onSaveAsProject}
          className="fs-track-wide flex-shrink-0 whitespace-nowrap text-[10px] font-bold uppercase"
          style={{ padding: "6px 7px", color: "var(--accent-text)" }}
        >
          {t("desktop.saveSessionAsProjectShort")}
        </button>
      )}
      <button
        type="button"
        onClick={onAdd}
        aria-label={t("aria.addToSession")}
        className="flex items-center justify-center rounded-none text-[16px] font-bold leading-none flex-shrink-0"
        style={{
          width: 28,
          height: 28,
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
