import { dimsToSizeText, findAliasByProfileId } from "@ferroscale/metal-core";
import type { ProfileSpecsFamilyRow } from "./profile-specs";

/**
 * Turn a nearby-specs row into the profile+size token the command line uses
 * (`heb120`, `shs50x50x3`). Length is only needed for sheet-like families,
 * whose size token bakes it in.
 */
export function familyRowToInsert(
  row: ProfileSpecsFamilyRow,
  lengthMm?: number,
): string | null {
  const alias = findAliasByProfileId(row.profileId);
  if (!alias) return null;

  if (row.sizeId) {
    const rest = row.sizeId.startsWith(alias.alias)
      ? row.sizeId.slice(alias.alias.length)
      : null;
    return rest ? `${alias.alias}${rest}` : null;
  }

  if (row.dimensionsMm) {
    const size = dimsToSizeText(alias.fam, row.dimensionsMm, lengthMm);
    return size ? `${alias.alias}${size}` : null;
  }

  return null;
}
