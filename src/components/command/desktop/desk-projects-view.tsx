"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import { CommandGlyph } from "../command-glyph";
import type { CalculationInput, CurrencyCode } from "@/lib/calculator/types";
import type { Project } from "@/hooks/useProjects";
import { DeskTopbar } from "./desk-sidebar";
import { CloseIcon, DeskBtn, DeskIcon } from "./desk-atoms";
import { familyForInput } from "../command-copy";

export function DeskProjectsView({
  projects,
  onPickItem,
  onCreateProject,
  onRemoveCalc,
}: {
  projects: Project[];
  onPickItem: (input: CalculationInput) => void;
  onCreateProject: (name: string) => Project;
  onRemoveCalc: (projectId: string, calcId: string) => void;
}) {
  const t = useTranslations("command");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

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
              return (
                <div
                  key={project.id}
                  className="rounded-[18px] overflow-hidden"
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
                      <span className="font-mono text-[10.5px] text-muted">
                        {t("projects.itemCount", { count: calcs.length })}
                      </span>
                    </div>
                    <div className="flex gap-3.5 mt-2.5">
                      <span
                        className="font-mono text-[12.5px] font-bold"
                        style={{ color: "var(--accent)" }}
                      >
                        {fsWeight(totKg)} {fsWeightUnit(totKg)}
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
                              {fsWeightUnit(calc.result.totalWeightKg)}
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Settings view ───────────────────────── */
