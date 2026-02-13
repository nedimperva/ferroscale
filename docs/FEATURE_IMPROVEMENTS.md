# Feature Improvements Backlog

Last updated: 2026-02-13

## Priority 1 (Next)

1. Install Prompt UX
Description: Show in-app "Install app" CTA via `beforeinstallprompt` for PWA adoption.
Acceptance: Prompt available on supported browsers; dismiss/install states handled.

2. Import/Export Workflow
Description: Add CSV import for multi-line calculations and keep current CSV export.
Acceptance: Upload CSV with profile rows; compute totals; downloadable result CSV.

3. Formula QA Surface
Description: Add dedicated "validation mode" page that compares computed outputs to saved benchmark rows.
Acceptance: Displays pass/fail summary and max error delta for current dataset version.

## Priority 2

1. Saved Dataset Changelog View
Description: Show user-visible changelog for constants/profile table updates.
Acceptance: Changelog panel with dataset version and delta notes.

2. Result Sharing Link
Description: Encode a calculation into URL query params for shareable links.
Acceptance: Opening link restores state and result.

3. Accessibility Hardening
Description: Add automated a11y checks (axe + keyboard path tests).
Acceptance: CI includes accessibility checks for main flows.

## Priority 3

1. Per-Profile Presets
Description: Preload common dimension presets by profile + region defaults.
Acceptance: User can choose preset and edit values before calculation.

2. Multi-language Support
Description: Add EN + one EU language for labels and validation messages.
Acceptance: Language toggle and translated strings for all calculator fields.

3. Analytics (Privacy-first)
Description: Add anonymous event metrics for calculate/export actions.
Acceptance: No personal identifiers; can disable tracking from UI.

## Technical Debt

1. Contact persistence
Description: Current contact API logs to console only; add storage/notification pipeline.

2. Rate limit durability
Description: Current in-memory limiter resets on redeploy; move to durable store for production.

3. Service worker version strategy
Description: Add cache-busting tied to app build metadata to simplify upgrades.
