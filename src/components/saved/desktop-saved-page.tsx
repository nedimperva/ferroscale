"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
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
  onCreatePreset: () => void;
  onRename: (id: string, name: string) => void;
  onMarkUsed?: (id: string) => void;
}

const ALL_KEY = "__all__";
const UNFILED_KEY = "__unfiled__";
const GRID_COLS = "40px 1.6fr 0.9fr 1.2fr 0.9fr 0.9fr 1fr 32px";

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

function formatRelative(iso: string | undefined, locale: string): { label: string; recent: boolean } {
  if (!iso) return { label: "—", recent: false };
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return { label: "—", recent: false };
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return { label: "just now", recent: true };
  if (minutes < 60) return { label: `${minutes} min ago`, recent: true };
  const hours = Math.round(minutes / 60);
  if (hours < 24) return { label: `${hours} h ago`, recent: false };
  const days = Math.round(hours / 24);
  if (days < 7) return { label: `${days} d ago`, recent: false };
  return {
    label: new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" }),
    recent: false,
  };
}

/**
 * Desktop Saved tab — workstation layout. Topbar with title/count,
 * visual-only search with ⌘K kbd, Filter + New preset buttons. Body
 * has a filter chip row and a card-wrapped CSS-grid table. Empty
 * state mirrors the design (large icon, headline, primary CTA).
 */
export const DesktopSavedPage = memo(function DesktopSavedPage({
  saved,
  onLoad,
  onRemove,
  onDuplicate,
  onCreatePreset,
  onRename,
  onMarkUsed,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const [activeChip, setActiveChip] = useState<string>(ALL_KEY);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [removeTarget, setRemoveTarget] = useState<SavedEntry | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 80);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    let unfiled = 0;
    for (const entry of saved) {
      const tags = entry.tags ?? [];
      if (tags.length === 0) unfiled += 1;
      for (const tag of tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return { byTag: counts, unfiled };
  }, [saved]);

  const filtered = useMemo(() => {
    let pool = saved;
    if (activeChip === UNFILED_KEY) pool = saved.filter((e) => !e.tags || e.tags.length === 0);
    else if (activeChip !== ALL_KEY) pool = saved.filter((e) => e.tags?.includes(activeChip));

    if (!debouncedQuery) return pool;
    return pool.filter((entry) => {
      const part = entry.parts[0];
      const profileLabel = (part?.normalizedProfile ?? entry.normalizedProfile).shortLabel.toLowerCase();
      const grade = (part?.result ?? entry.result).gradeLabel?.toLowerCase() ?? "";
      const name = entry.name.toLowerCase();
      const tags = (entry.tags ?? []).join(" ").toLowerCase();
      return (
        name.includes(debouncedQuery) ||
        profileLabel.includes(debouncedQuery) ||
        grade.includes(debouncedQuery) ||
        tags.includes(debouncedQuery)
      );
    });
  }, [saved, activeChip, debouncedQuery]);

  const commitRename = (entry: SavedEntry) => {
    const name = renameDraft.trim();
    if (name && name !== entry.name) onRename(entry.id, name);
    setRenamingId(null);
  };

  return (
    <div className="hidden h-[calc(100dvh-env(safe-area-inset-top,0px))] min-h-0 flex-1 flex-col bg-background lg:flex">
      {/* Topbar — locked to 48px per review §06. */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border px-6">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="text-lg font-bold tracking-[-0.02em] text-foreground">
            {t("mobileSaved.title")}
          </h1>
          <span className="text-xs text-muted">
            {t("mobileSaved.countSubtitle", { count: saved.length })}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label className="flex h-8 w-60 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs text-muted focus-within:border-accent-border">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("mobileSaved.searchPlaceholder")}
              aria-label={t("mobileSaved.searchAria")}
              className="min-w-0 flex-1 bg-transparent text-xs text-foreground placeholder:text-muted outline-none"
            />
            <span className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md border border-border bg-surface-raised px-1 text-[0.65rem] font-semibold text-foreground-secondary">
              ⌘K
            </span>
          </label>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-foreground-secondary hover:bg-surface"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M6 12h12M10 18h4" />
            </svg>
            {t("desktopSaved.filter")}
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onCreatePreset();
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-foreground px-3.5 text-xs font-semibold text-background shadow-[0_10px_20px_-10px_rgba(20,18,15,0.4)] hover:bg-foreground/90"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t("desktopSaved.newPreset")}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-6">
        {saved.length === 0 ? (
          <DesktopSavedEmpty t={t} onCreatePreset={onCreatePreset} />
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              <DesktopFilterChip
                label={t("mobileSaved.filterAll")}
                count={saved.length}
                active={activeChip === ALL_KEY}
                onClick={() => setActiveChip(ALL_KEY)}
              />
              {Array.from(tagCounts.byTag.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([tag, count]) => (
                  <DesktopFilterChip
                    key={tag}
                    label={tag}
                    count={count}
                    active={activeChip === tag}
                    onClick={() => setActiveChip(tag)}
                  />
                ))}
              {tagCounts.unfiled > 0 && (
                <DesktopFilterChip
                  label={t("mobileSaved.filterUnfiled")}
                  count={tagCounts.unfiled}
                  active={activeChip === UNFILED_KEY}
                  onClick={() => setActiveChip(UNFILED_KEY)}
                />
              )}
            </div>

            <div className="rounded-2xl border border-border bg-surface">
              <div
                className="grid items-center gap-3 rounded-t-2xl border-b border-border bg-surface-raised px-4 py-3"
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <span aria-hidden />
                <ColHeader label={t("desktopSaved.colProfile")} />
                <ColHeader label={t("desktopSaved.colMaterial")} />
                <ColHeader label={t("desktopSaved.colGeometry")} />
                <ColHeader label={t("desktopSaved.colWeight")} />
                <ColHeader label={t("desktopSaved.colPrice")} />
                <ColHeader label={t("desktopSaved.colUpdated")} />
                <span aria-hidden />
              </div>

              {filtered.length > 0 ? (
                filtered.map((entry, index) => (
                  <DesktopRow
                    key={entry.id}
                    entry={entry}
                    locale={locale}
                    isLast={index === filtered.length - 1}
                    menuOpen={openMenuId === entry.id}
                    renaming={renamingId === entry.id}
                    renameDraft={renameDraft}
                    setRenameDraft={setRenameDraft}
                    onStartRename={() => {
                      setRenameDraft(entry.name);
                      setRenamingId(entry.id);
                      setOpenMenuId(null);
                    }}
                    onCommitRename={() => commitRename(entry)}
                    onCancelRename={() => setRenamingId(null)}
                    onToggleMenu={() => setOpenMenuId(openMenuId === entry.id ? null : entry.id)}
                    onLoad={() => {
                      onMarkUsed?.(entry.id);
                      onLoad(entry.parts[0]?.input ?? entry.input);
                    }}
                    onRemove={() => {
                      setOpenMenuId(null);
                      setRemoveTarget(entry);
                    }}
                    onDuplicate={() => {
                      onDuplicate(entry.id);
                      setOpenMenuId(null);
                    }}
                    t={t}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center gap-1 px-6 py-12 text-center">
                  <span className="text-sm font-medium text-foreground-secondary">
                    {t("mobileSaved.filteredEmptyTitle")}
                  </span>
                  <span className="text-2xs text-muted">
                    {t("mobileSaved.filteredEmptyHint")}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={removeTarget != null}
        title={t("confirmDialog.removeTitle")}
        message={
          removeTarget ? t("mobileSaved.confirmRemove", { name: removeTarget.name }) : ""
        }
        confirmLabel={t("confirmDialog.remove")}
        cancelLabel={t("confirmDialog.cancel")}
        destructive
        onConfirm={() => {
          if (removeTarget) onRemove(removeTarget.id);
          setRemoveTarget(null);
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
});

function ColHeader({ label }: { label: string }) {
  return (
    <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">{label}</span>
  );
}

interface DesktopFilterChipProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function DesktopFilterChip({ label, count, active, onClick }: DesktopFilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${
        active
          ? "border border-transparent bg-foreground text-background"
          : "border border-border bg-surface text-foreground-secondary hover:bg-surface-raised"
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

interface DesktopRowProps {
  entry: SavedEntry;
  locale: string;
  isLast: boolean;
  menuOpen: boolean;
  renaming: boolean;
  renameDraft: string;
  setRenameDraft: (value: string) => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onToggleMenu: () => void;
  onLoad: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  t: ReturnType<typeof useTranslations>;
}

function DesktopRow({
  entry,
  locale,
  isLast,
  menuOpen,
  renaming,
  renameDraft,
  setRenameDraft,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onToggleMenu,
  onLoad,
  onRemove,
  onDuplicate,
  t,
}: DesktopRowProps) {
  const part = entry.parts[0];
  const input = part?.input ?? entry.input;
  const result = part?.result ?? entry.result;
  const profile = part?.normalizedProfile ?? entry.normalizedProfile;
  const tag = entry.tags?.[0];
  const lengthM = result.lengthMm / 1000;
  const geometry = `${lengthM.toFixed(lengthM >= 10 ? 1 : 2)} m × ${result.quantity}`;
  const currency = CURRENCY_SYMBOLS[result.currency] ?? result.currency;

  return (
    <div
      className={`relative grid items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-emphasis hover:[box-shadow:inset_0_0_0_1px_var(--border-strong)] ${
        isLast ? "rounded-b-2xl" : "border-b border-border"
      }`}
      style={{ gridTemplateColumns: GRID_COLS }}
    >
      <button
        type="button"
        onClick={onLoad}
        aria-label={t("desktopSaved.loadAria", { name: entry.name })}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-raised text-foreground-secondary"
      >
        <ProfileGlyph profileId={input.profileId} size="sm" />
      </button>

      <div className="flex min-w-0 items-center gap-2">
        {renaming ? (
          <input
            type="text"
            autoFocus
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onBlur={onCommitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommitRename();
              if (e.key === "Escape") onCancelRename();
            }}
            className="w-full border-b border-accent-border bg-transparent text-sm font-semibold text-foreground outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={onLoad}
            onDoubleClick={onStartRename}
            className="truncate text-left text-sm font-semibold tracking-[-0.01em] text-foreground hover:text-accent-text"
          >
            {profile.shortLabel}
          </button>
        )}
        {tag && (
          <span className="shrink-0 rounded-full bg-accent-surface px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.06em] text-accent-text">
            {tag}
          </span>
        )}
      </div>

      <span className="truncate text-xs text-foreground-secondary">{result.gradeLabel}</span>
      <span className="truncate text-xs tabular-nums text-foreground-secondary">{geometry}</span>

      <span className="flex items-baseline gap-1">
        <span className="text-sm font-bold tabular-nums tracking-[-0.02em] text-foreground">
          {fmtKg(result.totalWeightKg, locale)}
        </span>
        <span className="text-2xs text-muted">kg</span>
      </span>

      <span className="text-xs tabular-nums text-foreground">
        {currency} {fmtCost(result.grandTotalAmount, locale)}
      </span>

      {(() => {
        const rel = formatRelative(entry.updatedAt, locale);
        return (
          <span
            className={`text-xs ${
              rel.recent ? "font-semibold text-foreground-secondary" : "text-muted"
            }`}
          >
            {rel.label}
          </span>
        );
      })()}

      <button
        type="button"
        onClick={onToggleMenu}
        aria-label={t("mobileSaved.rowMenuAria")}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="5" cy="12" r="1.2" />
          <circle cx="12" cy="12" r="1.2" />
          <circle cx="19" cy="12" r="1.2" />
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute right-3 top-11 z-20 flex w-44 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--panel-shadow-strong)]">
          <button
            type="button"
            onClick={onStartRename}
            className="flex items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground hover:bg-surface-raised"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4z" />
            </svg>
            {t("desktopSaved.rename")}
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="flex items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm text-foreground hover:bg-surface-raised"
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

interface DesktopSavedEmptyProps {
  t: ReturnType<typeof useTranslations>;
  onCreatePreset: () => void;
}

function DesktopSavedEmpty({ t, onCreatePreset }: DesktopSavedEmptyProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-accent-border bg-accent-surface text-accent-text">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
      </div>
      <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em] text-foreground">
        {t("mobileSaved.emptyTitle")}
      </h2>
      <p className="max-w-md text-sm leading-snug text-foreground-secondary">
        {t("mobileSaved.emptyBody")}
      </p>
      <button
        type="button"
        onClick={onCreatePreset}
        className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-bold text-background shadow-[0_10px_22px_-10px_rgba(20,18,15,0.4)] hover:bg-foreground/90"
      >
        {t("mobileSaved.emptyCta")}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
