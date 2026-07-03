# Feature Improvements Backlog

Last updated: 2026-07-03

Shipped items are pruned from this list; see `CHANGELOG.md` for history
and `docs/DESIGN_REVIEW.md` for the reviewed follow-up roadmap
(token stragglers, frequency-aware suggestions, command component
tests). The Raycast extension lives in its own repository and is out of
scope here — `@ferroscale/metal-core`'s command module is the shared
grammar it consumes.

## Priority 1 (Next)

1. Import/Export Workflow
Description: Add CSV import for multi-line calculations alongside the project CSV export.
Acceptance: Upload CSV with profile rows; compute totals; downloadable result CSV.

3. Formula QA Surface
Description: Add dedicated "validation mode" page that compares computed outputs to saved benchmark rows.
Acceptance: Displays pass/fail summary and max error delta for current dataset version.

## Priority 2

1. Accessibility Hardening
Description: Dialog semantics + focus trap for sheets, live regions for results/toasts, re-enable pinch zoom, automated a11y checks (axe + keyboard path tests).
Acceptance: CI includes accessibility checks for main flows.

2. Analytics (Privacy-first)
Description: Add anonymous event metrics for calculate/export actions.
Acceptance: No personal identifiers; can disable tracking from UI.

## Shipped (recent)

- Usage-learning suggestions (frequency × recency, per profile family) — 3.5.0
- Install-app action in Settings — 3.5.0
- WCAG AA contrast + full token adoption — 3.4.0/3.5.0
- Result sharing links (`?q=` URLs) — 3.2.0
- Structured parse issues in the command bar — 3.2.0
- Persistent session tape + recency suggestions — 3.2.0
- Copy result value — 3.2.0
- CI (lint/i18n/tests/build gates) — 3.2.0
- Multi-language support (EN + BS) — 3.1.0
- Per-profile presets — 3.0.x
- Service worker version strategy (app + dataset cache busting) — 3.0.x

## Technical Debt

1. Contact persistence
Description: Current contact API logs to console only; add storage/notification pipeline.

2. Rate limit durability
Description: Current in-memory limiter resets on redeploy; move to durable store for production.

3. Command component size
Description: `command-desktop.tsx` / `command-sheets.tsx` / `command-shell.tsx` are 1.3–2.3k lines each; split per view and extract shared primitives (see DESIGN_REVIEW §3.1).
