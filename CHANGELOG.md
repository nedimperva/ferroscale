# Changelog

All notable changes to FerroScale are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

---

## [1.7.0] – 2026-03-14

### Added
- 56 new unit tests covering CAPTCHA, rate limiting, contact validation, storage utilities, external stores, and fingerprint logic
- Shared `useStorageArray` hook for hydration-safe localStorage persistence
- `createStringStore` factory in external-stores for typed string preferences

### Changed
- CAPTCHA now uses mixed operations (+, −, ×) with larger numbers — much harder to brute-force
- IP detection uses platform-trusted headers (Vercel, Cloudflare) and rightmost `X-Forwarded-For` entry to prevent spoofing
- Email validation requires 2+ character TLD and enforces 254-character RFC limit
- Contact validation returns type-safe result object instead of raw array cast
- Context field is sanitized (HTML stripped) before logging and emailing
- Rate limiter capped at 10,000 tracked IPs to prevent unbounded memory growth
- Profile lookups use O(1) Map cache instead of linear search
- Preset filtering uses pre-indexed Map grouped by profileId
- Sidebar keyboard shortcut detection moved to `useEffect` to avoid SSR hydration mismatch
- Contact form retries CAPTCHA loading with exponential backoff and distinguishes network vs server errors

### Fixed
- Inconsistent fingerprint implementations across history, saved, compare, and projects — all now use shared fingerprint module
- Duplicated `createBoolStore`/`createStringStore` definitions removed from calculator-app.tsx — single source in external-stores.ts
- Silent error swallowing when Resend API returns unparseable response — now logged with status details

---

## [1.6.0] – 2026-03-11

### Added
- Named saves — calculations can now be saved with a custom name and optional notes via a save dialog
- Save dialog: name input + notes textarea shown when clicking Save on any result
- ⋯ action sheet on mobile — single button opens Compare, Save, and Add to Project in one place
- Bookmark icon fills when the current calculation is already saved

### Changed
- Auto-save history removed — replaced with intentional named saves (no more automatic clutter)
- Bottom tab bar: History tab replaced with Saved tab — bookmark icon with count badge
- Saved items redesigned to match project card style — bordered cards with small icon buttons, no timestamp
- Category-colored icons (tubes=blue, plates=amber, structural=green, bars=purple) in saved drawer and project calculations
- Grade badges color-matched to profile category for quick material recognition

### Fixed
- Quick Calc no longer resets price basis, unit price, currency, waste, VAT, and rounding precision when loading a result — user settings are now preserved app-wide

---

## [1.5.0] – 2026-03-09

### Added
- **Ctrl+K quick-calculate palette** with 459 EN-standard commercial sizes across all structural profile families (IPE, IPN, HEA, HEB, HEM, UPN, UPE, angles, T-sections)
- Keyboard navigation inside the palette (arrow keys, Enter, Escape)
- **Project section enhancements**: cost metrics per project, per-calculation notes, PDF export, project description field
- Sorting and filtering within projects (by weight, cost, date)
- Project duplication shortcut
- Dimension preset management (save, load, delete presets per profile)

### Changed
- Results bar unified across mobile and desktop — receipt-style layout with consistent weight/cost display
- Mobile result overlay redesigned for clarity and touch targets

### Fixed
- Results bar weight and cost display inconsistency between mobile mini-card and desktop panel

---

## [1.4.0] – 2026-03-06

### Added
- **Quick Calc** `@` trigger — type `@` to launch quick calculation from any input
- Material badge shown alongside quick-calc results
- Keyboard shortcuts modal (`?` key) listing all available shortcuts
- **Presets** — save and reload frequently used dimension sets per profile
- Length support in plate/sheet presets
- Overflow popover for plate/sheet preset list
- RHS (rectangular hollow section) quick-calc example
- **Raycast extension** — standalone quick metal weight calculator powered by `@ferroscale/metal-core` shared package

### Changed
- Plates and sheets: improved preset UX with popover when list overflows
- Quick Calc palette: added material badge and improved result display

### Fixed
- Share-result button removed (replaced by project-based workflow)
- Single-piece weight calculation corrected for edge cases

---

## [1.3.0] – 2026-02-26

### Added
- **Mobile bottom tab bar** — native-app-style navigation with Calculator, History, Projects, and Settings tabs
- **Mini result card** above the tab bar — shows live weight/cost without opening a drawer
- **Haptic feedback** on tab switches and key interactions (PWA / mobile)
- **Swipe gestures** on bottom sheets for natural dismiss
- **Animated drawers** — smooth spring-based slide-in/out for all panels
- Visual grouping of profile families in the selector

### Changed
- Mobile layout restructured with visual hierarchy improvements
- PWA install prompt redesigned for clarity
- Form fields reorganized for better mobile ergonomics

---

## [1.2.0] – 2026-02-20

### Added
- **Find Quantity mode** (reverse calculator) — enter a target weight and get the required quantity or length
- Compare drawer: side-by-side comparison of up to 5 calculations

### Fixed
- Translation key for duplicate count label in Bosnian locale

---

## [1.1.0] – 2026-02-19

### Added
- **PWA / offline support** — app installs as a standalone app on mobile and desktop
- Service worker with app-shell caching strategy
- Offline fallback page shown when network is unavailable
- Offline status banner when connectivity is lost mid-session
- PWA update banner prompting users to reload for new versions
- **Unified modal design** — consistent styling across all drawers and modals

---

## [1.0.0] – 2026-02-13

### Added
- Core metal weight and price calculator supporting 12 profile types:
  - Manual profiles: round bar, square bar, flat bar, hexagonal bar, angle, pipe, square tube, rectangular tube, sheet, plate, chequered plate
  - EN-standard structural profiles: IPE, IPN, HEA, HEB, HEM, UPN, UPE, equal angles, T-sections
- Steel, stainless steel, and aluminum material families with EN-standard densities
- Three pricing modes: per kg, per metre, per piece
- VAT and material waste percentage inputs
- Unit conversion: mm, cm, m, in, ft for dimensions; kg and lb for weight
- **Calculation traceability** — dataset version label, formula reference, and optional detailed breakdown
- Local browser history — last 10 calculations with star/save support
- CSV export of calculation results
- Clear history control
- **Contact / feedback form** with rate limiting and CAPTCHA challenge
- Bilingual UI: English and Bosnian (`/en`, `/bs` locale routing)
- Dark mode, light mode, and system-preference auto-detection
- Responsive layout — full desktop sidebar + mobile-optimised form
- Health check API endpoint (`GET /api/health`)

---

<!-- Links -->
[Unreleased]: https://github.com/nedimperva/ferroscale/compare/v1.7.0...HEAD
[1.7.0]: https://github.com/nedimperva/ferroscale/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/nedimperva/ferroscale/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/nedimperva/ferroscale/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/nedimperva/ferroscale/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/nedimperva/ferroscale/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/nedimperva/ferroscale/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/nedimperva/ferroscale/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/nedimperva/ferroscale/releases/tag/v1.0.0
