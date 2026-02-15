"use client";

import { memo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { HistoryEntry } from "@/hooks/useHistory";
import type { CalculationInput } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import { ProfileIcon } from "@/components/profiles/profile-icon";

interface HistoryPanelProps {
  history: HistoryEntry[];
  starred: HistoryEntry[];
  onLoad: (input: CalculationInput) => void;
  onToggleStar: (id: string) => void;
  onRemoveStarred: (id: string) => void;
  onClearHistory: () => void;
}

type Tab = "recent" | "saved";

export const HistoryPanel = memo(function HistoryPanel({
  history,
  starred,
  onLoad,
  onToggleStar,
  onRemoveStarred,
  onClearHistory,
}: HistoryPanelProps) {
  const t = useTranslations("history");
  const format = useFormatter();
  const [tab, setTab] = useState<Tab>("recent");

  const formatDateTime = (value: string) =>
    format.dateTime(new Date(value), {
      dateStyle: "short",
      timeStyle: "short",
    });

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border-faint pb-2">
        <button
          type="button"
          onClick={() => setTab("recent")}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            tab === "recent"
              ? "bg-surface-inverted text-surface"
              : "text-foreground-secondary hover:bg-surface-inset"
          }`}
        >
          {t("recent", { count: history.length })}
        </button>
        <button
          type="button"
          onClick={() => setTab("saved")}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            tab === "saved"
              ? "bg-surface-inverted text-surface"
              : "text-foreground-secondary hover:bg-surface-inset"
          }`}
        >
          {t("saved", { count: starred.length })}
        </button>
        {tab === "recent" && history.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="ml-auto text-xs text-muted-faint transition-colors hover:text-red-interactive"
          >
            {t("clear")}
          </button>
        )}
      </div>

      {/* Tab content */}
      {tab === "recent" ? (
        history.length === 0 ? (
          <p className="mt-3 text-xs text-muted-faint">
            {t("emptyRecent")}
          </p>
        ) : (
          <ul className="mt-2 grid gap-1.5">
            {history.map((entry) => (
              <HistoryItem
                key={entry.id}
                entry={entry}
                onLoad={onLoad}
                onStar={() => onToggleStar(entry.id)}
                isStarred={starred.some((s) => s.id === entry.id)}
                formatDateTime={formatDateTime}
              />
            ))}
          </ul>
        )
      ) : starred.length === 0 ? (
        <p className="mt-3 text-xs text-muted-faint">
          {t("emptySaved")}
        </p>
      ) : (
        <ul className="mt-2 grid gap-1.5">
          {starred.map((entry) => (
            <HistoryItem
              key={entry.id}
              entry={entry}
              onLoad={onLoad}
              onStar={() => onRemoveStarred(entry.id)}
              isStarred={true}
              formatDateTime={formatDateTime}
            />
          ))}
        </ul>
      )}
    </section>
  );
});

/* ------------------------------------------------------------------ */
/*  Single history row                                                */
/* ------------------------------------------------------------------ */

interface HistoryItemProps {
  entry: HistoryEntry;
  onLoad: (input: CalculationInput) => void;
  onStar: () => void;
  isStarred: boolean;
  formatDateTime: (value: string) => string;
}

const HistoryItem = memo(function HistoryItem({
  entry,
  onLoad,
  onStar,
  isStarred,
  formatDateTime,
}: HistoryItemProps) {
  const tBase = useTranslations();
  const t = useTranslations("history");

  const gradeLabel =
    entry.result.gradeLabel === "Custom density input"
      ? tBase("dataset.customDensityInput")
      : entry.result.gradeLabel === "Unknown"
        ? tBase("dataset.unknown")
        : entry.result.gradeLabel;

  return (
    <li className="flex items-center gap-2 rounded-md border border-border-faint px-2 py-1.5 transition-colors hover:bg-surface-raised">
      <button
        type="button"
        onClick={() => onLoad(entry.input)}
        className="min-w-0 flex-1 text-left"
      >
        <p className="flex items-center gap-1.5 truncate text-xs font-medium">
          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-surface-inset text-muted">
            <ProfileIcon category={entry.normalizedProfile.iconKey} className="h-3 w-3" />
          </span>
          <span className="truncate">{entry.normalizedProfile.shortLabel}</span>
        </p>
        <p className="truncate text-[10px] text-foreground-secondary">
          {entry.result.grandTotalAmount} {CURRENCY_SYMBOLS[entry.result.currency]} · {entry.result.totalWeightKg} kg
        </p>
        <p className="text-[10px] text-muted-faint">
          {gradeLabel} · {formatDateTime(entry.timestamp)}
        </p>
      </button>
      <button
        type="button"
        onClick={onStar}
        className="shrink-0 rounded p-1 transition-colors hover:bg-surface-inset"
        aria-label={isStarred ? t("removeStar") : t("addStar")}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={`h-4 w-4 transition-colors duration-200 ${
            isStarred
              ? "fill-accent stroke-accent"
              : "fill-none stroke-border-strong"
          }`}
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.324l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.324L11.48 3.5z"
          />
        </svg>
      </button>
    </li>
  );
});
