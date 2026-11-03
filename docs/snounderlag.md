# Snöunderlag från kunderna (PDF → fastigheter, kundkartor och zoner)

Bestämt med Daniel 2026-11-03. Byggt.

## Flödet
1. **Utläsning (på datorn, av Claude):** kundernas PDF:er läses ut till `snöunderlag.json` (adress, sökadress, ort, område, kund, hårdgjord yta, antal dagvattenbrunnar, anteckning och kartbilderna). Filen ligger utanför repot – den innehåller kundadresser.
2. **Import:** Snöplanering → 📥 Importera → *snöunderlag från kunderna*. Granskningslista först (söks som, område, kund, kartor). Adresser som redan finns hoppas över; deras kartor läggs till om de saknas.
3. **Peka ut:** fastigheter utan gatuadress ("Smedjan", "Salsta Gärde", "Kvarteret Pokalen") pekas ut på kartan i Snöplanering.
4. **Rita snözoner → välj fastighet:** kundkartan läggs halvgenomskinlig ovanpå satellitbilden. ✥ flyttar, ⟳ vrider och skalar. 💾 Spara läge.
5. **🤖 Föreslå zoner från kundkartan:** AI:n föreslår maskinytor, handskottning, snöupplag och brunnar. Admin tar med det som stämmer.
6. **Handskottning: samtliga entréer.** 🚪 Entré = en 3 × 3 m handskottningsyta med ett tryck. 💡 Förslag från kartan visar entréer som finns i OpenStreetMap.

## Rita med Apple Pencil (2026-11-03)
- Pennan ritar med valt verktyg, fingrarna flyttar och zoomar kartan. Ytor: rita runt ytan. Sträcka: dra. Markörer: tryck.
- **🖌️ Pensel** (1 / 1,5 / 2 m) = handskottning. Dragen målas på ett rutnät (0,1 m) och konturen spåras till en yta; skilda fläckar blir egna zoner. Hål räknas inte bort.
- **Snöupplag** är en yta (magenta). Äldre upplag sparade som punkt visas som 🏔️ (`snoZoneKind`).
- Justera kundkartan: ett finger/penna flyttar, två fingrar vrider och skalar. Knappen 🗺️/🛰️ till vänster på kartan väljer vad gesterna styr.

## Format som känns igen
| Kund | Format | AI läser |
|---|---|---|
| Flens Bostads AB | LandInfo "Områdes beskrivning" (text + karta) | mörkgrå asfalt inom lila gräns → maskin, plattytor → hand |
| FKAB (kommunfastigheter) | Snökarta (bild) – egen instruktion (etikett med "snökarta") | det rödrandiga är HELA uppdraget: maskin + handskottning runt entréer, inget utanför; S = snöupplag |
| Flens Bostads AB (Kungsgatan 15) | Markplaneringsplan (vriden) | A1/A2 → maskin, A3/BTG → hand |
| Framtidsbruket/Unikabruket | Flygfoto med fastighetsgränser | asfalt/grus kring husen |

## Lagring
- Fastigheter: nya kolumner **Kund**, **Område** (förslag på slinga), **Kundkartor (JSON)** = `[{id, label, place}]`; place = `{c, w (m), rot (rad), tl, tr, bl}`.
- Kartbilderna i Drive-mappen **Kundkartor**.
- Kartorna är från 2020–2021: kontrollera mot satellitbilden.
