"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCalculator } from "@/hooks/useCalculator";
import { useSaved } from "@/hooks/useSaved";
import { useCompare } from "@/hooks/useCompare";
import { useReverseCalculator } from "@/hooks/useReverseCalculator";
import { useProjects } from "@/hooks/useProjects";
import type { Theme } from "@/hooks/useTheme";
import { useTheme } from "@/hooks/useTheme";
import { useTextSize } from "@/hooks/useTextSize";
import { useQuickCalculator } from "@/hooks/useQuickCalculator";
import { usePresets } from "@/hooks/usePresets";
import { useSync } from "@/hooks/useSync";
import { useKeyboardShortcuts, APP_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useElementWidth } from "@/hooks/useElementWidth";
import type { CalculationInput, CalculationResult, LengthUnit } from "@/lib/calculator/types";
import { usePathname } from "@/i18n/navigation";
import { resolveGradeLabel } from "@/lib/calculator/grade-label";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";
import { getProfileById } from "@/lib/datasets/profiles";
import { APP_TABS, getAppTabHref, type AppTabId } from "@/lib/app-shell";
import { createBoolStore, createStringStore, createSidebarStore } from "@/lib/external-stores";
import { useColumnLayout } from "@/hooks/useColumnLayout";
import type { ColumnPanelId } from "@/lib/column-layout";
import { getMaxColumnsForWidth } from "@/lib/column-layout";
import { ProfileSection } from "@/components/calculator/profile-section";
import { MobileNumpadCalculator } from "@/components/calculator/mobile-numpad-calculator";
import { MobileProfileSheet } from "@/components/calculator/mobile-profile-sheet";
import { MobileMaterialSheet } from "@/components/calculator/mobile-material-sheet";
import { MobileResultSheet } from "@/components/calculator/mobile-result-sheet";
import { OnboardingFlow } from "@/components/calculator/onboarding-flow";
import { DesktopWorkstationPane } from "@/components/calculator/desktop-workstation-pane";
import { MobileMenuSheet } from "@/components/calculator/mobile-menu-sheet";
import { MobileSettingsContent } from "@/components/calculator/mobile-settings-content";
import { MobileProjectsPage } from "@/components/projects/mobile-projects-page";
import { DesktopProjectsPage } from "@/components/projects/desktop-projects-page";
import { MobileProjectDetailPage } from "@/components/projects/mobile-project-detail-page";
import { DesktopProjectDetailPage } from "@/components/projects/desktop-project-detail-page";
import { MobileSavedPage } from "@/components/saved/mobile-saved-page";
import { DesktopSavedPage } from "@/components/saved/desktop-saved-page";
import { MobileComparePage } from "@/components/compare/mobile-compare-page";
import { DesktopComparePage } from "@/components/compare/desktop-compare-page";
import { DesktopSettingsPage } from "@/components/calculator/desktop-settings-page";
import { ResultPanel } from "@/components/calculator/result-panel";
import { ResultOverlay } from "@/components/calculator/result-bar";
import { SettingsWorkspaceContent } from "@/components/calculator/settings-drawer";
import { ContactDrawer } from "@/components/calculator/contact-drawer";
import { CompareDrawer, CompareWorkspaceContent } from "@/components/compare/compare-drawer";
import { ReversePanel } from "@/components/calculator/reverse-panel";
import { ProfileSpecsPanel } from "@/components/calculator/profile-specs-panel";
import { ProjectsWorkspaceContent } from "@/components/projects/project-drawer";
import { SaveToProjectModal } from "@/components/projects/save-to-project-modal";
import { Sidebar } from "@/components/calculator/sidebar";
import { PwaRegister } from "@/components/pwa-register";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { QuickCalcPalette } from "@/components/quick-calc/quick-calc-palette";
import { ShortcutsModal } from "@/components/ui/shortcuts-modal";
import { SavePresetModal } from "@/components/calculator/save-preset-modal";
import { ChangelogDrawer } from "@/components/calculator/changelog-drawer";
import { MultiColumnLayout } from "@/components/columns/multi-column-layout";

const sidebarStore = createSidebarStore();
const inlineMaterialStore = createBoolStore("ferroscale-inline-material", true);
const inlinePriceStore = createBoolStore("ferroscale-inline-price", true);
const settingsPreviewStore = createBoolStore("ferroscale-settings-preview", true);
const weightAsMainStore = createBoolStore("ferroscale-weight-as-main", false);
const onboardedStore = createBoolStore("ferroscale-onboarded", false);
export { onboardedStore as ferroscaleOnboardedStore };

const UNIT_OPTIONS: LengthUnit[] = ["mm", "cm", "m", "in", "ft"];
const defaultUnitStore = createStringStore<LengthUnit>("ferroscale-default-unit", "mm");

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



export function FerroScaleAppShell({ currentTab }: { currentTab: AppTabId }) {
  const t = useTranslations();
  const router = useRouter();
  const isMobile = useIsMobile();
  const shouldReduceMotion = useReducedMotion();
  const [isRouteNavigationPending, startRouteNavigation] = useTransition();

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
    saved,
    saveCalculation,
    removeSaved,
    duplicateSaved,
    updateSaved,
    markSavedUsed,
    isSaved: isSavedEntry,
  } = useSaved();

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
  const { textSize, setTextSize } = useTextSize();
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    createProject,
    renameProject,
    deleteProject,
    addCalculation,
    removeCalculation,
    duplicateProject,
    updateCalculationNote,
    updateProjectDescription,
    updateProjectPaintingSettings,
    projectCount,
  } = useProjects();
  const quickCalc = useQuickCalculator();
  const closeQuickCalc = quickCalc.close;
  const openQuickCalc = quickCalc.open;
  const toggleQuickCalc = quickCalc.toggle;
  const { presets, presetsForProfile, addPreset, removePreset } = usePresets();
  const sync = useSync();
  const columnLayout = useColumnLayout();
  const [mainContentRef, mainContentWidth] = useElementWidth<HTMLDivElement>();
  const maxColumnsAllowed = getMaxColumnsForWidth(mainContentWidth);
  // Columns feature hidden during the v3 redesign. Users who had
  // `enabled: true` in localStorage silently fall back to the single-
  // pane layout; state stays in storage so toggling the feature back
  // on later restores their column setup.
  const isMultiColumn = false;

  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [presetDefaultLabel, setPresetDefaultLabel] = useState("");
  const [presetProfileName, setPresetProfileName] = useState("");
  const [showOverlay, setShowOverlay] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [externalSource, setExternalSource] = useState<{ input: CalculationInput; result: CalculationResult } | null>(null);
  const [showContactDrawer, setShowContactDrawer] = useState(false);
  const [showChangelogDrawer, setShowChangelogDrawer] = useState(false);
  const [showMobileProfileSheet, setShowMobileProfileSheet] = useState(false);
  const [showMobileMaterialSheet, setShowMobileMaterialSheet] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const pathname = usePathname();
  const onboarded = useSyncExternalStore(
    onboardedStore.subscribe,
    onboardedStore.getSnapshot,
    onboardedStore.getServerSnapshot,
  );

  const cycleTheme = useCallback(() => {
    const order: Theme[] = ["light", "dark", "system"];
    const currentIdx = order.indexOf(theme);
    const nextIdx = (currentIdx + 1) % order.length;
    setTheme(order[nextIdx]);
  }, [theme, setTheme]);

  const closeTransientOverlays = useCallback(() => {
    setShowOverlay(false);
    setShowSaveModal(false);
    setShowShortcutsModal(false);
    setPresetModalOpen(false);
    setShowContactDrawer(false);
    setShowChangelogDrawer(false);
    setShowMobileProfileSheet(false);
    setShowMobileMaterialSheet(false);
    setShowMobileMenu(false);
    closeQuickCalc();
    closeCompare();
  }, [closeCompare, closeQuickCalc]);

  const navigateToTab = useCallback(
    (tab: AppTabId) => {
      if (tab === currentTab) {
        if (tab === "calculator") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }
      closeTransientOverlays();
      startRouteNavigation(() => {
        router.push(getAppTabHref(tab));
      });
    },
    [closeTransientOverlays, currentTab, router],
  );

  const navigateHome = useCallback(() => {
    if (currentTab === "calculator") {
      closeTransientOverlays();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    closeTransientOverlays();
    startRouteNavigation(() => {
      router.push("/");
    });
  }, [closeTransientOverlays, currentTab, router]);

  useEffect(() => {
    APP_TABS.forEach(({ id, href }) => {
      if (id !== currentTab) {
        router.prefetch(href);
      }
    });
  }, [currentTab, router]);

  const previousRouteTabRef = useRef(currentTab);
  useEffect(() => {
    if (previousRouteTabRef.current === currentTab) {
      return;
    }

    previousRouteTabRef.current = currentTab;
    const timeoutId = window.setTimeout(() => {
      closeTransientOverlays();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [currentTab, closeTransientOverlays]);

  const openCompare = useCallback(() => {
    setShowOverlay(false);
    openCompareDrawer();
  }, [openCompareDrawer]);

  const normalizedCurrentProfile = useMemo(
    () => (result ? normalizeProfileSnapshot(input) : null),
    [input, result],
  );
  const isCurrentSaved = result ? isSavedEntry(result) : false;

  // Save flow simplified for v3: tap "Save" on the calculator / result sheet
  // directly persists the current calc with an auto-generated name. The
  // button itself flips to a "saved" state (handled by callers via the
  // isCurrentSaved boolean) — no toast, no modal.
  const handleSaveCurrent = useCallback(() => {
    if (!result) return;
    if (isSavedEntry(result)) return;
    const profile = normalizeProfileSnapshot(input);
    const profileLabel = profile?.shortLabel ?? result.profileLabel;
    const grade = resolveGradeLabel(result.gradeLabel, t);
    const autoName = grade ? `${profileLabel} - ${grade}` : profileLabel;
    saveCalculation(input, result, autoName);
  }, [input, isSavedEntry, result, saveCalculation, t]);

  const currentIsInCompare = result ? isInCompare(result) : false;

  const handleCompare = useCallback(() => {
    if (!result) return;
    if (currentIsInCompare) {
      openCompare();
      return;
    }
    addCompareItem(input, result);
  }, [addCompareItem, currentIsInCompare, input, openCompare, result]);

  const handleAddToProject = useCallback(() => {
    if (!result) return;
    setExternalSource(null);
    setShowOverlay(false);
    setShowSaveModal(true);
  }, [result]);

  const handleAddExternalToProject = useCallback(
    (source: { input: CalculationInput; result: CalculationResult }) => {
      setExternalSource(source);
      setShowOverlay(false);
      setShowSaveModal(true);
    },
    [],
  );

  const handleLoad = useCallback(
    (loadedInput: typeof input) => {
      dispatch({ type: "LOAD_ENTRY", input: loadedInput });
      navigateHome();
    },
    [dispatch, navigateHome],
  );

  const handleQuickCalcLoad = useCallback(
    (loadedInput: typeof input) => {
      dispatch({
        type: "LOAD_ENTRY",
        input: {
          ...loadedInput,
          priceBasis: input.priceBasis,
          priceUnit: input.priceUnit,
          unitPrice: input.unitPrice,
          currency: input.currency,
          wastePercent: input.wastePercent,
          includeVat: input.includeVat,
          vatPercent: input.vatPercent,
          rounding: input.rounding,
        },
      });
      navigateHome();
    },
    [
      dispatch,
      input.currency,
      input.includeVat,
      input.priceBasis,
      input.priceUnit,
      input.rounding,
      input.unitPrice,
      input.vatPercent,
      input.wastePercent,
      navigateHome,
    ],
  );

  const shortcutHandlers = useMemo(
    () => ({
      quickCalc: () => toggleQuickCalc(),
      history: () => navigateToTab("saved"),
      settings: () => navigateToTab("settings"),
      projects: () => navigateToTab("projects"),
      resetForm: () => dispatch({ type: "RESET" }),
      showShortcuts: () => setShowShortcutsModal((prev) => !prev),
      undo: () => dispatch({ type: "UNDO" }),
      redo: () => dispatch({ type: "REDO" }),
      // Columns feature is hidden during v3; shortcut is a no-op.
      toggleColumns: () => {},
    }),
    [dispatch, navigateToTab, toggleQuickCalc],
  );
  useKeyboardShortcuts(APP_SHORTCUTS, shortcutHandlers);

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

    if (SETTINGS_ISSUE_FIELDS.has(firstIssueField) && currentTab !== "settings") {
      window.setTimeout(() => navigateToTab("settings"), 0);
      window.setTimeout(tryFocus, isMobile ? 80 : 320);
      return;
    }

    window.setTimeout(tryFocus, 0);
  }, [currentTab, firstIssueField, isMobile, navigateToTab]);

  const showInlineMaterial = useSyncExternalStore(
    inlineMaterialStore.subscribe,
    inlineMaterialStore.getSnapshot,
    inlineMaterialStore.getServerSnapshot,
  );
  const showInlinePrice = useSyncExternalStore(
    inlinePriceStore.subscribe,
    inlinePriceStore.getSnapshot,
    inlinePriceStore.getServerSnapshot,
  );
  const showSettingsPreview = useSyncExternalStore(
    settingsPreviewStore.subscribe,
    settingsPreviewStore.getSnapshot,
    settingsPreviewStore.getServerSnapshot,
  );
  const weightAsMain = useSyncExternalStore(
    weightAsMainStore.subscribe,
    weightAsMainStore.getSnapshot,
    weightAsMainStore.getServerSnapshot,
  );
  const sidebarCollapsed = useSyncExternalStore(
    sidebarStore.subscribe,
    sidebarStore.getSnapshot,
    sidebarStore.getServerSnapshot,
  );
  const toggleSidebarCollapsed = useCallback(() => {
    sidebarStore.toggle();
  }, []);
  const defaultUnit = useSyncExternalStore(
    defaultUnitStore.subscribe,
    defaultUnitStore.getSnapshot,
    defaultUnitStore.getServerSnapshot,
  );

  useEffect(() => {
    defaultUnitStore.set(input.length.unit);
  }, [input.length.unit]);

  const handleDefaultUnitChange = useCallback(
    (unit: LengthUnit) => {
      defaultUnitStore.set(unit);
      dispatch({ type: "SET_LENGTH_UNIT", unit });
    },
    [dispatch],
  );

  const handleSavePreset = useCallback(() => {
    const profile = getProfileById(input.profileId);
    if (!profile) return;

    const isPlateSheet = profile.category === "plates_sheets";
    const dims: Record<string, number> = {};
    if (profile.mode === "manual") {
      for (const dim of profile.dimensions) {
        const value = input.manualDimensions[dim.key]?.value;
        if (value != null) dims[dim.key] = value;
      }
    }

    const dimParts = Object.values(dims).filter(Boolean);
    const autoLabel = isPlateSheet
      ? [...dimParts, input.length.value].join("x")
      : dimParts.join("x");

    setPresetDefaultLabel(autoLabel);
    setPresetProfileName(t(`dataset.profiles.${input.profileId}`));
    setPresetModalOpen(true);
  }, [input, t]);

  const handleConfirmSavePreset = useCallback(
    (label: string) => {
      const profile = getProfileById(input.profileId);
      if (!profile) return;

      const isPlateSheet = profile.category === "plates_sheets";
      const dims: Record<string, number> = {};
      if (profile.mode === "manual") {
        for (const dim of profile.dimensions) {
          const value = input.manualDimensions[dim.key]?.value;
          if (value != null) dims[dim.key] = value;
        }
      }

      addPreset({
        profileId: input.profileId,
        label,
        manualDimensionsMm: dims,
        selectedSizeId: input.selectedSizeId,
        lengthValue: isPlateSheet ? input.length.value : undefined,
      });
      setPresetModalOpen(false);
    },
    [addPreset, input],
  );

  const resetAll = useCallback(() => {
    dispatch({ type: "RESET_ALL" });
  }, [dispatch]);

  const headerContext = useMemo(() => {
    const profileShort = normalizedCurrentProfile?.shortLabel ?? t(`dataset.profileShort.${input.profileId}`);
    if (result) {
      const gradeLabel = resolveGradeLabel(result.gradeLabel, t);
      return `${profileShort} - ${gradeLabel}`;
    }
    return profileShort;
  }, [input.profileId, normalizedCurrentProfile, result, t]);

  const activeProject = useMemo(
    () => (activeProjectId ? projects.find((project) => project.id === activeProjectId) ?? null : null),
    [activeProjectId, projects],
  );

  const mobileHeaderTitle = useMemo(() => {
    if (currentTab === "calculator") return t("app.mobileHeaderTitle");
    if (currentTab === "projects" && activeProject) return activeProject.name;
    return t(`tabs.${currentTab}`);
  }, [activeProject, currentTab, t]);

  const mobileHeaderSubtitle = normalizedCurrentProfile ? headerContext : t("app.mobileHeaderSubtitle");
  // No bottom tab bar and no floating result bar on mobile anymore —
  // the calc tab owns its own result card, other tabs are scroll-only.
  const resultBarBottomPadding = "calc(24px + env(safe-area-inset-bottom, 0px))";

  // Edge-swipe tab navigation removed alongside the bottom tab bar — the
  // hamburger menu is the single mobile nav entry point now.

  // D1 Workstation: sidebar (rendered above) + form column + sticky result
  // panel column.
  const desktopMain = (
    <div className="hidden h-[calc(100dvh-env(safe-area-inset-top,0px))] min-h-0 lg:flex">
      <DesktopWorkstationPane
        input={input}
        dispatch={dispatch}
        result={result}
        isPending={isPending}
        isSaved={isCurrentSaved}
        issues={issues}
        selectedProfile={selectedProfile}
        activeFamily={activeFamily}
        normalizedProfile={normalizedCurrentProfile}
        onOpenSaveDialog={handleSaveCurrent}
        onAddToProject={handleAddToProject}
        onOpenQuickCalc={openQuickCalc}
        onReset={resetAll}
        includeVat={input.includeVat}
        wastePercent={input.wastePercent}
        vatPercent={input.vatPercent}
        onCompare={handleCompare}
        canCompare={canCompare}
        isInCompare={currentIsInCompare}
        compareCount={compareItems.length}
        maxCompare={maxCompare}
        hasProjects={projectCount > 0}
        weightAsMain={weightAsMain}
      />
    </div>
  );

  const columnContentMap = useMemo((): Record<ColumnPanelId, React.ReactNode> => ({
    calculator: (
      <div className="flex flex-col">
        <div className="px-2.5 py-3 md:p-4">
          <ProfileSection
            input={input}
            dispatch={dispatch}
            selectedProfile={selectedProfile}
            issues={issues}
            activeFamily={activeFamily}
            showInlineMaterial={showInlineMaterial}
            showInlinePrice={showInlinePrice}
            defaultUnit={defaultUnit}
            onSavePreset={handleSavePreset}
            profilePresets={presetsForProfile(input.profileId)}
            onRemovePreset={removePreset}
          />
        </div>
        <div className="pb-4 md:px-4 md:pb-4">
          <ReversePanel
            reverse={reverse}
            isManualProfile={selectedProfile.mode === "manual"}
            input={input}
          />
        </div>
      </div>
    ),
    result: (
      <ResultPanel
        result={result}
        isPending={isPending}
        isSaved={isCurrentSaved}
        onOpenSaveDialog={handleSaveCurrent}
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
        weightAsMain={weightAsMain}
        layout="column"
      />
    ),
    specs: (
      <ProfileSpecsPanel
        input={input}
        onSelectStandardSize={(sizeId) => dispatch({ type: "SET_SIZE", sizeId })}
        onSelectStandardProfileSize={(profileId, sizeId) => dispatch({ type: "SET_PROFILE_AND_SIZE", profileId, sizeId })}
        onSelectManualProfileDimensions={(profileId, dimensions) => dispatch({ type: "SET_PROFILE_AND_DIMENSIONS", profileId, dimensions })}
      />
    ),
    saved: (
      <div className="p-4">
        <MobileSavedPage
          saved={saved}
          onLoad={handleLoad}
          onMarkUsed={markSavedUsed}
          onRemove={removeSaved}
          onDuplicate={duplicateSaved}
          onOpenCalculator={() => navigateToTab("calculator")}
        />
      </div>
    ),
    projects: (
      <div className="flex min-h-[400px] flex-col">
        <ProjectsWorkspaceContent
          projects={projects}
          activeProjectId={activeProjectId}
          onSetActiveProject={setActiveProjectId}
          onCreateProject={createProject}
          onRenameProject={renameProject}
          onDeleteProject={deleteProject}
          onDuplicateProject={duplicateProject}
          onRemoveCalculation={removeCalculation}
          onUpdateCalculationNote={updateCalculationNote}
          onUpdateProjectDescription={updateProjectDescription}
          onUpdateProjectPaintingSettings={updateProjectPaintingSettings}
          onLoadCalculation={handleLoad}
          currentResult={result}
          currentInput={result ? input : null}
          onAddCalculation={addCalculation}
          layout="column"
          weightAsMain={weightAsMain}
        />
      </div>
    ),
    settings: (
      <div className="flex min-h-[400px] flex-1 flex-col">
        <SettingsWorkspaceContent
          input={input}
          dispatch={dispatch}
          activeFamily={activeFamily}
          issues={issues}
          onResetAll={resetAll}
          onOpenChangelog={() => setShowChangelogDrawer(true)}
          compareLimit={compareLimit}
          onCompareLimitChange={setCompareLimit}
          maxCompare={maxCompare}
          isCompareMobileCapped={isCompareMobileCapped}
          showInlineMaterial={showInlineMaterial}
          onToggleInlineMaterial={inlineMaterialStore.toggle}
          showInlinePrice={showInlinePrice}
          onToggleInlinePrice={inlinePriceStore.toggle}
          showSettingsPreview={showSettingsPreview}
          onToggleSettingsPreview={settingsPreviewStore.toggle}
          weightAsMain={weightAsMain}
          onToggleWeightAsMain={weightAsMainStore.toggle}
          defaultUnit={defaultUnit}
          onDefaultUnitChange={handleDefaultUnitChange}
          unitOptions={UNIT_OPTIONS}
          textSize={textSize}
          onTextSizeChange={setTextSize}
          syncStatus={sync.status}
          onConnectSync={sync.connectProvider}
          onReconnectSync={sync.reconnectProvider}
          onChangeSyncPassphrase={sync.changePassphrase}
          onSyncNow={() => sync.syncNow()}
          onDisconnectSync={sync.disconnectProvider}
          onResetRemoteSync={sync.resetRemoteCopy}
          onExportSync={sync.exportSnapshot}
          onImportSync={sync.importSnapshot}
        />
      </div>
    ),
    compare: (
      <CompareWorkspaceContent
        items={compareItems}
        onRemoveItem={removeCompareItem}
        onClearAll={clearCompare}
        maxCompare={maxCompare}
        onAddToProject={handleAddExternalToProject}
        hasProjects={projectCount > 0}
      />
    ),
  }), [
    issues, showSettingsPreview, input, dispatch, selectedProfile, activeFamily,
    showInlineMaterial, showInlinePrice, defaultUnit, presetsForProfile, removePreset,
    reverse, result, isPending, isCurrentSaved, handleSaveCurrent,
    handleCompare, canCompare, currentIsInCompare, compareItems, maxCompare,
    handleAddToProject, handleAddExternalToProject,
    projectCount, normalizedCurrentProfile, weightAsMain,
    removeCompareItem, clearCompare,
    saved, handleLoad, markSavedUsed, removeSaved, duplicateSaved,
    projects, activeProjectId, setActiveProjectId, createProject, renameProject,
    deleteProject, duplicateProject, removeCalculation, updateCalculationNote,
    updateProjectDescription, updateProjectPaintingSettings, addCalculation,
    resetAll, compareLimit, setCompareLimit, isCompareMobileCapped,
    navigateToTab, handleSavePreset, textSize, setTextSize, sync, handleDefaultUnitChange,
  ]);

  // Detect /projects/<id> sub-route so the project-detail screen can take
  // over the projects tab without leaving the AppShell.
  const projectDetailId = useMemo(() => {
    const stripped = pathname.split("?")[0]?.split("#")[0] ?? "";
    const match = stripped.match(/\/projects\/([^/]+)$/);
    return match?.[1] ?? null;
  }, [pathname]);

  const projectDetailEntry = useMemo(
    () => (projectDetailId ? projects.find((p) => p.id === projectDetailId) ?? null : null),
    [projectDetailId, projects],
  );

  const navigateToProject = useCallback(
    (id: string) => {
      closeTransientOverlays();
      setActiveProjectId(id);
      startRouteNavigation(() => {
        router.push(`/projects/${id}`);
      });
    },
    [closeTransientOverlays, router, setActiveProjectId],
  );

  const navigateBackFromProject = useCallback(() => {
    setActiveProjectId(null);
    startRouteNavigation(() => {
      router.push("/projects");
    });
  }, [router, setActiveProjectId]);

  const mobileScreen =
    currentTab === "calculator" ? (
      <MobileNumpadCalculator
        input={input}
        dispatch={dispatch}
        result={result}
        isPending={isPending}
        activeFamily={activeFamily}
        normalizedProfile={normalizedCurrentProfile}
        onOpenProfilePicker={() => setShowMobileProfileSheet(true)}
        onOpenMaterialPicker={() => setShowMobileMaterialSheet(true)}
        onOpenResult={() => setShowOverlay(true)}
        scrollPaddingBottom="0px"
      />
    ) : currentTab === "saved" ? (
      <div className="px-3 md:px-4">
        <MobileSavedPage
          saved={saved}
          onLoad={handleLoad}
          onMarkUsed={markSavedUsed}
          onRemove={removeSaved}
          onDuplicate={duplicateSaved}
          onOpenCalculator={() => navigateToTab("calculator")}
        />
      </div>
    ) : currentTab === "compare" ? (
      <div className="px-3 md:px-4">
        <MobileComparePage
          items={compareItems}
          onRemove={removeCompareItem}
          onClearAll={clearCompare}
          onOpenCalculator={() => navigateToTab("calculator")}
        />
      </div>
    ) : currentTab === "projects" && projectDetailEntry ? (
      <div className="px-3 md:px-4">
        <MobileProjectDetailPage
          project={projectDetailEntry}
          onBack={navigateBackFromProject}
          onAddPart={() => navigateToTab("calculator")}
          onLoadCalculation={(input) => handleLoad(input)}
          onRemoveCalculation={(calcId) => removeCalculation(projectDetailEntry.id, calcId)}
          onRenameProject={(name) => renameProject(projectDetailEntry.id, name)}
          onDeleteProject={() => {
            deleteProject(projectDetailEntry.id);
            navigateBackFromProject();
          }}
        />
      </div>
    ) : currentTab === "projects" ? (
      <div className="px-3 md:px-4">
        <MobileProjectsPage
          projects={projects}
          activeProjectId={activeProjectId}
          onSetActiveProject={(id) => {
            setActiveProjectId(id);
            navigateToProject(id);
          }}
          onCreateProject={(name) => {
            const created = createProject(name);
            setActiveProjectId(created.id);
          }}
          onRenameProject={renameProject}
          onDeleteProject={(id) => {
            deleteProject(id);
            if (activeProjectId === id) setActiveProjectId(null);
          }}
          onRemoveCalculation={removeCalculation}
          onLoadCalculation={handleLoad}
        />
      </div>
    ) : (
      <MobileSettingsContent
        input={input}
        dispatch={dispatch}
        activeFamily={activeFamily}
        defaultUnit={defaultUnit}
        unitOptions={UNIT_OPTIONS}
        onDefaultUnitChange={handleDefaultUnitChange}
        textSize={textSize}
        onTextSizeChange={setTextSize}
        theme={theme}
        resolvedTheme={resolvedTheme}
        onThemeChange={setTheme}
        showInlinePrice={showInlinePrice}
        onToggleInlinePrice={inlinePriceStore.toggle}
        weightAsMain={weightAsMain}
        onToggleWeightAsMain={weightAsMainStore.toggle}
        onResetAll={resetAll}
        onOpenChangelog={() => setShowChangelogDrawer(true)}
      />
    );

  return (
    <>
      <Sidebar
        onOpenContact={() => setShowContactDrawer(true)}
        onOpenCalculator={() => navigateToTab("calculator")}
        onOpenSaved={() => navigateToTab("saved")}
        onOpenProjects={() => navigateToTab("projects")}
        onOpenCompare={() => navigateToTab("compare")}
        onOpenSettings={() => navigateToTab("settings")}
        onOpenQuickCalc={openQuickCalc}
        onOpenChangelog={() => setShowChangelogDrawer(true)}
        projectCount={projectCount}
        savedCount={saved.length}
        compareCount={compareItems.length}
        isCalculatorOpen={currentTab === "calculator"}
        isSavedOpen={currentTab === "saved"}
        isSettingsOpen={currentTab === "settings"}
        isProjectsOpen={currentTab === "projects"}
        isCompareOpen={currentTab === "compare"}
        isContactOpen={showContactDrawer}
        isChangelogOpen={showChangelogDrawer}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
        theme={resolvedTheme}
        onToggleTheme={cycleTheme}
      />

      <div
        ref={mainContentRef}
        className={`flex min-h-dvh w-full flex-col px-0 pt-[calc(3rem+env(safe-area-inset-top,0px))] transition-[margin-left,width] duration-200 ease-in-out lg:pt-0 ${
          isMultiColumn
            ? "overflow-hidden pb-0"
            : currentTab === "calculator"
              ? "max-w-none overflow-x-hidden pb-32 lg:h-dvh lg:min-h-0 lg:overflow-hidden lg:pb-0"
              : "mx-auto max-w-[94rem] pb-8 md:px-6"
        } ${
          sidebarCollapsed
            ? "lg:ml-[56px] lg:w-[calc(100%-56px)]"
            : "lg:ml-[220px] lg:w-[calc(100%-220px)]"
        }`}
      >
        <header
          className="fixed inset-x-0 top-0 z-[70] flex items-center gap-3 border-b border-border-faint bg-background/96 px-3 py-2 shadow-[0_10px_28px_rgba(20,18,15,0.08)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/92 lg:hidden"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top, 0px))" }}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-inverted shadow-[0_8px_20px_rgba(20,18,15,0.18)]">
            <Image
              src="/icon-192.png"
              alt=""
              width={32}
              height={32}
              className="h-full w-full rounded-xl"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">{mobileHeaderTitle}</h1>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-2xs leading-tight text-muted">
              {normalizedCurrentProfile && (
                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md bg-surface-inset text-muted-faint">
                  <ProfileIcon category={normalizedCurrentProfile.iconKey} className="h-2 w-2" />
                </span>
              )}
              <span className="truncate">{mobileHeaderSubtitle}</span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={cycleTheme}
              className="premium-icon-button h-9 w-9"
              aria-label={
                resolvedTheme === "light"
                  ? t("theme.switchToDark")
                  : resolvedTheme === "dark"
                    ? t("theme.switchToSystem")
                    : t("theme.switchToLight")
              }
            >
              {resolvedTheme === "light" ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              ) : resolvedTheme === "dark" ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" />
                  <path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" />
                  <path d="m19.07 4.93-1.41 1.41" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <rect width="20" height="14" x="2" y="3" rx="2" />
                  <path d="M8 21h8" />
                  <path d="M12 17v4" />
                </svg>
              )}
            </button>
            {currentTab === "projects" ? (
              <button
                type="button"
                onClick={() => {
                  if (activeProjectId) {
                    setActiveProjectId(null);
                  } else {
                    navigateToTab("calculator");
                  }
                }}
                className="premium-icon-button relative h-9 w-9"
                aria-label={activeProjectId ? t("mobileProjects.backToSelector") : t("mobileProjects.backToCalculator")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowMobileMenu(true)}
                className="premium-icon-button relative h-9 w-9"
                aria-label={t("menu.title")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
                {(compareItems.length > 0 || projectCount > 0) && (
                  <span className="absolute right-1 top-1 inline-block h-2 w-2 rounded-full bg-accent" />
                )}
              </button>
            )}
          </div>
        </header>

        <PwaRegister onOpenChangelog={() => setShowChangelogDrawer(true)} />

        {isMultiColumn ? (
          <MultiColumnLayout
            layout={columnLayout}
            contentMap={columnContentMap}
            maxColumnsAllowed={maxColumnsAllowed}
          />
        ) : currentTab === "saved" ? (
          <DesktopSavedPage
            saved={saved}
            onLoad={handleLoad}
            onMarkUsed={markSavedUsed}
            onRemove={removeSaved}
            onDuplicate={duplicateSaved}
            onRename={(id, name) => updateSaved(id, { name })}
            onCreatePreset={() => navigateToTab("calculator")}
          />
        ) : currentTab === "compare" ? (
          <DesktopComparePage
            items={compareItems}
            onRemove={removeCompareItem}
            onClearAll={clearCompare}
            onOpenCalculator={() => navigateToTab("calculator")}
            maxCompare={maxCompare}
          />
        ) : currentTab === "projects" && projectDetailEntry ? (
          <DesktopProjectDetailPage
            project={projectDetailEntry}
            onBackToList={navigateBackFromProject}
            onAddPart={() => navigateToTab("calculator")}
            onLoadCalculation={(input) => handleLoad(input)}
            onRemoveCalculation={(calcId) => removeCalculation(projectDetailEntry.id, calcId)}
            onRenameProject={(name) => renameProject(projectDetailEntry.id, name)}
            onDeleteProject={() => {
              deleteProject(projectDetailEntry.id);
              navigateBackFromProject();
            }}
            onUpdateNotes={(notes) => updateProjectDescription(projectDetailEntry.id, notes)}
          />
        ) : currentTab === "projects" ? (
          <DesktopProjectsPage
            projects={projects}
            activeProjectId={activeProjectId}
            onSetActiveProject={(id) => {
              setActiveProjectId(id);
              navigateToProject(id);
            }}
            onCreateProject={(name) => {
              const created = createProject(name);
              setActiveProjectId(created.id);
            }}
            onRenameProject={renameProject}
            onDeleteProject={(id) => {
              deleteProject(id);
              if (activeProjectId === id) setActiveProjectId(null);
            }}
            onDuplicateProject={(id) => {
              const dup = duplicateProject(id);
              if (dup) setActiveProjectId(dup.id);
            }}
            onRemoveCalculation={removeCalculation}
            onLoadCalculation={handleLoad}
          />
        ) : currentTab === "settings" ? (
          <DesktopSettingsPage
            input={input}
            dispatch={dispatch}
            activeFamily={activeFamily}
            issues={issues}
            onResetAll={resetAll}
            onOpenChangelog={() => setShowChangelogDrawer(true)}
            compareLimit={compareLimit}
            onCompareLimitChange={setCompareLimit}
            maxCompare={maxCompare}
            isCompareMobileCapped={isCompareMobileCapped}
            showInlineMaterial={showInlineMaterial}
            onToggleInlineMaterial={inlineMaterialStore.toggle}
            showInlinePrice={showInlinePrice}
            onToggleInlinePrice={inlinePriceStore.toggle}
            showSettingsPreview={showSettingsPreview}
            onToggleSettingsPreview={settingsPreviewStore.toggle}
            weightAsMain={weightAsMain}
            onToggleWeightAsMain={weightAsMainStore.toggle}
            defaultUnit={defaultUnit}
            onDefaultUnitChange={handleDefaultUnitChange}
            unitOptions={UNIT_OPTIONS}
            textSize={textSize}
            onTextSizeChange={setTextSize}
            theme={theme}
            onThemeChange={setTheme}
            syncStatus={sync.status}
            onConnectSync={sync.connectProvider}
            onReconnectSync={sync.reconnectProvider}
            onChangeSyncPassphrase={sync.changePassphrase}
            onSyncNow={() => sync.syncNow()}
            onDisconnectSync={sync.disconnectProvider}
            onResetRemoteSync={sync.resetRemoteCopy}
            onExportSync={sync.exportSnapshot}
            onImportSync={sync.importSnapshot}
          />
        ) : (
          desktopMain
        )}

        <div
          className="px-3 lg:hidden"
          aria-busy={isRouteNavigationPending || undefined}
          style={{
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 3rem)",
            paddingBottom: resultBarBottomPadding,
          }}
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={currentTab}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.1 : 0.14, ease: "linear" }}
              className="grid gap-4"
            >
              {mobileScreen}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ResultBar removed on mobile entirely — the calculator route
            has its own result card and other tabs don't need a
            floating mini-result. Desktop continues to use the sticky
            ResultPanel in the right column. */}

        {/* Bottom tab bar replaced by the mobile hamburger menu on small
            screens. Desktop keeps the sidebar; mobile relies on
            MobileMenuSheet (rendered below). */}

        {showOverlay && result && (
          isMobile ? (
            <MobileResultSheet
              result={result}
              includeVat={input.includeVat}
              wastePercent={input.wastePercent}
              vatPercent={input.vatPercent}
              isSaved={isCurrentSaved}
              onOpenSaveDialog={handleSaveCurrent}
              onClose={() => setShowOverlay(false)}
              onCompare={handleCompare}
              canCompare={canCompare}
              isInCompare={currentIsInCompare}
              compareCount={compareItems.length}
              maxCompare={maxCompare}
              onAddToProject={handleAddToProject}
              hasProjects={projectCount > 0}
              normalizedProfile={normalizedCurrentProfile}
              compareItems={compareItems}
              onRemoveCompareItem={removeCompareItem}
              onOpenCompare={openCompare}
            />
          ) : (
            <ResultOverlay
              result={result}
              includeVat={input.includeVat}
              wastePercent={input.wastePercent}
              vatPercent={input.vatPercent}
              isSaved={isCurrentSaved}
              onOpenSaveDialog={handleSaveCurrent}

              onClose={() => setShowOverlay(false)}
              onCompare={handleCompare}
              canCompare={canCompare}
              isInCompare={currentIsInCompare}
              compareCount={compareItems.length}
              maxCompare={maxCompare}
              onAddToProject={handleAddToProject}
              hasProjects={projectCount > 0}
              normalizedProfile={normalizedCurrentProfile}
              weightAsMain={weightAsMain}
            />
          )
        )}


        {/* Desktop settings has its own full-page workshop above; the
            mobile settings tab renders MobileSettingsContent. The
            legacy SettingsDrawer is no longer used. */}

        <ContactDrawer open={showContactDrawer} onClose={() => setShowContactDrawer(false)} />

        <ChangelogDrawer open={showChangelogDrawer} onClose={() => setShowChangelogDrawer(false)} />

        {isMobile && (
          <>
            <MobileProfileSheet
              open={showMobileProfileSheet}
              onOpenChange={setShowMobileProfileSheet}
              input={input}
              dispatch={dispatch}
              selectedProfile={selectedProfile}
              issues={issues}
            />
            <MobileMaterialSheet
              open={showMobileMaterialSheet}
              onOpenChange={setShowMobileMaterialSheet}
              input={input}
              dispatch={dispatch}
              activeFamily={activeFamily}
            />
            <MobileMenuSheet
              open={showMobileMenu}
              onOpenChange={setShowMobileMenu}
              currentTab={currentTab}
              onNavigate={navigateToTab}
              onOpenChangelog={() => setShowChangelogDrawer(true)}
              onOpenContact={() => setShowContactDrawer(true)}
              onReplayOnboarding={() => onboardedStore.set(false)}
              projectCount={projectCount}
              savedCount={saved.length}
              compareCount={compareItems.length}
            />
          </>
        )}

        <CompareDrawer
          open={showCompareDrawer && !(isMultiColumn && columnLayout.hasPanel("compare"))}
          onClose={closeCompare}
          items={compareItems}
          onRemoveItem={removeCompareItem}
          onClearAll={clearCompare}
          maxCompare={maxCompare}
          onAddToProject={handleAddExternalToProject}
          hasProjects={projectCount > 0}
        />

        {/* ProjectDrawer is no longer rendered on desktop — the
            /projects route renders the new full-page
            DesktopProjectsPage inline. The drawer component itself
            stays in the codebase for future use. */}

        {(externalSource || result) && (
          <SaveToProjectModal
            open={showSaveModal}
            onClose={() => {
              setShowSaveModal(false);
              setExternalSource(null);
            }}
            projects={projects}
            onCreateProject={createProject}
            onAddCalculation={addCalculation}
            currentInput={externalSource?.input ?? input}
            currentResult={(externalSource?.result ?? result)!}
            onOpenDrawer={() => navigateToTab("projects")}
          />
        )}
      </div>

      <QuickCalcPalette
        quickCalc={quickCalc}
        onLoadEntry={handleQuickCalcLoad}
        presets={presets}
        saved={saved}
        onLoadSaved={(entry) => {
          markSavedUsed(entry.id);
          const firstInput = entry.parts[0]?.input ?? entry.input;
          handleLoad(firstInput);
        }}
        onSelectProfile={(profileId) => {
          dispatch({ type: "SET_PROFILE", profileId });
          navigateToTab("calculator");
        }}
        onAction={(action) => {
          if (action === "new-calc") {
            resetAll();
            navigateToTab("calculator");
          } else if (action === "new-project") {
            navigateToTab("projects");
          } else if (action === "settings") {
            navigateToTab("settings");
          } else if (action === "compare") {
            navigateToTab("compare");
          }
        }}
      />

      <ShortcutsModal open={showShortcutsModal} onClose={() => setShowShortcutsModal(false)} />

      <SavePresetModal
        open={presetModalOpen}
        onClose={() => setPresetModalOpen(false)}
        onSave={handleConfirmSavePreset}
        defaultLabel={presetDefaultLabel}
        profileName={presetProfileName}
      />

      <OnboardingFlow
        open={!onboarded}
        initialGradeId={input.materialGradeId}
        initialProfileId={input.profileId}
        initialUnit={input.length.unit}
        initialCurrency={input.currency}
        dispatch={dispatch}
        onComplete={() => onboardedStore.set(true)}
        onSkip={() => onboardedStore.set(true)}
      />
    </>
  );
}
