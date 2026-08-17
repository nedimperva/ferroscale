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

function layout(query: string, override: "letters" | "numpad" | null = null) {
  return commandKeypadLayout(query, cmdParse(query, SETTINGS), override);
}

describe("commandKeypadLayout", () => {
  it("starts on letters — empty line or a half-typed alias", () => {
    expect(layout("")).toBe("letters");
    expect(layout("he")).toBe("letters");
  });

  it("flips to the number pad the moment the alias settles", () => {
    expect(layout("hea")).toBe("numpad");
    expect(layout("ipe")).toBe("numpad");
  });

  it("switches to the number pad once a size is in and a length is next", () => {
    expect(layout("hea120 ")).toBe("numpad");
    expect(layout("hea120")).toBe("numpad");
    expect(layout("shs40x40x3 ")).toBe("numpad");
  });

  it("stays on the number pad for length, quantity and a rate", () => {
    expect(layout("hea120 6")).toBe("numpad");
    expect(layout("hea120 6m x")).toBe("numpad");
    expect(layout("hea120 6m x2 @2.5")).toBe("numpad");
  });

  it("collapses to the action bar once the line computes and nothing is half-typed", () => {
    expect(layout("hea120 6m ")).toBe("actions");
    expect(layout("hea120 6m x2 ")).toBe("actions");
    expect(layout("hea120 6m x2 s235 ")).toBe("actions");
  });

  it("stays open while a token is still under the caret, even if the line would compute", () => {
    expect(layout("hea120 6m")).toBe("numpad");
    expect(layout("hea120 6m x2")).toBe("numpad");
  });

  it("uses letters for a grade under the caret", () => {
    expect(layout("hea120 6m x2 s")).toBe("letters");
    expect(layout("hea120 6m x2 s235")).toBe("letters");
  });

  it("honours an explicit override only when nothing is half-typed", () => {
    expect(layout("hea120 6m x2 ", "numpad")).toBe("numpad");
    expect(layout("hea120 6m x2 ", "letters")).toBe("letters");
    expect(layout("hea120 ", "letters")).toBe("letters");
    expect(layout("hea120 6m x2 s", "numpad")).toBe("letters");
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
});
