"use client";

import type React from "react";
import { useTranslations } from "next-intl";
import type { CommandSuggestion, CommandSuggestionItem } from "@ferroscale/metal-core";
import { CommandGlyph } from "../command-glyph";
import { formatCommandHint, formatCommandSuggestionLabel } from "../command-copy";

const screenBg = "var(--screen)";

/**
 * SUGGESTION BAR — the stage hint, Paste / Clear, and one sideways-scrolling
 * row of chips. The chips are the phone's main input accelerator.
 */
export function PhoneSuggestionStrip({
  sug,
  activeAlias,
  hideSave,
  showClear,
  firstSuggestionRef,
  onSuggest,
  onPaste,
  onClear,
  onExit,
}: {
  sug: CommandSuggestion;
  /** The active item's profile alias, for the glyph on non-profile chips. */
  activeAlias: string | undefined;
  /** The phone has its own save control, so the "save" chip is dropped. */
  hideSave: boolean;
  showClear: boolean;
  firstSuggestionRef: React.RefObject<HTMLButtonElement | null>;
  onSuggest: (item: CommandSuggestionItem) => void;
  onPaste: () => void;
  onClear: () => void;
  /** Arrow/Escape out of the strip — back to the input. */
  onExit: () => void;
}) {
  const t = useTranslations("command");
  return (
    <div className="pb-2.5">
      <div className="flex items-center gap-2 px-[18px] pb-1.5">
        <h2 className="text-[10px] font-bold tracking-[1.2px] text-muted uppercase">
          {formatCommandHint(t, sug.hint)}
        </h2>
        <span className="ml-auto flex items-center -mr-3">
          <button
            type="button"
            onClick={onPaste}
            aria-label={t("common.paste")}
            // Padding + negative margin grows the tap target without
            // shifting the layout.
            className="bg-transparent border-0 text-muted text-[11px] font-bold tracking-wide px-3 py-2.5 -my-2.5"
          >
            {t("common.paste")}
          </button>
          {showClear && (
            <button
              type="button"
              onClick={onClear}
              className="bg-transparent border-0 text-muted text-[11px] font-bold tracking-wide px-3 py-2.5 -my-2.5"
            >
              {t("common.clear")}
            </button>
          )}
        </span>
      </div>
      <div className="relative">
      <div
        // One row that scrolls sideways, per the fold. Wrapping to two
        // rows made the strip's height depend on how many chips the stage
        // happened to produce, and the second row was clipped by the
        // query line — the layout has no vertical give to lend it.
        data-suggestion-strip=""
        // `overflowY: hidden` clips at the padding edge, so the chips
        // need room below them or their own borders get shaved off.
        className="flex gap-1.5 px-[18px] pb-1"
        style={{ overflowX: "auto", overflowY: "hidden" }}
        // The chips themselves stay out of the Tab order (typing flow),
        // so the strip is the one focusable stop: a keyboard can scroll
        // it, and a screen reader hears what it is.
        role="group"
        aria-label={t("aria.suggestionStrip")}
        tabIndex={0}
      >
        {(hideSave
          ? sug.items.filter((it) => it.kind !== "save")
          : sug.items
        ).map((it, i) => (
          <button
            key={i}
            ref={i === 0 ? firstSuggestionRef : undefined}
            type="button"
            // Chips stay out of the Tab order — keep typing flow unbroken.
            // ArrowDown / ArrowRight from input opens this list explicitly.
            tabIndex={-1}
            onClick={() => {
              onSuggest(it);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const dir = e.key === "ArrowRight" ? 1 : -1;
                const buttons = Array.from(
                  e.currentTarget.parentElement?.querySelectorAll(
                    "button",
                  ) ?? [],
                ) as HTMLButtonElement[];
                const idx = buttons.indexOf(e.currentTarget as HTMLButtonElement);
                const next = buttons[idx + dir];
                if (next) {
                  next.focus();
                } else if (dir === -1) {
                  onExit();
                }
                return;
              }
              if (e.key === "ArrowUp" || e.key === "Escape") {
                e.preventDefault();
                onExit();
              }
            }}
            className="fs-pop flex-shrink-0 flex items-center gap-1.5 rounded-none font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--screen,var(--surface))]"
            style={{
              // 44px touch targets — the strip is the phone's main
              // input accelerator, tapped with thumbs on the jobsite.
              padding: it.sub ? "9px 13px" : "12px 14px",
              border:
                it.kind === "save"
                  ? "none"
                  : "1px solid var(--border-faint)",
              background:
                it.kind === "save"
                  ? "var(--action)"
                  : "var(--surface)",
              color:
                it.kind === "save"
                  ? "var(--action-contrast)"
                  : "var(--foreground)",
            }}
          >
            {it.fam && (
              <span style={{ color: "var(--foreground-secondary)" }}>
                <CommandGlyph
                  fam={it.fam}
                  alias={it.kind === "profile" ? it.ins : activeAlias}
                  size={17}
                />
              </span>
            )}
            <span className="flex flex-col items-start leading-tight">
              <span
                className={`text-sm font-bold ${
                  it.kind === "size" || it.kind === "length" || it.kind === "qty"
                    ? "font-mono"
                    : ""
                }`}
              >
                {formatCommandSuggestionLabel(t, it)}
              </span>
              {it.sub && (
                <span className="text-[10px] text-muted font-semibold">
                  {it.sub}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
      {/* Bottom fade hints that more chips are below the fold */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-4"
        style={{
          background: `linear-gradient(to bottom, transparent, ${screenBg})`,
        }}
      />
      {/* The strip scrolls sideways, so the fade that says "there is
          more" belongs on the right edge. Without it the last chip was
          simply cut mid-word and the row read as clipped, not
          scrollable. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-8"
        style={{
          background: `linear-gradient(to right, transparent, ${screenBg})`,
        }}
      />
      </div>
    </div>
  );
}
