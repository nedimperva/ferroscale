"use client";

import { useTranslations } from "next-intl";
import { DeskIcon } from "./desk-atoms";
import type { DeskView } from "./desktop-props";

/**
 * The tablet's navigation: a bar along the bottom instead of a rail down the
 * side.
 *
 * A rail is the right answer for a mouse and the wrong one for a device held
 * in two hands — the destinations end up at the far edge of a screen the
 * thumb cannot reach. On the bottom they are where the hand already is, and
 * the targets are 44px because a finger is not a cursor.
 */
export function DeskTabBar({
  view,
  setView,
  counts,
  onToggleTheme,
}: {
  view: DeskView;
  setView: (v: DeskView) => void;
  counts: { saved: number; projects: number; customers: number; compare: number };
  onToggleTheme: () => void;
}) {
  const t = useTranslations("command");

  const tab = (
    key: DeskView,
    label: string,
    icon: React.ReactNode,
    count?: number,
  ) => {
    const active = view === key;
    return (
      <button
        type="button"
        onClick={() => setView(key)}
        aria-current={active ? "page" : undefined}
        className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 border-0 bg-transparent"
        style={{ color: active ? "var(--accent)" : "var(--muted-faint)" }}
      >
        <span className="relative flex items-center justify-center">
          {icon}
          {count ? (
            <span
              className="absolute -right-2.5 -top-1 font-mono text-[9px] font-bold"
              style={{ color: "var(--muted-faint)" }}
            >
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </span>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.8px]">{label}</span>
      </button>
    );
  };

  return (
    <nav
      aria-label={t("nav.workspace")}
      className="flex flex-shrink-0 items-stretch"
      style={{
        height: 62,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        borderTop: "1px solid var(--border-faint)",
        background: "var(--surface)",
      }}
    >
      {tab("calc", t("nav.calculator"), <DeskIcon name="calc" size={19} />)}
      {tab("saved", t("nav.parts"), <DeskIcon name="saved" size={19} />, counts.saved)}
      {tab("projects", t("nav.projects"), <DeskIcon name="projects" size={19} />, counts.projects)}
      {tab("customers", t("nav.customers"), <DeskIcon name="customers" size={19} />, counts.customers)}
      {tab("compare", t("nav.compare"), <DeskIcon name="compare" size={19} />, counts.compare)}
      <button
        type="button"
        onClick={onToggleTheme}
        aria-label={t("aria.toggleTheme")}
        className="flex min-h-[44px] w-[52px] flex-col items-center justify-center gap-0.5 border-0 bg-transparent"
        style={{ color: "var(--muted-faint)" }}
      >
        <span className="hidden dark:block">
          <DeskIcon name="sun" size={19} />
        </span>
        <span className="block dark:hidden">
          <DeskIcon name="moon" size={19} />
        </span>
      </button>
    </nav>
  );
}
