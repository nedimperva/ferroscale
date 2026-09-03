"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import { useAssemblyTemplates, type AssemblyTemplate } from "@/hooks/useAssemblyTemplates";
import { PROJECT_CATEGORIES } from "@/hooks/useProjects";
import { DeskIcon } from "../desktop/desk-atoms";
import { ManageTemplatesPanel } from "./manage-templates-panel";
import { SheetShell } from "../sheets/sheet-shell";

type TemplateMode = "browse" | "manage";

export function AssemblyTemplateModal({
  onInsert,
  onClose,
}: {
  onInsert: (template: AssemblyTemplate, multiplier: number, customAssemblyName?: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("command");
  // One hook instance for the whole dialog: each call keeps its own React state
  // over the same storage, so two would silently drift apart.
  const templatesApi = useAssemblyTemplates();
  const [mode, setMode] = useState<TemplateMode>("browse");

  const modeToggle = (
    <div className="hidden sm:flex items-center gap-1.5 p-1.5 rounded-button bg-[var(--surface-inset)] border border-border-faint flex-shrink-0">
      {(["browse", "manage"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setMode(value)}
          aria-pressed={mode === value}
          className="h-8 px-3.5 rounded-chip text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
          style={{
            background: mode === value ? "var(--surface)" : "transparent",
            color: mode === value ? "var(--foreground)" : "var(--muted)",
            boxShadow: mode === value ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}
        >
          <span>{value === "browse" ? t("templates.browseTab") : t("templates.manageTab")}</span>
          {value === "manage" && templatesApi.customTemplates.length > 0 && (
            <span className="px-1.5 rounded-full font-mono text-[10px] font-semibold bg-[var(--accent-surface)] text-[var(--accent-text)]">
              {templatesApi.customTemplates.length}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <SheetShell
      title={t("templates.modalTitle")}
      onClose={onClose}
      size="wide"
      bare
      icon={
        <span className="flex items-center justify-center rounded-chip" style={{ width: 34, height: 34, background: "var(--accent-surface)" }}>
          <DeskIcon name="layers" stroke="var(--accent-text)" />
        </span>
      }
      subtitle={
        <p className="text-[11px] sm:text-xs text-muted mt-0.5 truncate">
          {mode === "manage" ? t("templates.manageSubtitle") : t("templates.modalSubtitle")}
        </p>
      }
      headerAction={modeToggle}
    >
      {/* Browse / Manage — full width on a phone, where the header has no room */}
      <div className="flex sm:hidden items-center gap-1.5 p-1.5 border-b border-border-faint bg-[var(--surface-raised)] flex-shrink-0">
        {(["browse", "manage"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            aria-pressed={mode === value}
            className="flex-1 h-10 rounded-chip text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
            style={{
              background: mode === value ? "var(--surface)" : "transparent",
              color: mode === value ? "var(--foreground)" : "var(--muted)",
              boxShadow: mode === value ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            <span>{value === "browse" ? t("templates.browseTab") : t("templates.manageTab")}</span>
            {value === "manage" && templatesApi.customTemplates.length > 0 && (
              <span className="px-1.5 rounded-full font-mono text-[10px] font-semibold bg-[var(--accent-surface)] text-[var(--accent-text)]">
                {templatesApi.customTemplates.length}
              </span>
            )}
          </button>
        ))}
      </div>

        {mode === "manage" ? (
          <ManageTemplatesPanel api={templatesApi} />
        ) : (
          <BrowseTemplatesBody templates={templatesApi.templates} onInsert={onInsert} onClose={onClose} />
        )}
    </SheetShell>
  );
}

function BrowseTemplatesBody({
  templates,
  onInsert,
  onClose,
}: {
  templates: AssemblyTemplate[];
  onInsert: (template: AssemblyTemplate, multiplier: number, customAssemblyName?: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("command");

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id ?? "");
  const [multiplier, setMultiplier] = useState<number>(1);
  const [customAsmName, setCustomAsmName] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [mobileTab, setMobileTab] = useState<"list" | "preview">("list");

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
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden items-center border-b border-[var(--border-faint)] bg-[var(--surface-raised)] p-1.5 gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab("list")}
          className="flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center"
          style={{
            background: mobileTab === "list" ? "var(--surface)" : "transparent",
            color: mobileTab === "list" ? "var(--foreground)" : "var(--muted)",
            boxShadow: mobileTab === "list" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}
        >
          1. {t("templates.selectTemplateTab")} ({filteredTemplates.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("preview")}
          className="flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
          style={{
            background: mobileTab === "preview" ? "var(--surface)" : "transparent",
            color: mobileTab === "preview" ? "var(--foreground)" : "var(--muted)",
            boxShadow: mobileTab === "preview" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}
        >
          <span>2. {t("templates.configureTab")}</span>
          {preview && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--accent-surface)] text-[var(--accent-text)] font-mono">
              ×{preview.mult}
            </span>
          )}
        </button>
      </div>

      {/* Body Container */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Left Column: Template Catalog & Filter */}
        <div
          className={`md:col-span-6 flex-col border-r border-[var(--border-faint)] overflow-hidden bg-[var(--surface)] ${
            mobileTab === "preview" ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search & Category Pills */}
          <div className="p-3 border-b border-[var(--border-faint)] space-y-2 bg-[var(--surface)] flex-shrink-0">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("templates.searchPlaceholder")}
              className="w-full h-9 px-3 rounded-lg text-xs bg-[var(--surface-inset)] border border-[var(--border-faint)] text-foreground placeholder:text-muted-faint outline-none"
            />
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] touch-pan-x">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className="px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap cursor-pointer transition-colors"
                style={{
                  background: selectedCategory === "all" ? "var(--accent)" : "var(--surface-raised)",
                  color: selectedCategory === "all" ? "var(--accent-contrast)" : "var(--muted)",
                }}
              >
                {t("projects.categories.all")}
              </button>
              {PROJECT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className="px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap cursor-pointer transition-colors"
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
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredTemplates.map((tpl) => {
              const isSelected = selectedTemplate?.id === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => {
                    setSelectedTemplateId(tpl.id);
                    setCustomAsmName(tpl.name);
                    // On mobile, automatically advance to configure tab
                    if (window.innerWidth < 768) {
                      setMobileTab("preview");
                    }
                  }}
                  className="p-3.5 rounded-xl border transition-all cursor-pointer text-left space-y-2 active:scale-[0.99]"
                  style={{
                    borderColor: isSelected ? "var(--accent)" : "var(--border-faint)",
                    background: isSelected ? "var(--accent-surface)" : "var(--surface-raised)",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                      {tpl.name}
                    </span>
                    {tpl.category && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--surface)] text-muted border border-[var(--border-faint)] flex-shrink-0">
                        {t(`projects.categories.${tpl.category}`)}
                      </span>
                    )}
                  </div>
                  {tpl.description && (
                    <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>
                  )}
                  {/* Item pills preview */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tpl.items.map((it) => (
                      <span
                        key={it.id}
                        className="px-2 py-0.5 rounded text-[10.5px] font-mono bg-[var(--surface-inset)] text-muted-faint border border-[var(--border-faint)]"
                      >
                        {it.quantity}× {it.result.profileLabel}
                      </span>
                    ))}
                    {tpl.laborHours !== undefined && tpl.laborHours > 0 && (
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-mono bg-[var(--surface-inset)] text-muted-faint border border-[var(--border-faint)]">
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
        <div
          className={`md:col-span-6 flex-col p-4 sm:p-6 overflow-y-auto bg-[var(--surface-raised)] space-y-4 sm:space-y-5 ${
            mobileTab === "list" ? "hidden md:flex" : "flex"
          }`}
        >
          {selectedTemplate && preview ? (
            <>
              {/* Template Title & Summary */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-foreground">
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
              <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-faint)] space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-xs font-bold text-foreground">
                    {t("templates.multiplierLabel")}:
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1, 5, 10, 15, 20].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setMultiplier(val)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer min-w-[36px]"
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

                {/* Stepper with Large 44px Touch Targets */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMultiplier((m) => Math.max(1, m - 1))}
                    className="w-11 h-11 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-faint)] text-foreground font-extrabold text-xl hover:bg-[var(--surface-inset)] active:scale-95 cursor-pointer flex items-center justify-center"
                  >
                    −
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={multiplier}
                      onChange={(e) => setMultiplier(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full h-11 rounded-xl border border-[var(--border-faint)] bg-[var(--surface-inset)] text-center font-mono font-extrabold text-base text-foreground outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setMultiplier((m) => m + 1)}
                    className="w-11 h-11 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-faint)] text-foreground font-extrabold text-xl hover:bg-[var(--surface-inset)] active:scale-95 cursor-pointer flex items-center justify-center"
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
                  className="w-full h-9 px-3 rounded-xl text-xs bg-[var(--surface)] border border-[var(--border-faint)] text-foreground outline-none font-semibold"
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
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-foreground block truncate">
                              {scaledQty}× {it.result.profileLabel}
                            </span>
                            {it.note && (
                              <span className="block text-[10.5px] text-muted truncate">
                                {it.note}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-muted flex-shrink-0 text-[11.5px]">
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
                        <span className="text-foreground truncate pr-2">
                          🔩 {cost.label} {preview.mult > 1 ? `(×${preview.mult})` : ""}
                        </span>
                        <span className="font-mono font-semibold text-foreground flex-shrink-0 text-[11.5px]">
                          € {fsMoney(cost.amount * preview.mult)}
                        </span>
                      </div>
                    ))}
                    {preview.totalLaborHours > 0 && (
                      <div className="flex items-center justify-between px-3 py-2 text-xs bg-[var(--surface-inset)]">
                        <span className="text-foreground">
                          ⏱️ {t("projects.laborHours")}
                        </span>
                        <span className="font-mono font-semibold text-foreground text-[11.5px]">
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
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.innerWidth < 768 && mobileTab === "preview") {
                      setMobileTab("list");
                    } else {
                      onClose();
                    }
                  }}
                  className="flex-1 h-10 rounded-xl border border-[var(--border-faint)] bg-[var(--surface)] hover:bg-[var(--surface-inset)] text-xs font-bold text-foreground cursor-pointer transition-colors"
                >
                  {window.innerWidth < 768 && mobileTab === "preview" ? `← ${t("templates.selectTemplateTab")}` : t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleInsert}
                  className="flex-1 h-10 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 text-xs font-bold shadow-sm cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <span>+ {t("templates.insertAction", { count: preview.mult })}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-muted text-center max-w-[220px] leading-relaxed">
                {t("templates.noTemplatesAtAllHint")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
