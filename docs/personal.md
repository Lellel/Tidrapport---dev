# Personal-översikten (personal.html)

Bestämt med Daniel 2026-11-04.

## Var den nås
- Sidomenyn på startsidan (iPad/dator), Mer-menyn (startsidan och flikraden på övriga sidor), admin-knapparna på startsidan.
- Radarn: "Översikt →" vid rubriken Personal i sidopanelen.
- Direktlänk till en person: `personal.html?p=Namn`.

## Vem ser vad
- Bara admin (`getStaffOverview`, `getStaffHistory`, `updateStaff` ligger i adminOnly).
- LPV-admin ser alla; Klaryta-admin ser bara Klarytas personal och kan bara ändra förare/UE (samma regler som välkomstpaketet).

## Listan
- Ett kort per person: kula (avatar, annars initialer), namn, roll, bolag och dagens jobb ur Radarn.
- Sök på namn/nummer/e-post, filter per roll och (LPV-admin) bolag.
- Inaktiva (status i kolumn H annat än tomt/Aktiv) är dolda – filtret "Visa inaktiva" visar dem.

## Personkortet
- 📞 Ring, 💬 SMS, ✉️ Mejl, 📦 Välkomstpaket (samma som på startsidan, med kvittens), ✏️ Ändra.
- Ändra: mobil, e-post, roll, status (Aktiv/Inaktiv/Karantän) och bolag (bara LPV-admin). Namnet ändras inte här – det är nyckeln i alla flikar.
  Man kan inte ta bort sin egen admin-behörighet eller göra sig själv inaktiv. Karantän spärrar inloggningen.
- **Tidigare projekt**: personens tidrapporter grupperade per plats (datum, antal dagar, timmar, aktiviteter), senaste 12 månaderna, knappen "Visa äldre" för resten.
  Egenkontroller som personen skapat hamnar under platsen (matchas på Plats eller Kund); signerade har länk till PDF:en, andra visar status.
  Egenkontroller utan matchande tidrapport listas separat.
