import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkContactRateLimit } from "./rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request from a new IP", () => {
    const result = checkContactRateLimit("10.0.0.1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("tracks requests per IP and blocks after limit", () => {
    const ip = "10.0.0.2";
    for (let i = 0; i < 5; i++) {
      const result = checkContactRateLimit(ip);
      expect(result.allowed).toBe(true);
    }
    const blocked = checkContactRateLimit(ip);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after the time window expires", () => {
    const ip = "10.0.0.3";
    for (let i = 0; i < 5; i++) {
      checkContactRateLimit(ip);
    }
    expect(checkContactRateLimit(ip).allowed).toBe(false);

    vi.advanceTimersByTime(16 * 60 * 1000);
    const afterReset = checkContactRateLimit(ip);
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(4);
  });

  it("isolates different IPs", () => {
    for (let i = 0; i < 5; i++) {
      checkContactRateLimit("10.0.0.4");
    }
    const otherIp = checkContactRateLimit("10.0.0.5");
    expect(otherIp.allowed).toBe(true);
    expect(otherIp.remaining).toBe(4);
  });

  it("returns resetAt timestamp", () => {
    const result = checkContactRateLimit("10.0.0.6");
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});
