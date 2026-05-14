"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import type { SavedEntry } from "@/hooks/useSaved";
import type { Project } from "@/hooks/useProjects";
import { computeAggregates } from "@/hooks/useProjects";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";

function fmtKg(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  if (value >= 10000) return Math.round(value).toLocaleString();
  if (value >= 1000) return Math.round(value).toLocaleString();
  if (value >= 100) return value.toFixed(1);
  return value.toFixed(2);
}

interface SavedHeroProps {
  saved: SavedEntry[];
}

/**
 * Hero card for the mobile Saved (Templates) tab. Mirrors the
 * "Defaults applied" pattern from Settings: rounded surface card
 * with an accent-tinted badge + count + total weight stat.
 */
export const MobileSavedHero = memo(function MobileSavedHero({ saved }: SavedHeroProps) {
  const t = useTranslations("mobileTabHero");
  const count = saved.length;
  const totalWeightKg = saved.reduce((acc, entry) => {
    const partsWeight = entry.parts.reduce(
      (sum, part) => sum + (part.result?.totalWeightKg ?? 0),
      0,
    );
    return acc + (partsWeight || entry.result?.totalWeightKg || 0);
  }, 0);

  const totalUseCount = saved.reduce(
    (acc, entry) => acc + (entry.useCount || 0),
    0,
  );

  return (
    <div className="mb-3 rounded-2xl border border-border bg-surface p-3.5 shadow-[var(--panel-shadow-soft)]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-surface text-accent-text">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.6 3.3c1.1.1 1.9 1 1.9 2.2V21l-7.5-3.8L4.5 21V5.5c0-1.1.8-2.1 1.9-2.2 3.7-.4 7.5-.4 11.2 0z" />
          </svg>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-bold tracking-tight text-foreground">
            {count > 0 ? t("savedCount", { count }) : t("savedEmpty")}
          </span>
          {count > 0 && (
            <span className="text-2xs text-muted">
              {t("savedHint", {
                weight: fmtKg(totalWeightKg),
                used: totalUseCount,
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

interface ProjectsHeroProps {
  projects: Project[];
  activeProjectId: string | null;
}

/**
 * Hero card for the mobile Projects tab. If there's an active
 * project it shows its aggregate stats; otherwise it shows the
 * overall project count and a hint.
 */
export const MobileProjectsHero = memo(function MobileProjectsHero({
  projects,
  activeProjectId,
}: ProjectsHeroProps) {
  const t = useTranslations("mobileTabHero");
  const active = activeProjectId
    ? projects.find((p) => p.id === activeProjectId) ?? null
    : null;

  const projectCount = projects.length;

  if (!active) {
    return (
      <div className="mb-3 rounded-2xl border border-border bg-surface p-3.5 shadow-[var(--panel-shadow-soft)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-surface text-accent-text">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 20a2 2 0 002-2V8a2 2 0 00-2-2h-7.9a2 2 0 01-1.69-.9L9.6 3.9A2 2 0 008 3H4a2 2 0 00-2 2v13a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-bold tracking-tight text-foreground">
              {projectCount > 0
                ? t("projectsCount", { count: projectCount })
                : t("projectsEmpty")}
            </span>
            <span className="text-2xs text-muted">
              {projectCount > 0
                ? t("projectsPickHint")
                : t("projectsCreateHint")}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const aggregates = computeAggregates(active);
  const currency = CURRENCY_SYMBOLS[aggregates.currency] ?? aggregates.currency;

  return (
    <div className="mb-3 rounded-2xl border border-border bg-surface p-3.5 shadow-[var(--panel-shadow-soft)]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-surface text-accent-text">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 20a2 2 0 002-2V8a2 2 0 00-2-2h-7.9a2 2 0 01-1.69-.9L9.6 3.9A2 2 0 008 3H4a2 2 0 00-2 2v13a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-bold tracking-tight text-foreground">
            {active.name}
          </span>
          <span className="text-2xs text-muted">
            {t("projectsActiveHint", {
              count: aggregates.count,
            })}
          </span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center rounded-md bg-accent-surface px-2 py-0.5 text-2xs font-semibold tabular-nums text-accent-text">
              {fmtKg(aggregates.totalWeightKg)} kg
            </span>
            <span className="inline-flex items-center rounded-md bg-surface-raised px-2 py-0.5 text-2xs font-semibold tabular-nums text-foreground-secondary">
              {currency} {aggregates.totalCost.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
