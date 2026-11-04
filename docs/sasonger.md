# Säsongsteman (sasong.js)

Bestämt med Daniel 2026-11-04. Byggt samma dag.

## Teman och perioder (räknas ut automatiskt varje år)
| Tema | Period | Faller | På avatar-kulorna | Färg |
|---|---|---|---|---|
| 🥐 Fettisdagen | 47 dagar före påskdagen | semlor | – | – |
| 🥧 Pi-dagen | 14 mars | π och siffror, pajer | – | – |
| 🧇 Våffeldagen | 25 mars | våfflor | – | – |
| 🐣 Påsk | palmsöndag – annandag påsk | fjädrar och ägg + en hare som skuttar förbi ibland | haröron | – |
| 🇸🇪 Nationaldagen | 6 juni | flaggor, blågul konfetti | – | blå |
| 🦞 Kräftskiva | hela andra veckan i augusti (mån–sön, veckan med andra onsdagen) | kräftor | kräfthatt | – |
| 🍥 Kanelbullens dag | 4 okt | kanelbullar | kockmössa | kanelbrun |
| 🎃 Halloween | hela helgen (fre–sön) närmast 31 okt, plus 31 okt | fladdermöss och löv | häxhatt | orange |
| 🕯️ Lucia | 13 dec | ljusglimt och stjärnor | ljuskrona | – |
| 🎄 Jul | 23 – 30 dec | snö | tomteluva | julröd |
| 🎆 Nyår | 31 dec – 1 jan | konfetti | – | – |

Endagsteman gäller bara själva dagen och vinner om två teman krockar (t.ex. våffeldagen under påsken 2027).

## Regler
- Gäller hela appen. Det fallande visas inte på kartsidorna (Snöplanering, Rita zoner, Snöjour, Hinder), inte i Natt-läget och inte om enheten har "minska rörelse" på.
- **Av/på per enhet**: temaknappen (t.ex. 🎄) bredvid lägesknappen 🌓 – syns bara när ett tema gäller. Avstängt gäller den perioden; nästa tema kommer som vanligt.
- **Förhandsgranska**: `?tema=jul` (eller `?jul=1`) i adressen, `?tema=av` för att sluta. Gäller tills fliken stängs.

## Glaskulor per tema
- Varje appikon kan få en variant per tema (nyckel `hem_jul`). Saknas varianten visas den vanliga kulan.
- Skapas på ikoner.html – välj tema i raden överst (eller `ikoner.html#jul`). Motivet = grundmotivet + temats tillägg (APP_ICON_THEMES i Kod.gs).
- Lucia och jul skapas först; övriga när påminnelsen kommer.

## Påminnelse i kortsnurran (startsidan, bara admin)
- 3 veckor innan ett tema: kort "🕯️ Lucia om 12 dagar – 3 av 39 lucia-kulor klara" med **🎨 Skapa kulor** (öppnar ikoner.html på temat) och **Göm** (det temat det året).
- Försvinner när temat börjar eller alla kulor finns.
