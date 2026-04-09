"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

// Extend Window to include the non-standard beforeinstallprompt event.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
}

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

type BannerState = "offline" | "update" | "ready" | "install" | null;

interface PwaRegisterProps {
  onOpenChangelog?: () => void;
}

export function PwaRegister({ onOpenChangelog }: PwaRegisterProps) {
  const t = useTranslations("pwa");
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [banner, setBanner] = useState<BannerState>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

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

  // Capture the browser's install prompt so we can show it at the right moment.
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Only show the install banner if nothing more important is showing.
      setBanner((prev) => (prev === null ? "install" : prev));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  // Offline state always takes priority over everything else.
  const activeBanner: BannerState = isOffline ? "offline" : banner;

  function handleUpdate() {
    const reg = registrationRef.current;
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  }

  async function handleInstall() {
    if (!installPrompt) return;
    const result = await installPrompt.prompt();
    setInstallPrompt(null);
    if (result?.outcome === "accepted") {
      setBanner(null);
    } else {
      setBanner(null);
    }
  }

  if (activeBanner === "offline") {
    return (
      <div className="sticky top-0 z-50 border-b border-orange-300 bg-orange-100 px-4 py-2 text-center text-sm text-orange-950 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-100">
        {t("offlineBanner")}
      </div>
    );
  }

  if (activeBanner === "update") {
    return (
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100">
        <span className="min-w-0 flex-1">{t("updateAvailable")}</span>
        <div className="flex shrink-0 items-center gap-2">
          {onOpenChangelog && (
            <button
              type="button"
              onClick={onOpenChangelog}
              className="rounded border border-blue-300 bg-white/80 px-2.5 py-1 text-xs font-semibold text-blue-900 hover:bg-white dark:border-blue-700 dark:bg-blue-900/60 dark:text-blue-100 dark:hover:bg-blue-900"
            >
              {t("whatsNew")}
            </button>
          )}
          <button
            type="button"
            onClick={handleUpdate}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            {t("updateNow")}
          </button>
        </div>
      </div>
    );
  }

  if (activeBanner === "ready") {
    return (
      <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-green-200 bg-green-50 px-4 py-2 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100">
        <span>{t("readyForOffline")}</span>
        <button
          onClick={() => setBanner(null)}
          aria-label={t("dismiss")}
          className="shrink-0 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
        >
          ✕
        </button>
      </div>
    );
  }

  if (activeBanner === "install" && installPrompt) {
    return (
      <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
        <span>{t("installPrompt")}</span>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleInstall}
            className="rounded bg-slate-800 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500"
          >
            {t("installNow")}
          </button>
          <button
            onClick={() => setBanner(null)}
            aria-label={t("dismiss")}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return null;
}
