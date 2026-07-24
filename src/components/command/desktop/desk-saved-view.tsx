"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import { CommandGlyph } from "../command-glyph";
import type { SavedEntry } from "@/hooks/useSaved";
import { useNow } from "@/hooks/useNow";
import { isStaleSaved } from "@/lib/saved/tags";
import { DeskTopbar } from "./desk-sidebar";
import { DeskIcon } from "./desk-atoms";
import { familyForInput } from "../command-copy";

export function DeskSavedView({
  saved,
  onPick,
  onAddCompare,
  onShare,
  onRemove,
}: {
  saved: SavedEntry[];
  onPick: (entry: SavedEntry) => void;
  onAddCompare: (entry: SavedEntry) => void;
  onShare: (entry: SavedEntry) => void;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("command");
  const locale = useLocale();
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Distinct tags across the library, in first-seen order — the substrate for
  // a one-click filter that keeps a growing library navigable.
  const allTags = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const entry of saved) {
      for (const tag of entry.tags ?? []) {
        if (seen.has(tag)) continue;
        seen.add(tag);
        out.push(tag);
      }
    }
    return out;
  }, [saved]);

  const visible = useMemo(
    () => (activeTag ? saved.filter((entry) => entry.tags?.includes(activeTag)) : saved),
    [saved, activeTag],
  );
  const now = useNow();
  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      <DeskTopbar
        title={t("nav.saved")}
        subtitle={
          saved.length
            ? t("saved.subtitleCount", { count: saved.length })
            : t("saved.subtitleEmpty")
        }
      />
      <div className="flex-1 overflow-y-auto" style={{ padding: "24px 32px 32px" }}>
        {saved.length === 0 ? (
          <div className="font-mono text-[12.5px] text-muted-faint" style={{ padding: "16px 2px" }}>
            {t("saved.empty")}
          </div>
        ) : (
          <>
          {allTags.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mb-4" style={{ maxWidth: 960 }}>
              <TagFilterChip active={activeTag === null} onClick={() => setActiveTag(null)}>
                {t("saved.allTag")}
              </TagFilterChip>
              {allTags.map((tag) => (
                <TagFilterChip
                  key={tag}
                  active={activeTag === tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                >
                  {tag}
                </TagFilterChip>
              ))}
            </div>
          )}
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
              maxWidth: 960,
            }}
          >
            {visible.map((entry) => {
              const stale = isStaleSaved(entry, now);
              const fam = familyForInput(entry.input);
              const r = entry.result;
              const sym = CURRENCY_SYMBOLS[r.currency] ?? "€";
              const savedOn = new Date(entry.timestamp).toLocaleDateString(locale, {
                day: "numeric",
                month: "short",
              });
              const meta = [r.gradeLabel, `×${r.quantity}`, savedOn]
                .filter(Boolean)
                .join(" · ");
              return (
                <div
                  key={entry.id}
                  className="flex flex-col rounded-2xl border border-border-faint transition-colors hover:border-[var(--accent-border)]"
                  style={{
                    background: "var(--surface)",
                    boxShadow: "var(--panel-shadow-soft)",
                  }}
                >
                  <div className="flex items-center gap-3" style={{ padding: "13px 15px 11px" }}>
                    <div
                      className="flex items-center justify-center flex-shrink-0 rounded-[11px]"
                      style={{
                        width: 40,
                        height: 40,
                        background: "var(--accent-surface)",
                        color: "var(--accent-text)",
                      }}
                    >
                      {fam && <CommandGlyph fam={fam} size={22} />}
                    </div>
                    <button
                      type="button"
                      onClick={() => onPick(entry)}
                      className="flex-1 min-w-0 border-0 bg-transparent text-left cursor-pointer p-0"
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-[14.5px] text-foreground truncate">
                          {entry.name}
                        </span>
                        {stale && (
                          <span
                            title={t("saved.staleTitle")}
                            className="flex-shrink-0 font-mono text-[9px] font-bold uppercase tracking-wide rounded px-1 py-0.5"
                            style={{ background: "var(--surface-inset)", color: "var(--muted-faint)" }}
                          >
                            {t("saved.stale")}
                          </span>
                        )}
                      </span>
                      <span className="block font-mono text-[11px] text-muted mt-0.5 truncate">
                        {meta}
                      </span>
                    </button>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <SavedAction title={t("saved.addToCompare")} onClick={() => onAddCompare(entry)}>
                        <DeskIcon name="compare" />
                      </SavedAction>
                      <SavedAction title={t("saved.shareTemplate")} onClick={() => onShare(entry)}>
                        <DeskIcon name="link" />
                      </SavedAction>
                      <SavedAction title={t("common.delete")} onClick={() => onRemove(entry.id)}>
                        <DeskIcon name="trash" />
                      </SavedAction>
                    </div>
                  </div>
                  <div
                    className="flex items-end gap-5"
                    style={{
                      padding: "9px 15px 12px",
                      borderTop: "1px solid var(--border-faint)",
                    }}
                  >
                    <SavedStat
                      label={t("result.totalWeight")}
                      value={`${fsWeight(r.totalWeightKg)} ${fsWeightUnit()}`}
                      accent="var(--accent-text)"
                    />
                    <SavedStat
                      label={t("result.totalCost")}
                      value={`${sym} ${fsMoney(r.grandTotalAmount)}`}
                      accent="var(--blue-text)"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>
    </div>
  );
}

function TagFilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-mono text-[11px] font-semibold rounded-lg px-2.5 h-7 flex items-center transition-colors"
      style={{
        background: active ? "var(--accent-surface)" : "var(--surface-raised)",
        color: active ? "var(--accent-text)" : "var(--muted)",
        border: `1px solid ${active ? "var(--accent-border)" : "var(--border-faint)"}`,
      }}
    >
      {children}
    </button>
  );
}

function SavedStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="min-w-0">
      <div
        className="text-[9.5px] font-bold text-muted uppercase truncate"
        style={{ letterSpacing: 0.8 }}
      >
        {label}
      </div>
      <div
        className="font-mono text-[14.5px] font-extrabold mt-0.5 whitespace-nowrap"
        style={{ color: accent }}
      >
        {value}
      </div>
    </div>
  );
}

function SavedAction({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex items-center justify-center rounded-[9px] cursor-pointer text-foreground-secondary"
      style={{
        width: 30,
        height: 30,
        border: "1px solid var(--border-faint)",
        background: "var(--surface-raised)",
      }}
    >
      {children}
    </button>
  );
}
