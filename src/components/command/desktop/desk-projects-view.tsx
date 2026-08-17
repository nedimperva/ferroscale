"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Project } from "@/hooks/useProjects";
import { marginPercentStore } from "@/lib/settings-stores";
import { ProjectList } from "../projects/project-list";
import { ProjectDetail } from "../projects/project-detail";
import { useQuotePrinting } from "../projects/use-quote-printing";
import { ProjectQuote } from "../project-quote";
import type { ProjectActions } from "../projects/project-actions";

/**
 * Projects on the wide workspace: the list (2c), and the detail page (2d) it
 * drills into. The drill-down is state, not a route — the workspace tabs are
 * the app's navigation and a project is somewhere you go *inside* the
 * Projects tab, the same way it works in the library sheet.
 */
export function DeskProjectsView({
  projects,
  actions,
  openProjectId,
  onOpenProject,
}: {
  projects: Project[];
  actions: ProjectActions;
  openProjectId: string | null;
  onOpenProject: (id: string | null) => void;
}) {
  const marginPercent = useSyncExternalStore(
    marginPercentStore.subscribe,
    marginPercentStore.getSnapshot,
    marginPercentStore.getServerSnapshot,
  );
  const { printing, printQuote } = useQuotePrinting(actions.onPrintQuote);

  // A project deleted from another tab (or another device) must not leave the
  // detail page rendering a ghost, so the open project is resolved by lookup.
  const open = openProjectId ? (projects.find((p) => p.id === openProjectId) ?? null) : null;
  const detailActions: ProjectActions = { ...actions, onPrintQuote: printQuote };

  return (
    <>
      {open ? (
        <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
          <ProjectDetail
            project={open}
            actions={detailActions}
            marginPercent={marginPercent}
            onBack={() => onOpenProject(null)}
          />
        </div>
      ) : (
        <ProjectList
          projects={projects}
          marginPercent={marginPercent}
          actions={detailActions}
          onOpenProject={onOpenProject}
        />
      )}
      {/* Portalled to <body> so the print stylesheet can hide the app around
          it — the workspace is a fixed-position tree the quote can't live in. */}
      {printing &&
        createPortal(
          <div className="fs-print">
            <ProjectQuote project={printing} marginPercent={marginPercent} />
          </div>,
          document.body,
        )}
    </>
  );
}
