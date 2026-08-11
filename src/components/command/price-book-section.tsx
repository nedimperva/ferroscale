"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { COMMAND_GRADES, CURRENCY_SYMBOLS } from "@ferroscale/metal-core";
import type { SharedCalcSettings } from "@/lib/settings-stores";
import type { UsePriceBookReturn } from "@/hooks/usePriceBook";

/**
 * Per-grade rates, in the settings surfaces on every viewport.
 *
 * Only grades the user has actually priced are listed — the point is a short
 * table of "what I pay", not a form with twelve empty boxes. Anything left out
 * falls through to the single default rate, so an empty book behaves exactly
 * as the app did before.
 */
export function PriceBookSection({
  shared,
  priceBook,
  compact,
}: {
  shared: SharedCalcSettings;
  priceBook: UsePriceBookReturn;
  compact?: boolean;
}) {
  const t = useTranslations("command");
  const [adding, setAdding] = useState(false);
  const sym = CURRENCY_SYMBOLS[shared.currency] ?? "€";
  const unit = shared.priceUnit === "piece" ? "pc" : shared.priceUnit;

  const priced = priceBook.entries
    .map((entry) => ({
      entry,
      grade: COMMAND_GRADES.find((grade) => grade.id === entry.gradeId),
    }))
    .filter((row) => row.grade);
  const unpriced = COMMAND_GRADES.filter(
    (grade) => !priceBook.entries.some((entry) => entry.gradeId === grade.id),
  );

  const rowStyle: React.CSSProperties = {
    padding: compact ? "8px 0" : "9px 0",
    borderTop: "1px solid var(--border-faint)",
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <span
          className="text-[10px] font-bold text-muted uppercase"
          style={{ letterSpacing: 1.2 }}
        >
          {t("priceBook.title")}
        </span>
        <span className="font-mono text-[10.5px] text-muted-faint">
          {t("priceBook.subtitle", { unit: `${sym}/${unit}` })}
        </span>
      </div>

      {priced.length === 0 && !adding && (
        <p className="text-[12px] text-muted" style={{ lineHeight: 1.5 }}>
          {t("priceBook.empty", { rate: `${sym}${shared.unitPrice}/${unit}` })}
        </p>
      )}

      {priced.map(({ entry, grade }) => (
        <div key={entry.gradeId} className="flex items-center gap-2" style={rowStyle}>
          <span className="flex-1 min-w-0">
            <span className="font-mono text-[13px] font-bold text-foreground">{grade!.label}</span>
            <span className="text-[11px] text-muted ml-2">{grade!.group}</span>
          </span>
          <label className="flex items-center gap-1 rounded-lg px-2" style={{ border: "1px solid var(--border-faint)", background: "var(--surface)" }}>
            <span className="text-[11px] text-muted-faint">{sym}</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.01}
              value={entry.unitPrice}
              aria-label={t("priceBook.rateAria", { grade: grade!.label })}
              onChange={(e) => priceBook.setRate(entry.gradeId, Number(e.target.value))}
              className="w-16 bg-transparent outline-none font-mono text-[13px] font-semibold text-foreground py-1.5"
            />
            <span className="text-[11px] text-muted-faint">/{unit}</span>
          </label>
          <button
            type="button"
            onClick={() => priceBook.clearRate(entry.gradeId)}
            aria-label={t("priceBook.removeAria", { grade: grade!.label })}
            title={t("common.remove")}
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-faint hover:text-foreground"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      {adding && unpriced.length > 0 && (
        <div className="flex items-center gap-2" style={rowStyle}>
          <select
            autoFocus
            defaultValue=""
            aria-label={t("priceBook.addAria")}
            onChange={(e) => {
              if (!e.target.value) return;
              priceBook.setRate(e.target.value, shared.unitPrice);
              setAdding(false);
            }}
            className="flex-1 h-9 rounded-lg px-2 text-[13px] text-foreground"
            style={{ border: "1px solid var(--border-faint)", background: "var(--surface)" }}
          >
            <option value="" disabled>
              {t("priceBook.pickGrade")}
            </option>
            {unpriced.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.label} · {grade.group}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="text-[12px] font-bold text-muted px-2"
          >
            {t("common.cancel")}
          </button>
        </div>
      )}

      {!adding && unpriced.length > 0 && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="self-start rounded-[10px] text-[12px] font-bold cursor-pointer"
          style={{
            padding: "7px 12px",
            border: "1px solid var(--border-faint)",
            background: "var(--surface)",
            color: "var(--foreground)",
          }}
        >
          {t("priceBook.addGrade")}
        </button>
      )}
    </section>
  );
}
