"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { useTranslations } from "next-intl";
import { cmdClassifyToken } from "@ferroscale/metal-core";
import type {
  CommandLine,
  CommandParseResult,
  CommandSuggestion,
  CommandSuggestionItem,
} from "@ferroscale/metal-core";
import { CommandGlyph } from "../command-glyph";
import { computeGhost, formatCommandIssue, issueForToken } from "../command-copy";
import { KIND_BG } from "../command-constants";
import {
  editLineToken,
  lineChips,
  lineExpandedIndex,
  removeLineItem,
  removeLineToken,
  replaceLineToken,
} from "../line-edit";
import { InlineTokenEditor } from "../inline-token-editor";
import { TokenChip } from "../token-chip";
import { useExpandedItem } from "../use-expanded-item";

/**
 * QUERY LINE — chips plus the caret; the keypad below types into it. Owns the
 * chip editing (edit / remove / replace a token) and which item is spelled out.
 */
export function PhoneQueryLine({
  query,
  setQuery,
  p,
  line,
  sug,
  onSuggest,
  onTap,
}: {
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  p: CommandParseResult;
  line: CommandLine;
  sug: CommandSuggestion;
  onSuggest: (item: CommandSuggestionItem) => void;
  /** A tap on the line — the shell swaps the action keypad for the numpad. */
  onTap: () => void;
}) {
  const t = useTranslations("command");
  /** The chip box — kept scrolled to the caret as the line grows. */
  const queryLineRef = useRef<HTMLDivElement | null>(null);

  // Tokens come from the same tokenizer the parser uses, so glued input
  // ("hea1006m") displays as the pieces it is parsed as.
  // Chips are grouped by item, so a `+`-joined line renders as the two (or
  // more) calculations it is. While the query doesn't end in whitespace the
  // last piece is still being typed — rendered as plain text at the cursor.
  const chips = useMemo(() => lineChips(query), [query]);
  const partialToken = chips.partial || null;
  const chipCount = chips.groups.reduce((n, group) => n + group.tokens.length, 0);
  // Faint completion drawn after the caret (profile letters / recent prefix).
  const ghost = computeGhost(partialToken ?? "", sug);
  const acceptGhost = () => {
    if (ghost && sug.items[0]) onSuggest(sug.items[0]);
  };
  /**
   * Which item shows its tokens on the phone. A `+`-joined line of four items
   * is far more chips than a phone's query line can hold, and the old capped
   * scroll window showed them sliced across half-rows. Only the item you are
   * working on is spelled out; the rest are one chip each, and the hero above
   * already lists every item with its weight and price.
   *
   * `null` means the item the caret is in — the last one — which is what any
   * keystroke goes into. Tapping another item's chip parks the expansion there
   * until the query changes for a reason other than editing that item.
   */
  const { expandedItem, setExpandedItem, lockExpanded } = useExpandedItem(query);
  const expandedIndex = lineExpandedIndex(chips.groups, expandedItem);

  /** An edit inside the open item is not a reason to close it. */
  const keepExpanded = (item: number, next: string) => {
    lockExpanded(item, next);
    setQuery(next);
  };
  const removeTokenAt = (item: number, idx: number) => {
    keepExpanded(item, removeLineToken(query, item, idx));
  };
  const replaceTokenAt = (item: number, idx: number, next: string) => {
    keepExpanded(item, replaceLineToken(query, item, idx, next));
  };
  // Pull a token back to the end of its own item as the editable partial (the
  // parser is order-tolerant within an item, so the reordering is free). An
  // earlier item has no caret — the keypad types into the last one — so its
  // token is edited where it stands instead.
  const [editing, setEditing] = useState<{ item: number; idx: number; tok: string } | null>(null);
  const editTokenAt = (item: number, idx: number) => {
    if (item < chips.groups.length - 1) {
      setEditing({ item, idx, tok: chips.groups[item].tokens[idx] });
      return;
    }
    keepExpanded(item, editLineToken(query, item, idx));
  };
  const commitEdit = (item: number, idx: number, next: string) => {
    setEditing(null);
    keepExpanded(
      item,
      next === "" ? removeLineToken(query, item, idx) : replaceLineToken(query, item, idx, next),
    );
  };
  const removeItem = (item: number) => {
    setEditing(null);
    setExpandedItem(null);
    setQuery(removeLineItem(query, item));
  };
  // The caret lives at the end of the line, so the row has to follow it
  // sideways as tokens are added — otherwise typing walks off the visible area.
  useEffect(() => {
    const el = queryLineRef.current;
    if (!el) return;
    // Opening an earlier item scrolls to that item; otherwise the caret is the
    // last thing in the row, so the end of the scroll *is* the caret and the
    // line follows what is being typed.
    const opened = el.querySelector<HTMLElement>("[data-expanded-start]");
    if (opened) {
      el.scrollLeft += opened.getBoundingClientRect().left - el.getBoundingClientRect().left - 12;
    } else {
      el.scrollLeft = el.scrollWidth;
    }
  }, [query, expandedIndex]);

  /** One chip standing in for a whole item, labelled as the hero numbers it. */
  const collapsedItemLabel = (group: (typeof chips.groups)[number]) =>
    line.items[group.item]?.parse.name ||
    group.tokens[0] ||
    partialToken ||
    String(group.item + 1);

  return (
    <div className="px-[14px] pb-2">
      <div
        ref={queryLineRef}
        data-query-line=""
        onClick={onTap}
        // One row that scrolls sideways to the caret, never wrapping.
        // Wrapping meant the line's height depended on the token count:
        // capped, it sliced chips across half-rows; uncapped, a long
        // line grew to four rows and pushed the keypad's bottom row off
        // the screen. A fixed height keeps the input and its keys where
        // they were, whatever the line holds.
        className="flex items-center gap-1.5 flex-nowrap rounded-none px-3 py-2.5"
        style={{
          height: 50,
          overflowX: "auto",
          overflowY: "hidden",
          // Ink edge, no glow — the same command line as the
          // workspace, drawn as a rule rather than lit.
          border: "1px solid var(--foreground)",
          background: "var(--surface)",
        }}
      >
        <span
          className="flex items-center justify-center font-mono text-base font-bold mr-0.5 flex-shrink-0"
          style={{ color: "var(--accent)" }}
          aria-hidden="true"
        >
          {p.alias ? (
            <CommandGlyph fam={p.alias.fam} alias={p.alias.alias} size={18} />
          ) : (
            "›"
          )}
        </span>
        {chipCount === 0 && !partialToken && (
          <span className="font-mono text-sm text-muted-faint whitespace-nowrap flex-shrink-0">
            {t("query.placeholder")}
          </span>
        )}
        {chips.groups.map((group) => (
          <Fragment key={group.item}>
            {group.item > 0 &&
              (group.item === chips.groups.length - 1 && group.tokens.length === 0 && !partialToken ? (
                // A `+` nothing has been typed after yet: tap to take it back.
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(group.item);
                  }}
                  aria-label={t("query.removeEmptyItem")}
                  className="inline-flex items-center gap-1 flex-shrink-0 font-mono text-sm font-bold px-1.5 py-1"
                  style={{ color: "var(--muted-faint)", border: "1px dashed var(--border)" }}
                >
                  +<span className="text-[11px]">×</span>
                </button>
              ) : (
                <span
                  className="font-mono text-sm font-bold px-0.5"
                  style={{ color: "var(--muted-faint)" }}
                  aria-hidden="true"
                >
                  +
                </span>
              ))}
            {group.item === expandedIndex ? (
              group.tokens.map((tok, i) =>
                editing && editing.item === group.item && editing.idx === i && editing.tok === tok ? (
                  <InlineTokenEditor
                    key={`edit-${tok}-${i}`}
                    tok={tok}
                    kindClass={KIND_BG[cmdClassifyToken(tok)]}
                    onCommit={(next) => commitEdit(group.item, i, next)}
                    onCancel={() => setEditing(null)}
                    className="text-sm px-2 py-1.5 rounded-md"
                  />
                ) : (
                <TokenChip
                  key={`${tok}-${i}`}
                  // Only an item opened by hand needs seeking to; the
                  // last item is where the caret already is.
                  anchor={i === 0 && group.item !== chips.groups.length - 1}
                  tok={tok}
                  kindClass={KIND_BG[cmdClassifyToken(tok)]}
                  shadowed={line.items[group.item]?.parse.shadowedTokenIndexes.includes(i)}
                  note={(() => {
                    const issue = issueForToken(line.items[group.item]?.parse.issues ?? [], tok);
                    return issue ? formatCommandIssue(t, issue) : null;
                  })()}
                  onEdit={() => editTokenAt(group.item, i)}
                  onRemove={() => removeTokenAt(group.item, i)}
                  onReplace={(next) => replaceTokenAt(group.item, i, next)}
                />
                ),
              )
            ) : group.tokens.length === 0 ? null : (
              <span
                className="inline-flex items-stretch flex-shrink-0 rounded-lg font-mono text-sm font-semibold whitespace-nowrap"
                style={{
                  border: "1px solid var(--border-faint)",
                  background: "var(--surface-inset)",
                  color: "var(--foreground-secondary)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpandedItem(group.item)}
                  aria-label={t("query.expandItem", {
                    index: group.item + 1,
                    name: collapsedItemLabel(group),
                  })}
                  className="inline-flex items-center gap-1.5"
                  style={{ padding: "5px 4px 5px 10px" }}
                >
                  <span className="text-[11px] text-muted-faint">{group.item + 1}</span>
                  {collapsedItemLabel(group)}
                  <span className="text-[10px] text-muted-faint">▸</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(group.item);
                  }}
                  aria-label={t("query.removeItem", {
                    index: group.item + 1,
                    name: collapsedItemLabel(group),
                  })}
                  style={{ borderLeft: "1px solid var(--border-faint)" }}
                  className="flex items-center justify-center min-w-[32px] px-1.5 text-[14px] leading-none"
                >
                  ×
                </button>
              </span>
            )}
          </Fragment>
        ))}
        {partialToken && (
          <span className="font-mono text-sm font-semibold text-foreground flex-shrink-0">
            {partialToken}
          </span>
        )}
        {ghost && (
          <button
            type="button"
            onClick={acceptGhost}
            aria-label={t("query.acceptGhost", { text: ghost.trim() })}
            className="font-mono text-sm font-semibold whitespace-pre flex-shrink-0"
            style={{ color: "var(--muted-faint)" }}
          >
            {ghost}
          </button>
        )}
        <span
          className="w-0.5 h-5 rounded-sm flex-shrink-0"
          style={{
            background: "var(--accent)",
            animation: "fsBlink 1s steps(1) infinite",
          }}
        />
      </div>
    </div>
  );
}
