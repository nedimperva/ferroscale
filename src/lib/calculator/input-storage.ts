import type { CalculationInput } from "@/lib/calculator/types";

export const INPUT_STORAGE_KEY = "advanced-calc-input-v1";

export function loadPersistedInput(): CalculationInput | null {
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

export function persistInput(input: CalculationInput): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INPUT_STORAGE_KEY, JSON.stringify({ v: 1, input }));
  } catch { /* quota exceeded — ignore */ }
}
