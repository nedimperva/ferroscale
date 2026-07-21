# Ferroscale — Improvement Ideas Catalog

Date: 2026-07-19 · Written against v3.6.2

A broad menu of improvements to pick from, grouped by category. Each item
has a short "how" sketch pointing at the code it touches, plus an effort
tag: **S** (hours), **M** (days), **L** (a week+). Nothing here is
committed work — it's a catalog to choose from.

**Shipped in 3.7.0** (the "bar feels magic" sprint): item 1 (natural-language
tolerance), item 2 (did-you-mean typo correction), item 3 (ghost-text inline
autocomplete), item 5 (↑/↓ query history), and item 13 (kg/m preview on size
chips). Plus item 28 (dimensioned profile cross-section drawings on the result
breakdown).

Existing backlogs
(`FEATURE_IMPROVEMENTS.md`, `DESIGN_REVIEW.md` §3) still apply; items
from them are not repeated unless extended.

---

## 1. Command bar — smarter typing (the flagship area)

The bar currently parses a strict token grammar (`hea120 6m x2 s235`)
with staged tap-to-insert suggestions. The theme of this section:
**let people type naturally and have the bar meet them halfway.**

1. **Natural-language token tolerance** — **M**
   Accept `6 meters`, `6 m`, `2 pieces`, `2 kom`, `hea 120` (space
   between alias and size), `120 hea` (size before alias). How: a
   pre-pass in `packages/metal-core/src/command/parser.ts` that
   normalizes word-units (`meters|meter|m.` → `m`), merges
   `alias + bare-number` adjacent tokens, and treats `\d+ (pc|pcs|kom|stk)`
   as quantity. Keep the strict grammar as the canonical round-trip form
   (`inputToQuery` unchanged); only the reader gets looser. Unit-word
   vocab per locale can live in the parser settings so `kom`/`komada`
   (BS) works too.

2. **Typo correction / "did you mean"** — **M**
   `hae120`, `sh40x40x3`, `s2355` currently die as `unknownToken`. How:
   on parse failure, run Levenshtein distance ≤1–2 against
   `COMMAND_ALIASES` and `COMMAND_GRADES` (both tiny — brute force is
   fine), and against the size catalog for `unknownSize`
   (`hea125` → nearest `hea120`). Surface as a tappable amber
   suggestion chip ("Did you mean **hea120**?") wired through the
   existing `CommandParseIssue` channel, never auto-applied.

3. **Ghost-text inline autocomplete (IDE style)** — **M**
   As you type `he`, render faint completion `a120 6m x2` after the
   caret; `Tab`/`→` accepts. The completion source is the top-ranked
   suggestion — you already compute it in `cmdSuggest`. How: overlay a
   mirrored `<span>` behind the input in `command-shell.tsx` (the
   chip-rendering layer already mirrors the input text, so the
   plumbing exists); accept on `Tab` via the existing keydown handler.
   This is the single highest-feel-per-effort item in this list.

4. **Whole-query completion ("finish it for me")** — **M**
   After the profile+size settles, offer one chip that completes the
   entire rest of the query from your habits: `hea120` → suggest
   `+ 6m x2 s235` as a single insert. How: extend `usage-stats.ts` to
   record the full settled query per family (it already stores
   `queries`), and in `cmdSuggest` match the longest recent query with
   the same prefix profile+size family; insert the remaining tokens in
   one tap. Terminal-style muscle memory, zero new UI.

5. **Query history with ↑/↓ arrows** — **S**
   Terminal-style: `↑` cycles back through `quickHistory`, `↓` forward,
   plain typing exits. How: keydown handler in `command-shell.tsx` over
   the existing `useQuickHistory` list. Desktop users will find this
   without being told.

6. **Reverse / target queries** — **M/L**
   Type a target instead of an input: `hea120 =500kg` → "how many
   meters is 500 kg", `rnd20 6m =1t` → "how many pieces to reach a
   tonne", `shs40x40x3 =100eur` → meters within budget. How: new token
   kind `=N(kg|t|m|pc|<currency>)` in the parser; the engine already
   exposes kg/m, so solving for length/qty is one division. Render the
   solved value as the hero metric with a small "target" badge.

7. **Arithmetic in tokens** — **S/M**
   `2.5m+30cm` (stock + offcut), `x2+3`, `6m-50mm` (kerf allowance).
   How: tokenizer-level: if a token matches
   `expr (+|-) expr` with parseable length/qty parts, fold it before
   classification. Guardrail: only `+`/`-`, no precedence needed.

8. **Batch / multi-line input** — **L**
   Paste a cut list (one query per line) → each line parses, totals
   shown at the bottom, one tap saves all into a project. How: detect
   `\n` in a paste event on the input, open a "batch" panel that maps
   lines through `cmdParse`, reusing the parse-issue UI per line. This
   is the natural sibling of the CSV-import backlog item — same
   internal model, two entry points (paste vs file).

9. **Size-range compare queries** — **M**
   `hea100..160 6m` expands to one calc per standard size in the range
   and drops them into Compare. How: parse `..` on the size token,
   enumerate `COMMAND_SIZES` between the endpoints, feed the existing
   `useCompare` store. Turns "which profile do I actually need" from
   five queries into one.

10. **Command-palette actions in the bar** — **S/M**
    Typing `>` switches to action mode: `>settings`, `>export`,
    `>compare`, `>theme`, `>project <name>`. How: intercept in
    `cmdSuggest`'s empty/profile stage when the query starts with `>`;
    actions dispatch the same handlers the sidebar/sheets already call.
    One input to rule the whole app — cheap because every action
    already exists as a function.

11. **Voice input** — **M**
    A mic button on the keypad (Web Speech API, `bs-BA`/`en` locales)
    feeding the recognized text through the natural-language pre-pass
    from item 1 (which it depends on — speech never says `x2`). Value:
    shop floor, gloves, dirty hands. Degrade gracefully where the API
    is missing (Firefox).

12. **LLM-assisted parse fallback (optional, off by default)** — **L**
    Only when the local parser fails AND the user opts in: send the raw
    text to an API route that asks a small model to emit the canonical
    grammar string ("six meters of 120 hea in stainless, two pieces" →
    `hea120 6m x2 304`), then re-parse locally — the model never
    computes, it only translates, so wrong answers can't produce wrong
    weights silently. How: `/api/nl-parse` route; render the result as
    a confirm chip, never auto-run. Requires a privacy note in
    Settings and an offline-silent failure path. Do items 1–2 first —
    they'll cover 90% of cases for free and offline.

## 2. Suggestion engine

13. **Preview values on suggestion chips** — **S**
    Size chips show `kg/m` inline (`120 · 26.7 kg/m`), length chips
    show resulting total weight. How: `cmdSuggest` already re-parses
    candidates for validation (`rp.kgm`); pass the number through to
    the item's `sub` field and render it in the chip.

14. **Keyboard navigation of suggestions on desktop** — **S**
    `↓`/`↑` moves a highlight through the chips, `Enter` inserts,
    `1–9` insert directly. How: roving index state in
    `command-shell.tsx`; the refs (`firstSuggestionRef`) already exist.

15. **Sync usage stats via Drive (opt-in)** — **M**
    Typing habits are per-device today (`usage-stats.ts` is local-only
    by design). Make it a synced collection so the desktop learns from
    the phone. How: follow the `quickHistory` wiring reference
    (`sync/keys.ts`, `collections.ts`, `records.ts` — documented in
    DESIGN_REVIEW §4); merge by summing counts and taking max
    timestamps per value.

16. **"Repeat last, change one thing"** — **S**
    When the bar is empty, first suggestion row shows the last query
    with per-token quick-edit: tap the `6m` in it to get length chips
    only. How: render last `quickHistory` entry as segmented chips;
    each tap seeds the query with the other tokens locked in.

17. **Grade default per family** — **S**
    You almost always type `304` after `rnd` but `s235` after `hea`.
    Auto-fill the grade stage from `usage.topGradeIds(fam)` when
    confidence is high (e.g. >80% of that family's uses), shown as a
    pre-filled ghost chip that one keystroke confirms. Builds on the
    existing frequency data — no new storage.

## 3. User experience / quality of life

18. **Grammar cheat-sheet / help overlay** — **S**
    `?` key (desktop) and a keypad help key (mobile) opens a one-screen
    reference of every token form with tap-to-try examples. How: static
    sheet reusing `sheet-shell.tsx`; content generated from
    `COMMAND_ALIASES` so it never goes stale.

19. **Undo after destructive actions** — **S**
    Deleting a saved entry / history row / compare column shows the
    existing toast with an Undo button (5 s). How: keep the removed
    record in a ref; `CommandToast` already exists — add an action slot.

20. **Pin favorites in the library** — **S**
    Star a saved entry to pin it to the top and surface it in
    empty-bar suggestions before recents. How: `pinned: boolean` on the
    saved record (sync schema bump), sort in `useSaved`, feed pinned
    queries into `cmdSuggest`'s recent slot ahead of usage recents.

21. **Bulk actions in Library** — **M**
    Multi-select (long-press on mobile, checkbox on desktop) →
    delete / move to project / export selection as CSV. How: selection
    state in `library-sheet.tsx` + `desk-saved-view.tsx`; reuse
    `csv-utils.ts` for the export.

22. **Global search in Library** — **S**
    One filter input over saved + history + projects (name, profile,
    grade). How: derived filter over the already-loaded stores; no new
    persistence.

23. **Copy result as formatted text / share as image** — **M**
    Two share upgrades: (a) "Copy as text" produces an aligned
    plain-text block (profile, dims, kg, price) that pastes cleanly
    into WhatsApp/e-mail — trivial string building next to
    `command-copy.ts`; (b) "Share as image" renders the result card to
    a canvas (no lib needed at this size) and hands a PNG to
    `navigator.share`. Metal trade communication is WhatsApp-first —
    this meets users where they are.

24. **Result rounding & display settings** — **S**
    Setting for decimals on weight/price (0–3) and optional round-up
    to whole kg ("commercial rounding"). How: one field in
    `settings-model.ts` (single field model — one entry adds it to
    both surfaces), applied in the `fsWeight`/`fsMoney` formatters.

25. **Quick unit flip on the result** — **S**
    Tap the `kg` on the hero to cycle kg→lb→t without touching
    Settings; same for m→ft on the length row. Local override like the
    existing weight/price `modeOverride`.

26. **Onboarding: type-along demo** — **M**
    First visit currently shows the pre-filled demo query (good). Add
    an optional 20-second "watch it type" run: the bar types
    `shs40x40x3 6m x10 @2.50/kg` character by character with a caption
    per stage, skippable, never shown again. How: a scripted
    `setQuery` sequence gated on a `ferroscale-onboarded` flag.

27. **Recently deleted (trash) for saved/projects** — **M**
    30-day soft delete before purge, restore from Settings. How:
    `deletedAt` on records; filter in hooks; purge on load. Pairs with
    sync so a bad delete on one device is recoverable.

## 4. Design / visual

28. **Dimensioned profile drawings on the result** — **M/L** — ✅ shipped in
    3.7.0 (`profile-drawing.tsx`: scaled SVG cross-sections with dimensioned
    width/height + thickness callouts, on the mobile result sheet and the
    desktop breakdown rail).
    Replace/augment the glyph with a scaled SVG cross-section with
    labeled dimensions (b, h, t, r) for the current profile — the
    single change that would make the app feel like a professional
    tool. How: generate per-family SVG in a component next to
    `command-glyph.tsx` from the parsed dims; standard profiles can
    read real proportions from the dataset specs.

29. **Animated hero number** — **S**
    Tween the weight/price when the query settles (respecting
    `prefers-reduced-motion`). How: small rAF count-up hook (the old
    `useAnimatedNumber` was deleted in 3.2.0 — resurrect a lean
    version); motion tokens already exist in `globals.css`.

30. **Density setting (compact/comfortable)** — **M**
    Compact mode tightens paddings/typography ~15% for power users on
    small laptops. How: a `data-density` attribute on the root driving
    a handful of spacing tokens in `globals.css`; toggle in Settings.

31. **True-black OLED dark variant** — **S**
    `#000` surfaces variant of the dark palette behind a Settings
    toggle; pure token swap in `globals.css`.

32. **Finish the inline-style → token migration** — **M**
    DESIGN_REVIEW residual: many `style={{}}` blocks (see e.g.
    `desk-compare-view.tsx`) hand-pick tokens. Migrate to utility
    classes / shared atoms so density/theming work stays one-place.

33. **Tablet layout** — **M**
    Between phone sheet-stack and desktop sidebar there's an awkward
    middle. Define an explicit mid breakpoint: desktop layout with a
    collapsed icon-rail sidebar. How: third viewport flag next to
    `isPhoneViewport`/`isWideViewport` in `command-shell.tsx`.

## 5. Mobile-specific

34. **Haptics** — **S**
    `navigator.vibrate(10)` on chip insert, longer buzz on parse issue
    and on save. Feature-detect; off switch in Settings.

35. **Swipe gestures** — **M**
    Swipe the result card horizontally to flip weight/price; swipe
    library rows for delete/save-to-project actions. How: pointer
    handlers on the card; keep buttons as the accessible path.

36. **Long-press a chip to edit in place** — **M**
    Long-press the `6m` chip → small stepper/roller to adjust the
    value without retyping the query tail. How: chip press handler
    opens a mini-popover; commit rewrites just that token via
    tokenize/join (tokens are already classified per kind).

37. **PWA share target + shortcuts** — **S/M**
    (a) `share_target` in `manifest.ts` so sharing text ("hea120 6m")
    from any app opens Ferroscale with it as the query — the `?q=`
    hydration path already exists, this is just manifest plumbing.
    (b) App-icon long-press shortcuts (New calc, Compare, Saved).

38. **Keypad ergonomics pass** — **S**
    A dedicated `x` (qty) key promoted to the main grid, and a
    backspace long-press that clears one whole token instead of one
    character. Token-wise delete is the real QoL win — one loop over
    `cmdTokenize` in `command-keypad.tsx`'s backspace handler.

## 6. Calculator depth (new domain features)

39. **Section properties display** — **M**
    For standard profiles show Ix, Wx, iy etc. from catalog data in an
    expandable result section. Data effort: extend the dataset rows
    (they already carry geometry); no engine change. Engineers
    currently keep a second tab open for this.

40. **Galvanizing / painting surface cost** — **M**
    The engine already computes `surfaceAreaM2` — price it: per-m²
    coating rate in Settings (or `@1.2/m2` inline token) adds a
    breakdown row. How: extend `CommandPricing` + one row in
    `breakdown-rows.ts`. Very EU-fabricator-shaped feature, and the
    hard part (area) is done.

41. **Cutting: kerf + cut cost + stock optimization** — **L**
    (a) kerf/cut-loss setting; (b) per-cut price; (c) the big one — 1D
    cutting-stock: given required pieces (from a project) and stock
    lengths (6 m/12 m), compute bars to buy and waste %. First-fit
    decreasing is ~40 lines in metal-core and good enough in practice;
    render as a "Stock" tab in projects. This is the feature steel
    traders pay for elsewhere.

42. **More profiles** — **M each**
    Ranked by likely demand: rebar (ribbed, Ø6–40, mass per EN 10080 —
    trivially formula-based), welded mesh (Q/R types), IPN, HEM,
    threaded rod, hex bar, cold-formed C/Z/Sigma purlins, DN pipe
    schedule aliases (`dn50` → chs60.3). How per profile: dataset entry
    + alias + `MANUAL_DIM_COUNTS` entry where manual (the review notes
    this duplication axis — adding two or three profiles is a good
    forcing function to unify it into the descriptor).

43. **More materials** — **S**
    Copper, brass, bronze, cast iron, titanium — each is one density
    entry in `materials.ts` + grade aliases. Cheap catalog width.

44. **Price book / suppliers** — **L**
    Named price lists (supplier, date, per-grade €/kg), switchable in
    Settings, inline override still wins. How: new synced collection;
    the pricing resolution order becomes inline > price book > default.
    Turns the app from calculator into quoting tool.

45. **EN mass tolerance bands** — **M**
    Show ±% per EN tolerance class on the weight (min/max band under
    the hero number). Data: per-family tolerance table in metal-core.
    Niche but deeply credible for the EU audience — nobody else shows it.

46. **Embodied carbon (kg CO₂e)** — **S/M**
    Optional row: weight × factor (steel ~1.9, stainless ~4.5, alu
    ~8; overridable). One dataset map + a breakdown row + Settings
    toggle. Increasingly requested in EU tenders.

## 7. Projects & output

47. **PDF offer/quote from a project** — **L**
    Company header (name/logo in Settings), line items, totals, VAT,
    validity note — a fabricator can send it straight to a customer.
    How: client-side print stylesheet route first (`window.print` on a
    dedicated project print view — zero deps, works offline), library
    PDF only if needed later. Introduce via `next/dynamic` per the
    review's code-splitting note.

48. **XLSX export next to CSV** — **S/M**
    Same rows, real spreadsheet with number types. A tiny sheet writer
    or lightweight lib behind `next/dynamic`.

49. **Project metadata & lifecycle** — **M**
    Client name, note, status (draft/quoted/won), duplicate-project.
    Pure store + UI fields in the projects view/sheet.

50. **Share a whole project as a link** — **M**
    Encode all line queries into a compressed `?p=` payload
    (deflate+base64url keeps ~50 lines under URL limits). Receiver
    gets a read-only project view with "import a copy". Reuses the
    share-link philosophy of `?q=`.

## 8. Sync & data safety

51. **Full local backup file (export/import)** — **S/M**
    One-tap "Download backup" (all collections as one JSON) + import
    with merge/replace choice, in Settings. Users without Google get a
    safety net; also the escape hatch for provider migration. Reuses
    the sync snapshot types.

52. **More sync providers** — **L**
    WebDAV (Nextcloud — popular with EU SMEs) first, Dropbox second.
    How: the sync layer's push/pull/records structure is already
    provider-shaped; extract a provider interface from the Google
    routes.

53. **Sync status & conflict visibility** — **M**
    A small sync row (last synced, pending changes, error state) in
    Settings, and a visible resolution note when a merge dropped
    something. Trust feature — silent sync is scary sync.

## 9. Performance / platform

54. **Code-splitting at the view level** — **M**
    `next/dynamic` for Library/Compare/Projects/Settings views and
    sheets so first paint ships only the calc path (flagged in
    DESIGN_REVIEW §4; do it before PDF/XLSX land, they'll bloat).

55. **`command-shell.tsx` decomposition round 2** — **M**
    Still 1,270 lines. Extract `useCommandQuery` (query/parse/share
    URL/usage recording), `useCommandKeyboard`, and the toast state
    into hooks — also unblocks item 56.

56. **Component tests for command interactions** — **M**
    Carried from DESIGN_REVIEW §3.6, and a precondition for safely
    doing section 1: chip editing, keyboard routing, suggestion
    insertion, ghost-accept, history arrows under
    `@testing-library/react` + jsdom.

57. **Privacy-first analytics (existing P2) + error reporting** — **M**
    Self-hosted-friendly counters (calc settled, save, export, share)
    plus a client error hook posting to your own endpoint. Without
    usage numbers, choosing among this very list is guesswork —
    consider doing this one first.

## 10. Reach (i18n, SEO, distribution)

58. **More locales** — **S each**
    German (biggest EU steel market), Croatian/Serbian (near-free from
    BS), Turkish, Polish. Infra is done — `messages/<locale>.json` +
    routing entry + `i18n:check`. Pair with per-locale unit-word vocab
    from item 1.

59. **SEO profile pages generated from the dataset** — **L**
    The app is a client-rendered SPA — invisible to search. Generate
    static, server-rendered pages per profile size ("HEA 120 —
    dimensions & weight per meter") from `metal-core` datasets: table
    of dims, kg/m, section properties (item 39), and a "calculate"
    button deep-linking `?q=hea120`. Hundreds of long-tail landing
    pages from data you already maintain; likely the highest-leverage
    growth item in this document.

60. **Embeddable calculator widget / public API** — **L**
    A `GET /api/calc?q=hea120+6m+x2` JSON endpoint (metal-core runs
    server-side already for /qa) and an iframe-able mini bar for
    suppliers' sites, linking back. Distribution through the trade.

---

## Suggested starting combos

- **"The bar feels magic" sprint**: items 1 + 2 + 3 + 5 + 13 (natural
  language, did-you-mean, ghost text, history arrows, chip previews).
- **"Fabricator's tool" sprint**: items 40 + 41 + 44 + 47 (coating
  cost, cutting stock, price book, PDF quote).
- **"Growth" sprint**: items 59 + 58 + 37 (SEO pages, locales, share
  target).
- **Foundations first**: items 55 + 56 + 57 (shell decomposition,
  component tests, analytics) — cheap insurance before the flashy work.
