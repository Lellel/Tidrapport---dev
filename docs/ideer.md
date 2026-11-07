# Idéer till senare

## Kundens namn och logga på luren när kunden ringer (2026-11-04)
Mål: när en kund ringer visas kundens namn (och logga) på telefonen – i vanliga samtal och i 3Koppla. Kontaktboken ska underhålla sig själv.

**Bakgrund:** 3Koppla har inget publikt API. Färdig HubSpot-koppling finns men kräver tillvalet CRM Plus och ger bara en länk i softphonen. 3Koppla-appen kan synka kontakter från Google/Microsoft.

**Vägar (enklast → krångligast):**
1. **Gemensamt Google-konto** (Workspace, t.ex. kunder@…) som bara innehåller kunderna. Apps Script synkar kundregistret dit varje natt + när kunder ändras (lägger till, uppdaterar, tar bort; logga som kontaktbild). Telefonerna lägger till kontot bredvid sina egna kontakter (bara Kontakter på). Egen kontaktbok delas inte; Standardkonto för nya kontakter = iCloud.
2. Samma som 1, men appen ger en **installationsprofil** (.mobileconfig) som lägger in kontot med ett par tryck (applösenord).
3. **Riktig iPhone-app** (skal runt webbappen): skriver själv i kontaktboken – eller **nummerupplysning** (CallKit Call Directory: "LPV-kund: Brf Solen" utan att lägga till kontakter, bara text). Kräver Apple-utvecklarkonto, TestFlight/Apple Business Manager och underhåll.
- vCard-fil (engångsimport) går att bygga snabbt men underhåller sig inte.

**Loggor:** från kundens domän/mejldomän (loggtjänst), HubSpot-företag, eller uppladdad i appen; reserv = initialer i färg.
**Att bestämma:** GDPR-text (kundnummer i personalens telefoner), om UE ska ha kontaktboken (förslag: nej), bara kunder med aktiva jobb?
**Rekommendation:** väg 2. Väg 3 om appen ändå blir en riktig app (push, bakgrunds-GPS i Snöjour).

## Animerat timglas (2026-11-05)
Alla ⏳ som visas medan något väntar (t.ex. "⏳ AI:n placerar kartan…") vänds sakta upp och ner. Byggs i knappar.js (byter ⏳-tecknen mot ett animerat element) så att ingen sida behöver ändras. Tas efter att kartplaceringen är klar.

## Kundkartor till UE från original-PDF:erna (vilande, 2026-11-07)
Om UE-mejlets PDF blir för stor: de 75 originalen (`~/Desktop/Snöadresser/uppackat`) är i snitt 159 kB mot 328 kB för appens JPEG. LandInfo = grundkarta som bild (794×568) + skraffering/symboler/text som vektor, alltså skarpare och mindre. Plan: ladda upp originalen till Drive, koppla till kartorna via snöunderlag.json, foga ihop sidorna med pdf-lib i Kod.gs och använd JPEG:en där original saknas. Att vektorisera JPEG:en är ingen väg – skrafferingen blir tiotusentals streck. Daniel 2026-11-07: släpps tills det blir ett problem.
