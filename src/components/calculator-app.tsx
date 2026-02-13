"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { calculateMetal } from "@/lib/calculator/engine";
import type {
  CalculationInput,
  CalculationResult,
  LengthUnit,
  PriceBasis,
  PriceUnit,
  RoundingConfig,
  ValidationIssue,
} from "@/lib/calculator/types";
import { METAL_FAMILIES, getMaterialGradesByFamily } from "@/lib/datasets/materials";
import { PROFILE_DEFINITIONS, getProfileById } from "@/lib/datasets/profiles";
import type {
  DimensionDefinition,
  DimensionKey,
  MetalFamilyId,
  ProfileDefinition,
  ProfileId,
} from "@/lib/datasets/types";
import { DATASET_VERSION } from "@/lib/datasets/version";
import { ContactForm } from "@/components/contact-form";

interface HistoryEntry {
  id: string;
  timestamp: string;
  input: CalculationInput;
  result: CalculationResult;
}

const HISTORY_KEY = "advanced-calc-history-v1";

const LENGTH_UNITS: LengthUnit[] = ["mm", "cm", "m", "in", "ft"];
const CURRENCIES: CalculationInput["currency"][] = ["EUR", "USD", "GBP", "PLN"];

const WEIGHT_UNITS: PriceUnit[] = ["kg", "lb"];
const LENGTH_PRICE_UNITS: PriceUnit[] = ["m", "ft"];

const DEFAULT_ROUNDING: RoundingConfig = {
  weightDecimals: 3,
  priceDecimals: 2,
  dimensionDecimals: 2,
};

function profileDefaults(profile: ProfileDefinition): {
  selectedSizeId?: string;
  manualDimensions: CalculationInput["manualDimensions"];
} {
  if (profile.mode === "standard") {
    return {
      selectedSizeId: profile.sizes[0]?.id,
      manualDimensions: {},
    };
  }

  const dims: CalculationInput["manualDimensions"] = {};
  for (const dimension of profile.dimensions) {
    dims[dimension.key] = {
      value: dimension.defaultMm,
      unit: "mm",
    };
  }

  return {
    manualDimensions: dims,
  };
}

function getDefaultInput(): CalculationInput {
  const defaultFamily: MetalFamilyId = "steel";
  const defaultGrade = getMaterialGradesByFamily(defaultFamily)[0];
  const defaultProfile = PROFILE_DEFINITIONS[0];
  const profileSeed = profileDefaults(defaultProfile);

  return {
    materialGradeId: defaultGrade.id,
    useCustomDensity: false,
    customDensityKgPerM3: 7850,
    profileId: defaultProfile.id,
    selectedSizeId: profileSeed.selectedSizeId,
    manualDimensions: profileSeed.manualDimensions,
    length: { value: 6000, unit: "mm" },
    quantity: 1,
    priceBasis: "weight",
    priceUnit: "kg",
    unitPrice: 1.2,
    currency: "EUR",
    wastePercent: 0,
    includeVat: false,
    vatPercent: 21,
    rounding: DEFAULT_ROUNDING,
  };
}

function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createResultCsv(result: CalculationResult): string {
  const rows: Array<[string, string]> = [
    ["Profile", result.profileLabel],
    ["Material", result.gradeLabel],
    ["Density (kg/m3)", String(result.densityKgPerM3)],
    ["Area (mm2)", String(result.areaMm2)],
    ["Length (mm)", String(result.lengthMm)],
    ["Quantity", String(result.quantity)],
    ["Unit weight (kg)", String(result.unitWeightKg)],
    ["Total weight (kg)", String(result.totalWeightKg)],
    ["Total weight (lb)", String(result.totalWeightLb)],
    ["Unit price", String(result.unitPriceAmount)],
    ["Subtotal", String(result.subtotalAmount)],
    ["Waste amount", String(result.wasteAmount)],
    ["Subtotal with waste", String(result.subtotalWithWasteAmount)],
    ["VAT amount", String(result.vatAmount)],
    ["Grand total", String(result.grandTotalAmount)],
    ["Currency", result.currency],
    ["Price basis", result.priceBasis],
    ["Price unit", result.priceUnit],
    ["Formula", result.formulaLabel],
    ["Dataset version", result.datasetVersion],
    ["References", result.referenceLabels.join(" | ")],
  ];

  const escaped = rows.map(([label, value]) => {
    const safeLabel = `"${label.replaceAll('"', '""')}"`;
    const safeValue = `"${value.replaceAll('"', '""')}"`;
    return `${safeLabel},${safeValue}`;
  });

  return `Metric,Value\n${escaped.join("\n")}\n`;
}

function IssueList({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-900" role="alert" aria-live="polite">
      <p className="font-semibold">Validation issues</p>
      <ul className="mt-2 list-disc pl-5 text-sm">
        {issues.map((issue) => (
          <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
        ))}
      </ul>
    </div>
  );
}

function DimensionInput({
  dimension,
  value,
  onValueChange,
  onUnitChange,
}: {
  dimension: DimensionDefinition;
  value: CalculationInput["manualDimensions"][DimensionKey];
  onValueChange: (value: number) => void;
  onUnitChange: (unit: LengthUnit) => void;
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium" htmlFor={`dimension-${dimension.key}`}>
        {dimension.label}
      </label>
      <div className="flex gap-2">
        <input
          id={`dimension-${dimension.key}`}
          name={`dimension-${dimension.key}`}
          type="number"
          min={0}
          step="any"
          value={value?.value ?? ""}
          onChange={(event) => onValueChange(parseNumber(event.target.value))}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
        />
        <select
          value={value?.unit ?? "mm"}
          onChange={(event) => onUnitChange(event.target.value as LengthUnit)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2"
          aria-label={`${dimension.label} unit`}
        >
          {LENGTH_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-slate-600">
        Allowed range: {dimension.minMm} mm to {dimension.maxMm} mm
      </p>
    </div>
  );
}

export function CalculatorApp() {
  const [input, setInput] = useState<CalculationInput>(getDefaultInput());
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as HistoryEntry[];
      return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
    } catch {
      return [];
    }
  });

  const selectedProfile = useMemo(
    () => getProfileById(input.profileId) ?? PROFILE_DEFINITIONS[0],
    [input.profileId],
  );

  const activeFamily = useMemo(() => {
    const grade = METAL_FAMILIES.find((family) =>
      getMaterialGradesByFamily(family.id).some((candidate) => candidate.id === input.materialGradeId),
    );
    return grade?.id ?? "steel";
  }, [input.materialGradeId]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
  }, [history]);

  function setFamily(familyId: MetalFamilyId): void {
    const familyGrades = getMaterialGradesByFamily(familyId);
    setInput((current) => ({
      ...current,
      materialGradeId: familyGrades[0]?.id ?? current.materialGradeId,
    }));
  }

  function setProfile(profileId: ProfileId): void {
    const profile = getProfileById(profileId);
    if (!profile) {
      return;
    }
    const defaults = profileDefaults(profile);
    setInput((current) => ({
      ...current,
      profileId,
      selectedSizeId: defaults.selectedSizeId,
      manualDimensions: defaults.manualDimensions,
    }));
  }

  function setPriceBasis(priceBasis: PriceBasis): void {
    const nextUnit: PriceUnit =
      priceBasis === "weight" ? "kg" : priceBasis === "length" ? "m" : "piece";

    setInput((current) => ({
      ...current,
      priceBasis,
      priceUnit: nextUnit,
    }));
  }

  function handleCalculate(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const response = calculateMetal(input);

    if (!response.ok) {
      setIssues(response.issues);
      return;
    }

    setIssues([]);
    setResult(response.result);

    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      input,
      result: response.result,
    };
    setHistory((current) => [entry, ...current].slice(0, 10));
  }

  function resetForm(): void {
    setInput(getDefaultInput());
    setIssues([]);
    setResult(null);
  }

  function clearHistory(): void {
    setHistory([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(HISTORY_KEY);
    }
  }

  function exportResultCsv(): void {
    if (!result) {
      return;
    }

    const csv = createResultCsv(result);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replaceAll(":", "-");
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `advanced-metal-calculation-${timestamp}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const gradesForFamily = getMaterialGradesByFamily(activeFamily);

  const priceUnitsForBasis =
    input.priceBasis === "weight"
      ? WEIGHT_UNITS
      : input.priceBasis === "length"
      ? LENGTH_PRICE_UNITS
      : (["piece"] as PriceUnit[]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <header className="mb-6 grid gap-4">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Advanced Metal Calculator</h1>
        <p className="max-w-3xl text-slate-700">
          EU-focused public calculator for accurate weight and price estimation across core EN profile types. Outputs are
          estimates and must be verified before procurement or fabrication.
        </p>
        <p className="text-sm text-slate-600">
          Dataset version: <span className="font-medium">{DATASET_VERSION}</span>
        </p>
      </header>

      <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <p className="font-semibold">Estimate Disclaimer</p>
        <p className="mt-1 text-sm">
          This tool provides engineering estimates only. Always validate against project specs, supplier data sheets, and
          local standards before placing orders.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <form onSubmit={handleCalculate} className="grid gap-5 rounded-lg border border-slate-300 bg-white p-5">
          <h2 className="text-xl font-semibold">Calculator</h2>
          <IssueList issues={issues} />

          <section className="grid gap-3">
            <h3 className="font-semibold text-slate-900">Material</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="family" className="text-sm font-medium">
                  Family
                </label>
                <select
                  id="family"
                  value={activeFamily}
                  onChange={(event) => setFamily(event.target.value as MetalFamilyId)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                >
                  {METAL_FAMILIES.map((family) => (
                    <option key={family.id} value={family.id}>
                      {family.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label htmlFor="grade" className="text-sm font-medium">
                  Grade
                </label>
                <select
                  id="grade"
                  value={input.materialGradeId}
                  onChange={(event) => setInput((current) => ({ ...current, materialGradeId: event.target.value }))}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                >
                  {gradesForFamily.map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {grade.label} ({grade.densityKgPerM3} kg/m3)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={input.useCustomDensity}
                onChange={(event) => setInput((current) => ({ ...current, useCustomDensity: event.target.checked }))}
              />
              Use custom density (advanced)
            </label>

            {input.useCustomDensity ? (
              <div className="grid gap-2 md:max-w-sm">
                <label htmlFor="custom-density" className="text-sm font-medium">
                  Custom density (kg/m3)
                </label>
                <input
                  id="custom-density"
                  type="number"
                  step="any"
                  min={100}
                  max={25000}
                  value={input.customDensityKgPerM3 ?? ""}
                  onChange={(event) =>
                    setInput((current) => ({
                      ...current,
                      customDensityKgPerM3: parseNumber(event.target.value),
                    }))
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                />
              </div>
            ) : null}
          </section>

          <section className="grid gap-3">
            <h3 className="font-semibold text-slate-900">Profile and Geometry</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="profile" className="text-sm font-medium">
                  Profile type
                </label>
                <select
                  id="profile"
                  value={input.profileId}
                  onChange={(event) => setProfile(event.target.value as ProfileId)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                >
                  {PROFILE_DEFINITIONS.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProfile.mode === "standard" ? (
                <div className="grid gap-2">
                  <label htmlFor="size" className="text-sm font-medium">
                    EN size designation
                  </label>
                  <select
                    id="size"
                    value={input.selectedSizeId ?? selectedProfile.sizes[0]?.id}
                    onChange={(event) => setInput((current) => ({ ...current, selectedSizeId: event.target.value }))}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2"
                  >
                    {selectedProfile.sizes.map((size) => (
                      <option key={size.id} value={size.id}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            {selectedProfile.mode === "manual" ? (
              <div className="grid gap-3 md:grid-cols-2">
                {selectedProfile.dimensions.map((dimension) => (
                  <DimensionInput
                    key={dimension.key}
                    dimension={dimension}
                    value={input.manualDimensions[dimension.key]}
                    onValueChange={(nextValue) =>
                      setInput((current) => ({
                        ...current,
                        manualDimensions: {
                          ...current.manualDimensions,
                          [dimension.key]: {
                            value: nextValue,
                            unit: current.manualDimensions[dimension.key]?.unit ?? "mm",
                          },
                        },
                      }))
                    }
                    onUnitChange={(nextUnit) =>
                      setInput((current) => ({
                        ...current,
                        manualDimensions: {
                          ...current.manualDimensions,
                          [dimension.key]: {
                            value: current.manualDimensions[dimension.key]?.value ?? dimension.defaultMm,
                            unit: nextUnit,
                          },
                        },
                      }))
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
                Formula uses EN standard table area: {selectedProfile.formulaLabel}
              </p>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="length" className="text-sm font-medium">
                  Piece length
                </label>
                <div className="flex gap-2">
                  <input
                    id="length"
                    type="number"
                    min={0}
                    step="any"
                    value={input.length.value}
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        length: { ...current.length, value: parseNumber(event.target.value) },
                      }))
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  />
                  <select
                    value={input.length.unit}
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        length: { ...current.length, unit: event.target.value as LengthUnit },
                      }))
                    }
                    className="rounded-md border border-slate-300 bg-white px-3 py-2"
                    aria-label="Length unit"
                  >
                    {LENGTH_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-2">
                <label htmlFor="quantity" className="text-sm font-medium">
                  Quantity
                </label>
                <input
                  id="quantity"
                  type="number"
                  min={1}
                  step={1}
                  value={input.quantity}
                  onChange={(event) =>
                    setInput((current) => ({ ...current, quantity: Math.max(1, Math.floor(parseNumber(event.target.value))) }))
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                />
              </div>
            </div>
          </section>

          <section className="grid gap-3">
            <h3 className="font-semibold text-slate-900">Pricing</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="price-basis" className="text-sm font-medium">
                  Price basis
                </label>
                <select
                  id="price-basis"
                  value={input.priceBasis}
                  onChange={(event) => setPriceBasis(event.target.value as PriceBasis)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                >
                  <option value="weight">Weight</option>
                  <option value="length">Length</option>
                  <option value="piece">Piece</option>
                </select>
              </div>

              <div className="grid gap-2">
                <label htmlFor="price-unit" className="text-sm font-medium">
                  Price unit
                </label>
                <select
                  id="price-unit"
                  value={input.priceUnit}
                  onChange={(event) => setInput((current) => ({ ...current, priceUnit: event.target.value as PriceUnit }))}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                >
                  {priceUnitsForBasis.map((unit) => (
                    <option key={unit} value={unit}>
                      per {unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label htmlFor="unit-price" className="text-sm font-medium">
                  Unit price
                </label>
                <input
                  id="unit-price"
                  type="number"
                  step="any"
                  min={0}
                  value={input.unitPrice}
                  onChange={(event) => setInput((current) => ({ ...current, unitPrice: parseNumber(event.target.value) }))}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="currency" className="text-sm font-medium">
                  Currency
                </label>
                <select
                  id="currency"
                  value={input.currency}
                  onChange={(event) =>
                    setInput((current) => ({ ...current, currency: event.target.value as CalculationInput["currency"] }))
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="waste" className="text-sm font-medium">
                  Waste / scrap %
                </label>
                <input
                  id="waste"
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  value={input.wastePercent}
                  onChange={(event) =>
                    setInput((current) => ({ ...current, wastePercent: parseNumber(event.target.value) }))
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                />
              </div>

              <div className="grid gap-2">
                <label className="inline-flex items-center gap-2 pt-7 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={input.includeVat}
                    onChange={(event) => setInput((current) => ({ ...current, includeVat: event.target.checked }))}
                  />
                  Include VAT
                </label>
                {input.includeVat ? (
                  <input
                    aria-label="VAT percent"
                    type="number"
                    min={0}
                    max={35}
                    step="any"
                    value={input.vatPercent}
                    onChange={(event) => setInput((current) => ({ ...current, vatPercent: parseNumber(event.target.value) }))}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2"
                  />
                ) : null}
              </div>
            </div>
          </section>

          <section className="grid gap-3">
            <h3 className="font-semibold text-slate-900">Precision</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <label htmlFor="round-weight" className="text-sm font-medium">
                  Weight decimals
                </label>
                <input
                  id="round-weight"
                  type="number"
                  min={0}
                  max={6}
                  step={1}
                  value={input.rounding.weightDecimals}
                  onChange={(event) =>
                    setInput((current) => ({
                      ...current,
                      rounding: {
                        ...current.rounding,
                        weightDecimals: Math.min(6, Math.max(0, Math.floor(parseNumber(event.target.value)))),
                      },
                    }))
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="round-price" className="text-sm font-medium">
                  Price decimals
                </label>
                <input
                  id="round-price"
                  type="number"
                  min={0}
                  max={6}
                  step={1}
                  value={input.rounding.priceDecimals}
                  onChange={(event) =>
                    setInput((current) => ({
                      ...current,
                      rounding: {
                        ...current.rounding,
                        priceDecimals: Math.min(6, Math.max(0, Math.floor(parseNumber(event.target.value)))),
                      },
                    }))
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="round-dimension" className="text-sm font-medium">
                  Dimension decimals
                </label>
                <input
                  id="round-dimension"
                  type="number"
                  min={0}
                  max={6}
                  step={1}
                  value={input.rounding.dimensionDecimals}
                  onChange={(event) =>
                    setInput((current) => ({
                      ...current,
                      rounding: {
                        ...current.rounding,
                        dimensionDecimals: Math.min(6, Math.max(0, Math.floor(parseNumber(event.target.value)))),
                      },
                    }))
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                />
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700">
              Calculate
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-800 hover:bg-slate-100"
            >
              Reset
            </button>
          </div>
        </form>

        <aside className="grid gap-5">
          <section className="rounded-lg border border-slate-300 bg-white p-5">
            <h2 className="text-lg font-semibold">Result</h2>
            {result ? (
              <div className="mt-3 grid gap-2 text-sm">
                <p>
                  <span className="font-semibold">Profile:</span> {result.profileLabel}
                </p>
                <p>
                  <span className="font-semibold">Material:</span> {result.gradeLabel}
                </p>
                <p>
                  <span className="font-semibold">Unit weight:</span> {result.unitWeightKg} kg
                </p>
                <p>
                  <span className="font-semibold">Total weight:</span> {result.totalWeightKg} kg ({result.totalWeightLb} lb)
                </p>
                <p>
                  <span className="font-semibold">Unit price:</span> {result.unitPriceAmount} {result.currency}
                </p>
                <p>
                  <span className="font-semibold">Subtotal:</span> {result.subtotalAmount} {result.currency}
                </p>
                <p>
                  <span className="font-semibold">Waste amount:</span> {result.wasteAmount} {result.currency}
                </p>
                {input.includeVat ? (
                  <p>
                    <span className="font-semibold">VAT:</span> {result.vatAmount} {result.currency}
                  </p>
                ) : null}
                <p className="mt-2 border-t border-slate-200 pt-2 text-base font-semibold">
                  Total: {result.grandTotalAmount} {result.currency}
                </p>
                <p className="text-xs text-slate-600">Formula: {result.formulaLabel}</p>
                <button
                  type="button"
                  className="mt-1 w-fit rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                  onClick={exportResultCsv}
                >
                  Export CSV
                </button>

                <details className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-2">
                  <summary className="cursor-pointer font-medium">Show calculation breakdown</summary>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr>
                          <th className="py-1">Step</th>
                          <th className="py-1">Expression</th>
                          <th className="py-1">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.breakdownRows.map((row) => (
                          <tr key={`${row.label}-${row.expression}`}>
                            <td className="py-1 pr-2">{row.label}</td>
                            <td className="py-1 pr-2 font-mono">{row.expression}</td>
                            <td className="py-1">
                              {row.value} {row.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>

                <div className="mt-3 text-xs">
                  <p className="font-semibold">Reference labels</p>
                  <ul className="mt-1 list-disc pl-5">
                    {result.referenceLabels.map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Run a calculation to see results and traceability labels.</p>
            )}
          </section>

          <section className="rounded-lg border border-slate-300 bg-white p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Recent Calculations</h2>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
                onClick={clearHistory}
                disabled={history.length === 0}
              >
                Clear history
              </button>
            </div>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">No local history yet.</p>
            ) : (
              <ul className="mt-2 grid gap-2 text-sm">
                {history.map((entry) => (
                  <li key={entry.id} className="rounded-md border border-slate-200 p-2">
                    <p className="font-medium">
                      {entry.result.profileLabel} - {entry.result.grandTotalAmount} {entry.result.currency}
                    </p>
                    <p className="text-xs text-slate-600">{new Date(entry.timestamp).toLocaleString()}</p>
                    <button
                      type="button"
                      className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                      onClick={() => {
                        setInput(entry.input);
                        setResult(entry.result);
                        setIssues([]);
                      }}
                    >
                      Load
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <section className="mt-6">
        <ContactForm
          context={
            result
              ? `${result.profileLabel} / ${result.gradeLabel} / total ${result.grandTotalAmount} ${result.currency}`
              : undefined
          }
        />
      </section>
    </div>
  );
}
