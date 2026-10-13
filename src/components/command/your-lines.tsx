"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CURRENCY_SYMBOLS, cmdParse, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import {
  historyDay,
  oftenLines,
  type HistoryCounts,
  type HistoryTimes,
} from "@/lib/command/history";
import { useDayClock } from "@/hooks/useDayClock";
import { HistoryList } from "./history-list";

/** How many of the newest lines Recent shows; the rest are a tap away, by day. */
const RECENT_COUNT = 8;

/**
 * Your lines: Often (what you weigh again and again), Recent, and
 * everything by day with a search. One component for the phone's library
 * sheet (today's session above it, then a link to the by-day view, which
 * Often heads) and the workspace's panel (straight onto the by-day view).
 */
export function YourLines({
  items,
  times,
  counts,
  settings,
  mode,
  onLoad,
  onRemove,
  onClear,
  compact,
  showRecent = true,
  oftenIn = "lines",
  startInAll = false,
}: {
  items: string[];
  times: HistoryTimes;
  counts: HistoryCounts;
  settings: CommandParserSettings;
  mode: "weight" | "price";
  onLoad: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
  /** Tighter rows for the workspace. */
  compact?: boolean;
  /**
   * The phone leaves Recent out: today's session sits right above, and
   * everything older is under "Everything, by day".
   */
  showRecent?: boolean;
  /**
   * Where Often sits: on this first view, or (the phone) at the head of
   * Everything, by day — the phone's first view is today's session alone.
   */
  oftenIn?: "lines" | "everything";
  /**
   * Open straight on Everything, by day, with no way back to a first view
   * (the desk's panel: its tape is today's session already).
   */
  startInAll?: boolean;
}) {
  const t = useTranslations("command");
  const locale = useLocale();
  const now = useDayClock();
  const [showAll, setShowAll] = useState(startInAll);
  const sym = CURRENCY_SYMBOLS[settings.pricing.currency] ?? "€";

  const often = useMemo(() => oftenLines(items, counts), [items, counts]);
  const recent = useMemo(() => items.slice(0, RECENT_COUNT), [items]);
  const parsed = useMemo(
    () => new Map([...often, ...recent].map((query) => [query, cmdParse(query, settings)])),
    [often, recent, settings],
  );

  const figure = (query: string) => {
    const rp = parsed.get(query);
    if (!rp?.valid) return "—";
    return mode === "weight"
      ? rp.totalKg != null
        ? `${fsWeight(rp.totalKg)} ${fsWeightUnit()}`
        : "—"
      : rp.totalAmount != null
        ? `${sym} ${fsMoney(rp.totalAmount)}`
        : "—";
  };

  const when = (query: string) => {
    const at = times[query];
    if (at === undefined) return "";
    const day = historyDay(at, now);
    if (day === "today") {
      return new Date(at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    }
    if (day === "yesterday") return t("history.whenYesterday");
    return new Date(at).toLocaleDateString(locale, { day: "numeric", month: "short" });
  };

  if (items.length === 0) {
    return (
      <div className="font-mono text-[12px] text-muted-faint" style={{ padding: "10px 2px" }}>
        {t("history.empty")}
      </div>
    );
  }

  const heading = (label: string, sub: string) => (
    <div
      className="flex items-baseline justify-between gap-3"
      style={{ paddingBottom: 6, borderBottom: "1px solid var(--foreground)" }}
    >
      <h3 className="fs-track-label text-[10px] font-bold uppercase text-muted m-0">{label}</h3>
      <span className="text-[11px] text-muted truncate">{sub}</span>
    </div>
  );

  const oftenSection =
    often.length > 0 ? (
      <section aria-label={t("history.often")} style={{ marginBottom: 18 }}>
        {heading(t("history.often"), t("history.oftenSub"))}
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", paddingTop: 10 }}
        >
          {often.map((query) => (
            <button
              key={query}
              type="button"
              onClick={() => onLoad(query)}
              className="flex flex-col gap-1 text-left cursor-pointer min-w-0"
              style={{
                minHeight: compact ? 52 : 64,
                padding: "10px 12px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--foreground)",
              }}
            >
              <span className="font-mono text-[14px] font-semibold truncate w-full">{query}</span>
              <span className="text-[11px] text-muted">
                {t("history.timesUsed", { count: counts[query] ?? 1 })} · {figure(query)}
              </span>
            </button>
          ))}
        </div>
      </section>
    ) : null;

  if (showAll) {
    return (
      <div className="flex flex-col gap-2">
        {!startInAll && (
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="self-start bg-transparent border-0 p-0 text-[13px] font-semibold cursor-pointer"
            style={{ minHeight: 32, color: "var(--accent-text)" }}
          >
            {t("history.backToLines")}
          </button>
        )}
        {oftenIn === "everything" && oftenSection}
        <HistoryList
          compact={compact}
          items={items}
          times={times}
          settings={settings}
          mode={mode}
          onLoad={onLoad}
          onRemove={onRemove}
        />
        <button
          type="button"
          onClick={onClear}
          className="self-start bg-transparent border-0 p-0 text-[12px] text-muted cursor-pointer hover:text-foreground"
          style={{ minHeight: 32 }}
        >
          {t("common.clearAll")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {oftenIn === "lines" && oftenSection}

      {showRecent && (
        <section aria-label={t("history.recent")}>
          {heading(t("history.recent"), t("history.recentSub"))}
          {recent.map((query) => (
            <button
              key={query}
              type="button"
              onClick={() => onLoad(query)}
              className="w-full flex items-center gap-2.5 text-left bg-transparent border-0 p-0 cursor-pointer"
              style={{
                minHeight: compact ? 38 : 44,
                borderBottom: "1px solid var(--border-faint)",
                color: "var(--foreground)",
              }}
            >
              <span className="flex-1 min-w-0 font-mono text-[14px] font-semibold truncate">{query}</span>
              <span className="font-mono text-[12px] text-foreground-secondary whitespace-nowrap">
                {figure(query)}
              </span>
              <span className="text-[11px] text-muted text-right whitespace-nowrap" style={{ width: 62 }}>
                {when(query)}
              </span>
            </button>
          ))}
        </section>
      )}

      <button
        type="button"
        onClick={() => setShowAll(true)}
        className="self-start bg-transparent border-0 p-0 text-[13px] font-semibold cursor-pointer"
        style={{ minHeight: 44, color: "var(--accent-text)" }}
      >
        {t("history.everything")}
      </button>
    </div>
  );
}
