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
}: {
  input: CalculationInput;
  onPick: (row: ProfileSpecsFamilyRow) => void;
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
  const alternatives = (specs?.familyRows ?? []).filter((row) => !row.selected);
  if (alternatives.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5" style={{ paddingTop: 10 }}>
      <div className="fs-track-label text-[9.5px] font-bold text-muted uppercase">
        {t("nearby.title")}
      </div>
      <ul className="flex flex-col gap-1" aria-label={t("nearby.title")}>
        {alternatives.map((row) => {
          const kgm = formatKgm(row.massPerMeterKg);
          const delta = formatDelta(row.fitDeltaPercent);
          const heavier = (row.fitDeltaPercent ?? 0) > 0.5;
          const lighter = (row.fitDeltaPercent ?? 0) < -0.5;
          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onPick(row)}
                className="flex w-full items-baseline gap-2 rounded-button text-left cursor-pointer"
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
                    className="font-mono text-[11px] font-bold flex-shrink-0"
                    style={{
                      color: heavier ? "var(--accent-text)" : lighter ? "var(--green-text)" : "var(--muted)",
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
  );
}
