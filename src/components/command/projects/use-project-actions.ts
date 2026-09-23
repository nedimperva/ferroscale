"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cmdParse } from "@ferroscale/metal-core";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import { MAX_PROJECTS, type UseProjectsReturn } from "@/hooks/useProjects";
import type { SavedEntry, SavedPart, UseSavedReturn } from "@/hooks/useSaved";
import { haptic } from "@/lib/haptics";
import type { ProjectActions } from "./project-actions";

interface UseProjectActionsArgs {
  /** The shell's one `useProjects()` instance. */
  projectsApi: UseProjectsReturn;
  saveCalculation: UseSavedReturn["saveCalculation"];
  updateSaved: UseSavedReturn["updateSaved"];
  libraryAssemblies: SavedEntry[];
  /** Put a project item's input back on the command line. */
  onOpenItem: (input: CalculationInput) => void;
  /** The live line's calculation, for "add the current line". */
  currentCalc: { input: CalculationInput; result: CalculationResult } | null | undefined;
  parserSettings: CommandParserSettings;
  showToast: (msg: string) => void;
  showActionToast: (msg: string, action: { label: string; onAction: () => void }) => void;
}

/**
 * The Projects surface's whole vocabulary, assembled once. Deleting shows an
 * undo toast rather than a confirm dialog: the tombstone is reversible and a
 * modal for a project you can put back is a tax on the common case.
 */
export function useProjectActions({
  projectsApi,
  saveCalculation,
  updateSaved,
  libraryAssemblies,
  onOpenItem,
  currentCalc,
  parserSettings,
  showToast,
  showActionToast,
}: UseProjectActionsArgs): ProjectActions {
  const t = useTranslations("command");
  const {
    projects,
    createProject,
    renameProject,
    updateProjectMeta,
    updateProjectLabor,
    updateProjectAdditionalCosts,
    updateItemAssembly,
    batchArchiveProjects,
    batchDeleteProjects,
    updateProjectDescription,
    logQuotePrinted,
    deleteProject,
    restoreProject,
    duplicateProject,
    addCalculation,
    insertAssembly,
    scaleSubAssembly,
    createProjectFromAssembly,
    removeCalculation,
    updateCalculationQuantity,
    updateCalculationNote,
    updateProjectPaintCoats,
  } = projectsApi;

  return useMemo<ProjectActions>(
    () => ({
      onCreate: (name: string) => {
        if (projects.length >= MAX_PROJECTS) {
          showToast(t("projects.full"));
          return;
        }
        return createProject(name);
      },
      onRename: renameProject,
      onUpdateMeta: (id, patch) => {
        updateProjectMeta(id, patch);
        if (patch.status === "archived") showToast(t("projects.archivedToast"));
        else if (patch.status === "draft") showToast(t("projects.unarchivedToast"));
      },
      onUpdateNotes: updateProjectDescription,
      onDuplicate: (id) => {
        const copy = duplicateProject(id);
        showToast(copy ? t("toast.duplicated") : t("projects.full"));
      },
      onDelete: (id) => {
        deleteProject(id);
        showActionToast(t("projects.deleted"), {
          label: t("common.undo"),
          onAction: () => {
            restoreProject(id);
            showToast(t("toast.restored"));
          },
        });
      },
      onRemoveItem: removeCalculation,
      onSetItemQuantity: updateCalculationQuantity,
      onSetItemNote: updateCalculationNote,
      onSetPaintCoats: updateProjectPaintCoats,
      onUpdateLabor: updateProjectLabor,
      onUpdateAdditionalCosts: updateProjectAdditionalCosts,
      onSetItemAssembly: updateItemAssembly,
      onBatchArchive: (ids) => {
        batchArchiveProjects(ids);
        showToast(t("projects.archivedToast"));
      },
      onBatchDelete: (ids) => {
        batchDeleteProjects(ids);
        showToast(t("projects.deleted"));
      },
      onOpenItem,
      onAddItem: (projectId: string) => {
        if (!currentCalc) {
          showToast(t("toast.addLength"));
          return false;
        }
        const ok = addCalculation(projectId, currentCalc.input, currentCalc.result);
        const name = projects.find((project) => project.id === projectId)?.name;
        showToast(
          ok
            ? t("toast.addedToProject", { project: name ?? t("common.project") })
            : t("projects.itemsFull"),
        );
        return ok;
      },
      onQuickAddItem: (projectId: string, queryStr: string, assembly?: string) => {
        const parsed = cmdParse(queryStr, parserSettings);
        if (!parsed.calc) {
          showToast(t("toast.addLength"));
          return false;
        }
        const ok = addCalculation(projectId, parsed.calc.input, parsed.calc.result, assembly);
        const name = projects.find((project) => project.id === projectId)?.name;
        showToast(
          ok
            ? t("toast.addedToProject", { project: name ?? t("common.project") })
            : t("projects.itemsFull"),
        );
        return ok;
      },
      libraryAssemblies,
      onInsertAssembly: (projectId, entry, multiplier, customAssemblyName) => {
        const ok = insertAssembly(projectId, entry, multiplier, customAssemblyName);
        if (ok) {
          showToast(t("projects.templateInserted", { name: entry.name, mult: multiplier }));
        }
        return ok;
      },
      onSaveAssemblyToLibrary: (name, parts: SavedPart[], description, category) => {
        if (parts.length === 0) return;
        const entry = saveCalculation(
          parts[0].input,
          parts[0].result,
          name,
          description,
          undefined,
          parts.map((part) => ({ name: part.name, input: part.input, result: part.result })),
          true,
        );
        if (category) updateSaved(entry.id, { category });
        haptic("commit");
        showToast(t("assembly.saved"));
      },
      onScaleSubAssembly: (projectId, assemblyName, multiplier) => {
        const ok = scaleSubAssembly(projectId, assemblyName, multiplier);
        if (ok) {
          showToast(t("projects.assemblyScaledToast", { name: assemblyName || "General", mult: multiplier }));
        }
        return ok;
      },
      onCreateFromAssembly: (name, entry, multiplier) => {
        const project = createProjectFromAssembly(name, entry, multiplier);
        showToast(t("projects.templateProjectCreated", { name: project.name }));
        return project;
      },
      onPrintQuote: (project) => logQuotePrinted(project.id),
    }),
    [
      projects,
      createProject,
      renameProject,
      updateProjectMeta,
      updateProjectDescription,
      updateProjectLabor,
      updateProjectAdditionalCosts,
      updateItemAssembly,
      batchArchiveProjects,
      batchDeleteProjects,
      duplicateProject,
      deleteProject,
      restoreProject,
      removeCalculation,
      updateCalculationQuantity,
      updateCalculationNote,
      updateProjectPaintCoats,
      onOpenItem,
      addCalculation,
      libraryAssemblies,
      saveCalculation,
      updateSaved,
      insertAssembly,
      scaleSubAssembly,
      createProjectFromAssembly,
      logQuotePrinted,
      currentCalc,
      parserSettings,
      showToast,
      showActionToast,
      t,
    ],
  );
}
