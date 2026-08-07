"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/useTheme";
import { useCountUp } from "@/hooks/useCountUp";
import { useSaved } from "@/hooks/useSaved";
import type { SavedEntry } from "@/hooks/useSaved";
import { useCompare } from "@/hooks/useCompare";
import { useProjects } from "@/hooks/useProjects";
import { usePresets } from "@/hooks/usePresets";
import { usePriceBook } from "@/hooks/usePriceBook";
import { useQuickHistory } from "@/hooks/useQuickHistory";
import { cmdParse, cmdClassifyToken, cmdTokenize, inputToQuery } from "@ferroscale/metal-core";
import {
  cmdSuggest,
  cmdApplyInsert,
  cmdAppendLineItem,
  cmdParseLine,
} from "@ferroscale/metal-core";
import { COMMAND_ALIAS_RE } from "@ferroscale/metal-core";
import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import {
  defaultUnitStore,
  sharedCalcSettingsStore,
  weightAsMainStore,
} from "@/lib/settings-stores";
import type {
  CommandCalc,
  CommandParseResult,
  CommandParserSettings,
  CommandSuggestionItem,
} from "@ferroscale/metal-core";
import { CommandGlyph } from "./command-glyph";
import {
  applyIssueSuggestion,
  computeGhost,
  formatCommandAliasName,
  formatCommandHint,
  formatCommandIssue,
  formatCommandParseName,
  formatCommandSuggestionLabel,
  buildCommandSummary,
} from "./command-copy";
import { CommandHelpSheet } from "./sheets/help-sheet";
import { KIND_BG } from "./command-constants";
import { commandTargetNote } from "./target-note";
import { LineItems } from "./line-items";
import {
  activeItemText,
  applyToActiveItem,
  editLineToken,
  lineChips,
  removeLineToken,
} from "./line-edit";
import { CommandToast, PricingBadge, ResultAnnouncer, TargetBadge } from "./command-atoms";
import type { CommandToastState } from "./command-atoms";
import { CommandKeypad } from "./command-keypad";
import { CommandDesktop } from "./desktop/command-desktop";
import { CommandLibrarySheet } from "./sheets/library-sheet";
import { CommandProjectPickerSheet } from "./sheets/project-picker-sheet";
import { CommandResultSheet } from "./sheets/result-sheet";
import { CommandSettingsSheet } from "./sheets/settings-sheet";
import { SavedEditSheet } from "./sheets/saved-edit-sheet";
import { PwaRegister } from "@/components/pwa-register";
import {
  buildShareUrl,
  readSharedPricing,
  readSharedQuery,
  sharedPricingDiffers,
} from "@/lib/command/share";
import { buildUsageSource, recordCommandUsage, usageStatsVersionStore } from "@/lib/usage-stats";
import { loadQuickHistory } from "@/lib/sync/collections";
import { haptic } from "@/lib/haptics";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";

const HERO_FONT_WEIGHT = 800;
// Trailing space so the demo query renders fully chipped on first load.
const DEMO_QUERY = "hea120 6m x2 s235 ";
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

  // App-wide libraries (saves, compare, projects, presets).
  const {
    saved: savedEntries,
    saveCalculation,
    getSavedEntry,
    removeSaved,
    removeSavedMany,
    restoreSaved,
    duplicateSaved,
    addPartToSaved,
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
  const { projects, createProject, addCalculation, addCalculations, removeCalculation } = useProjects();
  const { presetsForProfile } = usePresets();
  const priceBook = usePriceBook();

  const [query, setQuery] = useState(DEMO_QUERY);
  // The URL only mirrors the query once the user has replaced the demo query
  // (or arrived via a share link) — a pristine visit keeps a clean URL.
  const touchedRef = useRef(false);
  // weightAsMain decides the default hero metric; the toggle is a local override.
  const [modeOverride, setModeOverride] = useState<"weight" | "price" | null>(null);
  const mode = modeOverride ?? (weightAsMain ? "weight" : "price");
  const [sheet, setSheet] = useState<null | "result" | "settings" | "library" | "help">(null);
  const [toast, setToast] = useState<CommandToastState | null>(null);
  // Query history — persisted (and Drive-synced) via the quickHistory
  // collection. Backs the desktop session tape and recency suggestions.
  const {
    history: quickHistory,
    push: pushHistory,
    remove: removeHistoryEntry,
    clear: clearHistory,
  } = useQuickHistory();
  const [projectCalc, setProjectCalc] = useState<CommandCalc | null>(null);
  // Which saved entry the name/notes/tags editor is open for (id, not the
  // record, so the sheet always renders the live version of it).
  const [editingSavedId, setEditingSavedId] = useState<string | null>(null);
  const [isPhoneViewport, setIsPhoneViewport] = useState(false);
  const [isWideViewport, setIsWideViewport] = useState(false);
  /** Workspace, but narrow: one column, breakdown folded away. */
  const [isCompactDesktop, setIsCompactDesktop] = useState(false);
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
      if (query === DEMO_QUERY) return;
      touchedRef.current = true;
    }
    const id = window.setTimeout(() => {
      window.history.replaceState(null, "", buildShareUrl(query, window.location, shared));
    }, 400);
    return () => window.clearTimeout(id);
  }, [query, shared]);

  // Two shells, not three:
  //  · phone (<640) → fullscreen with the on-screen keypad and sheets
  //  · everything else (≥640) → the workspace, single-column below 1024
  //
  // 640–1023 used to get a 560px card floating on a background — no session
  // tape, no library, no breakdown — which is exactly an iPad in portrait and
  // a half-width laptop window. It now gets the real thing, laid out for the
  // width it has.
  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth;
      setIsPhoneViewport(w < 640);
      setIsWideViewport(w >= 640);
      setIsCompactDesktop(w < 1024);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
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
    if (!touchedRef.current && query === DEMO_QUERY) return;
    const id = window.setTimeout(() => {
      // Record the canonical query, not the raw text: this drops half-typed
      // trailing tokens (a lone "@", an incomplete grade) so mid-edit pauses
      // don't each leave their own near-duplicate recent.
      const canonical =
        (p.calc &&
          inputToQuery(p.calc.input, defaultUnit, {
            defaultGradeId: shared.defaultGradeId,
            defaultPricing: shared,
          })) ||
        query.trim();
      recordCommandUsage(p, canonical);
    }, 2500);
    return () => window.clearTimeout(id);
  }, [p, query, defaultUnit, shared]);
  const usageSource = useMemo(() => {
    // usageVersion is the invalidation signal, not an input: recording a query
    // or pulling a peer's habits bumps it, and the source rebuilds from storage.
    void usageVersion;
    return usageHydrated ? buildUsageSource() : undefined;
  }, [usageHydrated, usageVersion]);

  // `p` is handed over so the suggestion engine doesn't parse the same query
  // a second time on every keystroke.
  const sug = useMemo(
    () => cmdSuggest(activeQuery, parserSettings, presetsForProfile, usageSource, p),
    [activeQuery, parserSettings, presetsForProfile, usageSource, p],
  );

  // Auto-close result sheet if query becomes invalid (derive, don't setState)
  const effectiveSheet = sheet === "result" && !p.valid ? null : sheet;

  const sym = CURRENCY_SYMBOLS[shared.currency] ?? "€";
  const priceKeyUnit = shared.priceUnit === "piece" ? "pc" : shared.priceUnit;
  const priceUnitLabel = `${sym}/${priceKeyUnit}`;
  const isW = mode === "weight";

  const showToast = useCallback((msg: string) => {
    setToast({ text: msg });
    window.setTimeout(() => setToast(null), 1700);
  }, []);

  /** Toast with an action button (Undo, Name it) — stays up longer. */
  const showActionToast = useCallback(
    (msg: string, action: { label: string; onAction: () => void }) => {
      const entry = { text: msg, ...action };
      setToast(entry);
      window.setTimeout(() => {
        // Only clear if this toast is still the visible one.
        setToast((current) => (current === entry ? null : current));
      }, 5000);
    },
    [],
  );

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
          touchedRef.current = true;
          requestAnimationFrame(() => inputRef.current?.select());
        }
      } else {
        try {
          window.localStorage.setItem(ONBOARDED_KEY, "1");
        } catch { /* noop */ }
      }
      return;
    }
    setQuery(`${sharedQuery} `);
    touchedRef.current = true;
    // A link carries the sender's rate context. Apply it (otherwise the same
    // link shows a different price to every recipient) and say so out loud —
    // silently rewriting someone's pricing settings would be worse.
    const linkPricing = readSharedPricing(window.location.search);
    if (linkPricing && sharedPricingDiffers(linkPricing, sharedCalcSettingsStore.getSnapshot())) {
      sharedCalcSettingsStore.update(linkPricing);
      showToast(t("toast.linkPricingApplied"));
    }
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
    const summary = buildCommandSummary(t, p);
    if (!summary) return;
    navigator.clipboard?.writeText(summary).catch(() => {});
    showToast(t("toast.copiedSummary"));
  }, [t, p, showToast]);

  const shareLink = useCallback(() => {
    if (!p.valid) return;
    const url = buildShareUrl(query, window.location, shared);
    if (isPhoneViewport && typeof navigator.share === "function") {
      navigator.share({ url }).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(url).catch(() => {});
    showToast(t("toast.linkCopied"));
  }, [p.valid, query, shared, isPhoneViewport, showToast, t]);

  // The bookmark state of the line currently in the bar — drives the Save
  // button's filled/outlined look, so "is this one saved?" is answerable
  // without opening the library.
  const currentSavedEntry = p.calc ? getSavedEntry(p.calc.result) : undefined;

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
      line.multi ? t("saved.assemblyName", { count: line.items.length }) : autoName,
      undefined,
      undefined,
      parts,
    );
    haptic("commit");
    for (const item of line.items) pushHistory(item.text.trim());
    showActionToast(t("toast.saved"), {
      label: t("common.nameIt"),
      onAction: () => setEditingSavedId(entry.id),
    });
  }, [
    p,
    line,
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

  const loadInput = useCallback(
    (input: CalculationInput) => {
      const q = inputToQuery(input, defaultUnit, {
        defaultGradeId: shared.defaultGradeId,
        defaultPricing: shared,
      });
      if (q) setQuery(q);
      setSheet(null);
    },
    [defaultUnit, shared],
  );

  /**
   * Open a saved entry. Counts the use (so "most used" sorting means
   * something) and restores at today's rate — `omitPrice` keeps the bar
   * showing the same money the card showed.
   */
  const loadSavedEntry = useCallback(
    (entry: SavedEntry) => {
      markSavedUsed(entry.id);
      const q = inputToQuery(entry.input, defaultUnit, {
        defaultGradeId: shared.defaultGradeId,
        omitPrice: true,
      });
      if (q) setQuery(`${q} `);
      setSheet(null);
    },
    [markSavedUsed, defaultUnit, shared.defaultGradeId],
  );

  const handlePickProject = useCallback(
    (projectId: string) => {
      if (!projectCalc) return;
      const ok = addCalculation(projectId, projectCalc.input, projectCalc.result);
      setProjectCalc(null);
      const project = projects.find((p) => p.id === projectId);
      showToast(
        ok
          ? t("toast.addedToProject", { project: project?.name ?? t("common.project") })
          : t("toast.projectFull"),
      );
    },
    [projectCalc, addCalculation, projects, showToast, t],
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

  const openProjectModal = useCallback(() => {
    if (!p.calc) return;
    setSheet(null);
    setProjectCalc(p.calc);
  }, [p.calc]);

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
    haptic("commit");
    showToast(t("toast.sessionSaved", { count: entries.length, project: name }));
  }, [quickHistory, parserSettings, createProject, addCalculations, showToast, t]);

  const newCalc = useCallback(() => {
    // A valid query cleared via ⌘K / CLEAR still lands on the session tape,
    // so starting a new line never loses the previous number.
    if (p.valid) pushHistory(query);
    setQuery("");
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
      setQuery((q) => applyToActiveItem(q, (text) => cmdApplyInsert(text, item)));
    },
    [doSave],
  );

  const onKey = useCallback((ch: string) => {
    setQuery((q) => q + ch);
  }, []);
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
  const onEnter = useCallback(() => {
    logToSession();
  }, [logToSession]);

  const cycleTheme = useCallback(() => {
    setTheme(dark ? "light" : "dark");
  }, [dark, setTheme]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

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

  // Tokens come from the same tokenizer the parser uses, so glued input
  // ("hea1006m") displays as the pieces it is parsed as.
  // Chips are grouped by item, so a `+`-joined line renders as the two (or
  // more) calculations it is. While the query doesn't end in whitespace the
  // last piece is still being typed — rendered as plain text at the cursor.
  const chips = useMemo(() => lineChips(query), [query]);
  const partialToken = chips.partial || null;
  const chipCount = chips.groups.reduce((n, group) => n + group.tokens.length, 0);
  // Faint completion drawn after the caret (profile letters / recent prefix).
  const ghost = computeGhost(partialToken ?? "", sug);
  const acceptGhost = () => {
    if (ghost && sug.items[0]) onSuggest(sug.items[0]);
  };
  const removeTokenAt = (item: number, idx: number) => {
    setQuery(removeLineToken(query, item, idx));
  };
  // Pull a token back to the end of its own item as the editable partial (the
  // parser is order-tolerant within an item, so the reordering is free).
  const editTokenAt = (item: number, idx: number) => {
    setQuery(editLineToken(query, item, idx));
  };
  const screenBg = dark ? "#161109" : "#f4f0e7";

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
    onAddPartSaved: p.calc ? addCurrentAsPart : undefined,
    onRemovePartSaved: (entry: SavedEntry, partId: string) => {
      removePartFromSaved(entry.id, partId);
    },
  };
  const helpSheet = effectiveSheet === "help" ? (
    <CommandHelpSheet
      onClose={() => setSheet(null)}
      onTryExample={(example) => {
        setQuery(`${example} `);
        setSheet(null);
        if (!isPhoneViewport) focusInputAtEnd();
      }}
    />
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
        className="fixed inset-0 flex overflow-hidden text-foreground"
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
          onSaveSessionAsProject={saveSessionAsProject}
          onRemoveTapeEntry={removeHistoryEntry}
          onClearTape={clearHistory}
          saved={savedEntries}
          compareItems={compareItems}
          projects={projects}
          onSave={doSave}
          onLogSession={logToSession}
          onCopySummary={copySummary}
          onShareLink={shareLink}
          onNew={newCalc}
          onSuggest={onSuggest}
          onCompareCurrent={doCompare}
          onAddCompare={addCompareEntry}
          onRemoveCompare={removeCompareItem}
          onClearCompare={clearCompare}
          onAddToProject={openProjectModal}
          onLoadInput={loadInput}
          onCreateProject={createProject}
          onRemoveProjectCalc={removeCalculation}
          currentSaved={!!currentSavedEntry}
          onOpenHelp={() => setSheet("help")}
          onRemoveSavedMany={removeSavedEntries}
          {...savedHandlers}
        />
        {helpSheet}
        {savedEditSheet}
        {projectCalc && (
          <CommandProjectPickerSheet
            projects={projects}
            onClose={() => setProjectCalc(null)}
            onCreateProject={createProject}
            onPickProject={(project) => handlePickProject(project.id)}
          />
        )}
        <CommandToast toast={toast} bottom={32} dark={dark} />
        <ResultAnnouncer text={liveResultText} />
      </div>
    );
  }

  // ── Phone (<640): fullscreen shell with the on-screen keypad ──
  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: screenBg, transition: "background 220ms ease" }}
    >
      <PwaRegister />
      <div
        className="relative flex flex-col overflow-hidden text-foreground"
        style={{ width: "100%", height: "100dvh", background: screenBg }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Safe-top spacer — honours real device safe-area on mobile, narrow gap on desktop */}
          <div
            className="flex-shrink-0"
            style={{ paddingTop: "env(safe-area-inset-top, 12px)", height: "auto", minHeight: 12 }}
          />

          {/* TOP BAR */}
          <div className="flex items-center justify-between px-[18px] pt-1 pb-2">
            <div className="flex items-center gap-2.5">
              <div
                className="w-6 h-6 rounded-[7px] flex items-center justify-center"
                style={{ background: "var(--accent)" }}
              >
                <span
                  className="w-2.5 h-2.5"
                  style={{
                    background: "var(--accent-contrast)",
                    borderRadius: 2.5,
                  }}
                />
              </div>
              <span className="text-[17px] font-extrabold tracking-tight">
                FerroScale
              </span>
            </div>
            <div className="flex gap-2">
              <IconBtn onClick={cycleTheme} ariaLabel={t("aria.toggleTheme")}>
                {dark ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <circle cx="12" cy="12" r="4.5" />
                    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
                  </svg>
                )}
              </IconBtn>
              <IconBtn onClick={() => setSheet("library")} ariaLabel={t("nav.library")}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                </svg>
              </IconBtn>
              <IconBtn onClick={() => setSheet("settings")} ariaLabel={t("nav.settings")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              </IconBtn>
            </div>
          </div>

          {/* HERO */}
          <div className="px-[18px] pt-1.5">
            <div className="flex gap-1.5 mb-3">
              {(["weight", "price"] as const).map((m) => {
                const active = mode === m;
                const isWeight = m === "weight";
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModeOverride(m)}
                    className="flex-1 py-2 rounded-[11px] text-[11px] font-bold tracking-[1.4px]"
                    style={{
                      border: active
                        ? `1px solid ${
                            isWeight ? "var(--accent-border)" : "var(--blue-border)"
                          }`
                        : "1px solid var(--border-faint)",
                      background: active
                        ? isWeight
                          ? "var(--accent-surface)"
                          : "var(--blue-surface)"
                        : "transparent",
                      color: active
                        ? isWeight
                          ? "var(--accent-text)"
                          : "var(--blue-text)"
                        : "var(--muted)",
                    }}
                  >
                    {(m === "weight" ? t("settings.weight") : t("settings.price")).toUpperCase()}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={!p.valid}
              onClick={() => p.valid && setSheet("result")}
              className="block w-full text-left p-0 m-0 bg-transparent border-0"
              style={{ cursor: p.valid ? "pointer" : "default" }}
            >
              <div className="flex items-baseline gap-2">
                {!isW && p.totalAmount != null && (
                  <span
                    className="text-[34px] leading-none"
                    style={{
                      color: "var(--blue-strong)",
                      fontWeight: HERO_FONT_WEIGHT,
                    }}
                  >
                    {sym}
                  </span>
                )}
                <span
                  className="leading-[0.82] tracking-[-2.6px] fs-display-num"
                  style={{
                    fontSize: 68,
                    fontWeight: HERO_FONT_WEIGHT,
                    color: heroVal === "—" ? "var(--muted-faint)" : "var(--foreground)",
                  }}
                >
                  {heroVal}
                </span>
                {isW && p.totalKg != null && (
                  <span
                    className="text-[26px] font-bold"
                    style={{ color: "var(--accent)" }}
                  >
                    {fsWeightUnit()}
                  </span>
                )}
                {p.valid && (
                  <span className="ml-auto self-center text-muted-faint">
                    <Chev />
                  </span>
                )}
              </div>
            </button>

            <div className="flex items-center gap-2.5 mt-3 pb-3.5 border-b border-border-faint">
              {line.multi ? (
                <LineItems line={line} compact />
              ) : p.valid && p.kgm != null ? (
                <span className="font-mono text-[12px] text-muted flex items-center gap-1.5 flex-wrap">
                  <span>
                    <span className="text-foreground-secondary">
                      {p.kgm.toFixed(2)}
                    </span>{" "}
                    kg/m ×{" "}
                    <span className="text-foreground-secondary">{p.lengthM}</span>{" "}
                    m × <span className="text-foreground-secondary">{p.realQty}</span>
                    {p.gradeLabel ? ` · ${p.gradeLabel}` : ""}
                  </span>
                  {targetNote && (
                    <TargetBadge>
                      {t(
                        `target.${targetNote.solvedFor === "qty" ? "solvedQty" : "solvedLength"}`,
                        { target: targetNote.target },
                      )}
                      {targetNote.over ? ` · ${t("target.over", { over: targetNote.over })}` : ""}
                    </TargetBadge>
                  )}
                  {!isW && p.pricing.wastePercent > 0 && (
                    <PricingBadge>{t("pricingBadge.waste", { percent: p.pricing.wastePercent })}</PricingBadge>
                  )}
                  {!isW && p.pricing.includeVat && (
                    <PricingBadge>{t("pricingBadge.vat", { percent: p.pricing.vatPercent })}</PricingBadge>
                  )}
                </span>
              ) : p.issues.length > 0 ? (
                <span
                  className="fs-drop font-mono text-[12px] flex items-center gap-2 flex-wrap"
                  style={{ color: "var(--amber-text)" }}
                  role="status"
                >
                  <span>{formatCommandIssue(t, p.issues[0])}</span>
                  {p.issues[0].suggestion && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(
                          applyIssueSuggestion(
                            query,
                            p.issues[0].token,
                            p.issues[0].suggestion!,
                          ),
                        );
                        // no-op on phone: the keypad owns the caret
                      }}
                      className="rounded-full font-bold"
                      style={{
                        padding: "2px 9px",
                        background: "var(--accent-surface)",
                        color: "var(--accent-text)",
                        border: "1px solid var(--accent-border)",
                      }}
                    >
                      {t("issues.didYouMean", { suggestion: p.issues[0].suggestion })}
                    </button>
                  )}
                </span>
              ) : (
                <span className="font-mono text-[12px] text-muted-faint">
                  {p.alias
                    ? p.hasSize
                      ? t("hint.addLength")
                      : t("hint.addSize")
                    : t("hint.startProfile")}
                </span>
              )}
              <span className="ml-auto flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: p.valid
                      ? "var(--green-text)"
                      : "var(--muted-faint)",
                  }}
                />
                <span
                  className="text-[10.5px] font-bold tracking-wider"
                  style={{
                    color: p.valid
                      ? "var(--green-text)"
                      : "var(--muted-faint)",
                  }}
                >
                  {p.valid ? t("status.live") : t("status.waiting")}
                </span>
              </span>
            </div>
          </div>

          {/* MIDDLE — preview card (always visible so the layout stays stable).
              Recents live in the bookmark sheet only. */}
          <PreviewCard
            p={p}
            isWeight={isW}
            sym={sym}
            onOpen={() => p.valid && setSheet("result")}
          />

          <div className="flex-1 min-h-[6px]" />

          {/* SUGGESTION BAR */}
          <div className="pb-1.5">
            <div className="flex items-center gap-2 px-[18px] pb-1.5">
              <span className="text-[10px] font-bold tracking-[1.2px] text-muted uppercase">
                {formatCommandHint(t, sug.hint)}
              </span>
              {query !== "" && (
                <button
                  type="button"
                  onClick={newCalc}
                  // Padding + negative margin grows the tap target without
                  // shifting the layout.
                  className="ml-auto bg-transparent border-0 text-muted text-[11px] font-bold tracking-wide px-3 py-2.5 -my-2.5 -mr-3"
                >
                  {t("common.clear")}
                </button>
              )}
            </div>
            <div className="relative">
            <div
              // Two rows of wrapped chips rather than one long swipe: standard
              // sizes are a grid in the head, not a queue.
              className="flex gap-1.5 px-[18px] pb-0.5 flex-wrap content-start"
              style={{ maxHeight: 96, overflowY: "auto" }}
            >
              {sug.items.map((it, i) => (
                <button
                  key={i}
                  ref={i === 0 ? firstSuggestionRef : undefined}
                  type="button"
                  // Chips stay out of the Tab order — keep typing flow unbroken.
                  // ArrowDown / ArrowRight from input opens this list explicitly.
                  tabIndex={-1}
                  onClick={() => {
                    onSuggest(it);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                      e.preventDefault();
                      const dir = e.key === "ArrowRight" ? 1 : -1;
                      const buttons = Array.from(
                        e.currentTarget.parentElement?.querySelectorAll(
                          "button",
                        ) ?? [],
                      ) as HTMLButtonElement[];
                      const idx = buttons.indexOf(e.currentTarget as HTMLButtonElement);
                      const next = buttons[idx + dir];
                      if (next) {
                        next.focus();
                      } else if (dir === -1) {
                        focusInput();
                      }
                      return;
                    }
                    if (e.key === "ArrowUp" || e.key === "Escape") {
                      e.preventDefault();
                      focusInput();
                    }
                  }}
                  className="fs-pop flex-shrink-0 flex items-center gap-1.5 rounded-[12px] font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--screen,var(--surface))]"
                  style={{
                    padding: it.sub ? "7px 12px" : "8px 13px",
                    border:
                      it.kind === "save"
                        ? "none"
                        : "1px solid var(--border-faint)",
                    background:
                      it.kind === "save"
                        ? "var(--accent)"
                        : "var(--surface)",
                    color:
                      it.kind === "save"
                        ? "var(--accent-contrast)"
                        : "var(--foreground)",
                    boxShadow: "var(--panel-shadow-soft)",
                  }}
                >
                  {it.fam && (
                    <span style={{ color: "var(--foreground-secondary)" }}>
                      <CommandGlyph fam={it.fam} size={17} />
                    </span>
                  )}
                  <span className="flex flex-col items-start leading-tight">
                    <span
                      className={`text-sm font-bold ${
                        it.kind === "size" || it.kind === "length" || it.kind === "qty"
                          ? "font-mono"
                          : ""
                      }`}
                    >
                      {formatCommandSuggestionLabel(t, it)}
                    </span>
                    {it.sub && (
                      <span className="text-[10px] text-muted font-semibold">
                        {it.sub}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
            {/* Bottom fade hints that more chips are below the fold */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-4"
              style={{
                background: `linear-gradient(to bottom, transparent, ${screenBg})`,
              }}
            />
            </div>
          </div>

          {/* QUERY AREA */}
          {/* QUERY LINE — chips plus the caret; the keypad below types into it */}
            <div className="px-[14px] pb-2">
              <div
                className="flex items-center gap-1.5 flex-wrap rounded-[15px] px-3 py-2.5"
                style={{
                  minHeight: 50,
                  border: "1.5px solid var(--accent-border)",
                  background: "var(--surface)",
                  boxShadow: dark
                    ? "0 0 0 3px rgba(240,121,63,0.13)"
                    : "0 0 0 3px rgba(196,71,26,0.10)",
                }}
              >
                <span
                  className="font-mono text-base font-bold mr-0.5"
                  style={{ color: "var(--accent)" }}
                >
                  ›
                </span>
                {chipCount === 0 && !partialToken && (
                  <span className="font-mono text-sm text-muted-faint">
                    {t("query.placeholder")}
                  </span>
                )}
                {chips.groups.map((group) => (
                  <Fragment key={group.item}>
                    {group.item > 0 && (
                      <span
                        className="font-mono text-sm font-bold px-0.5"
                        style={{ color: "var(--muted-faint)" }}
                        aria-hidden="true"
                      >
                        +
                      </span>
                    )}
                    {group.tokens.map((tok, i) => (
                      <TokenChip
                        key={`${tok}-${i}`}
                        tok={tok}
                        kindClass={KIND_BG[cmdClassifyToken(tok)]}
                        onEdit={() => editTokenAt(group.item, i)}
                        onRemove={() => removeTokenAt(group.item, i)}
                      />
                    ))}
                  </Fragment>
                ))}
                {partialToken && (
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {partialToken}
                  </span>
                )}
                {ghost && (
                  <button
                    type="button"
                    onClick={acceptGhost}
                    aria-label={t("query.acceptGhost", { text: ghost.trim() })}
                    className="font-mono text-sm font-semibold whitespace-pre"
                    style={{ color: "var(--muted-faint)" }}
                  >
                    {ghost}
                  </button>
                )}
                <span
                  className="w-0.5 h-5 rounded-sm"
                  style={{
                    background: "var(--accent)",
                    animation: "fsBlink 1s steps(1) infinite",
                  }}
                />
              </div>
            </div>
        </div>

          {/* Recents: the phone had no history recall at all — ↑/↓ is a
              desktop-only affordance — so the last few lines sit one tap away
              above the keypad. */}
          {quickHistory.length > 0 && (
            <div
              className="flex gap-1.5 px-[14px] pb-1.5 flex-shrink-0"
              style={{ overflowX: "auto" }}
            >
              <span className="flex items-center text-[9.5px] font-bold tracking-wider text-muted-faint uppercase flex-shrink-0 pr-0.5">
                {t("suggest.group.usage")}
              </span>
              {quickHistory.slice(0, 4).map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => {
                    haptic("tap");
                    setQuery(`${entry} `);
                  }}
                  className="flex-shrink-0 rounded-full font-mono text-[11.5px] font-semibold"
                  style={{
                    padding: "5px 11px",
                    border: "1px solid var(--border-faint)",
                    background: "var(--surface)",
                    color: "var(--foreground-secondary)",
                  }}
                >
                  {entry}
                </button>
              ))}
            </div>
          )}

          {/* On-screen keypad */}
          {(
            <CommandKeypad
              onKey={onKey}
              onPriceUnit={onPriceUnit}
              onPriceUnitPick={insertPriceToken}
              onBack={onBack}
              onBackToken={onBackToken}
              onEnter={onEnter}
              priceUnitLabel={priceUnitLabel}
              valid={p.valid}
            />
          )}

          {/* SHEETS */}
          {effectiveSheet === "result" && p.valid && (
            <CommandResultSheet
              p={p}
              onClose={() => setSheet(null)}
              onSave={doSave}
              isSaved={!!currentSavedEntry}
              onCopy={() => {
                navigator.clipboard?.writeText(query).catch(() => {});
                setSheet(null);
                showToast(t("toast.copied"));
              }}
              onCopyValue={() => {
                setSheet(null);
                copyValue();
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
              onAddToProject={openProjectModal}
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
              onClose={() => setSheet(null)}
              onToggleTheme={cycleTheme}
              dark={dark}
            />
          )}
          {effectiveSheet === "library" && (
            <CommandLibrarySheet
              settings={parserSettings}
              defaultUnit={defaultUnit}
              mode={mode}
              saved={savedEntries}
              compareItems={compareItems}
              projects={projects}
              onClose={() => setSheet(null)}
              onLoadInput={loadInput}
              {...savedHandlers}
              onRemoveCompare={removeCompareItem}
              onClearCompare={clearCompare}
              onCreateProject={createProject}
              onRemoveProjectCalc={removeCalculation}
            />
          )}
          {helpSheet}
          {savedEditSheet}
          {projectCalc && (
            <CommandProjectPickerSheet
              projects={projects}
              onClose={() => setProjectCalc(null)}
              onCreateProject={createProject}
              onPickProject={(project) => handlePickProject(project.id)}
            />
          )}

          {/* TOAST */}
          <CommandToast toast={toast} bottom={120} dark={dark} />
          <ResultAnnouncer text={liveResultText} />
      </div>
    </div>
  );
}

function TokenChip({
  tok,
  kindClass,
  onEdit,
  onRemove,
}: {
  tok: string;
  kindClass: string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("command");
  return (
    <span
      className={`inline-flex items-stretch font-mono text-sm font-semibold rounded-md ${kindClass}`}
    >
      <button
        type="button"
        onClick={onEdit}
        aria-label={t("token.edit", { token: tok })}
        className="pl-2 pr-0.5 py-1.5 rounded-l-md"
      >
        {tok}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("token.remove", { token: tok })}
        className="flex items-center justify-center w-7 rounded-r-md text-[14px] leading-none hover:bg-[rgba(0,0,0,0.08)] dark:hover:bg-[rgba(255,255,255,0.12)]"
      >
        ×
      </button>
    </span>
  );
}

function IconBtn({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="w-[34px] h-[34px] rounded-[11px] border border-border-faint bg-[var(--surface)] flex items-center justify-center cursor-pointer text-foreground-secondary"
    >
      {children}
    </button>
  );
}

function Chev() {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 1l4.5 5L1 11" />
    </svg>
  );
}

function ChipBadge({
  on,
  fam,
  children,
}: {
  on: boolean;
  fam?: import("@ferroscale/metal-core").CommandFamily;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[11.5px] font-semibold whitespace-nowrap"
      style={{
        background: on ? "var(--surface-inset)" : "transparent",
        color: on ? "var(--foreground-secondary)" : "var(--muted-faint)",
        border: on
          ? "1px solid transparent"
          : "1px dashed var(--border-strong)",
      }}
    >
      {fam && on ? (
        <span style={{ color: "var(--accent)" }}>
          <CommandGlyph fam={fam} size={14} />
        </span>
      ) : null}
      {children}
    </span>
  );
}

function PreviewCard({
  p,
  isWeight,
  sym,
  onOpen,
}: {
  p: CommandParseResult;
  isWeight: boolean;
  sym: string;
  onOpen: () => void;
}) {
  const t = useTranslations("command");
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!p.valid}
      className="mx-[18px] mt-3.5 rounded-2xl border border-border-faint bg-[var(--surface)] p-3 text-left block w-[calc(100%-36px)]"
      style={{
        boxShadow: "var(--panel-shadow-soft)",
        cursor: p.valid ? "pointer" : "default",
      }}
    >
      <div className="flex gap-3.5">
        <div className="flex-1">
          <div className="text-[9.5px] font-bold tracking-wider text-muted uppercase">
            {t("preview.perPiece")}
          </div>
          <div
            className="font-mono text-[17px] font-bold mt-1"
            style={{
              color: p.valid ? "var(--foreground)" : "var(--muted-faint)",
            }}
          >
            {p.valid && p.perPieceKg != null
              ? `${fsWeight(p.perPieceKg)} ${fsWeightUnit()}`
              : "—"}
          </div>
        </div>
        <div className="w-px bg-border-faint" />
        <div className="flex-1">
          <div className="text-[9.5px] font-bold tracking-wider text-muted uppercase">
            {isWeight ? t("preview.totalCost") : t("preview.totalWeight")}
          </div>
          <div
            className="font-mono text-[17px] font-bold mt-1"
            style={{
              color: p.valid ? "var(--foreground)" : "var(--muted-faint)",
            }}
          >
            {p.valid && p.totalKg != null && p.totalAmount != null
              ? isWeight
                ? `${sym} ${fsMoney(p.totalAmount)}`
                : `${fsWeight(p.totalKg)} ${fsWeightUnit()}`
              : "—"}
          </div>
        </div>
        {p.valid && (
          <span className="self-center text-muted-faint">
            <Chev />
          </span>
        )}
      </div>
      <div className="flex gap-1.5 mt-3 flex-wrap">
        <ChipBadge on={!!p.alias} fam={p.alias?.fam}>
          {p.alias ? formatCommandAliasName(t, p.alias) : t("preview.profile")}
        </ChipBadge>
        <ChipBadge on={p.hasSize}>{p.hasSize ? p.size.replace(/x/g, "×") : t("preview.size")}</ChipBadge>
        <ChipBadge on={p.lengthM != null}>
          {p.lengthM != null ? `${p.lengthRaw}${p.lengthUnit}` : t("preview.length")}
        </ChipBadge>
        <ChipBadge on={p.qty != null}>{`× ${p.realQty}`}</ChipBadge>
        <ChipBadge on={!!p.gradeLabel}>{p.gradeLabel ?? t("preview.grade")}</ChipBadge>
      </div>
    </button>
  );
}

// suppress unused-import lint for COMMAND_ALIAS_RE (re-exported intentionally elsewhere)
void COMMAND_ALIAS_RE;
