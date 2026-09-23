import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSyncKey, hasSyncKey, loadSyncKey, saveSyncKey } from "./key-store";
import { decryptAESGCM, encryptAESGCM } from "./crypto";
import { SYNC_PASSPHRASE_KEY } from "./keys";

let storage = new Map<string, string>();

describe("sync key store", () => {
  beforeEach(async () => {
    storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    });
    await clearSyncKey();
  });

  it("keeps a non-extractable key and never the passphrase itself", async () => {
    await saveSyncKey("correct horse");
    const key = await loadSyncKey();
    expect(key?.extractable).toBe(false);
    expect(hasSyncKey()).toBe(true);
    expect(storage.size).toBeGreaterThan(0);
    for (const value of storage.values()) expect(value).not.toContain("correct horse");
    expect(localStorage.getItem(SYNC_PASSPHRASE_KEY)).toBeNull();
  });

  it("reads data encrypted with the plain passphrase, and vice versa", async () => {
    await saveSyncKey("correct horse");
    const key = (await loadSyncKey())!;
    expect(await decryptAESGCM(await encryptAESGCM("hello", "correct horse"), key)).toBe("hello");
    expect(await decryptAESGCM(await encryptAESGCM("hello", key), "correct horse")).toBe("hello");
  });

  it("converts a plain-text passphrase left by an older release, then deletes it", async () => {
    localStorage.setItem(SYNC_PASSPHRASE_KEY, JSON.stringify("old secret"));
    expect(hasSyncKey()).toBe(true);
    const key = (await loadSyncKey())!;
    expect(await decryptAESGCM(await encryptAESGCM("x", "old secret"), key)).toBe("x");
    expect(localStorage.getItem(SYNC_PASSPHRASE_KEY)).toBeNull();
  });

  it("forgets the key on clear", async () => {
    await saveSyncKey("correct horse");
    await clearSyncKey();
    expect(hasSyncKey()).toBe(false);
    expect(await loadSyncKey()).toBeNull();
  });
});
