"use client";

import { useTranslations } from "next-intl";
import { fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandLine, CommandParseResult } from "@ferroscale/metal-core";
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
      className="relative w-[36px] h-[36px] rounded-button border border-transparent bg-transparent hover:bg-[var(--surface)] active:bg-[var(--surface-inset)] flex items-center justify-center cursor-pointer text-foreground-secondary hover:text-foreground transition-colors"
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
 * Single hairline secondary readout beneath the phone hero: tappable opposite
 * metric (weight ↔ price) on the left, per-piece mass (or joined assembly
 * names) on the right. Tapping the hero figure above already opens Breakdown,
 * so no second breakdown bar is stacked here.
 */
export function MetricStrip({
  p,
  line,
  isWeight,
  sym,
  onSwapMode,
}: {
  p: CommandParseResult;
  line: CommandLine;
  isWeight: boolean;
  sym: string;
  onSwapMode: () => void;
}) {
  const t = useTranslations("command");
  const totalKg = line.multi ? line.totalKg : p.totalKg;
  const totalAmount = line.multi ? line.totalAmount : p.totalAmount;
  const perPiece =
    !line.multi && p.valid && p.perPieceKg != null
      ? `${fsWeight(p.perPieceKg)} ${fsWeightUnit()}`
      : null;
  const assemblyNames = line.multi
    ? line.items
        .map((item) => formatCommandParseName(t, item.parse) ?? item.parse.name)
        .filter(Boolean)
        .join(" + ")
    : null;
  const second =
    p.valid && totalKg != null && totalAmount != null
      ? isWeight
        ? `${sym} ${fsMoney(totalAmount)}`
        : `${fsWeight(totalKg)} ${fsWeightUnit()}`
      : "—";

  return (
    <div
      className="flex items-baseline justify-between gap-3 mt-2.5 pt-2"
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
        className="inline-flex items-baseline gap-1.5 p-0 m-0 bg-transparent border-0 text-left cursor-pointer disabled:cursor-default flex-shrink-0"
      >
        <span
          className="font-mono text-[15px] font-bold whitespace-nowrap"
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

      {perPiece ? (
        <span className="font-mono text-[12px] text-foreground-secondary whitespace-nowrap">
          {perPiece}
          <span className="text-muted">{t("preview.perPieceSuffix")}</span>
        </span>
      ) : assemblyNames ? (
        <span className="font-mono text-[11.5px] text-muted truncate min-w-0">
          {assemblyNames}
        </span>
      ) : null}
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
      className="flex flex-shrink-0 items-center justify-center rounded-button cursor-pointer disabled:cursor-default active:bg-[var(--surface-inset)] transition-colors"
      style={{
        width: 44,
        height: 44,
        border: dashed
          ? "1px dashed var(--border-strong)"
          : "1px solid var(--border)",
        background: dashed ? "transparent" : "var(--surface)",
        color: dashed ? "var(--muted)" : "var(--foreground-secondary)",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}
