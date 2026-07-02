# Ferroscale

EU-focused metal calculator with:
1. A Next.js web app built around a command bar for fast weight/price calculations.
2. A shared `@ferroscale/metal-core` package for formulas, datasets, validation, and the command query parser.

## Workspace Layout

1. `src/`: main web app (Next.js App Router).
2. `packages/metal-core/`: shared calculator and parser package.

## Prerequisites

1. Node.js 20+
2. npm 10+

## Install

```bash
npm install
```

## Run Web App

```bash
npm run dev
```

Open:
1. `http://localhost:3000` (redirects by locale)
2. `http://localhost:3000/en` (direct English route)

## Test and Build

```bash
# Web tests
npm run test

# Shared core tests
npm run test:core

# Web + core tests
npm run test:all

# i18n message parity (en/bs)
npm run i18n:check

# End-to-end tests (Playwright)
npx playwright test

# Web production build
npm run build
```

CI (`.github/workflows/ci.yml`) runs lint, the i18n check, both test
suites, and a production build on every push and pull request. Lint is
a hard gate — keep it green.

## Command Query Format

The command bar (and share links, e.g. `/en?q=hea120+6m+x2`) accepts
order-tolerant tokens:

1. Profile + size: `hea120`, `shs40x40x3`, `rhs60x40x3`, `chs48.3x3.2`,
   `rnd20`, `flt40x8`, `l50x50x5`, `plt1500x3000x3`
2. Length: `6m`, `4500mm`, `10ft`, or a bare number using the default
   unit from Settings
3. Quantity: `x2`
4. Grade: `s235`, `s355`, `304`, `316l`, `a4`, `6060`, `7075`, …
5. Inline price override: `@2.50/kg`, `3,20/m`, `@12/pc`

Examples:
1. `hea120 6m x2 s235`
2. `shs40x40x3 6m x10 @2.50/kg`
3. `plt1500x3000x3 316`

## Shared Core API

Main exports from `@ferroscale/metal-core`:
1. Calculator engine: `calculateMetal`, `validateCalculationInput`, `resolveAreaMm2`
2. Command parser: `cmdParse`, `cmdTokenize`, `cmdSuggest`, `inputToQuery`
   (UI-independent — ready to power a Raycast extension or CLI)
3. Datasets: profile/material definitions and helpers

## Internationalization

1. Locale routing config: `src/i18n/routing.ts`
2. Messages: `messages/en.json`, `messages/bs.json`
3. Missing locale keys fallback to English.

Add a new language:
1. Add `messages/<locale>.json`.
2. Register locale in `src/i18n/routing.ts`.
3. Translate keys.
4. Run `npm run i18n:check`.

## Environment Variables

1. `NEXT_PUBLIC_SITE_URL`: public base URL used by sitemap/robots metadata.
2. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` (optional): path to a system Chromium
   for e2e runs without downloading browsers.

## API Endpoints

1. `GET /api/health`
2. `GET /api/captcha`
3. `POST /api/contact`
4. `/api/sync/google/*` (Google Drive sync)

## Docs

1. `docs/DESIGN_REVIEW.md` — full design/UX/architecture review and follow-up roadmap
2. `docs/PROJECT_TRACKER.md`
3. `docs/FEATURE_IMPROVEMENTS.md`
