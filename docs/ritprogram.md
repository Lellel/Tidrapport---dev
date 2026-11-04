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
