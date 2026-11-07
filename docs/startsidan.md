# Startsidan – iPad/dator, knappmenyn och snösäsongen

Bestämt med Daniel 2026-11-07. **Inte byggt än** – byggs när Daniel säger till. Följer docs/designsprak.md.

## Varför
En admin kan i dag nå samma sidor på fyra ställen: vänstermenyn som fälls ut (`side-nav-drawer`), flikraden, Mer-menyn och knapparna i 🔧 Administratör. Vänstermenyn öppnas när musen hålls över den, något som inte finns på iPad, så där blir den krånglig. Personformuläret är det största blocket i högerspalten men används sällan. Målet är **en** plats för navigeringen per skärmstorlek och ett renare flöde.

## Beslut
1. **Vänstermenyn tas bort** (`side-nav-drawer` i index.html och style.css, `has-side-nav`).
2. **Knappmeny i högerspalten** på iPad/dator (liggande eller ≥ 768 px). Den har en knapp per sida: Snöplanering, Rita zoner, Väder, Radarn, Offerter & ÄTA, Kunder, UE, Ekonomi, Personal, Appikoner, Bruksanvisning och 🎛️ Moduler (bara SU). Varje person ser bara de knappar den har behörighet till, efter samma moduler/roller som i dag. Knapparna är vanliga `lpv-btn` i ett rutnät, inga nya knappstilar.
3. **Telefonen är oförändrad**: flikraden Hem/Radarn/Snö/Offerter/Mer plus Mer-menyn. Mer-menyn får samma säsongsordning som knappmenyn.
4. **Personer flyttar till Personal-sidan** (personal.html): ＋ Ny person, och per person 📦 Välkomstpaket, 💬 SMS, ✉️ Mail, 🏁 QR och 🔑 Spärra & skapa ny länk. Hela 🔧 Administratör-blocket på startsidan försvinner, både personformuläret och sidknapparna. Det sparade valet `lpv_admin_oppen` behövs inte längre.
5. **Snösäsong = en växel** (❄️ Snösäsong) i **SU-gränssnittet** (moduler.html), som gäller hela bolaget. Den sparas på servern (Kod.gs). Ingen automatik efter datum eller väder.
6. **Säsongen styr knappmenyn och Mer-menyn**:
   - *Ordningen*: under snösäsong kommer Snöplanering, Rita zoner och Väder först, utanför den Offerter, Kunder och UE först.
   - *Vad som syns*: utanför snösäsong flyttas snöknapparna (Snöplanering, Rita zoner, Väder) in under "⋯ Fler" i menyn. Under snösäsong syns allt, med offertknapparna sist.
7. **❄️ Snöläget live** överst i högerspalten under snösäsong, **bara för admin**: Plogometern (väder), hur många fastigheter som är klara/kvar i kväll, hur många traktorer som är ute, och knapparna ❄️ Snöjour – karta & GPS (fylld blå, den viktigaste handlingen) och 🚜 Snöplanering. Knappmenyn ligger under kortet.
8. **Översiktskarta i Snöläget** (bestämt samma dag):
   - Visas **bara under ett pågående snöfall** (`SNOFALL`). När det är lugnt finns ingen karta, bara ❄️ Nytt snöfall och knappmenyn.
   - Kartan är en mindre version av Snöplaneringens kartvy och hämtar sina uppgifter från `getSnowBoard`. Den laddas bara för admin på iPad/dator, aldrig i telefonen.
   - **Lamporna har samma färger som i Snöplaneringen** och ser likadana ut överallt: ⚪ grå = inte påbörjad, 🟡 gul = påbörjad (en del klar, t.ex. 🚜 klar och 🧹 kvar), 🟢 grön = alla delar klara, ⭕ röd ring = saknar traktor.
   - **Förvalt: hela kommunen**, med en rad per kommundel (Malmköping 8/12, Flen S 3/9 …). Tryck på en rad, eller välj med ‹ › ovanför kartan, så zoomar kartan till den kommundelen och siffrorna gäller den.
   - **Tryck på en lampa** för att få en liten ruta på startsidan: adress, vem som kör, status, klockslaget för ✅ Klar och "Öppna i Snöplanering →".

9. **Översikt & Tider (dagens timmar och pass) döljs** i högerspalten. Den kan slås på igen med en växel i SU-gränssnittet (moduler.html).

## Öppna frågor (tas innan bygget)
- Vilka siffror finns redan att hämta för klara/kvar/ute: kontrolleras i Kod.gs (`getSnowBoard`) när bygget börjar.

## Dockan på Macen (beslut samma dag)
"Lägg till i Dock" i Mac-Safari ger appen ett eget minne, och jag tror att Safari bara kopierar över kakor dit. Därför följer inloggningsnyckeln (`lpv_key` i webbläsarens minne) inte med. **Beslut:** samma undantag som på iPhone/iPad (app.js, `iosBrowser`): i Safari på Mac ligger `key` kvar i adressen, så Dock-appen får den med sig. En inloggningsruta som reserv byggs inte nu.

## HubSpot (läget 2026-11-07)
Det mesta är byggt men inget är provat. En offert skickas som kontakt plus affär till rätt HubSpot efter varumärke, och affären följer offertens fas. Kunder och affärer kan hämtas in till kundregistret. TESTLISTA 10c är inte avbockad. **Beslut:** vänta tills startsidan är klar.

## När det byggs
- Uppdatera guide.html (admin: var Personal/knapparna finns, ❄️ Snösäsong), lägg en rad i nyheter.js och räkna upp `CACHE_NAME` i sw.js.
- Sänk baslinjen i designbaslinje.json när admin-knapparna (`admin-btn`, `main-btn admin-nav-btn`) och `side-nav-item` försvinner.
- Kör kor-alla.sh, och kor-e2e.sh på iPad-storlek.
