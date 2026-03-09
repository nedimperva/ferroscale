"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { UseQuickCalculatorReturn } from "@/hooks/useQuickCalculator";
import type { QuickLineResult } from "@/hooks/useQuickCalculator";
import type { CalculationInput } from "@/lib/calculator/types";
import type { QuickWeightResult } from "@ferroscale/metal-core";
import type { DimensionPreset } from "@/hooks/usePresets";
import { toCalculationInput } from "@ferroscale/metal-core/quick/calculate";
import { getProfileById } from "@/lib/datasets/profiles";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { triggerHaptic } from "@/lib/haptics";
import type { ProfileId, StandardProfileDefinition } from "@/lib/datasets/types";
import { STANDARD_SIZES, type StandardSize } from "@/lib/datasets/standard-sizes";

/** Maps profileId to the canonical quick-calc alias. */
const PROFILE_ALIAS: Partial<Record<ProfileId, string>> = {
  square_hollow: "shs",
  rectangular_tube: "rhs",
  pipe: "chs",
  round_bar: "rb",
  square_bar: "sb",
  flat_bar: "fb",
  angle: "angle",
  sheet: "sheet",
  plate: "plate",
  chequered_plate: "chequered",
  expanded_metal: "expanded",
  corrugated_sheet: "corrugated",
  beam_ipe_en: "ipe",
  beam_ipn_en: "ipn",
  beam_hea_en: "hea",
  beam_heb_en: "heb",
  beam_hem_en: "hem",
  channel_upn_en: "upn",
  channel_upe_en: "upe",
  tee_en: "tee",
};

/** Build a quick-calc query string from a preset.
 *  For plates/sheets with a saved length, returns the full query.
 *  For others, returns the alias + cross-section dims with a trailing `x`
 *  so the user can type the length. */
function presetToQuery(preset: DimensionPreset): string {
  const alias = PROFILE_ALIAS[preset.profileId];
  if (!alias) return "";

  const profile = getProfileById(preset.profileId);
  if (!profile) return "";

  let dimStr: string;
  if (profile.mode === "standard") {
    const size = (profile as StandardProfileDefinition).sizes.find(
      (s) => s.id === preset.selectedSizeId,
    );
    // Extract just the numeric designation from labels like "IPE 200" → "200"
    const designation = size?.label.split(" ").pop() ?? "";
    dimStr = designation;
  } else {
    const vals = profile.dimensions.map(
      (d) => preset.manualDimensionsMm[d.key] ?? "",
    );
    dimStr = vals.join("x");
  }

  if (preset.lengthValue != null) {
    return `${alias} ${dimStr}x${preset.lengthValue}`;
  }
  // No length stored — leave a trailing x so user can append length
  return `${alias} ${dimStr}x`;
}

/** Build a quick-calc query from a standard size. */
function standardSizeToQuery(size: StandardSize): string {
  const alias = PROFILE_ALIAS[size.profileId];
  if (!alias) return "";
  const vals = Object.values(size.dimensions).filter((v) => v != null);
  return `${alias} ${vals.join("x")}x`;
}

interface PickerItem {
  id: string;
  label: string;
  profileId: ProfileId;
  query: string;
  kind: "preset" | "standard";
}

function buildPickerItems(presets: DimensionPreset[], standards: StandardSize[]): PickerItem[] {
  const presetItems: PickerItem[] = presets.map((p) => ({
    id: p.id,
    label: p.label,
    profileId: p.profileId,
    query: presetToQuery(p),
    kind: "preset",
  }));
  const stdItems: PickerItem[] = standards.map((s, i) => ({
    id: `std_${s.profileId}_${i}`,
    label: s.label,
    profileId: s.profileId,
    query: standardSizeToQuery(s),
    kind: "standard",
  }));
  return [...presetItems, ...stdItems];
}

interface QuickCalcPaletteProps {
  quickCalc: UseQuickCalculatorReturn;
  onLoadEntry: (input: CalculationInput) => void;
  presets: DimensionPreset[];
}

export const QuickCalcPalette = memo(function QuickCalcPalette({
  quickCalc,
  onLoadEntry,
  presets,
}: QuickCalcPaletteProps) {
  const t = useTranslations("quickCalc");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { isOpen, close, query, setQuery, lineResults, totalWeightKg, recentQueries } = quickCalc;

  const lineResultsRef = useRef(lineResults);
  useEffect(() => {
    lineResultsRef.current = lineResults;
  }, [lineResults]);

  // @ trigger state
  const [atStart, setAtStart] = useState<number | null>(null);
  const [presetFilter, setPresetFilter] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(0);
  const presetListRef = useRef<HTMLDivElement>(null);

  const allPickerItems = buildPickerItems(presets, STANDARD_SIZES);

  const filteredItems = presetFilter.trim()
    ? allPickerItems.filter((p) => p.label.toLowerCase().includes(presetFilter.toLowerCase()))
    : allPickerItems;

  const showPresetPicker = atStart !== null;

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- cleanup on modal close
      setAtStart(null);
      setPresetFilter("");
      setHighlightIdx(0);
    }
  }, [isOpen]);

  // Reset highlight when filtered list changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset index on filter change
    setHighlightIdx(0);
  }, [filteredItems.length]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (atStart !== null) {
          // First Escape closes the preset picker
          setAtStart(null);
          setPresetFilter("");
        } else {
          close();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close, atStart]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      const cursor = e.target.selectionStart ?? value.length;
      setQuery(value);

      if (atStart !== null) {
        // Check if @ is still present just before atStart
        if (value[atStart - 1] !== "@" || cursor < atStart) {
          setAtStart(null);
          setPresetFilter("");
        } else {
          setPresetFilter(value.slice(atStart, cursor));
        }
      } else {
        // Detect fresh @ at cursor
        if (cursor > 0 && value[cursor - 1] === "@") {
          setAtStart(cursor);
          setPresetFilter("");
        }
      }
    },
    [setQuery, atStart],
  );

  const handleSelectItem = useCallback(
    (item: PickerItem) => {
      if (atStart === null) return;
      const q = item.query;
      if (!q) return;

      const before = query.slice(0, atStart - 1);
      const afterCursor = query.slice(atStart + presetFilter.length);

      const newQuery = before + q + afterCursor;
      setQuery(newQuery);
      setAtStart(null);
      setPresetFilter("");

      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        const pos = before.length + q.length;
        el.setSelectionRange(pos, pos);
        el.focus();
      });
    },
    [atStart, presetFilter, query, setQuery],
  );

  const handleLoadResult = useCallback(
    (result: QuickWeightResult) => {
      const request = {
        profileAlias: result.profileAlias,
        profileId: result.profileId,
        selectedSizeId: result.selectedSizeId,
        manualDimensionsMm: result.manualDimensionsMm,
        lengthMm: result.lengthMm,
        quantity: result.quantity,
        materialGradeId: result.materialGradeId,
        customDensityKgPerM3: result.customDensityKgPerM3,
        normalizedInput: result.normalizedInput,
      };
      const input = toCalculationInput(request);
      onLoadEntry(input);
      close();
    },
    [onLoadEntry, close],
  );

  const handleRecentClick = useCallback(
    (q: string) => {
      setQuery(q);
    },
    [setQuery],
  );

  const successCount = lineResults.filter((lr) => lr.result).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="qc-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[80] bg-overlay"
            onClick={close}
            aria-hidden="true"
          />

          {/* Palette */}
          <motion.div
            key="qc-palette"
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: "spring", damping: 28, stiffness: 380, mass: 0.7 }}
            onAnimationStart={() => triggerHaptic("light")}
            className="fixed left-1/2 top-[10vh] z-[81] w-[95vw] max-w-[520px] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl"
          >
            {/* Header with input */}
            <div className="relative border-b border-border">
              <div className="flex items-center gap-2.5 px-4 py-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-inverted">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-surface">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <textarea
                    ref={inputRef}
                    value={query}
                    onChange={handleTextChange}
                    placeholder={t("placeholder")}
                    rows={1}
                    className="w-full resize-none bg-transparent text-[15px] font-medium text-foreground placeholder:text-muted-faint outline-none"
                    onKeyDown={(e) => {
                      if (showPresetPicker) {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setHighlightIdx((i) =>
                            filteredItems.length ? (i + 1) % filteredItems.length : 0,
                          );
                          return;
                        }
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setHighlightIdx((i) =>
                            filteredItems.length
                              ? (i - 1 + filteredItems.length) % filteredItems.length
                              : 0,
                          );
                          return;
                        }
                        if (e.key === "Tab") {
                          e.preventDefault();
                          const target = filteredItems[highlightIdx];
                          if (target) handleSelectItem(target);
                          return;
                        }
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          const target = filteredItems[highlightIdx];
                          if (target) handleSelectItem(target);
                          return;
                        }
                      } else if (e.key === "Enter" && !e.shiftKey) {
                        const results = lineResultsRef.current;
                        const first = results.find((lr) => lr.result);
                        if (first?.result) {
                          e.preventDefault();
                          handleLoadResult(first.result);
                        }
                      }
                    }}
                  />
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {(successCount > 0 || (showPresetPicker && filteredItems.length > 0)) && (
                    <kbd className="hidden rounded-md border border-border-faint bg-surface-inset px-1.5 py-0.5 text-[10px] font-medium text-muted sm:inline-flex items-center gap-0.5">
                      <span>&#9166;</span>
                    </kbd>
                  )}
                  <kbd className="hidden rounded-md border border-border-faint bg-surface-inset px-1.5 py-0.5 text-[10px] font-medium text-muted-faint sm:inline-block">
                    ESC
                  </kbd>
                </div>
              </div>

              {/* @ trigger indicator */}
              {showPresetPicker && (
                <div className="flex items-center gap-1.5 border-t border-border-faint bg-blue-surface/40 px-4 py-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-blue-text">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span className="text-[10px] font-medium text-blue-text">
                    {t("presetPickerHint")}
                  </span>
                  {filteredItems.length > 1 && (
                    <span className="ml-auto text-[10px] tabular-nums text-blue-text/60">
                      {highlightIdx + 1}/{filteredItems.length}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="max-h-[55vh] overflow-y-auto scroll-native">
              {/* Preset picker mode (@ trigger active) */}
              {showPresetPicker && (
                <div ref={presetListRef}>
                  {filteredItems.length === 0 ? (
                    <div className="px-4 py-4">
                      <p className="text-xs text-muted-faint">{t("noPresets")}</p>
                    </div>
                  ) : (
                    filteredItems.map((preset, idx) => (
                      <PresetPickerRow
                        key={preset.id}
                        preset={preset}
                        highlighted={idx === highlightIdx}
                        onSelect={handleSelectItem}
                        onHover={() => setHighlightIdx(idx)}
                      />
                    ))
                  )}
                </div>
              )}

              {/* Normal mode */}
              {!showPresetPicker && (
                <>
                  {/* Empty state: recent queries */}
                  {lineResults.length === 0 && !query.trim() && recentQueries.length > 0 && (
                    <div className="px-4 py-3">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-faint">
                        {t("recent")}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {recentQueries.slice(0, 8).map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => handleRecentClick(q)}
                            className="rounded-lg border border-border-faint bg-surface px-2.5 py-1.5 font-mono text-xs text-foreground-secondary transition-colors hover:border-border hover:bg-surface-raised"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state: hint */}
                  {lineResults.length === 0 && !query.trim() && recentQueries.length === 0 && (
                    <div className="px-4 py-5">
                      <p className="text-xs text-muted-faint">{t("hint")}</p>
                      <div className="mt-3 space-y-1.5">
                        {["shs 40x40x2x4500mm", "rhs 120x80x4x6000", "ipe 200x6000 mat=s355", "chs 60.3x3.2x3000 qty=2", "plate 1500x10x3000"].map((ex) => (
                          <button
                            key={ex}
                            type="button"
                            onClick={() => setQuery(ex)}
                            className="block w-full rounded-lg border border-transparent px-2.5 py-1.5 text-left font-mono text-xs text-muted transition-colors hover:border-border-faint hover:bg-surface-inset hover:text-foreground-secondary"
                          >
                            {ex}
                          </button>
                        ))}
                      </div>
                      <p className="mt-3 text-[10px] text-muted-faint">{t("multiLineHint")}</p>
                      {presets.length > 0 && (
                        <p className="mt-1 text-[10px] text-muted-faint">{t("atTriggerHint")}</p>
                      )}
                    </div>
                  )}

                  {/* Results */}
                  {lineResults.map((lr, idx) => (
                    <QuickResultRow
                      key={idx}
                      lineResult={lr}
                      onLoad={handleLoadResult}
                    />
                  ))}

                  {/* Multi-line totals */}
                  {successCount >= 2 && (
                    <div className="flex items-center justify-between border-t border-border bg-surface-inset/60 px-4 py-3">
                      <span className="text-xs font-semibold text-foreground-secondary">{t("total")}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                          {totalWeightKg} kg
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

/* ---- Preset picker row ---- */

function PresetPickerRow({
  preset,
  highlighted,
  onSelect,
  onHover,
}: {
  preset: PickerItem;
  highlighted: boolean;
  onSelect: (preset: PickerItem) => void;
  onHover: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const profile = getProfileById(preset.profileId);
  const category = profile?.category ?? "bars";
  const query = preset.query;

  useEffect(() => {
    if (highlighted && ref.current) {
      ref.current.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(preset)}
      onMouseEnter={onHover}
      className={`group flex w-full items-center gap-3 border-b border-border-faint/60 px-4 py-2.5 text-left last:border-b-0 transition-colors ${
        highlighted ? "bg-blue-surface/50" : "hover:bg-blue-surface/50"
      }`}
    >
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
        highlighted
          ? "bg-blue-surface text-blue-text"
          : "bg-surface-inset text-muted group-hover:bg-blue-surface group-hover:text-blue-text"
      }`}>
        <ProfileIcon category={category} className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-foreground">{preset.label}</p>
          {preset.kind === "preset" && (
            <span className="shrink-0 rounded bg-purple-surface px-1 py-0.5 text-[9px] font-medium text-purple-text">Custom</span>
          )}
        </div>
        {query && (
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-faint">{query}</p>
        )}
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-3.5 w-3.5 shrink-0 text-muted-faint transition-opacity ${highlighted ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
        <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
      </svg>
    </button>
  );
}

/* ---- Individual result row ---- */

function QuickResultRow({
  lineResult,
  onLoad,
}: {
  lineResult: QuickLineResult;
  onLoad: (result: QuickWeightResult) => void;
}) {
  const t = useTranslations("quickCalc");

  if (lineResult.result) {
    const r = lineResult.result;
    const profile = getProfileById(r.profileId);
    const category = profile?.category ?? "bars";

    return (
      <div className="group flex items-center gap-3 border-b border-border-faint/60 px-4 py-3 last:border-b-0 transition-colors hover:bg-surface-inset/40">
        {/* Profile icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-inset text-muted">
          <ProfileIcon category={category} className="h-4 w-4" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {r.profileLabel}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
            <span>{r.lengthMm} mm</span>
            {r.quantity > 1 && (
              <span className="rounded bg-surface-inset px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                &times;{r.quantity}
              </span>
            )}
            {r.materialGradeId !== "steel-s235jr" && (
              <span className="rounded bg-blue-surface px-1.5 py-0.5 text-[10px] font-medium text-blue-text">
                {r.materialGradeId.split("-").pop()?.toUpperCase()}
              </span>
            )}
            {r.unitWeightKg !== r.totalWeightKg && (
              <span className="text-muted-faint">{r.unitWeightKg} kg/pc</span>
            )}
          </p>
        </div>

        {/* Weight */}
        <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-foreground">
          {r.totalWeightKg} kg
        </span>

        {/* Load button */}
        <button
          type="button"
          onClick={() => onLoad(r)}
          className="shrink-0 rounded-lg border border-border-faint bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-foreground-secondary opacity-0 transition-all hover:border-border hover:bg-surface-raised group-hover:opacity-100"
          title={t("loadInCalculator")}
        >
          {t("load")}
        </button>
      </div>
    );
  }

  // Error row
  const issue = lineResult.issues?.[0];
  return (
    <div className="flex items-center gap-3 border-b border-border-faint/60 px-4 py-3 last:border-b-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-400 dark:bg-red-500/10 dark:text-red-400">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6" />
          <path d="m9 9 6 6" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-muted line-through">{lineResult.line}</p>
        {issue && (
          <p className="mt-0.5 truncate text-xs text-red-interactive">{issue.message}</p>
        )}
      </div>
    </div>
  );
}
