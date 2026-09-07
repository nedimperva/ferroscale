"use client";

import { useTranslations } from "next-intl";
import { DeskIcon } from "./desk-atoms";
import type { DeskView } from "./desktop-props";

/**
 * The workspace rail and the header bar every view wears — the two pieces of
 * chrome direction 1a keeps.
 *
 * Navigation used to be a row of labelled tabs across the top, which cost a
 * band of vertical space on the one screen where vertical space is the
 * answer. The rail moves it to 56px of edge: icons only, the active one
 * marked by the accent tint rather than by a raised surface. What the tabs
 * spent on chrome, the calculator now spends on the number.
 */

function RailButton({
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
  /** Badge for how many rows the view holds. Hidden at zero. */
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      // The count travels in the accessible name, not just the badge: the
      // badge is aria-hidden (it is a bare numeral, meaningless read aloud
      // beside the label), so without this a screen reader would lose a
      // number sighted users can see. The labelled tabs this rail replaced
      // read out the same way.
      aria-label={count != null && count > 0 ? `${label} ${count}` : label}
      aria-current={active ? "page" : undefined}
      className="relative flex items-center justify-center cursor-pointer"
      style={{
        width: 38,
        height: 38,
        border: 0,
        background: active ? "var(--accent-surface)" : "transparent",
        color: active ? "var(--accent)" : "var(--muted-faint)",
      }}
    >
      {icon}
      {count != null && count > 0 && (
        /* A numeral, not a pill: the palette has one colour and it is spoken
           for. Position keeps it clear of the glyph at every icon size. */
        <span
          aria-hidden="true"
          className="absolute font-mono text-[9px] leading-none"
          style={{ top: 5, right: 4, color: active ? "var(--accent)" : "var(--muted)" }}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

export function DeskRail({
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
    <nav
      aria-label={t("nav.workspace")}
      className="flex flex-col items-center flex-shrink-0"
      style={{
        width: 56,
        padding: "14px 0 12px",
        borderRight: "1px solid var(--border-faint)",
        background: "var(--surface)",
      }}
    >
      {/* The mark. Clicking it starts a new calculation — the same thing ⌘K
          does, in the place people already aim for to get "back to the top". */}
      <button
        type="button"
        onClick={onNew}
        title={t("common.new")}
        aria-label={t("common.new")}
        className="cursor-pointer"
        style={{ width: 22, height: 22, border: 0, background: "var(--accent)", marginBottom: 20 }}
      />

      <div className="flex flex-col items-center" style={{ gap: 4 }}>
        <RailButton
          active={view === "calc"}
          onClick={() => setView("calc")}
          label={t("nav.calculator")}
          icon={<DeskIcon name="calc" size={17} />}
        />
        <RailButton
          active={view === "saved"}
          onClick={() => setView("saved")}
          label={t("nav.parts")}
          icon={<DeskIcon name="saved" size={17} />}
          count={counts.saved}
        />
        <RailButton
          active={view === "projects"}
          onClick={() => setView("projects")}
          label={t("nav.projects")}
          icon={<DeskIcon name="projects" size={17} />}
          count={counts.projects}
        />
        <RailButton
          active={view === "compare"}
          onClick={() => setView("compare")}
          label={t("nav.compare")}
          icon={<DeskIcon name="compare" size={17} />}
          count={counts.compare}
        />
      </div>

      <div className="mt-auto flex flex-col items-center" style={{ gap: 4 }}>
        <RailButton
          active={false}
          onClick={onToggleTheme}
          label={t("aria.toggleTheme")}
          icon={<DeskIcon name={dark ? "sun" : "moon"} size={17} />}
        />
        <RailButton
          active={view === "settings"}
          onClick={() => setView("settings")}
          label={t("nav.settings")}
          icon={<DeskIcon name="settings" size={17} />}
        />
      </div>
    </nav>
  );
}

/**
 * The 42px bar at the top of every view: serif name, mono standfirst, actions
 * pushed right. It is the only place a view says what it is, so the views
 * themselves start at their first row of content.
 */
export function DeskViewHeader({
  title,
  subtitle,
  leading,
  actions,
}: {
  title: React.ReactNode;
  /** Tracked mono line beside the title — a count, a state, a scope. */
  subtitle?: React.ReactNode;
  /** Before the title: the back button on a drill-down. */
  leading?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center flex-shrink-0"
      style={{
        height: 42,
        gap: 14,
        padding: "0 20px",
        borderBottom: "1px solid var(--border-faint)",
        background: "var(--surface)",
      }}
    >
      {leading}
      <span className="fs-title text-[17px] text-foreground whitespace-nowrap">{title}</span>
      {subtitle && (
        <span className="font-mono text-[10.5px] uppercase text-muted truncate" style={{ letterSpacing: 1.4 }}>
          {subtitle}
        </span>
      )}
      {actions && <div className="ml-auto flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}
