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
  onBack: () => void;
  onAddPart: () => void;
  onLoadCalculation: (input: CalculationInput) => void;
  onRemoveCalculation: (id: string) => void;
  onRenameProject: (name: string) => void;
  onDeleteProject: () => void;
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

function dominantMaterial(calcs: ProjectCalculation[]): string | null {
  if (calcs.length === 0) return null;
  const counts = new Map<string, number>();
  for (const c of calcs) {
    const k = c.result.gradeLabel;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [k, v] of counts) {
    if (v > bestCount) {
      best = k;
      bestCount = v;
    }
  }
  return best;
}

export const MobileProjectDetailPage = memo(function MobileProjectDetailPage({
  project,
  onBack,
  onAddPart,
  onLoadCalculation,
  onRemoveCalculation,
  onRenameProject,
  onDeleteProject,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [removingCalcId, setRemovingCalcId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const aggregates = useMemo(() => computeAggregates(project), [project]);
  const currency = CURRENCY_SYMBOLS[aggregates.currency] ?? aggregates.currency;
  const material = useMemo(() => dominantMaterial(project.calculations), [project.calculations]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const handleRename = () => {
    const name = renameDraft.trim();
    if (!name) {
      setRenaming(false);
      return;
    }
    triggerHaptic("light");
    onRenameProject(name);
    setRenaming(false);
  };

  const handleDelete = () => {
    setMenuOpen(false);
    setConfirmDeleteProject(true);
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-background pb-[120px]">
      {/* NavBar */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-3 pt-[env(safe-area-inset-top,0px)]">
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onBack();
          }}
          aria-label={t("mobileProjectDetail.backAria")}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground-secondary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center px-2">
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
              className="w-full border-b border-accent-border bg-transparent text-center text-sm font-bold tracking-tight text-foreground outline-none"
            />
          ) : (
            <span className="truncate text-sm font-bold tracking-tight text-foreground">
              {project.name}
            </span>
          )}
        </div>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setMenuOpen((v) => !v);
            }}
            aria-label={t("mobileProjectDetail.moreAria")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground-secondary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="5" cy="12" r="1.2" />
              <circle cx="12" cy="12" r="1.2" />
              <circle cx="19" cy="12" r="1.2" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 z-40 w-44 overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--panel-shadow-strong)]">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setRenameDraft(project.name);
                  setRenaming(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-surface-raised"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
                {t("mobileProjectDetail.rename")}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm font-medium text-red-interactive hover:bg-red-surface"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                </svg>
                {t("mobileProjectDetail.delete")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="mx-3.5 rounded-[22px] border border-border bg-surface p-4 shadow-[var(--panel-highlight)]">
        <span className="block text-2xs font-bold uppercase tracking-[0.16em] text-muted">
          {t("mobileProjectDetail.heroLabel")}
        </span>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[60px] font-bold leading-[0.95] tracking-[-0.04em] tabular-nums text-foreground">
            {fmtKg(aggregates.totalWeightKg, locale)}
          </span>
          <span className="text-[22px] font-semibold tabular-nums text-accent">kg</span>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between">
          <span className="truncate text-xs text-foreground-secondary">
            {t("mobileProjectDetail.heroSub", {
              count: aggregates.count,
              material: material ?? t("mobileProjectDetail.mixed"),
            })}
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
            {currency} {fmtCost(aggregates.totalCost, locale)}
          </span>
        </div>

        {/* Stacked composition */}
        {project.calculations.length > 0 && (
          <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-surface-inset">
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
        )}
      </div>

      {/* Section header */}
      {project.calculations.length > 0 && (
        <div className="flex items-baseline justify-between px-[18px] pt-[18px] pb-2">
          <span className="text-2xs font-bold uppercase tracking-[0.16em] text-muted">
            {t("mobileProjectDetail.parts")}
          </span>
          <span className="text-2xs text-muted">{t("mobileProjectDetail.sortHint")}</span>
        </div>
      )}

      {/* Parts list */}
      {project.calculations.length > 0 ? (
        <div className="flex flex-col gap-1.5 px-3.5">
          {project.calculations.map((calc) => (
            <PartRow
              key={calc.id}
              calc={calc}
              locale={locale}
              onLoad={() => {
                triggerHaptic("light");
                onLoadCalculation(calc.input);
              }}
              onRemove={() => setRemovingCalcId(calc.id)}
              removeLabel={t("mobileProjectDetail.removePartAria")}
            />
          ))}
        </div>
      ) : (
        <div className="mx-3.5 mt-4 rounded-2xl border border-dashed border-border bg-surface px-4 py-10 text-center">
          <span className="block text-sm font-semibold text-foreground-secondary">
            {t("mobileProjectDetail.emptyTitle")}
          </span>
          <span className="mt-1 block text-2xs text-muted">
            {t("mobileProjectDetail.emptyHint")}
          </span>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onAddPart();
            }}
            className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-surface-inverted px-4 text-sm font-bold text-background shadow-[var(--panel-shadow-soft)] active:opacity-90"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t("mobileProjectDetail.addFirstPart")}
          </button>
        </div>
      )}

      {/* Floating add bar */}
      <div
        className="fixed inset-x-3.5 z-30 flex items-center justify-between gap-3 rounded-[18px] bg-surface-inverted px-3.5 py-3 text-background shadow-[var(--panel-shadow-strong)]"
        style={{ bottom: "calc(1.125rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="min-w-0">
          <span className="block text-2xs font-bold uppercase tracking-[0.14em] text-background/65">
            {t("mobileProjectDetail.addToProject")}
          </span>
          <span className="mt-0.5 block truncate text-xs font-semibold text-background">
            {t("mobileProjectDetail.addToProjectHint")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onAddPart();
          }}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-xs font-bold text-white active:bg-accent-hover"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t("mobileProjectDetail.addPart")}
        </button>
      </div>

      <ConfirmDialog
        open={confirmDeleteProject}
        title={t("confirmDialog.deleteTitle")}
        message={t("mobileProjectDetail.confirmDelete", { name: project.name })}
        confirmLabel={t("confirmDialog.delete")}
        cancelLabel={t("confirmDialog.cancel")}
        destructive
        onConfirm={() => {
          triggerHaptic("medium");
          onDeleteProject();
          setConfirmDeleteProject(false);
        }}
        onCancel={() => setConfirmDeleteProject(false)}
      />
      <ConfirmDialog
        open={removingCalcId != null}
        title={t("confirmDialog.removePartTitle")}
        message={t("mobileProjectDetail.confirmRemovePart")}
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

interface PartRowProps {
  calc: ProjectCalculation;
  locale: string;
  onLoad: () => void;
  onRemove: () => void;
  removeLabel: string;
}

function PartRow({ calc, locale, onLoad, onRemove, removeLabel }: PartRowProps) {
  const profile = calc.normalizedProfile;
  const result = calc.result;
  const sub = `${(result.lengthMm / 1000).toFixed(result.lengthMm >= 10000 ? 1 : 2)} m × ${result.quantity}`;

  return (
    <div className="flex items-center gap-2.5 rounded-[14px] border border-border bg-surface px-3 py-2.5">
      <button
        type="button"
        onClick={onLoad}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-surface-inset text-foreground-secondary">
          <ProfileGlyph profileId={calc.input.profileId} size="sm" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13.5px] font-semibold tracking-tight text-foreground">
            {profile.shortLabel}
            <span className="ml-1 font-medium text-muted">· {result.gradeLabel}</span>
          </span>
          <span className="truncate text-2xs text-muted">{sub}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-sm font-bold leading-none tabular-nums tracking-[-0.02em] text-foreground">
            {fmtKg(result.totalWeightKg, locale)}
          </span>
          <span className="mt-0.5 block text-[10px] text-muted">kg</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-red-surface hover:text-red-interactive"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
        </svg>
      </button>
    </div>
  );
}
