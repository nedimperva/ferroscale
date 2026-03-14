import { describe, it, expect } from "vitest";
import { validateContactRequest } from "./validation";

const VALID_PAYLOAD = {
  name: "John Doe",
  email: "john@example.com",
  message: "This is a test message with enough length.",
  challengeId: "abc-123",
  challengeAnswer: "42",
};

describe("validateContactRequest", () => {
  it("returns ok for a valid payload", () => {
    const result = validateContactRequest(VALID_PAYLOAD);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("John Doe");
      expect(result.data.email).toBe("john@example.com");
    }
  });

  it("rejects short name", () => {
    const result = validateContactRequest({ ...VALID_PAYLOAD, name: "J" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.field === "name")).toBe(true);
    }
  });

  it("rejects long name (>80 chars)", () => {
    const result = validateContactRequest({ ...VALID_PAYLOAD, name: "A".repeat(81) });
    expect(result.ok).toBe(false);
  });

  it("rejects missing email", () => {
    const result = validateContactRequest({ ...VALID_PAYLOAD, email: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.field === "email")).toBe(true);
    }
  });

  it("rejects invalid email with 1-char TLD", () => {
    const result = validateContactRequest({ ...VALID_PAYLOAD, email: "a@b.c" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.field === "email")).toBe(true);
    }
  });

  it("accepts email with 2+ char TLD", () => {
    const result = validateContactRequest({ ...VALID_PAYLOAD, email: "user@domain.co" });
    expect(result.ok).toBe(true);
  });

  it("rejects email exceeding 254 chars", () => {
    const longEmail = "a".repeat(250) + "@b.co";
    const result = validateContactRequest({ ...VALID_PAYLOAD, email: longEmail });
    expect(result.ok).toBe(false);
  });

  it("rejects short message (<10 chars)", () => {
    const result = validateContactRequest({ ...VALID_PAYLOAD, message: "Hi" });
    expect(result.ok).toBe(false);
  });

  it("rejects long message (>1500 chars)", () => {
    const result = validateContactRequest({ ...VALID_PAYLOAD, message: "X".repeat(1501) });
    expect(result.ok).toBe(false);
  });

  it("rejects missing challengeId", () => {
    const result = validateContactRequest({ ...VALID_PAYLOAD, challengeId: "" });
    expect(result.ok).toBe(false);
  });

  it("rejects missing challengeAnswer", () => {
    const result = validateContactRequest({ ...VALID_PAYLOAD, challengeAnswer: "" });
    expect(result.ok).toBe(false);
  });

  it("rejects oversized context (>3000 chars)", () => {
    const result = validateContactRequest({ ...VALID_PAYLOAD, context: "C".repeat(3001) });
    expect(result.ok).toBe(false);
  });

  it("sanitizes HTML in context field", () => {
    const result = validateContactRequest({
      ...VALID_PAYLOAD,
      context: '<script>alert("xss")</script>Hello',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.context).toBe('alert("xss")Hello');
    }
  });

  it("trims name, email, message in output", () => {
    const result = validateContactRequest({
      ...VALID_PAYLOAD,
      name: "  Jane Doe  ",
      email: "jane@test.com",
      message: "   This is a trimmed message.   ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Jane Doe");
      expect(result.data.email).toBe("jane@test.com");
      expect(result.data.message).toBe("This is a trimmed message.");
    }
  });

  it("collects multiple issues at once", () => {
    const result = validateContactRequest({ name: "", email: "", message: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThanOrEqual(3);
    }
  });
});
