"use client";

import { useTranslations } from "next-intl";
import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import { CommandGlyph } from "../command-glyph";
import type { SavedEntry } from "@/hooks/useSaved";
import { DeskTopbar } from "./desk-sidebar";
import { DeskIcon, famForInput } from "./desk-atoms";

export function DeskSavedView({
  saved,
  onPick,
  onAddCompare,
  onRemove,
}: {
  saved: SavedEntry[];
  onPick: (entry: SavedEntry) => void;
  onAddCompare: (entry: SavedEntry) => void;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("command");
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
          <div
            className="grid gap-2.5"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
              maxWidth: 960,
            }}
          >
            {saved.map((entry) => {
              const fam = famForInput(entry.input);
              const r = entry.result;
              const entrySym = CURRENCY_SYMBOLS[r.currency] ?? "€";
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-2xl"
                  style={{
                    padding: "13px 15px",
                    border: "1px solid var(--border-faint)",
                    background: "var(--surface)",
                    boxShadow: "var(--panel-shadow-soft)",
                  }}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0 rounded-[11px] text-foreground"
                    style={{ width: 40, height: 40, background: "var(--surface-inset)" }}
                  >
                    {fam && <CommandGlyph fam={fam} size={22} />}
                  </div>
                  <button
                    type="button"
                    onClick={() => onPick(entry)}
                    className="flex-1 min-w-0 border-0 bg-transparent text-left cursor-pointer p-0"
                  >
                    <span className="block font-bold text-[14.5px] text-foreground truncate">
                      {entry.name}
                    </span>
                    <span className="block font-mono text-[11.5px] text-muted mt-0.5 truncate">
                      {fsWeight(r.totalWeightKg)} {fsWeightUnit(r.totalWeightKg)} · {entrySym}{" "}
                      {fsMoney(r.grandTotalAmount)} · ×{r.quantity}
                    </span>
                  </button>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <SavedAction title={t("saved.addToCompare")} onClick={() => onAddCompare(entry)}>
                      <DeskIcon name="compare" />
                    </SavedAction>
                    <SavedAction title={t("common.delete")} onClick={() => onRemove(entry.id)}>
                      <DeskIcon name="trash" />
                    </SavedAction>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

/* ───────────────────────── Projects view ───────────────────────── */
