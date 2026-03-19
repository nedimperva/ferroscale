# Changelog

All notable changes to FerroScale are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

---

## [1.8.0] – 2026-03-19

### Added
- **Paintable surface area** calculated for every profile type — outer perimeter × length × quantity displayed in calculator results, project aggregates, CSV and PDF exports
- **Painting cost estimation** at project level — configurable paint price per kg and coverage rate (m²/kg, default 8) with automatic paint-needed and total-cost rollup
- **Multiple paint coats** — adjustable coat count (1–10) per project; paint needed scales accordingly
- **Perimeter data for all 138 EN standard profile sizes** — IPE, IPN, HEA, HEB, HEM, UPN, UPE, and T-sections now include perimeterMm for accurate surface area calculation
- Painting section in project drawer with editable price/kg, coverage, and coats inputs
- Surface area column in project CSV and PDF exports
- Painting summary stats (total surface area, paint needed, painting cost) in PDF export header

### Changed
- **Desktop:** Resizable split between calculator form and result panel (persisted width; double-click gutter to reset)
- **Desktop:** Optional third column (Saved bookmarks only), persisted; second resizable gutter; keyboard control on both gutters (arrows nudge, Home/End min/max)
- **Workspace (desktop):** Toggle Saved side panel, max result column width preset (320�480px), reset column widths
- **Results:** References block moved under grand total, above full calculation steps
- **Results:** SVG cross-section �drawing sheet� in header with frame, scaled section, dimension lines where applicable, and a spec table from the current calculation (manual dims, designation, A, L)
- Calculator result receipt now shows surface area between weight and cost sections when available
- Result header shows a compact cross-section area, material density, and area formula above the action row
- Clipboard copy format includes surface area line when present
- Clipboard copy includes a geometry line (area, density, formula) after the profile summary
- Project aggregate cards include painting data when surface area is available

---

## [1.7.0] � 2026-03-17

### Added
- Route-backed mobile app shell with dedicated Calculator, Saved, Projects, and Settings screens
- Localized Saved, Projects, and Settings routes with route metadata in both supported languages
- Edge-swipe navigation between primary mobile tabs

### Changed
- Primary mobile navigation now uses real routes with swipeable tab transitions while desktop keeps the existing sidebar and drawer workflow
- Current calculation state, result bar, and overlays now stay live while moving between mobile tabs
- Settings and Projects now reuse shared content as full mobile screens instead of mobile-only sheets
- Mobile breakpoints are aligned to the app-shell experience across tabs and overlays

### Fixed
- Missing labels in the new mobile app shell for the Saved sidebar entry and result-bar actions
- Swipe-to-action rows now block tab-swipe navigation to avoid gesture conflicts

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
[Unreleased]: https://github.com/nedimperva/ferroscale/compare/v1.8.0...HEAD
[1.8.0]: https://github.com/nedimperva/ferroscale/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/nedimperva/ferroscale/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/nedimperva/ferroscale/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/nedimperva/ferroscale/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/nedimperva/ferroscale/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/nedimperva/ferroscale/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/nedimperva/ferroscale/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/nedimperva/ferroscale/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/nedimperva/ferroscale/releases/tag/v1.0.0


