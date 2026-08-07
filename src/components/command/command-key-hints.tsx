"use client";

import { useTranslations } from "next-intl";
import { commandKeyHints } from "./command-keys";

/**
 * The strip under the command line. Every binding it names already worked —
 * Tab completion, ↑ recall, Enter, ⌥-digit picking — and none of them were
 * discoverable. It changes with the line, so "↵" reads *insert* while a
 * suggestion is pending and *log* once the calculation is complete.
 */
export function CommandKeyHints({
  valid,
  hasGhost,
  suggestionCount,
  historyLength,
  onOpenHelp,
  compact,
}: {
  valid: boolean;
  hasGhost: boolean;
  suggestionCount: number;
  historyLength: number;
  onOpenHelp: () => void;
  compact?: boolean;
}) {
  const t = useTranslations("command");
  const hints = commandKeyHints({ valid, hasGhost, suggestionCount, historyLength });

  return (
    <div
      className="flex items-center gap-x-3 gap-y-1 flex-wrap"
      style={{ fontSize: compact ? 9.5 : 10.5 }}
    >
      {hints.map((hint) => {
        const label = t(`keyHints.${hint.labelKey}`);
        const isHelp = hint.labelKey === "shortcuts";
        const content = (
          <>
            <kbd
              className="font-mono font-bold rounded"
              style={{
                padding: "1px 4px",
                border: "1px solid var(--border-faint)",
                background: "var(--surface)",
                color: "var(--muted)",
              }}
            >
              {hint.keys}
            </kbd>
            <span className="text-muted-faint font-semibold">{label}</span>
          </>
        );
        return isHelp ? (
          <button
            key={hint.labelKey}
            type="button"
            onClick={onOpenHelp}
            className="inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
          >
            {content}
          </button>
        ) : (
          <span key={hint.labelKey} className="inline-flex items-center gap-1">
            {content}
          </span>
        );
      })}
    </div>
  );
}
