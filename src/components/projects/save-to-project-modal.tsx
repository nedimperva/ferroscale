"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
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
  const tBase = useTranslations();
  const t = useTranslations("saveToProject");
  const tProjects = useTranslations("projects");
  const normalizedCurrent = normalizeProfileSnapshot(currentInput);
  const [newName, setNewName] = useState("");
  const [feedback, setFeedback] = useState<{ projectName: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const gradeLabel =
    currentResult.gradeLabel === "Custom density input"
      ? tBase("dataset.customDensityInput")
      : currentResult.gradeLabel === "Unknown"
        ? tBase("dataset.unknown")
        : currentResult.gradeLabel;

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
      <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" onClick={closeAndReset}>
        <div
          className="flex h-[min(86dvh,780px)] w-full flex-col rounded-t-2xl border border-border bg-surface shadow-xl sm:h-auto sm:max-w-sm sm:rounded-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pt-2 sm:hidden">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>
              </svg>
              {t("title")}
            </h2>
            <button
              type="button"
              onClick={closeAndReset}
              className="rounded-md p-1 text-muted-faint transition-colors hover:bg-surface-inset hover:text-foreground-secondary"
              aria-label={t("close")}
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
              {t("added", { projectName: feedback.projectName })}
            </div>
          )}

          {/* Body */}
          {!feedback && (
            <div className="flex-1 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:max-h-[60vh] sm:flex-none sm:pb-4">
              {/* Current calculation preview */}
              <div className="mb-3 rounded-lg border border-border-faint bg-surface-raised px-3 py-2">
                <p className="text-xs text-muted">{t("adding")}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface-inset text-muted">
                    <ProfileIcon category={normalizedCurrent.iconKey} className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">{normalizedCurrent.shortLabel}</span>
                </p>
                <p className="text-xs text-muted">
                  {gradeLabel} &middot;
                  {currentResult.totalWeightKg} kg &middot; {currentResult.grandTotalAmount} {CURRENCY_SYMBOLS[currentResult.currency]}
                </p>
              </div>

              {/* Existing projects — click to add */}
              {projects.length > 0 && (
                <div className="mb-3 grid gap-1.5">
                  <span className="text-xs font-medium text-muted">{t("chooseProject")}</span>
                  {projects.map((project) => {
                    const agg = computeAggregates(project);
                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => handleAdd(project.id, project.name)}
                        className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-3 text-left transition-colors hover:border-purple-300 hover:bg-purple-surface"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
                          <p className="text-xs text-muted-faint">
                            {tProjects("itemsCount", { count: agg.count })}
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
                  {projects.length > 0 ? t("orCreate") : t("createProject")}
                </span>
                <div className="grid grid-cols-1 gap-2 sm:flex">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={t("placeholder")}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateAndAdd();
                    }}
                    className="h-10 flex-1 rounded-lg border border-border-strong bg-surface px-3 text-sm transition-colors focus:border-purple-500 focus:outline-none sm:h-9"
                    maxLength={60}
                  />
                  <button
                    type="button"
                    onClick={handleCreateAndAdd}
                    disabled={!newName.trim()}
                    className="w-full shrink-0 rounded-lg bg-purple-strong px-3 py-2.5 text-xs font-medium text-white transition-colors hover:bg-purple-strong-hover disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-text sm:w-auto sm:py-2"
                  >
                    {t("createAndAdd")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          {!feedback && projects.length > 0 && (
            <div className="border-t border-border-faint px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:py-2.5 sm:pb-2.5">
              <button
                type="button"
                onClick={handleManageProjects}
                className="text-xs font-medium text-muted transition-colors hover:text-foreground-secondary"
              >
                {t("manageProjects")}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
});
