import { describe, it, expect } from "vitest";
import {
  buildShareUrl,
  readSharedPricing,
  readSharedQuery,
  sharedPricingDiffers,
  type SharePricing,
} from "./share";

const LOC = { origin: "https://ferroscale.app", pathname: "/en" };

const PRICING: SharePricing = {
  unitPrice: 2.5,
  priceUnit: "kg",
  priceBasis: "weight",
  currency: "EUR",
  wastePercent: 0,
  includeVat: false,
  vatPercent: 17,
};

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

describe("share links carry pricing", () => {
  it("round-trips the sender's rate, basis and currency", () => {
    const url = new URL(buildShareUrl("hea120 6m x2", LOC, PRICING));
    expect(readSharedPricing(url.search)).toEqual({
      unitPrice: 2.5,
      priceUnit: "kg",
      priceBasis: "weight",
      currency: "EUR",
    });
  });

  it("carries waste and VAT only when they apply", () => {
    const plain = new URL(buildShareUrl("hea120 6m", LOC, PRICING));
    expect(readSharedPricing(plain.search)).not.toHaveProperty("wastePercent");
    expect(readSharedPricing(plain.search)).not.toHaveProperty("includeVat");

    const loaded = new URL(
      buildShareUrl("hea120 6m", LOC, {
        ...PRICING,
        wastePercent: 5,
        includeVat: true,
        vatPercent: 17,
      }),
    );
    expect(readSharedPricing(loaded.search)).toMatchObject({
      wastePercent: 5,
      includeVat: true,
      vatPercent: 17,
    });
  });

  it("returns null for links without pricing (older links still work)", () => {
    const url = new URL(buildShareUrl("hea120 6m x2", LOC));
    expect(readSharedQuery(url.search)).toBe("hea120 6m x2");
    expect(readSharedPricing(url.search)).toBeNull();
  });

  it("ignores junk values instead of applying them", () => {
    expect(readSharedPricing("?r=abc&ru=bananas&rb=nope&c=XYZ&w=-4")).toBeNull();
  });

  it("applies whatever a partial link does carry", () => {
    expect(readSharedPricing("?r=1.8")).toEqual({ unitPrice: 1.8 });
  });

  it("detects whether incoming pricing changes anything locally", () => {
    expect(sharedPricingDiffers({ unitPrice: 2.5 }, PRICING)).toBe(false);
    expect(sharedPricingDiffers({ unitPrice: 1.2 }, PRICING)).toBe(true);
    expect(sharedPricingDiffers({ currency: "BAM" }, PRICING)).toBe(true);
  });
});
