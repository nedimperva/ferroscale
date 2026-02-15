"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CalculationInput, CalculationResult, CurrencyCode } from "@/lib/calculator/types";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ProjectCalculation {
  id: string;
  timestamp: string;
  input: CalculationInput;
  result: CalculationResult;
  normalizedProfile: NormalizedProfileSnapshot;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  calculations: ProjectCalculation[];
}

export interface ProjectAggregates {
  totalWeightKg: number;
  totalCost: number;
  currency: CurrencyCode;
  count: number;
}

const PROJECTS_KEY = "advanced-calc-projects-v2";
const MAX_PROJECTS = 20;
const MAX_CALCS_PER_PROJECT = 50;

/* ------------------------------------------------------------------ */
/*  Local-storage helpers                                             */
/* ------------------------------------------------------------------ */

function loadProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistProjects(projects: Project[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

/* ------------------------------------------------------------------ */
/*  Aggregation helper                                                */
/* ------------------------------------------------------------------ */

export function computeAggregates(project: Project): ProjectAggregates {
  if (project.calculations.length === 0) {
    return { totalWeightKg: 0, totalCost: 0, currency: "EUR", count: 0 };
  }
  let totalWeightKg = 0;
  let totalCost = 0;
  const currency = project.calculations[0].result.currency;
  for (const calc of project.calculations) {
    totalWeightKg += calc.result.totalWeightKg;
    totalCost += calc.result.grandTotalAmount;
  }
  return {
    totalWeightKg: Math.round(totalWeightKg * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    currency,
    count: project.calculations.length,
  };
}

/* ------------------------------------------------------------------ */
/*  CSV export                                                        */
/* ------------------------------------------------------------------ */

export function exportProjectCsv(project: Project): void {
  if (project.calculations.length === 0) return;

  const headers = [
    "Profile",
    "Profile Label",
    "Material",
    "Unit Weight (kg)",
    "Total Weight (kg)",
    "Subtotal",
    "Waste",
    "VAT",
    "Grand Total",
    "Currency",
  ];
  const rows = project.calculations.map((calc) => {
    const r = calc.result;
    return [
      calc.normalizedProfile.shortLabel,
      r.profileLabel,
      r.gradeLabel,
      r.unitWeightKg,
      r.totalWeightKg,
      r.subtotalAmount,
      r.wasteAmount,
      r.vatAmount,
      r.grandTotalAmount,
      r.currency,
    ].join(",");
  });

  const agg = computeAggregates(project);
  rows.push("");
  rows.push(`Total,,,"${agg.totalWeightKg}",,,,"${agg.totalCost}","${agg.currency}"`);

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name.replace(/[^a-zA-Z0-9_-]/g, "_")}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  Fingerprint — prevent adding identical calculation twice           */
/* ------------------------------------------------------------------ */

function fingerprint(result: CalculationResult): string {
  return `${result.profileLabel}|${result.gradeLabel}|${result.grandTotalAmount}|${result.totalWeightKg}`;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export interface UseProjectsReturn {
  projects: Project[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** The project currently being viewed in the drawer (null = list view). */
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  createProject: (name: string) => Project;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  addCalculation: (projectId: string, input: CalculationInput, result: CalculationResult) => boolean;
  removeCalculation: (projectId: string, calcId: string) => void;
  /** Quick-add: shows a picker if multiple projects exist, otherwise adds to the only one. */
  projectCount: number;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  /* Hydrate from localStorage on mount (empty [] during SSR to avoid hydration mismatch) */
  const hydrated = useRef(false);
  useEffect(() => {
    const stored = loadProjects();
    if (stored.length > 0) setProjects(stored); // eslint-disable-line react-hooks/set-state-in-effect
    hydrated.current = true;
  }, []);

  /* Persist on change (skip the initial hydration write-back) */
  useEffect(() => {
    if (hydrated.current) persistProjects(projects);
  }, [projects]);

  const createProject = useCallback((name: string): Project => {
    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      name: name.trim() || "Untitled Project",
      createdAt: now,
      updatedAt: now,
      calculations: [],
    };
    setProjects((prev) => {
      if (prev.length >= MAX_PROJECTS) return prev;
      return [project, ...prev];
    });
    return project;
  }, []);

  const renameProject = useCallback((id: string, name: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, name: name.trim() || p.name, updatedAt: new Date().toISOString() }
          : p,
      ),
    );
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setActiveProjectId((current) => (current === id ? null : current));
  }, []);

  const addCalculation = useCallback(
    (projectId: string, input: CalculationInput, result: CalculationResult): boolean => {
      let added = false;
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          if (p.calculations.length >= MAX_CALCS_PER_PROJECT) return p;
          /* Check for duplicate */
          const fp = fingerprint(result);
          if (p.calculations.some((c) => fingerprint(c.result) === fp)) return p;

          added = true;
          const calc: ProjectCalculation = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            input,
            result,
            normalizedProfile: normalizeProfileSnapshot(input),
          };
          return {
            ...p,
            updatedAt: new Date().toISOString(),
            calculations: [...p.calculations, calc],
          };
        }),
      );
      return added;
    },
    [],
  );

  const removeCalculation = useCallback((projectId: string, calcId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          updatedAt: new Date().toISOString(),
          calculations: p.calculations.filter((c) => c.id !== calcId),
        };
      }),
    );
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setActiveProjectId(null);
  }, []);

  return {
    projects,
    isOpen,
    open,
    close,
    activeProjectId,
    setActiveProjectId,
    createProject,
    renameProject,
    deleteProject,
    addCalculation,
    removeCalculation,
    projectCount: projects.length,
  };
}
