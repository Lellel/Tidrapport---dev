/**
 * LPV & KLARYTA - BACKEND MOTOR (Kod.gs)
 * Version: DEV v4.7.5 (Kramer Turkos Hood Update, Gemini 3D Auto-Save, Gantt v33)
 */

// ==========================================
// 1. SANERING & SÄKERHET
// ==========================================
function sanitize(input) {
  if (!input) return "";
  let str = String(input).trim();
  if (/^[=+\-@]/.test(str)) return "'" + str; // Skydd mot Formula Injection
  return str;
}

// ==========================================
// 2. MAIN GET & POST HANDLERS (WEBAPP ROUTER)
// ==========================================
function doGet(e) {
  if (e && e.parameter && e.parameter.api === "true") {
    return createJsonResponse({
      status: "online",
      system: "LPV & Klaryta Backend",
      version: "v4.7.5",
      timestamp: new Date().toISOString()
    });
  }

  // Servera index.html som webbapplikation
  return HtmlService.createTemplateFromFile("index")
    .evaluate()
    .setTitle("LPV & Klaryta - Framtidsradarn & Tidrapport")
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(15000);

  if (!hasLock) {
    return createJsonResponse({ status: "error", message: "Servern var upptagen, försök igen." });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ status: "error", message: "Ingen data skickades." });
    }

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      data = e.parameter || {};
    }

    const action = data.action;

    // --- ÖPPNA ÅTGÄRDER (kräver ingen inloggning) ---
    if (action === "ping") {
      return createJsonResponse({ status: "success", version: "v4.7.5", message: "Ansluten till Kod.gs" });
    }
    // Kundens godkännande: skyddas av en signerad kod i länken i stället för nyckel
    if (action === "approveAta" || action === "approveOffert") {
      const docType = action === "approveAta" ? "ata" : "offert";
      const docId = data.ataId || data.offertId || data.documentId;
      if (!docId || !isValidDocumentCode(docType, docId, data.code)) {
        return createJsonResponse({ status: "error", message: "Ogiltig eller utgången godkännandelänk." });
      }
      return docType === "ata" ? approveAta(docId) : approveOffert(docId);
    }

    // --- INLOGGNING: personlig nyckel (eller gamla gemensamma nyckeln under övergången) ---
    const auth = authenticate(data);
    if (!auth) {
      return createJsonResponse({ status: "error", message: "Åtkomst nekad: Ogiltig inloggning. Be om en ny inloggningslänk." });
    }
    const adminOnly = ["getUsers", "getUserKey", "signDocument", "saveSnowZone", "deleteSnowZone", "setSlingaDrivers",
      "getFleet", "saveTractor", "deleteTractor", "generateTractorAvatar",
      "getProperties", "saveProperty", "deleteProperty", "addPropertyPhoto", "removePropertyPhoto"];
    if (adminOnly.indexOf(action) !== -1 && !auth.isAdmin) {
      return createJsonResponse({ status: "error", message: "Åtkomst nekad: Kräver administratör." });
    }
    // Vanliga användare kan bara rapportera i eget namn
    if (!auth.isAdmin && !auth.legacy) {
      (data.pass || []).forEach(p => { p.user = auth.user; });
      data.anvandare = auth.user;
      data.user = auth.user;
      data.resursId = auth.user;
    }

    // --- ROUTER ---
    if (action === "getKabanossData") return handleGetKabanossData();
    if (action === "saveKabanossJob") return handleSaveKabanossJob(data);
    if (action === "sickReport") return handleSickReport(data);
    if (action === "batchReports") return handleBatchReports(data);
    if (action === "getUsers") return handleGetUsers();
    if (action === "getUserKey") return handleGetUserKey(data);
    if (action === "signDocument") return createJsonResponse({ status: "success", code: signDocument(data.docType, data.docId) });
    if (action === "transform_to_clay") return handleClayTransformation(data);
    if (action === "save_time_report") return handleSaveTimeReport(data);
    if (action === "save_ata") return handleSaveAta(data);
    if (action === "getSnowZones") return handleGetSnowZones(auth);
    if (action === "setSlingaDrivers") return handleSetSlingaDrivers(data, auth.user);
    if (action === "getFleet") return handleGetFleet();
    if (action === "saveTractor") return handleSaveTractor(data.tractor);
    if (action === "deleteTractor") return handleDeleteById(getFleetSheet(), data.id);
    if (action === "generateTractorAvatar") {
      lock.releaseLock(); // AI-bilden tar 10-20 s – låt andra rapportera under tiden
      return handleGenerateTractorAvatar(data.id);
    }
    if (action === "getProperties") return handleGetProperties();
    if (action === "saveProperty") return handleSaveProperty(data.property);
    if (action === "deleteProperty") return handleDeleteById(getPropertySheet(), data.id);
    if (action === "addPropertyPhoto") return handleAddPropertyPhoto(data.id, data.imageBase64);
    if (action === "removePropertyPhoto") return handleRemovePropertyPhoto(data.id, data.photoId);
    if (action === "saveSnowZone") return handleSaveSnowZone(data.zone, auth.user);
    if (action === "deleteSnowZone") return handleDeleteSnowZone(data.zoneId);

    return createJsonResponse({ status: "unknown_action", message: "Okänd action: " + action });

  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// =========================================================
// 2b. PERSONLIGA NYCKLAR & SIGNERADE KUNDLÄNKAR
// Nycklarna ligger i kolumn L ("App-nyckel") i fliken Personal.
// Hemligheten för kundlänkar ligger i Script Properties (DOC_SECRET) och
// skapas automatiskt första gången. Den gamla gemensamma nyckeln
// (CONFIG.API_TOKEN) fungerar tills raden tas bort ur Config.gs.
// =========================================================
const KEY_COLUMN = 12; // Kolumn L

function getStaffSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_STAFF || "Personal");
  if (sheet && sheet.getRange(1, KEY_COLUMN).getValue() === "") {
    sheet.getRange(1, KEY_COLUMN).setValue("App-nyckel").setFontWeight("bold").setBackground("#f3f3f3");
  }
  return sheet;
}

function findStaffRow(sheet, name) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(name || "").trim() && rows[i][0] !== "") {
      return { rowNumber: i + 1, row: rows[i] };
    }
  }
  return null;
}

function isAdminRow(row) {
  return String(row[4] || "").trim().toLowerCase() === "true";
}

function authenticate(data) {
  const sheet = getStaffSheet();
  if (data.user && data.key && sheet) {
    const hit = findStaffRow(sheet, data.user);
    const savedKey = hit ? String(hit.row[KEY_COLUMN - 1] || "") : "";
    const quarantined = hit && String(hit.row[7] || "").toLowerCase() === "karantän";
    if (savedKey && savedKey === String(data.key) && !quarantined) {
      return { user: String(hit.row[0]), isAdmin: isAdminRow(hit.row), legacy: false };
    }
    return null;
  }
  // Övergång: gamla gemensamma nyckeln. Ta bort API_TOKEN ur Config.gs för att stänga av.
  const legacyToken = (typeof CONFIG !== "undefined" && CONFIG.API_TOKEN) || "";
  if (legacyToken && data.token === legacyToken) {
    const hit = sheet && data.user ? findStaffRow(sheet, data.user) : null;
    return { user: String(data.user || "Okänd"), isAdmin: !!(hit && isAdminRow(hit.row)), legacy: true };
  }
  return null;
}

// Admin hämtar (eller skapar) en persons nyckel för inloggningslänken. reset=true ger ny nyckel och spärrar den gamla.
function handleGetUserKey(data) {
  const sheet = getStaffSheet();
  const hit = findStaffRow(sheet, data.targetUser);
  if (!hit) return createJsonResponse({ status: "error", message: "Personen finns inte i fliken Personal." });
  let key = String(hit.row[KEY_COLUMN - 1] || "");
  if (!key || data.reset) {
    key = Utilities.getUuid().replace(/-/g, "");
    sheet.getRange(hit.rowNumber, KEY_COLUMN).setValue(key);
  }
  return createJsonResponse({ status: "success", user: String(hit.row[0]), key: key });
}

function getDocSecret() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty("DOC_SECRET");
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty("DOC_SECRET", secret);
  }
  return secret;
}

function signDocument(docType, docId) {
  const bytes = Utilities.computeHmacSha256Signature(String(docType) + ":" + String(docId), getDocSecret());
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, "").slice(0, 16);
}

function isValidDocumentCode(docType, docId, code) {
  return !!code && signDocument(docType, docId) === String(code);
}

// =========================================================
// 3. SMART INTELLIGENS FÖR MODELLER & TILLVERKARE
// =========================================================
function parseMachineModel(text) {
  if (!text) return null;
  const lower = String(text).toLowerCase().trim();

  const brands = [
    "kramer", "volvo", "cat", "caterpillar", "jcb", "ljungby",
    "avant", "bobcat", "manitou", "merlo", "kubota", "takeuchi",
    "hitachi", "komatsu", "wacker", "neuson", "terex", "atlas", "kobelco",
    "john deere", "deere", "valtra", "new holland", "massey", "fendt", "claas", "weidemann", "giant", "multione", "schäffer"
  ];

  const isMachine = brands.some(b => lower.includes(b)) ||
                    lower.includes("maskin") || lower.includes("traktor") ||
                    lower.includes("lastare") || lower.includes("grävare") || lower.includes("hjullastare");

  if (!isMachine) return null;

  let sizeClass = "medium";
  let icon = "🚜";

  // --- KRAMER ---
  if (lower.includes("kramer")) {
    icon = "🚜";
    if (lower.includes("37.8") || lower.includes("8095") || lower.includes("8115") || lower.includes("5507") || lower.includes("5509") || lower.includes("4507")) {
      sizeClass = "stor";
    } else if (lower.includes("8075") || lower.includes("8085") || lower.includes("5075") || lower.includes("5085")) {
      sizeClass = "medium";
    } else if (lower.includes("5035") || lower.includes("5050")) {
      sizeClass = "liten";
    } else {
      sizeClass = "medium";
    }
  }
  // --- VOLVO ---
  else if (lower.includes("volvo")) {
    icon = "🚜";
    if (lower.match(/l(60|70|90|110|120|150|180|220)/) || lower.match(/ec(140|160|220|250|300)/)) {
      sizeClass = "stor";
    } else if (lower.match(/l(20|25|30|35|45|50)/) || lower.match(/ecr(58|88)/)) {
      sizeClass = "medium";
    } else if (lower.match(/ecr(18|25|35)/)) {
      sizeClass = "liten";
    }
  }
  // --- AVANT / BOBCAT ---
  else if (lower.includes("avant") || lower.includes("bobcat")) {
    icon = "🟡";
    sizeClass = "liten";
  }
  // --- LJUNGBY ---
  else if (lower.includes("ljungby")) {
    icon = "🚜";
    sizeClass = "stor";
  }
  // --- GENERELL TONNAGE-REGEXP FALLBACK ---
  else {
    let weightMatch = lower.match(/(\d+[\.,]?\d*)\s*(ton|t\b)/);
    if (weightMatch) {
      let weight = parseFloat(weightMatch[1].replace(',', '.'));
      if (weight >= 10) sizeClass = "stor";
      else if (weight >= 4) sizeClass = "medium";
      else sizeClass = "liten";
    }
  }

  return { type: "machine", sizeClass: sizeClass, icon: icon };
}

// ==========================================
// 4. KABANOSS / GANTT API HANDLERS
// ==========================================
function handleGetKabanossData() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  // 1. Kunder
  const klientSheet = ss.getSheetByName("Kunder");
  const klientRows = klientSheet ? klientSheet.getDataRange().getValues() : [];
  const clients = [];
  for (let i = 1; i < klientRows.length; i++) {
    if (klientRows[i][1]) {
      clients.push({
        id: klientRows[i][0],
        name: klientRows[i][1],
        idNr: klientRows[i][2],
        email: klientRows[i][3],
        billingCompany: klientRows[i][4],
        status: klientRows[i][5],
        contact: klientRows[i][6],
        phone: klientRows[i][7],
        address: klientRows[i][8],
        type: klientRows[i][9] || "company",
        rotRut: klientRows[i][10] || "none",
        propertyId: klientRows[i][11] || "",
        logoUrl: klientRows[i][12] || ""
      });
    }
  }

  // 2. Personal & Resurser
  const resursSheet = ss.getSheetByName(CONFIG.SHEET_STAFF || "Personal");
  const resursRows = resursSheet ? resursSheet.getDataRange().getValues() : [];
  const resources = [];
  for (let i = 1; i < resursRows.length; i++) {
    if (resursRows[i][0]) {
      let name = String(resursRows[i][0]);
      let id = name;
      let rollTyp = String(resursRows[i][3] || "");
      let avatarLank = String(resursRows[i][5] || "");
      let agare = String(resursRows[i][6] || "").toLowerCase();
      let statusStr = String(resursRows[i][7] || "").toLowerCase();
      let isSick = statusStr === "sjuk";

      let type = "person";
      let sizeClass = "liten";
      let icon = "👦";
      let color = "#0284c7";

      if (agare.includes("kla") || agare.includes("klaryta")) color = "#16a34a";
      else if (agare.includes("ue") || rollTyp.toLowerCase().includes("ue")) color = "#d97706";

      let parsedSpecs = parseMachineModel(name) || parseMachineModel(rollTyp);

      if (parsedSpecs) {
        type = parsedSpecs.type;
        sizeClass = parsedSpecs.sizeClass;
        icon = parsedSpecs.icon;
      } else if (rollTyp.toLowerCase().includes("verktyg") || rollTyp.toLowerCase().includes("ställning") || rollTyp.toLowerCase().includes("vagn")) {
        type = "equipment";
        icon = rollTyp.toLowerCase().includes("ställning") ? "🪜" : (rollTyp.toLowerCase().includes("vagn") ? "🎨" : "🛠️");
      }

      resources.push({
        id: id,
        name: name,
        type: type,
        sizeClass: sizeClass,
        icon: icon,
        avatarBase64: avatarLank,
        ownerCompany: agare,
        color: color,
        isSick: isSick
      });
    }
  }

  // 3. Gantt_Jobb
  const jobbSheet = ss.getSheetByName("Gantt_Jobb");
  const jobbRows = jobbSheet ? jobbSheet.getDataRange().getValues() : [];
  const jobs = [];
  for (let i = 1; i < jobbRows.length; i++) {
    if (jobbRows[i][0]) {
      let assignedArr = [];
      try {
        assignedArr = JSON.parse(jobbRows[i][11] || "[]");
      } catch (err) {
        assignedArr = String(jobbRows[i][11] || "").split(",").map(s => s.trim()).filter(Boolean);
      }

      jobs.push({
        id: jobbRows[i][0],
        client: jobbRows[i][1],
        billingCompany: jobbRows[i][2] || "LPV",
        title: jobbRows[i][3],
        status: jobbRows[i][4] || "unscheduled",
        dayIndex: jobbRows[i][5] !== "" ? Number(jobbRows[i][5]) : null,
        hours: Number(jobbRows[i][6] || 8),
        shift: jobbRows[i][7] || "Dagpass",
        siteAddress: jobbRows[i][8] || "",
        siteContactName: jobbRows[i][9] || "",
        siteContactPhone: jobbRows[i][10] || "",
        assigned: assignedArr
      });
    }
  }

  return createJsonResponse({
    status: "success",
    clients: clients,
    resources: resources,
    jobs: jobs
  });
}

function handleSaveKabanossJob(data) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Gantt_Jobb");
  if (!sheet) return createJsonResponse({ status: "error", message: "Gantt_Jobb-blad saknas." });

  const rows = sheet.getDataRange().getValues();
  let foundIndex = -1;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      foundIndex = i + 1;
      break;
    }
  }

  const rowData = [
    data.id || ("j_" + Date.now()),
    sanitize(data.client),
    sanitize(data.billingCompany) || "LPV",
    sanitize(data.title),
    sanitize(data.status) || "unscheduled",
    data.dayIndex !== null && data.dayIndex !== undefined ? data.dayIndex : "",
    data.hours || 8,
    sanitize(data.shift) || "Dagpass",
    sanitize(data.siteAddress) || "",
    sanitize(data.siteContactName) || "",
    sanitize(data.siteContactPhone) || "",
    JSON.stringify(data.assigned || [])
  ];

  if (foundIndex > 0) {
    sheet.getRange(foundIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  return createJsonResponse({ status: "success" });
}

function handleSickReport(data) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_STAFF || "Personal");
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.personId)) {
      sheet.getRange(i + 1, 8).setValue(data.isSick ? "Sjuk" : "Aktiv");
      return createJsonResponse({ status: "success", message: "Sjukanmälan sparad!" });
    }
  }
  return createJsonResponse({ status: "error", message: "Person hittades ej." });
}

// ==========================================
// 4b. SNÖZONER (ritas på iPad, visas för förarna i Snöjour)
// Fliken "Snözoner" skapas automatiskt. Geometri sparas som JSON [[lat,lng],...].
// ==========================================
const SNOW_HEADERS = ["Zon-ID", "Slinga", "Ordning", "Fastighet/Adress", "Typ", "Geometri (JSON)", "Yta (m2)", "Anteckning", "Uppdaterad av", "Uppdaterad"];
const SNOW_TYPES = ["maskin", "hand", "stracka", "kantsten", "lucka", "trappa"];

function getSnowSheet() {
  return getSheetOrCreate(SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID), "Snözoner", SNOW_HEADERS);
}

// Fliken "Slingor": vilka förare som är tilldelade varje slinga (admin bestämmer)
const SLINGA_HEADERS = ["Slinga", "Förare (kommaseparerade)", "Uppdaterad av", "Uppdaterad"];

function getSlingaSheet() {
  return getSheetOrCreate(SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID), "Slingor", SLINGA_HEADERS);
}

function readSlingaAssignments() {
  const rows = getSlingaSheet().getDataRange().getValues();
  const assignments = {};
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    assignments[String(rows[i][0])] = String(rows[i][1] || "").split(",").map(s => s.trim()).filter(Boolean);
  }
  return assignments;
}

function handleSetSlingaDrivers(data, savedBy) {
  const slinga = sanitize(data.slinga);
  if (!slinga) return createJsonResponse({ status: "error", message: "Ange vilken slinga." });
  const drivers = (Array.isArray(data.drivers) ? data.drivers : []).map(d => sanitize(d).replace(/,/g, " ")).filter(Boolean);
  const sheet = getSlingaSheet();
  const rowData = [slinga, drivers.join(", "), sanitize(savedBy),
    Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Europe/Stockholm", "yyyy-MM-dd HH:mm")];
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === slinga) {
      sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
      return createJsonResponse({ status: "success", slinga: slinga, drivers: drivers });
    }
  }
  sheet.appendRow(rowData);
  return createJsonResponse({ status: "success", slinga: slinga, drivers: drivers });
}

// Admin får alla zoner + tilldelningar. Förare får bara zoner i sina tilldelade slingor.
function handleGetSnowZones(auth) {
  const assignments = readSlingaAssignments();
  const mySlingor = Object.keys(assignments).filter(s => assignments[s].indexOf(auth.user) !== -1);
  const rows = getSnowSheet().getDataRange().getValues();
  const zones = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    let coords = [];
    try { coords = JSON.parse(rows[i][5] || "[]"); } catch (err) { coords = []; }
    zones.push({
      id: String(rows[i][0]),
      slinga: String(rows[i][1] || ""),
      order: Number(rows[i][2] || 0),
      property: String(rows[i][3] || ""),
      type: String(rows[i][4] || "maskin"),
      coords: coords,
      areaM2: Number(rows[i][6] || 0),
      note: String(rows[i][7] || "")
    });
  }
  if (auth.isAdmin) {
    return createJsonResponse({ status: "success", zones: zones, assignments: assignments, mySlingor: mySlingor });
  }
  return createJsonResponse({ status: "success", zones: zones.filter(z => mySlingor.indexOf(z.slinga) !== -1), mySlingor: mySlingor });
}

function handleSaveSnowZone(zone, savedBy) {
  if (!zone) return createJsonResponse({ status: "error", message: "Ingen zon skickades." });
  if (SNOW_TYPES.indexOf(zone.type) === -1) return createJsonResponse({ status: "error", message: "Okänd zontyp." });
  const coords = Array.isArray(zone.coords) ? zone.coords : [];
  const validCoords = coords.length > 0 && coords.length <= 500 && coords.every(c =>
    Array.isArray(c) && c.length === 2 && isFinite(c[0]) && isFinite(c[1]) && Math.abs(c[0]) <= 90 && Math.abs(c[1]) <= 180);
  if (!validCoords) return createJsonResponse({ status: "error", message: "Ogiltig geometri." });

  const sheet = getSnowSheet();
  const id = zone.id ? String(zone.id) : ("Z-" + Utilities.getUuid().slice(0, 8));
  const rowData = [
    id,
    sanitize(zone.slinga),
    Number(zone.order) || 0,
    sanitize(zone.property),
    zone.type,
    JSON.stringify(coords.map(c => [Number(Number(c[0]).toFixed(7)), Number(Number(c[1]).toFixed(7))])),
    Math.round(Number(zone.areaM2) || 0),
    sanitize(zone.note),
    sanitize(savedBy),
    Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Europe/Stockholm", "yyyy-MM-dd HH:mm")
  ];

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id) {
      sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
      return createJsonResponse({ status: "success", id: id });
    }
  }
  sheet.appendRow(rowData);
  return createJsonResponse({ status: "success", id: id });
}

function handleDeleteSnowZone(zoneId) {
  const sheet = getSnowSheet();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(zoneId)) {
      sheet.deleteRow(i + 1);
      return createJsonResponse({ status: "success" });
    }
  }
  return createJsonResponse({ status: "error", message: "Zonen hittades inte." });
}

// ==========================================
// 4c. SNÖPLANERING: TRAKTORER & FASTIGHETSKORT
// Två storlekar: "stor" och "liten". En liten kula passar i båda hålen,
// en stor kula bara i det stora – om inte fastigheten är tvingad.
// ==========================================
const FLEET_HEADERS = ["Traktor-ID", "Tillverkare & modell", "Storlek", "Ort / Uppställning", "Aktiv", "AI-kula (Drive-ID)", "Anteckning", "Uppdaterad"];
const PROPERTY_HEADERS = ["Fastighets-ID", "Adress", "Ort", "Lat", "Lng", "Storlek", "Tvinga stor", "Prioritet", "Foton (Drive-ID)", "Anteckning", "Uppdaterad"];
const SIZES = ["stor", "liten"];

function getFleetSheet() { return getSheetOrCreate(SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID), "Traktorer", FLEET_HEADERS); }
function getPropertySheet() { return getSheetOrCreate(SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID), "Fastigheter", PROPERTY_HEADERS); }

function nowStamp() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Europe/Stockholm", "yyyy-MM-dd HH:mm");
}

function findRowById(sheet, id) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) return { rowNumber: i + 1, row: rows[i] };
  }
  return null;
}

function upsertById(sheet, rowData) {
  const hit = findRowById(sheet, rowData[0]);
  if (hit) sheet.getRange(hit.rowNumber, 1, 1, rowData.length).setValues([rowData]);
  else sheet.appendRow(rowData);
}

function handleDeleteById(sheet, id) {
  const hit = findRowById(sheet, id);
  if (!hit) return createJsonResponse({ status: "error", message: "Hittades inte." });
  sheet.deleteRow(hit.rowNumber);
  return createJsonResponse({ status: "success" });
}

function isTrue(value) {
  return value === true || String(value).trim().toLowerCase() === "true";
}

// Bilder i Drive: undermapp i bildmappen, delas med länk så att appen kan visa dem
function saveImageToDrive(base64, folderName, fileName) {
  const root = DriveApp.getFolderById(CONFIG.FOLDER_ID_ROOT_IMAGES);
  const existing = root.getFoldersByName(folderName);
  const folder = existing.hasNext() ? existing.next() : root.createFolder(folderName);
  const raw = String(base64 || "").replace(/^data:image\/\w+;base64,/, "");
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(raw), "image/jpeg", fileName));
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (err) { /* delning kan vara avstängd i Workspace */ }
  return file.getId();
}

function driveImageUrl(fileId) {
  return fileId ? "https://drive.google.com/thumbnail?id=" + encodeURIComponent(fileId) + "&sz=w600" : "";
}

// ---------- TRAKTORER ----------
// Föreslår storlek från tillverkare/modell. Tre gamla klasser blir två: liten = liten, allt annat = stor.
function suggestTractorSize(model) {
  const parsed = parseMachineModel(model);
  if (!parsed) return "";
  return parsed.sizeClass === "liten" ? "liten" : "stor";
}

function tractorFromRow(row) {
  return {
    id: String(row[0]),
    model: String(row[1] || ""),
    size: String(row[2] || ""),
    base: String(row[3] || ""),
    active: row[4] === "" ? true : isTrue(row[4]),
    avatarUrl: driveImageUrl(String(row[5] || "")),
    note: String(row[6] || "")
  };
}

function handleGetFleet() {
  const rows = getFleetSheet().getDataRange().getValues();
  const fleet = [];
  for (let i = 1; i < rows.length; i++) if (rows[i][0]) fleet.push(tractorFromRow(rows[i]));
  return createJsonResponse({ status: "success", fleet: fleet });
}

function handleSaveTractor(t) {
  if (!t || !String(t.model || "").trim()) return createJsonResponse({ status: "error", message: "Ange tillverkare och modell." });
  const sheet = getFleetSheet();
  const id = t.id ? String(t.id) : ("T-" + Utilities.getUuid().slice(0, 8));
  const existing = findRowById(sheet, id);
  const size = SIZES.indexOf(t.size) !== -1 ? t.size : (suggestTractorSize(t.model) || "stor");
  const rowData = [id, sanitize(t.model), size, sanitize(t.base), t.active === false ? "FALSE" : "TRUE",
    existing ? existing.row[5] : "", sanitize(t.note), nowStamp()];
  upsertById(sheet, rowData);
  return createJsonResponse({ status: "success", tractor: tractorFromRow(rowData), suggestedSize: suggestTractorSize(t.model) });
}

function handleGenerateTractorAvatar(id) {
  const sheet = getFleetSheet();
  const hit = findRowById(sheet, id);
  if (!hit) return createJsonResponse({ status: "error", message: "Traktorn hittades inte." });
  const model = String(hit.row[1]);
  const size = String(hit.row[2]) === "liten" ? "small compact" : "big heavy-duty";
  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) return createJsonResponse({ status: "error", message: "GEMINI_API_KEY saknas i Script Properties." });

  const prompt = "A cheerful, friendly 3D animated character of a " + size + " " + model + " snow plough tractor, " +
    "in the playful toy-like style of Bob the Builder: big expressive eyes in the windshield, a happy smiling front grille, " +
    "glossy smooth plastic textures, a small snow plough blade at the front with a little snow on it. " +
    "Brand colors: " + getBrandColorPrompt(model) + ". " +
    "The character sits centered inside a shiny transparent glass sphere (a marble), soft studio lighting, " +
    "snowflakes around, solid deep navy blue background, square image, no text, no logos.";

  try {
    const response = UrlFetchApp.fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=" + apiKey, {
      method: "post", contentType: "application/json", muteHttpExceptions: true,
      payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    let json = {};
    try { json = JSON.parse(response.getContentText()); } catch (e) { json = {}; }
    const parts = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) || [];
    const imagePart = parts.find(p => p.inlineData && p.inlineData.data);
    if (response.getResponseCode() !== 200 || !imagePart) {
      return createJsonResponse({ status: "error", message: "AI svarade inte med en bild (HTTP " + response.getResponseCode() + ")." });
    }
    const fileId = saveImageToDrive(imagePart.inlineData.data, "Traktor-kulor", id + "_" + Date.now() + ".jpg");
    // Läs om raden – den kan ha ändrats under tiden AI:n arbetade
    const fresh = findRowById(sheet, id);
    if (!fresh) return createJsonResponse({ status: "error", message: "Traktorn togs bort under tiden." });
    sheet.getRange(fresh.rowNumber, 6).setValue(fileId);
    return createJsonResponse({ status: "success", avatarUrl: driveImageUrl(fileId) });
  } catch (err) {
    return createJsonResponse({ status: "error", message: "AI-fel: " + err.message });
  }
}

// ---------- FASTIGHETSKORT ----------
function propertyFromRow(row) {
  let photos = [];
  try { photos = JSON.parse(row[8] || "[]"); } catch (e) { photos = []; }
  return {
    id: String(row[0]),
    address: String(row[1] || ""),
    ort: String(row[2] || ""),
    lat: row[3] === "" ? null : Number(row[3]),
    lng: row[4] === "" ? null : Number(row[4]),
    size: String(row[5] || ""),
    forced: isTrue(row[6]),
    priority: isTrue(row[7]),
    photos: photos.map(pid => ({ id: pid, url: driveImageUrl(pid) })),
    note: String(row[9] || "")
  };
}

function handleGetProperties() {
  const rows = getPropertySheet().getDataRange().getValues();
  const properties = [];
  for (let i = 1; i < rows.length; i++) if (rows[i][0]) properties.push(propertyFromRow(rows[i]));
  return createJsonResponse({ status: "success", properties: properties });
}

// Adress -> position och ort via Googles inbyggda geokodare i Apps Script
function geocodeAddress(address, ort) {
  const query = [address, ort, "Sverige"].filter(Boolean).join(", ");
  const res = Maps.newGeocoder().setRegion("se").setLanguage("sv").geocode(query);
  if (!res || res.status !== "OK" || !res.results || !res.results.length) return null;
  const best = res.results[0];
  const comp = (best.address_components || []).find(c => c.types.indexOf("postal_town") !== -1 || c.types.indexOf("locality") !== -1);
  return { lat: best.geometry.location.lat, lng: best.geometry.location.lng, ort: comp ? comp.long_name : "" };
}

function handleSaveProperty(p) {
  if (!p || !String(p.address || "").trim()) return createJsonResponse({ status: "error", message: "Ange adress." });
  const sheet = getPropertySheet();
  const id = p.id ? String(p.id) : ("F-" + Utilities.getUuid().slice(0, 8));
  const existing = findRowById(sheet, id);
  const old = existing ? propertyFromRow(existing.row) : null;

  let lat = isFinite(p.lat) && p.lat !== null ? Number(p.lat) : (old ? old.lat : null);
  let lng = isFinite(p.lng) && p.lng !== null ? Number(p.lng) : (old ? old.lng : null);
  let ort = sanitize(p.ort) || (old ? old.ort : "");
  let geocodeNote = "";
  const addressChanged = !old || old.address !== String(p.address).trim();
  if (!p.manualPosition && (lat === null || lng === null || addressChanged)) {
    try {
      const geo = geocodeAddress(String(p.address).trim(), ort);
      if (geo) { lat = geo.lat; lng = geo.lng; if (!ort) ort = geo.ort; }
      else geocodeNote = "Hittade inte adressen på kartan – tryck på kartan för att sätta positionen.";
    } catch (err) {
      geocodeNote = "Kartsökningen misslyckades: " + err.message;
    }
  }

  const rowData = [
    id, sanitize(p.address), ort,
    lat === null ? "" : Number(Number(lat).toFixed(7)),
    lng === null ? "" : Number(Number(lng).toFixed(7)),
    SIZES.indexOf(p.size) !== -1 ? p.size : "",
    p.size === "liten" && p.forced ? "TRUE" : "FALSE",
    p.priority ? "TRUE" : "FALSE",
    existing ? existing.row[8] : "[]",
    sanitize(p.note),
    nowStamp()
  ];
  upsertById(sheet, rowData);
  return createJsonResponse({ status: "success", property: propertyFromRow(rowData), geocodeNote: geocodeNote });
}

function handleAddPropertyPhoto(id, imageBase64) {
  const sheet = getPropertySheet();
  const hit = findRowById(sheet, id);
  if (!hit) return createJsonResponse({ status: "error", message: "Fastigheten hittades inte." });
  if (!imageBase64 || String(imageBase64).length > 8000000) return createJsonResponse({ status: "error", message: "Bilden saknas eller är för stor." });
  const fileId = saveImageToDrive(imageBase64, "Fastighetsfoton", id + "_" + Date.now() + ".jpg");
  const fresh = findRowById(sheet, id);
  const photos = propertyFromRow(fresh.row).photos.map(ph => ph.id).concat([fileId]);
  sheet.getRange(fresh.rowNumber, 9).setValue(JSON.stringify(photos));
  return createJsonResponse({ status: "success", photo: { id: fileId, url: driveImageUrl(fileId) } });
}

function handleRemovePropertyPhoto(id, photoId) {
  const sheet = getPropertySheet();
  const hit = findRowById(sheet, id);
  if (!hit) return createJsonResponse({ status: "error", message: "Fastigheten hittades inte." });
  const photos = propertyFromRow(hit.row).photos.map(ph => ph.id).filter(pid => pid !== photoId);
  sheet.getRange(hit.rowNumber, 9).setValue(JSON.stringify(photos));
  try { DriveApp.getFileById(photoId).setTrashed(true); } catch (err) { /* redan borta */ }
  return createJsonResponse({ status: "success" });
}

// ==========================================
// 5. AI-TRANSFORMERING & AVATAR GENERERING
// ==========================================
function handleClayTransformation(eData) {
  var userBase64 = eData.imageBase64 || "";
  var resursTyp = eData.resursTyp || "byggare";
  var machineName = eData.machineName || "Entreprenadmaskin";
  var apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");

  if (!apiKey) {
    return createJsonResponse({
      status: "fallback",
      message: "GEMINI_API_KEY saknas i ScriptProperties.",
      clayAvatarBase64: userBase64
    });
  }

  var brandColorPrompt = getBrandColorPrompt(machineName);
  var promptText = "";

  if (resursTyp === "maskin") {
    promptText = "A friendly, vibrant 3D animated cartoon character portrait of a heavy construction machine matching a " + machineName + ", in the iconic stylized 3D aesthetic of Bob the Builder and modern animated movies. " +
                 "Crucial visual branding: " + brandColorPrompt + ". " +
                 "Give the machine a cheerful personality with expressive headlights, smooth 3D textures, metallic gloss, professional studio lighting, and a solid vibrant blue background.";
  } else if (resursTyp === "handskottare") {
    promptText = "Transform this person's portrait into a heroic, vibrant 3D animated comic book superhero portrait of a brave winter snow-shoveler. High quality stylized 3D render, modern animated movie aesthetic, wearing high-visibility reflective winter gear, glowing snow shovel on back, confident heroic expression, smooth textures, dramatic blizzard lighting, solid vibrant blue background. Keep recognizable facial features.";
  } else {
    promptText = "Transform this person's portrait into a friendly, vibrant 3D animated cartoon character portrait of a cheerful builder in the iconic style of Bob the Builder. High quality stylized 3D render, modern animated movie aesthetic, wearing a yellow safety hard hat, red and yellow checkered shirt, blue denim dungarees, utility tool belt, friendly smiling expression, smooth textures, soft studio lighting, solid vibrant blue background. Keep recognizable facial features.";
  }

  var parts = [];
  var rawBase64 = userBase64.replace(/^data:image\/\w+;base64,/, "");

  if (rawBase64.length > 100) {
    parts.push({ "inlineData": { "mimeType": "image/jpeg", "data": rawBase64 } });
  }
  parts.push({ "text": promptText });

  var modelName = "gemini-2.5-flash-image";
  var apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + apiKey;

  try {
    var response = UrlFetchApp.fetch(apiUrl, {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify({ "contents": [{ "parts": parts }] }),
      "muteHttpExceptions": true
    });

    var responseCode = response.getResponseCode();
    var jsonText = response.getContentText();
    var json;
    try { json = JSON.parse(jsonText); } catch(e) { json = {}; }

    var base64Bytes = null;
    if (json.candidates && json.candidates.length > 0 && json.candidates[0].content && json.candidates[0].content.parts) {
      var resParts = json.candidates[0].content.parts;
      for (var i = 0; i < resParts.length; i++) {
        if (resParts[i].inlineData && resParts[i].inlineData.data) {
          base64Bytes = resParts[i].inlineData.data;
          break;
        }
      }
    }

    if (responseCode === 200 && base64Bytes) {
      var finalImage = "data:image/jpeg;base64," + base64Bytes;

      saveAvatarToSheet(eData.resursId || machineName, finalImage);

      return createJsonResponse({ status: "success", clayAvatarBase64: finalImage });
    } else {
      return createJsonResponse({ status: "fallback", message: "AI HTTP " + responseCode, clayAvatarBase64: userBase64 });
    }
  } catch (err) {
    return createJsonResponse({ status: "fallback", message: err.toString(), clayAvatarBase64: userBase64 });
  }
}

function getBrandColorPrompt(machineName) {
  var name = String(machineName).toLowerCase();

  if (name.includes("kramer")) {
    return "authentic Kramer heavy machinery featuring a sleek dark grey and black chassis and loader arm, contrasted perfectly by its iconic signature light mint-green/turquoise rear engine hood and details";
  }

  if (name.includes("volvo")) return "classic Volvo bright construction yellow body with dark charcoal grey accents";
  if (name.includes("cat") || name.includes("caterpillar")) return "signature Caterpillar industrial yellow with thick black trim";
  if (name.includes("jcb")) return "vibrant JCB bright yellow with black industrial striping";
  if (name.includes("avant")) return "iconic Avant bright neon green chassis with black wheels and details";
  if (name.includes("bobcat")) return "classic Bobcat bright white body with iconic orange branding stripes and black accents";
  if (name.includes("ljungby")) return "distinctive Ljungby yellow chassis with subtle red and white trim details";
  if (name.includes("hitachi") || name.includes("kubota")) return "signature industrial orange body with black details";
  if (name.includes("john deere") || name.includes("deere")) return "iconic John Deere green body with bright yellow wheel rims and leaping deer details";
  if (name.includes("valtra")) return "glossy Valtra deep red body with black and silver details";
  if (name.includes("new holland")) return "New Holland bright blue body with white and grey accents";
  if (name.includes("massey")) return "Massey Ferguson classic red body with silver-grey trim";
  if (name.includes("fendt")) return "Fendt nature green body with red wheel rims";
  if (name.includes("weidemann") || name.includes("giant") || name.includes("schäffer")) return "compact loader in signature bright industrial colors with black counterweight";

  return "authentic industrial machinery colors matching the manufacturer";
}

function saveAvatarToSheet(resursId, base64Image) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_STAFF || "Personal");
  if (!sheet) return;
  if (base64Image.length > 50000) return; // Cellgräns i Sheets – AI-bilden får inte plats

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(resursId)) {
      sheet.getRange(i + 1, 6).setValue(base64Image); // Kolumn F (Avatar-Länk)
      break;
    }
  }
}

// ==========================================
// 6. BEFINTLIGA RAPPORTER OCH GODKÄNNANDEN
// ==========================================
function handleBatchReports(data) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_REPORTS || "Tidrapporter");
  const passList = data.pass || [];
  const tz = Session.getScriptTimeZone() || "Europe/Stockholm";
  const nowFormatted = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HH:mm:ss");

  passList.forEach(p => {
    let activityLabel = sanitize(p.activity || "Övrigt");
    if (p.type === "ata") activityLabel = "[" + (sanitize(p.ataNumber) || "ÄTA") + "] " + activityLabel;
    let finalNotes = sanitize(p.notes) || "";

    const allImages = [...(p.images || [])];
    if (p.snowMapImage) allImages.push(p.snowMapImage);

    if (allImages.length > 0 && CONFIG.FOLDER_ID_ROOT_IMAGES) {
      try {
        const rootFolder = DriveApp.getFolderById(CONFIG.FOLDER_ID_ROOT_IMAGES);
        let folderName = p.date + " " + sanitize(p.place || "Okänd plats") + " (" + activityLabel + ")";
        const subFolder = rootFolder.createFolder(folderName);

        allImages.forEach((imgBase64, index) => {
          const base64Data = imgBase64.replace(/^data:image\/\w+;base64,/, "");
          const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/jpeg', 'Underlag_' + (index + 1) + '.jpg');
          subFolder.createFile(blob);
        });
        finalNotes += (finalNotes ? "\n\n" : "") + "Drive-mapp: " + subFolder.getUrl();
      } catch (imgErr) {
        finalNotes += (finalNotes ? "\n\n" : "") + "[Drive-fel: " + imgErr.message + "]";
      }
    }

    const formattedDuration = formatDuration(p.start, p.end, p.totalHours);

    sheet.appendRow([
      p.date,
      "Nej",
      sanitize(p.place) || "",
      activityLabel,
      p.start || "",
      p.end || "",
      formattedDuration,
      nowFormatted,
      sanitize(p.user || "Okänd"),
      finalNotes,
      sanitize(p.companyId) || "LPV",
      sanitize(p.measuredArea) || ""
    ]);
  });

  return createJsonResponse({ status: "success", count: passList.length });
}

function handleGetUsers() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const personalSheet = ss.getSheetByName(CONFIG.SHEET_STAFF || "Personal");
  const sheetData = personalSheet.getDataRange().getValues();
  const users = [];

  for (let i = 1; i < sheetData.length; i++) {
    if (sheetData[i][0] !== "") {
      users.push({
        id: String(sheetData[i][0]),
        name: String(sheetData[i][0]),
        email: String(sheetData[i][1]),
        phone: String(sheetData[i][2]),
        type: String(sheetData[i][3]),
        isAdmin: String(sheetData[i][4]).toLowerCase() === "true",
        avatarBase64: String(sheetData[i][5]),
        ownerCompany: String(sheetData[i][6]),
        status: String(sheetData[i][7])
      });
    }
  }
  return createJsonResponse({ status: "success", users: users });
}

function approveAta(ataId) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = getSheetOrCreate(ss, "ÄTA_Godkännanden", ["ÄTA_ID", "Status", "Datum"]);
  sheet.appendRow([ataId, "GODKÄND_AV_KUND", new Date()]);
  return createJsonResponse({ success: true, ataId: ataId });
}

function approveOffert(offertId) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = getSheetOrCreate(ss, "Offert_Godkännanden", ["Offert_ID", "Status", "Datum"]);
  sheet.appendRow([offertId, "GODKÄND_AV_KUND", new Date()]);

  var planSheet = getSheetOrCreate(ss, "Gantt_Jobb", ["Projekt-ID", "Kundnamn", "Fakturerande Bolag", "Titel", "Status", "Startdag-Index", "Timmar", "Skift", "Sitelokalization", "Site-Kontakt", "Site-Telefon", "Bemannade Resurs-IDn"]);
  planSheet.appendRow(["J-" + Math.floor(Math.random()*1000), "Kund-" + offertId, "LPV", "Ny Offert", "unscheduled", "", 8, "Dagpass", "", "", "", "[]"]);

  return createJsonResponse({ success: true, offertId: offertId });
}

function handleSaveTimeReport(eData) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_REPORTS || "Tidrapporter");
  sheet.appendRow([new Date(), "Nej", "Fält", eData.aktivitet || "Arbete", eData.starttid || "", eData.sluttid || "", eData.totaltid || "0 tim 0 min", new Date(), eData.anvandare || "Okänd", eData.note || "", "LPV", ""]);
  return createJsonResponse({ status: "success", message: "Tidrapport sparad." });
}

function handleSaveAta(eData) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = getSheetOrCreate(ss, "ÄTA", ["Datum", "Användare", "Titel", "Kostnad"]);
  sheet.appendRow([new Date(), eData.user || "Okänd", eData.title || "", eData.cost || 0]);
  return createJsonResponse({ status: "success", message: "ÄTA sparad." });
}

// ==========================================
// 7. HJÄLPFUNKTIONER & MIGRERING
// ==========================================
function formatDuration(start, end, fallbackHours) {
  if (!start || !end) return fallbackHours ? fallbackHours + " tim 0 min" : "0 tim 0 min";
  const [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);
  let diffMin = (eH * 60 + eM) - (sH * 60 + sM);
  if (diffMin < 0) diffMin += 24 * 60;
  return Math.floor(diffMin / 60) + " tim " + (diffMin % 60) + " min";
}

function getSheetOrCreate(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
    }
  }
  return sheet;
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function migrateDatabase() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  const sheetKunder = ss.getSheetByName("Kunder");
  if (sheetKunder) {
    const lastCol = sheetKunder.getLastColumn();
    const headers = sheetKunder.getRange(1, 1, 1, lastCol).getValues()[0];
    const newKunderHeaders = ["Kundtyp", "ROT/RUT", "Fastighetsbeteckning", "Logo-URL"];
    newKunderHeaders.forEach(colName => {
      if (!headers.includes(colName)) {
        sheetKunder.getRange(1, sheetKunder.getLastColumn() + 1).setValue(colName).setFontWeight("bold").setBackground("#f3f3f3");
        headers.push(colName);
      }
    });
  }

  const sheetTid = ss.getSheetByName(CONFIG.SHEET_REPORTS || "Tidrapporter");
  if (sheetTid) {
    const lastCol = sheetTid.getLastColumn();
    const headers = sheetTid.getRange(1, 1, 1, lastCol).getValues()[0];
    const newTidHeaders = ["Fakturerande Bolag", "Uppmätt Yta (m2)"];
    newTidHeaders.forEach(colName => {
      if (!headers.includes(colName)) {
        sheetTid.getRange(1, sheetTid.getLastColumn() + 1).setValue(colName).setFontWeight("bold").setBackground("#f3f3f3");
        headers.push(colName);
      }
    });
  }

  let sheetGantt = ss.getSheetByName("Gantt_Jobb");
  if (!sheetGantt) {
    sheetGantt = ss.insertSheet("Gantt_Jobb");
    const ganttHeaders = ["Projekt-ID", "Kundnamn", "Fakturerande Bolag", "Titel", "Status", "Startdag-Index", "Timmar", "Skift", "Sitelokalization", "Site-Kontakt", "Site-Telefon", "Bemannade Resurs-IDn"];
    sheetGantt.appendRow(ganttHeaders);
    sheetGantt.getRange(1, 1, 1, ganttHeaders.length).setFontWeight("bold").setBackground("#f3f3f3");
  }

  SpreadsheetApp.getUi().alert("✅ Databasmigrering Klar!");
}
