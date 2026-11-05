# Rita zoner som ett ritprogram

Bestämt med Daniel 2026-11-04. Byggt samma dag (snozoner.html: paintOp, scopeProps, undoPaint; Kod.gs: saveSnowZones).

## Verktygsraden (som i Apples Anteckningar/Freeform)
- Smal rad: ✏️ Penna · 🖌️ Pensel · 🧽 Sudd · ↶ Ångra · ＋ (Sträcka och markörer: brunnslock, kantsten, trappa, hinder, entré).
- Tryck på det valda verktyget igen → liten ruta med
  - **Storlek**: skjutreglage (ca 0,5–8 m) för pensel och sudd.
  - **Färg = typ** för penna och pensel: 🔵 Maskin · 🟠 Hand · 🟣 Upplag.
- Rutan stängs när man börjar rita eller trycker utanför.
- En **ring** följer pennan och visar pensels/suddens storlek.

## Verktygen
- **Pensel** målar med vald typ. Intill/ovanpå samma typ (samma fastighet) slås ytorna ihop till en zon.
- **Nya färgen ersätter**: målar man en typ över en annan får den gamla zonen ett hål där. En plats = en typ (inga dubbla m²).
- **Penna** som i dag: ringa in en yta eller pricka ut hörn (tryck på första punkten stänger).
- **Sudd** tar bort i alla zoner den går över (inom omfattningen nedan). Tom zon tas bort; delad zon blir flera zoner med samma uppgifter.
- **Ingen zon behöver väljas först** – verktygen verkar direkt på de synliga zonerna.

## Omfattning – vilka zoner som får ändras
- Utan kundkarta: bara **vald fastighet**. Grannarnas zoner syns men rörs inte.
- Med **kundkartan utlagd**: alla fastigheter vars adressnål ligger inom kundkartan.
- **Ny yta på tom plats** går till fastigheten med **närmaste nål** (inom kundkartan), annars vald fastighet. Kan ändras i zonkortet.
- Ny yta intill/ovanpå en zon av samma typ följer den zonens fastighet.

## Spara och ångra
- **Sparas automatiskt** efter varje drag (alla zoner som draget ändrade).
- **↶ Ångra** backar senaste draget, även när det redan är sparat och även över flera zoner.
- Nya bitar som uppstår (delning) ärver slinga, ordning och anteckning.

## Behålls
- Förslag (AI/OpenStreetMap), kundkartan, 📍 GPS, Helskärm och förare/slingor som i dag.
- Apple Pencil ritar, fingrar flyttar/zoomar kartan; tryck med fingret på en zon visar dess kort.

## Hur det blev
- Penseldrag, inringning, utprickade hörn (stängs med tryck på första hörnet) och 🚪 entré går till `paintOp` och sparas direkt med `saveSnowZones` (flera zoner i ett anrop).
- ↶ Ångra: först utprickade hörn, sedan ändringar på en vald zon, sedan senaste draget (upp till 30 drag bakåt).
- En vald zon (tryck med fingret) kan fortfarande ändras med hörnhandtagen – det sparas med 💾 som förut.
- Målar man där en granne utanför omfattningen har en zon rörs grannens zon inte (ytorna kan då överlappa).
- Ringen visas för pensel och sudd när Apple Pencil (eller musen) är över kartan.

## Dator, röd yta och automatisk placering (2026-11-05)
- **Dator:** dra med musen ritar med alla verktyg (penna ringar in, pensel/sudd målar, klick sätter hörn). **Mellanslag + dra** flyttar kartan. **⌘/Ctrl+Z** ångrar, **P B E** = penna/pensel/sudd, **[ ]** = mindre/större, **Esc** stänger rutan/släpper hörn.
- **🔴 Ej röjning** (typ `ej`): yta som INTE ska snöröjas – röd och streckad, syns även i Snöjour. Målas som de andra färgerna och skär bort ur andra zoner där den målas.
- **🤖 Placera automatiskt** (kundkartans kort, och i Justera-läget): appen bygger en OpenStreetMap-bild (zoom 18, ca 300 m) runt adressens nål, Gemini hittar gemensamma punkter (`matchMapToOsm` i Kod.gs) och om kartan är norrvänd. Appen räknar läge/skala/vridning (minsta kvadrat, punkter som avviker > 8 m sorteras bort) och öppnar Justera-läget med förslaget – kontrollera och 💾 Spara läge. ✕ Avbryt går tillbaka till läget före AI:n. Matematiken testad: 0,5 m fel med exakta punkter; precisionen i verkligheten beror på hur exakt Gemini pekar.
- **Vägkartan** har mer kontrast (klassen `osm-tiles` i theme.css).

## Uppstädning av zonmodulen (förslag 2026-11-05, ej byggt – Daniel vill resonera mer)
**Det som känns rörigt (Daniel):** zonformuläret, för mycket på en gång, knapparna på kartan, svårt att veta nästa steg.

**Förslag:**
- Panelen följer arbetsgången: fastighet + område i en rad → ① Kundkarta (🤖 Placera, ✋ Justera, 👁; resten bakom ⋯) → ② Rita (🤖 Föreslå zoner, 🗺️ Från vägkartan; förslagen syns bara när de finns; summering per färg i m²) → **✅ Klar – nästa / ⏭ Senare alltid längst ner**.
- Zonformuläret (slinga, adress, ordning, anteckning, 🗑️) visas bara när man trycker på en zon. Nya zoner får fastighetens slinga automatiskt.
- Hjälptexter → en **?**-knapp med tips och kortkommandon.
- Kartan: Satellit/Vägkarta blir en växlingsknapp, Helskärm bara ikon.
- Flikarna Zoner och Förare som i dag.
- **Bestämt 2026-11-05:** fältet **Ordning** tas bort ur zonformuläret (stannar i arket). Med kartan blir det självklart vem som kör vad.
- **Huvudproblemet är visuellt brus:** panelen ska bara visa det som hör till momentet – Välja fastighet / Kundkartan / Rita / Tryckt på en zon. Förslag: förklaringen bort i Rita zoner (kvar i Snöjour), Satellit/Vägkarta en knapp, Helskärm ikon, hjälptexter bakom **?**, en kort rad "nästa steg". Byggt 2026-11-05 (se nedan).

## Uppstädningen – byggd 2026-11-05
- **⟩-fliken** vid kartans kant (⌄ på telefon) fäller in panelen; kartan får hela skärmen. Läget sparas (`lpv_zon_panel`).
- **Ett moment i taget:** steg-rad överst (① välj fastighet · ② lägg kundkartan · ③ rita), **?** visar tips och kortkommandon.
- **Kundkartans kort** kompakt när man ritar: 📍 👁 ✋ + 🤖 Föreslå zoner; genomskinlighet, fler kartor, Placera automatiskt, Förslag från vägkartan, anteckning och grannar bakom **⋯ Mer**. Fullt kort bara vid utläggning/Justera.
- **Summering** per färg (m²) för fastigheten och ibockade grannar.
- **Zonkortet** visas bara när något väntar på 💾 Spara (vald zon, form som ändras, markör/sträcka/utprickade punkter). **Ordning** borttagen.
- **Förslag-kortet** visas bara när det finns förslag.
- **✅ Klar – nästa / ⏭ Senare** alltid i panelens fot (på telefon fast ovanför flikraden).
- **Kartan:** en växlingsknapp Satellit/Vägkarta, Helskärm som ikon, förklaringen borttagen (kvar i Snöjour), kortare notiser.
- Testat i Chrome med mus och syntetisk penna: inringning, klickade hörn, mellanslag+dra, B/]/⌘Z, penseldrag, röd yta, zonkort, panelflik, kartknapp – 17 av 17.
