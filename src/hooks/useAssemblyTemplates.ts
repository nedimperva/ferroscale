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

function createItemFromCommand(cmd: string, quantity = 1, note?: string): AssemblyTemplateItem | null {
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

export interface UseAssemblyTemplatesReturn {
  templates: AssemblyTemplate[];
  customTemplates: AssemblyTemplate[];
  saveTemplate: (
    template: Omit<AssemblyTemplate, "id" | "createdAt" | "updatedAt" | "deletedAt" | "isBuiltin">,
  ) => AssemblyTemplate;
  deleteTemplate: (id: string) => void;
  updateTemplate: (id: string, patch: Partial<AssemblyTemplate>) => void;
}

export function useAssemblyTemplates(): UseAssemblyTemplatesReturn {
  const [customTemplates, setCustomTemplates] = useState<AssemblyTemplate[]>(() => {
    if (typeof window !== "undefined") {
      return loadAssemblyTemplates();
    }
    return [];
  });

  const persist = useCallback((updater: React.SetStateAction<AssemblyTemplate[]>) => {
    setCustomTemplates((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persistAssemblyTemplates(next);
      return next;
    });
  }, []);

  const builtins = useMemo(() => getBuiltinAssemblyTemplates(), []);

  const templates = useMemo(() => {
    const activeCustom = customTemplates.filter(isActiveSyncEntity);
    return [...builtins, ...activeCustom];
  }, [builtins, customTemplates]);

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
        prev.map((tpl) => (tpl.id === id && !tpl.deletedAt ? markEntityDeleted(tpl, deletedAt) : tpl)),
      );
    },
    [persist],
  );

  const updateTemplate = useCallback(
    (id: string, patch: Partial<AssemblyTemplate>) => {
      persist((prev) =>
        prev.map((tpl) => {
          if (tpl.id !== id || tpl.deletedAt) return tpl;
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

  return {
    templates,
    customTemplates: customTemplates.filter(isActiveSyncEntity),
    saveTemplate,
    deleteTemplate,
    updateTemplate,
  };
}
