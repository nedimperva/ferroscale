"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSync } from "@/hooks/useSync";

export function SyncSection() {
  const t = useTranslations("command");
  const {
    status,
    connectProvider,
    disconnectProvider,
    syncNow,
  } = useSync();
  const [busy, setBusy] = useState<null | "connect" | "sync" | "disconnect">(null);
  const [error, setError] = useState<string | null>(null);

  const tryConnect = async () => {
    const passphrase = window.prompt(
      t("sync.passphrasePrompt"),
    );
    if (!passphrase) return;
    setBusy("connect");
    setError(null);
    try {
      await connectProvider(passphrase);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sync.couldNotConnect"));
    } finally {
      setBusy(null);
    }
  };

  const trySync = async () => {
    setBusy("sync");
    setError(null);
    try {
      await syncNow();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sync.syncFailed"));
    } finally {
      setBusy(null);
    }
  };

  const tryDisconnect = async () => {
    if (!window.confirm(t("sync.disconnectConfirm"))) return;
    setBusy("disconnect");
    setError(null);
    try {
      await disconnectProvider();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sync.couldNotDisconnect"));
    } finally {
      setBusy(null);
    }
  };

  const action =
    "h-9 px-3 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50";
  const primary = `${action} bg-[var(--accent)] text-white dark:text-[#161109]`;
  const secondary = `${action} border border-border-faint bg-[var(--surface)] text-foreground`;

  return (
    <div className="mt-4">
      <div className="text-[10px] font-bold tracking-[1.2px] text-muted uppercase mb-2 px-1">
        {t("sync.title")}
      </div>
      <div className="rounded-2xl border border-border-faint bg-[var(--surface-raised)] p-4">
        {status.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "var(--green-text)" }}
                aria-hidden="true"
              />
              <span className="text-xs font-semibold text-foreground truncate">
                {status.connectedEmail ?? "Google Drive"}
              </span>
            </div>
            <div className="font-mono text-[11px] text-muted">
              {status.lastPullAt
                ? t("sync.lastSync", { date: new Date(status.lastPullAt).toLocaleString() })
                : t("sync.noSyncYet")}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={trySync}
                disabled={busy != null}
                className={primary}
              >
                {busy === "sync" ? t("sync.syncing") : t("sync.syncNow")}
              </button>
              <button
                type="button"
                onClick={tryDisconnect}
                disabled={busy != null}
                className={secondary}
              >
                {t("sync.disconnect")}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-foreground-secondary">
              {t("sync.description")}
            </p>
            <button
              type="button"
              onClick={tryConnect}
              disabled={busy != null}
              className={primary}
            >
              {busy === "connect" ? t("sync.connecting") : t("sync.connectGoogleDrive")}
            </button>
          </div>
        )}
        {error && (
          <p
            className="text-[11px] mt-3 px-1"
            style={{ color: "var(--red-text)" }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}