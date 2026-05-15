"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import type { CompareItem } from "@/hooks/useCompare";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import { ProfileGlyph } from "@/components/profiles/profile-glyph";
import { triggerHaptic } from "@/lib/haptics";

interface Props {
  items: CompareItem[];
  onRemove: (id: string) => void;
  onOpen: () => void;
  variant?: "light" | "dark";
}

function fmtKg(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  if (value >= 1000) return Math.round(value).toLocaleString();
  if (value >= 100) return value.toFixed(0);
  return value.toFixed(1);
}

/**
 * Compare scratchpad attached to the live result. Renders pinned
 * items as small chips with a profile glyph + short label + tabular
 * weight + ✕. The trailing "Compare {n}" button opens the existing
 * CompareDrawer for the full comparison view.
 *
 * Renders nothing when there are no pinned items.
 */
export const CompareTray = memo(function CompareTray({
  items,
  onRemove,
  onOpen,
  variant = "light",
}: Props) {
  const t = useTranslations();
  if (items.length === 0) return null;

  const dark = variant === "dark";

  return (
    <div
      className={`flex items-center gap-1.5 overflow-x-auto rounded-2xl border px-2 py-1.5 ${
        dark
          ? "border-white/10 bg-white/5"
          : "border-border bg-surface"
      }`}
      role="region"
      aria-label={t("compareTray.aria")}
    >
      <span
        className={`shrink-0 text-2xs font-bold uppercase tracking-[0.14em] ${
          dark ? "text-background/70" : "text-muted"
        }`}
      >
        {t("compareTray.label")}
      </span>
      <div className="flex min-w-0 items-center gap-1">
        {items.map((item) => {
          const currency = CURRENCY_SYMBOLS[item.result.currency] ?? item.result.currency;
          return (
            <span
              key={item.id}
              className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2 ${
                dark
                  ? "border-white/10 bg-white/10 text-background"
                  : "border-border bg-surface-raised text-foreground"
              }`}
              title={`${item.normalizedProfile.shortLabel} · ${item.result.gradeLabel} · ${currency} ${item.result.grandTotalAmount.toFixed(2)}`}
            >
              <ProfileGlyph profileId={item.input.profileId} size="xs" />
              <span className="max-w-[6rem] truncate text-2xs font-semibold tracking-tight">
                {item.normalizedProfile.shortLabel}
              </span>
              <span
                className={`text-2xs tabular-nums ${
                  dark ? "text-background/70" : "text-muted"
                }`}
              >
                {fmtKg(item.result.totalWeightKg)} kg
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  triggerHaptic("light");
                  onRemove(item.id);
                }}
                aria-label={t("compareTray.remove")}
                className={`-mr-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${
                  dark
                    ? "text-background/60 hover:bg-white/10 hover:text-background"
                    : "text-muted hover:bg-surface-inset hover:text-foreground"
                }`}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </span>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => {
          triggerHaptic("light");
          onOpen();
        }}
        className={`ml-auto inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-2xs font-bold tracking-tight transition-colors ${
          dark
            ? "bg-accent text-white hover:bg-accent-hover"
            : "bg-foreground text-background hover:bg-foreground/90"
        }`}
      >
        {t("compareTray.openCount", { count: items.length })}
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
});
