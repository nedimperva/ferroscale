"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/hooks/useProjects";
import type { AssemblyTemplateItem } from "@/hooks/useAssemblyTemplates";
import { DeskIcon } from "../desktop/desk-atoms";
import { SheetShell } from "../sheets/sheet-shell";

export function SaveAssemblyTemplateModal({
  assemblyName,
  items,
  onSave,
  onClose,
}: {
  assemblyName: string;
  items: AssemblyTemplateItem[];
  onSave: (name: string, description?: string, category?: ProjectCategory) => void;
  onClose: () => void;
}) {
  const t = useTranslations("command");
  const [name, setName] = useState<string>(assemblyName || "");
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState<ProjectCategory>("structural");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), description.trim() || undefined, category);
    onClose();
  };

  return (
    <SheetShell
      title={t("templates.saveTemplateTitle")}
      onClose={onClose}
      size="compact"
      icon={
        <span className="flex items-center justify-center rounded-chip" style={{ width: 34, height: 34, background: "var(--accent-surface)" }}>
          <DeskIcon name="bookmark" stroke="var(--accent-text)" />
        </span>
      }
      subtitle={
        <p className="text-[11.5px] text-muted mt-1">
          {t("templates.saveTemplateSubtitle", { count: items.length })}
        </p>
      }
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 sm:h-10 rounded-button border border-border-faint bg-[var(--surface)] text-xs font-bold text-foreground cursor-pointer"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 h-11 sm:h-10 rounded-button bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-bold disabled:opacity-40 cursor-pointer"
          >
            {t("common.save")}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Template Name Input */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-foreground">
            {t("templates.templateNameLabel")}:
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Standard Stair Tread, Custom Bracket"
            autoFocus
            className="w-full h-10 px-3 rounded-xl text-xs sm:text-sm bg-[var(--surface-inset)] border border-[var(--border-faint)] text-foreground font-semibold outline-none"
          />
        </div>

        {/* Category Select */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-foreground">
            {t("projects.categoryLabel")}:
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ProjectCategory)}
            className="w-full h-10 px-3 rounded-xl text-xs sm:text-sm bg-[var(--surface-inset)] border border-[var(--border-faint)] text-foreground font-semibold cursor-pointer outline-none"
          >
            {PROJECT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {t(`projects.categories.${cat}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-foreground">
            {t("templates.descriptionLabel")}:
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("templates.descriptionPlaceholder")}
            rows={2}
            className="w-full p-2.5 rounded-xl text-xs sm:text-sm bg-[var(--surface-inset)] border border-[var(--border-faint)] text-foreground outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Included Items Preview */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider">
            {t("templates.includedItems")}:
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-faint)]">
            {items.map((it) => (
              <span
                key={it.id}
                className="px-2 py-0.5 rounded-md text-[10.5px] font-mono bg-[var(--surface)] text-foreground border border-[var(--border-faint)]"
              >
                {it.quantity}× {it.result.profileLabel}
              </span>
            ))}
          </div>
        </div>

      </div>
    </SheetShell>
  );
}
