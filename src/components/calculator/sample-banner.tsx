"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { createBoolStore } from "@/lib/external-stores";
import { triggerHaptic } from "@/lib/haptics";

const dismissedStore = createBoolStore("ferroscale-sample-banner-dismissed", false);
export const sampleBannerDismissedStore = dismissedStore;

interface Props {
  /** True when the calc has produced a real result — banner stays out of the way. */
  hasResult: boolean;
  /** Called when the user taps "Try a sample". The shell loads HEA 120 × 6 m S235JR. */
  onTrySample: () => void;
}

/**
 * One-time accent banner on the mobile calculator (review §11). Shows for
 * first-run users until they either tap "Try a sample" or dismiss it.
 * Hidden as soon as the calculator has a real result, regardless of
 * dismissal state.
 */
export function SampleBanner({ hasResult, onTrySample }: Props) {
  const t = useTranslations("sampleBanner");
  const dismissed = useSyncExternalStore(
    dismissedStore.subscribe,
    dismissedStore.getSnapshot,
    dismissedStore.getServerSnapshot,
  );

  if (dismissed || hasResult) return null;

  return (
    <div className="flex shrink-0 items-center gap-2.5 rounded-[var(--radius-control)] border border-accent-border bg-accent-surface px-3 py-2 text-accent-text">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-pad)] bg-accent text-white">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h7l-2 8 10-12h-7l2-8z" />
        </svg>
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-xs font-semibold">{t("title")}</span>
        <span className="truncate text-2xs text-accent-text/80">{t("hint")}</span>
      </div>
      <button
        type="button"
        onClick={() => {
          triggerHaptic("light");
          onTrySample();
          dismissedStore.set(true);
        }}
        className="inline-flex h-8 shrink-0 items-center rounded-[var(--radius-control)] bg-accent-text px-2.5 text-2xs font-semibold text-accent-surface active:opacity-90"
      >
        {t("cta")}
      </button>
      <button
        type="button"
        aria-label={t("dismiss")}
        onClick={() => dismissedStore.set(true)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-pad)] text-accent-text/70 hover:bg-accent-surface-strong"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
