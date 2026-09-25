import type { ProfileDefinition, ProfileId } from "../types";
import { MANUAL_PROFILES } from "./manual";
import { BEAM_PROFILES } from "./beams";
import { CHANNEL_ANGLE_PROFILES } from "./channels-angles";
import { TEE_PROFILES } from "./tees";
import { ANGLE_PROFILES } from "./angles";

export { MANUAL_PROFILES } from "./manual";
export { BEAM_PROFILES } from "./beams";
export { CHANNEL_ANGLE_PROFILES } from "./channels-angles";
export { TEE_PROFILES } from "./tees";
export {
  ANGLE_PROFILES,
  ANGLE_CATALOG,
  ANGLE_SOURCES,
  anglePerimeterMm,
  findAngleCatalogSize,
  getAngleCatalogRow,
} from "./angles";
export type { AngleCatalogRow, AngleSourceId } from "./angles";

/**
 * All profile definitions, ordered: Bars → Tubes → Plates & Sheets → Structural
 */
export const PROFILE_DEFINITIONS: ProfileDefinition[] = [
  ...MANUAL_PROFILES,
  ...BEAM_PROFILES,
  ...CHANNEL_ANGLE_PROFILES,
  ...TEE_PROFILES,
  ...ANGLE_PROFILES,
];

const profileByIdCache = new Map<ProfileId, ProfileDefinition>();
for (const profile of PROFILE_DEFINITIONS) {
  profileByIdCache.set(profile.id, profile);
}

export function getProfileById(profileId: ProfileId): ProfileDefinition | undefined {
  return profileByIdCache.get(profileId);
}
