import { describe, expect, it } from "vitest";
import { classifySyncError, retryDelayMs } from "./google-client";

describe("classifySyncError", () => {
  it("asks for a sign-in when Google revokes the refresh token", () => {
    expect(classifySyncError(new Error('{"error":"invalid_grant","error_description":"Token has been expired or revoked."}'))).toBe("reauth");
  });

  it("treats network failures as transient", () => {
    expect(classifySyncError(new TypeError("Failed to fetch"))).toBe("transient");
  });

  it("leaves anything else as a real error", () => {
    expect(classifySyncError(new Error("Unexpected token < in JSON"))).toBe("other");
  });
});

describe("retryDelayMs", () => {
  it("backs off from 30s and caps at 15 minutes", () => {
    expect(retryDelayMs(1)).toBe(30_000);
    expect(retryDelayMs(2)).toBe(60_000);
    expect(retryDelayMs(3)).toBe(120_000);
    expect(retryDelayMs(20)).toBe(15 * 60_000);
  });
});
