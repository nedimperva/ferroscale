"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import { useAssemblyTemplates, type AssemblyTemplate } from "@/hooks/useAssemblyTemplates";
import { PROJECT_CATEGORIES } from "@/hooks/useProjects";

export function AssemblyTemplateModal({
  onInsert,
  onClose,
}: {
  onInsert: (template: AssemblyTemplate, multiplier: number, customAssemblyName?: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("command");
  const { templates } = useAssemblyTemplates();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id ?? "");
  const [multiplier, setMultiplier] = useState<number>(1);
  const [customAsmName, setCustomAsmName] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      if (selectedCategory !== "all" && tpl.category !== selectedCategory) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = tpl.name.toLowerCase().includes(q);
        const matchesDesc = tpl.description?.toLowerCase().includes(q);
        const matchesItems = tpl.items.some(
          (it) =>
            it.result.profileLabel.toLowerCase().includes(q) ||
            it.note?.toLowerCase().includes(q),
        );
        if (!matchesName && !matchesDesc && !matchesItems) return false;
      }
      return true;
    });
  }, [templates, selectedCategory, search]);

  const selectedTemplate = useMemo(() => {
    return (
      templates.find((t) => t.id === selectedTemplateId) ??
      filteredTemplates[0] ??
      templates[0]
    );
  }, [templates, selectedTemplateId, filteredTemplates]);

  // Live calculations for the selected template scaled by the multiplier
  const preview = useMemo(() => {
    if (!selectedTemplate) return null;
    const mult = Math.max(1, Math.floor(multiplier || 1));

    let totalWeight = 0;
    let totalMaterialCost = 0;
    let totalPieces = 0;

    for (const item of selectedTemplate.items) {
      const itemQty = Math.max(1, Math.floor((item.quantity || 1) * mult));
      totalPieces += itemQty;
      totalWeight += item.result.unitWeightKg * itemQty;
      totalMaterialCost += (item.result.grandTotalAmount / (item.result.quantity || 1)) * itemQty;
    }

    const totalLaborHours = (selectedTemplate.laborHours ?? 0) * mult;
    const totalExtraCosts = (selectedTemplate.additionalCosts ?? []).reduce(
      (sum, c) => sum + c.amount * mult,
      0,
    );

    return {
      mult,
      totalWeight,
      totalMaterialCost,
      totalPieces,
      totalLaborHours,
      totalExtraCosts,
    };
  }, [selectedTemplate, multiplier]);

  const handleInsert = () => {
    if (!selectedTemplate) return;
    const mult = Math.max(1, Math.floor(multiplier || 1));
    const asmName = customAsmName.trim() || selectedTemplate.name;
    onInsert(selectedTemplate, mult, asmName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--border-faint)] bg-[var(--surface)] shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={t("templates.modalTitle")}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-faint)] bg-[var(--surface-raised)]">
          <div>
            <h2 className="font-extrabold text-base text-foreground flex items-center gap-2">
              <span>🧩</span>
              <span>{t("templates.modalTitle")}</span>
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {t("templates.modalSubtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-[var(--surface)] transition-colors cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Body Container */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left Column: Template Catalog & Filter */}
          <div className="md:col-span-6 flex flex-col border-r border-[var(--border-faint)] overflow-hidden bg-[var(--surface)]">
            {/* Search & Category Pills */}
            <div className="p-3 border-b border-[var(--border-faint)] space-y-2 bg-[var(--surface)]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("templates.searchPlaceholder")}
                className="w-full h-8 px-3 rounded-lg text-xs bg-[var(--surface-inset)] border border-[var(--border-faint)] text-foreground placeholder:text-muted-faint outline-none"
              />
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className="px-2.5 py-1 rounded-md font-semibold whitespace-nowrap cursor-pointer transition-colors"
                  style={{
                    background: selectedCategory === "all" ? "var(--accent)" : "var(--surface-raised)",
                    color: selectedCategory === "all" ? "var(--accent-contrast)" : "var(--muted)",
                  }}
                >
                  {t("projects.allCategories")}
                </button>
                {PROJECT_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className="px-2.5 py-1 rounded-md font-semibold whitespace-nowrap cursor-pointer transition-colors"
                    style={{
                      background: selectedCategory === cat ? "var(--accent)" : "var(--surface-raised)",
                      color: selectedCategory === cat ? "var(--accent-contrast)" : "var(--muted)",
                    }}
                  >
                    {t(`projects.categories.${cat}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Template List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredTemplates.map((tpl) => {
                const isSelected = selectedTemplate?.id === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => {
                      setSelectedTemplateId(tpl.id);
                      setCustomAsmName(tpl.name);
                    }}
                    className="p-3 rounded-xl border transition-all cursor-pointer text-left space-y-1.5"
                    style={{
                      borderColor: isSelected ? "var(--accent)" : "var(--border-faint)",
                      background: isSelected ? "var(--accent-surface)" : "var(--surface-raised)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-foreground truncate">
                        {tpl.name}
                      </span>
                      {tpl.category && (
                        <span className="px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-[var(--surface)] text-muted border border-[var(--border-faint)]">
                          {t(`projects.categories.${tpl.category}`)}
                        </span>
                      )}
                    </div>
                    {tpl.description && (
                      <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                        {tpl.description}
                      </p>
                    )}
                    {/* Item pills preview */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {tpl.items.map((it) => (
                        <span
                          key={it.id}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--surface-inset)] text-muted-faint border border-[var(--border-faint)]"
                        >
                          {it.quantity}× {it.result.profileLabel}
                        </span>
                      ))}
                      {tpl.laborHours !== undefined && tpl.laborHours > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--surface-inset)] text-muted-faint border border-[var(--border-faint)]">
                          ⏱️ {tpl.laborHours}h
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Multiplier, Assembly Tag & Live Preview */}
          <div className="md:col-span-6 flex flex-col p-6 overflow-y-auto bg-[var(--surface-raised)] space-y-5">
            {selectedTemplate && preview ? (
              <>
                {/* Template Title & Summary */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm text-foreground">
                      {selectedTemplate.name}
                    </h3>
                    {selectedTemplate.isBuiltin && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent-surface)] text-[var(--accent-text)] border border-[var(--accent-border)]">
                        Standard EN
                      </span>
                    )}
                  </div>
                  {selectedTemplate.description && (
                    <p className="text-xs text-muted leading-relaxed">
                      {selectedTemplate.description}
                    </p>
                  )}
                </div>

                {/* Multiplier Configuration */}
                <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-faint)] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">
                      {t("templates.multiplierLabel")}:
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 5, 10, 15, 20].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setMultiplier(val)}
                          className="px-2 py-1 rounded text-xs font-bold border transition-colors cursor-pointer"
                          style={{
                            background: multiplier === val ? "var(--accent)" : "var(--surface-raised)",
                            color: multiplier === val ? "var(--accent-contrast)" : "var(--foreground)",
                            borderColor: multiplier === val ? "var(--accent)" : "var(--border-faint)",
                          }}
                        >
                          ×{val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMultiplier((m) => Math.max(1, m - 1))}
                      className="w-9 h-9 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-faint)] text-foreground font-bold text-base hover:bg-[var(--surface-inset)] cursor-pointer flex items-center justify-center"
                    >
                      -
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={multiplier}
                        onChange={(e) => setMultiplier(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full h-9 rounded-lg border border-[var(--border-faint)] bg-[var(--surface-inset)] text-center font-mono font-bold text-sm text-foreground outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setMultiplier((m) => m + 1)}
                      className="w-9 h-9 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-faint)] text-foreground font-bold text-base hover:bg-[var(--surface-inset)] cursor-pointer flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Target Sub-Assembly Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    {t("templates.targetAssemblyLabel")}:
                  </label>
                  <input
                    value={customAsmName}
                    onChange={(e) => setCustomAsmName(e.target.value)}
                    placeholder={selectedTemplate.name}
                    className="w-full h-8 px-3 rounded-lg text-xs bg-[var(--surface)] border border-[var(--border-faint)] text-foreground outline-none font-semibold"
                  />
                  <p className="text-[10.5px] text-muted-faint">
                    {t("templates.targetAssemblyHint")}
                  </p>
                </div>

                {/* Scaled Preview Bill of Materials */}
                <div className="space-y-2">
                  <div className="text-[10.5px] font-bold text-muted uppercase tracking-wider">
                    {t("templates.scaledBreakdown", { mult: preview.mult })}
                  </div>
                  <div className="rounded-xl border border-[var(--border-faint)] bg-[var(--surface)] overflow-hidden">
                    <div className="divide-y divide-[var(--border-faint)]">
                      {selectedTemplate.items.map((it) => {
                        const scaledQty = Math.max(1, Math.floor((it.quantity || 1) * preview.mult));
                        const itemWeight = it.result.unitWeightKg * scaledQty;
                        return (
                          <div
                            key={it.id}
                            className="flex items-center justify-between px-3 py-2 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-foreground">
                                {scaledQty}× {it.result.profileLabel}
                              </span>
                              {it.note && (
                                <span className="block text-[10.5px] text-muted truncate">
                                  {it.note}
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-muted flex-shrink-0">
                              {fsWeight(itemWeight)} {fsWeightUnit()}
                            </span>
                          </div>
                        );
                      })}
                      {selectedTemplate.additionalCosts?.map((cost) => (
                        <div
                          key={cost.id}
                          className="flex items-center justify-between px-3 py-2 text-xs bg-[var(--surface-inset)]"
                        >
                          <span className="text-foreground">
                            🔩 {cost.label} {preview.mult > 1 ? `(×${preview.mult})` : ""}
                          </span>
                          <span className="font-mono font-semibold text-foreground">
                            € {fsMoney(cost.amount * preview.mult)}
                          </span>
                        </div>
                      ))}
                      {preview.totalLaborHours > 0 && (
                        <div className="flex items-center justify-between px-3 py-2 text-xs bg-[var(--surface-inset)]">
                          <span className="text-foreground">
                            ⏱️ {t("projects.laborHours")}
                          </span>
                          <span className="font-mono font-semibold text-foreground">
                            {preview.totalLaborHours.toFixed(2)} hrs
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Subtotals Footer */}
                    <div className="flex items-center justify-between px-3 py-2.5 bg-[var(--surface-raised)] border-t border-[var(--border-faint)] font-mono text-xs font-bold">
                      <span className="text-foreground">
                        {preview.totalPieces} {t("projects.columns.items")}
                      </span>
                      <span className="text-foreground" style={{ color: "var(--accent-text)" }}>
                        {fsWeight(preview.totalWeight)} {fsWeightUnit()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 h-9 rounded-xl border border-[var(--border-faint)] bg-[var(--surface)] hover:bg-[var(--surface-inset)] text-xs font-bold text-foreground cursor-pointer transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleInsert}
                    className="flex-1 h-9 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 text-xs font-bold shadow-sm cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>+ {t("templates.insertAction", { count: preview.mult })}</span>
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
