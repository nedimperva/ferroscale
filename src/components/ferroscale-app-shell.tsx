"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
import { useKeyboardShortcuts, APP_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useElementWidth } from "@/hooks/useElementWidth";
import type { LengthUnit } from "@/lib/calculator/types";
import { calculateMetal } from "@/lib/calculator/engine";
import { resolveGradeLabel } from "@/lib/calculator/grade-label";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";
import { getProfileById } from "@/lib/datasets/profiles";
import { toast } from "@/lib/toast";
import { getAdjacentAppTab, getAppTabHref, getAppTabIndex, type AppTabId } from "@/lib/app-shell";
import { triggerHaptic } from "@/lib/haptics";
import { createBoolStore, createStringStore, createSidebarStore } from "@/lib/external-stores";
import { useColumnLayout } from "@/hooks/useColumnLayout";
import type { ColumnPanelId } from "@/lib/column-layout";
import {
  DEFAULT_COLUMN_LAYOUT,
  canRenderColumnLayout,
  getMaxColumnsForWidth,
} from "@/lib/column-layout";
import { IssueList } from "@/components/calculator/issue-list";
import { ProfileSection } from "@/components/calculator/profile-section";
import { ResultPanel } from "@/components/calculator/result-panel";
import { ResultBar, ResultOverlay } from "@/components/calculator/result-bar";
import { HistoryDrawer } from "@/components/calculator/history-drawer";
import { SettingsDrawer, SettingsWorkspaceContent } from "@/components/calculator/settings-drawer";
import { SettingsSummary } from "@/components/calculator/settings-summary";
import { ContactDrawer } from "@/components/calculator/contact-drawer";
import { CompareDrawer, CompareWorkspaceContent } from "@/components/compare/compare-drawer";
import { ReversePanel } from "@/components/calculator/reverse-panel";
import { ProfileSpecsPanel } from "@/components/calculator/profile-specs-panel";
import { ProjectDrawer, ProjectsWorkspaceContent } from "@/components/projects/project-drawer";
import { SaveToProjectModal } from "@/components/projects/save-to-project-modal";
import { Sidebar } from "@/components/calculator/sidebar";
import { BottomTabBar } from "@/components/ui/bottom-tab-bar";
import { PwaRegister } from "@/components/pwa-register";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { QuickCalcPalette } from "@/components/quick-calc/quick-calc-palette";
import { ShortcutsModal } from "@/components/ui/shortcuts-modal";
import { SavePresetModal } from "@/components/calculator/save-preset-modal";
import { TemplateBuilder } from "@/components/calculator/template-builder";
import { ChangelogDrawer } from "@/components/calculator/changelog-drawer";
import { HistoryPanel } from "@/components/calculator/history-panel";
import { MultiColumnLayout } from "@/components/columns/multi-column-layout";

const sidebarStore = createSidebarStore();
const inlineMaterialStore = createBoolStore("ferroscale-inline-material", false);
const inlinePriceStore = createBoolStore("ferroscale-inline-price", true);
const settingsPreviewStore = createBoolStore("ferroscale-settings-preview", true);
const weightAsMainStore = createBoolStore("ferroscale-weight-as-main", false);

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

const EDGE_SWIPE_PX = 28;
const EDGE_SWIPE_MIN_DISTANCE = 70;
const EDGE_SWIPE_MAX_VERTICAL = 56;

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

function isSwipeEligibleTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-app-swipe-lock='true']")) return false;
  if (
    target.closest(
      "button, a, input, textarea, select, label, summary, [role='button'], [role='tab'], [role='dialog'], [contenteditable='true']",
    )
  ) {
    return false;
  }
  return true;
}

function MobilePageCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-xl border border-border bg-surface shadow-sm ${className}`}>
      {children}
    </section>
  );
}

export function FerroScaleAppShell({ currentTab }: { currentTab: AppTabId }) {
  const t = useTranslations();
  const router = useRouter();
  const isMobile = useIsMobile();

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
    getSavedEntry,
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
  const quickCalcOpen = quickCalc.isOpen;
  const { presets, presetsForProfile, addPreset, removePreset } = usePresets();
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
  const [showContactDrawer, setShowContactDrawer] = useState(false);
  const [showChangelogDrawer, setShowChangelogDrawer] = useState(false);

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
      router.push(getAppTabHref(tab));
    },
    [closeTransientOverlays, currentTab, router],
  );

  const navigateHome = useCallback(() => {
    closeTransientOverlays();
    router.push("/");
  }, [closeTransientOverlays, router]);

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
  const currentSavedEntry = result ? getSavedEntry(result) : undefined;

  const handleOpenSaveDialog = useCallback(() => {
    if (!result) return;
    setTemplateBuilderSession((session) => session + 1);
    setShowTemplateBuilder(true);
  }, [result]);

  const handleRemoveSaved = useCallback(() => {
    if (!currentSavedEntry) return;
    removeSaved(currentSavedEntry.id);
    toast.info(t("toasts.calculationUnstarred"));
  }, [currentSavedEntry, removeSaved, t]);

  const handleConfirmSave = useCallback(
    (
      name: string,
      notes?: string,
      tags?: string[],
      parts?: TemplatePartDraft[],
    ) => {
      if (!result) return;
      saveCalculation(input, result, name, notes, tags, parts);
      setShowTemplateBuilder(false);
      toast.success(t("toasts.calculationSaved"));
    },
    [input, result, saveCalculation, t],
  );

  const currentIsInCompare = result ? isInCompare(result) : false;

  const defaultSaveName = useMemo(() => {
    if (!result) return "";
    const profileLabel = normalizedCurrentProfile?.shortLabel ?? result.profileLabel;
    const grade = resolveGradeLabel(result.gradeLabel, t);
    return grade ? `${profileLabel} - ${grade}` : profileLabel;
  }, [normalizedCurrentProfile, result, t]);

  const handleCompare = useCallback(() => {
    if (!result) return;
    if (currentIsInCompare) {
      openCompare();
      return;
    }
    addCompareItem(input, result);
    toast.info(t("toasts.addedToCompare"));
  }, [addCompareItem, currentIsInCompare, input, openCompare, result, t]);

  const handleAddToProject = useCallback(() => {
    if (!result) return;
    setShowOverlay(false);
    setShowSaveModal(true);
  }, [result]);

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
      if (!appended) {
        toast.error(t("saved.addCurrentPartFailed"));
        return;
      }
      markSavedUsed(templateId);
      setShowTemplateBuilder(false);
      toast.success(t("saved.currentPartAdded"));
    },
    [appendPartsToSaved, markSavedUsed, t],
  );

  const handleTemplateAddToProject = useCallback(
    (entry: SavedEntry, overrides: { quantityMultiplier: number; projectId?: string }) => {
      const fallbackProject = projects[0] ?? createProject("Common Parts");
      const targetProjectId = overrides.projectId ?? activeProjectId ?? fallbackProject.id;
      const targetProjectName = projects.find((project) => project.id === targetProjectId)?.name ?? fallbackProject.name;

      const multiplier = Math.max(1, Math.floor(overrides.quantityMultiplier || 1));
      let addedCount = 0;
      for (const part of entry.parts) {
        const nextInput = {
          ...part.input,
          quantity: Math.max(1, Math.floor((part.input.quantity || 1) * multiplier)),
          useCustomDensity: false,
        };
        const calc = calculateMetal(nextInput);
        if (!calc.ok) continue;
        const added = addCalculation(targetProjectId, nextInput, calc.result);
        if (added) addedCount += 1;
      }

      if (addedCount === 0) {
        toast.info(t("saved.alreadyInProject"));
        return;
      }

      markSavedUsed(entry.id);

      setActiveProjectId(targetProjectId);
      toast.success(t("saved.addedPartsToProject", { count: addedCount, project: targetProjectName }));
    },
    [activeProjectId, addCalculation, createProject, markSavedUsed, projects, setActiveProjectId, t],
  );

  const handleRemoveTemplatePart = useCallback(
    (entry: SavedEntry, partId: string) => {
      const removed = removePartFromSaved(entry.id, partId);
      if (!removed) {
        toast.info(t("saved.cannotRemoveLastPart"));
      }
    },
    [removePartFromSaved, t],
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

  const sidebarCollapsed = useSyncExternalStore(
    sidebarStore.subscribe,
    sidebarStore.getSnapshot,
    sidebarStore.getServerSnapshot,
  );
  const toggleSidebarCollapsed = useCallback(() => {
    sidebarStore.toggle();
  }, []);

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
  const defaultUnit = useSyncExternalStore(
    defaultUnitStore.subscribe,
    defaultUnitStore.getSnapshot,
    defaultUnitStore.getServerSnapshot,
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
      toast.success(t("presets.saved"));
      setPresetModalOpen(false);
    },
    [addPreset, input, t],
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
  const resultBarBottomPadding = result
    ? "calc(132px + env(safe-area-inset-bottom, 0px))"
    : "calc(72px + env(safe-area-inset-bottom, 0px))";

  const swipeStateRef = useRef<{ edge: "left" | "right"; x: number; y: number } | null>(null);
  const isSwipeBlocked =
    !isMobile ||
    showOverlay ||
    showSaveModal ||
    showTemplateBuilder ||
    showShortcutsModal ||
    presetModalOpen ||
    showContactDrawer ||
    showChangelogDrawer ||
    showCompareDrawer ||
    quickCalcOpen;

  const handleMobileTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (isSwipeBlocked || !isSwipeEligibleTarget(event.target)) {
        swipeStateRef.current = null;
        return;
      }

      const touch = event.touches[0];
      const width = window.innerWidth;
      const isLeftEdge = touch.clientX <= EDGE_SWIPE_PX;
      const isRightEdge = touch.clientX >= width - EDGE_SWIPE_PX;
      if (!isLeftEdge && !isRightEdge) {
        swipeStateRef.current = null;
        return;
      }

      swipeStateRef.current = {
        edge: isLeftEdge ? "left" : "right",
        x: touch.clientX,
        y: touch.clientY,
      };
    },
    [isSwipeBlocked],
  );

  const handleMobileTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      const swipe = swipeStateRef.current;
      swipeStateRef.current = null;
      if (!swipe) return;

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - swipe.x;
      const deltaY = touch.clientY - swipe.y;
      if (Math.abs(deltaY) > EDGE_SWIPE_MAX_VERTICAL) return;

      if (swipe.edge === "left" && deltaX > EDGE_SWIPE_MIN_DISTANCE) {
        const previousTab = getAdjacentAppTab(currentTab, -1);
        if (previousTab) {
          triggerHaptic("light");
          navigateToTab(previousTab);
        }
      }

      if (swipe.edge === "right" && deltaX < -EDGE_SWIPE_MIN_DISTANCE) {
        const nextTab = getAdjacentAppTab(currentTab, 1);
        if (nextTab) {
          triggerHaptic("light");
          navigateToTab(nextTab);
        }
      }
    },
    [currentTab, navigateToTab],
  );

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
    <div className="hidden gap-4 lg:grid lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_400px]">
      <div className="flex w-full flex-1 flex-col self-start rounded-xl border border-border bg-surface shadow-sm">
        <div className="px-2.5 pb-0 pt-2 md:px-4 md:pb-0 md:pt-4">
          <IssueList issues={issues} />
        </div>

        {showSettingsPreview && (
          <div className="px-2.5 pb-0.5 pt-1.5 md:px-4 md:pb-2 md:pt-3">
            <SettingsSummary input={input} onOpen={() => navigateToTab("settings")} />
          </div>
        )}

        <div className="px-2.5 py-1.5 md:p-4">
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

      <aside className="hidden gap-4 self-start lg:sticky lg:top-4 lg:grid">
        <ResultPanel
          result={result}
          isPending={isPending}
          isSaved={isCurrentSaved}
          onOpenSaveDialog={handleOpenSaveDialog}
          onRemoveSaved={handleRemoveSaved}
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
          layout="standalone"
        />
      </aside>
    </div>
  );

  const columnContentMap = useMemo((): Record<ColumnPanelId, React.ReactNode> => ({
    calculator: (
      <div className="flex flex-col">
        <div className="px-2.5 pb-0 pt-2 md:px-4 md:pb-0 md:pt-4">
          <IssueList issues={issues} />
        </div>
        {showSettingsPreview && (
          <div className="px-2.5 pb-0.5 pt-1.5 md:px-4 md:pb-2 md:pt-3">
            <SettingsSummary input={input} onOpen={() => navigateToTab("settings")} />
          </div>
        )}
        <div className="px-2.5 py-1.5 md:p-4">
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
        onRemoveSaved={handleRemoveSaved}
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
        <HistoryPanel
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
          weightAsMain={weightAsMain}
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
          onDefaultUnitChange={defaultUnitStore.set}
          unitOptions={UNIT_OPTIONS}
          textSize={textSize}
          onTextSizeChange={setTextSize}
        />
      </div>
    ),
    compare: (
      <CompareWorkspaceContent
        items={compareItems}
        onRemoveItem={removeCompareItem}
        onClearAll={clearCompare}
        maxCompare={maxCompare}
      />
    ),
  }), [
    issues, showSettingsPreview, input, dispatch, selectedProfile, activeFamily,
    showInlineMaterial, showInlinePrice, defaultUnit, presetsForProfile, removePreset,
    reverse, result, isPending, isCurrentSaved, handleOpenSaveDialog, handleRemoveSaved,
    handleCompare, canCompare, currentIsInCompare, compareItems, maxCompare,
    handleAddToProject, projectCount, normalizedCurrentProfile, weightAsMain,
    removeCompareItem, clearCompare,
    saved, handleLoad, handleApplyTemplate, handleTemplateAddToProject, handleRemoveTemplatePart, handleReorderTemplatePart, removeSaved, removeSavedMany, duplicateSaved, duplicateSavedMany, updateSaved,
    projects, activeProjectId, setActiveProjectId, createProject, renameProject,
    deleteProject, duplicateProject, removeCalculation, updateCalculationNote,
    updateProjectDescription, updateProjectPaintingSettings, addCalculation,
    resetAll, compareLimit, setCompareLimit, isCompareMobileCapped,
    navigateToTab, handleSavePreset, textSize, setTextSize,
  ]);

  const mobileScreen =
    currentTab === "calculator" ? (
      <MobilePageCard>
        <div className="px-2.5 pb-0 pt-2">
          <IssueList issues={issues} />
        </div>

        {showSettingsPreview && (
          <div className="px-2.5 pb-0.5 pt-1.5">
            <SettingsSummary input={input} onOpen={() => navigateToTab("settings")} />
          </div>
        )}

        <div className="px-2.5 py-1.5">
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

        <div className="pb-4">
          <ReversePanel
            reverse={reverse}
            isManualProfile={selectedProfile.mode === "manual"}
            input={input}
          />
        </div>
      </MobilePageCard>
    ) : currentTab === "saved" ? (
      <MobilePageCard className="p-4">
        <HistoryPanel
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
          weightAsMain={weightAsMain}
        />
      </MobilePageCard>
    ) : currentTab === "projects" ? (
      <MobilePageCard className="flex min-h-[60dvh] flex-col">
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
      </MobilePageCard>
    ) : (
      <MobilePageCard className="flex min-h-[60dvh] flex-col">
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
          onDefaultUnitChange={defaultUnitStore.set}
          unitOptions={UNIT_OPTIONS}
          textSize={textSize}
          onTextSizeChange={setTextSize}
        />
      </MobilePageCard>
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
        className={`flex flex-col px-0 transition-[margin-left] duration-200 ease-in-out md:px-6 ${
          isMultiColumn
            ? "h-dvh overflow-hidden pt-0 pb-0 lg:pt-4 lg:pb-4"
            : "mx-auto min-h-dvh max-w-7xl pb-32 pt-10 lg:pb-6 lg:pt-6"
        } ${
          sidebarCollapsed ? "lg:ml-[56px]" : "lg:ml-[220px]"
        }`}
      >
        <header
          className="fixed inset-x-0 top-0 z-[70] flex items-center gap-2.5 border-b border-border-faint bg-surface/95 px-3 py-1.5 backdrop-blur-md lg:hidden"
          style={{ paddingTop: "max(0.375rem, env(safe-area-inset-top, 0px))" }}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-inverted">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
              <rect x="11.5" y="7.6" width="1" height="8.9" fill="currentColor" className="text-surface" />
              <rect x="8" y="16.5" width="8" height="1.5" rx="0.5" fill="currentColor" className="text-surface" />
              <rect x="2" y="5" width="20" height="1.5" rx="0.5" fill="currentColor" className="text-surface" />
              <circle cx="12" cy="5.75" r="1.8" fill="currentColor" className="text-surface" />
              <rect x="2.8" y="6.5" width="1" height="4.5" fill="currentColor" className="text-surface" />
              <rect x="20.2" y="6.5" width="1" height="4.5" fill="currentColor" className="text-surface" />
              <ellipse cx="3.3" cy="11.8" rx="2.8" ry="1" fill="currentColor" className="text-surface" />
              <ellipse cx="20.7" cy="11.8" rx="2.8" ry="1" fill="currentColor" className="text-surface" />
              <rect x="2" y="21" width="20" height="1.5" rx="0.75" fill="#d97706" />
            </svg>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="truncate text-xs font-semibold tracking-tight">{mobileHeaderTitle}</h1>
            <p className="flex items-center gap-1 truncate text-2xs leading-tight text-muted">
              {normalizedCurrentProfile && (
                <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded bg-surface-inset text-muted-faint">
                  <ProfileIcon category={normalizedCurrentProfile.iconKey} className="h-2 w-2" />
                </span>
              )}
              <span className="truncate">{mobileHeaderSubtitle}</span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {compareItems.length > 0 && (
              <button
                type="button"
                onClick={openCompare}
                className="inline-flex items-center gap-1 rounded-md border border-blue-border bg-blue-surface px-2 py-1 text-xs font-semibold text-blue-text"
                aria-label={t("sidebar.compare")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                  <rect x="3" y="3" width="7" height="18" rx="1" />
                  <rect x="14" y="3" width="7" height="18" rx="1" />
                </svg>
                {compareItems.length}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowChangelogDrawer(true)}
              className="rounded-md p-1.5 text-muted-faint transition-colors hover:bg-surface-inset hover:text-foreground-secondary"
              aria-label={t("changelog.title")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </button>
            <button
              type="button"
              onClick={cycleTheme}
              className="rounded-md p-1.5 text-muted-faint transition-colors hover:bg-surface-inset hover:text-foreground-secondary"
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
          </div>
        </header>

        <PwaRegister />

        {isMultiColumn ? (
          <MultiColumnLayout
            layout={columnLayout}
            contentMap={columnContentMap}
            maxColumnsAllowed={maxColumnsAllowed}
          />
        ) : (
          desktopMain
        )}

        <div
          className="lg:hidden"
          onTouchStart={handleMobileTouchStart}
          onTouchEnd={handleMobileTouchEnd}
          style={{ paddingBottom: resultBarBottomPadding }}
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, x: pageDirection >= 0 ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: pageDirection >= 0 ? -20 : 20 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="grid gap-4"
            >
              {mobileScreen}
            </motion.div>
          </AnimatePresence>
        </div>

        <ResultBar
          result={result}
          isPending={isPending}
          isSaved={isCurrentSaved}
          onOpenSaveDialog={handleOpenSaveDialog}
          onRemoveSaved={handleRemoveSaved}
          onExpand={() => setShowOverlay(true)}
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

        <BottomTabBar
          activeTab={currentTab}
          onTabChange={navigateToTab}
          projectCount={projectCount}
          compareCount={compareItems.length}
          savedCount={saved.length}
        />

        {showOverlay && result && (
          <ResultOverlay
            result={result}
            includeVat={input.includeVat}
            wastePercent={input.wastePercent}
            vatPercent={input.vatPercent}
            isSaved={isCurrentSaved}
            onOpenSaveDialog={handleOpenSaveDialog}
            onRemoveSaved={handleRemoveSaved}
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
        )}

        {!isMobile && !(isMultiColumn && columnLayout.hasPanel("saved")) && (
          <HistoryDrawer
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
            weightAsMain={weightAsMain}
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
            onDefaultUnitChange={defaultUnitStore.set}
            unitOptions={UNIT_OPTIONS}
            textSize={textSize}
            onTextSizeChange={setTextSize}
          />
        )}

        <ContactDrawer open={showContactDrawer} onClose={() => setShowContactDrawer(false)} />

        <ChangelogDrawer open={showChangelogDrawer} onClose={() => setShowChangelogDrawer(false)} />

        <CompareDrawer
          open={showCompareDrawer && !(isMultiColumn && columnLayout.hasPanel("compare"))}
          onClose={closeCompare}
          items={compareItems}
          onRemoveItem={removeCompareItem}
          onClearAll={clearCompare}
          maxCompare={maxCompare}
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

        {result && (
          <SaveToProjectModal
            open={showSaveModal}
            onClose={() => setShowSaveModal(false)}
            projects={projects}
            onCreateProject={createProject}
            onAddCalculation={addCalculation}
            currentInput={input}
            currentResult={result}
            onOpenDrawer={() => navigateToTab("projects")}
          />
        )}
      </div>

      <QuickCalcPalette quickCalc={quickCalc} onLoadEntry={handleQuickCalcLoad} presets={presets} />

      <ShortcutsModal open={showShortcutsModal} onClose={() => setShowShortcutsModal(false)} />

      <TemplateBuilder
        key={templateBuilderSession}
        open={showTemplateBuilder}
        onClose={() => setShowTemplateBuilder(false)}
        onSave={handleConfirmSave}
        onAppendToTemplate={handleAppendTemplateParts}
        savedTemplates={saved.map((entry) => ({ id: entry.id, name: entry.name, partCount: entry.parts.length }))}
        defaultName={defaultSaveName}
        seedInput={input}
        seedResult={result}
      />

      <SavePresetModal
        open={presetModalOpen}
        onClose={() => setPresetModalOpen(false)}
        onSave={handleConfirmSavePreset}
        defaultLabel={presetDefaultLabel}
        profileName={presetProfileName}
      />
    </>
  );
}
