"use client";

import { useTranslations } from "next-intl";
import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandLine } from "@ferroscale/metal-core";
import { buildLineSummary } from "./line-summary";

/** Pickable list of every `+`-joined item, with the line total above it. */
export function AssemblyParts({
  line,
  selected,
  onSelect,
}: {
  line: CommandLine;
  selected: number;
  onSelect: (index: number) => void;
}) {
  const t = useTranslations("command");
  const rows = buildLineSummary(line, t);
  const sym = CURRENCY_SYMBOLS[line.items[0]?.parse.pricing.currency ?? "EUR"] ?? "€";

  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between gap-2 mb-2 px-0.5">
        <span className="fs-track-wide text-[10px] font-bold uppercase text-muted">
          {t("result.assembly", { count: line.items.length })}
        </span>
        {line.valid && (
          <span className="font-mono text-[12px] font-bold text-foreground">
            {line.totalKg != null ? `${fsWeight(line.totalKg)} ${fsWeightUnit()}` : ""}
            {line.totalKg != null && line.totalAmount != null ? " · " : ""}
            {line.totalAmount != null ? `${sym}${fsMoney(line.totalAmount)}` : ""}
          </span>
        )}
      </div>
      <ol
        className="flex flex-col overflow-hidden rounded-2xl border border-border-faint bg-[var(--surface-raised)]"
        aria-label={t("result.assemblyParts")}
      >
        {rows.map((row, index) => {
          const active = index === selected;
          return (
            <li key={index} className="border-t border-border-faint first:border-t-0">
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(index)}
                className="flex w-full items-baseline gap-2 px-3 py-2.5 text-left"
                style={{
                  background: active ? "var(--accent-surface)" : "transparent",
                }}
              >
                <span className="font-mono text-[11px] text-muted-faint tabular-nums">
                  {index + 1}
                </span>
                <span
                  className="min-w-0 flex-1 truncate text-[13px] font-semibold"
                  style={{ color: row.pending ? "var(--muted)" : "var(--foreground)" }}
                >
                  {row.label}
                </span>
                <span className="font-mono text-[11.5px] font-bold whitespace-nowrap" style={{ color: "var(--accent-text)" }}>
                  {row.weight}
                </span>
                <span className="font-mono text-[11.5px] text-muted whitespace-nowrap">
                  {row.amount}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
