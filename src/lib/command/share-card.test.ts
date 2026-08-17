import { describe, expect, it } from "vitest";
import { shareCardSize } from "./share-card";

describe("shareCardSize", () => {
  it("keeps a single part on the short card", () => {
    expect(shareCardSize(0).height).toBe(720);
    expect(shareCardSize(1).height).toBe(720);
  });

  it("grows with each extra part so the list is not cropped", () => {
    const two = shareCardSize(2).height;
    const four = shareCardSize(4).height;
    expect(two).toBeGreaterThan(720);
    expect(four).toBeGreaterThan(two);
  });
});
