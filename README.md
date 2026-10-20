Markdown
# JAS 39 Gripen – LPV Tidrapport (Cupertino PWA)

Produktionssystem och fältapplikation för tidrapportering, maskinstyrning och ÄTA-hantering hos LPV. Systemet är byggt som en offline-first Progressive Web App (PWA) med äkta Apple iOS Cupertino Glassmorphism, kopplad till Google Workspace (Sheets, Drive, Calendar) via Google Apps Script.

---

## 1. Systemarkitektur

[ PWA Fältklient (iOS / Safari) ]
│  ▲
│  │ (Network First / Offline LocalStorage)
▼  │
[ GitHub Pages Hosting ]
│
▼ (HTTPS POST / JSON Batch + API Token)
[ Google Apps Script (Web App) ]
├──▶ Google Sheets (Databas: Tidrapporter & Personal)
├──▶ Google Drive (Fotounderlag och kvitton)
└──▶ Google Calendar ("Osthyveln" / Schemalagda jobb)

---

## 2. Miljöer och CI/CD (JAS 39 Pipeline)

Systemet är uppdelat i två helt isolerade GitHub-repos:
1. **DEV:** `Tidrapport---dev` – Utveckling, testning och prototyper.
2. **PROD:** `Tidsrapportering-och-annat-LPV` – Skarp produktionsmiljö för förare.

### Deploy-rutin
Synkronisering från DEV till PROD sker via GitHub Actions (`workflow_dispatch`). 
- **Miljöisolering:** `config.js` och `Config.gs` synkroniseras **aldrig** automatiskt. PROD behåller alltid sina skarpa API-nycklar och databas-ID:n.

---

## 3. Gränssnitt och Funktioner

- **Cupertino Glassmorphism:** Mörk frostad glaseffekt (`backdrop-filter: blur(16px)`), anpassad för OLED-skärmar med mjuk gradientbakgrund.
- **Offline Batch-utkorg:** Sparar pass lokalt i telefonen. Flera pass kan stämplas, pausas eller samlas innan de skickas in i en enda batch.
- **Osthyveln (Kalender):** Hämtar dagens tilldelade projekt från Google Kalender med ett klick.
- **ÄTA-stöd:** Automatisk utfällning av fält för ÄTA-nummer och referens vid tilläggsarbete.
- **Adaptiv iPad- & Landskapsdashboard:**
  - När telefonen vrids horisontellt (Landscape) eller öppnas på en iPad fälls en högerspalt ut med realtidsstatistik över dagens timmar och registrerade pass.
- **Behörighetsstyrt Adminläge (`&admin=true`):**
  - Om användaren har administratörsstatus fälls administrationsverktygen ut i liggande läge.
  - Möjlighet att distribuera inloggningslänkar via SMS, E-post samt visa en dynamisk QR-kod på skärmen för direkt inloggning med mobilkamera.

---

## 4. Databasstruktur (Google Kalkylark)

### Fliken `Tidrapporter`
| Kolumn | Fält | Beskrivning |
| :--- | :--- | :--- |
| **A** | Datum | YYYY-MM-DD |
| **B** | Fakturerad | Kryssruta (FALSE = Ej fakturerad) |
| **C** | Plats | Arbetsplats / Betalställe |
| **D** | Aktivitet & Pass | Maskintyp / Uppgift / [ÄTA xx] |
| **E** | Starttid | HH:mm |
| **F** | Sluttid | HH:mm |
| **G** | Total tid | Formaterad som "X tim Y min" |
| **H** | Tidsstämpel | Datum och klockslag för registrering |
| **I** | Användare | Maskinförarens namn |
| **J** | Anteckning | Fältnoteringar samt eventuell bildlänk |

### Fliken `Personal`
| Kolumn | Fält | Funktion |
| :--- | :--- | :--- |
| **A** | Användare | Förarens namn |
| **B** | Pinkod | Behörighetskod |
| **C** | Telefon | Mobilnummer |
| **D** | E-Post | E-postadress |
| **E** | Behörighet | "Admin" eller tomt |
| **F** | Skicka SMS | Genererar iMessage-länk via `sms.html` |
| **G** | Skicka Mail | Genererar förberett e-postmeddelande (`mailto:`) |
| **H** | QR-Kod | Direktrenderad QR-kod (`=IMAGE(...)`) |

---

## 5. Licens och Drift
Utvecklat för LPV Fastighetsservice. Optimerat för iOS Safari och WebKit.
