"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
      profileColumn: t("csvHeaders.profile"),
      materialColumn: t("csvHeaders.material"),
      weightColumn: t("csvHeaders.totalWeight"),
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

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

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
  onLoadCalculation?: (input: CalculationInput) => void;
  /** Current calculator result to allow quick-add from inside the drawer. */
  currentResult: CalculationResult | null;
  currentInput: CalculationInput | null;
  onAddCalculation: (projectId: string, input: CalculationInput, result: CalculationResult) => boolean;
}

interface ProjectsWorkspaceContentProps extends Omit<ProjectDrawerProps, "open" | "onClose"> {
  showToolbar?: boolean;
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
  onLoadCalculation,
  currentResult,
  currentInput,
  onAddCalculation,
  showToolbar = true,
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
  }, [renamingId, renameValue, onRenameProject]);

  const activeProject = activeProjectId
    ? projects.find((p) => p.id === activeProjectId) ?? null
    : null;

  return (
    <div className="flex-1 overflow-y-auto scroll-native safe-area-bottom p-4">
      {showToolbar && activeProject && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
          <button
            type="button"
            onClick={() => onSetActiveProject(null)}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-raised"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
            {t("back")}
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => exportProjectPdf(activeProject, pdfLabels, CURRENCY_SYMBOLS)}
              className="rounded-md px-2 py-1 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-raised"
              title={t("pdfExportTitle")}
            >
              {t("pdfExport")}
            </button>
            <button
              type="button"
              onClick={() => exportProjectCsv(activeProject, csvLabels)}
              className="rounded-md px-2 py-1 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-raised"
              title={t("exportTitle")}
            >
              {t("export")}
            </button>
          </div>
        </div>
      )}

      {activeProject ? (
        <ProjectDetail
          project={activeProject}
          onRemoveCalculation={onRemoveCalculation}
          onUpdateCalculationNote={onUpdateCalculationNote}
          onUpdateProjectDescription={onUpdateProjectDescription}
          onLoadCalculation={onLoadCalculation}
          onStartRename={() => startRename(activeProject)}
          onDeleteProject={() => {
            onDeleteProject(activeProject.id);
            onSetActiveProject(null);
          }}
          onDuplicateProject={() => {
            const dup = onDuplicateProject(activeProject.id);
            if (dup) onSetActiveProject(dup.id);
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
          onSelectProject={onSetActiveProject}
          onDeleteProject={onDeleteProject}
          onDuplicateProject={(id) => {
            const dup = onDuplicateProject(id);
            if (dup) onSetActiveProject(dup.id);
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

/* ------------------------------------------------------------------ */
/*  Drawer                                                            */
/* ------------------------------------------------------------------ */

export const ProjectDrawer = memo(function ProjectDrawer({
  open,
  onClose,
  ...contentProps
}: ProjectDrawerProps) {
  const tBase = useTranslations();
  const t = useTranslations("projects");
  const isMobile = useIsMobile();
  const { csvLabels, pdfLabels } = buildProjectExportLabels(t, tBase);

  useDrawerBehavior(!isMobile && open, onClose);

  const activeProject = contentProps.activeProjectId
    ? contentProps.projects.find((project) => project.id === contentProps.activeProjectId) ?? null
    : null;

  const content = (
    <>
      {/* Header */}
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
                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
            </svg>
            {activeProject ? activeProject.name : t("title")}
            {!activeProject && contentProps.projects.length > 0 && (
              <span className="ml-1 rounded-full bg-surface-inset px-1.5 py-0.5 text-[10px] font-bold text-foreground-secondary">
                {contentProps.projects.length}
              </span>
            )}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {activeProject && (
            <>
              <button
                type="button"
                onClick={() => exportProjectPdf(activeProject, pdfLabels, CURRENCY_SYMBOLS)}
                className="rounded-md px-2 py-1 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-raised"
                title={t("pdfExportTitle")}
              >
                {t("pdfExport")}
              </button>
              <button
                type="button"
                onClick={() => exportProjectCsv(activeProject, csvLabels)}
                className="rounded-md px-2 py-1 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-raised"
                title={t("exportTitle")}
              >
                {t("export")}
              </button>
            </>
          )}
          {!isMobile && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
              aria-label={t("close")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <ProjectsWorkspaceContent {...contentProps} showToolbar={false} />
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
    <AnimatedDrawer open={open} onClose={onClose} widthClass="w-[440px]" ariaLabel={t("drawerAria")}>
      {content}
    </AnimatedDrawer>
  );
});

/* ------------------------------------------------------------------ */
/*  Project list view                                                 */
/* ------------------------------------------------------------------ */

function ProjectList({
  projects,
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
  onSelectProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  newName: string;
  onNewNameChange: (v: string) => void;
  onCreate: () => void;
  renamingId: string | null;
  renameValue: string;
  onStartRename: (p: Project) => void;
  onRenameValueChange: (v: string) => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
}) {
  const t = useTranslations("projects");

  return (
    <div className="space-y-3">
      {/* Create new project */}
      <div className="grid gap-2">
        <input
          type="text"
          placeholder={t("newProjectPlaceholder")}
          value={newName}
          onChange={(e) => onNewNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCreate();
          }}
          className="h-9 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm transition-colors focus:border-purple-strong"
          maxLength={60}
        />
        <button
          type="button"
          onClick={onCreate}
          disabled={!newName.trim()}
          className="w-full rounded-lg bg-purple-strong px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-purple-strong-hover disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-text"
        >
          {t("create")}
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-border">
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
          </svg>
          <p className="text-sm text-muted-faint">{t("noProjects")}</p>
          <p className="text-xs text-muted-faint">
            {t("noProjectsHint")}
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {projects.map((project) => {
            const agg = computeAggregates(project);
            const isRenaming = renamingId === project.id;

            return (
              <div
                key={project.id}
                className="group rounded-lg border border-border bg-surface transition-colors hover:border-border-strong"
              >
                <button
                  type="button"
                  onClick={() => !isRenaming && onSelectProject(project.id)}
                  className="w-full px-3 py-3 text-left"
                  disabled={isRenaming}
                >
                  {isRenaming ? (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => onRenameValueChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") onConfirmRename();
                          if (e.key === "Escape") onCancelRename();
                        }}
                        className="h-7 flex-1 rounded border border-blue-border bg-surface px-2 text-sm focus:border-blue-strong"
                        maxLength={60}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onConfirmRename();
                        }}
                        className="text-xs font-medium text-blue-strong hover:text-blue-strong"
                      >
                        {t("save")}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancelRename();
                        }}
                        className="text-xs font-medium text-muted hover:text-foreground-secondary"
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">{project.name}</span>
                        <span className="text-[10px] text-muted-faint">
                          {t("itemsCount", { count: agg.count })}
                        </span>
                      </div>
                      {project.description && (
                        <p className="mt-0.5 truncate text-xs text-muted-faint">{project.description}</p>
                      )}
                      {agg.count > 0 && (
                        <div className="mt-1 flex gap-3 text-xs text-muted">
                          <span>{agg.totalWeightKg} kg</span>
                          <span>{agg.totalCost} {CURRENCY_SYMBOLS[agg.currency]}</span>
                          <span className="text-muted-faint">{agg.costPerKg} {CURRENCY_SYMBOLS[agg.currency]}/kg</span>
                        </div>
                      )}
                    </>
                  )}
                </button>

                {/* Actions row */}
                {!isRenaming && (
                  <div className="flex border-t border-border-faint px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => onStartRename(project)}
                      className="text-[11px] font-medium text-muted transition-colors hover:text-foreground-secondary"
                    >
                      {t("rename")}
                    </button>
                    <span className="mx-2 text-border">|</span>
                    <button
                      type="button"
                      onClick={() => onDuplicateProject(project.id)}
                      className="text-[11px] font-medium text-muted transition-colors hover:text-foreground-secondary"
                    >
                      {t("duplicate")}
                    </button>
                    <span className="mx-2 text-border">|</span>
                    <button
                      type="button"
                      onClick={() => onDeleteProject(project.id)}
                      className="text-[11px] font-medium text-red-interactive transition-colors hover:text-red-text"
                    >
                      {t("delete")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category style helper                                            */
/* ------------------------------------------------------------------ */

function categoryStyle(category: string): { iconBg: string; badge: string } {
  switch (category) {
    case "tubes":
      return { iconBg: "bg-blue-surface text-blue-text", badge: "bg-blue-surface text-blue-text border border-blue-border" };
    case "plates_sheets":
      return { iconBg: "bg-amber-surface text-amber-text", badge: "bg-amber-surface text-amber-text border border-amber-border" };
    case "structural":
      return { iconBg: "bg-green-surface text-green-text", badge: "bg-green-surface text-green-text border border-green-border" };
    default:
      return { iconBg: "bg-purple-surface text-purple-text", badge: "bg-purple-surface text-purple-text border border-purple-border" };
  }
}

/* ------------------------------------------------------------------ */
/*  Sort type                                                         */
/* ------------------------------------------------------------------ */

type SortKey = "date" | "weight" | "cost";

/* ------------------------------------------------------------------ */
/*  Cross-section key (length-free grouping key)                      */
/* ------------------------------------------------------------------ */

const SHEET_PROFILE_IDS = ["sheet", "plate", "chequered_plate", "expanded_metal", "corrugated_sheet"];
const LENGTH_UNIT_FACTORS: Record<string, number> = { mm: 1, cm: 10, m: 1000, in: 25.4, ft: 304.8 };

function crossSectionKey(calc: ProjectCalculation): string {
  const profileId = calc.result.profileId;
  const shortLabel = calc.normalizedProfile.shortLabel;

  // Sheets & plates: group by thickness only (user request)
  if (SHEET_PROFILE_IDS.includes(profileId)) {
    const t = calc.input.manualDimensions?.thickness;
    if (t) {
      const mm = Math.round(t.value * (LENGTH_UNIT_FACTORS[t.unit] ?? 1) * 10) / 10;
      return `${mm} mm`;
    }
  }

  // EN standard profiles: "HEA 100 · L 6000 mm" → "HEA 100"
  if (shortLabel.includes(" · L ")) return shortLabel.split(" · L ")[0];

  // Manual profiles: "FB 80x8 x L 3000 mm" → "FB 80x8"
  if (shortLabel.includes(" x L ")) return shortLabel.split(" x L ")[0];

  return shortLabel;
}

/* ------------------------------------------------------------------ */
/*  Project detail view                                               */
/* ------------------------------------------------------------------ */

function ProjectDetail({
  project,
  onRemoveCalculation,
  onUpdateCalculationNote,
  onUpdateProjectDescription,
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
  onRemoveCalculation: (projectId: string, calcId: string) => void;
  onUpdateCalculationNote: (projectId: string, calcId: string, note: string) => void;
  onUpdateProjectDescription: (id: string, description: string) => void;
  onLoadCalculation?: (input: CalculationInput) => void;
  onStartRename: () => void;
  onDeleteProject: () => void;
  onDuplicateProject: () => void;
  isRenaming: boolean;
  renameValue: string;
  onRenameValueChange: (v: string) => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
  currentResult: CalculationResult | null;
  currentInput: CalculationInput | null;
  onAddCalculation: (projectId: string, input: CalculationInput, result: CalculationResult) => boolean;
}) {
  const tBase = useTranslations();
  const t = useTranslations("projects");
  const agg = computeAggregates(project);
  const [justAdded, setJustAdded] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [filterProfile, setFilterProfile] = useState<string | null>(null);
  const [editingDescr, setEditingDescr] = useState(false);
  const [descrValue, setDescrValue] = useState(project.description ?? "");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState("");

  const normalizedCurrent = currentInput ? normalizeProfileSnapshot(currentInput) : null;

  const handleAddCurrent = useCallback(() => {
    if (!currentResult || !currentInput) return;
    const ok = onAddCalculation(project.id, currentInput, currentResult);
    if (ok) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1500);
    }
  }, [project.id, currentResult, currentInput, onAddCalculation]);

  const handleConfirmDescr = useCallback(() => {
    onUpdateProjectDescription(project.id, descrValue);
    setEditingDescr(false);
  }, [project.id, descrValue, onUpdateProjectDescription]);

  const handleStartNote = useCallback((calc: ProjectCalculation) => {
    setEditingNoteId(calc.id);
    setNoteValue(calc.note ?? "");
  }, []);

  const handleConfirmNote = useCallback(() => {
    if (editingNoteId) {
      onUpdateCalculationNote(project.id, editingNoteId, noteValue);
    }
    setEditingNoteId(null);
    setNoteValue("");
  }, [project.id, editingNoteId, noteValue, onUpdateCalculationNote]);

  /* Unique profile categories for filter chips */
  const profileOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: string[] = [];
    for (const c of project.calculations) {
      const key = c.normalizedProfile.iconKey;
      if (!seen.has(key)) { seen.add(key); opts.push(key); }
    }
    return opts;
  }, [project.calculations]);

  const showFilter = profileOptions.length > 1;

  /* Sort + filter calculations */
  const displayCalcs = useMemo(() => {
    let calcs = project.calculations;
    if (filterProfile) calcs = calcs.filter((c) => c.normalizedProfile.iconKey === filterProfile);
    return [...calcs].sort((a, b) => {
      if (sortBy === "weight") return b.result.totalWeightKg - a.result.totalWeightKg;
      if (sortBy === "cost") return b.result.grandTotalAmount - a.result.grandTotalAmount;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [project.calculations, sortBy, filterProfile]);

  /* Extremes (computed on full list, not filtered) */
  const extremes = useMemo(() => {
    const calcs = project.calculations;
    if (calcs.length < 2) return { heaviestId: null, lightestId: null, priciestId: null };
    let maxW = -Infinity, minW = Infinity, maxC = -Infinity;
    let heaviestId: string | null = null, lightestId: string | null = null, priciestId: string | null = null;
    for (const c of calcs) {
      if (c.result.totalWeightKg > maxW) { maxW = c.result.totalWeightKg; heaviestId = c.id; }
      if (c.result.totalWeightKg < minW) { minW = c.result.totalWeightKg; lightestId = c.id; }
      if (c.result.grandTotalAmount > maxC) { maxC = c.result.grandTotalAmount; priciestId = c.id; }
    }
    return { heaviestId, lightestId, priciestId };
  }, [project.calculations]);

  /* Breakdown by profile (cross-section only, no length) and material */
  const breakdown = useMemo(() => {
    const profileMap = new Map<string, number>();
    const materialMap = new Map<string, number>();
    for (const c of project.calculations) {
      const pk = crossSectionKey(c);
      const mk = resolveGradeLabel(c.result.gradeLabel, tBase);
      profileMap.set(pk, (profileMap.get(pk) ?? 0) + c.result.totalWeightKg);
      materialMap.set(mk, (materialMap.get(mk) ?? 0) + c.result.totalWeightKg);
    }
    const sortByVal = (m: Map<string, number>) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]);
    return {
      profiles: sortByVal(profileMap),
      materials: sortByVal(materialMap),
    };
  }, [project.calculations, tBase]);

  const maxProfileWeight = breakdown.profiles[0]?.[1] ?? 1;
  const maxMaterialWeight = breakdown.materials[0]?.[1] ?? 1;

  return (
    <div className="space-y-4">
      {/* Project name + actions */}
      {isRenaming ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onConfirmRename();
              if (e.key === "Escape") onCancelRename();
            }}
            className="h-8 flex-1 rounded border border-blue-border bg-surface px-2 text-sm focus:border-blue-strong"
            maxLength={60}
            autoFocus
          />
          <button type="button" onClick={onConfirmRename} className="text-xs font-medium text-blue-strong hover:text-blue-strong">
            {t("save")}
          </button>
          <button type="button" onClick={onCancelRename} className="text-xs font-medium text-muted hover:text-foreground-secondary">
            {t("cancel")}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <button type="button" onClick={onStartRename} className="font-medium text-muted transition-colors hover:text-foreground-secondary">
            {t("rename")}
          </button>
          <span className="text-border">|</span>
          <button type="button" onClick={onDuplicateProject} className="font-medium text-muted transition-colors hover:text-foreground-secondary">
            {t("duplicate")}
          </button>
          <span className="text-border">|</span>
          <button type="button" onClick={onDeleteProject} className="font-medium text-red-interactive transition-colors hover:text-red-text">
            {t("deleteProject")}
          </button>
        </div>
      )}

      {/* Project description */}
      {editingDescr ? (
        <div className="grid gap-1.5">
          <textarea
            value={descrValue}
            onChange={(e) => setDescrValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleConfirmDescr(); }
              if (e.key === "Escape") setEditingDescr(false);
            }}
            placeholder={t("descriptionPlaceholder")}
            className="w-full rounded-lg border border-blue-border bg-surface px-3 py-2 text-sm resize-none focus:border-blue-strong focus:outline-none"
            rows={2}
            maxLength={200}
            autoFocus
          />
          <div className="flex gap-2">
            <button type="button" onClick={handleConfirmDescr} className="text-xs font-medium text-blue-strong">
              {t("save")}
            </button>
            <button type="button" onClick={() => { setEditingDescr(false); setDescrValue(project.description ?? ""); }} className="text-xs font-medium text-muted">
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setEditingDescr(true); setDescrValue(project.description ?? ""); }}
          className="w-full text-left rounded-lg border border-dashed border-border-faint px-3 py-2 transition-colors hover:border-border-strong hover:bg-surface-raised"
        >
          {project.description ? (
            <p className="text-xs text-muted">{project.description}</p>
          ) : (
            <p className="text-xs text-muted-faint italic">{t("addDescription")}</p>
          )}
        </button>
      )}

      {/* Aggregates card — 4 stats */}
      {agg.count > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-surface border border-border px-3 py-2">
            <p className="text-[10px] font-medium text-muted">{t("aggregateItems")}</p>
            <p className="text-lg font-bold text-foreground">{agg.count}</p>
          </div>
          <div className="rounded-lg bg-surface border border-border px-3 py-2">
            <p className="text-[10px] font-medium text-muted">{t("aggregateTotalWeight")}</p>
            <p className="text-lg font-bold text-foreground">
              {agg.totalWeightKg} <span className="text-xs font-medium text-muted-faint">kg</span>
            </p>
          </div>
          <div className="rounded-lg bg-surface border border-border px-3 py-2">
            <p className="text-[10px] font-medium text-muted">{t("aggregateTotalCost")}</p>
            <p className="text-lg font-bold text-foreground">
              {agg.totalCost} <span className="text-xs font-medium text-muted-faint">{CURRENCY_SYMBOLS[agg.currency]}</span>
            </p>
          </div>
          <div className="rounded-lg bg-surface border border-border px-3 py-2">
            <p className="text-[10px] font-medium text-muted">{t("aggregateCostPerKg")}</p>
            <p className="text-lg font-bold text-foreground">
              {agg.costPerKg} <span className="text-xs font-medium text-muted-faint">{CURRENCY_SYMBOLS[agg.currency]}/kg</span>
            </p>
          </div>
        </div>
      )}

      {/* Breakdown by profile & material */}
      {agg.count > 1 && (
        <div className="grid gap-3 rounded-lg border border-border bg-surface px-3 py-3">
          {breakdown.profiles.length > 1 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">{t("breakdownByProfile")}</p>
              <div className="grid gap-1">
                {breakdown.profiles.map(([label, weight]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="w-12 shrink-0 text-right text-[11px] font-medium text-foreground-secondary">{label}</span>
                    <div className="flex-1 rounded-full bg-surface-inset overflow-hidden h-2">
                      <div
                        className="h-full rounded-full bg-purple-strong transition-all"
                        style={{ width: `${Math.round((weight / maxProfileWeight) * 100)}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-[11px] text-muted">{Math.round(weight * 10) / 10} kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {breakdown.materials.length > 1 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">{t("breakdownByMaterial")}</p>
              <div className="grid gap-1">
                {breakdown.materials.map(([label, weight]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="w-12 shrink-0 text-right text-[11px] font-medium text-foreground-secondary">{label}</span>
                    <div className="flex-1 rounded-full bg-surface-inset overflow-hidden h-2">
                      <div
                        className="h-full rounded-full bg-blue-strong transition-all"
                        style={{ width: `${Math.round((weight / maxMaterialWeight) * 100)}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-[11px] text-muted">{Math.round(weight * 10) / 10} kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add current calculation */}
      {currentResult && currentInput && (
        <button
          type="button"
          onClick={handleAddCurrent}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${justAdded
              ? "border-green-border bg-green-surface text-green-text"
              : "border-blue-border bg-blue-surface text-blue-text hover:bg-blue-surface"
            }`}
        >
          {justAdded
            ? t("added")
            : t("addCurrentResult", {
              profile: normalizedCurrent ? ` (${normalizedCurrent.shortLabel})` : "",
            })}
        </button>
      )}

      {/* Sort & filter controls */}
      {project.calculations.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Sort buttons */}
          <div className="flex gap-1 rounded-lg border border-border p-0.5">
            {(["date", "weight", "cost"] as SortKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSortBy(key)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${sortBy === key ? "bg-surface-raised text-foreground" : "text-muted hover:text-foreground-secondary"}`}
              >
                {t(`sortBy.${key}`)}
              </button>
            ))}
          </div>

          {/* Profile filter chips */}
          {showFilter && (
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setFilterProfile(null)}
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${filterProfile === null ? "bg-surface-raised text-foreground" : "text-muted hover:text-foreground-secondary"}`}
              >
                {t("filterAll")}
              </button>
              {profileOptions.map((opt) => {
                let label = opt;
                try { label = tBase(`dataset.profileCategories.${opt}`); } catch { /* fallback */ }
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFilterProfile(opt === filterProfile ? null : opt)}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${filterProfile === opt ? "bg-purple-surface text-purple-strong border border-purple-border" : "text-muted hover:text-foreground-secondary"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Calculation list */}
      {project.calculations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm text-muted-faint">{t("noCalculations")}</p>
          <p className="text-xs text-muted-faint">
            {t("noCalculationsHint")}
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {displayCalcs.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-faint">{t("noMatchingFilter")}</p>
          )}
          {displayCalcs.map((calc) => {
            const gradeLabel = resolveGradeLabel(calc.result.gradeLabel, tBase);
            const isHeaviest = extremes.heaviestId === calc.id;
            const isLightest = extremes.lightestId === calc.id;
            const isPriciest = extremes.priciestId === calc.id;
            const isEditingNote = editingNoteId === calc.id;
            const catStyle = categoryStyle(calc.normalizedProfile.iconKey);
            const costPerKgCalc = calc.result.totalWeightKg > 0
              ? Math.round((calc.result.grandTotalAmount / calc.result.totalWeightKg) * 100) / 100
              : 0;

            return (
              <div
                key={calc.id}
                className="rounded-lg border border-border bg-surface px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-foreground min-w-0">
                        <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${catStyle.iconBg}`}>
                          <ProfileIcon category={calc.normalizedProfile.iconKey} className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate">{calc.normalizedProfile.shortLabel}</span>
                      </p>
                      {/* Extreme badges */}
                      {isHeaviest && (
                        <span className="shrink-0 rounded-full bg-amber-surface border border-amber-border px-1.5 py-0.5 text-[9px] font-semibold text-amber-text uppercase tracking-wide">
                          {t("badgeHeaviest")}
                        </span>
                      )}
                      {isLightest && !isHeaviest && (
                        <span className="shrink-0 rounded-full bg-green-surface border border-green-border px-1.5 py-0.5 text-[9px] font-semibold text-green-text uppercase tracking-wide">
                          {t("badgeLightest")}
                        </span>
                      )}
                      {isPriciest && (
                        <span className="shrink-0 rounded-full bg-red-surface border border-red-border px-1.5 py-0.5 text-[9px] font-semibold text-red-text uppercase tracking-wide">
                          {t("badgePriciest")}
                        </span>
                      )}
                    </div>
                    {gradeLabel && (
                      <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold ${catStyle.badge}`}>
                        {gradeLabel}
                      </span>
                    )}
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted">
                      <span>{calc.result.totalWeightKg} kg</span>
                      <span>{calc.result.grandTotalAmount} {CURRENCY_SYMBOLS[calc.result.currency]}</span>
                      {costPerKgCalc > 0 && (
                        <span className="text-muted-faint">{costPerKgCalc} {CURRENCY_SYMBOLS[calc.result.currency]}/kg</span>
                      )}
                    </div>
                    {/* Note display */}
                    {calc.note && !isEditingNote && (
                      <p className="mt-1 text-[11px] text-muted-faint italic line-clamp-2">{calc.note}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1 items-start">
                    {/* Note edit button */}
                    <button
                      type="button"
                      onClick={() => isEditingNote ? handleConfirmNote() : handleStartNote(calc)}
                      className="rounded p-1 text-muted-faint transition-colors hover:bg-surface-inset hover:text-foreground-secondary"
                      title={t("editNote")}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                        <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                      </svg>
                    </button>
                    {onLoadCalculation && (
                      <button
                        type="button"
                        onClick={() => onLoadCalculation(calc.input)}
                        className="rounded p-1 text-muted-faint transition-colors hover:bg-surface-inset hover:text-foreground-secondary"
                        title={t("loadIntoCalculator")}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.59L7.3 9.24a.75.75 0 00-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveCalculation(project.id, calc.id)}
                      className="rounded p-1 text-muted-faint transition-colors hover:bg-red-surface hover:text-red-interactive"
                      title={t("removeFromProject")}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Inline note editor */}
                {isEditingNote && (
                  <div className="mt-2 grid gap-1.5">
                    <textarea
                      value={noteValue}
                      onChange={(e) => setNoteValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleConfirmNote(); }
                        if (e.key === "Escape") { setEditingNoteId(null); }
                      }}
                      placeholder={t("notePlaceholder")}
                      className="w-full rounded border border-blue-border bg-surface px-2 py-1.5 text-xs resize-none focus:border-blue-strong focus:outline-none"
                      rows={2}
                      maxLength={200}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={handleConfirmNote} className="text-[11px] font-medium text-blue-strong">
                        {t("save")}
                      </button>
                      <button type="button" onClick={() => setEditingNoteId(null)} className="text-[11px] font-medium text-muted">
                        {t("cancel")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
