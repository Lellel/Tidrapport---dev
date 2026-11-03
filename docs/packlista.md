# Packlista: från radarn till bilen

Bestämt med Daniel 2026-11-03. Inte byggt än.

## Packlistan för ett jobb byggs av fyra delar
1. **Alltid med** – gemensamt för alla jobb.
2. **Basutrustning för jobbtypen** – mall per jobbtyp (admin kan ändra).
3. **Bokade resurser från radarn** – maskiner och utrustning som dragits in på jobbet (ställningskärra, färgspruta, traktor …).
4. **Jobbets material** – från offerten (produkter, liter, kulörer) eller fritext i radarns detaljruta.

Jobbtypen kommer från offerten (fasad, linje …) eller väljs i radarns detaljruta.

## Skyddsutrustning krävs – resten är stöd
- Den skyddsutrustning som gäller för jobbtypen måste bockas av innan man kan **stämpla in** på jobbet.
- Övrigt på listan är stöd; det som saknas syns för arbetsledningen.
- Ersätter den fasta packlistan på startsidan (som låser menyn i dag).
- **Resurserna styr vissa krav**: fallskydd krävs när ställning eller lift är bokad; andningsskydd krävs när färgspruta är bokad (stalltvätt: alltid).

| Jobbtyp | Skyddsutrustning (krävs) | Basutrustning (stöd) |
|---|---|---|
| Alla jobb | Skyddsskor | Första hjälpen, telefon laddad |
| Fasadmålning | Skyddsglasögon (+ fallskydd vid ställning/lift, andningsskydd vid färgspruta) | Högtryckstvätt, skrapor, stålborste, täckpapper, tejp, penslar, rollers, stegar, fuktmätare |
| Linjemålning | Varselkläder klass 3, avspärrningsmaterial | Snörslå/linjemaskin, måttband, krita, tejp, sopkvast, lövblås |
| Snöröjning | Varselväst, halkskydd/broddar | Plogblad kontrollerat, sand och salt, spade, isskrapa, extra bränsle |
| Stalltvätt | Skyddsglasögon/visir, hörselskydd, andningsskydd, regnställ, stövlar | Högtrycksaggregat, slangar, rengöringsmedel, roboten (om bokad) |
| Mark och grävning | Hjälm, varselkläder, hörselskydd | Ledningsanvisning utskriven, avspärrning, spade, laser |
| Platsbesök | – | iPad/telefon laddad (fasadverktyget och kulörförslagen i appen), fuktmätare, laseravståndsmätare, måttband, kniv/skrapa för provskrapning, stege, ficklampa, Alcros kulörkarta och NCS-fläkt, NCS-scanner (Datacolor ColorReader, mäter nuvarande kulör), kulörprover, visitkort |

(Ingen LPV-väst – används inte.)

## Platsbesöket i fasadflödet
- När kontoret bokar platsbesök (efter kostnadsuppskattningen, se fasadflode.md) blir det ett jobb i radarn med jobbtypen **Platsbesök**, kopplat till förfrågan.
- Den som åker får påminnelsen dagen innan och packlistan för platsbesök, så att mätning, foton och kulörval kan göras på plats och uppskattningen blir ett offertutkast.

## Ansvar
- Varje jobb har **en ansvarig** (väljs i radarn). Den ansvarige får resurserna och materialet på sin lista; övriga får skyddsutrustning och basutrustning.

## Påminnelse dagen innan
- **Notis i appen kl. 15:00** dagen innan, byggd från morgondagens planering i radarn:
  "I morgon 07:00: Fasad Storgatan. Se över: ställningskärran, färgsprutan, 40 l Bestå."
- Står en resurs kvar på ett annat jobb: "Ställningskärran står på Ica Flen – hämtas där."
- Skickas av en tidsstyrd funktion i Apps Script (installeras en gång).

## Var den syns
- På jobbkortet i appen: 🎒 Packlista med bockar.
- "Dagens packlista" på morgonen: alla dagens jobb för personen samlat.
