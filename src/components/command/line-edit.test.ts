import { describe, it, expect } from "vitest";
import {
  activeItemText,
  applyToActiveItem,
  duplicateLineItem,
  editLineToken,
  lineChipPrefix,
  lineChips,
  lineExpandedIndex,
  pullLastChip,
  removeLineItem,
  removeLineToken,
  replaceItemTokenKind,
  replaceLinePartial,
  replaceLineToken,
  tweakActiveItem,
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

describe("lineExpandedIndex", () => {
  it("stays on a locked item", () => {
    const { groups } = lineChips("hea120 6m + ipe200 4m ");
    expect(lineExpandedIndex(groups, 0)).toBe(0);
  });

  it("defaults to the active item at the caret", () => {
    const { groups } = lineChips("hea120 6m + ipe200 4m + ");
    expect(lineExpandedIndex(groups, null)).toBe(2);
  });
});

describe("removeLineToken", () => {
  it("removes from the item it was in", () => {
    expect(removeLineToken("hea120 6m + ipe200 4m ", 1, 1)).toBe("hea120 6m + ipe200 ");
    expect(removeLineToken("hea120 6m + ipe200 4m ", 0, 1)).toBe("hea120 + ipe200 4m ");
    expect(removeLineToken("hea120 6m x2 + ipe200 4m x3 ", 1, 2)).toBe(
      "hea120 6m x2 + ipe200 4m ",
    );
  });

  it("keeps the caret token a partial when the line has no trailing space", () => {
    expect(removeLineToken("hea120 6m x2", 0, 0)).toBe("6m x2");
  });

  it("leaves the line alone for an item that isn't there", () => {
    expect(removeLineToken("hea120 6m", 3, 0)).toBe("hea120 6m");
  });
});

describe("replaceLineToken", () => {
  it("swaps a token in place without moving it to the caret", () => {
    expect(replaceLineToken("hea120 6m x2 ", 0, 1, "7m")).toBe("hea120 7m x2 ");
    expect(replaceLineToken("hea120 6m + ipe200 4m ", 1, 1, "5m")).toBe(
      "hea120 6m + ipe200 5m ",
    );
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

describe("replaceItemTokenKind", () => {
  it("swaps the profile token of one item", () => {
    expect(replaceItemTokenKind("hea120 6m x2 + ipe200 4m ", 0, "profile", "heb120")).toBe(
      "heb120 6m x2 + ipe200 4m ",
    );
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

describe("tweakActiveItem", () => {
  it("pulls the active length token into the partial for editing", () => {
    expect(tweakActiveItem("hea120 6m ")).toBe("hea120 6m");
    expect(tweakActiveItem("hea120 6m")).toBe("hea120 6m");
  });

  it("pulls length to the end while preserving other tokens", () => {
    expect(tweakActiveItem("hea120 6m x2 s235 ")).toBe("hea120 x2 s235 6m");
  });

  it("operates only on the active item in a multi-item line", () => {
    expect(tweakActiveItem("hea120 6m + ipe200 4m ")).toBe("hea120 6m + ipe200 4m");
  });

  it("falls back to pullLastChip when no length token is present", () => {
    expect(tweakActiveItem("hea120 ")).toBe("hea120");
  });
});

describe("removeLineItem", () => {
  it("removes a middle item from a 3-item query", () => {
    const q = "hea120 6m x2 + upn140 4m x4 + plt1000x2000x5";
    expect(removeLineItem(q, 1)).toBe("hea120 6m x2 + plt1000x2000x5");
  });

  it("removes the first item from a multi-item query", () => {
    const q = "hea120 6m x2 + upn140 4m x4 + plt1000x2000x5";
    expect(removeLineItem(q, 0)).toBe("upn140 4m x4 + plt1000x2000x5");
  });

  it("removes the last item from a multi-item query", () => {
    const q = "hea120 6m x2 + upn140 4m x4 + plt1000x2000x5";
    expect(removeLineItem(q, 2)).toBe("hea120 6m x2 + upn140 4m x4");
  });

  it("clears the query when removing the only item", () => {
    expect(removeLineItem("hea120 6m", 0)).toBe("");
  });

  it("returns original query if index is out of bounds", () => {
    expect(removeLineItem("hea120 6m + upn140 4m", 5)).toBe("hea120 6m + upn140 4m");
    expect(removeLineItem("hea120 6m + upn140 4m", -1)).toBe("hea120 6m + upn140 4m");
  });
});

describe("scoped line editing across tabs", () => {
  it("lineChips extracts partial from active item 0 while item 1 is committed", () => {
    const { groups, partial } = lineChips("hea120 6m+ upn140 4m", 0);
    expect(groups[0].tokens).toEqual(["hea120"]);
    expect(partial).toBe("6m");
    expect(groups[1].tokens).toEqual(["upn140", "4m"]);
  });

  it("replaceLinePartial updates the active item 0 partial while preserving item 1", () => {
    const next = replaceLinePartial("hea120 6m+ upn140 4m", 0, "8m");
    expect(next).toBe("hea120 8m + upn140 4m");
  });

  it("applyToActiveItem targets item 0 cleanly", () => {
    const next = applyToActiveItem(
      "hea120 6m + upn140 4m",
      (text) => `${text.trim()} x2`,
      0,
    );
    expect(next).toBe("hea120 6m x2 + upn140 4m");
  });

  it("activeItemText returns text for the specified tab", () => {
    expect(activeItemText("hea120 6m + upn140 4m", 0)).toBe("hea120 6m");
    expect(activeItemText("hea120 6m + upn140 4m", 1)).toBe("upn140 4m");
  });

  it("duplicateLineItem clones the selected item to the end of the query", () => {
    expect(duplicateLineItem("hea120 6m x2 + upn140 4m", 0)).toBe(
      "hea120 6m x2 + upn140 4m + hea120 6m x2",
    );
  });
});

