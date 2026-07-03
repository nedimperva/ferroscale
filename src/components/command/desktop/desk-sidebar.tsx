"use client";

import { useTranslations } from "next-intl";
import { APP_VERSION } from "@/lib/changelog";
import { DeskIcon, Kbd } from "./desk-atoms";
import type { DeskView } from "./desktop-props";

function SidebarNavItem({
  active,
  onClick,
  label,
  icon,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-[11px] w-full rounded-[11px] text-left cursor-pointer"
      style={{
        padding: "9px 12px",
        background: active ? "var(--accent-surface)" : "transparent",
        color: active ? "var(--accent-text)" : "var(--foreground-secondary)",
      }}
    >
      <span className="flex" style={{ color: active ? "var(--accent)" : "var(--muted)" }}>
        {icon}
      </span>
      <span
        className="flex-1 text-[13.5px]"
        style={{ fontWeight: active ? 700 : 600, letterSpacing: -0.1 }}
      >
        {label}
      </span>
      {count != null && count > 0 && (
        <span
          className="font-mono text-[10.5px] font-bold px-[7px] py-[2px] rounded-full"
          style={{
            background: active ? "var(--surface)" : "var(--surface-inset)",
            color: active ? "var(--accent-text)" : "var(--muted)",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function DeskSidebar({
  dark,
  view,
  setView,
  counts,
  onToggleTheme,
}: {
  dark: boolean;
  view: DeskView;
  setView: (v: DeskView) => void;
  counts: { saved: number; projects: number; compare: number };
  onToggleTheme: () => void;
}) {
  const t = useTranslations("command");
  return (
    <aside
      className="flex flex-col flex-shrink-0"
      style={{
        width: 224,
        background: "var(--surface-raised)",
        borderRight: "1px solid var(--border-faint)",
        padding: "18px 12px 14px",
      }}
    >
      {/* brand */}
      <div className="flex items-center gap-2.5" style={{ padding: "0 6px 16px" }}>
        <div
          className="flex items-center justify-center flex-shrink-0 rounded-[9px]"
          style={{ width: 30, height: 30, background: "var(--accent)" }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              background: dark ? "#161109" : "#fff",
              borderRadius: 3,
            }}
          />
        </div>
        <div className="min-w-0">
          <div className="font-extrabold text-[15.5px] tracking-tight text-foreground">
            FerroScale
          </div>
          <div className="font-mono text-[9.5px] text-muted mt-px">
            command · v{APP_VERSION}
          </div>
        </div>
      </div>
      <div style={{ height: 1, background: "var(--border-faint)", margin: "0 2px" }} />

      <div
        className="text-[9.5px] font-bold text-muted-faint"
        style={{ letterSpacing: 1.3, padding: "14px 12px 6px" }}
      >
        {t("nav.workspace")}
      </div>
      <div className="flex flex-col gap-0.5">
        <SidebarNavItem
          active={view === "calc"}
          onClick={() => setView("calc")}
          label={t("nav.calculator")}
          icon={<DeskIcon name="calc" />}
        />
        <SidebarNavItem
          active={view === "saved"}
          onClick={() => setView("saved")}
          label={t("nav.saved")}
          icon={<DeskIcon name="saved" />}
          count={counts.saved}
        />
        <SidebarNavItem
          active={view === "projects"}
          onClick={() => setView("projects")}
          label={t("nav.projects")}
          icon={<DeskIcon name="projects" />}
          count={counts.projects}
        />
        <SidebarNavItem
          active={view === "compare"}
          onClick={() => setView("compare")}
          label={t("nav.compare")}
          icon={<DeskIcon name="compare" />}
          count={counts.compare}
        />
      </div>

      <div className="flex-1" />

      {/* shortcut hint */}
      <div
        className="flex items-center gap-2 rounded-[11px] mb-2.5"
        style={{ padding: "10px 12px", background: "var(--surface-inset)" }}
      >
        <Kbd>⌘K</Kbd>
        <span className="text-[11px] text-muted font-semibold">{t("common.newCalculation")}</span>
      </div>

      <div className="flex flex-col gap-0.5">
        <SidebarNavItem
          active={view === "settings"}
          onClick={() => setView("settings")}
          label={t("nav.settings")}
          icon={<DeskIcon name="settings" />}
        />
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex items-center gap-[11px] w-full rounded-[11px] text-left cursor-pointer text-foreground-secondary"
          style={{ padding: "9px 12px", background: "transparent" }}
        >
          <span className="flex text-muted">
            <DeskIcon name={dark ? "sun" : "moon"} />
          </span>
          <span className="flex-1 font-semibold text-[13.5px]">
            {dark ? t("settings.lightMode") : t("settings.darkMode")}
          </span>
        </button>
      </div>
    </aside>
  );
}

/* ───────────────────────── Topbar + atoms ───────────────────────── */

export function DeskTopbar({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-4 flex-shrink-0"
      style={{ padding: "20px 32px 16px", borderBottom: "1px solid var(--border-faint)" }}
    >
      <div className="min-w-0">
        <div className="font-extrabold text-xl text-foreground" style={{ letterSpacing: -0.4 }}>
          {title}
        </div>
        {subtitle && <div className="font-mono text-[11.5px] text-muted mt-0.5">{subtitle}</div>}
      </div>
      <div className="ml-auto flex items-center gap-2">{actions}</div>
    </div>
  );
}
