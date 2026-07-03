"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { getAppTabFromPathname } from "@/lib/app-shell";
import type { CalculationInput } from "@/lib/calculator/types";
import type { CommandDesktopProps, DeskView } from "./desktop-props";
import { DeskSidebar } from "./desk-sidebar";
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
  const { onNew } = props;
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
  }, [view, focusInputAtEnd, onNew]);

  const counts = {
    saved: props.saved.length,
    projects: props.projects.length,
    compare: props.compareItems.length,
  };

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      <DeskSidebar
        dark={props.dark}
        view={view}
        setView={setView}
        counts={counts}
        onToggleTheme={props.onToggleTheme}
      />
      {view === "calc" && (
        <DeskCalcView {...props} inputRef={inputRef} gotoCompare={() => setView("compare")} />
      )}
      {view === "compare" && (
        <DeskCompareView
          dark={props.dark}
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
          onRemove={props.onRemoveSaved}
        />
      )}
      {view === "projects" && (
        <DeskProjectsView
          dark={props.dark}
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
    </div>
  );
}
