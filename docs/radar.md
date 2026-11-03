# Radarn: planering på paddan

Bestämt med Daniel 2026-11-03. Byggs med Blacksta-planeringen som mall.

## Layout
- **Helskärm** på paddan (bäst som hemskärmsapp, utan Safaris adressfält). Sidopanel och orderbok går att fälla in.
- **Två vyer** som man växlar mellan:
  - **Personvy**: en rad per person och maskin. Ett jobb syns i raden för varje tilldelad person.
  - **Kundvy**: en rad per kund/projekt. Personal syns som kulor på jobbkortet.
- **Orderboken**: ej inplanerade jobb (t.ex. godkända offerter med sina timmar). Dra ut på tidslinjen för att planera; dra tillbaka för att avplanera.

## Tid
- Öppnar på **den här veckan** med hela dagar. Zoom (knappar och nyp): timmar inom dagen → dag → vecka → flera veckor.
- Datum är riktiga datum (inte ett fast startdatum).
- **Helger och röda dagar** är gråmarkerade och räknas inte som arbetsdagar: nyårsdagen, trettondedag jul, långfredagen, påskdagen, annandag påsk, 1 maj, Kristi himmelsfärdsdag, nationaldagen, midsommarafton, midsommardagen, alla helgons dag, julafton, juldagen, annandag jul, nyårsafton. Ett jobb kan markeras **helgarbete**.
- Arbetsdag 07:00–15:00 (8 h).

## Jobbets längd
- Ett jobb har en **totaltid i timmar**. Längden i kalendern = timmar ÷ (8 h × antal tilldelade), fördelat på arbetsdagar.
- **Fler kulor → kortare kort. Kula bort → längre kort.** Räknas om direkt.

## Dra och släpp (fungerar med fingret)
- Jobb: orderbok → tidslinje (planera), inom tidslinjen (flytta, i personvyn även till annan person), tidslinje → orderbok (avplanera).
- Personalkula: sidopanel → jobbkort (lägg till). Ta bort i jobbets detaljruta.
- Tryck på ett jobb: detaljruta med kund, adress, timmar, starttid, helgarbete, bemanning.

## Ingen dubbelbokning (kulpåsen följer tidslinjen)
- Kulpåsen: **Personal**, **Maskiner**, **Verktyg & utrustning** (ställningskärra, färgspruta …).
- Ledig hela tiden som syns på tidslinjen → kulan ligger i påsen.
- Upptagen hela den synliga tiden → kulan **plockas ner** till en hopfälld rad "Upptagna" (med vilket jobb och till när).
- Delvis upptagen → kulan ligger kvar med en halvring; kan bara släppas på jobb där den är ledig.
- Släppa en kula på ett jobb som krockar, eller flytta ett jobb så att någon bemannad krockar → nekas med förklaring. Servern kontrollerar också.
- Sjukanmälda plockas ner.
- Utrustning läggs in som rader i fliken Personal (Roll t.ex. "Verktyg", "Ställning").

## Personalen
- Ser jobben de är tilldelade som blå kort i sin app (Stämpla in).
- **Notis i appen** när något som gäller dem planeras in, flyttas eller tas bort ("📅 Ändrat: …"). Visas nästa gång appen öppnas. (Riktiga push-notiser: senare.)

## Data
- Fliken **Gantt_Jobb**, nya kolumner (hittas på rubrik): Startdatum, Starttid, Helgarbete, Uppdaterad, Uppdaterad av.
- Fliken **Planeringsnotiser**: tid, person, jobb, text, läst.
- Allt sparas direkt vid varje ändring. Klaryta ser bara Klarytas jobb och personal.
