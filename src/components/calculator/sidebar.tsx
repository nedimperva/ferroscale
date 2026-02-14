"use client";

import { memo } from "react";
import { DATASET_VERSION } from "@/lib/datasets/version";

interface SidebarProps {
  onOpenContact: () => void;
  onOpenCompare: () => void;
  onOpenProjects: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  compareCount: number;
  projectCount: number;
}

export const Sidebar = memo(function Sidebar({
  onOpenContact,
  onOpenCompare,
  onOpenProjects,
  onOpenSettings,
  onOpenHistory,
  compareCount,
  projectCount,
}: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col border-r border-slate-200 bg-white lg:flex">
      {/* ---- Branding ---- */}
      <div className="px-5 pt-5 pb-4">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">
          Metal Calculator
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Weight &amp; price estimation
        </p>
        <span className="mt-1 inline-block text-[10px] text-slate-400">
          v{DATASET_VERSION}
        </span>
      </div>

      <div className="mx-4 border-t border-slate-100" />

      {/* ---- Navigation ---- */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-3">
        <SidebarButton
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          }
          label="Settings"
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
            onClick={onOpenCompare}
          />
        )}

        {/* Spacer */}
        <div className="flex-1" />

        <div className="mx-1 border-t border-slate-100" />

        <SidebarButton
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <rect width="20" height="16" x="2" y="4" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          }
          label="Report an issue"
          onClick={onOpenContact}
        />

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
  variant?: "default" | "blue" | "purple";
  onClick: () => void;
}

function SidebarButton({
  icon,
  label,
  badge,
  variant = "default",
  onClick,
}: SidebarButtonProps) {
  const variantClasses = {
    default: "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
    blue: "text-blue-700 bg-blue-50/60 hover:bg-blue-50",
    purple: "text-purple-700 bg-purple-50/60 hover:bg-purple-50",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${variantClasses[variant]}`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
      {badge !== undefined && (
        <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
          {badge}
        </span>
      )}
    </button>
  );
}
