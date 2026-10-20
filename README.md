Den tidigare versionen var en bra start, men systemet har vuxit ordentligt i precision, säkerhet och finess sedan dess. Den gamla texten nämnde fortfarande gamla saker som dolda iframes, 1280px-bilder och en outvecklad inloggning.

Här är en uppgraderad, knivskarp **`README.md`** som speglar exakt hur systemet är konstruerat idag:

---

# 🚜 Tidrapportering – "JAS 39 Gripen" (LPV Edition)

> En extremt driftsäker, blixtsnabb och *offline-first* PWA (Progressive Web App) i äkta Cupertino-design, skräddarsydd för entreprenad och fältpersonal.

Byggd med filosofin att personal i maskinhytten ska spendera minimal tid framför skärmen. Systemet kräver minsta möjliga antal tryck och fungerar felfritt även i källare, betonggarage eller djupt ute i skogen utan mobiltäckning.

---

## 🏗️ Systemarkitektur

Systemet är fritt från tunga ramverk, externa npm-beroenden och löpande licensavgifter:

* **Frontend:** Vanilla HTML5, CSS3 (Cupertino Glassmorphism) och JavaScript.
* **Offline & Cache:** PWA Service Worker (`sw.js`) konfigurerad med *Network First*, omedelbar aktivering (`skipWaiting`, `clients.claim`) och fullt stöd för iOS fristående webbappläge.
* **Backend:** Google Apps Script (`Kod.gs`) exponerad som Web App med samtidighetslås (`LockService`).
* **Databas & Logg:** Google Kalkylark (fliken *Tidrapporter*, kolumn A–J).
* **Filarkiv:** Google Drive API via Apps Script för automatisk mappstrukturering av arbetsfoton.
* **Planering:** Google Kalender ("Osthyveln") för automatisk synkning av tilldelade pass.
* **Driftsättning (CI/CD):** Dubbla GitHub-repon (DEV & PROD) orkestrerade av **JAS 39 Deploy Bot** via GitHub Actions.

---

## 🧠 Smarta lösningar & Arkitektur

### 1. Offline-first Utkorg & Karusell

Rapporter sparas initialt i enhetens `localStorage`. Sparade och pågående pass visualiseras i en horisontell glassmorphism-karusell i toppen. Vid instämpling utan sluttid pulserar passet med grön statuslampa ("Pågår"). När föraren har täckning skickas hela dagens skörd in i en samlad batch med ett enda klick.

### 2. Klientkomprimering & Smarta Drive-mappar

Mobilkameror producerar tunga filer som snabbt spräcker webbläsarens lagringsminne.

* Foton skalas ned direkt på enheten via HTML5 Canvas till **max 800px bredd och 70 % JPEG-kvalitet** innan de sparas lokalt.
* Vid batch-inskick skapar backend automatiskt en unik undermapp i Google Drive (`ÅÅÅÅ-MM-DD Plats (Aktivitet)`), avkodar bilderna, laddar upp dem och sparar en direktlänk till mappen i rapportens anteckningsfält.

### 3. Google Kalender ("Osthyveln")

Schemalagda jobb i Google Kalender läses in automatiskt för valt datum. De visas som förberedda kort i karusellen med blå markering. Föraren klickar bara på **"Stämpla in"** så konverteras kalenderbokningen till ett aktivt arbetspass med tidtagning i realtid.

### 4. Säkerhet & Datahygien

* **Token-autentisering:** Backend accepterar uteslutande anrop som bär med sig en giltig `API_TOKEN`.
* **Formelsanering (Anti-Formula Injection):** All inkommande textdata (plats, anteckningar, ÄTA) tvättas med funktionen `sanitize()` i Apps Script. Tecken som `=`, `+`, `-` och `@` kapslas in för att omöjliggöra exekvering av skadliga formler i Google Kalkylark.

### 5. Onboarding via SMS & Apples iMessage-brygga (`sms.html`)

Google Kalkylark genererar iMessage-länkar för varje anställd under fliken *Personal*.

* **Sheets-spärren:** Google Kalkylark blockerar länkar med `sms:`. Därför dirigeras klicket till landningssidan `sms.html`.
* **Apple Quirk-fix:** iOS och macOS tömmer mottagarfältet om man använder standardformatet `?body=`. I `sms.html` tvingas formatet `sms:<nummer>&body=<text>` fram.
* **Nummertvätt:** Telefonnummer saneras från bindestreck och mellanslag och konverteras automatiskt från `07x` till internationellt format `+467x`.

### 6. Fältstöd (Snabbnavigation)

Ett integrerat 4-knappars rutnät i botten ger föraren omedelbar navigering via Apple Maps djuplänkar (`[maps.apple.com/?q=](https://maps.apple.com/?q=)...`). Ett tryck söker direkt fram närmaste:

* 🍔 **Snabbmat**
* 🪵 **Byggvaruhus**
* 🔩 **Biltema**
* 🔴 **Jula**

### 7. Maskinikoner & Cupertino UI

* Äkta Apple-känsla med dynamisk statusrad (`black-translucent` och synkad `theme-color`).
* Vektoriserade, specialritade SVG-ikoner för verksamhetens maskinpark (Snöröjning/plog, Linjemålning/Graco, Bandgrävare, Stalltvätt, Kyl/frys-kärra, Fasadställning).
* Fullt stöd för både Dark Mode och Light Mode.

---

## 🚀 CI/CD & Deploy-rutin (DEV ➔ PROD)

Projektet använder en isolerad tvåmiljö-struktur:

```text
[ DEV Repo: Tidrapport---dev ] 
           │
           ▼  (GitHub Actions: "JAS 39 Deploy Bot")
[ PROD Repo: Tidsrapportering-och-annat-LPV ]

```

### Automatisk kodsynk

Workflow-filen `.github/workflows/deploy.yml` triggas manuellt via GitHub Actions (`workflow_dispatch`). Roboten:

1. Klonar produktionsrepot via `secrets.DEPLOY_TOKEN`.
2. Kopierar över `index.html`, `style.css`, `app.js`, `sw.js` och `sms.html`.
3. **ISOLERING:** `config.js` skrivs **aldrig** över, vilket garanterar att PROD-miljöns skarpa API-adresser förblir orörda.
4. Skapar en commit och pushar direkt till produktion.

### Backend-deploy (Apps Script)

Eftersom miljöspecifika ID:n ligger i `Config.gs`, är backend-motorn `Kod.gs` 100 % identisk i båda miljöerna:

1. Kopiera källkoden i `Kod.gs` från DEV till PROD.
2. Välj **Implementera ➔ Hantera distributioner ➔ Ny version** i Google Apps Script.

---

## 📋 Databasstruktur (Google Kalkylark)

Data skrivs sekventiellt till fliken **Tidrapporter** i kolumnerna **A–J**:

| Kolumn | Fält | Format / Datatyp | Beskrivning |
| --- | --- | --- | --- |
| **A** | Datum | `ÅÅÅÅ-MM-DD` | Arbetspassets datum |
| **B** | Fakturerad | Kryssruta (`false`) | Standard: Urbockad (Nej) |
| **C** | Betalställe | Sträng | Projekt/Kund (t.ex. Coop, NCC) |
| **D** | Aktivitet & Pass | Sträng | Maskinaktivitet alt. `[ÄTA 04] ...` |
| **E** | Starttid | `TT:MM` | Påbörjad tid |
| **F** | Sluttid | `TT:MM` | Avslutad tid |
| **G** | Total tid | Sträng (`X tim Y min`) | Summerad arbetstid |
| **H** | Tidsstämpel | `ÅÅÅÅ-MM-DD TT:MM:SS` | Systemtid vid synkronisering |
| **I** | Användare | Sträng | Förarens namn |
| **J** | Anteckning | Sträng & URL | Fältnoteringar + länk till Drive-bildmapp |

---

## 🛠️ Framtida Roadmap

* **Fakturadashboard (iPad/Desktop):** En administrativ vy för kontoret för att filtrera, granska och klarmarkera ofakturerade rader (kolumn B).
* **Utökad materialrapportering:** Snabbfält för att addera förbrukat material (t.ex. salt/sand, färgburkar) direkt knutet till passets ÄTA-nummer.
