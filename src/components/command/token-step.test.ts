import { describe, expect, it } from "vitest";
import { canStepToken, stepToken } from "./token-step";

describe("stepToken", () => {
  it("steps quantity by one piece", () => {
    expect(stepToken("x2", 1)).toBe("x3");
    expect(stepToken("x2", -1)).toBe("x1");
    expect(stepToken("x1", -1)).toBe("x1");
  });

  it("steps a whole-line multiplier token", () => {
    expect(stepToken("**2", 1)).toBe("**3");
    expect(stepToken("**1", -1)).toBe("**1");
    expect(stepToken("==x3", 1)).toBe("==x4");
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

  it("steps standard catalogue profiles and stock manual profiles", () => {
    expect(stepToken("hea120", 1)).toBe("hea140");
    expect(stepToken("hea120", -1)).toBe("hea100");
    expect(stepToken("shs40x40x3", 1)).toBe("shs40x40x3.2");
    expect(stepToken("shs40x40x3.2", 1)).toBe("shs40x40x4");
    expect(stepToken("rnd20", 1)).toBe("rnd22");
    expect(stepToken("plt1500x3000x10", 1)).toBe("plt1500x3000x12");
    expect(canStepToken("hea120")).toBe(true);
  });

  it("steps grades within their material family", () => {
    expect(stepToken("s235", 1)).toBe("s355");
    expect(stepToken("s355", 1)).toBe("s420");
    expect(stepToken("304", 1)).toBe("316");
    expect(canStepToken("s235")).toBe(true);
  });

  it("leaves arithmetic expressions and labels alone", () => {
    expect(stepToken("6m-50mm", 1)).toBeNull();
    expect(stepToken("3*1850mm", 1)).toBeNull();
    expect(stepToken("6m/2", 1)).toBeNull();
    expect(stepToken("#column_A", 1)).toBeNull();
    expect(canStepToken("6m")).toBe(true);
    expect(canStepToken("#column_A")).toBe(false);
  });
});
