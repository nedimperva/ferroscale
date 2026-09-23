"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { getAppTabFromPathname } from "@/lib/app-shell";
import { useTheme } from "@/hooks/useTheme";
import { useCountUp, markExternalValueChange } from "@/hooks/useCountUp";
import { isAssemblyEntry, useSaved } from "@/hooks/useSaved";
import { libraryAssemblies } from "./projects/insert-assembly-modal";
import type { SavedEntry, SavedPartDraft } from "@/hooks/useSaved";
import { useCompare } from "@/hooks/useCompare";
import { isArchivedProject, useProjects } from "@/hooks/useProjects";
import { usePriceBook } from "@/hooks/usePriceBook";
import { buildSizePresetLookup } from "@/lib/saved/size-presets";
import { useQuickHistory } from "@/hooks/useQuickHistory";
import { useSyncAttention } from "@/hooks/useSyncAttention";
import { calculateMetal, cmdParse, cmdTokenize, inputToQuery } from "@ferroscale/metal-core";
import {
  cmdSuggest,
  cmdApplyInsert,
  cmdAppendLineItem,
  cmdDetectStage,
  cmdParseLine,
  cmdPasteIntoLine,
  cmdSplitLine,
} from "@ferroscale/metal-core";
import { COMMAND_ALIAS_RE } from "@ferroscale/metal-core";
import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import {
  currentProjectStore,
  defaultUnitStore,
  massTolerancePercentStore,
  sharedCalcSettingsStore,
  weightAsMainStore,
} from "@/lib/settings-stores";
import type {
  CommandParseResult,
  CommandParserSettings,
  CommandSuggestionItem,
} from "@ferroscale/metal-core";
import { formatCommandParseName, buildCommandSummary } from "./command-copy";
import { buildShareCardModel } from "./line-summary";
import { CommandHelpSheet } from "./sheets/help-sheet";
import { commandTargetNote } from "./target-note";
import { massBand } from "./mass-band";
import { activeItemText, applyToActiveItem, tweakActiveItem } from "./line-edit";
import { CommandToast, ResultAnnouncer } from "./command-atoms";
import { useCommandToast } from "./use-command-toast";
import { useShellViewport } from "./use-shell-viewport";
import { CommandKeypad } from "./command-keypad";
import { ProfileDiscoveryTiles } from "./profile-discovery-tiles";
import {
  commandKeypadInsert,
  commandKeypadLayout,
  type CommandKeypadOverride,
} from "./keypad-layout";
import { CommandDesktop } from "./desktop/command-desktop";
import { PhoneTopBar } from "./phone/phone-top-bar";
import { PhoneHero } from "./phone/phone-hero";
import { SessionRibbon } from "./phone/session-ribbon";
import { PhoneSuggestionStrip } from "./phone/suggestion-strip";
import { PhoneQueryLine } from "./phone/query-line";
import { CommandLibrarySheet } from "./sheets/library-sheet";
import { useProjectActions } from "./projects/use-project-actions";
import { CommandResultSheet } from "./sheets/result-sheet";
import { CommandSettingsSheet } from "./sheets/settings-sheet";
import { SavedEditSheet } from "./sheets/saved-edit-sheet";
import { DestinationSheet, type DestinationSubject } from "./sheets/destination-sheet";
import { PwaRegister } from "@/components/pwa-register";
import {
  buildShareUrl,
  readSharedPricing,
  readSharedQuery,
  sharedPricingDiffers,
} from "@/lib/command/share";
import { shareCalculation } from "@/lib/command/share-card";
import { buildUsageSource, recordCommandUsage, usageStatsVersionStore } from "@/lib/usage-stats";
import { loadQuickHistory } from "@/lib/sync/collections";
import { haptic } from "@/lib/haptics";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";

import { DEMO_QUERY } from "./command-constants";

/**
 * The rate getDefaultInput() seeds. Matching it means nobody has said what
 * steel costs yet, so every currency figure on screen is a placeholder.
 */
const SEEDED_UNIT_PRICE = 1.2;
/** Set after the first visit, so the demo query greets newcomers only. */
const ONBOARDED_KEY = "ferroscale-onboarded";

/** The newest line this device ran — read straight from storage because the
 *  history hook hydrates a tick later than the first paint. */
function loadLastQuery(): string | null {
  const [newest] = loadQuickHistory();
  return newest?.trim() || null;
}

function formatPriceTokenValue(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Number(value.toFixed(4)).toString();
}

export function CommandShell() {
  const t = useTranslations("command");
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  // Shared app settings.
  const shared = useSyncExternalStore(
    sharedCalcSettingsStore.subscribe,
    sharedCalcSettingsStore.getSnapshot,
    sharedCalcSettingsStore.getServerSnapshot,
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

  // App-wide libraries (saves, compare, projects).
  const {
    saved: savedEntries,
    saveCalculation,
    getSavedEntry,
    removeSaved,
    removeSavedMany,
    restoreSaved,
    duplicateSaved,
    addPartToSaved,
    appendPartsToSaved,
    removePartFromSaved,
    toggleSavedPinned,
    updateSaved,
    markSavedUsed,
  } = useSaved();
  const {
    items: compareItems,
    addItem: addCompareItem,
    removeItem: removeCompareItem,
    clearAll: clearCompare,
    isDuplicate: isInCompare,
  } = useCompare();
  const projectsApi = useProjects();
  const {
    projects,
    createProject,
    addCalculation,
    addCalculations,
    insertAssembly,
  } = projectsApi;
  const priceBook = usePriceBook();

  const currentProjectId = useSyncExternalStore(
    currentProjectStore.subscribe,
    currentProjectStore.getSnapshot,
    currentProjectStore.getServerSnapshot,
  );

  /** The library's multi-part entries — what a project can be built out of. */
  const assembliesInLibrary = useMemo(() => libraryAssemblies(savedEntries), [savedEntries]);

  const [query, setQuery] = useState("");
  /**
   * Whether the line that this visit starts on is settled. A `?q=` share link
   * and the last query this device ran are both applied in an effect, so the
   * first paint always has an empty bar — and anything that only shows on an
   * empty bar would flash before the line arrived.
   */
  const [queryHydrated, setQueryHydrated] = useState(false);
  // The URL only mirrors the query once the user has entered a calculation
  // (or arrived via a share link) — a pristine visit keeps a clean URL.
  const touchedRef = useRef(false);
  // weightAsMain decides the default hero metric; the toggle is a local override.
  const [modeOverride, setModeOverride] = useState<"weight" | "price" | null>(null);
  const massTolerancePercent = useSyncExternalStore(
    massTolerancePercentStore.subscribe,
    massTolerancePercentStore.getSnapshot,
    massTolerancePercentStore.getServerSnapshot,
  );
  const pathname = usePathname();
  const [sheet, setSheet] = useState<null | "result" | "settings" | "library" | "help">(null);
  /** Which Library tab the next open lands on — the palette navigates here. */
  const [libraryTab, setLibraryTab] = useState<
    "session" | "saved" | "compare" | "projects" | null
  >(null);
  const { toast, showToast, showActionToast } = useCommandToast();
  // Sync runs by itself; this is only set when it needs the user.
  const syncAttention = useSyncAttention();
  // Query history — persisted (and Drive-synced) via the quickHistory
  // collection. Backs the desktop session tape and recency suggestions.
  const {
    history: quickHistory,
    push: pushHistory,
    remove: removeHistoryEntry,
    clear: clearHistory,
  } = useQuickHistory();
  /**
   * The destination overlay: what it is acting on, and which row it opens on.
   * A null subject means it is closed. It replaces the save picker, the
   * project picker and the rename-after-save sheet.
   */
  const [destination, setDestination] = useState<{ entry: SavedEntry | null } | null>(null);
  // Which saved entry the name/notes/tags editor is open for (id, not the
  // record, so the sheet always renders the live version of it).
  const [editingSavedId, setEditingSavedId] = useState<string | null>(null);
  const { isPhoneViewport, isWideViewport, isCompactDesktop } = useShellViewport();
  /** Letters / number pad chosen by hand. Cleared when the active item empties. */
  const [keypadOverride, setKeypadOverride] = useState<CommandKeypadOverride>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const firstSuggestionRef = useRef<HTMLButtonElement | null>(null);

  const parserSettings: CommandParserSettings = useMemo(
    () => ({
      pricing: {
        priceBasis: shared.priceBasis,
        priceUnit: shared.priceUnit,
        unitPrice: shared.unitPrice,
        currency: shared.currency,
        wastePercent: shared.wastePercent,
        includeVat: shared.includeVat,
        vatPercent: shared.vatPercent,
      },
      defaultGradeId: shared.defaultGradeId,
      defaultLengthUnit: defaultUnit,
      gradeRates: priceBook.rates,
    }),
    [shared, defaultUnit, priceBook.rates],
  );

  // Once the user leaves the demo query, mirror the query into the URL so the
  // current calculation is always linkable (debounced; replaceState keeps
  // history clean). The rate context rides along, so whatever is in the
  // address bar prices the same for whoever it's sent to.
  useEffect(() => {
    if (!touchedRef.current) {
      if (!query.trim() || query === DEMO_QUERY) return;
      touchedRef.current = true;
    }
    const id = window.setTimeout(() => {
      window.history.replaceState(null, "", buildShareUrl(query, window.location, shared));
    }, 400);
    return () => window.clearTimeout(id);
  }, [query, shared]);

  // The boot splash covers SSR→hydration on slow loads; once this shell is
  // mounted it is obsolete, and on a fast load it would still be playing its
  // own fade for another few hundred ms. Retire it the moment we exist.
  useEffect(() => {
    document.documentElement.classList.add("app-ready");
  }, []);

  // Deep links on a phone. The workspace reads the route into its own tab, but
  // the phone shell ignored it: /saved, /projects and /settings all rendered
  // the calculator while the tab title still said "Settings". A bookmark or a
  // link shared with someone holding a phone landed on the wrong screen.
  //
  // The phone has no tabs — those views live in sheets — so the route opens
  // the matching sheet instead. Runs once the viewport is known, and only for
  // a route that names one.
  const routedTab = getAppTabFromPathname(pathname);
  const routeHandledRef = useRef(false);
  useEffect(() => {
    if (!isPhoneViewport || routeHandledRef.current) return;
    if (!routedTab || routedTab === "calculator") return;
    routeHandledRef.current = true;
    // setState-in-effect is intentional, same as the persisted-state hydration
    // below: the viewport width is not known during SSR, so first paint has to
    // match the server's sheet-less render before the route is applied.
    if (routedTab === "settings") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSheet("settings");
      return;
    }
    setLibraryTab(routedTab === "projects" ? "projects" : "saved");
    setSheet("library");
  }, [isPhoneViewport, routedTab]);

  // Closing the sheet returns the address bar to the calculator, so Back and a
  // refresh agree with what is on screen. replaceState, like the workspace —
  // no navigation, nothing remounts.
  const resetRouteToCalculator = useCallback(() => {
    if (typeof window === "undefined") return;
    let base = window.location.pathname;
    for (const suffix of ["/saved", "/projects", "/settings"]) {
      if (base.endsWith(suffix)) {
        base = base.slice(0, -suffix.length);
        break;
      }
    }
    const stripped = base.replace(/\/+$/, "");
    window.history.replaceState(
      null,
      "",
      `${stripped === "" ? "/" : stripped}${window.location.search}`,
    );
  }, []);

  const closeSheet = useCallback(() => {
    setSheet(null);
    if (isPhoneViewport) resetRouteToCalculator();
  }, [isPhoneViewport, resetRouteToCalculator]);

  /** Open the library sheet on one of its tabs. */
  const openLibrary = useCallback((tab: "session" | "saved" | "projects") => {
    setLibraryTab(tab);
    setSheet("library");
  }, []);

  // A line can hold several `+`-joined items. `p` is the one being typed —
  // every existing behaviour (chips, suggestions, save, compare) acts on it,
  // and a one-item line is exactly what it always was.
  const line = useMemo(
    () => cmdParseLine(query, parserSettings),
    [query, parserSettings],
  );
  const p: CommandParseResult = line.items[line.activeIndex].parse;
  const targetNote = commandTargetNote(p);

  /**
   * Has anyone told the app what steel costs? The seeded rate is a
   * placeholder, so until it moves — or the line carries its own `@rate`, or
   * the price book has one for this grade — every currency figure on screen is
   * derived from a number the user never entered.
   */
  const rateIsUserSupplied =
    p.priceOverride != null ||
    shared.unitPrice !== SEEDED_UNIT_PRICE ||
    priceBook.rates[p.gradeId ?? ""] != null;

  /**
   * The hero used to open on PRICE, so a first-time visitor met a large
   * EUR figure computed from the seeded rate, set in the same type as the
   * weight beside it. The weight is always real; the price is only real once
   * a rate exists. An explicit weightAsMain still wins, and anyone who has set
   * a rate sees exactly what they saw before.
   */
  const mode =
    modeOverride ?? (weightAsMain || !rateIsUserSupplied ? "weight" : "price");
  /** The item under the caret, as the suggestion engine should see it. */
  const activeQuery = useMemo(() => activeItemText(query), [query]);

  // Usage learning: after the user stops typing on a live result (~2.5 s),
  // record the query's tokens (per profile family) so suggestions rank real
  // habits first — no Save required. The pristine demo query never counts.
  // Zero on the server and on the first client paint, then whatever the store
  // holds — which also moves when a sync pull brings another device's habits
  // in, so suggestions pick those up without a reload.
  const usageVersion = useSyncExternalStore(
    usageStatsVersionStore.subscribe,
    usageStatsVersionStore.getSnapshot,
    usageStatsVersionStore.getServerSnapshot,
  );
  const [usageHydrated, setUsageHydrated] = useState(false);
  useEffect(() => {
    // Persisted habits are only readable once we're on the client.
    setUsageHydrated(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);
  useEffect(() => {
    if (!p.valid) return;
    if (!touchedRef.current && (!query.trim() || query === DEMO_QUERY)) return;
    const id = window.setTimeout(() => {
      // Record the canonical query, not the raw text: this drops half-typed
      // trailing tokens (a lone "@", an incomplete grade) so mid-edit pauses
      // don't each leave their own near-duplicate recent.
      // Every item counts, not just the one under the caret: a two-part line
      // is two things the user typed, and habits that learned only the last of
      // them would rank the wrong sizes first.
      for (const item of line.items) {
        const parse = item.parse;
        const canonical =
          (parse.calc &&
            inputToQuery(parse.calc.input, defaultUnit, {
              defaultGradeId: shared.defaultGradeId,
              defaultPricing: shared,
            })) ||
          item.text.trim();
        recordCommandUsage(parse, canonical);
      }
    }, 2500);
    return () => window.clearTimeout(id);
  }, [p, line, query, defaultUnit, shared]);
  const usageSource = useMemo(() => {
    // usageVersion is the invalidation signal, not an input: recording a query
    // or pulling a peer's habits bumps it, and the source rebuilds from storage.
    void usageVersion;
    return usageHydrated ? buildUsageSource() : undefined;
  }, [usageHydrated, usageVersion]);

  // `p` is handed over so the suggestion engine doesn't parse the same query
  // a second time on every keystroke.
  // Library entries are the size suggestions: a saved part already is a size,
  // a grade and a length, so nothing else has to store one.
  const sizePresetsForProfile = useMemo(
    () => buildSizePresetLookup(savedEntries),
    [savedEntries],
  );
  const sug = useMemo(
    () => cmdSuggest(activeQuery, parserSettings, sizePresetsForProfile, usageSource, p),
    [activeQuery, parserSettings, sizePresetsForProfile, usageSource, p],
  );

  // Auto-close result sheet if query becomes invalid (derive, don't setState)
  const effectiveSheet = sheet === "result" && !p.valid ? null : sheet;

  const sym = CURRENCY_SYMBOLS[shared.currency] ?? "€";
  const priceKeyUnit = shared.priceUnit === "piece" ? "pc" : shared.priceUnit;
  const priceUnitLabel = `${sym}/${priceKeyUnit}`;
  const isW = mode === "weight";

  // Hydrate persisted state on mount. setState-in-effect is intentional here:
  // initial SSR/first-paint values must match defaults to avoid hydration
  // mismatches, then we apply localStorage once on the client.
  useEffect(() => {
    // Old keys orphaned by previous refactors — drop them.
    try {
      window.localStorage.removeItem("ferroscale-command-settings");
      window.localStorage.removeItem("ferroscale-command-saved");
      window.localStorage.removeItem("ferroscale-command-recents");
    } catch { /* noop */ }
    // A shared ?q= link beats the demo query. Trailing space → fully chipped.
    const sharedQuery = readSharedQuery(window.location.search);
    if (!sharedQuery) {
      // Returning visit: start on the line this user last ran, not on the demo
      // query they've now seen a hundred times. Selected, so one keystroke
      // replaces it — and the demo still greets a first visit.
      if (window.localStorage.getItem(ONBOARDED_KEY)) {
        const last = loadLastQuery();
        if (last) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setQuery(`${last} `);
          markExternalValueChange();
          touchedRef.current = true;
          requestAnimationFrame(() => inputRef.current?.select());
        }
      } else {
        try {
          window.localStorage.setItem(ONBOARDED_KEY, "1");
        } catch { /* noop */ }
      }
      setQueryHydrated(true);
      return;
    }
    setQuery(`${sharedQuery} `);
    markExternalValueChange();
    touchedRef.current = true;
    // A link carries the sender's rate context. Apply it (otherwise the same
    // link shows a different price to every recipient) and say so out loud —
    // silently rewriting someone's pricing settings would be worse.
    const linkPricing = readSharedPricing(window.location.search);
    if (linkPricing && sharedPricingDiffers(linkPricing, sharedCalcSettingsStore.getSnapshot())) {
      sharedCalcSettingsStore.update(linkPricing);
      showToast(t("toast.linkPricingApplied"));
    }
    setQueryHydrated(true);
  }, [showToast, t]);

  // Copy the hero metric itself (e.g. "141.2 kg" / "€169.44") — the query
  // string has its own copy action.
  const copyValue = useCallback(() => {
    if (!p.valid) return;
    const text = isW
      ? p.totalKg != null
        ? `${fsWeight(p.totalKg)} ${fsWeightUnit()}`
        : ""
      : p.totalAmount != null
        ? `${sym}${fsMoney(p.totalAmount)}`
        : "";
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => {});
    showToast(t("toast.copiedValue"));
  }, [p, isW, sym, showToast, t]);

  // Desktop's single Copy action: a clean, paste-ready text summary of the
  // live result (replaces the old copy-query / copy-value pair).
  const copySummary = useCallback(() => {
    const summary = buildCommandSummary(t, p, line, { rateIsUserSupplied });
    if (!summary) return;
    navigator.clipboard?.writeText(summary).catch(() => {});
    showToast(t("toast.copiedSummary"));
  }, [t, p, line, showToast, rateIsUserSupplied]);

  const shareLink = useCallback(() => {
    if (!p.valid) return;
    const url = buildShareUrl(query, window.location, shared);
    if (isPhoneViewport) {
      const card = buildShareCardModel(t, p, line, query);
      void shareCalculation({
        summary: buildCommandSummary(t, p, line, { rateIsUserSupplied }),
        url,
        title: card.title,
        card,
      }).then((how) => {
        if (how === "copied") showToast(t("toast.copiedSummary"));
      });
      return;
    }
    navigator.clipboard?.writeText(url).catch(() => {});
    showToast(t("toast.linkCopied"));
  }, [p, line, query, shared, isPhoneViewport, showToast, t, rateIsUserSupplied]);

  // The bookmark state of the line currently in the bar — drives the Save
  // button's filled/outlined look, so "is this one saved?" is answerable
  // without opening the library.
  // Same guard as doSave: a multi-item line saves as a new assembly every
  // time, so matching it against one of its own parts would show "saved" on a
  // button that is about to create something.
  const currentSavedEntry = !line.multi && p.calc ? getSavedEntry(p.calc.result) : undefined;

  /**
   * The job being worked out of: the last project something was filed into,
   * as long as it is still there and still open. An archived or deleted one
   * leaves the primary action as a plain save rather than naming a job that
   * no longer exists.
   */
  const currentProject = useMemo(
    () =>
      projects.find(
        (project) =>
          project.id === currentProjectId && !project.deletedAt && !isArchivedProject(project),
      ) ?? null,
    [projects, currentProjectId],
  );

  /** Delete with a 5-second Undo — the tombstone is reversible until then. */
  const removeSavedEntry = useCallback(
    (entry: SavedEntry) => {
      removeSaved(entry.id);
      showActionToast(t("toast.savedRemoved"), {
        label: t("common.undo"),
        onAction: () => {
          restoreSaved(entry.id);
          showToast(t("toast.restored"));
        },
      });
    },
    [removeSaved, restoreSaved, showActionToast, showToast, t],
  );

  /**
   * What a multi-cut line is called before anyone names it.
   *
   * It used to be whatever the *active* cut was called, so saving
   * "hea140 3m + plt200x160x12 x2" from the picker produced an assembly named
   * "Plate 200×160×12" — the item the caret happened to be on, not the thing
   * being saved. The first cut plus a count is at least recognisable in a
   * list, and searchable by the profile that leads it.
   */
  const assemblyDefaultName = useCallback(() => {
    const first = line.items[0]?.parse;
    const lead = first
      ? formatCommandParseName(t, first) ?? first.calc?.result.profileLabel ?? ""
      : "";
    const more = line.items.length - 1;
    if (!lead) return t("saved.assemblyName", { count: line.items.length });
    return more > 0 ? t("saved.assemblyDefaultName", { first: lead, more }) : lead;
  }, [line, t]);

  /**
   * Save is a toggle: bookmark the line, or un-bookmark it if it's already
   * there. It used to no-op on a duplicate and still report "Saved".
   */
  const doSave = useCallback(() => {
    if (!p.calc) {
      showToast(t("toast.addLength"));
      return;
    }
    // Save is a toggle for a single line. A multi-item line is a new object
    // every time — matching it against one of its own parts would un-save that
    // part instead of saving the assembly.
    const existing = line.multi ? null : getSavedEntry(p.calc.result);
    if (existing) {
      removeSavedEntry(existing);
      return;
    }
    // The name is just the spec — the card renders length/qty/grade itself, so
    // repeating them in the title only bought truncation. Rename to override.
    const autoName = formatCommandParseName(t, p) ?? p.name ?? p.calc.result.profileLabel;
    // A line of several items is an assembly — a gate frame, a railing bay —
    // so it saves as one entry with a part per item, which is exactly what the
    // saved model already holds.
    const parts = line.multi
      ? line.items
          .map((item) => item.parse)
          .filter((parse) => parse.calc)
          .map((parse) => ({
            name: formatCommandParseName(t, parse) ?? parse.calc!.result.profileLabel,
            input: parse.calc!.input,
            result: parse.calc!.result,
          }))
      : undefined;
    const entry = saveCalculation(
      p.calc.input,
      p.calc.result,
      line.multi ? assemblyDefaultName() : autoName,
      undefined,
      undefined,
      parts,
    );
    haptic("commit");
    for (const item of line.items) pushHistory(item.text.trim());
    if (line.multi) {
      // An assembly's placeholder name says nothing a search could find. It
      // used to be fixed by opening the rename sheet unasked — a third
      // overlay in a row nobody reached for. Naming now belongs to the save
      // step itself, so the toast offers it like every other save.
      showActionToast(t("toast.savedAssembly", { count: line.items.length }), {
        label: t("common.nameIt"),
        onAction: () => setEditingSavedId(entry.id),
      });
    } else {
      showActionToast(t("toast.saved"), {
        label: t("common.nameIt"),
        onAction: () => setEditingSavedId(entry.id),
      });
    }
  }, [
    p,
    line,
    assemblyDefaultName,
    getSavedEntry,
    removeSavedEntry,
    saveCalculation,
    showToast,
    showActionToast,
    t,
    pushHistory,
  ]);

  /**
   * Fold the line currently in the bar into a saved entry as another part.
   * A saved entry with several parts is a bill of materials — a gate frame, a
   * railing bay — which the storage model always supported and nothing surfaced.
   */
  const addCurrentAsPart = useCallback(
    (entry: SavedEntry) => {
      if (!p.calc) {
        showToast(t("toast.addLength"));
        return;
      }
      const partName = formatCommandParseName(t, p) ?? p.calc.result.profileLabel;
      if (addPartToSaved(entry.id, p.calc.input, p.calc.result, partName)) {
        haptic("commit");
        showToast(t("toast.partAdded", { name: entry.name }));
      }
    },
    [p, addPartToSaved, showToast, t],
  );

  /**
   * Add parts by typing a cut, from the entry itself — the path that does not
   * require a trip through the bar. The line goes through the same parser the
   * bar uses, so a multi-item line ("hea140 3m + plt200x160x12 x2") appends
   * every item at once.
   */
  const addPartsByCommand = useCallback(
    (entry: SavedEntry, command: string): boolean => {
      const text = command.trim();
      if (!text) return false;
      const parsedLine = cmdParseLine(text, parserSettings);
      const drafts = parsedLine.items
        .map((item) => item.parse)
        .filter((parse) => parse.calc)
        .map((parse) => ({
          name: formatCommandParseName(t, parse) ?? parse.calc!.result.profileLabel,
          input: parse.calc!.input,
          result: parse.calc!.result,
        }));
      if (drafts.length === 0) return false;
      if (!appendPartsToSaved(entry.id, drafts)) return false;
      haptic("commit");
      showToast(t("toast.partAdded", { name: entry.name }));
      return true;
    },
    [parserSettings, appendPartsToSaved, showToast, t],
  );

  /**
   * The parts of the current line, as drafts. One item for a plain line, one
   * per item for a multi-item one — the same shape `doSave` already builds.
   */
  const currentLineDrafts = useCallback((): SavedPartDraft[] => {
    if (!p.calc) return [];
    if (!line.multi) {
      return [{
        name: formatCommandParseName(t, p) ?? p.calc.result.profileLabel,
        input: p.calc.input,
        result: p.calc.result,
      }];
    }
    return line.items
      .map((item) => item.parse)
      .filter((parse) => parse.calc)
      .map((parse) => ({
        name: formatCommandParseName(t, parse) ?? parse.calc!.result.profileLabel,
        input: parse.calc!.input,
        result: parse.calc!.result,
      }));
  }, [p, line, t]);

  const saveLineAsNew = useCallback(
    (name: string, asAssembly: boolean) => {
      if (!p.calc) return;
      const drafts = currentLineDrafts();
      const entry = saveCalculation(
        p.calc.input,
        p.calc.result,
        name,
        undefined,
        undefined,
        drafts.length > 1 ? drafts : undefined,
        // A one-part assembly is a real thing to start and grow, so the
        // intent is recorded rather than inferred from the part count.
        asAssembly,
      );
      haptic("commit");
      for (const item of line.items) pushHistory(item.text.trim());
      setDestination(null);
      showActionToast(t("toast.saved"), {
        label: t("common.nameIt"),
        onAction: () => setEditingSavedId(entry.id),
      });
    },
    [p, line, currentLineDrafts, saveCalculation, pushHistory, showActionToast, t],
  );

  const duplicateSavedEntry = useCallback(
    (entry: SavedEntry) => {
      duplicateSaved(entry.id);
      showToast(t("toast.duplicated"));
    },
    [duplicateSaved, showToast, t],
  );

  const removeSavedEntries = useCallback(
    (entries: SavedEntry[]) => {
      if (entries.length === 0) return;
      const ids = entries.map((entry) => entry.id);
      removeSavedMany(ids);
      showActionToast(t("toast.savedRemovedMany", { count: ids.length }), {
        label: t("common.undo"),
        onAction: () => {
          restoreSaved(ids);
          showToast(t("toast.restored"));
        },
      });
    },
    [removeSavedMany, restoreSaved, showActionToast, showToast, t],
  );

  // Enter only logs the line onto the session tape — bookmarking into the
  // Saved library is the explicit Save action (doSave) alone.
  const logToSession = useCallback(() => {
    if (!line.valid) {
      haptic("warn");
      showToast(t("toast.addLength"));
      return;
    }
    haptic("commit");
    // The tape is a list of calculations, so a line of several lands as
    // several — that is what makes it add up and become a project.
    for (const item of line.items) pushHistory(item.text.trim());
    showToast(
      line.multi
        ? t("toast.addedItemsToSession", { count: line.items.length })
        : t("toast.addedToSession"),
    );
  }, [line, pushHistory, showToast, t]);

  /**
   * Swap the bar's contents from anywhere (compare, parts, history, library).
   * When work is already on the line, the swap is one Undo away rather than a
   * silent loss — same contract as deletes.
   */
  const replaceQuery = useCallback(
    (next: string) => {
      const prevTrim = query.trim();
      const nextTrim = next.trim();
      setQuery(next);
      markExternalValueChange();
      setSheet(null);
      if (prevTrim && prevTrim !== nextTrim) {
        showActionToast(t("toast.lineReplaced"), {
          label: t("common.undo"),
          onAction: () => {
            setQuery(`${prevTrim} `);
            markExternalValueChange();
            showToast(t("toast.restored"));
          },
        });
      }
    },
    [query, showActionToast, showToast, t],
  );

  const loadInput = useCallback(
    (input: CalculationInput) => {
      const q = inputToQuery(input, defaultUnit, {
        defaultGradeId: shared.defaultGradeId,
        defaultPricing: shared,
      });
      if (q) replaceQuery(q);
    },
    [defaultUnit, shared, replaceQuery],
  );

  /** Put a history line back in the bar, fully chipped. */
  const loadQuery = useCallback(
    (entry: string) => {
      replaceQuery(`${entry} `);
    },
    [replaceQuery],
  );

  /** Every part of a saved entry as one `+`-joined command line. */
  const savedEntryQuery = useCallback(
    (entry: SavedEntry) =>
      entry.parts
        .map((part) =>
          inputToQuery(part.input, defaultUnit, {
            defaultGradeId: shared.defaultGradeId,
            omitPrice: true,
          }),
        )
        .filter(Boolean)
        .join(" + "),
    [defaultUnit, shared.defaultGradeId],
  );

  /**
   * Open a saved entry. Counts the use (so "most used" sorting means
   * something) and restores at today's rate — `omitPrice` keeps the bar
   * showing the same money the card showed.
   *
   * An assembly restores as the whole line. Restoring only `entry.input` put
   * one part of a three-part gate frame in the bar and dropped the rest, which
   * looked like the assembly had been silently truncated.
   */
  const loadSavedEntry = useCallback(
    (entry: SavedEntry) => {
      markSavedUsed(entry.id);
      const q = savedEntryQuery(entry);
      if (q) replaceQuery(`${q} `);
    },
    [markSavedUsed, savedEntryQuery, replaceQuery],
  );

  /**
   * A saved entry's parts, re-run at today's pricing. The stored results are
   * a snapshot of the rate at save time; a project built from them would carry
   * prices the rest of the app has already moved on from.
   */
  const repriceSavedEntry = useCallback(
    (entry: SavedEntry) =>
      entry.parts
        .map((part) => {
          const q = inputToQuery(part.input, defaultUnit, {
            defaultGradeId: shared.defaultGradeId,
            omitPrice: true,
          });
          const parsed = q ? cmdParse(`${q} `, parserSettings) : null;
          if (!parsed?.calc) return null;
          return {
            id: part.id,
            name: part.name,
            input: parsed.calc.input,
            result: parsed.calc.result,
            normalizedProfile: part.normalizedProfile,
          };
        })
        .filter((part): part is NonNullable<typeof part> => part != null),
    [defaultUnit, shared.defaultGradeId, parserSettings],
  );

  /**
   * Fold the picker's subject into a library entry.
   *
   * It used to always append whatever was on the command bar, even when the
   * subject was a saved entry being sent somewhere — so "put this part into
   * that assembly" quietly appended the line instead of the part.
   */
  const appendSubjectTo = useCallback(
    (entryId: string, source: SavedEntry | null, count = 1) => {
      const mult = Math.max(1, Math.floor(count) || 1);
      const target = savedEntries.find((entry) => entry.id === entryId);
      if (!target) return;
      const base = source
        ? repriceSavedEntry(source).map((part) => ({
            name: part.name ?? part.result.profileLabel,
            input: part.input,
            result: part.result,
          }))
        : currentLineDrafts();
      if (base.length === 0) return;
      const drafts = Array.from({ length: mult }, () => base).flat();
      if (!appendPartsToSaved(entryId, drafts)) return;
      haptic("commit");
      if (!source) for (const item of line.items) pushHistory(item.text.trim());
      setDestination(null);
      showToast(t("toast.partAdded", { name: target.name }));
    },
    [
      currentLineDrafts,
      repriceSavedEntry,
      savedEntries,
      appendPartsToSaved,
      line,
      pushHistory,
      showToast,
      t,
    ],
  );

  /**
   * Commit whatever the picker was opened for. A saved entry with one part is
   * an ordinary item; an assembly goes in as a template entry so the project
   * keeps it as one named line with its parts behind it, the way it was saved.
   */
  const handlePickProject = useCallback(
    (projectId: string, entry: SavedEntry | null, count = 1) => {
      const mult = Math.max(1, Math.floor(count) || 1);
      let ok = false;
      if (entry) {
        const parts = repriceSavedEntry(entry);
        if (parts.length > 1 || isAssemblyEntry(entry)) {
          // The same door the project's own "+ Assembly" uses: one item per
          // cut, tagged with the assembly's name. This used to be a second
          // shape — a single composite row holding the parts inside it —
          // which meant the same assembly looked different depending on which
          // way you came in, could not have its cuts edited, and arrived
          // without the labour hours and hardware the assembly carries.
          ok = insertAssembly(projectId, entry, mult, entry.name);
        } else if (parts.length === 1) {
          // A single part scales by its own quantity: five of a cut that is
          // already ×2 is ten pieces, which is what "five of these" means.
          const input = { ...parts[0].input, quantity: (parts[0].input.quantity || 1) * mult };
          const calc = calculateMetal(input);
          ok = calc.ok
            ? addCalculation(projectId, input, calc.result)
            : addCalculation(projectId, parts[0].input, parts[0].result);
        }
      } else {
        // A `+`-joined line is several cuts, and every one of them belongs in
        // the project. This used to file the active item only, so two thirds
        // of a three-item line went quietly missing.
        const drafts = currentLineDrafts();
        if (drafts.length === 0) return;
        if (drafts.length === 1) {
          ok = addCalculation(projectId, drafts[0].input, drafts[0].result);
        } else {
          addCalculations(
            projectId,
            drafts.map((draft) => ({ input: draft.input, result: draft.result })),
          );
          ok = true;
        }
      }
      setDestination(null);
      const project = projects.find((item) => item.id === projectId);
      // Filing into a job is what makes it the job you are working out of, so
      // the calculator's primary action can name it next time.
      if (ok) currentProjectStore.set(projectId);
      showToast(
        ok
          ? t("toast.addedToProject", { project: project?.name ?? t("common.project") })
          : t("toast.projectFull"),
      );
    },
    [
      currentLineDrafts,
      repriceSavedEntry,
      addCalculation,
      addCalculations,
      insertAssembly,
      projects,
      showToast,
      t,
    ],
  );

  const addCompareEntry = useCallback(
    (input: CalculationInput, result: CalculationResult) => {
      if (isInCompare(result)) {
        showToast(t("toast.alreadyInCompare"));
        return;
      }
      addCompareItem(input, result);
      showToast(t("toast.addedToCompare"));
    },
    [isInCompare, addCompareItem, showToast, t],
  );

  const doCompare = useCallback(() => {
    if (!p.calc) return;
    addCompareEntry(p.calc.input, p.calc.result);
  }, [p.calc, addCompareEntry]);

  const projectActions = useProjectActions({
    projectsApi,
    saveCalculation,
    updateSaved,
    libraryAssemblies: assembliesInLibrary,
    onOpenItem: loadInput,
    currentCalc: p.calc,
    parserSettings,
    showToast,
    showActionToast,
  });

  /** The picker, for everywhere the primary action does not go. */
  const openDestinations = useCallback(() => {
    if (!p.calc) return;
    setSheet(null);
    setDestination({ entry: null });
  }, [p.calc]);

  /**
   * What the one save control does. With a job in play the line goes into it
   * — that is what the button says it will do. Without one, Save is the
   * bookmark it has always been, toggle included.
   */
  const primarySave = useCallback(() => {
    if (!p.calc) {
      showToast(t("toast.addLength"));
      return;
    }
    if (currentProject) {
      handlePickProject(currentProject.id, null);
      return;
    }
    doSave();
  }, [p.calc, currentProject, handlePickProject, doSave, showToast, t]);

  /**
   * Turn the session tape into a project in one gesture. The tape already
   * carries a running total; moving six lines into a project used to be six
   * rounds of recall → open picker → pick.
   */
  const saveSessionAsProject = useCallback(() => {
    const lines = quickHistory
      .map((entry) => cmdParse(entry, parserSettings))
      .filter((rp) => rp.calc != null);
    if (lines.length === 0) {
      showToast(t("toast.sessionEmpty"));
      return;
    }
    const name = t("toast.sessionProjectName", {
      date: new Date().toLocaleDateString(undefined, { day: "numeric", month: "short" }),
    });
    const project = createProject(name);
    // Oldest first, so the project reads in the order the work happened.
    const entries = [...lines]
      .reverse()
      .map((line) => ({ input: line.calc!.input, result: line.calc!.result }));
    addCalculations(project.id, entries);
    // The tape became the job, so it is the job — the next line's primary
    // action files into it instead of asking again.
    currentProjectStore.set(project.id);
    haptic("commit");
    showToast(t("toast.sessionSaved", { count: entries.length, project: name }));
  }, [quickHistory, parserSettings, createProject, addCalculations, showToast, t]);

  const newCalc = useCallback(() => {
    // A valid query cleared via ⌘K / CLEAR still lands on the session tape,
    // so starting a new line never loses the previous number.
    if (p.valid) pushHistory(query);
    setQuery("");
    markExternalValueChange();
  }, [p.valid, query, pushHistory]);

  const onSuggest = useCallback(
    (item: CommandSuggestionItem) => {
      if (item.kind === "save") {
        doSave();
        return;
      }
      if (item.kind === "item") {
        setQuery((q) => cmdAppendLineItem(q));
        return;
      }
      setKeypadOverride(null);
      setQuery((q) => applyToActiveItem(q, (text) => cmdApplyInsert(text, item)));
    },
    [doSave],
  );

  const onKey = useCallback((ch: string) => {
    setQuery((q) =>
      applyToActiveItem(q, (text) =>
        commandKeypadInsert(text, ch, cmdParse(text, parserSettings)),
      ),
    );
  }, [parserSettings]);
  const insertPriceToken = useCallback(
    (unit: string) => {
      setQuery((q) => {
        const token = /\s$/.test(q) || q.length === 0
          ? `${formatPriceTokenValue(shared.unitPrice)}/${unit}`
          : `/${unit}`;
        return `${q}${token} `;
      });
    },
    [shared.unitPrice],
  );
  // Tap = default unit; long-press picker passes an explicit one.
  const onPriceUnit = useCallback(() => {
    insertPriceToken(shared.priceUnit === "piece" ? "pc" : shared.priceUnit);
  }, [insertPriceToken, shared.priceUnit]);
  const onBack = useCallback(() => {
    setQuery((q) => q.slice(0, -1));
  }, []);
  /** Hold-backspace: drop the last whole token (`40x40x3` in one gesture). */
  const onBackToken = useCallback(() => {
    setQuery((q) =>
      applyToActiveItem(q, (text) => {
        const tokens = cmdTokenize(text);
        if (tokens.length === 0) return "";
        const rest = tokens.slice(0, -1);
        return rest.length ? `${rest.join(" ")} ` : "";
      }),
    );
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme(dark ? "light" : "dark");
  }, [dark, setTheme]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // The session's running totals — the desktop rail has shown these since
  // 3.10.0; the phone had no session surface at all until the fold.
  const sessionSummary = useMemo(() => {
    const rows = quickHistory
      .map((entry) => cmdParse(entry, parserSettings))
      .filter((parsed) => parsed.valid);
    return {
      count: rows.length,
      kg: rows.reduce((sum, r) => sum + (r.totalKg ?? 0), 0),
      amount: rows.reduce((sum, r) => sum + (r.totalAmount ?? 0), 0),
    };
  }, [quickHistory, parserSettings]);

  /** ↵ commits the open token (a space) so the next kind can start; if the
   *  token is already committed, it logs the line to the session. */
  const onEnter = useCallback(() => {
    const text = activeItemText(query);
    if (text.trim() !== "" && !/\s$/.test(text)) {
      onKey(" ");
      return;
    }
    logToSession();
  }, [query, onKey, logToSession]);

  // Focus with the caret at the end (after chip edit/remove) — select-all
  // would make the next keystroke wipe the whole query.
  const focusInputAtEnd = useCallback(() => {
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }, []);

  // Hero metric counts up when the query settles. The number is animated in the
  // target's display unit (kg or t) so the tween never crosses a unit boundary;
  // the unit/symbol beside it stays driven by the real value. Weight always
  // counts up in exact kilograms (no tonne conversion).
  // A multi-item line's hero is the line, not the item under the caret — the
  // sum is the number the user came for.
  const heroTarget = line.multi
    ? (isW ? line.totalKg : line.totalAmount) ?? null
    : (isW ? p.totalKg : p.totalAmount) ?? null;
  const heroAnim = useCountUp(heroTarget, isW ? "w-kg" : "price");
  // The band belongs to the weight, so it only shows when weight is the hero.
  const band = isW ? massBand(heroTarget, massTolerancePercent) : null;
  const heroVal =
    heroAnim == null
      ? "—"
      : heroAnim.toLocaleString("en-US", {
          minimumFractionDigits: isW ? 0 : 2,
          maximumFractionDigits: 2,
        });

  // Screen-reader announcement for the settled result (mirrors the hero +
  // secondary metric). Empty while invalid — the issue line announces errors.
  const liveResultText =
    p.valid && p.totalKg != null
      ? t("aria.liveResult", {
          value:
            `${fsWeight(p.totalKg)} ${fsWeightUnit()}` +
            (p.totalAmount != null ? ` · ${sym}${fsMoney(p.totalAmount)}` : ""),
        })
      : "";

  if (activeQuery.trim() === "" && keypadOverride !== null) {
    setKeypadOverride(null);
  }
  const keypadStage = cmdDetectStage(activeQuery, p);
  const keypadMode = commandKeypadLayout(activeQuery, p, keypadOverride);
  const keypadShowNumbers =
    keypadMode === "letters" &&
    (keypadOverride === "letters" ||
      (keypadStage.stage !== "empty" && keypadStage.stage !== "profile"));
  // A CSS variable, not a theme-derived literal: the class that selects it is
  // set before first paint by the inline script in the root layout, so the
  // server and the client emit the same style string. Reading `dark` here made
  // the server render the light value and the client the dark one, which
  // failed hydration and made React throw away and rebuild the whole shell.
  const screenBg = "var(--screen)";

  /**
   * Read the clipboard onto the line. The workspace gets a cut list through
   * onPaste on its text input, but the phone shell has no text input at all —
   * the keypad is the input — so pasting a cut list, or a query out of a chat
   * message, was impossible on exactly the device people hold next to the
   * steel. This is that path, as an explicit action.
   */
  const pasteFromClipboard = useCallback(async () => {
    let text = "";
    try {
      text = (await navigator.clipboard?.readText?.()) ?? "";
    } catch {
      // Denied, or no clipboard API — say so rather than doing nothing.
    }
    if (!text.trim()) {
      showToast(t("toast.pasteFailed"));
      return;
    }
    const list = cmdPasteIntoLine(query, text);
    if (list) {
      setQuery(list);
      markExternalValueChange();
      touchedRef.current = true;
      showToast(t("toast.pasted", { count: cmdSplitLine(list).length }));
      return;
    }
    // A single line replaces what is there, the same as typing it would.
    const next = text.trim();
    setQuery(/\s$/.test(next) ? next : `${next} `);
    markExternalValueChange();
    touchedRef.current = true;
  }, [query, showToast, t]);

  // Saved-library actions, identical on every viewport.
  const editingEntry = editingSavedId
    ? savedEntries.find((entry) => entry.id === editingSavedId) ?? null
    : null;
  const savedHandlers = {
    onLoadSaved: loadSavedEntry,
    onRemoveSaved: removeSavedEntry,
    onAddCompareSaved: (entry: SavedEntry) => addCompareEntry(entry.input, entry.result),
    onDuplicateSaved: duplicateSavedEntry,
    onTogglePinSaved: (entry: SavedEntry) => toggleSavedPinned(entry.id),
    onEditSaved: (entry: SavedEntry) => setEditingSavedId(entry.id),
    onAddPartSaved: addCurrentAsPart,
    canAddCurrentLine: Boolean(p.calc),
    onAddPartsByCommand: addPartsByCommand,
    onRemovePartSaved: (entry: SavedEntry, partId: string) => {
      removePartFromSaved(entry.id, partId);
    },
    onAddSavedToProject: (entry: SavedEntry) => {
      setSheet(null);
      setDestination({ entry });
    },
  };
  const helpSheet = effectiveSheet === "help" ? (
    <CommandHelpSheet
      onClose={() => setSheet(null)}
      onTryExample={(example) => {
        setQuery(`${example} `);
        markExternalValueChange();
        setSheet(null);
        if (!isPhoneViewport) focusInputAtEnd();
      }}
    />
  ) : null;
  const destinationSheet = destination ? (
    (() => {
      const entry = destination.entry;
      // A live line and a saved entry are the same act with a different
      // subject, so the overlay takes one and reads its header from it.
      const subject: DestinationSubject = entry
        ? {
            kind: "entry",
            label: entry.name,
            meta: `${entry.parts.length > 1 ? t("saveTo.partsCount", { count: entry.parts.length }) + " · " : ""}${t("saved.usedCount", { count: entry.useCount })}`,
            glyph: entry.normalizedProfile?.iconKey?.slice(0, 3).toUpperCase() ?? "PT",
            defaultName: entry.name,
            scalable: true,
          }
        : {
            kind: "line",
            label: query.trim() || p.calc?.result.profileLabel || "",
            meta: p.calc ? `${fsWeight(p.calc.result.totalWeightKg)} ${fsWeightUnit()}` : "",
            glyph: ">_",
            defaultName: line.multi
              ? assemblyDefaultName()
              : formatCommandParseName(t, p) ?? p.calc?.result.profileLabel ?? "",
            multi: line.multi,
          };
      return (
        <DestinationSheet
          subject={subject}
          entries={savedEntries.filter((item) => item.id !== entry?.id)}
          projects={projects.filter((project) => !isArchivedProject(project))}
          onSaveNew={saveLineAsNew}
          onAppendTo={(entryId, count) => appendSubjectTo(entryId, entry, count)}
          onAddToProject={(projectId, count) => handlePickProject(projectId, entry, count)}
          onCreateProject={createProject}
          onClose={() => setDestination(null)}
        />
      );
    })()
  ) : null;

  const savedEditSheet = editingEntry ? (
    <SavedEditSheet
      entry={editingEntry}
      onClose={() => setEditingSavedId(null)}
      onSubmit={(patch) => {
        updateSaved(editingEntry.id, patch);
        showToast(t("toast.savedUpdated"));
      }}
    />
  ) : null;

  // ── Wide desktop (≥1024): sidebar workspace shell ──
  if (isWideViewport) {
    return (
      <div
        // A column, so the PWA banner (offline / update / ready) stacks above
        // the workspace. As a row it became a flex sibling and squeezed the
        // whole app into what was left beside it.
        className="fixed inset-0 flex flex-col overflow-hidden text-foreground"
        style={{ background: screenBg, transition: "background 220ms ease" }}
      >
        <PwaRegister />
        <CommandDesktop
          compact={isCompactDesktop}
          dark={dark}
          onToggleTheme={cycleTheme}
          query={query}
          setQuery={setQuery}
          p={p}
          line={line}
          sug={sug}
          sym={sym}
          mode={mode}
          onSetMode={setModeOverride}
          parserSettings={parserSettings}
          defaultUnit={defaultUnit}
          onSetDefaultUnit={defaultUnitStore.set}
          shared={shared}
          onUpdateShared={sharedCalcSettingsStore.update}
          weightAsMain={weightAsMain}
          onSetWeightAsMain={(value) => {
            weightAsMainStore.set(value);
            setModeOverride(null);
          }}
          sessionTape={quickHistory.slice(0, 8)}
          history={quickHistory}
          onLoadQuery={loadQuery}
          onSaveSessionAsProject={saveSessionAsProject}
          onRemoveTapeEntry={removeHistoryEntry}
          onClearTape={clearHistory}
          saved={savedEntries}
          compareItems={compareItems}
          projects={projects}
          onSave={doSave}
          onLogSession={logToSession}
          rateIsUserSupplied={rateIsUserSupplied}
          onCopySummary={copySummary}
          onShareLink={shareLink}
          onNew={newCalc}
          onSuggest={onSuggest}
          onCompareCurrent={doCompare}
          onAddCompare={addCompareEntry}
          onRemoveCompare={removeCompareItem}
          onClearCompare={clearCompare}
          onPrimarySave={primarySave}
          onOpenDestinations={openDestinations}
          currentProjectName={currentProject?.name ?? null}
          onLoadInput={loadInput}
          onCreateProject={createProject}
          projectActions={projectActions}
          currentSaved={!!currentSavedEntry}
          onOpenHelp={() => setSheet("help")}
          onRemoveSavedMany={removeSavedEntries}
          {...savedHandlers}
        />
        {helpSheet}
        {savedEditSheet}
        {destinationSheet}
        <CommandToast toast={toast} bottom={32} dark={dark} />
        <ResultAnnouncer text={liveResultText} />
      </div>
    );
  }

  // ── Phone (<640): fullscreen shell with the on-screen keypad ──
  return (
    <div
      // A column: the PWA banner stacks above the shell. As a row the banner
      // sat beside it and the phone shell ran at 242px of a 390px screen for
      // as long as the banner showed — permanently, when offline.
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: screenBg, transition: "background 220ms ease" }}
    >
      <PwaRegister />
      {/* Fills what the fixed parent has left after the banner. It used to be
          `height: 100dvh`, which on iOS resolves differently from the fixed
          element's own box — the shorter of the two left a band of screen
          background below the keypad instead of the keys sitting flush on the
          bottom edge. flex-1 in a column is the same exact fill. */}
      <div
        className="relative flex flex-1 min-h-0 flex-col overflow-hidden text-foreground"
        style={{ width: "100%", background: screenBg }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Safe-top spacer — honours real device safe-area on mobile, narrow gap on desktop */}
          <div
            className="flex-shrink-0"
            style={{ paddingTop: "env(safe-area-inset-top, 12px)", height: "auto", minHeight: 12 }}
          />

          {/* TOP BAR */}
          <PhoneTopBar
            onToggleTheme={cycleTheme}
            onOpenLibrary={openLibrary}
            onOpenSettings={() => setSheet("settings")}
            syncAttention={syncAttention}
          />

          {/*
            A pristine bar has no answer to show, so the whole top of this
            screen — the mode switch, the figure, the per-piece strip, four
            disabled actions — is placeholders: a dash, a dash, "—/pc", and
            buttons that do nothing. The tiles were squeezed in underneath
            all of it by a flex spacer, which on a 390x844 phone with the
            keypad up left them about enough room for their own heading.

            So when there is nothing to show, the way in takes the space
            instead of queueing behind it. The tape only appears if it has
            something on it; an empty one was another dash.
          */}
          {queryHydrated && query.trim() === "" ? (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto px-[18px] pt-2">
                <ProfileDiscoveryTiles
                  compact
                  hideTitle
                  onSelectProfile={(prefix) => {
                    haptic("tap");
                    setQuery(prefix);
                    markExternalValueChange();
                  }}
                  onTryDemo={() => {
                    haptic("tap");
                    setQuery(DEMO_QUERY);
                    markExternalValueChange();
                  }}
                />
              </div>
              {sessionSummary.count > 0 && (
                <>
            {/* SESSION RIBBON — the tape, at phone size. It carries the same two
                actions the workspace pane does: open it, or turn it into a
                project. Nothing typed is lost by not deciding where it goes,
                which is the point of the tape. */}
            <SessionRibbon
              summary={sessionSummary}
              isWeight={isW}
              sym={sym}
              onOpen={() => openLibrary("session")}
              onSaveAsProject={saveSessionAsProject}
              onAdd={logToSession}
            />

            {/* The visual way in, on the surface that has no text field at all.
                It shipped to the workspace only, which left the phone — the
                device most likely to be held by someone who has never typed
                `hea120` in their life — with nothing but a row of chips. It
                fills the band that was empty on a pristine screen anyway. */}
                </>
              )}
            </>
          ) : (
            <>
              {/* Free height is split above and below the answer instead of
                  all of it falling below. On a 390x844 phone roughly a third
                  of the screen sat empty between the session ribbon and the
                  suggestion strip while the figure was pinned to the very
                  top — the hardest place to reach one-handed. Both spacers
                  are flex, so on a short screen they collapse and nothing
                  moves. The split is weighted 1:2 so the answer lands in the
                  upper third rather than dead centre. */}
              <div className="flex-[1] min-h-0" />
            {/* HERO */}
            <PhoneHero
              p={p}
              line={line}
              query={query}
              setQuery={setQuery}
              mode={mode}
              onSetMode={setModeOverride}
              sym={sym}
              heroVal={heroVal}
              band={band}
              rateIsUserSupplied={rateIsUserSupplied}
              targetNote={targetNote}
              onOpenResult={() => setSheet("result")}
              projectName={currentProject?.name ?? null}
              saved={!!currentSavedEntry}
              onPrimarySave={primarySave}
              onOpenDestinations={openDestinations}
              onCompare={doCompare}
              onShare={shareLink}
            />

            {/* SESSION RIBBON — the tape, at phone size. It carries the same two
                actions the workspace pane does: open it, or turn it into a
                project. Nothing typed is lost by not deciding where it goes,
                which is the point of the tape. */}
            <SessionRibbon
              summary={sessionSummary}
              isWeight={isW}
              sym={sym}
              onOpen={() => openLibrary("session")}
              onSaveAsProject={saveSessionAsProject}
              onAdd={logToSession}
            />

            {/* The visual way in, on the surface that has no text field at all.
                It shipped to the workspace only, which left the phone — the
                device most likely to be held by someone who has never typed
                `hea120` in their life — with nothing but a row of chips. It
                fills the band that was empty on a pristine screen anyway. */}
              <div className="flex-[2] min-h-[6px]" />
            </>
          )}

          {/* SUGGESTION BAR */}
          {/* The gap under the strip has to clear the query line's 3px focus
              ring, not just its border box — at pb-1.5 the chips sat on the
              glow and the two read as one collided control. */}
          <PhoneSuggestionStrip
            sug={sug}
            activeAlias={p.alias?.alias}
            hideSave={isPhoneViewport}
            showClear={query !== ""}
            firstSuggestionRef={firstSuggestionRef}
            onSuggest={onSuggest}
            onPaste={pasteFromClipboard}
            onClear={newCalc}
            onExit={focusInput}
          />

          {/* QUERY AREA */}
          {/* QUERY LINE — chips plus the caret; the keypad below types into it */}
            <PhoneQueryLine
              query={query}
              setQuery={setQuery}
              p={p}
              line={line}
              sug={sug}
              onSuggest={onSuggest}
              onTap={() => {
                if (keypadMode === "actions") setKeypadOverride("numpad");
              }}
            />
        </div>

          {/* On-screen keypad */}
          <CommandKeypad
            mode={keypadMode}
            onKey={onKey}
            onPriceUnit={onPriceUnit}
            onPriceUnitPick={insertPriceToken}
            onBack={onBack}
            onBackToken={onBackToken}
            onEnter={onEnter}
            onNew={newCalc}
            onTweak={() => {
              setQuery((q) => tweakActiveItem(q));
              setKeypadOverride("numpad");
            }}
            onShare={shareLink}
            onLetters={() => setKeypadOverride("letters")}
            onNumbers={() => setKeypadOverride("numpad")}
            onDone={() => {
              setQuery((q) => (/\s$/.test(q) || q.trim() === "" ? q : `${q} `));
              setKeypadOverride(null);
            }}
            showNumbers={keypadShowNumbers}
            showDone={keypadMode === "numpad" && p.valid}
            priceUnitLabel={priceUnitLabel}
            valid={p.valid}
          />

          {/* SHEETS */}
          {effectiveSheet === "result" && p.valid && (
            <CommandResultSheet
              p={p}
              line={line}
              query={query}
              setQuery={setQuery}
              onClose={() => setSheet(null)}
              onPrimarySave={() => {
                setSheet(null);
                primarySave();
              }}
              onSaveElsewhere={openDestinations}
              currentProjectName={currentProject?.name ?? null}
              isSaved={!!currentSavedEntry}
              onCopyValue={() => {
                setSheet(null);
                copyValue();
              }}
              onCopySummary={() => {
                setSheet(null);
                copySummary();
              }}
              onShareLink={() => {
                setSheet(null);
                shareLink();
              }}
              onNew={() => {
                setSheet(null);
                newCalc();
              }}
              onCompare={() => {
                setSheet(null);
                doCompare();
              }}
            />
          )}
          {effectiveSheet === "settings" && (
            <CommandSettingsSheet
              shared={shared}
              onUpdateShared={sharedCalcSettingsStore.update}
              weightAsMain={weightAsMain}
              onSetWeightAsMain={(value) => {
                weightAsMainStore.set(value);
                setModeOverride(null);
              }}
              defaultUnit={defaultUnit}
              onSetDefaultUnit={defaultUnitStore.set}
              onClose={closeSheet}
            />
          )}
          {effectiveSheet === "library" && (
            <CommandLibrarySheet
              // Remount on tab change so the sheet's own tab state re-seeds.
              key={libraryTab ?? "auto"}
              initialTab={libraryTab}
              settings={parserSettings}
              defaultUnit={defaultUnit}
              mode={mode}
              saved={savedEntries}
              compareItems={compareItems}
              projects={projects}
              onClose={() => {
                closeSheet();
                setLibraryTab(null);
              }}
              sessionTape={quickHistory}
              onLoadQuery={(entry) => {
                loadQuery(entry);
                setLibraryTab(null);
              }}
              onRemoveTapeEntry={removeHistoryEntry}
              onClearHistory={clearHistory}
              onSaveSessionAsProject={saveSessionAsProject}
              onLoadInput={loadInput}
              {...savedHandlers}
              onRemoveCompare={removeCompareItem}
              onClearCompare={clearCompare}
              projectActions={projectActions}
            />
          )}
          {helpSheet}
          {savedEditSheet}
          {destinationSheet}

          {/* TOAST */}
          <CommandToast toast={toast} bottom={120} dark={dark} />
          <ResultAnnouncer text={liveResultText} />
      </div>
    </div>
  );
}

// suppress unused-import lint for COMMAND_ALIAS_RE (re-exported intentionally elsewhere)
void COMMAND_ALIAS_RE;
