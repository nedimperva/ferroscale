"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useTransition } from "react";
import { calculateMetal } from "@/lib/calculator/engine";
import { parseLocaleNumber } from "@/lib/calculator/number-input";
import { fromMillimeters } from "@/lib/calculator/units";
import type {
  CalculationInput,
  CalculationResult,
  CurrencyCode,
  LengthUnit,
  PriceBasis,
  PriceUnit,
  ValidationIssue,
} from "@/lib/calculator/types";
import { METAL_FAMILIES, getMaterialGradesByFamily } from "@/lib/datasets/materials";
import { PROFILE_DEFINITIONS, getProfileById } from "@/lib/datasets/profiles";
import type {
  DimensionKey,
  MetalFamilyId,
  ProfileDefinition,
  ProfileId,
} from "@/lib/datasets/types";
import { decodeParamsToInput } from "@/lib/calculator/url-state";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

export function parseNumber(value: string): number {
  return parseLocaleNumber(value) ?? 0;
}

/* ------------------------------------------------------------------ */
/*  Local-storage persistence                                         */
/* ------------------------------------------------------------------ */

const INPUT_STORAGE_KEY = "advanced-calc-input-v1";

function loadPersistedInput(): CalculationInput | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(INPUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v: number; input: CalculationInput };
    if (parsed?.v === 1 && parsed.input) return parsed.input;
    return null;
  } catch {
    return null;
  }
}

function persistInput(input: CalculationInput): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INPUT_STORAGE_KEY, JSON.stringify({ v: 1, input }));
  } catch { /* quota exceeded — ignore */ }
}

function profileDefaults(profile: ProfileDefinition): {
  selectedSizeId?: string;
  manualDimensions: CalculationInput["manualDimensions"];
} {
  if (profile.mode === "standard") {
    return { selectedSizeId: profile.sizes[0]?.id, manualDimensions: {} };
  }
  const dims: CalculationInput["manualDimensions"] = {};
  for (const dimension of profile.dimensions) {
    dims[dimension.key] = { value: dimension.defaultMm, unit: "mm" };
  }
  return { manualDimensions: dims };
}

export function getDefaultInput(): CalculationInput {
  const defaultFamily: MetalFamilyId = "steel";
  const defaultGrade = getMaterialGradesByFamily(defaultFamily)[0];
  const defaultProfile = PROFILE_DEFINITIONS[0];
  const seed = profileDefaults(defaultProfile);

  return {
    materialGradeId: defaultGrade.id,
    useCustomDensity: false,
    customDensityKgPerM3: 7850,
    profileId: defaultProfile.id,
    selectedSizeId: seed.selectedSizeId,
    manualDimensions: seed.manualDimensions,
    length: { value: 6000, unit: "mm" },
    quantity: 1,
    priceBasis: "weight",
    priceUnit: "kg",
    unitPrice: 1.2,
    currency: "EUR",
    wastePercent: 0,
    includeVat: false,
    vatPercent: 21,
    rounding: { weightDecimals: 3, priceDecimals: 2, dimensionDecimals: 2 },
  };
}

/* ------------------------------------------------------------------ */
/*  Reducer                                                           */
/* ------------------------------------------------------------------ */

export type CalcAction =
  | { type: "SET_FAMILY"; familyId: MetalFamilyId }
  | { type: "SET_GRADE"; gradeId: string }
  | { type: "SET_CUSTOM_DENSITY_TOGGLE"; value: boolean }
  | { type: "SET_CUSTOM_DENSITY"; value: number }
  | { type: "SET_PROFILE"; profileId: ProfileId }
  | { type: "SET_SIZE"; sizeId: string }
  | { type: "SET_DIMENSION_VALUE"; key: DimensionKey; value: number }
  | { type: "SET_DIMENSION_UNIT"; key: DimensionKey; unit: LengthUnit }
  | { type: "SET_DIMENSIONS_MM"; dimensions: Partial<Record<DimensionKey, number>> }
  | { type: "SET_LENGTH_VALUE"; value: number }
  | { type: "SET_LENGTH_UNIT"; unit: LengthUnit }
  | { type: "SET_QUANTITY"; value: number }
  | { type: "SET_PRICE_BASIS"; priceBasis: PriceBasis }
  | { type: "SET_PRICE_UNIT"; priceUnit: PriceUnit }
  | { type: "SET_UNIT_PRICE"; value: number }
  | { type: "SET_CURRENCY"; currency: CurrencyCode }
  | { type: "SET_WASTE"; value: number }
  | { type: "SET_VAT_TOGGLE"; value: boolean }
  | { type: "SET_VAT_PERCENT"; value: number }
  | { type: "SET_ROUNDING_WEIGHT"; value: number }
  | { type: "SET_ROUNDING_PRICE"; value: number }
  | { type: "SET_ROUNDING_DIMENSION"; value: number }
  | { type: "RESET" }
  | { type: "RESET_ALL" }
  | { type: "LOAD_ENTRY"; input: CalculationInput }
  | { type: "UNDO" }
  | { type: "REDO" };

function inputReducer(state: CalculationInput, action: CalcAction): CalculationInput {
  switch (action.type) {
    case "SET_FAMILY": {
      const grades = getMaterialGradesByFamily(action.familyId);
      return { ...state, materialGradeId: grades[0]?.id ?? state.materialGradeId };
    }
    case "SET_GRADE":
      return { ...state, materialGradeId: action.gradeId };
    case "SET_CUSTOM_DENSITY_TOGGLE":
      return { ...state, useCustomDensity: action.value };
    case "SET_CUSTOM_DENSITY":
      return { ...state, customDensityKgPerM3: action.value };
    case "SET_PROFILE": {
      const profile = getProfileById(action.profileId);
      if (!profile) return state;
      const defaults = profileDefaults(profile);
      return {
        ...state,
        profileId: action.profileId,
        selectedSizeId: defaults.selectedSizeId,
        manualDimensions: defaults.manualDimensions,
      };
    }
    case "SET_SIZE":
      return { ...state, selectedSizeId: action.sizeId };
    case "SET_DIMENSION_VALUE":
      return {
        ...state,
        manualDimensions: {
          ...state.manualDimensions,
          [action.key]: {
            value: action.value,
            unit: state.manualDimensions[action.key]?.unit ?? "mm",
          },
        },
      };
    case "SET_DIMENSION_UNIT":
      return {
        ...state,
        manualDimensions: {
          ...state.manualDimensions,
          [action.key]: {
            value: state.manualDimensions[action.key]?.value ?? 0,
            unit: action.unit,
          },
        },
      };
    case "SET_DIMENSIONS_MM":
      return {
        ...state,
        manualDimensions: Object.entries(action.dimensions).reduce(
          (nextDimensions, [rawKey, rawValue]) => {
            const key = rawKey as DimensionKey;
            if (rawValue == null || !Number.isFinite(rawValue)) {
              return nextDimensions;
            }

            const currentUnit = state.manualDimensions[key]?.unit ?? "mm";
            return {
              ...nextDimensions,
              [key]: {
                value: fromMillimeters(rawValue, currentUnit),
                unit: currentUnit,
              },
            };
          },
          { ...state.manualDimensions },
        ),
      };
    case "SET_LENGTH_VALUE":
      return { ...state, length: { ...state.length, value: action.value } };
    case "SET_LENGTH_UNIT":
      return { ...state, length: { ...state.length, unit: action.unit } };
    case "SET_QUANTITY":
      return { ...state, quantity: Math.max(1, Math.floor(action.value)) };
    case "SET_PRICE_BASIS": {
      const nextUnit: PriceUnit =
        action.priceBasis === "weight" ? "kg" : action.priceBasis === "length" ? "m" : "piece";
      return { ...state, priceBasis: action.priceBasis, priceUnit: nextUnit };
    }
    case "SET_PRICE_UNIT":
      return { ...state, priceUnit: action.priceUnit };
    case "SET_UNIT_PRICE":
      return { ...state, unitPrice: action.value };
    case "SET_CURRENCY":
      return { ...state, currency: action.currency };
    case "SET_WASTE":
      return { ...state, wastePercent: action.value };
    case "SET_VAT_TOGGLE":
      return { ...state, includeVat: action.value };
    case "SET_VAT_PERCENT":
      return { ...state, vatPercent: action.value };
    case "SET_ROUNDING_WEIGHT":
      return { ...state, rounding: { ...state.rounding, weightDecimals: clampRounding(action.value) } };
    case "SET_ROUNDING_PRICE":
      return { ...state, rounding: { ...state.rounding, priceDecimals: clampRounding(action.value) } };
    case "SET_ROUNDING_DIMENSION":
      return { ...state, rounding: { ...state.rounding, dimensionDecimals: clampRounding(action.value) } };
    case "RESET": {
      /* Reset profile/dimensions but preserve settings (material, pricing, precision) */
      const defaults = getDefaultInput();
      return {
        ...state,
        profileId: defaults.profileId,
        selectedSizeId: defaults.selectedSizeId,
        manualDimensions: defaults.manualDimensions,
        length: defaults.length,
        quantity: defaults.quantity,
      };
    }
    case "RESET_ALL":
      return getDefaultInput();
    case "LOAD_ENTRY":
      return action.input;
    default:
      return state;
  }
}

function clampRounding(v: number): number {
  return Math.min(6, Math.max(0, Math.floor(v)));
}

/* ------------------------------------------------------------------ */
/*  Undo/redo wrapper                                                 */
/* ------------------------------------------------------------------ */

interface UndoableState {
  present: CalculationInput;
  past: CalculationInput[];
  future: CalculationInput[];
}

const MAX_UNDO = 30;

const SKIP_UNDO_ACTIONS = new Set<string>(["LOAD_ENTRY", "RESET", "RESET_ALL"]);

export function undoableReducer(state: UndoableState, action: CalcAction): UndoableState {
  if (action.type === "UNDO") {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    return {
      present: previous,
      past: state.past.slice(0, -1),
      future: [state.present, ...state.future],
    };
  }
  if (action.type === "REDO") {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    return {
      present: next,
      past: [...state.past, state.present],
      future: state.future.slice(1),
    };
  }

  const newPresent = inputReducer(state.present, action);
  if (newPresent === state.present) return state;

  if (SKIP_UNDO_ACTIONS.has(action.type)) {
    return { present: newPresent, past: [], future: [] };
  }

  return {
    present: newPresent,
    past: [...state.past, state.present].slice(-MAX_UNDO),
    future: [],
  };
}

/* ------------------------------------------------------------------ */
/*  Derived helpers                                                   */
/* ------------------------------------------------------------------ */

export function deriveFamily(materialGradeId: string): MetalFamilyId {
  const match = METAL_FAMILIES.find((f) =>
    getMaterialGradesByFamily(f.id).some((g) => g.id === materialGradeId),
  );
  return match?.id ?? "steel";
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

const DEBOUNCE_MS = 150;

export interface UseCalculatorReturn {
  input: CalculationInput;
  dispatch: React.Dispatch<CalcAction>;
  result: CalculationResult | null;
  issues: ValidationIssue[];
  isPending: boolean;
  selectedProfile: ProfileDefinition;
  activeFamily: MetalFamilyId;
  resetForm: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function getInitialUndoableState(): UndoableState {
  return {
    present: getDefaultInput(),
    past: [],
    future: [],
  };
}

export function useCalculator(): UseCalculatorReturn {
  const [state, dispatch] = useReducer(
    undoableReducer,
    undefined,
    getInitialUndoableState,
  );
  const input = state.present;
  const inputHydratedRef = useRef(false);
  const skipNextPersistRef = useRef(false);
  const [isPending, startTransition] = useTransition();

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);

  /* Hydrate persisted input after mount to keep SSR/client first render identical.
     URL params take priority over localStorage-persisted input for shareable links. */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = decodeParamsToInput(urlParams);

    if (fromUrl && getProfileById(fromUrl.profileId)) {
      skipNextPersistRef.current = true;
      dispatch({ type: "LOAD_ENTRY", input: fromUrl });
      // Clean the URL to avoid stale shares
      window.history.replaceState({}, "", window.location.pathname);
    } else {
      const persisted = loadPersistedInput();
      if (persisted && getProfileById(persisted.profileId)) {
        skipNextPersistRef.current = true;
        dispatch({ type: "LOAD_ENTRY", input: persisted });
      }
    }
    inputHydratedRef.current = true;
  }, []);

  /* Persist input to localStorage after hydration */
  useEffect(() => {
    if (!inputHydratedRef.current) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    persistInput(input);
  }, [input]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedProfile = useMemo(
    () => getProfileById(input.profileId) ?? PROFILE_DEFINITIONS[0],
    [input.profileId],
  );

  const activeFamily = useMemo(() => deriveFamily(input.materialGradeId), [input.materialGradeId]);

  /* Reactive calculation — debounced 150ms */
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      startTransition(() => {
        const response = calculateMetal(input);
        if (response.ok) {
          setResult(response.result);
          setIssues([]);
        } else {
          setIssues(response.issues);
          // keep previous result visible while issues exist
        }
      });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [input]);

  const resetForm = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    input,
    dispatch,
    result,
    issues,
    isPending,
    selectedProfile,
    activeFamily,
    resetForm,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
