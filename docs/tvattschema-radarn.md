# Tvättschemat → Radarn

*Beslutat med Daniel 2026-11-12. Kort i Pågår: "Tvättjobben i Blacksta: kunna flytta en tvätt till en annan person".*

## Varför
I dag läser appen tvättkalendern (`CONFIG.CALENDAR_ID` = Tvättschema Blacksta) direkt i `jobsForDay`, men bara för admin på LPV. Ingen annan ser tvättarna, och de går inte att lämna över. Radarn har redan tilldelning, och den som är tilldelad ser jobbet i sin app.

## Beslut
1. **Daniel upprättar tvättschemat** i Google-kalendern Tvättschema Blacksta. Kalendern är källan för *vad* och *när*.
2. Appen gör **automatiskt ett Radar-jobb av varje tvätt** i kalendern, med Daniel som tilldelad från början.
3. **Vem** som tvättar bestäms i **Radarn**. Ändras datum eller titel i kalendern följer Radar-jobbet med, och tilldelningen ligger kvar.
4. **Tvätten dyker upp i "Dagens pass" för den som är tilldelad** – via Radar-jobbet. Appen slutar läsa kalendern direkt i "Dagens pass", så att tvätten inte syns två gånger för Daniel. "Less is more" (Daniel).
5. **Aktivitet: Stalltvätt.**
6. **Robot först:** pågår kalenderhändelsen **mer än två dagar** börjar jobbet som **"Starta robot"**. Tvättaren trycker **🤖 Roboten klar** när den kört färdigt – därefter är resten av dagarna **manuella tvättpass** (Daniel 2026-11-12: låt verkligheten styra i stället för ett fast antal dagar). Kortare händelser = bara tvättpass. Bygg vidare på robotläget i stalltvätten (`STALLREGISTER & STALLTVÄTT` i Kod.gs).
7. **Allt i kalendern synkas** (även t.ex. "Tvätta på Berg", "Starta robot"), **3 månader framåt**.

8. **Kalendern speglas rakt av:** tas en tvätt bort ur kalendern försvinner Radar-jobbet, läggs en till dyker den upp (Daniel 2026-11-12).
9. **Synken körs varannan timme** (tidsstyrd utlösare i Apps Script).

*Byggt 2026-11-12.*

## Hur det är byggt
- `syncWashSchedule()` i Kod.gs: händelser från 3 veckor bakåt till 3 månader framåt → rader i `Gantt_Jobb` med id `KAL-…` (hash av kalenderhändelsens id). Kund "Blacksta", helgarbete ja, timmar = dagar × 8 × antal personer, ny tvätt tilldelas `SU_NAMN` (Daniel). Inga planeringsnotiser vid synk – men när Daniel lämnar över i Radarn får mottagaren den vanliga notisen.
- Körs via `syncWashIfDue()`: i väderkörningen (var 15:e min, synkar om ≥ 2 h sedan sist) och när Radarn öppnas (≥ 15 min). Senaste synk i skriptegenskapen `TVATT_SYNK`.
- Kolumnerna **Robot** (ja om händelsen > 48 h) och **Robot klar** (tid + namn) i `Gantt_Jobb`. Åtgärden `robotDone` (tilldelad eller admin).
- `jobsForDay`: kalendern läses inte längre direkt; tvättjobb får `activity: "Stalltvätt"`, `stallName` och `robotPending`.
- Tester: `verktyg/tester/tvattsynktest.js` (server) och `tvatt-e2e.js` (webbläsare). `jobstest.js` uppdaterad.
