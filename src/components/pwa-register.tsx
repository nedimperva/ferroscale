"use client";

import { useEffect, useSyncExternalStore } from "react";
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

export function PwaRegister() {
  const t = useTranslations("pwa");
  const isOffline = useSyncExternalStore(
    subscribeOnlineStatus,
    getOfflineSnapshot,
    getServerOfflineSnapshot,
  );

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed:", error);
      });
    }
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 border-b border-orange-300 bg-orange-100 px-4 py-2 text-center text-sm text-orange-950">
      {t("offlineBanner")}
    </div>
  );
}
