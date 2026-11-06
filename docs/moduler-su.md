# Moduler per person, SU-panelen och väderval

Bestämt med Daniel 2026-11-06. **Inte byggt.**

## Bakgrund
Administratörerna vill bara se det som gäller snön just nu. Vilka delar av appen en person ser ska kunna styras per person, och det ska bara Daniel (SU) kunna ändra.

## Moduler
| Modul | Innehåll |
|---|---|
| ❄️ Snö | Snöplanering, Snöregister, Rita zoner, Snöjour, Väder |
| 🔭 Radarn | Planeringen av jobb |
| 📄 Offerter & kunder | Offerter, ÄTA, kundregister |
| 💰 Ekonomi | Fakturaunderlag |
| 👥 Personal | Personalöversikt, välkomstpaket, nya personer |
| 🐄 Stalltvätt | Arbetsorder och robotlarm |
| ⏱️ Tidrapport | Syns alltid |

- Ingen bock = allt som rollen ger (inget ändras förrän SU bockar).
- En avbockad modul **döljs** i alla menyer (sidomeny, flikrad, Mer, admin-knappar), i bruksanvisningen, i "Nytt sedan sist" och i välkomstmejlet. Den **spärras inte** – behörigheten följer fortfarande rollen.
- Lagras i en ny kolumn **Moduler** i Personal. Appen läser den via `me` när den startar.

## SU-panelen (`moduler.html`, 🎛️ Moduler)
- Lista med alla personer och en rad bockar per person.
- **❄️ Säsongsknapp:** "Bara snö" för valda personer på en gång (Snö + Tidrapport), och "Allt igen" när säsongen är slut.
- **Återställ min vanliga inloggning:** ny nyckel till Daniels vanliga konto, tar bort karantän.
- Länken/knappen syns bara för Daniel. Servern godtar ändringar bara från en SU-inloggning.

## SU-kontot
- Ingen rad i Personal. Definieras i Skriptegenskaper: `SU_NAMN`, `SU_EPOST`. Kan inte ändras från appen.
- **In i panelen:** Daniels vanliga konto ser 🎛️ Moduler → saknar enheten SU-inloggning: **Skicka SU-länk till min e-post** → engångslänk (en gång, 15 minuter) → enheten är SU-inloggad i 30 dagar eller tills utloggning/spärr. Bara en hash av koden sparas.
- **Nödutgångar (körs i Apps Script-editorn):** `suNodatkomst` mejlar en ny SU-länk även om appen eller Personal är trasig; `suSparraAlla` loggar ut alla SU-enheter.
- **Skydd av Daniels vanliga konto:** andra admins kan inte sätta det i karantän, göra det inaktivt eller ta bort admin.
- SU-e-post: Daniels jobbmejl (samma konto som äger skriptet). Sätts i `SU_EPOST`.

## Plogometern och Sandometern i mobilappen
- **Varje person väljer själv** i telefonen, längst ner på startsidan vid Läge: 🌨️ Väder: [🚜 Plogometern] [🪣 Sandometern]. Båda på från början.
- Det som stängs av försvinner från startsidan och Snöjour, och ger inga notiser.
- Sparas per telefon. Widgeten styrs som förut av sin egen parameter.
