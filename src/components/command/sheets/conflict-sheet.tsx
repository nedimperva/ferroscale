"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { SheetShell } from "./sheet-shell";
import { diffFields } from "@/lib/command/diff";
import type { SyncConflict } from "@/lib/sync/conflicts";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function display(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/**
 * The conflicts a merge produced, and what to do about them.
 *
 * A merge always picks a winner, and until now the loser simply vanished.
 * The losing side is kept, so "keep mine" is an operation rather than a
 * recollection — and the two versions are shown field by field, because
 * "which of these two was right?" is the question the user is actually
 * holding.
 */
export function ConflictSheet({
  conflicts,
  onClose,
  onKeepLocal,
  onKeepRemote,
  onDismiss,
}: {
  conflicts: SyncConflict[];
  onClose: () => void;
  onKeepLocal: (conflict: SyncConflict) => void;
  onKeepRemote: (conflict: SyncConflict) => void;
  onDismiss: (conflict: SyncConflict) => void;
}) {
  const t = useTranslations("command");
  const [openId, setOpenId] = useState<string | null>(null);

  const unresolved = useMemo(() => conflicts.filter((conflict) => !conflict.resolved), [conflicts]);

  return (
    <SheetShell
      title={t("conflicts.title")}
      subtitle={
        unresolved.length > 0
          ? t("conflicts.resolved", { count: unresolved.length })
          : undefined
      }
      onClose={onClose}
      size="wide"
      bare
    >
      {conflicts.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-[15px] font-bold text-foreground">{t("conflicts.none")}</p>
          <p className="mx-auto mt-2 max-w-[34rem] text-[13px] leading-[1.5] text-muted">
            {t("conflicts.noneBody")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {conflicts.map((conflict) => {
            const open = openId === conflict.id;
            const fields = diffFields(asRecord(conflict.local), asRecord(conflict.remote));
            const changed = fields.filter((field) => field.change !== "same");
            return (
              <div key={conflict.id} className="border-b border-[var(--border-faint)]">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : conflict.id)}
                  className="flex w-full items-center gap-3 py-3 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-foreground">
                      {conflict.label}
                    </span>
                    <span className="block font-mono text-[10.5px] uppercase tracking-[1.1px] text-muted-faint">
                      {conflict.entity} ·{" "}
                      {conflict.winner === "local" ? t("conflicts.keptMine") : t("conflicts.keptTheirs")}
                    </span>
                  </span>
                  <span className="font-mono text-[11px] text-muted-faint">
                    {changed.length > 0 ? t("conflicts.changedFields", { count: changed.length }) : ""}
                  </span>
                </button>

                {open ? (
                  <div className="pb-4">
                    <div className="grid grid-cols-2 gap-px border border-[var(--border-faint)] bg-[var(--border-faint)]">
                      <div className="bg-[var(--surface)] p-2.5">
                        <p className="font-mono text-[10px] uppercase tracking-[1.2px] text-muted-faint">
                          {t("conflicts.mine")}
                        </p>
                      </div>
                      <div className="bg-[var(--surface)] p-2.5">
                        <p className="font-mono text-[10px] uppercase tracking-[1.2px] text-muted-faint">
                          {t("conflicts.theirs")}
                        </p>
                      </div>
                      {changed.map((field) => (
                        <div key={field.key} className="contents">
                          <div className="bg-[var(--surface)] p-2.5 font-mono text-[12px]">
                            <span className="block text-[10px] uppercase tracking-[1.1px] text-muted-faint">
                              {field.key}
                            </span>
                            <span className="text-foreground">{display(field.from)}</span>
                          </div>
                          <div className="bg-[var(--surface)] p-2.5 font-mono text-[12px]">
                            <span className="block text-[10px] uppercase tracking-[1.1px] text-muted-faint">
                              {field.key}
                            </span>
                            <span className="text-foreground">{display(field.to)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onKeepLocal(conflict)}
                        className="border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[12.5px] font-semibold text-foreground"
                      >
                        {t("conflicts.keepMine")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onKeepRemote(conflict)}
                        className="border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[12.5px] font-semibold text-foreground"
                      >
                        {t("conflicts.keepTheirs")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDismiss(conflict)}
                        className="px-2 py-2 text-[12.5px] text-muted"
                      >
                        {t("conflicts.dismiss")}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </SheetShell>
  );
}
