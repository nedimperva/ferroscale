"use client";

import { memo, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Project } from "@/hooks/useProjects";
import { computeAggregates } from "@/hooks/useProjects";
import { CURRENCY_SYMBOLS, type CalculationInput, type CurrencyCode } from "@/lib/calculator/types";
import { triggerHaptic } from "@/lib/haptics";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Props {
  projects: Project[];
  activeProjectId: string | null;
  onSetActiveProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  onRemoveCalculation: (projectId: string, calcId: string) => void;
  onLoadCalculation: (input: CalculationInput) => void;
}

function fmtKg(value: number, locale: string): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  if (value >= 1000) return Math.round(value).toLocaleString(locale);
  if (value >= 100) return value.toFixed(0);
  return value.toFixed(1);
}

function fmtCost(value: number, locale: string): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatRelative(iso: string | undefined): { value: number; unit: "min" | "h" | "d"; recent: boolean } | "now" | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return { value: minutes, unit: "min", recent: true };
  const hours = Math.round(minutes / 60);
  if (hours < 24) return { value: hours, unit: "h", recent: false };
  const days = Math.round(hours / 24);
  return { value: days, unit: "d", recent: false };
}

/**
 * Mobile Projects tab — flat list (review design "simplified" §11).
 * Header with title + actions, totals subtitle, pinned active card on
 * top, then a row for every project. Tap a project → detail screen.
 */
export const MobileProjectsPage = memo(function MobileProjectsPage({
  projects,
  activeProjectId,
  onSetActiveProject,
  onCreateProject,
  onDeleteProject,
  onLoadCalculation: _onLoadCalculation,
  onRenameProject: _onRenameProject,
  onRemoveCalculation: _onRemoveCalculation,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const aggregatesAll = useMemo(() => {
    let totalWeight = 0;
    let totalCost = 0;
    let currency: CurrencyCode = "EUR";
    for (const project of projects) {
      const agg = computeAggregates(project);
      totalWeight += agg.totalWeightKg;
      totalCost += agg.totalCost;
      if (agg.count > 0) currency = agg.currency;
    }
    return { count: projects.length, totalWeight, totalCost, currency };
  }, [projects]);

  const active = useMemo(
    () => (activeProjectId ? projects.find((p) => p.id === activeProjectId) ?? null : null),
    [activeProjectId, projects],
  );
  const activeAggregates = useMemo(() => (active ? computeAggregates(active) : null), [active]);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    triggerHaptic("medium");
    onCreateProject(name);
    setNewName("");
    setCreating(false);
  };

  const currencySymbol = CURRENCY_SYMBOLS[aggregatesAll.currency] ?? String(aggregatesAll.currency);

  return (
    <div className="relative flex min-h-[80dvh] flex-col gap-3 pb-8">
      {/* Header (review design): title + Search + New */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-[-0.04em] text-foreground">
            {t("mobileProjects.title")}
          </h1>
          <span className="mt-1 block text-sm text-foreground-secondary tabular-nums">
            {projects.length === 0
              ? t("mobileProjects.summaryEmpty")
              : t("mobileProjects.summary", {
                  count: aggregatesAll.count,
                  weight: fmtKg(aggregatesAll.totalWeight, locale),
                  currency: currencySymbol,
                  cost: fmtCost(aggregatesAll.totalCost, locale),
                })}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-label={t("mobileSaved.searchAria")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground-secondary active:bg-surface-raised"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setCreating(true);
            }}
            aria-label={t("mobileProjects.createAria")}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface-inverted px-3 text-xs font-bold text-background shadow-[var(--panel-shadow-soft)] active:opacity-90"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t("mobileProjects.create")}
          </button>
        </div>
      </div>

      {/* Inline create row appears just under the header. */}
      {creating && (
        <div className="flex items-center gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-2 shadow-[var(--panel-shadow-soft)]">
          <input
            type="text"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setNewName("");
                setCreating(false);
              }
            }}
            placeholder={t("mobileProjects.createPlaceholder")}
            className="h-10 flex-1 rounded-lg border border-border bg-surface-raised px-3 text-sm text-foreground outline-none placeholder:text-muted-faint focus:border-accent-border"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-surface-inverted px-3 text-xs font-bold text-background disabled:opacity-50"
          >
            {t("mobileCalc.done")}
          </button>
          <button
            type="button"
            onClick={() => {
              setNewName("");
              setCreating(false);
            }}
            aria-label={t("mobileProjects.cancelAria")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-muted"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Pinned active card — surface-inverted hero showing the active
          project's stats. Tap to open detail. */}
      {active && activeAggregates && (
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onSetActiveProject(active.id);
          }}
          className="rounded-[var(--radius-card)] bg-surface-inverted p-4 text-left text-background shadow-[0_14px_30px_-18px_rgba(0,0,0,0.4)] active:opacity-95"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-[var(--label-tracking)] text-background/65">
              {t("mobileProjects.activeLabel")}
            </span>
            <span className="text-2xs text-background/55">{t("mobileProjects.activePinned")}</span>
          </div>
          <div className="mt-1 truncate text-xl font-bold tracking-[-0.025em]">{active.name}</div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <HeroStat
              label={t("mobileProjects.partsLabel")}
              value={String(activeAggregates.count)}
            />
            <HeroStat
              label={t("mobileProjects.weightLabel")}
              value={fmtKg(activeAggregates.totalWeightKg, locale)}
              unit="kg"
            />
            <HeroStat
              label={t("mobileProjects.costLabel")}
              value={`${CURRENCY_SYMBOLS[activeAggregates.currency] ?? activeAggregates.currency} ${fmtCost(activeAggregates.totalCost, locale)}`}
            />
          </div>
        </button>
      )}

      {/* Flat project list */}
      <div className="flex flex-col gap-2">
        {projects.length === 0 && !creating && (
          <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-surface px-4 py-10 text-center">
            <span className="block text-sm font-medium text-foreground-secondary">
              {t("mobileProjects.noProjectsTitle")}
            </span>
            <span className="mt-1 block text-2xs text-muted">
              {t("mobileProjects.noProjectsHint")}
            </span>
          </div>
        )}

        {projects.map((project, index) => {
          const isActive = project.id === activeProjectId;
          const agg = computeAggregates(project);
          const projectCurrency = CURRENCY_SYMBOLS[agg.currency] ?? agg.currency;
          const tone = PROJECT_TONES[index % PROJECT_TONES.length];
          const rel = formatRelative(project.updatedAt);
          const updatedLabel =
            rel === null
              ? null
              : rel === "now"
                ? t("mobileProjects.updatedJustNow")
                : t("mobileProjects.updatedRecent", { value: rel.value, unit: rel.unit });
          return (
            <button
              key={project.id}
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onSetActiveProject(project.id);
              }}
              className={`flex w-full items-center gap-3 rounded-[var(--radius-card)] border bg-surface px-3.5 py-3 text-left transition-colors active:bg-surface-raised ${
                isActive ? "border-accent-border" : "border-border"
              }`}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-white"
                style={{ background: tone, opacity: 0.85 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 20a2 2 0 002-2V8a2 2 0 00-2-2h-7.9a2 2 0 01-1.69-.9L9.6 3.9A2 2 0 008 3H4a2 2 0 00-2 2v13a2 2 0 002 2z" />
                </svg>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-bold tracking-[-0.01em] text-foreground">
                  {project.name}
                </span>
                <span className="truncate text-2xs text-muted">
                  {t("mobileProjects.heroHint", { count: agg.count })}
                  {updatedLabel ? ` · ${updatedLabel}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="flex items-baseline justify-end gap-1">
                  <span className="text-base font-bold leading-none tabular-nums tracking-[-0.02em] text-foreground">
                    {fmtKg(agg.totalWeightKg, locale)}
                  </span>
                  <span className="text-2xs text-muted">kg</span>
                </span>
                <span className="mt-1 block text-2xs tabular-nums text-muted">
                  {projectCurrency} {fmtCost(agg.totalCost, locale)}
                </span>
              </span>
            </button>
          );
        })}

        {!creating && projects.length > 0 && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setCreating(true);
            }}
            className="flex h-14 items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-border-strong bg-transparent text-sm font-semibold text-foreground-secondary active:bg-surface"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t("mobileProjects.newProjectRow")}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={deletingProject != null}
        title={t("confirmDialog.deleteTitle")}
        message={
          deletingProject
            ? t("mobileProjects.confirmDelete", { name: deletingProject.name })
            : ""
        }
        confirmLabel={t("confirmDialog.delete")}
        cancelLabel={t("confirmDialog.cancel")}
        destructive
        onConfirm={() => {
          if (deletingProject) {
            triggerHaptic("medium");
            onDeleteProject(deletingProject.id);
          }
          setDeletingProject(null);
        }}
        onCancel={() => setDeletingProject(null)}
      />
    </div>
  );
});

const PROJECT_TONES = [
  "#a08373",
  "#7a6557",
  "#bcc0c7",
  "#aab4be",
  "#bf8f5e",
  "#967e6c",
];

function HeroStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <span className="block text-[0.55rem] font-bold uppercase tracking-[var(--label-tracking)] text-background/55">
        {label}
      </span>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-base font-bold leading-none tabular-nums tracking-[-0.02em] text-background">
          {value}
        </span>
        {unit && <span className="text-2xs text-background/70">{unit}</span>}
      </div>
    </div>
  );
}
