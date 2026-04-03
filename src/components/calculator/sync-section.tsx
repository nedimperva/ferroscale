"use client";

import { memo, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import type { SyncStatus } from "@/lib/sync/types";
import { triggerHaptic } from "@/lib/haptics";

interface SyncSectionProps {
  status: SyncStatus;
  onConnect: (passphrase: string) => Promise<unknown>;
  onReconnect: () => Promise<unknown>;
  onChangePassphrase: (passphrase: string) => Promise<unknown>;
  onSyncNow: () => Promise<unknown>;
  onDisconnect: () => Promise<unknown>;
  onResetRemote: () => Promise<unknown>;
  onExport: () => void;
  onImport: (file: File) => Promise<unknown>;
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export const SyncSection = memo(function SyncSection({
  status,
  onConnect,
  onReconnect,
  onChangePassphrase,
  onSyncNow,
  onDisconnect,
  onResetRemote,
  onExport,
  onImport,
}: SyncSectionProps) {
  const t = useTranslations("sync");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");

  const syncBadgeClass = useMemo(() => {
    if (status.syncing) return "bg-blue-100 text-blue-700";
    if (status.authState === "awaiting_browser") return "bg-amber-100 text-amber-700";
    if (status.authState === "reauth_required" || status.syncStatus === "error") return "bg-red-100 text-red-700";
    if (status.connected) return "bg-emerald-100 text-emerald-700";
    return "bg-surface text-foreground-secondary";
  }, [status.authState, status.connected, status.syncStatus, status.syncing]);

  const syncBadgeLabel = useMemo(() => {
    if (status.syncing) return t("statusSyncing");
    if (status.authState === "awaiting_browser") return t("statusAwaitingBrowser");
    if (status.authState === "reauth_required" || status.syncStatus === "error") return t("statusNeedsReconnect");
    if (status.connected) return t("statusConnected");
    return t("statusLocal");
  }, [status.authState, status.connected, status.syncStatus, status.syncing, t]);

  async function runAction(action: string, fn: () => Promise<unknown>) {
    setBusyAction(action);
    try {
      await fn();
      if (action === "import") toast.success(t("imported"));
      if (action === "sync") toast.success(t("synced"));
      if (action === "passphrase") toast.success(t("passphraseSaved"));
      if (action === "reset-remote") toast.success(t("remoteReset"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("genericError"));
    } finally {
      setBusyAction(null);
    }
  }

  async function requirePassphraseAndRun(fn: (value: string) => Promise<unknown>) {
    const trimmed = passphrase.trim();
    if (!trimmed) {
      throw new Error(t("passphraseRequired"));
    }
    return fn(trimmed);
  }

  return (
    <section className="grid gap-3">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
        {t("title")}
      </h3>

      <div className="rounded-xl border border-border-strong bg-surface-inset p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {status.connected ? t("connectedLabel") : t("localOnlyLabel")}
            </p>
            <p className="text-xs text-muted-faint">
              {status.connected
                ? status.connectedEmail
                  ? t("connectedHint", { account: status.connectedEmail })
                  : t("connectedNoAccount")
                : t("localOnlyHint")}
            </p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${syncBadgeClass}`}>
            {syncBadgeLabel}
          </span>
        </div>

        <div className="mt-3 grid gap-1 text-xs text-foreground-secondary">
          <p>{status.passphraseConfigured ? t("passphraseSet") : t("passphraseMissing")}</p>
          <p>{status.lastPullAt ? t("lastPullValue", { value: formatTimestamp(status.lastPullAt) ?? status.lastPullAt }) : t("lastPullMissing")}</p>
          <p>{status.lastPushAt ? t("lastPushValue", { value: formatTimestamp(status.lastPushAt) ?? status.lastPushAt }) : t("lastPushMissing")}</p>
          <p>{t("pendingUploadsValue", { count: status.pendingUploadCount })}</p>
          <p>{t("pendingDownloadsValue", { count: status.pendingDownloadCount })}</p>
          {status.lastError ? <p className="text-red-600">{status.lastError}</p> : null}
        </div>
      </div>

      <div className="grid gap-2">
        <label className="grid gap-1">
          <span className="text-xs font-medium text-foreground-secondary">{t("passphraseLabel")}</span>
          <input
            type="password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            placeholder={status.passphraseConfigured ? t("passphrasePlaceholderExisting") : t("passphrasePlaceholderNew")}
            className="h-10 rounded-md border border-border-strong bg-surface px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-faint focus:border-foreground-secondary"
          />
        </label>
        <p className="text-xs text-muted-faint">{t("passphraseHint")}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {!status.connected ? (
          <ActionButton
            label={t("connect")}
            disabled={busyAction !== null || status.syncing}
            onClick={() => runAction("connect", () => requirePassphraseAndRun(onConnect))}
          />
        ) : (
          <>
            <ActionButton
              label={t("syncNow")}
              disabled={busyAction !== null || status.syncing}
              onClick={() => runAction("sync", onSyncNow)}
            />
            <ActionButton
              label={t("reconnect")}
              disabled={busyAction !== null || status.syncing}
              onClick={() => runAction("reconnect", onReconnect)}
            />
            <ActionButton
              label={t("changePassphrase")}
              disabled={busyAction !== null || status.syncing}
              onClick={() => runAction("passphrase", () => requirePassphraseAndRun(onChangePassphrase))}
            />
            <ActionButton
              label={t("resetRemote")}
              disabled={busyAction !== null || status.syncing}
              onClick={() => runAction("reset-remote", onResetRemote)}
            />
            <ActionButton
              label={t("disconnect")}
              disabled={busyAction !== null || status.syncing}
              onClick={() => runAction("disconnect", onDisconnect)}
            />
          </>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <ActionButton
          label={t("export")}
          disabled={busyAction !== null || status.syncing}
          onClick={async () => {
            triggerHaptic("light");
            onExport();
          }}
        />
        <ActionButton
          label={t("import")}
          disabled={busyAction !== null || status.syncing}
          onClick={async () => {
            triggerHaptic("light");
            fileInputRef.current?.click();
          }}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void runAction("import", () => onImport(file));
          event.currentTarget.value = "";
        }}
      />
      <p className="text-xs text-muted-faint">{t("hint")}</p>
    </section>
  );
});

function ActionButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => Promise<unknown>;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        void onClick();
      }}
      className="inline-flex h-10 items-center justify-center rounded-md border border-border-strong bg-surface px-3 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label}
    </button>
  );
}
