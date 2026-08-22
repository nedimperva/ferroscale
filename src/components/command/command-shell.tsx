"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/useTheme";
import { useCountUp, markExternalValueChange } from "@/hooks/useCountUp";
import { useSaved } from "@/hooks/useSaved";
import type { SavedEntry } from "@/hooks/useSaved";
import { useCompare } from "@/hooks/useCompare";
import { isArchivedProject, MAX_PROJECTS, useProjects } from "@/hooks/useProjects";
import { usePresets } from "@/hooks/usePresets";
import { usePriceBook } from "@/hooks/usePriceBook";
import { buildSizePresetLookup } from "@/lib/saved/size-presets";
import { useQuickHistory } from "@/hooks/useQuickHistory";
import { cmdParse, cmdClassifyToken, cmdTokenize, inputToQuery } from "@ferroscale/metal-core";
import {
  cmdSuggest,
  cmdApplyInsert,
  cmdAppendLineItem,
  cmdDetectStage,
  cmdParseLine,
} from "@ferroscale/metal-core";
import { COMMAND_ALIAS_RE } from "@ferroscale/metal-core";
import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import {
  defaultUnitStore,
  massTolerancePercentStore,
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
  formatCommandHint,
  formatCommandIssue,
  formatCommandParseName,
  formatCommandSuggestionLabel,
  buildCommandSummary,
} from "./command-copy";
import { buildShareCardModel } from "./line-summary";
import { CommandHelpSheet } from "./sheets/help-sheet";
import { KIND_BG } from "./command-constants";
import { commandTargetNote } from "./target-note";
import { massBand } from "./mass-band";
import {
  activeItemText,
  applyToActiveItem,
  editLineToken,
  lineChips,
  lineExpandedIndex,
  removeLineToken,
  replaceLineToken,
} from "./line-edit";
import { TokenChip } from "./token-chip";
import { useExpandedItem } from "./use-expanded-item";
import { CommandToast, PricingBadge, ResultAnnouncer, TargetBadge } from "./command-atoms";
import type { CommandToastState } from "./command-atoms";
import { CommandKeypad } from "./command-keypad";
import {
  commandKeypadInsert,
  commandKeypadLayout,
  type CommandKeypadOverride,
} from "./keypad-layout";
import { CommandDesktop } from "./desktop/command-desktop";
import { CommandLibrarySheet } from "./sheets/library-sheet";
import type { ProjectActions } from "./projects/project-actions";
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
import { shareCalculation } from "@/lib/command/share-card";
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
  const {
    projects,
    createProject,
    renameProject,
    updateProjectMeta,
    updateProjectDescription,
    logQuotePrinted,
    deleteProject,
    restoreProject,
    duplicateProject,
    addCalculation,
    addCalculations,
    addTemplateCalculation,
    removeCalculation,
    updateCalculationQuantity,
    updateCalculationNote,
    updateProjectPaintCoats,
  } = useProjects();
  const { presets } = usePresets();
  const priceBook = usePriceBook();

  const [query, setQuery] = useState(DEMO_QUERY);
  // The URL only mirrors the query once the user has replaced the demo query
  // (or arrived via a share link) — a pristine visit keeps a clean URL.
  const touchedRef = useRef(false);
  // weightAsMain decides the default hero metric; the toggle is a local override.
  const [modeOverride, setModeOverride] = useState<"weight" | "price" | null>(null);
  const mode = modeOverride ?? (weightAsMain ? "weight" : "price");
  const massTolerancePercent = useSyncExternalStore(
    massTolerancePercentStore.subscribe,
    massTolerancePercentStore.getSnapshot,
    massTolerancePercentStore.getServerSnapshot,
  );
  const [sheet, setSheet] = useState<null | "result" | "settings" | "library" | "help">(null);
  /** Which Library tab the next open lands on — the palette navigates here. */
  const [libraryTab, setLibraryTab] = useState<
    "session" | "saved" | "compare" | "projects" | null
  >(null);
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
  /** A saved part or assembly waiting for a project to be picked for it. */
  const [projectEntry, setProjectEntry] = useState<SavedEntry | null>(null);
  // Which saved entry the name/notes/tags editor is open for (id, not the
  // record, so the sheet always renders the live version of it).
  const [editingSavedId, setEditingSavedId] = useState<string | null>(null);
  const [isPhoneViewport, setIsPhoneViewport] = useState(false);
  /** Letters / number pad chosen by hand. Cleared when the active item empties. */
  const [keypadOverride, setKeypadOverride] = useState<CommandKeypadOverride>(null);
  const [isWideViewport, setIsWideViewport] = useState(false);
  /** Workspace, but narrow: one column, breakdown folded away. */
  const [isCompactDesktop, setIsCompactDesktop] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  /** The phone's chip box — kept scrolled to the caret as the line grows. */
  const queryLineRef = useRef<HTMLDivElement | null>(null);
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

  // The boot splash covers SSR→hydration on slow loads; once this shell is
  // mounted it is obsolete, and on a fast load it would still be playing its
  // own fade for another few hundred ms. Retire it the moment we exist.
  useEffect(() => {
    document.documentElement.classList.add("app-ready");
  }, []);

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
  // Parts are the size presets. A leftover DimensionPreset collection still
  // folds in so old synced data is not dropped; nothing new is written there.
  const sizePresetsForProfile = useMemo(
    () => buildSizePresetLookup(savedEntries, presets),
    [savedEntries, presets],
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
          markExternalValueChange();
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
    const summary = buildCommandSummary(t, p, line);
    if (!summary) return;
    navigator.clipboard?.writeText(summary).catch(() => {});
    showToast(t("toast.copiedSummary"));
  }, [t, p, line, showToast]);

  const shareLink = useCallback(() => {
    if (!p.valid) return;
    const url = buildShareUrl(query, window.location, shared);
    if (isPhoneViewport) {
      const card = buildShareCardModel(t, p, line, query);
      void shareCalculation({
        summary: buildCommandSummary(t, p, line),
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
  }, [p, line, query, shared, isPhoneViewport, showToast, t]);

  // The bookmark state of the line currently in the bar — drives the Save
  // button's filled/outlined look, so "is this one saved?" is answerable
  // without opening the library.
  // Same guard as doSave: a multi-item line saves as a new assembly every
  // time, so matching it against one of its own parts would show "saved" on a
  // button that is about to create something.
  const currentSavedEntry = !line.multi && p.calc ? getSavedEntry(p.calc.result) : undefined;

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
    if (line.multi) {
      // An assembly's placeholder name ("Assembly (2 parts)") says nothing a
      // search could find — ask for the real one now, not via a toast that
      // five seconds of jobsite noise can swallow.
      setEditingSavedId(entry.id);
    } else {
      showActionToast(t("toast.saved"), {
        label: t("common.nameIt"),
        onAction: () => setEditingSavedId(entry.id),
      });
    }
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
   * Commit whatever the picker was opened for. A saved entry with one part is
   * an ordinary item; an assembly goes in as a template entry so the project
   * keeps it as one named line with its parts behind it, the way it was saved.
   */
  const handlePickProject = useCallback(
    (projectId: string) => {
      let ok = false;
      if (projectEntry) {
        const parts = repriceSavedEntry(projectEntry);
        if (parts.length > 1) {
          ok = addTemplateCalculation(projectId, projectEntry.name, parts, 1);
        } else if (parts.length === 1) {
          ok = addCalculation(projectId, parts[0].input, parts[0].result);
        }
      } else if (projectCalc) {
        ok = addCalculation(projectId, projectCalc.input, projectCalc.result);
      } else {
        return;
      }
      setProjectCalc(null);
      setProjectEntry(null);
      const project = projects.find((p) => p.id === projectId);
      showToast(
        ok
          ? t("toast.addedToProject", { project: project?.name ?? t("common.project") })
          : t("toast.projectFull"),
      );
    },
    [
      projectCalc,
      projectEntry,
      repriceSavedEntry,
      addCalculation,
      addTemplateCalculation,
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

  /**
   * The Projects surface's whole vocabulary, assembled once. Deleting shows an
   * undo toast rather than a confirm dialog: the tombstone is reversible and a
   * modal for a project you can put back is a tax on the common case.
   */
  const projectActions: ProjectActions = useMemo(
    () => ({
      onCreate: (name: string) => {
        if (projects.length >= MAX_PROJECTS) {
          showToast(t("projects.full"));
          return;
        }
        return createProject(name);
      },
      onRename: renameProject,
      onUpdateMeta: (id, patch) => {
        updateProjectMeta(id, patch);
        if (patch.status === "archived") showToast(t("projects.archivedToast"));
        else if (patch.status === "draft") showToast(t("projects.unarchivedToast"));
      },
      onUpdateNotes: updateProjectDescription,
      onDuplicate: (id) => {
        const copy = duplicateProject(id);
        showToast(copy ? t("toast.duplicated") : t("projects.full"));
      },
      onDelete: (id) => {
        deleteProject(id);
        showActionToast(t("projects.deleted"), {
          label: t("common.undo"),
          onAction: () => {
            restoreProject(id);
            showToast(t("toast.restored"));
          },
        });
      },
      onRemoveItem: removeCalculation,
      onSetItemQuantity: updateCalculationQuantity,
      onSetItemNote: updateCalculationNote,
      onSetPaintCoats: updateProjectPaintCoats,
      onOpenItem: loadInput,
      onAddItem: (projectId: string) => {
        if (!p.calc) {
          showToast(t("toast.addLength"));
          return false;
        }
        const ok = addCalculation(projectId, p.calc.input, p.calc.result);
        const name = projects.find((project) => project.id === projectId)?.name;
        showToast(
          ok
            ? t("toast.addedToProject", { project: name ?? t("common.project") })
            : t("projects.itemsFull"),
        );
        return ok;
      },
      onPrintQuote: (project) => logQuotePrinted(project.id),
    }),
    [
      projects,
      createProject,
      renameProject,
      updateProjectMeta,
      updateProjectDescription,
      duplicateProject,
      deleteProject,
      restoreProject,
      removeCalculation,
      updateCalculationQuantity,
      updateCalculationNote,
      updateProjectPaintCoats,
      loadInput,
      addCalculation,
      logQuotePrinted,
      p.calc,
      showToast,
      showActionToast,
      t,
    ],
  );

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

  // Tokens come from the same tokenizer the parser uses, so glued input
  // ("hea1006m") displays as the pieces it is parsed as.
  // Chips are grouped by item, so a `+`-joined line renders as the two (or
  // more) calculations it is. While the query doesn't end in whitespace the
  // last piece is still being typed — rendered as plain text at the cursor.
  const chips = useMemo(() => lineChips(query), [query]);
  const partialToken = chips.partial || null;
  const chipCount = chips.groups.reduce((n, group) => n + group.tokens.length, 0);
  if (activeQuery.trim() === "" && keypadOverride !== null) {
    setKeypadOverride(null);
  }
  const keypadStage = cmdDetectStage(activeQuery, p);
  const keypadMode = commandKeypadLayout(activeQuery, p, keypadOverride);
  const keypadShowNumbers =
    keypadMode === "letters" &&
    (keypadOverride === "letters" ||
      (keypadStage.stage !== "empty" && keypadStage.stage !== "profile"));
  // Faint completion drawn after the caret (profile letters / recent prefix).
  const ghost = computeGhost(partialToken ?? "", sug);
  const acceptGhost = () => {
    if (ghost && sug.items[0]) onSuggest(sug.items[0]);
  };
  /**
   * Which item shows its tokens on the phone. A `+`-joined line of four items
   * is far more chips than a phone's query line can hold, and the old capped
   * scroll window showed them sliced across half-rows. Only the item you are
   * working on is spelled out; the rest are one chip each, and the hero above
   * already lists every item with its weight and price.
   *
   * `null` means the item the caret is in — the last one — which is what any
   * keystroke goes into. Tapping another item's chip parks the expansion there
   * until the query changes for a reason other than editing that item.
   */
  const { expandedItem, setExpandedItem, lockExpanded } = useExpandedItem(query);
  const expandedIndex = lineExpandedIndex(chips.groups, expandedItem);

  /** An edit inside the open item is not a reason to close it. */
  const keepExpanded = (item: number, next: string) => {
    lockExpanded(item, next);
    setQuery(next);
  };
  const removeTokenAt = (item: number, idx: number) => {
    keepExpanded(item, removeLineToken(query, item, idx));
  };
  const replaceTokenAt = (item: number, idx: number, next: string) => {
    keepExpanded(item, replaceLineToken(query, item, idx, next));
  };
  // Pull a token back to the end of its own item as the editable partial (the
  // parser is order-tolerant within an item, so the reordering is free).
  const editTokenAt = (item: number, idx: number) => {
    keepExpanded(item, editLineToken(query, item, idx));
  };
  // The caret lives at the end of the line, so the row has to follow it
  // sideways as tokens are added — otherwise typing walks off the visible area.
  useEffect(() => {
    const el = queryLineRef.current;
    if (!el) return;
    // Opening an earlier item scrolls to that item; otherwise the caret is the
    // last thing in the row, so the end of the scroll *is* the caret and the
    // line follows what is being typed.
    const opened = el.querySelector<HTMLElement>("[data-expanded-start]");
    if (opened) {
      el.scrollLeft += opened.getBoundingClientRect().left - el.getBoundingClientRect().left - 12;
    } else {
      el.scrollLeft = el.scrollWidth;
    }
  }, [query, expandedIndex]);

  /** One chip standing in for a whole item, labelled as the hero numbers it. */
  const collapsedItemLabel = (group: (typeof chips.groups)[number]) =>
    line.items[group.item]?.parse.name ||
    group.tokens[0] ||
    partialToken ||
    String(group.item + 1);
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
    onAddSavedToProject: (entry: SavedEntry) => {
      setSheet(null);
      setProjectEntry(entry);
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
          projectActions={projectActions}
          currentSaved={!!currentSavedEntry}
          onOpenHelp={() => setSheet("help")}
          onRemoveSavedMany={removeSavedEntries}
          {...savedHandlers}
        />
        {helpSheet}
        {savedEditSheet}
        {(projectCalc || projectEntry) && (
          <CommandProjectPickerSheet
            projects={projects.filter((project) => !isArchivedProject(project))}
            onClose={() => {
              setProjectCalc(null);
              setProjectEntry(null);
            }}
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
      className="fixed inset-0 flex overflow-hidden"
      style={{ background: screenBg, transition: "background 220ms ease" }}
    >
      <PwaRegister />
      {/* Fills the fixed parent exactly. It used to be `height: 100dvh`, which
          on iOS resolves differently from the fixed element's own box — the
          shorter of the two left a band of screen background below the keypad
          instead of the keys sitting flush on the bottom edge. */}
      <div
        className="relative flex flex-col overflow-hidden text-foreground"
        style={{ width: "100%", height: "100%", background: screenBg }}
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
          <div className="px-[18px] pt-1.5 flex-shrink-0">
            {/* The mode switch rides in the hero's label row rather than taking
                a full-width row of its own — the fold's single biggest saving. */}
            <div className="flex items-center justify-between mb-0.5">
              {/* Names the metric rather than the mode — the highlighted pill
                  already says which mode is on. */}
              <span className="fs-track-label text-[10px] font-bold uppercase text-muted">
                {isW ? t("preview.totalWeight") : t("preview.totalCost")}
              </span>
              <div className="flex gap-1">
                {(["weight", "price"] as const).map((m) => {
                  const active = mode === m;
                  const isWeight = m === "weight";
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModeOverride(m)}
                      aria-pressed={active}
                      className="fs-track-label rounded-[9px] text-[10.5px] font-bold"
                      style={{
                        padding: "4px 12px",
                        border: active
                          ? `1px solid ${isWeight ? "var(--accent-border)" : "var(--blue-border)"}`
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
                      {/* Same words as the desktop toggle — the concept is
                          one, so the label is one (KG/€ read as units). */}
                      {(isWeight ? t("settings.weight") : t("settings.price")).toUpperCase()}
                    </button>
                  );
                })}
              </div>
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
                  className="leading-[0.88] tracking-[-2.4px] fs-display-num"
                  style={{
                    fontSize: 56,
                    fontWeight: HERO_FONT_WEIGHT,
                    color: heroVal === "—" ? "var(--muted-faint)" : "var(--foreground)",
                  }}
                >
                  {heroVal}
                </span>
                {isW && p.totalKg != null && (
                  <span
                    className="text-[22px] font-bold"
                    style={{ color: "var(--accent)" }}
                  >
                    {fsWeightUnit()}
                  </span>
                )}
                {band && (
                  <span
                    className="fs-track-wide font-mono text-[11px] text-muted self-end pb-2 ml-1"
                    >
                    {band.percentLabel}
                  </span>
                )}
                {p.valid && (
                  <span className="ml-auto self-center text-muted-faint">
                    <Chev />
                  </span>
                )}
              </div>
            </button>

            <div className="flex items-center gap-2.5 mt-2.5 min-h-[18px]">
              {line.multi ? (
                <span className="font-mono text-[12px] text-muted">
                  {t("result.assembly", { count: line.items.length })}
                </span>
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

            <MetricStrip
              p={p}
              isWeight={isW}
              sym={sym}
              onOpen={() => p.valid && setSheet("result")}
            />

            <div className="flex gap-1.5 mt-2">
              <ActionBtn onClick={doSave} primary={!!currentSavedEntry}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill={currentSavedEntry ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                </svg>
                {currentSavedEntry ? t("common.saved") : t("common.save")}
              </ActionBtn>
              <ActionBtn onClick={doCompare}>{t("nav.compare")}</ActionBtn>
              <ActionBtn onClick={shareLink}>{t("common.share")}</ActionBtn>
              {/* The fold doesn't draw this, but without it the phone can only
                  view a multi-item line, never start one. */}
              <button
                type="button"
                onClick={() => {
                  haptic("tap");
                  setQuery((q) => cmdAppendLineItem(q));
                }}
                disabled={!p.valid}
                aria-label={t("suggest.addItem")}
                className="flex items-center justify-center rounded-button text-[16px] font-bold leading-none"
                style={{
                  width: 44,
                  height: 44,
                  border: "1px dashed var(--border-strong)",
                  background: "transparent",
                  color: "var(--muted)",
                  opacity: p.valid ? 1 : 0.4,
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* SESSION RIBBON — the tape's running total, one tap from the
              library, with + to add the current line. Recents moved into the
              library's session tab; this is what the phone gets instead. */}
          <div
            className="flex items-center gap-2.5 mx-[18px] mt-2 rounded-[13px] flex-shrink-0"
            style={{ padding: "7px 11px", border: "1px dashed var(--border-strong)" }}
          >
            <span className="fs-track-wide text-[10px] font-bold uppercase text-muted whitespace-nowrap flex-shrink-0">
              {t("desktop.session")}
            </span>
            {/* The total in whichever unit the hero is showing, then how many
                lines it came from. Showing weight and money side by side made
                the row two lines tall as soon as the session had anything in
                it, and truncating a number mid-digit is worse than omitting it
                — the full breakdown is one tap away in the session tab. */}
            <span className="font-mono text-[13px] font-bold whitespace-nowrap flex-shrink-0">
              {sessionSummary.count === 0
                ? "—"
                : isW
                  ? `${fsWeight(sessionSummary.kg)} ${fsWeightUnit()}`
                  : `${sym}${fsMoney(sessionSummary.amount)}`}
            </span>
            <span className="font-mono text-[11.5px] text-muted truncate min-w-0">
              {sessionSummary.count > 0
                ? t("library.calcCount", { count: sessionSummary.count })
                : ""}
            </span>
            <button
              type="button"
              onClick={() => {
                setLibraryTab("session");
                setSheet("library");
              }}
              className="fs-track-wide ml-auto flex-shrink-0 whitespace-nowrap text-[10px] font-bold uppercase text-muted-faint"
              style={{ padding: "4px 6px" }}
            >
              {t("common.open")} ›
            </button>
            <button
              type="button"
              onClick={logToSession}
              aria-label={t("aria.addToSession")}
              className="flex items-center justify-center rounded-[9px] text-[16px] font-bold leading-none"
              style={{
                width: 28,
                height: 28,
                border: "1px solid var(--accent-border)",
                background: "var(--accent-surface)",
                color: "var(--accent-text)",
              }}
            >
              +
            </button>
          </div>

          <div className="flex-1 min-h-[6px]" />

          {/* SUGGESTION BAR */}
          {/* The gap under the strip has to clear the query line's 3px focus
              ring, not just its border box — at pb-1.5 the chips sat on the
              glow and the two read as one collided control. */}
          <div className="pb-2.5">
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
              // One row that scrolls sideways, per the fold. Wrapping to two
              // rows made the strip's height depend on how many chips the stage
              // happened to produce, and the second row was clipped by the
              // query line — the layout has no vertical give to lend it.
              data-suggestion-strip=""
              // `overflowY: hidden` clips at the padding edge, so the chips
              // need room below them or their own borders get shaved off.
              className="flex gap-1.5 px-[18px] pb-1"
              style={{ overflowX: "auto", overflowY: "hidden" }}
            >
              {(isPhoneViewport
                ? sug.items.filter((it) => it.kind !== "save")
                : sug.items
              ).map((it, i) => (
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
                    // 44px touch targets — the strip is the phone's main
                    // input accelerator, tapped with thumbs on the jobsite.
                    padding: it.sub ? "9px 13px" : "12px 14px",
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
                ref={queryLineRef}
                data-query-line=""
                onClick={() => {
                  if (keypadMode === "actions") setKeypadOverride("numpad");
                }}
                // One row that scrolls sideways to the caret, never wrapping.
                // Wrapping meant the line's height depended on the token count:
                // capped, it sliced chips across half-rows; uncapped, a long
                // line grew to four rows and pushed the keypad's bottom row off
                // the screen. A fixed height keeps the input and its keys where
                // they were, whatever the line holds.
                className="flex items-center gap-1.5 flex-nowrap rounded-[15px] px-3 py-2.5"
                style={{
                  height: 50,
                  overflowX: "auto",
                  overflowY: "hidden",
                  border: "1.5px solid var(--accent-border)",
                  background: "var(--surface)",
                  boxShadow: dark
                    ? "0 0 0 3px rgba(240,121,63,0.13)"
                    : "0 0 0 3px rgba(196,71,26,0.10)",
                }}
              >
                <span
                  className="font-mono text-base font-bold mr-0.5 flex-shrink-0"
                  style={{ color: "var(--accent)" }}
                >
                  ›
                </span>
                {chipCount === 0 && !partialToken && (
                  <span className="font-mono text-sm text-muted-faint whitespace-nowrap flex-shrink-0">
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
                    {group.item === expandedIndex ? (
                      group.tokens.map((tok, i) => (
                        <TokenChip
                          key={`${tok}-${i}`}
                          // Only an item opened by hand needs seeking to; the
                          // last item is where the caret already is.
                          anchor={i === 0 && group.item !== chips.groups.length - 1}
                          tok={tok}
                          kindClass={KIND_BG[cmdClassifyToken(tok)]}
                          shadowed={line.items[group.item]?.parse.shadowedTokenIndexes.includes(i)}
                          onEdit={() => editTokenAt(group.item, i)}
                          onRemove={() => removeTokenAt(group.item, i)}
                          onReplace={(next) => replaceTokenAt(group.item, i, next)}
                        />
                      ))
                    ) : group.tokens.length === 0 ? null : (
                      <button
                        type="button"
                        onClick={() => setExpandedItem(group.item)}
                        aria-label={t("query.expandItem", {
                          index: group.item + 1,
                          name: collapsedItemLabel(group),
                        })}
                        className="inline-flex items-center gap-1.5 flex-shrink-0 rounded-lg font-mono text-sm font-semibold whitespace-nowrap"
                        style={{
                          padding: "5px 10px",
                          border: "1px solid var(--border-faint)",
                          background: "var(--surface-inset)",
                          color: "var(--foreground-secondary)",
                        }}
                      >
                        <span className="text-[11px] text-muted-faint">{group.item + 1}</span>
                        {collapsedItemLabel(group)}
                        <span className="text-[10px] text-muted-faint">▸</span>
                      </button>
                    )}
                  </Fragment>
                ))}
                {partialToken && (
                  <span className="font-mono text-sm font-semibold text-foreground flex-shrink-0">
                    {partialToken}
                  </span>
                )}
                {ghost && (
                  <button
                    type="button"
                    onClick={acceptGhost}
                    aria-label={t("query.acceptGhost", { text: ghost.trim() })}
                    className="font-mono text-sm font-semibold whitespace-pre flex-shrink-0"
                    style={{ color: "var(--muted-faint)" }}
                  >
                    {ghost}
                  </button>
                )}
                <span
                  className="w-0.5 h-5 rounded-sm flex-shrink-0"
                  style={{
                    background: "var(--accent)",
                    animation: "fsBlink 1s steps(1) infinite",
                  }}
                />
              </div>
            </div>
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
            onTweak={() => setKeypadOverride("numpad")}
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
              onSave={doSave}
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
                setSheet(null);
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
          {(projectCalc || projectEntry) && (
            <CommandProjectPickerSheet
              projects={projects.filter((project) => !isArchivedProject(project))}
              onClose={() => {
                setProjectCalc(null);
                setProjectEntry(null);
              }}
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
      className="w-[34px] h-[34px] rounded-button border border-border-faint bg-[var(--surface)] flex items-center justify-center cursor-pointer text-foreground-secondary"
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


/**
 * The fold's one-line answer to "show me more": per-piece and the other
 * headline metric side by side, with the whole strip acting as the way into
 * the full breakdown. It replaces a 109px two-stat card with a 34px row —
 * the single biggest saving on the phone after the mode pills.
 */
function MetricStrip({
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
  const dim = { color: "var(--muted-faint)" };
  const perPiece =
    p.valid && p.perPieceKg != null ? `${fsWeight(p.perPieceKg)} ${fsWeightUnit()}` : "—";
  const second =
    p.valid && p.totalKg != null && p.totalAmount != null
      ? isWeight
        ? `${sym} ${fsMoney(p.totalAmount)}`
        : `${fsWeight(p.totalKg)} ${fsWeightUnit()}`
      : "—";

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!p.valid}
      className="flex items-center gap-3 w-full mt-2.5 rounded-button text-left border border-border-faint"
      style={{
        padding: "7px 11px",
        background: "var(--surface-raised)",
        cursor: p.valid ? "pointer" : "default",
      }}
    >
      <span className="font-mono text-[12.5px] font-semibold whitespace-nowrap" style={p.valid ? undefined : dim}>
        {perPiece}
        <span className="text-muted">{t("preview.perPieceSuffix")}</span>
      </span>
      <span className="w-px h-3.5 bg-border-faint" />
      <span className="font-mono text-[12.5px] font-semibold whitespace-nowrap" style={p.valid ? undefined : dim}>
        {second}
      </span>
      <span className="fs-track-wide ml-auto text-[10px] font-bold uppercase text-muted-faint whitespace-nowrap">
        {t("preview.breakdown")} ›
      </span>
    </button>
  );
}

/** One of the three equal actions under the hero (Save / Compare / Share). */
function ActionBtn({
  onClick,
  primary,
  children,
}: {
  onClick: () => void;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-button text-[12px] font-bold"
      style={{
        height: 44,
        letterSpacing: 0.4,
        border: `1px solid ${primary ? "var(--accent-border)" : "var(--border-faint)"}`,
        background: primary ? "var(--accent-surface)" : "var(--surface)",
        color: primary ? "var(--accent-text)" : "var(--foreground-secondary)",
      }}
    >
      {children}
    </button>
  );
}

// suppress unused-import lint for COMMAND_ALIAS_RE (re-exported intentionally elsewhere)
void COMMAND_ALIAS_RE;
