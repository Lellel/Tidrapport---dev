# LPV & Klaryta-appen (Tidrapport) – regler för Claude

- Svara Daniel på svenska. Resonera och få klartecken innan nya funktioner byggs; beslut skrivs in i `docs/*.md`.
- Server = `Kod.gs` (Apps Script). Ladda upp med `./ladda-upp-kod.sh` (dev). Prod har ett eget repo och är inte i fas – rör inte prod utan att fråga.
- Tester: `~/Dev-repot/verktyg/tester/kor-alla.sh` – kör före commit när `Kod.gs` ändras.
- Räkna upp `CACHE_NAME` i `sw.js` vid varje ändring av appens filer. Nya sidor/skript läggs i listan i `sw.js`.
- Committa bara filer du själv ändrat (`git add <fil>`) – kontrollera `git status` först, andra sessioner kan ha arbete på gång i indexet.

## Designspråket (docs/designsprak.md)
- Knappar använder **bara** de gemensamma klasserna i `theme.css`: `lpv-btn` (+ `primary`, `go`, `danger`, `map`, `small`, `big`, `block`, `icon`), `lpv-seg`, `lpv-toggle`, `lpv-chip`. Inga egna knappstilar eller hårdkodade färger på sidorna – behövs något nytt läggs det i `theme.css` och i docs/designsprak.md.
- Fylld blå = den viktigaste handlingen (max en per vy). Fylld grön = bara Starta/Klar i fält. Valt/påslaget = blåtonat.
- Motto: endast den information man behöver, endast när man behöver den – och då lättillgänglig.
- `designtest.js` i testsviten säger ifrån om en sida får fler egna knappklasser eller färger än baslinjen. Sänk baslinjen (`docs/designbaslinje.json`) när en sida städats – höj den aldrig.

## Bruksanvisningen ska alltid vara aktuell
`guide.html` är bruksanvisningen per roll (förare, handskottare, UE, ekonom, admin). Välkomstpaketet och startsidan länkar dit.

**Varje ändring som påverkar hur en användare gör något** (ny knapp, ändrat flöde, ny sida, borttagen funktion, ändrad text på en knapp som manualen nämner) ska i samma commit:
1. Uppdatera berört avsnitt i `guide.html` (rätt `data-roller`). Använd knapparnas exakta text.
2. Lägga en rad överst i `nyheter.js` (`LPV_NYHETER`: id, datum, roller, titel, kort text). Den visas som "Nytt sedan sist" i manualen och en gång som notis på startsidan för de rollerna.
3. Räkna upp `CACHE_NAME` i `sw.js`.

Rena interna ändringar (buggfix utan synlig skillnad, tester, docs) behöver ingen nyhet.
