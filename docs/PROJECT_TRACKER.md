# Project Tracker - Advanced Metal Calculator

Last updated: 2026-02-13

## Product Goal

Public EU-focused web app that provides fast, accurate metal profile weight and price estimates with traceable formulas and reference labels.

## Plan Status

| Milestone | Status | Notes |
| --- | --- | --- |
| V1 foundation (Next.js + TS + UI shell) | Completed | Core app, responsive layout, utility-first UX |
| Calculation engine + strict validation | Completed | 12 profile types, EN standard sizes, unit conversion, pricing modes |
| Traceability + transparency | Completed | Dataset versioning, formula label, optional detailed breakdown, reference labels |
| Local persistence (recent calculations) | Completed | Browser local history (last 10), load previous entries |
| Abuse-safe feedback channel | Completed | Contact endpoint, rate limiting, CAPTCHA challenge flow |
| Quality gate | Completed | Lint + tests + build; benchmark matrix includes 200+ tolerance checks |
| V1.1 PWA/offline baseline | Completed | Manifest + service worker + offline fallback + offline status banner |

## What We Accomplished

### Core Product

- Implemented full calculator flow in `src/components/calculator-app.tsx`.
- Implemented dataset models in `src/lib/datasets/materials.ts` and `src/lib/datasets/profiles.ts`.
- Implemented calculator engine and validation in `src/lib/calculator/engine.ts` and `src/lib/calculator/validation.ts`.
- Added conversion utilities in `src/lib/calculator/units.ts`.

### APIs and Operations

- Added health endpoint `src/app/api/health/route.ts`.
- Added CAPTCHA endpoint `src/app/api/captcha/route.ts`.
- Added contact endpoint `src/app/api/contact/route.ts` with request validation and rate limiting.

### PWA and Offline

- Added PWA manifest route `src/app/manifest.ts`.
- Added service worker `public/sw.js`.
- Added offline fallback page `public/offline.html`.
- Added client service-worker registration and offline banner in `src/components/pwa-register.tsx`.

### New Improvements Added Now

- Added `Export CSV` for calculation results in `src/components/calculator-app.tsx`.
- Added `Clear history` control for local calculation history in `src/components/calculator-app.tsx`.

## Guardrails and Decisions Locked

- V1 remains public and free with no account system.
- Core launch quality target remains deviation <= 0.5% for benchmark set.
- Offline mode is app-shell caching only (no offline contact API).
- Price feeds remain manual input; no external market API yet.

## Next Review Checkpoint

- Review backlog priorities and pick 3 items for next implementation batch.
