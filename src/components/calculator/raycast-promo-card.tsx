"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

/* ---- Dismissed store (persisted to localStorage) ---- */
const STORAGE_KEY = "ferroscale-raycast-promo-dismissed";
let _listeners: Array<() => void> = [];

function subscribe(cb: () => void) {
  _listeners = [..._listeners, cb];
  return () => { _listeners = _listeners.filter((l) => l !== cb); };
}

function getSnapshot(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return false; }
}

function getServerSnapshot(): boolean { return false; }

function dismiss() {
  try { localStorage.setItem(STORAGE_KEY, "true"); } catch { /* noop */ }
  for (const l of _listeners) l();
}

/* Raycast logo – simplified mark */
function RaycastIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M128.7 268.8l-47.3-47.3L0 302.9l47.3 47.3 81.4-81.4z" fill="#FF6363" />
      <path d="M209 302.9l-47.3 47.3 81.4 81.4 47.3-47.3L209 302.9z" fill="#FF6363" />
      <path d="M268.8 383.3L302.9 349l-93.9-93.9-47.3 47.3 107 81z" fill="#FF6363" />
      <path d="M383.3 128.7L349 162.8l-93.9 93.9 47.3 47.3 81-107z" fill="#FF6363" />
      <path d="M349 162.8l34.3-34.1L302.9 0l-81.4 81.4 93.4 47.3 34.1 34.1z" fill="#FF6363" />
      <path d="M162.8 349L128.7 383.3 209 512l81.4-81.4-93.5-47.5L162.8 349z" fill="#FF6363" />
      <path d="M256 209L209 256l93.9 93.9L512 209H256z" fill="#FF6363" />
      <path d="M256 302.9L0 302.9v-93.8L256 209v93.9z" fill="#FF6363" />
    </svg>
  );
}

export function RaycastPromoSidebar({ collapsed }: { collapsed: boolean }) {
  const t = useTranslations("raycast");
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (dismissed) return null;

  /* ---- Collapsed: icon-only with tooltip on hover ---- */
  if (collapsed) {
    return (
      <div className="group relative px-1.5">
        <a
          href="https://github.com/nedimperva/ferroscale/releases"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center rounded-lg py-2 text-muted-faint transition-colors hover:bg-surface-raised hover:text-foreground-secondary"
          aria-label={t("title")}
        >
          <RaycastIcon className="h-4 w-4" />
        </a>

        {/* Tooltip */}
        <span
          role="tooltip"
          className="pointer-events-none absolute top-1/2 left-full z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity delay-75 duration-150 group-hover:opacity-100 dark:bg-slate-700"
        >
          <span className="absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 rotate-45 rounded-[1px] bg-slate-800 dark:bg-slate-700" />
          {t("title")}
        </span>
      </div>
    );
  }

  /* ---- Expanded: compact promo banner ---- */
  return (
    <div className="mx-3 rounded-lg border border-border-faint bg-surface-raised/50 p-2.5">
      <div className="flex items-start gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-inset">
          <RaycastIcon className="h-3.5 w-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium leading-snug text-foreground-secondary">
            {t("title")}
          </p>
          <p className="mt-0.5 text-[11px] leading-tight text-muted">
            {t("description")}
          </p>
        </div>

        {/* Dismiss × */}
        <button
          type="button"
          onClick={dismiss}
          className="-mt-0.5 -mr-0.5 shrink-0 rounded p-0.5 text-muted-faint transition-colors hover:bg-surface-inset hover:text-foreground-secondary"
          aria-label={t("dismiss")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      {/* Download link */}
      <a
        href="https://github.com/nedimperva/ferroscale/releases"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-surface-inset px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-surface-raised"
      >
        {t("download")}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
          <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5zm7.25-.75a.75.75 0 01.75-.75h3.5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V6.31l-5.47 5.47a.75.75 0 01-1.06-1.06l5.47-5.47H12.25a.75.75 0 01-.75-.75z" clipRule="evenodd" />
        </svg>
      </a>
    </div>
  );
}
