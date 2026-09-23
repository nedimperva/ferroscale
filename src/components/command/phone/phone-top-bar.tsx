"use client";

import { useTranslations } from "next-intl";
import type { SyncAttention } from "@/lib/sync/types";
import { IconBtn } from "./phone-atoms";

/** The phone shell's header: the mark, the title, and its four doors. */
export function PhoneTopBar({
  onToggleTheme,
  onOpenLibrary,
  onOpenSettings,
  syncAttention,
}: {
  onToggleTheme: () => void;
  onOpenLibrary: (tab: "saved" | "projects") => void;
  onOpenSettings: () => void;
  syncAttention: SyncAttention | null;
}) {
  const t = useTranslations("command");
  return (
    <div className="flex items-center justify-between px-[18px] pt-1 pb-2">
      <div className="flex items-center gap-2.5">
        <div
          className="w-6 h-6 rounded-none flex items-center justify-center"
          style={{ background: "var(--accent)" }}
        >
          <span
            className="w-2.5 h-2.5"
            style={{
              background: "var(--accent-contrast)",
            }}
          />
        </div>
        {/* The phone shell's only title, and so the page's h1. The
            workspace gets one from DeskViewHeader; this surface had
            none, which left the whole app without a heading outline. */}
        <h1 className="text-[17px] font-extrabold tracking-tight">
          FerroScale
        </h1>
      </div>
      <div className="flex gap-1.5">
        <IconBtn onClick={onToggleTheme} ariaLabel={t("aria.toggleTheme")}>
          {/* Both glyphs ship and CSS picks one. Choosing in JS from the
              resolved theme meant the server drew the moon and a
              dark-mode client drew the sun, which failed hydration and
              made React discard and rebuild the whole shell. The `.dark`
              class is on <html> before first paint, so the right glyph is
              the first one drawn. */}
          <svg aria-hidden="true" className="hidden dark:block" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
          </svg>
          <svg aria-hidden="true" className="block dark:hidden" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
          </svg>
        </IconBtn>
        {/* The workspace rail's destinations, named the same way. One
            bookmark glyph used to stand for Parts, Projects, Compare and
            the session tape at once, so the two surfaces disagreed about
            what the app even contains. */}
        <IconBtn
          onClick={() => onOpenLibrary("saved")}
          ariaLabel={t("nav.parts")}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
        </IconBtn>
        <IconBtn
          onClick={() => onOpenLibrary("projects")}
          ariaLabel={t("nav.projects")}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
        </IconBtn>
        <IconBtn
          onClick={onOpenSettings}
          ariaLabel={t("nav.settings")}
          alert={
            syncAttention === "reconnect"
              ? t("sync.attentionReconnect")
              : syncAttention === "passphrase"
                ? t("sync.attentionPassphrase")
                : null
          }
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </IconBtn>
      </div>
    </div>
  );
}
