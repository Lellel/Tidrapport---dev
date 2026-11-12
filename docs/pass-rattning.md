# Rätta, radera och skriva under pass

*Beslutat med Daniel 2026-11-12. Hör till kortet "🛠 Önskemål i appen" (punkt 2 och 3: rätta/radera poster i Ekonomi + redigera inlagda pass).*

## Grundidé
Punkterna "rätta poster i Ekonomi" och "redigera pass" är samma sak, eftersom Ekonomis *Löpande räkning* byggs av tidrapporterna. Rättas ett pass, rättas också Ekonomi.

Passen har ingen ID-kolumn. Ett pass pekas ut på samma sätt som `markInvoiced` redan gör: **radnummer + sparad-tid (kolumn H) + användare (kolumn I)**. Om de inte stämmer görs ingenting, så det blir aldrig fel rad.

## Regler
- **Föraren äger sina pass tills hen skrivit under.** Förare, handskottare och UE rättar och raderar fritt i 📋 Mina pass.
- **✍️ Skriv under** = man rättar det som behöver rättas och kvitterar sedan **alla** pass som inte är underskrivna med en knapp (inte per vecka). Namn och tid sparas i en ny kolumn.
- **Efter underskrift** kan bara admin och ekonom rätta eller radera.
- **Fakturerade pass** är låsta för alla.
- **Spår:** varje rättning skriver en rad i anteckningen, t.ex. "Rättad 2026-11-12 av Daniel (var 07:00–09:00)".
- **Radera** flyttar raden till bladet **"Raderade pass"** (går att ta tillbaka) i stället för att ta bort den.
- **Ekonomi** visar ✍️ på underskrivna pass och **varnar** när man fakturerar pass som inte är underskrivna.
- Fält som går att rätta: datum, start, slut, plats, aktivitet, anteckning. Timmarna räknas om.

## Steg
1. ✅ **Server + Ekonomi** (admin/ekonom), byggt 2026-11-12: ✏️ Rätta och 🗑 Radera per pass i Löpande räkning. Server: `updateReport`, `deleteReport` (economyOnly). Test: `verktyg/tester/passtest.js`.
2. **📋 Mina pass + ✍️ Skriv under** för förare/handskottare/UE, ovanpå samma serverfunktioner. Här kommer också ✍️-ikonen och varningen i Ekonomi – de flyttades hit, eftersom ingen kan skriva under förrän steg 2 finns.

## Också beslutat 2026-11-12
- **💰 Ekonomen ser** (kryssrutor LPV/Klaryta på personalkortet, bara admin på LPV ändrar). Sparas i kolumn N "Ekonomi ser" i Personal; tom = eget bolag. Gäller bara Ekonomi (`inEconomyScope` i Kod.gs) – allt annat följer `inScope`.
- **Bolagsfilter i Ekonomi:** Alla · LPV · Klaryta, syns bara när listan har båda bolagen. Sparas per enhet. Exporten följer filtret.
- **＋ Ny kund** under 💼 Kunder (`saveCustomer`): företag/BRF eller privat, Källa "APP", inte till HubSpot i första versionen. Personnummer sparas aldrig, dubbletter (e-post/org.nr) stoppas. Test: `verktyg/tester/nykundtest.js`.
