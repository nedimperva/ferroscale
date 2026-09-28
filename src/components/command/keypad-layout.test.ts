import { describe, expect, it } from "vitest";
import { cmdParse, type CommandParserSettings } from "@ferroscale/metal-core";
import { commandKeypadInsert, commandKeypadLayout } from "./keypad-layout";

const SETTINGS: CommandParserSettings = {
  pricing: {
    priceBasis: "weight",
    priceUnit: "kg",
    unitPrice: 1.2,
    currency: "EUR",
    wastePercent: 0,
    includeVat: false,
    vatPercent: 0,
  },
  defaultGradeId: "steel-s235jr",
  defaultLengthUnit: "m",
};

function layout(query: string, override: "letters" | null = null) {
  return commandKeypadLayout(query, cmdParse(query, SETTINGS), override);
}

describe("commandKeypadLayout", () => {
  it("types on the one keyboard — letters with the number row — whatever the token", () => {
    expect(layout("")).toBe("letters");
    expect(layout("he")).toBe("letters");
    expect(layout("hea")).toBe("letters");
    expect(layout("hea120 ")).toBe("letters");
    expect(layout("hea120 6")).toBe("letters");
    expect(layout("hea120 6m x2 @2.5")).toBe("letters");
  });

  it("never switches away on a letter that starts a longer word", () => {
    // `t` is a tee and `l` an angle; the old number pad jumped on both, in
    // the middle of tube, tee, lim and square.
    for (const q of ["t", "tu", "tube", "l", "li", "lim", "sq", "squ", "square "]) {
      expect(layout(q), q).toBe("letters");
    }
  });

  it("collapses to the action bar once the line computes and nothing is half-typed", () => {
    expect(layout("hea120 6m ")).toBe("actions");
    expect(layout("hea120 6m x2 ")).toBe("actions");
    expect(layout("hea120 6m x2 s235 ")).toBe("actions");
  });

  it("stays on the keyboard while a token is still under the caret", () => {
    expect(layout("hea120 6m")).toBe("letters");
    expect(layout("hea120 6m x2")).toBe("letters");
  });

  it("keeps the keyboard over a finished line once it has been reopened", () => {
    expect(layout("hea120 6m x2 ", "letters")).toBe("letters");
  });
});

describe("commandKeypadInsert", () => {
  function insert(query: string, ch: string) {
    return commandKeypadInsert(query, ch, cmdParse(query, SETTINGS));
  }

  it("splits a finished catalog size from the next length digit", () => {
    expect(insert("hea120", "6")).toBe("hea120 6");
    expect(insert("shs40x40x3", "6")).toBe("shs40x40x3 6");
  });

  it("does not split while the size is still being typed", () => {
    expect(insert("hea12", "0")).toBe("hea120");
    expect(insert("shs40", "x")).toBe("shs40x");
  });

  it("puts a space after a finished length when quantity starts", () => {
    expect(insert("hea120 6m", "x")).toBe("hea120 6m x");
  });

  it("the space key commits the open token and does not double", () => {
    expect(insert("hea120", " ")).toBe("hea120 ");
    expect(insert("hea120 ", " ")).toBe("hea120 ");
  });

  it("lets a unit glue onto the number under the caret", () => {
    expect(insert("hea120 6", "mm ")).toBe("hea120 6mm ");
  });

  it("replaces a completed length token when a new digit is typed", () => {
    expect(insert("hea120 6m", "4")).toBe("hea120 4");
    expect(insert("hea120 6000mm", "3")).toBe("hea120 3");
  });
});
