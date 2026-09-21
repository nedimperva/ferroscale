"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import type { CommandLine, CommandParseResult } from "@ferroscale/metal-core";
import { CommandGlyph } from "../command-glyph";
import { ProfileDrawing } from "../profile-drawing";
import { formatAvailability, formatCommandParseName } from "../command-copy";
import { buildBreakdownRows } from "../breakdown-rows";
import { AssemblyParts } from "../assembly-parts";
import { applyNearbySpec, NearbySpecs } from "../nearby-specs";
import { SheetShell } from "./sheet-shell";
import { SaveControl } from "../save-control";
import { RowMenu } from "../row-menu";
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
  /** The one save control's primary: file into the current job, or bookmark. */
  onPrimarySave: () => void;
  /** Its caret: the full destination picker. */
  onSaveElsewhere?: () => void;
  /** The job being worked out of, which the primary action names. */
  currentProjectName?: string | null;
  /** Whether this exact calculation is already bookmarked (Save toggles). */
  isSaved: boolean;
  onCopyValue: () => void;
  onCopySummary?: () => void;
  onShareLink: () => void;
  onNew: () => void;
  onCompare: () => void;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
}

/** Inline result body — used by the mobile result sheet AND by the wide-desktop
 *  layout where there is no sheet at all. */
export function CommandResultBreakdown({
  p,
  line,
  onPrimarySave,
  currentProjectName,
  onSaveElsewhere,
  isSaved,
  onCopyValue,
  onCopySummary,
  onShareLink,
  onNew,
  onCompare,
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
          <span className="text-accent-text">
            <CommandGlyph fam={focus.alias.fam} alias={focus.alias.alias} size={22} />
          </span>
        )}
        <span className="text-lg font-bold text-foreground">{formatCommandParseName(t, focus)}</span>
        {focus.gradeLabel && (
          <span className="text-xs font-semibold text-muted">· {focus.gradeLabel}</span>
        )}
      </div>
      {/* The phone's badge has room for two words; the sheet is where the
          sentence fits. Opened from BREAKDOWN, so it is on the path someone
          takes when they are about to act on the number. */}
      {focus.availability && (
        <p
          className="text-[11.5px] leading-[1.45] mt-0 mb-3 px-3 py-2 rounded-lg"
          style={{
            background: "var(--amber-surface)",
            color: "var(--amber-text)",
            border: "1px solid var(--amber-border)",
          }}
        >
          {formatAvailability(t, focus.availability, focus.gradeLabel).detail}{" "}
          {t("availability.checkRate")}
        </p>
      )}
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
      {/* The same three controls the calculator itself carries, in the same
          order. This was nine buttons over three rows — Copy summary drawn
          twice, "+ Project" and "Save" both leading to the save control that
          is now right here, and "New" given equal weight to all of it. */}
      <div className="flex items-center gap-2 mt-4">
        {onCopySummary && (
          <button type="button" onClick={onCopySummary} className={`${secondaryBtn} flex-1`}>
            {t("common.copySummary")}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <SaveControl
            compact
            projectName={currentProjectName ?? null}
            saved={isSaved}
            onPrimary={onPrimarySave}
            onOpenPicker={onSaveElsewhere ?? (() => {})}
          />
        </div>
        <RowMenu
          ariaLabel={t("common.more")}
          items={[
            { id: "value", label: t("common.copyValue"), onSelect: onCopyValue },
            { id: "share", label: t("common.shareLink"), onSelect: onShareLink },
            { id: "compare", label: t("common.compare"), onSelect: onCompare },
            { id: "new", label: t("common.newCalculation"), onSelect: onNew },
          ]}
        />
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