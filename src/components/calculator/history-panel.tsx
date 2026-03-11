"use client";

import { memo, useState } from "react";
import { useTranslations } from "next-intl";
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
}

const SavedItem = memo(function SavedItem({
  entry,
  onLoad,
  onRemove,
  onUpdate,
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

  return (
    <li className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        {/* Clickable main content — loads entry */}
        <button
          type="button"
          onClick={() => onLoad(entry.input)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${styles.iconBg}`}>
              <ProfileIcon category={entry.normalizedProfile.iconKey} className="h-3.5 w-3.5" />
            </span>
            <span className="truncate text-sm font-medium text-foreground">
              {entry.name}
            </span>
            {gradeLabel && (
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${styles.badge}`}>
                {gradeLabel}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted">{entry.normalizedProfile.shortLabel}</p>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted">
            <span>{entry.result.totalWeightKg} kg</span>
            <span>{entry.result.grandTotalAmount} {currency}</span>
          </div>
          {entry.notes && !editing && (
            <p className="mt-1 text-[11px] text-muted-faint italic line-clamp-2">{entry.notes}</p>
          )}
        </button>

        {/* Small icon buttons */}
        <div className="flex shrink-0 items-start gap-1">
          <button
            type="button"
            onClick={() => {
              setEditName(entry.name);
              setEditNotes(entry.notes ?? "");
              setEditing((v) => !v);
            }}
            className="rounded p-1 text-muted-faint transition-colors hover:bg-surface-inset hover:text-foreground-secondary"
            title={t("edit")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onRemove();
            }}
            className="rounded p-1 text-muted-faint transition-colors hover:bg-red-surface hover:text-red-interactive"
            title={t("remove")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Inline name/notes editor */}
      {editing && (
        <div className="mt-2 grid gap-1.5">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full rounded border border-blue-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground outline-none focus:border-blue-strong"
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
            className="w-full resize-none rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-faint outline-none focus:border-blue-border"
            maxLength={200}
          />
          <div className="flex gap-2">
            <button type="button" onClick={handleSaveEdit} className="text-[11px] font-medium text-blue-strong">
              {t("editSave")}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-[11px] font-medium text-muted">
              {t("editCancel")}
            </button>
          </div>
        </div>
      )}
    </li>
  );
});
