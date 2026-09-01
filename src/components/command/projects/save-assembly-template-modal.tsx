"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/hooks/useProjects";
import type { AssemblyTemplateItem } from "@/hooks/useAssemblyTemplates";

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-[var(--border-faint)] bg-[var(--surface)] p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label={t("templates.saveTemplateTitle")}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-sm sm:text-base text-foreground flex items-center gap-1.5">
              <span>💾</span>
              <span>{t("templates.saveTemplateTitle")}</span>
            </h3>
            <p className="text-[11.5px] text-muted">
              {t("templates.saveTemplateSubtitle", { count: items.length })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

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
            {t("projects.category")}:
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

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-[var(--border-faint)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-xs font-bold text-foreground cursor-pointer transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 h-10 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-bold disabled:opacity-40 cursor-pointer active:scale-98 transition-all shadow-xs"
          >
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
