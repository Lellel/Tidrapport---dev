# Testlista – Tidrapport DEV

🔗 **Dev-appen:** https://lellel.github.io/Tidrapport---dev/

Bocka av med `[x]` när något är testat. Allt testas i **dev**, aldrig i prod.
Står det ❌ efter ett test: skriv kort vad som hände så fixar vi det.

---

## 0. Förberedelser (en gång)

- [ ] Ladda upp nya `Kod.gs` med `./ladda-upp-kod.sh` (kräver clasp och klonat projekt i `~/Dev-repot/AppsScript-dev`) – skapar även ny version av webbappen
- [ ] Godkänn de nya behörigheterna när Apps Script frågar (Kartor/Maps, Drive och **Gmail/MailApp** för offert-mejl)
- [ ] `GEMINI_API_KEY` finns i **Projektinställningar → Skriptegenskaper** (för AI-kulorna)
- [ ] Kolla att `config.js` i dev pekar på dev-versionens Apps Script-URL (inte prod)
- [ ] Öppna dev-appen i telefonen. Står det **DEV v4.7.1** uppe till höger?

---

## 1. Inloggning med personlig länk

- [ ] Tryck 3 gånger snabbt på namnet uppe till höger → "Admin-läge aktiverat"
- [ ] Vrid telefonen (eller använd iPad) → admin-panelen syns till höger
- [ ] Listan "Mottagare" fylls med namn från fliken Personal
- [ ] Välj **dig själv** → tryck **SMS** → länken innehåller `user=` och `key=`
- [ ] Kolumn L "App-nyckel" i fliken Personal har fått en nyckel för dig
- [ ] Öppna länken från SMS:et → appen startar, ditt namn står uppe till höger
- [ ] Adressfältet visar **inte** `key=` längre
- [ ] Tryck **QR** → en QR-kod visas. Skanna med en annan telefon → loggar in som rätt person
- [ ] **Mail**-knappen öppnar ett mejl med länken

## 2. Spärra en person

- [ ] Välj en testperson → **🔑 Spärra & skapa ny länk** → bekräfta
- [ ] Den gamla länken: spara ett pass och tryck "Skicka in" → felmeddelande om ogiltig inloggning
- [ ] Den nya länken fungerar
- [ ] Sätt en testperson till **Karantän** i kolumn H → hen kan inte skicka in pass

## 3. Rapportera pass (det förarna gör varje dag)

- [ ] Bocka i packlistan → "Öppna verktyg" låser upp formuläret
- [ ] Välj **Nya**, fyll i Betalställe, välj Aktivitet, Start och Slut
- [ ] Timräknaren vid "Tid" visar rätt antal timmar
- [ ] **Bifoga bild-underlag** → välj en bild → "✓ Bild bifogad"
- [ ] **Spara pass lokalt** → passet skickas automatiskt och försvinner ur "Dagens pass"
- [ ] Raden syns i fliken Tidrapporter med **ditt namn**, rätt datum, tider och plats
- [ ] Bilden hamnade i Drive-mappen (länk i Anteckningar)
- [ ] **ÄTA**: välj ÄTA, fyll i ÄTA-nummer → syns som `[ÄTA 04]` i arket

## 4. Pågående pass & utan nät

- [ ] Spara ett pass **utan sluttid** → kortet visar "Pågår"
- [ ] Tryck **Stämpla ut nu** → sluttid fylls i och passet skickas
- [ ] Slå på **flygplansläge** → spara ett pass → det ligger kvar i telefonen
- [ ] Stäng och öppna appen → passet finns kvar
- [ ] Stäng av flygplansläge → passet skickas av sig självt inom någon minut

## 5. Offerter & ÄTA

Öppnas via sidomenyn → **📄 Offerter & ÄTA** (eller admin-panelen).

**Inställningar** (fliken ⚙️ Priser & inställningar)
- [ ] Fyll i företagsnamn, telefon, e-post, adress, org.nr → syns på PDF:en
- [ ] Ändra timpris arbete/maskin och restid → nya rader får nya priser
- [ ] Ändra "Giltig antal dagar" → nya offerter får rätt datum
- [ ] Kontrollera ROT/RUT-procent och tak mot Skatteverket

**Skapa & skicka**
- [ ] **➕ Ny offert** → kund (privat), e-post, mobil, arbetsplats, rubrik
- [ ] **🏠 Fasadmålning** → lägg till väggar, gavelspets, fönsteravdrag → timmar och liter ser rimliga ut
- [ ] Lägg till fler huskroppar (**➕ Garage / Förråd / Annan**) → egna väggar och egen summa per huskropp
- [ ] Offerten får egna rader per huskropp ("Fasadmålning garage 14 m²" + "Fasadfärg garage")
- [ ] Öppna mallen igen (**Ändra fasadmått**) → alla huskroppar och väggar finns kvar, raderna dubbleras inte
- [ ] **🅿️ Linjemålning** → 10 rutor 2,5 × 5 m utan bakkant ≈ 55 m (rutor delar sidolinje)
- [ ] Kartan i linjemallen startar på offertens adress
- [ ] **📍 Placera** → tryck där radens första ruta börjar → rutorna ritas ut. Vrid med reglaget / **↻ 90°**
- [ ] Dra i den runda pricken → sektionen flyttas. **🛰️ Satellit / karta** byter bakgrund
- [ ] Mät mot verkligheten på satellitbilden – stämmer rutornas storlek?
- [ ] Öppna mallen igen → sektionerna finns kvar, "Lägg till" ger inte dubbla rader
- [ ] Offerten visar en förhandsvisning av ritningen (norrpil, skalstock, mått per sektion)
- [ ] PDF:en har rubriken **Ritning** med samma bild under beloppen
- [ ] Kunden ser **"🅿️ Så här blir p-platserna"** med ritningen på karta (kan zooma)
- [ ] Ändra ritningen på en skickad offert → ny version
- [ ] **➕ Restid / Arbete / Material** → summan uppdateras direkt
- [ ] ROT dras bara på rader med "ROT/RUT-grund" (arbete), inte på material/restid
- [ ] Byt till **Företag/BRF** → avdraget försvinner
- [ ] **📨 Spara & skicka** → PDF skapas i Drive-mappen **Offerter**, kunden får mejl med PDF
- [ ] Öppna PDF:en: logga, företagsuppgifter, rader, moms, ROT, att betala, villkor
- [ ] **💬 Skicka SMS** öppnar SMS med länken. **🔗 Kopiera** fungerar

**Kunden** (öppna länken på en annan telefon)
- [ ] Ren vit sida med rätt rader och belopp – inga påhittade siffror
- [ ] Admin ser status **öppnad**
- [ ] Godkänn utan namn → ber om namn. Med namn + meddelande → "✅ Godkänd"
- [ ] Tryck godkänn igen / ladda om → fortfarande godkänd, bara **ett** jobb i Gantt_Jobb
- [ ] Jobbet i **Gantt_Jobb** har kundnamn, rubrik, timmar och adress
- [ ] Du får ett mejl om att offerten godkänts (med kundens meddelande)
- [ ] "Nej tack" → avböjd, syns i admin

**Ändringar**
- [ ] Ändra en skickad offert → "version 2" + frågan "Skicka nya versionen?" → kunden får nytt mejl "Uppdaterad offert"
- [ ] Gamla länken säger att den gäller en äldre version
- [ ] En godkänd offert går inte att ändra
- [ ] Sätt "Giltig till" bakåt i tiden och skicka → kunden ser att den gått ut
- [ ] **🗑️ Makulera** → kundlänken slutar fungera

**🎨 Kulörförslag (fasad)**
- [ ] Välj **huskropp** (Bostadshus, Garage …) – varje huskropp har sitt eget foto och egna förslag
- [ ] I offerten: **📷 Foto av huset** → ta en bild rakt framifrån i dagsljus
- [ ] Välj **Fasad**, **Detaljer** (knutar, foder, vindskivor) och **Fönster & dörrar** – "Behåll" lämnar dem orörda
- [ ] **✨ Skapa förslag** → efter 10–30 s kommer en ommålad bild. Ser huset ut som samma hus?
- [ ] Gör 2–3 alternativ, tryck på en bild → växlar före/efter. ✕ tar bort ett förslag
- [ ] Bilderna hamnar i Drive-mappen **Kulörförslag**
- [ ] Byt ut startpaletten mot era Alcro-kulörer under ⚙️ → **Kulörer** (Namn | NCS | #färg)
- [ ] PDF:en har rubriken **Kulörförslag** med bilderna
- [ ] Kunden ser förslagen grupperade per huskropp, kan växla före/efter och **måste välja ett per huskropp** innan godkännande (när det finns flera)
- [ ] Valet syns i adminvyn ("Kunden valde …") och i mejlet om godkännandet

**Offertbesök i fält**
- [ ] Välj aktivitet **Offertbesök** som admin → knappen "📄 Skapa offert från besöket" tar med platsen

## 6. Avatar

- [ ] Tryck på avatar-bubblan → välj bild → "Spara 3D-Avatar"
- [ ] En AI-bild (eller ditt foto om AI inte svarar) visas
- [ ] Ingen "Servern var upptagen" för andra som rapporterar samtidigt

## 7. Blacksta (Gårds-Kabanossen)

**iPad liggande (Paddan):**
- [ ] Dra en person från vänsterpanelen till ett jobbkort → personen hamnar på kortet
- [ ] Dra ett jobbkort till en annan rad/tid → kortet flyttas
- [ ] Dra ett jobbkort till orderboken → kortet avplaneras
- [ ] Ett vanligt tryck på ett kort öppnar detaljrutan (utan att något flyttas)
- [ ] Zoomknapparna fungerar

**Telefon stående (Stöveln):**
- [ ] Korten visas som 3D-karusell, mittkortet framme
- [ ] Svep vänster/höger roterar karusellen, räknaren (t.ex. 2 / 13) uppdateras
- [ ] Tryck på sidokort → det roterar fram
- [ ] Tryck på mittkortet → detaljrutan öppnas
- [ ] "Utförd & Avbockad" fungerar

## 8. Snözoner – rita (iPad, admin)

Öppnas via sidomenyn → **❄️ Rita snözoner** (eller `snozoner.html`).
- [ ] Kartan visar Flen med satellitbild, **Vägkarta**-knappen byter karta
- [ ] Fyll i Slinga, Fastighet/Adress och Ordning → välj **Maskinzon** → tryck ut hörnen runt en yta
- [ ] Ytan i m² visas medan du ritar och verkar rimlig
- [ ] **↶ Ångra punkt** tar bort senaste hörnet, **✕ Avbryt** rensar
- [ ] **💾 Spara zon** → "✅ Sparad", Ordning räknas upp ett steg, zonen syns i listan
- [ ] Fliken **Snözoner** i kalkylarket har fått en rad
- [ ] Rita en **Sträcka** och sätt ut en **Kantsten** / **Brunnslock** / **Trappa**
- [ ] Tryck på en sparad zon → uppgifterna fylls i → ändra anteckningen → **Spara ändringar**
- [ ] Tryck på en sparad zon → **🗑️ Ta bort vald zon** → borta från kartan och arket
- [ ] Logga in som förare och öppna `snozoner.html` → röd ruta "Bara admin kan spara"
- [ ] Rutan **Förare per slinga**: tryck på ett namn → blir grönt och fliken **Slingor** i arket uppdateras
- [ ] Slinga utan förare visar "⚠️ Ingen förare tilldelad"

## 9. Snöjour – förarens vy (telefon)

Öppnas via knappen **❄️ Snöjour – karta & GPS** under formuläret.
- [ ] Telefonen frågar om platsåtkomst → Tillåt → "📍 GPS aktiv" och en blå prick på kartan
- [ ] **📍 Följ mig** håller kartan centrerad när du rör dig, drar du i kartan slutar den följa
- [ ] Förare **utan** tilldelad slinga → "Du har ingen slinga tilldelad ännu"
- [ ] Admin tilldelar slingan → föraren laddar om → slingan visas direkt, i rätt ordning
- [ ] Förare med flera slingor → kan växla mellan bara sina egna
- [ ] Hoppa in åt någon: admin lägger till dig på den slingan → du ser den
- [ ] Avstånd till varje objekt visas och ändras när du rör dig
- [ ] Anteckningar (t.ex. "låg grind") syns i gult
- [ ] **Kör dit** öppnar Google Maps med vägbeskrivning
- [ ] **▶️ Starta slinga** → timer visar hur länge du plogat
- [ ] Stäng appen och öppna igen → slingan pågår fortfarande med rätt starttid
- [ ] **⏹ Klar med slingan** → tillbaka till Tidrapporten, passet skickas
- [ ] Fliken Tidrapporter: plats = slingans namn, aktivitet = Snöröjning, rätt tider och ditt namn
- [ ] Starta en slinga när ett annat pass pågår → frågar om det andra ska stämplas ut
- [ ] Flygplansläge → öppna Snöjour → senast hämtade zoner visas ändå

## 10. Snöplanering – fastigheter & traktorer (admin)

Öppnas via admin-panelen → **❄️ Snöplanering** (eller sidomenyn).

**Traktorer**
- [ ] Lägg till "Kramer 8095" → föreslås **Stor**. "Avant 760i" → föreslås **Liten**
- [ ] Byt storlek med 🟠/🔵 – kulan blir stor/liten
- [ ] **✨ Skapa AI-kula** → snurrar 10–30 s → en Bob the Builder-traktor i glaskula 🎉
- [ ] Bilden hamnar i Drive-mappen **Traktor-kulor** och syns även efter omladdning
- [ ] Rapportera ett pass från en annan telefon medan kulan skapas → går igenom direkt
- [ ] **⏸ Ur tjänst** → kulan blir grå, räknas inte i "i tjänst"
- [ ] Fliken **Traktorer** i arket stämmer

**Fastigheter**
- [ ] Lägg till en adress → hittas på kartan, orten fylls i automatiskt
- [ ] Felstavad adress → varning + **📍 Flytta på kartan** → tryck på kartan → positionen sparas
- [ ] Kortet visar ett hål: **Stor** = stort orange hål, **Liten** = litet blått hål, saknas = rött ?
- [ ] Liten fastighet: texten säger att bara liten kula passar
- [ ] **💪 Tvinga stor** (bara på små) → frågar först → kortet märks TVINGAD
- [ ] **⭐ Prioritera** → märks PRIO i listan och får gul ring på kartan
- [ ] Skriv i "Att tänka på" → sparas när du lämnar fältet
- [ ] **📷 Lägg till foto** → hamnar i Drive-mappen **Fastighetsfoton** och visas på kortet
- [ ] Ta bort ett foto med ✕
- [ ] Filtret **⚠️ Saknar storlek** visar bara de som behöver fyllas i
- [ ] När inget saknas: "✅ Alla kort har storlek – redo att generera slingor"
- [ ] Fliken **Fastigheter** i arket stämmer

## 10b. Ekonomi – fakturaunderlag

Öppnas via sidomenyn → **💰 Ekonomi** (eller admin-panelen).
- [ ] Skriv **Ekonom** i kolumn E (Behörighet) för en testperson → hen kommer in på Ekonomi men inte på Offerter/Snöplanering
- [ ] En förare utan Admin/Ekonom → "Åtkomst nekad" på Ekonomi
- [ ] Statistiken överst stämmer med antal ej fakturerade pass i fliken Tidrapporter
- [ ] Passen är grupperade per plats, kunden föreslås när platsen innehåller kundens gatuadress
- [ ] Välj kund för hand där det står "Hittade ingen kund"
- [ ] Privatkund med ROT → avdraget dras bara på timraderna, inte på material
- [ ] Ändra à-pris på en rad → summan uppdateras
- [ ] **＋ Material / egen rad** → raden kommer med i summan och på PDF:en
- [ ] Kryssa ur ett pass → timmarna och summan minskar
- [ ] **📄 Fakturaunderlag (PDF)** → PDF i Drive-mappen **Fakturaunderlag** med "UTKAST", rader, moms, ROT och timspecifikation
- [ ] Godkänd offert → eget kort, PDF:en har offertens rader och referensen till offerten
- [ ] **✅ Markera fakturerad** → passen får "Ja" i kolumn B och försvinner ur listan
- [ ] Offert markerad som fakturerad → kolumnen "Fakturerad" i Offerter får datum och namn
- [ ] **⬇️ Exportera till Excel** → filen öppnas i Excel med svenska tecken rätt
- [ ] Under Offerter → ⚙️: fyll i **Bankgiro** och kontrollera **F-skatt**-texten → syns i PDF:ens sidfot

## 11. Snabbhet & uppdateringar

- [ ] Öppna appen två gånger → andra gången syns den direkt (ingen vit skärm)
- [ ] **Flygplansläge** → stäng appen helt → öppna → appen startar ändå och du kan spara pass
- [ ] Flygplansläge → Snöjour → kartan (om du öppnat den med täckning förut) eller listan med "Kör dit" visas
- [ ] Efter att något nytt publicerats: öppna appen → rutan **"✨ Ny version – tryck för att uppdatera"** dyker upp
- [ ] Tryck på rutan → appen laddar om, pass som låg i utkorgen finns kvar
- [ ] Tio pass skickas samtidigt från olika telefoner → inga "Servern var upptagen"
- [ ] Snöjour och Snöplanering visar listan direkt vid start (uppdateras strax efter)
- [ ] Spärra en person → hen nekas direkt. Sätter du Karantän för hand i arket slår det igenom inom 5 min

## 12. Utseende

- [ ] Ingen sida går att scrolla i sidled på telefonen
- [ ] Mörkt/ljust läge ser rätt ut
- [ ] Liggande läge visar översikten med dagens timmar till höger

---

## Innan deploy till PROD

- [ ] Avsnitt 1, 3 och 4 är helt gröna
- [ ] Fyll i företagsuppgifter under Offerter → ⚙️ i **PROD** också
- [ ] Ladda upp samma `Kod.gs` till **PROD**-versionens Apps Script med `./ladda-upp-kod.sh prod` (prod har en egen backend, klonad i `~/Dev-repot/AppsScript-prod`) → Ny version
- [ ] Kör deploy (GitHub Actions → "Deploy to Production")
- [ ] Öppna prod-appen och spara ett riktigt testpass
- [ ] Skicka nya inloggningslänkar till alla förare
- [ ] När alla har nya länkar: ta bort `API_TOKEN` ur `Config.gs` och `config.js`
