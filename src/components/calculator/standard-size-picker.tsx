"use client";

import { memo, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { DimensionKey, ProfileId } from "@/lib/datasets/types";
import type { DimensionPreset } from "@/hooks/usePresets";
import {
  STANDARD_SIZES,
  type StandardSize,
} from "@/lib/datasets/standard-sizes";
import { triggerHaptic } from "@/lib/haptics";

type SizeChip = {
  id: string;
  label: string;
  dimensions: Partial<Record<DimensionKey, number>>;
  kind: "standard" | "preset";
};

interface Props {
  profileId: ProfileId;
  customPresets: DimensionPreset[];
  /** Active dimensions, used to highlight the matching chip when known. */
  activeDimensions: Partial<Record<DimensionKey, number>>;
  onApply: (dimensions: Partial<Record<DimensionKey, number>>) => void;
  /** Optional cap on visible chips before "show all" reveals the rest. */
  initialLimit?: number;
}

function presetToChip(p: DimensionPreset): SizeChip {
  return {
    id: `preset_${p.id}`,
    label: p.label || "Saved",
    dimensions: p.manualDimensionsMm,
    kind: "preset",
  };
}

function standardToChip(s: StandardSize, idx: number): SizeChip {
  return {
    id: `std_${s.profileId}_${idx}`,
    label: s.label,
    dimensions: s.dimensions,
    kind: "standard",
  };
}

function dimensionsMatch(
  a: Partial<Record<DimensionKey, number>>,
  b: Partial<Record<DimensionKey, number>>,
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)] as DimensionKey[]);
  for (const k of keys) {
    if ((a[k] ?? 0) !== (b[k] ?? 0)) return false;
  }
  return true;
}

/**
 * Compact picker of standard sizes (built-in) + the user's custom dimension
 * presets for the current profile. Hidden when nothing exists. Designed to
 * sit above the manual dimension inputs.
 */
export const StandardSizePicker = memo(function StandardSizePicker({
  profileId,
  customPresets,
  activeDimensions,
  onApply,
  initialLimit = 8,
}: Props) {
  const t = useTranslations("standardSizes");

  const chips = useMemo<SizeChip[]>(() => {
    const presetChips = customPresets
      .filter((p) => p.profileId === profileId)
      .map(presetToChip);
    const stdChips = STANDARD_SIZES.filter((s) => s.profileId === profileId).map(
      standardToChip,
    );
    return [...presetChips, ...stdChips];
  }, [customPresets, profileId]);

  if (chips.length === 0) return null;

  const visible = chips.slice(0, initialLimit);
  const overflow = chips.length - visible.length;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">
        {t("title")}
      </span>
      <div className="flex flex-wrap gap-1 overflow-x-auto pr-1">
        {visible.map((chip) => {
          const isActive = dimensionsMatch(chip.dimensions, activeDimensions);
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onApply(chip.dimensions);
              }}
              title={chip.kind === "preset" ? t("savedHint") : t("standardHint")}
              className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-2xs font-semibold tabular-nums transition-colors ${
                isActive
                  ? "border-accent-border bg-accent-surface text-accent-text"
                  : chip.kind === "preset"
                    ? "border-border-strong/40 bg-surface text-foreground-secondary hover:border-border-strong"
                    : "border-border bg-surface text-foreground-secondary hover:border-border-strong"
              }`}
            >
              {chip.kind === "preset" && (
                <span className="text-[0.55rem] text-muted-faint">★</span>
              )}
              {chip.label}
            </button>
          );
        })}
        {overflow > 0 && (
          <span className="inline-flex h-7 shrink-0 items-center px-1 text-2xs text-muted-faint">
            +{overflow}
          </span>
        )}
      </div>
    </div>
  );
});
