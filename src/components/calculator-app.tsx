"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCalculator } from "@/hooks/useCalculator";
import { useHistory } from "@/hooks/useHistory";
import { useCompare } from "@/hooks/useCompare";
import { useReverseCalculator } from "@/hooks/useReverseCalculator";
import { useProjects } from "@/hooks/useProjects";
import { DATASET_VERSION } from "@/lib/datasets/version";

import { IssueList } from "@/components/calculator/issue-list";
import { ProfileSection } from "@/components/calculator/profile-section";
import { ResultPanel } from "@/components/calculator/result-panel";
import { ResultBar, ResultOverlay } from "@/components/calculator/result-bar";
import { HistoryDrawer } from "@/components/calculator/history-drawer";
import { SettingsDrawer } from "@/components/calculator/settings-drawer";
import { SettingsSummary } from "@/components/calculator/settings-summary";
import { ContactDrawer } from "@/components/calculator/contact-drawer";
import { CompareDrawer } from "@/components/compare/compare-drawer";
import { ReversePanel } from "@/components/calculator/reverse-panel";
import { ProjectDrawer } from "@/components/projects/project-drawer";
import { SaveToProjectModal } from "@/components/projects/save-to-project-modal";

export function CalculatorApp() {
  const {
    input,
    dispatch,
    result,
    issues,
    isPending,
    selectedProfile,
    activeFamily,
  } = useCalculator();

  const {
    history,
    starred,
    addToHistory,
    toggleStar,
    removeStarred,
    clearHistory,
  } = useHistory();

  const {
    items: compareItems,
    isOpen: showCompareDrawer,
    canAdd: canCompare,
    open: openCompare,
    close: closeCompare,
    addItem: addCompareItem,
    removeItem: removeCompareItem,
    clearAll: clearCompare,
    isDuplicate: isInCompare,
  } = useCompare();

  const reverse = useReverseCalculator(input, selectedProfile);

  const {
    projects,
    isOpen: showProjectDrawer,
    open: openProjects,
    close: closeProjects,
    activeProjectId,
    setActiveProjectId,
    createProject,
    renameProject,
    deleteProject,
    addCalculation,
    removeCalculation,
    projectCount,
  } = useProjects();

  /* Auto-save valid results to history */
  const prevResultRef = useRef(result);
  useEffect(() => {
    if (result && result !== prevResultRef.current) {
      addToHistory(input, result);
    }
    prevResultRef.current = result;
  }, [result, input, addToHistory]);

  /* Mobile overlay state */
  const [showOverlay, setShowOverlay] = useState(false);

  /* Star helpers */
  const currentEntryId = history[0]?.id;
  const isCurrentStarred = currentEntryId
    ? starred.some((s) => s.id === currentEntryId)
    : false;

  const handleStar = useCallback(() => {
    if (currentEntryId) toggleStar(currentEntryId);
  }, [currentEntryId, toggleStar]);

  /* Compare helpers */
  const currentIsInCompare = result ? isInCompare(result) : false;

  const handleCompare = useCallback(() => {
    if (!result) return;
    if (currentIsInCompare) {
      /* Already in compare — open the drawer */
      openCompare();
    } else {
      addCompareItem(input, result);
    }
  }, [result, input, currentIsInCompare, openCompare, addCompareItem]);

  /* Project helpers */
  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleAddToProject = useCallback(() => {
    if (result) {
      setShowSaveModal(true);
    }
  }, [result]);

  const handleLoad = useCallback(
    (loadedInput: typeof input) => {
      dispatch({ type: "LOAD_ENTRY", input: loadedInput });
    },
    [dispatch],
  );

  /* History drawer */
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  /* Settings drawer */
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  /* Contact drawer */
  const [showContactDrawer, setShowContactDrawer] = useState(false);

  const resetAll = useCallback(() => {
    dispatch({ type: "RESET_ALL" });
  }, [dispatch]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl flex-col px-4 pt-14 pb-28 md:px-6 md:pt-4 lg:pb-6">
      {/* ---- Header ---- */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-2 bg-background px-4 py-2 shadow-sm md:static md:z-auto md:mb-4 md:bg-transparent md:px-0 md:py-0 md:shadow-none">
        <div className="min-w-0 shrink">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
            Metal Calculator
          </h1>
          <p className="hidden text-sm text-slate-600 sm:block">
            Live weight &amp; price estimation for EN standard profiles.{" "}
            <span className="text-xs text-slate-400">
              v{DATASET_VERSION}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setShowContactDrawer(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 p-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 sm:px-3 sm:py-1.5"
            aria-label="Report"
          >
            {/* envelope icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 sm:h-3.5 sm:w-3.5"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            <span className="hidden sm:inline">Report</span>
          </button>
          {/* Compare drawer toggle */}
          {compareItems.length > 0 && (
            <button
              type="button"
              onClick={openCompare}
              className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 p-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 sm:px-3 sm:py-1.5"
              aria-label="Compare"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 sm:h-3.5 sm:w-3.5"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>
              <span className="hidden sm:inline">Compare ({compareItems.length})</span>
              <span className="sm:hidden text-[10px] font-bold">{compareItems.length}</span>
            </button>
          )}
          {/* Projects drawer toggle */}
          <button
            type="button"
            onClick={openProjects}
            className={`inline-flex items-center gap-1.5 rounded-md border p-2 text-xs font-medium transition-colors sm:px-3 sm:py-1.5 ${
              projectCount > 0
                ? "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                : "border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
            aria-label="Projects"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 sm:h-3.5 sm:w-3.5"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/></svg>
            <span className="hidden sm:inline">
              {projectCount > 0 ? `Projects (${projectCount})` : "Projects"}
            </span>
            {projectCount > 0 && (
              <span className="sm:hidden text-[10px] font-bold">{projectCount}</span>
            )}
          </button>
          {/* Settings drawer toggle */}
          <button
            type="button"
            onClick={() => setShowSettingsDrawer(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 p-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 sm:px-3 sm:py-1.5"
            aria-label="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 sm:h-3.5 sm:w-3.5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            <span className="hidden sm:inline">Settings</span>
          </button>
          {/* History drawer toggle */}
          <button
            type="button"
            onClick={() => setShowHistoryDrawer(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 p-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 sm:px-3 sm:py-1.5"
            aria-label="History"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 sm:h-3.5 sm:w-3.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
            <span className="hidden sm:inline">History</span>
          </button>
        </div>
      </header>

      {/* ---- Disclaimer ---- */}
      <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs text-orange-900">
        <strong>Estimate only</strong> — verify against project specs and supplier data.
      </div>

      {/* ---- Main grid ---- */}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* LEFT — inputs */}
        <div className="grid gap-0 self-start rounded-xl border border-slate-200 bg-white">
          <div className="p-4 pb-0">
            <IssueList issues={issues} />
          </div>

          <div className="hidden px-4 pt-3 pb-2 sm:block">
            <SettingsSummary
              input={input}
              onOpen={() => setShowSettingsDrawer(true)}
            />
          </div>

          <div className="p-4">
            <ProfileSection
              input={input}
              dispatch={dispatch}
              selectedProfile={selectedProfile}
              issues={issues}
            />
          </div>

          <div className="px-4 pb-4">
            <ReversePanel
              reverse={reverse}
              isManualProfile={selectedProfile.mode === "manual"}
            />
          </div>
        </div>

        {/* RIGHT — results (desktop) */}
        <aside className="hidden gap-4 self-start lg:sticky lg:top-4 lg:grid">
          <ResultPanel
            result={result}
            isPending={isPending}
            onStar={handleStar}
            isStarred={isCurrentStarred}
            includeVat={input.includeVat}
            wastePercent={input.wastePercent}
            vatPercent={input.vatPercent}
            onCompare={handleCompare}
            canCompare={canCompare}
            isInCompare={currentIsInCompare}
            compareCount={compareItems.length}
            onAddToProject={handleAddToProject}
            hasProjects={projectCount > 0}
          />
        </aside>
      </div>

      {/* ---- Mobile sticky result bar ---- */}
      <ResultBar
        result={result}
        isPending={isPending}
        onStar={handleStar}
        isStarred={isCurrentStarred}
        onExpand={() => setShowOverlay(true)}
        onCompare={handleCompare}
        canCompare={canCompare}
        isInCompare={currentIsInCompare}
        onAddToProject={handleAddToProject}
        hasProjects={projectCount > 0}
      />

      {/* ---- Mobile full-screen result overlay ---- */}
      {showOverlay && result && (
        <ResultOverlay
          result={result}
          includeVat={input.includeVat}
          wastePercent={input.wastePercent}
          vatPercent={input.vatPercent}
          isStarred={isCurrentStarred}
          onStar={handleStar}
          onClose={() => setShowOverlay(false)}
          onCompare={handleCompare}
          canCompare={canCompare}
          isInCompare={currentIsInCompare}
          compareCount={compareItems.length}
          onAddToProject={handleAddToProject}
          hasProjects={projectCount > 0}
        />
      )}

      {/* ---- History drawer (all breakpoints) ---- */}
      <HistoryDrawer
        open={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        history={history}
        starred={starred}
        onLoad={handleLoad}
        onToggleStar={toggleStar}
        onRemoveStarred={removeStarred}
        onClearHistory={clearHistory}
      />

      {/* ---- Settings drawer ---- */}
      <SettingsDrawer
        open={showSettingsDrawer}
        onClose={() => setShowSettingsDrawer(false)}
        input={input}
        dispatch={dispatch}
        activeFamily={activeFamily}
        issues={issues}
        onResetAll={resetAll}
      />

      {/* ---- Contact drawer ---- */}
      <ContactDrawer
        open={showContactDrawer}
        onClose={() => setShowContactDrawer(false)}
      />

      {/* ---- Compare drawer ---- */}
      <CompareDrawer
        open={showCompareDrawer}
        onClose={closeCompare}
        items={compareItems}
        onRemoveItem={removeCompareItem}
        onClearAll={clearCompare}
      />

      {/* ---- Project drawer ---- */}
      <ProjectDrawer
        open={showProjectDrawer}
        onClose={closeProjects}
        projects={projects}
        activeProjectId={activeProjectId}
        onSetActiveProject={setActiveProjectId}
        onCreateProject={createProject}
        onRenameProject={renameProject}
        onDeleteProject={deleteProject}
        onRemoveCalculation={removeCalculation}
        onLoadCalculation={handleLoad}
        currentResult={result}
        currentInput={result ? input : null}
        onAddCalculation={addCalculation}
      />

      {/* ---- Save-to-project quick-add modal ---- */}
      {result && (
        <SaveToProjectModal
          open={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          projects={projects}
          onCreateProject={createProject}
          onAddCalculation={addCalculation}
          currentInput={input}
          currentResult={result}
          onOpenDrawer={openProjects}
        />
      )}
    </div>
  );
}
