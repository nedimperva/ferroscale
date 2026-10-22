"use client";

import { useTranslations } from "next-intl";
import { useSyncMark } from "@/hooks/useSyncMark";

/**
 * A time, not a mood. "Synced just now" is true for a minute; after that the
 * mark says when, because "just now" on a device that has not synced since
 * yesterday is exactly the lie the mark exists to prevent.
 */
function syncedWhen(at: number, justNow: string): string {
  if (!at) return justNow;
  const minutes = Math.floor((Date.now() - at) / 60_000);
  if (minutes < 1) return justNow;
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(
    new Date(at),
  );
}

/**
 * The sync mark: a small square that says where the data is, without ever
 * asking for attention it does not need.
 *
 * The states are deliberately few. A square that is nearly always grey says
 * "everything is fine" without a word. It turns when there is something to
 * know — records waiting, a conflict to look at, sync broken — and the one
 * thing it never does is use the terracotta, which belongs to the answer.
 */
export function SyncStatusMark({
  onClick,
  compact = false,
}: {
  onClick?: () => void;
  compact?: boolean;
}) {
  const t = useTranslations("command");
  const mark = useSyncMark();

  if (mark.state === "offline") return null;

  const color =
    mark.state === "attention" || mark.state === "error"
      ? "var(--red-interactive)"
      : mark.state === "waiting"
        ? "var(--foreground-secondary)"
        : "var(--muted-faint)";

  const label =
    mark.state === "syncing"
      ? t("sync.statusSyncing")
      : mark.state === "attention" || mark.state === "error"
        ? mark.attention === "reconnect"
          ? t("sync.attentionReconnect")
          : t("sync.attentionPassphrase")
        : mark.state === "waiting"
          ? t("sync.queueWaiting", { count: mark.pending })
          : t("sync.statusSynced", { when: syncedWhen(mark.lastSyncedAt, t("sync.justNow")) });

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex items-center gap-1.5 text-[var(--muted-faint)] transition-colors duration-[140ms] hover:text-foreground"
    >
      <span
        aria-hidden
        className="block h-[7px] w-[7px]"
        style={{
          background:
            mark.state === "syncing"
              ? "transparent"
              : color,
          border: mark.state === "syncing" ? `1px solid ${color}` : undefined,
          animation:
            mark.state === "syncing" ? "fsSyncSpin 1.4s linear infinite" : undefined,
        }}
      />
      {!compact ? (
        <span className="font-mono text-[10px] uppercase tracking-[1.2px]">{label}</span>
      ) : null}
      {mark.conflicts > 0 ? (
        <span className="font-mono text-[10px] font-bold text-[var(--red-interactive)]">
          {mark.conflicts}
        </span>
      ) : null}
    </button>
  );
}
