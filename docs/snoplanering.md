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
- Uppföljning/fakturering mot UE (vem gjorde vad, när).
- ~~Slingor~~: tas bort i samma bygge (Snöjour-filtrering, Hinder, tidrapportens "slinga X", widgeten, Slinga-fältet och Förare-fliken i Rita zoner).

## Hur det blev (byggt 2026-11-05)
- **Kod.gs:** fliken **Snöresurser** (Namn, Ägare, Handskottare, UE-ansvarig, Hemort, Lat, Lng). Traktorer fick kolumnerna **Ägare** och **Förare**, Fastigheter fick **Traktor (ID)** och **Handskottare (JSON)**. Fliken **Snöfall-logg** (en rad per ✅ Klar: snöfall, tid, fastighet, del, enhet, ägare, vem). Pågående snöfall i Script Properties (`SNOFALL`).
- **Anrop:** `getSnowBoard`, `assignSnow`, `newSnowfall`, `saveSnowPerson` (admin), `getSnowJour`, `markSnowDone` (alla). `getSnowZones` och hindren filtreras på fastigheterna där ens kula ligger. Väderområdena (Plogometern, widgeten) räknas också därifrån.
- **Behörighet:** förare = sin traktor, handskottare = sig själv, UE-ansvarig = allt med samma ägare, admin = allt.
- **Slingorna är borta:** fliken Slingor används inte längre (kan raderas i arket), kolumnerna Slinga/Ordning i Snözoner lämnas tomma. Rita zoner har bara flikarna Fastighet och Zoner.
- **Kommundel** = fastighetens Område (annars Ort). Traktorn räknas som stationerad om Ort / uppställning matchar kommundelen.
- **Kulor som släpps på kartan** hamnar på närmaste fastighetsnål (inom 40 px).
- Testat i Chrome med låtsasserver: tavlan 30/30, Snöjour förare 19/19, handskottare 2/2, UE-ansvarig 4/4, admin 5/5, Personal 4/4.
