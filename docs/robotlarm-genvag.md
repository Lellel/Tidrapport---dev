# Robotlarm via genväg på iPhone (väg 1, vald 2026-11-05)

Servern tar inte emot SMS – den tar emot webbanrop. Telefonen som får robotens larm-SMS gör om det till ett webbanrop med en automation i Genvägar. Servern (`robotAlarm` i Kod.gs → `handleRobotAlarm`) markerar den robotrad som går som larmande, sparar SMS:et i fliken Robotlarm och appen visar den röda larmbannern. Kvittera → tiden räknas; Åtgärdat – starta → tidrapport "Robotlarm".

## Uppsättning (en gång per telefon som får larmen)
1. Genvägar → Automatisering → ＋ → **Meddelande**.
2. Avsändare = robotens nummer. (Valfritt: Meddelandet innehåller "larm".)
3. **Kör omedelbart**, stäng av Meddela vid körning → Nästa → Ny tom automatisering.
4. Åtgärd **Hämta innehållet i URL**:
   - URL = appens API-adress (`API_URL` i config.js)
   - Metod POST, Begärans brödtext JSON, fält (Text):
     - `action` = `robotAlarm`
     - `user` = användarens namn i Personal
     - `key` = användarens nyckel (kolumn L)
     - `text` = Genvägsindata → **Innehåll**
5. Under testet: lägg till **Visa meddelande** (Innehåll i URL) sist; ta bort när det fungerar.

## Test
- Starta en robotrad i arbetsordern först. Svar `{"status":"success","matched":true,...}` = klart. "ingen robotrad var igång" = kopplingen fungerar men ingen rad var startad.

## Kom ihåg
- Nyckeln ligger i genvägen – efter "Spärra & skapa ny länk" måste genvägen få den nya nyckeln.
- Fungerar bara på telefonen som får SMS:et (täckning krävs). Robustare alternativ: 46elks-nummer med webhook (väg 2).
- `robotAlarm` kräver admin på LPV.
- SMS med "finished"/"färdig" (roboten klar) blir inget larm – servern loggar dem som klara. Den gamla genvägen "SMS-larm från Evoclean" (larmljud) ska ha villkoret *Meddelande innehåller inte finished*.
