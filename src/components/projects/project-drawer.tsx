"use client";

import { memo, useCallback, useEffect, useState } from "react";
import type { Project } from "@/hooks/useProjects";
import { computeAggregates, exportProjectCsv } from "@/hooks/useProjects";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";

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
  onRemoveCalculation: (projectId: string, calcId: string) => void;
  onLoadCalculation?: (input: CalculationInput) => void;
  /** Current calculator result to allow quick-add from inside the drawer. */
  currentResult: CalculationResult | null;
  currentInput: CalculationInput | null;
  onAddCalculation: (projectId: string, input: CalculationInput, result: CalculationResult) => boolean;
}

/* ------------------------------------------------------------------ */
/*  Drawer                                                            */
/* ------------------------------------------------------------------ */

export const ProjectDrawer = memo(function ProjectDrawer({
  open,
  onClose,
  projects,
  activeProjectId,
  onSetActiveProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onRemoveCalculation,
  onLoadCalculation,
  currentResult,
  currentInput,
  onAddCalculation,
}: ProjectDrawerProps) {
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  /* Lock body scroll when open */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  /* Close on Escape key */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

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
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        aria-label="Projects drawer"
        className={`fixed inset-y-0 right-0 z-50 flex w-[440px] max-w-[95vw] flex-col bg-slate-50 shadow-xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            {activeProject && (
              <button
                type="button"
                onClick={() => onSetActiveProject(null)}
                className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
                aria-label="Back to projects"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              {/* folder icon */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>
              </svg>
              {activeProject ? activeProject.name : "Projects"}
              {!activeProject && projects.length > 0 && (
                <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                  {projects.length}
                </span>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {activeProject && (
              <button
                type="button"
                onClick={() => exportProjectCsv(activeProject)}
                className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200"
                title="Export project as CSV"
              >
                Export
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
              aria-label="Close projects"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeProject ? (
            <ProjectDetail
              project={activeProject}
              onRemoveCalculation={onRemoveCalculation}
              onLoadCalculation={onLoadCalculation}
              onStartRename={() => startRename(activeProject)}
              onDeleteProject={() => {
                onDeleteProject(activeProject.id);
                onSetActiveProject(null);
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
      </aside>
    </>
  );
});

/* ------------------------------------------------------------------ */
/*  Project list view                                                 */
/* ------------------------------------------------------------------ */

function ProjectList({
  projects,
  onSelectProject,
  onDeleteProject,
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
  return (
    <div className="space-y-3">
      {/* Create new project */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="New project name..."
          value={newName}
          onChange={(e) => onNewNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCreate();
          }}
          className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm transition-colors focus:border-blue-500"
          maxLength={60}
        />
        <button
          type="button"
          onClick={onCreate}
          disabled={!newName.trim()}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          Create
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-slate-200">
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>
          </svg>
          <p className="text-sm text-slate-400">No projects yet.</p>
          <p className="text-xs text-slate-400">
            Create a project to group calculations together.
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
                className="group rounded-lg border border-slate-200 bg-white transition-colors hover:border-slate-300"
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
                        className="h-7 flex-1 rounded border border-blue-300 bg-white px-2 text-sm focus:border-blue-500"
                        maxLength={60}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onConfirmRename();
                        }}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancelRename();
                        }}
                        className="text-xs font-medium text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-800">{project.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {agg.count} item{agg.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {agg.count > 0 && (
                        <div className="mt-1 flex gap-3 text-xs text-slate-500">
                          <span>{agg.totalWeightKg} kg</span>
                          <span>{agg.totalCost} {CURRENCY_SYMBOLS[agg.currency]}</span>
                        </div>
                      )}
                    </>
                  )}
                </button>

                {/* Actions row */}
                {!isRenaming && (
                  <div className="flex border-t border-slate-100 px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => onStartRename(project)}
                      className="text-[11px] font-medium text-slate-500 transition-colors hover:text-slate-700"
                    >
                      Rename
                    </button>
                    <span className="mx-2 text-slate-200">|</span>
                    <button
                      type="button"
                      onClick={() => onDeleteProject(project.id)}
                      className="text-[11px] font-medium text-red-500 transition-colors hover:text-red-700"
                    >
                      Delete
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
/*  Project detail view                                               */
/* ------------------------------------------------------------------ */

function ProjectDetail({
  project,
  onRemoveCalculation,
  onLoadCalculation,
  onStartRename,
  onDeleteProject,
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
  onLoadCalculation?: (input: CalculationInput) => void;
  onStartRename: () => void;
  onDeleteProject: () => void;
  isRenaming: boolean;
  renameValue: string;
  onRenameValueChange: (v: string) => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
  currentResult: CalculationResult | null;
  currentInput: CalculationInput | null;
  onAddCalculation: (projectId: string, input: CalculationInput, result: CalculationResult) => boolean;
}) {
  const agg = computeAggregates(project);
  const [justAdded, setJustAdded] = useState(false);

  const handleAddCurrent = useCallback(() => {
    if (!currentResult || !currentInput) return;
    const ok = onAddCalculation(project.id, currentInput, currentResult);
    if (ok) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1500);
    }
  }, [project.id, currentResult, currentInput, onAddCalculation]);

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
            className="h-8 flex-1 rounded border border-blue-300 bg-white px-2 text-sm focus:border-blue-500"
            maxLength={60}
            autoFocus
          />
          <button
            type="button"
            onClick={onConfirmRename}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancelRename}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={onStartRename}
            className="font-medium text-slate-500 transition-colors hover:text-slate-700"
          >
            Rename
          </button>
          <span className="text-slate-200">|</span>
          <button
            type="button"
            onClick={onDeleteProject}
            className="font-medium text-red-500 transition-colors hover:text-red-700"
          >
            Delete project
          </button>
        </div>
      )}

      {/* Aggregates card */}
      {agg.count > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
            <p className="text-[10px] font-medium text-slate-500">Items</p>
            <p className="text-lg font-bold text-slate-800">{agg.count}</p>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
            <p className="text-[10px] font-medium text-slate-500">Total Weight</p>
            <p className="text-lg font-bold text-slate-800">
              {agg.totalWeightKg} <span className="text-xs font-medium text-slate-400">kg</span>
            </p>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
            <p className="text-[10px] font-medium text-slate-500">Total Cost</p>
            <p className="text-lg font-bold text-slate-800">
              {agg.totalCost} <span className="text-xs font-medium text-slate-400">{CURRENCY_SYMBOLS[agg.currency]}</span>
            </p>
          </div>
        </div>
      )}

      {/* Add current calculation */}
      {currentResult && currentInput && (
        <button
          type="button"
          onClick={handleAddCurrent}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
            justAdded
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
          }`}
        >
          {justAdded ? "Added!" : `Add current result (${currentResult.profileLabel})`}
        </button>
      )}

      {/* Calculation list */}
      {project.calculations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm text-slate-400">No calculations in this project.</p>
          <p className="text-xs text-slate-400">
            Use &ldquo;Add to Project&rdquo; on a result to add items.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {project.calculations.map((calc) => (
            <div
              key={calc.id}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {calc.result.profileLabel}
                  </p>
                  <p className="text-xs text-slate-500">{calc.result.gradeLabel}</p>
                  <div className="mt-1 flex gap-3 text-xs text-slate-500">
                    <span>{calc.result.totalWeightKg} kg</span>
                    <span>{calc.result.grandTotalAmount} {CURRENCY_SYMBOLS[calc.result.currency]}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  {onLoadCalculation && (
                    <button
                      type="button"
                      onClick={() => onLoadCalculation(calc.input)}
                      className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                      title="Load into calculator"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                        <path d="M3 10a7 7 0 1 1 14 0 7 7 0 0 1-14 0Zm8.293-3.707a1 1 0 0 0-1.414 0l-3 3a1 1 0 0 0 1.414 1.414L10 9.414l1.707 1.293a1 1 0 0 0 1.414-1.414l-3-3Z"/>
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveCalculation(project.id, calc.id)}
                    className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Remove from project"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
