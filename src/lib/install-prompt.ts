"use client";

/**
 * Captures the browser's deferred `beforeinstallprompt` event so Settings can
 * offer a user-initiated "Install app" action. Deliberately NOT a banner —
 * that was tried and felt nag-y (see pwa-register.tsx); the affordance only
 * appears where the user goes looking for it.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Stop the mini-infobar; we surface installation in Settings instead.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

export const installPromptStore = {
  subscribe(callback: () => void): () => void {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
  getSnapshot(): boolean {
    return deferredPrompt != null;
  },
  getServerSnapshot(): boolean {
    return false;
  },
  /** Shows the native install dialog. Resolves true when the user accepts. */
  async promptInstall(): Promise<boolean> {
    const event = deferredPrompt;
    if (!event) return false;
    // The event is single-use either way; Chromium re-fires it later if dismissed.
    deferredPrompt = null;
    notify();
    await event.prompt();
    const choice = await event.userChoice;
    return choice.outcome === "accepted";
  },
};
