"use client";

import { useTranslations } from "next-intl";
import type { CommandParseResult } from "@ferroscale/metal-core";
import { CommandGlyph } from "../command-glyph";
import { formatCommandParseName } from "../command-copy";
import { buildBreakdownRows } from "../breakdown-rows";
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
  const rows = buildBreakdownRows(p, t);
  if (!rows) {
    return null;
  }
  const secondaryBtn =
    "flex-1 h-11 rounded-xl border border-border bg-[var(--surface)] font-semibold text-sm text-foreground";

  const geometryRows = (
    <>
      {rows.geometry.map((row) => (
        <SheetRow key={row.id} label={row.label} value={row.value} mono />
      ))}
    </>
  );

  const pricingRows = (
    <>
      {rows.pricing.map((row) => (
        <SheetRow
          key={row.id}
          label={row.label}
          value={row.value}
          mono
          strong={row.id === "totalCost"}
        />
      ))}
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