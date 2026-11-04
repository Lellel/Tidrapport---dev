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

## 0b. Ny användare – lägg appen på hemskärmen

**iPhone (Safari):**
- [ ] Öppna en ny inloggningslänk → guiden "Välkommen, Namn! 👋" visar iPhone-stegen
- [ ] Följ stegen (Dela → Lägg till på hemskärmen) → öppna appen från hemskärmen → **du är inloggad** utan att öppna länken igen
- [ ] I den installerade appen syns varken guiden eller bannern
- [ ] "Senare" → guiden kommer inte automatiskt igen, men bannern "📲 Lägg appen på hemskärmen" finns och öppnar den
- [ ] ✕ på bannern döljer den

**Android (Chrome):**
- [ ] Öppna en ny inloggningslänk → guiden visar Android-stegen (ofta med knappen 📲 Installera appen)
- [ ] Installera → öppna från startskärmen → inloggad
- [ ] Öppna länken i Chrome igen efter installation → ingen guide

**Sidomeny & sidhuvud (telefon):**
- [ ] Förare: sidomenyn (🌭 🔭 💼 …) syns inte
- [ ] Admin: sidomenyn syns och täcker inte texten; "Ansluten | DEV v…" syns helt

**Ska inte synas:**
- [ ] På datorn
- [ ] För kunder som öppnar en offertlänk

## 0c. Planerade jobb – kalender + radarn (kräver ny Kod.gs)

- [ ] Kör `godkannBehorigheter` → godkänn **Kalender** när Google frågar → loggen visar "✅ Kalender: … (N händelser idag)"
- [ ] Lägg en händelse i jobbkalendern idag med plats → efter omladdning syns ett blått kort **📅 PLANERAT** med tid och plats
- [ ] En godkänd offert som inte är inplanerad i radarn syns som **⏱️ VID TILLFÄLLE**
- [ ] "Stämpla in" på ett kort → passet startar med plats och aktivitet ifyllda, kortet försvinner
- [ ] Byt datum i formuläret → korten för den dagen visas
- [ ] Logga in som förare → inga planerade jobb syns

## 0d. Stalltvätt – arbetsorder & tvättrobot (kräver ny Kod.gs)

- [ ] Ett pass med aktiviteten Stalltvätt har knappen **📋 Arbetsorder**
- [ ] Står stallets namn i platsen eller aktiviteten (t.ex. "Stall 7BB") väljs stallet automatiskt, annars kan du välja i listan
- [ ] Stallet visas som 4 rader × 23 rutor; **▶ Starta** på en rad → första rutan blir gul, sluttid ca 7 h 40 min senare
- [ ] Rutorna blir gröna i takt med roboten (20 min/box) – kolla igen efter en stund
- [ ] **🚨 Roboten larmar** → rutan blir röd och blinkar, "står still X min" räknas upp
- [ ] **👍 Kvittera** → **✅ Larmet åtgärdat – starta** → roboten fortsätter, sluttiden flyttas fram, boxen får röd kant, "Stillestånd: X min" visas
- [ ] Efter åtgärdat larm finns en tidrapport **Robotlarm** (kvittering → omstart) och den syns som egen rad i Ekonomi
- [ ] Genvägen "Robotlarm" (kör den för hand) → telefonen ringer på max volym, ficklampan blinkar, appen visar röd blinkande banner "🚨 Robotlarm …"
- [ ] Riktigt larm-SMS från roboten → samma sak, utan att du rör telefonen
- [ ] **👍 Kvittera** måste tryckas innan **✅ Åtgärdat – starta** går; tidrapporten Robotlarm räknas från kvitteringen
- [ ] Fliken Robotlarm i kalkylarket loggar varje SMS
- [ ] Tryck på en ruta → "Står roboten på box N?" → rutorna justeras
- [ ] Öppna samma stall på en annan telefon → samma färger
- [ ] Admin: **✏️ Redigera stallet** → lägg in steg med text och foto → sparas och visas för alla
- [ ] Stall utan steg visar "Instruktioner saknas"
- [ ] Bocka av steg → bockarna ligger kvar när arbetsordern öppnas igen

## 0e. Egenkontroll (kräver ny Kod.gs)

**Fasadmålning:**

- [ ] Alla pass har **✅ Egenkontroll**; ett fasadpass visar valet "Egenkontroll – fasadmålning" + "Riskbedömning"
- [ ] Startat från ett planerat jobb (godkänd offert) → kund och offertnummer är ifyllda
- [ ] Ja/Nej/Ej aktuellt, mätvärden, text, datum och foto går att fylla i; "Sparat ✓" visas
- [ ] Fuktkvot över 18 %, temperatur under 5 °C, luftfuktighet över 80 % eller "Nej" → punkten blir röd och kräver en åtgärd
- [ ] Utan täckning: "Inte sparat – sparas när du har täckning"; ändringarna finns kvar och sparas när täckningen kommer tillbaka
- [ ] Två personer kan fylla i samma kontroll
- [ ] **✍️ Signera** går först när alla obligatoriska punkter är klara och varje avvikelse har en åtgärd
- [ ] Efter signering: PDF i Drive-mappen Egenkontroller med alla punkter, avvikelser i rött, foton och signatur; kontrollen går inte att ändra
- [ ] Admin: **📂 Alla egenkontroller** listar alla; förare ser bara sina egna
- [ ] Fliken Egenkontroller i kalkylarket

**Linjemålning & snöröjning:**
- [ ] Linjepass → mallen linjemålning (TA-plan, mått mot ritning, yttemperatur, linjebredd, glaspärlor, torktid)
- [ ] Snöpass → mallen snöröjning (tid, väglag, plogat, gångytor, sandat, snöupplag, skador)

**Arbetsmiljö:**
- [ ] Riskbedömning finns för alla pass; "Nej" eller risknivå **Hög** kräver åtgärd
- [ ] **⚠️ Rapportera tillbud eller olycka** syns på startsidan även innan packlistan är avbockad
- [ ] Signerad tillbudsrapport → mejl till arbetsledningen med PDF
- [ ] Öppna en kontroll och stäng utan att ändra → ingen tom kontroll skapas

## 0f. Radarn (paddan, kräver ny Kod.gs)

- [ ] Öppna radarn från sidomenyn (🔭) – helst från hemskärmsappen för helskärm
- [ ] Växla 👷 Personer / 🏠 Kunder; zooma Timmar/Dag/Vecka/Månad (knappar eller nyp); ‹ › och Idag
- [ ] Helger och röda dagar är gråmarkerade/rödtonade med namn (t.ex. Juldagen)
- [ ] Dra ett jobb från orderboken till en persons rad → inplanerat från den dagen; kortet räcker timmar ÷ antal personer
- [ ] Dra in fler personkulor på kortet → kortare; ta bort i detaljrutan → längre. Utrustning (ställning, färgspruta) ändrar inte längden
- [ ] Kulpåsen: den som är upptagen hela den synliga tiden plockas ner till "Upptagna"; delvis upptagen har halvring
- [ ] Dubbelbokning nekas med förklaring (både när man drar in en kula och när man flyttar ett jobb)
- [ ] Flytta ett jobb i personvyn till en annan person → personen byts
- [ ] Dra ett jobb till orderboken → avplanerat
- [ ] Tryck på ett jobb → detaljruta: timmar, starttid, datum, helgarbete, bemanning; Spara / Till orderboken / Ta bort
- [ ] Personen som planerades in ser "Ändringar i din planering" i sin app och jobbet som blått kort; 👍 Uppfattat tar bort notisen
- [ ] Ladda om radarn → allt ligger kvar
- [ ] Kulorna visar personens avatar (den som saknar avatar har initialer)
- [ ] Kulpåsen har två delar: 👷 Personal och 🧰 Maskiner & verktyg (fälls ihop)
- [ ] Traktorerna från snöplaneringen syns i verktygsdelen med sina AI-kulor
- [ ] ＋ Ny resurs: namn, maskin/utrustning, tillverkare och modell → 🎨 Skapa kula ger en AI-kula
- [ ] En maskin eller ett verktyg på ett jobb gör inte jobbet kortare, men kan inte dubbelbokas

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

## 1b. Lägg till person

- [ ] Admin-panelen → **➕ Ny person** → namn, mobil, roll **Förare**, bolag **LPV** → **Lägg till & skicka länk**
- [ ] Personen hamnar i fliken Personal med roll i kolumn D, tom kolumn E och nyckel i kolumn L
- [ ] SMS:et med länken skickas direkt (från LPV) och länken loggar in personen
- [ ] Roll **Ekonom** → kolumn E = Ekonom, personen kommer in på 💰 Ekonomi men inte Offerter
- [ ] Roll **Admin** → kolumn E = TRUE
- [ ] Bolag **Klaryta** → SMS:et kommer från Klaryta
- [ ] Samma namn två gånger → "finns redan i Personal"

## 1b. Behörigheter per bolag (LPV / Klaryta)

**Förberedelse:** kolumn G i fliken Personal = "LPV" eller "Klaryta" för alla (tom räknas som LPV).

- [ ] Admin på LPV ser allt: alla offerter, kunder, pass i Ekonomi, radarn, snöplanering, inställningar
- [ ] Admin på Klaryta: ser bara Klarytas offerter, kunder, pass, radarjobb och personal; nya offerter blir alltid Klaryta
- [ ] Snöplaneringen är gemensam: admin på Klaryta kommer åt Snöplanering och Rita snözoner
- [ ] Stalltvätten är LPV:s: Klarytas personal får ingen 📋 Arbetsorder och ingen robotlarmbanner; stallregister och robotlarm bara admin på LPV
- [ ] Admin på Klaryta: fliken ⚙️ Inställningar och importknapparna syns inte
- [ ] Admin på Klaryta kan lägga till förare/UE (hamnar i Klaryta) men inte ge admin- eller ekonombehörighet
- [ ] Admin på Klaryta kan skapa inloggningslänk för Klarytas förare, men inte för LPV:s personal
- [ ] Ekonom på Klaryta ser bara Klarytas pass/offerter/kunder i Ekonomi – och tvärtom för ekonom på LPV
- [ ] Bara admin på LPV kan ge admin- och ekonombehörighet (även i Klaryta)

## 1c. Välkomstpaket (kräver ny Kod.gs)
- [ ] Lägg till en testperson som **Admin** med din mobil och e-post → **💾 Lägg till & skicka välkomstpaket**
- [ ] SMS: inloggningslänk + hemskärmstips + "mejl kommer" (avsändare LPV/Klaryta efter bolag)
- [ ] Mejl: logga, knappen **💻 Logga in på den här datorn** och länkar till kontorsdelarna
- [ ] Öppna knappen på datorn → "Inloggad som …" → Radarn/Offerter fungerar direkt
- [ ] Öppna samma knapp igen → "Länken har redan använts"
- [ ] **Ekonom**: mejlet nämner bara Ekonomi. **UE**: bara SMS med tre steg, inget mejl
- [ ] Klaryta-admin: mejlet saknar Inställningar och HubSpot
- [ ] Logga in som UE i telefonen → **ÄTA-knappen syns inte**
- [ ] I telefonen: **💻 Logga in på en dator** → mejl till din egen adress → fungerar en gång
- [ ] Fliken **SMS-logg**: nyckeln syns som `key=•••`
- [ ] Fliken **Datorlänkar**: bara hash, ingen läsbar kod
- [ ] **Kvittens**: du (admin som skickade) får mejlet "✅ Välkomstpaket skickat till …" med status och SMS-texten där nyckeln är `key=•••`; rutan i appen visar raden 🧾 Kvittens
- [ ] Kvittens vid fel: skicka till en person med felaktigt nummer → ämnet börjar med ⚠️ och felet står i mejlet
- [ ] Nummer utan nolla i Personal (t.ex. `701234567`) → SMS går ändå fram

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

## 7. Blacksta – flyttat till eget projekt

Blacksta finns nu i repot **Blacksta** med egen backend, eget kalkylark och egna inloggningar.
I den här appen är Blacksta spärrat för alla utom admin på LPV tills datan är flyttad; därefter tas `blacksta/` och backenddelen bort härifrån.

- [ ] Flikarna Blacksta_Plan, Blacksta_Händelser och Läkemedelsjournal är kopierade till Blacksta-kalkylarket
- [ ] Ta bort `blacksta/` och Blacksta-delen i Kod.gs från den här appen

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

### 8b. På plats och förslag från kartan (admin)
- [ ] Zooma in på en adress → **💡 Förslag från kartan** → parkeringar (→ Maskinzon) och gångvägar/trappor (→ Handskottning) visas streckade
- [ ] Det som redan är ritat föreslås inte igen
- [ ] **Ta med** → fyll i adress → Spara zon. **✕** tar bort förslaget
- [ ] I telefonen: välj Maskinzon → gå till varje hörn → **📍 Punkt där jag står** (5 s) → Spara
- [ ] **🏔️ Snöupplag**: ställ dig där snön ska ligga → Punkt där jag står → anteckning → Spara; syns i Snöjour

### 8c. Snöunderlag från kunderna (kräver ny Kod.gs)
- [ ] Snöplanering → 📥 Importera → välj **Skrivbordet/Snöadresser/snöunderlag.json** → granskningslistan visar 74 fastigheter och 76 kartor
- [ ] Importera → klart, "utan position" listar Smedjan, Salsta Gärde, Kvarteret Pokalen m.fl. → peka ut dem
- [ ] Fastighetskortet visar kund, område och kundkartor → **❄️ Rita zoner från kundkartan**
- [ ] Kundkartan ligger ovanpå satellitbilden → ✥ flytta, ⟳ vrid/skala tills husen passar → 💾 Spara läge
- [ ] iPad, Justera läge: ett finger/Pencil flyttar kundkartan, två fingrar vrider och nyper; sidan zoomas inte
- [ ] Knappen 🗺️/🛰️ till vänster på kartan (nås med tummen liggande) → 🛰️ Satellit: kartan går att dra/zooma igen; ✕ Avbryt lägger tillbaka kundkartan
- [ ] Rutan i vanligt läge: 👁 i rubriken, 🤖 stor, ✋ liten, Klar/Senare under strecket
- [ ] Färger: maskin blå, handskottning orange, snöupplag magenta – förklaring nere till vänster i Rita zoner och Snöjour
- [ ] Apple Pencil, Maskinzon: rita runt ytan → hörnen läggs ut när pennan lyfts; fingrarna flyttar/zoomar kartan under tiden
- [ ] Apple Pencil, Sträcka: dra linjen; Kantsten/Entré: ett tryck med pennan lägger markören
- [ ] 🏔️ Snöupplag som yta (rita runt) och som punkt (ett tryck / Punkt där jag står) – båda sparas; gamla upplag syns som 🏔️
- [ ] 🖌️ Pensel 1 / 1,5 / 2 m: måla en gångväg → m² visas; överlapp räknas en gång; ↶ tar bort senaste draget
- [ ] Pensel med två skilda fläckar → Spara ger två handskottningszoner på samma adress
- [ ] Pensel utan penna (telefon): fingret målar; två fingrar avbryter draget och zoomar
- [ ] iPad: inga knappar i Rita zoner hamnar under klockan/batteriet
- [ ] Rita zoner öppnar nästa fastighet som inte är klar direkt; 📍 på adressen, 📍-knappen i rutan döljer/visar (minns valet)
- [ ] FKAB snökarta (t.ex. Floragatan 20–22): 🤖 föreslår bara ytor inom det rödrandiga – maskin + handskottning runt entréer
- [ ] iPad: panelen till höger sitter fast (sidan glider inte); ringa in med pennan → ✏️ på kartan medan du ritar, ✅ med m² när du lyfter
- [ ] Pennan medan kundkartan justeras → meddelande om att trycka 💾 Spara läge först
- [ ] Förslag (🤖 och 💡) syns tydligt på kartan med nummer; tryck på raden i listan → kartan zoomar dit och förslaget blinkar
- [ ] ⛶ Helskärm i Rita zoner döljer statusraden – prova både i hemskärmsappen och i Safari; ✕ Lämna helskärm
- [ ] **🤖 Föreslå zoner** → förslagen hamnar på rätt ställen → Ta med → Spara zon
- [ ] Malmaskolan och vårdcentralen: välj del 1 / del 2
- [ ] **🚪 Entré** → tryck vid en dörr (även inne i en zon) → Spara → 3 × 3 m handskottning
- [ ] Kör importen igen → inget dubbleras
- [ ] **Flera hjälps åt:** välj **Mitt område** → nästa fastighet stannar i området; den som en annan har öppen visas med 🔒 och hoppas över (släpps efter 30 min eller vid Klar/Senare)
- [ ] **✅ Klar – nästa** / **⏭ Senare – nästa** → hoppar till nästa fastighet; de överhoppade kommer sist; "x av 74 klara" stämmer

### 8d. Ny meny och verktygslåda (iPad med Apple Pencil, admin)
- [ ] Panelen: fast sidhuvud med område + fastighet och flikarna **🏠 Fastighet / 🗂️ Zoner / 👷 Förare**; vald flik ligger kvar efter omladdning
- [ ] **Verktygslådan nere till höger:** typ (Maskin/Hand/Upplag/Sträcka/📍 Markör ▾) och instrument (✏️ Penna / 🖌️ Pensel / 🧽 Sudd), bredder när pensel/sudd är vald, 📍 GPS och ↶ Ångra
- [ ] **✏️ Penna:** ringa in → ytan syns med vita hörn; ringa in en bit till → slås ihop
- [ ] **🖌️ Pensel:** måla → läggs till med vald bredd (1/1,5/2 m)
- [ ] **🧽 Sudd:** ringa in (eller sudda med 1/2/4 m) från kanten → biten försvinner; rakt igenom → 2 delar (sparas som 2 zoner); **hål mitt i (t.ex. gräs i en AI-yta) → hålet försvinner, kopplat till kanten med en smal skarv**; sparas och syns rätt i Snöjour
- [ ] Byt **Maskin ↔ Hand** med en yta på gång → typen byts, formen ligger kvar
- [ ] Hörnen: dra (penna/finger) · tryck = ta bort · kantprick = nytt hörn · fingrar flyttar kartan
- [ ] **Ta med** ett förslag → kan rättas direkt med penna/sudd/hörn → 💾 Spara
- [ ] **Sudda direkt på ett förslag** (utan Ta med) → förslaget tas med automatiskt och biten suddas; ↶ ger tillbaka biten
- [ ] Tryck på en **sparad zon** → kan ändras direkt → **💾 Spara ändringar**; **✕ Avbryt** → som förut
- [ ] **📍 Markör ▾ → 🚪 Entré:** tryck vid två dörrar → 2 ytor à 9 m² → Spara ger 2 zoner
- [ ] Markör (brunn m.m.) med en osparad yta → "Spara eller avbryt först"
- [ ] Utan penna: tryck ut hörnen med fingret, eller 📍 GPS-punkter; penseln målar med fingret

### 8e. Grannar – rita flera fastigheter samtidigt
- [ ] Floragatan 23 → **Floragatan 20–22** dyker upp som granne (inom 100 m, eller "kartorna överlappar" om båda kartorna är utlagda)
- [ ] Öppna t.ex. Floragatan 20–22 → kortet visar **🏘️ Grannar** (samma kund, inom 100 m eller med överlappande kundkarta) med avstånd
- [ ] Bocka i en granne → dess kundkarta (om den är utlagd) och en orange nål med adressen syns
- [ ] Rita en zon vid grannen → **Fastighet / Adress** fylls i med grannens adress; vid den öppna → dess adress
- [ ] En yta som delas i två delar vid två fastigheter → sparas med var sin adress
- [ ] Skriver man en egen adress → skrivs inte över
- [ ] **✅ Klar (n) – nästa** → alla ibockade blir klara; nästa fastighet öppnas
- [ ] Granne som någon annan jobbar med → 🔒 och går inte att bocka i
- [ ] Bocka i en granne vars kundkarta **inte är utlagd** → den blir aktiv och Justera öppnas; den egna kartan ligger kvar
- [ ] **🗺️ Kundkartor på kartan:** tryck på en adress → den kartan blir aktiv (✏️); 👁/🙈 döljer var karta för sig
- [ ] 🤖 Föreslå zoner med grannar ibockade → AI:n läser **alla utlagda** kundkartor samtidigt; förslagen heter t.ex. "Gård · Floragatan 23"
- [ ] En ibockad granne vars karta inte är utlagd → nämns i panelen ("passa in den först") och hoppas över
- [ ] **Ta med** ett förslag → Fastighet / Adress blir förslagets adress
- [ ] Dölj den aktiva kartan (👁 → 🙈) så att bara grannens syns → **✋ Justera läge** flyttar grannens karta, inte den dolda
- [ ] Avstånden stämmer ungefär (nålarna kan ligga 20–50 m fel – säg till om 100 m är för lite/mycket)

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

## 9b. Lägg ut hinder steg för steg (kräver ny Kod.gs)

Öppnas via **⚠️ Lägg ut hinder** på kartan i Snöjour, eller **📷 Hinder steg för steg** i Rita snözoner.

**Telefon, på plats (förare med tilldelad slinga):**
- [ ] Adresserna på dina slingor visas, med den närmaste först
- [ ] Välj adress → GPS-rutan visar ±meter (grön ≤ 5 m, gul ≤ 10 m, röd över)
- [ ] Ställ dig på ett brunnslock → **📍 Jag står på hindret** → mäter i 10 s
- [ ] **📷 Ta foto** → AI:n föreslår typ och anteckning (tar några sekunder)
- [ ] Markeringen syns på kartan och går att dra; byt typ om AI:n tog fel → **✅ Spara hindret**
- [ ] Såg AI:n fler hinder: **Lägg ut** → peka på kartan → spara
- [ ] Hindret syns i Snöjour; tryck på det → fotot visas i rutan
- [ ] I kalkylarket (Snözoner) står Foto (Drive-ID) och GPS-noggrannhet ifyllda

**iPad/dator (admin, från kartan):**
- [ ] Läget **🗺️ Karta** är förvalt; välj adress → tryck på kartan → Nästa
- [ ] Välj ett foto från datorn → AI-förslag → spara
- [ ] **➕ Ny adress** finns bara för admin

## 9c. Väder – Plogometern och Sandometern (kräver ny Kod.gs)
- [ ] Apps Script (dev): kör **installeraVaderKoll** en gång → godkänn behörigheter → loggen visar plog/sand per område
- [ ] Meny → **🌨️ Väder**: fem områden med båda mätarna, timprognos, vägyta, kamerabild
- [ ] Ändra **Plogas från** (cm) → Spara → mätarna räknas om
- [ ] Förare med slinga i Flen: Snöjour visar Plogometern och Sandometern för Flen
- [ ] Vid 70 % / 90 %: notisen med kaffebryggaren visas när appen öppnas → 👍 Uppfattat → visas inte igen förrän läget ändras
- [ ] Fliken **Väderlogg** fylls på (en rad per område och mätning)

## 9d. Widget på hemskärmen (iPhone/iPad, Scriptable – kräver ny Kod.gs)
- [ ] Startsidan: mini-mätarna (Plogometern och Sandometern) överst för den som har en snöslinga → tryck öppnar Snöjour
- [ ] Startsidan → **📱 Widget på hemskärmen** → **🔑 Skapa mitt widgetskript** → **📋 Kopiera**
- [ ] Scriptable → ＋ → klistra in → döp till LPV → ▶ visar mätarna
- [ ] Hemskärmen: liten widget (tom parameter) = mätarna; mellan med parameter `jobb` = Mina jobb; `alla` = alla jobb (admin)
- [ ] Låsskärmen: rund (högsta av plog/sand) och bred (båda)
- [ ] **🚫 Spärra min widget** → widgeten visar "gäller inte längre"; skapa nytt → fungerar igen
- [ ] Admin: 🔑 Spärra & skapa ny länk för en person → personens widget slutar också fungera

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
- [ ] **📥 Importera från kalkylark**: markera cellerna i arket (med rubrikraden) → Cmd+C → klistra in i rutan
- [ ] Kolumnerna gissas rätt (adress, ort, storlek, prio, anteckning) – ändra i listorna om inte
- [ ] Förhandsvisningen visar 🟠 stor / 🔵 liten, okända storleksvärden listas i gult
- [ ] Importera → förloppsstapel → "Import klar" med antal importerade / fanns redan / utan position
- [ ] Importera samma ark igen → allt "fanns redan", inga dubbletter
- [ ] "Visa de som saknar storlek" → fyll i storlek på dem
- [ ] Adresser "utan position" → filtret 📍 → tryck på kartan för var och en
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

## 10c. Varumärken & HubSpot (kräver ny Kod.gs uppladdad)

- [ ] Kör `godkannBehorigheter` i Apps Script → loggen visar "✅ HubSpot FASAD: nyckeln fungerar"
- [ ] Ny vanlig offert → varumärke LPV är förvalt; lägg till fasadmått → byter till Fasadmålarna
- [ ] Välj Klaryta själv → ligger kvar efter Spara och omladdning
- [ ] Offertlistan har filter per varumärke, och varje kort visar varumärket
- [ ] Skicka en fasadoffert till dig själv → 🟢 på kortet; i HubSpot finns kontakten och en affär i fasen "Kontrakt skickat" med Varumärke = Fasadmålarna
- [ ] Skicka en LPV-offert → hamnar i fasadmålarnas HubSpot med Varumärke = LPV
- [ ] Skicka en Klaryta- eller linjeoffert (ingen nyckel än) → ⏳ på kortet, offerten skickas ändå till kunden
- [ ] Godkänn offerten via kundlänken → affären blir "Vunnen" i HubSpot
- [ ] Makulera en skickad offert → affären blir "Förlorad"
- [ ] Samma kund (samma e-post) två gånger → en kontakt i HubSpot, två affärer
- [ ] ⚙️ Priser & inställningar → HubSpot-rutan visar vilka varumärken som är kopplade och antal väntande
- [ ] I kalkylarket "Offerter": kolumnerna Varumärke och HubSpot finns efter Fakturerad, och Fakturerad fungerar som förut

**Kundregister från HubSpot:**
- [ ] ⚙️ Inställningar → "⬇️ Hämta kunder och affärer från HubSpot" → "✅ Klart! N kunder i registret"
- [ ] I kalkylarket finns fliken Kunder med kontakter och företag
- [ ] Fliken 👥 Kunder: sök på namn/telefon/adress hittar rätt; tryck på en kund visar tidigare affärer
- [ ] "➕ Ny offert till kunden" → offerten är ifylld med kundens uppgifter
- [ ] I en ny offert: "🔎 Välj kund ur registret" → välj → namn, telefon, e-post, adress fylls i; BRF/företag får ingen ROT
- [ ] Tryck "Hämta" igen → antalet kunder ökar inte (inga dubbletter)
- [ ] Medan hämtningen pågår går det att spara tidrapporter i appen

**Kundregister – gemensamt + Fortnox:**
- [ ] Fliken Kunder: de gamla 13 kolumnerna (ROT/RUT, fastighetsbeteckning m.m.) är orörda; nya kolumner till höger (Varumärke, Källa, HubSpot-…, Fortnox-kundnr)
- [ ] 👥 Kunder → 📥 Importera kunder från Fortnox → välj `Fortnox-kunder-import.tsv` → "388 nya kunder"
- [ ] Importera igen → inga dubbletter
- [ ] Sök på kundnummer, orgnr eller ort hittar rätt; kortet visar "Fortnox 123"
- [ ] Ekonomi → kundvalet innehåller Fortnox-kunderna
- [ ] Hämta från HubSpot efteråt → samma kund (e-post/orgnr) blir en rad med både Fortnox-nr och HubSpot
- [ ] Inga personnummer i kundfliken från importen

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

## GDPR – att göra

**Först (snabbt och viktigast):**
- [x] Byt personalnamnen i Blacksta-filerna och prototyperna mot påhittade (Lisa, Kalle, Stina …) och UE-numret mot ett fiktivt
- [x] Rensa namnen ur Git-historiken (gjort 2026-11-02, säkerhetskopia i ~/Dev-repot/backup/)
- [ ] Be GitHub Support rensa gamla commits (pull request #1 pekar på gammal historik)
- [ ] Flytta kalkylark/Drive/Apps Script från privat Gmail till **Google Workspace** och godkänn Googles databehandlingsavtal (DPA)
- [ ] Tvåstegsverifiering på Google, HubSpot, GitHub och 46elks

**Sedan:**
- [ ] Bilder i Drive delas med "alla som har länken" (fastighetsfoton, stallbilder, kulörförslag) – visa via appens inloggning i stället, eller begränsa
- [ ] Gemini (kulörförslag): använd betald API-nivå så att husfoton inte används för träning; nämn det i kundinformationen
- [ ] Personnummer (ROT, när det byggs): bara i offert/faktura, aldrig till HubSpot, maskerat i listor
- [ ] Integritetspolicy för kunder – länk i offertmejlet och på kundsidan
- [ ] Information till personalen om vad appen sparar (tider, jour, larmkvitteringar). Sparas GPS i framtiden: bedömning, info, bara arbetstid, ev. MBL-förhandling

**Avtal & dokumentation:**
- [ ] Personuppgiftsbiträdesavtal: Google (Workspace + Gemini), HubSpot, 46elks, GitHub – kolla EU–US Data Privacy Framework/standardavtalsklausuler, välj EU-lagring där det går
- [ ] Registerförteckning: vilka uppgifter, ändamål, laglig grund, lagringstid, vem som har åtkomst
- [ ] Laglig grund per ändamål (kunder: avtal · bokföring/ROT: rättslig förpliktelse · personal: anställningsavtal · HubSpot-marknadsföring: berättigat intresse)

**Gallring & rättigheter (byggs i appen):**
- [ ] Automatisk gallring: bokföringsunderlag 7 år · offerter som inte blev av ~2 år · inaktiva kunder ~3 år · personal efter avslut · larmloggar och bilder · läkemedelsjournal 5 år
- [ ] Registerutdrag och radering per person (admin-funktion)

**Säkerhet & incidenter:**
- [ ] Kalkylarket bara delat med de som behöver; spärra nycklar direkt när någon slutar
- [ ] Incidentrutin: anmälan till IMY inom 72 timmar – vem gör vad

---

## Innan deploy till PROD

- [ ] Avsnitt 1, 3 och 4 är helt gröna
- [ ] **Snödata dev → prod:** kundkartornas läge, snözoner och slingor flyttas med export/import (inga testzoner, slingan "Test" väljs bort). Kolla först om prod redan har zoner som förarna använder.
- [ ] **Varumärken (villkor för att gå live med offerter/HubSpot):** rätt logga och avsändare finns för varje varumärke och syns på offert-PDF och kundmejl
  - [x] Loggor levererade (LPV, Fasadmålarna, Linjemålarna, Klaryta) – ligger i `loggor/`
  - [ ] Skicka en offert per varumärke till dig själv: rätt logga i PDF, mejl (överst) och på kundsidan; avsändare och ämne med varumärkets namn
  - [ ] Fakturaunderlag (Ekonomi) för ett Klaryta-pass har Klarytas logga och namn
  - [ ] Egenkontroll-PDF har loggan
  - [ ] Lägg in Klarytas uppgifter i fliken Inställningar: rader `Klaryta.companyOrgNr`, `Klaryta.companyAddress`, `Klaryta.companyPhone`, `Klaryta.companyEmail`, `Klaryta.companyBankgiro` (annars blir de tomma på Klarytas dokument)
  - [ ] Fasadmålarnas logga är liten (190×85 px) – byt mot en större eller SVG när den finns
  - [ ] HubSpot-nycklar i Apps Script (Skriptegenskaper): `HUBSPOT_TOKEN_FASAD`, `HUBSPOT_TOKEN_LINJE` – aldrig i GitHub
- [ ] Fyll i företagsuppgifter under Offerter → ⚙️ i **PROD** också
- [ ] Ladda upp samma `Kod.gs` till **PROD**-versionens Apps Script med `./ladda-upp-kod.sh prod` (prod har en egen backend, klonad i `~/Dev-repot/AppsScript-prod`) → Ny version
- [ ] Kör deploy (GitHub Actions → "Deploy to Production")
- [ ] Öppna prod-appen och spara ett riktigt testpass
- [ ] Skicka nya inloggningslänkar till alla förare
- [ ] iPhone-förare: ta bort den gamla appen från hemskärmen, öppna nya länken i Safari och lägg till appen igen via guiden (annars saknar hemskärmsappen nyckeln)
- [ ] När alla har nya länkar: ta bort `API_TOKEN` ur `Config.gs` och `config.js`

## Knapprespons (knappar.js, 2026-11-04)
- [ ] Tryck på valfri knapp i iPhone/iPad → knappen blir mörkare och lite mindre direkt
- [ ] 📦 Skicka välkomstpaket → snurra före texten, knappen blekare tills rutan med svaret kommer
- [ ] Tryck två gånger snabbt på en knapp som sparar/skickar → bara ett utskick
- [ ] Knappar som inte pratar med servern (t.ex. ✏️ Penna i Rita zoner) får ingen snurra
- [ ] Hemskärmsappen: "Ny version – tryck för att uppdatera" visas så att knappar.js kommer med

## Tillbaka-knapp & statusfältet (2026-11-04)
- [ ] Varje sida (Ekonomi, Offerter, Radarn, Snöplanering, Rita zoner, Snöjour, Hinder, Väder, Widget, Ikoner, Guiden): **← Hem** sitter fast uppe till vänster, precis under klockan/batteriet, även när man scrollar
- [ ] Hinder: knappen heter **← Snöjour** (eller **← Rita zoner** om man kom därifrån). Öppen offert: **← Alla offerter**
- [ ] Rita zoner och Snöplanering: knappen ligger över kartan, 🗺️/🛰️ under den
- [ ] Inget (rubriker, knappar, text) ligger under statusfältet på iPhone eller iPad – särskilt Ekonomi, Guiden, Snöplanering på iPad och Radarns sidopanel
- [ ] Offerter: dialogrutorna och Radarns sidopanel lägger sig över tillbaka-knappen
- [ ] ikoner.html: skapa kulan **Tillbaka** → den ersätter ← i knappen på alla sidor

## Personal-översikten (personal.html, 2026-11-04 – kräver ny Kod.gs)
- [ ] Nås från sidomenyn (iPad), Mer-menyn (telefon), admin-knapparna på startsidan och "Översikt →" i Radarns sidopanel
- [ ] Listan: kulor/initialer, roll, bolag, "Idag: …" för den som är inplanerad i Radarn
- [ ] Sök + rollfilter; "Visa inaktiva" visar de som inte är aktiva
- [ ] Tryck på en person: Ring/SMS/Mejl öppnar telefonen/mejlen
- [ ] ✏️ Ändra mobil → sparas med inledande 0 i fliken Personal
- [ ] Sätt en testperson till Inaktiv → försvinner ur listan; Karantän → kan inte logga in
- [ ] Försök ta bort din egen admin → felmeddelande
- [ ] Tidigare projekt: platser med datum, dagar och timmar; egenkontroller under rätt plats, ✅ PDF öppnas
- [ ] "Visa äldre än 12 månader" visas när det finns äldre rapporter
- [ ] Klaryta-admin: ser bara Klarytas personal, kan inte ändra admin/ekonom
- [ ] ikoner.html: skapa kulan **Personal**
