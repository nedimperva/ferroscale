"use client";

import { memo } from "react";
import type { Theme } from "@/hooks/useTheme";
import { DATASET_VERSION } from "@/lib/datasets/version";

interface SidebarProps {
  onOpenContact: () => void;
  onOpenCompare: () => void;
  onOpenProjects: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  compareCount: number;
  projectCount: number;
  isSettingsOpen: boolean;
  isHistoryOpen: boolean;
  isProjectsOpen: boolean;
  isCompareOpen: boolean;
  isContactOpen: boolean;
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
  compareCount,
  projectCount,
  isSettingsOpen,
  isHistoryOpen,
  isProjectsOpen,
  isCompareOpen,
  isContactOpen,
  collapsed,
  onToggleCollapsed,
  theme,
  onToggleTheme,
}: SidebarProps) {

  const width = collapsed ? "w-[56px]" : "w-[220px]";

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-surface transition-[width] duration-200 ease-in-out lg:flex ${width}`}
    >
      {/* ---- Branding ---- */}
      <div className={`flex items-center gap-3 pt-4 pb-3 ${collapsed ? "justify-center px-2" : "px-4"}`}>
        {/* Logo */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-inverted">
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
            <path
              d="M4 6h2.5l5.5 8 5.5-8H20v12h-2.5v-7.5L12 18.5 6.5 10.5V18H4V6z"
              fill="currentColor"
              className="text-surface"
            />
            <rect x="4" y="19" width="16" height="1.5" rx="0.75" fill="#d97706" />
          </svg>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
              Metal Calculator
            </h1>
            <span className="text-[10px] text-muted-faint">
              v{DATASET_VERSION}
            </span>
          </div>
        )}
      </div>

      <div className={`border-t border-border-faint ${collapsed ? "mx-2" : "mx-3"}`} />

      {/* ---- Navigation ---- */}
      <nav className={`flex flex-1 flex-col gap-0.5 pt-3 ${collapsed ? "px-1.5" : "px-3"}`}>
        <SidebarButton
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          }
          label="Settings"
          active={isSettingsOpen}
          collapsed={collapsed}
          onClick={onOpenSettings}
        />
        <SidebarButton
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M12 7v5l4 2"/>
            </svg>
          }
          label="History"
          active={isHistoryOpen}
          collapsed={collapsed}
          onClick={onOpenHistory}
        />
        <SidebarButton
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>
            </svg>
          }
          label="Projects"
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
                <rect x="3" y="3" width="7" height="18" rx="1"/>
                <rect x="14" y="3" width="7" height="18" rx="1"/>
              </svg>
            }
            label={`Compare (${compareCount})`}
            variant="blue"
            active={isCompareOpen}
            collapsed={collapsed}
            onClick={onOpenCompare}
          />
        )}

        {/* Spacer */}
        <div className="flex-1" />

        <div className={`border-t border-border-faint ${collapsed ? "mx-0.5" : "mx-1"}`} />

        <SidebarButton
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <rect width="20" height="16" x="2" y="4" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          }
          label="Report an issue"
          active={isContactOpen}
          collapsed={collapsed}
          onClick={onOpenContact}
        />

        <div className={`border-t border-border-faint ${collapsed ? "mx-0.5" : "mx-1"} mt-0.5`} />

        {/* Theme toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className={`flex w-full items-center rounded-lg text-sm font-medium text-muted-faint transition-colors hover:bg-surface-raised hover:text-foreground-secondary ${
            collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-2.5 py-2"
          }`}
          aria-label={theme === "light" ? "Switch to dark mode" : theme === "dark" ? "Switch to system mode" : "Switch to light mode"}
          title={theme === "light" ? "Dark mode" : theme === "dark" ? "System mode" : "Light mode"}
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
              {theme === "light" ? "Dark mode" : theme === "dark" ? "Light mode" : "System"}
            </span>
          )}
        </button>

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex w-full items-center justify-center rounded-lg px-2.5 py-2 text-muted-faint transition-colors hover:bg-surface-raised hover:text-foreground-secondary"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
      ? "text-blue-text bg-blue-surface"
      : "text-blue-text bg-blue-surface/60 hover:bg-blue-surface",
    purple: active
      ? "text-purple-text bg-purple-surface"
      : "text-purple-text bg-purple-surface/60 hover:bg-purple-surface",
  };

  return (
    <div className="relative">
      {/* Active left border accent */}
      {active && (
        <div className="absolute top-1 bottom-1 left-0 w-[3px] rounded-full bg-blue-strong" />
      )}
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center rounded-lg text-sm font-medium transition-colors ${
          collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-2.5 py-2"
        } ${variantClasses[variant]}`}
        title={collapsed ? label : undefined}
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
    </div>
  );
}
