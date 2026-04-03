# Changelog

All notable changes to FerroScale are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

---

## [2.4.4] - 2026-03-30

### Added

- Backend-assisted Google Drive sync for templates, projects, favourites, compare items, and quick-calc history using encrypted per-record app-data storage

### Changed

- Mobile calculator surfaces now use a calmer industrial look with warmer neutral surfaces, more consistent spacing, and less competing color emphasis
- Primary calculator controls, result bar, and result sheet were tightened into a more deliberate mobile-first hierarchy with unified motion and panel styling
- Desktop sidebar and multi-column workspace now use a more refined shell with calmer hierarchy, clearer panel controls, and more cohesive column framing
- Accent color now uses a darker burnished-copper tone instead of the previous yellow-leaning highlight for a more premium visual feel
- Mobile screen shells now blend more closely into the page background so the app feels more unibody and less like a separate inner slab
- Result quick metrics now use a clearer card hierarchy with stronger scanability across desktop results and the expanded mobile result sheet
- Settings now include a Data & Sync section with passphrase-based encryption, reconnect, remote reset, manual sync, and local import/export controls

### Fixed

- Google Drive sync now survives expired file ids by recreating missing remote records and resumes auth handoff cleanly across popup and mobile redirect flows

---

## [2.4.2] - 2026-03-26

### Added

- iOS startup splash images for a native-feeling launch experience across iPhone and iPad screen sizes

### Changed

- Viewport metadata now uses fixed scaling and keyboard overlay behavior for a more stable app-shell experience on mobile
- Global touch behavior now suppresses browser callout artifacts and improves pointer/selection ergonomics in app-like interactions
- Result values in key summary and cost sections can now be selected for easier copy/share workflows

### Fixed

- Fixed a hydration mismatch in the mobile bottom tab bar by rendering saved/projects badges only after client hydration

---

## [2.4.1] - 2026-03-26

### Added

- Custom mobile numpad for numeric inputs to deliver a more native app-like entry flow without relying on the OS keyboard

### Fixed

- On mobile, opening Add to template from the result overlay now closes the result sheet first so the Template Builder appears in front
- Result overlay close behavior is now synchronized with the Template Builder flow to prevent stuck overlay states

---

## [2.4.0] - 2026-03-25

### Added

- Templates workspace for reusable multi-part assemblies with a dedicated full-screen Template Builder
- Option to append newly prepared parts directly into an existing template from the builder

### Changed

- Saved workspace is now presented as Templates with clearer naming across tabs, sidebar, and save flow
- Template entries now support search, sort (newest, recently used, most used), duplication, tags, and usage metadata
- Applying a template now tracks usage count and last-used timestamp to support power-user workflows
- Templates now include multi-select mode with bulk duplicate and bulk delete actions
- Template-to-project flow now adds the whole template with quantity scaling, without per-part override rules

---

## [2.3.0] - 2026-03-24

### Added
- Text Size setting (Small / Medium / Large) in Workspace settings to scale all text in the app

### Changed
- Standardized all arbitrary pixel-based font sizes to Tailwind scale classes so text scales consistently with the Text Size setting
- Alternative profile cards now show family and designation on one line (e.g. "HEB 120" instead of stacked)
- Matched label sizes in key specs and alternative cards for a more uniform look

---

## [2.2.2] - 2026-03-24

### Changed
- Specs panel Alternatives now compare compatible profile families by logical peers like `IPE 100` vs `IPN 100` or `HEA 100` instead of surfacing only the active family
- Alternatives are now narrowed to genuinely close suggestions, so far-away sizes such as `IPE 600` no longer appear when the active selection is around `100`
- Specs panel Alternatives now use compact full-width cards that keep the content grouped inside each suggestion instead of stretching every metric into a flat table row
- Selecting a compatible manual-profile alternative can now switch both the profile type and dimensions in one action

### Fixed
- Square hollow and rectangular tube Alternatives now link across equivalent outer sizes and wall thicknesses instead of staying isolated inside a single manual profile family

---

## [2.2.1] - 2026-03-24

### Changed
- Structural Alternatives now use a searchable, sortable family list with direct profile switching, selected-first ordering, and full-job impact values for the active size family
- Manual and commercial profile families now use the same Alternatives list style as structural profiles instead of a separate lookup table
- Alternatives rows were tightened into a denser list with smaller typography to match the compact desktop Specs layout
- Alternatives now use only the blue active selection state and no longer show a shifting secondary badge
- Specs panel now focuses the lower section on dimensions and alternatives by removing the separate Formula and References cards

### Fixed
- Specs panel Alternatives labels now fall back to readable copy instead of exposing raw translation keys when localized strings are unavailable
- Specs panel Alternatives rows no longer stretch and misalign inside the desktop column layout
- Square hollow sections in the Specs panel now render as true square tubes instead of reusing the same rectangular SVG proportions as RHS profiles

---

## [2.2.0] - 2026-03-23

### Added
- Desktop column mode now includes a dedicated Specs panel with synced engineering-style profile drawings, key dimensions, and family lookup tables
- Profile lookup now covers every profile type with repo-owned numeric spec data, including live manual-profile drawings and EN family tables for structural sections

### Changed
- Specs panel drawings now use cleaner engineering callouts, unequal-angle support, and more distinct silhouettes for IPN/IPE/HE, UPN/UPE, and corrugated profiles
- Specs cards and family lookup tables now surface denser engineering data including `kg/m`, inner dimensions, clear heights, flange projection, and similarity-sorted manual family rows
- Saved calculations now use the same result-style card hierarchy across drawers, mobile screens, and column mode
- Saved entries and project calculations now show quantity, piece length, unit weight, total weight, total cost, and surface area in a clearer layout
- Project list and project detail views were redesigned around totals-first summaries, grouped actions, painting stats, and refreshed breakdown cards

### Fixed
- L-angle drawings now keep the thickness callout outside the profile and manual angle lookup now includes unequal standard sizes

---

## [2.1.0] - 2026-03-23

### Changed
- Results were redesigned across desktop and column mode with a grouped summary, quick metrics, clearer cost breakdown, and compact references
- Column-mode result panels now keep the summary and primary actions sticky while you scroll through the details
- Calculation details now switch to stacked rows in narrow result columns for better readability without horizontal scrolling

---

## [2.0.0] - 2026-03-23

### Added
- TweetDeck-style multi-column layout for calculator, result, saved, projects, settings, and compare panels on wide desktops
- Resizable columns with drag handles between adjacent panels
- Column controls to add, remove, reorder, and switch panel types
- Columns toggle button in the desktop sidebar with `Ctrl+Shift+L`
- Column layout persistence via `localStorage`
- Full-viewport column mode with independent per-column scrolling

### Changed
- Desktop result panel sidebar widened from 300/340px to 340/400px at `lg`/`xl` breakpoints
- Result panels now use a grouped summary, quick metrics, clearer cost breakdown, and sticky top actions in column mode for faster scanning
- Drawers are automatically suppressed when their content is already visible as a column
- Quantity stepper buttons and unit price input were tightened for narrow column widths
- JSON external store caching now prevents `useSyncExternalStore` render loops
- Column mode now adapts to actual workspace width, uses an Add panel picker for unused panels, and renders the result panel embedded inside the column shell instead of nesting a second outer card

### Fixed
- Compare panel now renders full content in column mode instead of placeholder text
- Quantity `+/-` buttons no longer overflow into the adjacent unit price field in narrow layouts
- Saved column layouts are normalized on load, duplicate panels are blocked, resize handles respect one shared minimum width, and over-wide saved layouts now fall back to the standard desktop view until enough space is available

---

## [1.8.0] â€“ 2026-03-19

### Added
- **Paintable surface area** calculated for every profile type â€” outer perimeter Ă— length Ă— quantity displayed in calculator results, project aggregates, CSV and PDF exports
- **Painting cost estimation** at project level â€” configurable paint price per kg and coverage rate (mÂ˛/kg, default 8) with automatic paint-needed and total-cost rollup
- **Multiple paint coats** â€” adjustable coat count (1â€“10) per project; paint needed scales accordingly
- **Perimeter data for all 138 EN standard profile sizes** â€” IPE, IPN, HEA, HEB, HEM, UPN, UPE, and T-sections now include perimeterMm for accurate surface area calculation
- Painting section in project drawer with editable price/kg, coverage, and coats inputs
- Surface area column in project CSV and PDF exports
- Painting summary stats (total surface area, paint needed, painting cost) in PDF export header

### Changed
- Calculator result receipt now shows surface area between weight and cost sections when available
- Clipboard copy format includes surface area line when present
- Project aggregate cards include painting data when surface area is available

---

## [1.7.0] – 2026-03-17

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

## [1.6.0] â€“ 2026-03-11

### Added
- Named saves â€” calculations can now be saved with a custom name and optional notes via a save dialog
- Save dialog: name input + notes textarea shown when clicking Save on any result
- â‹Ż action sheet on mobile â€” single button opens Compare, Save, and Add to Project in one place
- Bookmark icon fills when the current calculation is already saved

### Changed
- Auto-save history removed â€” replaced with intentional named saves (no more automatic clutter)
- Bottom tab bar: History tab replaced with Saved tab â€” bookmark icon with count badge
- Saved items redesigned to match project card style â€” bordered cards with small icon buttons, no timestamp
- Category-colored icons (tubes=blue, plates=amber, structural=green, bars=purple) in saved drawer and project calculations
- Grade badges color-matched to profile category for quick material recognition

### Fixed
- Quick Calc no longer resets price basis, unit price, currency, waste, VAT, and rounding precision when loading a result â€” user settings are now preserved app-wide

---

## [1.5.0] â€“ 2026-03-09

### Added
- **Ctrl+K quick-calculate palette** with 459 EN-standard commercial sizes across all structural profile families (IPE, IPN, HEA, HEB, HEM, UPN, UPE, angles, T-sections)
- Keyboard navigation inside the palette (arrow keys, Enter, Escape)
- **Project section enhancements**: cost metrics per project, per-calculation notes, PDF export, project description field
- Sorting and filtering within projects (by weight, cost, date)
- Project duplication shortcut
- Dimension preset management (save, load, delete presets per profile)

### Changed
- Results bar unified across mobile and desktop â€” receipt-style layout with consistent weight/cost display
- Mobile result overlay redesigned for clarity and touch targets

### Fixed
- Results bar weight and cost display inconsistency between mobile mini-card and desktop panel

---

## [1.4.0] â€“ 2026-03-06

### Added
- **Quick Calc** `@` trigger â€” type `@` to launch quick calculation from any input
- Material badge shown alongside quick-calc results
- Keyboard shortcuts modal (`?` key) listing all available shortcuts
- **Presets** â€” save and reload frequently used dimension sets per profile
- Length support in plate/sheet presets
- Overflow popover for plate/sheet preset list
- RHS (rectangular hollow section) quick-calc example
- **Raycast extension** â€” standalone quick metal weight calculator powered by `@ferroscale/metal-core` shared package

### Changed
- Plates and sheets: improved preset UX with popover when list overflows
- Quick Calc palette: added material badge and improved result display

### Fixed
- Share-result button removed (replaced by project-based workflow)
- Single-piece weight calculation corrected for edge cases

---

## [1.3.0] â€“ 2026-02-26

### Added
- **Mobile bottom tab bar** â€” native-app-style navigation with Calculator, History, Projects, and Settings tabs
- **Mini result card** above the tab bar â€” shows live weight/cost without opening a drawer
- **Haptic feedback** on tab switches and key interactions (PWA / mobile)
- **Swipe gestures** on bottom sheets for natural dismiss
- **Animated drawers** â€” smooth spring-based slide-in/out for all panels
- Visual grouping of profile families in the selector

### Changed
- Mobile layout restructured with visual hierarchy improvements
- PWA install prompt redesigned for clarity
- Form fields reorganized for better mobile ergonomics

---

## [1.2.0] â€“ 2026-02-20

### Added
- **Find Quantity mode** (reverse calculator) â€” enter a target weight and get the required quantity or length
- Compare drawer: side-by-side comparison of up to 5 calculations

### Fixed
- Translation key for duplicate count label in Bosnian locale

---

## [1.1.0] â€“ 2026-02-19

### Added
- **PWA / offline support** â€” app installs as a standalone app on mobile and desktop
- Service worker with app-shell caching strategy
- Offline fallback page shown when network is unavailable
- Offline status banner when connectivity is lost mid-session
- PWA update banner prompting users to reload for new versions
- **Unified modal design** â€” consistent styling across all drawers and modals

---

## [1.0.0] â€“ 2026-02-13

### Added
- Core metal weight and price calculator supporting 12 profile types:
  - Manual profiles: round bar, square bar, flat bar, hexagonal bar, angle, pipe, square tube, rectangular tube, sheet, plate, chequered plate
  - EN-standard structural profiles: IPE, IPN, HEA, HEB, HEM, UPN, UPE, equal angles, T-sections
- Steel, stainless steel, and aluminum material families with EN-standard densities
- Three pricing modes: per kg, per metre, per piece
- VAT and material waste percentage inputs
- Unit conversion: mm, cm, m, in, ft for dimensions; kg and lb for weight
- **Calculation traceability** â€” dataset version label, formula reference, and optional detailed breakdown
- Local browser history â€” last 10 calculations with star/save support
- CSV export of calculation results
- Clear history control
- **Contact / feedback form** with rate limiting and CAPTCHA challenge
- Bilingual UI: English and Bosnian (`/en`, `/bs` locale routing)
- Dark mode, light mode, and system-preference auto-detection
- Responsive layout â€” full desktop sidebar + mobile-optimised form
- Health check API endpoint (`GET /api/health`)

---

<!-- Links -->
[Unreleased]: https://github.com/nedimperva/ferroscale/compare/v2.4.4...HEAD
[2.4.4]: https://github.com/nedimperva/ferroscale/compare/v2.4.2...v2.4.4
[2.4.2]: https://github.com/nedimperva/ferroscale/compare/v2.4.1...v2.4.2
[2.4.1]: https://github.com/nedimperva/ferroscale/compare/v2.4.0...v2.4.1
[2.4.0]: https://github.com/nedimperva/ferroscale/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/nedimperva/ferroscale/compare/v2.2.2...v2.3.0
[2.2.2]: https://github.com/nedimperva/ferroscale/compare/v2.2.1...v2.2.2
[2.2.1]: https://github.com/nedimperva/ferroscale/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/nedimperva/ferroscale/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/nedimperva/ferroscale/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/nedimperva/ferroscale/compare/v1.8.0...v2.0.0
[1.8.0]: https://github.com/nedimperva/ferroscale/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/nedimperva/ferroscale/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/nedimperva/ferroscale/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/nedimperva/ferroscale/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/nedimperva/ferroscale/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/nedimperva/ferroscale/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/nedimperva/ferroscale/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/nedimperva/ferroscale/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/nedimperva/ferroscale/releases/tag/v1.0.0
