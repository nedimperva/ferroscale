"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSync } from "@/hooks/useSync";
import type { SyncStatus } from "@/lib/sync/types";

/**
 * The sync card. Syncing itself runs app-wide (see components/sync-engine),
 * so this only connects, shows where things stand, and asks for the user in
 * the two cases nothing else can fix: a lapsed Google sign-in and a missing
 * or wrong passphrase.
 */

const action =
  "h-9 px-3 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50";
const primary = `${action} bg-[var(--action)] text-[var(--action-contrast)]`;
const secondary = `${action} border border-border-faint bg-[var(--surface)] text-foreground`;
const inputClass =
  "w-full h-9 px-3 rounded-lg border border-border-faint bg-[var(--surface)] text-sm text-foreground outline-none focus:border-[var(--action)]";

function useRelativeTime(iso: string | null | undefined) {
  const locale = useLocale();
  const t = useTranslations("command");
  // Re-render each minute so "2 minutes ago" does not freeze.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  if (!iso) return null;
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  if (seconds > -45) return t("sync.justNow");
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const minutes = Math.round(seconds / 60);
  if (minutes > -60) return format.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours > -24) return format.format(hours, "hour");
  return format.format(Math.round(hours / 24), "day");
}

function PassphraseFields({
  confirm,
  submitLabel,
  busyLabel,
  busy,
  onSubmit,
}: {
  /** Ask twice — only where a typo would lock other devices out. */
  confirm: boolean;
  submitLabel: string;
  busyLabel: string;
  busy: boolean;
  onSubmit: (passphrase: string) => void;
}) {
  const t = useTranslations("command");
  const [value, setValue] = useState("");
  const [repeat, setRepeat] = useState("");
  const [visible, setVisible] = useState(false);
  const mismatch = confirm && repeat.length > 0 && repeat !== value;
  const ready = value.trim().length > 0 && (!confirm || repeat === value);

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) onSubmit(value);
      }}
    >
      <label className="block">
        <span className="block text-[11px] text-muted mb-1">{t("sync.passphraseLabel")}</span>
        <div className="flex gap-2">
          <input
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className={secondary}
            aria-pressed={visible}
          >
            {visible ? t("sync.hidePassphrase") : t("sync.showPassphrase")}
          </button>
        </div>
      </label>
      {confirm && (
        <label className="block">
          <span className="block text-[11px] text-muted mb-1">{t("sync.passphraseConfirmLabel")}</span>
          <input
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            value={repeat}
            onChange={(event) => setRepeat(event.target.value)}
            aria-invalid={mismatch || undefined}
            className={inputClass}
          />
        </label>
      )}
      {mismatch && (
        <p className="text-[11px]" style={{ color: "var(--red-text)" }}>
          {t("sync.passphraseMismatch")}
        </p>
      )}
      <p className="text-[11px] text-muted">{t("sync.passphraseHint")}</p>
      <button type="submit" disabled={!ready || busy} className={primary}>
        {busy ? busyLabel : submitLabel}
      </button>
    </form>
  );
}

function StatusLine({ status }: { status: SyncStatus }) {
  const t = useTranslations("command");
  const when = useRelativeTime(status.lastSyncedAt);
  const offline = status.hydrated && typeof navigator !== "undefined" && navigator.onLine === false;

  let text: string;
  if (status.syncing) text = t("sync.statusSyncing");
  else if (offline) text = t("sync.statusOffline");
  else if (status.syncStatus === "pending" && status.lastError) text = t("sync.statusRetrying");
  else if (when) text = t("sync.statusSynced", { when });
  else text = t("sync.statusWaiting");

  return (
    <div className="font-mono text-[11px] text-muted" role="status" aria-live="polite">
      {text}
    </div>
  );
}

export function SyncSection() {
  const t = useTranslations("command");
  const {
    status,
    connectProvider,
    reconnectProvider,
    disconnectProvider,
    setPassphrase,
    syncNow,
  } = useSync();
  const [busy, setBusy] = useState<null | "connect" | "sync" | "disconnect" | "passphrase">(null);
  const [error, setError] = useState<string | null>(null);

  // Arriving here because sync needs the user: bring the card into view
  // (on phones it sits below the whole settings list). Once per mount.
  const rootRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);
  useEffect(() => {
    if (!status.attention || scrolledRef.current) return;
    scrolledRef.current = true;
    rootRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [status.attention]);

  const run = async (kind: NonNullable<typeof busy>, fn: () => Promise<unknown>, fallback: string) => {
    setBusy(kind);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setBusy(null);
    }
  };

  const tryDisconnect = () => {
    if (!window.confirm(t("sync.disconnectConfirm"))) return;
    void run("disconnect", disconnectProvider, t("sync.couldNotDisconnect"));
  };

  // Errors the user can act on get their own block; a genuine failure
  // (neither auth nor passphrase nor a flaky network) still shows its text.
  const hardError =
    status.syncStatus === "error" && !status.attention ? status.lastError : null;

  let body: React.ReactNode;
  if (status.attention === "reconnect") {
    body = (
      <div className="space-y-3">
        <p className="text-xs font-semibold text-foreground">{t("sync.reconnectTitle")}</p>
        <p className="text-xs text-foreground-secondary">{t("sync.reconnectBody")}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void run("connect", reconnectProvider, t("sync.couldNotConnect"))}
            disabled={busy != null}
            className={primary}
          >
            {busy === "connect" ? t("sync.connecting") : t("sync.reconnect")}
          </button>
          <button type="button" onClick={tryDisconnect} disabled={busy != null} className={secondary}>
            {t("sync.disconnect")}
          </button>
        </div>
      </div>
    );
  } else if (status.attention === "passphrase") {
    body = (
      <div className="space-y-3">
        <p className="text-xs font-semibold text-foreground">{t("sync.passphraseTitle")}</p>
        <p className="text-xs text-foreground-secondary">
          {status.passphraseConfigured ? t("sync.passphraseWrongBody") : t("sync.passphraseMissingBody")}
        </p>
        <PassphraseFields
          confirm={false}
          busy={busy === "passphrase"}
          submitLabel={t("sync.savePassphrase")}
          busyLabel={t("sync.syncing")}
          onSubmit={(passphrase) => void run("passphrase", () => setPassphrase(passphrase), t("sync.syncFailed"))}
        />
      </div>
    );
  } else if (status.connected) {
    body = (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-none"
            style={{ background: "var(--green-text)" }}
            aria-hidden="true"
          />
          <span className="text-xs font-semibold text-foreground truncate">
            {status.connectedEmail ?? "Google Drive"}
          </span>
        </div>
        <StatusLine status={status} />
        <p className="text-[11px] text-muted">{t("sync.autoNote")}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void run("sync", syncNow, t("sync.syncFailed"))}
            disabled={busy != null || status.syncing}
            className={secondary}
          >
            {busy === "sync" || status.syncing ? t("sync.syncing") : t("sync.syncNow")}
          </button>
          <button type="button" onClick={tryDisconnect} disabled={busy != null} className={secondary}>
            {t("sync.disconnect")}
          </button>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="space-y-3">
        <p className="text-xs text-foreground-secondary">{t("sync.description")}</p>
        <PassphraseFields
          confirm
          busy={busy === "connect"}
          submitLabel={t("sync.connectGoogleDrive")}
          busyLabel={t("sync.connecting")}
          onSubmit={(passphrase) => void run("connect", () => connectProvider(passphrase), t("sync.couldNotConnect"))}
        />
      </div>
    );
  }

  const shownError = error ?? hardError;

  return (
    <div className="mt-4" ref={rootRef}>
      <div className="text-[10px] font-bold tracking-[1.2px] text-muted uppercase mb-2 px-1">
        {t("sync.title")}
      </div>
      <div className="rounded-2xl border border-border-faint bg-[var(--surface-raised)] p-4">
        {body}
        {shownError && (
          <p
            className="text-[11px] mt-3 px-1"
            style={{ color: "var(--red-text)" }}
          >
            {shownError}
          </p>
        )}
      </div>
    </div>
  );
}
