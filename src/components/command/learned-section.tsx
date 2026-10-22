"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import {
  forgetAllCorrections,
  forgetCorrection,
  useCorrections,
} from "@/lib/corrections";
import { loadConflicts, resolveConflict, dismissConflict } from "@/lib/sync/conflicts";
import { RestorePointsSheet } from "./sheets/restore-points-sheet";
import { ConflictSheet } from "./sheets/conflict-sheet";

/**
 * What the app has learned, and what it kept in case it needs it back.
 *
 * A correction the app learned is a claim about the user, and a claim the
 * user cannot see is a claim they cannot check. So the list is here, every
 * entry with the number of times it was seen, and a way to forget any of
 * them — and forgetting travels to the other devices too, because a
 * correction is a fact about the user rather than about a screen.
 */
export function LearnedSection() {
  const t = useTranslations("command");
  const entries = useCorrections();
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictCount, setConflictCount] = useState(0);

  const openConflicts = useCallback(() => {
    setConflictCount(loadConflicts().filter((entry) => !entry.resolved).length);
    setConflictOpen(true);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[13px] leading-[1.5] text-muted">{t("learned.description")}</p>
        {entries.length === 0 ? (
          <p className="mt-3 font-mono text-[12px] text-muted-faint">{t("learned.empty")}</p>
        ) : (
          <div className="mt-3 flex flex-col">
            {entries.map((entry) => (
              <div
                key={entry.from}
                className="flex items-center gap-3 border-b border-[var(--border-faint)] py-2"
              >
                <span className="font-mono text-[13px] text-muted-faint line-through">
                  {entry.from}
                </span>
                <span className="font-mono text-[13px] text-foreground">→ {entry.to}</span>
                <span className="font-mono text-[11px] text-muted-faint">×{entry.n}</span>
                <button
                  type="button"
                  onClick={() => forgetCorrection(entry.from)}
                  className="ml-auto font-mono text-[11px] text-muted underline"
                >
                  {t("learned.forget")}
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={forgetAllCorrections}
              className="mt-3 self-start font-mono text-[11px] text-muted underline"
            >
              {t("learned.forgetAll")}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRestoreOpen(true)}
          className="border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[12.5px] font-semibold text-foreground"
        >
          {t("restorePoints.title")}
        </button>
        <button
          type="button"
          onClick={openConflicts}
          className="border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[12.5px] font-semibold text-foreground"
        >
          {t("conflicts.title")}
          {conflictCount > 0 ? ` (${conflictCount})` : ""}
        </button>
      </div>

      {restoreOpen ? <RestorePointsSheet onClose={() => setRestoreOpen(false)} /> : null}
      {conflictOpen ? (
        <ConflictSheet
          conflicts={loadConflicts()}
          onClose={() => setConflictOpen(false)}
          onKeepLocal={(conflict) => {
            resolveConflict(conflict.id);
            openConflicts();
          }}
          onKeepRemote={(conflict) => {
            resolveConflict(conflict.id);
            openConflicts();
          }}
          onDismiss={(conflict) => {
            dismissConflict(conflict.id);
            openConflicts();
          }}
        />
      ) : null}
    </div>
  );
}
