"use client";

import { memo, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type {
  Project,
  ProjectCalculation,
} from "@/hooks/useProjects";
import { computeAggregates } from "@/hooks/useProjects";
import { CURRENCY_SYMBOLS, type CalculationInput } from "@/lib/calculator/types";
import { ProfileGlyph } from "@/components/profiles/profile-glyph";
import { triggerHaptic } from "@/lib/haptics";

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

function fmtKg(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  if (value >= 10000) return Math.round(value).toLocaleString();
  if (value >= 1000) return Math.round(value).toLocaleString();
  if (value >= 100) return value.toFixed(1);
  return value.toFixed(2);
}

function fmtCost(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Mobile Projects tab — full redesign. Hero card with the active
 * project's stats, horizontal project switcher chips below, parts
 * list with per-row ProfileGlyph + length + weight, sum strip at
 * the bottom, and a floating + FAB to create a project.
 */
export const MobileProjectsPage = memo(function MobileProjectsPage({
  projects,
  activeProjectId,
  onSetActiveProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onRemoveCalculation,
  onLoadCalculation,
}: Props) {
  const t = useTranslations();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");

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
    <div className="relative flex min-h-[80dvh] flex-col gap-3 pb-24">
      {/* Hero */}
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--panel-shadow-soft)]">
        {active && aggregates ? (
          <>
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-surface text-accent-text">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 20a2 2 0 002-2V8a2 2 0 00-2-2h-7.9a2 2 0 01-1.69-.9L9.6 3.9A2 2 0 008 3H4a2 2 0 00-2 2v13a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
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
                    className="truncate text-left text-base font-bold tracking-tight text-foreground"
                  >
                    {active.name}
                  </button>
                )}
                <span className="text-2xs text-muted">
                  {t("mobileProjects.heroHint", { count: aggregates.count })}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(t("mobileProjects.confirmDelete", { name: active.name }))) {
                    triggerHaptic("medium");
                    onDeleteProject(active.id);
                  }
                }}
                aria-label={t("mobileProjects.deleteAria")}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised text-muted hover:bg-red-surface hover:text-red-interactive"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                </svg>
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center rounded-md bg-accent-surface px-2 py-1 text-2xs font-bold tabular-nums text-accent-text">
                {fmtKg(aggregates.totalWeightKg)} kg
              </span>
              <span className="inline-flex items-center rounded-md bg-surface-raised px-2 py-1 text-2xs font-semibold tabular-nums text-foreground-secondary">
                {currency} {fmtCost(aggregates.totalCost)}
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold tracking-tight text-foreground">
              {projects.length === 0
                ? t("mobileProjects.heroEmptyTitle")
                : t("mobileProjects.heroPickTitle")}
            </span>
            <span className="text-2xs text-muted">
              {projects.length === 0
                ? t("mobileProjects.heroEmptyHint")
                : t("mobileProjects.heroPickHint")}
            </span>
          </div>
        )}
      </div>

      {/* Project switcher chips */}
      {projects.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {projects.map((p) => {
            const isActive = p.id === activeProjectId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  if (p.id === activeProjectId) return;
                  triggerHaptic("light");
                  onSetActiveProject(p.id);
                }}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${
                  isActive
                    ? "border-accent-border bg-accent-surface text-accent-text"
                    : "border-border bg-surface text-foreground-secondary"
                }`}
              >
                {p.name}
                <span
                  className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-2xs font-bold tabular-nums ${
                    isActive ? "bg-accent text-white" : "bg-surface-raised text-muted"
                  }`}
                >
                  {p.calculations.length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Parts list */}
      {active && active.calculations.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {active.calculations.map((calc) => (
            <PartRow
              key={calc.id}
              calc={calc}
              onLoad={() => onLoadCalculation(calc.input)}
              onRemove={() => {
                if (window.confirm(t("mobileProjects.confirmRemovePart"))) {
                  triggerHaptic("light");
                  onRemoveCalculation(active.id, calc.id);
                }
              }}
            />
          ))}
        </div>
      ) : active ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-10 text-center">
          <span className="block text-sm font-medium text-foreground-secondary">
            {t("mobileProjects.emptyTitle")}
          </span>
          <span className="mt-1 block text-2xs text-muted">
            {t("mobileProjects.emptyHint")}
          </span>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-10 text-center">
          <span className="block text-sm font-medium text-foreground-secondary">
            {t("mobileProjects.noProjectsTitle")}
          </span>
          <span className="mt-1 block text-2xs text-muted">
            {t("mobileProjects.noProjectsHint")}
          </span>
        </div>
      ) : null}

      {/* Sum strip */}
      {active && aggregates && aggregates.count > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-raised px-4 py-3">
          <div>
            <span className="block text-2xs font-bold uppercase tracking-[0.16em] text-muted">
              {t("desktopProject.projectTotal")}
            </span>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-2xl font-bold leading-none tracking-[-0.025em] tabular-nums text-foreground">
                {fmtKg(aggregates.totalWeightKg)}
              </span>
              <span className="text-sm font-semibold text-accent">kg</span>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-2xs font-bold uppercase tracking-[0.16em] text-muted">
              ≈ {t("desktopProject.cost")}
            </span>
            <span className="mt-0.5 block text-base font-bold tabular-nums tracking-tight text-foreground">
              {currency} {fmtCost(aggregates.totalCost)}
            </span>
          </div>
        </div>
      )}

      {/* FAB */}
      {!creating ? (
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setCreating(true);
          }}
          aria-label={t("mobileProjects.createAria")}
          className="fixed bottom-6 right-4 z-30 inline-flex h-12 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-bold text-white shadow-[var(--panel-shadow-strong)] active:bg-accent-hover"
          style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t("mobileProjects.create")}
        </button>
      ) : (
        <div
          className="fixed inset-x-3 z-30 flex items-center gap-2 rounded-2xl border border-border bg-surface p-2 shadow-[var(--panel-shadow-strong)]"
          style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
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
            className="h-10 w-full rounded-lg border border-border bg-surface-raised px-3 text-sm text-foreground outline-none placeholder:text-muted-faint focus:border-accent-border"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-3 text-xs font-bold text-white disabled:opacity-50"
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
    </div>
  );
});

interface PartRowProps {
  calc: ProjectCalculation;
  onLoad: () => void;
  onRemove: () => void;
}

function PartRow({ calc, onLoad, onRemove }: PartRowProps) {
  const profile = calc.normalizedProfile;
  const result = calc.result;
  const sub = `${(result.lengthMm / 1000).toFixed(result.lengthMm >= 10000 ? 1 : 2)} m × ${result.quantity}`;

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5">
      <button
        type="button"
        onClick={onLoad}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
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
        <span className="text-right">
          <span className="block text-sm font-bold tabular-nums tracking-tight text-foreground">
            {fmtKg(result.totalWeightKg)}
          </span>
          <span className="block text-2xs text-muted">kg</span>
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
