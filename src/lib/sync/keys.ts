export const SYNC_PROVIDER = "google";
export const SYNC_SCOPE = "https://www.googleapis.com/auth/drive.appdata openid email";
export const SYNC_FILE_PREFIX = "ferroscale-sync-v2";
export const SYNC_SCHEMA_VERSION = 2;
export const BOOTSTRAP_RECORD_KEY = "bootstrap:root";

export const SYNC_METADATA_KEY = "ferroscale-sync-metadata-v2";
export const SYNC_SESSION_KEY = "ferroscale-sync-session-v2";
export const SYNC_PASSPHRASE_KEY = "ferroscale-sync-passphrase-v1";
export const SYNC_RECORD_INDEX_KEY = "ferroscale-sync-record-index-v2";
export const SYNC_AUTH_RESULT_STORAGE_KEY = "ferroscale-sync-auth-result";

export const SYNC_COLLECTION_UPDATED_AT_KEYS = {
  compare: "ferroscale-sync-compare-updated-at-v1",
  quickHistory: "ferroscale-sync-quick-history-updated-at-v1",
} as const;

export const SYNC_STORAGE_KEYS = {
  saved: "ferroscale-saved-v2",
  savedLegacy: "ferroscale-saved-v1",
  projects: "advanced-calc-projects-v2",
  presets: "ferroscale-presets-v1",
  compare: "advanced-calc-compare-v2",
  quickHistory: "ferroscale-quick-history",
} as const;

export const GOOGLE_SYNC_PROVIDER_ID = "google-drive";
