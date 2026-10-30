# Testlista – Tidrapport DEV

Bocka av med `[x]` när något är testat. Allt testas i **dev**, aldrig i prod.
Står det ❌ efter ett test: skriv kort vad som hände så fixar vi det.

---

## 0. Förberedelser (en gång)

- [ ] Klistra in nya `Kod.gs` i dev-versionens Apps Script → **Distribuera → Hantera distributioner → Redigera → Ny version**
- [ ] Godkänn de nya behörigheterna när Apps Script frågar (Kartor/Maps och Drive behövs för fastigheter och foton)
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

## 5. Kundgodkännande (ÄTA / Offert)

- [ ] *(Saknar knapp i appen just nu – testas när vi kopplat in det)*
- [ ] Kundlänken öppnar en vit sida med "Godkänn & Signera"
- [ ] Godkänn → "Tack!" och raden syns i fliken ÄTA_Godkännanden med rätt ID
- [ ] Ändra en bokstav i `code=` i länken → "Ogiltig eller utgången godkännandelänk"

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

## 11. Utseende

- [ ] Ingen sida går att scrolla i sidled på telefonen
- [ ] Mörkt/ljust läge ser rätt ut
- [ ] Liggande läge visar översikten med dagens timmar till höger

---

## Innan deploy till PROD

- [ ] Avsnitt 1, 3 och 4 är helt gröna
- [ ] Kör deploy (GitHub Actions → "Deploy to Production")
- [ ] Öppna prod-appen och spara ett riktigt testpass
- [ ] Skicka nya inloggningslänkar till alla förare
- [ ] När alla har nya länkar: ta bort `API_TOKEN` ur `Config.gs` och `config.js`
