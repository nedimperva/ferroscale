"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CURRENCY_SYMBOLS, cmdParse, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import { filterHistory, groupHistoryByDay, type HistoryTimes } from "@/lib/command/history";
import { useDayClock } from "@/hooks/useDayClock";
import { SearchField } from "./search-field";

/**
 * Every logged line, by day — Today, Yesterday, This week, Earlier — with a
 * search over all of them. One component for the phone's library sheet and
 * the workspace's tape, so "what was that beam on Tuesday?" has one answer.
 */
export function HistoryList({
  items,
  times,
  settings,
  mode,
  onLoad,
  onRemove,
  compact,
}: {
  items: string[];
  times: HistoryTimes;
  settings: CommandParserSettings;
  mode: "weight" | "price";
  onLoad: (query: string) => void;
  onRemove: (query: string) => void;
  /** Tighter rows for the workspace's tape. */
  compact?: boolean;
}) {
  const t = useTranslations("command");
  const [search, setSearch] = useState("");
  const sym = CURRENCY_SYMBOLS[settings.pricing.currency] ?? "€";

  // Parsed once per list, not per keystroke in the search box.
  const parsed = useMemo(
    () => new Map(items.map((query) => [query, cmdParse(query, settings)])),
    [items, settings],
  );
  const now = useDayClock();
  const groups = useMemo(
    () => groupHistoryByDay(filterHistory(items, search), times, now),
    [items, times, search, now],
  );

  const figure = (kg: number | null | undefined, amount: number | null | undefined) =>
    mode === "weight"
      ? kg != null
        ? `${fsWeight(kg)} ${fsWeightUnit()}`
        : "—"
      : amount != null
        ? `${sym} ${fsMoney(amount)}`
        : "—";

  return (
    <div className="flex flex-col gap-2 min-h-0">
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder={t("history.search")}
        ariaLabel={t("history.search")}
        compact={!compact}
      />
      {groups.length === 0 ? (
        <div className="font-mono text-[12px] text-muted-faint" style={{ padding: "10px 2px" }}>
          {search.trim() ? t("history.noMatch", { search: search.trim() }) : t("history.empty")}
        </div>
      ) : (
        groups.map((group) => {
          const rows = group.items.map((query) => ({ query, rp: parsed.get(query) }));
          const totalKg = rows.reduce((sum, r) => sum + (r.rp?.valid ? r.rp.totalKg ?? 0 : 0), 0);
          const totalAmount = rows.reduce(
            (sum, r) => sum + (r.rp?.valid ? r.rp.totalAmount ?? 0 : 0),
            0,
          );
          return (
            <section key={group.day} aria-label={t(`history.${group.day}`)}>
              <div
                className="flex items-baseline gap-2"
                style={{ padding: "6px 0 4px", borderBottom: "1px solid var(--border)" }}
              >
                <h3 className="fs-track-label text-[10px] font-bold uppercase text-muted m-0">
                  {t(`history.${group.day}`)}
                </h3>
                <span className="font-mono text-[10px] text-muted-faint">{rows.length}</span>
                <span className="ml-auto font-mono text-[11px] text-foreground-secondary">
                  {rows.some((r) => r.rp?.valid) ? figure(totalKg, totalAmount) : "—"}
                </span>
              </div>
              {rows.map(({ query, rp }) => (
                <div
                  key={query}
                  className="group flex items-center gap-2.5"
                  style={{
                    padding: compact ? "6px 0" : "9px 0",
                    borderBottom: "1px solid var(--border-faint)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onLoad(query)}
                    className="flex-1 min-w-0 flex items-baseline gap-3 text-left bg-transparent border-0 p-0 cursor-pointer"
                  >
                    <span
                      className={`flex-1 min-w-0 font-mono ${compact ? "text-[12px]" : "text-[13px]"} font-bold text-foreground truncate`}
                    >
                      {query}
                    </span>
                    <span className="font-mono text-[12px] text-muted flex-shrink-0 whitespace-nowrap">
                      {rp?.valid ? figure(rp.totalKg, rp.totalAmount) : "—"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(query)}
                    aria-label={t("desktop.removeFromTapeAria", { name: query })}
                    className={`flex items-center justify-center rounded-none border-0 text-muted text-[13px] leading-none flex-shrink-0 cursor-pointer ${
                      compact ? "opacity-0 group-hover:opacity-100 focus-visible:opacity-100" : ""
                    }`}
                    style={{
                      width: compact ? 20 : 28,
                      height: compact ? 20 : 28,
                      background: "var(--surface-inset)",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}
