"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import { isAssemblyEntry, type SavedEntry } from "@/hooks/useSaved";
import { PROJECT_CATEGORIES } from "@/hooks/useProjects";
import { DeskIcon } from "../desktop/desk-atoms";
import { SheetShell } from "../sheets/sheet-shell";

/**
 * Pick a library assembly, scale it, drop it into a project.
 *
 * It used to be a template browser with a "manage" half bolted on: renaming,
 * re-costing and deleting a template could only be done here, inside a
 * project, on records that lived in a store of their own. Templates are
 * library entries now, so managing one happens in the library like everything
 * else and this dialog does the one thing its name says.
 */
export function InsertAssemblyModal({
  assemblies,
  onInsert,
  onClose,
}: {
  /** Multi-part library entries — the only ones there is anything to scale. */
  assemblies: SavedEntry[];
  onInsert: (entry: SavedEntry, multiplier: number, customAssemblyName?: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("command");
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
          {t("templates.modalSubtitle")}
        </p>
      }
    >
      <BrowseAssembliesBody assemblies={assemblies} onInsert={onInsert} onClose={onClose} />
    </SheetShell>
  );
}

/** Every multi-part entry in the library, newest first. */
export function libraryAssemblies(saved: SavedEntry[]): SavedEntry[] {
  return saved.filter(isAssemblyEntry);
}

function BrowseAssembliesBody({
  assemblies,
  onInsert,
  onClose,
}: {
  assemblies: SavedEntry[];
  onInsert: (entry: SavedEntry, multiplier: number, customAssemblyName?: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("command");

  const [selectedId, setSelectedId] = useState<string>(assemblies[0]?.id ?? "");
  const [multiplier, setMultiplier] = useState<number>(1);
  const [customAsmName, setCustomAsmName] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [mobileTab, setMobileTab] = useState<"list" | "preview">("list");

  const filtered = useMemo(() => {
    return assemblies.filter((entry) => {
      if (selectedCategory !== "all" && entry.category !== selectedCategory) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = entry.name.toLowerCase().includes(q);
        const matchesNotes = entry.notes?.toLowerCase().includes(q);
        const matchesParts = entry.parts.some(
          (part) =>
            part.result.profileLabel.toLowerCase().includes(q) ||
            part.name.toLowerCase().includes(q),
        );
        if (!matchesName && !matchesNotes && !matchesParts) return false;
      }
      return true;
    });
  }, [assemblies, selectedCategory, search]);

  const selected = useMemo(
    () => assemblies.find((entry) => entry.id === selectedId) ?? filtered[0] ?? assemblies[0],
    [assemblies, selectedId, filtered],
  );

  // Live calculations for the selected template scaled by the multiplier
  const preview = useMemo(() => {
    if (!selected) return null;
    const mult = Math.max(1, Math.floor(multiplier || 1));

    let totalWeight = 0;
    let totalMaterialCost = 0;
    let totalPieces = 0;

    for (const part of selected.parts) {
      const itemQty = Math.max(1, Math.floor((part.input.quantity || 1) * mult));
      totalPieces += itemQty;
      totalWeight += part.result.unitWeightKg * itemQty;
      totalMaterialCost += (part.result.grandTotalAmount / (part.result.quantity || 1)) * itemQty;
    }

    const totalLaborHours = (selected.laborHours ?? 0) * mult;
    const totalExtraCosts = (selected.additionalCosts ?? []).reduce(
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
  }, [selected, multiplier]);

  const handleInsert = () => {
    if (!selected) return;
    const mult = Math.max(1, Math.floor(multiplier || 1));
    const asmName = customAsmName.trim() || selected.name;
    onInsert(selected, mult, asmName);
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
          1. {t("templates.selectTemplateTab")} ({filtered.length})
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
            <span className="px-1.5 py-0.2 rounded-none text-[10px] bg-[var(--accent-surface)] text-[var(--accent-text)] font-mono">
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
                  background: selectedCategory === "all" ? "var(--action)" : "var(--surface-inset)",
                  color: selectedCategory === "all" ? "var(--action-contrast)" : "var(--muted)",
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
                    background: selectedCategory === cat ? "var(--action)" : "var(--surface-inset)",
                    color: selectedCategory === cat ? "var(--action-contrast)" : "var(--muted)",
                  }}
                >
                  {t(`projects.categories.${cat}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Template List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filtered.map((tpl) => {
              const isSelected = selected?.id === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => {
                    setSelectedId(tpl.id);
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
                  {tpl.notes && (
                    <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                      {tpl.notes}
                    </p>
                  )}
                  {/* Item pills preview */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tpl.parts.map((part) => (
                      <span
                        key={part.id}
                        className="px-2 py-0.5 rounded text-[10.5px] font-mono bg-[var(--surface-inset)] text-muted-faint border border-[var(--border-faint)]"
                      >
                        {part.input.quantity}× {part.result.profileLabel}
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
          {selected && preview ? (
            <>
              {/* Template Title & Summary */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-foreground">
                    {selected.name}
                  </h3>
                </div>
                {selected.notes && (
                  <p className="text-xs text-muted leading-relaxed">
                    {selected.notes}
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
                        className="px-2.5 py-1.5 text-xs font-bold border transition-colors cursor-pointer min-w-[36px]"
                        style={{
                          background: multiplier === val ? "var(--action)" : "transparent",
                          color: multiplier === val ? "var(--action-contrast)" : "var(--foreground)",
                          borderColor: multiplier === val ? "var(--action)" : "var(--border)",
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
                  placeholder={selected.name}
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
                    {selected.parts.map((part) => {
                      const scaledQty = Math.max(1, Math.floor((part.input.quantity || 1) * preview.mult));
                      const itemWeight = part.result.unitWeightKg * scaledQty;
                      return (
                        <div
                          key={part.id}
                          className="flex items-center justify-between px-3 py-2 text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-foreground block truncate">
                              {scaledQty}× {part.result.profileLabel}
                            </span>
                            {part.name && (
                              <span className="block text-[10.5px] text-muted truncate">
                                {part.name}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-muted flex-shrink-0 text-[11.5px]">
                            {fsWeight(itemWeight)} {fsWeightUnit()}
                          </span>
                        </div>
                      );
                    })}
                    {selected.additionalCosts?.map((cost) => (
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
                  {mobileTab === "preview" ? `← ${t("templates.selectTemplateTab")}` : t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleInsert}
                  className="flex-1 h-10 rounded-xl bg-[var(--action)] text-[var(--action-contrast)] hover:opacity-90 text-xs font-bold shadow-sm cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <span>+ {t("templates.insertAction", { count: preview.mult })}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-muted text-center max-w-[220px] leading-relaxed">
                {t("templates.noAssembliesHint")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
