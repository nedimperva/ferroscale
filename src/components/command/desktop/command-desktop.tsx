"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { getAppTabFromPathname } from "@/lib/app-shell";
import { isArchivedProject } from "@/hooks/useProjects";
import type { CalculationInput } from "@/lib/calculator/types";
import type { CommandDesktopProps, DeskView } from "./desktop-props";
import type { ProjectActions } from "../projects/project-actions";
import { DeskTopTabs } from "./desk-top-tabs";
import { DeskCalcView } from "./desk-calc-view";
import { DeskCompareView } from "./desk-compare-view";
import { PartsView, type PartsActions } from "../parts/parts-view";
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
  /** Which project the Projects tab has drilled into (null = the list). */
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);

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

  // Workspace tab ↔ URL: switching tabs rewrites the path (replaceState — no
  // navigation, nothing remounts) so a refresh or a pasted link lands on the
  // tab you were on. Compare has no route of its own; it shares the base path
  // with the calculator, like every route does in this single-shell app.
  useEffect(() => {
    const KNOWN = ["/saved", "/projects", "/settings"];
    let base = window.location.pathname;
    for (const suffix of KNOWN) {
      if (base.endsWith(suffix)) {
        base = base.slice(0, -suffix.length);
        break;
      }
    }
    const suffix =
      view === "saved"
        ? "/saved"
        : view === "projects"
          ? "/projects"
          : view === "settings"
            ? "/settings"
            : "";
    const stripped = base.replace(/\/+$/, "");
    const nextPath = stripped + suffix;
    window.history.replaceState(
      null,
      "",
      `${nextPath === "" ? "/" : nextPath}${window.location.search}`,
    );
  }, [view]);

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

  // Opening an item from a project puts it in the bar, which means leaving
  // the detail page — the two surfaces are the same tab.
  const projectActions: ProjectActions = {
    ...props.projectActions,
    onOpenItem: (input) => {
      props.projectActions.onOpenItem(input);
      gotoCalc();
    },
    onAddItem: (projectId) => {
      const added = props.projectActions.onAddItem(projectId);
      if (!added) gotoCalc();
      return added;
    },
    onDelete: (id) => {
      props.projectActions.onDelete(id);
      setOpenProjectId((current) => (current === id ? null : current));
    },
  };

  const partsActions: PartsActions = {
    onPick: (entry) => {
      props.onLoadSaved(entry);
      gotoCalc();
    },
    onAddCompare: props.onAddCompareSaved,
    onRemove: props.onRemoveSaved,
    onRemoveMany: props.onRemoveSavedMany,
    onDuplicate: props.onDuplicateSaved,
    onTogglePin: props.onTogglePinSaved,
    onEdit: props.onEditSaved,
    onAddPart: props.onAddPartSaved,
    onRemovePart: props.onRemovePartSaved,
    onAddToProject: props.onAddSavedToProject,
    onLoadQuery: (query) => {
      props.onLoadQuery(query);
      gotoCalc();
    },
    onRemoveHistoryEntry: props.onRemoveTapeEntry,
    onClearHistory: props.onClearTape,
    onNew: startNewCalc,
  };

  const counts = {
    saved: props.saved.length,
    // Archived projects are not in the list the tab opens, so counting them
    // in the badge would promise rows that are not there.
    projects: props.projects.filter((project) => !isArchivedProject(project)).length,
    compare: props.compareItems.length,
  };

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      <DeskTopTabs
        compact={props.compact}
        dark={props.dark}
        view={view}
        setView={setView}
        counts={counts}
        onNew={startNewCalc}
        onToggleTheme={props.onToggleTheme}
      />
      {/* Keyed by view so switching tabs cross-fades instead of snapping. */}
      <div key={view} className="fs-fade flex flex-1 min-h-0 flex-col">
      {view === "calc" && (
        <DeskCalcView
          {...props}
          inputRef={inputRef}
          gotoCompare={() => setView("compare")}
        />
      )}
      {view === "compare" && (
        <DeskCompareView
          compareItems={props.compareItems}
          currentValid={props.p.valid}
          onAddCurrent={props.onCompareCurrent}
          onRemove={props.onRemoveCompare}
          onClearAll={props.onClearCompare}
          gotoCalc={gotoCalc}
          onPick={pickInput}
        />
      )}
      {view === "saved" && (
        <PartsView
          saved={props.saved}
          history={props.history}
          settings={props.parserSettings}
          defaultUnit={props.defaultUnit}
          mode={props.mode}
          actions={partsActions}
        />
      )}
      {view === "projects" && (
        <DeskProjectsView
          projects={props.projects}
          actions={projectActions}
          openProjectId={openProjectId}
          onOpenProject={setOpenProjectId}
        />
      )}
      {view === "settings" && (
        <DeskSettingsView
          shared={props.shared}
          onUpdateShared={props.onUpdateShared}
          weightAsMain={props.weightAsMain}
          onSetWeightAsMain={props.onSetWeightAsMain}
          defaultUnit={props.defaultUnit}
          onSetDefaultUnit={props.onSetDefaultUnit}
        />
      )}
      </div>
    </div>
  );
}
