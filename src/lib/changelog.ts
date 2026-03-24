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
    version: "2.2.2",
    date: "2026-03-24",
    changed: [
      "Specs panel Alternatives now compare compatible profile families by logical peers like IPE 100 vs IPN 100 or HEA 100 instead of surfacing only the active family",
      "Alternatives are now narrowed to genuinely close suggestions, so far-away sizes such as IPE 600 no longer appear when the active selection is around 100",
      "Specs panel Alternatives now use compact full-width cards that keep the content grouped inside each suggestion instead of stretching every metric into a flat table row",
      "Selecting a compatible manual-profile alternative can now switch both the profile type and dimensions in one action",
    ],
    changed_bs: [
      "Alternative u panelu Specifikacije sada porede kompatibilne porodice profila po logickim parovima kao sto su IPE 100 prema IPN 100 ili HEA 100 umjesto da prikazuju samo aktivnu porodicu",
      "Alternative su sada suzene na stvarno bliske prijedloge, pa se udaljene velicine poput IPE 600 vise ne pojavljuju kada je aktivni odabir oko 100",
      "Alternative u panelu Specifikacije sada koriste kompaktne kartice pune sirine koje drze sadrzaj grupisanim unutar svakog prijedloga umjesto razvucenih ravnih redova",
      "Odabir kompatibilne alternative rucnog profila sada moze promijeniti i tip profila i dimenzije u jednoj akciji",
    ],
    fixed: [
      "Square hollow and rectangular tube Alternatives now link across equivalent outer sizes and wall thicknesses instead of staying isolated inside a single manual profile family",
    ],
    fixed_bs: [
      "Alternative za kvadratne i pravougaone cijevi sada povezuju ekvivalentne vanjske dimenzije i debljine stijenke umjesto da ostanu izolovane unutar jedne rucne porodice profila",
    ],
  },
  {
    version: "2.2.1",
    date: "2026-03-24",
    changed: [
      "Structural Alternatives now use a searchable, sortable family list with direct profile switching, selected-first ordering, and full-job impact values for the active size family",
      "Manual and commercial profile families now use the same Alternatives list style as structural profiles instead of a separate lookup table",
      "Alternatives rows were tightened into a denser list with smaller typography to match the compact desktop Specs layout",
      "Alternatives now use only the blue active selection state and no longer show a shifting secondary badge",
      "Specs panel now focuses the lower section on dimensions and alternatives by removing the separate Formula and References cards",
    ],
    changed_bs: [
      "Konstrukcione Alternative sada koriste pretrazivu i sortiranu listu sa direktnim prebacivanjem profila, redoslijedom aktivni-prvo i vrijednostima uticaja na cijeli posao za aktivnu porodicu velicina",
      "Rucne i komercijalne porodice profila sada koriste isti stil liste Alternative kao i konstrukcioni profili umjesto odvojene lookup tabele",
      "Redovi Alternative su zbijeni u guscu listu sa manjom tipografijom kako bi odgovarali kompaktnijem desktop rasporedu panela Specifikacije",
      "Alternative sada koriste samo plavo stanje aktivnog odabira i vise ne prikazuju pomjerajucu sekundarnu oznaku",
      "Panel Specifikacije sada fokusira donji dio na dimenzije i alternative uklanjanjem posebnih kartica Formula i Reference",
    ],
    fixed: [
      "Specs panel Alternatives labels now fall back to readable copy instead of exposing raw translation keys when localized strings are unavailable",
      "Specs panel Alternatives rows no longer stretch and misalign inside the desktop column layout",
      "Square hollow sections in the Specs panel now render as true square tubes instead of reusing the same rectangular SVG proportions as RHS profiles",
    ],
    fixed_bs: [
      "Oznake Alternative u panelu Specifikacije sada koriste citljiv rezervni tekst umjesto prikaza sirovih prevodnih kljuceva kada lokalizovani stringovi nisu dostupni",
      "Redovi Alternative u panelu Specifikacije se vise ne razvuku i ne poravnavaju pogresno unutar desktop rasporeda kolona",
      "Kvadratne cijevi u panelu Specifikacije sada se crtaju kao pravi kvadratni profili umjesto da koriste iste pravougaone SVG proporcije kao RHS profili",
    ],
  },
  {
    version: "2.2.0",
    date: "2026-03-23",
    added: [
      "Desktop column mode now includes a dedicated Specs panel with synced engineering-style profile drawings, key dimensions, and family lookup tables",
      "Profile lookup now covers every profile type with repo-owned numeric spec data, including live manual-profile drawings and EN family tables for structural sections",
    ],
    added_bs: [
      "Desktop rezim kolona sada ukljucuje poseban panel Specifikacije sa sinhronizovanim inzenjerskim crtezima profila, kljucnim dimenzijama i tabelama porodice profila",
      "Pregled profila sada pokriva sve tipove profila uz numericke specifikacije iz repozitorija, ukljucujuci zive crteze rucnih profila i EN tabele porodice za konstrukcione sekcije",
    ],
    changed: [
      "Specs panel drawings now use cleaner engineering callouts, unequal-angle support, and more distinct silhouettes for IPN/IPE/HE, UPN/UPE, and corrugated profiles",
      "Specs cards and family lookup tables now surface denser engineering data including kg/m, inner dimensions, clear heights, flange projection, and similarity-sorted manual family rows",
      "Saved calculations now use the same result-style card hierarchy across drawers, mobile screens, and column mode",
      "Saved entries and project calculations now show quantity, piece length, unit weight, total weight, total cost, and surface area in a clearer layout",
      "Project list and project detail views were redesigned around totals-first summaries, grouped actions, painting stats, and refreshed breakdown cards",
    ],
    changed_bs: [
      "Crtezi u panelu Specifikacije sada koriste cisce inzenjerske oznake, podrsku za nejednake L profile i jasnije siluete za IPN/IPE/HE, UPN/UPE i valovite profile",
      "Kartice specifikacija i lookup tabele porodice sada prikazuju gusce inzenjerske podatke ukljucujuci kg/m, unutrasnje dimenzije, ciste visine, izbacaj pojasa i slicnosno sortirane rucne redove porodice",
      "Sacuvani izracuni sada koriste istu hijerarhiju kartica kao rezultat kroz drawere, mobilne ekrane i rezim kolona",
      "Sacuvane stavke i kalkulacije u projektu sada jasnije prikazuju kolicinu, duzinu komada, masu po komadu, ukupnu masu, ukupnu cijenu i povrsinu",
      "Lista projekata i detalji projekta su redizajnirani oko pregleda sa glavnim totalima, grupisanih akcija, statistike farbanja i osvjezenih breakdown kartica",
    ],
    fixed: [
      "L-angle drawings now keep the thickness callout outside the profile and manual angle lookup now includes unequal standard sizes",
    ],
    fixed_bs: [
      "Crtezi L profila sada drze oznaku debljine izvan profila, a rucni lookup za uglove sada ukljucuje i nejednake standardne velicine",
    ],
  },
  {
    version: "2.1.0",
    date: "2026-03-23",
    changed: [
      "Results were redesigned across desktop and column mode with a grouped summary, quick metrics, clearer cost breakdown, and compact references",
      "Column-mode result panels now keep the summary and primary actions sticky while you scroll through the details",
      "Calculation details now switch to stacked rows in narrow result columns for better readability without horizontal scrolling",
    ],
    changed_bs: [
      "Rezultati su redizajnirani na desktopu i u rezimu kolona sa grupisanim pregledom, brzim metrikama, jasnijom razradom cijene i kompaktnim referencama",
      "Panel rezultata u rezimu kolona sada drzi pregled i glavne akcije ljepljivim dok skrolate kroz detalje",
      "Detalji izracuna se sada prikazuju kao slozeni redovi u uskim kolonama rezultata radi bolje citljivosti bez horizontalnog skrolanja",
    ],
  },
  {
    version: "2.0.0",
    date: "2026-03-23",
    added: [
      "TweetDeck-style multi-column layout — open calculator, result, saved, projects, settings, and compare panels side-by-side on wide desktops (≥1440px)",
      "Resizable columns — drag handles between columns to manually resize each panel",
      "Column controls — add, remove, reorder, and switch panel types via column header dropdowns and buttons",
      "Columns toggle button in sidebar with Ctrl+Shift+L keyboard shortcut",
      "Column layout persists across page refreshes via localStorage",
      "Full-viewport immersive mode — multi-column layout fills 100vh with independent per-column scrolling",
    ],
    added_bs: [
      "TweetDeck-stil višekolonski raspored — otvorite kalkulator, rezultat, sačuvano, projekte, postavke i usporedbu jedan pored drugog na širokim ekranima (≥1440px)",
      "Promjena veličine kolona — povucite ručke između kolona da ručno promijenite veličinu svakog panela",
      "Kontrole kolona — dodajte, uklonite, preuredite i promijenite tip panela putem padajućih izbornika i dugmadi u zaglavlju kolone",
      "Dugme za kolone u bočnoj traci sa Ctrl+Shift+L prečicom na tastaturi",
      "Raspored kolona se čuva između osvježavanja stranice putem localStorage",
      "Režim punog ekrana — višekolonski raspored zauzima 100vh sa nezavisnim skrolanjem po koloni",
    ],
    changed: [
      "Desktop result panel sidebar widened from 300/340px to 340/400px (lg/xl breakpoints)",
      "Result panels now use a grouped summary, quick metrics, clearer cost breakdown, and sticky top actions in column mode for faster scanning",
      "Drawers are automatically suppressed when their content is already visible as a column",
      "Quantity stepper buttons and unit price input made responsive for narrow column widths",
      "JSON external store now caches parsed values to prevent infinite re-render loops with useSyncExternalStore",
      "Column mode now adapts to actual workspace width, uses an Add panel picker for unused panels, and renders the result panel embedded inside the column shell instead of nesting a second outer card",
    ],
    changed_bs: [
      "Panel rezultata sada koristi grupisani pregled, brze metrike, jasniju razradu cijene i ljepljive gornje akcije u rezimu kolona radi brzeg citanja",
      "Režim kolona se sada prilagodjava stvarnoj sirini radnog prostora, koristi Dodaj panel birac za neiskoristene panele i prikazuje rezultat ugradjen u okvir kolone bez dodatne spoljne kartice",
      "Bočna traka rezultata na desktopu proširena sa 300/340px na 340/400px (lg/xl prijelomne tačke)",
      "Ladičari se automatski sakrivaju kada je njihov sadržaj već vidljiv kao kolona",
      "Dugmad za količinu i unos cijene po jedinici prilagođeni za uske širine kolona",
      "JSON eksterni store sada kešira parsirane vrijednosti da spriječi beskonačne petlje renderiranja sa useSyncExternalStore",
    ],
    fixed: [
      "Compare panel now renders full content in column mode instead of placeholder text",
      "Quantity +/- buttons no longer overflow into adjacent unit price field in narrow layouts",
      "Saved column layouts are normalized on load, duplicate panels are blocked, resize handles respect one shared minimum width, and over-wide saved layouts now fall back to the standard desktop view until enough space is available",
    ],
    fixed_bs: [
      "Sacuvani rasporedi kolona se sada normalizuju pri ucitavanju, dupli paneli su blokirani, rucke za promjenu velicine koriste jednu zajednicku minimalnu sirinu, a preuski prikazi privremeno vracaju standardni desktop raspored dok nema dovoljno prostora",
      "Panel za usporedbu sada prikazuje potpuni sadržaj u režimu kolona umjesto teksta zamjene",
      "Dugmad za količinu +/- se više ne preklapaju sa susjednim poljem za cijenu u uskim rasporedima",
    ],
  },
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
      "Calculator result receipt now shows surface area between weight and cost sections when available",
      "Clipboard copy format includes surface area line when present",
      "Project aggregate cards include painting data when surface area is available",
    ],
    changed_bs: [
      "Račun rezultata kalkulatora sada prikazuje površinu između sekcija mase i cijene kada je dostupna",
      "Format kopiranja u međuspremnik uključuje red sa površinom kada je prisutan",
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


