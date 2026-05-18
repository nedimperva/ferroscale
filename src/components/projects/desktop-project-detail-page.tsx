"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
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
  project: Project;
  onBackToList: () => void;
  onAddPart: () => void;
  onLoadCalculation: (input: CalculationInput) => void;
  onRemoveCalculation: (id: string) => void;
  onRenameProject: (name: string) => void;
  onDeleteProject: () => void;
  onUpdateNotes: (notes: string) => void;
}

const COMPOSITION_TONES = [
  "#a35a32",
  "#c08552",
  "#7a6557",
  "#d5a778",
  "#a08373",
  "#bf8f5e",
  "#967e6c",
  "#cbab90",
];

const CATEGORY_LABEL: Record<string, string> = {
  structural: "Structural",
  tubes: "Tube",
  plates_sheets: "Plate",
  bars: "Bar",
};

function fmtKg(value: number, locale: string): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  if (value >= 1000) return value.toLocaleString(locale, { maximumFractionDigits: 1 });
  if (value >= 100) return value.toFixed(1);
  return value.toFixed(2);
}

function fmtCost(value: number, locale: string): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtNumber(value: number, locale: string, fractionDigits = 2): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function fmtDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function fmtRelative(
  iso: string,
  locale: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: any, vars?: Record<string, unknown>) => string,
): string {
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diffSec = Math.round((now - then) / 1000);
    if (diffSec < 60) return t("desktopProjectDetail.justNow");
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) return t("desktopProjectDetail.minutesAgo", { count: diffMin });
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return t("desktopProjectDetail.hoursAgo", { count: diffHr });
    const diffDay = Math.round(diffHr / 24);
    if (diffDay < 7) return t("desktopProjectDetail.daysAgo", { count: diffDay });
    return fmtDate(iso, locale);
  } catch {
    return iso.slice(0, 10);
  }
}

interface CompositionLegendEntry {
  color: string;
  label: string;
}

function buildLegend(calcs: ProjectCalculation[]): CompositionLegendEntry[] {
  const byCategory = new Map<string, number>();
  for (const c of calcs) {
    const key = c.normalizedProfile.iconKey;
    byCategory.set(key, (byCategory.get(key) ?? 0) + c.result.totalWeightKg);
  }
  return [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key], i) => ({
      color: COMPOSITION_TONES[i % COMPOSITION_TONES.length],
      label: CATEGORY_LABEL[key] ?? key,
    }));
}

export const DesktopProjectDetailPage = memo(function DesktopProjectDetailPage({
  project,
  onBackToList,
  onAddPart,
  onLoadCalculation,
  onRemoveCalculation,
  onRenameProject,
  onDeleteProject,
  onUpdateNotes,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState(project.description ?? "");
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [removingCalcId, setRemovingCalcId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setNotesDraft(project.description ?? "");
  }, [project.description, project.id]);

  useEffect(() => {
    if (!menuOpenFor) return;
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpenFor(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpenFor]);

  const aggregates = useMemo(() => computeAggregates(project), [project]);
  const currency = CURRENCY_SYMBOLS[aggregates.currency] ?? aggregates.currency;
  const legend = useMemo(() => buildLegend(project.calculations), [project.calculations]);
  const avgPerKg = aggregates.costPerKg;

  const handleRename = () => {
    const name = renameDraft.trim();
    if (!name) {
      setRenaming(false);
      return;
    }
    onRenameProject(name);
    setRenaming(false);
  };

  const handleDelete = () => {
    setConfirmDeleteProject(true);
  };

  const handleNotesBlur = () => {
    if (notesDraft !== (project.description ?? "")) {
      onUpdateNotes(notesDraft);
    }
  };

  const handleExportCsv = () => {
    import("@/hooks/useProjects").then(({ exportProjectCsv }) => {
      exportProjectCsv(project);
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background text-foreground">
      {/* Breadcrumb topbar */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-6">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <button
            type="button"
            onClick={onBackToList}
            className="text-muted transition-colors hover:text-foreground"
          >
            {t("desktopProjectDetail.breadcrumbProjects")}
          </button>
          <span className="text-muted">›</span>
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
              className="border-b border-accent-border bg-transparent text-xs font-semibold text-foreground outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setRenameDraft(project.name);
                setRenaming(true);
              }}
              className="truncate text-xs font-semibold text-foreground hover:text-accent-text"
            >
              {project.name}
            </button>
          )}
          <span className="ml-2 rounded-full bg-accent-surface px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.04em] text-accent-text">
            {t("desktopProjectDetail.editingPill")}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={project.calculations.length === 0}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-transparent bg-transparent px-3 text-xs font-medium text-foreground-secondary hover:border-border hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
            </svg>
            {t("desktopProjectDetail.exportCsv")}
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-transparent bg-transparent px-3 text-xs font-medium text-foreground-secondary hover:border-border hover:bg-surface"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
            {t("desktopProjectDetail.share")}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-transparent bg-transparent px-3 text-xs font-medium text-foreground-secondary hover:border-red-border hover:bg-red-surface hover:text-red-interactive"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
            </svg>
            {t("desktopProjectDetail.delete")}
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onAddPart();
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-bold text-white hover:bg-accent-hover"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t("desktopProjectDetail.addPart")}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_320px] gap-5 overflow-auto p-6">
        {/* Main column */}
        <div className="flex flex-col gap-[18px]">
          {/* Hero */}
          <div className="flex items-end justify-between gap-4 rounded-[20px] border border-border bg-surface px-[26px] py-[22px] shadow-[var(--panel-highlight)]">
            <div className="min-w-0">
              <span className="block text-2xs font-bold uppercase tracking-[0.16em] text-muted">
                {t("desktopProjectDetail.heroLabel")}
              </span>
              <h2 className="mt-1.5 truncate text-[26px] font-bold tracking-[-0.025em] text-foreground">
                {project.name}
              </h2>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-[72px] font-bold leading-[0.9] tracking-[-0.045em] tabular-nums text-foreground">
                  {fmtKg(aggregates.totalWeightKg, locale)}
                </span>
                <span className="text-[22px] font-semibold tabular-nums text-accent">kg</span>
              </div>
              <div className="mt-1.5 text-base font-semibold tabular-nums text-foreground-secondary">
                {currency} {fmtCost(aggregates.totalCost, locale)}
                {avgPerKg > 0 && (
                  <span className="ml-1 font-medium text-muted">
                    · {t("desktopProjectDetail.avgPerKg", {
                      value: fmtNumber(avgPerKg, locale, 2),
                      currency,
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Composition by weight */}
            <div className="w-[320px] shrink-0">
              <span className="block text-2xs font-bold uppercase tracking-[0.16em] text-muted">
                {t("desktopProjectDetail.composition")}
              </span>
              {project.calculations.length > 0 ? (
                <>
                  <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-surface-inset">
                    {project.calculations.map((calc, i) => (
                      <div
                        key={calc.id}
                        className="h-full"
                        style={{
                          flex: Math.max(1, calc.result.totalWeightKg),
                          background: COMPOSITION_TONES[i % COMPOSITION_TONES.length],
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {legend.map((l, i) => (
                      <span
                        key={`${l.label}-${i}`}
                        className="inline-flex items-center gap-1 text-[10.5px] text-foreground-secondary"
                      >
                        <span
                          className="inline-block h-2 w-2 rounded-sm"
                          style={{ background: l.color }}
                        />
                        {l.label}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-2 flex h-2.5 rounded-full bg-surface-inset" />
              )}
            </div>
          </div>

          {/* Parts table — overflow-visible so the row kebab menus can render
              above the surface without getting clipped. */}
          <div className="rounded-[18px] border border-border bg-surface">
            <div className="flex items-center justify-between rounded-t-[18px] border-b border-border px-[18px] py-3.5">
              <span className="text-2xs font-bold uppercase tracking-[0.16em] text-muted">
                {t("desktopProjectDetail.partsCount", { count: aggregates.count })}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-2xs font-medium text-foreground-secondary hover:bg-surface-raised"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M6 12h12M10 18h4" />
                  </svg>
                  {t("desktopProjectDetail.sortAdded")}
                </button>
                <button
                  type="button"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-2xs font-medium text-foreground-secondary hover:bg-surface-raised"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M3 12h18M3 18h18" />
                  </svg>
                  {t("desktopProjectDetail.groupByProfile")}
                </button>
              </div>
            </div>

            {/* Header row */}
            <div
              className="grid items-center gap-3 border-b border-border bg-surface-raised px-[18px] py-2.5"
              style={{ gridTemplateColumns: "36px 1.6fr 0.8fr 1.2fr 0.9fr 0.9fr 1fr 28px" }}
            >
              {[
                "",
                t("desktopProjectDetail.colProfile"),
                t("desktopProjectDetail.colMaterial"),
                t("desktopProjectDetail.colGeometry"),
                t("desktopProjectDetail.colKgPerM"),
                t("desktopProjectDetail.colWeight"),
                t("desktopProjectDetail.colPrice"),
                "",
              ].map((h, i) => (
                <span
                  key={i}
                  className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted"
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {project.calculations.length > 0 ? (
              project.calculations.map((calc, idx) => {
                const result = calc.result;
                const lengthM = result.lengthMm / 1000;
                const kgPerM = lengthM > 0 ? result.unitWeightKg / lengthM : 0;
                const isMenuOpen = menuOpenFor === calc.id;
                return (
                  <div
                    key={calc.id}
                    className={`grid items-center gap-3 px-[18px] py-3 ${
                      idx < project.calculations.length - 1 ? "border-b border-border" : ""
                    } hover:bg-surface-raised`}
                    style={{ gridTemplateColumns: "36px 1.6fr 0.8fr 1.2fr 0.9fr 0.9fr 1fr 28px" }}
                  >
                    <button
                      type="button"
                      onClick={() => onLoadCalculation(calc.input)}
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-surface-inset text-foreground-secondary"
                      aria-label={t("desktopProjectDetail.loadAria")}
                    >
                      <ProfileGlyph profileId={calc.input.profileId} size="xs" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onLoadCalculation(calc.input)}
                      className="truncate text-left text-[13px] font-semibold tracking-tight text-foreground hover:text-accent-text"
                    >
                      {calc.normalizedProfile.shortLabel}
                    </button>
                    <span className="truncate text-xs text-foreground-secondary">
                      {result.gradeLabel}
                    </span>
                    <span className="truncate text-xs tabular-nums text-foreground-secondary">
                      {lengthM.toFixed(lengthM >= 10 ? 1 : 2)} m × {result.quantity}
                    </span>
                    <span className="truncate text-xs tabular-nums text-foreground-secondary">
                      {fmtNumber(kgPerM, locale, kgPerM >= 10 ? 1 : 2)}
                    </span>
                    <span className="flex items-baseline gap-1">
                      <span className="text-[13.5px] font-bold tabular-nums tracking-[-0.02em] text-foreground">
                        {fmtKg(result.totalWeightKg, locale)}
                      </span>
                      <span className="text-[10.5px] text-muted">kg</span>
                    </span>
                    <span className="text-xs tabular-nums text-foreground">
                      {currency} {fmtCost(result.grandTotalAmount, locale)}
                    </span>
                    <div ref={isMenuOpen ? menuRef : undefined} className="relative">
                      <button
                        type="button"
                        onClick={() => setMenuOpenFor(isMenuOpen ? null : calc.id)}
                        aria-label={t("desktopProjectDetail.rowMenuAria")}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-surface-inset hover:text-foreground-secondary"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="5" cy="12" r="1.2" />
                          <circle cx="12" cy="12" r="1.2" />
                          <circle cx="19" cy="12" r="1.2" />
                        </svg>
                      </button>
                      {isMenuOpen && (
                        <div className="absolute right-0 top-7 z-30 w-44 overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--panel-shadow-strong)]">
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenFor(null);
                              onLoadCalculation(calc.input);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-surface-raised"
                          >
                            {t("desktopProjectDetail.loadIntoCalc")}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenFor(null);
                              setRemovingCalcId(calc.id);
                            }}
                            className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-xs font-medium text-red-interactive hover:bg-red-surface"
                          >
                            {t("desktopProjectDetail.removePart")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center px-6 py-10 text-center">
                <span className="text-xs text-muted">
                  {t("desktopProjectDetail.emptyTableHint")}
                </span>
              </div>
            )}

            {/* Add row */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onAddPart();
              }}
              className="flex w-full items-center gap-2.5 bg-surface-raised px-[18px] py-3 text-left text-foreground-secondary hover:bg-surface-inset"
            >
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border border-dashed border-border-strong bg-surface text-accent">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <span className="text-xs font-semibold">
                {t("desktopProjectDetail.addRowHint")}
              </span>
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex w-[320px] flex-col gap-3">
          {/* Project details */}
          <div className="rounded-2xl border border-border bg-surface p-4">
            <span className="block text-2xs font-bold uppercase tracking-[0.16em] text-muted">
              {t("desktopProjectDetail.detailsTitle")}
            </span>
            <div className="mt-2.5 flex flex-col gap-2.5">
              {[
                [t("desktopProjectDetail.statusLabel"), t("desktopProjectDetail.statusValue")],
                [t("desktopProjectDetail.ownerLabel"), t("desktopProjectDetail.ownerValue")],
                [t("desktopProjectDetail.createdLabel"), fmtDate(project.createdAt, locale)],
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                [t("desktopProjectDetail.updatedLabel"), fmtRelative(project.updatedAt, locale, t as any)],
                [t("desktopProjectDetail.defaultMaterialLabel"), t("desktopProjectDetail.defaultMaterialValue")],
                [t("desktopProjectDetail.wasteLabel"), t("desktopProjectDetail.wasteValue")],
              ].map((row, i) => (
                <div key={i} className="flex items-baseline justify-between gap-3">
                  <span className="text-xs text-muted">{row[0]}</span>
                  <span className="truncate text-right text-xs font-semibold text-foreground">
                    {row[1]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-bold uppercase tracking-[0.16em] text-muted">
                {t("desktopProjectDetail.notesTitle")}
              </span>
              <span className="text-[11px] text-muted">
                {t("desktopProjectDetail.notesMarkdown")}
              </span>
            </div>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder={t("desktopProjectDetail.notesPlaceholder")}
              className="mt-2.5 min-h-[120px] w-full resize-y rounded-lg border border-transparent bg-transparent text-xs leading-relaxed text-foreground-secondary outline-none placeholder:text-muted-faint focus:border-accent-border focus:bg-surface-raised focus:p-2"
            />
          </div>

          {/* History */}
          <div className="rounded-2xl border border-border bg-surface p-4">
            <span className="block text-2xs font-bold uppercase tracking-[0.16em] text-muted">
              {t("desktopProjectDetail.historyTitle")}
            </span>
            <div className="mt-2.5 flex flex-col gap-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {buildHistory(project, locale, t as any).map((row, i) => (
                <div
                  key={i}
                  className="grid items-baseline"
                  style={{ gridTemplateColumns: "88px 1fr" }}
                >
                  <span className="text-[11px] text-muted">{row.when}</span>
                  <span className="text-xs text-foreground-secondary">{row.what}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteProject}
        title={t("confirmDialog.deleteTitle")}
        message={t("desktopProjectDetail.confirmDelete", { name: project.name })}
        confirmLabel={t("confirmDialog.delete")}
        cancelLabel={t("confirmDialog.cancel")}
        destructive
        onConfirm={() => {
          onDeleteProject();
          setConfirmDeleteProject(false);
        }}
        onCancel={() => setConfirmDeleteProject(false)}
      />
      <ConfirmDialog
        open={removingCalcId != null}
        title={t("confirmDialog.removePartTitle")}
        message={t("desktopProjectDetail.confirmRemovePart")}
        confirmLabel={t("confirmDialog.remove")}
        cancelLabel={t("confirmDialog.cancel")}
        destructive
        onConfirm={() => {
          if (removingCalcId) {
            triggerHaptic("light");
            onRemoveCalculation(removingCalcId);
          }
          setRemovingCalcId(null);
        }}
        onCancel={() => setRemovingCalcId(null)}
      />
    </div>
  );
});

function buildHistory(
  project: Project,
  locale: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: any, vars?: Record<string, unknown>) => string,
): Array<{ when: string; what: string }> {
  const out: Array<{ when: string; what: string }> = [];
  if (project.calculations.length > 0) {
    const latest = [...project.calculations].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    for (const calc of latest.slice(0, 2)) {
      out.push({
        when: fmtRelative(calc.timestamp, locale, t),
        what: t("desktopProjectDetail.historyAdded", {
          part: calc.normalizedProfile.shortLabel,
        }),
      });
    }
  }
  if (project.updatedAt !== project.createdAt) {
    out.push({
      when: fmtRelative(project.updatedAt, locale, t),
      what: t("desktopProjectDetail.historyUpdated"),
    });
  }
  out.push({
    when: fmtDate(project.createdAt, locale),
    what: t("desktopProjectDetail.historyCreated"),
  });
  return out;
}
