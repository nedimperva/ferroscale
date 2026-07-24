import type { CalculationResult } from "@/lib/calculator/types";

/**
 * Saved-library hygiene helpers: automatic tag suggestions and staleness
 * detection. Both are pure functions of already-computed data (the saved
 * result + a clock) so they can be unit-tested and reused across the mobile
 * sheet and the desktop grid without touching storage.
 */

/** First whitespace-delimited token of a profile label ("HEA 120" → "HEA"). */
function profileFamilyTag(profileLabel: string): string | null {
  const first = profileLabel.trim().split(/\s+/)[0];
  return first && /[A-Za-z]/.test(first) ? first : null;
}

/**
 * Zero-keystroke tags derived from a calculation: the profile family and the
 * material grade. Used to seed a saved entry's tags when the user provided
 * none, so the library is filterable/groupable without any tagging effort.
 * Deduplicated (case-insensitive), order-stable, capped at 2.
 */
export function suggestTags(result: CalculationResult): string[] {
  const candidates = [profileFamilyTag(result.profileLabel), result.gradeLabel];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of candidates) {
    const tag = raw?.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= 2) break;
  }
  return out;
}

/** Roughly six months, the threshold past which an unused save reads as stale. */
export const STALE_AFTER_DAYS = 183;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days between two ISO/epoch instants, clamped at 0. */
export function daysSince(timestamp: string | undefined, nowMs: number): number {
  if (!timestamp) return 0;
  const then = Date.parse(timestamp);
  if (!Number.isFinite(then)) return 0;
  return Math.max(0, Math.floor((nowMs - then) / DAY_MS));
}

/**
 * True when a saved entry has never been reused and has aged past the stale
 * threshold — the proactive half of a trash/archive flow. `lastUsedAt` (a
 * later reuse) resets the clock; a fresh save is never stale.
 */
export function isStaleSaved(
  entry: { useCount: number; timestamp: string; lastUsedAt?: string },
  nowMs: number = Date.now(),
): boolean {
  if (entry.useCount > 0) return false;
  const anchor = entry.lastUsedAt ?? entry.timestamp;
  return daysSince(anchor, nowMs) >= STALE_AFTER_DAYS;
}
