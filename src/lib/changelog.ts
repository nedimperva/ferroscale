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
    version: "1.8.0",
    date: "2026-03-19",
    added: [
      "Paintable surface area calculated for every profile type — outer perimeter × length × quantity displayed in results, project aggregates, CSV and PDF exports",
      "Painting cost estimation at project level — configurable paint price per kg and coverage rate (m²/kg, default 8) with automatic paint-needed and total-cost rollup",
      "Multiple paint coats — adjustable coat count (1–10) per project; paint needed scales accordingly",
      "Perimeter data for all 138 EN standard profile sizes — IPE, IPN, HEA, HEB, HEM, UPN, UPE, and T-sections now include perimeterMm for accurate surface area",
      "Painting section in project drawer with editable price/kg, coverage, and coats inputs",
      "Surface area column in project CSV and PDF exports",
    ],
    added_bs: [
      "Površina za farbanje izračunata za svaki tip profila — vanjski obim × dužina × količina prikazana u rezultatima, agregatima projekta, CSV i PDF izvozima",
      "Procjena troška farbanja na nivou projekta — podesiva cijena boje po kg i pokrivenost (m²/kg, zadano 8) sa automatskim izračunom potrebne boje i ukupnog troška",
      "Više slojeva boje — podesiv broj slojeva (1–10) po projektu; potrebna boja se skalira u skladu s tim",
      "Podaci o perimetru za svih 138 EN standardnih dimenzija profila — IPE, IPN, HEA, HEB, HEM, UPN, UPE i T-profili sada uključuju perimeterMm za tačan izračun površine",
      "Sekcija za farbanje u ladičaru projekta sa unosima za cijenu/kg, pokrivenost i broj slojeva",
      "Kolona površine u CSV i PDF izvozima projekta",
    ],
    changed: [
      "Desktop calculator uses a resizable split between the form and the result panel — drag the gutter to change width (persisted); double-click the gutter to reset",
      "Optional third desktop column for Saved (bookmarks), persisted visibility, and its own resizable gutter",
      "Column splitters support keyboard: Arrow Left/Right nudge width; Home/End jump to min/max (respecting the result max-width cap from settings)",
      "Workspace (desktop): toggle Saved side panel, choose max result column width (320–480px), and reset stored column widths without using the gutter",
      "Standards and dataset references in the result receipt are shown directly under the grand total, above full calculation steps",
      "Result header uses an SVG drawing card: framed cross-section (technical style), optional in-drawing dimensions (Ø, OD, flat width, RHS B/H, etc.), and a specification column from the live input (manual dims, EN designation, A, L); area/density/formula stay as text below the card",
      "Calculator result receipt now shows surface area between weight and cost sections when available",
      "Result header shows a compact cross-section area, material density, and area formula above the action row",
      "Clipboard copy format includes surface area line when present",
      "Clipboard copy includes geometry line (area, density, formula) after the profile summary",
      "Project aggregate cards include painting data when surface area is available",
    ],
    changed_bs: [
      "Desktop kalkulator koristi podesivu podjelu između obrasca i panela rezultata — prevucite razdjelnik za širinu (pamti se); dupli klik na razdjelnik vraća zadano",
      "Opciona treća desktop kolona za Sačuvano (oznake), pamćenje vidljivosti i vlastiti podesivi razdjelnik",
      "Razdjelnici kolona podržavaju tastaturu: strelice lijevo/desno za korak širine; Home/End na min/maks (uz limit širine rezultata iz postavki)",
      "Workspace (desktop): uključivanje bočnog panela Sačuvano, izbor maks. širine kolone rezultata (320–480px) i reset pohranjenih širina bez razdjelnika",
      "Standardi i reference skupa podataka u računu rezultata prikazani su odmah ispod sveukupnog iznosa, iznad svih koraka izračuna",
      "Zaglavlje koristi SVG karticu crteža: okvir, presjek, u-crtež dimenzije gdje ima smisla, kolona specifikacije iz unosa (ručne dimenzije, EN oznaka, A, L); površina/gustoća/formula ispod kartice; blok „Ovaj izračun“ i reference kao ranije",
      "Račun rezultata kalkulatora sada prikazuje površinu između sekcija mase i cijene kada je dostupna",
      "Zaglavlje rezultata prikazuje kompaktno površinu presjeka, gustoću materijala i formulu površine iznad reda akcija",
      "Format kopiranja u međuspremnik uključuje red sa površinom kada je prisutan",
      "Kopiranje u međuspremnik uključuje red geometrije (površina, gustoća, formula) nakon sažetka profila",
      "Agregatne kartice projekta uključuju podatke o farbanju kada je površina dostupna",
    ],
  },
  {
    version: "1.7.0",
    date: "2026-03-17",
    added: [
      "Route-backed mobile app shell with dedicated Calculator, Saved, Projects, and Settings screens",
      "Localized Saved, Projects, and Settings routes with route metadata in both supported languages",
      "Edge-swipe navigation between primary mobile tabs",
    ],
    added_bs: [
      "Route-backed mobilni app shell sa zasebnim ekranima za Kalkulator, Sacuvano, Projekte i Postavke",
      "Lokalizirane rute za Sacuvano, Projekte i Postavke sa route metadata podacima na oba podrzana jezika",
      "Navigacija prevlacenjem sa ivice izmedju primarnih mobilnih tabova",
    ],
    changed: [
      "Primary mobile navigation now uses real routes with swipeable tab transitions while desktop keeps the existing sidebar and drawer workflow",
      "Current calculation state, result bar, and overlays now stay live while moving between mobile tabs",
      "Settings and Projects now reuse shared content as full mobile screens instead of mobile-only sheets",
      "Mobile breakpoints are aligned to the app-shell experience across tabs and overlays",
    ],
    changed_bs: [
      "Primarna mobilna navigacija sada koristi stvarne rute sa swipe prijelazima izmedju tabova, dok desktop zadrzava postojeci sidebar i drawer tok rada",
      "Trenutno stanje kalkulacije, result bar i overlayi ostaju aktivni dok se prelazi izmedju mobilnih tabova",
      "Postavke i Projekti sada koriste zajednicki sadrzaj kao pune mobilne ekrane umjesto mobilnih sheetova",
      "Mobilni breakpointi su uskladjeni sa app-shell iskustvom kroz tabove i overlaye",
    ],
    fixed: [
      "Missing labels in the new mobile app shell for the Saved sidebar entry and result-bar actions",
      "Swipe-to-action rows now block tab-swipe navigation to avoid gesture conflicts",
    ],
    fixed_bs: [
      "Ispravljene su nedostajuce oznake u novom mobilnom app shellu za stavku Sacuvano u sidebaru i akcije result bara",
      "Redovi sa swipe akcijama sada blokiraju tab-swipe navigaciju kako bi se izbjegli konflikti gesti",
    ],
  },
  {
    version: "1.6.0",
    date: "2026-03-11",
    added: [
      "Named saves — calculations can now be saved with a custom name and optional notes via a save dialog",
      "Save dialog: name input + notes textarea shown when clicking Save on any result",
      "⋯ action sheet on mobile — single button opens Compare, Save, and Add to Project in one place",
      "Bookmark icon fills when the current calculation is already saved",
    ],
    added_bs: [
      "Imenovanaa sačuvana izračunavanja — izračuni se sada mogu sačuvati s prilagođenim imenom i opcionalnim bilješkama putem dijaloga za čuvanje",
      "Dijalog za čuvanje: polje za ime i tekstualno polje za bilješke prikazano pri kliku na Sačuvaj za bilo koji rezultat",
      "⋯ akcijski list na mobilnom — jedan gumb otvara Usporedi, Sačuvaj i Dodaj u projekt na jednom mjestu",
      "Ikona oznake se popunjava kada je trenutni izračun već sačuvan",
    ],
    changed: [
      "Auto-save history removed — replaced with intentional named saves (no more automatic clutter)",
      "Bottom tab bar: History tab replaced with Saved tab — bookmark icon with count badge",
      "Saved items redesigned to match project card style — bordered cards with small icon buttons, no timestamp",
      "Category-colored icons (tubes=blue, plates=amber, structural=green, bars=purple) in saved drawer and project calculations",
      "Grade badges color-matched to profile category for quick material recognition",
    ],
    changed_bs: [
      "Automatska historija uklonjena — zamijenjena namjernim imenovanim sačuvavanjima (bez automatskog nereda)",
      "Donja traka kartica: kartica Historija zamijenjena karticom Sačuvano — ikona oznake s brojanikom",
      "Sačuvane stavke redizajnirane u stilu projektnih kartica — obrubljene kartice s malim ikonama gumbima, bez vremenskog pečata",
      "Ikone obojene po kategoriji (cijevi=plava, ploče=jantarna, konstrukcioni=zelena, šipke=ljubičasta) u ladičaru sačuvanih i projektnim kalkulacijama",
      "Oznake materijala usklađene bojom s kategorijom profila za brzo prepoznavanje",
    ],
    fixed: [
      "Quick Calc no longer resets price basis, unit price, currency, waste, VAT, and rounding precision when loading a result — user settings are now preserved app-wide",
    ],
    fixed_bs: [
      "Brzi izračun više ne resetuje osnovu cijene, jediničnu cijenu, valutu, otpad, PDV i preciznost zaokruživanja pri učitavanju rezultata — korisničke postavke su sada sačuvane u cijeloj aplikaciji",
    ],
  },
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


