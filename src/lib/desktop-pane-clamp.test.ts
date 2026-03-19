import { describe, it, expect } from "vitest";
import {
  clampResultPanePx,
  clampThirdPanePx,
  maxResultPanePx,
  maxThirdPanePx,
  MIN_RESULT_PANE_PX,
  MIN_THIRD_PANE_PX,
} from "./desktop-pane-clamp";

describe("maxResultPanePx", () => {
  it("respects user cap and layout with third column", () => {
    const m = maxResultPanePx({
      containerWidth: 1200,
      thirdOpen: true,
      thirdWidthPx: 280,
      userCapPx: 480,
    });
    expect(m).toBeGreaterThanOrEqual(MIN_RESULT_PANE_PX);
    expect(m).toBeLessThanOrEqual(480);
  });

  it("tightens when third column is wide", () => {
    const narrow = maxResultPanePx({
      containerWidth: 1200,
      thirdOpen: true,
      thirdWidthPx: 380,
      userCapPx: 480,
    });
    const wider = maxResultPanePx({
      containerWidth: 1200,
      thirdOpen: true,
      thirdWidthPx: 220,
      userCapPx: 480,
    });
    expect(narrow).toBeLessThanOrEqual(wider);
  });
});

describe("clampResultPanePx", () => {
  it("clamps to min", () => {
    expect(
      clampResultPanePx(10, {
        containerWidth: 1200,
        thirdOpen: false,
        thirdWidthPx: 0,
        userCapPx: 480,
      }),
    ).toBe(MIN_RESULT_PANE_PX);
  });
});

describe("maxThirdPanePx / clampThirdPanePx", () => {
  it("returns min when third closed", () => {
    expect(
      maxThirdPanePx({ containerWidth: 1200, resultWidthPx: 320, thirdOpen: false }),
    ).toBe(MIN_THIRD_PANE_PX);
  });

  it("clamps third width", () => {
    const v = clampThirdPanePx(9999, {
      containerWidth: 1000,
      resultWidthPx: 320,
      thirdOpen: true,
    });
    expect(v).toBeLessThanOrEqual(400);
    expect(v).toBeGreaterThanOrEqual(MIN_THIRD_PANE_PX);
  });
});
