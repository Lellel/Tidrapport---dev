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
- Öppet: per traktor eller per storlek (stor/liten)? Inköpspris per UE-företag? Kundunika priser?

### Ut i systemet
- **Ekonomi:** snöunderlaget per kund (försäljningspris), granska ⚠️, markera fakturerat – som tidrapporterna i dag.
- **UE:** samma uträkning per UE-företag med inköpspris = kontrollunderlag mot deras faktura.
- **Lön (egen personal):** passet delas i tidrapporten i *Snöröjning* och *Transport*.
