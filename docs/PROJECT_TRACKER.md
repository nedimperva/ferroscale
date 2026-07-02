# Project Tracker - Ferroscale

Last updated: 2026-07-02

## Product Goal

Public EU-focused web app that provides fast, accurate metal profile weight and price estimates with traceable formulas and reference labels — optimized for getting to the result fast via a command bar.

## Plan Status

| Milestone | Status | Notes |
| --- | --- | --- |
| V1 foundation (Next.js + TS + UI shell) | Completed | Core app, responsive layout |
| Calculation engine + strict validation | Completed | 20 profile types, EN standard sizes, unit conversion, pricing modes |
| Traceability + transparency | Completed | Dataset versioning, formula label, detailed breakdown |
| Local persistence | Completed | Saved library, projects, compare, presets, query history |
| Abuse-safe feedback channel | Completed | Contact endpoint, rate limiting, CAPTCHA challenge flow |
| Quality gate | Completed | CI: lint (green gate) + i18n check + tests + build; 200+ case engine benchmark |
| PWA/offline baseline | Completed | Manifest + service worker + offline fallback + versioned caches |
| Command workspace (v3) | Completed | Command bar as the whole app: parser, suggestions, three viewport layouts |
| Shared core package | Completed | `@ferroscale/metal-core`: engine, datasets, command parser (Raycast/CLI-ready) |
| Cloud sync | Completed | Encrypted Google Drive appdata sync (schema-versioned) |
| Share links | Completed | `?q=` URLs restore the calculation (3.2.0) |

## Architecture Snapshot (v3.2.0)

- The app is the command shell: all routes mount `CommandShell`; state is the query string.
- Calculation + parsing live in `packages/metal-core` (`calculateMetal`, `cmdParse`, `cmdSuggest`).
- Persistence: localStorage collections (saved/projects/compare/presets/quick history) + Drive sync.
- Full review and follow-up roadmap: `docs/DESIGN_REVIEW.md`.

## Guardrails and Decisions Locked

- V1 remains public and free with no account system (sync is bring-your-own Google Drive).
- Core quality target remains deviation <= 0.5% for the benchmark set.
- Offline mode is app-shell caching only (no offline contact API).
- Price feeds remain manual input; no external market API yet.
- metal-core stays UI-independent and i18n-free.

## Next Review Checkpoint

- Pick the next batch from `docs/FEATURE_IMPROVEMENTS.md` (install prompt, CSV import, formula QA) and the DESIGN_REVIEW follow-ups (component split, a11y pass).
