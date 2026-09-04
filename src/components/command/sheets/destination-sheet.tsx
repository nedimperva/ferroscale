"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { AssemblyTemplate } from "@/hooks/useAssemblyTemplates";
import type { Project } from "@/hooks/useProjects";
import { isAssemblyEntry, type SavedEntry } from "@/hooks/useSaved";
import { SheetShell } from "./sheet-shell";

/**
 * Where a thing goes — two questions, asked one at a time.
 *
 * It used to be five peer options in one list, each with a sentence of
 * explanation and its own target list nested inside it: a scroller within a
 * scroller, and two questions ("what kind of thing" and "a new one or an
 * existing one") collapsed into one row of five. Now the kind is asked first
 * and the target second — on a phone as two steps, on a desktop as a rail
 * beside the list, because the width is there and stepping would be theatre.
 *
 * Two callers, one component. A line from the calculator can go anywhere; a
 * saved entry is already in the library, so the rows that would re-create it
 * are absent rather than disabled.
 */
export type DestinationKind = "parts" | "assemblies" | "templates" | "projects";

/** The row that creates something rather than appending to it. */
const NEW = "::new";

interface KindDef {
  id: DestinationKind;
  icon: string;
  /** Only offered when saving a live line, not when sending a saved entry. */
  lineOnly: boolean;
  /**
   * Whether the create row is what this kind is usually for. A new part or a
   * new assembly is the common act — appending to an existing part converts
   * it, which nobody does by accident — so those open ready to commit. A
   * project is nearly always one you already have, so it waits to be picked.
   */
  defaultsToNew: boolean;
  /**
   * Whether this kind can supply the one-press shortcut row. Only the things
   * you return to: a part conversion is deliberate, and a template is a thing
   * you write once and reuse, not a place you keep adding to.
   */
  shortcut: boolean;
  /**
   * Whether a saved entry can start one of these. A new part or assembly is
   * built from the live line, so an entry — which is already both — can only
   * become a template or open a project.
   */
  createFromEntry: boolean;
}

const KINDS: KindDef[] = [
  { id: "parts", icon: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z", lineOnly: true, defaultsToNew: true, shortcut: false, createFromEntry: false },
  { id: "assemblies", icon: "M12 2.5l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5", lineOnly: false, defaultsToNew: true, shortcut: true, createFromEntry: false },
  { id: "templates", icon: "M4 5h7v7H4zM13 5h7v4h-7zM13 13h7v6h-7zM4 16h7v3H4z", lineOnly: false, defaultsToNew: true, shortcut: false, createFromEntry: true },
  { id: "projects", icon: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z", lineOnly: false, defaultsToNew: false, shortcut: true, createFromEntry: true },
];

interface TargetRow {
  id: string;
  name: string;
  meta: string;
  /** For the shortcut row: newest first across kinds. */
  updatedAt: string;
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
  templates,
  projects,
  initial,
  onSaveNew,
  onAppendTo,
  onSaveAsTemplate,
  onAppendToTemplate,
  onAddToProject,
  onCreateProject,
  onClose,
}: {
  subject: DestinationSubject;
  /** Entries "into a part" can target — everything not already an assembly. */
  parts: SavedEntry[];
  assemblies: SavedEntry[];
  /**
   * Only the user's own templates. The standards that ship with the app are
   * read-only, so offering them as somewhere to append would be a dead end.
   */
  templates: AssemblyTemplate[];
  projects: Project[];
  initial?: DestinationKind;
  onSaveNew: (name: string, asAssembly: boolean) => void;
  onAppendTo: (entryId: string) => void;
  onSaveAsTemplate: (name: string) => void;
  onAppendToTemplate: (templateId: string) => void;
  onAddToProject: (projectId: string) => void;
  onCreateProject: (name: string) => Project;
  onClose: () => void;
}) {
  const t = useTranslations("command");
  const available = useMemo(
    () => KINDS.filter((def) => subject.kind === "line" || !def.lineOnly),
    [subject.kind],
  );

  const [kind, setKind] = useState<DestinationKind | null>(initial ?? null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // A part or an assembly is named after the line that starts it; a project
  // is not, so it opens empty and waits to be typed.
  const [name, setName] = useState(initial === "projects" ? "" : subject.defaultName);
  /** Only when the create row was actually tapped — never on a preselection. */
  const [focusName, setFocusName] = useState(false);
  // The rail and the two steps are the same screen at two widths, so the
  // layout decides the flow rather than the other way round.
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // On a desktop the pane is never empty: with no choice made it shows the
  // first kind, which is also the one the rail marks as current.
  const activeKind = kind ?? (wide ? available[0].id : null);
  const def = available.find((entry) => entry.id === activeKind) ?? null;
  // A live line can start anything. A saved entry is already in the library,
  // so it can only start the things that are made out of one.
  const canCreate = def ? subject.kind === "line" || def.createFromEntry : false;

  const rowsFor = useMemo(() => {
    const asRow = (entry: SavedEntry, meta: string): TargetRow => ({
      id: entry.id,
      name: entry.name,
      meta,
      updatedAt: entry.updatedAt,
    });
    return {
      parts: parts.map((entry) => asRow(entry, entry.normalizedProfile?.shortLabel ?? "")),
      assemblies: assemblies.map((entry) =>
        asRow(entry, t("saveTo.partsCount", { count: entry.parts.length })),
      ),
      templates: templates.map((template) => ({
        id: template.id,
        name: template.name,
        meta: t("saveTo.templateItems", { count: template.items.length }),
        updatedAt: template.updatedAt,
      })),
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        meta: t("saveTo.projectItems", { count: project.calculations.length }),
        updatedAt: project.updatedAt,
      })),
    };
  }, [parts, assemblies, templates, projects, t]);

  const pool = useMemo(() => (def ? rowsFor[def.id] : []), [def, rowsFor]);

  const targets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((row) => row.name.toLowerCase().includes(q));
  }, [pool, search]);

  /**
   * The one target you are most likely to want again — see `shortcut`: only
   * the kinds you keep adding to are eligible.
   */
  const recent = useMemo(() => {
    const candidates = available
      .filter((entry) => entry.shortcut)
      .flatMap((entry) => rowsFor[entry.id].map((row) => ({ ...row, kind: entry.id })));
    if (candidates.length === 0) return null;
    return candidates.reduce((newest, row) => (row.updatedAt > newest.updatedAt ? row : newest));
  }, [available, rowsFor]);

  const chosen = targetId === NEW ? null : pool.find((row) => row.id === targetId) ?? null;
  // Nothing picked yet reads as the create row for the kinds that are mostly
  // used to create, so the common save stays one press rather than two.
  const creating =
    canCreate && (targetId === NEW || (targetId === null && Boolean(def?.defaultsToNew)));
  const trimmedName = name.trim();
  const blocked = creating ? !trimmedName : !chosen;

  const openKind = (next: DestinationKind) => {
    setKind(next);
    setTargetId(null);
    setSearch("");
    setFocusName(false);
    setName(next === "projects" ? "" : subject.defaultName);
  };

  const commit = () => {
    if (!def || blocked) return;
    if (creating) {
      if (def.id === "projects") {
        onAddToProject(onCreateProject(trimmedName).id);
        return;
      }
      if (def.id === "templates") {
        onSaveAsTemplate(trimmedName);
        return;
      }
      onSaveNew(trimmedName || subject.defaultName, def.id === "assemblies");
      return;
    }
    if (!chosen) return;
    if (def.id === "projects") {
      onAddToProject(chosen.id);
      return;
    }
    if (def.id === "templates") {
      onAppendToTemplate(chosen.id);
      return;
    }
    onAppendTo(chosen.id);
  };

  const useRecent = () => {
    if (!recent) return;
    if (recent.kind === "projects") onAddToProject(recent.id);
    else onAppendTo(recent.id);
  };

  const summary = !def
    ? ""
    : creating
      ? trimmedName
        ? t(`saveTo.summaryNew.${def.id}`, { name: trimmedName })
        : t(`saveTo.nameItFirst.${def.id}`)
      : chosen
        ? t(`saveTo.summaryInto.${def.id}`, { name: chosen.name })
        : t(`saveTo.pick.${def.id}`);

  // The back arrow belongs to the phone, where the kind list is a step of its
  // own; on a desktop it is still on screen to the left.
  const showBack = Boolean(activeKind) && !wide;

  return (
    <SheetShell
      title={subject.kind === "line" ? t("saveTo.title") : t("saveTo.sendTitle")}
      onClose={onClose}
      size="standard"
      icon={
        showBack ? (
          <button
            type="button"
            onClick={() => setKind(null)}
            aria-label={t("common.back")}
            className="flex items-center justify-center rounded-chip border border-border-faint bg-[var(--surface)] text-foreground-secondary cursor-pointer"
            style={{ width: 34, height: 34 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        ) : (
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
        )
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
        activeKind && def ? (
          <div>
            {/* The line that says what is about to happen, on every viewport —
                it used to be hidden on exactly the one with the least room. */}
            <p className="font-mono text-[11px] text-muted-faint mb-2.5 truncate">{summary}</p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={wide ? onClose : () => setKind(null)}
                className="flex-1 sm:flex-none h-11 sm:h-10 px-4 rounded-button text-xs font-bold border border-border-faint bg-[var(--surface)] text-foreground cursor-pointer"
              >
                {wide ? t("common.cancel") : t("common.back")}
              </button>
              <button
                type="button"
                onClick={commit}
                disabled={blocked}
                className="flex-[1.4] sm:flex-none sm:ml-auto h-11 sm:h-10 px-5 rounded-button text-xs font-bold bg-[var(--accent)] text-[var(--accent-contrast)] cursor-pointer disabled:opacity-40"
              >
                {t(`saveTo.commit.${def.id}`)}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 sm:h-10 rounded-button text-xs font-bold border border-border-faint bg-[var(--surface)] text-foreground cursor-pointer"
          >
            {t("common.cancel")}
          </button>
        )
      }
    >
      <div className="sm:grid sm:grid-cols-[168px_minmax(0,1fr)] sm:gap-3.5">
        {/* Step one, or the rail it becomes once there is room for both. */}
        <div className={activeKind ? "hidden sm:flex sm:flex-col" : "flex flex-col"}>
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2.5">
            {subject.kind === "line" ? t("saveTo.whereLabel") : t("saveTo.sendLabel")}
          </div>

          <div className="flex flex-col gap-1.5">
            {available.map((entry) => {
              const active = entry.id === activeKind;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => openKind(entry.id)}
                  aria-pressed={active}
                  className="flex items-center gap-3 w-full rounded-button text-left cursor-pointer"
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
                      {t(`saveTo.kind.${entry.id}`)}
                    </span>
                    {/* The sentence on a phone, the count on the rail: the
                        first is teaching, the second is orientation. */}
                    <span className="hidden sm:block mt-0.5 font-mono text-[11px] text-muted-faint">
                      {t(`saveTo.count.${entry.id}`, { count: rowsFor[entry.id].length })}
                    </span>
                    <span className="block sm:hidden mt-0.5 text-[11.5px] text-muted leading-snug">
                      {t(`saveTo.kindBody.${entry.id}`)}
                    </span>
                  </span>
                  <svg className="sm:hidden flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              );
            })}
          </div>

        </div>

        {/* Step two: everything this kind can take, in one flat list. */}
        <div className={activeKind && def ? "block" : "hidden sm:block"}>
          {def && (
            <>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(`saveTo.search.${def.id}`)}
                aria-label={t(`saveTo.search.${def.id}`)}
                className="w-full h-11 sm:h-9 px-2.5 rounded-chip text-xs bg-[var(--surface)] border border-border-faint text-foreground placeholder:text-muted-faint outline-none"
              />

              <div className="mt-2.5 rounded-button border border-border-faint bg-[var(--surface)] overflow-hidden">
                {canCreate && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetId(NEW);
                        setFocusName(true);
                      }}
                      aria-pressed={creating}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 border-b border-border-faint text-left cursor-pointer"
                      style={{ background: creating ? "var(--accent-surface)" : "transparent" }}
                    >
                      <span
                        className="flex items-center justify-center rounded-chip flex-shrink-0"
                        style={{
                          width: 26,
                          height: 26,
                          background: creating ? "var(--surface)" : "var(--accent-surface)",
                          color: "var(--accent-text)",
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[12.5px] font-bold text-foreground truncate">
                          {t(`saveTo.new.${def.id}`)}
                        </span>
                        <span className="block text-[11px] text-muted truncate">
                          {t(`saveTo.newBody.${def.id}`)}
                        </span>
                      </span>
                      {creating && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </button>

                    {/* Naming belongs to the row that creates the thing. */}
                    {creating && (
                      <div
                        className="px-3 pb-3 pt-0.5 border-b border-border-faint"
                        style={{ background: "var(--accent-surface)" }}
                      >
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commit();
                            }
                          }}
                          autoFocus={focusName}
                          placeholder={
                            def.id === "projects" ? t("library.newProjectName") : subject.defaultName
                          }
                          aria-label={t(`saveTo.name.${def.id}`)}
                          className="w-full h-11 sm:h-10 px-3 rounded-chip text-sm font-semibold bg-[var(--surface)] border border-[var(--accent-border)] text-foreground outline-none"
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="px-3 pt-2 pb-1.5 bg-[var(--surface-raised)] border-b border-border-faint">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                    {t(`saveTo.existing.${def.id}`)} · {targets.length}
                  </span>
                </div>

                <div className="max-h-64 sm:max-h-72 overflow-y-auto">
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
              </div>
            </>
          )}
        </div>
      </div>

      {/* The one destination worth a single press. It sits under both columns
          rather than in the rail, where a job name has no room to be read. */}
      {recent && (
        <div className={activeKind ? "hidden sm:block" : "block"}>
          <div className="mt-4 pt-3.5 border-t border-border-faint">
            <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">
              {t("saveTo.recentLabel")}
            </div>
            <button
              type="button"
              onClick={useRecent}
              className="flex items-center gap-2.5 w-full rounded-button text-left cursor-pointer"
              style={{
                padding: "9px 11px",
                border: "1px solid var(--accent-border)",
                background: "var(--accent-surface)",
              }}
            >
              <span className="flex-1 min-w-0">
                <span className="block text-[12.5px] font-bold text-foreground truncate">
                  {recent.name}
                </span>
                <span className="block font-mono text-[11px] text-muted-faint truncate">
                  {recent.meta}
                </span>
              </span>
              <span className="flex-shrink-0 text-xs font-bold text-[var(--accent-text)]">
                {t("common.add")}
              </span>
              <svg className="flex-shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      )}
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
