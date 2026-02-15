"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "@/hooks/useProjects";
import { computeAggregates } from "@/hooks/useProjects";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";
import { ProfileIcon } from "@/components/profiles/profile-icon";

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

interface SaveToProjectModalProps {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  onCreateProject: (name: string) => Project;
  onAddCalculation: (projectId: string, input: CalculationInput, result: CalculationResult) => boolean;
  currentInput: CalculationInput;
  currentResult: CalculationResult;
  /** Open the full project drawer (for management). */
  onOpenDrawer: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export const SaveToProjectModal = memo(function SaveToProjectModal({
  open,
  onClose,
  projects,
  onCreateProject,
  onAddCalculation,
  currentInput,
  currentResult,
  onOpenDrawer,
}: SaveToProjectModalProps) {
  const normalizedCurrent = normalizeProfileSnapshot(currentInput);
  const [newName, setNewName] = useState("");
  const [feedback, setFeedback] = useState<{ projectName: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Reset state when modal closes */
  const closeAndReset = useCallback(() => {
    onClose();
    setNewName("");
    setFeedback(null);
  }, [onClose]);

  /* Focus the "new project" input when modal opens & no projects exist */
  useEffect(() => {
    if (open && projects.length === 0) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, projects.length]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAndReset();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, closeAndReset]);

  /* Lock body scroll */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  const handleAdd = useCallback(
    (projectId: string, projectName: string) => {
      onAddCalculation(projectId, currentInput, currentResult);
      setFeedback({ projectName });
      setTimeout(() => {
        onClose();
        setNewName("");
        setFeedback(null);
      }, 800);
    },
    [onAddCalculation, currentInput, currentResult, onClose],
  );

  const handleCreateAndAdd = useCallback(() => {
    const name = newName.trim();
    if (!name) return;
    const project = onCreateProject(name);
    setNewName("");
    handleAdd(project.id, project.name);
  }, [newName, onCreateProject, handleAdd]);

  const handleManageProjects = useCallback(() => {
    closeAndReset();
    onOpenDrawer();
  }, [closeAndReset, onOpenDrawer]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-overlay transition-opacity"
        onClick={closeAndReset}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeAndReset}>
        <div
          className="w-full max-w-sm rounded-xl border border-border bg-surface shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>
              </svg>
              Save to Project
            </h2>
            <button
              type="button"
              onClick={closeAndReset}
              className="rounded-md p-1 text-muted-faint transition-colors hover:bg-surface-inset hover:text-foreground-secondary"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div className="border-b border-green-border bg-green-surface px-4 py-2.5 text-center text-sm font-medium text-green-text">
              Added to &ldquo;{feedback.projectName}&rdquo;
            </div>
          )}

          {/* Body */}
          {!feedback && (
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {/* Current calculation preview */}
              <div className="mb-3 rounded-lg border border-border-faint bg-surface-raised px-3 py-2">
                <p className="text-xs text-muted">Adding:</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface-inset text-muted">
                    <ProfileIcon category={normalizedCurrent.iconKey} className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">{normalizedCurrent.shortLabel}</span>
                </p>
                <p className="text-xs text-muted">
                  {currentResult.gradeLabel} &middot;
                  {currentResult.totalWeightKg} kg &middot; {currentResult.grandTotalAmount} {CURRENCY_SYMBOLS[currentResult.currency]}
                </p>
              </div>

              {/* Existing projects — click to add */}
              {projects.length > 0 && (
                <div className="mb-3 grid gap-1.5">
                  <span className="text-xs font-medium text-muted">Choose a project</span>
                  {projects.map((project) => {
                    const agg = computeAggregates(project);
                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => handleAdd(project.id, project.name)}
                        className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-purple-300 hover:bg-purple-surface"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
                          <p className="text-xs text-muted-faint">
                            {agg.count} item{agg.count !== 1 ? "s" : ""}
                            {agg.count > 0 && <> &middot; {agg.totalWeightKg} kg</>}
                          </p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-border-strong">
                          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Create new project + add */}
              <div className="grid gap-1.5">
                <span className="text-xs font-medium text-muted">
                  {projects.length > 0 ? "Or create a new project" : "Create a project"}
                </span>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Project name..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateAndAdd();
                    }}
                    className="h-9 flex-1 rounded-lg border border-border-strong bg-surface px-3 text-sm transition-colors focus:border-purple-500 focus:outline-none"
                    maxLength={60}
                  />
                  <button
                    type="button"
                    onClick={handleCreateAndAdd}
                    disabled={!newName.trim()}
                    className="shrink-0 rounded-lg bg-purple-strong px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-purple-strong-hover disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-text"
                  >
                    Create & Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          {!feedback && projects.length > 0 && (
            <div className="border-t border-border-faint px-4 py-2.5">
              <button
                type="button"
                onClick={handleManageProjects}
                className="text-xs font-medium text-muted transition-colors hover:text-foreground-secondary"
              >
                Manage projects...
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
});
