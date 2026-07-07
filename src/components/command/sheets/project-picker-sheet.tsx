"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Project } from "@/hooks/useProjects";
import { SheetShell } from "./sheet-shell";
import { EmptyState, FolderGlyph, LibraryRow, RowsCard } from "./library-sheet";

/* ──────────────────────────────────────────────────────────────
 *  Project picker sheet — replaces SaveToProjectModal
 * ────────────────────────────────────────────────────────────── */

interface CommandProjectPickerSheetProps {
  projects: Project[];
  onClose: () => void;
  onCreateProject: (name: string) => Project;
  onPickProject: (project: Project) => void;
}

export function CommandProjectPickerSheet({
  projects,
  onClose,
  onCreateProject,
  onPickProject,
}: CommandProjectPickerSheetProps) {
  const t = useTranslations("command");
  const [newName, setNewName] = useState("");

  const submit = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const project = onCreateProject(trimmed);
    setNewName("");
    onPickProject(project);
  };

  return (
    <SheetShell title={t("sheets.addToProject")} onClose={onClose}>
      <div className="flex gap-2 mb-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder={t("library.newProjectName")}
          className="flex-1 h-10 rounded-xl border border-border-faint bg-[var(--surface)] px-3 text-sm text-foreground placeholder:text-muted-faint"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!newName.trim()}
          className="h-10 px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t("common.create")}
        </button>
      </div>
      {projects.length === 0 ? (
        <EmptyState>{t("library.noProjectsCreateAbove")}</EmptyState>
      ) : (
        <RowsCard>
          {projects.map((project) => {
            const calcs = project.calculations;
            return (
              <LibraryRow
                key={project.id}
                glyph={
                  <span style={{ color: "var(--accent)" }}>
                    <FolderGlyph />
                  </span>
                }
                title={project.name}
                subtitle={
                  calcs.length === 0
                    ? t("library.emptyProject")
                    : t("library.calcCount", { count: calcs.length })
                }
                onClick={() => onPickProject(project)}
              />
            );
          })}
        </RowsCard>
      )}
    </SheetShell>
  );
}