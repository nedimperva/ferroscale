"use client";

import { memo, useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { Theme } from "@/hooks/useTheme";
import { APP_VERSION } from "@/lib/changelog";
import { LanguageSwitcher } from "@/components/language-switcher";

interface SidebarProps {
  onOpenContact: () => void;
  onOpenCalculator: () => void;
  onOpenSaved: () => void;
  onOpenProjects: () => void;
  onOpenCompare: () => void;
  onOpenSettings: () => void;
  onOpenQuickCalc: () => void;
  onOpenChangelog: () => void;
  projectCount: number;
  savedCount: number;
  compareCount: number;
  isCalculatorOpen: boolean;
  isSavedOpen: boolean;
  isSettingsOpen: boolean;
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
  onOpenCalculator,
  onOpenSaved,
  onOpenProjects,
  onOpenCompare,
  onOpenSettings,
  onOpenQuickCalc,
  onOpenChangelog,
  projectCount,
  savedCount,
  compareCount,
  isCalculatorOpen,
  isSavedOpen,
  isSettingsOpen,
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
      className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border-faint bg-linear-to-b from-surface via-surface to-surface-raised/60 shadow-[10px_0_30px_rgba(20,18,15,0.06)] transition-[width] duration-200 ease-in-out lg:flex ${width}`}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* ---- Branding ---- */}
      <div className={`flex items-center gap-3 pt-5 pb-4 ${collapsed ? "justify-center px-2" : "px-4"}`}>
        {/* Logo */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-inverted shadow-[0_10px_24px_rgba(20,18,15,0.16)]">
          <Image
            src="/icon-192.png"
            alt=""
            width={40}
            height={40}
            className="h-full w-full rounded-xl"
          />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
              {t("sidebar.title")}
            </h1>
            <button
              type="button"
              onClick={onOpenChangelog}
              className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-2xs transition-colors hover:bg-surface-raised hover:text-foreground-secondary ${isChangelogOpen ? "bg-surface-raised text-foreground-secondary" : "text-muted-faint"}`}
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

      <div className={`border-t border-border-faint ${collapsed ? "mx-2" : "mx-4"}`} />

      {/* ---- Navigation ---- */}
      <nav className={`flex flex-1 flex-col gap-1 pt-4 ${collapsed ? "px-2" : "px-3.5"}`}>
        {/* Workspace — tools */}
        {!collapsed && (
          <span className="px-3 pb-1 pt-1 text-[0.625rem] font-bold uppercase tracking-[var(--label-tracking)] text-muted-faint">
            {t("sidebar.workspaceGroup")}
          </span>
        )}
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
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <path d="M8 7h8" />
              <path d="M8 12h2" />
              <path d="M12 12h2" />
              <path d="M16 12h.01" />
              <path d="M8 16h2" />
              <path d="M12 16h2" />
              <path d="M16 16h.01" />
            </svg>
          }
          label={t("sidebar.calculator")}
          active={isCalculatorOpen}
          collapsed={collapsed}
          onClick={onOpenCalculator}
        />

        {/* Library — storage */}
        {!collapsed && (
          <span className="px-3 pb-1 pt-3 text-[0.625rem] font-bold uppercase tracking-[var(--label-tracking)] text-muted-faint">
            {t("sidebar.libraryGroup")}
          </span>
        )}
        <SidebarButton
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
          }
          label={t("sidebar.saved")}
          badge={savedCount > 0 ? savedCount : undefined}
          active={isSavedOpen}
          collapsed={collapsed}
          onClick={onOpenSaved}
        />
        <SidebarButton
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
            </svg>
          }
          label={t("sidebar.projects")}
          badge={projectCount > 0 ? projectCount : undefined}
          badgeTone="purple"
          active={isProjectsOpen}
          collapsed={collapsed}
          onClick={onOpenProjects}
        />
        <SidebarButton
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <rect x="3" y="3" width="7" height="18" rx="1" />
              <rect x="14" y="3" width="7" height="18" rx="1" />
            </svg>
          }
          label={t("sidebar.compare")}
          badge={compareCount > 0 ? compareCount : undefined}
          active={isCompareOpen}
          collapsed={collapsed}
          onClick={onOpenCompare}
        />

        {/* Spacer */}
        <div className="flex-1" />

        <div className={`mt-2 border-t border-border-faint ${collapsed ? "mx-0.5" : "mx-1"}`} />

        {/* Footer — Settings + low-frequency actions live here (review §05) */}
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
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          }
          label={t("sidebar.reportIssue")}
          active={isContactOpen}
          collapsed={collapsed}
          onClick={onOpenContact}
        />

        <div className={`mt-1 border-t border-border-faint ${collapsed ? "mx-0.5" : "mx-1"}`} />

        {!collapsed && (
          <div className="panel-raised px-2 py-2">
            <LanguageSwitcher className="w-full justify-between" />
          </div>
        )}

        {/* Theme toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className={`premium-action-button flex w-full items-center border border-transparent text-sm font-medium text-muted-faint transition-colors hover:bg-surface-raised hover:text-foreground-secondary ${collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2.5"
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

        {/* Collapse toggle — wrapped in a tooltip-capable group so collapsed
            users see "Expand sidebar" hover hint the same way nav items do. */}
        <div className="group relative">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="premium-action-button flex w-full items-center justify-center border border-transparent px-2.5 py-2.5 text-muted-faint transition-colors hover:bg-surface-raised hover:text-foreground-secondary"
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
          {collapsed && (
            <span
              role="tooltip"
              className="pointer-events-none absolute top-1/2 left-full z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground opacity-0 shadow-[0_16px_36px_rgba(20,18,15,0.12)] transition-opacity delay-75 duration-150 group-hover:opacity-100"
            >
              <span className="absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 rotate-45 border-l border-b border-border bg-surface" />
              {t("theme.expandSidebar")}
            </span>
          )}
        </div>

        <div className="h-3" />
      </nav>
    </aside>
  );
});

/* ---- Sidebar button sub-component ---- */

interface SidebarButtonProps {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  /** Color of the count badge — does NOT change the button chrome. */
  badgeTone?: "default" | "purple";
  variant?: "default" | "blue" | "purple";
  active?: boolean;
  collapsed?: boolean;
  onClick: () => void;
}

function SidebarButton({
  icon,
  label,
  badge,
  badgeTone = "default",
  variant = "default",
  active = false,
  collapsed = false,
  onClick,
}: SidebarButtonProps) {
  const variantClasses = {
    default: active
      ? "border-border bg-surface-raised text-foreground shadow-[var(--panel-highlight)]"
      : "border-transparent text-foreground-secondary hover:bg-surface-raised hover:text-foreground",
    blue: active
      ? "border border-blue-border text-blue-text bg-blue-surface"
      : "border border-blue-border/70 text-blue-text bg-blue-surface/65 hover:bg-blue-surface",
    purple: active
      ? "border border-purple-border text-purple-text bg-purple-surface"
      : "border border-purple-border/70 text-purple-text bg-purple-surface/60 hover:bg-purple-surface",
  };

  return (
    <div className="group relative">
      {/* Active left border accent */}
      {active && (
        <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-accent" />
      )}
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center rounded-xl border text-sm font-medium transition-colors ${collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2.5"
          } ${variantClasses[variant]}`}
        aria-label={label}
      >
        <span className="shrink-0">{icon}</span>
        {!collapsed && <span className="truncate">{label}</span>}
        {!collapsed && badge !== undefined && (
          <span
            className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-2xs font-semibold shadow-[var(--panel-highlight)] ${
              badgeTone === "purple"
                ? "border border-purple-border bg-purple-surface text-purple-text"
                : "bg-surface text-foreground-secondary"
            }`}
          >
            {badge}
          </span>
        )}
      </button>

      {/* Custom tooltip — only visible when sidebar is collapsed */}
      {collapsed && (
        <span
          role="tooltip"
          className="pointer-events-none absolute top-1/2 left-full z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground opacity-0 shadow-[0_16px_36px_rgba(20,18,15,0.12)] transition-opacity delay-75 duration-150 group-hover:opacity-100"
        >
          {/* Arrow */}
          <span className="absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 rotate-45 border-l border-b border-border bg-surface" />
          {label}
          {badge !== undefined && (
            <span className="ml-1.5 rounded-full bg-surface-raised px-1.5 py-0.5 text-2xs font-semibold text-foreground-secondary">
              {badge}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
