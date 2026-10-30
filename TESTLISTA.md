# Testlista – Tidrapport DEV

Bocka av med `[x]` när något är testat. Allt testas i **dev**, aldrig i prod.
Står det ❌ efter ett test: skriv kort vad som hände så fixar vi det.

---

## 0. Förberedelser (en gång)

- [ ] Klistra in nya `Kod.gs` i dev-versionens Apps Script → **Distribuera → Hantera distributioner → Redigera → Ny version**
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

## 8. Utseende

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
