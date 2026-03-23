"use client";

import { memo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { SavedEntry } from "@/hooks/useSaved";
import type { CalculationInput } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import { resolveGradeLabel } from "@/lib/calculator/grade-label";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { SwipeActionItem } from "@/components/ui/swipe-action-item";
import {
  formatPieceLength,
  formatStaticNumber,
  getWorkspacePanelSpacing,
  PanelCompactChip,
  PanelCompactMetric,
  type WorkspacePanelLayout,
} from "@/components/ui/result-style";
import { triggerHaptic } from "@/lib/haptics";

function categoryStyle(category: string): { iconBg: string; badge: string } {
  switch (category) {
    case "tubes":
      return {
        iconBg: "bg-blue-surface text-blue-text",
        badge: "bg-blue-surface text-blue-text border border-blue-border",
      };
    case "plates_sheets":
      return {
        iconBg: "bg-amber-surface text-amber-text",
        badge: "bg-amber-surface text-amber-text border border-amber-border",
      };
    case "structural":
      return {
        iconBg: "bg-green-surface text-green-text",
        badge: "bg-green-surface text-green-text border border-green-border",
      };
    default:
      return {
        iconBg: "bg-purple-surface text-purple-text",
        badge: "bg-purple-surface text-purple-text border border-purple-border",
      };
  }
}

interface SavedPanelProps {
  saved: SavedEntry[];
  onLoad: (input: CalculationInput) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: { name?: string; notes?: string }) => void;
  layout?: WorkspacePanelLayout;
  weightAsMain?: boolean;
}

export const HistoryPanel = memo(function HistoryPanel({
  saved,
  onLoad,
  onRemove,
  onUpdate,
  layout = "drawer",
  weightAsMain = false,
}: SavedPanelProps) {
  const t = useTranslations("saved");
  const spacing = getWorkspacePanelSpacing(layout);

  if (saved.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center gap-2 px-4 py-4 text-center">
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
    <ul className={`grid ${spacing.listGap}`}>
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
            layout={layout}
            weightAsMain={weightAsMain}
          />
        </SwipeActionItem>
      ))}
    </ul>
  );
});

interface SavedItemProps {
  entry: SavedEntry;
  onLoad: (input: CalculationInput) => void;
  onRemove: () => void;
  onUpdate: (patch: { name?: string; notes?: string }) => void;
  layout: WorkspacePanelLayout;
  weightAsMain: boolean;
}

const SavedItem = memo(function SavedItem({
  entry,
  onLoad,
  onRemove,
  onUpdate,
  layout,
  weightAsMain,
}: SavedItemProps) {
  const locale = useLocale();
  const tBase = useTranslations();
  const tSaved = useTranslations("saved");
  const tResult = useTranslations("result");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(entry.name);
  const [editNotes, setEditNotes] = useState(entry.notes ?? "");

  const gradeLabel = resolveGradeLabel(entry.result.gradeLabel, tBase);
  const currency = CURRENCY_SYMBOLS[entry.result.currency];
  const styles = categoryStyle(entry.normalizedProfile.iconKey);
  const pieceLength = formatPieceLength(entry.input.length, entry.result.lengthMm, locale);
  const profileSummary = gradeLabel
    ? `${entry.normalizedProfile.shortLabel} - ${gradeLabel}`
    : entry.normalizedProfile.shortLabel;

  const orderedMetrics = weightAsMain
    ? [
        {
          label: tResult("unitWeight"),
          value: formatStaticNumber(entry.result.unitWeightKg),
          unit: "kg",
        },
        {
          label: tResult("totalWeight"),
          value: formatStaticNumber(entry.result.totalWeightKg),
          unit: "kg",
        },
        {
          label: tResult("totalCost"),
          value: formatStaticNumber(entry.result.grandTotalAmount),
          unit: currency,
        },
      ]
    : [
        {
          label: tResult("unitWeight"),
          value: formatStaticNumber(entry.result.unitWeightKg),
          unit: "kg",
        },
        {
          label: tResult("totalCost"),
          value: formatStaticNumber(entry.result.grandTotalAmount),
          unit: currency,
        },
        {
          label: tResult("totalWeight"),
          value: formatStaticNumber(entry.result.totalWeightKg),
          unit: "kg",
        },
      ];

  function handleSaveEdit() {
    const name = editName.trim();
    if (name) {
      onUpdate({ name, notes: editNotes.trim() || undefined });
    }
    setEditing(false);
  }

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className={layout === "drawer" ? "px-3 py-2.5" : "px-3 py-2"}>
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => onLoad(entry.input)}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex items-start gap-2.5">
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${styles.iconBg}`}
              >
                <ProfileIcon category={entry.normalizedProfile.iconKey} className="h-4 w-4" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{entry.name}</p>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted">{profileSummary}</p>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <PanelCompactChip label={tResult("contextQuantity")} value={tResult("pieces", { qty: entry.result.quantity })} />
              <PanelCompactChip label={tResult("contextLength")} value={pieceLength} />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5 xl:grid-cols-4">
              {orderedMetrics.map((metric) => (
                <PanelCompactMetric
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  unit={metric.unit}
                />
              ))}
              <PanelCompactMetric
                label={tResult("surfaceArea")}
                value={
                  entry.result.surfaceAreaM2 != null
                    ? formatStaticNumber(entry.result.surfaceAreaM2)
                    : "\u2014"
                }
                unit={entry.result.surfaceAreaM2 != null ? "m\u00b2" : undefined}
              />
            </div>

            {entry.notes && !editing && (
              <div className="mt-2 rounded-lg border border-border-faint bg-surface-raised px-2.5 py-1.5">
                <p className="text-[11px] italic text-muted-faint line-clamp-3">{entry.notes}</p>
              </div>
            )}
          </button>

          <div className="flex shrink-0 items-start gap-1">
            <IconButton
              title={tSaved("edit")}
              onClick={() => {
                setEditName(entry.name);
                setEditNotes(entry.notes ?? "");
                setEditing((value) => !value);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
              </svg>
            </IconButton>
            <IconButton
              title={tSaved("remove")}
              tone="danger"
              onClick={() => {
                triggerHaptic("light");
                onRemove();
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
              </svg>
            </IconButton>
          </div>
        </div>

        {editing && (
          <div className="mt-2 grid gap-2">
            <input
              type="text"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              className="w-full rounded-lg border border-blue-border bg-surface px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-blue-strong"
              maxLength={80}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSaveEdit();
                if (event.key === "Escape") setEditing(false);
              }}
            />
            <textarea
              value={editNotes}
              onChange={(event) => setEditNotes(event.target.value)}
              rows={3}
              placeholder={tSaved("notesPlaceholder")}
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-faint outline-none focus:border-blue-border"
              maxLength={200}
            />
            <div className="flex gap-3">
              <button type="button" onClick={handleSaveEdit} className="text-xs font-medium text-blue-strong">
                {tSaved("editSave")}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="text-xs font-medium text-muted">
                {tSaved("editCancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
});

function IconButton({
  children,
  title,
  tone = "default",
  onClick,
}: {
  children: ReactNode;
  title: string;
  tone?: "default" | "danger";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        tone === "danger"
          ? "rounded-lg p-1.5 text-muted-faint transition-colors hover:bg-red-surface hover:text-red-interactive"
          : "rounded-lg p-1.5 text-muted-faint transition-colors hover:bg-surface-inset hover:text-foreground-secondary"
      }
      title={title}
    >
      {children}
    </button>
  );
}
