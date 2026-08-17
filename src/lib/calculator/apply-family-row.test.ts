import { describe, expect, it } from "vitest";
import { getDefaultInput } from "@/lib/calculator/input-storage";
import { replaceItemTokenKind } from "@/components/command/line-edit";
import { familyRowToInsert } from "./apply-family-row";
import { resolveProfileSpecs } from "./profile-specs";

function heaInput(sizeId = "hea120") {
  return {
    ...getDefaultInput(),
    profileId: "beam_hea_en" as const,
    selectedSizeId: sizeId,
    manualDimensions: {},
  };
}

describe("familyRowToInsert", () => {
  it("turns a standard peer into a command size token", () => {
    const specs = resolveProfileSpecs(heaInput());
    const heb = specs?.familyRows.find((row) => row.sizeId === "heb120");
    expect(heb).toBeDefined();
    expect(familyRowToInsert(heb!)).toBe("heb120");
  });

  it("turns a same-family neighbour into a command size token", () => {
    const specs = resolveProfileSpecs(heaInput());
    const hea140 = specs?.familyRows.find((row) => row.sizeId === "hea140");
    expect(hea140).toBeDefined();
    expect(familyRowToInsert(hea140!)).toBe("hea140");
  });
});

describe("applying a family row", () => {
  it("swaps the profile token and leaves the rest of the item alone", () => {
    const specs = resolveProfileSpecs(heaInput());
    const heb = specs?.familyRows.find((row) => row.sizeId === "heb120");
    const insert = familyRowToInsert(heb!);
    expect(insert).toBe("heb120");
    expect(replaceItemTokenKind("hea120 6m x2 s235 ", 0, "profile", insert!)).toBe(
      "heb120 6m x2 s235 ",
    );
  });

  it("only rewrites the item that was picked", () => {
    const specs = resolveProfileSpecs(heaInput());
    const heb = specs?.familyRows.find((row) => row.sizeId === "heb120");
    const insert = familyRowToInsert(heb!);
    expect(replaceItemTokenKind("hea120 6m + ipe200 4m ", 0, "profile", insert!)).toBe(
      "heb120 6m + ipe200 4m ",
    );
  });
});
