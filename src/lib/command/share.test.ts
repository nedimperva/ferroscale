import { describe, it, expect } from "vitest";
import { buildShareUrl, readSharedQuery } from "./share";

const LOC = { origin: "https://ferroscale.app", pathname: "/en" };

describe("readSharedQuery", () => {
  it("reads the q param", () => {
    expect(readSharedQuery("?q=hea120+6m+x2")).toBe("hea120 6m x2");
  });

  it("returns null when absent or blank", () => {
    expect(readSharedQuery("")).toBeNull();
    expect(readSharedQuery("?other=1")).toBeNull();
    expect(readSharedQuery("?q=")).toBeNull();
    expect(readSharedQuery("?q=+++")).toBeNull();
  });
});

describe("buildShareUrl", () => {
  it("encodes the query on the current pathname (locale preserved)", () => {
    expect(buildShareUrl("hea120 6m x2 s235", LOC)).toBe(
      "https://ferroscale.app/en?q=hea120+6m+x2+s235",
    );
    expect(buildShareUrl("ipe200 4m", { ...LOC, pathname: "/bs" })).toBe(
      "https://ferroscale.app/bs?q=ipe200+4m",
    );
  });

  it("drops the param for an empty query", () => {
    expect(buildShareUrl("   ", LOC)).toBe("https://ferroscale.app/en");
  });

  it("round-trips through readSharedQuery", () => {
    const url = new URL(buildShareUrl("plt1500x3000x3 @2.50/kg", LOC));
    expect(readSharedQuery(url.search)).toBe("plt1500x3000x3 @2.50/kg");
  });
});
