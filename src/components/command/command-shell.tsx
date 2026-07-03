"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/useTheme";
import { useSaved } from "@/hooks/useSaved";
import { useCompare } from "@/hooks/useCompare";
import { useProjects } from "@/hooks/useProjects";
import { usePresets } from "@/hooks/usePresets";
import { useQuickHistory } from "@/hooks/useQuickHistory";
import { cmdParse, cmdClassifyToken, cmdTokenize, inputToQuery } from "@ferroscale/metal-core";
import { cmdSuggest, cmdApplyInsert } from "@ferroscale/metal-core";
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
  formatCommandAliasName,
  formatCommandHint,
  formatCommandIssue,
  formatCommandParseName,
  formatCommandSuggestionLabel,
} from "./command-copy";
import { KIND_BG } from "./command-constants";
import { CommandToast, PricingBadge, ResultAnnouncer } from "./command-atoms";
import { CommandKeypad } from "./command-keypad";
import { CommandDesktop } from "./desktop/command-desktop";
import { CommandLibrarySheet } from "./sheets/library-sheet";
import { CommandProjectPickerSheet } from "./sheets/project-picker-sheet";
import { CommandResultSheet } from "./sheets/result-sheet";
import { CommandSettingsSheet } from "./sheets/settings-sheet";
import { PwaRegister } from "@/components/pwa-register";
import { buildShareUrl, readSharedQuery } from "@/lib/command/share";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";

const HERO_FONT_WEIGHT = 800;
const DESKTOP_CARD_W = 560;
// Trailing space so the demo query renders fully chipped on first load.
const DEMO_QUERY = "hea120 6m x2 s235 ";

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
    isSaved,
    removeSaved,
  } = useSaved();
  const {
    items: compareItems,
    addItem: addCompareItem,
    removeItem: removeCompareItem,
    clearAll: clearCompare,
    isDuplicate: isInCompare,
  } = useCompare();
  const { projects, createProject, addCalculation, removeCalculation } = useProjects();
  const { presetsForProfile } = usePresets();

  const [query, setQuery] = useState(DEMO_QUERY);
  // The URL only mirrors the query once the user has replaced the demo query
  // (or arrived via a share link) — a pristine visit keeps a clean URL.
  const touchedRef = useRef(false);
  // weightAsMain decides the default hero metric; the toggle is a local override.
  const [modeOverride, setModeOverride] = useState<"weight" | "price" | null>(null);
  const mode = modeOverride ?? (weightAsMain ? "weight" : "price");
  const [sheet, setSheet] = useState<null | "result" | "settings" | "library">(null);
  const [toast, setToast] = useState<string | null>(null);
  // Query history — persisted (and Drive-synced) via the quickHistory
  // collection. Backs the desktop session tape and recency suggestions.
  const {
    history: quickHistory,
    push: pushHistory,
    remove: removeHistoryEntry,
    clear: clearHistory,
  } = useQuickHistory();
  const [projectCalc, setProjectCalc] = useState<CommandCalc | null>(null);
  const [isPhoneViewport, setIsPhoneViewport] = useState(false);
  const [isWideViewport, setIsWideViewport] = useState(false);
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
    }),
    [shared, defaultUnit],
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
    if (sharedQuery) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery(`${sharedQuery} `);
      touchedRef.current = true;
    }
  }, []);

  // Once the user leaves the demo query, mirror the query into the URL so the
  // current calculation is always linkable (debounced; replaceState keeps
  // history clean).
  useEffect(() => {
    if (!touchedRef.current) {
      if (query === DEMO_QUERY) return;
      touchedRef.current = true;
    }
    const id = window.setTimeout(() => {
      window.history.replaceState(null, "", buildShareUrl(query, window.location));
    }, 400);
    return () => window.clearTimeout(id);
  }, [query]);

  // Three viewports:
  //  · phone (<640) → fullscreen with on-screen keypad
  //  · medium desktop (640-1023) → centered command card, real input
  //  · wide desktop (≥1024) → two-pane workspace, Library always visible
  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth;
      setIsPhoneViewport(w < 640);
      setIsWideViewport(w >= 1024);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const p: CommandParseResult = useMemo(
    () => cmdParse(query, parserSettings),
    [query, parserSettings],
  );
  const sug = useMemo(
    () => cmdSuggest(query, parserSettings, presetsForProfile, quickHistory),
    [query, parserSettings, presetsForProfile, quickHistory],
  );

  // Auto-close result sheet if query becomes invalid (derive, don't setState)
  const effectiveSheet = sheet === "result" && !p.valid ? null : sheet;

  const sym = CURRENCY_SYMBOLS[shared.currency] ?? "€";
  const priceKeyUnit = shared.priceUnit === "piece" ? "pc" : shared.priceUnit;
  const priceUnitLabel = `${sym}/${priceKeyUnit}`;
  const isW = mode === "weight";

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1700);
  }, []);

  // Copy the hero metric itself (e.g. "141.2 kg" / "€169.44") — the query
  // string has its own copy action.
  const copyValue = useCallback(() => {
    if (!p.valid) return;
    const text = isW
      ? p.totalKg != null
        ? `${fsWeight(p.totalKg)} ${fsWeightUnit(p.totalKg)}`
        : ""
      : p.totalAmount != null
        ? `${sym}${fsMoney(p.totalAmount)}`
        : "";
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => {});
    showToast(t("toast.copiedValue"));
  }, [p, isW, sym, showToast, t]);

  const shareLink = useCallback(() => {
    if (!p.valid) return;
    const url = buildShareUrl(query, window.location);
    if (isPhoneViewport && typeof navigator.share === "function") {
      navigator.share({ url }).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(url).catch(() => {});
    showToast(t("toast.linkCopied"));
  }, [p.valid, query, isPhoneViewport, showToast, t]);

  const doSave = useCallback(() => {
    if (!p.calc) {
      showToast(t("toast.addLength"));
      return;
    }
    // Real save — appears on the Library Saved tab (shared with the full app).
    if (!isSaved(p.calc.result)) {
      const displayName = formatCommandParseName(t, p) ?? p.name;
      const autoName = `${displayName} · ${p.lengthRaw}${p.lengthUnit} ×${p.realQty}`;
      saveCalculation(p.calc.input, p.calc.result, autoName);
    }
    pushHistory(query);
    showToast(t("toast.saved"));
  }, [p, isSaved, saveCalculation, showToast, query, t, pushHistory]);

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
      setQuery((q) => cmdApplyInsert(q, item));
    },
    [doSave],
  );

  const onKey = useCallback((ch: string) => {
    setQuery((q) => q + ch);
  }, []);
  const onPriceUnit = useCallback(() => {
    setQuery((q) => {
      const token = /\s$/.test(q) || q.length === 0
        ? `${formatPriceTokenValue(shared.unitPrice)}/${shared.priceUnit}`
        : `/${shared.priceUnit}`;
      return `${q}${token} `;
    });
  }, [shared.priceUnit, shared.unitPrice]);
  const onBack = useCallback(() => {
    setQuery((q) => q.slice(0, -1));
  }, []);
  const onEnter = useCallback(() => {
    doSave();
  }, [doSave]);

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

  // Medium desktop: ⌘K / Ctrl K refocuses the query input. Escape-to-close
  // lives inside SheetShell itself (works on every viewport, with the focus
  // trap guaranteeing the sheet owns the keyboard).
  useEffect(() => {
    if (isPhoneViewport) return;
    const onKey = (event: KeyboardEvent) => {
      if (
        !isWideViewport &&
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        focusInput();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusInput, isPhoneViewport, isWideViewport]);

  const heroVal = isW
    ? p.totalKg != null
      ? fsWeight(p.totalKg)
      : "—"
    : p.totalAmount != null
      ? fsMoney(p.totalAmount)
      : "—";

  // Screen-reader announcement for the settled result (mirrors the hero +
  // secondary metric). Empty while invalid — the issue line announces errors.
  const liveResultText =
    p.valid && p.totalKg != null
      ? t("aria.liveResult", {
          value:
            `${fsWeight(p.totalKg)} ${fsWeightUnit(p.totalKg)}` +
            (p.totalAmount != null ? ` · ${sym}${fsMoney(p.totalAmount)}` : ""),
        })
      : "";

  // Tokens come from the same tokenizer the parser uses, so glued input
  // ("hea1006m") displays as the pieces it is parsed as.
  const queryTokens = useMemo(() => cmdTokenize(query), [query]);
  // While the query doesn't end in whitespace the last piece is still being
  // typed — the phone view renders it as plain text at the cursor, not a chip.
  const partialToken = !/\s$/.test(query) && queryTokens.length > 0
    ? queryTokens[queryTokens.length - 1]
    : null;
  const chipTokens = partialToken ? queryTokens.slice(0, -1) : queryTokens;
  const removeTokenAt = (idx: number) => {
    const rest = queryTokens.filter((_, i) => i !== idx);
    // Preserve a trailing space so the remaining tokens stay chips and an
    // in-progress partial stays a partial.
    const trailing = rest.length > 0 && /\s$/.test(query) ? " " : "";
    setQuery(rest.join(" ") + trailing);
  };
  // Pull a token back to the end of the query as the editable trailing
  // partial (parser is order-tolerant, so reordering is safe).
  const editTokenAt = (idx: number) => {
    const others = queryTokens.filter((_, i) => i !== idx);
    setQuery(others.join(" ") + (others.length ? " " : "") + queryTokens[idx]);
  };
  const screenBg = dark ? "#161109" : "#f4f0e7";

  // ── Wide desktop (≥1024): sidebar workspace shell ──
  if (isWideViewport) {
    return (
      <div
        className="fixed inset-0 flex overflow-hidden text-foreground"
        style={{ background: screenBg, transition: "background 220ms ease" }}
      >
        <PwaRegister />
        <CommandDesktop
          dark={dark}
          onToggleTheme={cycleTheme}
          query={query}
          setQuery={setQuery}
          p={p}
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
          onRemoveTapeEntry={removeHistoryEntry}
          onClearTape={clearHistory}
          saved={savedEntries}
          compareItems={compareItems}
          projects={projects}
          onSave={doSave}
          onCopy={() => {
            navigator.clipboard?.writeText(query).catch(() => {});
            showToast(t("toast.copied"));
          }}
          onCopyValue={copyValue}
          onShareLink={shareLink}
          onNew={newCalc}
          onSuggest={onSuggest}
          onCompareCurrent={doCompare}
          onAddCompare={addCompareEntry}
          onRemoveCompare={removeCompareItem}
          onClearCompare={clearCompare}
          onAddToProject={openProjectModal}
          onLoadInput={loadInput}
          onRemoveSaved={removeSaved}
          onCreateProject={createProject}
          onRemoveProjectCalc={removeCalculation}
        />
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

  const outerClass = "fixed inset-0 flex items-center justify-center overflow-hidden";
  const outerBg = isPhoneViewport ? screenBg : "var(--background)";

  return (
    <div
      className={outerClass}
      style={{
        background: outerBg,
        transition: "background 220ms ease",
      }}
    >
      <PwaRegister />
      <div
        className="relative flex flex-col overflow-hidden text-foreground"
        style={
          isPhoneViewport
            ? {
                width: "100%",
                height: "100dvh",
                background: screenBg,
              }
            : {
                width: DESKTOP_CARD_W,
                maxWidth: "calc(100vw - 32px)",
                maxHeight: "calc(100vh - 32px)",
                background: screenBg,
                borderRadius: 20,
                border: "1px solid var(--border-faint)",
                boxShadow:
                  "0 1px 2px rgba(0,0,0,0.06), 0 24px 60px -20px rgba(0,0,0,0.35)",
              }
        }
      >
        <div
          className={
            isPhoneViewport
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : "contents"
          }
        >
          {/* Safe-top spacer — honours real device safe-area on mobile, narrow gap on desktop */}
          <div
            className="flex-shrink-0"
            style={
              isPhoneViewport
                ? { paddingTop: "env(safe-area-inset-top, 12px)", height: "auto", minHeight: 12 }
                : { height: 12 }
            }
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
                    background: dark ? "#161109" : "#fff",
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
                  className="leading-[0.82] tracking-[-2.6px]"
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
                    {fsWeightUnit(p.totalKg)}
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
              {p.valid && p.kgm != null ? (
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
                  {!isW && p.pricing.wastePercent > 0 && (
                    <PricingBadge>{t("pricingBadge.waste", { percent: p.pricing.wastePercent })}</PricingBadge>
                  )}
                  {!isW && p.pricing.includeVat && (
                    <PricingBadge>{t("pricingBadge.vat", { percent: p.pricing.vatPercent })}</PricingBadge>
                  )}
                </span>
              ) : p.issues.length > 0 ? (
                <span
                  className="font-mono text-[12px]"
                  style={{ color: "var(--amber-text)" }}
                  role="status"
                >
                  {formatCommandIssue(t, p.issues[0])}
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

          {isPhoneViewport && <div className="flex-1 min-h-[6px]" />}

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
              className="flex gap-1.5 px-[18px] pb-0.5"
              style={{ overflowX: "auto" }}
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
                    // After picking, return focus to the input so the user can
                    // keep typing immediately.
                    if (!isPhoneViewport) focusInput();
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
                  className="flex-shrink-0 flex items-center gap-1.5 rounded-[12px] font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--screen,var(--surface))]"
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
                        ? dark
                          ? "#161109"
                          : "#fff"
                        : "var(--foreground)",
                    boxShadow: "var(--panel-shadow-soft)",
                  }}
                >
                  {it.fam && (
                    <span style={{ color: "var(--accent)" }}>
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
            {/* Right-edge fade hints that the chip row scrolls */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-7"
              style={{
                background: `linear-gradient(to right, transparent, ${screenBg})`,
              }}
            />
            </div>
          </div>

          {/* QUERY AREA */}
          {isPhoneViewport ? (
            <div className="px-[14px] pb-2">
              <div
                className="flex items-center gap-1.5 flex-wrap rounded-[15px] px-3 py-2.5"
                style={{
                  minHeight: 50,
                  border: "1.5px solid var(--accent-border)",
                  background: "var(--surface)",
                  boxShadow: dark
                    ? "0 0 0 3px rgba(240,121,63,0.13)"
                    : "0 0 0 3px rgba(216,82,31,0.10)",
                }}
              >
                <span
                  className="font-mono text-base font-bold mr-0.5"
                  style={{ color: "var(--accent)" }}
                >
                  ›
                </span>
                {queryTokens.length === 0 && (
                  <span className="font-mono text-sm text-muted-faint">
                    {t("query.placeholder")}
                  </span>
                )}
                {chipTokens.map((tok, i) => (
                  <TokenChip
                    key={`${tok}-${i}`}
                    tok={tok}
                    kindClass={KIND_BG[cmdClassifyToken(tok)]}
                    onEdit={() => editTokenAt(i)}
                    onRemove={() => removeTokenAt(i)}
                  />
                ))}
                {partialToken && (
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {partialToken}
                  </span>
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
          ) : (
            <div className="px-4 pb-4 flex-shrink-0">
              {queryTokens.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2 px-0.5">
                  {queryTokens.map((tok, i) => (
                    <TokenChip
                      key={`${tok}-${i}`}
                      tok={tok}
                      kindClass={KIND_BG[cmdClassifyToken(tok)]}
                      onEdit={() => {
                        editTokenAt(i);
                        focusInputAtEnd();
                      }}
                      onRemove={() => {
                        removeTokenAt(i);
                        focusInputAtEnd();
                      }}
                    />
                  ))}
                </div>
              )}
              <label
                className="flex items-center gap-2 rounded-[15px] px-3 py-2.5 cursor-text"
                style={{
                  minHeight: 50,
                  border: "1.5px solid var(--accent-border)",
                  background: "var(--surface)",
                  boxShadow: dark
                    ? "0 0 0 3px rgba(240,121,63,0.13)"
                    : "0 0 0 3px rgba(216,82,31,0.10)",
                }}
              >
                <span
                  className="font-mono text-base font-bold"
                  style={{ color: "var(--accent)" }}
                  aria-hidden="true"
                >
                  ›
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (p.valid) {
                        e.preventDefault();
                        doSave();
                        return;
                      }
                      // Mid-query: insert the first matching suggestion chip
                      // (skip the "Save calculation" chip in the Ready stage).
                      const first = sug.items.find((it) => it.kind !== "save");
                      if (first) {
                        e.preventDefault();
                        onSuggest(first);
                      }
                      return;
                    }
                    // Arrow-down opens chip navigation; Tab stays out of the
                    // chip row entirely so typing isn't trapped.
                    if (e.key === "ArrowDown" && sug.items.length > 0) {
                      e.preventDefault();
                      firstSuggestionRef.current?.focus();
                    }
                  }}
                  autoFocus
                  autoCapitalize="off"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={t("query.placeholder")}
                  aria-label={t("query.aria")}
                  className="flex-1 bg-transparent outline-none font-mono text-sm text-foreground placeholder:text-muted-faint min-w-0"
                />
                <kbd className="text-[10px] font-mono font-semibold text-muted-faint px-1.5 py-0.5 rounded border border-border-faint">
                  ⌘K
                </kbd>
              </label>
            </div>
          )}
        </div>

          {/* On-screen keypad: phone only */}
          {isPhoneViewport && (
            <CommandKeypad
              onKey={onKey}
              onPriceUnit={onPriceUnit}
              onBack={onBack}
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
              themeLabel={dark ? t("settings.dark") : t("settings.light")}
            />
          )}
          {effectiveSheet === "library" && (
            <CommandLibrarySheet
              settings={parserSettings}
              defaultUnit={defaultUnit}
              saved={savedEntries}
              compareItems={compareItems}
              projects={projects}
              onClose={() => setSheet(null)}
              onLoadInput={loadInput}
              onRemoveSaved={removeSaved}
              onRemoveCompare={removeCompareItem}
              onClearCompare={clearCompare}
              onCreateProject={createProject}
              onRemoveProjectCalc={removeCalculation}
            />
          )}
          {projectCalc && (
            <CommandProjectPickerSheet
              projects={projects}
              onClose={() => setProjectCalc(null)}
              onCreateProject={createProject}
              onPickProject={(project) => handlePickProject(project.id)}
            />
          )}

          {/* TOAST */}
          <CommandToast toast={toast} bottom={isPhoneViewport ? 120 : 20} dark={dark} />
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
              ? `${fsWeight(p.perPieceKg)} ${fsWeightUnit(p.perPieceKg)}`
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
                : `${fsWeight(p.totalKg)} ${fsWeightUnit(p.totalKg)}`
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
