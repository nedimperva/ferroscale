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
    cardPadding: compact ? "p-3" : "p-4",
    sectionPadding: compact ? "px-4 py-4" : "px-5 py-5",
    sectionGap: compact ? "space-y-4" : "space-y-5",
    listGap: compact ? "gap-2.5" : "gap-3",
    stickyTopClass:
      layout === "column"
        ? "sticky top-0 z-10 border-b border-border bg-surface/95 shadow-sm backdrop-blur"
        : "",
  };
}

export function PanelSectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
      {label}
    </p>
  );
}

export function PanelSummaryChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-foreground-secondary">
      <span className="font-medium text-muted">{label}</span>
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
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-2 py-0.5 text-[10px] text-foreground-secondary">
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
    <div className={`rounded-2xl border border-border bg-surface-raised p-3 ${className}`.trim()}>
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="mt-2 flex flex-wrap items-end gap-x-1.5 gap-y-1">
        <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
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
    <div className="rounded-lg border border-border-faint bg-surface-raised px-2.5 py-2">
      <p className="text-[10px] font-medium text-muted">{label}</p>
      <div className="mt-1 flex flex-wrap items-end gap-1">
        <p className="text-sm font-semibold text-foreground tabular-nums">{value}</p>
        {unit && <p className="text-[10px] font-medium uppercase tracking-wide text-muted">{unit}</p>}
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
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${className ?? ""}`.trim()}
    >
      {children}
    </button>
  );
}
