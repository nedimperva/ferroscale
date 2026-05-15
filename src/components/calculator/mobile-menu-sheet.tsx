"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import type { AppTabId } from "@/lib/app-shell";
import { triggerHaptic } from "@/lib/haptics";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTab: AppTabId;
  onNavigate: (tab: AppTabId) => void;
  onOpenChangelog: () => void;
  onOpenContact: () => void;
  onReplayOnboarding: () => void;
  projectCount: number;
}

interface MenuRow {
  id: string;
  label: string;
  detail?: string;
  badge?: number;
  active?: boolean;
  icon: React.ReactNode;
  onPress: () => void;
}

/**
 * Mobile nav menu — replaces the bottom tab bar. Opened from the
 * hamburger button in the mobile header. Surfaces the four primary
 * tabs plus the secondary entry points (Compare, Changelog, Contact,
 * Replay onboarding).
 */
export const MobileMenuSheet = memo(function MobileMenuSheet({
  open,
  onOpenChange,
  currentTab,
  onNavigate,
  onOpenChangelog,
  onOpenContact,
  onReplayOnboarding,
  projectCount,
}: Props) {
  const t = useTranslations();

  const handleClose = () => onOpenChange(false);

  const go = (tab: AppTabId) => () => {
    triggerHaptic("light");
    onNavigate(tab);
    handleClose();
  };

  const primary: MenuRow[] = [
    {
      id: "calculator",
      label: t("tabs.calculator"),
      active: currentTab === "calculator",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v17" />
          <path d="M2 7h4l3 9H2" />
          <path d="M15 7h4l3 9h-7" />
          <path d="M8 7h8" />
        </svg>
      ),
      onPress: go("calculator"),
    },
    {
      id: "projects",
      label: t("tabs.projects"),
      badge: projectCount > 0 ? projectCount : undefined,
      active: currentTab === "projects",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 20a2 2 0 002-2V8a2 2 0 00-2-2h-7.9a2 2 0 01-1.69-.9L9.6 3.9A2 2 0 008 3H4a2 2 0 00-2 2v13a2 2 0 002 2z" />
        </svg>
      ),
      onPress: go("projects"),
    },
    {
      id: "settings",
      label: t("tabs.settings"),
      active: currentTab === "settings",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09A1.65 1.65 0 0015 4.6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      ),
      onPress: go("settings"),
    },
  ];

  const secondary: MenuRow[] = [
    {
      id: "changelog",
      label: t("changelog.title"),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      ),
      onPress: () => {
        triggerHaptic("light");
        handleClose();
        onOpenChangelog();
      },
    },
    {
      id: "contact",
      label: t("sidebar.reportIssue"),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8z" />
        </svg>
      ),
      onPress: () => {
        triggerHaptic("light");
        handleClose();
        onOpenContact();
      },
    },
    {
      id: "replay",
      label: t("onboarding.replay"),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      ),
      onPress: () => {
        triggerHaptic("light");
        handleClose();
        onReplayOnboarding();
      },
    },
  ];

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={t("menu.title")}>
      <div className="flex flex-col gap-4 pb-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {primary.map((row, idx) => (
            <MenuRowButton
              key={row.id}
              row={row}
              isLast={idx === primary.length - 1}
            />
          ))}
        </div>

        <span className="px-1 text-2xs font-bold uppercase tracking-[0.14em] text-muted">
          {t("menu.more")}
        </span>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {secondary.map((row, idx) => (
            <MenuRowButton
              key={row.id}
              row={row}
              isLast={idx === secondary.length - 1}
            />
          ))}
        </div>
      </div>
    </BottomSheet>
  );
});

function MenuRowButton({ row, isLast }: { row: MenuRow; isLast: boolean }) {
  return (
    <button
      type="button"
      onClick={row.onPress}
      className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors active:bg-surface-raised ${
        !isLast ? "border-b border-border" : ""
      } ${row.active ? "bg-accent-surface" : ""}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          row.active
            ? "bg-accent text-white"
            : "bg-surface-raised text-foreground-secondary"
        }`}
      >
        {row.icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={`truncate text-sm font-semibold tracking-tight ${
            row.active ? "text-accent-text" : "text-foreground"
          }`}
        >
          {row.label}
        </span>
        {row.detail && (
          <span className="truncate text-2xs text-muted">{row.detail}</span>
        )}
      </span>
      {row.badge !== undefined && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-strong px-1.5 text-2xs font-bold text-white">
          {row.badge}
        </span>
      )}
      <svg
        width="7"
        height="12"
        viewBox="0 0 7 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-muted"
      >
        <path d="M1 1l5 5-5 5" />
      </svg>
    </button>
  );
}
