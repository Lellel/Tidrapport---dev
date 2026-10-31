/**
 * LPV & KLARYTA - BACKEND MOTOR (Kod.gs)
 * Version: DEV v4.7.5 (Kramer Turkos Hood Update, Gemini 3D Auto-Save, Gantt v33)
 */

// ==========================================
// 1. SANERING & SÄKERHET
// ==========================================

// Kalkylarket öppnas en gång per anrop (openById tar tid och anropades förut många gånger per anrop)
let _ss = null;
function getSS() {
  if (!_ss) _ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  return _ss;
}
function sanitize(input) {
  if (!input) return "";
  let str = String(input).trim();
  if (/^[=+\-@]/.test(str)) return "'" + str; // Skydd mot Formula Injection
  return str;
}

// ==========================================
// GODKÄNN BEHÖRIGHETER – kör EN gång från editorn efter att ny kod klistrats in:
// välj "godkannBehorigheter" i listan överst och tryck ▶ Kör. Google frågar då om
// alla behörigheter som koden behöver (kalkylark, Drive, e-post, externa anrop).
// Resultatet syns i Körningsloggen längst ner.
// ==========================================
function godkannBehorigheter() {
  const rad = (ok, text) => Logger.log((ok ? "✅ " : "❌ ") + text);
  try { rad(true, "Kalkylark: " + getSS().getName()); } catch (e) { rad(false, "Kalkylark: " + e.message); }
  try { rad(true, "Drive: bildmappen " + DriveApp.getFolderById(CONFIG.FOLDER_ID_ROOT_IMAGES).getName()); } catch (e) { rad(false, "Drive/bildmapp (FOLDER_ID_ROOT_IMAGES): " + e.message); }
  try { rad(true, "E-post: " + MailApp.getRemainingDailyQuota() + " mejl kvar idag"); } catch (e) { rad(false, "E-post: " + e.message); }
  try { rad(true, "Ditt konto: " + Session.getEffectiveUser().getEmail()); } catch (e) { rad(false, "Konto: " + e.message); }
  try { const g = geocodeAddress("Drottninggatan 1", "Flen"); rad(!!g, "Kartsökning: " + (g ? g.ort + " " + g.lat.toFixed(3) + ", " + g.lng.toFixed(3) : "hittade inget")); } catch (e) { rad(false, "Kartsökning: " + e.message); }
  try { UrlFetchApp.fetch("https://generativelanguage.googleapis.com/", { muteHttpExceptions: true }); rad(true, "Externa anrop (AI) tillåtna"); } catch (e) { rad(false, "Externa anrop: " + e.message); }
  const key = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  rad(!!key, key ? "GEMINI_API_KEY finns (AI-kulor och kulörförslag)" : "GEMINI_API_KEY saknas – lägg in den under Projektinställningar → Skriptegenskaper");
  const props = PropertiesService.getScriptProperties();
  const elksUser = props.getProperty("ELKS_USER"), elksPassword = props.getProperty("ELKS_PASSWORD");
  if (!elksUser || !elksPassword) {
    Logger.log("ℹ️ SMS via 46elks är inte inställt (ELKS_USER/ELKS_PASSWORD saknas) – appen öppnar Meddelanden i stället");
  } else {
    try {
      const me = UrlFetchApp.fetch("https://api.46elks.com/a1/me", { muteHttpExceptions: true,
        headers: { Authorization: "Basic " + Utilities.base64Encode(elksUser + ":" + elksPassword) } });
      const info = me.getResponseCode() === 200 ? JSON.parse(me.getContentText()) : null;
      rad(!!info, info ? "46elks: inloggad" + (info.balance !== undefined ? ", saldo ca " + Math.round(info.balance / 10000) + " kr" : "")
        : "46elks: fel användarnamn eller lösenord (HTTP " + me.getResponseCode() + ")");
    } catch (e) { rad(false, "46elks: " + e.message); }
  }
  Logger.log("Klart. Ladda upp ny kod med ./ladda-upp-kod.sh – den skapar även ny version av webbappen.");
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

// Anrop som bara läser behöver inte köa bakom varandra. Bara det som skriver låses,
// så att tio förare som skickar pass samtidigt kl 05 inte väntar på admin som läser kartan.
// generateTractorAvatar låses inte heller: AI:n tar 10-30 s och skriver bara en cell på slutet.
const NO_LOCK_ACTIONS = ["ping", "getUsers", "getSnowZones", "getFleet", "getProperties", "getKabanossData",
  "getJobs", "signDocument", "generateTractorAvatar", "getOffers", "getOfferSettings",
  "getOfferForCustomer", "respondOffer", "geocode", "recolorHouse", "getInvoiceBasis", "invoicePdf"]; // getOfferForCustomer/respondOffer låser själva när de skriver

function doPost(e) {
  let lock = null;
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

    if (NO_LOCK_ACTIONS.indexOf(data.action) === -1) {
      lock = LockService.getScriptLock();
      if (!lock.tryLock(15000)) {
        lock = null;
        return createJsonResponse({ status: "error", message: "Servern var upptagen, försök igen." });
      }
    }

    const action = data.action;

    // --- ÖPPNA ÅTGÄRDER (kräver ingen inloggning) ---
    if (action === "ping") {
      return createJsonResponse({ status: "success", version: "v4.7.5", message: "Ansluten till Kod.gs" });
    }
    // Kundens offert/ÄTA: skyddas av en signerad kod i länken i stället för nyckel
    if (action === "getOfferForCustomer") return handleGetOfferForCustomer(data);
    if (action === "respondOffer") return handleRespondOffer(data);

    // --- INLOGGNING: personlig nyckel (eller gamla gemensamma nyckeln under övergången) ---
    const auth = authenticate(data);
    if (!auth) {
      return createJsonResponse({ status: "error", message: "Åtkomst nekad: Ogiltig inloggning. Be om en ny inloggningslänk." });
    }
    const adminOnly = ["getUsers", "getUserKey", "signDocument", "geocode", "recolorHouse", "getOffers", "saveOffer", "sendOffer", "cancelOffer",
      "getOfferSettings", "saveOfferSettings", "saveSnowZone", "deleteSnowZone", "setSlingaDrivers",
      "getFleet", "saveTractor", "deleteTractor", "generateTractorAvatar",
      "getProperties", "saveProperty", "deleteProperty", "addPropertyPhoto", "removePropertyPhoto", "sendSms"];
    if (adminOnly.indexOf(action) !== -1 && !auth.isAdmin) {
      return createJsonResponse({ status: "error", message: "Åtkomst nekad: Kräver administratör." });
    }
    const economyOnly = ["getInvoiceBasis", "markInvoiced", "invoicePdf"];
    if (economyOnly.indexOf(action) !== -1 && !auth.isAdmin && !auth.isEconomist) {
      return createJsonResponse({ status: "error", message: "Åtkomst nekad: Kräver ekonom eller administratör." });
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
    if (action === "getOffers") return handleGetOffers();
    if (action === "recolorHouse") return handleRecolorHouse(data);
    if (action === "geocode") {
      const geo = geocodeAddress(String(data.address || "").slice(0, 200), "");
      return createJsonResponse(geo ? { status: "success", lat: geo.lat, lng: geo.lng } : { status: "error", message: "Hittade inte adressen." });
    }
    if (action === "saveOffer") return handleSaveOffer(data.offer, auth.user);
    if (action === "sendOffer") return handleSendOffer(data.id, data.appUrl, data.drawingPng);
    if (action === "cancelOffer") return handleCancelOffer(data.id);
    if (action === "getOfferSettings") return createJsonResponse({ status: "success", settings: getOfferSettings() });
    if (action === "saveOfferSettings") return handleSaveOfferSettings(data.settings);
    if (action === "getFleet") return handleGetFleet();
    if (action === "saveTractor") return handleSaveTractor(data.tractor);
    if (action === "deleteTractor") return handleDeleteById(getFleetSheet(), data.id);
    if (action === "generateTractorAvatar") return handleGenerateTractorAvatar(data.id);
    if (action === "getProperties") return handleGetProperties();
    if (action === "saveProperty") return handleSaveProperty(data.property);
    if (action === "deleteProperty") return handleDeleteById(getPropertySheet(), data.id);
    if (action === "addPropertyPhoto") return handleAddPropertyPhoto(data.id, data.imageBase64);
    if (action === "removePropertyPhoto") return handleRemovePropertyPhoto(data.id, data.photoId);
    if (action === "saveSnowZone") return handleSaveSnowZone(data.zone, auth.user);
    if (action === "deleteSnowZone") return handleDeleteSnowZone(data.zoneId);
    if (action === "getInvoiceBasis") return handleGetInvoiceBasis();
    if (action === "markInvoiced") return handleMarkInvoiced(data, auth.user);
    if (action === "invoicePdf") return handleInvoicePdf(data.draft);
    if (action === "sendSms") return handleSendSms(data, auth.user);

    return createJsonResponse({ status: "unknown_action", message: "Okänd action: " + action });

  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  } finally {
    if (lock) lock.releaseLock();
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
  const ss = getSS();
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

// "Ekonom" i kolumn E: ser fakturaunderlaget men inga admin-verktyg
function isEconomistRow(row) {
  return String(row[4] || "").trim().toLowerCase() === "ekonom";
}

// Inloggningsuppgifter sparas 5 min i Apps Scripts cache så att inte hela Personal-fliken
// (med profilbilder) läses vid varje anrop. "Spärra & skapa ny länk" tömmer cachen direkt;
// ändras Admin/Karantän för hand i arket slår det igenom inom 5 minuter.
const AUTH_CACHE_SECONDS = 300;

function readStaffAuth(name) {
  const cache = CacheService.getScriptCache();
  const cacheKey = "auth:" + String(name).trim();
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);
  const sheet = getStaffSheet();
  const hit = sheet ? findStaffRow(sheet, name) : null;
  if (!hit) return null;
  const info = {
    user: String(hit.row[0]),
    key: String(hit.row[KEY_COLUMN - 1] || ""),
    isAdmin: isAdminRow(hit.row),
    isEconomist: isEconomistRow(hit.row),
    quarantined: String(hit.row[7] || "").toLowerCase() === "karantän"
  };
  cache.put(cacheKey, JSON.stringify(info), AUTH_CACHE_SECONDS);
  return info;
}

function clearStaffAuthCache(name) {
  CacheService.getScriptCache().remove("auth:" + String(name).trim());
}

function authenticate(data) {
  if (data.user && data.key) {
    const info = readStaffAuth(data.user);
    if (info && info.key && info.key === String(data.key) && !info.quarantined) {
      return { user: info.user, isAdmin: info.isAdmin, isEconomist: !!info.isEconomist, legacy: false };
    }
    return null;
  }
  // Övergång: gamla gemensamma nyckeln. Ta bort API_TOKEN ur Config.gs för att stänga av.
  const legacyToken = (typeof CONFIG !== "undefined" && CONFIG.API_TOKEN) || "";
  if (legacyToken && data.token === legacyToken) {
    const info = data.user ? readStaffAuth(data.user) : null;
    return { user: String(data.user || "Okänd"), isAdmin: !!(info && info.isAdmin), isEconomist: !!(info && info.isEconomist), legacy: true };
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
    clearStaffAuthCache(hit.row[0]);
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
  const ss = getSS();

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
  const ss = getSS();
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
  const ss = getSS();
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
  return getSheetOrCreate(getSS(), "Snözoner", SNOW_HEADERS);
}

// Fliken "Slingor": vilka förare som är tilldelade varje slinga (admin bestämmer)
const SLINGA_HEADERS = ["Slinga", "Förare (kommaseparerade)", "Uppdaterad av", "Uppdaterad"];

function getSlingaSheet() {
  return getSheetOrCreate(getSS(), "Slingor", SLINGA_HEADERS);
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

function getFleetSheet() { return getSheetOrCreate(getSS(), "Traktorer", FLEET_HEADERS); }
function getPropertySheet() { return getSheetOrCreate(getSS(), "Fastigheter", PROPERTY_HEADERS); }

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
// 4d. OFFERTER & ÄTA (en gemensam flik, typ "offert" eller "ata")
// Flöde: utkast -> skickad (PDF + länk) -> öppnad -> godkänd/avböjd.
// Ändras en skickad offert höjs versionen; gamla länken slutar gälla och
// en ny PDF + länk skickas. Totalsummor räknas alltid här i backend.
// ==========================================
const OFFER_HEADERS = ["Offert-ID", "Typ", "Version", "Status", "Kundnamn", "Kundtyp", "Telefon", "E-post", "Arbetsplats",
  "Titel", "Beskrivning", "Rader (JSON)", "Avdrag (rot/rut/inget)", "Antal personer avdrag", "Giltig till",
  "Att betala (kr)", "Skapad", "Skapad av", "Skickad", "Öppnad", "Besvarad", "Godkänd av", "Kundens kommentar", "PDF (Drive-ID)", "Jobb-ID",
  "Karta (JSON)", "Kulörförslag (JSON)", "Vald kulör", "Fasadmått (JSON)"];
const OFFER_STATUSES = ["utkast", "skickad", "öppnad", "godkänd", "avböjd", "makulerad"];

const DEFAULT_OFFER_SETTINGS = {
  companyName: "LPV", companyOrgNr: "", companyPhone: "", companyEmail: "", companyAddress: "",
  hourlyWork: 650, hourlyMachine: 850, travelPerHour: 450,
  vatPercent: 25, rotPercent: 30, rutPercent: 50, rotCapPerPerson: 50000, rutCapPerPerson: 75000,
  validDays: 30,
  invoiceDueDays: 30, companyBankgiro: "", companyFTax: "Godkänd för F-skatt",
  lineMeterPrice: 48, lineSymbolPrice: 550, lineEstablishment: 3500,
  facadeM2PerHour: 4, facadeM2PerLiter: 6, facadeCoats: 2, facadePaintPerLiter: 220,
  // En kulör per rad: Namn | NCS-kod | #skärmfärg (ungefärlig). Byt gärna mot era Alcro-kulörer.
  facadeColors: "Klassisk röd (falurött) | S 5040-Y80R | #8b2e23\nVit | S 0502-Y | #f2f0e8\nBrutet vit | S 1005-Y20R | #e8dfcd\nLjusgrå | S 2002-Y | #cfcdc5\nMellangrå | S 4502-Y | #9a9890\nMörkgrå | S 7502-B | #4f5154\nSvart | S 8502-Y | #2c2b28\nGammal gul | S 1030-Y10R | #e9cf8f\nOckra | S 3040-Y20R | #b8873e\nLjusgrön | S 2010-G30Y | #b9c4a3\nMörkgrön | S 6020-G10Y | #4e5e43\nBlågrå | S 3010-R90B | #8e9ba6",
  terms: "Priser i SEK. Arbete utförs i samråd med kund. Avdrag (ROT/RUT) förutsätter att Skatteverket godkänner det; nekas avdraget betalar kunden mellanskillnaden."
};

function getSettingsSheet() { return getSheetOrCreate(getSS(), "Inställningar", ["Nyckel", "Värde", "Beskrivning"]); }

function getOfferSettings() {
  const settings = JSON.parse(JSON.stringify(DEFAULT_OFFER_SETTINGS));
  const rows = getSettingsSheet().getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const key = String(rows[i][0] || "");
    if (!(key in settings)) continue;
    settings[key] = typeof DEFAULT_OFFER_SETTINGS[key] === "number" ? Number(rows[i][1]) || 0 : String(rows[i][1] || "");
  }
  return settings;
}

function handleSaveOfferSettings(input) {
  if (!input) return createJsonResponse({ status: "error", message: "Inga inställningar skickades." });
  const sheet = getSettingsSheet();
  const rows = sheet.getDataRange().getValues();
  Object.keys(DEFAULT_OFFER_SETTINGS).forEach(key => {
    if (!(key in input)) return;
    const value = typeof DEFAULT_OFFER_SETTINGS[key] === "number" ? (Number(input[key]) || 0) : sanitize(input[key]);
    let rowNumber = -1;
    for (let i = 1; i < rows.length; i++) if (String(rows[i][0]) === key) { rowNumber = i + 1; break; }
    if (rowNumber > 0) sheet.getRange(rowNumber, 2).setValue(value);
    else { sheet.appendRow([key, value, ""]); rows.push([key, value, ""]); }
  });
  return createJsonResponse({ status: "success", settings: getOfferSettings() });
}

function getOfferSheet() { return getSheetOrCreate(getSS(), "Offerter", OFFER_HEADERS); }

function cleanOfferRows(rows) {
  return (Array.isArray(rows) ? rows : []).slice(0, 100).map(r => ({
    text: sanitize(r.text).slice(0, 200),
    kind: ["arbete", "maskin", "material", "resa", "ovrigt"].indexOf(r.kind) !== -1 ? r.kind : "ovrigt",
    qty: Math.round((Number(r.qty) || 0) * 100) / 100,
    unit: sanitize(r.unit).slice(0, 10) || "st",
    price: Math.round((Number(r.price) || 0) * 100) / 100,
    deductible: r.deductible === true
  })).filter(r => r.text || r.qty || r.price);
}

// Alla belopp räknas här: exkl. moms, moms, avdrag (bara på avdragsgrundande rader, inkl. moms) och att betala
function computeOfferTotals(offer, settings) {
  const vat = settings.vatPercent / 100;
  let net = 0, deductibleNet = 0;
  offer.rows.forEach(r => {
    const sum = r.qty * r.price;
    net += sum;
    if (r.deductible) deductibleNet += sum;
  });
  const vatAmount = net * vat;
  const gross = net + vatAmount;
  let deduction = 0, deductionLabel = "";
  if (offer.customerType === "privat" && (offer.deduction === "rot" || offer.deduction === "rut")) {
    const rate = (offer.deduction === "rot" ? settings.rotPercent : settings.rutPercent) / 100;
    const cap = (offer.deduction === "rot" ? settings.rotCapPerPerson : settings.rutCapPerPerson) * Math.max(1, offer.deductionPersons || 1);
    deduction = Math.min(deductibleNet * (1 + vat) * rate, cap);
    deductionLabel = (offer.deduction === "rot" ? "ROT" : "RUT") + "-avdrag " + (offer.deduction === "rot" ? settings.rotPercent : settings.rutPercent) + " %";
  }
  const round = v => Math.round(v);
  return { net: round(net), vat: round(vatAmount), gross: round(gross), deductibleNet: round(deductibleNet),
           deduction: round(deduction), deductionLabel: deductionLabel, toPay: round(gross - deduction) };
}

function offerFromRow(row) {
  let rows = [];
  try { rows = JSON.parse(row[11] || "[]"); } catch (e) { rows = []; }
  const fmt = v => v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone() || "Europe/Stockholm", "yyyy-MM-dd HH:mm") : String(v || "");
  return {
    id: String(row[0]), type: String(row[1] || "offert"), version: Number(row[2]) || 1, status: String(row[3] || "utkast"),
    customerName: String(row[4] || ""), customerType: String(row[5] || "privat"), phone: String(row[6] || ""), email: String(row[7] || ""),
    site: String(row[8] || ""), title: String(row[9] || ""), description: String(row[10] || ""), rows: rows,
    deduction: String(row[12] || "inget"), deductionPersons: Number(row[13]) || 1,
    validUntil: fmt(row[14]).slice(0, 10), toPay: Number(row[15]) || 0,
    created: fmt(row[16]), createdBy: String(row[17] || ""), sent: fmt(row[18]), opened: fmt(row[19]), answered: fmt(row[20]),
    approvedBy: String(row[21] || ""), customerComment: String(row[22] || ""), pdfId: String(row[23] || ""), jobId: String(row[24] || ""),
    layout: parseLayout(row[25]),
    colorOptions: parseColorOptions(row[26]),
    chosenColor: String(row[27] || ""),
    facade: parseFacade(row[28])
  };
}

// Kulörförslag: bild (Drive-ID) + före-bild + huvud-/detaljfärg. Bara säkra värden sparas.
function cleanColorOptions(list) {
  const id = v => /^[A-Za-z0-9_-]{10,100}$/.test(String(v || "")) ? String(v) : "";
  const color = c => c ? { name: sanitize(c.name).slice(0, 60), ncs: sanitize(c.ncs).slice(0, 30), hex: /^#[0-9a-fA-F]{6}$/.test(String(c.hex || "")) ? c.hex : "" } : null;
  return (Array.isArray(list) ? list : []).slice(0, 12).map(o => ({
    imageId: id(o.imageId), beforeId: id(o.beforeId), main: color(o.main), detail: color(o.detail), windows: color(o.windows), label: sanitize(o.label).slice(0, 120),
    building: sanitize(o.building).slice(0, 60)
  })).filter(o => o.imageId);
}

// Fasadmått per huskropp (bostadshus, garage …) så att mallen kan öppnas och justeras igen
function cleanFacade(input) {
  if (!input || !Array.isArray(input.buildings)) return null;
  const num = (v, max) => { const n = Number(v); return isFinite(n) ? Math.min(max, Math.max(0, n)) : 0; };
  const buildings = input.buildings.slice(0, 10).map(b => ({
    name: sanitize(b.name).slice(0, 60) || "Huskropp",
    walls: (Array.isArray(b.walls) ? b.walls : []).slice(0, 30).map(w => ({
      name: sanitize(w.name).slice(0, 40), width: num(w.width, 200), height: num(w.height, 50), peak: num(w.peak, 30), sub: num(w.sub, 500)
    }))
  }));
  return buildings.length ? { buildings: buildings } : null;
}

function parseFacade(cell) {
  if (!cell) return null;
  try { return cleanFacade(JSON.parse(cell)); } catch (e) { return null; }
}

function parseColorOptions(cell) {
  if (!cell) return [];
  try { return cleanColorOptions(JSON.parse(cell)); } catch (e) { return []; }
}

// Ritning av p-rutor (linjemålning). Bara siffror sparas, allt valideras.
function cleanLayout(input) {
  if (!input || !Array.isArray(input.sections)) return null;
  const num = (v, min, max, def) => { const n = Number(v); return isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
  const sections = input.sections.slice(0, 30).map(sec => {
    const hasAnchor = Array.isArray(sec.anchor) && sec.anchor.length === 2 && isFinite(sec.anchor[0]) && isFinite(sec.anchor[1]) &&
      Math.abs(sec.anchor[0]) <= 90 && Math.abs(sec.anchor[1]) <= 180;
    return {
      anchor: hasAnchor ? [Number(Number(sec.anchor[0]).toFixed(7)), Number(Number(sec.anchor[1]).toFixed(7))] : null,
      rotation: Math.round(num(sec.rotation, 0, 359, 0)),
      count: Math.round(num(sec.count, 0, 200, 0)),
      width: num(sec.width, 1, 10, 2.5), depth: num(sec.depth, 1, 15, 5),
      back: sec.back === true, double: sec.double === true
    };
  });
  return sections.length ? { sections: sections, symbols: Math.round(num(input.symbols, 0, 500, 0)) } : null;
}

function parseLayout(cell) {
  if (!cell) return null;
  try { return cleanLayout(JSON.parse(cell)); } catch (e) { return null; }
}

function offerToRow(o) {
  return [o.id, o.type, o.version, o.status, o.customerName, o.customerType, o.phone, o.email, o.site, o.title, o.description,
    JSON.stringify(o.rows), o.deduction, o.deductionPersons, o.validUntil, o.toPay, o.created, o.createdBy, o.sent, o.opened,
    o.answered, o.approvedBy, o.customerComment, o.pdfId, o.jobId, o.layout ? JSON.stringify(o.layout) : "",
    o.colorOptions && o.colorOptions.length ? JSON.stringify(o.colorOptions) : "", o.chosenColor || "", o.facade ? JSON.stringify(o.facade) : ""];
}

function nextOfferId(type) {
  const year = new Date().getFullYear();
  const prefix = (type === "ata" ? "Ä" : "O") + "-" + year + "-";
  const rows = getOfferSheet().getDataRange().getValues();
  let max = 0;
  for (let i = 1; i < rows.length; i++) {
    const id = String(rows[i][0]);
    if (id.indexOf(prefix) === 0) max = Math.max(max, Number(id.slice(prefix.length)) || 0);
  }
  return prefix + String(max + 1).padStart(3, "0");
}

function addDays(days) {
  const d = new Date(); d.setDate(d.getDate() + days);
  return Utilities.formatDate(d, Session.getScriptTimeZone() || "Europe/Stockholm", "yyyy-MM-dd");
}

function handleGetOffers() {
  const settings = getOfferSettings();
  const rows = getOfferSheet().getDataRange().getValues();
  const offers = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    const o = offerFromRow(rows[i]);
    o.totals = computeOfferTotals(o, settings);
    o.pdfUrl = o.pdfId ? "https://drive.google.com/file/d/" + o.pdfId + "/view" : "";
    offers.push(o);
  }
  return createJsonResponse({ status: "success", offers: offers.reverse(), settings: settings });
}

// Innehållet som kunden ser – ändras det på en skickad offert blir det en ny version
function offerContentKey(o) {
  return JSON.stringify([o.customerName, o.customerType, o.site, o.title, o.description, o.rows, o.deduction, o.deductionPersons, o.validUntil, o.layout || null, o.colorOptions || [], o.facade || null]);
}

function handleSaveOffer(input, savedBy) {
  if (!input) return createJsonResponse({ status: "error", message: "Ingen offert skickades." });
  const settings = getOfferSettings();
  const sheet = getOfferSheet();
  const existing = input.id ? findRowById(sheet, input.id) : null;
  const old = existing ? offerFromRow(existing.row) : null;
  if (old && (old.status === "godkänd" || old.status === "makulerad")) {
    return createJsonResponse({ status: "error", message: "Offerten är " + old.status + " och kan inte ändras. Gör en ny." });
  }
  const type = old ? old.type : (input.type === "ata" ? "ata" : "offert");
  const offer = {
    id: old ? old.id : nextOfferId(type), type: type,
    version: old ? old.version : 1, status: old ? old.status : "utkast",
    customerName: sanitize(input.customerName), customerType: input.customerType === "foretag" ? "foretag" : "privat",
    phone: sanitize(input.phone), email: sanitize(input.email).replace(/^'/, ""), site: sanitize(input.site),
    title: sanitize(input.title), description: sanitize(input.description).slice(0, 2000),
    rows: cleanOfferRows(input.rows),
    deduction: ["rot", "rut"].indexOf(input.deduction) !== -1 ? input.deduction : "inget",
    deductionPersons: Math.min(4, Math.max(1, Number(input.deductionPersons) || 1)),
    validUntil: /^\d{4}-\d{2}-\d{2}$/.test(String(input.validUntil || "")) ? input.validUntil : addDays(settings.validDays),
    created: old ? old.created : nowStamp(), createdBy: old ? old.createdBy : sanitize(savedBy),
    sent: old ? old.sent : "", opened: old ? old.opened : "", answered: old ? old.answered : "",
    approvedBy: old ? old.approvedBy : "", customerComment: old ? old.customerComment : "", pdfId: old ? old.pdfId : "", jobId: old ? old.jobId : "",
    layout: cleanLayout(input.layout),
    colorOptions: cleanColorOptions(input.colorOptions),
    chosenColor: old ? old.chosenColor : "",
    facade: cleanFacade(input.facade)
  };
  if (!offer.customerName) return createJsonResponse({ status: "error", message: "Ange kundens namn." });
  if (!offer.rows.length) return createJsonResponse({ status: "error", message: "Lägg till minst en rad." });

  // Ändrad efter att den skickats: ny version, gamla länken slutar gälla, ska skickas om
  let changedAfterSend = false;
  if (old && old.status !== "utkast" && offerContentKey(old) !== offerContentKey(offer)) {
    offer.version = old.version + 1;
    offer.status = "utkast";
    offer.opened = ""; offer.answered = ""; offer.customerComment = ""; offer.chosenColor = "";
    changedAfterSend = true;
  }
  offer.toPay = computeOfferTotals(offer, settings).toPay;
  upsertById(sheet, offerToRow(offer));
  offer.totals = computeOfferTotals(offer, settings);
  return createJsonResponse({ status: "success", offer: offer, changedAfterSend: changedAfterSend });
}

function handleCancelOffer(id) {
  const sheet = getOfferSheet();
  const hit = findRowById(sheet, id);
  if (!hit) return createJsonResponse({ status: "error", message: "Offerten hittades inte." });
  const o = offerFromRow(hit.row);
  if (o.status === "godkänd") return createJsonResponse({ status: "error", message: "En godkänd offert kan inte makuleras här." });
  o.status = "makulerad";
  upsertById(sheet, offerToRow(o));
  return createJsonResponse({ status: "success" });
}

function offerLinkCode(o) { return signDocument(o.type, o.id + ":v" + o.version); }

// Egen formatering: Apps Script stödjer inte svensk sifferformatering pålitligt. Hårt mellanslag så att beloppet inte bryts.
function moneySv(v) { return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") + "\u00a0kr"; }

function escapeHtml(text) {
  return String(text == null ? "" : text).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// PDF byggs från HTML i Apps Script och sparas i Drive-mappen "Offerter"
function buildOfferPdf(o, settings, drawing) {
  const t = computeOfferTotals(o, settings);
  const label = o.type === "ata" ? "ÄTA – tilläggsarbete" : "Offert";
  let logo = "";
  try {
    if (CONFIG.FILE_ID_LOGO) {
      const blob = DriveApp.getFileById(CONFIG.FILE_ID_LOGO).getBlob();
      logo = '<img src="data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes()) + '" style="height:60px;">';
    }
  } catch (e) { logo = ""; }
  const rowsHtml = o.rows.map(r => "<tr><td>" + escapeHtml(r.text) + (r.deductible && o.deduction !== "inget" && o.customerType === "privat" ? " *" : "") +
    "</td><td style='text-align:right'>" + r.qty + " " + escapeHtml(r.unit) + "</td><td style='text-align:right'>" + moneySv(r.price) +
    "</td><td style='text-align:right'>" + moneySv(r.qty * r.price) + "</td></tr>").join("");
  const html = '<html><head><meta charset="utf-8"><style>' +
    'body{font-family:Arial,sans-serif;font-size:11pt;color:#0f172a;margin:30px;} h1{font-size:20pt;margin:0;color:#0369a1;}' +
    'table{width:100%;border-collapse:collapse;margin-top:14px;} th{background:#f1f5f9;text-align:left;padding:6px;font-size:10pt;} td{padding:6px;border-bottom:1px solid #e2e8f0;font-size:10pt;}' +
    '.tot td{border:none;padding:3px 6px;} .big{font-size:14pt;font-weight:bold;color:#0369a1;} .muted{color:#64748b;font-size:9pt;}</style></head><body>' +
    '<table style="margin:0"><tr><td style="border:none;padding:0">' + logo + '<h1>' + label + '</h1><div class="muted">' + escapeHtml(o.id) + (o.version > 1 ? " · version " + o.version : "") + '</div></td>' +
    '<td style="border:none;padding:0;text-align:right" class="muted"><b>' + escapeHtml(settings.companyName) + '</b><br>' + escapeHtml(settings.companyAddress) +
    '<br>' + escapeHtml(settings.companyPhone) + '<br>' + escapeHtml(settings.companyEmail) + (settings.companyOrgNr ? '<br>Org.nr ' + escapeHtml(settings.companyOrgNr) : '') + '</td></tr></table>' +
    '<p><b>Till:</b> ' + escapeHtml(o.customerName) + (o.site ? '<br><b>Arbetsplats:</b> ' + escapeHtml(o.site) : '') +
    '<br><b>Datum:</b> ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Europe/Stockholm", "yyyy-MM-dd") +
    '<br><b>Giltig till:</b> ' + escapeHtml(o.validUntil) + '</p>' +
    (o.title ? '<h2 style="font-size:13pt">' + escapeHtml(o.title) + '</h2>' : '') +
    (o.description ? '<p>' + escapeHtml(o.description).replace(/\n/g, "<br>") + '</p>' : '') +
    '<table><tr><th>Beskrivning</th><th style="text-align:right">Antal</th><th style="text-align:right">À-pris</th><th style="text-align:right">Summa</th></tr>' + rowsHtml + '</table>' +
    '<table class="tot" style="width:50%;margin-left:50%"><tr><td>Summa exkl. moms</td><td style="text-align:right">' + moneySv(t.net) + '</td></tr>' +
    '<tr><td>Moms ' + settings.vatPercent + ' %</td><td style="text-align:right">' + moneySv(t.vat) + '</td></tr>' +
    '<tr><td>Summa inkl. moms</td><td style="text-align:right">' + moneySv(t.gross) + '</td></tr>' +
    (t.deduction ? '<tr><td>' + t.deductionLabel + ' *</td><td style="text-align:right">−' + moneySv(t.deduction) + '</td></tr>' : '') +
    '<tr><td class="big">Att betala</td><td class="big" style="text-align:right">' + moneySv(t.toPay) + '</td></tr></table>' +
    (t.deduction ? '<p class="muted">* Avdraget gäller arbetskostnaden inkl. moms (' + moneySv(t.deductibleNet * (1 + settings.vatPercent / 100)) + ') och förutsätter att Skatteverket godkänner det.</p>' : '') +
    (drawing ? '<div style="page-break-inside:avoid;margin-top:18px;"><h2 style="font-size:13pt">Ritning</h2><img src="' + drawing + '" style="width:100%;border:1px solid #e2e8f0;"><p class="muted">Ritningen finns även på karta i länken i mejlet/SMS:et.</p></div>'
      : (o.layout && o.layout.sections.some(sec => sec.anchor) ? '<p><b>Ritning:</b> p-platserna finns utritade på karta i länken i mejlet/SMS:et.</p>' : '')) +
    colorOptionsPdfHtml(o) +
    '<p class="muted">' + escapeHtml(settings.terms) + '</p></body></html>';
  const pdf = Utilities.newBlob(html, "text/html", o.id + ".html").getAs("application/pdf").setName(o.id + (o.version > 1 ? "-v" + o.version : "") + ".pdf");
  const root = DriveApp.getFolderById(CONFIG.FOLDER_ID_ROOT_IMAGES);
  const existing = root.getFoldersByName("Offerter");
  const folder = existing.hasNext() ? existing.next() : root.createFolder("Offerter");
  const file = folder.createFile(pdf);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { /* delning avstängd */ }
  return file;
}

// Skickar (eller skickar om) offerten: ny PDF, ny länk, e-post till kunden om adress finns.
// SMS skickas från admins telefon med länken som returneras.
function handleSendOffer(id, appUrl, drawingPng) {
  const sheet = getOfferSheet();
  const hit = findRowById(sheet, id);
  if (!hit) return createJsonResponse({ status: "error", message: "Offerten hittades inte." });
  const o = offerFromRow(hit.row);
  if (o.status === "godkänd" || o.status === "makulerad") return createJsonResponse({ status: "error", message: "Offerten är " + o.status + "." });
  const settings = getOfferSettings();
  let pdfFile = null, pdfNote = "";
  // Ritningen (PNG från appen) tas bara med om den är en giltig och rimligt stor PNG
  const drawing = /^data:image\/png;base64,[A-Za-z0-9+\/=]+$/.test(String(drawingPng || "")) && String(drawingPng).length < 3000000 ? String(drawingPng) : "";
  try { pdfFile = buildOfferPdf(o, settings, drawing); o.pdfId = pdfFile.getId(); }
  catch (err) { pdfNote = "PDF kunde inte skapas: " + err.message; }
  o.status = "skickad";
  o.sent = nowStamp();
  upsertById(sheet, offerToRow(o));

  const code = offerLinkCode(o);
  const label = o.type === "ata" ? "tilläggsarbete (ÄTA)" : "offert";
  let emailNote = "";
  if (o.email && /@/.test(o.email)) {
    try {
      const link = /^https:\/\/[^\s"<>]+$/.test(String(appUrl || "")) ? appUrl + "?" + o.type + "=" + encodeURIComponent(o.id) + "&code=" + encodeURIComponent(code) : "";
      MailApp.sendEmail({
        to: o.email,
        subject: (o.version > 1 ? "Uppdaterad " : "") + label.charAt(0).toUpperCase() + label.slice(1) + " " + o.id + " från " + settings.companyName,
        htmlBody: "<p>Hej " + escapeHtml(o.customerName) + "!</p><p>Här kommer " + (o.version > 1 ? "en uppdaterad " : "vår ") + label + " " + escapeHtml(o.id) +
          (o.title ? " – " + escapeHtml(o.title) : "") + ". Den finns som PDF i bifogad fil." +
          (link ? '</p><p><a href="' + link + '">Klicka här för att godkänna eller avböja</a>' : "") +
          "</p><p>Att betala: <b>" + moneySv(computeOfferTotals(o, settings).toPay) + "</b> (giltig till " + escapeHtml(o.validUntil) + ")</p><p>Vänliga hälsningar<br>" +
          escapeHtml(settings.companyName) + "<br>" + escapeHtml(settings.companyPhone) + "</p>",
        attachments: pdfFile ? [pdfFile.getBlob()] : [],
        name: settings.companyName
      });
      emailNote = "Mejlat till " + o.email;
    } catch (err) { emailNote = "Mejlet kunde inte skickas: " + err.message; }
  }
  return createJsonResponse({ status: "success", code: code, version: o.version, pdfUrl: o.pdfId ? "https://drive.google.com/file/d/" + o.pdfId + "/view" : "",
    emailNote: emailNote, pdfNote: pdfNote, offer: o });
}


// ---------- KULÖRFÖRSLAG: AI målar om ett foto av huset ----------
// Före-bilden laddas upp en gång (beforeId återanvänds för fler förslag).
function handleRecolorHouse(data) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) return createJsonResponse({ status: "error", message: "GEMINI_API_KEY saknas i Script Properties." });
  const colorText = c => c && c.name ? c.name + (c.ncs ? " (NCS " + c.ncs + ")" : "") + (/^#[0-9a-fA-F]{6}$/.test(String(c.hex || "")) ? ", approximately " + c.hex : "") : "";
  const main = colorText(data.main), detail = colorText(data.detail), windows = colorText(data.windows);
  if (!main) return createJsonResponse({ status: "error", message: "Välj en huvudfärg." });

  let beforeId = /^[A-Za-z0-9_-]{10,100}$/.test(String(data.beforeId || "")) ? String(data.beforeId) : "";
  let rawPhoto = "";
  if (beforeId) {
    try { rawPhoto = Utilities.base64Encode(DriveApp.getFileById(beforeId).getBlob().getBytes()); } catch (e) { beforeId = ""; }
  }
  if (!beforeId) {
    if (!/^data:image\/(jpeg|png);base64,/.test(String(data.imageBase64 || "")) || String(data.imageBase64).length > 8000000) {
      return createJsonResponse({ status: "error", message: "Bilden saknas eller är för stor." });
    }
    beforeId = saveImageToDrive(data.imageBase64, "Kulörförslag", "fore_" + Date.now() + ".jpg");
    rawPhoto = String(data.imageBase64).replace(/^data:image\/\w+;base64,/, "");
  }

  const prompt = "Repaint the exterior wooden facade walls of the house in this photo in the color " + main + ". " +
    (detail ? "Paint the corner boards, window and door casings (trim around them), and fascia/barge boards in " + detail + ". " : "Keep the existing trim colors. ") +
    (windows ? "Paint the window frames and sashes and the exterior doors in " + windows + ". " : "Keep the existing window frame and door colors. ") +
    "Keep everything else exactly the same: window glass, roof, foundation, plants, ground, sky, camera angle, perspective and lighting. " +
    "The result must look like a realistic photo of the same house freshly painted, with natural shadows and wood texture. No text, no logos.";
  try {
    const response = UrlFetchApp.fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=" + apiKey, {
      method: "post", contentType: "application/json", muteHttpExceptions: true,
      payload: JSON.stringify({ contents: [{ parts: [{ inlineData: { mimeType: "image/jpeg", data: rawPhoto } }, { text: prompt }] }] })
    });
    let json = {};
    try { json = JSON.parse(response.getContentText()); } catch (e) { json = {}; }
    const parts = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) || [];
    const imagePart = parts.find(p => p.inlineData && p.inlineData.data);
    if (response.getResponseCode() !== 200 || !imagePart) {
      return createJsonResponse({ status: "error", message: "AI svarade inte med en bild (HTTP " + response.getResponseCode() + "). Försök igen.", beforeId: beforeId });
    }
    const imageId = saveImageToDrive(imagePart.inlineData.data, "Kulörförslag", "forslag_" + Date.now() + ".jpg");
    return createJsonResponse({ status: "success", imageId: imageId, beforeId: beforeId, url: driveImageUrl(imageId), beforeUrl: driveImageUrl(beforeId) });
  } catch (err) {
    return createJsonResponse({ status: "error", message: "AI-fel: " + err.message, beforeId: beforeId });
  }
}

// Kulörförslagen i PDF:en (max 4 bilder, hämtas från Drive och bäddas in)
function colorOptionsPdfHtml(o) {
  if (!o.colorOptions || !o.colorOptions.length) return "";
  let html = '<div style="margin-top:18px;"><h2 style="font-size:13pt">Kulörförslag</h2>';
  const groups = [];
  o.colorOptions.forEach((c, i) => {
    const name = c.building || "";
    let g = groups.find(x => x.name === name);
    if (!g) { g = { name: name, items: [] }; groups.push(g); }
    g.items.push({ c: c, i: i });
  });
  groups.forEach(g => {
    html += '<div style="page-break-inside:avoid;">' + (g.name ? '<h3 style="font-size:11pt;margin:10px 0 4px;">' + escapeHtml(g.name) + '</h3>' : '') + '<table style="margin:0"><tr>';
    g.items.slice(0, 4).forEach((item, n) => {
      let img = "";
      try {
        const blob = DriveApp.getFileById(item.c.imageId).getBlob();
        img = '<img src="data:image/jpeg;base64,' + Utilities.base64Encode(blob.getBytes()) + '" style="width:100%;border-radius:6px;">';
      } catch (e) { img = ""; }
      html += '<td style="border:none;vertical-align:top;width:50%;padding:4px;">' + img + '<div style="font-size:9pt;margin-top:4px;"><b>Alternativ ' + (item.i + 1) + '</b> ' + escapeHtml(item.c.label) + '</div></td>';
      if (n % 2 === 1) html += '</tr><tr>';
    });
    html += '</tr></table></div>';
  });
  html += '<p class="muted">Bilderna är AI-illustrationer. Färger på skärm och papper skiljer sig från verklig kulör – vi rekommenderar färgprov på plats.</p></div>';
  return html;
}

// ---------- KUNDENS SIDA (ingen inloggning, bara signerad kod) ----------
function findOfferForCode(data) {
  const id = String(data.offerId || "");
  const hit = id ? findRowById(getOfferSheet(), id) : null;
  if (!hit) return { error: "Hittar inte offerten." };
  const o = offerFromRow(hit.row);
  if (!data.code || offerLinkCode(o) !== String(data.code)) {
    // Gammal version?
    for (let v = 1; v < o.version; v++) {
      if (signDocument(o.type, o.id + ":v" + v) === String(data.code)) return { error: "Den här länken gäller en äldre version. Kolla efter en nyare länk från oss." };
    }
    return { error: "Ogiltig länk." };
  }
  return { offer: o, rowNumber: hit.rowNumber };
}

function customerView(o, settings) {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Europe/Stockholm", "yyyy-MM-dd");
  return {
    id: o.id, type: o.type, version: o.version, status: o.status, customerName: o.customerName, site: o.site, title: o.title,
    description: o.description, rows: o.rows.map(r => ({ text: r.text, qty: r.qty, unit: r.unit, price: r.price, deductible: r.deductible })),
    validUntil: o.validUntil, expired: o.validUntil < today && o.status !== "godkänd", approvedBy: o.approvedBy, answered: o.answered,
    totals: computeOfferTotals(o, settings), pdfUrl: o.pdfId ? "https://drive.google.com/file/d/" + o.pdfId + "/view" : "",
    layout: o.layout,
    colorOptions: (o.colorOptions || []).map(c => ({ url: driveImageUrl(c.imageId), beforeUrl: c.beforeId ? driveImageUrl(c.beforeId) : "", main: c.main, detail: c.detail, windows: c.windows, label: c.label, building: c.building })),
    chosenColor: o.chosenColor,
    company: { name: settings.companyName, phone: settings.companyPhone, email: settings.companyEmail }
  };
}

function handleGetOfferForCustomer(data) {
  const found = findOfferForCode(data);
  if (found.error) return createJsonResponse({ status: "error", message: found.error });
  const o = found.offer;
  if (o.status === "makulerad") return createJsonResponse({ status: "error", message: "Offerten är inte längre aktuell. Kontakta oss gärna." });
  if (o.status === "skickad") {
    // Markera som öppnad (en gång)
    const lock = LockService.getScriptLock();
    if (lock.tryLock(5000)) {
      try {
        const fresh = findRowById(getOfferSheet(), o.id);
        const f = offerFromRow(fresh.row);
        if (f.status === "skickad" && f.version === o.version) { f.status = "öppnad"; f.opened = nowStamp(); upsertById(getOfferSheet(), offerToRow(f)); o.status = "öppnad"; }
      } finally { lock.releaseLock(); }
    }
  }
  return createJsonResponse({ status: "success", offer: customerView(o, getOfferSettings()) });
}

function handleRespondOffer(data) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return createJsonResponse({ status: "error", message: "Servern var upptagen, försök igen." });
  try {
    const found = findOfferForCode(data);
    if (found.error) return createJsonResponse({ status: "error", message: found.error });
    const o = found.offer;
    const settings = getOfferSettings();
    // Redan besvarad: svara likadant igen (dubbeltryck skapar inte två jobb)
    if (o.status === "godkänd" || o.status === "avböjd") {
      return createJsonResponse({ status: "success", alreadyAnswered: true, offer: customerView(o, settings) });
    }
    if (o.status === "makulerad") return createJsonResponse({ status: "error", message: "Offerten är inte längre aktuell." });
    if (customerView(o, settings).expired) return createJsonResponse({ status: "error", message: "Offerten har gått ut (" + o.validUntil + "). Kontakta oss så tar vi fram en ny." });
    const decision = data.decision === "godkänd" ? "godkänd" : data.decision === "avböjd" ? "avböjd" : "";
    if (!decision) return createJsonResponse({ status: "error", message: "Välj godkänn eller avböj." });
    const name = sanitize(data.name).slice(0, 80);
    if (decision === "godkänd" && name.length < 2) return createJsonResponse({ status: "error", message: "Skriv ditt namn för att godkänna." });

    o.status = decision;
    o.answered = nowStamp();
    o.approvedBy = name;
    o.customerComment = sanitize(data.comment).slice(0, 1000);
    // Ett val per huskropp: chosenColors = [index, …] (äldre klienter skickar ett enda chosenColor)
    const picks = Array.isArray(data.chosenColors) ? data.chosenColors : (data.chosenColor !== undefined ? [data.chosenColor] : []);
    if (decision === "godkänd" && o.colorOptions && o.colorOptions.length) {
      const seen = {};
      const chosen = picks.map(Number).filter(i => o.colorOptions[i]).filter(i => {
        const b = o.colorOptions[i].building || ""; if (seen[b]) return false; seen[b] = true; return true;
      });
      o.chosenColor = chosen.map(i => (o.colorOptions[i].building ? o.colorOptions[i].building + ": " : "") +
        "Alternativ " + (i + 1) + " (" + (o.colorOptions[i].label || "") + ")").join("; ");
    }
    if (decision === "godkänd") {
      // Ett jobb i planeringen med riktig kund, titel och arbetstimmar
      const hours = o.rows.filter(r => r.kind === "arbete" || r.kind === "maskin").filter(r => /tim|h/i.test(r.unit)).reduce((s, r) => s + r.qty, 0);
      const jobId = "J-" + o.id;
      const planSheet = getSheetOrCreate(getSS(), "Gantt_Jobb", ["Projekt-ID", "Kundnamn", "Fakturerande Bolag", "Titel", "Status", "Startdag-Index", "Timmar", "Skift", "Sitelokalization", "Site-Kontakt", "Site-Telefon", "Bemannade Resurs-IDn"]);
      if (!findRowById(planSheet, jobId)) {
        planSheet.appendRow([jobId, o.customerName, settings.companyName, (o.type === "ata" ? "ÄTA: " : "") + (o.title || o.id), "unscheduled", "",
          Math.max(1, Math.round(hours) || 8), "Dagpass", o.site, o.customerName, o.phone, "[]"]);
      }
      o.jobId = jobId;
    }
    upsertById(getOfferSheet(), offerToRow(o));
    // Meddela admin
    try {
      const to = CONFIG.ADMIN_EMAIL || Session.getEffectiveUser().getEmail();
      if (to) MailApp.sendEmail(to, (decision === "godkänd" ? "✅ Godkänd: " : "❌ Avböjd: ") + o.id + " " + o.customerName,
        o.customerName + " har " + decision + " " + o.id + (o.title ? " (" + o.title + ")" : "") + (name ? ". Namn: " + name : "") +
        (o.chosenColor ? "\n\nVald kulör: " + o.chosenColor : "") +
        (o.customerComment ? "\n\nKommentar: " + o.customerComment : "") + "\n\nAtt betala: " + moneySv(o.toPay));
    } catch (err) { /* e-post är bonus */ }
    return createJsonResponse({ status: "success", offer: customerView(o, settings) });
  } finally {
    lock.releaseLock();
  }
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
  const ss = getSS();
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
// 5b. EKONOMI: FAKTURAUNDERLAG
// Appen tar fram underlaget, fakturan skapas och bokförs i Fortnox.
// Ej fakturerat = tidrapporter utan "Ja" i kolumn B + godkända offerter utan datum i "Fakturerad".
// PDF:en är ett underlag/utkast, inte en faktura (inget fakturanummer eller OCR).
// ==========================================
const OFFER_INVOICED_COLUMN = OFFER_HEADERS.length + 1; // Kolumnen efter offertens egna

function isInvoicedValue(v) {
  return v === true || ["ja", "true"].indexOf(String(v).trim().toLowerCase()) !== -1;
}

function sheetTimeText(v, tz) {
  return v instanceof Date ? Utilities.formatDate(v, tz, "HH:mm") : String(v || "");
}

// "7 tim 30 min" -> 7.5. Saknas texten räknas tiden fram ur start och slut.
function reportHours(totalText, start, end) {
  const m = String(totalText || "").match(/(\d+)\s*tim\s*(\d+)\s*min/);
  if (m) return Number(m[1]) + Number(m[2]) / 60;
  if (!start || !end) return 0;
  const [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);
  let diff = (eH * 60 + eM) - (sH * 60 + sM);
  if (diff < 0) diff += 24 * 60;
  return isFinite(diff) ? diff / 60 : 0;
}

function handleGetInvoiceBasis() {
  const ss = getSS();
  const tz = Session.getScriptTimeZone() || "Europe/Stockholm";
  const settings = getOfferSettings();

  const reports = [];
  const tid = ss.getSheetByName(CONFIG.SHEET_REPORTS || "Tidrapporter");
  const tidRows = tid ? tid.getDataRange().getValues() : [];
  for (let i = 1; i < tidRows.length; i++) {
    const r = tidRows[i];
    if (!r[0] || isInvoicedValue(r[1])) continue;
    const start = sheetTimeText(r[4], tz), end = sheetTimeText(r[5], tz);
    const imageLink = (String(r[9] || "").match(/https:\/\/drive\.google\.com\/\S+/) || [""])[0];
    reports.push({
      row: i + 1,
      stamp: r[7] instanceof Date ? Utilities.formatDate(r[7], tz, "yyyy-MM-dd HH:mm:ss") : String(r[7] || ""),
      date: r[0] instanceof Date ? Utilities.formatDate(r[0], tz, "yyyy-MM-dd") : String(r[0]).slice(0, 10),
      place: String(r[2] || ""), activity: String(r[3] || ""), start: start, end: end,
      hours: Math.round(reportHours(r[6], start, end) * 100) / 100,
      user: String(r[8] || ""), note: String(r[9] || "").replace(/\s*Drive-mapp: \S+/, "").trim(), imageLink: imageLink,
      company: String(r[10] || "LPV")
    });
  }

  const offers = [];
  const offerSheet = getOfferSheet();
  if (offerSheet.getRange(1, OFFER_INVOICED_COLUMN).getValue() === "") {
    offerSheet.getRange(1, OFFER_INVOICED_COLUMN).setValue("Fakturerad").setFontWeight("bold").setBackground("#f3f3f3");
  }
  const offerRows = offerSheet.getDataRange().getValues();
  for (let i = 1; i < offerRows.length; i++) {
    if (!offerRows[i][0] || String(offerRows[i][3]) !== "godkänd" || offerRows[i][OFFER_INVOICED_COLUMN - 1]) continue;
    const o = offerFromRow(offerRows[i]);
    o.totals = computeOfferTotals(o, settings);
    o.pdfUrl = o.pdfId ? "https://drive.google.com/file/d/" + o.pdfId + "/view" : "";
    offers.push(o);
  }

  const customers = [];
  const kunder = ss.getSheetByName("Kunder");
  const kundRows = kunder ? kunder.getDataRange().getValues() : [];
  for (let i = 1; i < kundRows.length; i++) {
    const k = kundRows[i];
    if (!k[1]) continue;
    customers.push({ id: String(k[0]), name: String(k[1]), idNr: String(k[2] || ""), email: String(k[3] || ""),
      phone: String(k[7] || ""), address: String(k[8] || ""), type: String(k[9] || "company"), rotRut: String(k[10] || "none") });
  }

  return createJsonResponse({ status: "success", reports: reports, offers: offers, customers: customers, settings: settings });
}

// Markerar pass och offerter som fakturerade. Passen identifieras med rad + tidsstämpel,
// så att inget fel pass markeras om någon har sorterat eller tagit bort rader i arket.
function handleMarkInvoiced(data, user) {
  const ss = getSS();
  const tz = Session.getScriptTimeZone() || "Europe/Stockholm";
  let marked = 0, skipped = 0;
  const tid = ss.getSheetByName(CONFIG.SHEET_REPORTS || "Tidrapporter");
  (Array.isArray(data.reports) ? data.reports : []).slice(0, 500).forEach(ref => {
    const rowNumber = Number(ref.row);
    if (!tid || !(rowNumber >= 2 && rowNumber <= tid.getLastRow())) { skipped++; return; }
    const row = tid.getRange(rowNumber, 1, 1, 9).getValues()[0];
    const stamp = row[7] instanceof Date ? Utilities.formatDate(row[7], tz, "yyyy-MM-dd HH:mm:ss") : String(row[7] || "");
    if (stamp !== String(ref.stamp) || String(row[8]) !== String(ref.user)) { skipped++; return; }
    tid.getRange(rowNumber, 2).setValue(typeof row[1] === "boolean" ? true : "Ja");
    marked++;
  });
  const offerSheet = getOfferSheet();
  (Array.isArray(data.offerIds) ? data.offerIds : []).slice(0, 100).forEach(id => {
    const hit = findRowById(offerSheet, id);
    if (!hit || String(hit.row[3]) !== "godkänd") { skipped++; return; }
    offerSheet.getRange(hit.rowNumber, OFFER_INVOICED_COLUMN).setValue(nowStamp() + " av " + sanitize(user));
    marked++;
  });
  return createJsonResponse({ status: "success", marked: marked, skipped: skipped });
}

function cleanInvoiceDraft(d) {
  d = d || {};
  const c = d.customer || {};
  return {
    customer: { name: sanitize(c.name).slice(0, 120), address: sanitize(c.address).slice(0, 200), idNr: sanitize(c.idNr).slice(0, 20),
      email: sanitize(c.email).slice(0, 120) },
    customerType: d.customerType === "privat" ? "privat" : "företag",
    site: sanitize(d.site).slice(0, 200), title: sanitize(d.title).slice(0, 200), period: sanitize(d.period).slice(0, 40),
    reference: sanitize(d.reference).slice(0, 60),
    rows: cleanOfferRows(d.rows),
    deduction: ["rot", "rut"].indexOf(d.deduction) !== -1 ? d.deduction : "inget",
    deductionPersons: Math.min(4, Math.max(1, Number(d.deductionPersons) || 1)),
    spec: (Array.isArray(d.spec) ? d.spec : []).slice(0, 300).map(s => ({
      date: sanitize(s.date).slice(0, 10), user: sanitize(s.user).slice(0, 60), activity: sanitize(s.activity).slice(0, 80),
      hours: Math.round((Number(s.hours) || 0) * 100) / 100
    }))
  };
}

// Ren funktion (ingen Drive/Sheets) så att layouten kan förhandsgranskas utanför Apps Script
function buildInvoiceHtml(d, settings, t, number, today, due, logoHtml) {
  const hoursSv = h => String(Math.round(h * 100) / 100).replace(".", ",");
  const rowsHtml = d.rows.map(r => "<tr><td>" + escapeHtml(r.text) + (r.deductible && t.deduction ? " *" : "") +
    "</td><td class='r'>" + String(r.qty).replace(".", ",") + " " + escapeHtml(r.unit) + "</td><td class='r'>" + moneySv(r.price) +
    "</td><td class='r'>" + moneySv(r.qty * r.price) + "</td></tr>").join("");
  const specHtml = d.spec.length ? '<div class="spec"><h2>Specifikation av arbetade timmar</h2><table><tr><th>Datum</th><th>Utfört av</th><th>Aktivitet</th><th class="r">Timmar</th></tr>' +
    d.spec.map(s => "<tr><td>" + escapeHtml(s.date) + "</td><td>" + escapeHtml(s.user) + "</td><td>" + escapeHtml(s.activity) + "</td><td class='r'>" + hoursSv(s.hours) + "</td></tr>").join("") +
    "<tr><td colspan='3'><b>Totalt</b></td><td class='r'><b>" + hoursSv(d.spec.reduce((sum, s) => sum + s.hours, 0)) + "</b></td></tr></table></div>" : "";
  const info = (label, value) => value ? "<tr><td class='k'>" + label + "</td><td>" + escapeHtml(value) + "</td></tr>" : "";
  return '<html><head><meta charset="utf-8"><style>' +
    'body{font-family:Arial,sans-serif;font-size:10.5pt;color:#0f172a;margin:30px;} h1{font-size:22pt;margin:0;color:#0369a1;letter-spacing:1px;}' +
    'h2{font-size:12pt;margin:18px 0 6px;} table{width:100%;border-collapse:collapse;} th{background:#f1f5f9;text-align:left;padding:6px;font-size:9.5pt;}' +
    'td{padding:6px;border-bottom:1px solid #e2e8f0;font-size:9.5pt;vertical-align:top;} .r{text-align:right;white-space:nowrap;}' +
    '.draft{display:inline-block;margin-top:6px;padding:3px 8px;border:1.5px solid #b45309;color:#b45309;border-radius:4px;font-size:8.5pt;font-weight:bold;letter-spacing:.5px;}' +
    '.box{border:1px solid #cbd5e1;border-radius:6px;padding:10px 12px;} .box td{border:none;padding:1px 0;} .k{color:#64748b;width:42%;}' +
    '.tot td{border:none;padding:3px 6px;} .big td{font-size:13pt;font-weight:bold;color:#0369a1;border-top:2px solid #0369a1;padding-top:6px;}' +
    '.muted{color:#64748b;font-size:8.5pt;} .foot{margin-top:26px;border-top:1px solid #cbd5e1;padding-top:8px;} .foot td{border:none;font-size:8.5pt;color:#475569;padding:1px 8px 1px 0;}' +
    '.spec{page-break-inside:auto;}</style></head><body>' +
    '<table><tr><td style="border:none;padding:0">' + logoHtml + '<h1>FAKTURAUNDERLAG</h1><div class="draft">UTKAST – FAKTURAN SKAPAS I FORTNOX</div></td>' +
    '<td style="border:none;padding:0;text-align:right;font-size:9.5pt"><b style="font-size:12pt">' + escapeHtml(settings.companyName) + '</b><br>' +
    escapeHtml(settings.companyAddress) + '<br>' + escapeHtml(settings.companyPhone) + '<br>' + escapeHtml(settings.companyEmail) + '</td></tr></table>' +
    '<table style="margin-top:20px"><tr><td style="border:none;padding:0 10px 0 0;width:50%"><div class="box"><div class="muted">FAKTURAMOTTAGARE</div><b>' + escapeHtml(d.customer.name) + '</b><br>' +
    escapeHtml(d.customer.address).replace(/, /g, "<br>") + (d.customer.idNr ? '<br>' + (d.customerType === "privat" ? "Personnr " : "Org.nr ") + escapeHtml(d.customer.idNr) : "") + '</div></td>' +
    '<td style="border:none;padding:0;width:50%"><div class="box"><table>' + info("Underlag nr", number) + info("Datum", today) + info("Förfallodatum", due) +
    info("Betalningsvillkor", settings.invoiceDueDays + " dagar netto") + info("Er referens", d.reference) + info("Arbetsplats", d.site) + info("Period", d.period) + '</table></div></td></tr></table>' +
    (d.title ? '<h2>' + escapeHtml(d.title) + '</h2>' : '<div style="height:14px"></div>') +
    '<table><tr><th>Beskrivning</th><th class="r">Antal</th><th class="r">À-pris</th><th class="r">Belopp</th></tr>' + rowsHtml + '</table>' +
    '<table class="tot" style="width:50%;margin-left:50%;margin-top:8px"><tr><td>Summa exkl. moms</td><td class="r">' + moneySv(t.net) + '</td></tr>' +
    '<tr><td>Moms ' + settings.vatPercent + ' %</td><td class="r">' + moneySv(t.vat) + '</td></tr>' +
    '<tr><td>Summa inkl. moms</td><td class="r">' + moneySv(t.gross) + '</td></tr>' +
    (t.deduction ? '<tr><td>' + t.deductionLabel + ' *</td><td class="r">−' + moneySv(t.deduction) + '</td></tr>' : '') +
    '</table><table class="tot big" style="width:50%;margin-left:50%"><tr><td>Att betala</td><td class="r">' + moneySv(t.toPay) + '</td></tr></table>' +
    (t.deduction ? '<p class="muted">* Avdraget gäller arbetskostnaden inkl. moms (' + moneySv(t.deductibleNet * (1 + settings.vatPercent / 100)) +
      ') och begärs från Skatteverket. Nekas avdraget betalar kunden mellanskillnaden.</p>' : '') +
    specHtml +
    '<table class="foot"><tr><td><b>' + escapeHtml(settings.companyName) + '</b><br>' + escapeHtml(settings.companyAddress) + '</td>' +
    '<td>' + (settings.companyOrgNr ? 'Org.nr ' + escapeHtml(settings.companyOrgNr) + '<br>' : '') + escapeHtml(settings.companyFTax) + '</td>' +
    '<td>' + (settings.companyBankgiro ? 'Bankgiro ' + escapeHtml(settings.companyBankgiro) + '<br>' : '') + escapeHtml(settings.companyEmail) + '</td></tr></table>' +
    '</body></html>';
}

function handleInvoicePdf(input) {
  const d = cleanInvoiceDraft(input);
  if (!d.customer.name) return createJsonResponse({ status: "error", message: "Välj vilken kund underlaget gäller." });
  if (!d.rows.length) return createJsonResponse({ status: "error", message: "Underlaget har inga rader." });
  const settings = getOfferSettings();
  const t = computeOfferTotals({ rows: d.rows, customerType: d.customerType, deduction: d.deduction, deductionPersons: d.deductionPersons }, settings);
  const tz = Session.getScriptTimeZone() || "Europe/Stockholm";
  const number = "FU-" + Utilities.formatDate(new Date(), tz, "yyyyMMdd-HHmmss");
  let logo = "";
  try {
    if (CONFIG.FILE_ID_LOGO) {
      const blob = DriveApp.getFileById(CONFIG.FILE_ID_LOGO).getBlob();
      logo = '<img src="data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes()) + '" style="height:60px;">';
    }
  } catch (e) { logo = ""; }
  const html = buildInvoiceHtml(d, settings, t, number, Utilities.formatDate(new Date(), tz, "yyyy-MM-dd"), addDays(settings.invoiceDueDays || 30), logo);
  const pdf = Utilities.newBlob(html, "text/html", number + ".html").getAs("application/pdf")
    .setName(number + " " + d.customer.name.replace(/[\\/:*?"<>|]/g, "") + ".pdf");
  const root = DriveApp.getFolderById(CONFIG.FOLDER_ID_ROOT_IMAGES);
  const existing = root.getFoldersByName("Fakturaunderlag");
  const folder = existing.hasNext() ? existing.next() : root.createFolder("Fakturaunderlag");
  const file = folder.createFile(pdf);
  return createJsonResponse({ status: "success", number: number, url: file.getUrl(), totals: t });
}

// ==========================================
// 5c. SMS VIA 46ELKS
// Ett konto, avsändaren väljs per SMS efter bolag (LPV / Klaryta).
// Nycklarna ligger i Skriptegenskaper: ELKS_USER och ELKS_PASSWORD.
// Saknas de svarar servern not_configured och appen öppnar Meddelanden som förut.
// Alla utskick loggas i fliken "SMS-logg" så att kostnaden kan fördelas per bolag.
// ==========================================
const SMS_LOG_HEADERS = ["Tid", "Till", "Avsändare", "Bolag", "Typ", "Meddelande", "Status", "SMS-delar", "Kostnad (kr)", "Skickat av", "46elks-ID"];

function smsSenderFor(company) {
  return String(company || "").toLowerCase().indexOf("kla") !== -1 ? "Klaryta" : "LPV";
}

// 070-123 45 67 / 0046... / +46... -> +4670... (E.164). Tom sträng om numret inte går att tolka.
function toE164(phone) {
  let p = String(phone || "").replace(/[\s\-().]/g, "");
  if (p.indexOf("00") === 0) p = "+" + p.slice(2);
  else if (p.indexOf("0") === 0) p = "+46" + p.slice(1);
  return /^\+\d{8,15}$/.test(p) ? p : "";
}

function sendSmsViaElks(to, message, company, type, sentBy) {
  const props = PropertiesService.getScriptProperties();
  const user = props.getProperty("ELKS_USER"), password = props.getProperty("ELKS_PASSWORD");
  if (!user || !password) return { ok: false, code: "not_configured", message: "SMS-tjänsten är inte inställd (ELKS_USER/ELKS_PASSWORD saknas)." };
  const number = toE164(to);
  if (!number) return { ok: false, code: "bad_number", message: "Ogiltigt mobilnummer: " + to };
  const text = String(message || "").slice(0, 1000);
  if (!text) return { ok: false, code: "empty", message: "Meddelandet är tomt." };
  const sender = smsSenderFor(company);

  let result;
  try {
    const response = UrlFetchApp.fetch("https://api.46elks.com/a1/sms", {
      method: "post", muteHttpExceptions: true,
      headers: { Authorization: "Basic " + Utilities.base64Encode(user + ":" + password) },
      payload: { from: sender, to: number, message: text }
    });
    let json = {};
    try { json = JSON.parse(response.getContentText()); } catch (e) { json = {}; }
    result = response.getResponseCode() === 200 && json.id
      ? { ok: true, id: json.id, parts: json.parts || "", cost: json.cost ? json.cost / 10000 : "", status: json.status || "skickat" }
      : { ok: false, code: "elks_error", message: "46elks svarade: " + response.getContentText().slice(0, 200) };
  } catch (err) {
    result = { ok: false, code: "network", message: "Ingen kontakt med 46elks: " + err.message };
  }

  getSheetOrCreate(getSS(), "SMS-logg", SMS_LOG_HEADERS).appendRow([nowStamp(), number, sender, sanitize(company) || sender, sanitize(type),
    sanitize(text), result.ok ? result.status : "FEL: " + result.message, result.parts || "", result.cost, sanitize(sentBy), result.id || ""]);
  return result;
}

// Admin skickar SMS. Bolaget avgör avsändaren: inloggningslänk = personens bolag (kolumn G i Personal),
// offert = företaget i offertinställningarna, annars det bolag appen skickar med.
function handleSendSms(data, sentBy) {
  let company = sanitize(data.company);
  if (data.type === "login" && data.targetUser) {
    const hit = findStaffRow(getStaffSheet(), data.targetUser);
    if (hit) company = String(hit.row[6] || "") || company;
  }
  if (data.type === "offer") company = getOfferSettings().companyName;
  const result = sendSmsViaElks(data.to, data.message, company, data.type || "manuellt", sentBy);
  return createJsonResponse(result.ok
    ? { status: "success", sender: smsSenderFor(company), parts: result.parts, cost: result.cost }
    : { status: "error", code: result.code, message: result.message });
}

// ==========================================
// 6. BEFINTLIGA RAPPORTER OCH GODKÄNNANDEN
// ==========================================
function handleBatchReports(data) {
  const ss = getSS();
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
  const ss = getSS();
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
        hasAvatar: String(sheetData[i][5] || "") !== "",
        ownerCompany: String(sheetData[i][6]),
        status: String(sheetData[i][7])
      });
    }
  }
  return createJsonResponse({ status: "success", users: users });
}

function handleSaveTimeReport(eData) {
  var ss = getSS();
  var sheet = ss.getSheetByName(CONFIG.SHEET_REPORTS || "Tidrapporter");
  sheet.appendRow([new Date(), "Nej", "Fält", eData.aktivitet || "Arbete", eData.starttid || "", eData.sluttid || "", eData.totaltid || "0 tim 0 min", new Date(), eData.anvandare || "Okänd", eData.note || "", "LPV", ""]);
  return createJsonResponse({ status: "success", message: "Tidrapport sparad." });
}

function handleSaveAta(eData) {
  var ss = getSS();
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
  const ss = getSS();

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
