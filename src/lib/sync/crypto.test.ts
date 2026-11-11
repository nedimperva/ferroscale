import { describe, expect, it } from "vitest";
import { decryptAESGCM, encryptAESGCM } from "./crypto";

describe("sync encryption", () => {
  it("round-trips a small record", async () => {
    const sealed = await encryptAESGCM('{"id":"a"}', "passphrase");
    expect(await decryptAESGCM(sealed, "passphrase")).toBe('{"id":"a"}');
  });

  // A project with a few dozen lines serialises past the number of arguments
  // a single call may take; encoding it in one spread threw a RangeError.
  it("round-trips a record larger than one call's argument limit", async () => {
    const payload = JSON.stringify({ lines: "x".repeat(400_000) });
    const sealed = await encryptAESGCM(payload, "passphrase");
    expect(await decryptAESGCM(sealed, "passphrase")).toBe(payload);
  });

  it("rejects the wrong passphrase", async () => {
    const sealed = await encryptAESGCM("secret", "right");
    await expect(decryptAESGCM(sealed, "wrong")).rejects.toThrow();
  });
});
