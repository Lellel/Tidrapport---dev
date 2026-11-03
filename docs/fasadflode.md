# Fasadmålning: från förfrågan till offert

Bestämt med Daniel 2026-11-03. Inget av detta är byggt än.

## Juridik: uppskattning är inte offert
- **Kostnadsuppskattning**: när kunden själv fyller i förfrågan. Preliminär och inte bindande.
- **Offert**: först efter platsbesök. Bindande för båda parter.
- Konsumenttjänstlagen: en prisuppgift till en konsument kan räknas som "ungefärligt pris" (får överskridas med högst ca 15 %). Texten på uppskattningen ska stämmas av med jurist eller Måleriföretagens standardvillkor innan den används skarpt.

## Flödet
1. **Förfrågan (kunden, via länk från t.ex. fasadmalarna.se)**: adress, antal våningar, nuvarande kulör, önskad kulör (eller samma), om fönster/dörrar ska målas, foton, kontaktuppgifter. Kunden får "Tack, vi återkommer". Ingen siffra visas direkt.
2. **Uppskattning (appen, automatiskt)**: hamnar på kontoret som **Att granska**.
3. **Granskning av uppskattningen (kontoret)**: kontrollerar husets kontur på kartan, justerar och skickar uppskattningen med ett klick.
4. **Platsbesök**: bokas som ett jobb i radarn (jobbtyp Platsbesök, med packlista och påminnelse dagen innan – se packlista.md). Mätning med fasadverktyget (huskroppar och väggar), foton, kulörval. Uppskattningen blir ett **offertutkast**.
5. **Granskning av offerten (kontoret)**: lägga till/ta bort rader, korrigera timmar utifrån bilder, restid med mera.
6. **Offert till kunden**: bindande, som i dag (PDF, länk, godkänn/avböj, HubSpot).
7. **Uppföljning**: kalkyl mot utfall i tid (tidrapporter på jobbet) och kostnad (inköp).

## Uppskattningen
- **Fasadyta**: husets kontur från kartan (OpenStreetMap) → omkrets × våningshöjd × antal våningar, plus gavlar. Avdrag för fönster. Granskaren kan ändra ytan.
- **Strykningar**: kulörbyte = 3 (grundfärg på hela ytan + 2 täckfärg). Samma kulör = 2 täckfärg (grundfärg bara punktvis, ingår i underarbetet).
- **Rader (alltid med)**:
  - Underarbete (tvätt, skrapning) – timmar
  - Grundfärg – timmar (bara vid kulörbyte)
  - Täckfärg – timmar
  - Material per produkt – liter (inköpspris och pris till kund)
  - **Transportbil** – alltid med (krävs för att Skatteverket ska godkänna ROT): avståndet tur och retur från Strömsborgsvägen 3, Bettna × antal arbetsdagar × pris per mil
  - **Restid** – egen rad automatiskt: restid tur och retur × dagar × antal målare (granskaren kan ändra/ta bort)
- **Arbetsdagar** = timmar ÷ (8 h × antal målare), avrundat uppåt. Antal målare är en inställning (förval 2).
- **Visas för kunden** som ett prisintervall, före och efter ROT, med tydlig text att priset kan bli både högre och lägre efter platsbesök, och att skylift och andra tillkommande kostnader kan tillkomma.

## Produkter (Inställningar → Produkter)
- Alcros utomhussortiment: Bestå, Diamant, Arkitekt m.fl. (grundfärg, täckfärg, fönsterfärg).
- Per produkt: namn, typ, **inköpspris/liter**, **pris till kund/liter**, åtgång m²/liter.
- Startar med de vanligaste; Daniel justerar när prislistan finns.

## Kulörer
- NCS-kod **och** Alcros kulörnamn.
- Tre fält: **Fasad**, **Detaljer** (knutar, vindskivor), **Fönster och dörrfoder**.
- Kopplas till kulörförslagen (AI-bilderna).

## Kulöravläsning med NCS-scanner (platsbesök)
- Scannern är Datacolor ColorReader; appen visar två skärmar. Ta en skärmdump av båda.
- I offertutkastet: **Nuvarande kulör → 📷 Lägg in skärmdumpar**. AI läser av och fyller i, användaren bekräftar:
  - från "Färgläsningsdata": **hex**, **LRV**, **Lab** (L, a, b)
  - från "Färgmatchningar": **NCS-kod + ΔE**, **Alcro-namn/kod + kollektion + ΔE** (även RAL om det finns)
- ΔE över 2 → "osäker matchning – kontrollera mot kulörkartan".
- Hex används som husets färg på skärmen (kulörförslag, offert). Lab sparas så att vi senare kan matcha mot appens egen Alcro-lista utan AI.
- Lågt LRV (mörk kulör) vid kulörbyte → påminnelse om att kontrollera Alcros rekommendation för mörka kulörer på trä.
- Skärmdumparna sparas med offerten och egenkontrollen som underlag (kulören före jobbet).
- Samma sätt för **önskad kulör** och **detaljer** (fönster, knutar, dörrfoder).
- Tips: i ColorReader → Färgkollektioner, välj NCS och Alcros utomhuskulörer (inte inredningskollektionen).

## Texter på offerten
- "Fönster, dörrar och metalldetaljer ingår inte i det offererade jobbet." – alltid med, **tas bort när fönstermålning ingår**.

## Inställningar som behövs
Timpris, pris per mil (transportbil), antal målare, m²/timme för underarbete och per strykning, våningshöjd, fönsteravdrag (%), utgångsadress (Strömsborgsvägen 3, Bettna).
