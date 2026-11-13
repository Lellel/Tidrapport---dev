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

## 🗑 Ta bort en person (beslut 2026-11-13)
- Knappen **🗑 Ta bort** finns på personkortet (under ✏️ Ändra) och på UE-sidan under personen. Servern: `deleteStaff`.
- **Inga pass** (inga rader i Tidrapporter och ingen handskottning i Snöfall-logg) → raden tas bort ur Personal och Snöresurser.
- **Har pass** → personen *arkiveras*: status Inaktiv och nyckeln töms (kan inte logga in). Timmarna står kvar i Ekonomi.
- I båda fallen plockas personen ur snöplaneringen: handskottarkulor på fastigheterna och fast förare på traktorer.
- **Vem:** admin inom sitt bolag (bara LPV-admin tar bort admin/ekonom), och **UE-ansvarig för personer i sitt eget UE-företag** (Daniel valde b). Ingen kan ta bort sig själv.
  UE-ansvarig har ännu ingen egen sida för sitt folk – servern tillåter det redan, vyn kommer senare.
- **🗑 Ta bort företaget** (UE) hindras bara av *aktiva* personer och traktorer. Ett oregistrerat företag som bara har inaktiva personer kvar syns inte längre i UE-listan.
- Senare vid behov: GDPR-rensning ("radera helt efter X år") för arkiverade – hänger ihop med GDPR inför skarpt läge.
