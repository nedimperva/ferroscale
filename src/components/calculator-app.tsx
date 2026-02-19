"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useCalculator } from "@/hooks/useCalculator";
import { useHistory } from "@/hooks/useHistory";
import { useCompare } from "@/hooks/useCompare";
import { useReverseCalculator } from "@/hooks/useReverseCalculator";
import { useProjects } from "@/hooks/useProjects";
import type { Theme } from "@/hooks/useTheme";
import { useTheme } from "@/hooks/useTheme";
import { DATASET_VERSION } from "@/lib/datasets/version";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";

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
import { Sidebar } from "@/components/calculator/sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PwaRegister } from "@/components/pwa-register";
import { toast } from "@/lib/toast";

/* ---- Sidebar collapsed: tiny external store (avoids hydration mismatch) ---- */
let _sidebarListeners: Array<() => void> = [];
function subscribeSidebar(cb: () => void) {
  _sidebarListeners = [..._sidebarListeners, cb];
  return () => { _sidebarListeners = _sidebarListeners.filter((l) => l !== cb); };
}
function getSidebarSnapshot(): boolean {
  try { return localStorage.getItem("ferroscale-sidebar-collapsed") === "true"; } catch { return false; }
}
function getSidebarServerSnapshot(): boolean { return false; }
function _sidebarEmit() { for (const l of _sidebarListeners) l(); }

const SETTINGS_ISSUE_FIELDS = new Set([
  "materialGradeId",
  "customDensityKgPerM3",
  "priceBasis",
  "unitPrice",
  "priceUnit",
  "currency",
  "wastePercent",
  "vatPercent",
]);

function issueFieldToInputId(field: string): string | null {
  if (field.startsWith("manualDimensions.")) {
    return `dimension-${field.slice("manualDimensions.".length)}`;
  }

  switch (field) {
    case "selectedSizeId":
      return "size";
    case "length":
      return "length";
    case "quantity":
      return "quantity";
    case "materialGradeId":
      return "grade";
    case "customDensityKgPerM3":
      return "custom-density";
    case "priceBasis":
      return "price-basis";
    case "unitPrice":
      return "unit-price";
    case "priceUnit":
      return "price-unit";
    case "currency":
      return "currency";
    case "wastePercent":
      return "waste";
    case "vatPercent":
      return "vat-percent";
    default:
      return null;
  }
}

function focusInputById(id: string): boolean {
  const element = document.getElementById(id) as (HTMLElement & { focus: (options?: FocusOptions) => void }) | null;
  if (!element) return false;
  element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  element.focus({ preventScroll: true });
  return true;
}

export function CalculatorApp() {
  const t = useTranslations();
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
    historyLimit,
    setHistoryLimit,
    addToHistory,
    toggleStar,
    removeStarred,
    clearHistory,
  } = useHistory();

  const {
    items: compareItems,
    isOpen: showCompareDrawer,
    canAdd: canCompare,
    open: openCompareDrawer,
    close: closeCompare,
    addItem: addCompareItem,
    removeItem: removeCompareItem,
    clearAll: clearCompare,
    isDuplicate: isInCompare,
    compareLimit,
    setCompareLimit,
    maxCompare,
    isMobileCapped: isCompareMobileCapped,
  } = useCompare();

  const reverse = useReverseCalculator(input, selectedProfile);

  const { theme, setTheme, resolvedTheme } = useTheme();

  const cycleTheme = useCallback(() => {
    const order: Theme[] = ["light", "dark", "system"];
    const currentIdx = order.indexOf(theme);
    const nextIdx = (currentIdx + 1) % order.length;
    setTheme(order[nextIdx]);
  }, [theme, setTheme]);

  const {
    projects,
    isOpen: showProjectDrawer,
    open: openProjectsDrawer,
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
  const [showSaveModal, setShowSaveModal] = useState(false);

  const openCompare = useCallback(() => {
    setShowOverlay(false);
    openCompareDrawer();
  }, [openCompareDrawer]);

  const openProjects = useCallback(() => {
    setShowOverlay(false);
    setShowSaveModal(false);
    openProjectsDrawer();
  }, [openProjectsDrawer]);

  /* Star helpers */
  const currentEntryId = history[0]?.id;
  const isCurrentStarred = currentEntryId
    ? starred.some((s) => s.id === currentEntryId)
    : false;

  const handleStar = useCallback(() => {
    if (!currentEntryId) return;
    toggleStar(currentEntryId);
    if (isCurrentStarred) {
      toast.info(t("toasts.calculationUnstarred"));
    } else {
      toast.success(t("toasts.calculationSaved"));
    }
  }, [currentEntryId, toggleStar, isCurrentStarred, t]);

  /* Compare helpers */
  const currentIsInCompare = result ? isInCompare(result) : false;
  const normalizedCurrentProfile = useMemo(
    () => (result ? normalizeProfileSnapshot(input) : null),
    [result, input],
  );

  const handleCompare = useCallback(() => {
    if (!result) return;
    if (currentIsInCompare) {
      /* Already in compare — open the drawer */
      openCompare();
    } else {
      addCompareItem(input, result);
      toast.info(t("toasts.addedToCompare"));
    }
  }, [result, input, currentIsInCompare, openCompare, addCompareItem, t]);

  const handleAddToProject = useCallback(() => {
    if (result) {
      setShowOverlay(false);
      setShowSaveModal(true);
    }
  }, [result]);

  const handleClearHistory = useCallback(() => {
    clearHistory();
    toast.info(t("toasts.historyCleared"));
  }, [clearHistory, t]);

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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  const lastFocusedIssueFieldRef = useRef<string | null>(null);
  const firstIssueField = issues[0]?.field ?? null;

  useEffect(() => {
    if (!firstIssueField) {
      lastFocusedIssueFieldRef.current = null;
      return;
    }

    if (lastFocusedIssueFieldRef.current === firstIssueField) {
      return;
    }

    const targetId = issueFieldToInputId(firstIssueField);
    if (!targetId) return;

    const tryFocus = () => {
      if (focusInputById(targetId)) {
        lastFocusedIssueFieldRef.current = firstIssueField;
      }
    };

    if (SETTINGS_ISSUE_FIELDS.has(firstIssueField) && !showSettingsDrawer) {
      window.setTimeout(() => setShowSettingsDrawer(true), 0);
      window.setTimeout(tryFocus, 320);
      return;
    }

    window.setTimeout(tryFocus, 0);
  }, [firstIssueField, showSettingsDrawer]);

  useEffect(() => {
    if (!showMobileMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!mobileMenuRef.current?.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowMobileMenu(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showMobileMenu]);

  /* Sidebar collapsed state (persisted to localStorage).
     Uses useSyncExternalStore to avoid hydration mismatch and
     lint warnings about setState-in-effect. */
  const sidebarCollapsed = useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    getSidebarServerSnapshot,
  );

  const toggleSidebarCollapsed = useCallback(() => {
    const next = !getSidebarSnapshot();
    try { localStorage.setItem("ferroscale-sidebar-collapsed", String(next)); } catch { /* noop */ }
    _sidebarEmit();
  }, []);

  const resetAll = useCallback(() => {
    dispatch({ type: "RESET_ALL" });
  }, [dispatch]);

  return (
    <>
      {/* ---- Desktop sidebar (lg+) ---- */}
      <Sidebar
        onOpenContact={() => setShowContactDrawer(true)}
        onOpenCompare={openCompare}
        onOpenProjects={openProjects}
        onOpenSettings={() => setShowSettingsDrawer(true)}
        onOpenHistory={() => setShowHistoryDrawer(true)}
        compareCount={compareItems.length}
        projectCount={projectCount}
        isSettingsOpen={showSettingsDrawer}
        isHistoryOpen={showHistoryDrawer}
        isProjectsOpen={showProjectDrawer}
        isCompareOpen={showCompareDrawer}
        isContactOpen={showContactDrawer}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
        theme={resolvedTheme}
        onToggleTheme={cycleTheme}
      />

      <div className={`mx-auto flex min-h-dvh max-w-7xl flex-col px-4 pt-14 pb-28 transition-[margin-left] duration-200 ease-in-out md:px-6 lg:pt-6 xl:pb-6 ${sidebarCollapsed ? "lg:ml-[56px]" : "lg:ml-[220px]"}`}>
        {/* ---- Fixed header (<lg) ---- */}
        <header className="fixed inset-x-0 top-0 z-[70] flex items-center justify-between gap-2 bg-background px-4 py-2 shadow-sm md:px-6 lg:hidden">
          <div className="min-w-0 shrink">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
              {t("app.mobileHeaderTitle")}
            </h1>
            <p className="hidden text-sm text-foreground-secondary sm:block">
              {t("app.mobileHeaderSubtitle")} {" "}
              <span className="text-xs text-muted-faint">
                {t("app.datasetVersion", { version: DATASET_VERSION })}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 md:hidden">
            {compareItems.length > 0 && (
              <button
                type="button"
                onClick={openCompare}
                className="inline-flex items-center gap-1 rounded-md border border-blue-border bg-blue-surface px-2 py-1.5 text-[11px] font-semibold text-blue-text"
                aria-label={t("sidebar.compare")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>
                {compareItems.length}
              </button>
            )}

            {projectCount > 0 && (
              <button
                type="button"
                onClick={openProjects}
                className="inline-flex items-center gap-1 rounded-md border border-purple-border bg-purple-surface px-2 py-1.5 text-[11px] font-semibold text-purple-text"
                aria-label={t("sidebar.projects")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/></svg>
                {projectCount}
              </button>
            )}

            <div className="relative z-[80]" ref={mobileMenuRef}>
              <button
                type="button"
                onClick={() => setShowMobileMenu((value) => !value)}
                className="inline-flex items-center justify-center rounded-md border border-border-strong p-2 text-foreground-secondary transition-colors hover:bg-surface-inset"
                aria-haspopup="menu"
                aria-expanded={showMobileMenu}
                aria-label={t("app.moreActions")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </button>

              {showMobileMenu && (
                <div className="absolute right-0 top-[calc(100%+0.4rem)] z-[90] w-60 rounded-lg border border-border bg-surface-raised p-2 shadow-lg" role="menu">
                  <div className="mb-2">
                    <LanguageSwitcher className="w-full justify-between" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileMenu(false);
                      setShowSettingsDrawer(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-inset"
                    role="menuitem"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-muted-faint"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                    {t("sidebar.settings")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileMenu(false);
                      setShowHistoryDrawer(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-inset"
                    role="menuitem"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-muted-faint"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
                    {t("sidebar.history")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileMenu(false);
                      openProjects();
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-inset"
                    role="menuitem"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-muted-faint"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/></svg>
                    {projectCount > 0
                      ? t("sidebar.projectsCount", { count: projectCount })
                      : t("sidebar.projects")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (compareItems.length === 0) return;
                      setShowMobileMenu(false);
                      openCompare();
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                      compareItems.length > 0
                        ? "text-foreground-secondary hover:bg-surface-inset"
                        : "cursor-not-allowed text-muted-faint"
                    }`}
                    role="menuitem"
                    disabled={compareItems.length === 0}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-3.5 w-3.5 ${compareItems.length > 0 ? "text-muted-faint" : "text-muted-faint/70"}`}><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>
                    {compareItems.length > 0
                      ? t("sidebar.compareCount", { count: compareItems.length })
                      : t("sidebar.compare")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileMenu(false);
                      setShowContactDrawer(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-inset"
                    role="menuitem"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-muted-faint"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    {t("sidebar.report")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileMenu(false);
                      cycleTheme();
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-inset"
                    role="menuitem"
                  >
                    {resolvedTheme === "light" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-muted-faint"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
                    ) : resolvedTheme === "dark" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-muted-faint"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-muted-faint"><rect width="20" height="14" x="2" y="3" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>
                    )}
                    {resolvedTheme === "light"
                      ? t("theme.dark")
                      : resolvedTheme === "dark"
                        ? t("theme.system")
                        : t("theme.light")}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => setShowContactDrawer(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border-strong p-2 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-inset"
              aria-label={t("sidebar.report")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </button>
            {compareItems.length > 0 && (
              <button
                type="button"
                onClick={openCompare}
                className="inline-flex items-center gap-1.5 rounded-md border border-blue-border bg-blue-surface p-2 text-xs font-medium text-blue-text"
                aria-label={t("sidebar.compare")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>
                <span className="text-[10px] font-bold">{compareItems.length}</span>
              </button>
            )}
            <button
              type="button"
              onClick={openProjects}
              className={`inline-flex items-center gap-1.5 rounded-md border p-2 text-xs font-medium ${
                projectCount > 0
                  ? "border-purple-border bg-purple-surface text-purple-text"
                  : "border-border-strong text-foreground-secondary hover:bg-surface-inset"
              }`}
              aria-label={t("sidebar.projects")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/></svg>
              {projectCount > 0 && <span className="text-[10px] font-bold">{projectCount}</span>}
            </button>
            <button
              type="button"
              onClick={() => setShowSettingsDrawer(true)}
              className="inline-flex items-center rounded-md border border-border-strong p-2 text-foreground-secondary transition-colors hover:bg-surface-inset"
              aria-label={t("sidebar.settings")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button
              type="button"
              onClick={() => setShowHistoryDrawer(true)}
              className="inline-flex items-center rounded-md border border-border-strong p-2 text-foreground-secondary transition-colors hover:bg-surface-inset"
              aria-label={t("sidebar.history")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
            </button>
            <LanguageSwitcher compact />
            <button
              type="button"
              onClick={cycleTheme}
              className="inline-flex items-center rounded-md border border-border-strong p-2 text-foreground-secondary transition-colors hover:bg-surface-inset"
              aria-label={
                resolvedTheme === "light"
                  ? t("theme.switchToDark")
                  : resolvedTheme === "dark"
                    ? t("theme.switchToSystem")
                    : t("theme.switchToLight")
              }
            >
              {resolvedTheme === "light" ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
              ) : resolvedTheme === "dark" ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect width="20" height="14" x="2" y="3" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>
              )}
            </button>
          </div>
        </header>

        {/* ---- Disclaimer (commented out for now) ----
        <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs text-orange-900">
          <strong>Estimate only</strong> — verify against project specs and supplier data.
        </div>
        ---- */}

        {/* ---- PWA banners (offline / update / install) — rendered here so they
             appear in normal flow below the fixed mobile header on small screens ---- */}
        <PwaRegister />

        {/* ---- Main grid ---- */}
        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
          {/* LEFT — inputs */}
          <div className="grid gap-0 self-start rounded-xl border border-border bg-surface">
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
                input={input}
              />
            </div>
          </div>

          {/* RIGHT — results (desktop) */}
          <aside className="hidden gap-4 self-start xl:sticky xl:top-4 xl:grid">
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
              maxCompare={maxCompare}
              onAddToProject={handleAddToProject}
              hasProjects={projectCount > 0}
              normalizedProfile={normalizedCurrentProfile}
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
          maxCompare={maxCompare}
          onAddToProject={handleAddToProject}
          hasProjects={projectCount > 0}
          normalizedProfile={normalizedCurrentProfile}
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
            maxCompare={maxCompare}
            onAddToProject={handleAddToProject}
            hasProjects={projectCount > 0}
            normalizedProfile={normalizedCurrentProfile}
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
          onClearHistory={handleClearHistory}
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
          historyLimit={historyLimit}
          onHistoryLimitChange={setHistoryLimit}
          compareLimit={compareLimit}
          onCompareLimitChange={setCompareLimit}
          maxCompare={maxCompare}
          isCompareMobileCapped={isCompareMobileCapped}
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
          maxCompare={maxCompare}
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
    </>
  );
}
