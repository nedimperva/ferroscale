# AGENTS.md

Guidance for coding agents working in this repository.

## Project Overview

EU-focused web app for metal profile weight and price estimation, built
around a command bar: the user types a query like `hea120 6m x2 s235
@2.50/kg` and gets a live result. Supports 20 profile types (manual and
EN-standard sizes), steel/stainless/aluminum grades, and multiple
pricing modes.

## Commands

```bash
npm run dev        # Start dev server at localhost:3000 (use /en — root redirects by locale)
npm run build      # Production build (prebuild injects the SW cache version)
npm run lint       # ESLint (flat config) — must stay green; CI treats it as a hard gate
npm run test       # Web vitest suite
npm run test:core  # metal-core vitest suite (command parser, suggestions)
npm run test:all   # Both suites
npm run i18n:check # en/bs message parity — fails CI when locales drift
npx playwright test  # e2e (set PLAYWRIGHT_CHROMIUM_EXECUTABLE to reuse a system Chromium)
```

Run a single test file: `npx vitest run src/lib/calculator/engine.test.ts`

## Architecture

### The command flow (the whole app)

Every app route (`/`, `/saved`, `/projects`, `/settings`) renders `null`
and exists only for metadata/URLs; `RouteAwareAppShell`
(`src/components/route-aware-app-shell.tsx`) mounts the client-side
`CommandShell` for all of them.

1. **State** — `CommandShell` (`src/components/command/command-shell.tsx`)
   holds the query string; everything derives from it. Three viewports:
   phone <640 (on-screen keypad), medium 640–1023 (centered card), wide
   ≥1024 (`CommandDesktop` two-pane workspace).
2. **Parsing** — `cmdParse()` from `@ferroscale/metal-core` (source:
   `packages/metal-core/src/command/parser.ts`). Order-tolerant tokens:
   profile+size, length (or bare number using the default unit), `xN`
   quantity, grade alias, inline `@price/unit`. Returns totals plus
   `issues[]` (structured feedback for unknown tokens/sizes, bad
   quantities, geometry rejections).
3. **Suggestions** — `cmdSuggest()` (same package) drives the chip bar:
   stage machine empty → profile → size → length → qty → grade → done,
   with recent queries/sizes (from `useQuickHistory`) ranked before the
   curated lists.
4. **Calculation** — `calculateMetal()` in
   `packages/metal-core/src/calculator/engine.ts`.
5. **Share links** — the query is mirrored to `?q=` (`src/lib/command/share.ts`);
   a `?q=` param on load hydrates the command line.

### Workspace layout

- `src/` — Next.js app. `src/lib/calculator/*` and `src/lib/datasets/*`
  are one-line re-export shims over metal-core (kept so app imports stay
  short); real web-only logic lives in `src/lib/command/share.ts`,
  `profile-specs.ts`, `standard-sizes.ts`, `csv.ts`, `fingerprint.ts`,
  `input-storage.ts`, `settings-stores.ts`, `sync/`.
- `packages/metal-core/` — shared package (engine, validation, units,
  datasets, command parser/suggestions). UI-independent; intended to be
  reusable by non-web surfaces (Raycast/CLI) — keep it free of web
  imports and i18n.

### State & persistence

- Settings: `useSyncExternalStore` stores in `src/lib/settings-stores.ts`
  (shared pricing/grade read-modify-writes the persisted
  `CalculationInput`) and `src/lib/external-stores.ts` factories.
- Collections (all localStorage + Google Drive sync):
  `useSaved` (`ferroscale-saved-v2`), `useProjects`
  (`advanced-calc-projects-v2`, max 20×50), `useCompare`, `usePresets`,
  `useQuickHistory` (`ferroscale-quick-history` — the session tape and
  recency suggestions, capped at 50).
- Sync layer: `src/lib/sync/` — schema-versioned snapshots
  (`SYNC_SCHEMA_VERSION`), AES-GCM encryption, dirty-tracking registry.
  Adding a synced collection touches `keys.ts`, `collections.ts`,
  `records.ts`, and the snapshot types.

### Profile system

Profiles have two modes:
- **manual**: user-entered dimensions; area formula branch in
  `resolveAreaMm2()` (and `resolvePerimeterMm()`) in the engine
- **standard**: EN-standard sizes with pre-computed `areaMm2`

When adding a new profile:
1. Add `ProfileId` to `packages/metal-core/src/datasets/types.ts`
2. Add the definition under `packages/metal-core/src/datasets/profiles/`
3. Manual mode: add area/perimeter branches in the engine + validation rules
4. Add drawing geometry in `src/lib/calculator/profile-specs.ts`
5. Add command aliases in `packages/metal-core/src/command/aliases.ts`
   (without an alias, saved entries can't restore into the command line)
6. Add engine test cases

### API routes

- `GET /api/health`, `GET /api/captcha`, `POST /api/contact` (rate-limited)
- `src/app/api/sync/google/*` — Drive appdata sync (auth device flow,
  pull/push/disconnect); reads env at request time, so builds need no secrets

### PWA

- `public/sw.js` (cache name injected by `scripts/inject-sw-version.mjs`
  from app version + `DATASET_VERSION`), `public/offline.html`,
  `src/app/manifest.ts`, registration in `src/components/pwa-register.tsx`.

## Testing

Vitest with `@/` and `@ferroscale/metal-core` aliases (see both
`vitest.config.ts` files). The benchmark suite in `engine.test.ts` runs
200+ cases and enforces ≤0.5% deviation. e2e lives in `e2e/command.spec.ts`.

## i18n

next-intl, locales `en` + `bs` (`messages/*.json`, bs deep-merges over
en). Every new user-facing string needs keys in **both** files or
`npm run i18n:check` fails CI. metal-core stays i18n-free — parser
issues carry a `code` the web maps to `command.issues.*`.

## Tech Stack

Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 4
(CSS-first, tokens in `src/app/globals.css`) · Vitest 4 · Playwright

## Changelog Maintenance

When adding any user-visible feature, fix, or change:

1. Add an entry to `src/lib/changelog.ts` under the current version
   block (single source of truth for the in-app changelog viewer).
2. Keep `CHANGELOG.md` at the repo root in sync (Keep-a-Changelog format).
3. Bump `DATASET_VERSION` in `packages/metal-core/src/datasets/version.ts`
   if any dataset (profiles, materials, densities) changed.

Entry categories: **added** / **changed** / **fixed** (+ `_bs` variants
for Bosnian).

## Environment notes

- Single service: the Next.js dev server. No database or Docker.
- No env vars needed to run; `RESEND_*` only affect contact-form email,
  `GOOGLE_*` only affect Drive sync.
- The root `/` returns a 307 redirect — always test against `/en`.
