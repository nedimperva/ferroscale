"use client";

import { memo, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Project } from "@/hooks/useProjects";
import { computeAggregates } from "@/hooks/useProjects";
import { CURRENCY_SYMBOLS, type CalculationInput, type CurrencyCode } from "@/lib/calculator/types";
import type { ProfileId } from "@/lib/datasets/types";
import { ProfileGlyph } from "@/components/profiles/profile-glyph";
import { triggerHaptic } from "@/lib/haptics";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Props {
  projects: Project[];
  activeProjectId: string | null;
  /** Tap-card: set active + navigate to detail. */
  onSetActiveProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  onRemoveCalculation: (projectId: string, calcId: string) => void;
  onMoveCalculation?: (fromProjectId: string, calcId: string, toProjectId: string) => boolean;
  onLoadCalculation: (input: CalculationInput) => void;
}

const PROJECT_TONES = [
  "#a35a32",
  "#7a6557",
  "#bcc0c7",
  "#aab4be",
  "#a08373",
  "#c08552",
];

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

function formatRelative(iso: string | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function profileMix(project: Project): Array<{ key: string; profileId: ProfileId; count: number }> {
  const map = new Map<string, { profileId: ProfileId; count: number }>();
  for (const calc of project.calculations) {
    const key = calc.normalizedProfile.iconKey;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { profileId: calc.input.profileId, count: 1 });
    }
  }
  return Array.from(map, ([key, value]) => ({ key, profileId: value.profileId, count: value.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}

/**
 * Desktop Projects — 3-column grid of project cards (handoff "simplified" §D4).
 *
 * Each card: tone strip on top, folder icon + updated time, big project
 * name, total kg + cost, and a row of profile-mix chips. The first
 * project (newest active) renders inverted with a "PINNED" badge.
 *
 * Tap card → navigates to /projects/<id> via onSetActiveProject.
 */
export const DesktopProjectsPage = memo(function DesktopProjectsPage({
  projects,
  activeProjectId,
  onSetActiveProject,
  onCreateProject,
  onDeleteProject,
  onDuplicateProject,
  onRemoveCalculation: _onRemoveCalculation,
  onMoveCalculation,
  onLoadCalculation: _onLoadCalculation,
  onRenameProject: _onRenameProject,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);

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

  const currencySymbol = CURRENCY_SYMBOLS[aggregatesAll.currency] ?? String(aggregatesAll.currency);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    triggerHaptic("medium");
    onCreateProject(name);
    setNewName("");
    setCreating(false);
  };

  return (
    <div className="hidden h-[calc(100dvh-env(safe-area-inset-top,0px))] min-h-0 flex-1 flex-col bg-background lg:flex">
      {/* Topbar — locked to 48px per review §06. */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border px-6">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="text-lg font-bold tracking-[-0.02em] text-foreground">
            {t("mobileProjects.title")}
          </h1>
          <span className="text-xs tabular-nums text-muted">
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
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setCreating(true);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-foreground px-3.5 text-xs font-semibold text-background shadow-[0_10px_20px_-10px_rgba(20,18,15,0.4)] hover:bg-foreground/90"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t("mobileProjects.create")}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {creating && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-border bg-surface p-2 shadow-[var(--panel-shadow-soft)]">
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
              className="h-9 flex-1 rounded-lg border border-border bg-surface-raised px-3 text-sm text-foreground outline-none focus:border-accent-border"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="inline-flex h-9 items-center rounded-lg bg-foreground px-3 text-xs font-bold text-background disabled:opacity-50"
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project, index) => {
            const isPinned = project.id === activeProjectId;
            const tone = PROJECT_TONES[index % PROJECT_TONES.length];
            const isDropTarget = dragTargetId === project.id;
            return (
              <ProjectCard
                key={project.id}
                project={project}
                tone={tone}
                pinned={isPinned}
                locale={locale}
                isDropTarget={isDropTarget}
                onClick={() => {
                  triggerHaptic("light");
                  onSetActiveProject(project.id);
                }}
                onDuplicate={() => {
                  triggerHaptic("light");
                  onDuplicateProject(project.id);
                }}
                onDelete={() => setDeletingProject(project)}
                onDragOver={(e) => {
                  if (
                    onMoveCalculation &&
                    activeProjectId &&
                    activeProjectId !== project.id &&
                    e.dataTransfer.types.includes("application/x-ferroscale-calc")
                  ) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragTargetId !== project.id) setDragTargetId(project.id);
                  }
                }}
                onDragLeave={() => {
                  if (dragTargetId === project.id) setDragTargetId(null);
                }}
                onDrop={(e) => {
                  const calcId = e.dataTransfer.getData("application/x-ferroscale-calc");
                  setDragTargetId(null);
                  if (!calcId || !activeProjectId || !onMoveCalculation) return;
                  if (activeProjectId === project.id) return;
                  const ok = onMoveCalculation(activeProjectId, calcId, project.id);
                  if (ok) triggerHaptic("success");
                }}
              />
            );
          })}

          {/* Dashed "+ New project" card */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setCreating(true);
            }}
            className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong bg-transparent text-foreground-secondary transition-colors hover:bg-surface"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <div className="text-sm font-semibold">{t("mobileProjects.newProjectRow")}</div>
            <div className="text-2xs text-muted">{t("desktopProjects.detailEmptyHint")}</div>
          </button>
        </div>
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

interface ProjectCardProps {
  project: Project;
  tone: string;
  pinned: boolean;
  locale: string;
  isDropTarget: boolean;
  onClick: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}

function ProjectCard({
  project,
  tone,
  pinned,
  locale,
  isDropTarget,
  onClick,
  onDuplicate,
  onDelete,
  onDragOver,
  onDragLeave,
  onDrop,
}: ProjectCardProps) {
  const agg = useMemo(() => computeAggregates(project), [project]);
  const mix = useMemo(() => profileMix(project), [project]);
  const t = useTranslations();
  const tBase = useTranslations();
  const updated = formatRelative(project.updatedAt);
  const currencySymbol = CURRENCY_SYMBOLS[agg.currency] ?? String(agg.currency);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition-shadow ${
        pinned
          ? "border-transparent bg-foreground text-background shadow-[0_24px_60px_-30px_rgba(0,0,0,0.4)]"
          : "border-border bg-surface text-foreground shadow-[var(--panel-shadow-soft)] hover:shadow-[var(--panel-shadow-strong)]"
      } ${isDropTarget ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Tone strip — colored bar at the very top. */}
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: tone }} />

      <button
        type="button"
        onClick={onClick}
        className="flex w-full flex-col gap-4 p-5 pt-6 text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${
                pinned ? "bg-white/10 text-background" : "bg-surface-inset text-foreground-secondary"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 20a2 2 0 002-2V8a2 2 0 00-2-2h-7.9a2 2 0 01-1.69-.9L9.6 3.9A2 2 0 008 3H4a2 2 0 00-2 2v13a2 2 0 002 2z" />
              </svg>
            </div>
            <span
              className={`text-2xs ${pinned ? "text-background/70" : "text-muted"}`}
            >
              {updated ?? "—"}
            </span>
          </div>
          {pinned && (
            <span className="inline-flex h-5 items-center rounded-full bg-white/10 px-2 text-[0.625rem] font-bold uppercase tracking-[var(--label-tracking)] text-background">
              {t("mobileProjects.activePinned")}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-col">
          <h3 className="truncate text-xl font-bold tracking-[-0.025em]">
            {project.name}
          </h3>
          <span className={`mt-0.5 truncate text-xs ${pinned ? "text-background/65" : "text-muted"}`}>
            {t("mobileProjects.heroHint", { count: agg.count })}
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-[2rem] font-bold leading-none tabular-nums tracking-[-0.04em]">
            {fmtKg(agg.totalWeightKg, locale)}
          </span>
          <span className={`text-sm font-semibold ${pinned ? "text-accent" : "text-accent"}`}>
            kg
          </span>
          <span
            className={`ml-auto text-sm font-semibold tabular-nums ${
              pinned ? "text-background/85" : "text-foreground-secondary"
            }`}
          >
            {currencySymbol} {fmtCost(agg.totalCost, locale)}
          </span>
        </div>

        {mix.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {mix.map((m) => (
              <span
                key={m.key}
                className={`inline-flex h-6 items-center gap-1 rounded-lg px-2 text-2xs font-semibold ${
                  pinned
                    ? "bg-white/10 text-background"
                    : "bg-surface-inset text-foreground-secondary"
                }`}
              >
                <ProfileGlyph profileId={m.profileId} size="sm" />
                ×{m.count}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* Card-corner kebab — duplicate / delete. Always present, opens menu
          without triggering the card's onClick. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((p) => !p);
        }}
        className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 ${
          pinned ? "text-background/70 hover:bg-white/10" : "text-muted hover:bg-surface-raised"
        }`}
        aria-label={tBase("mobileSaved.rowMenuAria")}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="5" cy="12" r="1.2" />
          <circle cx="12" cy="12" r="1.2" />
          <circle cx="19" cy="12" r="1.2" />
        </svg>
      </button>
      {menuOpen && (
        <div
          className="absolute right-3 top-12 z-30 flex w-40 flex-col overflow-hidden rounded-xl border border-border bg-surface text-foreground shadow-[var(--panel-shadow-strong)]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              onDuplicate();
              setMenuOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-surface-raised"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            {t("desktopProjects.duplicate")}
          </button>
          <button
            type="button"
            onClick={() => {
              onDelete();
              setMenuOpen(false);
            }}
            className="flex items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm text-red-interactive hover:bg-red-surface"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
            </svg>
            {t("desktopProjects.delete")}
          </button>
        </div>
      )}
    </div>
  );
}
