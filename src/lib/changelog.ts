export interface ChangelogEntry {
  version: string;
  date: string;
  added?: string[];
  changed?: string[];
  fixed?: string[];
}

/**
 * Structured changelog data.
 * Keep this in sync with CHANGELOG.md at the repo root.
 * Add a new entry here whenever a user-visible change ships.
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.5.0",
    date: "2026-03-09",
    added: [
      "Ctrl+K quick-calculate palette with 459 EN-standard commercial sizes (IPE, IPN, HEA, HEB, HEM, UPN, UPE, angles, T-sections)",
      "Keyboard navigation in the palette (arrow keys, Enter, Escape)",
      "Project cost metrics, per-calculation notes, and PDF export",
      "Sorting and filtering within projects (by weight, cost, date)",
      "Project duplication shortcut",
      "Dimension preset management — save, load, and delete presets per profile",
    ],
    changed: [
      "Results bar unified across mobile and desktop with receipt-style layout",
      "Mobile result overlay redesigned for clarity and touch targets",
    ],
    fixed: [
      "Results bar weight and cost display inconsistency between mobile mini-card and desktop panel",
    ],
  },
  {
    version: "1.4.0",
    date: "2026-03-06",
    added: [
      "Quick Calc @ trigger — type @ to launch quick calculation from any input",
      "Material badge shown alongside quick-calc results",
      "Keyboard shortcuts modal (? key) listing all shortcuts",
      "Presets — save and reload frequently used dimension sets per profile",
      "Length support in plate/sheet presets with overflow popover",
      "RHS (rectangular hollow section) quick-calc example",
      "Raycast extension — standalone quick metal weight calculator",
    ],
    changed: [
      "Plates and sheets: improved preset UX with overflow popover",
      "Quick Calc palette: added material badge and improved result display",
    ],
    fixed: [
      "Share-result button removed in favour of project-based workflow",
      "Single-piece weight calculation corrected for edge cases",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-02-26",
    added: [
      "Mobile bottom tab bar — native-app-style navigation",
      "Mini result card above the tab bar showing live weight/cost",
      "Haptic feedback on tab switches and key interactions",
      "Swipe gestures on bottom sheets for natural dismiss",
      "Animated drawers — smooth spring-based slide-in/out for all panels",
      "Visual grouping of profile families in the selector",
    ],
    changed: [
      "Mobile layout restructured with improved visual hierarchy",
      "PWA install prompt redesigned for clarity",
      "Form fields reorganized for better mobile ergonomics",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-02-20",
    added: [
      "Find Quantity mode (reverse calculator) — enter a target weight to get required quantity or length",
      "Compare drawer — side-by-side comparison of up to 5 calculations",
    ],
    fixed: [
      "Translation key for duplicate count label in Bosnian locale",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-02-19",
    added: [
      "PWA / offline support — app installs as a standalone app on mobile and desktop",
      "Service worker with app-shell caching strategy",
      "Offline fallback page when network is unavailable",
      "Offline status banner when connectivity is lost mid-session",
      "PWA update banner prompting users to reload for new versions",
      "Unified modal design across all drawers",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-02-13",
    added: [
      "Core metal weight and price calculator for 12 profile types (bars, tubes, plates, structural)",
      "EN-standard structural profiles: IPE, IPN, HEA, HEB, HEM, UPN, UPE, angles, T-sections",
      "Steel, stainless steel, and aluminum with EN-standard densities",
      "Pricing modes: per kg, per metre, per piece",
      "VAT and material waste percentage inputs",
      "Unit conversion: mm, cm, m, in, ft; kg and lb",
      "Calculation traceability — dataset version, formula reference, detailed breakdown",
      "Local browser history with star/save support (last 10 entries)",
      "CSV export of calculation results",
      "Contact / feedback form with rate limiting and CAPTCHA",
      "Bilingual UI: English and Bosnian",
      "Dark mode, light mode, and system-preference auto-detection",
      "Responsive layout — desktop sidebar and mobile-optimised form",
    ],
  },
];
