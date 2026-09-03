"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Project } from "@/hooks/useProjects";
import { isAssemblyEntry, type SavedEntry } from "@/hooks/useSaved";
import { SheetShell } from "./sheet-shell";

/**
 * Where a thing goes — the whole question, in one overlay.
 *
 * It used to take three: a modal to choose "a project", a sheet to choose
 * which project, and a toast. The target list now opens underneath the option
 * it belongs to, so choosing and committing never live in separate overlays
 * and the flow never changes kind halfway through.
 *
 * Two callers, one component. A line from the calculator can go anywhere; a
 * saved entry is already in the library, so the rows that would re-create it
 * are simply absent rather than disabled.
 */
export type DestinationId = "newPart" | "addToPart" | "newAssembly" | "addToAssembly" | "project";

interface DestinationDef {
  id: DestinationId;
  icon: string;
  /** Only offered when saving a live line, not when sending a saved entry. */
  lineOnly: boolean;
  /** Needs something picked before it can commit. */
  targets: "parts" | "assemblies" | "projects" | null;
}

const DESTINATIONS: DestinationDef[] = [
  { id: "newPart", icon: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z", lineOnly: true, targets: null },
  { id: "addToPart", icon: "M12 5v14M5 12h14", lineOnly: true, targets: "parts" },
  { id: "newAssembly", icon: "M12 2.5l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5", lineOnly: true, targets: null },
  { id: "addToAssembly", icon: "M12 2.5l9 5-9 5-9-5 9-5zM3 14l9 5 9-5", lineOnly: false, targets: "assemblies" },
  { id: "project", icon: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z", lineOnly: false, targets: "projects" },
];

interface TargetRow {
  id: string;
  name: string;
  meta: string;
}

export interface DestinationSubject {
  /** A live command line, or a saved entry being sent on. */
  kind: "line" | "entry";
  /** The command, or the entry's name. */
  label: string;
  /** Weight and money, or the entry's provenance. */
  meta: string;
  /** Short glyph for the header tile. */
  glyph: string;
  /** Suggested name when a destination creates something. */
  defaultName: string;
}

export function DestinationSheet({
  subject,
  parts,
  assemblies,
  projects,
  initial,
  onSaveNew,
  onAppendTo,
  onAddToProject,
  onCreateProject,
  onClose,
}: {
  subject: DestinationSubject;
  /** Entries "into a part" can target — everything not already an assembly. */
  parts: SavedEntry[];
  assemblies: SavedEntry[];
  projects: Project[];
  initial?: DestinationId;
  onSaveNew: (name: string, asAssembly: boolean) => void;
  onAppendTo: (entryId: string) => void;
  onAddToProject: (projectId: string) => void;
  onCreateProject: (name: string) => Project;
  onClose: () => void;
}) {
  const t = useTranslations("command");
  const available = useMemo(
    () => DESTINATIONS.filter((def) => subject.kind === "line" || !def.lineOnly),
    [subject.kind],
  );

  const [choice, setChoice] = useState<DestinationId>(initial ?? available[0].id);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [name, setName] = useState(subject.defaultName);
  const [newProjectName, setNewProjectName] = useState("");

  const def = available.find((d) => d.id === choice) ?? available[0];

  const pool: TargetRow[] = useMemo(() => {
    if (def.targets === "parts") {
      return parts.map((entry) => ({
        id: entry.id,
        name: entry.name,
        meta: entry.normalizedProfile?.shortLabel ?? "",
      }));
    }
    if (def.targets === "assemblies") {
      return assemblies.map((entry) => ({
        id: entry.id,
        name: entry.name,
        meta: t("saveTo.partsCount", { count: entry.parts.length }),
      }));
    }
    if (def.targets === "projects") {
      return projects.map((project) => ({
        id: project.id,
        name: project.name,
        meta: t("saveTo.projectItems", { count: project.calculations.length }),
      }));
    }
    return [];
  }, [def.targets, parts, assemblies, projects, t]);

  const targets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((row) => row.name.toLowerCase().includes(q));
  }, [pool, search]);

  const chosen = pool.find((row) => row.id === targetId) ?? null;
  const blocked = def.targets ? !chosen : !name.trim();

  const pickDestination = (next: DestinationId) => {
    setChoice(next);
    setTargetId(null);
    setSearch("");
    setNewProjectName("");
    if (next === "newAssembly" || next === "newPart") setName(subject.defaultName);
  };

  const commit = () => {
    if (blocked) return;
    if (def.targets === "projects" && chosen) {
      onAddToProject(chosen.id);
      return;
    }
    if (def.targets && chosen) {
      onAppendTo(chosen.id);
      return;
    }
    onSaveNew(name.trim() || subject.defaultName, choice === "newAssembly");
  };

  const createAndUse = () => {
    const trimmed = newProjectName.trim();
    if (!trimmed) return;
    const project = onCreateProject(trimmed);
    setNewProjectName("");
    onAddToProject(project.id);
  };

  const summary = def.targets
    ? chosen
      ? t(
          choice === "addToPart"
            ? "saveTo.summaryIntoPart"
            : choice === "project"
              ? "saveTo.summaryOntoProject"
              : "saveTo.summaryIntoAssembly",
          { name: chosen.name },
        )
      : t(
          choice === "addToPart"
            ? "saveTo.pickAPart"
            : choice === "project"
              ? "saveTo.pickAProject"
              : "saveTo.pickAnAssembly",
        )
    : t(choice === "newAssembly" ? "saveTo.summaryNewAssembly" : "saveTo.summaryNewPart");

  return (
    <SheetShell
      title={subject.kind === "line" ? t("saveTo.title") : t("saveTo.sendTitle")}
      onClose={onClose}
      size="standard"
      icon={
        <span
          className="flex items-center justify-center rounded-chip font-mono text-[10px] font-bold"
          style={{
            width: 34,
            height: 34,
            background: subject.kind === "line" ? "var(--blue-surface)" : "var(--accent-surface)",
            color: subject.kind === "line" ? "var(--blue-text)" : "var(--accent-text)",
          }}
        >
          {subject.glyph}
        </span>
      }
      subtitle={
        <>
          <p className="font-mono text-xs mt-1 truncate" style={{ color: "var(--accent-text)" }}>
            {subject.label}
          </p>
          <p className="font-mono text-[11.5px] text-muted-faint mt-0.5 truncate">{subject.meta}</p>
        </>
      }
      footer={
        <div className="flex items-center gap-2.5">
          <span className="flex-1 min-w-0 font-mono text-[11px] text-muted-faint truncate hidden sm:block">
            {summary}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none h-11 sm:h-10 px-4 rounded-button text-xs font-bold border border-border-faint bg-[var(--surface)] text-foreground cursor-pointer"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={commit}
            disabled={blocked}
            className="flex-[1.4] sm:flex-none h-11 sm:h-10 px-5 rounded-button text-xs font-bold bg-[var(--accent)] text-[var(--accent-contrast)] cursor-pointer disabled:opacity-40"
          >
            {choice === "project" ? t("saveTo.addToProject") : t("common.save")}
          </button>
        </div>
      }
    >
      <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2.5">
        {subject.kind === "line" ? t("saveTo.whereLabel") : t("saveTo.sendLabel")}
      </div>

      <div className="flex flex-col gap-1.5">
        {available.map((entry) => {
          const active = entry.id === choice;
          return (
            <div key={entry.id}>
              <button
                type="button"
                onClick={() => pickDestination(entry.id)}
                aria-pressed={active}
                className="flex items-start gap-3 w-full rounded-button text-left cursor-pointer"
                style={{
                  padding: "11px 12px",
                  border: `1px solid ${active ? "var(--accent)" : "var(--border-faint)"}`,
                  background: active ? "var(--accent-surface)" : "var(--surface)",
                }}
              >
                <span
                  className="flex items-center justify-center rounded-chip flex-shrink-0"
                  style={{
                    width: 30,
                    height: 30,
                    background: active ? "var(--surface)" : "var(--surface-inset)",
                    color: active ? "var(--accent-text)" : "var(--muted)",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={entry.icon} />
                  </svg>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13.5px] font-bold text-foreground">
                    {t(`saveTo.${entry.id}Title`)}
                  </span>
                  <span className="block mt-0.5 text-[11.5px] text-muted leading-snug">
                    {t(`saveTo.${entry.id}Body`)}
                  </span>
                </span>
                <span
                  className="flex-shrink-0 rounded-full"
                  style={{
                    width: 18,
                    height: 18,
                    marginTop: 5,
                    border: `2px solid ${active ? "var(--accent)" : "var(--border-strong)"}`,
                    background: active ? "var(--accent)" : "transparent",
                  }}
                />
              </button>

              {/* The target list belongs to the choice, so it opens under it. */}
              {active && entry.targets && (
                <div className="mt-1.5 mb-0.5 sm:ml-[41px] rounded-button border border-border-faint bg-[var(--surface-raised)] overflow-hidden">
                  <div className="p-2 border-b border-border-faint">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t(`saveTo.search.${entry.targets}`)}
                      aria-label={t(`saveTo.search.${entry.targets}`)}
                      className="w-full h-11 sm:h-9 px-2.5 rounded-chip text-xs bg-[var(--surface)] border border-border-faint text-foreground placeholder:text-muted-faint outline-none"
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto">
                    {targets.map((row) => {
                      const isChosen = row.id === targetId;
                      return (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => setTargetId(row.id)}
                          aria-pressed={isChosen}
                          className="flex items-center gap-2.5 w-full px-3 py-2.5 border-b border-border-faint text-left cursor-pointer"
                          style={{ background: isChosen ? "var(--accent-surface)" : "transparent" }}
                        >
                          <span className="flex-1 min-w-0">
                            <span className="block text-[12.5px] font-bold text-foreground truncate">
                              {row.name}
                            </span>
                            <span className="block font-mono text-[11px] text-muted-faint truncate">
                              {row.meta}
                            </span>
                          </span>
                          {isChosen && (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                    {targets.length === 0 && (
                      <p className="px-3 py-4 text-xs text-muted text-center">
                        {t("saveTo.noTargets")}
                      </p>
                    )}
                  </div>

                  {/* Creating the project you meant to pick, without leaving. */}
                  {entry.targets === "projects" && (
                    <div className="flex gap-2 p-2 border-t border-border-faint">
                      <input
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            createAndUse();
                          }
                        }}
                        placeholder={t("library.newProjectName")}
                        aria-label={t("library.newProjectName")}
                        className="flex-1 min-w-0 h-11 sm:h-9 px-2.5 rounded-chip text-xs bg-[var(--surface)] border border-border-faint text-foreground placeholder:text-muted-faint outline-none"
                      />
                      <button
                        type="button"
                        onClick={createAndUse}
                        disabled={!newProjectName.trim()}
                        className="flex-shrink-0 h-11 sm:h-9 px-3.5 rounded-chip text-xs font-bold border border-[var(--accent-border)] bg-[var(--accent-surface)] text-[var(--accent-text)] cursor-pointer disabled:opacity-40"
                      >
                        {t("common.create")}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Naming belongs to the option that creates the thing, not to a
                  sheet that opens itself once you have already saved. */}
              {active && !entry.targets && (
                <div className="mt-2 mb-0.5 sm:ml-[41px]">
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    {t(entry.id === "newAssembly" ? "saveTo.assemblyName" : "saveTo.partName")}
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-11 sm:h-10 px-3 rounded-button text-sm font-semibold bg-[var(--surface-inset)] border border-border-faint text-foreground outline-none"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SheetShell>
  );
}

/** The entries "into a part" can target: everything not already an assembly. */
export function partTargets(entries: SavedEntry[]): SavedEntry[] {
  return entries.filter((entry) => !isAssemblyEntry(entry));
}

export function assemblyTargets(entries: SavedEntry[]): SavedEntry[] {
  return entries.filter(isAssemblyEntry);
}
