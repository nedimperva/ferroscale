"use client";

import { useTranslations } from "next-intl";
import { fsKgm, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandLine, CommandParseResult } from "@ferroscale/metal-core";
import { CommandGlyph } from "../command-glyph";
import { formatCommandParseName } from "../command-copy";
import { AlertDot } from "../desktop/desk-rail";

export function IconBtn({
  children,
  onClick,
  ariaLabel,
  alert,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  /** Something behind this button needs the user — read aloud and dotted. */
  alert?: string | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={alert ? `${ariaLabel}, ${alert}` : ariaLabel}
      title={alert ?? undefined}
      className="relative w-[36px] h-[36px] rounded-button border border-border-faint bg-[var(--surface)] flex items-center justify-center cursor-pointer text-foreground-secondary hover:border-[var(--border)] transition-colors"
    >
      {children}
      {alert && <AlertDot />}
    </button>
  );
}

export function Chev() {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 1l4.5 5L1 11" />
    </svg>
  );
}

/**
 * Hairline-ruled secondary readout (tap-to-swap opposite metric + per-piece mass)
 * followed by a calm spec peek handle into the full Breakdown bottom sheet.
 * Replaces the old boxed MetricStrip so the phone stays paper-and-hairlines.
 */
export function MetricStrip({
  p,
  line,
  isWeight,
  sym,
  onSwapMode,
  onOpen,
}: {
  p: CommandParseResult;
  line: CommandLine;
  isWeight: boolean;
  sym: string;
  onSwapMode: () => void;
  onOpen: () => void;
}) {
  const t = useTranslations("command");
  const totalKg = line.multi ? line.totalKg : p.totalKg;
  const totalAmount = line.multi ? line.totalAmount : p.totalAmount;
  const perPiece =
    !line.multi && p.valid && p.perPieceKg != null
      ? `${fsWeight(p.perPieceKg)} ${fsWeightUnit()}`
      : null;
  const second =
    p.valid && totalKg != null && totalAmount != null
      ? isWeight
        ? `${sym} ${fsMoney(totalAmount)}`
        : `${fsWeight(totalKg)} ${fsWeightUnit()}`
      : "—";

  const specSummary = line.multi
    ? line.items
        .map((item) => formatCommandParseName(t, item.parse) ?? item.parse.name)
        .filter(Boolean)
        .join(" + ")
    : p.valid
      ? [
          formatCommandParseName(t, p),
          p.kgm != null ? `${fsKgm(p.kgm)} kg/m` : null,
          p.gradeLabel,
        ]
          .filter(Boolean)
          .join(" · ")
      : "—";

  return (
    <div className="flex flex-col mt-2">
      {/* Hairline paired readout: tappable secondary metric + per-piece figure */}
      <div
        className="flex items-baseline justify-between gap-2 py-1.5"
        style={{ borderTop: "1px solid var(--border-faint)" }}
      >
        <button
          type="button"
          onClick={onSwapMode}
          disabled={!p.valid}
          aria-label={
            p.valid
              ? t("preview.swapMetric", {
                  metric: (isWeight ? t("settings.price") : t("settings.weight")).toLowerCase(),
                })
              : undefined
          }
          className="inline-flex items-baseline gap-1.5 p-0 m-0 bg-transparent border-0 text-left cursor-pointer disabled:cursor-default"
        >
          <span
            className="font-mono text-[14px] font-bold whitespace-nowrap"
            style={{
              color: p.valid ? "var(--foreground)" : "var(--muted-faint)",
              borderBottom: p.valid ? "1px dashed var(--border-strong)" : undefined,
              paddingBottom: 1,
            }}
          >
            {second}
          </span>
          {p.valid && (
            <span className="font-mono text-[11px] text-muted-faint" aria-hidden="true">
              ⇄
            </span>
          )}
        </button>

        {perPiece && (
          <span className="font-mono text-[12px] text-foreground-secondary whitespace-nowrap">
            {perPiece}
            <span className="text-muted">{t("preview.perPieceSuffix")}</span>
          </span>
        )}
      </div>

      {/* Spec peek handle — hairline strip leading cleanly to the Breakdown sheet */}
      <button
        type="button"
        onClick={onOpen}
        disabled={!p.valid}
        aria-haspopup="dialog"
        aria-label={p.valid ? t("aria.openBreakdown") : undefined}
        className="flex items-center gap-2 w-full rounded-none text-left"
        style={{
          padding: "7px 10px",
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          borderLeft: 0,
          borderRight: 0,
          cursor: p.valid ? "pointer" : "default",
        }}
      >
        {p.alias && (
          <span className="flex flex-shrink-0 text-foreground-secondary" aria-hidden="true">
            <CommandGlyph fam={p.alias.fam} alias={p.alias.alias} size={15} />
          </span>
        )}
        <span
          className="font-mono text-[11.5px] font-medium truncate min-w-0 flex-1"
          style={{ color: p.valid ? "var(--foreground-secondary)" : "var(--muted-faint)" }}
        >
          {specSummary}
        </span>
        <span
          className="fs-track-wide ml-auto text-[10px] font-bold uppercase whitespace-nowrap flex-shrink-0"
          style={{ color: p.valid ? "var(--accent-text)" : "var(--muted-faint)" }}
        >
          {t("preview.breakdown")} ›
        </span>
      </button>
    </div>
  );
}

/**
 * A 44px square on the phone's action row. Everything beside the save control
 * is one of these: the row has about 350px and the one control with words on
 * it needs most of them.
 */
export function PhoneIconBtn({
  onClick,
  label,
  disabled,
  dashed,
  children,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  /** The "another item" button, which is an invitation rather than an action. */
  dashed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex flex-shrink-0 items-center justify-center rounded-button cursor-pointer disabled:cursor-default"
      style={{
        width: 44,
        height: 44,
        border: dashed
          ? "1px dashed var(--border-strong)"
          : "1px solid var(--border-faint)",
        background: dashed ? "transparent" : "var(--surface)",
        color: dashed ? "var(--muted)" : "var(--foreground-secondary)",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}
