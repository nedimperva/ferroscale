import { describe, expect, it } from "vitest";
import { canStepToken, stepToken } from "./token-step";

describe("stepToken", () => {
  it("steps quantity by one piece", () => {
    expect(stepToken("x2", 1)).toBe("x3");
    expect(stepToken("x2", -1)).toBe("x1");
    expect(stepToken("x1", -1)).toBe("x1");
  });

  it("steps a metre length by a metre, and a short one by half", () => {
    expect(stepToken("6m", 1)).toBe("7m");
    expect(stepToken("6m", -1)).toBe("5m");
    expect(stepToken("2m", 1)).toBe("2.5m");
    expect(stepToken("0.5m", -1)).toBe("0.5m");
  });

  it("steps millimetres and centimetres on their own scale", () => {
    expect(stepToken("50mm", 1)).toBe("55mm");
    expect(stepToken("200mm", 1)).toBe("210mm");
    expect(stepToken("12cm", -1)).toBe("11cm");
  });

  it("steps a rate by a tenth", () => {
    expect(stepToken("@2.50/kg", 1)).toBe("@2.6/kg");
    expect(stepToken("1.2/kg", -1)).toBe("1.1/kg");
    expect(stepToken("@0.05/kg", -1)).toBe("@0/kg");
  });

  it("leaves profiles, grades and arithmetic alone", () => {
    expect(stepToken("hea120", 1)).toBeNull();
    expect(stepToken("s235", 1)).toBeNull();
    expect(stepToken("6m-50mm", 1)).toBeNull();
    expect(canStepToken("6m")).toBe(true);
    expect(canStepToken("hea120")).toBe(false);
  });
});
