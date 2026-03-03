# Ferroscale

EU-focused metal calculator with:
1. A Next.js web app for full weight/price workflows.
2. A shared `@ferroscale/metal-core` package for formulas, datasets, validation, and quick parser logic.
3. A Raycast extension for one-line quick weight calculations.

## Workspace Layout

1. `src/`: main web app (Next.js App Router).
2. `packages/metal-core/`: shared calculator and parser package.
3. `raycast-extension/`: Raycast command implementation.

## Prerequisites

1. Node.js 20+
2. npm 10+
3. For Raycast development: Raycast app (macOS) and `ray` CLI available via npm scripts.

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

# Web production build
npm run build
```

## Raycast Extension

Extension sources are in `raycast-extension/`.

### Configure

1. Open `raycast-extension/package.json`.
2. Set `"author"` to your real Raycast handle.

### Run and Build

```bash
# Start extension in development mode
npm run dev --workspace raycast-extension

# Build extension
npm run build --workspace raycast-extension

# Validate extension
npm run lint --workspace raycast-extension
```

### Quick Query Format

Manual profiles:
1. `<alias> <dimensions>x<length> [flags]`

EN standard profiles:
1. `<alias> <size>x<length> [flags]`

Examples:
1. `shs 40x40x2x4500mm`
2. `rhs 120x80x4x6000 qty=2`
3. `ipe 200x6000 mat=s355`
4. `chs 60.3x3.2x3000 dens=8000`

Flags:
1. `qty=<number>` default `1`
2. `mat=<grade|alias>` default `steel-s235jr`
3. `dens=<kg/m3>` optional custom density override
4. `unit=<mm|cm|m|in|ft>` fallback unit when input has no inline unit

## Shared Core API

Main exports from `@ferroscale/metal-core`:
1. Calculator engine: `calculateMetal`, `validateCalculationInput`, `resolveAreaMm2`
2. Quick APIs: `parseQuickQuery`, `calculateQuickWeight`, `calculateQuickFromQuery`
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

## API Endpoints

1. `GET /api/health`
2. `GET /api/captcha`
3. `POST /api/contact`

## Notes and Troubleshooting

1. If `ray lint` reports invalid author, update `raycast-extension/package.json` with your Raycast username.
2. Root `npm run lint` currently reports existing lint issues in the repository; use it as a baseline check, not a strict green gate.
3. If extension assets fail validation, verify `raycast-extension/assets/icon.png` exists and command icon paths match.

## Roadmap Docs

1. `docs/PROJECT_TRACKER.md`
2. `docs/FEATURE_IMPROVEMENTS.md`
