# Prod-beslut (2026-11-09)

**Beslut:** Det som hittills kallats *dev* (detta repo, Kod.gs i AppsScript-dev, dev-kalkylarket) **är det skarpa systemet**. Personalen har fått välkomstpaket och personliga nycklar härifrån och ser det som skarpt.

## Gjort 2026-11-09
- **Gamla prod stängt.** Repot `Tidsrapportering-och-annat-LPV` + det bundna skriptet i gamla prod-kalkylarket (version från 30 okt, bara tidrapporter/personal/kalender, inloggning med en gemensam API_TOKEN som låg öppet i det publika repot). Båda webbapp-implementeringarna (@48 och @39) är borttagna – adressen svarar 404. Med token gick det att hämta namn + mobilnummer för all personal (GDPR) – den läckan är stängd.
- Endast Daniel hade rapporterat i gamla prod.
- Kopia av gamla prod-koden: `~/Dev-repot/AppsScript-prod` (clasp clone, läsning).

## Kvar
1. **Testmiljö:** klona detta system (kopia av kalkylarket med bundet skript + eget repo/Pages) så att nya funktioner byggs utanför det skarpa. Tills dess: var försiktig med ändringar som syns för personalen.
2. **Gamla prod-repot:** arkivera på GitHub (eller gör privat) så att ingen tror att det är appen. Inga hemligheter kvar som fungerar.
3. Daniels egna tidrapporter i gamla prod-kalkylarket: flytta in om de behövs.
4. GDPR-listan i TESTLISTA.md inför skarpt läge.
