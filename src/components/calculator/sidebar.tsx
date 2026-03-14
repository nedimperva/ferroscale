"use client";

import { memo, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Theme } from "@/hooks/useTheme";
import { APP_VERSION } from "@/lib/changelog";
import { LanguageSwitcher } from "@/components/language-switcher";

interface SidebarProps {
  onOpenContact: () => void;
  onOpenCompare: () => void;
  onOpenProjects: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenQuickCalc: () => void;
  onOpenChangelog: () => void;
  compareCount: number;
  projectCount: number;
  isSettingsOpen: boolean;
  isHistoryOpen: boolean;
  isProjectsOpen: boolean;
  isCompareOpen: boolean;
  isContactOpen: boolean;
  isChangelogOpen: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export const Sidebar = memo(function Sidebar({
  onOpenContact,
  onOpenCompare,
  onOpenProjects,
  onOpenSettings,
  onOpenHistory,
  onOpenQuickCalc,
  onOpenChangelog,
  compareCount,
  projectCount,
  isSettingsOpen,
  isHistoryOpen,
  isProjectsOpen,
  isCompareOpen,
  isContactOpen,
  isChangelogOpen,
  collapsed,
  onToggleCollapsed,
  theme,
  onToggleTheme,
}: SidebarProps) {
  const t = useTranslations();

  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only client detection
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.userAgent));
  }, []);

  const quickCalcShortcut = isMac ? "⌘K" : "Ctrl+K";

  const width = collapsed ? "w-[56px]" : "w-[220px]";

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-surface transition-[width] duration-200 ease-in-out lg:flex ${width}`}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* ---- Branding ---- */}
      <div className={`flex items-center gap-3 pt-4 pb-3 ${collapsed ? "justify-center px-2" : "px-4"}`}>
        {/* Logo */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-inverted">
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
            {/* Support pillar */}
            <rect x="11.5" y="7.6" width="1" height="8.9" fill="currentColor" className="text-surface" />
            {/* Base plate */}
            <rect x="8" y="16.5" width="8" height="1.5" rx="0.5" fill="currentColor" className="text-surface" />
            {/* Balance beam */}
            <rect x="2" y="5" width="20" height="1.5" rx="0.5" fill="currentColor" className="text-surface" />
            {/* Central pivot knob */}
            <circle cx="12" cy="5.75" r="1.8" fill="currentColor" className="text-surface" />
            {/* Left suspension cord */}
            <rect x="2.8" y="6.5" width="1" height="4.5" fill="currentColor" className="text-surface" />
            {/* Right suspension cord */}
            <rect x="20.2" y="6.5" width="1" height="4.5" fill="currentColor" className="text-surface" />
            {/* Left weighing pan */}
            <ellipse cx="3.3" cy="11.8" rx="2.8" ry="1" fill="currentColor" className="text-surface" />
            {/* Right weighing pan */}
            <ellipse cx="20.7" cy="11.8" rx="2.8" ry="1" fill="currentColor" className="text-surface" />
            {/* Orange accent bar */}
            <rect x="2" y="21" width="20" height="1.5" rx="0.75" fill="#d97706" />
          </svg>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
              {t("sidebar.title")}
            </h1>
            <button
              type="button"
              onClick={onOpenChangelog}
              className={`inline-flex items-center gap-1 text-[10px] transition-colors hover:text-foreground-secondary ${isChangelogOpen ? "text-foreground-secondary" : "text-muted-faint"}`}
              title={t("sidebar.whatsNew")}
            >
              v{APP_VERSION}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className={`border-t border-border-faint ${collapsed ? "mx-2" : "mx-3"}`} />

      {/* ---- Navigation ---- */}
      <nav className={`flex flex-1 flex-col gap-0.5 pt-3 ${collapsed ? "px-1.5" : "px-3"}`}>
        {/* Quick Calculate */}
        <SidebarButton
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          }
          label={collapsed ? t("quickCalc.sidebarLabel") : `${t("quickCalc.sidebarLabel")}  ${quickCalcShortcut}`}
          collapsed={collapsed}
          onClick={onOpenQuickCalc}
        />
        <SidebarButton
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          }
          label={t("sidebar.settings")}
          active={isSettingsOpen}
          collapsed={collapsed}
          onClick={onOpenSettings}
        />
        <SidebarButton
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M12 7v5l4 2" />
            </svg>
          }
          label={t("sidebar.history")}
          active={isHistoryOpen}
          collapsed={collapsed}
          onClick={onOpenHistory}
        />
        <SidebarButton
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
            </svg>
          }
          label={t("sidebar.projects")}
          badge={projectCount > 0 ? projectCount : undefined}
          variant={projectCount > 0 ? "purple" : "default"}
          active={isProjectsOpen}
          collapsed={collapsed}
          onClick={onOpenProjects}
        />

        {compareCount > 0 && (
          <SidebarButton
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <rect x="3" y="3" width="7" height="18" rx="1" />
                <rect x="14" y="3" width="7" height="18" rx="1" />
              </svg>
            }
            label={t("sidebar.compareCount", { count: compareCount })}
            variant="blue"
            active={isCompareOpen}
            collapsed={collapsed}
            onClick={onOpenCompare}
          />
        )}

        {/* Spacer */}
        <div className="flex-1" />

        <div className={`border-t border-border-faint ${collapsed ? "mx-0.5" : "mx-1"} mt-1`} />

        <SidebarButton
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          }
          label={t("sidebar.reportIssue")}
          active={isContactOpen}
          collapsed={collapsed}
          onClick={onOpenContact}
        />

        <div className={`border-t border-border-faint ${collapsed ? "mx-0.5" : "mx-1"} mt-0.5`} />

        {!collapsed && (
          <div className="px-1 py-1.5">
            <LanguageSwitcher className="w-full justify-between" />
          </div>
        )}

        {/* Theme toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className={`flex w-full items-center rounded-lg text-sm font-medium text-muted-faint transition-colors hover:bg-surface-raised hover:text-foreground-secondary ${collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-2.5 py-2"
            }`}
          aria-label={
            theme === "light"
              ? t("theme.switchToDark")
              : theme === "dark"
                ? t("theme.switchToSystem")
                : t("theme.switchToLight")
          }
          title={
            theme === "light"
              ? t("theme.darkMode")
              : theme === "dark"
                ? t("theme.systemMode")
                : t("theme.lightMode")
          }
        >
          <span className="shrink-0">
            {theme === "light" ? (
              /* Moon icon */
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            ) : theme === "dark" ? (
              /* Sun icon */
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            ) : (
              /* System/auto icon (monitor) */
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <rect width="20" height="14" x="2" y="3" rx="2" />
                <path d="M8 21h8" />
                <path d="M12 17v4" />
              </svg>
            )}
          </span>
          {!collapsed && (
            <span className="truncate">
              {theme === "light"
                ? t("theme.darkMode")
                : theme === "dark"
                  ? t("theme.lightMode")
                  : t("theme.system")}
            </span>
          )}
        </button>

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex w-full items-center justify-center rounded-lg px-2.5 py-2 text-muted-faint transition-colors hover:bg-surface-raised hover:text-foreground-secondary"
          aria-label={collapsed ? t("theme.expandSidebar") : t("theme.collapseSidebar")}
          title={collapsed ? t("theme.expandSidebar") : t("theme.collapseSidebar")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
          >
            <path d="m11 17-5-5 5-5" />
            <path d="m18 17-5-5 5-5" />
          </svg>
        </button>

        <div className="h-2" />
      </nav>
    </aside>
  );
});

/* ---- Sidebar button sub-component ---- */

interface SidebarButtonProps {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  variant?: "default" | "blue" | "purple";
  active?: boolean;
  collapsed?: boolean;
  onClick: () => void;
}

function SidebarButton({
  icon,
  label,
  badge,
  variant = "default",
  active = false,
  collapsed = false,
  onClick,
}: SidebarButtonProps) {
  const variantClasses = {
    default: active
      ? "text-foreground bg-surface-inset"
      : "text-foreground-secondary hover:bg-surface-raised hover:text-foreground",
    blue: active
      ? "border border-blue-border text-blue-text bg-blue-surface"
      : "border border-blue-border text-blue-text bg-blue-surface/70 hover:bg-blue-surface",
    purple: active
      ? "text-purple-text bg-purple-surface"
      : "text-purple-text bg-purple-surface/60 hover:bg-purple-surface",
  };

  return (
    <div className="group relative">
      {/* Active left border accent */}
      {active && (
        <div className="absolute top-1 bottom-1 left-0 w-[3px] rounded-full bg-blue-strong" />
      )}
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center rounded-lg text-sm font-medium transition-colors ${collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-2.5 py-2"
          } ${variantClasses[variant]}`}
        aria-label={label}
      >
        <span className="shrink-0">{icon}</span>
        {!collapsed && <span className="truncate">{label}</span>}
        {!collapsed && badge !== undefined && (
          <span className="ml-auto shrink-0 rounded-full bg-surface-inset px-1.5 py-0.5 text-[10px] font-semibold text-foreground-secondary">
            {badge}
          </span>
        )}
      </button>

      {/* Custom tooltip — only visible when sidebar is collapsed */}
      {collapsed && (
        <span
          role="tooltip"
          className="pointer-events-none absolute top-1/2 left-full z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity delay-75 duration-150 group-hover:opacity-100 dark:bg-slate-700"
        >
          {/* Arrow */}
          <span className="absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 rotate-45 rounded-[1px] bg-slate-800 dark:bg-slate-700" />
          {label}
          {badge !== undefined && (
            <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">
              {badge}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
