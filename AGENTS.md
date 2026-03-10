# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

EU-focused web app for metal profile weight and price estimation. Supports 12 profile types (manual and EN-standard sizes), steel/stainless/aluminum grades, and multiple pricing modes.

## Commands

```powershell
npm run dev        # Start dev server at localhost:3000
npm run build      # Production build
npm run lint       # ESLint (flat config, ESLint 9)
npm run test       # Run Vitest test suite
npm run test:watch # Watch mode for tests
```

Run a single test file:
```powershell
npx vitest run src/lib/calculator/engine.test.ts
```

## Architecture

### Core Calculation Flow
1. **Input collection** → `useCalculator` hook manages form state via reducer (`src/hooks/useCalculator.ts`)
2. **Validation** → `validateCalculationInput()` in `src/lib/calculator/validation.ts`
3. **Calculation** → `calculateMetal()` in `src/lib/calculator/engine.ts` computes weight/price
4. **Result display** → Components in `src/components/calculator/`

### Key Modules

**Calculation Engine** (`src/lib/calculator/`)
- `engine.ts` - Core `calculateMetal()` function; resolves cross-section area by profile type, computes volume → weight → pricing
- `types.ts` - TypeScript types for `CalculationInput`, `CalculationResult`, units, and validation
- `validation.ts` - Input validation with geometry checks (e.g., pipe wall thickness < outer radius)
- `units.ts` - Unit conversion utilities (mm/cm/m/in/ft, kg/lb)

**Datasets** (`src/lib/datasets/`)
- `materials.ts` - Metal families and grades with EN-standard densities
- `profiles/` - Profile definitions split by category:
  - `manual.ts` - Simple profiles (bars, pipes, plates) with user-entered dimensions
  - `beams.ts` - IPE, IPN, HEA, HEB, HEM beam sizes with pre-computed areas
  - `channels-angles.ts` - UPN, UPE channels and equal angles
  - `tees.ts` - T-section profiles
- `types.ts` - TypeScript types for profiles, dimensions, and categories
- `version.ts` - Dataset version string used in calculation traceability

**Hooks** (`src/hooks/`)
- `useCalculator.ts` - Main state management with `useReducer`; handles profile switching, input persistence to localStorage, debounced reactive calculation
- `useHistory.ts` - Local browser history (last 10 calculations) and starred entries

### Profile System
Profiles have two modes:
- **manual**: User enters dimensions (e.g., diameter for round bar); area computed via formula in `resolveAreaMm2()`
- **standard**: User selects from EN-standard sizes with pre-computed `areaMm2` values

When adding a new profile:
1. Add `ProfileId` to `src/lib/datasets/types.ts`
2. Add profile definition to appropriate file in `src/lib/datasets/profiles/`
3. If manual mode, add area formula case in `resolveAreaMm2()` in `engine.ts`
4. Add validation rules in `validation.ts` if needed
5. Add test cases to `engine.test.ts`

### API Routes
- `GET /api/health` - Health check
- `GET /api/captcha` - Generate CAPTCHA challenge
- `POST /api/contact` - Contact form with rate limiting (`src/lib/contact/`)

### PWA
- Service worker: `public/sw.js`
- Offline fallback: `public/offline.html`
- Manifest route: `src/app/manifest.ts`
- Registration: `src/components/pwa-register.tsx`

## Testing

Tests use Vitest with `@/` path alias. The benchmark suite in `engine.test.ts` runs 200+ cases across all profiles × multiple lengths/quantities/waste/VAT combinations and enforces ≤0.5% deviation from expected values.

## Tech Stack
- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- Vitest 4

## Changelog Maintenance

When adding any user-visible feature, fix, or change:

1. Add an entry to `src/lib/changelog.ts` under the current version block, or create a new version block if shipping a release. This is the **single source of truth** for the in-app changelog viewer.
2. Keep `CHANGELOG.md` at the repo root in sync — it mirrors `src/lib/changelog.ts` in Keep-a-Changelog markdown format.
3. Bump `DATASET_VERSION` in `packages/metal-core/src/datasets/version.ts` if any dataset (profiles, materials, densities) changed.

Entry categories:
- **added** — new features or capabilities visible to users
- **changed** — existing behaviour modified (UX, layout, defaults)
- **fixed** — bug fixes

Example `src/lib/changelog.ts` entry:
```ts
{
  version: "1.6.0",
  date: "2026-03-15",
  added: ["New feature description here"],
  fixed: ["Bug fix description here"],
},
```

## Cursor Cloud specific instructions

- **Single service**: The only service is the Next.js dev server (`npm run dev`, port 3000). No database, Docker, or external services are required.
- **Locale redirect**: The root `/` returns a 307 redirect to `/en` (or the user's locale). Always use `http://localhost:3000/en` when testing in a browser or with curl.
- **Lint baseline**: `npm run lint` currently exits with code 1 due to one pre-existing `react-hooks/set-state-in-effect` error in `src/hooks/useAnimatedNumber.ts` plus several unused-variable warnings. This is expected and does not indicate a broken environment.
- **No env vars needed**: The app runs fully without any `.env` file. The optional `RESEND_API_KEY`/`RESEND_FROM`/`RESEND_TO` vars only affect the contact form email delivery.
- See the **Commands** section above for all standard dev/lint/test/build commands.
