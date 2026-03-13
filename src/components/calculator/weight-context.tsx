"use client";

import { memo, useMemo } from "react";

interface WeightComparison {
  maxKg: number;
  icon: string;
  label: (n: number) => string;
  refKg: number;
}

const COMPARISONS: WeightComparison[] = [
  { maxKg: 0.05, icon: "🪙", label: () => "About the weight of a few coins", refKg: 0.01 },
  { maxKg: 0.2, icon: "📱", label: (n) => n === 1 ? "About the weight of a smartphone" : `About ${n} smartphones`, refKg: 0.19 },
  { maxKg: 0.5, icon: "🍎", label: (n) => n === 1 ? "About 1 apple" : `About ${n} apples`, refKg: 0.2 },
  { maxKg: 2, icon: "🧱", label: (n) => n === 1 ? "About 1 brick" : `About ${n} bricks`, refKg: 1.8 },
  { maxKg: 5, icon: "🛒", label: () => "A small bag of groceries", refKg: 4 },
  { maxKg: 12, icon: "🐱", label: () => "About the weight of a house cat", refKg: 5 },
  { maxKg: 25, icon: "🧳", label: (n) => n === 1 ? "About 1 carry-on suitcase" : `About ${n} carry-on suitcases`, refKg: 10 },
  { maxKg: 50, icon: "🏋️", label: () => "A standard barbell plate set", refKg: 20 },
  { maxKg: 80, icon: "🚲", label: (n) => n === 1 ? "About 1 bicycle" : `About ${n} bicycles`, refKg: 12 },
  { maxKg: 120, icon: "🧑", label: (n) => n === 1 ? "About one adult's body weight" : `About ${n} adults`, refKg: 75 },
  { maxKg: 250, icon: "🛵", label: () => "About the weight of a scooter", refKg: 120 },
  { maxKg: 500, icon: "🎹", label: (n) => n === 1 ? "About 1 grand piano" : `About ${n} grand pianos`, refKg: 300 },
  { maxKg: 1200, icon: "🚗", label: () => "About the weight of a small car", refKg: 1100 },
  { maxKg: 2500, icon: "🚙", label: () => "About the weight of an SUV", refKg: 2000 },
  { maxKg: 8000, icon: "🐘", label: (n) => n === 1 ? "About 1 elephant" : `About ${n} elephants`, refKg: 5000 },
  { maxKg: 40000, icon: "🚌", label: (n) => n === 1 ? "About 1 loaded bus" : `About ${n} loaded buses`, refKg: 12000 },
  { maxKg: Infinity, icon: "🏗️", label: () => "Industrial-scale weight", refKg: 50000 },
];

function getComparison(kg: number): { icon: string; text: string } | null {
  if (kg <= 0 || !isFinite(kg)) return null;

  for (const comp of COMPARISONS) {
    if (kg <= comp.maxKg) {
      const n = Math.max(1, Math.round(kg / comp.refKg));
      return { icon: comp.icon, text: comp.label(n) };
    }
  }
  return null;
}

interface WeightContextProps {
  weightKg: number;
}

export const WeightContext = memo(function WeightContext({ weightKg }: WeightContextProps) {
  const comparison = useMemo(() => getComparison(weightKg), [weightKg]);

  if (!comparison) return null;

  return (
    <div className="mt-2 mb-1 flex items-center gap-2 rounded-lg border border-border-faint bg-surface-raised px-3 py-2">
      <span className="text-base leading-none" aria-hidden>{comparison.icon}</span>
      <span className="text-[11px] text-muted">{comparison.text}</span>
    </div>
  );
});
