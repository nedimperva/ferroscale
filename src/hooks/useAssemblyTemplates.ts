"use client";

import { useCallback, useMemo, useState } from "react";
import { cmdParse } from "@ferroscale/metal-core";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import { normalizeProfileSnapshot, type NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import type { ProjectAdditionalCost, ProjectCategory } from "@/hooks/useProjects";
import {
  isActiveSyncEntity,
  loadAssemblyTemplates,
  markEntityDeleted,
  persistAssemblyTemplates,
} from "@/lib/sync/collections";

export interface AssemblyTemplateItem {
  id: string;
  input: CalculationInput;
  result: CalculationResult;
  normalizedProfile: NormalizedProfileSnapshot;
  quantity: number;
  note?: string;
}

export interface AssemblyTemplate {
  id: string;
  name: string;
  description?: string;
  category?: ProjectCategory;
  items: AssemblyTemplateItem[];
  laborHours?: number;
  additionalCosts?: ProjectAdditionalCost[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  isBuiltin?: boolean;
}

const DEFAULT_PARSER_SETTINGS = {
  pricing: {
    priceBasis: "weight" as const,
    priceUnit: "kg" as const,
    unitPrice: 2.5,
    currency: "EUR" as const,
    wastePercent: 0,
    includeVat: false,
    vatPercent: 0,
  },
  defaultGradeId: "steel-s235jr",
  defaultLengthUnit: "m" as const,
};

export function createItemFromCommand(cmd: string, quantity = 1, note?: string): AssemblyTemplateItem | null {
  const parsed = cmdParse(cmd, DEFAULT_PARSER_SETTINGS);
  if (!parsed.calc) return null;
  return {
    id: crypto.randomUUID(),
    input: { ...parsed.calc.input, quantity },
    result: { ...parsed.calc.result, quantity },
    normalizedProfile: normalizeProfileSnapshot(parsed.calc.input),
    quantity,
    note,
  };
}

export function getBuiltinAssemblyTemplates(): AssemblyTemplate[] {
  const now = "2026-01-01T00:00:00.000Z";

  const stairTreadItems = [
    createItemFromCommand("plt280x900x4 x1 s235", 1, "Tread step plate"),
    createItemFromCommand("l50x50x5 280mm x2 s235", 2, "Side fixing brackets"),
    createItemFromCommand("flt40x5 900mm x1 s235", 1, "Front nosing bar"),
  ].filter(Boolean) as AssemblyTemplateItem[];

  const railingPostItems = [
    createItemFromCommand("shs40x40x3 1m x1 s235", 1, "Main post column"),
    createItemFromCommand("plt120x120x10 x1 s235", 1, "Base anchor flange"),
    createItemFromCommand("plt40x40x3 x1 s235", 1, "Top cap plate"),
  ].filter(Boolean) as AssemblyTemplateItem[];

  const balusterBayItems = [
    createItemFromCommand("rhs40x20x2 2m x1 s235", 1, "Top handrail tube"),
    createItemFromCommand("rhs40x20x2 2m x1 s235", 1, "Bottom runner tube"),
    createItemFromCommand("sq12 0.9m x14 s235", 14, "Vertical pickets / spindles"),
  ].filter(Boolean) as AssemblyTemplateItem[];

  const beamEndPlatesItems = [
    createItemFromCommand("hea140 3m x1 s235", 1, "Main column / beam"),
    createItemFromCommand("plt200x160x12 x2 s235", 2, "Welded end connection plates"),
  ].filter(Boolean) as AssemblyTemplateItem[];

  const fencePanelItems = [
    createItemFromCommand("rhs50x30x2 2.5m x2 s235", 2, "Top & bottom horizontal rails"),
    createItemFromCommand("chs20x2 1.2m x20 s235", 20, "Vertical round tubes"),
  ].filter(Boolean) as AssemblyTemplateItem[];

  return [
    {
      id: "builtin-stair-tread",
      name: "Stair Step Tread (900mm)",
      description: "Standard 900mm steel stair tread with 2x side mounting angles and front nosing flat bar.",
      category: "stairs_railings",
      items: stairTreadItems,
      laborHours: 0.35,
      additionalCosts: [
        { id: "cost-tread-bolts", label: "4x M12 Hex Bolts & Washers", amount: 3.2, category: "hardware" },
      ],
      createdAt: now,
      updatedAt: now,
      isBuiltin: true,
    },
    {
      id: "builtin-railing-post",
      name: "Railing Post & Base Flange (1m)",
      description: "1-metre SHS 40x40 railing post with welded 120x120x10 base plate and top cap.",
      category: "stairs_railings",
      items: railingPostItems,
      laborHours: 0.25,
      additionalCosts: [
        { id: "cost-post-anchors", label: "4x M12 Expansion Floor Anchors", amount: 4.8, category: "hardware" },
      ],
      createdAt: now,
      updatedAt: now,
      isBuiltin: true,
    },
    {
      id: "builtin-baluster-bay",
      name: "Standard Baluster Railing Section (2m)",
      description: "2-metre railing infill panel with 14 vertical square bars and horizontal runners.",
      category: "stairs_railings",
      items: balusterBayItems,
      laborHours: 1.0,
      createdAt: now,
      updatedAt: now,
      isBuiltin: true,
    },
    {
      id: "builtin-beam-end-plates",
      name: "Beam with Connection End Plates (3m)",
      description: "3m HEA 140 structural beam with 2x 200x160x12 drilled end connection plates.",
      category: "structural",
      items: beamEndPlatesItems,
      laborHours: 0.75,
      additionalCosts: [
        { id: "cost-beam-bolts", label: "8x M16 8.8 Structural Bolts", amount: 9.6, category: "hardware" },
      ],
      createdAt: now,
      updatedAt: now,
      isBuiltin: true,
    },
    {
      id: "builtin-fence-panel",
      name: "Industrial Fence Panel (2.5m)",
      description: "2.5m wide perimeter fence panel with 20 vertical round tube pickets.",
      category: "gates_fences",
      items: fencePanelItems,
      laborHours: 1.2,
      createdAt: now,
      updatedAt: now,
      isBuiltin: true,
    },
  ];
}

/**
 * A removed built-in is recorded as a tombstone in the same stored array the
 * custom templates live in: same id as the constant, `isBuiltin`, `deletedAt`
 * set, no items. Nothing new to persist, restoring is just dropping the row,
 * and a later build that changes a standard's contents still honours the
 * removal.
 */
function isBuiltinTombstone(entity: AssemblyTemplate): boolean {
  return Boolean(entity.isBuiltin && entity.deletedAt);
}

export interface UseAssemblyTemplatesReturn {
  templates: AssemblyTemplate[];
  customTemplates: AssemblyTemplate[];
  /** Standards the user has removed — listed so they can be put back. */
  removedBuiltins: AssemblyTemplate[];
  saveTemplate: (
    template: Omit<AssemblyTemplate, "id" | "createdAt" | "updatedAt" | "deletedAt" | "isBuiltin">,
  ) => AssemblyTemplate;
  deleteTemplate: (id: string) => void;
  restoreTemplate: (id: string) => void;
  updateTemplate: (id: string, patch: Partial<AssemblyTemplate>) => void;
  duplicateTemplate: (id: string, copyLabel: string) => AssemblyTemplate | null;
  removeBuiltin: (id: string) => void;
  restoreBuiltin: (id: string) => void;
  restoreAllBuiltins: () => void;
}

export function useAssemblyTemplates(): UseAssemblyTemplatesReturn {
  const [customTemplates, setCustomTemplates] = useState<AssemblyTemplate[]>(() => {
    if (typeof window !== "undefined") {
      return loadAssemblyTemplates();
    }
    return [];
  });

  // Writes are applied to what is on disk, not to this instance's snapshot:
  // more than one component mounts this hook (the dialog and the project view),
  // and folding a write into a stale list would resurrect rows another instance
  // had already removed.
  const persist = useCallback((updater: React.SetStateAction<AssemblyTemplate[]>) => {
    const current = loadAssemblyTemplates();
    const next = typeof updater === "function" ? updater(current) : updater;
    persistAssemblyTemplates(next);
    setCustomTemplates(next);
  }, []);

  const builtins = useMemo(() => getBuiltinAssemblyTemplates(), []);

  const removedBuiltinIds = useMemo(
    () => new Set(customTemplates.filter(isBuiltinTombstone).map((tpl) => tpl.id)),
    [customTemplates],
  );

  const templates = useMemo(() => {
    const activeCustom = customTemplates.filter((tpl) => !tpl.isBuiltin && isActiveSyncEntity(tpl));
    return [...builtins.filter((tpl) => !removedBuiltinIds.has(tpl.id)), ...activeCustom];
  }, [builtins, customTemplates, removedBuiltinIds]);

  const removedBuiltins = useMemo(
    () => builtins.filter((tpl) => removedBuiltinIds.has(tpl.id)),
    [builtins, removedBuiltinIds],
  );

  const saveTemplate = useCallback(
    (
      draft: Omit<AssemblyTemplate, "id" | "createdAt" | "updatedAt" | "deletedAt" | "isBuiltin">,
    ): AssemblyTemplate => {
      const now = new Date().toISOString();
      const newTemplate: AssemblyTemplate = {
        ...draft,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        isBuiltin: false,
      };
      persist((prev) => [newTemplate, ...prev]);
      return newTemplate;
    },
    [persist],
  );

  const deleteTemplate = useCallback(
    (id: string) => {
      const deletedAt = new Date().toISOString();
      persist((prev) =>
        prev.map((tpl) =>
          tpl.id === id && !tpl.isBuiltin && !tpl.deletedAt ? markEntityDeleted(tpl, deletedAt) : tpl,
        ),
      );
    },
    [persist],
  );

  /** Undo for a just-deleted custom template — the soft delete is reversible. */
  const restoreTemplate = useCallback(
    (id: string) => {
      persist((prev) =>
        prev.map((tpl) => {
          if (tpl.id !== id || tpl.isBuiltin || !tpl.deletedAt) return tpl;
          const restored = { ...tpl, updatedAt: new Date().toISOString() };
          delete restored.deletedAt;
          return restored;
        }),
      );
    },
    [persist],
  );

  const updateTemplate = useCallback(
    (id: string, patch: Partial<AssemblyTemplate>) => {
      persist((prev) =>
        prev.map((tpl) => {
          if (tpl.id !== id || tpl.isBuiltin || tpl.deletedAt) return tpl;
          return {
            ...tpl,
            ...patch,
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [persist],
  );

  const duplicateTemplate = useCallback(
    (id: string, copyLabel: string): AssemblyTemplate | null => {
      const source = templates.find((tpl) => tpl.id === id);
      if (!source) return null;
      return saveTemplate({
        name: `${source.name} (${copyLabel})`,
        description: source.description,
        category: source.category,
        items: source.items.map((item) => ({ ...item, id: crypto.randomUUID() })),
        laborHours: source.laborHours,
        additionalCosts: source.additionalCosts?.map((cost) => ({ ...cost, id: crypto.randomUUID() })),
      });
    },
    [templates, saveTemplate],
  );

  const removeBuiltin = useCallback(
    (id: string) => {
      const builtin = builtins.find((tpl) => tpl.id === id);
      if (!builtin) return;
      const now = new Date().toISOString();
      persist((prev) => {
        if (prev.some((tpl) => tpl.id === id)) {
          return prev.map((tpl) => (tpl.id === id ? { ...tpl, updatedAt: now, deletedAt: now } : tpl));
        }
        return [
          ...prev,
          {
            id: builtin.id,
            name: builtin.name,
            items: [],
            isBuiltin: true,
            createdAt: builtin.createdAt,
            updatedAt: now,
            deletedAt: now,
          },
        ];
      });
    },
    [builtins, persist],
  );

  const restoreBuiltin = useCallback(
    (id: string) => {
      persist((prev) => prev.filter((tpl) => !(tpl.id === id && isBuiltinTombstone(tpl))));
    },
    [persist],
  );

  const restoreAllBuiltins = useCallback(() => {
    persist((prev) => prev.filter((tpl) => !isBuiltinTombstone(tpl)));
  }, [persist]);

  return {
    templates,
    customTemplates: customTemplates.filter((tpl) => !tpl.isBuiltin && isActiveSyncEntity(tpl)),
    removedBuiltins,
    saveTemplate,
    deleteTemplate,
    restoreTemplate,
    updateTemplate,
    duplicateTemplate,
    removeBuiltin,
    restoreBuiltin,
    restoreAllBuiltins,
  };
}
