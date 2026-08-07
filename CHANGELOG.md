# Changelog

All notable changes to FerroScale are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [3.13.0] - 2026-08-07

### Changed

- **Typing habits sync.** Usage stats — the per-family tallies that rank sizes, lengths, quantities and grades in the suggestion bar, plus the recent-query list — were local-only, so every device started from zero. They now travel with the rest of the encrypted snapshot as a **grow-only counter per device**: each device pushes `usage:<deviceId>` holding only what it learned itself, its own record is skipped when it comes back on a pull, and the suggestion source sums every device's tally at read time (counts add, timestamps take the later of the two). A shared running total would have double-counted on every round trip — five uses here plus the five just pulled back reading as ten — which is what the per-device split exists to prevent. A single-device user's ordering is unchanged: with no peers the merge is skipped outright
- The shell now subscribes to a usage version store instead of holding its own counter, so a sync pull that brings another device's habits in refreshes the suggestions without a reload

---

## [3.12.0] - 2026-08-07

### Added

- **Target queries — the question asked backwards.** `hea120 6m =500kg` answers *how many of these make 500 kg*, `hea120 x10 =500kg` answers *how long ten of them have to be*, and `=250eur` does the same against money instead of mass. Weight targets read `kg`, `t` and `lb`; money targets take the configured currency code or a `€`/`$`/`£` symbol. The solver probes the engine rather than restating the pricing rules, so waste, VAT and price basis are all counted in, and a per-piece rate — which doesn't move with length — is left unsolved instead of answered wrongly. Pieces round **up**, because you buy whole bars, and a purple badge on the equation line states the target and how far over it the answer lands. The token is part of the grammar reference and travels in `?q=` links and copied summaries like any other

---

## [3.11.0] - 2026-08-07

### Changed

- **The 640–1023 range gets the real workspace.** It used to be a fixed 560px card floating on a background — no session tape, no library, no breakdown — which is exactly an iPad in portrait and a half-width laptop window. Everything ≥640 now runs the workspace, in a single-column form below 1024: full-width command line, result panel, tape, then the breakdown stacked beneath, with the wordmark and the ⌘K button dropped from the header for room. Sheets are phone-only from here on, and the shell lost ~200 lines of now-unreachable medium-viewport code
- **One numeric typography rule.** Tabular figures for every number in the app (mono data and the sans display metric alike), so a value never shifts sideways while it counts up or a digit changes. Compare's headline weight moved to mono with everything else
- **Accent discipline.** `--accent` was doing six jobs; it now means the primary action and the weight metric. Selected workspace tabs, library tabs, density controls and profile glyphs use neutral surfaces and text — the raised surface and its shadow already said "selected"
- **A shared motion vocabulary** (`fsPop` / `fsRise` / `fsFade` / `fsDrop`): chips pop in, tape lines rise, views cross-fade on tab change, the parse warning drops in, toasts arrive rather than blink. One rule set, all of it off under `prefers-reduced-motion`
- The workspace panel treatment (border, surface, shadow, radius) is a `DeskPanel` atom instead of the same inline block written out in every view

---

## [3.10.0] - 2026-08-07

### Added

- **Price book — a rate per material grade.** Pricing was a single €/kg for every material, and stainless runs about four times mild steel, so anyone working across materials was quoting one of them wrong unless they retyped `@` on every line. Rates resolve inline `@2.50/kg` > the grade's book rate > the single default, so an empty book behaves exactly as before. Editable in Settings on every viewport, and synced like every other collection
- **Margin.** One percentage adds a **sell price** row wherever a breakdown appears — result, saved card, printed quote — without touching the cost figures themselves
- **Session → project in one press.** The tape already showed a running total; now it can become a job
- **Assemblies.** A saved entry can hold several parts: add the line in the bar to any entry and the card becomes a bill of materials, with its parts listed and its weight and price **summed**. The storage model always supported this; nothing surfaced it
- **Printable quote.** Any project prints (or saves as PDF) as a clean document — header, line items, lengths, weights, totals, margin, and a note that the weights are theoretical. Client-side, zero dependencies, works offline

### Changed

- `addCalculations` adds several calculations to a project in one state update. The existing `addCalculation` reports success through a flag its updater sets, which only reads back correctly for the first call in a batch — a loop reported success once and silently dropped the rest

---

## [3.9.0] - 2026-08-07

### Added

- **A finished line offers variations, not just Save.** The moment a query is complete used to show exactly one chip ("Save calculation") — the highest-intent moment in the app spent on a single button. It now offers one-tap refinements: **twice the pieces**, the **other stock lengths**, the **neighbouring catalog sizes**, **another grade** — each with the resulting total (`× 4 · 477 kg`) or per-metre weight under it, so you can weigh the option before taking it. Picking one swaps that token in place and leaves the rest of the line alone
- **⌥1–9 inserts the numbered suggestion** without leaving the input, and each chip carries its number so the shortcut is learnable by looking
- **A key-hint strip** under the command line naming the keys that work right now, and **`?`** opens a full command reference: the grammar, every shortcut, tappable profile aliases and grades — generated from the alias table, so it can't drift from what the parser accepts
- **⌘S** saves the current line (again to unsave), **⌘↵** adds it to compare
- **Hold backspace on the phone keypad to delete a whole token** — a size like `40x40x3` in one gesture instead of seven
- **Recents above the phone keypad.** ↑/↓ recall was desktop-only; the last few lines are now one tap away on mobile
- **Vibration feedback** on the keypad and on committed actions, with an on/off switch in Settings

### Changed

- **Enter has one meaning everywhere**: take the pending suggestion, else log the finished line. It previously meant different things on different surfaces with nothing on screen saying which — the hint strip now shows *insert* or *log* as it changes
- **Suggestions are grouped** — Yours, Presets, Standard — so the frequency ranking is visible rather than merely applied
- **Returning users start on their last line** instead of the demo query (a first visit still gets the demo)
- Phone suggestion chips **wrap to a second row** instead of hiding behind a sideways scroll
- Key routing moved into one pure resolver (`command-keys.ts`) shared by every surface, replacing two drifting copies

### Fixed

- Typing did roughly twice the work it needed: the suggestion engine re-parsed the query the shell had already parsed, and re-derived per-metre weights for every candidate size on every keystroke. The parse is now handed over and the weights are cached

---

## [3.8.0] - 2026-08-06

### Added

- **Saved calculations are real cards.** Each one shows the **actual cross-section** of its profile (the same drawing the breakdown uses, scaled to card size), the spec — `6 m × 2 · S235` — under the title, both totals with the mode-leading metric dominant, and mass per metre / weight per piece alongside. An expander opens the full breakdown, notes and tags in place
- **Search, sort, tag and pin.** Filter saved work by name, note, tag, profile or grade (multi-word, any order); sort by newest, most used, recently used or name; pin the ones you reach for daily to the top of every sort
- **Name, notes and tags** on any saved calculation, plus a **Name it** action on the save confirmation — the one moment you still have the job in your head
- **Duplicate** a saved calculation to tweak a copy without touching the original
- **Bulk selection**: select several entries to compare or delete them in one go; **card / compact** view toggle for large libraries
- **Undo** on deleting a saved calculation (single or bulk), from the toast that confirms it
- **Save is a toggle.** The button shows a filled bookmark when the line in the bar is already saved; pressing it again removes it

### Changed

- **Saved entries are priced at today's rate, and say so.** A saved calculation stores geometry as its identity; the money is recomputed from your current pricing every time it renders, with the rate stated on the card (`@ €1.20/kg`). When today's rate moves the total, the card shows a `was €1,193.51` badge instead of quietly displaying a stale figure. Opening one restores it at today's rate too, so the command line matches the card
- **Opening a saved calculation counts as a use** — `useCount` / `lastUsedAt` are recorded, which is what makes "most used" and "recently used" sorting meaningful
- **Share links carry pricing.** `?q=` links now also encode the sender's rate, rate unit, basis, currency, waste and VAT, so a shared calculation shows the same price to whoever opens it; applying a link's pricing is announced rather than silent
- **One empty state** across Saved, Projects, Compare and the library sheets — icon, title, sentence, and the action (or shortcut) that fills it
- Saved-entry identity ignores price, so re-saving a restored entry after a rate change no longer creates a duplicate

### Fixed

- Saving an already-saved calculation reported "Saved" while doing nothing — the button now reflects the real state, and pressing it removes the entry
- A saved card's price and the price of the line it restored could disagree whenever the stored rate differed from the current default

---

## [3.7.0] - 2026-07-20

### Added

- **The hero metric counts up.** When a query settles, the big weight/price number tweens to its new value (easeOutCubic, ~0.4s) instead of snapping — animated in the target's own unit so it never flips kg↔t mid-count, and instantly snapped when reduced motion is requested
- **The profile drawing eases in** when you switch profile shape (a soft fade-and-rise), so the result feels like it arrives rather than blinks; disabled under reduced motion, and size tweaks on the same shape update in place without re-animating
- **Dimensioned profile drawings.** The result breakdown (mobile sheet + desktop rail) now shows a scaled cross-section of the current profile instead of a flat glyph — a real I-beam / channel / tee / hollow section / pipe / angle / plate outline with **every dimension labelled in mm on the picture**: overall width and height as arrowed dimension lines, and each thickness (web, flange, wall, leg, root radius, pattern height) as a leader pointing at the exact feature. The rolled sections (I-beam / channel / tee) draw their real rounded root fillets at the web/flange junctions. Standard profiles read their geometry from the shared spec records; manual families from the parsed dimensions; expanded/corrugated keep the glyph
- **The command bar types with you.** As you type a profile (or the start of a query you've run before), a faint inline completion appears after the caret — press **Tab** or **→** to accept it, or just keep typing. Works on phone (tap the ghost text), the medium command card, and the desktop workspace
- **Did-you-mean fixes.** A mistyped profile, grade, or off-catalog size no longer just fails: the parse line offers a one-tap correction (`hae120` → **hea120**, `hea125` → **120**, a fat-fingered grade → the nearest real code). Corrections use edit distance that counts a transposition as a single typo, and are never applied automatically
- **Type it the way you'd say it.** The parser now accepts natural, spaced forms — `hea 120`, `6 meters` / `6 m`, `2 pieces` / `2 kom`, `x 2` — folding them into the canonical grammar while it reads. The strict token form is still what round-trips into share links and saved entries (EN + common BS/DE unit and quantity words)
- **↑/↓ query history.** On the desktop inputs, Up recalls earlier queries and Down walks back toward what you were typing — terminal-style, no reach for the mouse

### Changed

- Size suggestion chips now show the per-metre weight (e.g. `120 · 26.7 kg/m`) so you can judge a size before picking it; sheet/plate families stay per-piece and show none

### Fixed

- Recent queries no longer pile up near-duplicates while you build a single calculation. Each idle pause used to record the raw text — including half-typed trailing tokens like a lone `@` — so refining one query left a trail (`… 304`, `… 304 @`, `… 304 @6`). Now the settled query is recorded in canonical form (dropping dangling partials) and a refinement supersedes the shorter version it grew from, so one calculation leaves one recent

---

## [3.6.2] - 2026-07-03

### Changed

- The mobile keypad's separate `mm` and `m` keys are merged into one length key — tap inserts `mm`, **hold** opens an `mm` `cm` `m` picker (same pattern as the rate key). `cm` is now reachable from the keypad for the first time, and both pickers share one component

---

## [3.6.1] - 2026-07-03

### Changed

- Cleaner mobile keypad: the separate `@` and `/` keys (added in 3.6.0) are folded into the rate key — tap inserts the default price token, **hold** opens a `/kg` `/m` `/pc` picker (the familiar hold-for-alternatives keyboard pattern)

---

## [3.6.0] - 2026-07-03

### Added

- Formula QA page (`/qa`): the live engine + dataset are validated against independent references — published EN catalog masses for standard profiles and hand-computed cross-section formulas for manual ones (20 rows, 0.5% tolerance) — with a server-rendered pass/fail table, per-row deviation, max delta, and the dataset version. The same benchmark runs as a vitest gate in CI and an e2e smoke test
- The mobile keypad gained `@` and `/` keys, so inline price overrides like `@2.50/kg` can be typed directly

### Fixed

- **UPE channel weights corrected** (dataset `2026.07.1`): eleven UPE sizes carried cross-section areas 1–4% off the EN 10279 catalog values — found by the new formula-QA benchmark; all now match the published figures (each cross-checked against mass = area × 0.785)
- Typing `sht` now shows "Sheet" instead of "Plate" in chips, hints, and saved names
- localStorage keys unified under the `ferroscale-` prefix with a safe one-time migration (the `advanced-calc-*` names predated the rename)

---

## [3.5.0] - 2026-07-03

### Added

- Suggestions now learn from what you actually type: any query that settles on a live result counts (no Save needed), and sizes, lengths, quantities, and grades you use most rank first — frequency × recency with a 14-day half-life, tracked separately per profile family so SHS habits never surface for HEA (`cmdSuggest` gains a storage-agnostic `CommandUsageSource`; the web adapter persists locally per device)
- Install app from Settings: when the browser supports it, a quiet card in Settings installs FerroScale to the home screen or desktop — deliberately not a banner

### Changed

- Token-system adoption is complete: a new `--accent-contrast` token replaces the recurring raw hexes for text on the accent color; the PWA banners, contact page, error boundary, and skip link use design tokens; the web manifest theme/background colors match the real palette

---

## [3.4.0] - 2026-07-03

### Changed

- Text contrast now meets WCAG AA everywhere: secondary text, placeholders, hints, and status labels are darker in light mode (and slightly lighter in dark mode), and the accent orange and confirmation green were tuned so buttons and highlighted values stay readable — the automated axe scans report zero serious color-contrast violations
- Settings look and behave the same everywhere — both the mobile settings sheet and the desktop settings view are driven by one shared field model (`settings-model.ts`); the theme row on mobile is now a Light/Dark choice like the other rows
- The result breakdown shows consistent labels on mobile and desktop (per piece, rate) — both surfaces now render from one shared row builder (`breakdown-rows.ts`)
- Internal: the desktop saved cards reuse the shared subtitle helper; the Raycast extension is documented as living in its own repository (out of scope here) with `@ferroscale/metal-core`'s command module as the shared grammar

---

## [3.3.0] - 2026-07-03

### Added

- Sheets (Settings, Library, Result, Add to project) are now real modal dialogs for assistive technology: screen readers announce them by name, keyboard focus stays inside while they are open and returns to the opener on close, and Escape closes them on every device — including phones
- Screen readers now announce the calculated result once you stop typing, confirmation toasts (Saved, Link copied, …), and the offline/update banners
- Automated accessibility scans (axe-core) in the e2e suite — critical violations fail the run

### Changed

- Pinch zoom is enabled again everywhere — accessibility over app-like feel
- Settings inputs (unit price, waste, VAT, default grade) are now properly labeled for assistive technology
- Internal: manual profile definitions now carry their own area/perimeter formulas and geometry constraints — adding a profile no longer touches the engine or validation; the three 1,300–2,300-line command components are split into focused modules under `sheets/` and `desktop/` with shared atoms deduplicated

---

## [3.2.0] - 2026-07-02

### Added

- Shareable calculation links: the URL now mirrors your query (e.g. `/en?q=hea120+6m+x2`), and a new Share link action copies it — opening a link restores the calculation instantly
- Copy value action copies the result itself (total weight or total price) instead of the query text
- The command bar now explains input it didn't understand — unknown tokens, non-existent standard sizes, invalid quantities, and impossible geometry show a message under the query line, and unrecognized tokens are highlighted
- Smarter suggestions: your recent queries appear before the profile chips, and sizes you recently used for a profile appear before the standard sizes
- Continuous integration: lint (hard gate), en/bs message parity, both test suites, and a production build run on every push and pull request

### Changed

- The session tape is now persistent — logged calculations survive reloads and are included in Google Drive sync (up to 50 entries)
- The command query parser (grammar, suggestions, formatting) moved into `@ferroscale/metal-core` as the package's single parser, ready for reuse by non-web surfaces such as a Raycast extension or CLI
- Internal: removed unused dependencies (framer-motion, vaul) and dead hooks/components; deduplicated command UI constants; refreshed AGENTS.md, READMEs, and docs; replaced the stale e2e suite with a command-bar spec

### Removed

- **Breaking (metal-core):** the unused `quick` module (`parseQuickQuery`, `calculateQuickWeight`, `@ferroscale/metal-core/quick`) — it had no consumers; use the `command` module instead

---

## [3.1.0] - 2026-06-09

### Added

- FerroScale Command — a new type-or-tap calculator on the home screen: type a query like `hea120 6m x2 s235` (or tap through profile → size → length → pieces → grade) for an instant live result with a breakdown sheet
- Command understands bare lengths using your default unit from Settings (e.g. `hea120 6`), plus explicit mm/cm/m/in/ft
- Your saved dimension presets appear as one-tap size suggestions in Command after picking a profile
- Compare and Add-to-project actions in Command's result breakdown
- All 9 material grades available in Command (S235, S355, S420, 304, 316, 316L, 6060, 6082, 7075) with EN densities
- Command bar price overrides: add tokens like `@2.50/kg`, `3,20/m`, or `@12/pc` to override the default unit price for a single calculation
- Settings now include a bilingual in-app guide with Command examples, pricing tips, saved work, projects, sync, and offline notes
- Settings now include an English/Bosnian language switcher; changing language also changes the guide language

### Changed

- Command pricing now uses your real pricing settings (unit price, price basis, currency incl. PLN/BAM, waste %, VAT) — the hero PRICE value is the same grand total the full calculator produces, with waste/VAT badges when active
- Saving in Command stores the calculation in the shared Saved library (visible on /saved, included in sync) in addition to the quick query recall list
- The "weight as main" setting now drives Command's default hero metric; Command's settings sheet edits the same shared pricing/grade/unit settings as the Settings tab
- Mobile Command keypad now has a rate key (for example `€/kg`) so price overrides can be entered without typing `@` or `/kg` manually
- Bosnian localization now covers the Command workspace, settings, library, result breakdowns, sync prompts, and accessibility skip link

### Fixed

- Mobile Command keypad now stays anchored to the bottom of the screen without extra bottom padding while the content above fits into the remaining space
- Stainless 304 density corrected to 7930 kg/m³ in Command quick queries

---

## [3.0.0] - 2026-05-14

### Changed

- Redesigned the default workspace around a bare calculator-first layout with a compact top bar, overflow menu, flatter controls, and mobile result summary without the bottom tab bar
- Removed the duplicate "Calculator" section header from desktop, multi-column, and mobile layouts — the top bar already conveys page identity
- Grouped the overflow menu into Workspace, Tools, and Help sections for easier scanning
- Desktop now uses a single centered column (form on top, result inline below) instead of a fixed 360 px right column, so the calc form gets meaningful width
- Mobile top-bar subtitle hides while a result is showing, since the floating result bar already carries the live numbers
- Collapsed the calculator profile picker into a single button that expands the category and sub-type pills on demand — saves vertical space on every layout
- Regrouped the overflow menu around a Library section (Saved, Projects, Compare) so the three stashes feel like one concept
- Added "Save as template" and "Add to project" actions on Compare items, so a comparison can land in the persistent library without re-entering it in the calculator
- Wide desktops (≥ 1280 px) now show the calculator form and result side-by-side, with the result column sticky and scroll-contained so the page itself does not scroll when the result is visible. Laptops (1024–1279 px) keep the single-column layout from the previous round
- Replaced the inline desktop result panel with a floating result chip in the bottom-right corner of the viewport (consistent across mobile and desktop). Click the chip to expand: bottom sheet on mobile, centered modal on desktop
- Compare cards now show only "Add to project" — the save-as-template button on Compare has been removed (the calculator's own save flow still applies)
- Removed the unused `ResultActionsSheet` component; result actions live inside the expanded result overlay
- Result overlay is now a centered modal on every screen size (the mobile bottom sheet has been retired)
- Profile picker has a pin option that keeps the category and sub-type pill grid open across selections and outside clicks; the pin preference is persisted
- Removed the toast notification system entirely (no more transient success/info/warning/error popups). State changes still surface through inline UI and sync status badges
- Rebuilt the result modal in a minimal, typography-led style: dropped the icon-avatar hero, tinted metric cards (price/weight/surface/project tones), and the colored summary-chip row in favor of a single accent (warm tan) for the primary value, neutral label-on-left/value-on-right metric rows, an inline context line, and a flatter ghost-style action grid. The modal shell now matches the floating result chip — `rounded-xl`, lighter shadow, corner close button instead of a titled header bar

---

## [2.5.2] - 2026-04-09

### Added

- Branded startup splash on mobile during the first app load, with a snappy fade-out once the shell is ready

### Changed

- Calculator form is grouped into clearer sections; default length unit is set in Settings (workspace), not duplicated on the calculator page
- Switching profile or the workspace length unit now keeps manual dimensions and piece length in sync without silent mm-only defaults
- Validation messages for hollow sections and angles explain the conflicting values in millimetres
- Result summary chips show quantity, pricing, waste, and VAT (length removed from chips); dataset version stays near references
- Removed instructional hint text under size fields and the result rounding disclaimer
- Reverse calculator quantity mode shows equivalent total length in metres for the exact (fractional) piece count
- Templates and Projects mobile screens use the same horizontal padding as the calculator for a consistent shell
- PWA update banner can open the changelog before applying an update; number animations are slightly faster
- Mobile tab routes prefetch in the background and switch with a smoother directional slide (no interstitial overlay)
- App icons, favicons, desktop sidebar mark, offline page mark, and iOS startup images now use the new FerroScale logo artwork
- Desktop sidebar branding now shows only the FerroScale name without the Workspace eyebrow
- Mobile header branding now uses the new app icon, and iOS startup screens use the standalone F logo artwork

### Fixed

- Calculator validation no longer duplicates in a top banner; dimension fields reserve equal error space only while a dimension error is shown, so valid inputs stay tight on mobile

---

## [2.5.1] - 2026-04-03

### Changed

- Saved custom presets for standard profiles now appear directly in the size picker alongside EN standard sizes

### Fixed

- Google Drive sync status no longer loops between connected and syncing when there are no pending data changes
- Google Drive sync no longer treats quick-calc history as constantly changed when older local data is missing its sync timestamp marker

---

## [2.5.0] - 2026-03-30

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
[Unreleased]: https://github.com/nedimperva/ferroscale/compare/v2.5.1...HEAD
[2.5.1]: https://github.com/nedimperva/ferroscale/compare/v2.5.0...v2.5.1
[2.5.0]: https://github.com/nedimperva/ferroscale/compare/v2.4.2...v2.5.0
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
