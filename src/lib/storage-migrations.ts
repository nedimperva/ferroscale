/**
 * One-time localStorage key migrations, run at module scope so they complete
 * before any store or hook hydrates. The advanced-calc-* prefix predates the
 * FerroScale rename; everything now lives under ferroscale-*.
 */

const RENAMES: Array<[oldKey: string, newKey: string]> = [
  ["advanced-calc-input-v1", "ferroscale-input-v1"],
  ["advanced-calc-projects-v2", "ferroscale-projects-v2"],
  ["advanced-calc-compare-v2", "ferroscale-compare-v2"],
  ["advanced-calc-compare-limit-v1", "ferroscale-compare-limit-v1"],
];

export function migrateLegacyStorageKeys(): void {
  if (typeof window === "undefined") return;
  try {
    for (const [oldKey, newKey] of RENAMES) {
      const value = localStorage.getItem(oldKey);
      if (value !== null) {
        // Never clobber data already written under the new key.
        if (localStorage.getItem(newKey) === null) {
          localStorage.setItem(newKey, value);
        }
        localStorage.removeItem(oldKey);
      }
    }
  } catch {
    // Storage unavailable (private mode quirks) — hydration falls back to defaults.
  }
}

migrateLegacyStorageKeys();
