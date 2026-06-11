"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useSaved } from "@/hooks/useSaved";
import { useCompare } from "@/hooks/useCompare";
import { useProjects } from "@/hooks/useProjects";
import { usePresets } from "@/hooks/usePresets";
import { cmdParse, cmdClassifyToken, inputToQuery } from "@/lib/command/parser";
import { cmdSuggest, cmdApplyInsert } from "@/lib/command/suggest";
import { COMMAND_ALIAS_RE } from "@/lib/command/aliases";
import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@/lib/command/format";
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
  CommandTokenKind,
} from "@/lib/command/types";
import { CommandGlyph } from "./command-glyph";
import { CommandKeypad } from "./command-keypad";
import {
  CommandLibrarySheet,
  CommandLibraryWorkspace,
  CommandProjectPickerSheet,
  CommandResultBreakdown,
  CommandResultSheet,
  CommandSettingsSheet,
} from "./command-sheets";
import { PwaRegister } from "@/components/pwa-register";
import type { CalculationInput } from "@/lib/calculator/types";

const HERO_FONT_WEIGHT = 800;
const DESKTOP_CARD_W = 560;


export function CommandShell() {
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

  const [query, setQuery] = useState("hea120 6m x2 s235");
  // weightAsMain decides the default hero metric; the toggle is a local override.
  const [modeOverride, setModeOverride] = useState<"weight" | "price" | null>(null);
  const mode = modeOverride ?? (weightAsMain ? "weight" : "price");
  const [sheet, setSheet] = useState<null | "result" | "settings" | "library">(null);
  const [toast, setToast] = useState<string | null>(null);
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
  }, []);

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
    () => cmdSuggest(query, parserSettings, presetsForProfile),
    [query, parserSettings, presetsForProfile],
  );

  // Auto-close result sheet if query becomes invalid (derive, don't setState)
  const effectiveSheet = sheet === "result" && !p.valid ? null : sheet;

  const sym = CURRENCY_SYMBOLS[shared.currency] ?? "€";
  const isW = mode === "weight";

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1700);
  }, []);

  const doSave = useCallback(() => {
    if (!p.calc) {
      showToast("Add length to save");
      return;
    }
    // Real save — appears on the Library Saved tab (shared with the full app).
    if (!isSaved(p.calc.result)) {
      const autoName = `${p.name} · ${p.lengthRaw}${p.lengthUnit} ×${p.realQty}`;
      saveCalculation(p.calc.input, p.calc.result, autoName);
    }
    showToast("Saved");
  }, [p, isSaved, saveCalculation, showToast]);

  const loadInput = useCallback(
    (input: CalculationInput) => {
      const q = inputToQuery(input, defaultUnit, {
        defaultGradeId: shared.defaultGradeId,
      });
      if (q) setQuery(q);
      setSheet(null);
    },
    [defaultUnit, shared.defaultGradeId],
  );

  const handlePickProject = useCallback(
    (projectId: string) => {
      if (!projectCalc) return;
      const ok = addCalculation(projectId, projectCalc.input, projectCalc.result);
      setProjectCalc(null);
      const project = projects.find((p) => p.id === projectId);
      showToast(ok ? `Added to ${project?.name ?? "project"}` : "Project is full");
    },
    [projectCalc, addCalculation, projects, showToast],
  );

  const doCompare = useCallback(() => {
    if (!p.calc) return;
    if (isInCompare(p.calc.result)) {
      showToast("Already in compare");
      return;
    }
    addCompareItem(p.calc.input, p.calc.result);
    showToast("Added to compare");
  }, [p.calc, isInCompare, addCompareItem, showToast]);

  const openProjectModal = useCallback(() => {
    if (!p.calc) return;
    setSheet(null);
    setProjectCalc(p.calc);
  }, [p.calc]);

  const newCalc = useCallback(() => {
    setQuery("");
  }, []);

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

  // Desktop: real-keyboard shortcuts. ⌘K / Ctrl K refocuses the query input,
  // Esc closes the active sheet, Enter saves a valid query while focused.
  useEffect(() => {
    if (isPhoneViewport) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        focusInput();
        return;
      }
      if (event.key === "Escape") {
        if (projectCalc) {
          setProjectCalc(null);
        } else if (sheet) {
          setSheet(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusInput, isPhoneViewport, projectCalc, sheet]);

  const heroVal = isW
    ? p.totalKg != null
      ? fsWeight(p.totalKg)
      : "—"
    : p.totalAmount != null
      ? fsMoney(p.totalAmount)
      : "—";

  const queryTokens = query.trim().split(/\s+/).filter(Boolean);
  const removeTokenAt = (idx: number) => {
    setQuery(queryTokens.filter((_, i) => i !== idx).join(" "));
  };
  const kindBg: Record<CommandTokenKind, string> = {
    profile: "bg-[var(--accent-surface)] text-[var(--accent-text)]",
    len: "bg-[var(--blue-surface)] text-[var(--blue-text)]",
    qty: "bg-[var(--green-surface)] text-[var(--green-text)]",
    grade: "bg-[var(--surface-inset)] text-foreground-secondary",
    unknown: "bg-[var(--surface-inset)] text-muted",
  };

  const screenBg = dark ? "#161109" : "#f4f0e7";

  const outerClass = isWideViewport
    ? "fixed inset-0 flex overflow-hidden"
    : "fixed inset-0 flex items-center justify-center overflow-hidden";
  const outerBg = isPhoneViewport || isWideViewport ? screenBg : "var(--background)";

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
            : isWideViewport
              ? {
                  flex: 1,
                  minWidth: 0,
                  height: "100dvh",
                  background: screenBg,
                  borderRight: "1px solid var(--border-faint)",
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
              <IconBtn onClick={cycleTheme} ariaLabel="Toggle theme">
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
              {!isWideViewport && (
                <IconBtn onClick={() => setSheet("library")} ariaLabel="Library">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                </IconBtn>
              )}
              <IconBtn onClick={() => setSheet("settings")} ariaLabel="Settings">
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
                    {m.toUpperCase()}
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
                    <PricingBadge>+{p.pricing.wastePercent}% waste</PricingBadge>
                  )}
                  {!isW && p.pricing.includeVat && (
                    <PricingBadge>+VAT {p.pricing.vatPercent}%</PricingBadge>
                  )}
                </span>
              ) : (
                <span className="font-mono text-[12px] text-muted-faint">
                  {p.alias
                    ? p.hasSize
                      ? "add a length →"
                      : "add a size →"
                    : "start with a profile →"}
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
                  {p.valid ? "LIVE" : "WAITING"}
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
            onOpen={() => !isWideViewport && p.valid && setSheet("result")}
          />

          {/* Wide desktop: inline result breakdown + actions (no modal sheet) */}
          {isWideViewport && p.valid && (
            <div className="px-4 pt-4 overflow-y-auto flex-1">
              <CommandResultBreakdown
                p={p}
                columns={2}
                onSave={doSave}
                onCopy={() => {
                  navigator.clipboard?.writeText(query).catch(() => {});
                  showToast("Copied to clipboard");
                }}
                onNew={newCalc}
                onCompare={doCompare}
                onAddToProject={openProjectModal}
              />
            </div>
          )}

          {(isPhoneViewport || (isWideViewport && !p.valid)) && (
            <div className="flex-1 min-h-[6px]" />
          )}

          {/* SUGGESTION BAR */}
          <div className="pb-1.5">
            <div className="flex items-center gap-2 px-[18px] pb-1.5">
              <span className="text-[10px] font-bold tracking-[1.2px] text-muted uppercase">
                {sug.hint}
              </span>
              {query !== "" && (
                <button
                  type="button"
                  onClick={newCalc}
                  className="ml-auto bg-transparent border-0 text-muted text-[11px] font-bold tracking-wide"
                >
                  CLEAR
                </button>
              )}
            </div>
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
                      {it.label}
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
                    type or tap a profile…
                  </span>
                )}
                {queryTokens.map((tok, i) => {
                  const k = cmdClassifyToken(tok);
                  return (
                    <button
                      key={`${tok}-${i}`}
                      type="button"
                      onClick={() => removeTokenAt(i)}
                      aria-label={`Remove ${tok}`}
                      className={`group inline-flex items-center gap-1 font-mono text-sm font-semibold pl-2 pr-1.5 py-0.5 rounded-md ${kindBg[k]}`}
                    >
                      <span>{tok}</span>
                      <span
                        aria-hidden="true"
                        className="opacity-50 group-hover:opacity-100 transition-opacity text-[12px] leading-none"
                      >
                        ×
                      </span>
                    </button>
                  );
                })}
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
                  {queryTokens.map((tok, i) => {
                    const k = cmdClassifyToken(tok);
                    return (
                      <button
                        key={`${tok}-${i}`}
                        type="button"
                        onClick={() => {
                          removeTokenAt(i);
                          focusInput();
                        }}
                        aria-label={`Remove ${tok}`}
                        className={`group inline-flex items-center gap-1 font-mono text-sm font-semibold pl-2 pr-1.5 py-0.5 rounded-md ${kindBg[k]}`}
                      >
                        <span>{tok}</span>
                        <span
                          aria-hidden="true"
                          className="opacity-50 group-hover:opacity-100 transition-opacity text-[12px] leading-none"
                        >
                          ×
                        </span>
                      </button>
                    );
                  })}
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
                  placeholder="type or tap a profile…"
                  aria-label="FerroScale Command query"
                  className="flex-1 bg-transparent outline-none font-mono text-sm text-foreground placeholder:text-muted-faint min-w-0"
                />
                <kbd className="text-[10px] font-mono font-semibold text-muted-faint px-1.5 py-0.5 rounded border border-border-faint">
                  ⌘K
                </kbd>
              </label>
            </div>
          )}

          {/* On-screen keypad: phone only */}
          {isPhoneViewport && (
            <CommandKeypad
              onKey={onKey}
              onBack={onBack}
              onEnter={onEnter}
              valid={p.valid}
            />
          )}

          {/* SHEETS — on wide-desktop the result + library are inline, so
              we suppress those sheet variants. */}
          {effectiveSheet === "result" && p.valid && !isWideViewport && (
            <CommandResultSheet
              p={p}
              onClose={() => setSheet(null)}
              onSave={doSave}
              onCopy={() => {
                navigator.clipboard?.writeText(query).catch(() => {});
                setSheet(null);
                showToast("Copied to clipboard");
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
              themeLabel={dark ? "Dark" : "Light"}
            />
          )}
          {effectiveSheet === "library" && !isWideViewport && (
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
          {toast && (
            <div
              className="absolute left-0 right-0 flex justify-center z-[60] pointer-events-none"
              style={{ bottom: isPhoneViewport ? 120 : 20 }}
            >
              <div
                className="flex items-center gap-2 px-[18px] py-[11px] rounded-2xl font-bold text-sm"
                style={{
                  background: "var(--foreground)",
                  color: "var(--background)",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
                }}
              >
                <span
                  className="flex w-5 h-5 rounded-full items-center justify-center"
                  style={{ background: "var(--green-text)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={dark ? "#102a1e" : "#fff"} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                {toast}
              </div>
            </div>
          )}
      </div>

      {/* Wide-desktop right pane: persistent Library workspace */}
      {isWideViewport && (
        <aside
          className="relative flex flex-col overflow-hidden text-foreground"
          style={{
            width: 440,
            flexShrink: 0,
            height: "100dvh",
            background: "var(--surface-raised)",
          }}
        >
          <div className="px-5 pt-6 pb-2 flex items-center justify-between">
            <h2 className="text-[12px] font-bold tracking-[1.6px] uppercase text-muted">
              Library
            </h2>
            <span className="text-[10px] font-mono text-muted-faint">
              auto-syncs
            </span>
          </div>
          <div className="px-4 pb-6 overflow-y-auto flex-1">
            <CommandLibraryWorkspace
              settings={parserSettings}
              defaultUnit={defaultUnit}
              saved={savedEntries}
              compareItems={compareItems}
              projects={projects}
              onLoadInput={loadInput}
              onRemoveSaved={removeSaved}
              onRemoveCompare={removeCompareItem}
              onClearCompare={clearCompare}
              onCreateProject={createProject}
              onRemoveProjectCalc={removeCalculation}
            />
          </div>
        </aside>
      )}
    </div>
  );
}

function PricingBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-sans text-[9.5px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded bg-[var(--blue-surface)] text-[var(--blue-text)] whitespace-nowrap">
      {children}
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
  fam?: import("@/lib/command/types").CommandFamily;
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
            Per piece
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
            {isWeight ? "Total cost" : "Total weight"}
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
          {p.alias ? p.alias.name : "profile"}
        </ChipBadge>
        <ChipBadge on={p.hasSize}>{p.hasSize ? p.size.replace(/x/g, "×") : "size"}</ChipBadge>
        <ChipBadge on={p.lengthM != null}>
          {p.lengthM != null ? `${p.lengthRaw}${p.lengthUnit}` : "length"}
        </ChipBadge>
        <ChipBadge on={p.qty != null}>{`× ${p.realQty}`}</ChipBadge>
        <ChipBadge on={!!p.gradeLabel}>{p.gradeLabel ?? "grade"}</ChipBadge>
      </div>
    </button>
  );
}

// suppress unused-import lint for COMMAND_ALIAS_RE (re-exported intentionally elsewhere)
void COMMAND_ALIAS_RE;
