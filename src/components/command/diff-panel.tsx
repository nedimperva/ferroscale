"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cmdParseLine, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import { diffLines } from "@/lib/command/diff";

/**
 * Two lines, side by side, and what changed between them.
 *
 * The app had no diffing of any kind: comparing two calculations meant
 * putting them into Compare, which only weighs them against each other and
 * forgets what was typed. This shows the *edits* — the quantity that became
 * a different quantity — next to the numbers those edits produced, which is
 * the question the comparison is actually asking.
 */
export function DiffPanel({
  reference,
  current,
  parserSettings,
  symbol,
  onClear,
  onPickReference,
}: {
  reference: string;
  current: string;
  parserSettings: CommandParserSettings;
  symbol: string;
  onClear: () => void;
  onPickReference: () => void;
}) {
  const t = useTranslations("command");

  const diff = useMemo(() => {
    const a = cmdParseLine(reference, parserSettings);
    const b = cmdParseLine(current, parserSettings);
    return { a, b, delta: diffLines(a, b) };
  }, [reference, current, parserSettings]);

  const weight = diff.delta.weight;
  const cost = diff.delta.cost;
  const changed = diff.delta.tokens.entries.filter((entry) => entry.change !== "same");

  const metric = (
    label: string,
    from: number | null,
    to: number | null,
    delta: number | null,
    percent: number | null,
    format: (value: number) => string,
  ) => (
    <div className="flex items-baseline justify-between gap-3 border-t border-[var(--border-faint)] py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[1.4px] text-muted">
        {label}
      </span>
      <span className="flex items-baseline gap-2 font-mono text-[13px]">
        <span className="text-muted-faint">{from == null ? "—" : format(from)}</span>
        <span className="text-muted-faint">→</span>
        <span className="font-semibold text-foreground">{to == null ? "—" : format(to)}</span>
        {delta != null && delta !== 0 ? (
          <span className="text-[12px] text-[var(--accent-text)]">
            {delta > 0 ? "+" : "−"}
            {format(Math.abs(delta))}
            {percent != null ? ` (${percent > 0 ? "+" : "−"}${Math.abs(percent).toFixed(1)}%)` : ""}
          </span>
        ) : null}
      </span>
    </div>
  );

  return (
    <div className="border-t border-[var(--border-faint)] bg-[var(--surface)] px-[18px] py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[1.6px] text-muted">
          {t("diff.title")}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPickReference}
            className="border border-[var(--border-faint)] bg-[var(--surface)] px-2 py-1 font-mono text-[11px] text-[var(--foreground-secondary)]"
          >
            {t("diff.pickReference")}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="premium-icon-button flex h-7 w-7 items-center justify-center text-[14px] text-[var(--muted-faint)]"
            aria-label={t("diff.clear")}
          >
            ×
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-0.5">
        <div className="flex items-baseline gap-2 font-mono text-[12px]">
          <span className="w-[68px] shrink-0 text-[10px] uppercase tracking-[1.2px] text-muted-faint">
            {t("diff.current")}
          </span>
          <span className="truncate text-foreground">{diff.b.raw.trim() || "—"}</span>
        </div>
        <div className="flex items-baseline gap-2 font-mono text-[12px]">
          <span className="w-[68px] shrink-0 text-[10px] uppercase tracking-[1.2px] text-muted-faint">
            {t("diff.reference")}
          </span>
          <span className="truncate text-[var(--foreground-secondary)]">
            {diff.a.raw.trim() || "—"}
          </span>
        </div>
      </div>

      {changed.length === 0 ? (
        <p className="mt-2 font-mono text-[12px] text-muted">{t("diff.identical")}</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {changed.map((entry, index) => (
            <span
              key={`${entry.kind}-${index}`}
              className="inline-flex items-center gap-1 border border-[var(--border-faint)] bg-[var(--surface-inset)] px-1.5 py-0.5 font-mono text-[11.5px]"
            >
              <span className="text-muted-faint">{entry.from || "—"}</span>
              <span className="text-muted-faint">→</span>
              <span className="font-semibold text-foreground">{entry.to || "—"}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-2">
        {metric(
          t("diff.weight"),
          weight.from,
          weight.to,
          weight.delta,
          weight.percent,
          (value) => `${fsWeight(value)} ${fsWeightUnit()}`,
        )}
        {metric(
          t("diff.cost"),
          cost.from,
          cost.to,
          cost.delta,
          cost.percent,
          (value) => `${symbol}${fsMoney(value)}`,
        )}
      </div>
    </div>
  );
}
