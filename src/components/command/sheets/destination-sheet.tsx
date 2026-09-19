"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Project } from "@/hooks/useProjects";
import { isAssemblyEntry, type SavedEntry } from "@/hooks/useSaved";
import { SheetShell } from "./sheet-shell";

/**
 * Where a thing goes — one list, one press.
 *
 * This asked two questions before: what kind of thing (four rows, each with a
 * sentence of explanation and its own target list nested inside it) and then
 * which one. On a phone that was two steps; on a desktop a rail beside a
 * scroller inside a scroller. Nine paths for a question whose answer is nearly
 * always "this project" or "keep it around".
 *
 * So: every destination in one flat list, newest first, with the two rows that
 * create something at the top. Type to filter across all of it. Arrow keys and
 * Enter work, because a picker that cannot be driven from the keyboard is a
 * picker you reach for with the mouse.
 */

/** The row that creates something rather than adding to it. */
type CreateKind = "project" | "library";

interface TargetRow {
  kind: "project" | "entry";
  id: string;
  name: string;
  meta: string;
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
  /** Several `+`-joined cuts — it saves as one assembly, not one part. */
  multi?: boolean;
}

export function DestinationSheet({
  subject,
  entries,
  projects,
  onSaveNew,
  onAppendTo,
  onAddToProject,
  onCreateProject,
  onClose,
}: {
  subject: DestinationSubject;
  /**
   * Everything in the library this can be added to. A saved entry being sent
   * on is filtered out by the caller — a thing cannot be added to itself.
   */
  entries: SavedEntry[];
  projects: Project[];
  onSaveNew: (name: string, asAssembly: boolean) => void;
  onAppendTo: (entryId: string) => void;
  onAddToProject: (projectId: string) => void;
  onCreateProject: (name: string) => Project;
  onClose: () => void;
}) {
  const t = useTranslations("command");
  const [search, setSearch] = useState("");
  /** Which create row is open for naming, if any. */
  const [creating, setCreating] = useState<CreateKind | null>(null);
  const [name, setName] = useState("");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  // A live line can start a library entry. A saved entry already is one, so
  // for it the library rows are somewhere to add to, not somewhere to become.
  const canSaveToLibrary = subject.kind === "line";

  const rows = useMemo<TargetRow[]>(() => {
    const projectRows: TargetRow[] = projects.map((project) => ({
      kind: "project",
      id: project.id,
      name: project.name,
      meta: t("saveTo.projectItems", { count: project.calculations.length }),
      updatedAt: project.updatedAt,
    }));
    const entryRows: TargetRow[] = entries.map((entry) => ({
      kind: "entry",
      id: entry.id,
      name: entry.name,
      meta: isAssemblyEntry(entry)
        ? t("saveTo.partsCount", { count: entry.parts.length })
        : entry.normalizedProfile?.shortLabel || t("saveTo.onePart"),
      updatedAt: entry.updatedAt,
    }));
    const q = search.trim().toLowerCase();
    const match = (row: TargetRow) => !q || row.name.toLowerCase().includes(q);
    // Projects first: a line being filed is nearly always going into a job.
    // Within each section, most recently touched first.
    const byRecency = (a: TargetRow, b: TargetRow) => b.updatedAt.localeCompare(a.updatedAt);
    return [
      ...projectRows.filter(match).sort(byRecency),
      ...entryRows.filter(match).sort(byRecency),
    ];
  }, [projects, entries, search, t]);

  // Clamped at read time rather than corrected in an effect: a filter that
  // drops the row under the cursor must not leave it pointing past the end,
  // and there is no state to repair if the bound is applied where it is used.
  const active = Math.min(cursor, Math.max(0, rows.length - 1));

  const openCreate = (kind: CreateKind) => {
    setCreating(kind);
    // A project is nearly always one you name; a library entry is named after
    // the line that starts it, so it opens ready to commit.
    setName(kind === "project" ? "" : subject.defaultName);
  };

  const commitCreate = () => {
    const trimmed = name.trim();
    if (!creating) return;
    if (creating === "project") {
      if (!trimmed) return;
      onAddToProject(onCreateProject(trimmed).id);
      return;
    }
    onSaveNew(trimmed || subject.defaultName, Boolean(subject.multi));
  };

  const choose = (row: TargetRow) => {
    if (row.kind === "project") onAddToProject(row.id);
    else onAppendTo(row.id);
  };

  const onListKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setCreating(null);
      const next = active + (event.key === "ArrowDown" ? 1 : -1);
      setCursor(Math.max(0, Math.min(rows.length - 1, next)));
      return;
    }
    if (event.key === "Enter" && rows[active]) {
      event.preventDefault();
      choose(rows[active]);
    }
  };

  useEffect(() => {
    // Optional call: jsdom has no layout and does not implement this, and a
    // picker must not fail to open because it cannot scroll.
    listRef.current
      ?.querySelector<HTMLElement>(`[data-row="${active}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [active]);

  const rowClass =
    "flex items-center gap-2.5 w-full px-3 py-2.5 border-b border-border-faint text-left cursor-pointer";

  const createRow = (kind: CreateKind, title: string, body: string) => {
    const open = creating === kind;
    return (
      <div key={kind}>
        <button
          type="button"
          onClick={() => (open ? commitCreate() : openCreate(kind))}
          aria-expanded={open}
          className={rowClass}
          style={{ background: open ? "var(--accent-surface)" : "transparent" }}
        >
          <span
            className="flex items-center justify-center rounded-chip flex-shrink-0"
            style={{
              width: 26,
              height: 26,
              background: open ? "var(--surface)" : "var(--accent-surface)",
              color: "var(--accent-text)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[12.5px] font-bold text-foreground truncate">{title}</span>
            <span className="block text-[11px] text-muted truncate">{body}</span>
          </span>
        </button>
        {open && (
          <div
            className="px-3 pb-3 pt-0.5 border-b border-border-faint"
            style={{ background: "var(--accent-surface)" }}
          >
            <div className="flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitCreate();
                  }
                  if (e.key === "Escape") setCreating(null);
                }}
                autoFocus
                placeholder={
                  kind === "project" ? t("library.newProjectName") : subject.defaultName
                }
                aria-label={title}
                className="h-11 sm:h-10 flex-1 min-w-0 px-3 rounded-chip text-sm font-semibold bg-[var(--surface)] border border-[var(--accent-border)] text-foreground outline-none"
              />
              <button
                type="button"
                onClick={commitCreate}
                disabled={kind === "project" && !name.trim()}
                className="h-11 sm:h-10 px-4 rounded-button text-xs font-bold bg-[var(--action)] text-[var(--action-contrast)] cursor-pointer disabled:opacity-40"
              >
                {t("common.create")}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

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
        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 sm:h-10 rounded-button text-xs font-bold border border-border-faint bg-[var(--surface)] text-foreground cursor-pointer"
        >
          {t("common.cancel")}
        </button>
      }
    >
      <input
        value={search}
        // Focus lands here when the sheet opens: the list is driven from this
        // field, so you can type to filter or arrow straight into it.
        data-autofocus
        onChange={(e) => {
          setSearch(e.target.value);
          setCursor(0);
        }}
        onKeyDown={onListKeyDown}
        placeholder={t("saveTo.search")}
        aria-label={t("saveTo.search")}
        // The search field owns the arrow keys, so the list can be driven
        // without ever leaving it.
        className="w-full h-11 sm:h-9 px-2.5 rounded-chip text-xs bg-[var(--surface)] border border-border-faint text-foreground placeholder:text-muted-faint outline-none"
      />

      <div className="mt-2.5 rounded-button border border-border-faint bg-[var(--surface)] overflow-hidden">
        {createRow("project", t("saveTo.newProject"), t("saveTo.newProjectBody"))}
        {canSaveToLibrary &&
          createRow(
            "library",
            subject.multi ? t("saveTo.newAssembly") : t("saveTo.newPart"),
            subject.multi ? t("saveTo.newAssemblyBody") : t("saveTo.newPartBody"),
          )}

        <div ref={listRef} className="max-h-72 overflow-y-auto">
          {rows.map((row, index) => {
            // One header per section, drawn by the first row of it.
            const heading =
              index === 0 || rows[index - 1].kind !== row.kind ? (
                <div
                  key={`${row.kind}-head`}
                  className="px-3 pt-2 pb-1.5 bg-[var(--surface-raised)] border-b border-border-faint"
                >
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                    {row.kind === "project" ? t("saveTo.sectionProjects") : t("saveTo.sectionLibrary")}
                  </span>
                </div>
              ) : null;
            const isActive = index === active;
            return (
              <div key={`${row.kind}-${row.id}`}>
                {heading}
                <button
                  type="button"
                  data-row={index}
                  onClick={() => choose(row)}
                  onMouseEnter={() => setCursor(index)}
                  className={rowClass}
                  style={{ background: isActive ? "var(--accent-surface)" : "transparent" }}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12.5px] font-bold text-foreground truncate">
                      {row.name}
                    </span>
                    <span className="block font-mono text-[11px] text-muted-faint truncate">
                      {row.meta}
                    </span>
                  </span>
                  <svg className="flex-shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={isActive ? "var(--accent-text)" : "var(--border-strong)"} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            );
          })}
          {rows.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted text-center">{t("saveTo.noTargets")}</p>
          )}
        </div>
      </div>
    </SheetShell>
  );
}
