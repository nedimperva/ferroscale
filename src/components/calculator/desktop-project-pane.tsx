"use client";

import { memo, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Project, ProjectCalculation } from "@/hooks/useProjects";
import { computeAggregates } from "@/hooks/useProjects";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import { ProfileGlyph } from "@/components/profiles/profile-glyph";
import { triggerHaptic } from "@/lib/haptics";

interface Props {
  project: Project | null;
  projects: Project[];
  onSetActiveProject: (id: string) => void;
  onOpenProjectsTab: () => void;
  onLoadCalculation: (calc: ProjectCalculation) => void;
  onRemoveCalculation: (projectId: string, calcId: string) => void;
}

function fmtKg(value: number, locale: string): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  if (value >= 1000) return Math.round(value).toLocaleString(locale);
  if (value >= 100) return value.toFixed(1);
  return value.toFixed(2);
}

function fmtCost(value: number, locale: string): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * D3 "Bench" right pane — always-visible project panel on the desktop
 * calculator. Shows the active project's parts list with a sum strip
 * footer. When no project is active, surfaces a picker / empty state.
 */
export const DesktopProjectPane = memo(function DesktopProjectPane({
  project,
  projects,
  onSetActiveProject,
  onOpenProjectsTab,
  onLoadCalculation,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();

  const aggregates = useMemo(
    () => (project ? computeAggregates(project) : null),
    [project],
  );
  const currency = aggregates
    ? CURRENCY_SYMBOLS[aggregates.currency] ?? aggregates.currency
    : "€";

  return (
    <aside className="hidden h-full w-[300px] shrink-0 flex-col border-l border-border bg-surface lg:flex xl:w-[360px]">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        {project ? (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-bold tracking-tight text-foreground">
              {project.name}
            </span>
            <span className="truncate text-2xs text-muted">
              {t("desktopProject.headerSummary", {
                count: aggregates?.count ?? 0,
                weight: fmtKg(aggregates?.totalWeightKg ?? 0, locale),
                currency,
                cost: fmtCost(aggregates?.totalCost ?? 0, locale),
              })}
            </span>
          </div>
        ) : (
          <span className="text-sm font-bold tracking-tight text-foreground">
            {t("desktopProject.noActiveTitle")}
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onOpenProjectsTab();
          }}
          aria-label={t("desktopProject.manageAria")}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-inset text-foreground-secondary transition-colors hover:bg-surface-emphasis"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      </div>

      {/* Body */}
      {project && project.calculations.length > 0 ? (
        <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-3">
          {project.calculations.map((calc) => {
            const profile = calc.normalizedProfile;
            const profileId = calc.input.profileId;
            const result = calc.result;
            const sub = `${(result.lengthMm / 1000).toFixed(result.lengthMm >= 10000 ? 1 : 2)} m × ${result.quantity}`;
            return (
              <button
                key={calc.id}
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onLoadCalculation(calc);
                }}
                className="flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-surface-raised"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-inset text-foreground-secondary">
                  <ProfileGlyph profileId={profileId} size="xs" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-xs font-semibold tracking-tight text-foreground">
                    {profile.shortLabel}
                    <span className="ml-1 font-medium text-muted">
                      · {result.gradeLabel}
                    </span>
                  </span>
                  <span className="truncate text-2xs text-muted">{sub}</span>
                </span>
                <span className="text-right">
                  <span className="block text-xs font-bold tabular-nums tracking-tight text-foreground">
                    {fmtKg(result.totalWeightKg, locale)}
                  </span>
                  <span className="block text-2xs text-muted">kg</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : project ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-6 py-10 text-center">
          <span className="text-sm font-medium text-foreground-secondary">
            {t("desktopProject.emptyTitle")}
          </span>
          <span className="text-2xs text-muted">
            {t("desktopProject.emptyHint")}
          </span>
        </div>
      ) : projects.length > 0 ? (
        <div className="flex flex-1 flex-col gap-2 p-4">
          <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">
            {t("desktopProject.pickActive")}
          </span>
          <div className="flex flex-col gap-1.5">
            {projects.slice(0, 8).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onSetActiveProject(p.id);
                }}
                className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-left transition-colors hover:border-accent-border hover:bg-accent-surface"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {p.name}
                  </span>
                  <span className="text-2xs text-muted">
                    {t("desktopProject.partsCount", {
                      count: p.calculations.length,
                    })}
                  </span>
                </span>
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                  <path d="M1 1l5 5-5 5" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-surface text-accent-text">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 20a2 2 0 002-2V8a2 2 0 00-2-2h-7.9a2 2 0 01-1.69-.9L9.6 3.9A2 2 0 008 3H4a2 2 0 00-2 2v13a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-foreground-secondary">
            {t("desktopProject.noProjectsTitle")}
          </span>
          <span className="text-2xs text-muted">
            {t("desktopProject.noProjectsHint")}
          </span>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onOpenProjectsTab();
            }}
            className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-xl bg-foreground px-3 text-xs font-semibold text-background"
          >
            {t("desktopProject.openProjectsTab")}
          </button>
        </div>
      )}

      {/* Sum strip */}
      {project && aggregates && aggregates.count > 0 && (
        <div className="flex items-center justify-between border-t border-border bg-surface-raised px-4 py-3.5">
          <div>
            <span className="block text-2xs font-bold uppercase tracking-[0.16em] text-muted">
              {t("desktopProject.projectTotal")}
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold leading-none tracking-[-0.025em] tabular-nums text-foreground">
                {fmtKg(aggregates.totalWeightKg, locale)}
              </span>
              <span className="text-sm font-semibold text-accent">kg</span>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-2xs font-bold uppercase tracking-[0.16em] text-muted">
              ≈ {t("desktopProject.cost")}
            </span>
            <span className="mt-1 block text-base font-bold tabular-nums tracking-tight text-foreground">
              {currency} {fmtCost(aggregates.totalCost, locale)}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
});
