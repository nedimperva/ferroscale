"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { isAssemblyEntry, type SavedEntry } from "@/hooks/useSaved";
import { DeskIcon } from "../desktop/desk-atoms";

/**
 * Where a line goes when Save is not simply "bookmark this".
 *
 * Save on its own stays one tap for a new part — the common case, and the one
 * worth keeping fast. This is what the control beside it opens: the four
 * destinations the library actually has, plus a way out of the library
 * altogether onto a job.
 */
export type SaveDestination = "newPart" | "addToPart" | "newAssembly" | "addToAssembly" | "project";

const NEEDS_TARGET: SaveDestination[] = ["addToPart", "addToAssembly"];
const NEEDS_NAME: SaveDestination[] = ["newPart", "newAssembly"];

/** 24px paths, drawn to match the DeskIcon set. */
const ICONS: Record<SaveDestination, string> = {
  newPart: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z",
  addToPart: "M12 5v14M5 12h14",
  newAssembly: "M12 2.5l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5",
  addToAssembly: "M12 2.5l9 5-9 5-9-5 9-5zM3 14l9 5 9-5",
  project: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z",
};

function entryMeta(entry: SavedEntry): string {
  return entry.normalizedProfile?.shortLabel ?? "";
}

export function SaveDestinationModal({
  lineText,
  summaryText,
  defaultName,
  parts,
  assemblies,
  onSaveNew,
  onAppendTo,
  onSaveToProject,
  onClose,
}: {
  /** The command being saved, shown so the choice has a subject. */
  lineText: string;
  summaryText: string;
  defaultName: string;
  /** Single-part entries, the only ones "add to a part" can target. */
  parts: SavedEntry[];
  assemblies: SavedEntry[];
  onSaveNew: (name: string, asAssembly: boolean) => void;
  onAppendTo: (entryId: string) => void;
  onSaveToProject: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("command");
  const [destination, setDestination] = useState<SaveDestination>("newPart");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [targetSearch, setTargetSearch] = useState("");
  const [name, setName] = useState(defaultName);

  const choices: SaveDestination[] = ["newPart", "addToPart", "newAssembly", "addToAssembly"];
  const needsTarget = NEEDS_TARGET.includes(destination);
  const needsName = NEEDS_NAME.includes(destination);

  const pool = destination === "addToAssembly" ? assemblies : parts;
  const targets = useMemo(() => {
    const q = targetSearch.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((entry) => entry.name.toLowerCase().includes(q));
  }, [pool, targetSearch]);

  const chosen = pool.find((entry) => entry.id === targetId) ?? null;
  const blocked = needsTarget ? !chosen : needsName && !name.trim();

  const pick = (next: SaveDestination) => {
    setDestination(next);
    setTargetId(null);
    setTargetSearch("");
    if (next === "newAssembly" || next === "newPart") setName(defaultName);
  };

  const commit = () => {
    if (blocked) return;
    if (destination === "project") {
      onSaveToProject();
      return;
    }
    if (needsTarget && chosen) {
      onAppendTo(chosen.id);
      return;
    }
    onSaveNew(name.trim() || defaultName, destination === "newAssembly");
  };

  const summary = needsTarget
    ? chosen
      ? destination === "addToPart"
        ? t("saveTo.summaryIntoPart", { name: chosen.name })
        : t("saveTo.summaryIntoAssembly", { name: chosen.name })
      : t(destination === "addToPart" ? "saveTo.pickAPart" : "saveTo.pickAnAssembly")
    : destination === "project"
      ? t("saveTo.summaryProject")
      : t(destination === "newAssembly" ? "saveTo.summaryNewAssembly" : "saveTo.summaryNewPart");

  const row = (id: SaveDestination, disabled = false) => {
    const active = destination === id;
    return (
      <button
        key={id}
        type="button"
        disabled={disabled}
        onClick={() => pick(id)}
        aria-pressed={active}
        className="flex items-start gap-3 w-full rounded-button text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <path d={ICONS[id]} />
          </svg>
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[13.5px] font-bold text-foreground">{t(`saveTo.${id}Title`)}</span>
          <span className="block mt-0.5 text-[11.5px] text-muted leading-snug">{t(`saveTo.${id}Body`)}</span>
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
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-[560px] max-h-[94vh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-[var(--border-faint)] bg-[var(--surface)] shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={t("saveTo.title")}
      >
        <div className="flex items-start gap-3 px-5 py-4 border-b border-[var(--border-faint)] bg-[var(--surface-raised)] flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="font-extrabold text-[15px] text-foreground">{t("saveTo.title")}</h2>
            <p className="font-mono text-xs mt-1 truncate" style={{ color: "var(--accent-text)" }}>
              {lineText}
            </p>
            <p className="font-mono text-[11.5px] text-muted-faint mt-0.5 truncate">{summaryText}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="w-11 h-11 sm:w-9 sm:h-9 rounded-chip flex items-center justify-center text-muted hover:text-foreground cursor-pointer flex-shrink-0"
          >
            <DeskIcon name="close" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-4 pb-1">
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2.5">
            {t("saveTo.whereLabel")}
          </div>
          <div className="flex flex-col gap-1.5">
            {choices.map((id) =>
              row(id, (id === "addToPart" && parts.length === 0) || (id === "addToAssembly" && assemblies.length === 0)),
            )}
          </div>

          {needsTarget && (
            <div className="mt-3 rounded-button border border-[var(--border-faint)] bg-[var(--surface-raised)] overflow-hidden">
              <div className="p-2.5 border-b border-[var(--border-faint)]">
                <input
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
                  placeholder={t(destination === "addToPart" ? "saveTo.searchParts" : "saveTo.searchAssemblies")}
                  className="w-full h-11 sm:h-9 px-2.5 rounded-chip text-xs bg-[var(--surface)] border border-[var(--border-faint)] text-foreground placeholder:text-muted-faint outline-none"
                />
              </div>
              <div className="max-h-44 overflow-y-auto">
                {targets.map((entry) => {
                  const isChosen = entry.id === targetId;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setTargetId(entry.id)}
                      aria-pressed={isChosen}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 border-b border-[var(--border-faint)] text-left cursor-pointer"
                      style={{ background: isChosen ? "var(--accent-surface)" : "transparent" }}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block text-[12.5px] font-bold text-foreground truncate">{entry.name}</span>
                        <span className="block font-mono text-[11px] text-muted-faint truncate">
                          {isAssemblyEntry(entry)
                            ? t("saveTo.partsCount", { count: entry.parts.length })
                            : entryMeta(entry)}
                        </span>
                      </span>
                      {isChosen && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  );
                })}
                {targets.length === 0 && (
                  <p className="px-3 py-4 text-xs text-muted text-center">{t("saved.noMatchTitle")}</p>
                )}
              </div>
            </div>
          )}

          {needsName && (
            <div className="mt-3.5">
              <label className="block text-xs font-bold text-foreground mb-1.5">
                {t(destination === "newAssembly" ? "saveTo.assemblyName" : "saveTo.partName")}
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 sm:h-10 px-3 rounded-button text-sm font-semibold bg-[var(--surface-inset)] border border-[var(--border-faint)] text-foreground outline-none"
              />
            </div>
          )}

          <div className="mt-4 pt-3.5 border-t border-[var(--border-faint)]">{row("project")}</div>
        </div>

        <div className="flex-shrink-0 flex items-center gap-2.5 px-5 py-3.5 border-t border-[var(--border-faint)] bg-[var(--surface-raised)]">
          <span className="flex-1 min-w-0 font-mono text-[11px] text-muted-faint truncate hidden sm:block">
            {summary}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none h-11 sm:h-10 px-4 rounded-button text-xs font-bold border border-[var(--border-faint)] bg-[var(--surface)] text-foreground cursor-pointer"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={commit}
            disabled={blocked}
            className="flex-1 sm:flex-none h-11 sm:h-10 px-5 rounded-button text-xs font-bold bg-[var(--accent)] text-[var(--accent-contrast)] cursor-pointer disabled:opacity-40"
          >
            {destination === "project" ? t("saveTo.chooseProject") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
