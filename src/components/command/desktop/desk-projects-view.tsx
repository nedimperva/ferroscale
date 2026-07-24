"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import { CommandGlyph } from "../command-glyph";
import type { CalculationInput, CurrencyCode } from "@/lib/calculator/types";
import type { Project, ProjectStatus } from "@/hooks/useProjects";
import { PROJECT_STATUSES } from "@/hooks/useProjects";
import { computeProjectMaterials } from "@/lib/projects/materials";
import { DeskTopbar } from "./desk-sidebar";
import { CloseIcon, DeskBtn, DeskIcon } from "./desk-atoms";
import { familyForInput } from "../command-copy";

const STATUS_STYLE: Record<ProjectStatus, { bg: string; fg: string }> = {
  draft: { bg: "var(--surface-inset)", fg: "var(--muted)" },
  quoted: { bg: "var(--blue-surface)", fg: "var(--blue-text)" },
  won: { bg: "var(--green-surface)", fg: "var(--green-text)" },
};

export function DeskProjectsView({
  projects,
  onPickItem,
  onCreateProject,
  onRemoveCalc,
  onDuplicate,
  onDelete,
  onSetStatus,
}: {
  projects: Project[];
  onPickItem: (input: CalculationInput) => void;
  onCreateProject: (name: string) => Project;
  onRemoveCalc: (projectId: string, calcId: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onSetStatus: (id: string, status: ProjectStatus) => void;
}) {
  const t = useTranslations("command");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [materialsOpen, setMaterialsOpen] = useState<Set<string>>(new Set());
  // Delete needs a second click within a few seconds — a project is a lot of
  // work to lose to a stray click, and there's no in-view undo.
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const requestDelete = (id: string) => {
    if (confirmDelete === id) {
      onDelete(id);
      setConfirmDelete(null);
      return;
    }
    setConfirmDelete(id);
    window.setTimeout(() => setConfirmDelete((cur) => (cur === id ? null : cur)), 3000);
  };

  const toggleMaterials = (projectId: string) => {
    setMaterialsOpen((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const submit = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreateProject(trimmed);
    setNewName("");
    setCreating(false);
  };

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      <DeskTopbar
        title={t("nav.projects")}
        subtitle={projects.length ? t("projects.subtitleCount", { count: projects.length }) : t("projects.subtitleEmpty")}
        actions={
          <DeskBtn small primary onClick={() => setCreating((v) => !v)}>
            <DeskIcon name="plus" stroke={"var(--accent-contrast)"} />
            {t("library.newProject")}
          </DeskBtn>
        }
      />
      <div className="flex-1 overflow-y-auto" style={{ padding: "24px 32px 32px" }}>
        {creating && (
          <div className="flex gap-2 mb-4" style={{ maxWidth: 420 }}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") setCreating(false);
              }}
              autoFocus
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
        )}
        {projects.length === 0 && !creating ? (
          <div className="font-mono text-[12.5px] text-muted-faint" style={{ padding: "16px 2px" }}>
            {t("projects.empty")}
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              maxWidth: 980,
            }}
          >
            {projects.map((project) => {
              const calcs = project.calculations;
              const totKg = calcs.reduce((s, c) => s + (c.result.totalWeightKg ?? 0), 0);
              const totAmount = calcs.reduce((s, c) => s + (c.result.grandTotalAmount ?? 0), 0);
              const currency = calcs[0]?.result.currency ?? ("EUR" as CurrencyCode);
              const projSym = CURRENCY_SYMBOLS[currency] ?? "€";
              const materials = computeProjectMaterials(project);
              const showMaterials = materialsOpen.has(project.id);
              const status: ProjectStatus = project.status ?? "draft";
              const cycleStatus = () => {
                const idx = PROJECT_STATUSES.indexOf(status);
                onSetStatus(project.id, PROJECT_STATUSES[(idx + 1) % PROJECT_STATUSES.length]);
              };
              return (
                <div
                  key={project.id}
                  className="group rounded-[18px] overflow-hidden"
                  style={{
                    border: "1px solid var(--border-faint)",
                    background: "var(--surface)",
                    boxShadow: "var(--panel-shadow-soft)",
                  }}
                >
                  <div
                    style={{ padding: "15px 18px 13px", borderBottom: "1px solid var(--border-faint)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex" style={{ color: "var(--accent)" }}>
                        <DeskIcon name="projects" />
                      </span>
                      <span
                        className="flex-1 font-extrabold text-[15.5px] text-foreground truncate"
                        style={{ letterSpacing: -0.2 }}
                      >
                        {project.name}
                      </span>
                      <button
                        type="button"
                        onClick={cycleStatus}
                        title={t("projects.cycleStatus")}
                        className="font-mono text-[9px] font-bold uppercase tracking-wider rounded-full cursor-pointer border-0 flex-shrink-0"
                        style={{ padding: "3px 8px", background: STATUS_STYLE[status].bg, color: STATUS_STYLE[status].fg }}
                      >
                        {t(`projects.status.${status}`)}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicate(project.id)}
                        title={t("projects.duplicate")}
                        aria-label={t("projects.duplicate")}
                        className="flex items-center justify-center rounded-[7px] cursor-pointer flex-shrink-0 text-muted opacity-0 group-hover:opacity-100"
                        style={{ width: 24, height: 24, background: "var(--surface-raised)", border: "1px solid var(--border-faint)" }}
                      >
                        <DeskIcon name="copy" />
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDelete(project.id)}
                        title={confirmDelete === project.id ? t("projects.confirmDelete") : t("projects.delete")}
                        aria-label={confirmDelete === project.id ? t("projects.confirmDelete") : t("projects.delete")}
                        className={`flex items-center justify-center rounded-[7px] cursor-pointer flex-shrink-0 ${
                          confirmDelete === project.id ? "opacity-100" : "text-muted opacity-0 group-hover:opacity-100"
                        }`}
                        style={
                          confirmDelete === project.id
                            ? { width: 24, height: 24, background: "var(--accent-surface)", color: "var(--accent-text)", border: "1px solid var(--accent-border)" }
                            : { width: 24, height: 24, background: "var(--surface-raised)", border: "1px solid var(--border-faint)" }
                        }
                      >
                        <DeskIcon name="trash" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3.5 mt-2.5">
                      <span className="font-mono text-[10.5px] text-muted-faint">
                        {t("projects.itemCount", { count: calcs.length })}
                      </span>
                      <span
                        className="font-mono text-[12.5px] font-bold"
                        style={{ color: "var(--accent)" }}
                      >
                        {fsWeight(totKg)} {fsWeightUnit()}
                      </span>
                      <span
                        className="font-mono text-[12.5px] font-bold"
                        style={{ color: "var(--blue-strong)" }}
                      >
                        {projSym} {fsMoney(totAmount)}
                      </span>
                    </div>
                  </div>
                  <div style={{ padding: "6px 8px 8px" }}>
                    {calcs.length === 0 ? (
                      <div className="font-mono text-[11px] text-muted-faint" style={{ padding: "8px 10px" }}>
                        {t("projects.emptyProjectHint")}
                      </div>
                    ) : (
                      calcs.map((calc) => {
                        const fam = familyForInput(calc.input);
                        return (
                          <div
                            key={calc.id}
                            className="group flex items-center gap-2.5 rounded-[11px] hover:bg-[var(--surface-raised)]"
                            style={{ padding: "8px 10px" }}
                          >
                            <span className="flex flex-shrink-0 text-muted">
                              {fam && <CommandGlyph fam={fam} size={15} />}
                            </span>
                            <button
                              type="button"
                              onClick={() => onPickItem(calc.input)}
                              className="flex-1 min-w-0 border-0 bg-transparent p-0 cursor-pointer text-left font-semibold text-[13px] text-foreground truncate"
                            >
                              {calc.normalizedProfile?.shortLabel ?? calc.result.profileLabel}
                            </button>
                            <span className="font-mono text-[11px] text-muted flex-shrink-0">
                              ×{calc.result.quantity} · {fsWeight(calc.result.totalWeightKg)}{" "}
                              {fsWeightUnit()}
                            </span>
                            <button
                              type="button"
                              onClick={() => onRemoveCalc(project.id, calc.id)}
                              title={t("common.remove")}
                              aria-label={t("projects.removeFromProject")}
                              className="flex items-center justify-center rounded-full border-0 cursor-pointer flex-shrink-0 text-muted opacity-0 group-hover:opacity-100"
                              style={{ width: 20, height: 20, background: "var(--surface-inset)" }}
                            >
                              <CloseIcon />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {materials.length > 0 && (
                    <div style={{ borderTop: "1px solid var(--border-faint)" }}>
                      <button
                        type="button"
                        onClick={() => toggleMaterials(project.id)}
                        className="w-full flex items-center gap-2 cursor-pointer border-0 bg-transparent text-left"
                        style={{ padding: "10px 16px" }}
                        aria-expanded={showMaterials}
                      >
                        <svg
                          width="11" height="11" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"
                          className={`text-muted-faint transition-transform ${showMaterials ? "rotate-90" : ""}`}
                        >
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex-1">
                          {t("projects.materials")}
                        </span>
                        <span className="font-mono text-[10px] text-muted-faint">
                          {t("projects.materialsCount", { count: materials.length })}
                        </span>
                      </button>
                      {showMaterials && (
                        <div style={{ padding: "0 8px 8px" }}>
                          {materials.map((m) => (
                            <div
                              key={m.key}
                              className="flex items-baseline gap-2 rounded-[9px]"
                              style={{ padding: "6px 10px" }}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="font-semibold text-[12.5px] text-foreground">{m.label}</span>
                                {m.gradeLabel && (
                                  <span className="font-mono text-[10.5px] text-muted-faint ml-1.5">{m.gradeLabel}</span>
                                )}
                              </span>
                              <span className="font-mono text-[10.5px] text-muted flex-shrink-0 whitespace-nowrap">
                                {t("projects.materialPieces", { count: m.pieceCount })}
                                {m.totalLengthM > 0 ? ` · ${formatLengthM(m.totalLengthM)} m` : ""}
                                {" · "}
                                {fsWeight(m.totalWeightKg)} {fsWeightUnit()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatLengthM(lengthM: number): string {
  return Number(lengthM.toFixed(1)).toString();
}

/* ───────────────────────── Settings view ───────────────────────── */
