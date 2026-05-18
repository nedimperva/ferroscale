"use client";

import { memo, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type {
  Project,
  ProjectCalculation,
} from "@/hooks/useProjects";
import { computeAggregates } from "@/hooks/useProjects";
import { CURRENCY_SYMBOLS, type CalculationInput } from "@/lib/calculator/types";
import { ProfileGlyph } from "@/components/profiles/profile-glyph";
import { triggerHaptic } from "@/lib/haptics";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Props {
  projects: Project[];
  activeProjectId: string | null;
  onSetActiveProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  onRemoveCalculation: (projectId: string, calcId: string) => void;
  onLoadCalculation: (input: CalculationInput) => void;
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
 * Desktop Projects tab — full redesign. 2-column workshop: left rail
 * lists every project (active chip uses accent surface, badge shows
 * parts count), right side renders the active project detail — hero
 * with stats and actions (rename, duplicate, delete), scrollable
 * parts list with per-row ProfileGlyph, sum strip at the bottom.
 */
export const DesktopProjectsPage = memo(function DesktopProjectsPage({
  projects,
  activeProjectId,
  onSetActiveProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onDuplicateProject,
  onRemoveCalculation,
  onLoadCalculation,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [removingCalc, setRemovingCalc] = useState<{ projectId: string; calcId: string } | null>(null);

  const active = useMemo(
    () => (activeProjectId ? projects.find((p) => p.id === activeProjectId) ?? null : null),
    [activeProjectId, projects],
  );

  const aggregates = useMemo(() => (active ? computeAggregates(active) : null), [active]);
  const currency = aggregates
    ? CURRENCY_SYMBOLS[aggregates.currency] ?? aggregates.currency
    : "€";

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    triggerHaptic("medium");
    onCreateProject(name);
    setNewName("");
    setCreating(false);
  };

  const handleRename = () => {
    if (!active) return;
    const name = renameDraft.trim();
    if (!name) {
      setRenaming(false);
      return;
    }
    triggerHaptic("light");
    onRenameProject(active.id, name);
    setRenaming(false);
  };

  return (
    <div className="hidden h-[calc(100dvh-env(safe-area-inset-top,0px))] min-h-0 lg:flex">
      {/* Left rail */}
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-border bg-background xl:w-[300px]">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <h2 className="text-base font-bold tracking-tight text-foreground">
            {t("tabs.projects")}
          </h2>
          {!creating && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setCreating(true);
              }}
              aria-label={t("mobileProjects.createAria")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-inverted text-background shadow-[0_8px_18px_-10px_rgba(20,18,15,0.4)] hover:opacity-90"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          )}
        </div>

        {creating && (
          <div className="flex items-center gap-1.5 border-b border-border bg-surface px-3 py-2">
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
              className="h-9 w-full rounded-lg border border-border bg-surface-raised px-3 text-sm text-foreground outline-none focus:border-accent-border"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="inline-flex h-9 items-center rounded-lg bg-surface-inverted px-2.5 text-xs font-bold text-background disabled:opacity-50"
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {projects.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <span className="block text-sm font-medium text-foreground-secondary">
                {t("mobileProjects.noProjectsTitle")}
              </span>
              <span className="mt-1 block text-2xs text-muted">
                {t("desktopProjects.railEmptyHint")}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {projects.map((p) => {
                const isActive = p.id === activeProjectId;
                const agg = computeAggregates(p);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      onSetActiveProject(p.id);
                    }}
                    className={`relative flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? "bg-surface-raised before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r before:bg-accent"
                        : "bg-transparent hover:bg-surface"
                    }`}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span
                        className={`truncate text-sm font-semibold tracking-tight ${
                          isActive ? "text-foreground" : "text-foreground"
                        }`}
                      >
                        {p.name}
                      </span>
                      <span className="text-2xs text-muted">
                        {t("desktopProject.partsCount", { count: p.calculations.length })}
                        {agg.totalWeightKg > 0 ? ` · ${fmtKg(agg.totalWeightKg, locale)} kg` : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Detail */}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        {active && aggregates ? (
          <>
            {/* Header */}
            <div className="flex h-14 items-center justify-between gap-3 border-b border-border px-5">
              <div className="flex min-w-0 items-center gap-3">
                {renaming ? (
                  <input
                    type="text"
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename();
                      if (e.key === "Escape") setRenaming(false);
                    }}
                    className="w-full border-b border-accent-border bg-transparent text-base font-bold tracking-tight text-foreground outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setRenameDraft(active.name);
                      setRenaming(true);
                    }}
                    className="truncate text-left text-base font-bold tracking-tight text-foreground hover:text-accent-text"
                  >
                    {active.name}
                  </button>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onDuplicateProject(active.id);
                  }}
                  aria-label={t("desktopProjects.duplicate")}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground-secondary hover:bg-surface-raised"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  {t("desktopProjects.duplicate")}
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingProject(active)}
                  aria-label={t("mobileProjects.deleteAria")}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground-secondary hover:border-red-border hover:bg-red-surface hover:text-red-interactive"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                  </svg>
                  {t("desktopProjects.delete")}
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-5 py-4">
              {/* Hero */}
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-foreground px-5 py-4 text-background shadow-[0_14px_30px_-18px_rgba(20,18,15,0.4)]">
                <div className="flex items-center gap-3.5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-background">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 20a2 2 0 002-2V8a2 2 0 00-2-2h-7.9a2 2 0 01-1.69-.9L9.6 3.9A2 2 0 008 3H4a2 2 0 00-2 2v13a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <div>
                    <span className="block text-2xs font-bold uppercase tracking-[0.16em] text-background/60">
                      {t("desktopProject.projectTotal")}
                    </span>
                    <div className="mt-0.5 flex items-baseline gap-1.5">
                      <span className="text-[1.875rem] font-bold leading-none tracking-[-0.04em] tabular-nums">
                        {fmtKg(aggregates.totalWeightKg, locale)}
                      </span>
                      <span className="text-sm font-semibold text-accent">kg</span>
                      <span className="ml-2 text-sm font-semibold tabular-nums text-background/85">
                        {currency}&nbsp;{fmtCost(aggregates.totalCost, locale)}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-2xs font-bold uppercase tracking-[0.14em] text-background">
                  {t("desktopProject.partsCount", { count: aggregates.count })}
                </span>
              </div>

              {/* Parts list */}
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-border bg-surface">
                {active.calculations.length > 0 ? (
                  <div className="divide-y divide-border">
                    {active.calculations.map((calc) => (
                      <DesktopPartRow
                        key={calc.id}
                        calc={calc}
                        currency={currency}
                        locale={locale}
                        onLoad={() => onLoadCalculation(calc.input)}
                        onRemove={() => setRemovingCalc({ projectId: active.id, calcId: calc.id })}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 py-10 text-center">
                    <span className="text-sm font-medium text-foreground-secondary">
                      {t("mobileProjects.emptyTitle")}
                    </span>
                    <span className="text-2xs text-muted">
                      {t("mobileProjects.emptyHint")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-surface text-accent-text">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 20a2 2 0 002-2V8a2 2 0 00-2-2h-7.9a2 2 0 01-1.69-.9L9.6 3.9A2 2 0 008 3H4a2 2 0 00-2 2v13a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">
              {projects.length === 0
                ? t("mobileProjects.noProjectsTitle")
                : t("mobileProjects.heroPickTitle")}
            </span>
            <span className="text-xs text-muted">
              {projects.length === 0
                ? t("desktopProjects.detailEmptyHint")
                : t("desktopProjects.detailPickHint")}
            </span>
          </div>
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
      <ConfirmDialog
        open={removingCalc != null}
        title={t("confirmDialog.removePartTitle")}
        message={t("mobileProjects.confirmRemovePart")}
        confirmLabel={t("confirmDialog.remove")}
        cancelLabel={t("confirmDialog.cancel")}
        destructive
        onConfirm={() => {
          if (removingCalc) {
            triggerHaptic("light");
            onRemoveCalculation(removingCalc.projectId, removingCalc.calcId);
          }
          setRemovingCalc(null);
        }}
        onCancel={() => setRemovingCalc(null)}
      />
    </div>
  );
});

interface DesktopPartRowProps {
  calc: ProjectCalculation;
  currency: string;
  locale: string;
  onLoad: () => void;
  onRemove: () => void;
}

function DesktopPartRow({ calc, currency, locale, onLoad, onRemove }: DesktopPartRowProps) {
  const profile = calc.normalizedProfile;
  const result = calc.result;
  const sub = `${(result.lengthMm / 1000).toFixed(result.lengthMm >= 10000 ? 1 : 2)} m × ${result.quantity}`;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-raised">
      <button
        type="button"
        onClick={onLoad}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-foreground-secondary">
          <ProfileGlyph profileId={calc.input.profileId} size="sm" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold tracking-tight text-foreground">
            {profile.shortLabel}
            <span className="ml-1 font-medium text-muted">· {result.gradeLabel}</span>
          </span>
          <span className="truncate text-2xs text-muted">{sub}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-sm font-bold tabular-nums tracking-tight text-foreground">
            {fmtKg(result.totalWeightKg, locale)} kg
          </span>
          <span className="block text-2xs tabular-nums text-muted">
            {currency} {fmtCost(result.grandTotalAmount, locale)}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove part"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-red-surface hover:text-red-interactive"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
        </svg>
      </button>
    </div>
  );
}
