# Väder: Plogometern och Sandometern

Bestämt med Daniel 2026-11-03. Byggt.

## Källor
- **SMHI öppna data, punktprognos `snow1g`** (gratis, ingen nyckel, CC BY 4.0): timvis nederbörd, snöandel, lufttemperatur, luftfuktighet. Snö ≈ 1 cm per mm vatten.
- **Trafikverkets öppna API** (gratis nyckel, `TRAFIKVERKET_API_KEY` i Skriptegenskaper): vägväderstationer (`WeatherMeasurepoint` 2.1) och väglagskameror (`Camera` 1).

## Områden och stationer (valda med `testaTrafikverket()`)
| Område | Station(er) | Kamera |
|---|---|---|
| Flen | Lidaviken 411 | Lidaviken |
| Malmköping | Sparreholm 410 + fjärryta 410100, Björndammen 420 | Sparreholm |
| Hälleforsnäs | Slytan 417 + fjärryta 417100 | Slytan |
| Mellösa | Lidaviken 411 | Lidaviken |
| Bettna | Hål 412 | Hål |

Förarens område: slingorna → fastigheterna → område/ort (Flen Norra → Flen).

## Bedömning (12 timmar framåt)
- **Plogometern:** snömängd mot gränsen (Inställningar `Snö.plogGräns`, 3 cm tills avtalen är klara).
- **Sandometern:** det högsta av väta som fryser, rimfrost (daggpunkt över vägytan) och regn mot frusen vägbana. Vägytan = kallaste givaren; i natt uppskattad som dagens vägyta + luftens väg enligt prognosen.
- Stationerna står vid riksvägar; gårdar i tätort kan skilja sig. Mätaren är en riskbedömning.

## Mätning och notiser
- Tidsutlösare var 15:e minut (`installeraVaderKoll()` en gång i Apps Script). Räknar om en gång i timmen, var 15:e minut när något område ligger på 50 % eller mer.
- Nivåer: **70 %** ☕ Ladda kaffebryggaren / 🪣 Fyll sandspridaren · **90 %** ☕🔥 Starta kaffebryggaren / 🪣 Ut och sanda · under 50 % efter larm: 😴 Avblåst. Nivå 1 hålls kvar mellan 50 och 70 % (inga notiser fram och tillbaka).
- Notisen visas **i appen** (ingen push/SMS – föraren kollar själv), en gång per ändring.
- Förarna ser bara sina områden (mätarna i Snöjour). Admin: `vader.html` med timprognos, vägytor, kamera och gräns.
- Allt loggas i fliken **Väderlogg** (underlag för fakturan senare).
