"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { triggerHaptic } from "@/lib/haptics";
import type { AppTabId } from "@/lib/app-shell";
import { useHydrated } from "@/hooks/useHydrated";

interface BottomTabBarProps {
  activeTab: AppTabId;
  onTabChange: (tab: AppTabId) => void;
  projectCount?: number;
  compareCount?: number;
  savedCount?: number;
}

/**
 * Persistent bottom tab bar for mobile (< lg).
 * Provides native-app-style navigation with 4 primary tabs.
 */
export const BottomTabBar = memo(function BottomTabBar({
  activeTab,
  onTabChange,
  projectCount = 0,
  savedCount = 0,
}: BottomTabBarProps) {
  const t = useTranslations("tabs");
  const isHydrated = useHydrated();

  const tabs: { id: AppTabId; label: string; badge?: number }[] = [
    { id: "calculator", label: t("calculator") },
    { id: "saved", label: t("saved"), badge: savedCount > 0 ? savedCount : undefined },
    { id: "projects", label: t("projects"), badge: projectCount > 0 ? projectCount : undefined },
    { id: "settings", label: t("settings") },
  ];

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex: number | null = null;
    if (e.key === "ArrowLeft") {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
    } else if (e.key === "ArrowRight") {
      nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
    }
    if (nextIndex !== null) {
      e.preventDefault();
      triggerHaptic("light");
      onTabChange(tabs[nextIndex]!.id);
    }
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex max-w-lg items-stretch" role="tablist">
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onTabChange(tab.id);
              }}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`relative flex flex-1 flex-col items-center gap-0 pb-1 pt-1.5 text-2xs font-medium transition-colors ${
                isActive
                  ? "text-accent"
                  : "text-muted-faint"
              }`}
              aria-label={tab.label}
              aria-controls={`tabpanel-${tab.id}`}
              aria-selected={isActive}
              role="tab"
              tabIndex={isActive ? 0 : -1}
            >
              {/* Animated active indicator bar — slides between tabs */}
              {isActive && (
                <motion.span
                  layoutId="tab-indicator"
                  className="absolute inset-x-4 top-0 h-[2px] rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative">
                <TabIcon id={tab.id} active={isActive} />
                {isHydrated && tab.badge !== undefined && (
                  <span className="absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-purple-strong px-1 text-2xs font-bold leading-none text-white">
                    {tab.badge}
                  </span>
                )}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});

/* ---- Tab icons ---- */

function TabIcon({ id, active }: { id: AppTabId; active: boolean }) {
  const cls = `h-5 w-5 ${active ? "stroke-accent" : "stroke-current"}`;
  const fill = active ? "currentColor" : "none";

  switch (id) {
    case "calculator":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          {/* Scale icon */}
          <path d="M12 3v17" />
          <path d="M2 7h4l3 9H2" />
          <path d="M15 7h4l3 9h-7" />
          <path d="M8 7h8" />
        </svg>
      );
    case "saved":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
      );
    case "projects":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? fill : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
        </svg>
      );
    case "settings":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
  }
}
