export interface ChangelogEntry {
  version: string;
  date: string;
  added?: string[];
  changed?: string[];
  fixed?: string[];
  added_bs?: string[];
  changed_bs?: string[];
  fixed_bs?: string[];
}

/**
 * Structured changelog data.
 * Keep this in sync with CHANGELOG.md at the repo root.
 * Add a new entry here whenever a user-visible change ships.
 * For Bosnian translations add the _bs variants alongside each array.
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
    added_bs: [
      "Ctrl+K paleta za brzi izračun sa 459 EN standardnih komercijalnih dimenzija (IPE, IPN, HEA, HEB, HEM, UPN, UPE, uglovi, T-profili)",
      "Navigacija tipkovnicom u paleti (strelice, Enter, Escape)",
      "Troškovni pokazatelji projekta, bilješke po kalkulaciji i PDF izvoz",
      "Sortiranje i filtriranje unutar projekata (po masi, cijeni, datumu)",
      "Prečica za dupliciranje projekta",
      "Upravljanje dimenzijskim presetovima — čuvanje, učitavanje i brisanje po profilu",
    ],
    changed: [
      "Results bar unified across mobile and desktop with receipt-style layout",
      "Mobile result overlay redesigned for clarity and touch targets",
    ],
    changed_bs: [
      "Traka rezultata ujednačena na mobilnom i desktopu u obliku računa",
      "Mobilni prikaz rezultata redizajniran za jasniji prikaz i bolji dodir",
    ],
    fixed: [
      "Results bar weight and cost display inconsistency between mobile mini-card and desktop panel",
    ],
    fixed_bs: [
      "Nekonzistentnost prikaza mase i cijene između mobilne mini-kartice i desktop panela",
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
    added_bs: [
      "Quick Calc @ okidač — upišite @ za pokretanje brzog izračuna",
      "Oznaka materijala prikazana uz rezultate brzog izračuna",
      "Modal prečica tipkovnice (? tipka) sa svim prečicama",
      "Presetovi — čuvanje i učitavanje često korištenih dimenzija po profilu",
      "Podrška dužine u presetovima za ploče/limove sa skočnim prozorom",
      "Primjer brzog izračuna za RHS (pravokutna šuplja sekcija)",
      "Raycast ekstenzija — samostalni brzi kalkulator mase metala",
    ],
    changed: [
      "Plates and sheets: improved preset UX with overflow popover",
      "Quick Calc palette: added material badge and improved result display",
    ],
    changed_bs: [
      "Ploče i limovi: poboljšano iskustvo preseta sa skočnim prozorom",
      "Paleta brzog izračuna: dodana oznaka materijala i poboljšan prikaz rezultata",
    ],
    fixed: [
      "Share-result button removed in favour of project-based workflow",
      "Single-piece weight calculation corrected for edge cases",
    ],
    fixed_bs: [
      "Uklonjen gumb za dijeljenje rezultata zamijenjen projektnim tokom rada",
      "Ispravljen izračun mase jednog komada za rubne slučajeve",
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
    added_bs: [
      "Mobilna donja traka kartica — navigacija nalik nativnoj aplikaciji",
      "Mini-kartica rezultata iznad trake kartica sa živim prikazom mase/cijene",
      "Haptička povratna informacija pri promjeni kartica i ključnim interakcijama",
      "Gestovi prevlačenja na donjem listu za prirodno zatvaranje",
      "Animirani ladičari — glatki ulaz/izlaz sa spring fizikom za sve panele",
      "Vizualno grupiranje familija profila u selektoru",
    ],
    changed: [
      "Mobile layout restructured with improved visual hierarchy",
      "PWA install prompt redesigned for clarity",
      "Form fields reorganized for better mobile ergonomics",
    ],
    changed_bs: [
      "Mobilni raspored restrukturiran sa poboljšanom vizualnom hijerarhijom",
      "PWA prompt za instalaciju redizajniran za veću jasnoću",
      "Polja forme reorganizirana za bolju upotrebljivost na mobilnom",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-02-20",
    added: [
      "Find Quantity mode (reverse calculator) — enter a target weight to get required quantity or length",
      "Compare drawer — side-by-side comparison of up to 5 calculations",
    ],
    added_bs: [
      "Način pronalaska količine (obrnuti kalkulator) — unesite ciljnu masu za traženu količinu ili dužinu",
      "Ladičar za usporedbu — poređenje do 5 izračuna jedan pored drugog",
    ],
    fixed: [
      "Translation key for duplicate count label in Bosnian locale",
    ],
    fixed_bs: [
      "Ključ prijevoda za oznaku duplikata na bosanskom jeziku",
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
    added_bs: [
      "PWA / offline podrška — aplikacija se instalira kao samostalna na mobilnom i desktopu",
      "Service worker sa strategijom keširanja aplikacijske ljuske",
      "Stranica za offline prikaz kada nema mreže",
      "Baner offline statusa kada veza nestane tokom sesije",
      "PWA baner ažuriranja koji poziva korisnike da ponovo učitaju za novu verziju",
      "Ujednačen dizajn modala u svim ladičarima",
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
    added_bs: [
      "Osnovna kalkulator mase i cijene metala za 12 tipova profila (šipke, cijevi, ploče, konstrukcioni)",
      "EN standardni konstrukcioni profili: IPE, IPN, HEA, HEB, HEM, UPN, UPE, uglovi, T-profili",
      "Čelik, nehrđajući čelik i aluminij sa EN standardnim gustoćama",
      "Načini cijenovanja: po kg, po metru, po komadu",
      "Unos PDV-a i procenta otpadnog materijala",
      "Konverzija jedinica: mm, cm, m, in, ft; kg i lb",
      "Sljedivost izračuna — verzija dataseta, referenca formule, detaljan pregled",
      "Lokalna historija browsera sa podrškom za zvjezdicu/čuvanje (zadnjih 10 unosa)",
      "CSV izvoz rezultata izračuna",
      "Kontakt / forma za povratne informacije sa ograničenjem zahtjeva i CAPTCHA",
      "Dvojezično korisničko sučelje: engleski i bosanski",
      "Tamni, svijetli i automatski način prikaza",
      "Prilagodljiv raspored — bočna traka za desktop i forma optimizirana za mobilni",
    ],
  },
];

/** Latest app version — matches the first (newest) entry in CHANGELOG. */
export const APP_VERSION = CHANGELOG[0].version;
