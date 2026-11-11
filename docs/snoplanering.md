# Snöplanering – fastigheter som arbetsorder, traktorer som kulor

Resonerat med Daniel 2026-11-05. **Byggt samma dag** (se "Hur det blev" längst ner). Kvar att resonera om: uppföljning/fakturering mot UE.

## Grundidé
- **Fastigheten = arbetsorderkort** med ett **hål** i rätt storlek (🟠 stor / 🔵 liten, ⚠️ tvinga stor för gränsfall) – finns redan i Snöplanering.
- **Kulor dras direkt till fastigheten.** Slingorna behövs inte längre – kartan ger helhetssynen. (Ordning i Rita zoner är redan borttagen.)
- Per fastighet: **en traktorkula** i hålet + ev. **handskottarkulor** för handzonerna.
- Storleksregeln (finns): liten kula passar i både stort och litet hål, stor kula bara i stort (om inte ⚠️ tvinga stor).

## Ägare och enheter
- **Ägare:** antingen **Egna (LPV)** eller ett **UE-företag** (t.ex. "Snöbröderna AB").
- Varje ägare har enheter, som blir kulor:
  - **🚜 Traktorkula** = maskin + fast förare (fasta par är det vanliga, både hos oss och hos UE). En UE kan ha flera traktorkulor.
  - **🧹 Handskottarkula** = en person. Både vi och UE kan ha handskottare.
- **Var det skrivs in:**
  - Personer (förare, handskottare) på **Personal-sidan**. Personer med rollen UE får fältet **UE-företag**. Alla får välkomstpaket som vanligt.
  - **Traktorkortet** (Snöplanering → Traktorer) får **Ägare** (Egna / UE-företag) och **Förare** (bara personer med samma ägare).
- **Kulpåsen** delas per ägare – UE:s resurser blandas aldrig med våra i listan.
- **På en fastighet får det blandas** (t.ex. UE plogar, våra handskottare tar entréerna).

## Snöjour (bestämt 2026-11-05)
- **Förare/handskottare** ser **Mina fastigheter** = där hens kula ligger. Kartan visar bara dem; den egna typen tydlig (föraren maskinytor, handskottaren handytor), 🔴 Ej röjning och hinder alltid.
- **Ordning: närmast först** (GPS), ej klara överst, klara gröna sist. Överst "8 av 12 klara".
- **Kortet:** namn, adress, ⭐, m² av egen typ, *att tänka på*, **Kör dit**, **📄 Kundkarta** (läggs över kartan vid behov) och stor **✅ Klar**.
- **Delad fastighet:** var och en markerar sin del (🚜 klar / 🧹 klar); grön på tavlan när alla delar är klara, gul när påbörjad.
- **UE-ansvarig** (markeras på Personal-sidan) ser alla företagets fastigheter med rad per förare ("Kalle 8/12"), kan markera klart åt sina förare. Ser inte LPV:s egna.
- **Admin** ser allt; tavlan visar framstegen live.
- **Tid:** ett **▶️ Starta snöpass / ⏹ Avsluta** för hela passet. Anteckningen skrivs automatiskt ("Snöjour: 12 fastigheter klara (Storgatan 3, …)"). Varje ✅ Klar sparar vem + klockslag → underlag för uppföljning/fakturering mot UE.
- **Nollställning:** admin trycker **❄️ Nytt snöfall** på tavlan → alla fastigheter blir ogjorda (historiken sparas per snöfall). **Kulor och fastigheter ligger kvar som förra gången** om ingen flyttar dem.
- **Utan täckning:** klar-markeringar köas i telefonen och skickas när nätet kommer tillbaka; listan och zonerna finns kvar från senaste laddningen.

## Tavlan (bestämt 2026-11-05)
- **Fastighetskort** (ett per fastighet): fastighetens namn (kund/Brf) + adress, ⭐ prio, **ytor från Rita zoner** (Maskin m² / Hand m²), **✅ zoner klara**, **område**.
- **Platser för kulor:** 🚜-hålet i rätt storlek (orange = stor, blå = liten; kula som inte passar studsar tillbaka) + 🧹-platser för handskottare (en eller flera, ＋ för fler; visas bara om fastigheten har handzoner).
- **Sortering:** per område (rubrik per område), sedan adress.
- **Kulpåsen** överst, en grupp per ägare (Egna / varje UE-företag). Varje kula visar hur många fastigheter den har (t.ex. "Kramer (Pelle) · 7").
- **Flytta kulor:** dra med finger/penna – eller tryck på kulan och sedan på platsen (säkrare när man måste scrolla).
- **Kartan** visar kulorna vid fastigheternas nålar (vem kör var); tomma hål syns som röda ringar.

## En kommundel i taget (bestämt 2026-11-05)
- **Väljare överst** (Bettna, Hälleforsnäs, Flen Södra …): bara den kommundelens fastighetskort, kartan zoomar dit, och "3 av 8 fastigheter har traktor".
- **Traktorkulor:** först de som är **stationerade** i kommundelen (traktorns Ort/uppställning), grupperade per ägare. Övriga hopfällda under **⋯ Övriga**, sorterade efter avstånd (närmast först) – om man behöver låna.
- **Handskottarkulor:** syns i **alla** kommundelar, sorterade efter **avstånd** (närmast först, t.ex. "🧹 Ahmed · 3 km"). Avståndet räknas från personens **hemort/hemadress** (nytt valfritt fält på Personal-sidan, får kartpunkt automatiskt), annars från fastigheterna personen redan har fått, annars sist utan avstånd.
- **Siffran på kulan:** antal fastigheter i kommundelen (och totalt om den kör på flera ställen), t.ex. "Kramer (Pelle) · 3 (av 9)".

## Kvar att resonera om
- ~~Uppföljning/fakturering mot UE~~: se *Fakturering och tidredovisning* nedan.
- ~~Slingor~~: tas bort i samma bygge (Snöjour-filtrering, Hinder, tidrapportens "slinga X", widgeten, Slinga-fältet och Förare-fliken i Rita zoner).

## Hur det blev (byggt 2026-11-05)
- **Kod.gs:** fliken **Snöresurser** (Namn, Ägare, Handskottare, UE-ansvarig, Hemort, Lat, Lng). Traktorer fick kolumnerna **Ägare** och **Förare**, Fastigheter fick **Traktor (ID)** och **Handskottare (JSON)**. Fliken **Snöfall-logg** (en rad per ✅ Klar: snöfall, tid, fastighet, del, enhet, ägare, vem). Pågående snöfall i Script Properties (`SNOFALL`).
- **Anrop:** `getSnowBoard`, `assignSnow`, `newSnowfall`, `saveSnowPerson` (admin), `getSnowJour`, `markSnowDone` (alla). `getSnowZones` och hindren filtreras på fastigheterna där ens kula ligger. Väderområdena (Plogometern, widgeten) räknas också därifrån.
- **Behörighet:** förare = sin traktor, handskottare = sig själv, UE-ansvarig = allt med samma ägare, admin = allt.
- **Slingorna är borta:** fliken Slingor används inte längre (kan raderas i arket), kolumnerna Slinga/Ordning i Snözoner lämnas tomma. Rita zoner har bara flikarna Fastighet och Zoner.
- **Kommundel** = fastighetens Område (annars Ort). Traktorn räknas som stationerad om Ort / uppställning matchar kommundelen.
- **Kulor som släpps på kartan** hamnar på närmaste fastighetsnål (inom 40 px).
- Testat i Chrome med låtsasserver: tavlan 30/30, Snöjour förare 19/19, handskottare 2/2, UE-ansvarig 4/4, admin 5/5, Personal 4/4.

## Snöplaneringen som Radarn (bestämt 2026-11-06, ej byggt)
Samma utseende och arbetssätt som Radarn (radar.html), men:
- **Traktorremsan** ligger där Radarns **orderbok** är (överst, fällbar): traktorkulorna med förare och antal fastigheter, ⋯ Övriga kommundelar.
- **Kulpåsen** (vänster, fällbar): 👷 förare och 🧹 handskottare. Handskottarna sorterade närmast först.
- **Planeringsytan** (där Radarns tidslinje är) är **ingen tidslinje**: fastigheterna som **kort i ett rutnät**, ungefär som orderbokens kort.

**Listen:** ← Hem · ❄️ Snöplanering · [🏠 Fastigheter | 🚜 Traktorer | 🗺️ Karta] · ‹ kommundel › · ❄️ Snöfall 04:10 · 8/12 · ❄️ Nytt snöfall · [Kulpåse] [Traktorer].

**Förare på traktorn:** dra föraren från kulpåsen till traktorkulan i remsan → fast par tills man ändrar. Traktorn tar med föraren till alla sina fastigheter. En förare som sitter på en traktor plockas ner till **Upptagna** (hopfällt, som i Radarn). Handskottare stannar kvar (kan ha flera fastigheter).

**🏠 Fastighetsvyn:** rutnät med kort per kommundel.
- **⚠️ Väntar på traktor** överst: kort utan traktor (rött tomt hål). Kortet flyttar ner till sin ort när det fått traktor. Tom grupp → "✅ Alla har traktor" i listen.
- Under: korten per ort, sedan adress. Dra traktor från remsan till hålet, person från kulpåsen till 🧹-platsen. Dra tillbaka för att ta bort.
- Under ett snöfall blir korten gröna/gula men **står kvar på sin plats**.

**🚜 Traktorvyn:** en rad per traktor med dess fastigheter som kort.
- Raden **⚠️ Utan traktor** överst (som orderboken). Dra en **fastighet** till en traktors rad = tilldela; tillbaka = ta bort; till annan rad = byt. Kort som inte passar (stor traktor, litet hål) studsar.
- Sist på varje rad: antal fastigheter och m² (vem som har för mycket). Ingen tidsberäkning.

**🗺️ Kartvyn:** kulorna vid nålarna, fastigheter utan traktor som röda ringar. Kulpåse och traktorremsa finns kvar – kulor kan släppas på nålarna.

**Detaljruta** (tryck på ett kort, som jobbrutan i Radarn): adress, kund, ⭐, ytor, att tänka på, kulorna (ta bort), status i snöfallet, länkar till Rita zoner och kundkartan.

## Fakturering och tidredovisning (bestämt 2026-11-06, ej byggt)
Ersätter "Uppföljning/fakturering mot UE" under *Kvar att resonera om*.

**Timdebitering** mot både kunder och UE. **Hela passet** (▶️ Start → ⏹ Avsluta) debiteras och fördelas på fastigheterna – ingen minut försvinner.

### Uppdelningen (per förare/handskottare och pass)
1. **Ordning** = Klar-tiderna i Snöfall-logg.
2. **Körtid** mellan fastigheterna räknas med Apps Scripts inbyggda vägberäkning (Maps.newDirectionFinder), sparas per adresspar.
3. **Röjning** på en fastighet = tiden mellan förra Klar och denna Klar minus körtiden dit. Går det trögt i snön hamnar det på röjningen – totalen stämmer alltid mot passet.
4. **Start/slut:** traktor = uppställningsplatsen (Ort / uppställning), handskottare = hemorten (Snöresurser).
5. **Utkörning och hemkörning** (depå → första, sista → depå) **delas lika** på alla fastigheter i passet. Körning mellan fastigheter går till den man kör till.
6. **Varning ⚠️** för granskning i Ekonomi: körtid längre än tiden mellan två Klar, orimligt lång tid på en fastighet (glömd Klar), pass utan Avsluta.

### Fakturan
- **Transporten är ingen egen rad** – den ingår i fastighetens timmar.
- Underlag per kund → snöfall → fastighet: timmar maskin och timmar hand.

### Priser
- **Olika timpris för maskin och handskottning.**
- **Försäljning (det vi tar betalt) och inköp (det vi betalar UE) är olika priser.**
- ~~Öppet: per traktor eller per storlek (stor/liten)? Inköpspris per UE-företag? Kundunika priser?~~ Svar från Danne 2026-11-08:
  1. **Pris per ort, inte per traktor/storlek:** Flen 1 000 kr/h för alla, Nyköping 1 250 kr/h för alla.
  2. **Varje UE har eget avtal**, men det som skiljer just nu är **jouren**.
  3. **Kundpriser:** Flen = bara kommunen, ett pris. Nyköping = olika priser mot kund men samma mot UE. Danne samlar ihop priserna under veckan 2026-11-09.
- Följdfrågor till Danne (inte ställda än):
  - Är 1 000/1 250 kr/h det vi betalar UE, det kunden betalar, eller båda?
  - Samma timpris för maskin och handskottning, eller olika (vi bestämde olika 2026-11-06)?
  - Hur skiljer jouren mellan UE: fast ersättning per vecka/säsong, per pass, eller ett påslag på timpriset?
- **Bygg inte prislogiken förrän Nyköpings kundpriser och följdfrågorna är klara.** Troligen räcker en tabell *ort → timpris (inköp)*, *kund → timpris (försäljning, standard per ort)* och *UE → jour*.

### Ut i systemet
- **Ekonomi:** snöunderlaget per kund (försäljningspris), granska ⚠️, markera fakturerat – som tidrapporterna i dag.
- **UE:** samma uträkning per UE-företag med inköpspris = kontrollunderlag mot deras faktura.
- **Lön (egen personal):** passet delas i tidrapporten i *Snöröjning* och *Transport*.

## UE-vyn, avtal och kundkartor till UE

Resonerat med Daniel 2026-11-07. **Byggt samma dag** (se *Hur det blev* nedan).

### 🤝 UE-vyn (bara admin)
Allt som rör UE registreras och ändras här. Nås från Hem och från Snöplanering.
- **＋ Nytt UE-företag:** namn, org.nr, adress, kontaktperson, telefon, e-post, anteckning om avtalet.
- **Personer:** UE-ansvarig, förare och handskottare läggs till direkt på företaget (roll UE, UE-företag ifyllt) och får välkomstpaket som vanligt. Ändra/ta bort här.
- **Traktorer:** ＋ Ny traktor (storlek, Ort/uppställning, förare) med företaget som ägare. Ändra/ta bort här.
- **Fastigheter:** lista per kommundel med traktor och handskottare. Tilldelning sker som förut i Snöplanering; här kan man ta bort en fastighet från UE:t. "Öppna i Snöplanering" öppnar tavlan (ännu utan filter på företaget).
- **Personal-sidan:** UE-personer syns kvar, men ett klick på dem öppnar företaget i UE-vyn.

### ☐ Avtal accepterat
- En kryssruta per UE-företag, bara admin. Sparar datum och vem som kryssade. Avkryssning kräver bekräftelse.
- **Före avtal:** företagets traktorkulor är **grå** (tavlan, traktorvyn, kartan) men går att dra till fastigheter som vanligt. UE ser sin runda och kan hämta kartorna i Snöjour, men larmas inte vid snöfall och har inga ▶️ Starta pass / ✅ Klar – i stället "Väntar på avtal".
- **Efter kryss:** färg som vanligt och UE är med i snöjouren.

### Mejl med kundkartorna
- **📧 Skicka mejl med kartorna** (egen knapp, ändrat 2026-11-07 – krysset skickar inget mejl): UE-ansvarig får ett mejl **från Klaryta** (Klaryta-loggan, Klaryta som avsändarnamn), **kopia till admin**: "Avtalet är registrerat – ni är nu med i snöjouren", med en **samlad PDF** över rundan som bilaga.
- Är avtalet inte ikryssat skickas mejlet utan avtalstexten (bara rundan). Skickas igen när rundan har ändrats.
- **Samma kartbild** (t.ex. en karta för två adresser) kommer bara med en gång – en sida med alla adresserna. Kartorna är redan JPEG 1600 px (snitt 330 kB), så mer går inte att krympa utan att ändra bilderna.
- PDF:en: en sida per fastighet, adressen som rubrik, **bara kundkartan** (inga ritade zoner). Fastighet utan karta = sida med "Karta saknas".

### Kundkartor i Snöjour
- 📄 på varje fastighet och **Alla mina kartor** (samlad PDF). UE-ansvarig får hela företagets runda, förare bara sina egna fastigheter.

### 🔍 Org.nr-uppslag och ☐ F-skatt kontrollerad (resonerat och byggt 2026-11-07)
- **Varför så här:** Bolagsverkets öppna API ("värdefulla datamängder") är gratis men slår bara upp **på org.nr** – ingen namnsökning. Skatteverkets API för F-skatt (*Beskattningsengagemang*) kräver organisationscertifikat + avtal och klaras inte av Apps Script. Betaltjänster (Roaring, Creditsafe) ger allt men kostar – Daniel valde gratisvägen (väg 2). Telefon/e-post finns inte i registren och fylls i för hand.
- **🔍 Hämta** vid Org.nr i Uppgifter fyller i namn och adress (frågar innan något ifyllt skrivs över), visar bolagsform och varnar om företaget är avregistrerat. Enskilda firmor utan handelsregistrering finns inte hos Bolagsverket.
- **☐ F-skatt kontrollerad** i företagskortet under avtalet, bara admin. **🔎 Kolla F-skatt** öppnar Skatteverkets *Hämta företagsinformation* och kopierar org.nr. Krysset sparar datum och vem. Det stoppar inget – det är en påminnelse.
- **Kod.gs:** `lookupOrgNr` (admin; org.nr kontrolleras med Luhn, OAuth client credentials mot portal.api.bolagsverket.se, token i CacheService, POST `/vardefulla-datamangder/v1/organisationer` med `identitetsbeteckning`; `debug: true` ger rå-svaret) och `setUeFskatt`. Nycklarna: Skriptegenskaper `BV_CLIENT_ID`, `BV_CLIENT_SECRET`. Fliken UE-företag fick kolumnerna **F-skatt kontrollerad, F-skatt av** (rubrikerna skrivs första gången någon kryssar).
- **Overifierat:** Bolagsverkets svarsformat är inte provat än – adressen letas upp som första objektet med `postnummer`. Prova med `debug: true` när nycklarna finns.
- Sidlogiken ligger i `ue-uppslag.js`.

### Väntar
- **Inköpspris per UE-företag** tas med när faktureringen resoneras klart (se *Priser* ovan).

### Hur det blev
- **ue.html** (🤝 UE): från startsidan (Administratör, sidomenyn, Mer) och 🤝 UE i Snöplaneringens list. Personal-sidan skickar UE-personer (ägare ≠ Egna) hit: `ue.html?f=<företag>&p=<person>`.
- **Kod.gs:** fliken **UE-företag** (UE-ID, Namn, Org.nr, Adress, Kontaktperson, Telefon, E-post, Anteckning, Avtal accepterat, Avtal av, Uppdaterad). Åtgärder (admin): `getUeOverview`, `saveUeCompany` (namnbyte skriver om Ägare i Snöresurser och Traktorer; företag som bara fanns som ägare får en rad med `oldName`), `deleteUeCompany` (bara tomt), `setUeAgreement`, `sendUeMaps`. Alla: `getSnowMapsPdf` (fastigheterna man ser i Snöjour, ev. en).
- **Avtalet:** `ueAgreementOk(ägare)` – Egna alltid, UE bara med datum i fliken. `getFleet`/`saveTractor`/`getSnowBoard` får `ueOk` → grå kula. `getSnowJour` ger `waitingAgreement` och `canMark: false` för UE utan avtal; `markSnowDone` nekas (admin får alltid).
- **Mejlet:** till UE-ansvarigas e-post (annars företagets), kopia + svara-till den admin som kryssar, avsändarnamn Klaryta med Klarytas logga, PDF bifogad. Saknas e-post sparas avtalet ändå och vyn säger att mejlet inte gick.
- **PDF:en:** HTML → PDF i Apps Script, A4, en sida per kundkarta (alla kartor på fastigheten, inte bara utlagda), adress + område/kund som rubrik.
- **Nya UE-personer** läggs in med rollen UE och bolag Klaryta (Klaryta-admin får alltid sitt eget bolag).
- Tester: `uetest.js` (servern, i kor-alla.sh) och `ue-e2e.js` (webbläsaren).

## Strandade traktorer och byten – även i telefonen (bestämt och byggt 2026-11-07)
Tavlan (dra och släpp) fungerar inte i en telefon. Admin behöver ett eget **tryckflöde som utgår från traktorn**.

**Larmet:** föraren trycker **⚠️ Traktorn står** i Snöjour och väljer orsak (fast / trasig / slut på diesel / annat). UE-ansvarig kan göra samma sak för sitt företags traktorer. Larmet går till admin som SMS med en länk rakt in i flödet, och för UE-traktorer även till UE-ansvarig. Bara admin, och UE-ansvarig inom sitt eget företag, flyttar fastigheter.

**Traktormenyn** (från larmlänken, eller Snö-fliken → traktorlistan med lampor → tryck på traktorn): 🚨 Traktorn står · 👤 Byt förare (samma traktor och runda) · 📞 Ring föraren.

**🚨 Traktorn står → två vägar:**
- **🔁 En annan traktor tar hela rundan.** Traktorerna listas med lediga först och närmast först. Traktorer som är för stora för fastigheterna är gråade.
- **🧩 Fördela det som är kvar.** Bara fastigheter som inte är klara. Varje fastighet är förifylld med **närmaste traktor i drift som passar storleken**, med de som har minst kvar först. Tryck på en rad för att ändra. "⚠️ ingen passar" om det saknas en traktor som passar.

**✅ Bekräfta:**
- Flytten gäller **bara detta snöfall**. Fastigheterna går tillbaka till sin vanliga traktor när snöfallet avslutas, och planeringen ligger kvar orörd.
- Det som redan är klart ligger kvar på den gamla traktorn, så tiderna och faktureringen stämmer.
- Traktorn märks 🔧 Ur drift (på tavlan, kartan och i Snöläget) tills någon trycker **Tillbaka i drift**.

**Meddela förarna** (sista vyn): appen uppdateras alltid, och de nya korten får 🆕 i Snöjour. Det finns en rad per mottagande förare med **📞 Ring** (öppnar telefonen, raden får ✓ Ringd) och **💬 SMS** (färdig text med adresserna, skickas bara om admin trycker). Admin har oftast pratat med föraren redan, så inget skickas automatiskt.

**Förarens bekräftelse är en mjukfråga:** på 🆕-korten i Snöjour finns **👍 Uppfattat**. Den låser ingenting, och föraren kan köra och trycka ✅ Klar utan att svara. Admin ser "✓ Uppfattat 05:12" på förarens rad i Meddela förarna och i traktorlistan.

**iPad/dator:** samma ruta som i telefonen, ovanpå startsidan eller tavlan. Flödet lärs in en gång och ser likadant ut överallt.

### Orsaker och animeringar på kulan (bestämt 2026-11-07, provsida först)
Orsaken föraren väljer syns på kulan med en lite rolig animering, för att lyfta humöret för alla inblandade. Alla får röd kant och 🔧 Ur drift. Med "minska rörelse", i Natt-läget och för föraren under körning blir animeringen en stillastående bild av samma sak. Syns på **tavlan (Snöplanering)**, i **❄️ Snöläget på startsidan** och i **Snöjour hos förarna** (inte i admins traktorlista i telefonen).

**Traktor:** 💦 Hydraulslang (oljestråle + pöl) · 🪣 Sandspridaren (tallriken hackar, sandmoln) · 🛞 Punktering (sjunker ihop på ena sidan, "pfff") · ⛽ Slut på diesel (mätaren till E, sista rökringen, 💤) · 🧊 Fast i snön (gungar, snö sprätter) · 💡 Elfel / lampor (strålkastarna blinkar och slocknar) · ❄️ Plogbladet (hänger snett och dinglar) · 🥶 Startar inte (huttrar med istappar) · 🤒 Föraren sjuk (termometer + te som ångar) · ❓ Annat (rökpuffar).
- **"Föraren skadad" finns inte som val.** En skadad förare ringer, och vid olycka används ⚠️ Rapportera tillbud eller olycka som i dag.

**Handskottare – samma sak** (förslag, visas på provsidan): 🧹 Snöslungan (hostar och spottar en enda snöboll) · 🪓 Skyffeln gick av (skaftet knäcks, boing) · 🚗 Bilen startar inte (rrr-rrr) · 🧂 Slut på sand/salt (hinken vänds, ett korn faller) · 🥶 Frusen · 🤒 Sjuk · ❓ Annat. Handskottarens fastigheter fördelas på samma sätt, med 🧹-personer i stället för traktorer, närmast först.

**Påminnelse om snösäsongen** (kort i kortsnurran, bara SU, med knapp som slår om direkt):
- **Slå på:** när Plogometern visar snö inom 5 dagar och säsongen är av: "❄️ Snö i prognosen torsdag – slå på snösäsong?" [❄️ Slå på] [Inte nu]. Inte nu gömmer kortet tills prognosen ändras.
- **Slå av:** från 1 april, när inget snöfall har startats på 3 veckor och prognosen är snöfri: "🌱 Inget snöfall sedan 12 mars – slå av snösäsong?"

### Uppskattad tid till drift (bestämt 2026-11-07)
Alla admin ska kunna avgöra om det behövs ett byte eller om det bara blir en fördröjning.
- **Föraren anger ett klockslag** direkt efter orsaken i ⚠️ Traktorn står: "Igång igen ca **05:40**". Ett hjul i steg om 15 minuter, förvalt till nu + en typisk tid för orsaken (diesel 30 min, fast 15 min, punktering 1 h, hydraulslang 2 h, sjuk = passets slut). Valet **Vet inte** finns också. Föraren, UE-ansvarig och admin kan ändra tiden efteråt.
- **Det syns överallt där kulan syns:** "⏱ åter ~05:40" under kulan och i Snöläget.
- **SMS till alla admin:** "🔧 Kramer (Pelle) står – 💦 hydraulslang – ⏱ åter ~05:40 – 3 kvar" + länk. Den som tar ärendet trycker **🙋 Jag tar det**. De andra ser "Daniel hanterar" i appen, så att två inte flyttar samtidigt. Det andra SMS:et (om försening) går bara till den som tagit ärendet.
- **Tre vägar i flödet:** ⏳ **Vänta** (det blir en fördröjning, inget flyttas, kulan ligger kvar med sina fastigheter) · 🔁 En annan traktor tar hela rundan · 🧩 Fördela det som är kvar.
- **Appen rekommenderar** (markerad först, admin väljer alltid själv): åter om ≤ 30 min → ⏳ Vänta. Längre tid eller Vet inte → 🧩 Fördela. Finns ⭐ prio-fastigheter kvar är gränsen 15 min.
- **När klockslaget har passerat** får föraren en mjukfråga i Snöjour: "Igång igen?" [✅ Ja] [⏱ +30 min] [Nej, resten av passet]. Svarar föraren inte inom 10 min blir det "⏱ försenad" på kulan, och den som tagit ärendet får ett SMS. ✅ Ja = Tillbaka i drift.

### Hur det blev (2026-11-07)
- **Kod.gs** (avsnitt 4b2b DRIFTSTOPP): Skriptegenskapen `DRIFTSTOPP` = `{ sf, units: { "traktor:<id>"|"hand:<namn>": { reason, eta (ms | "resten" | null), at, by, handler, decision, back, lateSms } }, moves: [{ pid, part, from, to, at, by, ack }] }`. Gäller bara när `sf` = pågående snöfall, och ett nytt snöfall nollställer allt.
- `applySnowMoves` lägger flyttarna ovanpå fastigheterna i `snowVisibleProperties` (Snöjour, väderområden) och `markSnowDone`. Fliken Fastigheter rörs aldrig.
- Anrop: `reportStop`, `stopUpdate` (op `take`/`wait`/`eta`/`plus30`/`resten`/`back`), `stopSuggest`, `stopMove`, `stopSms`, `stopAck`, `stopSwapDriver`, `getStops`. Fältet heter `stop` (inte `key`, som är inloggningen).
- **Förslaget**: poäng = km + 0,8 × antal kvar. Läget = senaste klara fastigheten i snöfallet, annars mitten av enhetens fastigheter (handskottare: hemorten). En enhet utan fastigheter och hemort har okänt läge och hamnar sist.
- **⏱ försenad**: `driftstoppKoll` körs i vädermätningens kvartsutlösare (`vaderKollTrigger`). SMS:et kommer därför 10–25 min efter utlovad tid.
- **Gränssnittet**: `driftstopp.js` + `driftstopp.css` (samma ruta överallt, knappklass efter sida). Snöjour: `#stopp-box`, 🆕 + 👍 på korten, animeringen står still under pågående pass (`body.ds-still`). Snöplaneringen: kulorna som står, `🔧 … står →` i listen, 🚨 i traktorrutan, traktorlistan `#phoneList` (≤ 700 px).
- Tester: `driftstopptest.js` (33) och `driftstopp-e2e.js` (27).
