"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { isAssemblyEntry, type SavedEntry } from "@/hooks/useSaved";
import { PROJECT_CATEGORIES, type ProjectAdditionalCost } from "@/hooks/useProjects";
import { SheetShell } from "./sheet-shell";

const MAX_TAGS = 8;

function parseTags(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, MAX_TAGS);
}

export interface SavedEditPatch {
  name: string;
  notes: string;
  tags: string[];
  category?: SavedEntry["category"];
  laborHours?: number;
  additionalCosts?: ProjectAdditionalCost[];
}

/**
 * The one editor for a library entry. Name, notes and tags for anything; plus
 * the trade, the hours and the hardware for an assembly, because those ride
 * along when the assembly is dropped into a project.
 *
 * Those last three used to live in a separate template manager, reachable only
 * from inside a project — a second editor for a second copy of the same
 * record. There is one record now, so there is one editor.
 */
export function SavedEditSheet({
  entry,
  onClose,
  onSubmit,
}: {
  entry: SavedEntry;
  onClose: () => void;
  onSubmit: (patch: SavedEditPatch) => void;
}) {
  const t = useTranslations("command");
  const [name, setName] = useState(entry.name);
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [tags, setTags] = useState((entry.tags ?? []).join(", "));
  const [category, setCategory] = useState<string>(entry.category ?? "");
  const [laborHours, setLaborHours] = useState<string>(
    entry.laborHours != null ? String(entry.laborHours) : "",
  );
  const [costs, setCosts] = useState<ProjectAdditionalCost[]>(entry.additionalCosts ?? []);

  const isAssembly = isAssemblyEntry(entry);

  const submit = () => {
    const hours = Number(laborHours.replace(",", "."));
    onSubmit({
      name,
      notes,
      tags: parseTags(tags),
      ...(isAssembly
        ? {
            category: (category || undefined) as SavedEntry["category"],
            laborHours: Number.isFinite(hours) && hours > 0 ? hours : 0,
            additionalCosts: costs.filter((cost) => cost.label.trim() && cost.amount > 0),
          }
        : {}),
    });
    onClose();
  };

  const fieldClass =
    "w-full rounded-button border border-border-faint bg-[var(--surface-raised)] px-3 text-sm text-foreground placeholder:text-muted-faint outline-none focus-visible:border-[var(--accent-border)]";
  const labelClass = "text-[10px] font-bold text-muted uppercase";

  return (
    <SheetShell title={t("saved.editTitle")} onClose={onClose} maxWidth={520}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass} style={{ letterSpacing: 1 }}>
            {t("saved.fieldName")}
          </span>
          <input
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder={entry.result.profileLabel}
            className={`${fieldClass} h-11`}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass} style={{ letterSpacing: 1 }}>
            {t("saved.fieldNotes")}
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t("saved.notesPlaceholder")}
            className={`${fieldClass} py-2.5 resize-none`}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass} style={{ letterSpacing: 1 }}>
            {t("saved.fieldTags")}
          </span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder={t("saved.tagsPlaceholder")}
            className={`${fieldClass} h-11 font-mono text-[13px]`}
          />
          <span className="text-[11px] text-muted-faint">{t("saved.tagsHint", { max: MAX_TAGS })}</span>
        </label>

        {isAssembly && (
          <>
            <div className="mt-1 pt-3 border-t border-border-faint">
              <p className="text-[10px] font-bold text-muted uppercase" style={{ letterSpacing: 1 }}>
                {t("saved.assemblyExtras")}
              </p>
              <p className="mt-1 text-[11.5px] text-muted-faint leading-snug">
                {t("saved.assemblyExtrasHint")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass} style={{ letterSpacing: 1 }}>
                  {t("projects.categoryLabel")}
                </span>
                <select
                  value={category}
                        onChange={(e) => setCategory(e.target.value)}
                  className={`${fieldClass} h-11`}
                >
                  <option value="">{t("projects.generalSection")}</option>
                  {PROJECT_CATEGORIES.map((id) => (
                    <option key={id} value={id}>
                      {t(`projects.categories.${id}`)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClass} style={{ letterSpacing: 1 }}>
                  {t("templates.laborHoursLabel")}
                </span>
                <input
                  value={laborHours}
                        inputMode="decimal"
                  onChange={(e) => setLaborHours(e.target.value)}
                  placeholder="0"
                  className={`${fieldClass} h-11 font-mono`}
                />
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className={labelClass} style={{ letterSpacing: 1 }}>
                {t("templates.extraCostsLabel")}
              </span>
              {costs.map((cost, index) => (
                <div key={cost.id} className="flex items-center gap-2">
                  <input
                    value={cost.label}
                            onChange={(e) =>
                      setCosts((prev) =>
                        prev.map((row, i) => (i === index ? { ...row, label: e.target.value } : row)),
                      )
                    }
                    placeholder={t("templates.newCostLabel")}
                    className={`${fieldClass} h-10 flex-1 min-w-0`}
                  />
                  <input
                    value={String(cost.amount)}
                            inputMode="decimal"
                    onChange={(e) =>
                      setCosts((prev) =>
                        prev.map((row, i) =>
                          i === index
                            ? { ...row, amount: Number(e.target.value.replace(",", ".")) || 0 }
                            : row,
                        ),
                      )
                    }
                    className={`${fieldClass} h-10 w-24 font-mono text-right`}
                  />
                  <button
                    type="button"
                            onClick={() => setCosts((prev) => prev.filter((_, i) => i !== index))}
                    aria-label={t("common.remove")}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-button border border-border-faint bg-[var(--surface)] text-muted cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                    onClick={() =>
                  setCosts((prev) => [
                    ...prev,
                    { id: crypto.randomUUID(), label: "", amount: 0, category: "hardware" },
                  ])
                }
                className="h-10 rounded-button border border-dashed border-border-strong bg-transparent text-[12px] font-semibold text-muted cursor-pointer"
              >
                {t("templates.addCostLine")}
              </button>
            </div>
          </>
        )}

        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={submit}
            className="flex-1 h-11 rounded-button bg-[var(--action)] text-[var(--action-contrast)] font-bold text-sm"
          >
            {t("common.saveChanges")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-button border border-border bg-[var(--surface)] font-semibold text-sm text-foreground"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </SheetShell>
  );
}
