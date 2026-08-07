import { describe, it, expect } from "vitest";
import {
  activeItemText,
  applyToActiveItem,
  editLineToken,
  lineChipPrefix,
  lineChips,
  pullLastChip,
  removeLineToken,
} from "./line-edit";

describe("lineChips", () => {
  it("chips a single-item line and keeps the caret token out", () => {
    const { groups, partial } = lineChips("hea120 6m ip");
    expect(groups).toHaveLength(1);
    expect(groups[0].tokens).toEqual(["hea120", "6m"]);
    expect(partial).toBe("ip");
  });

  it("has no partial once the line ends in a space", () => {
    const { groups, partial } = lineChips("hea120 6m ");
    expect(groups[0].tokens).toEqual(["hea120", "6m"]);
    expect(partial).toBe("");
  });

  it("groups tokens per item", () => {
    const { groups, partial } = lineChips("hea120 6m + ipe200 4m");
    expect(groups.map((group) => group.tokens)).toEqual([
      ["hea120", "6m"],
      ["ipe200"],
    ]);
    // Only the item being typed can hold a partial.
    expect(partial).toBe("4m");
  });

  it("treats a finished item's last token as committed", () => {
    // "6 meters" only folds into "6m" when the words are committed — the `+`
    // is what commits them in the first item.
    const { groups } = lineChips("hea120 6 meters + ipe200 ");
    expect(groups[0].tokens).toEqual(["hea120", "6m"]);
  });
});

describe("removeLineToken", () => {
  it("removes from the item it was in", () => {
    expect(removeLineToken("hea120 6m + ipe200 4m ", 1, 1)).toBe("hea120 6m + ipe200 ");
    expect(removeLineToken("hea120 6m + ipe200 4m ", 0, 1)).toBe("hea120 + ipe200 4m ");
  });

  it("keeps the caret token a partial when the line has no trailing space", () => {
    expect(removeLineToken("hea120 6m x2", 0, 0)).toBe("6m x2");
  });

  it("leaves the line alone for an item that isn't there", () => {
    expect(removeLineToken("hea120 6m", 3, 0)).toBe("hea120 6m");
  });
});

describe("editLineToken", () => {
  it("pulls a token to the end of its own item, never across the separator", () => {
    expect(editLineToken("hea120 6m x2 + ipe200 4m ", 0, 0)).toBe("6m x2 hea120 + ipe200 4m ");
  });

  it("makes the pulled token the caret partial on the item being typed", () => {
    expect(editLineToken("hea120 6m x2 ", 0, 0)).toBe("6m x2 hea120");
  });

  it("ignores a token index that isn't there", () => {
    expect(editLineToken("hea120 6m", 0, 9)).toBe("hea120 6m");
  });
});

describe("applyToActiveItem", () => {
  it("edits only the item being typed", () => {
    expect(applyToActiveItem("hea120 6m + ipe200 ", (text) => `${text}4m `)).toBe(
      "hea120 6m + ipe200 4m ",
    );
  });

  it("behaves like a plain edit on a single-item line", () => {
    expect(applyToActiveItem("hea120 ", (text) => `${text}6m `)).toBe("hea120 6m ");
  });

  it("reports the active item's text without the separator's whitespace", () => {
    expect(activeItemText("hea120 6m + ipe200 4m")).toBe("ipe200 4m");
    expect(activeItemText("hea120 6m")).toBe("hea120 6m");
  });
});

describe("lineChipPrefix", () => {
  it("is everything before the caret token", () => {
    expect(lineChipPrefix("hea120 6m ip")).toBe("hea120 6m ");
    expect(lineChipPrefix("hea120 6m + ipe200 4")).toBe("hea120 6m + ipe200 ");
  });

  it("rebuilds from tokens so glued input stays split", () => {
    expect(lineChipPrefix("hea1006m x")).toBe("hea100 6m ");
  });

  it("is the whole line when there is no caret token", () => {
    expect(lineChipPrefix("hea120 6m + ipe200 4m ")).toBe("hea120 6m + ipe200 4m ");
  });
});

describe("pullLastChip", () => {
  it("puts the last chip back under the caret", () => {
    expect(pullLastChip("hea120 6m x2 ")).toBe("hea120 6m x2");
  });

  it("pulls from the item being typed, not the one before it", () => {
    expect(pullLastChip("hea120 6m + ipe200 4m ")).toBe("hea120 6m + ipe200 4m");
  });

  it("won't reach back across the separator when the new item is empty", () => {
    expect(pullLastChip("hea120 6m + ")).toBe("hea120 6m + ");
  });
});
