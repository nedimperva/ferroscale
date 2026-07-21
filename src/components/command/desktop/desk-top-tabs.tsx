"use client";

import { useTranslations } from "next-intl";
import { DeskIcon, Kbd } from "./desk-atoms";
import type { DeskView } from "./desktop-props";

function TopTab({
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
      aria-current={active ? "page" : undefined}
      className="flex items-center gap-[7px] rounded-lg cursor-pointer whitespace-nowrap"
      style={{
        padding: "7px 14px",
        background: active ? "var(--surface)" : "transparent",
        color: active ? "var(--accent-text)" : "var(--muted)",
        fontSize: 13,
        fontWeight: active ? 700 : 600,
        boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
      }}
    >
      <span className="flex" style={{ color: active ? "var(--accent)" : "var(--muted)" }}>
        {icon}
      </span>
      {label}
      {count != null && count > 0 && (
        <span
          className="font-mono text-[10px] font-bold rounded-full"
          style={{
            padding: "1px 6px",
            background: active ? "var(--surface-inset)" : "var(--surface)",
            color: "var(--muted)",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function TopIconBtn({
  onClick,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex items-center justify-center rounded-[9px] cursor-pointer text-muted"
      style={{
        width: 34,
        height: 34,
        border: "1px solid var(--border-faint)",
        background: "var(--surface)",
      }}
    >
      {children}
    </button>
  );
}

/**
 * 1b — top-tabs navigation. Replaces the left sidebar: brand + workspace tabs
 * live in the header so the calculator/dashboard can fill the full width.
 */
export function DeskTopTabs({
  dark,
  view,
  setView,
  counts,
  onNew,
  onToggleTheme,
}: {
  dark: boolean;
  view: DeskView;
  setView: (v: DeskView) => void;
  counts: { saved: number; projects: number; compare: number };
  onNew: () => void;
  onToggleTheme: () => void;
}) {
  const t = useTranslations("command");
  return (
    <div
      className="flex items-center gap-6 flex-shrink-0"
      style={{
        padding: "14px 28px",
        borderBottom: "1px solid var(--border-faint)",
        background: "var(--surface-raised)",
      }}
    >
      {/* brand */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div
          className="flex items-center justify-center rounded-lg"
          style={{ width: 28, height: 28, background: "var(--accent)" }}
        >
          <span
            style={{ width: 11, height: 11, background: "var(--accent-contrast)", borderRadius: 3 }}
          />
        </div>
        <span className="font-extrabold text-base tracking-tight text-foreground">FerroScale</span>
      </div>

      {/* workspace tabs */}
      <nav
        aria-label={t("nav.workspace")}
        className="flex gap-0.5"
        style={{ background: "var(--surface-inset)", borderRadius: 11, padding: 3 }}
      >
        <TopTab
          active={view === "calc"}
          onClick={() => setView("calc")}
          label={t("nav.calculator")}
          icon={<DeskIcon name="calc" />}
        />
        <TopTab
          active={view === "saved"}
          onClick={() => setView("saved")}
          label={t("nav.saved")}
          icon={<DeskIcon name="saved" />}
          count={counts.saved}
        />
        <TopTab
          active={view === "projects"}
          onClick={() => setView("projects")}
          label={t("nav.projects")}
          icon={<DeskIcon name="projects" />}
          count={counts.projects}
        />
        <TopTab
          active={view === "compare"}
          onClick={() => setView("compare")}
          label={t("nav.compare")}
          icon={<DeskIcon name="compare" />}
          count={counts.compare}
        />
      </nav>

      {/* right actions */}
      <div className="ml-auto flex items-center gap-2.5">
        <button
          type="button"
          onClick={onNew}
          className="flex items-center gap-[7px] rounded-[9px] cursor-pointer font-semibold text-xs text-muted"
          style={{
            padding: "6px 12px",
            border: "1px solid var(--border-faint)",
            background: "var(--surface)",
          }}
        >
          <Kbd>⌘K</Kbd>
          {t("common.new")}
        </button>
        <TopIconBtn onClick={onToggleTheme} ariaLabel={t("aria.toggleTheme")}>
          <DeskIcon name={dark ? "sun" : "moon"} stroke="currentColor" />
        </TopIconBtn>
        <TopIconBtn
          onClick={() => setView("settings")}
          ariaLabel={t("nav.settings")}
        >
          <DeskIcon name="settings" stroke="currentColor" />
        </TopIconBtn>
      </div>
    </div>
  );
}
