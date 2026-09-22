"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  cmdAppendLineItem,
  cmdParse,
  cmdClassifyToken,
  cmdPasteIntoLine,
  findAliasByPrefix,
} from "@ferroscale/metal-core";
import {
  fsMoney,
  fsWeight,
  fsWeightUnit,
  getMaterialGradeById,
  SHEET_LIKE_FAMILIES,
  toMillimeters,
} from "@ferroscale/metal-core";
import { useCountUp, markExternalValueChange } from "@/hooks/useCountUp";
import type { CommandLine, CommandParseResult } from "@ferroscale/metal-core";
import { buildBreakdownRows, type BreakdownRowId } from "../breakdown-rows";
import { CommandGlyph } from "../command-glyph";
import { ProfileDrawing } from "../profile-drawing";
import { KIND_BG } from "../command-constants";
import {
  applyIssueSuggestion,
  computeGhost,
  formatAvailability,
  formatCommandHint,
  formatCommandIssue,
  formatCommandParseName,
  formatCommandSuggestionLabel,
} from "../command-copy";
import { GhostField } from "../ghost-field";
import { resolveCommandKey } from "../command-keys";
import { CommandKeyHints } from "../command-key-hints";
import { groupedSuggestions } from "../suggestion-groups";
import type { CommandDesktopProps } from "./desktop-props";
import { CloseIcon, DeskIcon, DeskTokenChip, SectionLabel } from "./desk-atoms";
import { DeskViewHeader } from "./desk-rail";
import { AvailabilityBadge, PricingBadge, TargetBadge } from "../command-atoms";
import { commandTargetNote } from "../target-note";
import { AssemblyParts } from "../assembly-parts";
import { applyNearbySpec, NearbySpecs } from "../nearby-specs";
import { massBand } from "../mass-band";
import { ProfileDiscoveryTiles } from "../profile-discovery-tiles";
import { SegmentedRail } from "../segmented-rail";
import { SaveControl } from "../save-control";
import { DEMO_QUERY } from "../command-constants";
import {
  duplicateLineItem,
  editLineToken,
  lineChips,
  pullLastChip,
  removeLineItem,
  removeLineToken,
  replaceLinePartial,
} from "../line-edit";
import { marginPercentStore, massTolerancePercentStore } from "@/lib/settings-stores";
import { useExpandedItem } from "../use-expanded-item";

type DeskCalcViewProps = CommandDesktopProps & {
  inputRef: React.RefObject<HTMLInputElement | null>;
  gotoCompare: () => void;
};

/**
 * The fold's four-cell glance row. Values are pulled from the shared breakdown
 * builder rather than recomputed, so the grid and the breakdown panel below it
 * can never disagree about the same number.
 */
function FoldCells({ p, sym }: { p: CommandParseResult; sym: string }) {
  const t = useTranslations("command");
  const isSheet = Boolean(p.alias && SHEET_LIKE_FAMILIES.has(p.alias.fam));
  const widthEntry = p.calc?.input.manualDimensions?.width;
  const widthM = widthEntry ? toMillimeters(widthEntry.value, widthEntry.unit) / 1000 : 0;
  const areaM2 = widthM > 0 && p.lengthM ? widthM * p.lengthM : 0;
  const massPerAreaVal = areaM2 > 0 && p.calc ? p.calc.result.unitWeightKg / areaM2 : null;

  const massLabel = isSheet && massPerAreaVal != null ? t("result.massPerArea") : t("result.massPerMetre");
  const massValue =
    p.valid && isSheet && massPerAreaVal != null
      ? `${massPerAreaVal.toFixed(2)} kg/m²`
      : p.valid && p.kgm != null
      ? `${p.kgm.toFixed(2)} kg/m`
      : "—";

  const cells: { label: string; value: string }[] = [
    {
      label: massLabel,
      value: massValue,
    },
    {
      label: t("desktop.perPieceLabel"),
      value:
        p.valid && p.perPieceKg != null ? `${fsWeight(p.perPieceKg)} ${fsWeightUnit()}` : "—",
    },
    {
      label: t("result.totalWeight"),
      value: p.valid && p.totalKg != null ? `${fsWeight(p.totalKg)} ${fsWeightUnit()}` : "—",
    },
    {
      label: t("desktop.totalCostLabel"),
      value: p.valid && p.totalAmount != null ? `${sym} ${fsMoney(p.totalAmount)}` : "—",
    },
  ];

  return (
    /* Four boxes became one band: a rule above, a rule below, hairlines
       between. Same four numbers, three fewer edges each. */
    <div
      className="flex w-full"
      style={{
        borderTop: "1px solid var(--border-faint)",
        borderBottom: "1px solid var(--border-faint)",
      }}
    >
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          className="flex-1 min-w-0"
          style={{
            padding: i === 0 ? "11px 16px 11px 0" : "11px 16px",
            borderLeft: i === 0 ? undefined : "1px solid var(--border-faint)",
          }}
        >
          <div className="font-mono text-[10px] uppercase text-muted" style={{ letterSpacing: 1.6 }}>
            {cell.label}
          </div>
          <div className="font-mono text-[16px] mt-1 truncate">{cell.value}</div>
        </div>
      ))}
    </div>
  );
}


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
  defaultUnit,
  sessionTape,
  onRemoveTapeEntry,
  onClearTape,
  onSaveSessionAsProject,
  onSave,
  onPrimarySave,
  onOpenDestinations,
  currentProjectName,
  currentSaved,
  onOpenHelp,
  onLogSession,
  onCopySummary,
  onShareLink,
  onNew,
  onSuggest,
  onCompareCurrent,
  inputRef,
}: DeskCalcViewProps) {
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
  // ↑/↓ recall through the session tape; draft holds the in-progress query so
  // ↓ past the newest entry restores it.
  const historyIdxRef = useRef(-1);
  const draftRef = useRef("");

  // Chips are grouped per `+`-joined item; the trailing piece (no whitespace
  // after it) is still being typed and lives in the real input.
  const { expandedItem, setExpandedItem, lockExpanded } = useExpandedItem(query);
  const segments = useMemo(() => cmdSplitLine(query), [query]);
  const expandedIndex =
    expandedItem != null && expandedItem >= 0 && expandedItem < segments.length
      ? expandedItem
      : Math.max(0, segments.length - 1);
  const chips = useMemo(() => lineChips(query, expandedIndex), [query, expandedIndex]);
  const partial = chips.partial;
  const chipCount = chips.groups.reduce((n, group) => n + group.tokens.length, 0);
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
    line.multi && line.items[expandedIndex]?.parse.valid
      ? line.items[expandedIndex].parse
      : line.multi && line.items[picked]?.parse.valid
        ? line.items[picked].parse
        : p;
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
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

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

  const keepExpanded = (item: number, next: string) => {
    lockExpanded(item, next);
    setQuery(next);
    focusInputAtEnd();
  };
  const removeTokenAt = (item: number, idx: number) => {
    keepExpanded(item, removeLineToken(query, item, idx));
  };
  const editTokenAt = (item: number, idx: number) => {
    keepExpanded(item, editLineToken(query, item, idx, item));
  };

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

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      {/* No standfirst here: the design puts the query in this slot, but the
          command line sits directly below and says the same thing in full.
          What the header adds is the state the line does *not* show — the
          defaults every untyped token falls back to. */}
      <DeskViewHeader
        title={t("nav.calculator")}
        actions={
          <span className="font-mono text-[10.5px] text-muted whitespace-nowrap">
            {settingsSummary}
          </span>
        }
      />

      {/* ───────── command line — full width ───────── */}
      <div className="flex-shrink-0" style={{ padding: compact ? "14px 16px 0" : "18px 20px 0" }}>
        {chips.groups.length > 1 && (
          <div className="mb-2">
            <SegmentedRail
              line={line}
              groups={chips.groups}
              expandedIndex={expandedIndex}
              onSelectTab={(idx) => {
                setExpandedItem(idx);
                setPicked(idx);
                focusInputAtEnd();
              }}
              onRemoveItem={(idx) => {
                const next = removeLineItem(query, idx);
                setQuery(next);
                if (expandedIndex >= idx && expandedIndex > 0) {
                  setExpandedItem(expandedIndex - 1);
                  setPicked(expandedIndex - 1);
                }
                focusInputAtEnd();
              }}
              onDuplicateItem={(idx) => {
                const next = duplicateLineItem(query, idx);
                setQuery(next);
                setExpandedItem(chips.groups.length);
                setPicked(chips.groups.length);
                focusInputAtEnd();
              }}
              onAddItem={() => {
                const next = cmdAppendLineItem(query);
                setQuery(next);
                setExpandedItem(chips.groups.length);
                setPicked(chips.groups.length);
                focusInputAtEnd();
              }}
              compact={compact}
            />
          </div>
        )}
        {/* An ink edge, not an accent glow. The bar is the one thing on the
            screen you always type into, so it is drawn like a rule rather
            than lit like a notification — which leaves the accent free to
            mean "this is the answer" a few centimetres below. */}
        <label
          className="flex items-center gap-2 flex-wrap cursor-text"
          style={{
            minHeight: 52,
            border: "1px solid var(--foreground)",
            background: "var(--surface)",
            padding: "10px 14px",
          }}
        >
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
          {(chips.groups[expandedIndex]?.tokens ?? []).map((tok, i) => (
            <DeskTokenChip
              key={`${tok}-${i}`}
              tok={tok}
              kindClass={KIND_BG[cmdClassifyToken(tok)]}
              shadowed={line.items[expandedIndex]?.parse.shadowedTokenIndexes.includes(i)}
              onEdit={() => editTokenAt(expandedIndex, i)}
              onRemove={() => removeTokenAt(expandedIndex, i)}
            />
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
              setQuery(replaceLinePartial(query, expandedIndex, e.target.value));
            }}
            onKeyDown={(e) => {
              // Alt + 1..9: switch to tab N
              if (e.altKey && !e.ctrlKey && !e.metaKey && e.key >= "1" && e.key <= "9") {
                const targetTab = parseInt(e.key, 10) - 1;
                if (targetTab < chips.groups.length) {
                  e.preventDefault();
                  setExpandedItem(targetTab);
                  setPicked(targetTab);
                  focusInputAtEnd();
                  return;
                }
              }
              // Alt + + or Alt + =: add new line item
              if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "+" || e.key === "=")) {
                e.preventDefault();
                const next = cmdAppendLineItem(query);
                setQuery(next);
                setExpandedItem(chips.groups.length);
                setPicked(chips.groups.length);
                focusInputAtEnd();
                return;
              }
              // Alt + W: close active tab (when > 1 item)
              if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "w" || e.key === "W")) {
                if (chips.groups.length > 1) {
                  e.preventDefault();
                  const next = removeLineItem(query, expandedIndex);
                  setQuery(next);
                  if (expandedIndex > 0) {
                    setExpandedItem(expandedIndex - 1);
                    setPicked(expandedIndex - 1);
                  }
                  focusInputAtEnd();
                  return;
                }
              }
              // Backspace on empty tab: remove this item and return to previous
              if (
                e.key === "Backspace" &&
                !partial &&
                (chips.groups[expandedIndex]?.tokens.length ?? 0) === 0 &&
                chips.groups.length > 1
              ) {
                e.preventDefault();
                const next = removeLineItem(query, expandedIndex);
                setQuery(next);
                if (expandedIndex > 0) {
                  setExpandedItem(expandedIndex - 1);
                  setPicked(expandedIndex - 1);
                }
                focusInputAtEnd();
                return;
              }

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
                historyLength: sessionTape.length,
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
                    sessionTape.length - 1,
                  );
                  setQuery(sessionTape[historyIdxRef.current] + " ");
                  markExternalValueChange();
                  focusInputAtEnd();
                  return;
                }
                case "historyNext": {
                  const nextIdx = historyIdxRef.current - 1;
                  historyIdxRef.current = nextIdx;
                  setQuery(nextIdx < 0 ? draftRef.current : sessionTape[nextIdx] + " ");
                  markExternalValueChange();
                  focusInputAtEnd();
                  return;
                }
                case "focusChips":
                  firstSuggestionRef.current?.focus();
                  return;
                case "editLastChip":
                  setQuery(pullLastChip(query, expandedIndex));
                  focusInputAtEnd();
                  return;
              }
            }}
            autoFocus
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
            placeholder={chipCount === 0 && !partial ? t("query.placeholderExample") : ""}
            aria-label={t("query.aria")}
            wrapperClassName="flex-1 min-w-[120px]"
            inputClassName="bg-transparent font-mono text-base font-semibold text-foreground placeholder:text-muted-faint"
            mirrorClassName="font-mono text-base font-semibold"
            // The command-line box carries the permanent accent glow; the
            // global :focus-visible ring on the inner input is just noise.
            style={{ outline: "none" }}
          />
          {query !== "" && (
            <button
              type="button"
              onClick={onNew}
              className="ml-auto bg-transparent border-0 text-muted text-[11px] font-bold cursor-pointer"
              style={{ letterSpacing: 0.4 }}
            >
              {t("common.clear")}
            </button>
          )}
        </label>

        {query.trim() === "" ? (
          <div className="mt-4">
            <ProfileDiscoveryTiles
              onSelectProfile={(prefix) => {
                setQuery(prefix);
                focusInputAtEnd();
              }}
              onTryDemo={() => {
                setQuery(DEMO_QUERY);
                focusInputAtEnd();
              }}
              compact={compact}
            />
          </div>
        ) : (
          /* SUGGESTIONS */
          <div className="mt-3">
            <div className="flex items-center gap-3 flex-wrap mb-2">
            <h2
              className="fs-track-label text-[10px] font-bold text-muted uppercase"
            >
              {formatCommandHint(t, sug.hint)}
            </h2>
            <span className="ml-auto">
              <CommandKeyHints
                valid={p.valid}
                hasGhost={!!ghost}
                suggestionCount={sug.items.length}
                historyLength={sessionTape.length}
                onOpenHelp={onOpenHelp}
              />
            </span>
          </div>
          <div data-suggestion-strip="" className="flex gap-x-[7px] gap-y-2 flex-wrap items-center">
            {groupedSuggestions(sug.items).map((group) => (
              <div key={group.group ?? "all"} className="flex items-center gap-[7px] flex-wrap">
                {group.group && (
                  <span
                    className="text-[9.5px] font-bold text-muted-faint uppercase"
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
                className="fs-pop flex items-center gap-[7px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                style={{
                  padding: it.sub ? "7px 13px" : "8px 14px",
                  border: it.kind === "save" ? "none" : "1px solid var(--border)",
                  background: it.kind === "save" ? "var(--action)" : "var(--surface)",
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
                    className="font-mono text-[9.5px] font-bold"
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
        )}
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
          className="flex flex-col gap-4 min-w-0"
          style={{ flex: 1.55, padding: compact ? undefined : "20px 24px 0" }}
        >
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
                mono keeps them from reflowing as the value counts up. */}
            <div style={{ padding: "10px 0 14px" }}>
              <div className="flex items-baseline gap-3">
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
                    fontSize: compact ? "clamp(48px, 11vw, 72px)" : "clamp(56px, 6.2vw, 92px)",
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
                      <span className="text-foreground-secondary">{p.kgm.toFixed(2)}</span> kg/m ×{" "}
                      <span className="text-foreground-secondary">{p.lengthM}</span> m ×{" "}
                      <span className="text-foreground-secondary">{p.realQty}</span>
                      {p.gradeLabel ? ` · ${p.gradeLabel}` : ""}
                      {/* When the money on screen comes from the seeded rate,
                          say so next to it. The weight is measured; the price
                          is an assumption, and it should travel with the
                          figure rather than hide in the breakdown panel. */}
                      {!isW && !rateIsUserSupplied
                        ? ` · @ ${fsMoney(p.pricing.unitPrice)}/${p.pricing.priceUnit} ${t("result.defaultRate")}`
                        : ""}
                    </span>
                    {p.availability && (
                      <AvailabilityBadge>
                        {formatAvailability(t, p.availability, p.gradeLabel).badge}
                      </AvailabilityBadge>
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
                cell and clipped every value mid-number. */}
            <div style={{ paddingTop: 18, borderTop: "1px solid var(--border-faint)" }}>
              <FoldCells p={focusParse} sym={sym} />
            </div>
            <div className="flex items-end gap-6 flex-wrap" style={{ paddingTop: 16 }}>
              <div className="ml-auto flex items-center gap-2">
                {/* Copy the answer — the other thing done with a result. */}
                <button
                  type="button"
                  onClick={onCopySummary}
                  disabled={!p.valid}
                  title={t("common.copySummary")}
                  aria-label={t("common.copySummary")}
                  className="inline-flex items-center gap-[7px] text-[12.5px] font-medium whitespace-nowrap"
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
              {tapeRows.length > 0 && (
                <button
                  type="button"
                  onClick={onSaveSessionAsProject}
                  className="ml-auto bg-transparent border-0 text-[10px] font-bold cursor-pointer"
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
                className="flex-1 min-h-0 flex items-center font-mono text-[11.5px] text-muted-faint"
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
                          {rp.lengthM} m × {rp.realQty}
                        </span>
                        <span
                          className="font-mono text-[12.5px] font-bold text-foreground text-right flex-shrink-0 whitespace-nowrap"
                          style={{ minWidth: 82 }}
                        >
                          {fsWeight(rp.totalKg!)} {fsWeightUnit()}
                        </span>
                        <span
                          className="font-mono text-[12.5px] font-semibold text-muted text-right flex-shrink-0 whitespace-nowrap"
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
                    className="flex-1 text-[10.5px] font-bold text-muted"
                    style={{ letterSpacing: 0.8 }}
                  >
                    {t("desktop.runningTotal", { count: validTape.length })}
                  </span>
                  <span
                    className="font-mono text-[13.5px] font-extrabold text-right whitespace-nowrap flex-shrink-0"
                    style={{ minWidth: 82, color: "var(--accent)" }}
                  >
                    {fsWeight(sumKg)} {fsWeightUnit()}
                  </span>
                  <span
                    className="font-mono text-[13.5px] font-extrabold text-right whitespace-nowrap flex-shrink-0"
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
        </div>

        {/* RIGHT column — expanded breakdown */}
        <div
          className={`flex flex-col ${compact ? "flex-shrink-0 mt-4" : "min-h-0 overflow-y-auto"}`}
          style={{
            flex: compact ? "0 0 auto" : "0 0 352px",
            width: compact ? "100%" : 352,
            padding: "20px 22px",
            background: "var(--surface)",
            borderLeft: compact ? undefined : "1px solid var(--border-faint)",
            borderTop: compact ? "1px solid var(--border-faint)" : undefined,
          }}
        >
          <DeskBreakdown
            p={focusParse}
            line={line}
            picked={picked}
            onPick={(idx) => {
              setPicked(idx);
              setExpandedItem(idx);
            }}
            query={query}
            setQuery={setQuery}
          />
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── breakdown card ───────────────────────── */

function Line({
  id,
  label,
  value,
  strong,
  accent,
}: {
  /** Stable hook for tests and debugging — the row's meaning, not its position. */
  id?: string;
  label: string;
  value: string;
  strong?: boolean;
  accent?: string;
}) {
  return (
    <div
      data-row={id}
      className="flex items-baseline justify-between gap-3"
      style={{ padding: "9px 0" }}
    >
      <span
        className="whitespace-nowrap"
        style={{
          fontSize: 13,
          fontWeight: strong ? 700 : 500,
          color: strong ? "var(--foreground)" : "var(--muted)",
        }}
      >
        {label}
      </span>
      <span
        className="whitespace-nowrap font-mono"
        style={{
          fontSize: strong ? 16 : 14,
          fontWeight: strong ? 700 : 600,
          color: accent ?? "var(--foreground)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/** Desktop styling per shared row id; rows not listed render as plain lines. */
const DESK_ROW_STYLE: Partial<Record<BreakdownRowId, { strong?: boolean; accent?: string }>> = {
  totalWeight: { strong: true, accent: "var(--accent)" },
  totalCost: { strong: true, accent: "var(--blue-strong)" },
};

function DeskBreakdown({
  p,
  line,
  picked,
  onPick,
  query,
  setQuery,
}: {
  p: CommandParseResult;
  line: CommandLine;
  picked: number;
  onPick: (index: number) => void;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
}) {
  const t = useTranslations("command");
  const focus = p;
  const r = focus.calc?.result;
  const marginPercent = useSyncExternalStore(
    marginPercentStore.subscribe,
    marginPercentStore.getSnapshot,
    marginPercentStore.getServerSnapshot,
  );
  const massTolerancePercent = useSyncExternalStore(
    massTolerancePercentStore.subscribe,
    massTolerancePercentStore.getSnapshot,
    massTolerancePercentStore.getServerSnapshot,
  );
  const rows = focus.valid ? buildBreakdownRows(focus, t, { marginPercent, massTolerancePercent }) : null;
  // The expanded right column keeps a tighter subset: kg/m is already in the
  // glance row, density lives in the header, and per-piece price / subtotal
  // stay sheet-only.
  const geometry =
    rows?.geometry.filter(
      (row) => row.id !== "density" && row.id !== "massPerMetre" && row.id !== "massPerArea",
    ) ?? [];
  const pricing =
    rows?.pricing.filter((row) => row.id !== "perPiecePrice" && row.id !== "subtotal") ?? [];

  return (
    <>
      {line.multi ? (
        <AssemblyParts line={line} selected={picked} onSelect={onPick} />
      ) : (
        <h2 className="fs-track-label text-[10px] font-bold text-muted mb-3 flex-shrink-0">
          {t("desktop.breakdown")}
        </h2>
      )}
      {rows && r ? (
        <>
          <div
            className="rounded-none flex items-center justify-center mb-4 flex-shrink-0"
            style={{ background: "var(--surface-inset)", padding: "16px 10px" }}
          >
            <ProfileDrawing p={focus} className="w-full flex flex-col items-center" />
          </div>
          <div
            className="min-w-0 flex-shrink-0"
            style={{ paddingBottom: 12, borderBottom: "1px solid var(--border-faint)" }}
          >
            <div className="fs-track-tight font-extrabold text-[17px] text-foreground">
              {formatCommandParseName(t, focus)}
            </div>
            <div className="font-mono text-[11px] text-muted mt-0.5">
              {focus.gradeLabel ?? r.gradeLabel} · {r.densityKgPerM3} kg/m³
            </div>
            {/* The badge on the hero says "to order"; this is where there is
                room to say what that means and why the rate will not carry
                over from the steel price book. */}
            {focus.availability && (
              <p
                className="text-[11px] leading-[1.45] mt-2 mb-0 px-2 py-1.5 rounded"
                style={{
                  background: "var(--amber-surface)",
                  color: "var(--amber-text)",
                  border: "1px solid var(--amber-border)",
                }}
              >
                {formatAvailability(t, focus.availability, focus.gradeLabel).detail}{" "}
                {t("availability.checkRate")}
              </p>
            )}
          </div>
          <div style={{ paddingTop: 6 }}>
            {geometry.map((row) => (
              <div key={row.id}>
                <Line id={row.id} label={row.label} value={row.value} {...DESK_ROW_STYLE[row.id]} />
                {row.id === "pieces" && (
                  <div style={{ height: 1, background: "var(--border-faint)", margin: "2px 0" }} />
                )}
              </div>
            ))}
            <div style={{ height: 1, background: "var(--border-faint)", margin: "2px 0" }} />
            {pricing.map((row) => (
              <Line key={row.id} id={row.id} label={row.label} value={row.value} {...DESK_ROW_STYLE[row.id]} />
            ))}
          </div>
          {focus.calc && (
            <NearbySpecs
              input={focus.calc.input}
              onPick={(row) => {
                if (!focus.calc) return;
                setQuery(applyNearbySpec(query, picked, row, focus.calc.input));
              }}
            />
          )}
        </>
      ) : (
        <div
          className="flex flex-1 flex-col items-center justify-center gap-2 text-center"
          style={{ padding: "18px 0 14px" }}
        >
          <span className="text-muted-faint">
            <CommandGlyph fam="beam" size={26} />
          </span>
          <span className="font-mono text-[11.5px] text-muted-faint" style={{ lineHeight: 1.5 }}>
            {t("desktop.breakdownEmpty")}
          </span>
        </div>
      )}
    </>
  );
}
