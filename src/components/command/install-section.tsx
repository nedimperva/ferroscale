"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { installPromptStore } from "@/lib/install-prompt";

/**
 * "Install app" card for both settings surfaces. Renders nothing unless the
 * browser has offered installability (Chromium's beforeinstallprompt) — so it
 * never nags, never shows when already installed, and stays out of Safari's way.
 */
export function InstallAppSection() {
  const t = useTranslations("pwa");
  const available = useSyncExternalStore(
    installPromptStore.subscribe,
    installPromptStore.getSnapshot,
    installPromptStore.getServerSnapshot,
  );
  if (!available) return null;

  return (
    <section className="mt-4">
      <div className="rounded-2xl border border-border-faint bg-[var(--surface-raised)] px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-foreground">{t("installTitle")}</h3>
          <p className="text-xs text-muted mt-1 leading-relaxed">{t("installBody")}</p>
        </div>
        <button
          type="button"
          onClick={() => void installPromptStore.promptInstall()}
          className="shrink-0 h-10 px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] font-bold text-sm"
        >
          {t("installButton")}
        </button>
      </div>
    </section>
  );
}
