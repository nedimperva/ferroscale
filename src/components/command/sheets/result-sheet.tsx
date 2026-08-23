"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import type { CommandLine, CommandParseResult } from "@ferroscale/metal-core";
import { CommandGlyph } from "../command-glyph";
import { ProfileDrawing } from "../profile-drawing";
import { formatCommandParseName } from "../command-copy";
import { buildBreakdownRows } from "../breakdown-rows";
import { AssemblyParts } from "../assembly-parts";
import { applyNearbySpec, NearbySpecs } from "../nearby-specs";
import { SheetShell } from "./sheet-shell";
import { haptic } from "@/lib/haptics";
import { marginPercentStore, massTolerancePercentStore } from "@/lib/settings-stores";

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
  /** The whole line, so a multi-item breakdown can say which item it is. */
  line?: CommandLine;
  onClose: () => void;
  onSave: () => void;
  /** Whether this exact calculation is already bookmarked (Save toggles). */
  isSaved: boolean;
  onCopyValue: () => void;
  onCopySummary?: () => void;
  onShareLink: () => void;
  onNew: () => void;
  onCompare: () => void;
  onAddToProject: () => void;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
}

/** Inline result body — used by the mobile result sheet AND by the wide-desktop
 *  layout where there is no sheet at all. */
export function CommandResultBreakdown({
  p,
  line,
  onSave,
  isSaved,
  onCopyValue,
  onCopySummary,
  onShareLink,
  onNew,
  onCompare,
  onAddToProject,
  query,
  setQuery,
  columns = 1,
}: Omit<CommandResultSheetProps, "onClose"> & { columns?: 1 | 2 }) {
  const t = useTranslations("command");
  const [picked, setPicked] = useState(line?.activeIndex ?? 0);
  const seed = line?.raw ?? "";
  const [seedSeen, setSeedSeen] = useState(seed);
  if (seedSeen !== seed) {
    setSeedSeen(seed);
    setPicked(line?.activeIndex ?? 0);
  }
  const focus =
    line?.multi && line.items[picked]?.parse.valid
      ? line.items[picked].parse
      : p;
  const marginPercent = useSyncExternalStore(
    marginPercentStore.subscribe,
    marginPercentStore.getSnapshot,
    marginPercentStore.getServerSnapshot,
  );
  const massTolerancePercent = useSyncExternalStore(
    massTolerancePercentStore.subscribe,
    massTolerancePercentStore.getSnapshot,
    massTolerancePercentStore.getServerSnapshot,
  );
  const rows = buildBreakdownRows(focus, t, { marginPercent, massTolerancePercent });
  if (!rows && !(line?.multi)) {
    return null;
  }
  const secondaryBtn =
    "flex-1 h-11 rounded-button border border-border bg-[var(--surface)] font-semibold text-sm text-foreground";

  const geometryRows = (
    <>
      {(rows?.geometry ?? []).map((row) => (
        <SheetRow key={row.id} label={row.label} value={row.value} mono />
      ))}
    </>
  );

  const pricingRows = (
    <>
      {(rows?.pricing ?? []).map((row) => (
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
      {line?.multi && (
        <AssemblyParts line={line} selected={picked} onSelect={setPicked} />
      )}
      <div className="flex items-baseline gap-2 mb-3">
        {focus.alias && (
          <span className="text-accent">
            <CommandGlyph fam={focus.alias.fam} size={22} />
          </span>
        )}
        <span className="text-lg font-bold text-foreground">{formatCommandParseName(t, focus)}</span>
        {focus.gradeLabel && (
          <span className="text-xs font-semibold text-muted">· {focus.gradeLabel}</span>
        )}
      </div>
      {rows && (
      <div className="rounded-2xl border border-border-faint bg-[var(--surface)] flex items-center justify-center px-4 py-4 mb-3">
        <ProfileDrawing p={focus} className="w-full flex flex-col items-center" />
      </div>
      )}
      {rows && (columns === 2 ? (
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
      ))}
      {focus.calc && (
        <NearbySpecs
          input={focus.calc.input}
          onPick={(row) => {
            if (!focus.calc) return;
            haptic("commit");
            setQuery(applyNearbySpec(query, picked, row, focus.calc.input));
          }}
        />
      )}
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={onSave}
          aria-pressed={isSaved}
          className="flex-1 h-11 rounded-button font-bold text-sm"
          style={
            isSaved
              ? {
                  background: "var(--accent-surface)",
                  color: "var(--accent-text)",
                  border: "1px solid var(--accent-border)",
                }
              : { background: "var(--accent)", color: "var(--accent-contrast)" }
          }
        >
          {isSaved ? t("common.saved") : t("common.save")}
        </button>
        {onCopySummary && (
          <button type="button" onClick={onCopySummary} className={secondaryBtn}>
            {t("common.copySummary")}
          </button>
        )}
        <button type="button" onClick={onNew} className={secondaryBtn}>
          {t("common.new")}
        </button>
      </div>
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={onCopyValue} className={secondaryBtn}>
          {t("common.copyValue")}
        </button>
        {onCopySummary && (
          <button type="button" onClick={onCopySummary} className={secondaryBtn}>
            {t("common.copySummary")}
          </button>
        )}
        <button type="button" onClick={onShareLink} className={secondaryBtn}>
          {t("common.share")}
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
  line,
  ...rest
}: CommandResultSheetProps) {
  const t = useTranslations("command");
  if (!rest.p.calc || rest.p.kgm == null) {
    return null;
  }
  return (
    <SheetShell
      title={
        line && line.multi
          ? t("result.assembly", { count: line.items.length })
          : t("sheets.resultBreakdown")
      }
      onClose={onClose}
    >
      <CommandResultBreakdown line={line} {...rest} />
    </SheetShell>
  );
}