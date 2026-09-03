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
    version: "3.24.0",
    date: "2026-09-03",
    added: [
      "Manage mode for assembly templates: a Browse / Manage toggle in the templates dialog, listing your own templates and the built-in EN standards with an editor bound to the selected row",
      "Edit a saved template in place: rename, re-categorise, rewrite the description, add or remove component cuts, step piece counts, and edit labour hours and hardware cost lines",
      "Add a component by command: type a cut the way you would anywhere else in the app (plt 200x160x12 x2 s235) to append it to a template",
      "Remove and restore standard EN templates: take standards you never use out of the picker, with a per-item Restore and Restore all, kept across reloads",
      "Duplicate any template into an editable copy: built-in standards stay read-only, duplicating one gives you a copy you can change",
      "Undo on a delete: removing a template or a standard raises a toast with Undo",
      "Add parts to a saved assembly by typing a cut: the same inline field on the expanded Parts card, no trip through the calculator, and a multi-item line appends every item at once",
      "Parts and assemblies in one list: the Parts / Assemblies / History tabs are replaced by an All / Parts / Assemblies chip, so nothing jumps between tabs as you work on it",
      "Use and Project as buttons on every row: adding a saved part or assembly to a project no longer hides in a hover-only icon row",
      "Save asks where the line goes: one tap still bookmarks a new part, and the control beside it offers a new part, an existing part, a new assembly, an existing assembly, or straight onto a project",
      "Assemblies can hold a single part, so you can start one and grow it",
      "One overlay for the whole app: every dialog and sheet now shares a shell that owns the backdrop, focus trap, Escape, header and footer, in four sizes",
      "Saving and adding to a project are one step: the project list opens inside the same overlay, with a field to create one on the spot"
    ],
    changed: [
      "Overlays are centred on a desktop and slide up from the bottom on a phone, everywhere, instead of each dialog deciding for itself",
      "The rename sheet no longer opens itself after saving a multi-item line — naming sits beside the option that creates the thing",
      "History left the Parts surface — it repeated the calculator's session tape, which now has the clear-all the phone was missing"
    ],
    added_bs: [
      "Način uređivanja šablona sklopova: prekidač Pregled / Uredi u dijalogu šablona, sa listom vlastitih šablona i ugrađenih EN standarda te uređivačem vezanim za izabrani red",
      "Uređivanje sačuvanog šablona: preimenovanje, promjena kategorije i opisa, dodavanje i uklanjanje rezova, promjena broja komada te uređivanje radnih sati i stavki troška okova",
      "Dodavanje komponente komandom: upišite rez kao i svugdje u aplikaciji (plt 200x160x12 x2 s235) da ga dodate u šablon",
      "Uklanjanje i vraćanje standardnih EN šablona: izbacite standarde koje ne koristite iz izbornika, uz pojedinačno Vrati i Vrati sve, sačuvano i nakon osvježavanja",
      "Dupliciranje bilo kojeg šablona u kopiju za uređivanje: ugrađeni standardi ostaju samo za čitanje, dupliciranjem dobijate kopiju koju možete mijenjati",
      "Vraćanje nakon brisanja: uklanjanje šablona ili standarda prikazuje poruku sa dugmetom Vrati",
      "Dodavanje dijelova u sačuvani sklop upisivanjem reza: isto polje na proširenoj kartici Dijelovi, bez odlaska u kalkulator, a linija sa više stavki dodaje sve odjednom",
      "Dijelovi i sklopovi u jednoj listi: kartice Dijelovi / Sklopovi / Historija zamijenjene su filterom Sve / Dijelovi / Sklopovi, pa ništa ne iskače iz liste dok radiš na tome",
      "Iskoristi i Projekat kao dugmad u svakom redu: dodavanje sačuvanog dijela ili sklopa u projekat više se ne krije u redu ikona koji se vidi tek na hover",
      "Čuvanje pita gdje linija ide: jedan dodir i dalje sprema novi dio, a dugme pored nudi novi dio, postojeći dio, novi sklop, postojeći sklop ili odmah projekat",
      "Sklop može imati samo jedan dio, pa ga možeš započeti i dograđivati",
      "Jedan prozor za cijelu aplikaciju: svi dijalozi i listovi sada dijele isti okvir koji nosi pozadinu, zadržavanje fokusa, Escape, zaglavlje i podnožje, u četiri veličine",
      "Čuvanje i dodavanje u projekat su jedan korak: lista projekata se otvara u istom prozoru, uz polje za kreiranje novog"
    ],
    changed_bs: [
      "Prozori su centrirani na desktopu i klize odozdo na telefonu, svugdje, umjesto da svaki dijalog odlučuje sam",
      "List za preimenovanje se više ne otvara sam nakon čuvanja linije sa više stavki — imenovanje stoji uz opciju koja stvara tu stvar",
      "Historija je uklonjena sa Dijelova — ponavljala je traku sesije u kalkulatoru, koja sada ima i brisanje svega koje je nedostajalo na telefonu"
    ],
    fixed: [
      "'Add a part' no longer disappears when the command bar is empty — with a line it folds that line in, without one it opens the field",
      "The 'added as a part' confirmation never appeared, because the add returned its result from inside a deferred React state updater",
      "Removing and reordering parts reported the wrong result for the same reason",
      "Creating a project and adding to it in one gesture reported failure, for the same reason again — project writes now fold synchronously",
      "The assembly badge said '1 parts' — both part counts now pluralise properly",
      "Two raw translation keys in the templates dialogs: the 'All categories' filter pill and the Category field label showed their key instead of their text"
    ],
    fixed_bs: [
      "'Dodaj dio' više ne nestaje kada je komandna traka prazna — sa linijom je ubacuje, bez nje otvara polje",
      "Potvrda 'dodano kao dio' se nikada nije prikazivala, jer je dodavanje vraćalo rezultat iz odgođenog React ažuriranja stanja",
      "Uklanjanje i promjena redoslijeda dijelova javljali su pogrešan rezultat iz istog razloga",
      "Kreiranje projekta i dodavanje u njega u jednom potezu javljalo je grešku, iz istog razloga — upisi u projekte sada se izvršavaju sinhrono",
      "Oznaka sklopa je pisala '1 dijelova' — oba brojanja dijelova sada koriste ispravnu množinu",
      "Dva neprevedena ključa u dijalozima šablona: filter 'Sve kategorije' i oznaka polja Kategorija prikazivali su ključ umjesto teksta"
    ]
  },
  {
    version: "3.23.0",
    date: "2026-09-01",
    added: [
      "Modular Sub-Assembly Templates: Pre-configured standard fabrication components (Stair Step Treads, Railing Posts with Base Plates, Baluster Infill Panels, Beams with Welded End Plates, Fence Panels) composed of mixed profile cuts, plates, hardware, and shop labor",
      "Insert Templates with Multiplier (×N): Pick any assembly template, specify the unit count (e.g. ×15), and automatically generate, scale, and insert all individual cuts, plates, bolts, and labor into the project under that sub-assembly",
      "In-Place Sub-Assembly Scaling (×N): Direct multiplier button on sub-assembly section headers to scale all member piece counts up or down in one click",
      "Save Sub-Assembly as Custom Template: Export any combination of profiles, plates, and components from a project into your custom template library for reuse across jobs",
      "Start New Project from Template: Quickly initialize complete fabrication projects from predefined standard or custom assembly templates"
    ],
    added_bs: [
      "Modularni šabloni podsklopova: Standardne fabričke komponente (Gazišta stepeništa, Stubovi ograde sa stopama, Polja ograde, Nosači sa čeonim pločama, Ogradni paneli) sastavljene od kombinacije profila, limova, okova i radnih sati",
      "Ubacivanje šablona s množiocem (×N): Izaberite šablon sklopa, odredite količinu (npr. ×15) i automatski generišite, skalirajte i ubacite sve pojedinačne rezove, ploče, vijke i radne sate u projekat",
      "Skaliranje podsklopa na licu mjesta (×N): Brzo dugme na zaglavlju podsklopa za množenje količine svih pripadajućih elemenata jednim klikom",
      "Čuvanje podsklopa kao vlastitog šablona: Sačuvajte bilo koji sklop profila i limova iz projekta u biblioteku šablona za brzu ponovnu upotrebu",
      "Kreiranje novog projekta iz šablona: Pokretanje novog projekta direktno iz definisanih standardnih ili vlastitih šablona"
    ]
  },
  {
    version: "3.22.0",
    date: "2026-09-01",
    added: [
      "1D cutting stock optimizer (linear nesting) for steel profiles. Groups project items by cross-section and computes optimal cutting schedules across standard stock lengths (6m, 12m, custom) with saw kerf loss compensation",
      "2D rectangular plate and sheet cutting optimizer (nesting) supporting standard European sheet formats (1000×2000, 1250×2500, 1500×3000, 2000×6000 mm, custom) with 90° rotation, laser/saw kerf, and edge trim margins",
      "Material Procurement & Steel Purchasing Overview (BOM) in Project Detail. Recommends exact stock bars and master plates to order from steel suppliers, computes raw purchasing weight vs finished net weight, scrap loss %, and includes one-click 'Copy Supplier RFQ'",
      "Visual bar and plate cut map diagrams in Project Detail with proportional colored cut segments, saw kerf dividers, scrap drop maps, and printable workshop saw/shear cut sheets",
      "Offline local JSON backup and restore. Download a full standalone .json backup of your saved parts, assemblies, projects, price books, and settings, or restore with Merge and Replace modes",
      "Projects Pipeline KPI Ribbon: Top summary strip displaying total active projects, total steel weight in tonnes, quoted pipeline value, and active client count",
      "Due Date Urgency Badges: Real-time badges on projects for overdue jobs, jobs due today, and jobs due soon",
      "Fabrication Categories & Filtering: Assign projects to Structural, Stairs & Railings, Roof Trusses, Gates & Fences, Sheet Metal, or Maintenance with instant filter chips",
      "Multi-Select Batch Actions: Select multiple projects for bulk archive, bulk delete, or combined CSV material export",
      "Workshop Job Costing & Labor Quoting: Add estimated shop fabrication & welding hours with hourly rates, plus extra job expenses (hardware, transport, galvanizing/finishing) with live grand total quoting and printable quote breakdown",
      "Per-Project Margin Override: Set custom markup margin percentages directly on individual projects without altering global defaults",
      "Sub-Assembly Sections: Group project items into distinct sub-assemblies (e.g. Stringers, Treads, Handrails) with section subtotals and inline tagging",
      "In-Place Fast Command Bar: Type command queries directly inside the project detail view to append items without leaving the project"
    ],
    added_bs: [
      "1D optimizator rezanja (linearno gniježđenje) za čelične profile. Grupiše stavke projekta po poprečnom presjeku i računa optimalan raspored rezanja za standardne dužine šipki (6m, 12m, prilagođeno) uz kompenzaciju debljine reza pile",
      "2D optimizator rezanja (gniježđenje) za limove i ploče koji podržava standardne evropske formate (1000×2000, 1250×2500, 1500×3000, 2000×6000 mm, prilagođeno) uz rotaciju od 90°, debljinu reza lasera/pile i margine rubova",
      "Pregled i specifikacija nabavke materijala (BOM) u detaljima projekta. Preporučuje tačne šipke i osnovne table limova za narudžbu od dobavljača, računa sirovu masu u odnosu na neto masu, postotak otpada i sadrži opciju 'Kopiraj upit za ponudu (RFQ)'",
      "Vizuelni dijagrami rezanja šipki i 2D ploča u detaljima projekta s proporcionalnim segmentima u boji, oznakama rezova, otpadom i planom za radionicu",
      "Lokalna JSON sigurnosna kopija i vraćanje podataka. Preuzmite kompletnu samostalnu .json datoteku sačuvanih dijelova, sklopova, projekata, cjenovnika i postavki, ili vratite podatke uz načine Spoji ili Zamijeni",
      "KPI traka pregleda projekata: Prikaz ukupnog broja aktivnih poslova, ukupne mase čelika u tonama, vrijednosti poslova i broja klijenata",
      "Oznake hitnosti rokova: Automatski indikatori za poslove koji kasne, poslove s rokom danas i poslove s rokom uskoro",
      "Kategorije izrade i filtriranje: Kategorizacija poslova (Konstrukcije, Stepeništa i ograde, Krovne rešetke, Kapije i ograde, Limarija, Održavanje) uz brze filtere",
      "Grupne radnje (Multi-Select): Odabir više projekata za grupno arhiviranje, brisanje ili izvoz zbirnog CSV-a",
      "Kalkulacija radnih sati i troškova: Unos radnih sati bravarije i zavarivanja uz satnicu, te dodatnih troškova (vijci, prevoz, pocinčavanje) uz automatski obračun ukupne ponude",
      "Prilagođena marža po projektu: Podešavanje postotka marže za svaki projekat zasebno bez promjene globalnih postavki",
      "Podjela po podsklopovima: Grupisanje stavki u sklopove (npr. Nosači, Gazišta, Rukohvati) uz podzbirove i jednostavno označavanje",
      "Brza komandna linija u projektu: Direktno dodavanje stavki unosom komande unutar detalja projekta bez napuštanja stranice"
    ],
  },
  {
    version: "3.21.0",
    date: "2026-08-17",
    changed: [
      "Project paint is a list of coats now. Surface comes from the items; add a primer and a finish with their own price per kg and coverage. Settings holds the default rate you start from",
      "A multi-item line no longer repeats its parts under the hero. The assembly list stays in the breakdown — tap a row there to aim the drawing",
      "The breakdown drawing is a short 3D stub of the real section — same millimetres, cut-face callouts, no extra library",
      "A multi-item line on the desktop greys finished items in the command bar, same as the phone — tap one to open its tokens",
      "Add from calculator on an empty compare tab adds the current line on the spot instead of sending you back to type it again",
      "One name for one thing: the phone's Library sheet is Parts like the desktop tab, the second-item button reads + item everywhere, and the phone's KG / € toggle reads Weight / Price like the desktop",
      "Copy on the phone's result sheet now means Copy summary — the ambiguous plain Copy is gone. The action row and suggestion chips are 44 px tall, easier on the thumb",
      "Switching workspace tabs updates the address bar, so a refresh or a pasted link lands back on the tab you were reading",
      "The ··· row menus work from the keyboard now: arrows walk the items, Home and End jump, Escape closes back onto the button that opened them",
      "Saving an assembly asks for its name straight away instead of trusting a five-second toast",
      "Shared controls converge on one corner-radius scale — buttons and compact cards at 12px, workspace panels at 18px — replacing a dozen one-off pixel values",
    ],
    changed_bs: [
      "Boja na projektu je lista slojeva. Površina dolazi iz stavki; dodaj temelj i završni sloj sa svojom cijenom po kg i pokrivnošću. U postavkama je zadana cijena od koje krećeš",
      "Linija s više stavki više ne ponavlja dijelove ispod heroja. Lista sklopa ostaje u pregledu — tamo dodirom biraš crtež",
      "Crtež u pregledu je kratki 3D komad stvarnog presjeka — isti milimetri, mjere na rezu, bez nove biblioteke",
      "Linija s više stavki na desktopu sive završene stavke u komandnoj traci, isto kao na telefonu — dodirom otvaraš tokene",
      "Dodaj iz kalkulatora na praznoj tabi poređenja odmah dodaje trenutnu liniju, umjesto da te šalje nazad da je kucaš iznova",
      "Jedan naziv za jednu stvar: Biblioteka na telefonu zove se Dijelovi kao tab na desktopu, dugme za drugu stavku glasi + stavka svugdje, i prekidač KG / € na telefonu piše Težina / Cijena kao na desktopu",
      "Kopiraj na telefonu znači kopiraj sažetak — dvosmisleno obično Kopiraj je uklonjeno. Red akcija i čipovi prijedloga imaju 44 px, lakše za palac",
      "Prebacivanje tabi radnog prostora ažurira adresnu traku, pa osvježavanje ili zalijepljeni link vraća na tab koji ste gledali",
      "Meniji ··· sada rade i s tastature: strelice prolaze kroz stavke, Home i End skaču, Escape zatvara nazad na dugme koje ih je otvorilo",
      "Čuvanje sklopa odmah traži njegovo ime, umjesto da se oslanja na toast od pet sekundi",
      "Dijeljene kontrole se slažu na jednu ljestvicu radijus uglova — dugmad i kompaktnije kartice na 12px, radni paneli na 18px — umjesto desetak razbacanih pikselnih vrijednosti",
    ],
    fixed: [
      "A second profile, length, quantity or grade on one line was silently ignored while its chip looked active. Duplicates now show struck-through with an explanation, so the number on the card is never a surprise",
      "The session tape's running total counted only the six rows on screen once the tape grew longer; it sums every line logged this session now",
      "Opening an item from compare or parts replaced whatever was on the line without a trace; a Line replaced toast now offers Undo",
      "On load, the big number could briefly show the previous line's total before the restored line settled; replaced lines snap into place instead of tweening across two unrelated results",
      "The loading splash retired the moment the app is interactive — a fast load no longer waits out its own fade animation",
    ],
    fixed_bs: [
      "Drugi profil, dužina, količina ili kvalitet u jednom redu bio je tiho ignorisan dok je njegov čip izgledao aktivan. Duplikati su sada precrtani s objašnjenjem, da broj na kartici nikad nije iznenađenje",
      "Zbir trake sesije računao je samo šest redova na ekranu kad traka poraste; sada sabira svaku liniju zapisanu u sesiji",
      "Otvaranje stavke iz poređenja ili dijelova zamijenilo je ono što je bilo u redu bez traga; toast Linija zamijenjena sada nudi Vrati",
      "Pri učitavanju veliki broj je kratko mogao pokazati ukupnost prethodne linije prije nego što se vraćena linija smirila; zamijenjene linije skaču na mjesto umjesto da se animiraju kroz dva nepovezana rezultata",
      "Učitavajući splash se povlači onog trenutka kad je aplikacija interaktivna — brzo učitavanje više ne čeka svoju fade animaciju",
    ],
  },
  {
    version: "3.20.0",
    date: "2026-08-17",
    added: [
      "Nearby sizes under the breakdown — tap HEB 120 or HEA 140 to swap the section without retyping the line",
      "Painting rate, coverage and coats on a project, plus a note on each line. Both print on the quote",
    ],
    changed: [
      "Size chips labelled Parts come from saved parts (and leftover old presets). Saving a part is how you keep a shop size",
    ],
    added_bs: [
      "Slične dimenzije ispod pregleda — dodirni HEB 120 ili HEA 140 da zamijeniš presjek bez ponovnog kucanja linije",
      "Cijena boje, pokrivnost i slojevi na projektu, plus bilješka na svakoj stavci. Oboje ide na ponudu",
    ],
    changed_bs: [
      "Čipovi dimenzija označeni Dijelovi dolaze iz sačuvanih dijelova (i starih predložaka). Čuvanje dijela je kako se pamti radionička dimenzija",
    ],
  },
  {
    version: "3.19.0",
    date: "2026-08-12",
    added: [
      "Settings, Projects and Parts rebuilt — grouped searchable settings, a project list and detail page, and Saved renamed to Parts with Assemblies and History",
    ],
    changed: [
      "The phone keypad follows the query: letters while you pick a profile or type a grade, a number pad for size, length, quantity and rate, and a short New / Tweak / Share bar once the line computes. Tweak or a tap on the query line brings the numbers back; ABC and 123 switch layouts; Done puts the bar away. The number pad has a space key, and a finished size plus the next length digit land as two tokens rather than one glued word",
      "Library and Settings fill the phone screen instead of sitting in an 82% sheet. Hold a length, quantity or rate chip to nudge the number. Share on the phone sends the formatted result and a PNG card, not only a URL. An assembly's share card and breakdown list every part under the line total",
    ],
    added_bs: [
      "Postavke, Projekti i Dijelovi iznova — grupirane pretražive postavke, lista i detalj projekta, i Sačuvano preimenovano u Dijelove sa Sklopovima i Historijom",
    ],
    changed_bs: [
      "Tastatura na telefonu prati upit: slova dok birate profil ili kucate kvalitet, brojčana tastatura za dimenziju, dužinu, količinu i cijenu, i kratka traka Novo / Mijenjaj / Dijeli kad linija izračuna. Mijenjaj ili dodir na liniju upita vraća brojeve; ABC i 123 mijenjaju raspored; Gotovo sklanja traku. Brojčana tastatura ima razmak, i gotova dimenzija plus sljedeća cifra dužine padaju kao dva tokena, ne kao jedna slijepljena riječ",
      "Biblioteka i Postavke pune ekran telefona umjesto 82% panela. Zadržite čip dužine, količine ili cijene da pomaknete broj. Dijeljenje na telefonu šalje formatirani rezultat i PNG karticu, ne samo URL. Sklop na dijeljenju i u pregledu nabraja svaki dio ispod zbira",
    ],
  },
  {
    version: "3.18.0",
    date: "2026-08-11",
    changed: [
      "The > command palette is gone, on phone and on desktop. The > key has left the keypad — the space bar takes its width — and the desktop top bar no longer carries the > hint. Everything the palette could reach is still one tap or one shortcut away: the tabs and the library sheet for getting somewhere, the action row for save, compare and share",
    ],
    fixed: [
      "On phone the keypad rested on a band of empty screen instead of the bottom edge. The shell measured its column in dvh inside a fixed full-screen frame, and on a device where those two differ the leftover showed as a strip beneath the keys. The column now fills the frame exactly, so the bottom row of keys sits on the edge of the screen",
    ],
    changed_bs: [
      "Komandna paleta > je uklonjena, i na telefonu i na desktopu. Tipka > je nestala s tastature — razmaknica je preuzela njenu širinu — a gornja traka na desktopu više ne prikazuje > napomenu. Sve što je paleta nudila i dalje je jedan dodir ili jedna prečica daleko: kartice i biblioteka za navigaciju, red akcija za čuvanje, poređenje i dijeljenje",
    ],
    fixed_bs: [
      "Na telefonu je tastatura stajala na traci praznog ekrana umjesto na donjoj ivici. Ljuska je mjerila svoju kolonu u dvh unutar fiksnog okvira preko cijelog ekrana, a na uređaju gdje se to dvoje razlikuje ostatak se vidio kao traka ispod tipki. Kolona sada tačno popunjava okvir, pa donji red tipki stoji na ivici ekrana",
    ],
  },
  {
    version: "3.17.4",
    date: "2026-08-08",
    fixed: [
      "In the session list, a longer number pushed the unit onto its own line — KM 1,396.41 broke in half — even with plenty of room beside it. The columns were a fixed width; they now grow with the number and never break it",
    ],
    changed: [
      "The library sheet on phone now shows the name of the open tab only; the others are their icon and count. All four fit on one row again, in any language",
    ],
    fixed_bs: [
      "U listi sesije je duži broj gurao jedinicu u novi red — KM 1.396,41 bi se prelomio napola — iako je bilo dovoljno mjesta pored. Kolone su bile fiksne širine; sada rastu s brojem i nikada ga ne lome",
    ],
    changed_bs: [
      "Biblioteka na telefonu sada prikazuje naziv samo otvorene kartice; ostale su ikona i broj. Sve četiri opet stanu u jedan red, na svakom jeziku",
    ],
  },
  {
    version: "3.17.3",
    date: "2026-08-08",
    fixed: [
      "The four figures above the desktop breakdown were squeezed to a sliver and cut off mid-number. They now sit on their own row at full width",
      "The fourth library tab ran off the edge of a phone screen. The tabs are sized to their own labels now and the row scrolls, so no label is ever cut — in any language",
    ],
    fixed_bs: [
      "Četiri brojke iznad desktop pregleda bile su stisnute i odsječene usred broja. Sada stoje u vlastitom redu pune širine",
      "Četvrta kartica biblioteke izlazila je van ivice ekrana telefona. Kartice su sada širine vlastitog naziva a red se pomjera, pa nijedan naziv nije odsječen — ni na jednom jeziku",
    ],
  },
  {
    version: "3.17.2",
    date: "2026-08-08",
    fixed: [
      "Adding a line to the session no longer nudges the whole screen down. The session row was growing a second line as soon as it had numbers to show; it now shows the total in whichever unit the big number is in, plus how many lines it came from, and keeps one fixed height whether the session is empty or full",
    ],
    fixed_bs: [
      "Dodavanje linije u sesiju više ne pomjera cijeli ekran nadolje. Red sesije je dobijao drugi red čim je imao brojeve za prikazati; sada prikazuje zbir u jedinici u kojoj je i veliki broj, uz broj linija, i zadržava istu visinu bez obzira je li sesija prazna ili puna",
    ],
  },
  {
    version: "3.17.1",
    date: "2026-08-08",
    fixed: [
      "On a phone, a long line pushed the command input and the bottom row of keys off the screen. The chip box now stops at two rows and follows the cursor, so the line you are typing and the keys you type it with are always visible",
      "The keypad ended flush with the bottom of the screen, so on phones with a home indicator the bottom row sat underneath it. It now keeps clear",
      "Everything on the phone is a little tighter — smaller keys, a slightly smaller headline number, less padding — so the whole screen fits on shorter phones too",
    ],
    fixed_bs: [
      "Na telefonu je duga linija gurala polje za unos i donji red tipki van ekrana. Okvir sa čipovima sada staje na dva reda i prati kursor, pa su linija koju kucate i tipke kojima je kucate uvijek vidljivi",
      "Tastatura je završavala tačno na dnu ekrana, pa je na telefonima sa home indikatorom donji red bio ispod njega. Sada ostavlja razmak",
      "Sve na telefonu je nešto zbijenije — manje tipke, malo manji glavni broj, manje razmaka — pa cijeli ekran stane i na kraće telefone",
    ],
  },
  {
    version: "3.17.0",
    date: "2026-08-08",
    changed: [
      "The phone screen is rebuilt to the new design: the weight/price switch is now two small pills in the hero's label row, and the two-stat card became a single line — per piece, the other total, and Breakdown to open the full figures. Save, Compare and Share sit under the number instead of hiding in the sheet",
      "The phone finally has a session: a ribbon under the hero shows the running total with a + to add the current line, and the library gained a SESSION tab listing every logged line with its totals and Save as project",
      "A > key on the keypad opens the command palette — until now it was keyboard-only, so phones had no way to reach it",
      "The desktop result gained a four-cell glance row and a + another item action",
    ],
    changed_bs: [
      "Ekran telefona je prerađen prema novom dizajnu: prekidač masa/cijena su sada dvije male pilule u redu oznake, a kartica sa dvije statistike postala je jedna linija — po komadu, drugi zbir i Pregled za pune brojke. Sačuvaj, Uporedi i Podijeli stoje ispod broja umjesto da se kriju u listu",
      "Telefon konačno ima sesiju: traka ispod glavnog broja prikazuje tekući zbir sa + za dodavanje trenutne linije, a biblioteka je dobila karticu SESIJA sa svim upisanim linijama, zbirovima i opcijom Sačuvaj kao projekat",
      "Tipka > na tastaturi otvara komandnu paletu — do sada je bila samo za tastaturu, pa telefoni nisu imali pristup",
      "Desktop rezultat je dobio red od četiri ćelije i akciju + još jedna stavka",
    ],
  },
  {
    version: "3.16.2",
    date: "2026-08-07",
    fixed: [
      "Copying a line with several items now copies all of them and the line total. It was copying only the item under the cursor, which is a quiet way to paste the wrong number into an email",
      "The Save button no longer shows a line with several items as already saved when one of its parts happens to be. Saving one always creates a new assembly, so the button now looks like what it does",
      "Suggestions now learn from every item on a line, not only the last one",
    ],
    fixed_bs: [
      "Kopiranje linije sa više stavki sada kopira sve njih i ukupan zbir. Ranije je kopiralo samo stavku pod kursorom, što je tih način da se u email zalijepi pogrešan broj",
      "Dugme Sačuvaj više ne prikazuje liniju sa više stavki kao već sačuvanu kada je jedan njen dio sačuvan. Čuvanje takve linije uvijek pravi novi sklop, pa dugme sada izgleda kao ono što radi",
      "Prijedlozi sada uče iz svake stavke na liniji, a ne samo iz posljednje",
    ],
  },
  {
    version: "3.16.1",
    date: "2026-08-07",
    fixed: [
      "Pasting a cut list onto a line you had already typed no longer throws that line away — the pasted parts are added to it",
      "On a line with several items, the breakdown now says which item it is describing. It was showing one item's figures under the hero's total for the whole line, which read as though the two disagreed",
    ],
    fixed_bs: [
      "Lijepljenje liste rezanja na liniju koju ste već ukucali više ne briše tu liniju — zalijepljeni dijelovi se dodaju na nju",
      "Na liniji sa više stavki pregled sada kaže koju stavku opisuje. Ranije je prikazivao brojeve jedne stavke ispod ukupnog zbira cijele linije, što je izgledalo kao da se ne slažu",
    ],
  },
  {
    version: "3.16.0",
    date: "2026-08-07",
    added: [
      "Arithmetic in a token: hea120 6m-50mm x2+3. A cut list arrives as \"the six-metre stock less the joint\", not as round numbers, so the bar does the subtraction instead of you",
      "Paste a cut list straight in. One row per part becomes one item per part, tabs and semicolons and all — the whole list prices at once",
      "Mass tolerance: set a ±% in Settings and every result gains the band it may actually be delivered within, alongside the theoretical mass",
    ],
    added_bs: [
      "Računanje u tokenu: hea120 6m-50mm x2+3. Lista rezanja dolazi kao \"šestometarska šipka minus spoj\", a ne kao okrugli brojevi, pa traka oduzima umjesto vas",
      "Zalijepite listu rezanja direktno. Jedan red po dijelu postaje jedna stavka po dijelu, sa tabovima i tačka-zarezima — cijela lista se obračuna odjednom",
      "Tolerancija mase: postavite ±% u postavkama i svaki rezultat dobija opseg u kojem može stvarno biti isporučen, uz teoretsku masu",
    ],
  },
  {
    version: "3.15.0",
    date: "2026-08-07",
    added: [
      "Type > and the command line becomes a command palette. Go to saved, projects, compare or settings; save, compare, copy or share the current line; open the reference or flip the theme — and search your own saved entries and projects by name to load one straight into the bar. Arrows move, Enter runs, Escape backs out",
    ],
    added_bs: [
      "Ukucajte > i komandna linija postaje komandna paleta. Idite na sačuvano, projekte, poređenje ili postavke; sačuvajte, uporedite, kopirajte ili podijelite trenutnu liniju; otvorite pregled ili promijenite temu — i pretražite vlastite sačuvane stavke i projekte po imenu da biste ih učitali direktno u traku. Strelice biraju, Enter pokreće, Escape izlazi",
    ],
  },
  {
    version: "3.14.0",
    date: "2026-08-07",
    added: [
      "One line, several items. Type hea120 6m x2 + ipe200 4m x3 and the bar prices both: each item is listed with its own weight and price, and the big number is the sum. Every item keeps its own grade, rate and target — the grammar is just repeated after the plus",
      "A multi-item line saves as one assembly rather than as separate entries, and logging it drops one line per item onto the session tape, so it still adds up and can still become a project",
    ],
    added_bs: [
      "Jedna linija, više stavki. Ukucajte hea120 6m x2 + ipe200 4m x3 i traka računa obje: svaka stavka je izlistana sa vlastitom masom i cijenom, a veliki broj je zbir. Svaka stavka zadržava vlastiti kvalitet, cijenu i cilj — gramatika se samo ponavlja iza plusa",
      "Linija sa više stavki se čuva kao jedan sklop, a ne kao odvojene stavke, a upisivanje u sesiju dodaje po jednu liniju za svaku stavku, pa se i dalje sabira i i dalje može postati projekat",
    ],
  },
  {
    version: "3.13.0",
    date: "2026-08-07",
    changed: [
      "Your typing habits now follow you between devices. The suggestions that learn what you actually type used to start from nothing on every device; with sync on, the sizes, lengths and recent lines you built up on one are ranked on all of them. Each device keeps its own tally and the app adds them together, so nothing is ever counted twice",
    ],
    changed_bs: [
      "Vaše navike kucanja sada vas prate između uređaja. Prijedlozi koji uče šta stvarno kucate ranije su kretali od nule na svakom uređaju; sa uključenom sinhronizacijom, dimenzije, dužine i nedavne linije koje ste izgradili na jednom rangiraju se na svima. Svaki uređaj vodi vlastiti zbir, a aplikacija ih sabira, pa se ništa nikada ne broji dvaput",
    ],
  },
  {
    version: "3.12.0",
    date: "2026-08-07",
    added: [
      "Ask the question backwards. Type =500kg (or =1t, =250eur) after a profile and the bar solves for what you left out: how many pieces of that bar make 500 kg, or how long one has to be. Pieces come whole and round up, and the badge says how far over the target the answer lands",
    ],
    added_bs: [
      "Postavite pitanje obrnuto. Ukucajte =500kg (ili =1t, =250eur) iza profila i traka rješava ono što ste izostavili: koliko komada te šipke čini 500 kg, ili koliko jedna mora biti duga. Komadi su cijeli i zaokružuju se naviše, a oznaka kaže koliko rezultat prelazi cilj",
    ],
  },
  {
    version: "3.11.0",
    date: "2026-08-07",
    changed: [
      "Tablets and half-width windows get the real workspace. Between the phone and the desktop there used to be a 560-pixel card floating on a background — no session tape, no library, no breakdown, which is exactly an iPad in portrait. That whole in-between is now the workspace itself, laid out in one column for the width it has",
      "Figures line up everywhere: every number in the app now uses tabular figures, so a value no longer shifts sideways as it counts up or a digit changes",
      "The orange is used more sparingly — it now means the primary action and the weight metric, and no longer doubles as the selected tab, the profile icons and everything else at once",
      "Movement now means one thing: chips pop in, tape lines rise, views cross-fade, warnings drop in. All of it disappears when your system asks for reduced motion",
    ],
    changed_bs: [
      "Tableti i prozori pola širine dobijaju pravi radni prostor. Između telefona i desktopa je ranije bila kartica od 560 piksela na pozadini — bez trake sesije, biblioteke i pregleda, što je tačno iPad u portretu. Taj međuprostor je sada sam radni prostor, složen u jednu kolonu za širinu koju ima",
      "Brojevi se poravnavaju svuda: sve cifre u aplikaciji koriste tabelarne brojke, pa vrijednost više ne pomjera položaj dok se odbrojava ili dok se cifra mijenja",
      "Narandžasta se koristi štedljivije — sada znači glavnu akciju i masu, a više nije istovremeno i izabrana kartica, ikone profila i sve ostalo",
      "Pokret sada znači jedno: čipovi iskaču, linije trake se podižu, prikazi se pretapaju, upozorenja se spuštaju. Sve nestaje kada sistem zatraži smanjeno kretanje",
    ],
  },
  {
    version: "3.10.0",
    date: "2026-08-07",
    added: [
      "Price book: give each material grade its own rate. Stainless costs about four times mild steel per kilo, and one global €/kg quietly got one of them wrong — now a grade you have priced uses its own rate, an inline @2.50/kg still wins for a single line, and anything you leave out keeps the default",
      "Margin: set a percentage on top of cost and every breakdown gains a sell-price line, so a result becomes an offer",
      "Save the whole session as a project in one press — the tape already added up, now it can become a job",
      "Saved entries can hold several parts. Add the line in the bar to any saved entry and it becomes an assembly — a gate frame, a railing bay — with its parts listed and its weight and price summed",
      "Print a quote from any project (or save it as PDF): header, line items, weights, totals and margin, with no app furniture around it — and it works offline",
    ],
    changed: [
      "Adding several calculations to a project at once now adds all of them; the old path reported success for the first and silently dropped the rest",
    ],
    added_bs: [
      "Cjenovnik: dajte svakom kvalitetu materijala vlastitu cijenu. Nehrđajući košta oko četiri puta više od običnog čelika po kilogramu, a jedna globalna €/kg cijena je tiho griješila kod jednog od njih — sada kvalitet koji ste unijeli koristi vlastitu cijenu, @2.50/kg i dalje pobjeđuje za pojedinačnu liniju, a sve što izostavite koristi podrazumijevanu",
      "Marža: postavite postotak na cijenu koštanja i svaki pregled dobija liniju prodajne cijene, pa rezultat postaje ponuda",
      "Sačuvajte cijelu sesiju kao projekat jednim pritiskom — traka je već sabirala, sada može postati posao",
      "Sačuvane stavke mogu sadržavati više dijelova. Dodajte liniju iz trake bilo kojoj sačuvanoj stavci i ona postaje sklop — okvir kapije, polje ograde — s popisom dijelova i zbrojenom masom i cijenom",
      "Štampajte ponudu iz bilo kojeg projekta (ili je sačuvajte kao PDF): zaglavlje, stavke, mase, ukupno i marža, bez ostatka aplikacije — i radi offline",
    ],
    changed_bs: [
      "Dodavanje više izračuna u projekat odjednom sada dodaje sve; stari način je prijavljivao uspjeh za prvi, a ostale tiho izostavljao",
    ],
  },
  {
    version: "3.9.0",
    date: "2026-08-07",
    added: [
      "A finished calculation now offers variations instead of a single Save chip: twice the pieces, the other stock lengths, the neighbouring sizes, another grade — each showing what it would come to before you pick it",
      "Press ⌥1–9 to insert the numbered suggestion without leaving the line, and see the number on each chip",
      "A hint strip under the command line names the keys that work right now, and ? opens a full command reference with the grammar, every shortcut, and tappable examples",
      "⌘S saves the current line (press again to unsave) and ⌘↵ adds it to compare",
      "The phone keypad's backspace now deletes a whole token when held, so a size like 40x40x3 goes in one gesture",
      "Recent lines sit above the phone keypad — history recall was desktop-only until now",
      "Vibration feedback on the phone keypad and on saves, with an on/off switch in Settings",
    ],
    changed: [
      "Enter has one meaning everywhere: take the pending suggestion, or log the finished line. The hint strip says which one it is at that moment",
      "Suggestions are grouped — yours, your presets, then standard — so the ranking is visible and not just true",
      "Returning to the app puts your last line back in the bar instead of the demo query; a first visit still gets the demo",
      "Suggestion chips on the phone wrap to a second row instead of hiding behind a sideways scroll",
    ],
    fixed: [
      "Typing was doing far more work than it needed: per-metre weights for suggestion chips are now cached and the query is parsed once per keystroke instead of twice",
    ],
    added_bs: [
      "Gotov izračun sada nudi varijante umjesto jednog dugmeta Sačuvaj: dvostruko komada, druge standardne dužine, susjedne veličine, drugi kvalitet — svaka pokazuje rezultat prije nego što je izaberete",
      "Pritisnite ⌥1–9 da ubacite numerisani prijedlog bez napuštanja linije; broj je prikazan na svakom čipu",
      "Traka ispod komandne linije imenuje tipke koje trenutno rade, a ? otvara potpuni pregled komandi s gramatikom, svim prečicama i primjerima na dodir",
      "⌘S čuva trenutnu liniju (ponovni pritisak uklanja), a ⌘↵ je dodaje u poređenje",
      "Tipka za brisanje na mobilnoj tastaturi sada briše cijeli token kada je zadržite, pa dimenzija poput 40x40x3 nestaje jednim potezom",
      "Nedavne linije stoje iznad mobilne tastature — do sada je vraćanje historije bilo samo na desktopu",
      "Vibracija pri kucanju na tastaturi i pri čuvanju, s prekidačem u Postavkama",
    ],
    changed_bs: [
      "Enter svuda znači jedno: preuzmi prijedlog koji čeka ili zabilježi gotovu liniju. Traka s prečicama govori šta je to u tom trenutku",
      "Prijedlozi su grupisani — vaše, vaši predlošci, pa standardno — pa je redoslijed vidljiv, a ne samo tačan",
      "Povratak u aplikaciju vraća vašu zadnju liniju u traku umjesto demo upita; prva posjeta i dalje dobija demo",
      "Čipovi prijedloga na telefonu prelaze u drugi red umjesto da se kriju iza bočnog pomjeranja",
    ],
    fixed_bs: [
      "Kucanje je radilo mnogo više posla nego što treba: težine po metru za čipove se sada keširaju, a upit se parsira jednom po pritisku tipke umjesto dvaput",
    ],
  },
  {
    version: "3.8.0",
    date: "2026-08-06",
    added: [
      "Saved calculations are real cards now: each one shows the actual cross-section of its profile, the spec (length × pieces × grade) under the title, and both totals — with mass per metre and weight per piece alongside",
      "Search, sort and tag your saved work: filter by name, note, tag, profile or grade, sort by newest, most used, recently used or name, and pin the ones you reach for daily to the top",
      "Name, notes and tags on any saved calculation — and a 'name it' shortcut on the save confirmation, while you still have the job in mind",
      "Duplicate a saved calculation to tweak a copy without losing the original",
      "Select several saved calculations at once to compare or delete them together, and switch between card and compact views",
      "Deleting a saved calculation can be undone from the confirmation that follows it",
      "Save is now a toggle: the button shows a filled bookmark when the line in the bar is already saved, and pressing it again removes it",
    ],
    changed: [
      "Saved calculations are always priced at your current rate, and each card states the rate it used. When today's rate moves the total, the card shows what it cost when you saved it instead of quietly showing a stale number",
      "Opening a saved calculation counts as a use (so 'most used' means something) and restores it at today's rate, so the command line matches the card",
      "Share links now carry the sender's rate, currency, waste and VAT, so a link shows the same price to whoever opens it — and says so when it changes your pricing",
      "One shared empty state across Saved, Projects and Compare, each pointing at the action that fills it",
    ],
    fixed: [
      "Saving a calculation that was already saved reported 'Saved' but did nothing — now the button reflects the real state and the action removes it",
    ],
    added_bs: [
      "Sačuvani izračuni su sada prave kartice: svaka prikazuje stvarni presjek profila, specifikaciju (dužina × komadi × kvalitet) ispod naziva i oba iznosa — uz masu po metru i težinu po komadu",
      "Pretraga, sortiranje i oznake za sačuvano: filtrirajte po nazivu, bilješci, oznaci, profilu ili kvalitetu, sortirajte po najnovijem, najkorištenijem, nedavno korištenom ili nazivu, i zakačite na vrh one koje koristite svaki dan",
      "Naziv, bilješke i oznake na svakom sačuvanom izračunu — uz prečicu „Imenuj\" na potvrdi čuvanja, dok vam je posao još svjež",
      "Duplirajte sačuvani izračun da mijenjate kopiju bez gubitka originala",
      "Označite više sačuvanih izračuna odjednom za poređenje ili brisanje, i prebacujte se između prikaza kartica i kompaktnog prikaza",
      "Brisanje sačuvanog izračuna može se vratiti sa potvrde koja slijedi",
      "Sačuvaj je sada prekidač: dugme prikazuje ispunjenu oznaku kada je linija u traci već sačuvana, a ponovni pritisak je uklanja",
    ],
    changed_bs: [
      "Sačuvani izračuni se uvijek obračunavaju po vašoj trenutnoj cijeni, a svaka kartica navodi cijenu koju je koristila. Kada današnja cijena promijeni iznos, kartica prikazuje koliko je koštalo u trenutku čuvanja umjesto da tiho pokazuje zastarjeli broj",
      "Otvaranje sačuvanog izračuna se broji kao korištenje (da „najkorištenije\" nešto znači) i vraća ga po današnjoj cijeni, pa komandna linija odgovara kartici",
      "Linkovi za dijeljenje sada nose cijenu, valutu, otpad i PDV pošiljaoca, pa link prikazuje istu cijenu svakome ko ga otvori — i to javi kada promijeni vaše postavke",
      "Jedinstven prazan ekran u Sačuvano, Projekti i Poređenje, svaki upućuje na akciju koja ga popunjava",
    ],
    fixed_bs: [
      "Čuvanje izračuna koji je već sačuvan javljalo je „Sačuvano\" ali nije radilo ništa — sada dugme odražava stvarno stanje, a akcija ga uklanja",
    ],
  },
  {
    version: "3.7.0",
    date: "2026-07-20",
    added: [
      "The command bar types with you: a faint inline completion appears after the caret — press Tab or → to accept it",
      "Did-you-mean fixes for a mistyped profile, grade or off-catalog size, offered as a one-tap correction and never applied automatically",
      "Type it the way you'd say it: hea 120, 6 meters, 2 pieces / 2 kom all parse",
      "↑/↓ query history on the desktop inputs",
      "Dimensioned profile drawings on the result breakdown, with every dimension labelled in mm on the picture",
      "The hero metric counts up when a query settles, and the profile drawing eases in when the shape changes",
    ],
    changed: [
      "Size suggestion chips show the per-metre weight (e.g. 120 · 26.7 kg/m) so you can judge a size before picking it",
    ],
    fixed: [
      "Recent queries no longer pile up near-duplicates while you build a single calculation — one calculation leaves one recent",
    ],
    added_bs: [
      "Komandna traka kuca s vama: blijeda dopuna se pojavljuje iza kursora — pritisnite Tab ili → da je prihvatite",
      "Prijedlozi ispravki za pogrešno otkucan profil, kvalitet ili veličinu van kataloga, ponuđeni jednim dodirom i nikad primijenjeni automatski",
      "Kucajte kako biste rekli: hea 120, 6 meters, 2 pieces / 2 kom — sve se prepoznaje",
      "Historija upita sa ↑/↓ na desktop poljima",
      "Crteži presjeka s kotama na pregledu rezultata, sa svakom dimenzijom označenom u mm na slici",
      "Glavni broj se odbrojava kada se upit smiri, a crtež profila se blago pojavljuje pri promjeni oblika",
    ],
    changed_bs: [
      "Čipovi s veličinama prikazuju težinu po metru (npr. 120 · 26.7 kg/m) da možete procijeniti veličinu prije izbora",
    ],
    fixed_bs: [
      "Nedavni upiti se više ne gomilaju kao skoro-duplikati dok gradite jedan izračun — jedan izračun ostavlja jedan unos",
    ],
  },
  {
    version: "3.6.2",
    date: "2026-07-03",
    changed: [
      "The mobile keypad's mm and m keys are now a single length key: tap for mm, or hold to pick mm, cm, or m — matching the rate key. Cleaner layout, and cm is reachable for the first time",
    ],
    changed_bs: [
      "Tipke mm i m na mobilnoj tastaturi sada su jedna tipka za dužinu: dodirnite za mm, ili zadržite da izaberete mm, cm ili m — kao i tipka cijene. Urednije, a cm je sada prvi put dostupan",
    ],
  },
  {
    version: "3.6.1",
    date: "2026-07-03",
    changed: [
      "Cleaner mobile keypad: the separate @ and / keys are gone — tap the rate key (e.g. €/kg) to insert your default price token, or hold it to pick /kg, /m, or /pc, just like holding a key for alternate characters on a phone keyboard",
    ],
    changed_bs: [
      "Urednija mobilna tastatura: odvojene tipke @ i / su uklonjene — dodirnite tipku cijene (npr. €/kg) da ubacite podrazumijevanu cijenu, ili je zadržite da izaberete /kg, /m ili /pc, kao kad zadržite tipku za alternativne znakove na telefonu",
    ],
  },
  {
    version: "3.6.0",
    date: "2026-07-03",
    added: [
      "Formula QA page (/qa): the live calculator is checked against independent references — published EN catalog masses and hand-computed formulas — with a pass/fail table, per-row deviation, and the dataset version; the same checks run automatically on every code change",
      "The mobile keypad gained @ and / keys, so inline price overrides like @2.50/kg can be typed directly",
    ],
    fixed: [
      "UPE channel weights corrected: eleven UPE sizes carried cross-section areas 1–4% off the EN 10279 catalog values (found by the new formula-QA benchmark); all now match the published figures",
      "Typing sht now shows \"Sheet\" instead of \"Plate\" in chips, hints, and saved names",
    ],
    added_bs: [
      "Stranica za provjeru formula (/qa): živi kalkulator se provjerava prema nezavisnim referencama — objavljene EN kataloške mase i ručno izračunate formule — sa tabelom prolaza/pada, odstupanjem po redu i verzijom skupa podataka; iste provjere se izvršavaju automatski pri svakoj izmjeni koda",
      "Mobilna tastatura je dobila tipke @ i /, pa se prepisi cijene poput @2.50/kg mogu kucati direktno",
    ],
    fixed_bs: [
      "Ispravljene težine UPE profila: jedanaest UPE veličina imalo je površine presjeka 1–4% van EN 10279 kataloških vrijednosti (otkriveno novom provjerom formula); sve sada odgovaraju objavljenim vrijednostima",
      "Kucanje sht sada prikazuje \"Lim\" umjesto \"Ploča\" u čipovima, savjetima i sačuvanim nazivima",
    ],
  },
  {
    version: "3.5.0",
    date: "2026-07-03",
    added: [
      "Suggestions now learn from what you actually type: any query that settles on a live result counts (no Save needed), and sizes, lengths, quantities, and grades you use most rank first — tracked separately per profile, so your SHS habits never show up for HEA",
      "Install app from Settings: when your browser supports it, a quiet card in Settings installs FerroScale to your home screen or desktop — no banners",
    ],
    changed: [
      "The offline/update banners and other secondary surfaces now follow the app theme exactly (design tokens everywhere), and the browser install splash matches the app colors",
    ],
    added_bs: [
      "Prijedlozi sada uče iz onoga što stvarno kucate: svaki upit koji se zaustavi na živom rezultatu se računa (spremanje nije potrebno), a veličine, dužine, količine i kvalitete koje najčešće koristite rangiraju se prve — praćeno odvojeno po profilu, pa se vaše SHS navike nikad ne prikazuju za HEA",
      "Instalacija aplikacije iz Postavki: kada vaš preglednik to podržava, diskretna kartica u Postavkama instalira FerroScale na početni ekran ili radnu površinu — bez banera",
    ],
    changed_bs: [
      "Offline/update obavještenja i ostale sekundarne površine sada tačno prate temu aplikacije (dizajn tokeni svugdje), a instalacijski splash preglednika odgovara bojama aplikacije",
    ],
  },
  {
    version: "3.4.0",
    date: "2026-07-03",
    changed: [
      "Text contrast now meets WCAG AA everywhere: secondary text, placeholders, hints, and status labels are darker in light mode (and slightly lighter in dark mode), and the accent orange and confirmation green were tuned so buttons and highlighted values stay readable",
      "Settings look and behave the same everywhere — both the mobile settings sheet and the desktop settings view are driven by one shared definition, and the theme row on mobile is now a Light/Dark choice like the other rows",
      "The result breakdown shows consistent labels on mobile and desktop (per piece, rate) — previously the two surfaces named the same rows differently",
    ],
    changed_bs: [
      "Kontrast teksta sada svugdje ispunjava WCAG AA: sekundarni tekst, placeholderi, savjeti i statusne oznake su tamniji u svijetlom režimu (i nešto svjetliji u tamnom), a narandžasta i zelena boja su podešene da dugmad i istaknute vrijednosti ostanu čitljive",
      "Postavke izgledaju i ponašaju se isto svugdje — i mobilni panel i desktop pogled postavki koriste jednu zajedničku definiciju, a red teme na mobilnom je sada izbor Svijetlo/Tamno kao i ostali redovi",
      "Pregled rezultata prikazuje dosljedne oznake na mobilnom i desktopu (po komadu, cijena) — ranije su dvije površine iste redove različito nazivale",
    ],
  },
  {
    version: "3.3.0",
    date: "2026-07-03",
    added: [
      "Sheets (Settings, Library, Result, Add to project) are now real modal dialogs for assistive technology: screen readers announce them by name, keyboard focus stays inside while they are open and returns to the opener on close, and Escape closes them on every device — including phones",
      "Screen readers now announce the calculated result once you stop typing, confirmation toasts (Saved, Link copied, …), and the offline/update banners",
    ],
    changed: [
      "Pinch zoom is enabled again everywhere — accessibility over app-like feel",
      "Settings inputs (unit price, waste, VAT, default grade) are now properly labeled for assistive technology",
    ],
    added_bs: [
      "Paneli (Postavke, Biblioteka, Rezultat, Dodaj u projekat) su sada pravi modalni dijalozi za pomoćne tehnologije: čitači ekrana ih najavljuju po imenu, fokus tastature ostaje unutar panela dok je otvoren i vraća se nazad pri zatvaranju, a Escape ih zatvara na svakom uređaju — uključujući telefone",
      "Čitači ekrana sada najavljuju izračunati rezultat kada prestanete kucati, potvrdne poruke (Sačuvano, Link kopiran, …) i offline/update obavještenja",
    ],
    changed_bs: [
      "Pinch zoom je ponovo omogućen svugdje — pristupačnost ispred izgleda aplikacije",
      "Polja u postavkama (jedinična cijena, otpad, PDV, podrazumijevani kvalitet) sada su ispravno označena za pomoćne tehnologije",
    ],
  },
  {
    version: "3.2.0",
    date: "2026-07-02",
    added: [
      "Shareable calculation links: the URL now mirrors your query (e.g. /en?q=hea120+6m+x2), and a new Share link action copies it — opening a link restores the calculation instantly",
      "Copy value action copies the result itself (total weight or total price) instead of the query text",
      "The command bar now explains input it didn't understand — unknown tokens, non-existent standard sizes, invalid quantities, and impossible geometry show a message under the query line, and unrecognized tokens are highlighted",
      "Smarter suggestions: your recent queries appear before the profile chips, and sizes you recently used for a profile appear before the standard sizes",
    ],
    changed: [
      "The session tape is now persistent — logged calculations survive reloads and are included in Google Drive sync (up to 50 entries)",
    ],
    added_bs: [
      "Linkovi za dijeljenje izračuna: URL sada prati vaš upit (npr. /en?q=hea120+6m+x2), a nova akcija Podijeli link ga kopira — otvaranje linka odmah vraća izračun",
      "Akcija Kopiraj vrijednost kopira sam rezultat (ukupnu težinu ili ukupnu cijenu) umjesto teksta upita",
      "Komandna traka sada objašnjava unos koji nije razumjela — nepoznati tokeni, nepostojeće standardne veličine, neispravne količine i nemoguća geometrija prikazuju poruku ispod linije upita",
      "Pametniji prijedlozi: vaši nedavni upiti pojavljuju se prije profila, a nedavno korištene veličine prije standardnih veličina",
    ],
    changed_bs: [
      "Sesijska traka je sada trajna — zabilježeni izračuni preživljavaju ponovno učitavanje i uključeni su u Google Drive sinhronizaciju (do 50 unosa)",
    ],
  },
  {
    version: "3.1.0",
    date: "2026-06-09",
    added: [
      "FerroScale Command — a new type-or-tap calculator on the home screen: type a query like \"hea120 6m x2 s235\" (or tap through profile → size → length → pieces → grade) for an instant live result with a breakdown sheet",
      "Command understands bare lengths using your default unit from Settings (e.g. \"hea120 6\"), plus explicit mm/cm/m/in/ft",
      "Your saved dimension presets appear as one-tap size suggestions in Command after picking a profile",
      "Compare and Add-to-project actions in Command's result breakdown",
      "All 9 material grades available in Command (S235, S355, S420, 304, 316, 316L, 6060, 6082, 7075) with EN densities",
      "Command bar price overrides: add tokens like \"@2.50/kg\", \"3,20/m\", or \"@12/pc\" to override the default unit price for a single calculation",
      "Settings now include a bilingual in-app guide with Command examples, pricing tips, saved work, projects, sync, and offline notes",
      "Settings now include an English/Bosnian language switcher; changing language also changes the guide language",
    ],
    changed: [
      "Command pricing now uses your real pricing settings (unit price, price basis, currency incl. PLN/BAM, waste %, VAT) — the hero PRICE value is the same grand total the full calculator produces, with waste/VAT badges when active",
      "Saving in Command stores the calculation in the shared Saved library (visible on /saved, included in sync) in addition to the quick query recall list",
      "The \"weight as main\" setting now drives Command's default hero metric; Command's settings sheet edits the same shared pricing/grade/unit settings as the Settings tab",
      "Mobile Command keypad now has a rate key (for example €/kg) so price overrides can be entered without typing @ or /kg manually",
      "Bosnian localization now covers the Command workspace, settings, library, result breakdowns, sync prompts, and accessibility skip link",
    ],
    added_bs: [
      "Prepis cijene u komandnoj traci: dodajte tokene poput \"@2.50/kg\", \"3,20/m\" ili \"@12/pc\" da prepišete podrazumijevanu jediničnu cijenu samo za taj izračun",
      "Postavke sada imaju dvojezični vodič u aplikaciji sa primjerima za Command, savjetima za cijene, sačuvanim stavkama, projektima, sinhronizacijom i offline napomenama",
      "Postavke sada imaju prekidač za engleski/bosanski jezik; promjena jezika mijenja i jezik vodiča",
    ],
    changed_bs: [
      "Mobilna Command tastatura sada ima tipku za cijenu (na primjer €/kg), pa se prepis cijene može unijeti bez ručnog kucanja @ ili /kg",
      "Bosanska lokalizacija sada pokriva Command radni prostor, postavke, biblioteku, detalje rezultata, sync poruke i link za preskakanje na glavni sadržaj",
    ],
    fixed: [
      "Mobile Command keypad now stays anchored to the bottom of the screen without extra bottom padding while the content above fits into the remaining space",
      "Stainless 304 density corrected to 7930 kg/m³ in Command quick queries",
    ],
  },
  {
    version: "2.5.2",
    date: "2026-04-09",
    added: [
      "Branded startup splash on mobile during the first app load, with a snappy fade-out once the shell is ready",
    ],
    changed: [
      "Calculator form is grouped into clearer sections; default length unit is set in Settings (workspace), not duplicated on the calculator page",
      "Switching profile or the workspace length unit now keeps manual dimensions and piece length in sync without silent mm-only defaults",
      "Validation messages for hollow sections and angles explain the conflicting values in millimetres",
      "Result summary chips show quantity, pricing, waste, and VAT (length removed from chips); dataset version stays near references",
      "Removed instructional hint text under size fields and the result rounding disclaimer",
      "Reverse calculator quantity mode shows equivalent total length in metres for the exact (fractional) piece count, matching the target weight line",
      "Templates and Projects mobile screens use the same horizontal padding as the calculator for a consistent shell",
      "PWA update banner can open the changelog before applying an update; number animations are slightly faster",
      "Mobile tab routes prefetch in the background and switch with a smoother directional slide (no interstitial overlay)",
      "App icons, favicons, desktop sidebar mark, offline page mark, and iOS startup images now use the new FerroScale logo artwork",
      "Desktop sidebar branding now shows only the FerroScale name without the Workspace eyebrow",
      "Mobile header branding now uses the new app icon, and iOS startup screens use the standalone F logo artwork",
      "Redesigned the default workspace around a bare calculator-first layout with a compact top bar, overflow menu, flatter controls, and mobile result summary without the bottom tab bar",
    ],
    added_bs: [
      "Brendirani splash ekran na mobilnom tokom prvog ucitavanja aplikacije, s brzim nestankom cim je shell spreman",
    ],
    fixed: [
      "Calculator validation no longer duplicates in a top banner; dimension fields reserve equal error space only while a dimension error is shown, so valid inputs stay tight on mobile",
    ],
    fixed_bs: [
      "Validacija na kalkulatoru vise se ne duplira u gornjem baneru; polja dimenzija dijele jednak prostor za gresku samo dok postoji greska dimenzije, tako da su validni unosi zbijeni na mobilnom",
    ],
    changed_bs: [
      "Kalkulator forma je grupisana u jasnije sekcije; podrazumijevana jedinica duzine je u Postavkama (radni prostor), ne duplirana na stranici kalkulatora",
      "Promjena profila ili jedinice duzine u radnom prostoru drzi rucne dimenzije i duzinu komada uskladjenima bez tihih mm podrazumijevanja",
      "Poruke validacije za suplje profile i ugaone profile objasnjavaju konfliktne vrijednosti u milimetrima",
      "Sazetak rezultata (cipovi) prikazuje kolicinu, cijenu, otpad i PDV (duzina uklonjena sa cipova); verzija dataseta ostaje kod referenci",
      "Uklonjeni uvodni tekstovi ispod polja velicine i napomena o zaokruzivanju u rezultatu",
      "Obrnuti kalkulator rezim kolicine prikazuje ekvivalentnu ukupnu duzinu u metrima za tacnu (decimalnu) kolicinu komada",
      "Mobilni ekrani Sabloni i Projekti koriste iste horizontalne margine kao kalkulator radi konzistentnog okvira",
      "PWA update baner moze otvoriti changelog prije primjene azuriranja; animacije brojeva su malo brze",
      "Mobilne tab rute se prefetch-uju u pozadini i prelaze uz smireniji usmjereni slide (bez medjusloja)",
      "Ikone aplikacije, faviconi, desktop oznaka u bocnoj traci, offline stranica i iOS startup slike sada koriste novi FerroScale logo",
      "Desktop branding u bocnoj traci sada prikazuje samo FerroScale naziv bez Workspace oznake",
      "Mobilni header sada koristi novu ikonu aplikacije, a iOS startup ekrani koriste samostalni F logo",
      "Podrazumijevani radni prostor je redizajniran oko jednostavnog calculator-first layouta sa kompaktnom gornjom trakom, overflow menijem, ravnijim kontrolama i mobilnim sazetkom rezultata bez donje tab trake",
    ],
  },
  {
    version: "2.5.1",
    date: "2026-04-03",
    changed: [
      "Saved custom presets for standard profiles now appear directly in the size picker alongside EN standard sizes",
    ],
    fixed: [
      "Google Drive sync status no longer loops between connected and syncing when there are no pending data changes",
      "Google Drive sync no longer treats quick-calc history as constantly changed when older local data is missing its sync timestamp marker",
    ],
    changed_bs: [
      "Sacuvani custom preseti za standardne profile sada se prikazuju direktno u izboru velicina zajedno sa EN standardnim velicinama",
    ],
    fixed_bs: [
      "Status Google Drive sync-a vise ne ulazi u petlju izmedju connected i syncing kada nema promjena podataka za slanje",
      "Google Drive sync vise ne tretira quick-calc historiju kao stalno promijenjenu kada starijim lokalnim podacima nedostaje oznaka vremena sync-a",
    ],
  },
  {
    version: "2.5.0",
    date: "2026-03-30",
    added: [
      "Backend-assisted Google Drive sync for templates, projects, favourites, compare items, and quick-calc history using encrypted per-record app-data storage",
    ],
    added_bs: [
      "Backend-assisted Google Drive sync za sablone, projekte, favorite, compare stavke i quick-calc historiju koristeci sifrovano cuvanje zapis-po-zapis u app-data prostoru",
    ],
    changed: [
      "Mobile calculator surfaces now use a calmer industrial look with warmer neutral surfaces, more consistent spacing, and less competing color emphasis",
      "Primary calculator controls, result bar, and result sheet were tightened into a more deliberate mobile-first hierarchy with unified motion and panel styling",
      "Desktop sidebar and multi-column workspace now use a more refined shell with calmer hierarchy, clearer panel controls, and more cohesive column framing",
      "Accent color now uses a darker burnished-copper tone instead of the previous yellow-leaning highlight for a more premium visual feel",
      "Mobile screen shells now blend more closely into the page background so the app feels more unibody and less like a separate inner slab",
      "Result quick metrics now use a clearer card hierarchy with stronger scanability across desktop results and the expanded mobile result sheet",
      "Settings now include a Data & Sync section with passphrase-based encryption, reconnect, remote reset, manual sync, and local import/export controls",
    ],
    changed_bs: [
      "Postavke sada ukljucuju Podaci i sync sekciju sa sifrovanjem preko lozinke, ponovnim povezivanjem, resetom udaljene kopije, rucnim sync-om i lokalnim import/export kontrolama",
      "Mobilne povrsine kalkulatora sada koriste smireniji industrijski izgled sa toplijim neutralnim povrsinama, ujednacenijim razmacima i manje konkurentskog kolor naglasavanja",
      "Primarne kontrole kalkulatora, result bar i result sheet su zategnuti u namjerniju mobile-first hijerarhiju sa ujednacenim motion i panel stilovima",
      "Desktop sidebar i visekolonski radni prostor sada koriste profinjeniji shell sa smirenijom hijerarhijom, jasnijim panel kontrolama i skladnijim uokvirivanjem kolona",
      "Naglasena boja sada koristi tamniji burnished-copper ton umjesto prethodnog zuto-orijentisanog highlighta za premium vizuelni osjecaj",
      "Mobilni ekrani sada se vise stapaju sa pozadinom stranice tako da aplikacija djeluje vise unibody, a manje kao odvojena unutrasnja ploca",
      "Brze metrike rezultata sada koriste jasniju hijerarhiju kartica sa boljom preglednoscu kroz desktop rezultate i prosireni mobilni result sheet",
    ],
    fixed: [
      "Google Drive sync now survives expired file ids by recreating missing remote records and resumes auth handoff cleanly across popup and mobile redirect flows",
    ],
    fixed_bs: [
      "Google Drive sync sada prezivljava istekle file id vrijednosti ponovnim kreiranjem nedostajucih udaljenih zapisa i uredno nastavlja auth handoff kroz popup i mobilni redirect tok",
    ],
  },
  {
    version: "2.4.2",
    date: "2026-03-26",
    added: [
      "iOS startup splash images for a native-feeling launch experience across iPhone and iPad screen sizes",
    ],
    added_bs: [
      "iOS startup splash slike za prirodniji native-osjecaj pokretanja na iPhone i iPad velicinama ekrana",
    ],
    changed: [
      "Viewport metadata now uses fixed scaling and keyboard overlay behavior for a more stable app-shell experience on mobile",
      "Global touch behavior now suppresses browser callout artifacts and improves pointer/selection ergonomics in app-like interactions",
      "Result values in key summary and cost sections can now be selected for easier copy/share workflows",
    ],
    changed_bs: [
      "Viewport metapodaci sada koriste fiksno skaliranje i keyboard overlay ponasanje za stabilnije app-shell iskustvo na mobilnim uredjajima",
      "Globalno touch ponasanje sada uklanja browser callout artefakte i poboljsava pointer/selection ergonomiju u app-like interakcijama",
      "Vrijednosti rezultata u kljucnim summary i cost sekcijama sada se mogu oznaciti radi lakseg copy/share toka",
    ],
    fixed: [
      "Fixed a hydration mismatch in the mobile bottom tab bar by rendering saved/projects badges only after client hydration",
    ],
    fixed_bs: [
      "Ispravljen hydration mismatch u mobilnom donjem tab baru tako sto se oznake za sacuvano/projekte prikazuju tek nakon client hydration koraka",
    ],
  },
  {
    version: "2.4.1",
    date: "2026-03-26",
    added: [
      "Custom mobile numpad for numeric inputs to deliver a more native app-like entry flow without relying on the OS keyboard",
    ],
    added_bs: [
      "Prilagodjeni mobilni numpad za numericke unose koji pruza prirodniji app-like tok unosa bez oslanjanja na sistemsku tastaturu",
    ],
    fixed: [
      "On mobile, opening Add to template from the result overlay now closes the result sheet first so the Template Builder appears in front",
      "Result overlay close behavior is now synchronized with the Template Builder flow to prevent stuck overlay states",
    ],
    fixed_bs: [
      "Na mobilnim uredjajima, otvaranje Dodaj u sablon iz result overlaya sada prvo zatvara result sheet kako bi se Builder sablona prikazao ispred",
      "Ponasanje zatvaranja result overlaya sada je sinhronizovano sa tokom Buildera sablona kako bi se sprijecila zaglavljena stanja overlaya",
    ],
  },
  {
    version: "2.4.0",
    date: "2026-03-25",
    added: [
      "Templates workspace for reusable multi-part assemblies with a dedicated full-screen Template Builder",
      "Option to append newly prepared parts directly into an existing template from the builder",
    ],
    added_bs: [
      "Radni prostor Sabloni za visekratne vise-dijelne sklopove sa posebnim full-screen Builderom sablona",
      "Opcija dodavanja novo pripremljenih dijelova direktno u postojeci sablon iz buildera",
    ],
    changed: [
      "Saved workspace is now presented as Templates with clearer naming across tabs, sidebar, and save flow",
      "Template entries now support search, sort (newest, recently used, most used), duplication, tags, and usage metadata",
      "Applying a template now tracks usage count and last-used timestamp to support power-user workflows",
      "Templates now include multi-select mode with bulk duplicate and bulk delete actions",
      "Template-to-project flow now adds the whole template with quantity scaling, without per-part override rules",
    ],
    changed_bs: [
      "Radni prostor Sacuvano sada je predstavljen kao Sabloni sa jasnijim nazivima kroz tabove, bocni panel i tok cuvanja",
      "Stavke sablona sada podrzavaju pretragu, sortiranje (najnovije, nedavno koristeno, najcesce koristeno), dupliranje, oznake i metapodatke o koristenju",
      "Primjena sablona sada biljezi broj koristenja i vrijeme zadnjeg koristenja za naprednije tokove rada",
      "Sabloni sada imaju rezim vise odabira sa grupnim dupliranjem i grupnim brisanjem",
      "Tok dodavanja u projekat sada dodaje cijeli sablon sa skaliranjem kolicine, bez pravila override-a po dijelu",
    ],
  },
  {
    version: "2.3.0",
    date: "2026-03-24",
    added: [
      "Text Size setting (Small / Medium / Large) in Workspace settings to scale all text in the app",
    ],
    added_bs: [
      "Podesavanje velicine teksta (Mala / Srednja / Velika) u postavkama radnog prostora za skaliranje svog teksta u aplikaciji",
    ],
    changed: [
      "Standardized all arbitrary pixel-based font sizes to Tailwind scale classes for consistent text scaling",
      "Alternative profile cards now show family and designation on one line",
      "Matched label sizes in key specs and alternative cards for a more uniform look",
    ],
    changed_bs: [
      "Standardizirane sve proizvoljne velicine fontova u pikselima na Tailwind klase za konzistentno skaliranje teksta",
      "Kartice alternativnih profila sada prikazuju porodicu i oznaku u jednom redu",
      "Uskladjene velicine oznaka u kljucnim specifikacijama i karticama alternativa za ujednaceniji izgled",
    ],
  },
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


