"use client";

import { useEffect, useState } from "react";

/** Small blue WASTE/VAT badge shown next to the equation line. */
export function PricingBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-sans text-[9.5px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded bg-[var(--blue-surface)] text-[var(--blue-text)] whitespace-nowrap">
      {children}
    </span>
  );
}

/**
 * Transient confirmation toast ("Saved", "Link copied", …). The positioned
 * wrapper is a persistent polite live region so screen readers announce the
 * text swap; only the visible card is conditional.
 */
export function CommandToast({
  toast,
  bottom,
  dark,
}: {
  toast: string | null;
  bottom: number;
  dark: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute left-0 right-0 flex justify-center z-[60] pointer-events-none"
      style={{ bottom }}
    >
      {toast && (
      <div
        className="flex items-center gap-2 px-[18px] py-[11px] rounded-2xl font-bold text-sm"
        style={{
          background: "var(--foreground)",
          color: "var(--background)",
          boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
        }}
      >
        <span
          className="flex w-5 h-5 rounded-full items-center justify-center"
          style={{ background: "var(--green-text)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={dark ? "#102a1e" : "#fff"} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
        {toast}
      </div>
      )}
    </div>
  );
}

/**
 * Visually-hidden polite live region announcing the settled result. The
 * debounce resets on every keystroke so only stable results are announced;
 * identical text produces no DOM change and therefore no re-announcement.
 */
export function ResultAnnouncer({ text }: { text: string }) {
  const [announced, setAnnounced] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => setAnnounced(text), 600);
    return () => window.clearTimeout(id);
  }, [text]);
  return (
    <div className="sr-only" aria-live="polite">
      {announced}
    </div>
  );
}
