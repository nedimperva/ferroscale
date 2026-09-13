import { getMaterialGradeById } from "./materials";
import { getProfileById } from "./profiles";
import type { MetalFamilyId, ProfileId } from "./types";

/**
 * Whether a profile is actually sold in a material — a procurement fact, not a
 * calculation one.
 *
 * The engine will happily multiply any cross-section by any density, and the
 * answer is arithmetically right, so this never blocks a result. But the app
 * was letting `heb400 6m 316` and `hea400 6m 6060` pass with the same quiet
 * confidence as `hea120 6m s235`, and those three are not the same kind of
 * thing to go and buy.
 *
 * The dividing line is already in the dataset: a `standard` profile IS an EN
 * steel size table (IPE, IPN, HEA/HEB/HEM, UPN, UPE, tee). Every `manual`
 * profile — bars, angle, tubes, plate, sheet — is genuinely stocked in all
 * three families, so no per-profile table is needed.
 *
 *   stainless on an EN section  → real, but laser-welded to order rather than
 *     hot-rolled. Dimensions per EN 10365 and tolerances per EN 10034, so the
 *     geometry (and therefore the mass) is exactly the steel one; what changes
 *     is lead time and price.
 *   aluminium on an EN section  → the series does not exist. HEA/IPE/UPN are
 *     steel dimensional standards; aluminium extrusions follow EN 755 with a
 *     different catalogue entirely.
 *
 * Availability varies by market, supplier and quantity, so treat this as a
 * strong default rather than a universal truth — which is exactly why it is a
 * note and not an error.
 */
export type AvailabilityLevel =
  /** Ordinary stock. No note. */
  | "stock"
  /** Made, but to order — different process, lead time and price. */
  | "madeToOrder"
  /** Not produced in this material in this dimensional series. */
  | "notInSeries";

export interface MaterialAvailability {
  level: AvailabilityLevel;
  /** Localized by the web under `command.availability.*`. */
  code: "madeToOrder" | "notInSeries";
  /** The standard that governs what IS made in this material, when there is one. */
  referenceLabel?: string;
}

/**
 * Alloys that are not extruded or rolled into sections at all. 7075 is an
 * aerospace alloy stocked as plate, sheet, bar and tube; a 7075 angle or
 * chequered plate is not a thing you order.
 */
const NON_SECTION_ALLOYS = new Set(["al-7075"]);
const SECTION_LIKE_MANUAL: ReadonlySet<ProfileId> = new Set<ProfileId>([
  "angle",
  "chequered_plate",
  "corrugated_sheet",
  "expanded_metal",
]);

export function materialAvailability(
  profileId: ProfileId,
  gradeId: string,
): MaterialAvailability | null {
  const profile = getProfileById(profileId);
  const grade = getMaterialGradeById(gradeId);
  if (!profile || !grade) return null;

  const family: MetalFamilyId = grade.familyId;

  if (profile.mode === "standard") {
    if (family === "stainless_steel") {
      return { level: "madeToOrder", code: "madeToOrder", referenceLabel: "EN 10088-3" };
    }
    if (family === "aluminum") {
      return { level: "notInSeries", code: "notInSeries", referenceLabel: "EN 755" };
    }
    return null;
  }

  if (NON_SECTION_ALLOYS.has(grade.id) && SECTION_LIKE_MANUAL.has(profile.id)) {
    return { level: "notInSeries", code: "notInSeries" };
  }

  return null;
}
