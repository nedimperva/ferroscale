"use client";

import { useCallback, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { cmdParse, cmdClassifyToken, cmdTokenize } from "@ferroscale/metal-core";
import { fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import { useCountUp } from "@/hooks/useCountUp";
import type { CommandParseResult } from "@ferroscale/metal-core";
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
import type { CommandDesktopProps } from "./desktop-props";
import { CloseIcon, DeskIcon, DeskTokenChip, SectionLabel } from "./desk-atoms";
import { PricingBadge } from "../command-atoms";

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

/** A single labelled stat tile in the result panel footer. */
function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold text-muted" style={{ letterSpacing: 1 }}>
        {label}
      </div>
      <div
        className="font-mono font-extrabold mt-1"
        style={{ fontSize: 26, color: accent ?? "var(--foreground)" }}
      >
        {value}
      </div>
    </div>
  );
}

export function DeskCalcView({
  dark,
  query,
  setQuery,
  p,
  sug,
  sym,
  mode,
  onSetMode,
  parserSettings,
  sessionTape,
  onRemoveTapeEntry,
  onClearTape,
  onSave,
  onCopy,
  onCopyValue,
  onShareLink,
  onNew,
  onSuggest,
  onCompareCurrent,
  onAddToProject,
  inputRef,
}: DeskCalcViewProps) {
  const t = useTranslations("command");
  const isW = mode === "weight";
  const firstSuggestionRef = useRef<HTMLButtonElement | null>(null);
  // ↑/↓ recall through the session tape; draft holds the in-progress query so
  // ↓ past the newest entry restores it.
  const historyIdxRef = useRef(-1);
  const draftRef = useRef("");

  const queryTokens = useMemo(() => cmdTokenize(query), [query]);
  // The trailing piece (no whitespace after it) is still being typed — it
  // lives in the real input; the completed tokens render as chips before it.
  const hasPartial = !/\s$/.test(query) && queryTokens.length > 0;
  const chipTokens = hasPartial ? queryTokens.slice(0, -1) : queryTokens;
  const partial = hasPartial ? queryTokens[queryTokens.length - 1] : "";
  const chipPrefix = chipTokens.length > 0 ? chipTokens.join(" ") + " " : "";
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

  const removeTokenAt = (idx: number) => {
    const rest = queryTokens.filter((_, i) => i !== idx);
    const trailing = rest.length > 0 && /\s$/.test(query) ? " " : "";
    setQuery(rest.join(" ") + trailing);
    focusInputAtEnd();
  };
  // Pull a token back to the end of the query as the editable trailing
  // partial (parser is order-tolerant, so reordering is safe).
  const editTokenAt = (idx: number) => {
    const others = queryTokens.filter((_, i) => i !== idx);
    setQuery(others.join(" ") + (others.length ? " " : "") + queryTokens[idx]);
    focusInputAtEnd();
  };

  // Hero metric counts up when the query settles (see useCountUp).
  const weightUnit = p.totalKg != null ? fsWeightUnit(p.totalKg) : "kg";
  const heroTarget = isW
    ? p.totalKg != null
      ? weightUnit === "t"
        ? p.totalKg / 1000
        : p.totalKg
      : null
    : p.totalAmount ?? null;
  const heroAnim = useCountUp(heroTarget, isW ? `w-${weightUnit}` : "price");
  const heroVal =
    heroAnim == null
      ? "—"
      : heroAnim.toLocaleString("en-US", {
          minimumFractionDigits: isW ? (weightUnit === "t" ? 2 : 1) : 2,
          maximumFractionDigits: isW ? (weightUnit === "t" ? 2 : 1) : 2,
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
      <div className="flex-shrink-0" style={{ padding: "22px 28px 0" }}>
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
          {chipTokens.map((tok, i) => (
            <DeskTokenChip
              key={`${tok}-${i}`}
              tok={tok}
              kindClass={KIND_BG[cmdClassifyToken(tok)]}
              onEdit={() => editTokenAt(i)}
              onRemove={() => removeTokenAt(i)}
            />
          ))}
          <GhostField
            ref={inputRef}
            type="text"
            ghost={ghost}
            value={partial}
            onChange={(e) => {
              historyIdxRef.current = -1;
              setQuery(chipPrefix + e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (p.valid) {
                  e.preventDefault();
                  onSave();
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
              // Accept the ghost completion (Tab, or → at the caret's end).
              if (e.key === "Tab" && ghost) {
                e.preventDefault();
                onSuggest(sug.items[0]);
                return;
              }
              if (
                e.key === "ArrowRight" &&
                ghost &&
                e.currentTarget.selectionStart === e.currentTarget.value.length &&
                e.currentTarget.selectionStart === e.currentTarget.selectionEnd
              ) {
                e.preventDefault();
                onSuggest(sug.items[0]);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                onNew();
                return;
              }
              // ↑ recalls older tape entries; ↓ walks back toward the draft.
              if (e.key === "ArrowUp" && sessionTape.length > 0) {
                e.preventDefault();
                if (historyIdxRef.current === -1) draftRef.current = query;
                historyIdxRef.current = Math.min(
                  historyIdxRef.current + 1,
                  sessionTape.length - 1,
                );
                setQuery(sessionTape[historyIdxRef.current] + " ");
                focusInputAtEnd();
                return;
              }
              if (e.key === "ArrowDown") {
                if (historyIdxRef.current >= 0) {
                  e.preventDefault();
                  const nextIdx = historyIdxRef.current - 1;
                  historyIdxRef.current = nextIdx;
                  setQuery(nextIdx < 0 ? draftRef.current : sessionTape[nextIdx] + " ");
                  focusInputAtEnd();
                  return;
                }
                // Not browsing history → open chip navigation.
                if (sug.items.length > 0) {
                  e.preventDefault();
                  firstSuggestionRef.current?.focus();
                }
                return;
              }
              // Empty partial + backspace pulls the last chip back into
              // the input for editing.
              if (
                e.key === "Backspace" &&
                partial === "" &&
                chipTokens.length > 0 &&
                e.currentTarget.selectionStart === 0
              ) {
                e.preventDefault();
                setQuery(chipTokens.join(" "));
                focusInputAtEnd();
                return;
              }
            }}
            autoFocus
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
            placeholder={queryTokens.length === 0 ? t("query.placeholderExample") : ""}
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
          <div
            className="text-[10px] font-bold text-muted mb-2 uppercase"
            style={{ letterSpacing: 1.2 }}
          >
            {formatCommandHint(t, sug.hint)}
          </div>
          <div className="flex gap-[7px] flex-wrap">
            {sug.items.map((it, i) => (
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
                className="flex items-center gap-[7px] rounded-[11px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                style={{
                  padding: it.sub ? "7px 13px" : "8px 14px",
                  border: it.kind === "save" ? "none" : "1px solid var(--border-faint)",
                  background: it.kind === "save" ? "var(--accent)" : "var(--surface)",
                  color: it.kind === "save" ? "var(--accent-contrast)" : "var(--foreground)",
                  boxShadow: "var(--panel-shadow-soft)",
                }}
              >
                {it.fam && (
                  <span className="flex" style={{ color: "var(--accent)" }}>
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
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ───────── dashboard grid ───────── */}
      <div className="flex flex-1 min-h-0 gap-[18px]" style={{ padding: "18px 28px 28px" }}>
        {/* LEFT column — result + session tape */}
        <div className="flex flex-col gap-4 min-w-0" style={{ flex: 1.55 }}>
          {/* RESULT PANEL */}
          <div
            className="flex-shrink-0 flex flex-col rounded-[18px]"
            style={{
              border: "1px solid var(--border-faint)",
              background: "var(--surface)",
              boxShadow: "var(--panel-shadow-soft)",
              padding: "22px 26px",
            }}
          >
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
                  style={{
                    fontWeight: 800,
                    fontSize: "clamp(64px, 6vw, 104px)",
                    lineHeight: 0.82,
                    letterSpacing: -5,
                    color: heroVal === "—" ? "var(--muted-faint)" : "var(--foreground)",
                  }}
                >
                  {heroVal}
                </span>
                {isW && p.totalKg != null && (
                  <span className="font-bold text-[40px]" style={{ color: "var(--accent)" }}>
                    {fsWeightUnit(p.totalKg)}
                  </span>
                )}
              </div>
              {/* descriptive / issue / hint line */}
              <div className="mt-[18px] min-h-[20px]">
                {p.valid && p.kgm != null ? (
                  <span className="font-mono text-[14px] text-muted flex items-center gap-1.5 flex-wrap">
                    <span>
                      <span className="text-foreground-secondary">{p.kgm.toFixed(2)}</span> kg/m ×{" "}
                      <span className="text-foreground-secondary">{p.lengthM}</span> m ×{" "}
                      <span className="text-foreground-secondary">{p.realQty}</span>
                      {p.gradeLabel ? ` · ${p.gradeLabel}` : ""}
                    </span>
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
                    className="font-mono text-[14px] flex items-center gap-2 flex-wrap"
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

            {/* stats + actions */}
            <div
              className="flex items-end gap-6 flex-wrap"
              style={{ paddingTop: 18, borderTop: "1px solid var(--border-faint)" }}
            >
              <StatTile
                label={t("desktop.totalCostLabel")}
                value={
                  p.valid && p.totalAmount != null ? `${sym} ${fsMoney(p.totalAmount)}` : "—"
                }
                accent="var(--blue-strong)"
              />
              <StatTile
                label={t("desktop.perPieceLabel")}
                value={
                  p.valid && p.perPieceKg != null
                    ? `${fsWeight(p.perPieceKg)} ${fsWeightUnit(p.perPieceKg)}`
                    : "—"
                }
              />
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={!p.valid}
                  className="inline-flex items-center gap-[7px] rounded-[11px] font-bold text-[13px] whitespace-nowrap"
                  style={{
                    padding: "9px 16px",
                    border: "none",
                    background: "var(--accent)",
                    color: "var(--accent-contrast)",
                    cursor: p.valid ? "pointer" : "default",
                    opacity: p.valid ? 1 : 0.45,
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent-contrast)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                  {t("common.save")}
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
                <PanelIconBtn
                  onClick={onCopy}
                  disabled={!p.valid}
                  title={t("common.copy")}
                  ariaLabel={t("common.copy")}
                >
                  <DeskIcon name="copy" stroke="currentColor" />
                </PanelIconBtn>
                <PanelIconBtn
                  onClick={onCopyValue}
                  disabled={!p.valid}
                  title={t("common.copyValue")}
                  ariaLabel={t("common.copyValue")}
                >
                  <DeskIcon name="calc" stroke="currentColor" />
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
          </div>

          {/* SESSION TAPE — fills remaining height */}
          <div
            className="flex-1 min-h-0 flex flex-col rounded-2xl"
            style={{
              border: "1px solid var(--border-faint)",
              background: "var(--surface)",
              boxShadow: "var(--panel-shadow-soft)",
              padding: "14px 18px",
            }}
          >
            <div className="flex items-baseline gap-2.5 mb-1.5 flex-shrink-0">
              <SectionLabel>{t("desktop.session")}</SectionLabel>
              <span className="font-mono text-[10px] text-muted-faint">
                {t("desktop.sessionSub")}
              </span>
              {tapeRows.length > 0 && (
                <button
                  type="button"
                  onClick={onClearTape}
                  className="ml-auto bg-transparent border-0 text-muted-faint text-[10px] font-bold cursor-pointer hover:text-foreground"
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
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {tapeRows.map(({ q, rp }, i) => (
                    <div
                      key={`${q}-${i}`}
                      className="group flex items-center gap-3"
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
                          className="font-mono text-[12.5px] font-bold text-foreground text-right flex-shrink-0"
                          style={{ width: 82 }}
                        >
                          {fsWeight(rp.totalKg!)} {fsWeightUnit(rp.totalKg!)}
                        </span>
                        <span
                          className="font-mono text-[12.5px] font-semibold text-muted text-right flex-shrink-0"
                          style={{ width: 92 }}
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
                    className="font-mono text-[13.5px] font-extrabold text-right"
                    style={{ width: 82, color: "var(--accent)" }}
                  >
                    {fsWeight(sumKg)} {fsWeightUnit(sumKg)}
                  </span>
                  <span
                    className="font-mono text-[13.5px] font-extrabold text-right"
                    style={{ width: 92, color: "var(--blue-strong)" }}
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
          className="flex flex-col min-h-0 overflow-y-auto rounded-[18px]"
          style={{
            flex: 1,
            minWidth: 300,
            maxWidth: 400,
            border: "1px solid var(--border-faint)",
            background: "var(--surface)",
            boxShadow: "var(--panel-shadow-soft)",
            padding: "20px 22px",
          }}
        >
          <DeskBreakdown p={p} />
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── breakdown card ───────────────────────── */

function Line({
  label,
  value,
  strong,
  accent,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3" style={{ padding: "9px 0" }}>
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

function DeskBreakdown({ p }: { p: CommandParseResult }) {
  const t = useTranslations("command");
  const r = p.calc?.result;
  const rows = p.valid ? buildBreakdownRows(p, t) : null;
  // The expanded right column keeps a tighter subset: density lives in the
  // header, and per-piece price / subtotal stay sheet-only.
  const geometry = rows?.geometry.filter((row) => row.id !== "density") ?? [];
  const pricing =
    rows?.pricing.filter((row) => row.id !== "perPiecePrice" && row.id !== "subtotal") ?? [];

  return (
    <>
      <div
        className="text-[10px] font-bold text-muted mb-3 flex-shrink-0"
        style={{ letterSpacing: 1.2 }}
      >
        {t("desktop.breakdown")}
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
            <div className="font-extrabold text-[17px] text-foreground" style={{ letterSpacing: -0.2 }}>
              {formatCommandParseName(t, p)}
            </div>
            <div className="font-mono text-[11px] text-muted mt-0.5">
              {p.gradeLabel ?? r.gradeLabel} · {r.densityKgPerM3} kg/m³
            </div>
          </div>
          <div style={{ paddingTop: 6 }}>
            {geometry.map((row) => (
              <div key={row.id}>
                <Line label={row.label} value={row.value} {...DESK_ROW_STYLE[row.id]} />
                {row.id === "pieces" && (
                  <div style={{ height: 1, background: "var(--border-faint)", margin: "2px 0" }} />
                )}
              </div>
            ))}
            <div style={{ height: 1, background: "var(--border-faint)", margin: "2px 0" }} />
            {pricing.map((row) => (
              <Line key={row.id} label={row.label} value={row.value} {...DESK_ROW_STYLE[row.id]} />
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
