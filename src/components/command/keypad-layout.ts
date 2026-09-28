import {
  COMMAND_SIZES,
  cmdClassifyToken,
  type CommandParseResult,
} from "@ferroscale/metal-core";

export type CommandKeypadMode = "letters" | "actions";
export type CommandKeypadOverride = "letters" | null;

/**
 * Which phone keypad the current line wants: the one keyboard — letters with
 * a number row on top — whenever something is being typed, and a short action
 * bar once the line computes and nothing is half-typed. Tweak (or a tap on the
 * line) brings the keyboard back over a finished line.
 *
 * There used to be a third, a number pad the keypad switched to by itself the
 * moment the letters so far made a profile word. But `t` is a tee and `l` an
 * angle, so it jumped on the first letter of tube, tee, lim or square — the
 * app guessing what you meant to type next and getting it wrong. The number
 * row makes the guess unnecessary: digits are one row up, always.
 */
export function commandKeypadLayout(
  query: string,
  parsed: CommandParseResult,
  override: CommandKeypadOverride = null,
): CommandKeypadMode {
  const endsSpace = query === "" || /\s$/.test(query);
  if (!endsSpace) return "letters";
  if (override === "letters") return "letters";
  return parsed.valid ? "actions" : "letters";
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
  if (!/\s$/.test(query) && /^[0-9]$/.test(ch)) {
    const last = query.trim().split(/\s+/).pop() || "";
    if (last && cmdClassifyToken(last) === "len" && /[a-z]$/i.test(last)) {
      return `${query.slice(0, -last.length)}${ch}`;
    }
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
