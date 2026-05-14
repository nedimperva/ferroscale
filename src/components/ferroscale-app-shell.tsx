"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCalculator } from "@/hooks/useCalculator";
import { useSaved, type SavedEntry, type TemplatePartDraft } from "@/hooks/useSaved";
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
import { resolveGradeLabel } from "@/lib/calculator/grade-label";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";
import { getProfileById } from "@/lib/datasets/profiles";
import { APP_TABS, getAppTabHref, getAppTabIndex, type AppTabId } from "@/lib/app-shell";
import { createBoolStore, createStringStore, createSidebarStore } from "@/lib/external-stores";
import { useColumnLayout } from "@/hooks/useColumnLayout";
import type { ColumnPanelId } from "@/lib/column-layout";
import {
  DEFAULT_COLUMN_LAYOUT,
  canRenderColumnLayout,
  getMaxColumnsForWidth,
} from "@/lib/column-layout";
import { ProfileSection } from "@/components/calculator/profile-section";
import { MobileNumpadCalculator } from "@/components/calculator/mobile-numpad-calculator";
import { MobileProfileSheet } from "@/components/calculator/mobile-profile-sheet";
import { MobileMaterialSheet } from "@/components/calculator/mobile-material-sheet";
import { MobileResultSheet } from "@/components/calculator/mobile-result-sheet";
import { OnboardingFlow } from "@/components/calculator/onboarding-flow";
import { DesktopWorkstationTopbar } from "@/components/calculator/desktop-workstation-topbar";
import { MobileMenuSheet } from "@/components/calculator/mobile-menu-sheet";
import { MobileSettingsContent } from "@/components/calculator/mobile-settings-content";
import { MobileSavedHero, MobileProjectsHero } from "@/components/calculator/mobile-tab-hero";
import { ResultPanel } from "@/components/calculator/result-panel";
import { ResultOverlay } from "@/components/calculator/result-bar";
import { TemplatesDrawer } from "@/components/calculator/templates-drawer";
import { SettingsDrawer, SettingsWorkspaceContent } from "@/components/calculator/settings-drawer";
import { SettingsSummary } from "@/components/calculator/settings-summary";
import { ContactDrawer } from "@/components/calculator/contact-drawer";
import { CompareDrawer, CompareWorkspaceContent } from "@/components/compare/compare-drawer";
import { ReversePanel } from "@/components/calculator/reverse-panel";
import { ProfileSpecsPanel } from "@/components/calculator/profile-specs-panel";
import { ProjectDrawer, ProjectsWorkspaceContent } from "@/components/projects/project-drawer";
import { SaveToProjectModal } from "@/components/projects/save-to-project-modal";
import { Sidebar } from "@/components/calculator/sidebar";
import { PwaRegister } from "@/components/pwa-register";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { QuickCalcPalette } from "@/components/quick-calc/quick-calc-palette";
import { ShortcutsModal } from "@/components/ui/shortcuts-modal";
import { SavePresetModal } from "@/components/calculator/save-preset-modal";
import { TemplateBuilder } from "@/components/calculator/template-builder";
import { ChangelogDrawer } from "@/components/calculator/changelog-drawer";
import { TemplatesPanel } from "@/components/calculator/templates-panel";
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

function MobilePageCard({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`overflow-hidden rounded-[1.35rem] ${className}`}>
      {children}
    </section>
  );
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
    removeSavedMany,
    duplicateSaved,
    duplicateSavedMany,
    appendPartsToSaved,
    removePartFromSaved,
    reorderPartInSaved,
    updateSaved,
    markSavedUsed,
    isSaved: isSavedEntry,
    getSavedCount,
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
    addTemplateCalculation,
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
  const canFitCurrentColumns = canRenderColumnLayout(columnLayout.columns.length, mainContentWidth);
  const minColumnsForToggle = Math.min(
    DEFAULT_COLUMN_LAYOUT.columns.length,
    Math.max(2, columnLayout.columns.length),
  );
  const canShowColumnsToggle = columnLayout.enabled || maxColumnsAllowed >= minColumnsForToggle;
  const isMultiColumn = columnLayout.enabled && canFitCurrentColumns;

  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [presetDefaultLabel, setPresetDefaultLabel] = useState("");
  const [presetProfileName, setPresetProfileName] = useState("");
  const [showOverlay, setShowOverlay] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [templateBuilderSession, setTemplateBuilderSession] = useState(0);
  const [externalSource, setExternalSource] = useState<{ input: CalculationInput; result: CalculationResult } | null>(null);
  const [showContactDrawer, setShowContactDrawer] = useState(false);
  const [showChangelogDrawer, setShowChangelogDrawer] = useState(false);
  const [showMobileProfileSheet, setShowMobileProfileSheet] = useState(false);
  const [showMobileMaterialSheet, setShowMobileMaterialSheet] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
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
    setShowTemplateBuilder(false);
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

  const handleOpenSaveDialog = useCallback(() => {
    if (!result) return;
    setExternalSource(null);
    setShowOverlay(false);
    setTemplateBuilderSession((session) => session + 1);
    setShowTemplateBuilder(true);
  }, [result]);

  const handleConfirmSave = useCallback(
    (
      name: string,
      notes?: string,
      tags?: string[],
      parts?: TemplatePartDraft[],
    ) => {
      const source = externalSource ?? (result ? { input, result } : null);
      if (!source) return;
      saveCalculation(source.input, source.result, name, notes, tags, parts);
      setShowTemplateBuilder(false);
      setExternalSource(null);
    },
    [externalSource, input, result, saveCalculation],
  );

  const currentIsInCompare = result ? isInCompare(result) : false;

  const defaultSaveName = useMemo(() => {
    if (!result) return "";
    const profileLabel = normalizedCurrentProfile?.shortLabel ?? result.profileLabel;
    const grade = resolveGradeLabel(result.gradeLabel, t);
    return grade ? `${profileLabel} - ${grade}` : profileLabel;
  }, [normalizedCurrentProfile, result, t]);

  const externalSourceDefaultName = useMemo(() => {
    if (!externalSource) return "";
    const profile = normalizeProfileSnapshot(externalSource.input);
    const profileLabel = profile?.shortLabel ?? externalSource.result.profileLabel;
    const grade = resolveGradeLabel(externalSource.result.gradeLabel, t);
    return grade ? `${profileLabel} - ${grade}` : profileLabel;
  }, [externalSource, t]);

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

  const handleApplyTemplate = useCallback(
    (entry: SavedEntry) => {
      markSavedUsed(entry.id);
      dispatch({ type: "LOAD_ENTRY", input: entry.input });
      navigateHome();
    },
    [dispatch, markSavedUsed, navigateHome],
  );

  const handleAppendTemplateParts = useCallback(
    (templateId: string, parts: TemplatePartDraft[]) => {
      const appended = appendPartsToSaved(templateId, parts);
      if (!appended) return;
      markSavedUsed(templateId);
      setShowTemplateBuilder(false);
    },
    [appendPartsToSaved, markSavedUsed],
  );

  const handleTemplateAddToProject = useCallback(
    (entry: SavedEntry, overrides: { quantityMultiplier: number; projectId?: string }) => {
      const fallbackProject = projects[0] ?? createProject("Common Parts");
      const targetProjectId = overrides.projectId ?? activeProjectId ?? fallbackProject.id;

      const multiplier = Math.max(1, Math.floor(overrides.quantityMultiplier || 1));
      const added = addTemplateCalculation(targetProjectId, entry.name, entry.parts, multiplier);
      if (!added) return;

      markSavedUsed(entry.id);
      setActiveProjectId(targetProjectId);
    },
    [activeProjectId, addTemplateCalculation, createProject, markSavedUsed, projects, setActiveProjectId],
  );

  const handleRemoveTemplatePart = useCallback(
    (entry: SavedEntry, partId: string) => {
      removePartFromSaved(entry.id, partId);
    },
    [removePartFromSaved],
  );

  const handleReorderTemplatePart = useCallback(
    (entry: SavedEntry, partId: string, direction: -1 | 1) => {
      reorderPartInSaved(entry.id, partId, direction);
    },
    [reorderPartInSaved],
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
      toggleColumns: () => {
        if (canShowColumnsToggle) {
          columnLayout.toggleEnabled();
        }
      },
    }),
    [canShowColumnsToggle, columnLayout, dispatch, navigateToTab, toggleQuickCalc],
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

  const [lastAnimatedTab, setLastAnimatedTab] = useState(currentTab);
  const pageDirection =
    lastAnimatedTab === currentTab
      ? 0
      : getAppTabIndex(currentTab) > getAppTabIndex(lastAnimatedTab)
        ? 1
        : -1;

  useEffect(() => {
    if (lastAnimatedTab === currentTab) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLastAnimatedTab(currentTab);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [currentTab, lastAnimatedTab]);

  const desktopMain = (
    <div className="hidden gap-4 lg:mt-4 lg:grid lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_400px]">
      <div className="panel-base flex w-full flex-1 flex-col self-start rounded-[1.35rem]">
        {showSettingsPreview && (
          <div className="px-3 pb-1 pt-3 md:px-4 md:pb-2 md:pt-4">
            <SettingsSummary input={input} onOpen={() => navigateToTab("settings")} />
          </div>
        )}

        <div className="px-3 py-2 md:p-4">
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

        <div className="border-t border-border-faint px-4 pb-4 pt-3">
          <ReversePanel
            reverse={reverse}
            isManualProfile={selectedProfile.mode === "manual"}
            input={input}
          />
        </div>
      </div>
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
        onOpenSaveDialog={handleOpenSaveDialog}
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
        <TemplatesPanel
          saved={saved}
          projectOptions={projects.map((project) => ({ id: project.id, name: project.name }))}
          onLoad={handleApplyTemplate}
          onRemove={removeSaved}
          onRemoveMany={removeSavedMany}
          onDuplicate={duplicateSaved}
          onDuplicateMany={duplicateSavedMany}
          onAddToProject={handleTemplateAddToProject}
          onRemovePart={handleRemoveTemplatePart}
          onReorderPart={handleReorderTemplatePart}
          onUpdate={updateSaved}
          layout="column"
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
    reverse, result, isPending, isCurrentSaved, handleOpenSaveDialog,
    handleCompare, canCompare, currentIsInCompare, compareItems, maxCompare,
    handleAddToProject, handleAddExternalToProject,
    projectCount, normalizedCurrentProfile, weightAsMain,
    removeCompareItem, clearCompare,
    saved, handleLoad, handleApplyTemplate, handleTemplateAddToProject, handleRemoveTemplatePart, handleReorderTemplatePart, removeSaved, removeSavedMany, duplicateSaved, duplicateSavedMany, updateSaved,
    projects, activeProjectId, setActiveProjectId, createProject, renameProject,
    deleteProject, duplicateProject, removeCalculation, updateCalculationNote,
    updateProjectDescription, updateProjectPaintingSettings, addCalculation,
    resetAll, compareLimit, setCompareLimit, isCompareMobileCapped,
    navigateToTab, handleSavePreset, textSize, setTextSize, sync, handleDefaultUnitChange,
  ]);

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
      <MobilePageCard>
        <div className="px-3 pb-4 pt-3 md:px-4 md:pb-4 md:pt-4">
          <MobileSavedHero saved={saved} />
          <TemplatesPanel
            saved={saved}
            projectOptions={projects.map((project) => ({ id: project.id, name: project.name }))}
            onLoad={handleApplyTemplate}
            onRemove={removeSaved}
            onRemoveMany={removeSavedMany}
            onDuplicate={duplicateSaved}
            onDuplicateMany={duplicateSavedMany}
            onAddToProject={handleTemplateAddToProject}
            onRemovePart={handleRemoveTemplatePart}
            onReorderPart={handleReorderTemplatePart}
            onUpdate={updateSaved}
            layout="mobile"
          />
        </div>
      </MobilePageCard>
    ) : currentTab === "projects" ? (
      <MobilePageCard className="flex min-h-[60dvh] flex-col">
        <div className="flex min-h-0 flex-1 flex-col px-3 pb-4 pt-3 md:px-4 md:pb-4 md:pt-4">
          <MobileProjectsHero projects={projects} activeProjectId={activeProjectId} />
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
            layout="mobile"
            weightAsMain={weightAsMain}
          />
        </div>
      </MobilePageCard>
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
        onOpenCompare={openCompare}
        onOpenProjects={() => navigateToTab("projects")}
        onOpenSettings={() => navigateToTab("settings")}
        onOpenHistory={() => navigateToTab("saved")}
        onOpenQuickCalc={openQuickCalc}
        onOpenChangelog={() => setShowChangelogDrawer(true)}
        compareCount={compareItems.length}
        projectCount={projectCount}
        isSettingsOpen={currentTab === "settings"}
        isHistoryOpen={currentTab === "saved"}
        isProjectsOpen={currentTab === "projects"}
        isCompareOpen={showCompareDrawer}
        isContactOpen={showContactDrawer}
        isChangelogOpen={showChangelogDrawer}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
        theme={resolvedTheme}
        onToggleTheme={cycleTheme}
        canShowColumnsToggle={canShowColumnsToggle}
        isMultiColumnEnabled={columnLayout.enabled}
        onToggleMultiColumn={columnLayout.toggleEnabled}
      />

      <div
        ref={mainContentRef}
        className={`flex min-h-dvh w-full flex-col px-0 transition-[margin-left] duration-200 ease-in-out md:px-6 ${
          isMultiColumn
            ? "overflow-hidden pb-0"
            : "mx-auto max-w-[94rem] pb-8"
        } ${sidebarCollapsed ? "lg:ml-[56px]" : "lg:ml-[220px]"}`}
        style={{ paddingTop: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}
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
            <button
              type="button"
              onClick={() => setShowMobileMenu(true)}
              className="premium-icon-button relative h-9 w-9"
              aria-label={t("menu.title")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
              {(compareItems.length > 0 || saved.length > 0 || projectCount > 0) && (
                <span className="absolute right-1 top-1 inline-block h-2 w-2 rounded-full bg-accent" />
              )}
            </button>
          </div>
        </header>

        <PwaRegister onOpenChangelog={() => setShowChangelogDrawer(true)} />

        {isMultiColumn ? (
          <MultiColumnLayout
            layout={columnLayout}
            contentMap={columnContentMap}
            maxColumnsAllowed={maxColumnsAllowed}
          />
        ) : (
          <>
            <DesktopWorkstationTopbar
              currentTab={currentTab}
              contextLabel={result ? headerContext : null}
              onOpenQuickCalc={openQuickCalc}
              onReset={resetAll}
            />
            {desktopMain}
          </>
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
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, x: pageDirection >= 0 ? 24 : -24, scale: 0.992 }
              }
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, x: pageDirection >= 0 ? -18 : 18, scale: 0.988 }
              }
              transition={
                shouldReduceMotion
                  ? { duration: 0.12, ease: "linear" }
                  : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
              }
              className="grid gap-4 will-change-transform"
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

        {showOverlay && !showTemplateBuilder && result && (
          isMobile ? (
            <MobileResultSheet
              result={result}
              includeVat={input.includeVat}
              wastePercent={input.wastePercent}
              vatPercent={input.vatPercent}
              isSaved={isCurrentSaved}
              onOpenSaveDialog={handleOpenSaveDialog}
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
          ) : (
            <ResultOverlay
              result={result}
              includeVat={input.includeVat}
              wastePercent={input.wastePercent}
              vatPercent={input.vatPercent}
              isSaved={isCurrentSaved}
              onOpenSaveDialog={handleOpenSaveDialog}

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

        {!isMobile && !(isMultiColumn && columnLayout.hasPanel("saved")) && (
          <TemplatesDrawer
            open={currentTab === "saved"}
            onClose={navigateHome}
            saved={saved}
            projectOptions={projects.map((project) => ({ id: project.id, name: project.name }))}
            onLoad={handleApplyTemplate}
            onRemove={removeSaved}
            onRemoveMany={removeSavedMany}
            onDuplicate={duplicateSaved}
            onDuplicateMany={duplicateSavedMany}
            onAddToProject={handleTemplateAddToProject}
            onRemovePart={handleRemoveTemplatePart}
            onReorderPart={handleReorderTemplatePart}
            onUpdate={updateSaved}
          />
        )}

        {!isMobile && !(isMultiColumn && columnLayout.hasPanel("settings")) && (
          <SettingsDrawer
            open={currentTab === "settings"}
            onClose={navigateHome}
            input={input}
            dispatch={dispatch}
            activeFamily={activeFamily}
            issues={issues}
            onResetAll={resetAll}
            onOpenChangelog={() => {
              navigateHome();
              setShowChangelogDrawer(true);
            }}
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
        )}

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
              onOpenCompare={openCompare}
              onOpenChangelog={() => setShowChangelogDrawer(true)}
              onOpenContact={() => setShowContactDrawer(true)}
              onReplayOnboarding={() => onboardedStore.set(false)}
              savedCount={saved.length}
              projectCount={projectCount}
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

        {!isMobile && !(isMultiColumn && columnLayout.hasPanel("projects")) && (
          <ProjectDrawer
            open={currentTab === "projects"}
            onClose={navigateHome}
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
            weightAsMain={weightAsMain}
          />
        )}

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

      <QuickCalcPalette quickCalc={quickCalc} onLoadEntry={handleQuickCalcLoad} presets={presets} />

      <ShortcutsModal open={showShortcutsModal} onClose={() => setShowShortcutsModal(false)} />

      <TemplateBuilder
        key={templateBuilderSession}
        open={showTemplateBuilder}
        onClose={() => {
          setShowTemplateBuilder(false);
          setExternalSource(null);
        }}
        onSave={handleConfirmSave}
        onAppendToTemplate={handleAppendTemplateParts}
        savedTemplates={saved.map((entry) => ({ id: entry.id, name: entry.name, partCount: entry.parts.length }))}
        savedTemplateCount={
          externalSource
            ? getSavedCount(externalSource.result)
            : result
              ? getSavedCount(result)
              : 0
        }
        defaultName={externalSource ? externalSourceDefaultName : defaultSaveName}
        seedInput={externalSource?.input ?? input}
        seedResult={externalSource?.result ?? result}
      />

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
