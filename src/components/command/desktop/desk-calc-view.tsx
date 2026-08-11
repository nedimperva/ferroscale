"use client";

import { Fragment, useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  cmdAppendLineItem,
  cmdParse,
  cmdClassifyToken,
  cmdPasteIntoLine,
} from "@ferroscale/metal-core";
import { fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import { useCountUp } from "@/hooks/useCountUp";
import type { CommandLine, CommandParseResult } from "@ferroscale/metal-core";
import { buildBreakdownRows, type BreakdownRowId } from "../breakdown-rows";
import { CommandGlyph } from "../command-glyph";
import { ProfileDrawing } from "../profile-drawing";
import { KIND_BG } from "../command-constants";
import {
  applyIssueSuggestion,
  computeGhost,
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
import { CloseIcon, DeskIcon, DeskPanel, DeskTokenChip, SectionLabel } from "./desk-atoms";
import { PricingBadge, TargetBadge } from "../command-atoms";
import { commandTargetNote } from "../target-note";
import { LineItems } from "../line-items";
import { massBand } from "../mass-band";
import {
  editLineToken,
  lineChipPrefix,
  lineChips,
  pullLastChip,
  removeLineToken,
} from "../line-edit";
import { marginPercentStore, massTolerancePercentStore } from "@/lib/settings-stores";

type DeskCalcViewProps = CommandDesktopProps & {
  inputRef: React.RefObject<HTMLInputElement | null>;
  gotoCompare: () => void;
};

/** Small square icon button used in the result panel's action cluster. */
function PanelIconBtn({
  onClick,
  disabled,
  title,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className="flex items-center justify-center rounded-[11px] text-muted"
      style={{
        width: 38,
        height: 38,
        border: "1px solid var(--border-faint)",
        background: "var(--surface)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  );
}

/**
 * The fold's four-cell glance row. Values are pulled from the shared breakdown
 * builder rather than recomputed, so the grid and the breakdown panel below it
 * can never disagree about the same number.
 */
function FoldCells({ p, sym }: { p: CommandParseResult; sym: string }) {
  const t = useTranslations("command");
  const cells: { label: string; value: string }[] = [
    {
      label: t("result.massPerMetre"),
      value: p.valid && p.kgm != null ? `${p.kgm.toFixed(2)} kg/m` : "—",
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
    <div className="grid w-full gap-2.5" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="rounded-[13px] border border-border-faint"
          style={{ padding: "12px 14px", background: "var(--surface-raised)" }}
        >
          <div className="fs-track-wide text-[9.5px] font-bold uppercase text-muted">
            {cell.label}
          </div>
          <div className="font-mono text-[17px] font-bold mt-1 truncate">
            {cell.value}
          </div>
        </div>
      ))}
    </div>
  );
}


export function DeskCalcView({
  compact,
  dark,
  query,
  setQuery,
  p,
  line,
  sug,
  sym,
  mode,
  onSetMode,
  parserSettings,
  sessionTape,
  onRemoveTapeEntry,
  onClearTape,
  onSaveSessionAsProject,
  onSave,
  currentSaved,
  onOpenHelp,
  onLogSession,
  onCopySummary,
  onShareLink,
  onNew,
  onSuggest,
  onCompareCurrent,
  onAddToProject,
  inputRef,
}: DeskCalcViewProps) {
  const t = useTranslations("command");
  const isW = mode === "weight";
  const targetNote = commandTargetNote(p);
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

  const removeTokenAt = (item: number, idx: number) => {
    setQuery(removeLineToken(query, item, idx));
    focusInputAtEnd();
  };
  // Pull a token back to the end of its own item as the editable trailing
  // partial (the parser is order-tolerant within an item, so this is free).
  const editTokenAt = (item: number, idx: number) => {
    setQuery(editLineToken(query, item, idx));
    focusInputAtEnd();
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

  const tapeRows = useMemo(
    () =>
      sessionTape
        .slice(0, 6)
        .map((q) => ({ q, rp: cmdParse(q, parserSettings) }))
        .filter(
          (x) => x.rp.valid && x.rp.totalKg != null && x.rp.totalAmount != null,
        ),
    [sessionTape, parserSettings],
  );
  const sumKg = tapeRows.reduce((s, x) => s + (x.rp.totalKg ?? 0), 0);
  const sumAmount = tapeRows.reduce((s, x) => s + (x.rp.totalAmount ?? 0), 0);

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      {/* ───────── command line — full width ───────── */}
      <div className="flex-shrink-0" style={{ padding: compact ? "14px 16px 0" : "22px 28px 0" }}>
        <label
          className="flex items-center gap-2 flex-wrap rounded-2xl cursor-text"
          style={{
            minHeight: 58,
            border: "1.5px solid var(--accent-border)",
            background: "var(--surface)",
            padding: "12px 18px",
            boxShadow: dark
              ? "0 0 0 3px rgba(240,121,63,0.13)"
              : "0 0 0 3px rgba(196,71,26,0.10)",
          }}
        >
          <span
            className="font-mono font-bold text-[19px] mr-0.5"
            style={{ color: "var(--accent)" }}
            aria-hidden="true"
          >
            ›
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
              {group.tokens.map((tok, i) => (
                <DeskTokenChip
                  key={`${tok}-${i}`}
                  tok={tok}
                  kindClass={KIND_BG[cmdClassifyToken(tok)]}
                  onEdit={() => editTokenAt(group.item, i)}
                  onRemove={() => removeTokenAt(group.item, i)}
                />
              ))}
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
                  focusInputAtEnd();
                  return;
                }
                case "historyNext": {
                  const nextIdx = historyIdxRef.current - 1;
                  historyIdxRef.current = nextIdx;
                  setQuery(nextIdx < 0 ? draftRef.current : sessionTape[nextIdx] + " ");
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

        {/* SUGGESTIONS */}
        <div className="mt-3">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <div
              className="fs-track-label text-[10px] font-bold text-muted uppercase"
            >
              {formatCommandHint(t, sug.hint)}
            </div>
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
          <div className="flex gap-x-[7px] gap-y-2 flex-wrap items-center">
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
                className="fs-pop flex items-center gap-[7px] rounded-[11px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                style={{
                  padding: it.sub ? "7px 13px" : "8px 14px",
                  border: it.kind === "save" ? "none" : "1px solid var(--border-faint)",
                  background: it.kind === "save" ? "var(--accent)" : "var(--surface)",
                  color: it.kind === "save" ? "var(--accent-contrast)" : "var(--foreground)",
                  boxShadow: "var(--panel-shadow-soft)",
                }}
              >
                {it.fam && (
                  <span className="flex" style={{ color: "var(--foreground-secondary)" }}>
                    <CommandGlyph fam={it.fam} size={16} />
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
      </div>

      {/* ───────── dashboard grid ───────── */}
      <div
        className={`flex flex-1 min-h-0 ${compact ? "flex-col overflow-y-auto" : ""} gap-[18px]`}
        style={{ padding: compact ? "14px 16px 20px" : "18px 28px 28px" }}
      >
        {/* LEFT column — result + session tape */}
        <div className="flex flex-col gap-4 min-w-0" style={{ flex: 1.55 }}>
          {/* RESULT PANEL */}
          <DeskPanel className="flex-shrink-0 flex flex-col" padding="22px 26px">
            <div className="flex items-center gap-3">
              <div
                className="inline-flex gap-1 rounded-[11px]"
                style={{ padding: 3, background: "var(--surface-inset)" }}
              >
                {(["weight", "price"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onSetMode(m)}
                    className="rounded-lg cursor-pointer border-0 font-bold text-[10px]"
                    style={{
                      padding: "6px 16px",
                      letterSpacing: 1.3,
                      background: mode === m ? "var(--surface)" : "transparent",
                      color:
                        mode === m
                          ? m === "weight"
                            ? "var(--accent-text)"
                            : "var(--blue-text)"
                          : "var(--muted)",
                      boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                    }}
                  >
                    {(m === "weight" ? t("settings.weight") : t("settings.price")).toUpperCase()}
                  </button>
                ))}
              </div>
              <span className="ml-auto flex items-center gap-[5px]">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: p.valid ? "var(--green-text)" : "var(--muted-faint)" }}
                />
                <span
                  className="text-[10.5px] font-bold"
                  style={{
                    letterSpacing: 0.5,
                    color: p.valid ? "var(--green-text)" : "var(--muted-faint)",
                  }}
                >
                  {p.valid ? t("status.live") : t("status.waiting")}
                </span>
              </span>
            </div>

            {/* hero */}
            <div style={{ padding: "14px 0 16px" }}>
              <div className="flex items-baseline gap-3.5">
                {!isW && p.totalAmount != null && (
                  <span
                    className="leading-none"
                    style={{ fontWeight: 800, fontSize: 48, color: "var(--blue-strong)" }}
                  >
                    {sym}
                  </span>
                )}
                <span
                  className="fs-display-num"
                  style={{
                    fontWeight: 800,
                    fontSize: compact ? "clamp(48px, 11vw, 72px)" : "clamp(64px, 6vw, 104px)",
                    lineHeight: 0.82,
                    letterSpacing: -5,
                    color: heroVal === "—" ? "var(--muted-faint)" : "var(--foreground)",
                  }}
                >
                  {heroVal}
                </span>
                {isW && p.totalKg != null && (
                  <span className="font-bold text-[40px]" style={{ color: "var(--accent)" }}>
                    {fsWeightUnit()}
                  </span>
                )}
              </div>
              {band && (
                <div
                  className="fs-track-wide font-mono text-[12px] text-muted mt-2"
                >
                  {band.percentLabel} · {band.rangeLabel}
                </div>
              )}
              {/* descriptive / issue / hint line */}
              <div className="mt-[18px] min-h-[20px]">
                {line.multi ? (
                  <LineItems line={line} />
                ) : p.valid && p.kgm != null ? (
                  <span className="font-mono text-[14px] text-muted flex items-center gap-1.5 flex-wrap">
                    <span>
                      <span className="text-foreground-secondary">{p.kgm.toFixed(2)}</span> kg/m ×{" "}
                      <span className="text-foreground-secondary">{p.lengthM}</span> m ×{" "}
                      <span className="text-foreground-secondary">{p.realQty}</span>
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
                        className="rounded-full font-bold cursor-pointer"
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
              <FoldCells p={p} sym={sym} />
            </div>
            <div className="flex items-end gap-6 flex-wrap" style={{ paddingTop: 16 }}>
              <div className="ml-auto flex items-center gap-2">
                {/* Save is a toggle: filled bookmark = this exact line is in
                    the library, press again to remove it. */}
                <button
                  type="button"
                  onClick={onSave}
                  disabled={!p.valid}
                  aria-pressed={currentSaved}
                  title={currentSaved ? t("common.saved") : t("common.save")}
                  className="inline-flex items-center gap-[7px] rounded-[11px] font-bold text-[13px] whitespace-nowrap"
                  style={{
                    padding: "9px 16px",
                    border: currentSaved ? "1px solid var(--accent-border)" : "none",
                    background: currentSaved ? "var(--accent-surface)" : "var(--accent)",
                    color: currentSaved ? "var(--accent-text)" : "var(--accent-contrast)",
                    cursor: p.valid ? "pointer" : "default",
                    opacity: p.valid ? 1 : 0.45,
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill={currentSaved ? "currentColor" : "none"}
                    stroke={currentSaved ? "currentColor" : "var(--accent-contrast)"}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                  {currentSaved ? t("common.saved") : t("common.save")}
                </button>
                <button
                  type="button"
                  onClick={onCompareCurrent}
                  disabled={!p.valid}
                  className="inline-flex items-center gap-[7px] rounded-[11px] font-bold text-[13px] whitespace-nowrap text-foreground"
                  style={{
                    padding: "9px 14px",
                    border: "1px solid var(--border-faint)",
                    background: "var(--surface)",
                    cursor: p.valid ? "pointer" : "default",
                    opacity: p.valid ? 1 : 0.45,
                    boxShadow: "var(--panel-shadow-soft)",
                  }}
                >
                  <DeskIcon name="compare" />
                  {t("common.compare")}
                </button>
                <button
                  type="button"
                  onClick={() => setQuery((q) => cmdAppendLineItem(q))}
                  disabled={!p.valid}
                  className="inline-flex items-center gap-[7px] rounded-[11px] font-bold text-[13px] whitespace-nowrap text-muted"
                  style={{
                    padding: "9px 14px",
                    border: "1px dashed var(--border-strong)",
                    background: "transparent",
                    cursor: p.valid ? "pointer" : "default",
                    opacity: p.valid ? 1 : 0.45,
                  }}
                >
                  {t("desktop.anotherItem")}
                </button>
                <PanelIconBtn
                  onClick={onCopySummary}
                  disabled={!p.valid}
                  title={t("common.copySummary")}
                  ariaLabel={t("common.copySummary")}
                >
                  <DeskIcon name="copy" stroke="currentColor" />
                </PanelIconBtn>
                <PanelIconBtn
                  onClick={onAddToProject}
                  disabled={!p.valid}
                  title={t("common.project")}
                  ariaLabel={t("common.project")}
                >
                  <DeskIcon name="plus" stroke="currentColor" />
                </PanelIconBtn>
                <PanelIconBtn
                  onClick={onShareLink}
                  disabled={!p.valid}
                  title={t("common.shareLink")}
                  ariaLabel={t("common.shareLink")}
                >
                  <DeskIcon name="link" stroke="currentColor" />
                </PanelIconBtn>
              </div>
            </div>
          </DeskPanel>

          {/* SESSION TAPE — fills remaining height */}
          <DeskPanel
            className={`flex flex-col ${compact ? "flex-shrink-0" : "flex-1 min-h-0"}`}
            radius={16}
            padding="14px 18px"
          >
            <div className="flex items-baseline gap-2.5 mb-1.5 flex-shrink-0">
              <SectionLabel>{t("desktop.session")}</SectionLabel>
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
                          focusInputAtEnd();
                        }}
                        className="flex-1 min-w-0 flex items-center gap-3 border-0 cursor-pointer text-left bg-transparent p-0"
                      >
                        <span className="flex flex-shrink-0 text-muted">
                          {rp.alias && <CommandGlyph fam={rp.alias.fam} size={15} />}
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
                        className="flex items-center justify-center rounded-full border-0 cursor-pointer flex-shrink-0 text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
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
                    {t("desktop.runningTotal", { count: tapeRows.length })}
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
          </DeskPanel>
        </div>

        {/* RIGHT column — expanded breakdown */}
        <DeskPanel
          className={`flex flex-col ${compact ? "flex-shrink-0" : "min-h-0 overflow-y-auto"}`}
          padding="20px 22px"
          style={{
            flex: compact ? "0 0 auto" : 1,
            minWidth: compact ? 0 : 300,
            maxWidth: compact ? "100%" : 400,
          }}
        >
          <DeskBreakdown p={p} line={line} />
        </DeskPanel>
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

function DeskBreakdown({ p, line }: { p: CommandParseResult; line: CommandLine }) {
  const t = useTranslations("command");
  const r = p.calc?.result;
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
  const rows = p.valid ? buildBreakdownRows(p, t, { marginPercent, massTolerancePercent }) : null;
  // The expanded right column keeps a tighter subset: density lives in the
  // header, and per-piece price / subtotal stay sheet-only.
  const geometry = rows?.geometry.filter((row) => row.id !== "density") ?? [];
  const pricing =
    rows?.pricing.filter((row) => row.id !== "perPiecePrice" && row.id !== "subtotal") ?? [];

  return (
    <>
      <div
        className="fs-track-label text-[10px] font-bold text-muted mb-3 flex-shrink-0"
      >
        {/* The breakdown describes one calculation — kg/m and per-piece weight
            don't sum — so on a multi-item line it has to say which one, or its
            numbers read as contradicting the hero's total. */}
        {line.multi
          ? t("desktop.breakdownItem", {
              index: line.activeIndex + 1,
              count: line.items.length,
            })
          : t("desktop.breakdown")}
      </div>
      {rows && r ? (
        <>
          <div
            className="rounded-[14px] flex items-center justify-center mb-4 flex-shrink-0"
            style={{ background: "var(--surface-inset)", padding: "16px 10px" }}
          >
            <ProfileDrawing p={p} className="w-full flex flex-col items-center" />
          </div>
          <div
            className="min-w-0 flex-shrink-0"
            style={{ paddingBottom: 12, borderBottom: "1px solid var(--border-faint)" }}
          >
            <div className="fs-track-tight font-extrabold text-[17px] text-foreground">
              {formatCommandParseName(t, p)}
            </div>
            <div className="font-mono text-[11px] text-muted mt-0.5">
              {p.gradeLabel ?? r.gradeLabel} · {r.densityKgPerM3} kg/m³
            </div>
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
