"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "@/i18n/navigation";
import { APP_TAB_SUFFIXES, getAppTabFromPathname } from "@/lib/app-shell";
import { marginPercentStore } from "@/lib/settings-stores";
import { redo as redoLast, undo as undoLast } from "@/hooks/use-undo-stack";
import { isArchivedProject } from "@/hooks/useProjects";
import type { CalculationInput } from "@/lib/calculator/types";
import type { CommandDesktopProps, DeskView } from "./desktop-props";
import type { ProjectActions } from "../projects/project-actions";
import { DeskRail } from "./desk-rail";
import { DeskTabBar } from "./desk-tab-bar";
import { DeskCalcView } from "./desk-calc-view";
import type { PartsActions } from "../parts/parts-view";
import type { CustomerActions } from "../customers/customer-actions";

export type { CommandDesktopProps, DeskView } from "./desktop-props";

/**
 * The views that are not the calculator load on demand.
 *
 * Every route in this app renders the calculator, so the calculator's first
 * paint was carrying Projects, Customers, Compare, Parts, Settings, the CSV
 * exporter and the PNG quote-card canvas — the whole app, on a page whose job
 * is to multiply two numbers. Splitting them means the first visit downloads
 * the calculator and nothing else, and the rest arrives when it is asked for.
 *
 * The calc view stays a static import on purpose: it is the first thing on
 * screen, and a lazily-loaded first paint is a blank one.
 */
const DeskCompareView = dynamic(
  () => import("./desk-compare-view").then((mod) => mod.DeskCompareView),
  { ssr: false, loading: () => <ViewSkeleton /> },
);
const DeskProjectsView = dynamic(
  () => import("./desk-projects-view").then((mod) => mod.DeskProjectsView),
  { ssr: false, loading: () => <ViewSkeleton /> },
);
const DeskSettingsView = dynamic(
  () => import("./desk-settings-view").then((mod) => mod.DeskSettingsView),
  { ssr: false, loading: () => <ViewSkeleton /> },
);
const PartsView = dynamic(
  () => import("../parts/parts-view").then((mod) => mod.PartsView),
  { ssr: false, loading: () => <ViewSkeleton /> },
);
const CustomersView = dynamic(
  () => import("../customers/customers-view").then((mod) => mod.CustomersView),
  { ssr: false, loading: () => <ViewSkeleton /> },
);

/** A quiet stand-in while a view arrives — a rule, not a spinner. */
function ViewSkeleton() {
  return (
    <div className="flex-1 px-[22px] py-[26px]" aria-busy="true">
      <div className="skeleton h-[13px] w-[140px]" />
      <div className="skeleton mt-4 h-[1px] w-full" />
      <div className="skeleton mt-6 h-[1px] w-[80%]" />
      <div className="skeleton mt-4 h-[1px] w-[60%]" />
    </div>
  );
}

export function CommandDesktop(props: CommandDesktopProps) {
  const { onDiff, onOpenHelp, onOpenSearch, onOpenIssue, openIssue } = props;
  const pathname = usePathname();
  const [view, setView] = useState<DeskView>(() => {
    switch (getAppTabFromPathname(pathname)) {
      case "saved":
        return "saved";
      case "projects":
        return "projects";
      case "customers":
        return "customers";
      case "settings":
        return "settings";
      default:
        return "calc";
    }
  });
  const inputRef = useRef<HTMLInputElement | null>(null);
  /** Which project the Projects tab has drilled into (null = the list). */
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  /** Which customer the Customers tab has open. */
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null);
  const marginPercent = useSyncExternalStore(
    marginPercentStore.subscribe,
    marginPercentStore.getSnapshot,
    marginPercentStore.getServerSnapshot,
  );

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
    let base = window.location.pathname;
    for (const suffix of APP_TAB_SUFFIXES) {
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
          : view === "customers"
            ? "/customers"
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

  // A search result asked for a project or a customer. The desk owns its tab
  // state, so the request travels down and the desk answers it — during the
  // render, the way state that mirrors a prop is meant to be adjusted.
  const [handledNav, setHandledNav] = useState<string | null>(null);
  const request = props.navigationRequest;
  if (request && request.id !== handledNav) {
    setHandledNav(request.id);
    if (request.kind === "project") {
      setOpenProjectId(request.id);
      setView("projects");
    } else {
      setOpenCustomerId(request.id);
      setView("customers");
    }
  }

  // ⌘K from anywhere → new calculation: clear the line, focus it.
  // A printable key outside any field routes into the command line
  // (focus happens during keydown, so the character lands in the input).
  // Undo, redo, diff and search work from anywhere too — a button that takes
  // focus must not take the keyboard with it.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const inField =
        tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;
      const mod = event.metaKey || event.ctrlKey;

      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setView("calc");
        onNew();
        requestAnimationFrame(() => inputRef.current?.focus());
        return;
      }
      if (event.key === "Escape" && !inField && openIssue) {
        event.preventDefault();
        onOpenIssue(null);
        return;
      }
      if (mod && !inField) {
        const key = event.key.toLowerCase();
        if (key === "z") {
          event.preventDefault();
          if (event.shiftKey) redoLast();
          else undoLast();
          return;
        }
        if (event.ctrlKey && !event.metaKey && key === "y") {
          event.preventDefault();
          redoLast();
          return;
        }
        if (key === "d") {
          event.preventDefault();
          setView("calc");
          onDiff();
          return;
        }
        if (key === "f") {
          event.preventDefault();
          setView("calc");
          onOpenSearch();
          return;
        }
        if (event.key === "/") {
          event.preventDefault();
          onOpenHelp();
          return;
        }
      }
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
  }, [view, focusInputAtEnd, onNew, onDiff, onOpenSearch, onOpenHelp, onOpenIssue, openIssue]);

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
    onOpenCustomer: (customerId) => {
      setOpenCustomerId(customerId);
      setView("customers");
    },
  };

  const openProject = useCallback((projectId: string) => {
    setOpenProjectId(projectId);
    setView("projects");
  }, []);

  const baseCustomerActions = props.projectActions.customerActions;
  // A job started from a customer opens straight away, on the Projects tab.
  const customerActions: CustomerActions | undefined = baseCustomerActions && {
    ...baseCustomerActions,
    onNewProject: (customerId) =>
      baseCustomerActions.onNewProject(customerId, (project) => openProject(project.id)),
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
    canAddCurrentLine: props.canAddCurrentLine,
    onAddPartsByCommand: props.onAddPartsByCommand,
    onRemovePart: props.onRemovePartSaved,
    onAddToProject: props.onAddSavedToProject,
    onNew: startNewCalc,
  };

  const counts = {
    saved: props.saved.length,
    // Archived projects are not in the list the tab opens, so counting them
    // in the badge would promise rows that are not there.
    projects: props.projects.filter((project) => !isArchivedProject(project)).length,
    customers: (props.projectActions.customers ?? []).filter((customer) => !customer.archivedAt).length,
    compare: props.compareItems.length,
  };

  return (
    /* Rail beside the workspace, not a bar above it: navigation costs 56px of
       width, which the calculator has, instead of a band of height, which is
       what the answer needs. On a tablet the rail moves to the bottom, where
       a thumb can reach it. */
    <div
      className={`flex flex-1 min-w-0 min-h-0 overflow-hidden ${props.tablet ? "flex-col" : ""}`}
    >
      {props.tablet ? null : (
      <DeskRail
        view={view}
        setView={setView}
        counts={counts}
        onNew={startNewCalc}
        onToggleTheme={props.onToggleTheme}
      />
      )}
      {/* Keyed by view so switching tabs cross-fades instead of snapping. */}
      <div key={view} className="fs-fade flex flex-1 min-w-0 min-h-0 flex-col">
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
      {view === "customers" && customerActions && (
        <CustomersView
          customers={props.projectActions.customers ?? []}
          projects={props.projects}
          marginPercent={marginPercent}
          actions={customerActions}
          selectedId={openCustomerId}
          onSelect={setOpenCustomerId}
          onOpenProject={openProject}
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
      {props.tablet ? (
        <DeskTabBar
          view={view}
          setView={setView}
          counts={counts}
          onToggleTheme={props.onToggleTheme}
        />
      ) : null}
    </div>
  );
}
