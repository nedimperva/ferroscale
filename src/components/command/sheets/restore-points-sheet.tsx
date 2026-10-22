"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SheetShell } from "./sheet-shell";
import {
  listLocalSnapshots,
  restoreLocalSnapshot,
  deleteLocalSnapshot,
  writeLocalSnapshot,
  type LocalSnapshot,
} from "@/lib/sync/local-snapshots";

/**
 * The restore points: a ring of snapshots of the user's own library, kept on
 * this device.
 *
 * A tombstone can undo a delete; a snapshot undoes a mess. If a restore from
 * a backup or a pull left the library half empty, this is where the version
 * from ten minutes ago still is.
 */
export function RestorePointsSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations("command");
  const [snapshots, setSnapshots] = useState<LocalSnapshot[]>([]);

  const refresh = useCallback(() => {
    void listLocalSnapshots().then(setSnapshots);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const take = useCallback(async () => {
    await writeLocalSnapshot("manual");
    refresh();
  }, [refresh]);

  const restore = useCallback(
    async (id: string) => {
      await restoreLocalSnapshot(id);
      onClose();
    },
    [onClose],
  );

  return (
    <SheetShell
      title={t("restorePoints.title")}
      onClose={onClose}
      size="standard"
      bare
      headerAction={
        <button
          type="button"
          onClick={() => void take()}
          className="border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 font-mono text-[11px] text-foreground"
        >
          {t("restorePoints.write")}
        </button>
      }
    >
      <p className="mb-3 text-[13px] leading-[1.5] text-muted">
        {t("restorePoints.description")}
      </p>
      {snapshots.length === 0 ? (
        <p className="py-8 text-center font-mono text-[13px] text-muted">
          {t("restorePoints.empty")}
        </p>
      ) : (
        <div className="flex flex-col">
          {snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className="flex items-center gap-3 border-b border-[var(--border-faint)] py-2.5"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[12px] text-foreground">
                  {new Date(snapshot.at).toLocaleString(undefined, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="block text-[11.5px] text-muted">
                  {t("restorePoints.summary", {
                    parts: snapshot.summary.saved,
                    projects: snapshot.summary.projects,
                    customers: snapshot.summary.customers,
                  })}
                </span>
              </span>
              <button
                type="button"
                onClick={() => void restore(snapshot.id)}
                className="border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 font-mono text-[11px] text-foreground"
              >
                {t("restorePoints.restore")}
              </button>
              <button
                type="button"
                onClick={() => void deleteLocalSnapshot(snapshot.id).then(refresh)}
                aria-label={t("restorePoints.delete")}
                className="premium-icon-button flex h-7 w-7 items-center justify-center text-[13px]"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </SheetShell>
  );
}
