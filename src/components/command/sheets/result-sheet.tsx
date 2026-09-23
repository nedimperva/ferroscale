"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { CommandLine, CommandParseResult } from "@ferroscale/metal-core";
import { BreakdownLedger } from "../breakdown-ledger";
import { SheetShell } from "./sheet-shell";
import { SaveControl } from "../save-control";
import { RowMenu } from "../row-menu";

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
  /** The hero's metric; the breakdown opens on the same figure. */
  metric?: "weight" | "price";
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
  metric = "weight",
}: Omit<CommandResultSheetProps, "onClose">) {
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
  if (!p.valid && !line?.multi) {
    return null;
  }
  const secondaryBtn =
    "flex-1 h-11 rounded-button border border-border bg-[var(--surface)] font-semibold text-sm text-foreground";

  return (
    <>
      <BreakdownLedger
        p={focus}
        line={line}
        picked={picked}
        onPick={setPicked}
        metric={metric}
        variant="sheet"
        query={query}
        setQuery={setQuery}
      />
      {/* The same three controls the calculator itself carries, in the same
          order. This was nine buttons over three rows — Copy summary drawn
          twice, "+ Project" and "Save" both leading to the save control that
          is now right here, and "New" given equal weight to all of it. */}
      <div className="flex items-center gap-2 mt-5">
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