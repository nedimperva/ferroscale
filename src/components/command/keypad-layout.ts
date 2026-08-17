import {
  COMMAND_SIZES,
  cmdClassifyToken,
  cmdDetectStage,
  type CommandParseResult,
} from "@ferroscale/metal-core";

export type CommandKeypadMode = "letters" | "numpad" | "actions";
export type CommandKeypadOverride = "letters" | "numpad" | null;

/**
 * Which phone keypad the current line wants.
 *
 * Letters while the next token is a word (profile, grade). A number pad once
 * the line is digits and units (size, length, quantity, rate). A short action
 * bar once the line already computes and nothing is half-typed — Tweak /
 * ABC / 123 bring a pad back, they are not inferred.
 */
export function commandKeypadLayout(
  query: string,
  parsed: CommandParseResult,
  override: CommandKeypadOverride = null,
): CommandKeypadMode {
  const endsSpace = query === "" || /\s$/.test(query);
  const partial = endsSpace ? "" : query.trim().split(/\s+/).pop() || "";

  if (partial) return layoutForPartial(partial, parsed);

  if (override === "letters" || override === "numpad") return override;

  if (parsed.valid) return "actions";

  const { stage } = cmdDetectStage(query, parsed);
  if (stage === "empty" || stage === "profile" || stage === "grade") return "letters";
  return "numpad";
}

function layoutForPartial(
  partial: string,
  parsed: CommandParseResult,
): CommandKeypadMode {
  const kind = cmdClassifyToken(partial);
  if (kind === "grade") return "letters";
  // A settled alias (`hea`) is waiting for a size, so the number pad is next.
  // Half an alias (`he`) is still a word.
  if (kind === "profile") return parsed.alias ? "numpad" : "letters";
  if (kind === "unknown") {
    // `x` is the start of a quantity; `s` is the start of a grade.
    if (/^x\d*$/i.test(partial) || /[\d.@=]/.test(partial)) return "numpad";
    return /^[a-z]+$/i.test(partial) ? "letters" : "numpad";
  }
  return "numpad";
}

/**
 * Insert a keypad character into the active item. A finished size (`hea120`)
 * followed by a length digit used to glue into `hea1206` because the number
 * pad had no space — this puts a space in when the next keystroke is clearly
 * a new token, and ignores a second space if the line already has one.
 */
export function commandKeypadInsert(
  query: string,
  ch: string,
  parsed: CommandParseResult,
): string {
  if (!ch) return query;
  if (ch === " ") {
    if (query === "" || /\s$/.test(query)) return query;
    return `${query} `;
  }
  if (shouldAdvanceBefore(query, ch, parsed)) return `${query} ${ch}`;
  return `${query}${ch}`;
}

function shouldAdvanceBefore(
  query: string,
  ch: string,
  parsed: CommandParseResult,
): boolean {
  if (query === "" || /\s$/.test(query)) return false;
  // Units (`mm `) attach to the number already under the caret.
  if (!/^[0-9x]$/i.test(ch[0] ?? "")) return false;
  const last = query.trim().split(/\s+/).pop() || "";
  if (!last) return false;

  const kind = cmdClassifyToken(last);
  if (kind === "len" && parsed.lengthM != null && ch.toLowerCase() === "x") {
    return true;
  }

  if (kind !== "profile" || !parsed.alias || !parsed.hasSize) return false;
  const sizeText = parsed.size.replace(/×/g, "x");
  const catalog = COMMAND_SIZES[parsed.alias.fam] ?? [];
  if (!catalog.includes(sizeText)) return false;
  const extra = ch.toLowerCase() === "x" ? "x" : ch;
  const longer = `${sizeText}${extra}`;
  return !catalog.some((size) => size === longer || size.startsWith(longer));
}
