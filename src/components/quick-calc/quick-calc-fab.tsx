"use client";

import { useTranslations } from "next-intl";
import { triggerHaptic } from "@/lib/haptics";

interface Props {
  onOpen: () => void;
}

/**
 * Floating action button for Quick Calc on non-calculator mobile routes
 * (review §04). Bottom-right, 56px, accent. The most powerful feature
 * lives behind ⌘K on desktop and was previously hidden on mobile; this
 * surfaces it without crowding the header.
 *
 * Only render on routes that don't already own a bottom-right FAB
 * (Calculator has the numpad's Save key, Projects has + Create).
 */
export function QuickCalcFab({ onOpen }: Props) {
  const t = useTranslations("quickCalc");
  return (
    <button
      type="button"
      onClick={() => {
        triggerHaptic("light");
        onOpen();
      }}
      aria-label={t("sidebarLabel")}
      className="fixed bottom-6 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-[var(--panel-shadow-strong)] active:bg-accent-hover lg:hidden"
      style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    </button>
  );
}
