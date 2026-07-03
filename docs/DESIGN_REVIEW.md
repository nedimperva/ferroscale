# Ferroscale — Design, UX & Architecture Review

Date: 2026-07-02 · Reviewed at v3.1.0, findings addressed in v3.2.0–v3.3.0

This is a full review of the app across visual design, user experience,
developer experience, and future-proofing. Items marked **✅ shipped in
3.2.0** were implemented as part of the review branch; the rest are
recommended follow-ups in priority order.

---

## 1. What's genuinely strong

**The command-bar model.** Order-tolerant grammar (`hea120 6m x2 s235
@2.50/kg`), stage-based suggestions that always tell you what to type
next, conservative glued-token splitting (`hea1006m` → `hea100` + `6m`),
and a pre-filled demo query so the first visit shows a working result
instead of an empty form. This is the app's identity and it works.

**The design system.** A complete CSS-variable token architecture in
`globals.css` (`@theme` + light/dark palettes, semantic color families,
motion/radius/shadow tokens), Archivo + IBM Plex Mono typography, and
FOUC-free theming via a synchronous pre-paint script. Visual identity is
cohesive and distinctive.

**Engineering fundamentals.** Strict TypeScript with zero `any`, a real
package boundary (`@ferroscale/metal-core`) with a 200+ case engine
benchmark suite (≤0.5% tolerance), hydration-safe `useSyncExternalStore`
stores, client-side AES-GCM-encrypted Google Drive sync, and thorough
PWA plumbing (SW versioning tied to app + dataset versions, offline
fallback, full Apple splash set).

## 2. What the review found (and what was done)

### Command bar / UX

| Finding | Status |
| --- | --- |
| No feedback for unparseable input — unknown tokens silently became muted chips | ✅ shipped in 3.2.0 — structured parse issues (`unknownToken`, `unknownSize`, `invalidQty`, `invalidGeometry`) with localized messages under the query line and amber warning chips |
| Copy copied the query string, never the result value | ✅ shipped in 3.2.0 — "Copy value" copies the hero metric per mode |
| No shareable URLs; state lived only in localStorage | ✅ shipped in 3.2.0 — `?q=` share links: URL mirrors the query (debounced `replaceState`), links hydrate the command line, Share-link action with native share on phones |
| Session tape was in-memory (lost on reload) while a synced `quickHistory` collection existed but was never surfaced | ✅ shipped in 3.2.0 — the tape persists through `quickHistory` (deduped, capped at 50, Drive-synced) |
| Suggestions were purely curated; no learning from use | ✅ shipped in 3.2.0 — recent valid queries surface before curated profile chips; recently used sizes surface before standard sizes for the same family |

### Code health

| Finding | Status |
| --- | --- |
| Two divergent parsers: the UI's `src/lib/command/parser.ts` and metal-core's unused `quick/parser.ts` (different grammar, zero consumers) | ✅ shipped in 3.2.0 — command parser moved into `packages/metal-core/src/command/` as the single grammar; `quick/` deleted |
| Dead weight: `framer-motion` + `vaul` imported nowhere; unused hooks (`useAnimatedNumber`, `useFocusTrap`, `useIsMobile`, `useIsWideDesktop`); unused `ProfileIcon` | ✅ shipped in 3.2.0 — removed |
| Red lint baseline accepted as normal | ✅ shipped in 3.2.0 — lint is green and a hard CI gate |
| No CI at all | ✅ shipped in 3.2.0 — GitHub Actions: lint, i18n parity, both vitest suites, production build; non-blocking Playwright job |
| Duplicated constants (`KIND_BG`, `CURRENCIES`, `UNIT_OPTIONS`, `BASIS_UNIT`) across command components | ✅ shipped in 3.2.0 — single `command-constants.ts` |
| Stale e2e spec asserting a removed UI | ✅ shipped in 3.2.0 — replaced with a command-bar spec (demo result, typing, share-link hydration, parse issues) |
| Stale docs (AGENTS.md described non-existent hooks; READMEs described an absent `raycast-extension/` workspace) | ✅ shipped in 3.2.0 — rewritten |

## 3. Recommended follow-ups

Items 1–3 **✅ shipped in 3.3.0**; the rest ordered by expected value:

1. ~~**Split the giant command components.**~~ ✅ shipped in 3.3.0 —
   `command-sheets.tsx` became six modules under `sheets/`,
   `command-desktop.tsx` became nine under `desktop/` (workspace root,
   types-only props module, sidebar, shared atoms, one file per view);
   byte-identical duplicates (PricingBadge, toast, `familyForInput`)
   were consolidated. Residuals: the parallel mobile/desktop
   Settings/Library/Breakdown implementations still exist as separate
   code (a visual-consolidation project), TokenChip/DeskTokenChip
   remain separate (sizing differences), and the inline `style={{}}`
   blocks still await a token migration.
2. ~~**Accessibility pass.**~~ ✅ shipped in 3.3.0 — sheets are real
   modal dialogs (`role="dialog"`, `aria-modal`, `aria-labelledby`,
   restored `useFocusTrap` with focus-first/Tab-cycle/focus-restore,
   Escape on every viewport incl. phone), toast/result/PWA banners have
   polite live regions, pinch zoom is re-enabled, settings inputs are
   labeled, and axe-core scans run in e2e (critical = fail). Residual:
   placeholder text on `--muted-faint` likely still fails 4.5:1
   contrast — axe logs it as non-blocking.
3. ~~**Formula-on-definition for profiles.**~~ ✅ shipped in 3.3.0 —
   manual definitions carry `area()`/`perimeter()`/`validateGeometry()`;
   the engine and validation are profile-agnostic. Residuals: the
   command parser's per-family dimension-token layout
   (`MANUAL_DIM_COUNTS`, `buildCalculationInput`, `dimsToSizeText`) and
   `profile-specs.ts`' drawing/metric switches are separate duplication
   axes that would need their own descriptors.
4. **Ship the Raycast extension.** The parser consolidation made
   `@ferroscale/metal-core/command` the reusable, structured-error
   grammar it needs; the extension itself is now mostly UI glue.
5. **Token-system stragglers.** `pwa-register.tsx`, the contact page,
   and the error boundary use raw Tailwind palette colors instead of
   tokens; the manifest theme colors (`#111827`/`#f3f4f6`) don't match
   the real palette (`#131009`/`#efeae0`); a few raw hex values
   (`#161109`, `#fff`) recur for "text on accent" — worth a dedicated
   token.
6. **Frequency-aware suggestions.** Recency is live; a small usage
   counter per query/size (already present as `useCount` on saved
   entries) could rank suggestions by frequency × recency.
7. **Component tests for the command UI.** The vitest suites cover the
   engine/parser/stores well, but the three big components have only
   e2e smoke coverage. Consider `@testing-library/react` + jsdom for
   the interaction logic (chip editing, keyboard routing, suggestion
   insertion).
8. **Misc.** `plt`/`sht` both render as "Plate" (thickness decides
   sheet vs plate invisibly); the mobile keypad cannot type `@`/`/` so
   inline price overrides depend on the rate key; `settings-stores.ts`
   still documents a removed "legacy FerroScaleAppShell"; localStorage
   keys mix `ferroscale-` and `advanced-calc-` prefixes (harmless, but
   a migration could unify them).

## 4. Architecture notes for future features

- **State model**: the single `query` string is the source of truth and
  everything else derives from it — keep it that way; new features
  should extend the grammar (and `inputToQuery` for round-tripping)
  rather than adding parallel state.
- **`inputToQuery` returns `""` for profiles without a command alias** —
  any future profile addition must include aliases or saved entries
  won't restore into the command line.
- **Sync**: adding a synced collection means touching
  `sync/keys.ts`, `collections.ts`, `records.ts`, and the snapshot
  types — the `quickHistory` wiring (see `useQuickHistory`) is the
  minimal reference example.
- **The app is a client-rendered SPA inside Next.js** (all app routes
  render `null`; `RouteAwareAppShell` mounts `CommandShell`). There is
  no code-splitting; if the bundle grows (charts, PDF), introduce
  `next/dynamic` at the view level.
