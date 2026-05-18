"use client";

import { memo, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { SavedEntry } from "@/hooks/useSaved";
import { CURRENCY_SYMBOLS, type CalculationInput } from "@/lib/calculator/types";
import { ProfileGlyph } from "@/components/profiles/profile-glyph";
import { triggerHaptic } from "@/lib/haptics";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Props {
  saved: SavedEntry[];
  onLoad: (input: CalculationInput) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onOpenCalculator: () => void;
  onMarkUsed?: (id: string) => void;
}

const ALL_KEY = "__all__";
const UNFILED_KEY = "__unfiled__";

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

/**
 * Mobile Saved tab — list of single-calc presets. Header with count
 * subtitle, search + overflow icon buttons, a horizontal filter chip
 * row (All / per-tag / Unfiled), and one card per saved entry with
 * profile glyph, profile/grade + tag pill, geometry sub-line and a
 * right-aligned weight/price stack. Empty state mirrors the design.
 */
export const MobileSavedPage = memo(function MobileSavedPage({
  saved,
  onLoad,
  onRemove,
  onDuplicate,
  onOpenCalculator,
  onMarkUsed,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const [activeChip, setActiveChip] = useState<string>(ALL_KEY);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<SavedEntry | null>(null);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    let unfiled = 0;
    for (const entry of saved) {
      const tags = entry.tags ?? [];
      if (tags.length === 0) unfiled += 1;
      for (const tag of tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return { byTag: counts, unfiled };
  }, [saved]);

  const filtered = useMemo(() => {
    let pool = saved;
    if (activeChip === UNFILED_KEY) pool = saved.filter((e) => !e.tags || e.tags.length === 0);
    else if (activeChip !== ALL_KEY) pool = saved.filter((e) => e.tags?.includes(activeChip));

    const query = searchQuery.trim().toLowerCase();
    if (!query) return pool;
    return pool.filter((entry) => {
      const part = entry.parts[0];
      const profileLabel = (part?.normalizedProfile ?? entry.normalizedProfile).shortLabel.toLowerCase();
      const grade = (part?.result ?? entry.result).gradeLabel?.toLowerCase() ?? "";
      const name = entry.name.toLowerCase();
      const tags = (entry.tags ?? []).join(" ").toLowerCase();
      return (
        name.includes(query) ||
        profileLabel.includes(query) ||
        grade.includes(query) ||
        tags.includes(query)
      );
    });
  }, [saved, activeChip, searchQuery]);

  if (saved.length === 0) {
    return <MobileSavedEmpty t={t} onOpenCalculator={onOpenCalculator} />;
  }

  return (
    <div className="relative flex min-h-[80dvh] flex-col gap-3 pb-24">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-[-0.04em] text-foreground">
            {t("mobileSaved.title")}
          </h1>
          <span className="mt-1 block text-sm text-foreground-secondary">
            {t("mobileSaved.countSubtitle", { count: saved.length })}
          </span>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            aria-label={t("mobileSaved.searchAria")}
            onClick={() => {
              triggerHaptic("light");
              setSearchOpen((prev) => {
                const next = !prev;
                if (!next) setSearchQuery("");
                return next;
              });
            }}
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
              searchOpen
                ? "border-accent-border bg-accent-surface text-accent-text"
                : "border-border bg-surface text-foreground-secondary active:bg-surface-raised"
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={t("mobileSaved.moreAria")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground-secondary active:bg-surface-raised"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="5" cy="12" r="1.2" />
              <circle cx="12" cy="12" r="1.2" />
              <circle cx="19" cy="12" r="1.2" />
            </svg>
          </button>
        </div>
      </div>

      {searchOpen && (
        <input
          type="search"
          autoFocus
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("mobileSaved.searchPlaceholder")}
          aria-label={t("mobileSaved.searchAria")}
          className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-faint outline-none transition-colors focus:border-accent-border"
        />
      )}

      <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1" style={{ scrollbarWidth: "none" }}>
        <FilterChip
          label={t("mobileSaved.filterAll")}
          count={saved.length}
          active={activeChip === ALL_KEY}
          onClick={() => {
            triggerHaptic("light");
            setActiveChip(ALL_KEY);
          }}
        />
        {Array.from(tagCounts.byTag.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([tag, count]) => (
            <FilterChip
              key={tag}
              label={tag}
              count={count}
              active={activeChip === tag}
              onClick={() => {
                triggerHaptic("light");
                setActiveChip(tag);
              }}
            />
          ))}
        {tagCounts.unfiled > 0 && (
          <FilterChip
            label={t("mobileSaved.filterUnfiled")}
            count={tagCounts.unfiled}
            active={activeChip === UNFILED_KEY}
            onClick={() => {
              triggerHaptic("light");
              setActiveChip(UNFILED_KEY);
            }}
          />
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-2">
          {filtered.map((entry) => (
            <SavedRow
              key={entry.id}
              entry={entry}
              locale={locale}
              menuOpen={openMenuId === entry.id}
              onToggleMenu={() => setOpenMenuId(openMenuId === entry.id ? null : entry.id)}
              onLoad={() => {
                triggerHaptic("light");
                onMarkUsed?.(entry.id);
                onLoad(entry.parts[0]?.input ?? entry.input);
              }}
              onRemove={() => {
                setOpenMenuId(null);
                setRemoveTarget(entry);
              }}
              onDuplicate={() => {
                triggerHaptic("light");
                onDuplicate(entry.id);
                setOpenMenuId(null);
              }}
              t={t}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-10 text-center">
          <span className="block text-sm font-medium text-foreground-secondary">
            {t("mobileSaved.filteredEmptyTitle")}
          </span>
          <span className="mt-1 block text-2xs text-muted">
            {t("mobileSaved.filteredEmptyHint")}
          </span>
        </div>
      )}

      <ConfirmDialog
        open={removeTarget != null}
        title={t("confirmDialog.removeTitle")}
        message={
          removeTarget
            ? t("mobileSaved.confirmRemove", { name: removeTarget.name })
            : ""
        }
        confirmLabel={t("confirmDialog.remove")}
        cancelLabel={t("confirmDialog.cancel")}
        destructive
        onConfirm={() => {
          if (removeTarget) {
            triggerHaptic("medium");
            onRemove(removeTarget.id);
          }
          setRemoveTarget(null);
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
});

interface FilterChipProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function FilterChip({ label, count, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${
        active
          ? "border border-transparent bg-foreground text-background"
          : "border border-border bg-surface text-foreground-secondary"
      }`}
    >
      {label}
      <span
        className={`inline-flex min-w-4 items-center justify-center rounded-full px-1.5 text-[0.65rem] font-semibold tabular-nums ${
          active ? "bg-white/15 text-background/90" : "bg-surface-raised text-muted"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

interface SavedRowProps {
  entry: SavedEntry;
  locale: string;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onLoad: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  t: ReturnType<typeof useTranslations>;
}

function SavedRow({ entry, locale, menuOpen, onToggleMenu, onLoad, onRemove, onDuplicate, t }: SavedRowProps) {
  const part = entry.parts[0];
  const input = part?.input ?? entry.input;
  const result = part?.result ?? entry.result;
  const profile = part?.normalizedProfile ?? entry.normalizedProfile;
  const tag = entry.tags?.[0];
  const lengthM = result.lengthMm / 1000;
  const sub = `${lengthM.toFixed(lengthM >= 10 ? 1 : 2)} m × ${result.quantity}`;
  const currency = CURRENCY_SYMBOLS[result.currency] ?? result.currency;

  return (
    <div className="relative rounded-2xl border border-border bg-surface px-3.5 py-3 shadow-[var(--panel-shadow-soft)]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onLoad}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-foreground-secondary">
            <ProfileGlyph profileId={input.profileId} size="md" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex min-w-0 items-baseline gap-1.5">
              <span className="truncate text-sm font-bold tracking-[-0.01em] text-foreground">
                {profile.shortLabel}
              </span>
              <span className="shrink-0 text-2xs text-muted">· {result.gradeLabel}</span>
              {tag && (
                <span className="ml-auto shrink-0 rounded-full bg-accent-surface px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.06em] text-accent-text">
                  {tag}
                </span>
              )}
            </span>
            <span className="mt-0.5 truncate text-2xs text-muted">{sub}</span>
          </span>
          <span className="shrink-0 text-right">
            <span className="flex items-baseline justify-end gap-1">
              <span className="text-lg font-bold leading-none tabular-nums tracking-[-0.025em] text-foreground">
                {fmtKg(result.totalWeightKg, locale)}
              </span>
              <span className="text-2xs text-muted">kg</span>
            </span>
            <span className="mt-1 block text-2xs tabular-nums text-muted">
              {currency} {fmtCost(result.grandTotalAmount, locale)}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label={t("mobileSaved.rowMenuAria")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-raised"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="5" cy="12" r="1.2" />
            <circle cx="12" cy="12" r="1.2" />
            <circle cx="19" cy="12" r="1.2" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="absolute right-2 top-12 z-20 flex w-40 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--panel-shadow-strong)]">
          <button
            type="button"
            onClick={onDuplicate}
            className="flex items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground hover:bg-surface-raised"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            {t("mobileSaved.duplicate")}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm text-red-interactive hover:bg-red-surface"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
            </svg>
            {t("mobileSaved.remove")}
          </button>
        </div>
      )}
    </div>
  );
}

interface MobileSavedEmptyProps {
  t: ReturnType<typeof useTranslations>;
  onOpenCalculator: () => void;
}

function MobileSavedEmpty({ t, onOpenCalculator }: MobileSavedEmptyProps) {
  return (
    <div className="relative flex min-h-[80dvh] flex-col pb-24">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.04em] text-foreground">
            {t("mobileSaved.title")}
          </h1>
          <span className="mt-1 block text-sm text-foreground-secondary">
            {t("mobileSaved.emptySubtitle")}
          </span>
        </div>
        <button
          type="button"
          aria-label={t("mobileSaved.searchAria")}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground-secondary active:bg-surface-raised"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
      </div>

      <div className="mt-24 flex flex-col items-center px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-accent-border bg-accent-surface text-accent-text">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
        </div>
        <h2 className="mt-5 text-xl font-bold tracking-[-0.02em] text-foreground">
          {t("mobileSaved.emptyTitle")}
        </h2>
        <p className="mt-2 max-w-[280px] text-sm leading-snug text-foreground-secondary">
          {t("mobileSaved.emptyBody")}
        </p>
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onOpenCalculator();
          }}
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-bold text-background shadow-[var(--panel-shadow-strong)] active:bg-foreground/90"
        >
          {t("mobileSaved.emptyCta")}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
