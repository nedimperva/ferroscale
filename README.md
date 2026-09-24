# Ferroscale

[![CI](https://github.com/nedimperva/ferroscale/actions/workflows/ci.yml/badge.svg)](https://github.com/nedimperva/ferroscale/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![PWA](https://img.shields.io/badge/PWA-offline--ready-green)](src/components/pwa-register.tsx)

EU-focused metal profile weight and price estimator built around a command bar.
Type a query like `hea120 6m x2 s235` and get a live result — weight, price,
cutting schedule, and quote. No account, no tracking, works offline.

**Live demo: https://ferroscale.nedimp.com/en**

![FerroScale on the desk: a HEB 200 line and its breakdown as a ledger sheet](docs/screenshots/calculator-desktop.webp)

## The command bar

Order-tolerant tokens — profile+size, length, quantity, grade, inline price:

| Query | Meaning |
| --- | --- |
| `hea120 6m x2 s235` | HEA 120 beam, 6 m, 2 pieces, grade S235 |
| `shs40x40x3 6m x10 @2.50/kg` | SHS tube with an inline price override |
| `hea120 6m x2 + ipe200 4m x3` | Multi-item line, priced together |
| `hea120 6m =500kg` | Target query — how many pieces make 500 kg? |
| `plt1500x3000x3 316` | Plate in stainless 316 |

Lengths accept `mm`/`cm`/`m`/`ft`, arithmetic works inside tokens
(`6m-50mm`, `x2+3`), and a pasted cut list becomes a multi-item line.
The query mirrors to `?q=`, so every result is a shareable link.

## Features

- **Calculator** — 20 profile types (manual + EN-standard sizes), steel /
  stainless / aluminum grades, per-grade price book, margin, waste, VAT,
  mass tolerance bands, dimensioned cross-section drawings.
- **The breakdown is a ledger sheet** — weight and cost in one table, every
  figure for one piece beside all of them, and a basis column saying what it
  was multiplied from (area × density, kg/m × length, weight × rate). On the
  desk it takes most of the page, right under the command bar; on a phone it
  is the same sheet in one column.
- **Bill of material** — a line of several parts (`a + b + c`) opens as a
  table of length, pieces, kg/m, kg per piece, weight, share and cost, with
  one ruled total, the weight split by part and the cost built up. A strip of
  tabs opens any part on its own.
- **Section properties** — Iy, Wel, Wpl and the weak axis for every standard
  size, cited to the catalogue page (Settings › Calculation; off by default).
- **Projects** — quotes with sub-assemblies, labor and hardware costing,
  per-project margin, 1D bar + 2D plate cutting optimizers with visual cut
  maps, supplier BOM/RFQ export, printable quotes, CSV export.
- **Library** — one library of parts and assemblies, and nothing built in:
  it holds what you save. An assembly carries its trade, labour hours and
  hardware into every project it is inserted into, scaled first (×10 stair
  treads). Plus compare, the session tape, and offline JSON backup.
- **Sync & privacy** — local-first; optional Google Drive sync of an
  AES-GCM-encrypted snapshot, including shop defaults and a price book that
  merges grade by grade. No account, no analytics.
- **Platform** — PWA with offline support, light/dark themes, English +
  Bosnian (`en`/`bs`), phone keypad and desktop workspace layouts.

## Screens

Real captures of the app with a seeded shop — every number on them is
FerroScale's own output.

| | |
| --- | --- |
| ![A three-part gate frame as a bill of material](docs/screenshots/bill-of-material.webp) | ![An IPE 200 with its section properties opened, cited to the catalogue page](docs/screenshots/section-properties.webp) |
| **Bill of material** — one line, three parts, one total | **Section properties** — transcribed, with the source page |
| ![A project quote: material, labour, hardware and paint](docs/screenshots/project-quote.webp) | ![The cutting optimizer nesting balusters into stock bars](docs/screenshots/cut-plan.webp) |
| **A project quote** — material, labour, hardware, paint | **Cut plan** — yield, kerf, offcuts and scrap |
| ![Inserting a stair-tread assembly from the library at ×10](docs/screenshots/insert-assembly.webp) | ![The parts library: pinned parts, tags, ranked by use](docs/screenshots/parts-library.webp) |
| **An assembly, scaled before insert** | **The library** — parts and assemblies, ranked by use |

On a phone there is no text field — chips for the line and a keypad with the
unit and the rate as keys — and the breakdown pulls up as the same ledger in
one column.

<p align="center">
  <img src="docs/screenshots/mobile-keypad.webp" alt="The phone keypad with the unit and rate as keys" width="260">
  &nbsp;&nbsp;
  <img src="docs/screenshots/mobile-breakdown.webp" alt="The breakdown on a phone: the same ledger in one column" width="260">
</p>

## Accuracy

- Dataset version `2026.09.4`
  (`packages/metal-core/src/datasets/version.ts`).
- The live engine is validated against references that are independent of
  the datasets: **published EN catalog masses** for standard sizes,
  hand-computed cross-section formulas for manual ones. **≤0.5% tolerance**,
  every one of the 129 EN sizes has a row, and a test fails if a new size
  ships without one.
- The same benchmark runs as a vitest gate in CI and as an interactive
  table in the app at `/qa`, which states its own coverage.
- **Section properties** (Iy, Wel, Wpl, Iz, radii of gyration) and real
  dimensions (h, b, tw, tf, r) for all 129 standard sizes, transcribed from
  the ArcelorMittal *Sections and Merchant Bars* 2024-1 catalogue and a
  DIN EN 10055 table, each row cited to its source page
  (`packages/metal-core/src/datasets/section-properties.ts`). Tests hold
  every row to its section geometry and to the size table's area.

## Quickstart

Prerequisites: Node.js 20+, npm 10+. No env vars needed to run.

```bash
npm install
npm run dev        # http://localhost:3000 (root redirects by locale)
```

Open `http://localhost:3000/en` directly (root `/` is a locale redirect).

```bash
npm run build      # production build (prebuild injects the SW cache version)
npm run lint       # ESLint — CI treats it as a hard gate, keep it green
npm run test       # web vitest suite
npm run test:core  # metal-core suite (parser, suggestions, engine)
npm run test:all   # both suites
npm run i18n:check # en/bs message parity — fails CI when locales drift
```

Single test file: `npx vitest run src/lib/calculator/engine.test.ts`.
E2E: `npx playwright test` (set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to reuse
a system Chromium instead of downloading browsers).

## Workspace layout

- `src/` — Next.js app. `src/lib/calculator/*` and `src/lib/datasets/*`
  are one-line re-export shims over metal-core; web-only logic lives in
  `src/lib/command/` (`share.ts`, `csv.ts`, `profile-specs.ts`, …).
- `packages/metal-core/` — shared, UI-independent package: engine,
  validation, units, datasets, command parser/suggestions. Kept free of
  web imports and i18n so non-web surfaces can reuse it.
- `messages/` — `en.json` + `bs.json` (bs deep-merges over en).
- `docs/` — `DESIGN_REVIEW.md` (architecture review + roadmap),
  `PROJECT_TRACKER.md`, `FEATURE_IMPROVEMENTS.md`, `IMPROVEMENT_IDEAS.md`.

Every app route renders the client-side `CommandShell`; see `AGENTS.md`
for the command flow, profile system, and sync-layer conventions.

## Shared core API

From `@ferroscale/metal-core`:

- Calculator: `calculateMetal`, `validateCalculationInput`, `resolveAreaMm2`
- Command: `cmdParse`, `cmdTokenize`, `cmdSuggest`, `inputToQuery`
- Datasets: profile/material definitions and helpers

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Deploy only | Base URL for sitemap, robots, and metadata (defaults to `https://ferroscale.nedimp.com`) |
| `RESEND_*` | No | Contact-form email; form logs and rate-limits without them |
| `GOOGLE_*` | No | Drive sync only; everything else works without them |

Local `.env` files are gitignored — never commit secrets.
See [SECURITY.md](SECURITY.md).

## API routes

- `GET /api/health`, `GET /api/captcha`, `POST /api/contact` (rate-limited)
- `src/app/api/sync/google/*` — Drive appdata sync (reads env at request
  time, so builds need no secrets)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — setup, test gates, i18n rule
(every string in **both** `en` and `bs`), changelog rule (update
`CHANGELOG.md` **and** `src/lib/changelog.ts`), and the profile-adding
checklist.

## License

MIT — see [LICENSE](LICENSE).
