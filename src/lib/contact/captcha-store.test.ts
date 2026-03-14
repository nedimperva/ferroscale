import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createCaptchaChallenge, verifyCaptchaChallenge } from "./captcha-store";

describe("captcha-store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a challenge with a valid prompt and challengeId", () => {
    const { challengeId, prompt } = createCaptchaChallenge();
    expect(challengeId).toBeTruthy();
    expect(prompt).toMatch(/^\d+\s[+\-×]\s\d+\s=\s\?$/);
  });

  it("verifies a correct answer", () => {
    const { challengeId, prompt } = createCaptchaChallenge();
    const answer = evaluatePrompt(prompt);
    expect(verifyCaptchaChallenge(challengeId, String(answer))).toBe(true);
  });

  it("rejects an incorrect answer", () => {
    const { challengeId, prompt } = createCaptchaChallenge();
    const answer = evaluatePrompt(prompt);
    expect(verifyCaptchaChallenge(challengeId, String(answer + 999))).toBe(false);
  });

  it("rejects after max attempts exceeded (3)", () => {
    const { challengeId, prompt } = createCaptchaChallenge();
    const answer = evaluatePrompt(prompt);

    verifyCaptchaChallenge(challengeId, "wrong1");
    verifyCaptchaChallenge(challengeId, "wrong2");
    verifyCaptchaChallenge(challengeId, "wrong3");
    expect(verifyCaptchaChallenge(challengeId, String(answer))).toBe(false);
  });

  it("rejects an expired challenge", () => {
    const { challengeId, prompt } = createCaptchaChallenge();
    const answer = evaluatePrompt(prompt);

    vi.advanceTimersByTime(11 * 60 * 1000);
    expect(verifyCaptchaChallenge(challengeId, String(answer))).toBe(false);
  });

  it("invalidates challenge after successful verification (one-time use)", () => {
    const { challengeId, prompt } = createCaptchaChallenge();
    const answer = evaluatePrompt(prompt);

    expect(verifyCaptchaChallenge(challengeId, String(answer))).toBe(true);
    expect(verifyCaptchaChallenge(challengeId, String(answer))).toBe(false);
  });

  it("rejects unknown challengeId", () => {
    expect(verifyCaptchaChallenge("nonexistent-id", "42")).toBe(false);
  });

  it("uses mixed operations (+, -, ×)", () => {
    const ops = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const { prompt } = createCaptchaChallenge();
      const match = prompt.match(/\d+\s([+\-×])\s\d+/);
      if (match) ops.add(match[1]);
    }
    expect(ops.size).toBeGreaterThanOrEqual(2);
  });

  it("generates answers that are always non-negative", () => {
    for (let i = 0; i < 100; i++) {
      const { prompt } = createCaptchaChallenge();
      const answer = evaluatePrompt(prompt);
      expect(answer).toBeGreaterThanOrEqual(0);
    }
  });
});

function evaluatePrompt(prompt: string): number {
  const match = prompt.match(/^(\d+)\s([+\-×])\s(\d+)\s=\s\?$/);
  if (!match) throw new Error(`Cannot parse prompt: ${prompt}`);
  const [, leftStr, op, rightStr] = match;
  const left = Number(leftStr);
  const right = Number(rightStr);
  switch (op) {
    case "+": return left + right;
    case "-": return left - right;
    case "×": return left * right;
    default: throw new Error(`Unknown op: ${op}`);
  }
}
