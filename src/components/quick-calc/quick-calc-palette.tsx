"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { UseQuickCalculatorReturn, QuickLineResult } from "@/hooks/useQuickCalculator";
import type { CalculationInput } from "@/lib/calculator/types";
import type { QuickWeightResult } from "@ferroscale/metal-core";
import type { DimensionPreset } from "@/hooks/usePresets";
import type { SavedEntry } from "@/hooks/useSaved";
import { toCalculationInput } from "@ferroscale/metal-core/quick/calculate";
import { getProfileById, PROFILE_DEFINITIONS } from "@/lib/datasets/profiles";
import { getMaterialGradeById } from "@/lib/datasets/materials";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { ProfileGlyph } from "@/components/profiles/profile-glyph";
import { triggerHaptic } from "@/lib/haptics";
import { APP_VERSION } from "@/lib/changelog";
import type { ProfileId, StandardProfileDefinition } from "@/lib/datasets/types";
import { STANDARD_SIZES, type StandardSize } from "@/lib/datasets/standard-sizes";

const PROFILE_ALIAS: Partial<Record<ProfileId, string>> = {
  square_hollow: "shs", rectangular_tube: "rhs", pipe: "chs",
  round_bar: "rb", square_bar: "sb", flat_bar: "fb",
  angle: "angle", sheet: "sheet", plate: "plate",
  chequered_plate: "chequered", expanded_metal: "expanded", corrugated_sheet: "corrugated",
  beam_ipe_en: "ipe", beam_ipn_en: "ipn", beam_hea_en: "hea",
  beam_heb_en: "heb", beam_hem_en: "hem",
  channel_upn_en: "upn", channel_upe_en: "upe", tee_en: "tee",
};

const PROFILE_SUGGESTION_ORDER: ProfileId[] = [
  "pipe", "square_hollow", "rectangular_tube", "flat_bar", "angle",
  "round_bar", "square_bar", "sheet", "plate", "chequered_plate",
  "corrugated_sheet", "expanded_metal", "channel_upe_en", "channel_upn_en",
  "beam_ipe_en", "beam_ipn_en", "beam_hea_en", "beam_heb_en", "beam_hem_en", "tee_en",
];

const PROFILE_TOP_PICKS: ProfileId[] = [
  "beam_ipe_en", "beam_hea_en", "square_hollow", "rectangular_tube",
  "pipe", "flat_bar", "angle", "plate",
];

function presetToQuery(preset: DimensionPreset): string {
  const alias = PROFILE_ALIAS[preset.profileId];
  if (!alias) return "";
  const profile = getProfileById(preset.profileId);
  if (!profile) return "";
  let dimStr: string;
  if (profile.mode === "standard") {
    const size = (profile as StandardProfileDefinition).sizes.find((s) => s.id === preset.selectedSizeId);
    dimStr = size?.label.split(" ").pop() ?? "";
  } else {
    dimStr = profile.dimensions.map((d) => preset.manualDimensionsMm[d.key] ?? "").join("x");
  }
  if (preset.lengthValue != null) return `${alias} ${dimStr}x${preset.lengthValue}`;
  return `${alias} ${dimStr}x`;
}

function standardSizeToQuery(size: StandardSize): string {
  const alias = PROFILE_ALIAS[size.profileId];
  if (!alias) return "";
  return `${alias} ${Object.values(size.dimensions).filter((v) => v != null).join("x")}x`;
}

function interleaveStandards(standards: StandardSize[]): StandardSize[] {
  const buckets = new Map<ProfileId, StandardSize[]>();
  for (const size of standards) {
    const bucket = buckets.get(size.profileId);
    if (bucket) bucket.push(size);
    else buckets.set(size.profileId, [size]);
  }
  const profileIds = PROFILE_SUGGESTION_ORDER.filter((id) => buckets.has(id));
  const result: StandardSize[] = [];
  let keepGoing = true;
  let index = 0;
  while (keepGoing) {
    keepGoing = false;
    for (const profileId of profileIds) {
      const next = buckets.get(profileId)?.[index];
      if (next) { result.push(next); keepGoing = true; }
    }
    index += 1;
  }
  return result;
}

interface PickerItem {
  id: string;
  label: string;
  profileId: ProfileId;
  query: string;
  kind: "preset" | "standard";
}

function buildPickerItems(presets: DimensionPreset[], standards: StandardSize[]): PickerItem[] {
  return [
    ...presets.map<PickerItem>((p) => ({
      id: p.id, label: p.label, profileId: p.profileId,
      query: presetToQuery(p), kind: "preset",
    })),
    ...interleaveStandards(standards).map<PickerItem>((s, i) => ({
      id: `std_${s.profileId}_${i}`, label: s.label, profileId: s.profileId,
      query: standardSizeToQuery(s), kind: "standard",
    })),
  ];
}

type ActionId = "new-calc" | "new-project" | "settings" | "compare";
type ActionLabelKey = "newCalc" | "newProject" | "openSettings" | "openCompare";
type PaletteIconName = "plus" | "folder" | "cog" | "compare";

interface ActionDef {
  id: ActionId;
  labelKey: ActionLabelKey;
  hot: string;
  iconName: PaletteIconName;
}

const ACTIONS: ActionDef[] = [
  { id: "new-calc", labelKey: "newCalc", hot: "⌘N", iconName: "plus" },
  { id: "new-project", labelKey: "newProject", hot: "⌘⇧N", iconName: "folder" },
  { id: "settings", labelKey: "openSettings", hot: "⌘,", iconName: "cog" },
  { id: "compare", labelKey: "openCompare", hot: "⌘\\", iconName: "compare" },
];

interface QuickCalcPaletteProps {
  quickCalc: UseQuickCalculatorReturn;
  onLoadEntry: (input: CalculationInput) => void;
  presets: DimensionPreset[];
  saved: SavedEntry[];
  onLoadSaved: (entry: SavedEntry) => void;
  onSelectProfile: (profileId: ProfileId) => void;
  onAction: (id: ActionId) => void;
}

type NavRow =
  | { kind: "parser"; id: string; result: QuickWeightResult }
  | { kind: "parser-error"; id: string; line: string; message?: string }
  | { kind: "profile"; id: string; profileId: ProfileId; label: string; sub: string }
  | { kind: "saved"; id: string; entry: SavedEntry }
  | { kind: "action"; id: string; action: ActionDef };

export const QuickCalcPalette = memo(function QuickCalcPalette({
  quickCalc, onLoadEntry, presets, saved, onLoadSaved, onSelectProfile, onAction,
}: QuickCalcPaletteProps) {
  const t = useTranslations("quickCalc");
  const tp = useTranslations("palette");
  const td = useTranslations("dataset");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isOpen, close, query, setQuery, lineResults, totalWeightKg, recentQueries } = quickCalc;
  const lineResultsRef = useRef(lineResults);
  useEffect(() => { lineResultsRef.current = lineResults; }, [lineResults]);

  const [atStart, setAtStart] = useState<number | null>(null);
  const [presetFilter, setPresetFilter] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(0);

  const allPickerItems = useMemo(() => buildPickerItems(presets, STANDARD_SIZES), [presets]);
  const filteredItems = useMemo(() => {
    if (!presetFilter.trim()) return allPickerItems;
    const needle = presetFilter.toLowerCase().replace(/×/g, "x");
    return allPickerItems.filter((p) => p.label.toLowerCase().replace(/×/g, "x").includes(needle));
  }, [allPickerItems, presetFilter]);

  const showPresetPicker = atStart !== null;
  const queryTrim = query.trim();
  const queryLower = queryTrim.toLowerCase();

  const parserRows: NavRow[] = useMemo(
    () => lineResults.map((lr, idx) => lr.result
      ? { kind: "parser" as const, id: `parser_${idx}`, result: lr.result }
      : { kind: "parser-error" as const, id: `parser_err_${idx}`, line: lr.line, message: lr.issues?.[0]?.message }),
    [lineResults],
  );
  const successfulParseCount = parserRows.filter((r) => r.kind === "parser").length;
  const hasSuccessfulParse = successfulParseCount > 0;

  const profileRows: NavRow[] = useMemo(() => {
    const base = queryTrim
      ? PROFILE_DEFINITIONS.filter((p) => {
          const short = (td(`profileShort.${p.id}`) || "").toLowerCase();
          const alias = (PROFILE_ALIAS[p.id] ?? "").toLowerCase();
          const long = (td(`profiles.${p.id}`) || "").toLowerCase();
          return short.includes(queryLower) || alias.includes(queryLower) || long.includes(queryLower);
        })
      : PROFILE_TOP_PICKS
          .map((id) => PROFILE_DEFINITIONS.find((p) => p.id === id))
          .filter((p): p is NonNullable<typeof p> => Boolean(p));
    return base.slice(0, 4).map((p) => ({
      kind: "profile" as const,
      id: `profile_${p.id}`,
      profileId: p.id,
      label: td(`profileShort.${p.id}`) || p.label,
      sub: td(`profileCategories.${p.category}`) || "",
    }));
  }, [queryTrim, queryLower, td]);

  const savedRows: NavRow[] = useMemo(() => {
    const list = queryTrim ? saved.filter((e) => e.name.toLowerCase().includes(queryLower)) : saved;
    return list.slice(0, queryTrim ? 4 : 5).map((entry) => ({
      kind: "saved" as const, id: `saved_${entry.id}`, entry,
    }));
  }, [saved, queryTrim, queryLower]);

  const actionRows: NavRow[] = useMemo(() => {
    const list = queryTrim
      ? ACTIONS.filter((a) => (tp(`action.${a.labelKey}`) || "").toLowerCase().includes(queryLower))
      : ACTIONS;
    return list.map((a) => ({ kind: "action" as const, id: `action_${a.id}`, action: a }));
  }, [queryTrim, queryLower, tp]);

  const navRows: NavRow[] = useMemo(
    () => [...parserRows, ...profileRows, ...savedRows, ...actionRows],
    [parserRows, profileRows, savedRows, actionRows],
  );

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset index on filter change
    setHighlightIdx(0);
  }, [filteredItems.length, navRows.length, showPresetPicker]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (atStart !== null) {
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
        if (value[atStart - 1] !== "@" || cursor < atStart) {
          setAtStart(null);
          setPresetFilter("");
        } else {
          setPresetFilter(value.slice(atStart, cursor));
        }
      } else if (cursor > 0 && value[cursor - 1] === "@") {
        setAtStart(cursor);
        setPresetFilter("");
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
      setQuery(before + q + afterCursor);
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
      const input = toCalculationInput({
        profileAlias: result.profileAlias,
        profileId: result.profileId,
        selectedSizeId: result.selectedSizeId,
        manualDimensionsMm: result.manualDimensionsMm,
        lengthMm: result.lengthMm,
        quantity: result.quantity,
        materialGradeId: result.materialGradeId,
        customDensityKgPerM3: result.customDensityKgPerM3,
        normalizedInput: result.normalizedInput,
      });
      onLoadEntry(input);
      close();
    },
    [onLoadEntry, close],
  );

  const handleActivateNavRow = useCallback(
    (row: NavRow) => {
      if (row.kind === "parser") handleLoadResult(row.result);
      else if (row.kind === "profile") { onSelectProfile(row.profileId); close(); }
      else if (row.kind === "saved") { onLoadSaved(row.entry); close(); }
      else if (row.kind === "action") { onAction(row.action.id); close(); }
    },
    [handleLoadResult, onSelectProfile, onLoadSaved, onAction, close],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showPresetPicker) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlightIdx((i) => (filteredItems.length ? (i + 1) % filteredItems.length : 0));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlightIdx((i) => (filteredItems.length ? (i - 1 + filteredItems.length) % filteredItems.length : 0));
          return;
        }
        if ((e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          const target = filteredItems[highlightIdx];
          if (target) handleSelectItem(target);
        }
        return;
      }
      if (e.key === "ArrowDown") {
        if (!navRows.length) return;
        e.preventDefault();
        setHighlightIdx((i) => (i + 1) % navRows.length);
        return;
      }
      if (e.key === "ArrowUp") {
        if (!navRows.length) return;
        e.preventDefault();
        setHighlightIdx((i) => (i - 1 + navRows.length) % navRows.length);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        const target = navRows[highlightIdx];
        const cmd = e.metaKey || e.ctrlKey;
        if (target) {
          e.preventDefault();
          if (cmd && target.kind === "parser") handleLoadResult(target.result);
          else handleActivateNavRow(target);
          return;
        }
        const first = lineResultsRef.current.find((lr) => lr.result);
        if (first?.result) {
          e.preventDefault();
          handleLoadResult(first.result);
        }
      }
    },
    [showPresetPicker, filteredItems, highlightIdx, handleSelectItem, navRows, handleActivateNavRow, handleLoadResult],
  );

  const navRowIndex = (row: NavRow) => navRows.indexOf(row);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="qc-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[80] bg-foreground/30 backdrop-blur-[2px]"
            onClick={close}
            aria-hidden="true"
          />
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
            className="fixed left-1/2 top-[86px] z-[81] w-[620px] max-w-[95vw] -translate-x-1/2 overflow-hidden rounded-[18px] bg-surface shadow-[0_40px_80px_-20px_rgba(0,0,0,0.45),0_0_0_1px_rgba(20,18,15,0.08)]"
          >
            <div className="relative border-b border-border">
              <div className="flex items-center gap-3 px-[18px] py-3.5">
                <SearchIcon />
                <textarea
                  ref={inputRef}
                  value={query}
                  onChange={handleTextChange}
                  placeholder={t("placeholder")}
                  rows={1}
                  className="min-w-0 flex-1 resize-none bg-transparent text-[15px] font-medium text-foreground placeholder:text-muted-faint outline-none"
                  onKeyDown={handleInputKeyDown}
                />
                <span className="hidden shrink-0 text-2xs text-muted sm:inline-block">
                  {tp("escClose")}
                </span>
              </div>
              {showPresetPicker && (
                <div className="flex items-center gap-1.5 border-t border-border-faint bg-blue-surface/40 px-4 py-1.5">
                  <AtTriggerIcon />
                  <span className="text-2xs font-medium text-blue-text">{t("presetPickerHint")}</span>
                  {filteredItems.length > 1 && (
                    <span className="ml-auto text-2xs tabular-nums text-blue-text/60">
                      {highlightIdx + 1}/{filteredItems.length}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto scroll-native">
              {showPresetPicker ? (
                filteredItems.length === 0 ? (
                  <div className="px-[18px] py-4">
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
                )
              ) : (
                <>
                  {parserRows.length > 0 && (
                    <NavSection title={tp("parserSection")}>
                      {parserRows.map((row) => {
                        if (row.kind !== "parser" && row.kind !== "parser-error") return null;
                        const globalIdx = navRowIndex(row);
                        const highlighted = globalIdx === highlightIdx;
                        if (row.kind === "parser") {
                          return (
                            <ParserResultRow
                              key={row.id}
                              result={row.result}
                              highlighted={highlighted}
                              onActivate={() => handleLoadResult(row.result)}
                              onHover={() => setHighlightIdx(globalIdx)}
                            />
                          );
                        }
                        return <ParserErrorRow key={row.id} line={row.line} message={row.message} />;
                      })}
                    </NavSection>
                  )}

                  {successfulParseCount >= 2 && (
                    <div className="flex items-center justify-between border-t border-b border-border bg-surface-inset/60 px-[18px] py-2.5">
                      <span className="text-xs font-semibold text-foreground-secondary">
                        {t("total")}
                      </span>
                      <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                        {totalWeightKg} kg
                      </span>
                    </div>
                  )}

                  {profileRows.length > 0 && (
                    <NavSection title={tp("profilesSection", { count: profileRows.length })}>
                      {profileRows.map((row) => {
                        if (row.kind !== "profile") return null;
                        const globalIdx = navRowIndex(row);
                        const highlighted = globalIdx === highlightIdx;
                        return (
                          <NavRowItem
                            key={row.id}
                            highlighted={highlighted}
                            icon={<ProfileGlyph profileId={row.profileId} size="sm" />}
                            label={row.label}
                            sub={row.sub}
                            hot={highlighted ? "↵" : undefined}
                            onActivate={() => { onSelectProfile(row.profileId); close(); }}
                            onHover={() => setHighlightIdx(globalIdx)}
                          />
                        );
                      })}
                    </NavSection>
                  )}

                  {savedRows.length > 0 && (
                    <NavSection title={tp("savedSection", { count: savedRows.length })}>
                      {savedRows.map((row) => {
                        if (row.kind !== "saved") return null;
                        const globalIdx = navRowIndex(row);
                        const highlighted = globalIdx === highlightIdx;
                        const part = row.entry.parts[0];
                        const profile = getProfileById(part.input.profileId);
                        const grade = getMaterialGradeById(part.input.materialGradeId);
                        const sub = [
                          td(`profileShort.${part.input.profileId}`) || profile?.label || "",
                          grade?.label ?? "",
                          `${part.result.totalWeightKg} kg`,
                        ].filter(Boolean).join(" · ");
                        return (
                          <NavRowItem
                            key={row.id}
                            highlighted={highlighted}
                            icon={<BookmarkIcon />}
                            label={row.entry.name}
                            sub={sub}
                            hot={highlighted ? "↵" : undefined}
                            onActivate={() => { onLoadSaved(row.entry); close(); }}
                            onHover={() => setHighlightIdx(globalIdx)}
                          />
                        );
                      })}
                    </NavSection>
                  )}

                  {actionRows.length > 0 && (
                    <NavSection title={tp("actionsSection")}>
                      {actionRows.map((row) => {
                        if (row.kind !== "action") return null;
                        const globalIdx = navRowIndex(row);
                        const highlighted = globalIdx === highlightIdx;
                        return (
                          <NavRowItem
                            key={row.id}
                            highlighted={highlighted}
                            icon={<PaletteIcon name={row.action.iconName} />}
                            label={tp(`action.${row.action.labelKey}`)}
                            hot={row.action.hot}
                            onActivate={() => { onAction(row.action.id); close(); }}
                            onHover={() => setHighlightIdx(globalIdx)}
                          />
                        );
                      })}
                    </NavSection>
                  )}

                  {!queryTrim &&
                    profileRows.length === 0 &&
                    savedRows.length === 0 &&
                    actionRows.length === 0 &&
                    recentQueries.length > 0 && (
                    <div className="px-[18px] py-3">
                      <p className="mb-2 text-2xs font-bold uppercase tracking-[0.14em] text-muted">
                        {t("recent")}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {recentQueries.slice(0, 8).map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setQuery(q)}
                            className="rounded-lg border border-border-faint bg-surface px-2.5 py-1.5 font-mono text-xs text-foreground-secondary transition-colors hover:border-border hover:bg-surface-raised"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {queryTrim &&
                    !hasSuccessfulParse &&
                    parserRows.length === 0 &&
                    profileRows.length === 0 &&
                    savedRows.length === 0 &&
                    actionRows.length === 0 && (
                    <div className="px-[18px] py-5">
                      <p className="text-xs text-muted-faint">{t("hint")}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <footer className="flex items-center justify-between border-t border-border bg-surface-raised px-4 py-2">
              <div className="flex items-center gap-3 text-2xs text-muted">
                <span className="inline-flex items-center gap-1"><Kbd>↑↓</Kbd> {tp("footer.navigate")}</span>
                <span className="inline-flex items-center gap-1"><Kbd>↵</Kbd> {tp("footer.select")}</span>
                <span className="hidden items-center gap-1 sm:inline-flex"><Kbd>⌘↵</Kbd> {tp("footer.loadClose")}</span>
              </div>
              <span className="text-2xs text-muted">Ferroscale · v{APP_VERSION}</span>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

/* ------------------------------------------------------------------ */
/*  Local components & icons                                          */
/* ------------------------------------------------------------------ */

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-[18px] pt-2.5 pb-1">
        <p className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">{title}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] border border-border-faint bg-surface-inset px-1 font-mono text-[10px] font-medium leading-none text-muted">
      {children}
    </kbd>
  );
}

function NavRowItem({
  highlighted, icon, label, sub, hot, onActivate, onHover,
}: {
  highlighted: boolean;
  icon: React.ReactNode;
  label: string;
  sub?: string;
  hot?: string;
  onActivate: () => void;
  onHover: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (highlighted && ref.current) ref.current.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onActivate}
      onMouseEnter={onHover}
      className={`group flex w-full items-center gap-3 px-[18px] py-2 text-left transition-colors min-h-9 border-l-[3px] ${
        highlighted
          ? "bg-accent-surface border-accent-border"
          : "border-transparent hover:bg-surface-inset/40"
      }`}
    >
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
          highlighted
            ? "bg-white/60 text-accent-text"
            : "bg-surface-inset text-foreground-secondary"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[13px] ${highlighted ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
          {label}
        </p>
      </div>
      {sub && <span className="shrink-0 truncate text-[11.5px] text-muted">{sub}</span>}
      {hot && <Kbd>{hot}</Kbd>}
    </button>
  );
}

function ParserResultRow({
  result, highlighted, onActivate, onHover,
}: {
  result: QuickWeightResult;
  highlighted: boolean;
  onActivate: () => void;
  onHover: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const profile = getProfileById(result.profileId);
  const category = profile?.category ?? "bars";
  useEffect(() => {
    if (highlighted && ref.current) ref.current.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onActivate}
      onMouseEnter={onHover}
      className={`group flex w-full items-center gap-3 px-[18px] py-2 text-left transition-colors min-h-9 border-l-[3px] ${
        highlighted
          ? "bg-accent-surface border-accent-border"
          : "border-transparent hover:bg-surface-inset/40"
      }`}
    >
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
          highlighted ? "bg-white/60 text-accent-text" : "bg-surface-inset text-foreground-secondary"
        }`}
      >
        <ProfileIcon category={category} className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">{result.profileLabel}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs text-muted">
          <span>{result.lengthMm} mm</span>
          {result.quantity > 1 && (
            <span className="rounded bg-surface-inset px-1 py-0.5 font-medium tabular-nums">×{result.quantity}</span>
          )}
          {result.materialGradeId !== "steel-s235jr" && (
            <span className="rounded bg-blue-surface px-1 py-0.5 font-medium text-blue-text">
              {result.materialGradeId.split("-").pop()?.toUpperCase()}
            </span>
          )}
        </p>
      </div>
      <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-foreground">
        {result.totalWeightKg} kg
      </span>
      {highlighted && <Kbd>⌘↵</Kbd>}
    </button>
  );
}

function ParserErrorRow({ line, message }: { line: string; message?: string }) {
  return (
    <div className="flex items-center gap-3 px-[18px] py-2 min-h-9 border-l-[3px] border-transparent">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-400 dark:bg-red-500/10 dark:text-red-400">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-muted line-through">{line}</p>
        {message && <p className="mt-0.5 truncate text-2xs text-red-interactive">{message}</p>}
      </div>
    </div>
  );
}

function PresetPickerRow({
  preset, highlighted, onSelect, onHover,
}: {
  preset: PickerItem;
  highlighted: boolean;
  onSelect: (preset: PickerItem) => void;
  onHover: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const profile = getProfileById(preset.profileId);
  const category = profile?.category ?? "bars";
  useEffect(() => {
    if (highlighted && ref.current) ref.current.scrollIntoView({ block: "nearest" });
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
        highlighted ? "bg-blue-surface text-blue-text" : "bg-surface-inset text-muted group-hover:bg-blue-surface group-hover:text-blue-text"
      }`}>
        <ProfileIcon category={category} className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-foreground">{preset.label}</p>
          {preset.kind === "preset" && (
            <span className="shrink-0 rounded bg-purple-surface px-1 py-0.5 text-2xs font-medium text-purple-text">Custom</span>
          )}
        </div>
        {preset.query && (
          <p className="mt-0.5 truncate font-mono text-xs text-muted-faint">{preset.query}</p>
        )}
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-3.5 w-3.5 shrink-0 text-muted-faint transition-opacity ${highlighted ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} aria-hidden="true">
        <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
      </svg>
    </button>
  );
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function AtTriggerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-blue-text" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  );
}

function PaletteIcon({ name }: { name: PaletteIconName }) {
  const cls = "h-3.5 w-3.5";
  const p = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: cls,
    "aria-hidden": true,
  };
  switch (name) {
    case "plus":
      return <svg {...p}><path d="M12 5v14M5 12h14" /></svg>;
    case "folder":
      return <svg {...p}><path d="M20 20a2 2 0 002-2V8a2 2 0 00-2-2h-7.9a2 2 0 01-1.69-.9L9.6 3.9A2 2 0 008 3H4a2 2 0 00-2 2v13a2 2 0 002 2z" /></svg>;
    case "cog":
      return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 9L21 6.4M4.6 15L3 17.6M9 19.4L6.4 21M15 4.6L17.6 3" /></svg>;
    case "compare":
      return <svg {...p}><rect x="3" y="3" width="7" height="18" rx="1" /><rect x="14" y="3" width="7" height="18" rx="1" /></svg>;
  }
}

export type { QuickLineResult };
