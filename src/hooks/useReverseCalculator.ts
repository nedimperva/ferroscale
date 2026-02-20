"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CalculationInput } from "@/lib/calculator/types";
import type { DimensionKey, ManualProfileDefinition, ProfileDefinition } from "@/lib/datasets/types";
import { toMillimeters } from "@/lib/calculator/units";
import { getMaterialGradeById } from "@/lib/datasets/materials";
import { solveForDimension, getSolvableDimensions, solveForQuantity } from "@/lib/calculator/reverse";
import type { ReverseResponse, QuantityResponse } from "@/lib/calculator/reverse";
import { resolveAreaMm2 } from "@/lib/calculator/engine";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ReverseMode = "dimension" | "quantity";

export interface UseReverseReturn {
  /** Whether reverse mode is active. */
  enabled: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
  /** Whether we're solving for a dimension or a piece count. */
  reverseMode: ReverseMode;
  setReverseMode: (mode: ReverseMode) => void;
  /** Target total weight (kg) the user wants to achieve. */
  targetWeightKg: number;
  setTargetWeight: (v: number) => void;
  /** Which dimension to solve for (dimension mode only). */
  solveDimension: DimensionKey | null;
  setSolveDimension: (d: DimensionKey) => void;
  /** Dimensions available for solving (depends on profile). */
  solvableOptions: DimensionKey[];
  /** The latest reverse-solve result (dimension mode). */
  result: ReverseResponse | null;
  /** The latest quantity-solve result (quantity mode). */
  quantityResult: QuantityResponse | null;
}

const DEBOUNCE_MS = 200;

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export function useReverseCalculator(
  input: CalculationInput,
  selectedProfile: ProfileDefinition,
): UseReverseReturn {
  const [enabled, setEnabled] = useState(false);
  const [reverseMode, setReverseModeState] = useState<ReverseMode>("dimension");
  const [targetWeightKg, setTargetWeight] = useState(50);
  const [preferredDimension, setPreferredDimension] = useState<DimensionKey | null>(null);
  const [result, setResult] = useState<ReverseResponse | null>(null);
  const [quantityResult, setQuantityResult] = useState<QuantityResponse | null>(null);

  const setReverseMode = useCallback((mode: ReverseMode) => {
    setReverseModeState(mode);
  }, []);

  /* Solvable options depend on the profile */
  const solvableOptions = useMemo(
    () => (selectedProfile.mode === "manual" ? getSolvableDimensions(selectedProfile.id) : []),
    [selectedProfile],
  );

  /*
   * Derive effective solve dimension from the user's preference + available
   * options. Pure derivation — no useEffect / setState needed.
   */
  const solveDimension = useMemo<DimensionKey | null>(() => {
    if (solvableOptions.length === 0) return null;
    if (preferredDimension && solvableOptions.includes(preferredDimension)) {
      return preferredDimension;
    }
    return solvableOptions[0];
  }, [solvableOptions, preferredDimension]);

  const setSolveDimension = useCallback((d: DimensionKey) => {
    setPreferredDimension(d);
  }, []);

  /* Debounced reverse solve — all setState calls happen inside setTimeout */
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      if (!enabled) {
        setResult(null);
        setQuantityResult(null);
        return;
      }

      const grade = getMaterialGradeById(input.materialGradeId);
      const density = input.useCustomDensity
        ? input.customDensityKgPerM3 ?? 0
        : grade?.densityKgPerM3 ?? 0;
      const lengthMm = toMillimeters(input.length.value, input.length.unit);

      if (reverseMode === "quantity") {
        /* Quantity mode: use the resolved area from the engine */
        const { areaMm2 } = resolveAreaMm2(input);
        const response = solveForQuantity({
          areaMm2,
          targetWeightKg,
          densityKgPerM3: density,
          lengthMm,
          wastePercent: input.wastePercent,
        });
        setQuantityResult(response);
        setResult(null);
        return;
      }

      /* Dimension mode: existing logic */
      if (!solveDimension || selectedProfile.mode !== "manual") {
        setResult(null);
        setQuantityResult(null);
        return;
      }

      /* Collect known dimensions in mm, excluding the one we solve for */
      const knownDimensions: Partial<Record<DimensionKey, number>> = {};
      for (const dim of (selectedProfile as ManualProfileDefinition).dimensions) {
        if (dim.key === solveDimension) continue;
        const val = input.manualDimensions[dim.key];
        if (val) {
          knownDimensions[dim.key] = toMillimeters(val.value, val.unit);
        }
      }

      const response = solveForDimension({
        profileId: input.profileId,
        targetWeightKg,
        densityKgPerM3: density,
        lengthMm,
        quantity: input.quantity,
        wastePercent: input.wastePercent,
        solveDimension,
        knownDimensions,
      });

      setResult(response);
      setQuantityResult(null);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, reverseMode, targetWeightKg, solveDimension, input, selectedProfile]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);
  const enable = useCallback(() => setEnabled(true), []);
  const disable = useCallback(() => setEnabled(false), []);

  return {
    enabled,
    toggle,
    enable,
    disable,
    reverseMode,
    setReverseMode,
    targetWeightKg,
    setTargetWeight,
    solveDimension,
    setSolveDimension,
    solvableOptions,
    result,
    quantityResult,
  };
}
