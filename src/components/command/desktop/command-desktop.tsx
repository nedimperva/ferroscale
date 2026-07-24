"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { getAppTabFromPathname } from "@/lib/app-shell";
import type { CalculationInput } from "@/lib/calculator/types";
import type { CommandDesktopProps, DeskView } from "./desktop-props";
import { DeskTopTabs } from "./desk-top-tabs";
import { DeskCalcView } from "./desk-calc-view";
import { DeskCompareView } from "./desk-compare-view";
import { DeskSavedView } from "./desk-saved-view";
import { DeskProjectsView } from "./desk-projects-view";
import { DeskSettingsView } from "./desk-settings-view";

export type { CommandDesktopProps, DeskView } from "./desktop-props";

export function CommandDesktop(props: CommandDesktopProps) {
  const pathname = usePathname();
  const [view, setView] = useState<DeskView>(() => {
    switch (getAppTabFromPathname(pathname)) {
      case "saved":
        return "saved";
      case "projects":
        return "projects";
      case "settings":
        return "settings";
      default:
        return "calc";
    }
  });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  // Timestamp of a pending `g` chord leader (Gmail-style go-to navigation).
  const pendingGRef = useRef(0);

  const focusInputAtEnd = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const gotoCalc = useCallback(() => {
    setView("calc");
    requestAnimationFrame(() => focusInputAtEnd());
  }, [focusInputAtEnd]);

  // Top-bar "New" (mirrors ⌘K): clear the line, jump to the calculator, focus.
  const { onNew } = props;
  const startNewCalc = useCallback(() => {
    setView("calc");
    onNew();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [onNew]);

  const pickInput = useCallback(
    (input: CalculationInput) => {
      props.onLoadInput(input);
      gotoCalc();
    },
    [props, gotoCalc],
  );

  // ⌘K from anywhere → new calculation: clear the line, focus it.
  // A printable key outside any field routes into the command line
  // (focus happens during keydown, so the character lands in the input).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setView("calc");
        onNew();
        requestAnimationFrame(() => inputRef.current?.focus());
        return;
      }
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const inField =
        tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;
      if (inField || event.metaKey || event.ctrlKey || event.altKey) return;

      // `?` opens the shortcuts overlay; Escape closes it.
      if (event.key === "?") {
        event.preventDefault();
        setShowHelp(true);
        return;
      }
      if (event.key === "Escape" && showHelp) {
        event.preventDefault();
        setShowHelp(false);
        return;
      }

      // `g` then a letter navigates between views (works outside the command
      // input). Typing `g` in the input still types a `g` — inField returns above.
      const now = Date.now();
      if (event.key === "g") {
        pendingGRef.current = now;
        return;
      }
      if (pendingGRef.current && now - pendingGRef.current < 1200) {
        pendingGRef.current = 0;
        const dest: Record<string, DeskView> = {
          c: "calc",
          s: "saved",
          p: "projects",
          k: "compare",
          ",": "settings",
        };
        const next = dest[event.key.toLowerCase()];
        if (next) {
          event.preventDefault();
          if (next === "calc") gotoCalc();
          else setView(next);
          return;
        }
      }

      if (view !== "calc") return;
      if (
        (event.key.length === 1 && /^[a-z0-9 .x×*]$/i.test(event.key)) ||
        event.key === "Backspace"
      ) {
        focusInputAtEnd();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view, focusInputAtEnd, onNew, showHelp, gotoCalc]);

  const counts = {
    saved: props.saved.length,
    projects: props.projects.length,
    compare: props.compareItems.length,
  };

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      <DeskTopTabs
        dark={props.dark}
        view={view}
        setView={setView}
        counts={counts}
        onNew={startNewCalc}
        onToggleTheme={props.onToggleTheme}
      />
      {view === "calc" && (
        <DeskCalcView {...props} inputRef={inputRef} gotoCompare={() => setView("compare")} />
      )}
      {view === "compare" && (
        <DeskCompareView
          compareItems={props.compareItems}
          onRemove={props.onRemoveCompare}
          onClearAll={props.onClearCompare}
          gotoCalc={gotoCalc}
          onPick={pickInput}
        />
      )}
      {view === "saved" && (
        <DeskSavedView
          saved={props.saved}
          onPick={(entry) => pickInput(entry.input)}
          onAddCompare={(entry) => props.onAddCompare(entry.input, entry.result)}
          onShare={(entry) => props.onShareSaved(entry.input)}
          onRemove={props.onRemoveSaved}
        />
      )}
      {view === "projects" && (
        <DeskProjectsView
          projects={props.projects}
          onPickItem={pickInput}
          onCreateProject={props.onCreateProject}
          onRemoveCalc={props.onRemoveProjectCalc}
        />
      )}
      {view === "settings" && (
        <DeskSettingsView
          dark={props.dark}
          shared={props.shared}
          onUpdateShared={props.onUpdateShared}
          weightAsMain={props.weightAsMain}
          onSetWeightAsMain={props.onSetWeightAsMain}
          defaultUnit={props.defaultUnit}
          onSetDefaultUnit={props.onSetDefaultUnit}
          onToggleTheme={props.onToggleTheme}
        />
      )}
      {showHelp && <DeskShortcutsOverlay onClose={() => setShowHelp(false)} />}
    </div>
  );
}

/** Keyboard shortcuts reference, opened with `?` on the desktop workspace. */
function DeskShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const t = useTranslations("command");
  const rows: Array<{ keys: string[]; label: string }> = [
    { keys: ["⌘", "K"], label: t("shortcuts.newCalc") },
    { keys: ["g", "c"], label: t("shortcuts.gotoCalc") },
    { keys: ["g", "s"], label: t("shortcuts.gotoSaved") },
    { keys: ["g", "p"], label: t("shortcuts.gotoProjects") },
    { keys: ["g", "k"], label: t("shortcuts.gotoCompare") },
    { keys: ["g", ","], label: t("shortcuts.gotoSettings") },
    { keys: ["#name", "↵"], label: t("shortcuts.recallTemplate") },
    { keys: ["?"], label: t("shortcuts.help") },
  ];
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
      style={{ background: "var(--overlay)" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("shortcuts.title")}
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl border border-border-faint"
        style={{ background: "var(--surface)", boxShadow: "var(--panel-shadow-soft)", width: 380, maxWidth: "90vw", padding: "20px 22px" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground">{t("shortcuts.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold uppercase tracking-wider text-muted hover:text-foreground"
          >
            {t("common.close")}
          </button>
        </div>
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-4">
              <span className="text-[13px] text-foreground-secondary min-w-0">{row.label}</span>
              <span className="flex items-center gap-1 flex-shrink-0">
                {row.keys.map((k, i) => (
                  <kbd
                    key={i}
                    className="font-mono text-[11px] font-semibold text-muted px-1.5 py-0.5 rounded border border-border-faint"
                    style={{ background: "var(--surface-raised)" }}
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
