"use client";

import { useTranslations } from "next-intl";
import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandParseResult } from "@ferroscale/metal-core";
import { CommandGlyph } from "../command-glyph";
import { formatCommandParseName } from "../command-copy";
import { SheetShell } from "./sheet-shell";

function SheetRow({
  label,
  value,
  mono,
  strong,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5 border-b border-border-faint last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-muted whitespace-nowrap">
        {label}
      </span>
      <span
        className={`text-sm text-foreground tabular-nums ${
          mono ? "font-mono" : ""
        } ${strong ? "font-bold" : "font-semibold"}`}
      >
        {value}
      </span>
    </div>
  );
}

interface CommandResultSheetProps {
  p: CommandParseResult;
  onClose: () => void;
  onSave: () => void;
  onCopy: () => void;
  onCopyValue: () => void;
  onShareLink: () => void;
  onNew: () => void;
  onCompare: () => void;
  onAddToProject: () => void;
}

/** Inline result body — used by the mobile result sheet AND by the wide-desktop
 *  layout where there is no sheet at all. */
export function CommandResultBreakdown({
  p,
  onSave,
  onCopy,
  onCopyValue,
  onShareLink,
  onNew,
  onCompare,
  onAddToProject,
  columns = 1,
}: Omit<CommandResultSheetProps, "onClose"> & { columns?: 1 | 2 }) {
  const t = useTranslations("command");
  if (!p.calc || p.kgm == null) {
    return null;
  }
  const r = p.calc.result;
  const sym = CURRENCY_SYMBOLS[r.currency] ?? "€";
  const secondaryBtn =
    "flex-1 h-11 rounded-xl border border-border bg-[var(--surface)] font-semibold text-sm text-foreground";

  const geometryRows = (
    <>
      <SheetRow label={t("result.massPerMetre")} value={`${p.kgm.toFixed(2)} kg/m`} mono />
      <SheetRow label={t("result.length")} value={`${p.lengthM} m`} mono />
      <SheetRow label={t("result.pieces")} value={`× ${p.realQty}`} mono />
      <SheetRow
        label={t("result.perPiece")}
        value={`${fsWeight(r.unitWeightKg)} ${fsWeightUnit(r.unitWeightKg)}`}
        mono
      />
      <SheetRow
        label={t("result.totalWeight")}
        value={`${fsWeight(r.totalWeightKg)} ${fsWeightUnit(r.totalWeightKg)}`}
        mono
      />
      <SheetRow label={t("result.density")} value={`${r.densityKgPerM3} kg/m³`} mono />
    </>
  );

  const pricingRows = (
    <>
      <SheetRow
        label={t("result.rate")}
        value={`${sym} ${fsMoney(p.calc.input.unitPrice)}/${r.priceUnit}`}
        mono
      />
      <SheetRow
        label={t("result.perPiecePrice")}
        value={`${sym} ${fsMoney(r.unitPriceAmount)}`}
        mono
      />
      <SheetRow label={t("result.subtotal")} value={`${sym} ${fsMoney(r.subtotalAmount)}`} mono />
      {p.pricing.wastePercent > 0 && (
        <SheetRow
          label={t("result.waste", { percent: p.pricing.wastePercent })}
          value={`${sym} ${fsMoney(r.wasteAmount)}`}
          mono
        />
      )}
      {p.pricing.includeVat && (
        <SheetRow
          label={t("result.vat", { percent: p.pricing.vatPercent })}
          value={`${sym} ${fsMoney(r.vatAmount)}`}
          mono
        />
      )}
      <SheetRow label={t("result.totalCost")} value={`${sym} ${fsMoney(r.grandTotalAmount)}`} mono strong />
    </>
  );

  return (
    <>
      <div className="flex items-baseline gap-2 mb-3">
        {p.alias && (
          <span className="text-accent">
            <CommandGlyph fam={p.alias.fam} size={22} />
          </span>
        )}
        <span className="text-lg font-bold text-foreground">{formatCommandParseName(t, p)}</span>
        {p.gradeLabel && (
          <span className="text-xs font-semibold text-muted">· {p.gradeLabel}</span>
        )}
      </div>
      {columns === 2 ? (
        <div className="rounded-2xl border border-border-faint bg-[var(--surface-raised)] grid grid-cols-2 divide-x divide-border-faint">
          <div className="px-4">
            <div className="text-[10px] font-bold tracking-[1.2px] text-muted uppercase pt-3 pb-1">
              {t("result.geometry")}
            </div>
            {geometryRows}
          </div>
          <div className="px-4">
            <div className="text-[10px] font-bold tracking-[1.2px] text-muted uppercase pt-3 pb-1">
              {t("result.pricing")}
            </div>
            {pricingRows}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border-faint bg-[var(--surface-raised)] px-4">
          {geometryRows}
          {pricingRows}
        </div>
      )}
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={onSave}
          className="flex-1 h-11 rounded-xl bg-[var(--accent)] text-white dark:text-[#161109] font-bold text-sm"
        >
          {t("common.save")}
        </button>
        <button type="button" onClick={onCopy} className={secondaryBtn}>
          {t("common.copy")}
        </button>
        <button type="button" onClick={onNew} className={secondaryBtn}>
          {t("common.new")}
        </button>
      </div>
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={onCopyValue} className={secondaryBtn}>
          {t("common.copyValue")}
        </button>
        <button type="button" onClick={onShareLink} className={secondaryBtn}>
          {t("common.shareLink")}
        </button>
      </div>
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={onCompare} className={secondaryBtn}>
          {t("common.compare")}
        </button>
        <button type="button" onClick={onAddToProject} className={secondaryBtn}>
          {t("common.addProject")}
        </button>
      </div>
    </>
  );
}

export function CommandResultSheet({
  onClose,
  ...rest
}: CommandResultSheetProps) {
  const t = useTranslations("command");
  if (!rest.p.calc || rest.p.kgm == null) {
    return null;
  }
  return (
    <SheetShell title={t("sheets.resultBreakdown")} onClose={onClose}>
      <CommandResultBreakdown {...rest} />
    </SheetShell>
  );
}