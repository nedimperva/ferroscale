"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  downloadBackupFile,
  restoreBackupFile,
  validateBackupFile,
  type FerroscaleBackupFile,
} from "@/lib/backup/backup-file";

export function BackupSection() {
  const t = useTranslations("command");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingBackup, setPendingBackup] = useState<FerroscaleBackupFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccessMsg(null);

    try {
      const text = await file.text();
      const raw = JSON.parse(text) as unknown;
      const validated = validateBackupFile(raw);
      setPendingBackup(validated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("backup.invalidFile"));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleConfirmRestore = (mode: "merge" | "replace") => {
    if (!pendingBackup) return;
    try {
      const summary = restoreBackupFile(pendingBackup, mode);
      setPendingBackup(null);
      setSuccessMsg(
        t("backup.restoreSuccess", {
          saved: summary.savedCount,
          projects: summary.projectsCount,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("backup.restoreFailed"));
    }
  };

  const btnClass = "h-9 px-3.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer";
  const primaryBtn = `${btnClass} bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90`;
  const secondaryBtn = `${btnClass} border border-[var(--border-faint)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-foreground`;

  return (
    <div className="mt-4">
      <div className="text-[10px] font-bold tracking-[1.2px] text-muted uppercase mb-2 px-1">
        {t("backup.title")}
      </div>
      <div className="rounded-2xl border border-[var(--border-faint)] bg-[var(--surface-raised)] p-4 space-y-3">
        <p className="text-xs text-muted leading-relaxed">
          {t("backup.description")}
        </p>

        <div className="flex gap-2 flex-wrap items-center">
          <button
            type="button"
            onClick={() => downloadBackupFile()}
            className={primaryBtn}
          >
            {t("backup.downloadButton")}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={secondaryBtn}
          >
            {t("backup.restoreButton")}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            aria-label={t("backup.restoreButton")}
          />
        </div>

        {error && (
          <div
            className="rounded-xl p-2.5 text-xs"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "var(--red-strong, #ef4444)",
            }}
          >
            {error}
          </div>
        )}

        {successMsg && (
          <div
            className="rounded-xl p-2.5 text-xs"
            style={{
              background: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.25)",
              color: "var(--green-strong, #10b981)",
            }}
          >
            {successMsg}
          </div>
        )}

        {/* Restore confirmation modal / block */}
        {pendingBackup && (
          <div
            className="rounded-xl p-3.5 space-y-3"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--accent-border, var(--border))",
            }}
          >
            <div className="space-y-1">
              <div className="font-bold text-xs text-foreground">
                {t("backup.confirmTitle")}
              </div>
              <div className="text-[11.5px] font-mono text-muted">
                {t("backup.summaryInfo", {
                  saved: pendingBackup.data.saved.length,
                  projects: pendingBackup.data.projects.length,
                  priceBook: pendingBackup.data.priceBook.items.length,
                  date: new Date(pendingBackup.exportedAt).toLocaleDateString(),
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => handleConfirmRestore("merge")}
                className={primaryBtn}
              >
                {t("backup.mergeMode")}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmRestore("replace")}
                className={`${btnClass} bg-red-600 text-white hover:bg-red-700`}
              >
                {t("backup.replaceMode")}
              </button>
              <button
                type="button"
                onClick={() => setPendingBackup(null)}
                className={secondaryBtn}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
