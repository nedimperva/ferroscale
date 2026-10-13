"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CURRENCY_SYMBOLS, cmdParse, fsLength, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import { CommandGlyph } from "./command-glyph";
import { formatCommandParseName } from "./command-copy";

/**
 * Today's session as the workspace's tape draws it: each line split into its
 * profile, length × pieces and figure, a ruled total, and the two things done
 * with a session — make it a project, or clear it. Older days stay in Your
 * lines below; Clear only empties today.
 */
export function SessionToday({
  today,
  settings,
  mode,
  onLoad,
  onRemove,
  onClear,
  onSaveAsProject,
}: {
  today: string[];
  settings: CommandParserSettings;
  mode: "weight" | "price";
  onLoad: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
  onSaveAsProject: () => void;
}) {
  const t = useTranslations("command");
  const sym = CURRENCY_SYMBOLS[settings.pricing.currency] ?? "€";
  const rows = useMemo(
    () =>
      today
        .map((q) => ({ q, rp: cmdParse(q, settings) }))
        .filter((row) => row.rp.valid),
    [today, settings],
  );
  const totalKg = rows.reduce((sum, r) => sum + (r.rp.totalKg ?? 0), 0);
  const totalAmount = rows.reduce((sum, r) => sum + (r.rp.totalAmount ?? 0), 0);
  const figure = (kg: number | null, amount: number | null) =>
    mode === "weight"
      ? `${fsWeight(kg ?? 0)} ${fsWeightUnit()}`
      : `${sym} ${fsMoney(amount ?? 0)}`;

  return (
    <section aria-label={t("history.today")} style={{ marginBottom: 22 }}>
      <div
        className="flex items-baseline gap-2.5"
        style={{ paddingBottom: 6, borderBottom: "1px solid var(--foreground)" }}
      >
        <h3 className="fs-track-label text-[10px] font-bold uppercase text-muted m-0">
          {t("history.today")}
        </h3>
        {rows.length > 0 && (
          <>
            <button
              type="button"
              onClick={onSaveAsProject}
              className="ml-auto bg-transparent border-0 p-0 text-[12px] font-bold cursor-pointer"
              style={{ minHeight: 32, color: "var(--accent-text)" }}
            >
              {t("desktop.saveSessionAsProjectShort")}
            </button>
            <button
              type="button"
              onClick={onClear}
              className="bg-transparent border-0 p-0 text-[12px] font-bold text-muted cursor-pointer"
              style={{ minHeight: 32, paddingLeft: 10 }}
            >
              {t("common.clear")}
            </button>
          </>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="font-mono text-[12px] text-muted-faint" style={{ padding: "12px 0" }}>
          {t("history.nothingToday")}
        </div>
      ) : (
        <>
          {rows.map(({ q, rp }) => (
            <div
              key={q}
              className="flex items-center gap-2.5"
              style={{ minHeight: 48, borderBottom: "1px solid var(--border-faint)" }}
            >
              <button
                type="button"
                onClick={() => onLoad(q)}
                className="flex-1 min-w-0 flex items-center gap-2.5 bg-transparent border-0 p-0 text-left cursor-pointer"
                style={{ minHeight: 48, color: "var(--foreground)" }}
              >
                <span className="flex flex-shrink-0 text-muted" aria-hidden="true">
                  {rp.alias && <CommandGlyph fam={rp.alias.fam} alias={rp.alias.alias} size={15} />}
                </span>
                <span className="flex-1 min-w-0 truncate text-[14px] font-bold">
                  {formatCommandParseName(t, rp)}
                </span>
                <span className="font-mono text-[11px] text-muted whitespace-nowrap">
                  {fsLength(rp.lengthM ?? 0)} m × {rp.realQty}
                </span>
                <span
                  className="font-mono text-[13px] font-semibold text-right whitespace-nowrap"
                  style={{ minWidth: 76 }}
                >
                  {figure(rp.totalKg, rp.totalAmount)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onRemove(q)}
                aria-label={t("desktop.removeFromTapeAria", { name: formatCommandParseName(t, rp) ?? q })}
                className="flex items-center justify-center border-0 text-muted text-[14px] leading-none flex-shrink-0 cursor-pointer"
                style={{ width: 32, height: 32, background: "var(--surface-inset)" }}
              >
                ×
              </button>
            </div>
          ))}
          <div
            className="flex items-center gap-2.5"
            style={{ padding: "10px 0 0", borderTop: "1.5px solid var(--border-strong)", marginTop: -1 }}
          >
            <span className="font-mono text-xs font-bold text-muted">Σ</span>
            <span className="flex-1 text-[11px] font-bold text-muted" style={{ letterSpacing: 0.8 }}>
              {t("desktop.runningTotal", { count: rows.length })}
            </span>
            <span
              className="font-mono text-[15px] font-extrabold whitespace-nowrap"
              style={{ color: "var(--accent)" }}
            >
              {figure(totalKg, totalAmount)}
            </span>
          </div>
        </>
      )}
    </section>
  );
}
