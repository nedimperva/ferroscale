import { describe, expect, it } from "vitest";
import { parseLocaleNumber } from "./number-input";

describe("parseLocaleNumber", () => {
  it("parses EU grouped numbers", () => {
    expect(parseLocaleNumber("1.234,56")).toBe(1234.56);
    expect(parseLocaleNumber("12 345,67")).toBe(12345.67);
  });

  it("parses US grouped numbers", () => {
    expect(parseLocaleNumber("1,234.56")).toBe(1234.56);
    expect(parseLocaleNumber("1,234,567.89")).toBe(1234567.89);
  });

  it("parses decimal comma and decimal dot", () => {
    expect(parseLocaleNumber("0,125")).toBe(0.125);
    expect(parseLocaleNumber("0.125")).toBe(0.125);
  });

  it("returns null for empty or invalid values", () => {
    expect(parseLocaleNumber("")).toBeNull();
    expect(parseLocaleNumber("   ")).toBeNull();
    expect(parseLocaleNumber("abc")).toBeNull();
  });
});
