"use client";

import { memo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { SavedEntry } from "@/hooks/useSaved";
import type { CalculationInput } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import { resolveGradeLabel } from "@/lib/calculator/grade-label";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { SwipeActionItem } from "@/components/ui/swipe-action-item";
import { triggerHaptic } from "@/lib/haptics";

function categoryStyle(category: string): { iconBg: string; badge: string } {
  switch (category) {
    case "tubes":
      return { iconBg: "bg-blue-surface text-blue-text", badge: "bg-blue-surface text-blue-text border border-blue-border" };
    case "plates_sheets":
      return { iconBg: "bg-amber-surface text-amber-text", badge: "bg-amber-surface text-amber-text border border-amber-border" };
    case "structural":
      return { iconBg: "bg-green-surface text-green-text", badge: "bg-green-surface text-green-text border border-green-border" };
    default:
      return { iconBg: "bg-purple-surface text-purple-text", badge: "bg-purple-surface text-purple-text border border-purple-border" };
  }
}

interface SavedPanelProps {
  saved: SavedEntry[];
  onLoad: (input: CalculationInput) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: { name?: string; notes?: string }) => void;
}

export const HistoryPanel = memo(function HistoryPanel({
  saved,
  onLoad,
  onRemove,
  onUpdate,
}: SavedPanelProps) {
  const t = useTranslations("saved");
  const format = useFormatter();

  const formatDateTime = (value: string) =>
    format.dateTime(new Date(value), {
      dateStyle: "short",
      timeStyle: "short",
    });

  if (saved.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center gap-2 px-4 text-center">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-inset text-muted-faint">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-5 w-5"
          >
            <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
        </span>
        <p className="text-sm font-medium text-foreground-secondary">{t("emptyTitle")}</p>
        <p className="text-xs text-muted-faint">{t("emptySubtitle")}</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-2">
      {saved.map((entry) => (
        <SwipeActionItem
          key={entry.id}
          onSwipeLeft={() => {
            triggerHaptic("light");
            onRemove(entry.id);
          }}
          leftLabel={t("remove")}
        >
          <SavedItem
            entry={entry}
            onLoad={onLoad}
            onRemove={() => onRemove(entry.id)}
            onUpdate={(patch) => onUpdate(entry.id, patch)}
            formatDateTime={formatDateTime}
          />
        </SwipeActionItem>
      ))}
    </ul>
  );
});

/* ------------------------------------------------------------------ */
/*  Single saved entry card                                           */
/* ------------------------------------------------------------------ */

interface SavedItemProps {
  entry: SavedEntry;
  onLoad: (input: CalculationInput) => void;
  onRemove: () => void;
  onUpdate: (patch: { name?: string; notes?: string }) => void;
  formatDateTime: (value: string) => string;
}

const SavedItem = memo(function SavedItem({
  entry,
  onLoad,
  onRemove,
  onUpdate,
  formatDateTime,
}: SavedItemProps) {
  const tBase = useTranslations();
  const t = useTranslations("saved");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(entry.name);
  const [editNotes, setEditNotes] = useState(entry.notes ?? "");

  const gradeLabel = resolveGradeLabel(entry.result.gradeLabel, tBase);
  const currency = CURRENCY_SYMBOLS[entry.result.currency];
  const styles = categoryStyle(entry.normalizedProfile.iconKey);

  function handleSaveEdit() {
    const name = editName.trim();
    if (name) onUpdate({ name, notes: editNotes.trim() || undefined });
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-blue-border bg-blue-surface/30 p-3">
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground outline-none focus:border-blue-border"
          maxLength={80}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSaveEdit();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <textarea
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          rows={2}
          placeholder={t("notesPlaceholder")}
          className="mt-1.5 w-full resize-none rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-faint outline-none focus:border-blue-border"
          maxLength={200}
        />
        <div className="mt-2 flex justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md px-2.5 py-1 text-xs text-foreground-secondary hover:bg-surface-inset"
          >
            {t("editCancel")}
          </button>
          <button
            type="button"
            onClick={handleSaveEdit}
            className="rounded-md bg-blue-surface px-2.5 py-1 text-xs font-semibold text-blue-text hover:bg-blue-surface/80"
          >
            {t("editSave")}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="overflow-hidden rounded-xl border border-border-faint bg-surface transition-colors hover:bg-surface-raised">
      {/* Load button — main row */}
      <button
        type="button"
        onClick={() => onLoad(entry.input)}
        className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left"
      >
        {/* Profile icon — colored per category */}
        <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${styles.iconBg}`}>
          <ProfileIcon category={entry.normalizedProfile.iconKey} className="h-3.5 w-3.5" />
        </span>

        <span className="min-w-0 flex-1">
          {/* Name + grade badge */}
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="truncate text-xs font-semibold text-foreground">
              {entry.name}
            </span>
            {gradeLabel && (
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${styles.badge}`}>
                {gradeLabel}
              </span>
            )}
          </span>
          {/* Subtitle: profile dimensions */}
          <span className="block truncate text-[10px] text-foreground-secondary">
            {entry.normalizedProfile.shortLabel}
          </span>
          {/* Values */}
          <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-faint">
            <span className="font-medium tabular-nums text-foreground-secondary">
              {entry.result.grandTotalAmount} {currency}
            </span>
            <span>·</span>
            <span className="tabular-nums">{entry.result.totalWeightKg} kg</span>
            <span>·</span>
            <span>{formatDateTime(entry.timestamp)}</span>
          </span>
          {/* Notes */}
          {entry.notes && (
            <span className="mt-0.5 block truncate text-[10px] italic text-muted">
              {entry.notes}
            </span>
          )}
        </span>
      </button>

      {/* Action row */}
      <div className="flex border-t border-border-faint/60">
        <button
          type="button"
          onClick={() => {
            setEditName(entry.name);
            setEditNotes(entry.notes ?? "");
            setEditing(true);
          }}
          className="flex flex-1 items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-muted transition-colors hover:bg-surface-inset hover:text-foreground-secondary"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
          </svg>
          {t("edit")}
        </button>
        <div className="w-px bg-border-faint/60" />
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onRemove();
          }}
          className="flex flex-1 items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-muted transition-colors hover:bg-surface-inset hover:text-red-interactive"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          {t("remove")}
        </button>
      </div>
    </li>
  );
});
