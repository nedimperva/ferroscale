"use client";

import { useTranslations } from "next-intl";
import { fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandParseResult } from "@ferroscale/metal-core";
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
      className="relative w-[34px] h-[34px] rounded-button border border-border-faint bg-[var(--surface)] flex items-center justify-center cursor-pointer text-foreground-secondary"
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
 * The fold's one-line answer to "show me more": per-piece and the other
 * headline metric side by side, with the whole strip acting as the way into
 * the full breakdown. It replaces a 109px two-stat card with a 34px row —
 * the single biggest saving on the phone after the mode pills.
 */
export function MetricStrip({
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
  const dim = { color: "var(--muted-faint)" };
  const perPiece =
    p.valid && p.perPieceKg != null ? `${fsWeight(p.perPieceKg)} ${fsWeightUnit()}` : "—";
  const second =
    p.valid && p.totalKg != null && p.totalAmount != null
      ? isWeight
        ? `${sym} ${fsMoney(p.totalAmount)}`
        : `${fsWeight(p.totalKg)} ${fsWeightUnit()}`
      : "—";

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!p.valid}
      aria-haspopup="dialog"
      aria-label={p.valid ? t("aria.openBreakdown") : undefined}
      className="flex items-center gap-3 w-full mt-2.5 rounded-button text-left border border-border-faint"
      style={{
        padding: "7px 11px",
        background: "var(--surface-raised)",
        cursor: p.valid ? "pointer" : "default",
      }}
    >
      <span className="font-mono text-[13px] font-semibold whitespace-nowrap" style={p.valid ? undefined : dim}>
        {perPiece}
        <span className="text-muted">{t("preview.perPieceSuffix")}</span>
      </span>
      <span className="w-px h-3.5 bg-border-faint" />
      <span className="font-mono text-[13px] font-semibold whitespace-nowrap" style={p.valid ? undefined : dim}>
        {second}
      </span>
      <span className="fs-track-wide ml-auto text-[10px] font-bold uppercase text-muted-faint whitespace-nowrap">
        {t("preview.breakdown")} ›
      </span>
    </button>
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
