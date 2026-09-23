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
import { KIND_BG } from "../command-constants";
import {
  applyIssueSuggestion,
  computeGhost,
  formatAvailability,
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
import { DeskViewHeader } from "./desk-rail";
import { AvailabilityBadge, PricingBadge, TargetBadge, InlineIssue } from "../command-atoms";
import { commandTargetNote } from "../target-note";
import { massBand } from "../mass-band";
import { ProfileDiscoveryTiles } from "../profile-discovery-tiles";
import { SaveControl } from "../save-control";
import { DEMO_QUERY } from "../command-constants";
import {
  editLineToken,
  lineChipPrefix,
  lineChips,
  lineExpandedIndex,
  pullLastChip,
  removeLineToken,
} from "../line-edit";
import { massTolerancePercentStore } from "@/lib/settings-stores";
import { useExpandedItem } from "../use-expanded-item";

type DeskCalcViewProps = CommandDesktopProps & {
  inputRef: React.RefObject<HTMLInputElement | null>;
  gotoCompare: () => void;
};



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
  const chips = useMemo(() => lineChips(query), [query]);
  const partial = chips.partial;
  const chipCount = chips.groups.reduce((n, group) => n + group.tokens.length, 0);
  const chipPrefix = useMemo(() => lineChipPrefix(query), [query]);
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
  const editTokenAt = (item: number, idx: number) => {
    keepExpanded(item, editLineToken(query, item, idx));
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
          <span className="font-mono text-[11px] text-muted whitespace-nowrap">
            {settingsSummary}
          </span>
        }
      />

      {/* ───────── command line — full width ───────── */}
      <div className="flex-shrink-0" style={{ padding: compact ? "14px 16px 0" : "18px 20px 0" }}>
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
          {chips.groups.map((group) => (
            <Fragment key={group.item}>
              {group.item > 0 && (
                <span
                  className="font-mono text-[17px] font-bold px-0.5"
                  style={{ color: "var(--muted-faint)" }}
                  aria-hidden="true"
                >
                  +
                </span>
              )}
              {group.item === expandedIndex ? (
                group.tokens.map((tok, i) => (
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
                ))
              ) : group.tokens.length === 0 ? null : (
                <button
                  type="button"
                  onClick={() => setExpandedItem(group.item)}
                  aria-label={t("query.expandItem", {
                    index: group.item + 1,
                    name: collapsedItemLabel(group),
                  })}
                  className="inline-flex items-center gap-1.5 flex-shrink-0 rounded-lg font-mono text-[14px] font-semibold whitespace-nowrap"
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
                  setQuery(pullLastChip(query));
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
              className="flex items-end gap-6 flex-wrap"
              style={{ paddingTop: 16, borderTop: "1px solid var(--border-faint)" }}
            >
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
            metric={mode}
            picked={picked}
            onPick={setPicked}
            query={query}
            setQuery={setQuery}
          />
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── breakdown rail ───────────────────────── */

/** The rail: the phone's weight and cost ledgers, with the part drawn above. */
function DeskBreakdown({
  p,
  line,
  picked,
  onPick,
  metric,
  query,
  setQuery,
}: {
  p: CommandParseResult;
  line: CommandLine;
  picked: number;
  onPick: (index: number) => void;
  metric: "weight" | "price";
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
}) {
  const t = useTranslations("command");
  if (!p.valid && !line.multi) {
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
