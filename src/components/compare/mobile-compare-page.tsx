"use client";

import { memo, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CompareItem } from "@/hooks/useCompare";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import { ProfileGlyph } from "@/components/profiles/profile-glyph";
import { resolveGradeLabel } from "@/lib/calculator/grade-label";
import { triggerHaptic } from "@/lib/haptics";

interface Props {
  items: CompareItem[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onOpenCalculator: () => void;
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

export const MobileComparePage = memo(function MobileComparePage({
  items,
  onRemove,
  onClearAll,
  onOpenCalculator,
}: Props) {
  const t = useTranslations("mobileCompare");
  const locale = useLocale();
  const [swapped, setSwapped] = useState(false);

  /* Ordered pair: base first, heavier second (or swapped manually). */
  const pair = useMemo(() => {
    if (items.length < 2) return null;
    const a = items[0];
    const b = items[1];
    const ordered = swapped ? [b, a] : [a, b];
    return { base: ordered[0], other: ordered[1] };
  }, [items, swapped]);

  if (items.length === 0) {
    return (
      <div className="flex min-h-[80dvh] flex-col px-4 pb-8 pt-3">
        <NavBar onBack={onOpenCalculator} />
        <div className="mt-16 flex flex-1 flex-col items-center px-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-accent-border bg-accent-surface text-accent-text">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="18" rx="1" />
              <rect x="14" y="3" width="7" height="18" rx="1" />
            </svg>
          </div>
          <span className="mt-5 text-xl font-bold tracking-tight text-foreground">
            {t("emptyTitle")}
          </span>
          <span className="mt-1.5 max-w-[280px] text-sm leading-snug text-foreground-secondary">
            {t("emptyHint")}
          </span>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onOpenCalculator();
            }}
            className="mt-5 inline-flex h-12 items-center gap-2 rounded-2xl bg-foreground px-5 text-sm font-bold text-background"
          >
            {t("openCalculator")}
          </button>
        </div>
      </div>
    );
  }

  /* Single item: show as base + dashed "add another" placeholder. */
  if (items.length === 1) {
    const only = items[0];
    return (
      <div className="flex min-h-[80dvh] flex-col gap-3 pb-8">
        <NavBar onBack={onOpenCalculator} />
        <Card
          item={only}
          isHeavier={false}
          locale={locale}
          deltaText={t("base")}
          onRemove={onRemove}
        />
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onOpenCalculator();
          }}
          className="mx-3.5 flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border bg-surface px-4 py-6 text-center"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-raised text-accent">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span className="text-sm font-semibold text-foreground">{t("addAnother")}</span>
          <span className="text-2xs text-muted">{t("addAnotherHint")}</span>
        </button>
      </div>
    );
  }

  /* Two items present. */
  const { base, other } = pair!;
  const baseKg = base.result.totalWeightKg;
  const otherKg = other.result.totalWeightKg;
  const heavier = otherKg >= baseKg ? other : base;
  const lighter = heavier.id === other.id ? base : other;
  const delta = otherKg - baseKg;
  const pct = deltaPercent(base, other);
  const heavierShort = heavier.normalizedProfile.shortLabel.split(/\s/).slice(0, 2).join(" ");
  const lighterShort = lighter.normalizedProfile.shortLabel.split(/\s/).slice(0, 2).join(" ");

  /* Position the lighter/heavier dots on the axis proportional to weight. */
  const maxKg = Math.max(baseKg, otherKg);
  const minKg = Math.min(baseKg, otherKg);
  const heavierPos = 88;
  const lighterPos = maxKg === 0 ? 12 : Math.max(12, Math.min(86, (minKg / maxKg) * 88));

  return (
    <div className="flex min-h-[80dvh] flex-col gap-3 pb-8">
      <NavBar
        onBack={onOpenCalculator}
        onSwap={() => {
          triggerHaptic("light");
          setSwapped((prev) => !prev);
        }}
      />

      {/* Sliding scale — visual anchor. */}
      <div className="mx-3.5 rounded-2xl border border-border bg-surface px-4 py-3.5">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">
            {t("heavier")}
          </span>
          <span className="text-2xs tabular-nums text-muted">
            {t("deltaSummary", {
              delta: fmtKg(Math.abs(delta), locale),
              percent: `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}`,
            })}
          </span>
        </div>
        <div className="relative mt-2 h-24">
          <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
          {/* Lighter */}
          <div
            className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: `${lighterPos}%` }}
          >
            <span className="text-[13px] font-bold tabular-nums text-foreground-secondary">
              {fmtKg(lighter.result.totalWeightKg, locale)}
            </span>
            <span className="h-3.5 w-3.5 rounded-full border-2 border-foreground-secondary bg-surface" />
            <span className="text-[10.5px] font-semibold text-foreground-secondary">
              {lighterShort}
            </span>
          </div>
          {/* Heavier */}
          <div
            className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: `${heavierPos}%` }}
          >
            <span className="text-[15px] font-bold tabular-nums text-accent">
              {fmtKg(heavier.result.totalWeightKg, locale)}
            </span>
            <span className="h-4 w-4 rounded-full border-2 border-accent bg-accent" />
            <span className="text-[11px] font-bold text-accent-text">{heavierShort}</span>
          </div>
        </div>
      </div>

      {/* Item cards — order matches sliding scale (heavier first). */}
      <Card
        item={heavier}
        isHeavier
        locale={locale}
        deltaText={
          heavier.id === base.id
            ? t("base")
            : `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`
        }
        onRemove={onRemove}
      />
      <Card
        item={lighter}
        isHeavier={false}
        locale={locale}
        deltaText={
          lighter.id === base.id
            ? t("base")
            : `${deltaPercent(base, lighter) >= 0 ? "+" : ""}${deltaPercent(base, lighter).toFixed(0)}%`
        }
        onRemove={onRemove}
      />

      {/* Spec table */}
      <div className="mx-3.5 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-2.5">
          <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">
            {t("specTitle")}
          </span>
        </div>
        {[
          {
            label: t("perMetre"),
            a: `${fmtPerMetre(linearWeightKgPerM(heavier), locale)} ${t("kg")}`,
            b: `${fmtPerMetre(linearWeightKgPerM(lighter), locale)} ${t("kg")}`,
          },
          {
            label: t("perPiece"),
            a: `${fmtUnit(heavier.result.unitWeightKg, locale)} ${t("kg")}`,
            b: `${fmtUnit(lighter.result.unitWeightKg, locale)} ${t("kg")}`,
          },
          {
            label: t("length"),
            a: `${fmtLength(totalLengthM(heavier), locale)} m`,
            b: `${fmtLength(totalLengthM(lighter), locale)} m`,
          },
          {
            label: t("price"),
            a: `${CURRENCY_SYMBOLS[heavier.result.currency]} ${fmtCost(heavier.result.grandTotalAmount, locale)}`,
            b: `${CURRENCY_SYMBOLS[lighter.result.currency]} ${fmtCost(lighter.result.grandTotalAmount, locale)}`,
          },
          {
            label: t("pricePerKg"),
            a: pricePerKg(heavier, locale),
            b: pricePerKg(lighter, locale),
          },
        ].map((row, i, arr) => (
          <div
            key={row.label}
            className={`grid grid-cols-[1.1fr_1fr_1fr] items-center px-4 py-2.5 ${
              i < arr.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <span className="text-xs text-muted">{row.label}</span>
            <span className="text-[13px] font-bold tabular-nums text-accent">{row.a}</span>
            <span className="text-[13px] font-semibold tabular-nums text-foreground">
              {row.b}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="mx-3.5 grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onOpenCalculator();
          }}
          className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface-raised text-sm font-semibold text-foreground"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t("addAnother")}
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic("medium");
            onClearAll();
          }}
          className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-foreground text-sm font-bold text-background"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
          {t("clearAll")}
        </button>
      </div>
    </div>
  );
});

interface NavBarProps {
  onBack: () => void;
  onSwap?: () => void;
}

function NavBar({ onBack, onSwap }: NavBarProps) {
  const t = useTranslations("mobileCompare");
  return (
    <div className="flex items-center justify-between gap-2.5 px-3.5 pb-1 pt-2">
      <button
        type="button"
        onClick={() => {
          triggerHaptic("light");
          onBack();
        }}
        aria-label={t("backAria")}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground-secondary"
      >
        <svg width="11" height="14" viewBox="0 0 9 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 1L1 7l7 6" />
        </svg>
      </button>
      <span className="flex-1 text-center text-sm font-bold tracking-tight text-foreground">
        {t("title")}
      </span>
      {onSwap ? (
        <button
          type="button"
          onClick={onSwap}
          aria-label={t("swapAria")}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground-secondary"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 16L3 20l4 4M3 20h13a4 4 0 004-4M17 8l4-4-4-4M21 4H8a4 4 0 00-4 4" />
          </svg>
        </button>
      ) : (
        <span className="h-8 w-8" />
      )}
    </div>
  );
}

interface CardProps {
  item: CompareItem;
  isHeavier: boolean;
  locale: string;
  deltaText: string;
  onRemove: (id: string) => void;
}

function Card({ item, isHeavier, locale, deltaText, onRemove }: CardProps) {
  const t = useTranslations("mobileCompare");
  const tBase = useTranslations();
  const r = item.result;
  const grade = resolveGradeLabel(r.gradeLabel, tBase);
  const lengthM = (r.lengthMm / 1000).toFixed(r.lengthMm >= 10000 ? 1 : 2);
  const sub = `${lengthM} m × ${r.quantity}`;
  const linear = linearWeightKgPerM(item);

  return (
    <div
      className={`relative mx-3.5 rounded-2xl border px-4 py-3.5 ${
        isHeavier
          ? "border-accent-border bg-accent-surface"
          : "border-border bg-surface"
      }`}
    >
      <button
        type="button"
        onClick={() => {
          triggerHaptic("light");
          onRemove(item.id);
        }}
        aria-label={t("removeAria")}
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-surface-raised"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <div className="flex items-center gap-2.5 pr-7">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isHeavier ? "bg-white/55 text-accent-text" : "bg-surface-raised text-foreground-secondary"
          }`}
        >
          <ProfileGlyph profileId={item.input.profileId} size="md" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold tracking-tight text-foreground">
            {item.normalizedProfile.shortLabel}
            <span className="ml-1 font-medium text-muted">· {grade}</span>
          </span>
          <span className="block truncate text-[11.5px] text-muted">{sub}</span>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] ${
            isHeavier
              ? "bg-white/55 text-accent-text"
              : "bg-surface-raised text-foreground-secondary"
          }`}
        >
          {deltaText}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[42px] font-bold leading-[0.95] tracking-[-0.04em] tabular-nums text-foreground">
          {fmtKg(r.totalWeightKg, locale)}
        </span>
        <span className="text-lg font-semibold text-accent">kg</span>
        <div className="ml-auto text-right">
          <span className="block text-[13px] font-bold tabular-nums text-foreground">
            {CURRENCY_SYMBOLS[r.currency]} {fmtCost(r.grandTotalAmount, locale)}
          </span>
          <span className="block text-[10.5px] text-muted tabular-nums">
            {fmtPerMetre(linear, locale)} kg/m
          </span>
        </div>
      </div>
    </div>
  );
}

function pricePerKg(item: CompareItem, locale: string): string {
  const totalKg = item.result.totalWeightKg;
  const cost = item.result.grandTotalAmount;
  if (totalKg <= 0) return "—";
  const rate = cost / totalKg;
  return rate.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
