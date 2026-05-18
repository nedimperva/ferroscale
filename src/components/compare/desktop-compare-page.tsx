"use client";

import { memo, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CompareItem } from "@/hooks/useCompare";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import { ProfileGlyph } from "@/components/profiles/profile-glyph";
import { resolveGradeLabel } from "@/lib/calculator/grade-label";

interface Props {
  items: CompareItem[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onOpenCalculator: () => void;
  maxCompare: number;
}

function fmtKg(value: number, locale: string): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  if (value >= 1000) return Math.round(value).toLocaleString(locale);
  if (value >= 100) return value.toFixed(1);
  return value.toFixed(2);
}

function fmtCost(value: number, locale: string): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function fmtPerMetre(value: number, locale: string): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  return value.toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function fmtUnit(value: number, locale: string): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtLength(meters: number, locale: string): string {
  if (!Number.isFinite(meters)) return "0";
  return meters.toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function linearWeightKgPerM(item: CompareItem): number {
  const r = item.result;
  const lengthM = r.lengthMm / 1000;
  if (lengthM <= 0) return 0;
  return r.unitWeightKg / lengthM;
}

function totalLengthM(item: CompareItem): number {
  return (item.result.lengthMm * item.result.quantity) / 1000;
}

function deltaPercent(base: CompareItem, other: CompareItem): number {
  const baseKg = base.result.totalWeightKg;
  if (baseKg === 0) return 0;
  return ((other.result.totalWeightKg - baseKg) / baseKg) * 100;
}

function pricePerKgValue(item: CompareItem): number {
  const totalKg = item.result.totalWeightKg;
  if (totalKg <= 0) return 0;
  return item.result.grandTotalAmount / totalKg;
}

function lengthQtyLabel(item: CompareItem, locale: string): string {
  const r = item.result;
  const lengthM = (r.lengthMm / 1000).toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${lengthM} m × ${r.quantity}`;
}

export const DesktopComparePage = memo(function DesktopComparePage({
  items,
  onRemove,
  onClearAll,
  onOpenCalculator,
  maxCompare,
}: Props) {
  const t = useTranslations("desktopCompare");
  const tBase = useTranslations();
  const locale = useLocale();

  /* Compute a "common geometry" subtitle when all items share length × qty × grade. */
  const subtitle = useMemo(() => {
    if (items.length === 0) return "";
    const first = items[0].result;
    const allSameGeometry = items.every(
      (it) =>
        it.result.lengthMm === first.lengthMm &&
        it.result.quantity === first.quantity &&
        it.result.gradeLabel === first.gradeLabel,
    );
    const count = items.length;
    if (allSameGeometry) {
      const lengthQty = lengthQtyLabel(items[0], locale);
      const grade = resolveGradeLabel(first.gradeLabel, tBase);
      return t("subtitleWithGeometry", { count, lengthQty, grade });
    }
    return t("subtitle", { count });
  }, [items, locale, t, tBase]);

  const base = items[0] ?? null;
  const canAddMore = items.length < maxCompare;

  if (items.length === 0) {
    return (
      <div className="flex h-full min-w-0 flex-1 flex-col bg-background">
        <Topbar
          title={t("title")}
          subtitle={t("emptySubtitle")}
          onReset={onClearAll}
          onAddColumn={onOpenCalculator}
          canAddMore={false}
          showReset={false}
        />
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="flex max-w-md flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-border bg-accent-surface text-accent-text">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="18" rx="1" />
                <rect x="14" y="3" width="7" height="18" rx="1" />
              </svg>
            </div>
            <span className="mt-5 text-lg font-bold tracking-tight text-foreground">
              {t("emptyTitle")}
            </span>
            <span className="mt-1.5 text-sm leading-snug text-foreground-secondary">
              {t("emptyHint")}
            </span>
            <button
              type="button"
              onClick={onOpenCalculator}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-bold text-background hover:bg-foreground/90"
            >
              {t("openCalculator")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-background">
      <Topbar
        title={t("title")}
        subtitle={subtitle}
        onReset={onClearAll}
        onAddColumn={onOpenCalculator}
        canAddMore={canAddMore}
        showReset
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 py-5">
        {/* Cards row */}
        <div
          className="grid gap-3.5"
          style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}
        >
          {items.map((item, idx) => {
            const isBase = idx === 0;
            const pct = isBase || !base ? 0 : deltaPercent(base, item);
            const deltaText = isBase
              ? t("base")
              : `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
            return (
              <ItemCard
                key={item.id}
                item={item}
                isBase={isBase}
                deltaText={deltaText}
                locale={locale}
                onRemove={onRemove}
              />
            );
          })}
        </div>

        {/* Spec table */}
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-3.5">
            <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">
              {t("specTitle")}
            </span>
          </div>
          <SpecTable items={items} base={base} locale={locale} />
        </div>
      </div>
    </div>
  );
});

interface TopbarProps {
  title: string;
  subtitle: string;
  onReset: () => void;
  onAddColumn: () => void;
  canAddMore: boolean;
  showReset: boolean;
}

function Topbar({ title, subtitle, onReset, onAddColumn, canAddMore, showReset }: TopbarProps) {
  const t = useTranslations("desktopCompare");
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-5">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-base font-bold tracking-tight text-foreground">
          {title}
        </span>
        {subtitle ? (
          <span className="truncate text-2xs text-muted">{subtitle}</span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {showReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-8 items-center rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground-secondary hover:bg-surface-raised"
          >
            {t("reset")}
          </button>
        )}
        <button
          type="button"
          onClick={onAddColumn}
          disabled={!canAddMore}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-bold text-white shadow-[0_8px_18px_-10px_rgba(20,18,15,0.4)] hover:bg-accent-hover disabled:opacity-50"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t("addColumn")}
        </button>
      </div>
    </div>
  );
}

interface ItemCardProps {
  item: CompareItem;
  isBase: boolean;
  deltaText: string;
  locale: string;
  onRemove: (id: string) => void;
}

function ItemCard({ item, isBase, deltaText, locale, onRemove }: ItemCardProps) {
  const t = useTranslations("desktopCompare");
  const tBase = useTranslations();
  const r = item.result;
  const grade = resolveGradeLabel(r.gradeLabel, tBase);
  const linear = linearWeightKgPerM(item);

  return (
    <div
      className={`relative rounded-2xl border px-5 py-5 ${
        isBase
          ? "border-border bg-surface"
          : "border-accent-border bg-accent-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              isBase ? "bg-surface-raised text-foreground-secondary" : "bg-white/55 text-accent-text"
            }`}
          >
            <ProfileGlyph profileId={item.input.profileId} size="md" />
          </span>
          <div className="min-w-0">
            <span className="block truncate text-sm font-bold tracking-tight text-foreground">
              {item.normalizedProfile.shortLabel}
            </span>
            <span className="block truncate text-2xs text-muted">{grade}</span>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] ${
            isBase
              ? "bg-surface-raised text-foreground-secondary"
              : "bg-white/55 text-accent-text"
          }`}
        >
          {deltaText}
        </span>
      </div>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="text-[52px] font-bold leading-[0.9] tracking-[-0.045em] tabular-nums text-foreground">
          {fmtKg(r.totalWeightKg, locale)}
        </span>
        <span className="text-lg font-semibold text-accent">kg</span>
      </div>
      <div className="mt-1.5 text-sm font-semibold tabular-nums text-foreground-secondary">
        {CURRENCY_SYMBOLS[r.currency]} {fmtCost(r.grandTotalAmount, locale)}
        <span className="ml-1 font-medium text-muted">
          · {fmtPerMetre(linear, locale)} kg/m
        </span>
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        <span className="text-2xs text-muted">{lengthQtyLabel(item, locale)}</span>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={t("removeAria")}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-raised hover:text-foreground"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface SpecTableProps {
  items: CompareItem[];
  base: CompareItem | null;
  locale: string;
}

function SpecTable({ items, base, locale }: SpecTableProps) {
  const t = useTranslations("desktopCompare");
  const rows = useMemo(() => {
    const formatPerMetre = (item: CompareItem) => `${fmtPerMetre(linearWeightKgPerM(item), locale)} kg/m`;
    const formatLengthQty = (item: CompareItem) => lengthQtyLabel(item, locale);
    const formatUnitWeight = (item: CompareItem) => `${fmtUnit(item.result.unitWeightKg, locale)} kg`;
    const formatTotalWeight = (item: CompareItem) => `${fmtKg(item.result.totalWeightKg, locale)} kg`;
    const formatTotalLength = (item: CompareItem) => `${fmtLength(totalLengthM(item), locale)} m`;
    const formatUnitPrice = (item: CompareItem) => {
      const rate = pricePerKgValue(item);
      return rate > 0
        ? `${rate.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${CURRENCY_SYMBOLS[item.result.currency]}/kg`
        : "—";
    };
    const formatTotalCost = (item: CompareItem) =>
      `${CURRENCY_SYMBOLS[item.result.currency]} ${fmtCost(item.result.grandTotalAmount, locale)}`;

    return [
      { label: t("linearWeight"), get: formatPerMetre },
      { label: t("lengthPieces"), get: formatLengthQty },
      { label: t("weightPerPiece"), get: formatUnitWeight },
      { label: t("totalWeight"), get: formatTotalWeight },
      { label: t("totalLength"), get: formatTotalLength },
      { label: t("unitPrice"), get: formatUnitPrice },
      { label: t("totalCost"), get: formatTotalCost },
    ];
  }, [locale, t]);

  return (
    <>
      {rows.map((row, i) => (
        <div
          key={row.label}
          className={`grid items-center gap-3 px-5 py-2.5 ${
            i < rows.length - 1 ? "border-b border-border" : ""
          } ${i % 2 === 1 ? "bg-surface-raised" : ""}`}
          style={{ gridTemplateColumns: `1.2fr repeat(${items.length}, minmax(0, 1fr))` }}
        >
          <span className="text-xs text-muted">{row.label}</span>
          {items.map((item, idx) => {
            const isBase = base ? item.id === base.id : idx === 0;
            return (
              <span
                key={item.id}
                className={`text-[13px] tabular-nums ${
                  isBase
                    ? "font-semibold text-foreground"
                    : "font-bold text-accent"
                }`}
              >
                {row.get(item)}
              </span>
            );
          })}
        </div>
      ))}
    </>
  );
}
