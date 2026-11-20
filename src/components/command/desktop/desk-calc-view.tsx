"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  COMMAND_GRADES,
  cmdAppendLineItem,
  cmdParse,
  cmdClassifyToken,
  cmdPasteIntoLine,
  findAliasByPrefix,
} from "@ferroscale/metal-core";
import {
  fsKgm,
  fsLength,
  fsMoney,
  fsWeight,
  fsWeightUnit,
  getMaterialGradeById,
} from "@ferroscale/metal-core";
import { useCountUp, markExternalValueChange } from "@/hooks/useCountUp";
import type { CommandLine, CommandParseResult } from "@ferroscale/metal-core";
import { BreakdownLedger } from "../breakdown-ledger";
import { CommandGlyph } from "../command-glyph";
import { CURRENCIES, EXAMPLE_QUERY, KIND_BG, UNIT_OPTIONS, placeholderExamples } from "../command-constants";
import {
  applyIssueSuggestion,
  computeGhost,
  formatAvailability,
  formatStockSources,
  formatCommandHint,
  formatCommandIssue,
  issueForToken,
  formatCommandParseName,
  formatCommandSuggestionLabel,
} from "../command-copy";
import { GhostField } from "../ghost-field";
import { resolveCommandKey } from "../command-keys";
import { CommandKeyHints } from "../command-key-hints";
import { groupedSuggestions } from "../suggestion-groups";
import type { CommandDesktopProps } from "./desktop-props";
import { CloseIcon, DeskIcon, DeskTokenChip, SectionLabel } from "./desk-atoms";
import { AvailabilityBadge, PricingBadge, StockBadge, TargetBadge, InlineIssue } from "../command-atoms";
import { commandTargetNote } from "../target-note";
import { massBand } from "../mass-band";
import { ProfileDiscoveryTiles } from "../profile-discovery-tiles";
import { SaveControl } from "../save-control";
import { useRotatingExample } from "@/hooks/useRotatingExample";
import {
  editLineToken,
  lineChipPrefix,
  lineChips,
  lineExpandedIndex,
  pullLastChip,
  removeLineItem,
  removeLineToken,
  replaceLineToken,
} from "../line-edit";
import {
  commandStageProgress,
  findSteppableLength,
  nudgeItemLength,
  nudgeItemQty,
} from "../command-nudge";
import { InlineTokenEditor } from "../inline-token-editor";
import { YourLines } from "../your-lines";
import { massTolerancePercentStore } from "@/lib/settings-stores";
import { useExpandedItem } from "../use-expanded-item";

type DeskCalcViewProps = CommandDesktopProps & {
  inputRef: React.RefObject<HTMLInputElement | null>;
  gotoCompare: () => void;
};

const QUICK_GRADE_IDS = [
  "steel-s235jr",
  "steel-s355jr",
  "stainless-304",
  "stainless-316",
  "al-6060",
  "al-6082",
] as const;

export function DeskCalcView({
  compact,
  query,
  setQuery,
  p,
  line,
  sug,
  sym,
  mode,
  onSetMode,
  rateIsUserSupplied,
  parserSettings,
  shared,
  onUpdateShared,
  defaultUnit,
  onSetDefaultUnit,
  sessionTape,
  history,
  historyTimes,
  historyCounts,
  onRemoveTapeEntry,
  onClearTape,
  onClearHistory,
  onSaveSessionAsProject,
  onSave,
  onPrimarySave,
  onOpenDestinations,
  currentProjectName,
  currentSaved,
  onOpenHelp,
  onLogSession,
  onCopySummary,
  onCopyAnswer,
  onShareLink,
  onNew,
  onSuggest,
  onCompareCurrent,
  inputRef,
}: DeskCalcViewProps) {
  const locale = useLocale();
  const t = useTranslations("command");
  const isW = mode === "weight";
  const targetNote = commandTargetNote(p);
  // What every untyped line already assumes, stated once in the header rather
  // than repeated as a badge on each result: currency, length unit, grade.
  const settingsSummary = [
    shared.currency,
    defaultUnit,
    getMaterialGradeById(shared.defaultGradeId)?.label ?? null,
  ]
    .filter(Boolean)
    .join(" · ");
  const firstSuggestionRef = useRef<HTMLButtonElement | null>(null);
  // ↑/↓ recall through the whole history; draft holds the in-progress query so
  // ↓ past the newest entry restores it.
  const historyIdxRef = useRef(-1);
  const draftRef = useRef("");

  // Chips are grouped per `+`-joined item; the trailing piece (no whitespace
  // after it) is still being typed and lives in the real input.
  const chips = useMemo(() => lineChips(query), [query]);
  const partial = chips.partial;
  const chipCount = chips.groups.reduce((n, group) => n + group.tokens.length, 0);
  const chipPrefix = useMemo(() => lineChipPrefix(query), [query]);
  const placeholderShown = chipCount === 0 && !partial;
  const placeholderExample = useRotatingExample(placeholderExamples(locale), placeholderShown);
  // Faint completion after the caret (profile letters / recent-query prefix).
  const ghost = useMemo(() => computeGhost(partial, sug), [partial, sug]);
  // Which `+` item the glance row and the breakdown describe. Picked from
  // the assembly list in the right rail, not repeated under the hero.
  const [picked, setPicked] = useState(line.activeIndex);
  const [pickedSeed, setPickedSeed] = useState(line.raw);
  if (pickedSeed !== line.raw) {
    setPickedSeed(line.raw);
    setPicked(line.activeIndex);
  }
  const focusParse: CommandParseResult =
    line.multi && line.items[picked]?.parse.valid ? line.items[picked].parse : p;
  const leadAlias =
    focusParse.alias ?? (partial ? findAliasByPrefix(partial.toLowerCase()) : null);

  const focusInputAtEnd = useCallback(() => {
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }, [inputRef]);

  const massTolerancePercent = useSyncExternalStore(
    massTolerancePercentStore.subscribe,
    massTolerancePercentStore.getSnapshot,
    massTolerancePercentStore.getServerSnapshot,
  );

  const [moreOpen, setMoreOpen] = useState(false);
  const [defaultsOpen, setDefaultsOpen] = useState(false);
  /** The tape shows today's session, or every logged line by day. */
  const [showHistory, setShowHistory] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const defaultsMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const handleDown = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    window.addEventListener("mousedown", handleDown);
    return () => window.removeEventListener("mousedown", handleDown);
  }, [moreOpen]);

  useEffect(() => {
    if (!defaultsOpen) return;
    const handleDown = (e: MouseEvent) => {
      if (defaultsMenuRef.current && !defaultsMenuRef.current.contains(e.target as Node)) {
        setDefaultsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDefaultsOpen(false);
    };
    window.addEventListener("mousedown", handleDown);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("keydown", handleKey);
    };
  }, [defaultsOpen]);

  /**
   * Same rule as the phone: only the item being typed is spelled out as
   * chips. Finished `+` items collapse to one grey chip so "+ another item"
   * does not flood the bar. Tap a grey chip to open that item.
   */
  const { expandedItem, setExpandedItem, lockExpanded } = useExpandedItem(query);
  const expandedIndex = lineExpandedIndex(chips.groups, expandedItem);

  const keepExpanded = (item: number, next: string) => {
    lockExpanded(item, next);
    setQuery(next);
    focusInputAtEnd();
  };
  const removeTokenAt = (item: number, idx: number) => {
    keepExpanded(item, removeLineToken(query, item, idx));
  };
  // A token of the last item goes back under the caret. An earlier item has
  // no caret to give it, so its token is edited where it stands.
  const [editing, setEditing] = useState<{ item: number; idx: number; tok: string } | null>(null);
  const editTokenAt = (item: number, idx: number) => {
    if (item < chips.groups.length - 1) {
      setEditing({ item, idx, tok: chips.groups[item].tokens[idx] });
      return;
    }
    keepExpanded(item, editLineToken(query, item, idx));
  };
  const commitEdit = (item: number, idx: number, next: string) => {
    setEditing(null);
    keepExpanded(
      item,
      next === "" ? removeLineToken(query, item, idx) : replaceLineToken(query, item, idx, next),
    );
  };
  const removeItem = (item: number) => {
    setEditing(null);
    setExpandedItem(null);
    setQuery(removeLineItem(query, item));
    focusInputAtEnd();
  };
  const collapsedItemLabel = (group: (typeof chips.groups)[number]) =>
    line.items[group.item]?.parse.name ||
    group.tokens[0] ||
    partial ||
    String(group.item + 1);

  // Hero metric counts up when the query settles (see useCountUp). Weight
  // always counts up in exact kilograms (no tonne conversion).
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

  const secondaryMetricVal = useMemo(() => {
    const kg = line.multi ? line.totalKg : p.totalKg;
    const amt = line.multi ? line.totalAmount : p.totalAmount;
    if (isW) {
      return amt != null ? `${sym} ${fsMoney(amt)}` : null;
    }
    return kg != null ? `${fsWeight(kg)} ${fsWeightUnit()}` : null;
  }, [isW, line.multi, line.totalAmount, line.totalKg, p.totalAmount, p.totalKg, sym]);

  const stageProgress = commandStageProgress(p);
  const steppableLength = useMemo(
    () => (p.valid && !line.multi ? findSteppableLength(query, line.activeIndex) : null),
    [p.valid, line.multi, line.activeIndex, query],
  );
  const quickGrades = useMemo(
    () =>
      QUICK_GRADE_IDS.map((id) => COMMAND_GRADES.find((g) => g.id === id)).filter(
        (g): g is (typeof COMMAND_GRADES)[number] => Boolean(g),
      ),
    [],
  );

  // Parse every tape line — the Σ footer is a promise about the whole session,
  // so it must never silently cover only what happens to be on screen.
  const validTape = useMemo(
    () =>
      sessionTape
        .map((q) => ({ q, rp: cmdParse(q, parserSettings) }))
        .filter(
          (x) => x.rp.valid && x.rp.totalKg != null && x.rp.totalAmount != null,
        ),
    [sessionTape, parserSettings],
  );
  // The list itself shows only the newest few; totals stay whole-tape.
  const tapeRows = useMemo(() => validTape.slice(0, 6), [validTape]);
  const sumKg = validTape.reduce((s, x) => s + (x.rp.totalKg ?? 0), 0);
  const sumAmount = validTape.reduce((s, x) => s + (x.rp.totalAmount ?? 0), 0);

  // Docked suggestion strip — lives right beneath the full-width command bar
  // inside the unified Command Deck whenever the bar is active.
  const suggestionStrip = query.trim() !== "" && (
    <div className="mt-2.5">
      <div className="flex items-center gap-3 flex-wrap mb-1.5">
        <h2 className="fs-track-label text-[10px] font-bold text-muted uppercase">
          {formatCommandHint(t, sug.hint)}
        </h2>
        <span className="ml-auto">
          <CommandKeyHints
            valid={p.valid}
            hasGhost={!!ghost}
            suggestionCount={sug.items.length}
            historyLength={history.length}
            onOpenHelp={onOpenHelp}
          />
        </span>
      </div>
      <div data-suggestion-strip="" className="flex gap-x-[7px] gap-y-1.5 flex-wrap items-center">
        {groupedSuggestions(sug.items).map((group) => (
          <div key={group.group ?? "all"} className="flex items-center gap-[7px] flex-wrap">
            {group.group && (
              <span
                className="text-[10px] font-bold text-muted-faint uppercase"
                style={{ letterSpacing: 1 }}
              >
                {t(`suggest.group.${group.group}`)}
              </span>
            )}
            {group.items.map(({ item: it, index: i }) => (
              <button
                key={i}
                ref={i === 0 ? firstSuggestionRef : undefined}
                type="button"
                // Chips stay out of the Tab order — keep typing flow unbroken.
                // ArrowDown from the input opens this list explicitly.
                tabIndex={-1}
                onClick={() => {
                  onSuggest(it);
                  focusInputAtEnd();
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const dir = e.key === "ArrowRight" ? 1 : -1;
                    const buttons = Array.from(
                      e.currentTarget.parentElement?.querySelectorAll("button") ?? [],
                    ) as HTMLButtonElement[];
                    const idx = buttons.indexOf(e.currentTarget as HTMLButtonElement);
                    const next = buttons[idx + dir];
                    if (next) {
                      next.focus();
                    } else if (dir === -1) {
                      focusInputAtEnd();
                    }
                    return;
                  }
                  if (e.key === "ArrowUp" || e.key === "Escape") {
                    e.preventDefault();
                    focusInputAtEnd();
                  }
                }}
                className="fs-pop flex items-center gap-[7px] cursor-pointer hover:border-[var(--border-strong)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                style={{
                  padding: it.sub ? "6px 12px" : "7px 13px",
                  border: it.kind === "save" ? "none" : "1px solid var(--border)",
                  background: it.kind === "save" ? "var(--action)" : "var(--background)",
                  color: it.kind === "save" ? "var(--action-contrast)" : "var(--foreground)",
                }}
              >
                {it.fam && (
                  <span className="flex" style={{ color: "var(--foreground-secondary)" }}>
                    <CommandGlyph
                      fam={it.fam}
                      alias={it.kind === "profile" ? it.ins : focusParse.alias?.alias}
                      size={16}
                    />
                  </span>
                )}
                <span className="flex flex-col items-start" style={{ lineHeight: 1.15 }}>
                  <span
                    className={`font-bold text-[13px] ${
                      it.kind === "size" || it.kind === "length" || it.kind === "qty"
                        ? "font-mono"
                        : ""
                    }`}
                  >
                    {formatCommandSuggestionLabel(t, it)}
                  </span>
                  {it.sub && (
                    <span className="text-[10px] text-muted font-semibold">{it.sub}</span>
                  )}
                </span>
                {/* The ⌥-digit that picks this chip, so the shortcut is
                    learnable by looking rather than by being told. */}
                {i < 9 && it.kind !== "save" && (
                  <span
                    className="font-mono text-[10px] font-bold"
                    style={{ color: "var(--muted-faint)" }}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  const discoveryTiles = query.trim() === "" && (
    <div className={compact ? "mt-2" : "flex-shrink-0"}>
      <ProfileDiscoveryTiles
        onSelectProfile={(prefix) => {
          setQuery(prefix);
          focusInputAtEnd();
        }}
        onTryDemo={() => {
          setQuery(EXAMPLE_QUERY);
          focusInputAtEnd();
        }}
        compact={compact}
      />
    </div>
  );

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      {/* The calculator opens straight on the unified Command Deck rather than
          spending 42px on a title bar; keep an accessible h1 for the page outline. */}
      <h1 className="sr-only">{t("nav.calculator")}</h1>

      {/* ───────── unified command deck — full width ───────── */}
      <div
        data-command-deck=""
        className="flex-shrink-0"
        style={{
          padding: compact ? "12px 16px 12px" : "14px 20px 12px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* An ink edge, not an accent glow. The bar is the one thing on the
            screen you always type into, so it is drawn like a rule rather
            than lit like a notification — which leaves the accent free to
            mean "this is the answer" a few centimetres below. */}
        {/* A div, not a label: a label with no `for` labels its first
            labelable descendant, which is the first chip — so a click on the
            bar's empty space used to edit that chip. */}
        <div
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest("button, input, [data-defaults-popover]")) return;
            e.preventDefault();
            focusInputAtEnd();
          }}
          className="relative flex items-center gap-2 flex-wrap cursor-text"
          style={{
            minHeight: 50,
            border: "1.5px solid var(--foreground)",
            background: "var(--background)",
            padding: "8px 12px",
          }}
        >
          {/* Quiet 2px stage-progress rail along the bottom edge of the command bar */}
          {stageProgress > 0 && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-0 bottom-0 h-[2px] transition-[width] duration-150"
              style={{
                width: `${(stageProgress / 4) * 100}%`,
                background: "var(--accent)",
              }}
            />
          )}
          <span
            className="flex items-center justify-center font-mono font-bold text-[19px] mr-0.5 shrink-0"
            style={{ color: "var(--accent)" }}
            aria-hidden="true"
          >
            {leadAlias ? (
              <CommandGlyph fam={leadAlias.fam} alias={leadAlias.alias} size={20} />
            ) : (
              "›"
            )}
          </span>
          {chips.groups.map((group) => (
            <Fragment key={group.item}>
              {group.item > 0 &&
                (group.item === chips.groups.length - 1 && group.tokens.length === 0 && !partial ? (
                  // A `+` nothing has been typed after yet: say how to take it back.
                  <button
                    type="button"
                    onClick={() => removeItem(group.item)}
                    aria-label={t("query.removeEmptyItem")}
                    title={t("query.removeEmptyItem")}
                    className="inline-flex items-center gap-1 font-mono text-[17px] font-bold px-1 cursor-pointer hover:text-foreground"
                    style={{ color: "var(--muted-faint)" }}
                  >
                    +<span className="text-[12px]">×</span>
                  </button>
                ) : (
                  <span
                    className="font-mono text-[17px] font-bold px-0.5"
                    style={{ color: "var(--muted-faint)" }}
                    aria-hidden="true"
                  >
                    +
                  </span>
                ))}
              {group.item === expandedIndex ? (
                group.tokens.map((tok, i) =>
                  editing && editing.item === group.item && editing.idx === i && editing.tok === tok ? (
                    <InlineTokenEditor
                      key={`edit-${tok}-${i}`}
                      tok={tok}
                      kindClass={KIND_BG[cmdClassifyToken(tok)]}
                      onCommit={(next) => commitEdit(group.item, i, next)}
                      onCancel={() => {
                        setEditing(null);
                        focusInputAtEnd();
                      }}
                      className="text-base px-2.5 py-1"
                    />
                  ) : (
                  <DeskTokenChip
                    key={`${tok}-${i}`}
                    tok={tok}
                    kindClass={KIND_BG[cmdClassifyToken(tok)]}
                    shadowed={line.items[group.item]?.parse.shadowedTokenIndexes.includes(i)}
                    note={(() => {
                      const issue = issueForToken(line.items[group.item]?.parse.issues ?? [], tok);
                      return issue ? formatCommandIssue(t, issue) : null;
                    })()}
                    onEdit={() => editTokenAt(group.item, i)}
                    onRemove={() => removeTokenAt(group.item, i)}
                  />
                  ),
                )
              ) : group.tokens.length === 0 ? null : (
                <span
                  className="inline-flex items-stretch flex-shrink-0 font-mono text-[14px] font-semibold whitespace-nowrap"
                  style={{
                    border: "1px solid var(--border-faint)",
                    background: "var(--surface-inset)",
                    color: "var(--foreground-secondary)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedItem(group.item)}
                    aria-label={t("query.expandItem", {
                      index: group.item + 1,
                      name: collapsedItemLabel(group),
                    })}
                    className="inline-flex items-center gap-1.5 cursor-pointer"
                    style={{ padding: "5px 6px 5px 10px" }}
                  >
                    <span className="text-[11px] text-muted-faint">{group.item + 1}</span>
                    {collapsedItemLabel(group)}
                    <span className="text-[10px] text-muted-faint">▸</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(group.item)}
                    aria-label={t("query.removeItem", {
                      index: group.item + 1,
                      name: collapsedItemLabel(group),
                    })}
                    className="flex items-center justify-center w-6 text-[14px] leading-none cursor-pointer hover:bg-[rgba(0,0,0,0.08)] dark:hover:bg-[rgba(255,255,255,0.12)]"
                  >
                    ×
                  </button>
                </span>
              )}
            </Fragment>
          ))}
          <GhostField
            ref={inputRef}
            type="text"
            onPaste={(e) => {
              // A cut list pasted from a sheet or an email is one part per row
              // — which is one item per row here, so it becomes the line the
              // user would have typed instead of an unparseable blob.
              // Appended, not substituted: throwing away a line the user
              // had already typed would be a destructive edit with no undo.
              const next = cmdPasteIntoLine(query, e.clipboardData.getData("text"));
              if (!next) return;
              e.preventDefault();
              setQuery(next);
              focusInputAtEnd();
            }}
            ghost={ghost}
            value={partial}
            onChange={(e) => {
              historyIdxRef.current = -1;
              setQuery(chipPrefix + e.target.value);
            }}
            onKeyDown={(e) => {
              const action = resolveCommandKey({
                key: e.key,
                code: e.code,
                metaKey: e.metaKey,
                ctrlKey: e.ctrlKey,
                altKey: e.altKey,
                shiftKey: e.shiftKey,
                partial,
                hasGhost: !!ghost,
                valid: p.valid,
                caretAtEnd:
                  e.currentTarget.selectionStart === e.currentTarget.value.length,
                caretAtStart: e.currentTarget.selectionStart === 0,
                caretCollapsed:
                  e.currentTarget.selectionStart === e.currentTarget.selectionEnd,
                suggestionCount: sug.items.length,
                chipCount,
                historyLength: history.length,
                browsingHistory: historyIdxRef.current >= 0,
              });
              if (!action) return;
              e.preventDefault();
              switch (action.type) {
                case "advance": {
                  // One rule: take what's pending, else log the finished line.
                  const pending = sug.items.find((it) => it.kind !== "save");
                  if (!p.valid && pending) {
                    onSuggest(pending);
                  } else if (p.valid) {
                    onLogSession();
                  }
                  return;
                }
                case "acceptGhost":
                  onSuggest(sug.items[0]);
                  return;
                case "insertSuggestion":
                  onSuggest(sug.items[action.index]);
                  focusInputAtEnd();
                  return;
                case "save":
                  onSave();
                  return;
                case "compare":
                  onCompareCurrent();
                  return;
                case "help":
                  onOpenHelp();
                  return;
                case "clear":
                  onNew();
                  return;
                case "historyPrev": {
                  if (historyIdxRef.current === -1) draftRef.current = query;
                  historyIdxRef.current = Math.min(
                    historyIdxRef.current + 1,
                    history.length - 1,
                  );
                  setQuery(history[historyIdxRef.current] + " ");
                  markExternalValueChange();
                  focusInputAtEnd();
                  return;
                }
                case "historyNext": {
                  const nextIdx = historyIdxRef.current - 1;
                  historyIdxRef.current = nextIdx;
                  setQuery(nextIdx < 0 ? draftRef.current : history[nextIdx] + " ");
                  markExternalValueChange();
                  focusInputAtEnd();
                  return;
                }
                case "focusChips":
                  firstSuggestionRef.current?.focus();
                  return;
                case "editLastChip":
                  setQuery(pullLastChip(query));
                  focusInputAtEnd();
                  return;
              }
            }}
            autoFocus
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholderShown ? t("query.placeholderExample", { example: placeholderExample }) : ""}
            aria-label={t("query.aria")}
            wrapperClassName="flex-1 min-w-[120px]"
            inputClassName="bg-transparent font-mono text-base font-semibold text-foreground placeholder:text-muted-faint"
            mirrorClassName="font-mono text-base font-semibold"
            // The command-line box carries the permanent accent glow; the
            // global :focus-visible ring on the inner input is just noise.
            style={{ outline: "none" }}
          />
          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            {query !== "" && (
              <button
                type="button"
                onClick={onNew}
                className="bg-transparent border-0 text-muted hover:text-foreground text-[11px] font-bold cursor-pointer px-1.5 py-1"
                style={{ letterSpacing: 0.4 }}
              >
                {t("common.clear")}
              </button>
            )}

            {/* Quick defaults popover — currency, default length unit, default grade */}
            <div ref={defaultsMenuRef} className="relative" data-defaults-popover="">
              <button
                type="button"
                onClick={() => setDefaultsOpen((v) => !v)}
                aria-expanded={defaultsOpen}
                aria-haspopup="dialog"
                aria-label={t("desktop.defaultsAria")}
                title={t("desktop.defaultsAria")}
                className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold cursor-pointer whitespace-nowrap hover:border-[var(--border-strong)] transition-colors"
                style={{
                  padding: "4px 8px",
                  border: `1px solid ${defaultsOpen ? "var(--foreground)" : "var(--border-faint)"}`,
                  background: "var(--surface)",
                  color: "var(--foreground-secondary)",
                }}
              >
                <span>{settingsSummary}</span>
                <span aria-hidden="true" className="text-[9px] text-muted-faint">▾</span>
              </button>
              {defaultsOpen && (
                <div
                  role="dialog"
                  aria-label={t("desktop.defaultsAria")}
                  className="absolute right-0 top-full mt-1.5 z-30 w-[264px] p-3 flex flex-col gap-3"
                  style={{
                    border: "1px solid var(--foreground)",
                    background: "var(--surface)",
                  }}
                >
                  <div>
                    <div className="fs-track-label text-[10px] font-bold uppercase text-muted mb-1.5">
                      {t("desktop.defaultsCurrency")}
                    </div>
                    <div className="grid grid-cols-5" style={{ border: "1px solid var(--border)" }}>
                      {CURRENCIES.map((cur, idx) => {
                        const active = shared.currency === cur;
                        return (
                          <button
                            key={cur}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onUpdateShared({ currency: cur })}
                            className="py-1.5 font-mono text-[11px] font-bold cursor-pointer border-0"
                            style={{
                              borderLeft: idx === 0 ? undefined : "1px solid var(--border-faint)",
                              background: active ? "var(--foreground)" : "transparent",
                              color: active ? "var(--background)" : "var(--foreground-secondary)",
                            }}
                          >
                            {cur}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="fs-track-label text-[10px] font-bold uppercase text-muted mb-1.5">
                      {t("desktop.defaultsUnit")}
                    </div>
                    <div className="grid grid-cols-5" style={{ border: "1px solid var(--border)" }}>
                      {UNIT_OPTIONS.map((unit, idx) => {
                        const active = defaultUnit === unit;
                        return (
                          <button
                            key={unit}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onSetDefaultUnit(unit)}
                            className="py-1.5 font-mono text-[11px] font-bold cursor-pointer border-0"
                            style={{
                              borderLeft: idx === 0 ? undefined : "1px solid var(--border-faint)",
                              background: active ? "var(--foreground)" : "transparent",
                              color: active ? "var(--background)" : "var(--foreground-secondary)",
                            }}
                          >
                            {unit}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="fs-track-label text-[10px] font-bold uppercase text-muted mb-1.5">
                      {t("desktop.defaultsGrade")}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {quickGrades.map((grade) => {
                        const active = shared.defaultGradeId === grade.id;
                        return (
                          <button
                            key={grade.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onUpdateShared({ defaultGradeId: grade.id })}
                            className="px-2 py-1 font-mono text-[11px] font-semibold cursor-pointer"
                            style={{
                              border: `1px solid ${active ? "var(--foreground)" : "var(--border)"}`,
                              background: active ? "var(--foreground)" : "var(--background)",
                              color: active ? "var(--background)" : "var(--foreground)",
                            }}
                          >
                            {grade.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {p.valid && (
              <button
                type="button"
                onClick={() => {
                  onLogSession();
                  focusInputAtEnd();
                }}
                title={t("aria.addToSession")}
                aria-label={t("aria.addToSession")}
                className="inline-flex items-center gap-1 font-mono text-[11px] font-bold cursor-pointer border-0"
                style={{
                  padding: "4px 9px",
                  background: "var(--action)",
                  color: "var(--action-contrast)",
                }}
              >
                <span aria-hidden="true">↵</span>
              </button>
            )}
          </div>
        </div>

        {/* Docked suggestion strip directly below the command bar (full width) */}
        {suggestionStrip}
      </div>

      {/* ───────── dashboard grid ─────────
          The aside is flush to the edge with a rule down its left, not a card
          floating in a gutter — so the two columns read as one sheet split,
          and the answer column keeps the width the gutter was using. */}
      <div
        className={`flex flex-1 min-h-0 ${compact ? "flex-col overflow-y-auto" : ""}`}
        style={{ padding: compact ? "14px 16px 20px" : undefined }}
      >
        {/* LEFT column — result + session tape */}
        <div
          className="relative flex flex-col gap-4 min-w-0"
          style={{
            flex: compact ? undefined : ANSWER_FLEX,
            minWidth: compact ? undefined : ANSWER_MIN,
            padding: compact ? undefined : "18px clamp(14px, 1.6vw, 24px) 0",
          }}
        >
          {discoveryTiles}
          {/* RESULT — no panel. The answer is the page here, so it sits on
              the paper directly and lets the rules below it do the grouping. */}
          <div className="flex-shrink-0 flex flex-col">
            <div className="flex items-center gap-3">
              <div className="inline-flex" style={{ border: "1px solid var(--border)" }}>
                {(["weight", "price"] as const).map((m, i) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onSetMode(m)}
                    aria-pressed={mode === m}
                    className="cursor-pointer border-0 font-mono text-[10px]"
                    style={{
                      // 6px puts the control at 25px, over the 24px floor in
                      // WCAG 2.5.8. It measured 23px.
                      padding: "6px 14px",
                      letterSpacing: 1.3,
                      borderLeft: i === 0 ? undefined : "1px solid var(--border)",
                      background: mode === m ? "var(--foreground)" : "transparent",
                      color: mode === m ? "var(--background)" : "var(--muted)",
                    }}
                  >
                    {(m === "weight" ? t("settings.weight") : t("settings.price")).toUpperCase()}
                  </button>
                ))}
              </div>
              <span className="ml-auto flex items-center gap-[6px]">
                <span
                  className="w-1.5 h-1.5"
                  style={{ background: p.valid ? "var(--accent)" : "var(--muted-faint)" }}
                />
                <span
                  className="font-mono text-[10px] uppercase"
                  style={{
                    letterSpacing: 1.6,
                    color: p.valid ? "var(--accent-text)" : "var(--muted-faint)",
                  }}
                >
                  {p.valid ? t("status.live") : t("status.waiting")}
                </span>
              </span>
            </div>

            {/* hero — mono like every other figure in the app, and set at a
                regular weight: at this size the digits carry on their own, and
                mono keeps them from reflowing as the value counts up. Paired
                with the secondary metric beside it so weight and price are
                both scannable at a glance and one click swaps them. */}
            <div style={{ padding: "10px 0 14px" }}>
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                {/* A click on the figure copies the answer as one line — the
                    thing most often done with it is pasting it somewhere. */}
                <button
                  type="button"
                  onClick={onCopyAnswer}
                  disabled={!p.valid}
                  title={p.valid ? t("aria.clickToCopy") : undefined}
                  aria-label={p.valid ? `${heroVal} — ${t("aria.clickToCopy")}` : undefined}
                  className="flex items-baseline gap-3 p-0 m-0 bg-transparent border-0 text-left"
                  style={{ cursor: p.valid ? "copy" : "default", color: "inherit" }}
                >
                  {!isW && p.totalAmount != null && (
                    <span
                      className="font-mono leading-none"
                      style={{ fontSize: 36, color: "var(--muted)" }}
                    >
                      {sym}
                    </span>
                  )}
                  <span
                    className="font-mono fs-display-num"
                    style={{
                      // The sheet beside it takes most of the width; the figure
                      // scales to what is left.
                      fontSize: compact ? "clamp(48px, 11vw, 72px)" : "clamp(46px, 4.4vw, 76px)",
                      lineHeight: 0.86,
                      letterSpacing: -4,
                      color: heroVal === "—" ? "var(--muted-faint)" : "var(--foreground)",
                    }}
                  >
                    {heroVal}
                  </span>
                  {isW && p.totalKg != null && (
                    <span className="font-mono text-[22px]" style={{ color: "var(--accent-text)" }}>
                      {fsWeightUnit()}
                    </span>
                  )}
                </button>

                {p.valid && secondaryMetricVal && (
                  <button
                    type="button"
                    onClick={() => onSetMode(isW ? "price" : "weight")}
                    aria-label={t("preview.swapMetric", {
                      metric: (isW ? t("settings.price") : t("settings.weight")).toLowerCase(),
                    })}
                    title={t("preview.swapMetric", {
                      metric: (isW ? t("settings.price") : t("settings.weight")).toLowerCase(),
                    })}
                    className="group flex flex-col items-end p-0 m-0 bg-transparent border-0 cursor-pointer text-right"
                  >
                    <span
                      className="font-mono text-[20px] font-semibold text-foreground-secondary group-hover:text-foreground transition-colors whitespace-nowrap"
                      style={{ borderBottom: "1px dashed var(--border-strong)", paddingBottom: 2 }}
                    >
                      {secondaryMetricVal}
                    </span>
                    <span className="font-mono text-[10px] text-muted-faint group-hover:text-muted mt-1">
                      ⇄ {(isW ? t("settings.price") : t("settings.weight")).toLowerCase()}
                    </span>
                  </button>
                )}
              </div>
              {band && (
                <div className="font-mono text-[12px] text-foreground-secondary mt-2.5">
                  {band.percentLabel} · {band.rangeLabel}
                </div>
              )}
              {/* descriptive / issue / hint line */}
              <div className="mt-[18px] min-h-[20px]">
                {line.multi ? (
                  <span className="font-mono text-[14px] text-muted">
                    {t("result.assembly", { count: line.items.length })}
                  </span>
                ) : p.valid && p.kgm != null ? (
                  <span className="font-mono text-[14px] text-muted flex items-center gap-1.5 flex-wrap">
                    <span>
                      <span className="text-foreground-secondary">{fsKgm(p.kgm)}</span> kg/m ×{" "}
                      <span className="text-foreground-secondary">{fsLength(p.lengthM ?? 0)}</span> m ×{" "}
                      <span className="text-foreground-secondary">{p.realQty}</span>
                      {p.gradeLabel ? ` · ${p.gradeLabel}` : ""}
                      {/* When the money on screen comes from the seeded rate,
                          say so next to it. The weight is measured; the price
                          is an assumption, and it should travel with the
                          figure rather than hide in the breakdown panel. */}
                      {!rateIsUserSupplied
                        ? ` · @ ${fsMoney(p.pricing.unitPrice)}/${p.pricing.priceUnit} ${t("result.defaultRate")}`
                        : ""}
                    </span>
                    {/* A token the parser dropped is named beside the figure, not
                        hidden behind the amber chip — `x2.5` used to price one
                        piece in silence. */}
                    {p.issues.length > 0 && (
                      <InlineIssue
                        text={formatCommandIssue(t, p.issues[0])}
                        suggestionLabel={
                          p.issues[0].suggestion
                            ? t("issues.didYouMean", { suggestion: p.issues[0].suggestion })
                            : null
                        }
                        onApply={() => {
                          setQuery(
                            applyIssueSuggestion(query, p.issues[0].token, p.issues[0].suggestion!),
                          );
                          focusInputAtEnd();
                        }}
                      />
                    )}
                    {p.availability && (
                      <AvailabilityBadge>
                        {formatAvailability(t, p.availability, p.gradeLabel).badge}
                      </AvailabilityBadge>
                    )}
                    {p.stock && (
                      <StockBadge title={t("stock.detail", { sources: formatStockSources(t, p.stock.sources) })}>
                        {t("stock.badge")}
                      </StockBadge>
                    )}
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
                      <PricingBadge>
                        {t("pricingBadge.waste", { percent: p.pricing.wastePercent })}
                      </PricingBadge>
                    )}
                    {!isW && p.pricing.includeVat && (
                      <PricingBadge>
                        {t("pricingBadge.vat", { percent: p.pricing.vatPercent })}
                      </PricingBadge>
                    )}
                  </span>
                ) : p.issues.length > 0 ? (
                  <span
                    className="fs-drop font-mono text-[14px] flex items-center gap-2 flex-wrap"
                    style={{ color: "var(--amber-text)" }}
                    role="status"
                  >
                    <span>{formatCommandIssue(t, p.issues[0])}</span>
                    {p.issues[0].suggestion && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuery(
                            applyIssueSuggestion(query, p.issues[0].token, p.issues[0].suggestion!),
                          );
                          focusInputAtEnd();
                        }}
                        className="rounded-none font-bold cursor-pointer"
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
                  <span className="font-mono text-[14px] text-muted-faint">
                    {p.alias
                      ? p.hasSize
                        ? t("hint.addLength")
                        : t("hint.addSize")
                      : t("hint.startProfile")}
                  </span>
                )}
              </div>
            </div>

            {/* stats, then actions — stacked, as the fold has them. Sharing a
                flex row with the action cluster crushed the grid to 21px per
                cell and clipped every value mid-number.

                On a pristine bar there is nothing to put in them: four cells
                of dashes and two disabled buttons were placeholders standing
                in for an answer. The phone dropped them (see the shell); the
                workspace now does the same and lets the tiles have the room. */}
            {query.trim() !== "" && (
            <>
            {/* No row of figures here any more: the breakdown in the rail is
                where they are read, and on a `+` line those four cells
                described one part under a headline that sums them all. */}
            <div
              className="flex items-center gap-3 flex-wrap"
              style={{ paddingTop: 14, borderTop: "1px solid var(--border-faint)" }}
            >
              {p.valid && !line.multi && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {steppableLength && (
                    <div
                      className="inline-flex items-stretch font-mono text-[12px]"
                      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
                    >
                      <button
                        type="button"
                        aria-label={t("desktop.nudgeLengthDown")}
                        onClick={() => {
                          const next = nudgeItemLength(query, line.activeIndex, -1);
                          if (next) {
                            setQuery(next);
                            focusInputAtEnd();
                          }
                        }}
                        className="px-2 py-1 text-muted hover:text-foreground hover:bg-[var(--surface-inset)] cursor-pointer border-0 bg-transparent"
                      >
                        −
                      </button>
                      <span
                        className="px-2 py-1 font-semibold text-foreground select-none"
                        style={{
                          borderLeft: "1px solid var(--border-faint)",
                          borderRight: "1px solid var(--border-faint)",
                        }}
                      >
                        {steppableLength.token}
                      </span>
                      <button
                        type="button"
                        aria-label={t("desktop.nudgeLengthUp")}
                        onClick={() => {
                          const next = nudgeItemLength(query, line.activeIndex, 1);
                          if (next) {
                            setQuery(next);
                            focusInputAtEnd();
                          }
                        }}
                        className="px-2 py-1 text-muted hover:text-foreground hover:bg-[var(--surface-inset)] cursor-pointer border-0 bg-transparent"
                      >
                        +
                      </button>
                    </div>
                  )}

                  <div
                    className="inline-flex items-stretch font-mono text-[12px]"
                    style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
                  >
                    <button
                      type="button"
                      aria-label={t("desktop.nudgeQtyDown")}
                      disabled={p.realQty <= 1}
                      onClick={() => {
                        const next = nudgeItemQty(query, line.activeIndex, p.realQty, -1);
                        if (next) {
                          setQuery(next);
                          focusInputAtEnd();
                        }
                      }}
                      className="px-2 py-1 text-muted hover:text-foreground hover:bg-[var(--surface-inset)] cursor-pointer disabled:opacity-35 disabled:cursor-default border-0 bg-transparent"
                    >
                      −
                    </button>
                    <span
                      className="px-2 py-1 font-semibold text-foreground select-none"
                      style={{
                        borderLeft: "1px solid var(--border-faint)",
                        borderRight: "1px solid var(--border-faint)",
                      }}
                    >
                      ×{p.realQty}
                    </span>
                    <button
                      type="button"
                      aria-label={t("desktop.nudgeQtyUp")}
                      onClick={() => {
                        const next = nudgeItemQty(query, line.activeIndex, p.realQty, 1);
                        if (next) {
                          setQuery(next);
                          focusInputAtEnd();
                        }
                      }}
                      className="px-2 py-1 text-muted hover:text-foreground hover:bg-[var(--surface-inset)] cursor-pointer border-0 bg-transparent"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setQuery((q) => cmdAppendLineItem(q));
                      focusInputAtEnd();
                    }}
                    title={t("desktop.addAnotherItem")}
                    aria-label={t("desktop.addAnotherItem")}
                    className="inline-flex items-center justify-center font-mono text-[13px] font-bold text-muted hover:text-foreground cursor-pointer bg-transparent"
                    style={{
                      width: 28,
                      height: 28,
                      border: "1px dashed var(--border-strong)",
                    }}
                  >
                    +
                  </button>
                </div>
              )}

              <div className="ml-auto flex items-center gap-2">
                {/* Copy the answer — the other thing done with a result. */}
                <button
                  type="button"
                  onClick={onCopySummary}
                  disabled={!p.valid}
                  title={t("common.copySummary")}
                  aria-label={t("common.copySummary")}
                  className="inline-flex items-center gap-[7px] text-[13px] font-medium whitespace-nowrap"
                  style={{
                    padding: "8px 16px",
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: p.valid ? "var(--foreground)" : "var(--muted)",
                    cursor: p.valid ? "pointer" : "default",
                  }}
                >
                  <DeskIcon name="copy" stroke="currentColor" />
                  {t("common.copySummary")}
                </button>

                {/* Where it goes — one control, same as the phone's. */}
                <SaveControl
                  projectName={currentProjectName}
                  saved={currentSaved}
                  disabled={!p.valid}
                  onPrimary={onPrimarySave}
                  onOpenPicker={onOpenDestinations}
                />

                {/* 4. More actions overflow */}
                <div ref={moreMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setMoreOpen((v) => !v)}
                    disabled={!p.valid}
                    title={t("common.more")}
                    aria-label={t("common.more")}
                    aria-expanded={moreOpen}
                    className="inline-flex items-center justify-center"
                    style={{
                      width: 34,
                      height: 34,
                      border: "1px solid var(--border)",
                      background: moreOpen ? "var(--surface-raised)" : "transparent",
                      color: p.valid ? "var(--foreground)" : "var(--muted)",
                      cursor: p.valid ? "pointer" : "default",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="19" cy="12" r="2" />
                      <circle cx="5" cy="12" r="2" />
                    </svg>
                  </button>
                  {moreOpen && (
                    <div
                      className="absolute right-0 bottom-full mb-1 flex flex-col py-1 border border-[var(--border)] bg-[var(--surface)] shadow-md z-20 min-w-[170px]"
                      style={{ borderRadius: 0 }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setMoreOpen(false);
                          onCompareCurrent();
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-[12px] text-left hover:bg-[var(--surface-raised)] text-[var(--foreground)] border-0 bg-transparent cursor-pointer"
                      >
                        <DeskIcon name="compare" />
                        {t("common.compare")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMoreOpen(false);
                          setQuery((q) => cmdAppendLineItem(q));
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-[12px] text-left hover:bg-[var(--surface-raised)] text-[var(--foreground)] border-0 bg-transparent cursor-pointer"
                      >
                        <span className="font-mono text-sm leading-none">+</span>
                        {t("desktop.anotherItem")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMoreOpen(false);
                          onShareLink();
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-[12px] text-left hover:bg-[var(--surface-raised)] text-[var(--foreground)] border-0 bg-transparent cursor-pointer"
                      >
                        <DeskIcon name="link" stroke="currentColor" />
                        {t("common.shareLink")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </>
            )}
          </div>

          {/* SESSION TAPE — fills remaining height. An ink rule heads it: the
              tape is a different kind of thing from the answer above, and the
              rule says so more quietly than a second box would. */}
          <div
            className={`flex flex-col ${compact ? "flex-shrink-0" : "flex-1 min-h-0"}`}
            style={{ borderTop: "1px solid var(--foreground)", paddingTop: 10 }}
          >
            <div className="flex items-baseline gap-2.5 mb-1.5 flex-shrink-0">
              <SectionLabel as="h2">{t("desktop.session")}</SectionLabel>
              <span className="font-mono text-[10px] text-muted-faint">
                {t("desktop.sessionSub")}
              </span>
              {/* Always there: the history is reachable before anything is
                  logged today. */}
              <button
                type="button"
                onClick={() => setShowHistory(true)}
                aria-haspopup="dialog"
                className="ml-auto bg-transparent border-0 text-muted text-[10px] font-bold cursor-pointer hover:text-foreground"
                style={{ letterSpacing: 0.4 }}
              >
                {t("desktop.history")}
              </button>
              {tapeRows.length > 0 && (
                <button
                  type="button"
                  onClick={onSaveSessionAsProject}
                  className="bg-transparent border-0 text-[10px] font-bold cursor-pointer"
                  style={{ letterSpacing: 0.4, color: "var(--accent-text)" }}
                >
                  {t("desktop.saveSessionAsProject")}
                </button>
              )}
              {tapeRows.length > 0 && (
                <button
                  type="button"
                  onClick={onClearTape}
                  className="bg-transparent border-0 text-muted-faint text-[10px] font-bold cursor-pointer hover:text-foreground"
                  style={{ letterSpacing: 0.4 }}
                >
                  {t("common.clear")}
                </button>
              )}
            </div>
            {tapeRows.length === 0 ? (
              <div
                className="flex-1 min-h-0 flex items-center font-mono text-[12px] text-muted-faint"
                style={{ padding: "6px 2px" }}
              >
                {t("desktop.emptyTape")}
              </div>
            ) : (
              <>
                <div className={compact ? "" : "flex-1 min-h-0 overflow-y-auto"}>
                  {tapeRows.map(({ q, rp }, i) => (
                    <div
                      key={`${q}-${i}`}
                      className="fs-rise group flex items-center gap-3"
                      style={{ padding: "8px 0", borderTop: "1px solid var(--border-faint)" }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setQuery(q + " ");
                          markExternalValueChange();
                          focusInputAtEnd();
                        }}
                        className="flex-1 min-w-0 flex items-center gap-3 border-0 cursor-pointer text-left bg-transparent p-0"
                      >
                        <span className="flex flex-shrink-0 text-muted">
                          {rp.alias && <CommandGlyph fam={rp.alias.fam} alias={rp.alias.alias} size={15} />}
                        </span>
                        <span className="flex-1 min-w-0 font-bold text-[13px] text-foreground truncate">
                          {formatCommandParseName(t, rp)}
                        </span>
                        <span className="font-mono text-[11px] text-muted flex-shrink-0">
                          {fsLength(rp.lengthM ?? 0)} m × {rp.realQty}
                        </span>
                        <span
                          className="font-mono text-[13px] font-bold text-foreground text-right flex-shrink-0 whitespace-nowrap"
                          style={{ minWidth: 82 }}
                        >
                          {fsWeight(rp.totalKg!)} {fsWeightUnit()}
                        </span>
                        <span
                          className="font-mono text-[13px] font-semibold text-muted text-right flex-shrink-0 whitespace-nowrap"
                          style={{ minWidth: 92 }}
                        >
                          {sym} {fsMoney(rp.totalAmount!)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveTapeEntry(q)}
                        title={t("desktop.removeFromTape")}
                        aria-label={t("desktop.removeFromTapeAria", {
                          name: formatCommandParseName(t, rp) ?? q,
                        })}
                        className="flex items-center justify-center rounded-none border-0 cursor-pointer flex-shrink-0 text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        style={{ width: 20, height: 20, background: "var(--surface-inset)" }}
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  ))}
                </div>
                <div
                  className="flex items-center gap-3 flex-shrink-0"
                  style={{ padding: "9px 0 0", borderTop: "1.5px solid var(--border-strong)" }}
                >
                  <span className="font-mono text-xs font-bold text-muted">Σ</span>
                  <span
                    className="flex-1 text-[11px] font-bold text-muted"
                    style={{ letterSpacing: 0.8 }}
                  >
                    {t("desktop.runningTotal", { count: validTape.length })}
                  </span>
                  <span
                    className="font-mono text-[14px] font-extrabold text-right whitespace-nowrap flex-shrink-0"
                    style={{ minWidth: 82, color: "var(--accent)" }}
                  >
                    {fsWeight(sumKg)} {fsWeightUnit()}
                  </span>
                  <span
                    className="font-mono text-[14px] font-extrabold text-right whitespace-nowrap flex-shrink-0"
                    style={{ minWidth: 92, color: "var(--blue-strong)" }}
                  >
                    {sym} {fsMoney(sumAmount)}
                  </span>
                  {/* spacer mirroring the per-row × button keeps columns aligned */}
                  <span className="flex-shrink-0" style={{ width: 20 }} />
                </div>
              </>
            )}
          </div>

          {/* HISTORY — every logged line by day, over the whole answer column:
              the tape's own slot is a few rows tall on a laptop screen. */}
          {showHistory && (
            <div
              role="dialog"
              aria-label={t("history.title")}
              className="absolute inset-0 z-10 flex flex-col"
              style={{
                background: "var(--screen)",
                padding: compact ? undefined : "20px clamp(14px, 1.6vw, 24px) 0",
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setShowHistory(false);
                }
              }}
            >
              <div
                className="flex items-baseline gap-2.5 mb-2 flex-shrink-0"
                style={{ borderTop: "1px solid var(--foreground)", paddingTop: 10 }}
              >
                <SectionLabel as="h2">{t("desktop.history")}</SectionLabel>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setShowHistory(false)}
                  className="ml-auto bg-transparent border-0 text-muted text-[10px] font-bold cursor-pointer hover:text-foreground"
                  style={{ letterSpacing: 0.4 }}
                >
                  {t("desktop.backToSession")}
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto pb-4">
                <YourLines
                  compact
                  startInAll
                  oftenIn="everything"
                  items={history}
                  times={historyTimes}
                  counts={historyCounts}
                  settings={parserSettings}
                  mode={mode}
                  onClear={onClearHistory}
                  onLoad={(q) => {
                    setShowHistory(false);
                    setQuery(q + " ");
                    markExternalValueChange();
                    focusInputAtEnd();
                  }}
                  onRemove={onRemoveTapeEntry}
                />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT column — the breakdown as a ledger sheet. It takes the
            larger share of the page — the drawing, the ledger with its basis
            column and the bill of material all want the width — but both
            columns give way together as the window narrows, rather than the
            answer column alone being squeezed against a fixed-width sheet. */}
        <div
          className={`flex flex-col ${compact ? "flex-shrink-0 mt-4" : "min-h-0 min-w-0 overflow-y-auto"}`}
          style={{
            flex: compact ? "0 0 auto" : SHEET_FLEX,
            width: compact ? "100%" : undefined,
            maxWidth: compact ? undefined : SHEET_MAX,
            padding: compact ? "16px clamp(14px, 3vw, 22px)" : "18px clamp(14px, 1.8vw, 28px)",
            background: "var(--surface)",
            borderLeft: compact ? undefined : "1px solid var(--border-faint)",
            borderTop: compact ? "1px solid var(--border-faint)" : undefined,
          }}
        >
          <DeskBreakdown
            p={focusParse}
            line={line}
            metric={mode}
            picked={picked}
            onPick={setPicked}
            query={query}
            setQuery={setQuery}
            onLoadExample={(example) => {
              setQuery(`${example} `);
              markExternalValueChange();
              focusInputAtEnd();
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── breakdown rail ───────────────────────── */

// The answer column and the sheet share the width 1 : 1.6 from a zero basis,
// so both shrink in proportion. The answer column keeps a floor for the hero
// and the tape; the sheet stops growing where its tables stop needing room.
const ANSWER_FLEX = "1 1 0";
const ANSWER_MIN = 300;
const SHEET_FLEX = "1.6 1 0";
const SHEET_MAX = 940;

const SYNTAX_EXAMPLES: { query: string; descKey: string }[] = [
  { query: "hea120 6m x2 s235", descKey: "desktop.syntaxBeam" },
  { query: "rhs 80x40x3 4.5m @2.4/kg", descKey: "desktop.syntaxTube" },
  { query: "plt 1000x2000x10 304", descKey: "desktop.syntaxPlate" },
  { query: "hea120 6m + ipe160 4m", descKey: "desktop.syntaxAssembly" },
  { query: "ipe180 6m =500kg", descKey: "desktop.syntaxTarget" },
];

/** The rail: the phone's weight and cost ledgers, with the part drawn above. */
function DeskBreakdown({
  p,
  line,
  picked,
  onPick,
  metric,
  query,
  setQuery,
  onLoadExample,
}: {
  p: CommandParseResult;
  line: CommandLine;
  picked: number;
  onPick: (index: number) => void;
  metric: "weight" | "price";
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  onLoadExample: (example: string) => void;
}) {
  const t = useTranslations("command");
  if (!p.valid && !line.multi) {
    if (query.trim() === "") {
      return (
        <div className="flex flex-1 flex-col justify-center max-w-[520px] mx-auto w-full py-4">
          <span className="fs-track-label text-[10px] font-bold uppercase text-muted">
            {t("desktop.syntaxTitle")}
          </span>
          <h2 className="fs-title m-0 mt-1.5 text-[24px] leading-tight text-foreground">
            {t("desktop.syntaxHeadline")}
          </h2>
          <div className="mt-5 flex flex-col" style={{ borderTop: "1px solid var(--foreground)" }}>
            {SYNTAX_EXAMPLES.map((row) => (
              <button
                key={row.query}
                type="button"
                onClick={() => onLoadExample(row.query)}
                className="group flex flex-col items-start gap-0.5 py-3 px-1 text-left bg-transparent border-0 cursor-pointer hover:bg-[var(--background)] transition-colors"
                style={{ borderBottom: "1px solid var(--border-faint)" }}
              >
                <span
                  className="font-mono text-[13px] font-bold group-hover:underline"
                  style={{ color: "var(--accent-text)" }}
                >
                  {row.query}
                </span>
                <span className="text-[12px] text-muted">{t(row.descKey)}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center gap-2 text-center"
        style={{ padding: "18px 0 14px" }}
      >
        <span className="text-muted-faint">
          <CommandGlyph fam="beam" size={26} />
        </span>
        <span className="font-mono text-[12px] text-muted-faint" style={{ lineHeight: 1.5 }}>
          {t("desktop.breakdownEmpty")}
        </span>
      </div>
    );
  }
  return (
    <BreakdownLedger
      p={p}
      line={line}
      picked={picked}
      onPick={onPick}
      metric={metric}
      variant="rail"
      query={query}
      setQuery={setQuery}
    />
  );
}
