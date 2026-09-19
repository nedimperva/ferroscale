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

/**
 * Collections the app no longer has. `presets` was a size-shortcut store with
 * a sync slot and no way to write to it — a saved part is a size, so the
 * library does the job. Dropping the key stops it riding along in every
 * backup and snapshot.
 */
const DROPPED: string[] = ["ferroscale-presets-v1"];

const TEMPLATES_KEY = "ferroscale-assembly-templates-v1";
const SAVED_KEY = "ferroscale-saved-v2";

interface LegacyTemplateItem {
  id?: string;
  input?: unknown;
  result?: unknown;
  normalizedProfile?: unknown;
  quantity?: number;
  note?: string;
}

interface LegacyTemplate {
  id?: string;
  name?: string;
  description?: string;
  category?: string;
  items?: LegacyTemplateItem[];
  laborHours?: number;
  additionalCosts?: unknown[];
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  isBuiltin?: boolean;
}

/**
 * Assembly templates were a second library: the same multi-part record as a
 * saved entry, in a store of its own, with its own picker and its own manager
 * buried inside a project. They are library entries now — an item's `note` was
 * always the part's name, and its `quantity` was already mirrored into the
 * input — so this folds the old store into the saved one and drops the key.
 *
 * A built-in the user had removed carried no items, so it cannot be rebuilt
 * here; those standards come back, which is a row to delete again rather than
 * data lost.
 */
function foldTemplatesIntoLibrary(): void {
  const raw = localStorage.getItem(TEMPLATES_KEY);
  if (raw === null) return;

  let templates: LegacyTemplate[] = [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) templates = parsed as LegacyTemplate[];
  } catch {
    localStorage.removeItem(TEMPLATES_KEY);
    return;
  }

  let saved: unknown[] = [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
    if (Array.isArray(parsed)) saved = parsed;
  } catch {
    saved = [];
  }

  const existingIds = new Set(
    saved.map((entry) => (entry as { id?: string })?.id).filter(Boolean),
  );

  const folded = templates.flatMap((template) => {
    const id = template.id;
    const name = template.name?.trim();
    if (!id || !name || existingIds.has(id)) return [];
    const parts = (Array.isArray(template.items) ? template.items : [])
      .filter((item) => item && item.input && item.result)
      .map((item, index) => ({
        id: item.id ?? `${id}-p${index}`,
        name: item.note?.trim() || `${index + 1}`,
        input: item.input,
        result: item.result,
        normalizedProfile: item.normalizedProfile,
      }));
    if (parts.length === 0) return [];
    const createdAt = template.createdAt ?? new Date().toISOString();
    return [
      {
        id,
        timestamp: createdAt,
        name,
        notes: template.description,
        category: template.category,
        laborHours: template.laborHours,
        additionalCosts: template.additionalCosts,
        isBuiltin: template.isBuiltin || undefined,
        isAssembly: true,
        useCount: 0,
        updatedAt: template.updatedAt ?? createdAt,
        deletedAt: template.deletedAt,
        parts,
        input: parts[0].input,
        result: parts[0].result,
        normalizedProfile: parts[0].normalizedProfile,
      },
    ];
  });

  if (folded.length > 0) {
    localStorage.setItem(SAVED_KEY, JSON.stringify([...folded, ...saved]));
  }
  localStorage.removeItem(TEMPLATES_KEY);
}

export function migrateLegacyStorageKeys(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of DROPPED) {
      localStorage.removeItem(key);
    }
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
    foldTemplatesIntoLibrary();
  } catch {
    // Storage unavailable (private mode quirks) — hydration falls back to defaults.
  }
}

migrateLegacyStorageKeys();
