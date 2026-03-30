"use client";

import type { ButtonHTMLAttributes } from "react";
import type { UnitValue } from "@/lib/calculator/types";

export type WorkspacePanelLayout = "drawer" | "mobile" | "column";

export function getDecimalPlaces(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const asString = String(value);
  const dotIndex = asString.indexOf(".");
  return dotIndex === -1 ? 0 : asString.length - dotIndex - 1;
}

export function formatStaticNumber(value: number): string {
  const decimals = getDecimalPlaces(value);
  return value.toFixed(decimals).replace(/\.?0+$/, "");
}

export function formatLocalizedNumber(value: number, locale: string): string {
  if (!Number.isFinite(value)) return String(value);
  const decimals = getDecimalPlaces(value);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatSquareMeters(value: number): string {
  return `${formatStaticNumber(value)} m\u00b2`;
}

export function formatPieceLength(
  length: UnitValue | null | undefined,
  fallbackMm: number | null | undefined,
  locale: string,
): string {
  if (length && Number.isFinite(length.value)) {
    return `${formatLocalizedNumber(length.value, locale)} ${length.unit}`;
  }
  if (fallbackMm != null && Number.isFinite(fallbackMm)) {
    return `${formatStaticNumber(fallbackMm)} mm`;
  }
  return "\u2014";
}

export function getWorkspacePanelSpacing(layout: WorkspacePanelLayout) {
  const compact = layout !== "drawer";
  return {
    compact,
    cardPadding: compact ? "p-3.5" : "p-4.5",
    sectionPadding: compact ? "px-4 py-4" : "px-5 py-5",
    sectionGap: compact ? "space-y-5" : "space-y-6",
    listGap: compact ? "gap-2.5" : "gap-3",
    headerPadding: compact ? "px-4 py-3" : "px-5 py-4",
    stickyTopClass:
      layout === "column"
        ? "sticky top-0 z-10 border-b border-border-faint bg-surface/92 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl"
        : "",
  };
}

export function PanelSectionLabel({ label }: { label: string }) {
  return (
    <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-muted-faint">
      {label}
    </p>
  );
}

const CHIP_VARIANTS = {
  default: "border-border bg-surface text-foreground-secondary",
  amber: "border-amber-border bg-amber-surface text-amber-text",
  green: "border-green-border bg-green-surface text-green-text",
} as const;

export function PanelSummaryChip({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: keyof typeof CHIP_VARIANTS;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${CHIP_VARIANTS[variant]}`}>
      <span className="font-medium opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

export function PanelCompactChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span className="panel-raised inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-2xs text-foreground-secondary">
      <span className="font-medium text-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

export function PanelMetricCard({
  label,
  value,
  unit,
  sublabel,
  className = "",
}: {
  label: string;
  value: string;
  unit?: string;
  sublabel?: string;
  className?: string;
}) {
  return (
    <div className={`panel-raised rounded-[1.15rem] p-3.5 ${className}`.trim()}>
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="mt-2.5 flex flex-wrap items-end gap-x-1.5 gap-y-1">
        <p className="select-text text-xl font-bold text-foreground tabular-nums">{value}</p>
        {unit && (
          <p className="pb-0.5 text-xs font-semibold uppercase tracking-wide text-muted">
            {unit}
          </p>
        )}
      </div>
      {sublabel && <p className="mt-1 text-xs text-muted">{sublabel}</p>}
    </div>
  );
}

export function PanelCompactMetric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="panel-raised rounded-xl px-2.5 py-2.5">
      <p className="text-2xs font-medium text-muted">{label}</p>
      <div className="mt-1 flex flex-wrap items-end gap-1">
        <p className="text-sm font-semibold text-foreground tabular-nums">{value}</p>
        {unit && <p className="text-2xs font-medium uppercase tracking-wide text-muted">{unit}</p>}
      </div>
    </div>
  );
}

export function PanelActionButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`premium-action-button inline-flex items-center justify-center gap-2 border px-3.5 py-2.5 text-sm font-semibold ${className ?? ""}`.trim()}
    >
      {children}
    </button>
  );
}
