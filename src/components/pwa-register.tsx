"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

function subscribeOnlineStatus(onStoreChange: () => void): () => void {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);

  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getOfflineSnapshot(): boolean {
  return !navigator.onLine;
}

function getServerOfflineSnapshot(): boolean {
  return false;
}

type BannerState = "offline" | "update" | "ready" | null;

interface PwaRegisterProps {
  onOpenChangelog?: () => void;
}

export function PwaRegister({ onOpenChangelog }: PwaRegisterProps) {
  const t = useTranslations("pwa");
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [banner, setBanner] = useState<BannerState>(null);

  const isOffline = useSyncExternalStore(
    subscribeOnlineStatus,
    getOfflineSnapshot,
    getServerOfflineSnapshot,
  );

  // Service worker registration + update/ready detection.
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registrationRef.current = registration;

        // Already waiting from a previous update check.
        if (registration.waiting) {
          setBanner("update");
          return;
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state !== "installed") return;

            if (navigator.serviceWorker.controller) {
              // A previous SW was active — this is an update.
              setBanner("update");
            } else {
              // First install — app is now cached for offline use.
              setBanner("ready");
            }
          });
        });
      })
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });

    // After SKIP_WAITING the controller changes — reload so the new SW takes over.
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  // Auto-dismiss the "ready for offline" notification after 5 s.
  useEffect(() => {
    if (banner === "ready") {
      const timer = setTimeout(() => setBanner(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [banner]);

  // Installation is deliberately NOT a banner here — it felt nag-y. The
  // deferred beforeinstallprompt is captured in lib/install-prompt.ts and
  // surfaced as a user-initiated action in Settings (InstallAppSection).

  // Offline state always takes priority over everything else.
  const activeBanner: BannerState = isOffline ? "offline" : banner;

  function handleUpdate() {
    const reg = registrationRef.current;
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  }

  if (activeBanner === "offline") {
    return (
      <div role="status" className="sticky top-0 z-50 border-b border-[var(--amber-border)] bg-[var(--amber-surface)] px-4 py-2 text-center text-sm text-[var(--amber-text)]">
        {t("offlineBanner")}
      </div>
    );
  }

  if (activeBanner === "update") {
    return (
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--blue-border)] bg-[var(--blue-surface)] px-4 py-2 text-sm text-[var(--blue-text)]">
        <span role="status" className="min-w-0 flex-1">{t("updateAvailable")}</span>
        <div className="flex shrink-0 items-center gap-2">
          {onOpenChangelog && (
            <button
              type="button"
              onClick={onOpenChangelog}
              className="rounded border border-[var(--blue-border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--blue-text)] hover:bg-[var(--surface-raised)]"
            >
              {t("whatsNew")}
            </button>
          )}
          <button
            type="button"
            onClick={handleUpdate}
            className="rounded bg-[var(--blue-strong)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--blue-strong-hover)]"
          >
            {t("updateNow")}
          </button>
        </div>
      </div>
    );
  }

  if (activeBanner === "ready") {
    return (
      <div role="status" className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-[var(--green-border)] bg-[var(--green-surface)] px-4 py-2 text-sm text-[var(--green-text)]">
        <span>{t("readyForOffline")}</span>
        <button
          onClick={() => setBanner(null)}
          aria-label={t("dismiss")}
          className="shrink-0 text-[var(--green-text)] hover:text-foreground"
        >
          ✕
        </button>
      </div>
    );
  }

  return null;
}
