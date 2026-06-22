# App Polish Improvements

_Started 2026-05-18 06:18 UTC_

---

## User

this is my new design, but i think a lot of stuff need finishing touches, i want it to feel like an actual app on both pc and mobiel, can you chek it and suggest improvments across all app sections

## Assistant

_[tool: local_ls]_

_[tool: local_ls]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

Let me explore more of the key screens to give you grounded, specific feedback.

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: update_todos]_

I have enough context. Let me set up a folder and build a thorough design review document with concrete suggestions and side-by-side mockups for the highest-impact polish items.

_[tool: write_file]_

_[tool: update_todos]_

_[tool: done]_

_[tool: fork_verifier_agent]_

I built a comprehensive design review at **`design-review/Ferroscale Design Review.html`** styled in your own design system (cream palette, terracotta accent, Space Grotesk + IBM Plex Mono).

**What's in it:**
- **TL;DR** — the 8 highest-impact polish items with effort estimates
- **Section-by-section audit** covering design system, mobile calc, mobile nav, desktop sidebar, desktop workstation, Saved, Projects, Compare, Settings, empty states
- **Side-by-side "today vs polished" mockups** for the mobile calculator screen and the desktop sidebar — rendered in HTML, not screenshots
- **A 21-row punch list** sorted P1 → P3 with file refs and effort marks

**Top things to fix first (P1):**
1. Mobile header's profile icon is 4px inside a 16px square — reads as broken
2. Result number can't be selected/copied (global `user-select:none`)
3. Result number overflows past 4 digits on small phones — clamp it or auto-switch kg→t
4. Saved's ⌘K search is a non-functional placeholder — wire it or hide it
5. `window.confirm` calls break the visual world — build one branded ConfirmDialog
6. "Live" green-dot badge shows before there's a result
7. Unify create CTAs across Saved (black) vs Projects (accent circle)

**System-level (P2):**
- Collapse 8 panel/button primitives down to 4 surfaces + 1 button family
- Lock uppercase-label tracking to one value (currently uses 0.06 / 0.08 / 0.10 / 0.12 / 0.14em interchangeably)
- Lock corner-radius ladder to 4 tokens (currently uses ~5 different radii in one screen)
- Replace global 3px focus outline with a soft accent ring token

Open the file to walk through each section — the mockups make the diffs visual rather than abstract.

