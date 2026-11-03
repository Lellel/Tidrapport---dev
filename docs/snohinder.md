# Lägg ut snöhinder steg för steg

Bestämt med Daniel 2026-11-03. Byggt i `snohinder.html`.

## Två lägen
- **📍 På plats** (förval i telefon): ställ dig på hindret och tryck. Appen tar ett medelvärde av GPS:en i 10 sekunder (säkrare mätpunkter väger mer) och visar noggrannheten. Över 8 m står det "osäker – dra markeringen rätt".
- **🗺️ Karta** (förval på iPad/dator): tryck på kartan där hindret ligger.

## Stegen
1. **Adress**: förare ser bara adresser på sina slingor (närmast först). Admin kan lägga till ny adress.
2. **Plats**: GPS eller tryck på kartan.
3. **Foto**: AI:n (Gemini 2.5 Flash) föreslår typ och kort anteckning, och listar fler hinder den ser på bilden. Går att hoppa över.
4. **Kontroll**: välj eller ändra typ, dra markeringen, skriv anteckning, spara.
5. **Klart**: lägg ut AI:ns övriga förslag (placeras genom att peka på kartan), nästa hinder eller byt adress.

## Regler
- AI:n föreslår, människan bekräftar. Inget sparas utan att någon tryckt Spara.
- Förare får lägga till nya hinder på sina egna slingor, men inte ändra eller ta bort. Admin ändrar och tar bort i Rita snözoner.
- Hindertyper: Brunnslock, Kantsten, Trappa, Övrigt hinder (pollare, stolpe, låg grind, refug, sten …).
- Fotot sparas i Drive (mappen Snö-hinder) och visas för förarna när de trycker på hindret.
