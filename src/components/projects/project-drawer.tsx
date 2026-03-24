"use client";

import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Project, ProjectCalculation } from "@/hooks/useProjects";
import { computeAggregates, exportProjectCsv, exportProjectPdf } from "@/hooks/useProjects";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { useDrawerBehavior } from "@/hooks/useDrawerBehavior";
import { useIsMobile } from "@/hooks/useIsMobile";
import { resolveGradeLabel } from "@/lib/calculator/grade-label";
import { AnimatedDrawer } from "@/components/ui/animated-drawer";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  formatPieceLength,
  formatSquareMeters,
  formatStaticNumber,
  PanelCompactChip,
  PanelCompactMetric,
  getWorkspacePanelSpacing,
  PanelActionButton,
  PanelMetricCard,
  PanelSectionLabel,
  PanelSummaryChip,
  type WorkspacePanelLayout,
} from "@/components/ui/result-style";

function buildProjectExportLabels(
  t: ReturnType<typeof useTranslations>,
  tBase: ReturnType<typeof useTranslations>,
) {
  return {
    csvLabels: {
      headers: [
        t("csvHeaders.profile"),
        t("csvHeaders.profileLabel"),
        t("csvHeaders.material"),
        t("csvHeaders.unitWeight"),
        t("csvHeaders.totalWeight"),
        t("csvHeaders.surfaceArea"),
        t("csvHeaders.subtotal"),
        t("csvHeaders.waste"),
        t("csvHeaders.vat"),
        t("csvHeaders.grandTotal"),
        t("csvHeaders.currency"),
      ] as const,
      total: t("csvHeaders.total"),
      filePrefix: t("csvFilePrefix"),
      resolveGradeLabel: (label: string) => resolveGradeLabel(label, tBase),
      resolveProfileLabel: (profileId: string, fallback: string) => {
        try {
          return tBase(`dataset.profiles.${profileId}`);
        } catch {
          return fallback;
        }
      },
    },
    pdfLabels: {
      title: t("pdfTitle"),
      description: t("pdfDescription"),
      date: t("pdfDate"),
      items: t("aggregateItems"),
      totalWeight: t("aggregateTotalWeight"),
      totalCost: t("aggregateTotalCost"),
      costPerKg: t("aggregateCostPerKg"),
      totalSurfaceArea: t("aggregateTotalSurfaceArea"),
      paintNeeded: t("aggregatePaintNeeded"),
      paintingCost: t("aggregatePaintingCost"),
      profileColumn: t("csvHeaders.profile"),
      materialColumn: t("csvHeaders.material"),
      weightColumn: t("csvHeaders.totalWeight"),
      surfaceAreaColumn: t("csvHeaders.surfaceArea"),
      costColumn: t("csvHeaders.grandTotal"),
      noteColumn: t("pdfNoteColumn"),
      total: t("csvHeaders.total"),
      qtyColumn: t("pdfQtyColumn"),
      unitWeightColumn: t("pdfUnitWeightColumn"),
      materialSummary: t("pdfMaterialSummary"),
      subtotal: t("pdfSubtotal"),
      resolveGradeLabel: (label: string) => resolveGradeLabel(label, tBase),
      resolveCategoryLabel: (iconKey: string) => {
        try {
          return tBase(`dataset.profileCategories.${iconKey}`);
        } catch {
          return iconKey;
        }
      },
      resolveProfileLabel: (profileId: string, fallback: string) => {
        try {
          return tBase(`dataset.profiles.${profileId}`);
        } catch {
          return fallback;
        }
      },
    },
  };
}

function categoryStyle(category: string): { iconBg: string; badge: string } {
  switch (category) {
    case "tubes":
      return {
        iconBg: "bg-blue-surface text-blue-text",
        badge: "bg-blue-surface text-blue-text border border-blue-border",
      };
    case "plates_sheets":
      return {
        iconBg: "bg-amber-surface text-amber-text",
        badge: "bg-amber-surface text-amber-text border border-amber-border",
      };
    case "structural":
      return {
        iconBg: "bg-green-surface text-green-text",
        badge: "bg-green-surface text-green-text border border-green-border",
      };
    default:
      return {
        iconBg: "bg-purple-surface text-purple-text",
        badge: "bg-purple-surface text-purple-text border border-purple-border",
      };
  }
}

type SortKey = "date" | "weight" | "cost";

const SHEET_PROFILE_IDS = ["sheet", "plate", "chequered_plate", "expanded_metal", "corrugated_sheet"];
const LENGTH_UNIT_FACTORS: Record<string, number> = { mm: 1, cm: 10, m: 1000, in: 25.4, ft: 304.8 };

function crossSectionKey(calc: ProjectCalculation): string {
  const profileId = calc.result.profileId;
  const shortLabel = calc.normalizedProfile.shortLabel;

  if (SHEET_PROFILE_IDS.includes(profileId)) {
    const thickness = calc.input.manualDimensions?.thickness;
    if (thickness) {
      const mm = Math.round(thickness.value * (LENGTH_UNIT_FACTORS[thickness.unit] ?? 1) * 10) / 10;
      return `${mm} mm`;
    }
  }

  if (shortLabel.includes(" \u00b7 L ")) return shortLabel.split(" \u00b7 L ")[0];
  if (shortLabel.includes(" - L ")) return shortLabel.split(" - L ")[0];
  if (shortLabel.includes(" x L ")) return shortLabel.split(" x L ")[0];
  return shortLabel;
}

function metricOrder(
  weightAsMain: boolean,
  labels: {
    totalWeight: string;
    totalCost: string;
    costPerKg: string;
    unitWeight?: string;
    items?: string;
  },
  values: {
    totalWeightKg?: number;
    totalCost?: number;
    costPerKg?: number;
    unitWeightKg?: number;
    itemCount?: number;
    currency: string;
  },
) {
  const primary = weightAsMain
    ? { label: labels.totalWeight, value: formatStaticNumber(values.totalWeightKg ?? 0), unit: "kg" }
    : { label: labels.totalCost, value: formatStaticNumber(values.totalCost ?? 0), unit: values.currency };
  const secondary = weightAsMain
    ? { label: labels.totalCost, value: formatStaticNumber(values.totalCost ?? 0), unit: values.currency }
    : { label: labels.totalWeight, value: formatStaticNumber(values.totalWeightKg ?? 0), unit: "kg" };
  const tertiary = labels.unitWeight
    ? { label: labels.unitWeight, value: formatStaticNumber(values.unitWeightKg ?? 0), unit: "kg" }
    : { label: labels.costPerKg, value: formatStaticNumber(values.costPerKg ?? 0), unit: `${values.currency}/kg` };
  const quaternary = labels.items
    ? { label: labels.items, value: String(values.itemCount ?? 0), unit: undefined }
    : { label: labels.costPerKg, value: formatStaticNumber(values.costPerKg ?? 0), unit: `${values.currency}/kg` };

  return [primary, secondary, tertiary, quaternary];
}

interface ProjectDrawerProps {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  activeProjectId: string | null;
  onSetActiveProject: (id: string | null) => void;
  onCreateProject: (name: string) => Project;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (id: string) => Project | null;
  onRemoveCalculation: (projectId: string, calcId: string) => void;
  onUpdateCalculationNote: (projectId: string, calcId: string, note: string) => void;
  onUpdateProjectDescription: (id: string, description: string) => void;
  onUpdateProjectPaintingSettings: (
    id: string,
    pricePerKg: number | undefined,
    coverageM2PerKg: number | undefined,
    coats?: number | undefined,
  ) => void;
  onLoadCalculation?: (input: CalculationInput) => void;
  currentResult: CalculationResult | null;
  currentInput: CalculationInput | null;
  onAddCalculation: (projectId: string, input: CalculationInput, result: CalculationResult) => boolean;
  weightAsMain?: boolean;
}

interface ProjectsWorkspaceContentProps extends Omit<ProjectDrawerProps, "open" | "onClose"> {
  showToolbar?: boolean;
  layout?: WorkspacePanelLayout;
}

export function ProjectsWorkspaceContent({
  projects,
  activeProjectId,
  onSetActiveProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onDuplicateProject,
  onRemoveCalculation,
  onUpdateCalculationNote,
  onUpdateProjectDescription,
  onUpdateProjectPaintingSettings,
  onLoadCalculation,
  currentResult,
  currentInput,
  onAddCalculation,
  showToolbar = true,
  layout = "drawer",
  weightAsMain = false,
}: ProjectsWorkspaceContentProps) {
  const tBase = useTranslations();
  const t = useTranslations("projects");
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const { csvLabels, pdfLabels } = buildProjectExportLabels(t, tBase);

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    const project = onCreateProject(newName.trim());
    setNewName("");
    onSetActiveProject(project.id);
  }, [newName, onCreateProject, onSetActiveProject]);

  const startRename = useCallback((project: Project) => {
    setRenamingId(project.id);
    setRenameValue(project.name);
  }, []);

  const confirmRename = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      onRenameProject(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
  }, [onRenameProject, renameValue, renamingId]);

  const activeProject = activeProjectId
    ? projects.find((project) => project.id === activeProjectId) ?? null
    : null;

  return (
    <div
      className={
        layout === "column"
          ? "flex-1 safe-area-bottom p-4"
          : "flex-1 overflow-y-auto scroll-native safe-area-bottom p-4"
      }
    >
      {activeProject ? (
        <ProjectDetail
          project={activeProject}
          csvLabels={csvLabels}
          pdfLabels={pdfLabels}
          layout={layout}
          weightAsMain={weightAsMain}
          showBackButton={showToolbar}
          onBack={() => onSetActiveProject(null)}
          onRemoveCalculation={onRemoveCalculation}
          onUpdateCalculationNote={onUpdateCalculationNote}
          onUpdateProjectDescription={onUpdateProjectDescription}
          onUpdateProjectPaintingSettings={onUpdateProjectPaintingSettings}
          onLoadCalculation={onLoadCalculation}
          onStartRename={() => startRename(activeProject)}
          onDeleteProject={() => {
            onDeleteProject(activeProject.id);
            onSetActiveProject(null);
          }}
          onDuplicateProject={() => {
            const duplicate = onDuplicateProject(activeProject.id);
            if (duplicate) onSetActiveProject(duplicate.id);
          }}
          isRenaming={renamingId === activeProject.id}
          renameValue={renameValue}
          onRenameValueChange={setRenameValue}
          onConfirmRename={confirmRename}
          onCancelRename={() => setRenamingId(null)}
          currentResult={currentResult}
          currentInput={currentInput}
          onAddCalculation={onAddCalculation}
        />
      ) : (
        <ProjectList
          projects={projects}
          layout={layout}
          weightAsMain={weightAsMain}
          onSelectProject={onSetActiveProject}
          onDeleteProject={onDeleteProject}
          onDuplicateProject={(id) => {
            const duplicate = onDuplicateProject(id);
            if (duplicate) onSetActiveProject(duplicate.id);
          }}
          newName={newName}
          onNewNameChange={setNewName}
          onCreate={handleCreate}
          renamingId={renamingId}
          renameValue={renameValue}
          onStartRename={startRename}
          onRenameValueChange={setRenameValue}
          onConfirmRename={confirmRename}
          onCancelRename={() => setRenamingId(null)}
        />
      )}
    </div>
  );
}

export const ProjectDrawer = memo(function ProjectDrawer({
  open,
  onClose,
  ...contentProps
}: ProjectDrawerProps) {
  const t = useTranslations("projects");
  const isMobile = useIsMobile();

  useDrawerBehavior(!isMobile && open, onClose);

  const activeProject = contentProps.activeProjectId
    ? contentProps.projects.find((project) => project.id === contentProps.activeProjectId) ?? null
    : null;

  const content = (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          {activeProject && (
            <button
              type="button"
              onClick={() => contentProps.onSetActiveProject(null)}
              className="rounded-md p-1 text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
              aria-label={t("back")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path
                  fillRule="evenodd"
                  d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
            </svg>
            {activeProject ? activeProject.name : t("title")}
            {!activeProject && contentProps.projects.length > 0 && (
              <span className="ml-1 rounded-full bg-surface-inset px-1.5 py-0.5 text-2xs font-bold text-foreground-secondary">
                {contentProps.projects.length}
              </span>
            )}
          </h2>
        </div>
        {!isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
            aria-label={t("close")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>

      <ProjectsWorkspaceContent {...contentProps} showToolbar={false} layout="drawer" />
    </>
  );

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()} title={t("title")}>
        {content}
      </BottomSheet>
    );
  }

  return (
    <AnimatedDrawer open={open} onClose={onClose} widthClass="w-[460px]" ariaLabel={t("drawerAria")}>
      {content}
    </AnimatedDrawer>
  );
});

function ProjectList({
  projects,
  layout,
  weightAsMain,
  onSelectProject,
  onDeleteProject,
  onDuplicateProject,
  newName,
  onNewNameChange,
  onCreate,
  renamingId,
  renameValue,
  onStartRename,
  onRenameValueChange,
  onConfirmRename,
  onCancelRename,
}: {
  projects: Project[];
  layout: WorkspacePanelLayout;
  weightAsMain: boolean;
  onSelectProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  newName: string;
  onNewNameChange: (value: string) => void;
  onCreate: () => void;
  renamingId: string | null;
  renameValue: string;
  onStartRename: (project: Project) => void;
  onRenameValueChange: (value: string) => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
}) {
  const t = useTranslations("projects");
  const spacing = getWorkspacePanelSpacing(layout);

  return (
    <div className={spacing.sectionGap}>
      <div className="rounded-2xl border border-border bg-surface shadow-sm">
        <div className={`${spacing.cardPadding} space-y-3`}>
          <PanelSectionLabel label={t("title")} />
          <input
            type="text"
            placeholder={t("newProjectPlaceholder")}
            value={newName}
            onChange={(event) => onNewNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onCreate();
            }}
            className="h-11 w-full rounded-xl border border-border-strong bg-surface px-3 text-sm transition-colors focus:border-blue-strong focus:outline-none"
            maxLength={60}
          />
          <PanelActionButton
            type="button"
            onClick={onCreate}
            disabled={!newName.trim()}
            className="w-full border-blue-border bg-blue-surface text-blue-text hover:bg-blue-surface disabled:cursor-not-allowed disabled:border-border disabled:bg-disabled-bg disabled:text-disabled-text"
          >
            {t("create")}
          </PanelActionButton>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-5 py-10 text-center shadow-sm">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-inset text-muted-faint">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground-secondary">{t("noProjects")}</p>
          <p className="mt-1 text-xs text-muted-faint">{t("noProjectsHint")}</p>
        </div>
      ) : (
        <div className={`grid ${spacing.listGap}`}>
          {projects.map((project) => (
            <ProjectListCard
              key={project.id}
              project={project}
              weightAsMain={weightAsMain}
              isRenaming={renamingId === project.id}
              renameValue={renameValue}
              onSelect={() => onSelectProject(project.id)}
              onDelete={() => onDeleteProject(project.id)}
              onDuplicate={() => onDuplicateProject(project.id)}
              onStartRename={() => onStartRename(project)}
              onRenameValueChange={onRenameValueChange}
              onConfirmRename={onConfirmRename}
              onCancelRename={onCancelRename}
              paddingClass={spacing.cardPadding}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const ProjectListCard = memo(function ProjectListCard({
  project,
  weightAsMain,
  isRenaming,
  renameValue,
  onSelect,
  onDelete,
  onDuplicate,
  onStartRename,
  onRenameValueChange,
  onConfirmRename,
  onCancelRename,
  paddingClass,
}: {
  project: Project;
  weightAsMain: boolean;
  isRenaming: boolean;
  renameValue: string;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onStartRename: () => void;
  onRenameValueChange: (value: string) => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
  paddingClass: string;
}) {
  const t = useTranslations("projects");
  const aggregates = computeAggregates(project);
  const currency = CURRENCY_SYMBOLS[aggregates.currency];
  const [primary, secondary, tertiary] = metricOrder(
    weightAsMain,
    {
      totalWeight: t("aggregateTotalWeight"),
      totalCost: t("aggregateTotalCost"),
      costPerKg: t("aggregateCostPerKg"),
    },
    {
      totalWeightKg: aggregates.totalWeightKg,
      totalCost: aggregates.totalCost,
      costPerKg: aggregates.costPerKg,
      currency,
    },
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className={paddingClass}>
        {isRenaming ? (
          <div className="grid gap-2">
            <input
              type="text"
              value={renameValue}
              onChange={(event) => onRenameValueChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onConfirmRename();
                if (event.key === "Escape") onCancelRename();
              }}
              className="h-11 w-full rounded-xl border border-blue-border bg-surface px-3 text-sm font-medium text-foreground focus:border-blue-strong focus:outline-none"
              maxLength={60}
              autoFocus
            />
            <div className="flex gap-3 text-xs">
              <button type="button" onClick={onConfirmRename} className="font-semibold text-blue-strong">
                {t("save")}
              </button>
              <button type="button" onClick={onCancelRename} className="font-medium text-muted">
                {t("cancel")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button type="button" onClick={onSelect} className="w-full text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{project.name}</p>
                  {project.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{project.description}</p>
                  ) : aggregates.count === 0 ? (
                    <p className="mt-1 text-xs text-muted-faint">{t("noCalculationsHint")}</p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-faint">{t("addDescription")}</p>
                  )}
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs font-semibold text-foreground-secondary">
                  {aggregates.count}
                </span>
              </div>

              {aggregates.count > 0 ? (
                <>
                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        {primary.label}
                      </p>
                      <div className="mt-2 flex flex-wrap items-end gap-1.5">
                        <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                          {primary.value}
                        </p>
                        {primary.unit && (
                          <p className="pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                            {primary.unit}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        {secondary.label}
                      </p>
                      <div className="mt-2 flex flex-wrap items-end justify-end gap-1.5">
                        <p className="text-lg font-semibold text-foreground tabular-nums">
                          {secondary.value}
                        </p>
                        {secondary.unit && (
                          <p className="pb-0.5 text-xs font-semibold uppercase tracking-wide text-muted">
                            {secondary.unit}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <PanelSummaryChip label={t("aggregateItems")} value={String(aggregates.count)} />
                    <PanelSummaryChip
                      label={tertiary.label}
                      value={`${tertiary.value} ${tertiary.unit ?? ""}`.trim()}
                    />
                    {aggregates.totalSurfaceAreaM2 > 0 && (
                      <PanelSummaryChip
                        label={t("aggregateTotalSurfaceArea")}
                        value={formatSquareMeters(aggregates.totalSurfaceAreaM2)}
                      />
                    )}
                    {aggregates.totalPaintingCost > 0 && (
                      <PanelSummaryChip
                        label={t("paintingSection")}
                        value={`${formatStaticNumber(aggregates.totalPaintingCost)} ${currency}`}
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <PanelSummaryChip label={t("aggregateItems")} value="0" />
                </div>
              )}
            </button>

            <div className="mt-4 flex flex-wrap gap-3 border-t border-border-faint pt-3 text-xs">
              <button
                type="button"
                onClick={onStartRename}
                className="font-medium text-muted transition-colors hover:text-foreground-secondary"
              >
                {t("rename")}
              </button>
              <button
                type="button"
                onClick={onDuplicate}
                className="font-medium text-muted transition-colors hover:text-foreground-secondary"
              >
                {t("duplicate")}
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="font-medium text-red-interactive transition-colors hover:text-red-text"
              >
                {t("delete")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

function ProjectDetail({
  project,
  csvLabels,
  pdfLabels,
  layout,
  weightAsMain,
  showBackButton,
  onBack,
  onRemoveCalculation,
  onUpdateCalculationNote,
  onUpdateProjectDescription,
  onUpdateProjectPaintingSettings,
  onLoadCalculation,
  onStartRename,
  onDeleteProject,
  onDuplicateProject,
  isRenaming,
  renameValue,
  onRenameValueChange,
  onConfirmRename,
  onCancelRename,
  currentResult,
  currentInput,
  onAddCalculation,
}: {
  project: Project;
  csvLabels: ReturnType<typeof buildProjectExportLabels>["csvLabels"];
  pdfLabels: ReturnType<typeof buildProjectExportLabels>["pdfLabels"];
  layout: WorkspacePanelLayout;
  weightAsMain: boolean;
  showBackButton: boolean;
  onBack: () => void;
  onRemoveCalculation: (projectId: string, calcId: string) => void;
  onUpdateCalculationNote: (projectId: string, calcId: string, note: string) => void;
  onUpdateProjectDescription: (id: string, description: string) => void;
  onUpdateProjectPaintingSettings: (
    id: string,
    pricePerKg: number | undefined,
    coverageM2PerKg: number | undefined,
    coats?: number | undefined,
  ) => void;
  onLoadCalculation?: (input: CalculationInput) => void;
  onStartRename: () => void;
  onDeleteProject: () => void;
  onDuplicateProject: () => void;
  isRenaming: boolean;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
  currentResult: CalculationResult | null;
  currentInput: CalculationInput | null;
  onAddCalculation: (projectId: string, input: CalculationInput, result: CalculationResult) => boolean;
}) {
  const tBase = useTranslations();
  const t = useTranslations("projects");
  const locale = useLocale();
  const spacing = getWorkspacePanelSpacing(layout);
  const aggregates = computeAggregates(project);
  const currency = CURRENCY_SYMBOLS[aggregates.currency];
  const [justAdded, setJustAdded] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [filterProfile, setFilterProfile] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(project.description ?? "");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState("");

  const currentNormalizedProfile = currentInput ? normalizeProfileSnapshot(currentInput) : null;
  const stickyWrapClass = "mb-4";
  const aggregateMetrics = metricOrder(
    weightAsMain,
    {
      totalWeight: t("aggregateTotalWeight"),
      totalCost: t("aggregateTotalCost"),
      costPerKg: t("aggregateCostPerKg"),
      items: t("aggregateItems"),
    },
    {
      totalWeightKg: aggregates.totalWeightKg,
      totalCost: aggregates.totalCost,
      costPerKg: aggregates.costPerKg,
      itemCount: aggregates.count,
      currency,
    },
  );

  const handleAddCurrent = useCallback(() => {
    if (!currentResult || !currentInput) return;
    const added = onAddCalculation(project.id, currentInput, currentResult);
    if (added) {
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1500);
    }
  }, [currentInput, currentResult, onAddCalculation, project.id]);

  const handleConfirmDescription = useCallback(() => {
    onUpdateProjectDescription(project.id, descriptionValue);
    setEditingDescription(false);
  }, [descriptionValue, onUpdateProjectDescription, project.id]);

  function handleStartNote(calculation: ProjectCalculation) {
    setEditingNoteId(calculation.id);
    setNoteValue(calculation.note ?? "");
  }

  function handleConfirmNote() {
    if (editingNoteId) {
      onUpdateCalculationNote(project.id, editingNoteId, noteValue);
    }
    setEditingNoteId(null);
    setNoteValue("");
  }

  const profileOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: string[] = [];
    for (const calculation of project.calculations) {
      const iconKey = calculation.normalizedProfile.iconKey;
      if (!seen.has(iconKey)) {
        seen.add(iconKey);
        options.push(iconKey);
      }
    }
    return options;
  }, [project.calculations]);

  const showFilter = profileOptions.length > 1;

  const displayCalcs = useMemo(() => {
    let calculations = project.calculations;
    if (filterProfile) {
      calculations = calculations.filter((calculation) => calculation.normalizedProfile.iconKey === filterProfile);
    }

    return [...calculations].sort((left, right) => {
      if (sortBy === "weight") return right.result.totalWeightKg - left.result.totalWeightKg;
      if (sortBy === "cost") return right.result.grandTotalAmount - left.result.grandTotalAmount;
      return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
    });
  }, [filterProfile, project.calculations, sortBy]);

  const extremes = useMemo(() => {
    if (project.calculations.length < 2) {
      return { heaviestId: null, lightestId: null, priciestId: null };
    }

    let heaviestId: string | null = null;
    let lightestId: string | null = null;
    let priciestId: string | null = null;
    let maxWeight = -Infinity;
    let minWeight = Infinity;
    let maxCost = -Infinity;

    for (const calculation of project.calculations) {
      if (calculation.result.totalWeightKg > maxWeight) {
        maxWeight = calculation.result.totalWeightKg;
        heaviestId = calculation.id;
      }
      if (calculation.result.totalWeightKg < minWeight) {
        minWeight = calculation.result.totalWeightKg;
        lightestId = calculation.id;
      }
      if (calculation.result.grandTotalAmount > maxCost) {
        maxCost = calculation.result.grandTotalAmount;
        priciestId = calculation.id;
      }
    }

    return { heaviestId, lightestId, priciestId };
  }, [project.calculations]);

  const breakdown = useMemo(() => {
    const profileMap = new Map<string, number>();
    const materialMap = new Map<string, number>();

    for (const calculation of project.calculations) {
      const profileKey = crossSectionKey(calculation);
      const materialKey = resolveGradeLabel(calculation.result.gradeLabel, tBase);
      profileMap.set(profileKey, (profileMap.get(profileKey) ?? 0) + calculation.result.totalWeightKg);
      materialMap.set(materialKey, (materialMap.get(materialKey) ?? 0) + calculation.result.totalWeightKg);
    }

    const sortEntries = (map: Map<string, number>) => [...map.entries()].sort((left, right) => right[1] - left[1]);
    return {
      profiles: sortEntries(profileMap),
      materials: sortEntries(materialMap),
    };
  }, [project.calculations, tBase]);

  const maxProfileWeight = breakdown.profiles[0]?.[1] ?? 1;
  const maxMaterialWeight = breakdown.materials[0]?.[1] ?? 1;

  return (
    <div className="space-y-4">
      <div className={stickyWrapClass}>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface shadow-sm">
            <div className={`${spacing.cardPadding} space-y-4`}>
              {showBackButton && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-raised"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path
                      fillRule="evenodd"
                      d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {t("back")}
                </button>
              )}

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-inset text-foreground-secondary">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5"
                        >
                          <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
                        </svg>
                      </span>

                      <div className="min-w-0 flex-1">
                        {isRenaming ? (
                          <div className="grid gap-2">
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(event) => onRenameValueChange(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") onConfirmRename();
                                if (event.key === "Escape") onCancelRename();
                              }}
                              className="h-11 w-full rounded-xl border border-blue-border bg-surface px-3 text-base font-semibold text-foreground focus:border-blue-strong focus:outline-none"
                              maxLength={60}
                              autoFocus
                            />
                            <div className="flex gap-3 text-xs">
                              <button type="button" onClick={onConfirmRename} className="font-semibold text-blue-strong">
                                {t("save")}
                              </button>
                              <button type="button" onClick={onCancelRename} className="font-medium text-muted">
                                {t("cancel")}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="truncate text-xl font-bold tracking-tight text-foreground">{project.name}</p>
                            <p className="mt-1 text-sm text-muted">
                              {t("itemsCount", { count: aggregates.count })}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <PanelActionButton
                      type="button"
                      onClick={() => exportProjectPdf(project, pdfLabels, CURRENCY_SYMBOLS)}
                      className="border-border bg-surface-raised text-foreground-secondary hover:bg-surface-inset"
                    >
                      {t("pdfExport")}
                    </PanelActionButton>
                    <PanelActionButton
                      type="button"
                      onClick={() => exportProjectCsv(project, csvLabels)}
                      className="border-border bg-surface-raised text-foreground-secondary hover:bg-surface-inset"
                    >
                      {t("export")}
                    </PanelActionButton>
                  </div>
                </div>

                {!isRenaming && (
                  <div className="flex flex-wrap gap-3 text-xs">
                    <button
                      type="button"
                      onClick={onStartRename}
                      className="font-medium text-muted transition-colors hover:text-foreground-secondary"
                    >
                      {t("rename")}
                    </button>
                    <button
                      type="button"
                      onClick={onDuplicateProject}
                      className="font-medium text-muted transition-colors hover:text-foreground-secondary"
                    >
                      {t("duplicate")}
                    </button>
                    <button
                      type="button"
                      onClick={onDeleteProject}
                      className="font-medium text-red-interactive transition-colors hover:text-red-text"
                    >
                      {t("deleteProject")}
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <PanelSectionLabel label={t("pdfDescription")} />
                  {editingDescription ? (
                    <div className="grid gap-2">
                      <textarea
                        value={descriptionValue}
                        onChange={(event) => setDescriptionValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            handleConfirmDescription();
                          }
                          if (event.key === "Escape") {
                            setEditingDescription(false);
                            setDescriptionValue(project.description ?? "");
                          }
                        }}
                        placeholder={t("descriptionPlaceholder")}
                        className="w-full resize-none rounded-xl border border-blue-border bg-surface px-3 py-2 text-sm text-foreground focus:border-blue-strong focus:outline-none"
                        rows={3}
                        maxLength={200}
                        autoFocus
                      />
                      <div className="flex gap-3 text-xs">
                        <button type="button" onClick={handleConfirmDescription} className="font-semibold text-blue-strong">
                          {t("save")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDescription(false);
                            setDescriptionValue(project.description ?? "");
                          }}
                          className="font-medium text-muted"
                        >
                          {t("cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDescription(true);
                        setDescriptionValue(project.description ?? "");
                      }}
                      className="w-full rounded-xl border border-dashed border-border bg-surface-raised px-3 py-3 text-left transition-colors hover:border-border-strong hover:bg-surface-inset"
                    >
                      {project.description ? (
                        <p className="text-sm text-foreground-secondary">{project.description}</p>
                      ) : (
                        <p className="text-sm italic text-muted-faint">{t("addDescription")}</p>
                      )}
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <PanelSummaryChip label={t("aggregateItems")} value={String(aggregates.count)} />
                  <PanelSummaryChip
                    label={t("aggregateCostPerKg")}
                    value={`${formatStaticNumber(aggregates.costPerKg)} ${currency}/kg`}
                  />
                  {aggregates.totalSurfaceAreaM2 > 0 && (
                    <PanelSummaryChip
                      label={t("aggregateTotalSurfaceArea")}
                      value={formatSquareMeters(aggregates.totalSurfaceAreaM2)}
                    />
                  )}
                  {aggregates.paintKgNeeded > 0 && (
                    <PanelSummaryChip
                      label={t("aggregatePaintNeeded")}
                      value={`${formatStaticNumber(aggregates.paintKgNeeded)} kg`}
                    />
                  )}
                  {aggregates.totalPaintingCost > 0 && (
                    <PanelSummaryChip
                      label={t("aggregatePaintingCost")}
                      value={`${formatStaticNumber(aggregates.totalPaintingCost)} ${currency}`}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {aggregateMetrics.map((metric) => (
                    <PanelMetricCard
                      key={metric.label}
                      label={metric.label}
                      value={metric.value}
                      unit={metric.unit}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {currentResult && currentInput && (
            <PanelActionButton
              type="button"
              onClick={handleAddCurrent}
              className={
                justAdded
                  ? "w-full border-green-border bg-green-surface text-green-text hover:bg-green-surface"
                  : "w-full border-blue-border bg-blue-surface text-blue-text hover:bg-blue-surface"
              }
            >
              {justAdded
                ? t("added")
                : t("addCurrentResult", {
                    profile: currentNormalizedProfile ? ` (${currentNormalizedProfile.shortLabel})` : "",
                  })}
            </PanelActionButton>
          )}

          {project.calculations.length > 1 && (
            <div className="rounded-2xl border border-border bg-surface shadow-sm">
              <div className={`${spacing.cardPadding} space-y-3`}>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex gap-1 rounded-xl border border-border bg-surface-raised p-1">
                    {(["date", "weight", "cost"] as SortKey[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSortBy(key)}
                        className={
                          sortBy === key
                            ? "rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm"
                            : "rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground-secondary"
                        }
                      >
                        {t(`sortBy.${key}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {showFilter && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFilterProfile(null)}
                      className={
                        filterProfile === null
                          ? "rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-foreground"
                          : "rounded-full border border-transparent bg-surface-raised px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-foreground-secondary"
                      }
                    >
                      {t("filterAll")}
                    </button>
                    {profileOptions.map((option) => {
                      let label = option;
                      try {
                        label = tBase(`dataset.profileCategories.${option}`);
                      } catch {
                        label = option;
                      }

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setFilterProfile(option === filterProfile ? null : option)}
                          className={
                            filterProfile === option
                              ? "rounded-full border border-blue-border bg-blue-surface px-2.5 py-1 text-xs font-semibold text-blue-text"
                              : "rounded-full border border-transparent bg-surface-raised px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-foreground-secondary"
                          }
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {aggregates.totalSurfaceAreaM2 > 0 && (
        <div className="rounded-2xl border border-border bg-surface shadow-sm">
          <div className={`${spacing.cardPadding} space-y-4`}>
            <PanelSectionLabel label={t("paintingSection")} />

            <div className="grid grid-cols-2 gap-3">
              <PanelMetricCard
                label={t("aggregateTotalSurfaceArea")}
                value={formatSquareMeters(aggregates.totalSurfaceAreaM2)}
              />
              <PanelMetricCard
                label={t("aggregatePaintNeeded")}
                value={formatStaticNumber(aggregates.paintKgNeeded)}
                unit="kg"
              />
              <PanelMetricCard
                label={t("aggregatePaintingCost")}
                value={formatStaticNumber(aggregates.totalPaintingCost)}
                unit={currency}
                className="col-span-2"
              />
            </div>

            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(11rem,1fr))]">
              <label className="grid min-w-0 gap-1 text-xs font-medium text-muted">
                <span>{t("paintPricePerKg")}</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={project.paintingPricePerKg ?? ""}
                  onChange={(event) => {
                    const value = event.target.value ? parseFloat(event.target.value) : undefined;
                    onUpdateProjectPaintingSettings(
                      project.id,
                      value,
                      project.paintingCoverageM2PerKg,
                      project.paintingCoats,
                    );
                  }}
                  placeholder="0.00"
                  className="h-11 w-full rounded-xl border border-border-strong bg-surface px-3 text-sm text-foreground tabular-nums transition-colors focus:border-blue-strong focus:outline-none"
                />
              </label>

              <label className="grid min-w-0 gap-1 text-xs font-medium text-muted">
                <span>{t("paintCoverage")}</span>
                <input
                  type="number"
                  min={0.1}
                  step={0.5}
                  value={project.paintingCoverageM2PerKg ?? 8}
                  onChange={(event) => {
                    const value = event.target.value ? parseFloat(event.target.value) : undefined;
                    onUpdateProjectPaintingSettings(project.id, project.paintingPricePerKg, value, project.paintingCoats);
                  }}
                  className="h-11 w-full rounded-xl border border-border-strong bg-surface px-3 text-sm text-foreground tabular-nums transition-colors focus:border-blue-strong focus:outline-none"
                />
              </label>

              <label className="grid min-w-0 gap-1 text-xs font-medium text-muted">
                <span>{t("paintCoats")}</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={1}
                  value={project.paintingCoats ?? 1}
                  onChange={(event) => {
                    const value = event.target.value
                      ? Math.max(1, Math.min(10, parseInt(event.target.value, 10)))
                      : undefined;
                    onUpdateProjectPaintingSettings(
                      project.id,
                      project.paintingPricePerKg,
                      project.paintingCoverageM2PerKg,
                      value,
                    );
                  }}
                  className="h-11 w-full rounded-xl border border-border-strong bg-surface px-3 text-sm text-foreground tabular-nums transition-colors focus:border-blue-strong focus:outline-none"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {aggregates.count > 1 && (breakdown.profiles.length > 1 || breakdown.materials.length > 1) && (
        <div className="rounded-2xl border border-border bg-surface shadow-sm">
          <div className={`${spacing.cardPadding} space-y-5`}>
            <PanelSectionLabel label={t("aggregateItems")} />

            {breakdown.profiles.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground-secondary">{t("breakdownByProfile")}</p>
                <BreakdownRows rows={breakdown.profiles} maxWeight={maxProfileWeight} barClass="bg-purple-strong" />
              </div>
            )}

            {breakdown.materials.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground-secondary">{t("breakdownByMaterial")}</p>
                <BreakdownRows rows={breakdown.materials} maxWeight={maxMaterialWeight} barClass="bg-blue-strong" />
              </div>
            )}
          </div>
        </div>
      )}

      {project.calculations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-5 py-10 text-center shadow-sm">
          <p className="text-sm font-medium text-foreground-secondary">{t("noCalculations")}</p>
          <p className="mt-1 text-xs text-muted-faint">{t("noCalculationsHint")}</p>
        </div>
      ) : (
        <div className={`grid ${spacing.listGap}`}>
          {displayCalcs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-surface px-5 py-8 text-center shadow-sm">
              <p className="text-sm text-muted-faint">{t("noMatchingFilter")}</p>
            </div>
          )}

          {displayCalcs.map((calculation) => (
            <ProjectCalculationCard
              key={calculation.id}
              calculation={calculation}
              locale={locale}
              weightAsMain={weightAsMain}
              isHeaviest={extremes.heaviestId === calculation.id}
              isLightest={extremes.lightestId === calculation.id}
              isPriciest={extremes.priciestId === calculation.id}
              isEditingNote={editingNoteId === calculation.id}
              noteValue={noteValue}
              onStartNote={() => handleStartNote(calculation)}
              onNoteValueChange={setNoteValue}
              onConfirmNote={handleConfirmNote}
              onCancelNote={() => {
                setEditingNoteId(null);
                setNoteValue("");
              }}
              onLoadCalculation={onLoadCalculation ? () => onLoadCalculation(calculation.input) : undefined}
              onRemoveCalculation={() => onRemoveCalculation(project.id, calculation.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BreakdownRows({
  rows,
  maxWeight,
  barClass,
}: {
  rows: Array<[string, number]>;
  maxWeight: number;
  barClass: string;
}) {
  return (
    <div className="grid gap-2">
      {rows.map(([label, weight]) => (
        <div key={label} className="grid grid-cols-[minmax(0,auto)_1fr_auto] items-center gap-3">
          <span className="truncate text-xs font-medium text-foreground-secondary">{label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-surface-inset">
            <div
              className={`h-full rounded-full ${barClass}`}
              style={{ width: `${Math.round((weight / maxWeight) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted tabular-nums">{formatStaticNumber(weight)} kg</span>
        </div>
      ))}
    </div>
  );
}

const ProjectCalculationCard = memo(function ProjectCalculationCard({
  calculation,
  locale,
  weightAsMain,
  isHeaviest,
  isLightest,
  isPriciest,
  isEditingNote,
  noteValue,
  onStartNote,
  onNoteValueChange,
  onConfirmNote,
  onCancelNote,
  onLoadCalculation,
  onRemoveCalculation,
}: {
  calculation: ProjectCalculation;
  locale: string;
  weightAsMain: boolean;
  isHeaviest: boolean;
  isLightest: boolean;
  isPriciest: boolean;
  isEditingNote: boolean;
  noteValue: string;
  onStartNote: () => void;
  onNoteValueChange: (value: string) => void;
  onConfirmNote: () => void;
  onCancelNote: () => void;
  onLoadCalculation?: () => void;
  onRemoveCalculation: () => void;
}) {
  const tBase = useTranslations();
  const tProjects = useTranslations("projects");
  const tResult = useTranslations("result");
  const styles = categoryStyle(calculation.normalizedProfile.iconKey);
  const gradeLabel = resolveGradeLabel(calculation.result.gradeLabel, tBase);
  const currency = CURRENCY_SYMBOLS[calculation.result.currency];
  const pieceLength = formatPieceLength(calculation.input.length, calculation.result.lengthMm, locale);
  const materialSummary = gradeLabel ?? calculation.result.gradeLabel;
  const orderedMetrics = weightAsMain
    ? [
        {
          label: tResult("unitWeight"),
          value: formatStaticNumber(calculation.result.unitWeightKg),
          unit: "kg",
        },
        {
          label: tResult("totalWeight"),
          value: formatStaticNumber(calculation.result.totalWeightKg),
          unit: "kg",
        },
        {
          label: tResult("totalCost"),
          value: formatStaticNumber(calculation.result.grandTotalAmount),
          unit: currency,
        },
      ]
    : [
        {
          label: tResult("unitWeight"),
          value: formatStaticNumber(calculation.result.unitWeightKg),
          unit: "kg",
        },
        {
          label: tResult("totalCost"),
          value: formatStaticNumber(calculation.result.grandTotalAmount),
          unit: currency,
        },
        {
          label: tResult("totalWeight"),
          value: formatStaticNumber(calculation.result.totalWeightKg),
          unit: "kg",
        },
      ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2.5">
              <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${styles.iconBg}`}>
                <ProfileIcon category={calculation.normalizedProfile.iconKey} className="h-4 w-4" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {calculation.normalizedProfile.shortLabel}
                  </p>
                  {isHeaviest && <Badge tone="amber">{tProjects("badgeHeaviest")}</Badge>}
                  {isLightest && !isHeaviest && <Badge tone="green">{tProjects("badgeLightest")}</Badge>}
                  {isPriciest && <Badge tone="red">{tProjects("badgePriciest")}</Badge>}
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted">{materialSummary}</p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-start gap-1">
            <IconButton title={tProjects("editNote")} onClick={onStartNote}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
              </svg>
            </IconButton>
            {onLoadCalculation && (
              <IconButton title={tProjects("loadIntoCalculator")} onClick={onLoadCalculation}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.59L7.3 9.24a.75.75 0 00-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75z"
                    clipRule="evenodd"
                  />
                </svg>
              </IconButton>
            )}
            <IconButton title={tProjects("removeFromProject")} tone="danger" onClick={onRemoveCalculation}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path
                  fillRule="evenodd"
                  d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                  clipRule="evenodd"
                />
              </svg>
            </IconButton>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <PanelCompactChip
            label={tResult("contextQuantity")}
            value={tResult("pieces", { qty: calculation.result.quantity })}
          />
          <PanelCompactChip label={tResult("contextLength")} value={pieceLength} />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5 xl:grid-cols-4">
          {orderedMetrics.map((metric) => (
            <PanelCompactMetric
              key={metric.label}
              label={metric.label}
              value={metric.value}
              unit={metric.unit}
            />
          ))}
          <PanelCompactMetric
            label={tResult("surfaceArea")}
            value={
              calculation.result.surfaceAreaM2 != null
                ? formatStaticNumber(calculation.result.surfaceAreaM2)
                : "\u2014"
            }
            unit={calculation.result.surfaceAreaM2 != null ? "m\u00b2" : undefined}
          />
        </div>

        {calculation.note && !isEditingNote && (
          <div className="mt-2 rounded-lg border border-border-faint bg-surface-raised px-2.5 py-1.5">
            <p className="text-xs italic text-muted-faint line-clamp-3">{calculation.note}</p>
          </div>
        )}

        {isEditingNote && (
          <div className="mt-2 grid gap-2">
            <textarea
              value={noteValue}
              onChange={(event) => onNoteValueChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onConfirmNote();
                }
                if (event.key === "Escape") onCancelNote();
              }}
              placeholder={tProjects("notePlaceholder")}
              className="w-full resize-none rounded-lg border border-blue-border bg-surface px-3 py-2 text-sm text-foreground focus:border-blue-strong focus:outline-none"
              rows={3}
              maxLength={200}
              autoFocus
            />
            <div className="flex gap-3 text-xs">
              <button type="button" onClick={onConfirmNote} className="font-semibold text-blue-strong">
                {tProjects("save")}
              </button>
              <button type="button" onClick={onCancelNote} className="font-medium text-muted">
                {tProjects("cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "amber" | "green" | "red";
}) {
  const className =
    tone === "amber"
      ? "border-amber-border bg-amber-surface text-amber-text"
      : tone === "green"
        ? "border-green-border bg-green-surface text-green-text"
        : "border-red-border bg-red-surface text-red-text";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide ${className}`}>
      {children}
    </span>
  );
}

function IconButton({
  children,
  title,
  tone = "default",
  onClick,
}: {
  children: ReactNode;
  title: string;
  tone?: "default" | "danger";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        tone === "danger"
          ? "rounded-lg p-1.5 text-muted-faint transition-colors hover:bg-red-surface hover:text-red-interactive"
          : "rounded-lg p-1.5 text-muted-faint transition-colors hover:bg-surface-inset hover:text-foreground-secondary"
      }
      title={title}
    >
      {children}
    </button>
  );
}
