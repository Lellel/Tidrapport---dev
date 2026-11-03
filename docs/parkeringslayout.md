# Parkeringslayout med AI (linjemålning)

Idé från Daniel 2026-11-03. Tas efter snösäsongen. Inget är byggt.

## Målet
Utifrån adressen: föreslå en layout för parkeringen och få fram underlaget till offerten för linjemålning direkt.

## Arbetsfördelning
AI:n ritar inte själva rutorna. Bildmodeller räknar dåligt i meter och lägger linjerna snett.
- **Ytan**: OSM:s parkeringsyta (amenity=parking) om den finns, annars ritas den på satellitbilden. Ytan kan justeras.
- **AI:n tolkar bilden**: in- och utfarter, hinder (stolpar, refuger, träd, brunnar), befintliga linjer och var entrén ligger.
- **Appen räknar layouten** med standardmått:
  - parkeringsplats 2,5 × 5,0 m
  - körbana 6–7 m
  - vinkel 90°, 60° eller 45°
  - tillgänglighetsplats cirka 5 m bred, nära entrén
- Några alternativ att välja mellan, till exempel **flest platser** och **smidigast att köra**.

## Underlag
- **Satellitbild**: Esri (cirka 0,5 m per pixel) räcker till ytan men inte till detaljer.
- **Lantmäteriets ortofoto** (Ortofoto Visning, upp till 16 cm per pixel) visar kantsten och gamla linjer.
  - Kräver ett organisationskonto på Geotorget.
  - Kartan måste visa "© Lantmäteriet" (CC-BY 4.0; kontrollera villkoren vid beställning).
  - Nyckeln ska ligga i Script Properties och aldrig i repot eller chatten.
- **Foton från platsen** kan läggas till (samma kameraflöde som för snöhindren).

## Resultatet
- Ritning över layouten på kartan, som PDF till kunden.
- Offertunderlaget: antal platser, **löpmeter linje**, symboler (handikapp, laddplats, pilar) och färgåtgång.
  - Kopplas till offerten för linjemålning och till packlistan (se packlista.md).
- Kontoret granskar alltid. Layouten är ett förslag tills den är godkänd.

## Att reda ut senare
- Regler för tillgänglighetsplatser (Boverket/BBR) och kommunens krav.
- Om befintliga linjer ska följas eller layouten göras om.
