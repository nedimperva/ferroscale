import { cmdClassifyToken, cmdSplitLine, cmdTokenize } from "@ferroscale/metal-core";
import type { CommandParseResult } from "@ferroscale/metal-core";
import { replaceItemTokenKind, replaceLineToken } from "./line-edit";
import { stepToken } from "./token-step";

/**
 * Progress through the command bar's four required milestones:
 * 0 = empty, 1 = profile, 2 = size, 3 = length/expression, 4 = valid calculation.
 */
export function commandStageProgress(p: CommandParseResult): number {
  if (p.valid) return 4;
  if (p.lengthM != null && p.lengthM > 0) return 3;
  if (p.alias && p.hasSize) return 2;
  if (p.alias) return 1;
  return 0;
}

/**
 * Locate the active item's steppable length token, if any.
 * Returns null for arithmetic expressions (`6m-50mm`) or missing lengths.
 */
export function findSteppableLength(
  query: string,
  itemIndex: number,
): { tokenIndex: number; token: string } | null {
  const segments = cmdSplitLine(query);
  const seg = segments[itemIndex];
  if (!seg) return null;
  const tokens = cmdTokenize(seg.text);
  const idx = tokens.findIndex((tok) => cmdClassifyToken(tok) === "len");
  if (idx < 0) return null;
  const tok = tokens[idx];
  if (stepToken(tok, 1) == null) return null;
  return { tokenIndex: idx, token: tok };
}

/**
 * Step an item's length token up or down in place without leaving the command bar.
 */
export function nudgeItemLength(
  query: string,
  itemIndex: number,
  direction: 1 | -1,
): string | null {
  const found = findSteppableLength(query, itemIndex);
  if (!found) return null;
  const next = stepToken(found.token, direction);
  if (!next || next === found.token) return null;
  return replaceLineToken(query, itemIndex, found.tokenIndex, next);
}

/**
 * Step an item's quantity up or down in place.
 * When no `xN` token is present (implicit 1), `+` inserts `x2` and `−` is a no-op.
 */
export function nudgeItemQty(
  query: string,
  itemIndex: number,
  currentQty: number,
  direction: 1 | -1,
): string | null {
  const segments = cmdSplitLine(query);
  const seg = segments[itemIndex];
  if (!seg) return null;
  const tokens = cmdTokenize(seg.text);
  const idx = tokens.findIndex((tok) => cmdClassifyToken(tok) === "qty");
  if (idx < 0) {
    if (direction === -1) return null;
    const nextQty = Math.max(2, Math.round(currentQty) + 1);
    return replaceItemTokenKind(query, itemIndex, "qty", `x${nextQty}`);
  }
  const tok = tokens[idx];
  const next = stepToken(tok, direction);
  if (!next || next === tok) return null;
  return replaceLineToken(query, itemIndex, idx, next);
}
