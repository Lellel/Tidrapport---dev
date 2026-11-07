# Designspråket – knappar och information

Bestämt med Daniel 2026-11-07 efter UI-översynen. **Motto: endast den information man behöver, endast när man behöver den – och då ska den vara lättillgänglig.**

## Knappar (theme.css → "KNAPPAR")
Alla knappar på alla sidor använder de gemensamma klasserna. Ingen sida har egna knappstilar eller egna färger – behövs något nytt läggs det i `theme.css` (och här), så följer alla sidor med.

| Klass | Utseende | Används till |
|---|---|---|
| `lpv-btn primary` | fylld blå | den viktigaste handlingen – **max en per vy** |
| `lpv-btn go` | fylld grön | **bara** när man startar eller avslutar arbete i fält: ▶️ Starta snöpass, ✅ Klar, ✅ Klar – nästa |
| `lpv-btn` | ljus med kant | allt annat |
| `lpv-btn danger` | röd text | ta bort, spärra, makulera |
| `lpv-btn map` | halvgenomskinlig med skugga | knappar som ligger på kartan |
| `small` / `big` / `block` / `icon` | storlek | `small` 34 px (bara på kort i listor), standard 44 px, `big` 54 px (huvudknappen i fält), `block` = hela bredden, `icon` = fyrkantig |
| `lpv-seg` | inbäddade flikar | **var man är** (Fastigheter/Traktorer/Karta, Personer/Kunder …) – vald flik ser upphöjd ut, aldrig fylld blå |
| `lpv-toggle` | ljus, blåtonad när den är på | av/på (Kulpåse, Orderbok, Traktorremsan) |
| `lpv-chip` | rund, blåtonad när den är vald | filter |

- Valt/påslaget = **blåtonat**. Fylld blå = **gör det här**. Man ska aldrig behöva gissa om en knapp är vald eller en uppmaning.
- Minst 44 px höjd för allt man trycker på i fält (handskar, kyla). 34 px bara på täta kort på iPad/dator.
- **← Tillbaka** (`lpv-back`) ser alltid likadan ut och sitter fast uppe till vänster. Länkar till syskonsidor (Snöjour →, ⚙️ Register) är vanliga `lpv-btn small`, inte textlänkar.
- **Läget (Auto/Ljust/Mörkt/Natt)** finns inte på varje sida: det väljs på startsidan under Läge och i Mer-menyn, och gäller alla sidor.

## Information – när den behövs
- Status som bara är intressant när något är fel (Ansluten, version, DEV) visas bara då.
- Sällan använt (inställningar, import, nytt objekt) ligger bakom en knapp eller ⋯ Mer – inte öppet överst.
- En varning som gäller många kort blir **en** rad med länk till filtret, inte en varning per kort.
- Samma sak sägs en gång (en hälsning, en version).
- Det man ska göra nu är den stora knappen; resten är mindre.

## Regel för fortsatt utveckling
- Står i `CLAUDE.md`. Kontrolltestet `designtest.js` (i `verktyg/tester/kor-alla.sh`) räknar egna knappklasser och hårdkodade färger per sida mot `designbaslinje.json` och säger ifrån om någon sida får fler. När en sida görs om sänks baslinjen.
- Undantag (kartfärger för zontyper, varumärkesfärger på traktorkulor) får ligga kvar – de är data, inte knappar.

## Ordning för ombyggnaden (2026-11-07) – **allt byggt samma dag**
1. Knapparna i theme.css + regeln + kontrolltestet + Läget till Mer/startsidan.
2. Sidorna går över till de gemensamma knapparna: Startsidan, Snöjour, Snöplanering, Rita zoner, Register, Radarn, Offerter, övriga.
3. Informationen: startsidan för förare (en hälsning, status bara vid problem, packlistan en gång per dag, notisen inte över huvudknappen), admins högerspalt hopfälld (🔧 Administratör), Snöplanering (växlarna i en rad med tydliga namn, "⚠️ N saknar storlek →" i stället för varning per kort), Registret (＋ Ny fastighet öppnar formuläret).

## Hur det blev (2026-11-07)
- Alla 16 sidor använder de gemensamma knapparna (egna knappklasser 83 → 16, bara klickbara kort kvar; färger 107 → 86, mest kartmarkörer och zonfärger).
- Startsidan: en hälsning, statusraden bara utan täckning, packlistan en gång per dag (`lpv_packat`), notisen under rubriken, 🔧 Administratör hopfälld (`lpv_admin_oppen`).
- Snöplanering: "⚠️ N saknar storlek →" i listen öppnar `snoregister.html?filter=saknar`. Registret: ＋ Ny fastighet öppnar formuläret.
- Läget: startsidan (Läge) och Mer-menyn. `[data-theme-slot="keep"]` om en sida ändå behöver en egen knapp.
- Kända gamla fel (fanns före ombyggnaden): vader-e2e, fleraregistrerar-e2e och hinder-e2e (tom adresslista i testdatan) – ligger inte i kor-alla.sh.

## Lägsta krav på telefon/webbläsare (2026-11-07)
Daniel: hellre en tydlig spärr än en app som fungerar halvbra. `kravkoll.js` (först i `<head>` på alla appens sidor, skriven i gammal JavaScript) kräver `color-mix()` och `dvh` i CSS samt `?.`/`??` i JavaScript = **iOS/Safari 16.2** (iPhone 8/X, iPad 6:e gen och nyare) eller ny Chrome/Edge/Firefox. Annars visas "Telefonen behöver uppdateras" med enhetens version. Kundernas offert-/ÄTA-länkar (`?offert=`, `?ata=`) spärras aldrig. Test: `kravkoll-e2e.js`. Vill man använda något nyare i CSS/JS ska kontrollen höjas samtidigt.
