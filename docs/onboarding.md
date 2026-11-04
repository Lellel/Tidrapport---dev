# Välkomstpaket för nya användare

Bestämt med Daniel 2026-11-03. Byggt (Kod.gs: handleSendWelcomeKit, handleRedeemPcLink, handleSendPcLink).

## Knappen
**📦 Skicka välkomstpaket** när en person läggs till eller får en ny roll. Rollen och bolaget avgör vad som skickas. Har personen flera roller får hen allt i samma SMS och mejl.

## Per roll
| Roll | 📱 SMS | ✉️ Mejl |
|---|---|---|
| **Admin LPV** | Inloggningslänk + "lägg appen på hemskärmen" (fungerar på telefon och iPad) | Engångslänk för datorn + kort introduktion till **allt**: Radarn, Offerter & Kunder, Snöplanering, Rita snözoner och hinder, Ekonomi, Inställningar, lägga till personal |
| **Admin Klaryta** | Som ovan | Som ovan, men bara Klarytas delar (inte stalltvätten eller LPV:s inställningar) |
| **Ekonom** | Inloggningslänk | Engångslänk för datorn + Ekonomi: fakturaunderlag, markera fakturerat, PDF |
| **UE** | Inloggningslänk + tre steg: dina jobb under Planerade → logga tiden på jobbet → egenkontroll med bilder | Inget (jobbar i telefonen) |
| **Förare** | Som i dag | – |

- Bolagets logga och avsändare (LPV eller Klaryta).
- Fasta texter i koden till att börja med.
- Mejlet är kort: en mening och en länk per del.

## Engångslänk för datorn
- Gäller **en gång** och i **7 dagar**. Datorn loggas in vid första öppningen, sedan är länken död.
- Därefter är personen inloggad i den webbläsaren tills vidare.
- Ny länk behövs vid ny dator eller webbläsare, rensad webbläsardata, eller om admin spärrat personen eller bytt nyckel (då loggas alla enheter ut).
- Safari på Mac kan rensa inloggningen efter cirka 7 dagar utan besök. Mejlet tipsar om **Arkiv → Lägg till i Dock** eller Chrome.
- **💻 Logga in på en dator** i appen: personen skickar själv en ny engångslänk till sin egen mejl från telefonen.
- Den riktiga nyckeln skickas bara i SMS:et, aldrig i mejlet.

## UE (underentreprenörer)
- Loggar sin tid på jobben de är inplanerade på i radarn.
- Kan krävas på egenkontroll och bilddokumentation.
- Lägger **inte** till ÄTA (de är oftast lösningen på ÄTA). ÄTA-knappen döljs för UE.
- Fler funktioner senare, kopplade till radarn (t.ex. egenkontroll klar innan jobbet räknas som klart).

## Kvittens till admin (bestämt 2026-11-04)
- Varje gång ett välkomstpaket skickas får admin som skickade ett kvittensmejl (e-posten på admin i Personal).
- Skickas alltid, även när SMS eller mejl misslyckades – då med ⚠️ i ämnet och felet i mejlet.
- Innehåll: person, roll, bolag, mobil, e-post, status för SMS och mejl, samt SMS-texten med nyckeln maskad (`key=•••`).

## Kräver
- Mobilnummer (SMS) och e-post (mejl) i Personal.
- 46elks för SMS (finns), e-post via Google (finns).

## Säkerhet
- Nyckeln maskeras (`key=•••`) i fliken SMS-logg.
- Fliken Datorlänkar sparar bara en hash av engångskoden.
- Klaryta-admin kan bara skicka till personal i Klaryta (inte till admin eller ekonom).
- Själv-länken: högst fem per dygn.

## Ny personal – rutin (bestämt 2026-11-04)
1. Lägg alltid till personen **i appen**: startsidan → Administratör → Lägg till & skicka välkomstpaket. Aldrig direkt i arket – då saknas nyckel, och mobilnumret kan tappa nollan.
2. Kontrollera på **Personal-sidan → ⚠️ Att åtgärda** att personen inte står kvar där:
   - *Ingen personlig länk / Välkomstpaket inte skickat* (läses ur fliken SMS-logg) → 📦 Välkomstpaket
   - *Saknar mobil*, *Saknar e-post* (admin/ekonom), *Konstigt i arket* → ✏️ Ändra
   - *Saknar avatar* → personen skapar sin kula på startsidan (bubblan överst)
3. **Högtiderna** behöver inget per person: tomteluva, haröron m.m. läggs automatiskt på alla kulor (även initialer). Se docs/sasonger.md.
4. När den gamla gemensamma nyckeln (API_TOKEN) är borttagen kommer man **bara** in med personlig länk – därför måste ⚠️-listan vara tom.
