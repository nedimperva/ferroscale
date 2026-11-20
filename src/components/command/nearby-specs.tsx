"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toMillimeters } from "@ferroscale/metal-core";
import type { CalculationInput } from "@/lib/calculator/types";
import { familyRowToInsert } from "@/lib/calculator/apply-family-row";
import type { ProfileSpecsFamilyRow, ResolvedProfileSpecs } from "@/lib/calculator/profile-specs";
import { replaceItemTokenKind } from "./line-edit";

export function applyNearbySpec(
  query: string,
  itemIndex: number,
  row: ProfileSpecsFamilyRow,
  input: CalculationInput,
): string {
  const insert = familyRowToInsert(
    row,
    toMillimeters(input.length.value, input.length.unit),
  );
  if (!insert) return query;
  return replaceItemTokenKind(query, itemIndex, "profile", insert);
}

/**
 * Nearby sizes and peer families under the breakdown. The math already lived
 * in `resolveProfileSpecs`; this is the last control — tap a row and the
 * command line swaps the profile token.
 */

function formatDelta(percent: number | null | undefined): string | null {
  if (percent == null || !Number.isFinite(percent) || Math.abs(percent) < 0.5) {
    return null;
  }
  const rounded = percent > 0 ? `+${percent.toFixed(0)}` : percent.toFixed(0);
  return `${rounded}%`;
}

function formatKgm(value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const digits = value < 10 ? 2 : value < 100 ? 1 : 0;
  return `${value.toFixed(digits)} kg/m`;
}

export function NearbySpecs({
  input,
  onPick,
  showScrubber: allowScrubber = true,
}: {
  input: CalculationInput;
  onPick: (row: ProfileSpecsFamilyRow) => void;
  /** Show the 1-row ← lighter | current | heavier → scrubber above peers (desktop rail). */
  showScrubber?: boolean;
}) {
  const t = useTranslations("command");
  // Loaded on demand so the command-shell import graph does not pull in the
  // 900-line specs table on first paint.
  const [specs, setSpecs] = useState<ResolvedProfileSpecs | null>(null);
  useEffect(() => {
    let cancelled = false;
    void import("@/lib/calculator/profile-specs").then(({ resolveProfileSpecs }) => {
      if (cancelled) return;
      setSpecs(resolveProfileSpecs(input));
    });
    return () => {
      cancelled = true;
    };
  }, [input]);
  const allRows = specs?.familyRows ?? [];
  const currentRow = allRows.find((row) => row.selected) ?? null;
  const sameFamily = allRows.filter((row) => !row.selected && row.matchKind === "same_family_nearby");
  const currentMass = currentRow?.massPerMeterKg ?? null;

  const lighter =
    allowScrubber && currentMass != null
      ? sameFamily
          .filter((r) => r.massPerMeterKg != null && r.massPerMeterKg < currentMass)
          .sort((a, b) => (b.massPerMeterKg ?? 0) - (a.massPerMeterKg ?? 0))[0] ?? null
      : null;
  const heavier =
    allowScrubber && currentMass != null
      ? sameFamily
          .filter((r) => r.massPerMeterKg != null && r.massPerMeterKg > currentMass)
          .sort((a, b) => (a.massPerMeterKg ?? 0) - (b.massPerMeterKg ?? 0))[0] ?? null
      : null;

  const scrubberIds = new Set([lighter?.id, heavier?.id].filter(Boolean));
  const showScrubber = Boolean(allowScrubber && currentRow && (lighter || heavier));
  const alternatives = allRows.filter((row) => !row.selected && !scrubberIds.has(row.id));

  if (!showScrubber && alternatives.length === 0) return null;

  return (
    <div className="flex flex-col gap-3" style={{ paddingTop: 4 }}>
      {showScrubber && currentRow && (
        <div
          role="group"
          aria-label={t("nearby.scrubberAria")}
          className="grid grid-cols-3"
          style={{ border: "1px solid var(--border)" }}
        >
          {lighter ? (
            <button
              type="button"
              onClick={() => onPick(lighter)}
              aria-label={t("nearby.pickAria", { label: lighter.label })}
              className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-2 text-center cursor-pointer transition-colors hover:bg-[var(--surface-inset)]"
              style={{
                background: "var(--background)",
                borderRight: "1px solid var(--border-faint)",
              }}
            >
              <span className="font-mono text-[11px] font-bold text-foreground truncate max-w-full">
                ← {lighter.label}
              </span>
              {formatKgm(lighter.massPerMeterKg) && (
                <span className="font-mono text-[10px] text-muted">
                  {formatKgm(lighter.massPerMeterKg)}
                </span>
              )}
            </button>
          ) : (
            <div
              className="flex items-center justify-center px-1.5 py-2 font-mono text-[10px] text-muted-faint"
              style={{
                background: "var(--background)",
                borderRight: "1px solid var(--border-faint)",
              }}
              aria-hidden="true"
            >
              —
            </div>
          )}

          <div
            aria-current="true"
            className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-2 text-center"
            style={{
              background: "var(--accent-surface)",
              boxShadow: "inset 0 -2px 0 var(--accent)",
            }}
          >
            <span
              className="font-mono text-[11px] font-bold truncate max-w-full"
              style={{ color: "var(--accent-text)" }}
            >
              {currentRow.label}
            </span>
            {formatKgm(currentRow.massPerMeterKg) && (
              <span className="font-mono text-[10px] text-foreground-secondary">
                {formatKgm(currentRow.massPerMeterKg)}
              </span>
            )}
          </div>

          {heavier ? (
            <button
              type="button"
              onClick={() => onPick(heavier)}
              aria-label={t("nearby.pickAria", { label: heavier.label })}
              className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-2 text-center cursor-pointer transition-colors hover:bg-[var(--surface-inset)]"
              style={{
                background: "var(--background)",
                borderLeft: "1px solid var(--border-faint)",
              }}
            >
              <span className="font-mono text-[11px] font-bold text-foreground truncate max-w-full">
                {heavier.label} →
              </span>
              {formatKgm(heavier.massPerMeterKg) && (
                <span className="font-mono text-[10px] text-muted">
                  {formatKgm(heavier.massPerMeterKg)}
                </span>
              )}
            </button>
          ) : (
            <div
              className="flex items-center justify-center px-1.5 py-2 font-mono text-[10px] text-muted-faint"
              style={{
                background: "var(--background)",
                borderLeft: "1px solid var(--border-faint)",
              }}
              aria-hidden="true"
            >
              —
            </div>
          )}
        </div>
      )}

      {alternatives.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h2 className="fs-track-label text-[10px] font-bold text-muted uppercase">
            {t("nearby.title")}
          </h2>
          <ul className="flex flex-col gap-1" aria-label={t("nearby.title")}>
            {alternatives.map((row) => {
              const kgm = formatKgm(row.massPerMeterKg);
              const delta = formatDelta(row.fitDeltaPercent);
              const heavierRow = (row.fitDeltaPercent ?? 0) > 0.5;
              const lighterRow = (row.fitDeltaPercent ?? 0) < -0.5;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onPick(row)}
                    className="flex w-full items-baseline gap-2 rounded-button text-left cursor-pointer hover:border-[var(--border)] transition-colors"
                    style={{
                      padding: "7px 10px",
                      border: "1px solid var(--border-faint)",
                      background: "var(--surface)",
                    }}
                    aria-label={t("nearby.pickAria", { label: row.label })}
                  >
                    <span className="min-w-0 flex-1 truncate font-bold text-[13px] text-foreground">
                      {row.label}
                    </span>
                    {kgm && (
                      <span className="font-mono text-[11px] text-muted flex-shrink-0">{kgm}</span>
                    )}
                    {delta && (
                      <span
                        className="font-mono text-[11px] flex-shrink-0"
                        style={{
                          // Direction, not verdict: heavier takes the accent,
                          // lighter stays ink. Which one you want is your call.
                          color: heavierRow
                            ? "var(--accent)"
                            : lighterRow
                              ? "var(--foreground-secondary)"
                              : "var(--muted)",
                        }}
                      >
                        {delta}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
