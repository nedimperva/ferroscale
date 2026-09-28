import { describe, expect, it } from "vitest";
import { cmdParseLine } from "@ferroscale/metal-core";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import en from "../../../messages/en.json";
import bs from "../../../messages/bs.json";
import { faqCommand } from "./faq-command";
import { STANDARD_BEAMS, STANDARD_CHANNELS, STANDARD_TEES } from "./faq-sizes";

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
  defaultLengthUnit: "mm",
};

/** A line the calculator takes whole: every item valid, nothing it didn't read. */
function expectCalculates(line: string) {
  const parsed = cmdParseLine(`${line} `, SETTINGS);
  const issues = parsed.items.flatMap((item) => item.parse.issues);
  expect(issues, line).toEqual([]);
  expect(parsed.items.every((item) => item.parse.valid), line).toBe(true);
}

// "Open in app" sends these to the calculator. They used to be written by
// hand in a syntax of their own — tub100x50x4, hex24, sht5 2000x1000 — and
// nine of nineteen failed on arrival.
describe("FAQ commands", () => {
  for (const [locale, messages] of [["en", en], ["bs", bs]] as const) {
    it.each(Object.entries(messages.faq.items))(`${locale}: %s opens a line that calculates`, (_, item) => {
      const command = (item as { command: string }).command;
      if (command === "") return; // a topic the calculator has no line for
      expectCalculates(command);
    });
  }

  it("offers no line for hex bar, which the calculator does not have", () => {
    expect(en.faq.items.hexBar.command).toBe("");
    expect(faqCommand("hexBar", { lengthM: 3 })).toBeNull();
  });
});

describe("FAQ sandbox command", () => {
  const grades = ["s235", "inox", "alu"];

  it.each(grades)("builds a calculating line for every free-form shape in %s", (grade) => {
    const lines = [
      faqCommand("sheet", { grade, lengthM: 2, widthMm: 1000, lengthMm: 2000, thicknessMm: 5 }),
      faqCommand("sheet", { grade, lengthM: 3, widthMm: 1000, lengthMm: 3000, thicknessMm: 0.75 }),
      faqCommand("chequered", { grade, lengthM: 2, widthMm: 1000, lengthMm: 2000, thicknessMm: 4 }),
      faqCommand("roundBar", { grade, lengthM: 6, diameterMm: 20 }),
      faqCommand("roundTube", { grade, lengthM: 6, diameterMm: 60.3, thicknessMm: 3.2 }),
      faqCommand("rectTube", { grade, lengthM: 6, widthMm: 100, heightMm: 50, thicknessMm: 4 }),
      faqCommand("rectTube", { grade, lengthM: 6, widthMm: 50, heightMm: 50, thicknessMm: 3 }),
      faqCommand("flatBar", { grade, lengthM: 6, widthMm: 50, thicknessMm: 10 }),
      faqCommand("squareBar", { grade, lengthM: 6, sideMm: 20 }),
      faqCommand("angle", { grade, lengthM: 6, legAMm: 50, legBMm: 50, thicknessMm: 5 }),
      faqCommand("angle", { grade, lengthM: 6, legAMm: 60, legBMm: 40, thicknessMm: 5 }),
      faqCommand("paint", { lengthM: 6, widthMm: 100, heightMm: 50 }),
    ];
    for (const line of lines) expectCalculates(line!);
  });

  it.each([
    ["beam", Object.keys(STANDARD_BEAMS)],
    ["channel", Object.keys(STANDARD_CHANNELS)],
    ["tee", Object.keys(STANDARD_TEES)],
    ["galv", Object.keys(STANDARD_BEAMS)],
  ] as const)("builds a calculating line for every %s in the size picker", (shape, sizes) => {
    for (const size of sizes) {
      const line = faqCommand(shape, { grade: "s235", lengthM: 6, size });
      if (line === null) continue;
      expectCalculates(line);
    }
  });

  it("links a catalogue size only when the calculator has it", () => {
    expect(faqCommand("tee", { lengthM: 6, size: "T 60x60x7" })).toBe("t60x60x7 6m");
    // EN 10055 goes on past T 60, but the calculator's table stops there.
    expect(faqCommand("tee", { lengthM: 6, size: "T 70x70x8" })).toBeNull();
    expect(faqCommand("beam", { lengthM: 6, size: "HEA 120" })).toBe("hea120 6m");
  });
});
