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
  if (CONFIG.CALENDAR_ID) {
    try { const cal = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID); rad(!!cal, cal ? "Kalender: " + cal.getName() + " (" + cal.getEventsForDay(new Date()).length + " händelser idag)" : "Kalender: hittar inte CALENDAR_ID – dela kalendern med kontot som kör skriptet"); }
    catch (e) { rad(false, "Kalender: " + e.message); }
  } else Logger.log("ℹ️ CALENDAR_ID saknas i Config.gs – planerade jobb kommer bara från radarn");
  ["FASAD", "LINJE", "KLARYTA"].forEach(account => {
    const token = props.getProperty("HUBSPOT_TOKEN_" + account);
    if (!token) { Logger.log("ℹ️ HUBSPOT_TOKEN_" + account + " saknas – de offerterna väntar tills nyckeln finns"); return; }
    try { hubspotFetch(token, "get", "/crm/v3/objects/contacts?limit=1"); rad(true, "HubSpot " + account + ": nyckeln fungerar"); }
    catch (e) { rad(false, "HubSpot " + account + ": " + e.message); }
  });
  Logger.log("Klart. Ladda upp ny kod med ./ladda-upp-kod.sh – den skapar även ny version av webbappen.");
}

// Felsökning av Googles bild-AI: kör testaGemini i Apps Script-redigeraren och läs loggen.
// Visar bara de sista 4 tecknen av nyckeln.
function testaGemini() {
  const key = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") || "";
  if (!key) { Logger.log("❌ GEMINI_API_KEY saknas i Skriptegenskaper."); return; }
  Logger.log("Nyckel som används slutar på: …" + key.slice(-4));
  const call = (label, model, body) => {
    const res = UrlFetchApp.fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + key, {
      method: "post", contentType: "application/json", muteHttpExceptions: true, payload: JSON.stringify(body) });
    const code = res.getResponseCode();
    let msg = "";
    try { const j = JSON.parse(res.getContentText()); msg = j.error ? (j.error.status + ": " + j.error.message) : "OK"; } catch (e) { msg = res.getContentText().slice(0, 300); }
    Logger.log((code === 200 ? "✅ " : "❌ ") + label + " (" + model + "): HTTP " + code + " – " + msg.slice(0, 600));
  };
  call("Bild", "gemini-2.5-flash-image", { contents: [{ parts: [{ text: "En enkel röd cirkel på vit bakgrund." }] }] });
  // Samma förfrågan som avatarknappen (utan foto) – visar om det är innehållet som stoppas
  const res = UrlFetchApp.fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=" + key, {
    method: "post", contentType: "application/json", muteHttpExceptions: true,
    payload: JSON.stringify({ contents: [{ parts: [{ text: "A friendly, vibrant 3D animated cartoon character portrait of a cheerful builder in the iconic style of Bob the Builder, yellow hard hat, solid blue background." }] }] }) });
  let info = "";
  try {
    const j = JSON.parse(res.getContentText());
    const c = (j.candidates || [])[0] || {};
    const hasImage = ((c.content || {}).parts || []).some(p => p.inlineData);
    info = j.error ? j.error.status + ": " + j.error.message : "bild: " + (hasImage ? "ja" : "NEJ") + ", finishReason: " + (c.finishReason || "–") + (j.promptFeedback ? ", blockReason: " + j.promptFeedback.blockReason : "");
  } catch (e) { info = res.getContentText().slice(0, 300); }
  Logger.log((res.getResponseCode() === 200 && /bild: ja/.test(info) ? "✅ " : "❌ ") + "Avatar-förfrågan: HTTP " + res.getResponseCode() + " – " + info.slice(0, 600));
  Logger.log("Klart. Kopiera raderna ovan (de innehåller inte nyckeln).");
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
  "getOfferForCustomer", "respondOffer", "geocode", "recolorHouse", "getInvoiceBasis", "invoicePdf",
  "blacksta_getPlan", "blacksta_getEvents", "blacksta_getMed", "getCustomers", "hubspotImport", "getStalls", "getEk", "getNotices", "getAvatars"]; // getOfferForCustomer/respondOffer låser själva när de skriver

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
      "getProperties", "saveProperty", "deleteProperty", "addPropertyPhoto", "removePropertyPhoto", "sendSms", "importProperties",
      "blacksta_savePlan", "addStaff", "hubspotSyncPending", "hubspotImport", "getCustomers", "importCustomers",
      "saveStall", "addStallPhoto", "robotAlarm", "radarSaveJob", "radarDeleteJob", "getKabanossData", "saveKabanossJob", "getAvatars", "radarSaveResource", "radarRemoveResource", "radarResourceAvatar"];
    if (adminOnly.indexOf(action) !== -1 && !auth.isAdmin) {
      return createJsonResponse({ status: "error", message: "Åtkomst nekad: Kräver administratör." });
    }
    // Bara admin på LPV: inställningar, importer, HubSpot och stallregistret. (Snöplaneringen är gemensam.)
    const lpvAdminOnly = ["saveOfferSettings", "importCustomers", "hubspotImport", "hubspotSyncPending", "saveStall", "addStallPhoto", "robotAlarm",
      // Blacksta är ett eget projekt (repot Blacksta, eget kalkylark). Kvar här bara tills datan är flyttad.
      "blacksta_getPlan", "blacksta_savePlan", "blacksta_logEvent", "blacksta_getEvents", "blacksta_addMed", "blacksta_getMed"];
    if (lpvAdminOnly.indexOf(action) !== -1 && !auth.isSuper) {
      return createJsonResponse({ status: "error", message: "Åtkomst nekad: Kräver administratör på LPV." });
    }
    // Stalltvätten är LPV:s: bara LPV:s personal ser stallen och styr roboten
    if (["getStalls", "setRobotRow"].indexOf(action) !== -1 && auth.company !== "LPV") {
      return createJsonResponse({ status: "error", message: "Åtkomst nekad: stalltvätten hör till LPV." });
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

    if (data.site) rememberSiteUrl(data.site);

    // --- ROUTER ---
    if (action === "me") return createJsonResponse({ status: "success", user: auth.user, company: auth.company, isAdmin: auth.isAdmin, isSuper: !!auth.isSuper, isEconomist: auth.isEconomist });
    // Offerter: Klaryta-admin får bara röra Klarytas offerter
    if ((action === "sendOffer" || action === "cancelOffer") && !auth.isSuper) {
      const hit = findRowById(getOfferSheet(), data.id);
      if (hit && !inScope(auth, offerFromRow(hit.row).brand === "klaryta" ? "Klaryta" : "LPV")) return createJsonResponse({ status: "error", message: "Åtkomst nekad: offerten tillhör ett annat bolag." });
    }
    if (action === "getKabanossData") return handleGetKabanossData(auth);
    if (action === "getJobs") return handleGetJobs(data, auth);
    if (action === "radarSaveJob") return handleRadarSaveJob(data, auth);
    if (action === "radarDeleteJob") return handleRadarDeleteJob(data, auth);
    if (action === "radarSaveResource") return handleRadarSaveResource(data, auth);
    if (action === "radarRemoveResource") return handleRadarRemoveResource(data, auth);
    if (action === "radarResourceAvatar") return handleRadarResourceAvatar(data, auth);
    if (action === "getNotices") return handleGetNotices(auth);
    if (action === "getAvatars") {
      // Små avatarer (kolumn F i Personal) för radarns kulor. Hämtas separat så att planeringen laddar snabbt.
      const out = {};
      const st = getStaffSheet();
      if (st) st.getDataRange().getValues().slice(1).forEach(r => {
        const v = String(r[5] || "");
        if (r[0] && inScope(auth, r[6]) && (/^data:image\/(jpeg|png);base64,/.test(v) && v.length < 60000 || /^https:\/\//.test(v))) out[String(r[0]).trim()] = v;
      });
      extraResources(auth).forEach(x => { if (x.avatarUrl) out[x.name] = x.avatarUrl; });
      return createJsonResponse({ status: "success", avatars: out });
    }
    if (action === "saveMyAvatar") {
      const img = String(data.imageBase64 || "");
      if (!/^data:image\/(jpeg|png);base64,[A-Za-z0-9+\/=]+$/.test(img) || img.length > 50000) return createJsonResponse({ status: "error", message: "Bilden är för stor eller ogiltig." });
      saveAvatarToSheet(auth.user, img);
      return createJsonResponse({ status: "success" });
    }
    if (action === "markNoticesRead") return handleMarkNoticesRead(data, auth);
    if (action === "getStalls") return handleGetStalls();
    if (action === "saveStall") return handleSaveStall(data.stall, auth.user);
    if (action === "addStallPhoto") return handleAddStallPhoto(data.imageBase64);
    if (action === "setRobotRow") return handleSetRobotRow(data, auth.user);
    if (action === "robotAlarm") return handleRobotAlarm(data, auth.user);
    if (action === "getEk") return handleGetEk(data, auth);
    if (action === "saveEk") return handleSaveEk(data.ek, auth.user);
    if (action === "addEkPhoto") return handleAddEkPhoto(data.imageBase64);
    if (action === "signEk") return handleSignEk(data, auth.user);
    if (action === "saveKabanossJob") {
      if (scopeOf(auth)) data.billingCompany = scopeOf(auth);
      const gantt = getSS().getSheetByName("Gantt_Jobb");
      const hit = gantt && data.id ? findRowById(gantt, data.id) : null;
      if (hit && !inScope(auth, hit.row[2])) return createJsonResponse({ status: "error", message: "Åtkomst nekad: jobbet tillhör ett annat bolag." });
      return handleSaveKabanossJob(data);
    }
    if (action === "sickReport") return handleSickReport(data);
    if (action === "batchReports") return handleBatchReports(data);
    if (action === "getUsers") return handleGetUsers(auth);
    if (action === "getUserKey") {
      if (!auth.isSuper) {
        const st = findStaffRow(getStaffSheet(), data.targetUser);
        if (!st || !inScope(auth, st.row[6]) || isAdminRow(st.row) || isEconomistRow(st.row)) return createJsonResponse({ status: "error", message: "Åtkomst nekad: bara admin på LPV kan hantera den personens länk." });
      }
      return handleGetUserKey(data);
    }
    if (action === "signDocument") return createJsonResponse({ status: "success", code: signDocument(data.docType, data.docId) });
    if (action === "transform_to_clay") return handleClayTransformation(data);
    if (action === "save_time_report") return handleSaveTimeReport(data);
    if (action === "save_ata") return handleSaveAta(data);
    if (action === "getSnowZones") return handleGetSnowZones(auth);
    if (action === "setSlingaDrivers") return handleSetSlingaDrivers(data, auth.user);
    if (action === "getOffers") return handleGetOffers(auth);
    if (action === "recolorHouse") return handleRecolorHouse(data);
    if (action === "geocode") {
      const geo = geocodeAddress(String(data.address || "").slice(0, 200), "");
      return createJsonResponse(geo ? { status: "success", lat: geo.lat, lng: geo.lng } : { status: "error", message: "Hittade inte adressen." });
    }
    if (action === "saveOffer") return handleSaveOffer(data.offer, auth.user, auth);
    if (action === "sendOffer") return handleSendOffer(data.id, data.appUrl, data.drawingPng);
    if (action === "cancelOffer") return handleCancelOffer(data.id);
    if (action === "hubspotSyncPending") return handleHubspotSyncPending();
    if (action === "hubspotImport") return handleHubspotImport();
    if (action === "getCustomers") return handleGetCustomers(auth);
    if (action === "importCustomers") return handleImportCustomers(data.customers, auth.user);
    if (action === "getOfferSettings") return createJsonResponse({ status: "success", settings: getOfferSettings() });
    if (action === "saveOfferSettings") return handleSaveOfferSettings(data.settings);
    if (action === "getFleet") return handleGetFleet();
    if (action === "saveTractor") return handleSaveTractor(data.tractor);
    if (action === "deleteTractor") return handleDeleteById(getFleetSheet(), data.id);
    if (action === "generateTractorAvatar") return handleGenerateTractorAvatar(data.id);
    if (action === "getProperties") return handleGetProperties();
    if (action === "saveProperty") return handleSaveProperty(data.property);
    if (action === "deleteProperty") return handleDeleteById(getPropertySheet(), data.id);
    if (action === "importProperties") return handleImportProperties(data.rows);
    if (action === "blacksta_getPlan") return handleBlackstaGetPlan();
    if (action === "blacksta_savePlan") return handleBlackstaSavePlan(data.jobs, auth.user);
    if (action === "blacksta_logEvent") return handleBlackstaLogEvent(data.event, auth.user);
    if (action === "blacksta_getEvents") return handleBlackstaGetEvents(data);
    if (action === "blacksta_addMed") return handleBlackstaAddMed(data.entry, auth.user);
    if (action === "blacksta_getMed") return handleBlackstaGetMed(data);
    if (action === "addPropertyPhoto") return handleAddPropertyPhoto(data.id, data.imageBase64);
    if (action === "removePropertyPhoto") return handleRemovePropertyPhoto(data.id, data.photoId);
    if (action === "saveSnowZone") return handleSaveSnowZone(data.zone, auth.user);
    if (action === "deleteSnowZone") return handleDeleteSnowZone(data.zoneId);
    if (action === "getInvoiceBasis") return handleGetInvoiceBasis(auth);
    if (action === "markInvoiced") return handleMarkInvoiced(data, auth.user, auth);
    if (action === "invoicePdf") return handleInvoicePdf(data.draft, auth);
    if (action === "sendSms") return handleSendSms(data, auth.user);
    if (action === "addStaff") {
      // Admin på Klaryta kan lägga till förare/UE i Klaryta – admin- och ekonombehörighet delas bara ut av admin på LPV
      if (!auth.isSuper) {
        if (data.role === "Admin" || data.role === "Ekonom") return createJsonResponse({ status: "error", message: "Bara admin på LPV kan ge admin- eller ekonombehörighet." });
        data.company = auth.company;
      }
      return handleAddStaff(data);
    }

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
    company: companyOf(hit.row[6]),
    quarantined: String(hit.row[7] || "").toLowerCase() === "karantän"
  };
  cache.put(cacheKey, JSON.stringify(info), AUTH_CACHE_SECONDS);
  return info;
}

function clearStaffAuthCache(name) {
  CacheService.getScriptCache().remove("auth:" + String(name).trim());
}

// Bolag: kolumn G i Personal. Allt som inte är Klaryta räknas som LPV.
function companyOf(value) { return /kla/i.test(String(value || "")) ? "Klaryta" : "LPV"; }

// Admin på LPV ser och ändrar allt (och är den som delar ut behörigheter). Admin och ekonom på
// Klaryta ser bara Klarytas data – och omvänt ser en ekonom på LPV bara LPV:s. scope = null betyder allt.
// Utan auth = internt anrop (alla anrop utifrån går via doPost med auth) – ingen begränsning.
function scopeOf(auth) { return !auth || (auth.isAdmin && auth.company === "LPV") ? null : auth.company || "LPV"; }
function inScope(auth, company) { const sc = scopeOf(auth); return !sc || companyOf(company) === sc; }

function authenticate(data) {
  if (data.user && data.key) {
    const info = readStaffAuth(data.user);
    if (info && info.key && info.key === String(data.key) && !info.quarantined) {
      const company = info.company || "LPV";
      return { user: info.user, isAdmin: info.isAdmin, isEconomist: !!info.isEconomist, company: company, isSuper: info.isAdmin && company === "LPV", legacy: false };
    }
    return null;
  }
  // Övergång: gamla gemensamma nyckeln. Ta bort API_TOKEN ur Config.gs för att stänga av.
  const legacyToken = (typeof CONFIG !== "undefined" && CONFIG.API_TOKEN) || "";
  if (legacyToken && data.token === legacyToken) {
    const info = data.user ? readStaffAuth(data.user) : null;
    const company = (info && info.company) || "LPV";
    const isAdmin = !!(info && info.isAdmin);
    return { user: String(data.user || "Okänd"), isAdmin: isAdmin, isEconomist: !!(info && info.isEconomist), company: company, isSuper: isAdmin && company === "LPV", legacy: true };
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

// Admin lägger till en person i Personal. Rollen styr kolumn D (Roll) och E (Behörighet):
// Admin = TRUE, Ekonom = "Ekonom", Förare/UE = tomt. Nyckeln skapas direkt så att länken kan skickas.
const STAFF_ROLES = ["Förare", "UE", "Ekonom", "Admin"];

function handleAddStaff(data) {
  const name = sanitize(data.name).replace(/\s+/g, " ").slice(0, 60);
  if (!name) return createJsonResponse({ status: "error", message: "Skriv personens namn." });
  const role = STAFF_ROLES.indexOf(data.role) !== -1 ? data.role : "Förare";
  const sheet = getStaffSheet();
  if (findStaffRow(sheet, name)) return createJsonResponse({ status: "error", message: name + " finns redan i Personal." });
  const key = Utilities.getUuid().replace(/-/g, "");
  const row = [name, sanitize(data.email).slice(0, 120), sanitize(data.phone).slice(0, 20), role,
    role === "Admin" ? "TRUE" : (role === "Ekonom" ? "Ekonom" : ""), "", sanitize(data.company).slice(0, 60) || "LPV", "Aktiv"];
  while (row.length < KEY_COLUMN - 1) row.push("");
  row.push(key);
  sheet.appendRow(row);
  clearStaffAuthCache(name);
  return createJsonResponse({ status: "success", user: name, key: key, role: role });
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
function handleGetKabanossData(auth) {
  const ss = getSS();

  // 1. Kunder
  const klientSheet = ss.getSheetByName("Kunder");
  const klientRows = klientSheet ? klientSheet.getDataRange().getValues() : [];
  const clients = [];
  for (let i = 1; i < klientRows.length; i++) {
    if (klientRows[i][1] && inScope(auth, klientRows[i][4])) {
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
    if (resursRows[i][0] && inScope(auth, resursRows[i][6])) {
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
        kind: resourceKind(rollTyp, name),
        sizeClass: sizeClass,
        icon: icon,
        hasAvatar: !!avatarLank, // bilden skickas inte – radarn visar initialer
        ownerCompany: agare,
        color: color,
        isSick: isSick
      });
    }
  }

  // Maskiner och utrustning (fliken Resurser) + traktorerna
  extraResources(auth).forEach(x => resources.push({ id: x.name, resId: x.id, source: x.source, name: x.name, type: x.kind === "machine" ? "machine" : "equipment",
    kind: x.kind, model: x.model, icon: x.kind === "machine" ? "🚜" : "🛠️", hasAvatar: !!x.avatarUrl, ownerCompany: x.ownerCompany, color: "#b45309", isSick: false }));

  // 3. Jobben (radarn): riktiga datum, längd efter antal tilldelade, helger och röda dagar
  const jobs = handleRadarJobs(auth);

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

// Begripligt fel från Googles bild-AI (Gemini). 429 = kvoten är slut (gratisnivån har ett litet dagligt tak).
function geminiErrorText(code, bodyText) {
  const body = String(bodyText || "");
  if (code === 429 || /quota|RESOURCE_EXHAUSTED|exceeded/i.test(body)) {
    return "Dagens AI-kvot hos Google är slut. Försök igen i morgon – eller slå på betalning för Gemini-nyckeln i Google AI Studio så försvinner taket.";
  }
  if (code === 400 && /API key/i.test(body)) return "Gemini-nyckeln (GEMINI_API_KEY) är ogiltig.";
  return "AI svarade inte med en bild (HTTP " + code + "). Försök igen.";
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
      return createJsonResponse({ status: "error", message: geminiErrorText(response.getResponseCode(), response.getContentText()) });
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

// Import från kalkylark: max 50 rader per anrop (appen skickar i omgångar och visar förlopp).
// Dubbletter (samma adress + ort) hoppas över. Varje adress geokodas.
function normalizeAddress(address, ort) {
  return (String(address || "") + "|" + String(ort || "")).toLowerCase().replace(/\s+/g, " ").replace(/[.,]/g, "").trim();
}

function handleImportProperties(rows) {
  if (!Array.isArray(rows) || !rows.length) return createJsonResponse({ status: "error", message: "Inga rader att importera." });
  if (rows.length > 50) return createJsonResponse({ status: "error", message: "Max 50 rader per omgång." });
  const sheet = getPropertySheet();
  const existing = sheet.getDataRange().getValues();
  const seen = {};
  for (let i = 1; i < existing.length; i++) if (existing[i][0]) seen[normalizeAddress(existing[i][1], existing[i][2])] = true;

  const out = [], skipped = [], notFound = [];
  rows.forEach(r => {
    const address = sanitize(r.address).slice(0, 200);
    if (!address) return;
    let ort = sanitize(r.ort).slice(0, 80);
    const key = normalizeAddress(address, ort);
    if (seen[key]) { skipped.push(address); return; }
    seen[key] = true;
    let lat = "", lng = "";
    try {
      const geo = geocodeAddress(address, ort);
      if (geo) { lat = Number(geo.lat.toFixed(7)); lng = Number(geo.lng.toFixed(7)); if (!ort) ort = geo.ort; }
      else notFound.push(address);
    } catch (err) { notFound.push(address); }
    out.push(["F-" + Utilities.getUuid().slice(0, 8), address, ort, lat, lng,
      SIZES.indexOf(r.size) !== -1 ? r.size : "", "FALSE", r.priority ? "TRUE" : "FALSE", "[]", sanitize(r.note).slice(0, 500), nowStamp()]);
  });
  if (out.length) sheet.getRange(sheet.getLastRow() + 1, 1, out.length, out[0].length).setValues(out);
  return createJsonResponse({ status: "success", added: out.length, skipped: skipped, notFound: notFound });
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
// 4c2. PLANERADE JOBB (startsidans blå kort, "Osthyveln")
// Dagens jobb från Google-kalendern (CONFIG.CALENDAR_ID) + radarn (Gantt_Jobb).
// Bara admin ser dem. Radarjobb utan dag (t.ex. godkända offerter) visas som
// "vid tillfälle" så att de inte glöms bort.
// ==========================================
const RADAR_START_DATE = "2026-10-26"; // samma som START_DATE i radar.html – dag 0 i radarn

function stripHtml(text) {
  return String(text || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

function handleGetJobs(data, auth) {
  if (!auth) return createJsonResponse({ status: "success", events: [] });
  const tz = Session.getScriptTimeZone() || "Europe/Stockholm";
  const dateText = /^\d{4}-\d{2}-\d{2}$/.test(String(data.date || "")) ? String(data.date) : Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
  const [y, m, d] = dateText.split("-").map(Number);
  const day = new Date(y, m - 1, d);
  const events = [];
  const notes = [];

  // 1. Google-kalendern (LPV:s – bara admin på LPV)
  if (CONFIG.CALENDAR_ID && auth.isSuper) {
    try {
      const cal = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
      if (!cal) throw new Error("hittar inte kalendern (CALENDAR_ID) – är den delad med kontot som kör skriptet?");
      cal.getEventsForDay(day).forEach(ev => {
        const desc = stripHtml(ev.getDescription()).slice(0, 500);
        events.push({
          id: "cal:" + ev.getId() + ":" + dateText,
          title: ev.getTitle() || "Kalenderjobb",
          place: ev.getLocation() || desc.split("\n")[0].slice(0, 80) || "",
          description: desc,
          start: ev.isAllDayEvent() ? "" : Utilities.formatDate(ev.getStartTime(), tz, "HH:mm"),
          source: "kalender", isBuffer: false
        });
      });
    } catch (err) { notes.push("Kalendern: " + err.message); }
  }

  // 2. Radarn: jobb som ligger på den här dagen (längd och helger räknade). Personal ser bara sina egna;
  // admin ser alla, plus oplanerade jobb "vid tillfälle".
  handleRadarJobs(auth).forEach(j => {
    const seg = j.segments.filter(sg => sg.date === dateText)[0];
    const mine = j.assigned.indexOf(auth.user) !== -1;
    if (!auth.isAdmin && !mine) return;
    if (!j.startDate && !auth.isAdmin) return;
    if (j.startDate && !seg) return;
    const hh = (h) => String(Math.floor(h)).padStart(2, "0") + ":" + String(Math.round((h % 1) * 60)).padStart(2, "0");
    events.push({
      id: "radar:" + j.id, title: j.title || j.client || "Jobb", place: j.siteAddress || j.client || "",
      description: [j.client, j.siteContactName, j.siteContactPhone].filter(Boolean).join(" · "),
      start: seg ? hh(seg.from) : "", source: "radar", isBuffer: !j.startDate
    });
  });

  events.sort((a, b) => (a.isBuffer - b.isBuffer) || String(a.start || "99").localeCompare(String(b.start || "99")));
  return createJsonResponse({ status: "success", date: dateText, events: events, notes: notes });
}

// ==========================================
// 4c3. STALLREGISTER & STALLTVÄTT (arbetsorder i Tidrapport-appen)
// Ett stall = rader × boxar, minuter per box, om tvättroboten används, och en
// arbetsorder med steg (text + bild) som admin skriver. Robotens läge sparas
// per rad: { start (ms), from (box roboten startade på), paused (ms|null) }.
// Appen räknar ut vilka boxar som är klara: from + (nu - start) / min per box.
// ==========================================
const STALL_HEADERS = ["Stall-ID", "Namn", "Site", "Rader", "Boxar per rad", "Min per box", "Robot",
  "Instruktioner (JSON)", "Robotläge (JSON)", "Uppdaterad", "Uppdaterad av"];
const DEFAULT_STALLS = ["Stall 1", "Stall 2", "Stall 5BB", "Stall 5TV", "Stall 6BBTV", "Stall 7BB (Site 2)", "Stall 7TV (Site 2)", "Seminstall (Site 2)"];

function getStallSheet() {
  const ss = getSS();
  let sheet = ss.getSheetByName("Stallregister");
  if (!sheet) {
    sheet = getSheetOrCreate(ss, "Stallregister", STALL_HEADERS);
    // Samma stall som i Blacksta: 4 rader × 23 boxar, 20 min per box med roboten
    DEFAULT_STALLS.forEach((name, i) => sheet.appendRow(["S" + (i + 1), name, /Site 2/.test(name) ? "Site 2" : "Site 1", 4, 23, 20, "ja", "[]", "{}", nowStamp(), "start"]));
  }
  return sheet;
}

function parseJsonCell(cell, fallback) {
  try { const v = JSON.parse(cell || ""); return v && typeof v === "object" ? v : fallback; } catch (e) { return fallback; }
}

function stallFromRow(r) {
  const steps = parseJsonCell(r[7], []);
  return {
    id: String(r[0]), name: String(r[1] || ""), site: String(r[2] || ""),
    rows: Math.max(1, Number(r[3]) || 4), boxesPerRow: Math.max(1, Number(r[4]) || 23), minPerBox: Math.max(1, Number(r[5]) || 20),
    robot: String(r[6]).toLowerCase() !== "nej",
    steps: (Array.isArray(steps) ? steps : []).map(s => ({ text: String(s.text || ""), photoId: String(s.photoId || ""), photoUrl: driveImageUrl(s.photoId) })),
    robotState: parseJsonCell(r[8], {}),
    updated: String(r[9] || ""), updatedBy: String(r[10] || "")
  };
}

function handleGetStalls() {
  const rows = getStallSheet().getDataRange().getValues();
  const stalls = [];
  for (let i = 1; i < rows.length; i++) if (rows[i][0]) stalls.push(stallFromRow(rows[i]));
  return createJsonResponse({ status: "success", stalls: stalls, serverNow: Date.now() });
}

function handleSaveStall(input, user) {
  if (!input) return createJsonResponse({ status: "error", message: "Inget stall skickades." });
  const sheet = getStallSheet();
  const hit = input.id ? findRowById(sheet, input.id) : null;
  const old = hit ? stallFromRow(hit.row) : null;
  const name = sanitize(input.name).slice(0, 60);
  if (!name) return createJsonResponse({ status: "error", message: "Ange stallets namn." });
  const num = (v, min, max, def) => { const n = Math.round(Number(v)); return isFinite(n) && n >= min ? Math.min(max, n) : def; };
  const photoId = (v) => /^[A-Za-z0-9_-]{10,100}$/.test(String(v || "")) ? String(v) : "";
  const steps = (Array.isArray(input.steps) ? input.steps : []).slice(0, 40)
    .map(s => ({ text: sanitize(s.text).slice(0, 1000), photoId: photoId(s.photoId) })).filter(s => s.text || s.photoId);
  let id = old ? old.id : "";
  if (!id) {
    const rows = sheet.getDataRange().getValues();
    let max = 0;
    for (let i = 1; i < rows.length; i++) max = Math.max(max, Number(String(rows[i][0]).replace(/\D/g, "")) || 0);
    id = "S" + (max + 1);
  }
  const row = [id, name, sanitize(input.site).slice(0, 40), num(input.rows, 1, 20, 4), num(input.boxesPerRow, 1, 100, 23),
    num(input.minPerBox, 1, 600, 20), input.robot === false ? "nej" : "ja", JSON.stringify(steps),
    JSON.stringify(old ? old.robotState : {}), nowStamp(), sanitize(user)];
  upsertById(sheet, row);
  return createJsonResponse({ status: "success", stall: stallFromRow(row) });
}

function handleAddStallPhoto(imageBase64) {
  if (!imageBase64 || String(imageBase64).length > 8000000) return createJsonResponse({ status: "error", message: "Bilden saknas eller är för stor." });
  const fileId = saveImageToDrive(imageBase64, "Stallbilder", "stall_" + Date.now() + ".jpg");
  return createJsonResponse({ status: "success", photo: { id: fileId, url: driveImageUrl(fileId) } });
}

function logRobotAlarmReport(stall, rowIndex, alarm, place, user) {
  const tz = Session.getScriptTimeZone() || "Europe/Stockholm";
  const fmt = (ms, f) => Utilities.formatDate(new Date(ms), tz, f);
  const from = alarm.ack || alarm.at;
  const start = fmt(from, "HH:mm"), end = fmt(alarm.cleared, "HH:mm");
  const sheet = getSheetOrCreate(getSS(), CONFIG.SHEET_REPORTS || "Tidrapporter", ["Datum", "Fakturerad", "Plats", "Aktivitet", "Start", "Slut", "Total", "Tidsstämpel", "Användare", "Notering", "Bolag"]);
  sheet.appendRow([fmt(from, "yyyy-MM-dd"), "Nej", sanitize(place) || "Blacksta", "Robotlarm", start, end,
    formatDuration(start, end, ((alarm.cleared - from) / 3600000).toFixed(2)), fmt(Date.now(), "yyyy-MM-dd HH:mm:ss"), sanitize(user),
    "Tvättrobot: " + stall.name + ", rad " + (rowIndex + 1) + ", box " + (alarm.box + 1) + " – larm " + fmt(alarm.at, "HH:mm") + ", kvitterat " + start +
    (alarm.ackBy ? " av " + alarm.ackBy : "") + ", omstart " + end + (alarm.text ? ". SMS: " + alarm.text : ""), "LPV"]);
}

// Larm-SMS från roboten (via genväg på telefonen). Det finns en robot, så larmet gäller
// den rad som går just nu (senast startad om flera). Alla SMS loggas i fliken Robotlarm.
function handleRobotAlarm(data, user) {
  const text = sanitize(data.text).slice(0, 300);
  const now = Date.now();
  const rows = getStallSheet().getDataRange().getValues();
  let best = null;
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    const stall = stallFromRow(rows[i]);
    if (!stall.robot) continue;
    ((stall.robotState || {}).rows || []).forEach((st, r) => {
      if (!st || !st.start || st.paused) return;
      const done = (st.from || 0) + (now - st.start) / (stall.minPerBox * 60000) >= stall.boxesPerRow;
      if (!done && (!best || st.start > best.start)) best = { stall: stall, row: r, start: st.start };
    });
  }
  const log = getSheetOrCreate(getSS(), "Robotlarm", ["Tidpunkt", "SMS", "Stall", "Rad", "Mottaget av"]);
  log.appendRow([nowStamp(), text, best ? best.stall.name : "(ingen rad igång)", best ? best.row + 1 : "", sanitize(user)]);
  if (!best) return createJsonResponse({ status: "success", matched: false, message: "Larmet sparades, men ingen robotrad var igång." });
  const res = JSON.parse(handleSetRobotRow({ stallId: best.stall.id, row: best.row, op: "alarm", source: "sms", text: text }, user).getContent());
  return createJsonResponse(Object.assign(res, { matched: true, stall: best.stall.name, row: best.row + 1 }));
}

// Robotens läge för en rad. Tiden sätts av servern så att alla telefoner räknar likadant.
function handleSetRobotRow(data, user) {
  const sheet = getStallSheet();
  const hit = findRowById(sheet, data.stallId);
  if (!hit) return createJsonResponse({ status: "error", message: "Stallet hittades inte." });
  const stall = stallFromRow(hit.row);
  const rowIndex = Math.round(Number(data.row));
  if (!(rowIndex >= 0 && rowIndex < stall.rows)) return createJsonResponse({ status: "error", message: "Raden finns inte." });
  const now = Date.now();
  const state = stall.robotState && typeof stall.robotState === "object" ? stall.robotState : {};
  const rows = Array.isArray(state.rows) ? state.rows : [];
  const cur = rows[rowIndex] || {};
  const box = Math.min(stall.boxesPerRow, Math.max(0, Math.round(Number(data.box) || 0)));
  // Var roboten står just nu (för larm: vilken box larmet kom på)
  const atBox = cur.start ? Math.min(stall.boxesPerRow - 1, Math.floor((cur.from || 0) + ((cur.paused || now) - cur.start) / (stall.minPerBox * 60000))) : 0;
  const alarms = Array.isArray(cur.alarms) ? cur.alarms.slice(-50) : [];
  let next;
  if (data.op === "start") next = { start: now, from: 0, paused: null, alarms: [] };
  else if (data.op === "setBox") next = { start: now, from: box, paused: cur.paused ? now : null, alarm: !!cur.alarm, alarms: alarms };
  else if (data.op === "pause" && cur.start && !cur.paused) next = Object.assign({}, cur, { paused: now });
  // Larm: roboten står still från nu tills någon startar om den. Stilleståndet sparas per larm.
  else if (data.op === "alarm" && cur.start && !cur.paused) next = Object.assign({}, cur, { paused: now, alarm: true,
    alarms: alarms.concat([{ at: now, box: atBox, by: sanitize(user), source: data.source === "sms" ? "sms" : "app", text: sanitize(data.text).slice(0, 300) }]) });
  // Kvittering = någon börjar åtgärda larmet. Faktureringen räknas härifrån, inte från larmet.
  else if (data.op === "ack" && cur.alarm && alarms.length && !alarms[alarms.length - 1].ack) {
    alarms[alarms.length - 1] = Object.assign({}, alarms[alarms.length - 1], { ack: now, ackBy: sanitize(user) });
    next = Object.assign({}, cur, { alarms: alarms });
  }
  else if (data.op === "resume" && cur.start && cur.paused) {
    if (cur.alarm && alarms.length && !alarms[alarms.length - 1].ack) return createJsonResponse({ status: "error", message: "Kvittera larmet först." });
    if (cur.alarm && alarms.length && !alarms[alarms.length - 1].cleared) alarms[alarms.length - 1] = Object.assign({}, alarms[alarms.length - 1], { cleared: now, clearedBy: sanitize(user) });
    next = Object.assign({}, cur, { start: cur.start + (now - cur.paused), paused: null, alarm: false, alarms: alarms });
  }
  else if (data.op === "reset") next = {};
  else return createJsonResponse({ status: "error", message: "Okänt robotkommando." });
  next.by = sanitize(user);
  rows[rowIndex] = next;
  state.rows = rows;
  sheet.getRange(hit.rowNumber, 9, 1, 3).setValues([[JSON.stringify(state), nowStamp(), sanitize(user)]]);
  // Åtgärdat larm = en tidrapport "Robotlarm" från kvitteringen till omstarten (tiden någon faktiskt arbetade med larmet)
  const cleared = data.op === "resume" && cur.alarm ? next.alarms[next.alarms.length - 1] : null;
  if (cleared && cleared.cleared) logRobotAlarmReport(stall, rowIndex, cleared, data.place, user);
  return createJsonResponse({ status: "success", robotState: state, serverNow: now });
}

// ==========================================
// 4c4. EGENKONTROLL
// En mall per jobbtyp (EK_TEMPLATES). Föraren fyller i i fält: kontrollpunkter
// (ja/nej/ej aktuellt), mätvärden med gränser, text och foton. "Nej" eller ett
// värde utanför gränsen är en avvikelse och kräver en åtgärd. Signerad egenkontroll
// blir en PDF i Drive-mappen "Egenkontroller". Mallarna är förslag – justera fritt,
// höj "version" när innehållet ändras så att gamla kontroller visar vilken mall de följde.
// ==========================================
const EK_TEMPLATES = {
  fasad: {
    name: "Egenkontroll – fasadmålning", version: 1, match: "fasad|målning|måla|fönster|snickeri", exclude: "linje",
    sections: [
      { id: "fore", title: "Före start", items: [
        { id: "underlag", type: "check", label: "Underlaget är tvättat och fritt från smuts, mögel och alger", req: true },
        { id: "skrapat", type: "check", label: "Löst sittande färg är bortskrapad och renskrapat trä är grundat", req: true },
        { id: "skador", type: "check", label: "Röta och skador är kontrollerade – åtgärdade eller anmälda till kunden", req: true },
        { id: "fuktkvot", type: "number", label: "Fuktkvot i träet (högsta uppmätta)", unit: "%", max: 18, req: true, help: "Mät på flera ställen, även i solsidan och nära marken." },
        { id: "skydd", type: "check", label: "Fönster, växter, mark och fordon är skyddade", req: true },
        { id: "stallning", type: "check", label: "Ställning/lift är kontrollerad (förankring, räcken, märkning)", req: true },
        { id: "kulor", type: "check", label: "Produkt och kulör stämmer med beställningen (provyta godkänd av kund där det behövs)", req: true },
        { id: "produkt", type: "text", label: "Produkt och kulör", req: true, help: "T.ex. Alcro Bestå Täckfärg, NCS S 5040-Y80R" },
        { id: "batch", type: "text", label: "Tillverkningsnummer (batch) på burkarna" },
        { id: "foto_fore", type: "photo", label: "Foton före start (en per fasad)", req: true }
      ] },
      { id: "s1", title: "Strykning 1", items: [
        { id: "datum", type: "date", label: "Datum", req: true },
        { id: "lufttemp", type: "number", label: "Lufttemperatur", unit: "°C", min: 5, req: true, help: "Följ färgens produktblad – för många färger minst +5 °C." },
        { id: "yttemp", type: "number", label: "Yttemperatur på underlaget", unit: "°C", min: 5 },
        { id: "rf", type: "number", label: "Relativ luftfuktighet", unit: "%", max: 80, req: true },
        { id: "vader", type: "check", label: "Inget regn, ingen dagg och inget direkt starkt solsken på ytan under målning och torktid", req: true },
        { id: "atgang", type: "number", label: "Färgåtgång", unit: "liter" }
      ] },
      { id: "s2", title: "Strykning 2", items: [
        { id: "datum", type: "date", label: "Datum", req: true },
        { id: "lufttemp", type: "number", label: "Lufttemperatur", unit: "°C", min: 5, req: true },
        { id: "yttemp", type: "number", label: "Yttemperatur på underlaget", unit: "°C", min: 5 },
        { id: "rf", type: "number", label: "Relativ luftfuktighet", unit: "%", max: 80, req: true },
        { id: "torktid", type: "check", label: "Torktiden mellan strykningarna enligt produktbladet har hållits", req: true },
        { id: "vader", type: "check", label: "Inget regn, ingen dagg och inget direkt starkt solsken på ytan under målning och torktid", req: true },
        { id: "atgang", type: "number", label: "Färgåtgång", unit: "liter" }
      ] },
      { id: "efter", title: "Slutkontroll", items: [
        { id: "tackning", type: "check", label: "Jämn täckning – inga rinningar, missade partier eller färgstänk", req: true },
        { id: "detaljer", type: "check", label: "Fönster, foder, knutar och vindskivor är utförda enligt beställningen", req: true },
        { id: "stadning", type: "check", label: "Skyddstäckning borttagen, städat, färgrester omhändertagna som farligt avfall", req: true },
        { id: "foto_efter", type: "photo", label: "Foton efter (samma vinklar som före)", req: true },
        { id: "genomgang", type: "check", label: "Slutgenomgång gjord med kunden" }
      ] }
    ]
  },
  linje: {
    name: "Egenkontroll – linjemålning", version: 1, match: "linje|p-plats|parkering|vägmarkering",
    sections: [
      { id: "fore", title: "Före start", items: [
        { id: "ta", type: "check", label: "Avstängning/TA-plan enligt beställningen – skyltar och avspärrning är på plats", req: true },
        { id: "matt", type: "check", label: "Utsättning och mått är kontrollerade mot ritningen", req: true },
        { id: "underlag", type: "check", label: "Ytan är sopad, torr och fri från grus, löv, olja och is", req: true },
        { id: "gammal", type: "check", label: "Gammal markering är borttagen eller godkänd att måla över", req: true },
        { id: "lufttemp", type: "number", label: "Lufttemperatur", unit: "°C", min: 5, req: true, help: "Följ produktbladet – kallplast och vissa färger kräver högre temperatur." },
        { id: "yttemp", type: "number", label: "Yttemperatur på asfalten", unit: "°C", min: 5, req: true },
        { id: "rf", type: "number", label: "Relativ luftfuktighet", unit: "%", max: 85 },
        { id: "produkt", type: "text", label: "Material och kulör", req: true, help: "T.ex. vägmarkeringsfärg vit, termoplast, glaspärlor" },
        { id: "batch", type: "text", label: "Tillverkningsnummer (batch)" },
        { id: "foto_fore", type: "photo", label: "Foton före start", req: true }
      ] },
      { id: "utf", title: "Utförande", items: [
        { id: "datum", type: "date", label: "Datum", req: true },
        { id: "platser", type: "number", label: "Antal p-platser", unit: "st" },
        { id: "meter", type: "number", label: "Linje totalt", unit: "m" },
        { id: "bredd", type: "number", label: "Linjebredd", unit: "mm", req: true },
        { id: "atgang", type: "number", label: "Materialåtgång", unit: "liter/kg" },
        { id: "parlor", type: "check", label: "Glaspärlor är påförda enligt beställningen" },
        { id: "torktid", type: "check", label: "Ytan var avstängd tills markeringen var torr", req: true }
      ] },
      { id: "efter", title: "Slutkontroll", items: [
        { id: "linjer", type: "check", label: "Raka, jämna linjer med skarpa kanter – mått enligt ritningen", req: true },
        { id: "symboler", type: "check", label: "Symboler och text (HCP, elbil, pilar) är utförda enligt beställningen" },
        { id: "stadning", type: "check", label: "Avstängning borttagen, städat, material- och färgrester omhändertagna", req: true },
        { id: "foto_efter", type: "photo", label: "Foton efter (samma vinklar som före)", req: true },
        { id: "kund", type: "check", label: "Kunden är informerad om att ytan är klar" }
      ] }
    ]
  },
  sno: {
    name: "Egenkontroll – snöröjning och halkbekämpning", version: 1, match: "snö|plog|sand|halk|salt",
    sections: [
      { id: "pass", title: "Passet", items: [
        { id: "datum", type: "date", label: "Datum", req: true },
        { id: "tid", type: "text", label: "Klockslag (start–slut)", req: true, help: "T.ex. 04:30–06:15" },
        { id: "snodjup", type: "number", label: "Snödjup när du kom", unit: "cm" },
        { id: "vader", type: "select", label: "Väglag", options: ["Snö", "Snömodd", "Is/halka", "Underkylt regn", "Torrt"], req: true }
      ] },
      { id: "atgard", title: "Åtgärder", items: [
        { id: "plogat", type: "check", label: "Plogat enligt avtalet (körytor, parkering, infarter)", req: true },
        { id: "gangytor", type: "check", label: "Gångytor, trappor och entréer är skottade" },
        { id: "sandat", type: "check", label: "Sandat/saltat där det behövs" },
        { id: "material", type: "text", label: "Material och ungefärlig mängd", help: "T.ex. sand 0–4, 2 skopor" },
        { id: "upplag", type: "check", label: "Snön är lagd där det är tillåtet – skymmer inte sikt, brandvägar eller brunnar", req: true }
      ] },
      { id: "kontroll", title: "Kontroll", items: [
        { id: "skador", type: "check", label: "Inga skador på fastighet, bilar eller utrustning", req: true, help: "Svara Nej om något skadats – skriv vad och vem som informerats." },
        { id: "hinder", type: "check", label: "Inga hinder eller risker lämnade (snövallar vid övergångar, halka kvar)", req: true },
        { id: "foto", type: "photo", label: "Foto efter (rekommenderas – bra underlag vid halkolyckor)" }
      ] }
    ]
  },
  risk: {
    name: "Riskbedömning – arbetsmiljö", version: 1, always: true,
    sections: [
      { id: "arbete", title: "Arbetet", items: [
        { id: "info", type: "info", label: "Gör riskbedömningen före ett nytt arbete, på en ny plats eller när något ändras. Svara Nej om risken inte är omhändertagen – skriv då vad som görs innan start." },
        { id: "moment", type: "textarea", label: "Vad ska göras?", req: true }
      ] },
      { id: "risker", title: "Risker", items: [
        { id: "fall", type: "check", label: "Fall från höjd: ställning, lift eller stege är kontrollerad och fallskydd används", req: true },
        { id: "trafik", type: "check", label: "Trafik: avspärrning, varselkläder och säkert avstånd till fordon", req: true },
        { id: "maskin", type: "check", label: "Maskiner och verktyg: kontrollerade, skydd på plats, behörighet finns", req: true },
        { id: "kemi", type: "check", label: "Kemikalier: säkerhetsdatablad finns, rätt skyddsutrustning används", req: true },
        { id: "buller", type: "check", label: "Buller, damm och vibrationer: hörsel- och andningsskydd används", req: true },
        { id: "ledningar", type: "check", label: "Grävning: ledningsanvisning finns, kablar och rör är utmärkta", req: true },
        { id: "vader", type: "check", label: "Väder, kyla, värme och halka är omhändertaget", req: true },
        { id: "ensam", type: "check", label: "Ensamarbete: någon vet var du är och när du ska vara klar", req: true },
        { id: "forsta", type: "check", label: "Första hjälpen och brandsläckare finns på plats", req: true },
        { id: "ovrigt", type: "textarea", label: "Andra risker och vad som görs åt dem" }
      ] },
      { id: "bedomning", title: "Bedömning", items: [
        { id: "niva", type: "select", label: "Samlad risknivå efter åtgärderna", options: ["Låg", "Medel", "Hög"], devOptions: ["Hög"], req: true,
          help: "Hög = arbetet får inte starta förrän risken är åtgärdad." }
      ] }
    ]
  },
  tillbud: {
    name: "Tillbud, olycka eller riskobservation", version: 1, free: true, notify: true,
    sections: [
      { id: "handelse", title: "Händelsen", items: [
        { id: "info", type: "info", label: "Allvarliga olyckor och allvarliga tillbud ska anmälas till Arbetsmiljöverket utan dröjsmål. Ring arbetsledningen direkt – rapporten här ersätter inte det." },
        { id: "typ", type: "select", label: "Vad gäller det?", options: ["Riskobservation", "Tillbud (nära olycka)", "Olycka med skada"], req: true },
        { id: "datum", type: "date", label: "Datum", req: true },
        { id: "tid", type: "text", label: "Klockslag", req: true },
        { id: "plats", type: "text", label: "Plats", req: true },
        { id: "vad", type: "textarea", label: "Vad hände eller vad såg du?", req: true },
        { id: "skada", type: "select", label: "Personskada?", options: ["Nej", "Lindrig", "Allvarlig"], req: true },
        { id: "orsak", type: "textarea", label: "Varför tror du att det hände?" },
        { id: "forslag", type: "textarea", label: "Vad kan vi göra så att det inte händer igen?" },
        { id: "foto", type: "photo", label: "Foto (om det går)" }
      ] }
    ]
  }
};

const EK_HEADERS = ["EK-ID", "Mall", "Mallversion", "Koppling", "Kund", "Plats", "Status", "Svar (JSON)",
  "Skapad", "Skapad av", "Uppdaterad", "Uppdaterad av", "Signerad av", "Signerad", "PDF (Drive-ID)"];

function getEkSheet() { return getSheetOrCreate(getSS(), "Egenkontroller", EK_HEADERS); }

function ekFromRow(r) {
  return { id: String(r[0]), template: String(r[1]), version: Number(r[2]) || 1, link: String(r[3] || ""), customer: String(r[4] || ""),
    place: String(r[5] || ""), status: String(r[6] || "pågår"), answers: parseJsonCell(r[7], {}),
    created: String(r[8] || ""), createdBy: String(r[9] || ""), updated: String(r[10] || ""), updatedBy: String(r[11] || ""),
    signedBy: String(r[12] || ""), signed: String(r[13] || ""), pdfId: String(r[14] || ""),
    pdfUrl: r[14] ? "https://drive.google.com/file/d/" + r[14] + "/view" : "" };
}

function ekToRow(e) {
  return [e.id, e.template, e.version, e.link, e.customer, e.place, e.status, JSON.stringify(e.answers || {}),
    e.created, e.createdBy, e.updated, e.updatedBy, e.signedBy, e.signed, e.pdfId];
}

// Vad som saknas och vilka avvikelser som finns. Samma regler som i appen (egenkontroll.js).
function ekCheck(tpl, answers) {
  const missing = [], deviations = [];
  tpl.sections.forEach(sec => sec.items.forEach(it => {
    const key = sec.id + "." + it.id;
    const a = answers[key] || {};
    const v = a.v;
    if (it.type === "info") return;
    const empty = it.type === "photo" ? !(a.photos && a.photos.length) : (v === undefined || v === null || v === "");
    if (empty) { if (it.req) missing.push(sec.title + ": " + it.label); return; }
    let dev = false;
    if (it.type === "check" && v === "nej") dev = true;
    if (it.type === "select" && (it.devOptions || []).indexOf(v) !== -1) dev = true;
    if (it.type === "number") {
      const n = Number(String(v).replace(",", "."));
      if ((it.min !== undefined && n < it.min) || (it.max !== undefined && n > it.max)) dev = true;
    }
    if (dev) deviations.push({ key: key, label: sec.title + ": " + it.label, value: v, note: String(a.note || "") });
  }));
  return { missing: missing, deviations: deviations, deviationsWithoutAction: deviations.filter(d => !d.note.trim()) };
}

function handleGetEk(data, auth) {
  const rows = getEkSheet().getDataRange().getValues();
  // Vilket bolag varje person tillhör (för att admin på Klaryta bara ska se Klarytas kontroller)
  const staffCompany = {};
  const staff = getStaffSheet();
  if (staff) staff.getDataRange().getValues().slice(1).forEach(r => { if (r[0]) staffCompany[String(r[0]).trim()] = companyOf(r[6]); });
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    const e = ekFromRow(rows[i]);
    if (data.id && e.id !== data.id) continue;
    if (data.link && e.link !== data.link) continue;
    if (!auth.isAdmin && e.createdBy !== auth.user && !data.id) continue;
    if (auth.isAdmin && !inScope(auth, staffCompany[e.createdBy] || "LPV") && e.createdBy !== auth.user) continue;
    list.push(e);
  }
  return createJsonResponse({ status: "success", templates: EK_TEMPLATES, items: list.reverse().slice(0, 200) });
}

// Sparar svar. Bara de punkter som skickas ändras (två personer kan fylla i samma kontroll).
function handleSaveEk(input, user) {
  if (!input) return createJsonResponse({ status: "error", message: "Ingen egenkontroll skickades." });
  const tpl = EK_TEMPLATES[input.template];
  const sheet = getEkSheet();
  const hit = input.id ? findRowById(sheet, input.id) : null;
  const old = hit ? ekFromRow(hit.row) : null;
  if (!old && !tpl) return createJsonResponse({ status: "error", message: "Okänd mall." });
  if (old && old.status === "klar") return createJsonResponse({ status: "error", message: "Egenkontrollen är signerad och kan inte ändras." });
  const t = old ? EK_TEMPLATES[old.template] : tpl;
  const valid = {};
  t.sections.forEach(sec => sec.items.forEach(it => { valid[sec.id + "." + it.id] = it; }));
  const answers = old ? old.answers : {};
  const photoId = (v) => /^[A-Za-z0-9_-]{10,100}$/.test(String(v || "")) ? String(v) : "";
  Object.keys(input.answers || {}).forEach(key => {
    const it = valid[key];
    if (!it) return;
    const a = input.answers[key] || {};
    let v = a.v;
    if (it.type === "check") v = ["ja", "nej", "ea"].indexOf(v) !== -1 ? v : "";
    else if (it.type === "number") v = v === "" || v === null || v === undefined ? "" : String(v).replace(",", ".").replace(/[^0-9.\-]/g, "").slice(0, 12);
    else if (it.type === "date") v = /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? v : "";
    else if (it.type === "select") v = (it.options || []).indexOf(v) !== -1 ? v : "";
    else if (it.type === "info") return;
    else v = sanitize(v).slice(0, it.type === "textarea" ? 2000 : 500);
    answers[key] = { v: v, note: sanitize(a.note).slice(0, 1000), photos: (Array.isArray(a.photos) ? a.photos : []).map(photoId).filter(Boolean).slice(0, 12),
      by: sanitize(user), at: nowStamp() };
  });
  const e = old || { id: "EK-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Europe/Stockholm", "yyyyMMdd-HHmmss"),
    template: input.template, version: tpl.version, link: sanitize(input.link).slice(0, 60), customer: sanitize(input.customer).slice(0, 100),
    place: sanitize(input.place).slice(0, 150), status: "pågår", created: nowStamp(), createdBy: sanitize(user), signedBy: "", signed: "", pdfId: "" };
  e.answers = answers; e.updated = nowStamp(); e.updatedBy = sanitize(user);
  upsertById(sheet, ekToRow(e));
  return createJsonResponse({ status: "success", item: e, check: ekCheck(t, answers) });
}

function handleAddEkPhoto(imageBase64) {
  if (!imageBase64 || String(imageBase64).length > 8000000) return createJsonResponse({ status: "error", message: "Bilden saknas eller är för stor." });
  const fileId = saveImageToDrive(imageBase64, "Egenkontroller", "ek_" + Date.now() + ".jpg");
  return createJsonResponse({ status: "success", photo: { id: fileId, url: driveImageUrl(fileId) } });
}

function handleSignEk(data, user) {
  const sheet = getEkSheet();
  const hit = findRowById(sheet, data.id);
  if (!hit) return createJsonResponse({ status: "error", message: "Egenkontrollen hittades inte." });
  const e = ekFromRow(hit.row);
  if (e.status === "klar") return createJsonResponse({ status: "error", message: "Redan signerad." });
  const tpl = EK_TEMPLATES[e.template];
  const check = ekCheck(tpl, e.answers);
  if (check.missing.length) return createJsonResponse({ status: "error", message: "Det saknas " + check.missing.length + " punkter.", check: check });
  if (check.deviationsWithoutAction.length) return createJsonResponse({ status: "error", message: "Skriv vilken åtgärd som gjorts för varje avvikelse.", check: check });
  const name = sanitize(data.name).slice(0, 80);
  if (name.length < 2) return createJsonResponse({ status: "error", message: "Skriv ditt namn för att signera." });
  e.status = "klar"; e.signedBy = name + (name !== sanitize(user) ? " (" + sanitize(user) + ")" : ""); e.signed = nowStamp();
  let pdfNote = "";
  try { e.pdfId = buildEkPdf(e, tpl, check).getId(); } catch (err) { pdfNote = "PDF kunde inte skapas: " + err.message; }
  upsertById(sheet, ekToRow(e));
  // Tillbud m.m.: arbetsledningen får det direkt
  if (tpl.notify) {
    try {
      const to = CONFIG.ADMIN_EMAIL || Session.getEffectiveUser().getEmail();
      const a = (k) => ((e.answers[k] || {}).v || "");
      if (to) MailApp.sendEmail({ to: to, subject: "⚠️ " + (a("handelse.typ") || tpl.name) + " – rapport från " + sanitize(user),
        body: tpl.name + " (" + e.id + ")\n\nTyp: " + a("handelse.typ") + "\nNär: " + a("handelse.datum") + " " + a("handelse.tid") + "\nPlats: " + a("handelse.plats") +
          "\nPersonskada: " + a("handelse.skada") + "\n\nVad hände:\n" + a("handelse.vad") + "\n\nOrsak:\n" + a("handelse.orsak") + "\n\nFörslag:\n" + a("handelse.forslag") +
          (e.pdfId ? "\n\nPDF: https://drive.google.com/file/d/" + e.pdfId + "/view" : ""),
        attachments: e.pdfId ? [DriveApp.getFileById(e.pdfId).getBlob()] : [] });
    } catch (err) { pdfNote = (pdfNote ? pdfNote + " " : "") + "Mejlet till arbetsledningen kunde inte skickas: " + err.message; }
  }
  return createJsonResponse({ status: "success", item: ekFromRow(ekToRow(e)), pdfNote: pdfNote });
}

function buildEkPdf(e, tpl, check) {
  // Varumärke: från den kopplade offerten, annars bolaget som personen som startade kontrollen tillhör
  let brand = "";
  const offerHit = e.link ? findRowById(getOfferSheet(), e.link) : null;
  if (offerHit) brand = offerFromRow(offerHit.row).brand;
  if (!brand) { const st = getStaffSheet() ? findStaffRow(getStaffSheet(), e.createdBy) : null; brand = st && companyOf(st.row[6]) === "Klaryta" ? "klaryta" : "lpv"; }
  const settings = settingsForBrand(brand);
  const logo = brandLogoHtml(brand, 48);
  const valueText = (it, a) => it.type === "check" ? ({ ja: "✔ Ja", nej: "✘ Nej", ea: "Ej aktuellt" }[a.v] || "–")
    : it.type === "photo" ? ((a.photos || []).length + " foto")
    : it.type === "textarea" ? "" : escapeHtml(a.v === undefined || a.v === "" ? "–" : a.v + (it.unit ? " " + it.unit : ""));
  const devKeys = {};
  check.deviations.forEach(d => { devKeys[d.key] = true; });
  const photos = [];
  const sections = tpl.sections.map(sec => "<h2>" + escapeHtml(sec.title) + "</h2><table>" + sec.items.filter(it => it.type !== "info").map(it => {
    const key = sec.id + "." + it.id;
    const a = e.answers[key] || {};
    (a.photos || []).forEach(p => photos.push({ id: p, label: sec.title + ": " + it.label }));
    return "<tr" + (devKeys[key] ? " class='dev'" : "") + "><td>" + escapeHtml(it.label) +
      (it.type === "textarea" ? "<div class='long'>" + escapeHtml(a.v || "–").replace(/\n/g, "<br>") + "</div>" : "") + (a.note ? "<div class='note'>" + (devKeys[key] ? "Åtgärd: " : "") + escapeHtml(a.note) + "</div>" : "") +
      "</td><td class='v'>" + valueText(it, a) + "</td><td class='who'>" + escapeHtml(a.by || "") + "<br>" + escapeHtml(a.at || "") + "</td></tr>";
  }).join("") + "</table>").join("");
  const photoHtml = photos.slice(0, 24).map(p => {
    try {
      const blob = DriveApp.getFileById(p.id).getThumbnail();
      return "<div class='ph'><img src='data:image/png;base64," + Utilities.base64Encode(blob.getBytes()) + "'><div>" + escapeHtml(p.label) + "</div></div>";
    } catch (err) { return ""; }
  }).join("");
  const html = "<html><head><meta charset='utf-8'><style>body{font-family:Arial,sans-serif;font-size:11px;color:#111}h1{font-size:18px;margin:0}h2{font-size:13px;margin:14px 0 4px;border-bottom:1px solid #999}" +
    "table{width:100%;border-collapse:collapse}td{border-bottom:1px solid #ddd;padding:4px;vertical-align:top}.v{width:26%;font-weight:bold}.who{width:110px;color:#666;font-size:9px}" +
    ".dev td{background:#fde8e8}.note{color:#444;font-style:italic;margin-top:2px}.long{margin-top:3px;font-weight:bold}.ph{display:inline-block;width:23%;margin:3px;vertical-align:top;font-size:8px}.ph img{width:100%}.muted{color:#666}</style></head><body>" +
    (logo ? "<div style='float:right'>" + logo + "</div>" : "") + "<h1>" + escapeHtml(tpl.name) + "</h1><p>" + escapeHtml(settings.brandName) + (settings.brandName !== settings.companyName ? " · " + escapeHtml(settings.companyName) : "") + (settings.companyOrgNr ? " · " + escapeHtml(settings.companyOrgNr) : "") + "</p>" +
    "<p><b>Kund:</b> " + escapeHtml(e.customer || "–") + " &nbsp; <b>Plats:</b> " + escapeHtml(e.place || "–") + (e.link ? " &nbsp; <b>Uppdrag:</b> " + escapeHtml(e.link) : "") +
    "<br><b>Egenkontroll:</b> " + escapeHtml(e.id) + " (mall version " + e.version + ") &nbsp; <b>Påbörjad:</b> " + escapeHtml(e.created) + " av " + escapeHtml(e.createdBy) + "</p>" +
    (check.deviations.length ? "<p><b>Avvikelser:</b> " + check.deviations.length + " – markerade i rött med åtgärd.</p>" : "<p><b>Inga avvikelser.</b></p>") +
    sections + (photoHtml ? "<h2>Foton</h2>" + photoHtml : "") +
    "<h2>Signatur</h2><p>Kontrollen är utförd och signerad av <b>" + escapeHtml(e.signedBy) + "</b> " + escapeHtml(e.signed) + ".</p></body></html>";
  const pdf = Utilities.newBlob(html, "text/html", e.id + ".html").getAs("application/pdf").setName(e.id + " " + (e.customer || e.place || "") + ".pdf");
  const root = DriveApp.getFolderById(CONFIG.FOLDER_ID_ROOT_IMAGES);
  const existing = root.getFoldersByName("Egenkontroller");
  const folder = existing.hasNext() ? existing.next() : root.createFolder("Egenkontroller");
  return folder.createFile(pdf);
}

// ==========================================
// 4c5. RADARN (planering på paddan, docs/radar.md)
// Jobben ligger i Gantt_Jobb. Nya kolumner (Startdatum, Starttid, Helgarbete …) hittas på rubrik.
// Ett jobb har en totaltid i timmar; längden i kalendern = timmar ÷ antal tilldelade, fördelat på
// arbetsdagar 07–15. Helger och röda dagar hoppas över om jobbet inte är markerat helgarbete.
// Ändringar som gäller en person blir en notis i personens app (fliken Planeringsnotiser).
// ==========================================
const GANTT_HEADERS = ["Projekt-ID", "Kundnamn", "Fakturerande Bolag", "Titel", "Status", "Startdag-Index", "Timmar", "Skift",
  "Sitelokalization", "Site-Kontakt", "Site-Telefon", "Bemannade Resurs-IDn"];
const GANTT_EXTRA = ["Startdatum", "Starttid", "Helgarbete", "Uppdaterad", "Uppdaterad av"];
const WORK_START = 7, WORK_HOURS = 8;

// Generisk flik i minnet med fasta kolumner + extra kolumner som hittas på rubrik (samma idé som kundregistret)
function loadSheetTable(name, base, extra) {
  const sheet = getSheetOrCreate(getSS(), name, base.concat(extra));
  const rows = sheet.getDataRange().getValues();
  if (!rows.length) rows.push(base.concat(extra));
  const head = rows[0];
  base.forEach((h, i) => { if (head[i] === "" || head[i] === undefined) head[i] = h; });
  const col = {};
  extra.forEach(h => { let i = head.indexOf(h); if (i === -1) { i = Math.max(head.length, base.length); head[i] = h; } col[h] = i; });
  const width = () => Math.max.apply(null, rows.map(r => r.length).concat([head.length]));
  return { rows: rows, col: col, blank: () => new Array(width()).fill(""),
    save: () => { const w = width(); sheet.getRange(1, 1, rows.length, w).setValues(rows.map(r => { const x = r.slice(); while (x.length < w) x.push(""); return x; })); } };
}

// Svenska röda dagar (+ midsommar-, jul- och nyårsafton som är lediga i praktiken)
function easterSunday(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}
const _holidayCache = {};
function swedishHolidays(y) {
  if (_holidayCache[y]) return _holidayCache[y];
  const iso = (d) => Utilities.formatDate(d, Session.getScriptTimeZone() || "Europe/Stockholm", "yyyy-MM-dd");
  const add = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const firstWeekday = (m, from, wd) => { for (let d = from; d < from + 7; d++) { const x = new Date(y, m, d); if (x.getDay() === wd) return x; } };
  const e = easterSunday(y);
  const list = {};
  [[new Date(y, 0, 1), "Nyårsdagen"], [new Date(y, 0, 6), "Trettondedag jul"], [add(e, -2), "Långfredagen"], [e, "Påskdagen"], [add(e, 1), "Annandag påsk"],
   [new Date(y, 4, 1), "Första maj"], [add(e, 39), "Kristi himmelsfärd"], [new Date(y, 5, 6), "Nationaldagen"],
   [add(firstWeekday(5, 20, 6), -1), "Midsommarafton"], [firstWeekday(5, 20, 6), "Midsommardagen"],
   [firstWeekday(9, 31, 6) || firstWeekday(10, 1, 6), "Alla helgons dag"],
   [new Date(y, 11, 24), "Julafton"], [new Date(y, 11, 25), "Juldagen"], [new Date(y, 11, 26), "Annandag jul"], [new Date(y, 11, 31), "Nyårsafton"]
  ].forEach(([d, n]) => { list[iso(d)] = n; });
  _holidayCache[y] = list;
  return list;
}
function isWorkday(d, weekendWork) {
  if (weekendWork) return true;
  if (d.getDay() === 0 || d.getDay() === 6) return false;
  return !swedishHolidays(d.getFullYear())[Utilities.formatDate(d, Session.getScriptTimeZone() || "Europe/Stockholm", "yyyy-MM-dd")];
}

// Vilken sorts resurs varje rad i Personal är. Bara personer kortar ett jobb – maskiner och
// utrustning (ställning, färgspruta …) följer med men arbetar inte timmarna.
let _resourceKinds = null;
function resourceKind(roll, name) {
  const r = String(roll || "").toLowerCase();
  if (/verktyg|ställning|vagn|spruta|utrustning|kärra|släp/.test(r)) return "equipment";
  if (parseMachineModel(String(name || "")) || parseMachineModel(String(roll || ""))) return "machine";
  return "person";
}
function resourceKinds() {
  if (_resourceKinds) return _resourceKinds;
  _resourceKinds = {};
  const sheet = getStaffSheet();
  if (sheet) sheet.getDataRange().getValues().slice(1).forEach(r => { if (r[0]) _resourceKinds[String(r[0]).trim()] = resourceKind(r[3], r[0]); });
  extraResources(null).forEach(x => { _resourceKinds[x.name] = x.kind; });
  return _resourceKinds;
}

// Dagarna ett jobb ligger på: [{ date: "yyyy-MM-dd", from: timme, to: timme }]
function jobSegments(job) {
  if (!job.startDate) return [];
  const kinds = resourceKinds();
  const n = Math.max(1, job.assigned.filter(p => (kinds[p] || "person") === "person").length);
  let left = Math.max(0.25, Number(job.hours) || 8) / n;
  const [y, m, d] = job.startDate.split("-").map(Number);
  const [sh, sm] = String(job.startTime || "07:00").split(":").map(Number);
  let day = new Date(y, m - 1, d), from = Math.max(WORK_START, Math.min(WORK_START + WORK_HOURS - 0.25, sh + (sm || 0) / 60));
  const out = [];
  for (let guard = 0; left > 0.001 && guard < 400; guard++) {
    if (isWorkday(day, job.weekendWork)) {
      const take = Math.min(left, WORK_START + WORK_HOURS - from);
      out.push({ date: Utilities.formatDate(day, Session.getScriptTimeZone() || "Europe/Stockholm", "yyyy-MM-dd"), from: from, to: from + take });
      left -= take;
    }
    day.setDate(day.getDate() + 1); from = WORK_START;
  }
  return out;
}

function ganttJobFromRow(r, col) {
  let assigned = [];
  try { assigned = JSON.parse(r[11] || "[]"); } catch (e) { assigned = String(r[11] || "").split(",").map(s => s.trim()).filter(Boolean); }
  let startDate = r[col["Startdatum"]] instanceof Date ? Utilities.formatDate(r[col["Startdatum"]], Session.getScriptTimeZone() || "Europe/Stockholm", "yyyy-MM-dd") : String(r[col["Startdatum"]] || "");
  // Äldre rader: dag-index räknat från radarns gamla fasta startdatum
  if (!startDate && r[5] !== "" && r[5] !== null && !isNaN(Number(r[5]))) {
    const [by, bm, bd] = RADAR_START_DATE.split("-").map(Number);
    startDate = Utilities.formatDate(new Date(by, bm - 1, bd + Number(r[5])), Session.getScriptTimeZone() || "Europe/Stockholm", "yyyy-MM-dd");
  }
  const st = r[col["Starttid"]];
  return { id: String(r[0]), client: String(r[1] || ""), billingCompany: String(r[2] || "LPV"), title: String(r[3] || ""), status: String(r[4] || ""),
    startDate: startDate, startTime: st instanceof Date ? Utilities.formatDate(st, Session.getScriptTimeZone() || "Europe/Stockholm", "HH:mm") : (String(st || "") || "07:00"),
    hours: Number(r[6]) || 8, siteAddress: String(r[8] || ""), siteContactName: String(r[9] || ""), siteContactPhone: String(r[10] || ""),
    assigned: assigned.map(String), weekendWork: String(r[col["Helgarbete"]]).toLowerCase() === "ja",
    updated: String(r[col["Uppdaterad"]] || ""), updatedBy: String(r[col["Uppdaterad av"]] || "") };
}

function loadGantt() { return loadSheetTable("Gantt_Jobb", GANTT_HEADERS, GANTT_EXTRA); }

function handleRadarJobs(auth) {
  const t = loadGantt();
  const jobs = [];
  for (let i = 1; i < t.rows.length; i++) {
    if (!t.rows[i][0] || !inScope(auth, t.rows[i][2] || "LPV")) continue;
    const j = ganttJobFromRow(t.rows[i], t.col);
    if (j.status === "done" || j.status === "klar") continue;
    j.segments = jobSegments(j);
    jobs.push(j);
  }
  return jobs;
}

function radarSpanText(job) {
  const seg = jobSegments(job);
  if (!seg.length) return "ej inplanerat";
  const day = (s) => { const [y, m, d] = s.split("-").map(Number); return ["sön", "mån", "tis", "ons", "tor", "fre", "lör"][new Date(y, m - 1, d).getDay()] + " " + d + "/" + m; };
  const hh = (h) => String(Math.floor(h)).padStart(2, "0") + ":" + String(Math.round((h % 1) * 60)).padStart(2, "0");
  const a = seg[0], b = seg[seg.length - 1];
  return a.date === b.date ? day(a.date) + " " + hh(a.from) + "–" + hh(b.to) : day(a.date) + " " + hh(a.from) + " – " + day(b.date) + " " + hh(b.to);
}

function addPlanningNotice(person, job, text) {
  getSheetOrCreate(getSS(), "Planeringsnotiser", ["Notis-ID", "Tid", "Person", "Jobb-ID", "Text", "Läst"])
    .appendRow(["N" + Date.now() + Math.floor(Math.random() * 1000), nowStamp(), sanitize(person), sanitize(job.id), sanitize(text).slice(0, 300), ""]);
}

// Sparar ett jobb från radarn. data.job: { id?, title, client, hours, startDate ("" = orderboken), startTime, assigned[], weekendWork, siteAddress }
function handleRadarSaveJob(data, auth) {
  const input = data.job || {};
  const t = loadGantt();
  const C = t.col;
  let i = -1;
  for (let k = 1; k < t.rows.length; k++) if (input.id && String(t.rows[k][0]) === String(input.id)) { i = k; break; }
  const old = i > 0 ? ganttJobFromRow(t.rows[i], C) : null;
  if (old && !inScope(auth, t.rows[i][2] || "LPV")) return createJsonResponse({ status: "error", message: "Åtkomst nekad: jobbet tillhör ett annat bolag." });
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(input.startDate || "")) ? String(input.startDate) : "";
  const time = /^\d{1,2}:\d{2}$/.test(String(input.startTime || "")) ? String(input.startTime) : "07:00";
  const job = {
    // Unikt även om två jobb skapas samma sekund
    id: old ? old.id : "R-" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36),
    client: input.client !== undefined ? sanitize(input.client).slice(0, 100) : (old ? old.client : ""),
    title: input.title !== undefined ? sanitize(input.title).slice(0, 150) : (old ? old.title : ""),
    hours: Math.min(5000, Math.max(0.25, Number(input.hours) || (old ? old.hours : 8))),
    startDate: date, startTime: time,
    assigned: (Array.isArray(input.assigned) ? input.assigned : []).map(a => sanitize(a).slice(0, 60)).filter(Boolean).slice(0, 30),
    weekendWork: input.weekendWork === true,
    siteAddress: input.siteAddress !== undefined ? sanitize(input.siteAddress).slice(0, 200) : (old ? old.siteAddress : "")
  };
  if (!job.title && !job.client) return createJsonResponse({ status: "error", message: "Ange jobbets namn eller kund." });
  // Ingen dubbelbokning: en resurs får inte ligga på två jobb samma tid
  const conflicts = radarConflicts(t, job);
  if (conflicts.length) return createJsonResponse({ status: "conflict", message: conflicts[0].text, conflicts: conflicts });
  let r;
  if (i < 0) { r = t.blank(); t.rows.push(r); i = t.rows.length - 1; r[2] = scopeOf(auth) || "LPV"; r[7] = "Dagpass"; }
  else r = t.rows[i];
  r[0] = job.id; r[1] = job.client; r[3] = job.title; r[4] = job.startDate ? "scheduled" : "unscheduled"; r[5] = "";
  r[6] = job.hours; r[8] = job.siteAddress; r[11] = JSON.stringify(job.assigned);
  r[C["Startdatum"]] = job.startDate; r[C["Starttid"]] = job.startTime; r[C["Helgarbete"]] = job.weekendWork ? "ja" : "";
  r[C["Uppdaterad"]] = nowStamp(); r[C["Uppdaterad av"]] = sanitize(auth.user);
  t.save();

  // Notiser till dem som påverkas
  const label = (j) => (j.title || "Jobb") + (j.client && j.client !== j.title ? " (" + j.client + ")" : "");
  const wasPlanned = old && old.startDate, isPlanned = !!job.startDate;
  const before = old ? radarSpanText(old) : "", after = radarSpanText(job);
  const people = {};
  (old ? old.assigned : []).concat(job.assigned).forEach(p => { people[p] = true; });
  Object.keys(people).forEach(p => {
    const had = wasPlanned && old.assigned.indexOf(p) !== -1, has = isPlanned && job.assigned.indexOf(p) !== -1;
    if (has && !had) addPlanningNotice(p, job, "📅 Inplanerad: " + label(job) + ", " + after);
    else if (had && !has) addPlanningNotice(p, job, "🗑️ Borttagen: " + label(job) + " (" + before + ")");
    else if (has && had && before !== after) addPlanningNotice(p, job, "📅 Ändrat: " + label(job) + " – nu " + after);
  });
  job.segments = jobSegments(job);
  return createJsonResponse({ status: "success", job: Object.assign(job, { billingCompany: r[2] }) });
}

// Krockar för jobbets bemanning mot alla andra inplanerade jobb (alla bolag – en resurs kan bara vara på ett ställe)
function radarConflicts(t, job) {
  const mine = jobSegments(job);
  if (!mine.length || !job.assigned.length) return [];
  const hh = (h) => String(Math.floor(h)).padStart(2, "0") + ":" + String(Math.round((h % 1) * 60)).padStart(2, "0");
  const day = (s) => { const [y, m, d] = s.split("-").map(Number); return ["sön", "mån", "tis", "ons", "tor", "fre", "lör"][new Date(y, m - 1, d).getDay()] + " " + d + "/" + m; };
  const out = [];
  for (let k = 1; k < t.rows.length; k++) {
    if (!t.rows[k][0] || String(t.rows[k][0]) === job.id) continue;
    const other = ganttJobFromRow(t.rows[k], t.col);
    if (!other.startDate || other.status === "done" || other.status === "klar") continue;
    const both = job.assigned.filter(p => other.assigned.indexOf(p) !== -1);
    if (!both.length) continue;
    const segs = jobSegments(other);
    mine.forEach(a => segs.forEach(b => {
      if (a.date === b.date && a.from < b.to - 0.001 && b.from < a.to - 0.001) both.forEach(p => {
        if (!out.some(c => c.person === p && c.jobId === other.id)) out.push({ person: p, jobId: other.id, date: b.date,
          text: p + " är upptagen " + day(b.date) + " " + hh(b.from) + "–" + hh(b.to) + " (" + (other.title || other.client) + ")." });
      });
    }));
  }
  return out;
}

function handleRadarDeleteJob(data, auth) {
  const t = loadGantt();
  for (let k = 1; k < t.rows.length; k++) {
    if (String(t.rows[k][0]) !== String(data.id)) continue;
    if (!inScope(auth, t.rows[k][2] || "LPV")) return createJsonResponse({ status: "error", message: "Åtkomst nekad." });
    const job = ganttJobFromRow(t.rows[k], t.col);
    if (job.startDate) job.assigned.forEach(p => addPlanningNotice(p, job, "🗑️ Borttagen: " + (job.title || "Jobb") + " (" + radarSpanText(job) + ")"));
    t.rows.splice(k, 1);
    t.save();
    getSS().getSheetByName("Gantt_Jobb").deleteRow(t.rows.length + 1); // sista raden blev över efter splice
    return createJsonResponse({ status: "success" });
  }
  return createJsonResponse({ status: "error", message: "Jobbet hittades inte." });
}

function handleGetNotices(auth) {
  const sheet = getSS().getSheetByName("Planeringsnotiser");
  if (!sheet) return createJsonResponse({ status: "success", notices: [] });
  const rows = sheet.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][2]).trim() === String(auth.user).trim() && !rows[i][5]) out.push({ id: String(rows[i][0]), at: String(rows[i][1]), jobId: String(rows[i][3]), text: String(rows[i][4]) });
  }
  return createJsonResponse({ status: "success", notices: out.slice(-20).reverse() });
}

function handleMarkNoticesRead(data, auth) {
  const sheet = getSS().getSheetByName("Planeringsnotiser");
  if (!sheet) return createJsonResponse({ status: "success" });
  const ids = (Array.isArray(data.ids) ? data.ids : []).map(String);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (ids.indexOf(String(rows[i][0])) !== -1 && String(rows[i][2]).trim() === String(auth.user).trim()) sheet.getRange(i + 1, 6).setValue(nowStamp());
  }
  return createJsonResponse({ status: "success" });
}

// ==========================================
// 4c6. RESURSER: maskiner och utrustning för radarn
// Fliken Resurser (ställningskärra, färgspruta, lift …) + traktorerna i fliken Traktorer.
// Kulan görs av AI utifrån tillverkare och modell, samma stil som traktorkulorna.
// En resurs bokas på jobb med sitt namn (som personalen) – namnen måste vara unika.
// ==========================================
const RES_HEADERS = ["Resurs-ID", "Namn", "Typ", "Tillverkare & modell", "Bolag", "AI-kula (Drive-ID)", "Aktiv", "Anteckning", "Uppdaterad"];
function getResourceSheet() { return getSheetOrCreate(getSS(), "Resurser", RES_HEADERS); }

// Maskiner och utrustning utöver personalen. Traktorerna är gemensamma (snön är gemensam).
function extraResources(auth) {
  const out = [];
  const taken = {};
  const st = getStaffSheet();
  if (st) st.getDataRange().getValues().slice(1).forEach(r => { if (r[0]) taken[String(r[0]).trim()] = true; });
  getResourceSheet().getDataRange().getValues().slice(1).forEach(r => {
    if (!r[0] || String(r[6]).toLowerCase() === "nej" || !inScope(auth, r[4] || "LPV")) return;
    const name = String(r[1] || "").trim();
    if (!name || taken[name]) return;
    taken[name] = true;
    out.push({ id: String(r[0]), name: name, kind: String(r[2]) === "maskin" ? "machine" : "equipment", model: String(r[3] || ""),
      ownerCompany: String(r[4] || "LPV").toLowerCase(), avatarUrl: driveImageUrl(String(r[5] || "")), source: "resurs" });
  });
  const fleet = getSS().getSheetByName("Traktorer");
  if (fleet) fleet.getDataRange().getValues().slice(1).forEach(r => {
    if (!r[0] || (r[4] !== "" && !isTrue(r[4]))) return;
    let name = String(r[1] || "").trim() || String(r[0]);
    if (taken[name]) name = name + " (" + (String(r[3] || "").trim() || r[0]) + ")";
    if (taken[name]) return;
    taken[name] = true;
    out.push({ id: String(r[0]), name: name, kind: "machine", model: String(r[1] || ""), ownerCompany: "lpv",
      avatarUrl: driveImageUrl(String(r[5] || "")), source: "traktor" });
  });
  return out;
}

function handleRadarSaveResource(data, auth) {
  const input = data.resource || {};
  const name = sanitize(input.name).replace(/\s+/g, " ").slice(0, 60);
  if (!name) return createJsonResponse({ status: "error", message: "Skriv resursens namn." });
  const sheet = getResourceSheet();
  const hit = input.id ? findRowById(sheet, input.id) : null;
  if (hit && !inScope(auth, hit.row[4] || "LPV")) return createJsonResponse({ status: "error", message: "Åtkomst nekad." });
  const oldName = hit ? String(hit.row[1]) : "";
  // Namnet måste vara unikt bland personal och resurser – jobben bokar på namnet
  if (name !== oldName) {
    const st = getStaffSheet();
    const staffNames = st ? st.getDataRange().getValues().slice(1).map(r => String(r[0]).trim()) : [];
    const resNames = sheet.getDataRange().getValues().slice(1).map(r => String(r[1]).trim());
    if (staffNames.indexOf(name) !== -1 || resNames.indexOf(name) !== -1) return createJsonResponse({ status: "error", message: "Namnet " + name + " finns redan." });
  }
  const id = hit ? String(hit.row[0]) : "RES-" + Date.now().toString(36);
  const row = [id, name, input.kind === "machine" ? "maskin" : "utrustning", sanitize(input.model).slice(0, 100),
    hit ? hit.row[4] : (scopeOf(auth) || "LPV"), hit ? hit.row[5] : "", "ja", sanitize(input.note).slice(0, 300), nowStamp()];
  upsertById(sheet, row);
  // Bytt namn: flytta bokningarna till det nya namnet
  if (hit && oldName && oldName !== name) {
    const t = loadGantt();
    t.rows.slice(1).forEach(r => { let a = []; try { a = JSON.parse(r[11] || "[]"); } catch (e) { a = []; }
      if (a.indexOf(oldName) !== -1) r[11] = JSON.stringify(a.map(x => x === oldName ? name : x)); });
    t.save();
  }
  return createJsonResponse({ status: "success", resource: { id: id, name: name, kind: row[2] === "maskin" ? "machine" : "equipment", model: row[3], avatarUrl: driveImageUrl(String(row[5] || "")), source: "resurs" } });
}

function handleRadarRemoveResource(data, auth) {
  const sheet = getResourceSheet();
  const hit = findRowById(sheet, data.id);
  if (!hit || !inScope(auth, hit.row[4] || "LPV")) return createJsonResponse({ status: "error", message: "Resursen hittades inte." });
  sheet.getRange(hit.rowNumber, 7).setValue("nej"); // ligger kvar i arket, syns inte i kulpåsen
  return createJsonResponse({ status: "success" });
}

// AI-kula för en resurs utifrån tillverkare och modell (traktorer använder sin egen funktion)
function handleRadarResourceAvatar(data, auth) {
  if (data.source === "traktor") return handleGenerateTractorAvatar(data.id);
  const sheet = getResourceSheet();
  const hit = findRowById(sheet, data.id);
  if (!hit || !inScope(auth, hit.row[4] || "LPV")) return createJsonResponse({ status: "error", message: "Resursen hittades inte." });
  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) return createJsonResponse({ status: "error", message: "GEMINI_API_KEY saknas i Script Properties." });
  const what = String(hit.row[3] || hit.row[1]);
  const machine = String(hit.row[2]) === "maskin";
  const prompt = "A cheerful, friendly 3D animated character of a " + what + (machine ? " construction machine" : " (work equipment for a painting and property maintenance company)") + ", " +
    "in the playful toy-like style of Bob the Builder: " + (machine ? "big expressive eyes in the windshield, a happy smiling front" : "small friendly cartoon eyes and a happy smile") + ", " +
    "glossy smooth plastic textures, recognisable shape of the real product. Brand colors: " + getBrandColorPrompt(what) + ". " +
    "The character sits centered inside a shiny transparent glass sphere (a marble), soft studio lighting, solid deep navy blue background, square image, no text, no logos.";
  try {
    const response = UrlFetchApp.fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=" + apiKey, {
      method: "post", contentType: "application/json", muteHttpExceptions: true, payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    let json = {};
    try { json = JSON.parse(response.getContentText()); } catch (e) { json = {}; }
    const parts = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) || [];
    const imagePart = parts.find(p => p.inlineData && p.inlineData.data);
    if (response.getResponseCode() !== 200 || !imagePart) return createJsonResponse({ status: "error", message: geminiErrorText(response.getResponseCode(), response.getContentText()) });
    const fileId = saveImageToDrive(imagePart.inlineData.data, "Resurs-kulor", hit.row[0] + "_" + Date.now() + ".jpg");
    const fresh = findRowById(sheet, data.id);
    if (fresh) sheet.getRange(fresh.rowNumber, 6).setValue(fileId);
    return createJsonResponse({ status: "success", avatarUrl: driveImageUrl(fileId) });
  } catch (err) {
    return createJsonResponse({ status: "error", message: "AI-fel: " + err.message });
  }
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

// ---------- LOGGOR & FÖRETAGSUPPGIFTER PER VARUMÄRKE ----------
// Loggorna ligger i appens mapp loggor/ på webbplatsen. Adressen till webbplatsen sparas när appen
// anropar servern (SITE_URL i Skriptegenskaper), så dev och prod hämtar var sin. Cachas i 6 timmar.
const BRAND_LOGO_FILES = { lpv: "lpv.png", fasadmalarna: "fasadmalarna.png", linjemalarna: "linjemalarna.png", klaryta: "klaryta.png" };
const DEFAULT_SITE_URL = "https://lellel.github.io/Tidrapport---dev/";

function rememberSiteUrl(site) {
  const url = String(site || "");
  if (!/^https:\/\/[a-z0-9-]+\.github\.io\/[A-Za-z0-9._-]+\/$/.test(url)) return;
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty("SITE_URL") !== url) props.setProperty("SITE_URL", url);
}

function brandLogoBlob(brand) {
  const file = BRAND_LOGO_FILES[brand] || BRAND_LOGO_FILES.lpv;
  const site = PropertiesService.getScriptProperties().getProperty("SITE_URL") || DEFAULT_SITE_URL;
  const cache = CacheService.getScriptCache();
  const key = "logo:" + site + file;
  let b64 = cache.get(key);
  try {
    if (!b64) {
      const res = UrlFetchApp.fetch(site + "loggor/" + file, { muteHttpExceptions: true });
      if (res.getResponseCode() !== 200) throw new Error("HTTP " + res.getResponseCode());
      b64 = Utilities.base64Encode(res.getContent());
      try { cache.put(key, b64, 21600); } catch (e) { /* för stor för cachen – hämtas igen nästa gång */ }
    }
    return Utilities.newBlob(Utilities.base64Decode(b64), "image/png", file);
  } catch (err) {
    // Reserv: logga i Drive (CONFIG.FILE_ID_LOGO) för LPV
    try { if (CONFIG.FILE_ID_LOGO && (!brand || brand === "lpv")) return DriveApp.getFileById(CONFIG.FILE_ID_LOGO).getBlob(); } catch (e) { /* ingen logga */ }
    return null;
  }
}

function brandLogoHtml(brand, height) {
  const blob = brandLogoBlob(brand);
  return blob ? '<img src="data:image/png;base64,' + Utilities.base64Encode(blob.getBytes()) + '" style="display:block;height:' + (height || 60) + 'px;max-width:240px;margin-bottom:10px;">' : "";
}

// Företagsuppgifter: LPV:s från Inställningar. Klaryta har egna rader i fliken Inställningar
// ("Klaryta.companyName", "Klaryta.companyOrgNr" …) – saknas de lämnas fälten tomma i stället för LPV:s.
// Fasad- och linjemålarna är LPV:s varumärken: LPV:s uppgifter men varumärkets namn.
const COMPANY_FIELDS = ["companyName", "companyOrgNr", "companyPhone", "companyEmail", "companyAddress", "companyBankgiro", "companyFTax"];
function settingsForBrand(brand) {
  const settings = getOfferSettings();
  if (brand === "klaryta") {
    const own = {};
    getSettingsSheet().getDataRange().getValues().slice(1).forEach(r => {
      const m = String(r[0] || "").match(/^Klaryta\.(\w+)$/);
      if (m && COMPANY_FIELDS.indexOf(m[1]) !== -1) own[m[1]] = String(r[1] || "");
    });
    COMPANY_FIELDS.forEach(f => { settings[f] = own[f] !== undefined ? own[f] : (f === "companyName" ? "Klaryta AB" : ""); });
  } else if (brand === "fasadmalarna" || brand === "linjemalarna") {
    settings.brandName = BRANDS[brand].label;
  }
  settings.brandName = settings.brandName || settings.companyName;
  return settings;
}

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
  const o = offerFromBaseRow(row);
  const stored = brandFromCell(row[OFFER_BRAND_COLUMN - 1]);
  o.brandSet = !!stored;
  o.brand = stored || guessBrand(o);
  o.hubspot = parseHubspotState(row[OFFER_HUBSPOT_COLUMN - 1]);
  return o;
}

function offerFromBaseRow(row) {
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

function handleGetOffers(auth) {
  const settings = getOfferSettings();
  const rows = getOfferSheet().getDataRange().getValues();
  const offers = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    const o = offerFromRow(rows[i]);
    if (!inScope(auth, o.brand === "klaryta" ? "Klaryta" : "LPV")) continue;
    o.totals = computeOfferTotals(o, settings);
    o.pdfUrl = o.pdfId ? "https://drive.google.com/file/d/" + o.pdfId + "/view" : "";
    offers.push(o);
  }
  const brands = hubspotBrandInfo();
  if (scopeOf(auth) === "Klaryta") Object.keys(brands).forEach(k => { if (k !== "klaryta") delete brands[k]; });
  return createJsonResponse({ status: "success", offers: offers.reverse(), settings: settings, brands: brands, scope: scopeOf(auth) });
}

// Innehållet som kunden ser – ändras det på en skickad offert blir det en ny version
function offerContentKey(o) {
  return JSON.stringify([o.customerName, o.customerType, o.site, o.title, o.description, o.rows, o.deduction, o.deductionPersons, o.validUntil, o.layout || null, o.colorOptions || [], o.facade || null]);
}

function handleSaveOffer(input, savedBy, auth) {
  if (!input) return createJsonResponse({ status: "error", message: "Ingen offert skickades." });
  const settings = getOfferSettings();
  const sheet = getOfferSheet();
  const existing = input.id ? findRowById(sheet, input.id) : null;
  const old = existing ? offerFromRow(existing.row) : null;
  if (scopeOf(auth) === "Klaryta") { input.brand = "klaryta"; input.brandSet = true; }
  else if (scopeOf(auth) === "LPV" && input.brand === "klaryta") input.brand = "";
  if (old && !inScope(auth, old.brand === "klaryta" ? "Klaryta" : "LPV")) return createJsonResponse({ status: "error", message: "Åtkomst nekad: offerten tillhör ett annat bolag." });
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
  // Valt varumärke sparas; annars gissas det (fasad/linje/LPV). Efter utskick ligger det fast.
  let chosenBrand = input.brandSet === true ? cleanBrand(input.brand) : "";
  if (!chosenBrand && old && old.sent) chosenBrand = old.brand;
  offer.brand = chosenBrand || guessBrand(offer);
  offer.brandSet = !!chosenBrand;
  offer.hubspot = old ? old.hubspot : {};
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
  if (old && old.sent && old.brand !== offer.brand) syncOfferToHubspot(sheet, offer, settings);
  else writeOfferExtras(sheet, offer.id, chosenBrand, offer.hubspot);
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
  syncOfferToHubspot(sheet, o);
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
  const logo = brandLogoHtml(o.brand, 60);
  const rowsHtml = o.rows.map(r => "<tr><td>" + escapeHtml(r.text) + (r.deductible && o.deduction !== "inget" && o.customerType === "privat" ? " *" : "") +
    "</td><td style='text-align:right'>" + r.qty + " " + escapeHtml(r.unit) + "</td><td style='text-align:right'>" + moneySv(r.price) +
    "</td><td style='text-align:right'>" + moneySv(r.qty * r.price) + "</td></tr>").join("");
  const html = '<html><head><meta charset="utf-8"><style>' +
    'body{font-family:Arial,sans-serif;font-size:11pt;color:#0f172a;margin:30px;} h1{font-size:20pt;margin:0;color:#0369a1;}' +
    'table{width:100%;border-collapse:collapse;margin-top:14px;} th{background:#f1f5f9;text-align:left;padding:6px;font-size:10pt;} td{padding:6px;border-bottom:1px solid #e2e8f0;font-size:10pt;}' +
    '.tot td{border:none;padding:3px 6px;} .big{font-size:14pt;font-weight:bold;color:#0369a1;} .muted{color:#64748b;font-size:9pt;}</style></head><body>' +
    '<table style="margin:0"><tr><td style="border:none;padding:0">' + logo + '<h1>' + label + '</h1><div class="muted">' + escapeHtml(o.id) + (o.version > 1 ? " · version " + o.version : "") + '</div></td>' +
    '<td style="border:none;padding:0;text-align:right" class="muted"><b>' + escapeHtml(settings.brandName || settings.companyName) + '</b>' +
    (settings.brandName && settings.brandName !== settings.companyName ? '<br>' + escapeHtml(settings.companyName) : '') + '<br>' + escapeHtml(settings.companyAddress) +
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
  const settings = settingsForBrand(o.brand);
  let pdfFile = null, pdfNote = "";
  // Ritningen (PNG från appen) tas bara med om den är en giltig och rimligt stor PNG
  const drawing = /^data:image\/png;base64,[A-Za-z0-9+\/=]+$/.test(String(drawingPng || "")) && String(drawingPng).length < 3000000 ? String(drawingPng) : "";
  try { pdfFile = buildOfferPdf(o, settings, drawing); o.pdfId = pdfFile.getId(); }
  catch (err) { pdfNote = "PDF kunde inte skapas: " + err.message; }
  o.status = "skickad";
  o.sent = nowStamp();
  upsertById(sheet, offerToRow(o));
  syncOfferToHubspot(sheet, o, settings);

  const code = offerLinkCode(o);
  const label = o.type === "ata" ? "tilläggsarbete (ÄTA)" : "offert";
  let emailNote = "";
  if (o.email && /@/.test(o.email)) {
    try {
      const logo = brandLogoBlob(o.brand);
      const link = /^https:\/\/[^\s"<>]+$/.test(String(appUrl || "")) ? appUrl + "?" + o.type + "=" + encodeURIComponent(o.id) + "&code=" + encodeURIComponent(code) : "";
      MailApp.sendEmail({
        to: o.email,
        subject: (o.version > 1 ? "Uppdaterad " : "") + label.charAt(0).toUpperCase() + label.slice(1) + " " + o.id + " från " + settings.brandName,
        htmlBody: (logo ? '<p><img src="cid:logo" alt="' + escapeHtml(settings.brandName) + '" style="height:56px;"></p>' : "") + "<p>Hej " + escapeHtml(o.customerName) + "!</p><p>Här kommer " + (o.version > 1 ? "en uppdaterad " : "vår ") + label + " " + escapeHtml(o.id) +
          (o.title ? " – " + escapeHtml(o.title) : "") + ". Den finns som PDF i bifogad fil." +
          (link ? '</p><p><a href="' + link + '">Klicka här för att godkänna eller avböja</a>' : "") +
          "</p><p>Att betala: <b>" + moneySv(computeOfferTotals(o, settings).toPay) + "</b> (giltig till " + escapeHtml(o.validUntil) + ")</p><p>Vänliga hälsningar<br>" +
          escapeHtml(settings.brandName) + (settings.brandName !== settings.companyName ? "<br>" + escapeHtml(settings.companyName) : "") + "<br>" + escapeHtml(settings.companyPhone) + "</p>",
        attachments: pdfFile ? [pdfFile.getBlob()] : [],
        inlineImages: logo ? { logo: logo } : undefined,
        name: settings.brandName
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
      return createJsonResponse({ status: "error", message: geminiErrorText(response.getResponseCode(), response.getContentText()), beforeId: beforeId });
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
    company: { name: settings.brandName || settings.companyName, phone: settings.companyPhone, email: settings.companyEmail, brand: o.brand || "lpv" }
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
  return createJsonResponse({ status: "success", offer: customerView(o, settingsForBrand(o.brand)) });
}

function handleRespondOffer(data) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return createJsonResponse({ status: "error", message: "Servern var upptagen, försök igen." });
  try {
    const found = findOfferForCode(data);
    if (found.error) return createJsonResponse({ status: "error", message: found.error });
    const o = found.offer;
    const settings = settingsForBrand(o.brand);
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
    syncOfferToHubspot(getOfferSheet(), o, settings);
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
// 4d2. VARUMÄRKEN & HUBSPOT
// Varje offert har ett varumärke. Fasad- och linjeofferter väljs automatiskt,
// övriga är LPV eller Klaryta. Varje varumärke pekar på en HubSpot-nyckel i
// Skriptegenskaper (HUBSPOT_TOKEN_FASAD / _LINJE / _KLARYTA). LPV delar
// fasadmålarnas HubSpot men märks med eget varumärke. Saknas nyckeln står
// offerten som "väntar" och kan skickas i efterhand ("Skicka väntande").
// Varumärke och HubSpot-status ligger i kolumnerna efter "Fakturerad".
// ==========================================
const OFFER_BRAND_COLUMN = OFFER_HEADERS.length + 2;
const OFFER_HUBSPOT_COLUMN = OFFER_HEADERS.length + 3;
const BRANDS = {
  lpv: { label: "LPV", hubspot: "FASAD" },
  fasadmalarna: { label: "Fasadmålarna", hubspot: "FASAD" },
  linjemalarna: { label: "Linjemålarna", hubspot: "LINJE" },
  klaryta: { label: "Klaryta", hubspot: "KLARYTA" }
};
const HUBSPOT_STAGES = { utkast: "contractsent", skickad: "contractsent", "öppnad": "contractsent", "godkänd": "closedwon", "avböjd": "closedlost", makulerad: "closedlost" };

function guessBrand(o) {
  if (o.facade || (o.colorOptions && o.colorOptions.length)) return "fasadmalarna";
  if (o.layout) return "linjemalarna";
  return "lpv";
}

function cleanBrand(value) { return BRANDS[value] ? value : ""; }

// Arket visar namnet ("Fasadmålarna"), koden använder nyckeln ("fasadmalarna")
function brandFromCell(value) {
  const v = String(value || "").trim();
  if (BRANDS[v]) return v;
  return Object.keys(BRANDS).filter(k => BRANDS[k].label === v)[0] || "";
}

function parseHubspotState(cell) {
  if (!cell) return {};
  try { const s = JSON.parse(cell); return s && typeof s === "object" ? s : {}; } catch (e) { return {}; }
}

function ensureOfferExtraHeaders(sheet) {
  const head = sheet.getRange(1, OFFER_INVOICED_COLUMN, 1, 3).getValues()[0];
  if (head[0] && head[1] && head[2]) return;
  sheet.getRange(1, OFFER_INVOICED_COLUMN, 1, 3).setValues([[head[0] || "Fakturerad", "Varumärke", "HubSpot"]])
    .setFontWeight("bold").setBackground("#f3f3f3");
}

function writeOfferExtras(sheet, id, brand, hubspot) {
  const hit = findRowById(sheet, id);
  if (!hit) return;
  ensureOfferExtraHeaders(sheet);
  sheet.getRange(hit.rowNumber, OFFER_BRAND_COLUMN, 1, 2).setValues([[BRANDS[brand] ? BRANDS[brand].label : "", JSON.stringify(hubspot || {})]]);
}

function hubspotTokenFor(brand) {
  const b = BRANDS[brand] || BRANDS.lpv;
  return PropertiesService.getScriptProperties().getProperty("HUBSPOT_TOKEN_" + b.hubspot) || "";
}

// Vilka varumärken som har en HubSpot-nyckel (aldrig själva nyckeln)
function hubspotBrandInfo() {
  const out = {};
  Object.keys(BRANDS).forEach(k => { out[k] = { label: BRANDS[k].label, connected: !!hubspotTokenFor(k) }; });
  return out;
}

function hubspotFetch(token, method, path, body) {
  const res = UrlFetchApp.fetch("https://api.hubapi.com" + path, {
    method: method, contentType: "application/json", muteHttpExceptions: true,
    headers: { Authorization: "Bearer " + token },
    payload: body ? JSON.stringify(body) : undefined
  });
  const code = res.getResponseCode();
  const text = res.getContentText() || "";
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch (e) { json = {}; }
  if (code >= 300) {
    const err = new Error("HubSpot " + code + ": " + String(json.message || text).slice(0, 200));
    err.code = code;
    throw err;
  }
  return json;
}

// Fältet "Varumärke" skapas en gång per HubSpot-konto på kontakter, företag och affärer
function hubspotEnsureSchema(token, account) {
  const props = PropertiesService.getScriptProperties();
  const flag = "HUBSPOT_SCHEMA_OK_" + account;
  if (props.getProperty(flag)) return;
  const groups = { contacts: "contactinformation", companies: "companyinformation", deals: "dealinformation" };
  const options = Object.keys(BRANDS).map((k, i) => ({ label: BRANDS[k].label, value: BRANDS[k].label, displayOrder: i }));
  Object.keys(groups).forEach(obj => {
    try {
      hubspotFetch(token, "post", "/crm/v3/properties/" + obj, {
        name: "varumarke", label: "Varumärke", type: "enumeration", fieldType: "select", groupName: groups[obj], options: options
      });
    } catch (err) {
      if (err.code !== 409) throw err; // 409 = fältet finns redan
    }
  });
  props.setProperty(flag, "1");
}

function hubspotUpsert(token, obj, id, properties) {
  if (id) {
    try { return hubspotFetch(token, "patch", "/crm/v3/objects/" + obj + "/" + id, { properties: properties }).id; }
    catch (err) { if (err.code !== 404) throw err; } // raderad i HubSpot: skapa ny
  }
  return hubspotFetch(token, "post", "/crm/v3/objects/" + obj, { properties: properties }).id;
}

function hubspotSearch(token, obj, property, value) {
  if (!value) return "";
  const res = hubspotFetch(token, "post", "/crm/v3/objects/" + obj + "/search",
    { filterGroups: [{ filters: [{ propertyName: property, operator: "EQ", value: value }] }], limit: 1 });
  return res.results && res.results.length ? String(res.results[0].id) : "";
}

function hubspotAssociate(token, fromObj, fromId, toObj, toId) {
  if (fromId && toId) hubspotFetch(token, "put", "/crm/v4/objects/" + fromObj + "/" + fromId + "/associations/default/" + toObj + "/" + toId);
}

// Skickar kund + affär för en offert. Returnerar nytt HubSpot-tillstånd; kastar aldrig.
function hubspotSyncOffer(o, settings) {
  const brand = cleanBrand(o.brand) || guessBrand(o);
  const account = (BRANDS[brand] || BRANDS.lpv).hubspot;
  const prev = o.hubspot && o.hubspot.account === account ? o.hubspot : {};
  const state = { account: account, contactId: prev.contactId || "", companyId: prev.companyId || "", dealId: prev.dealId || "" };
  const token = hubspotTokenFor(brand);
  if (!token) return Object.assign(state, { status: "väntar", at: nowStamp(), message: "Ingen HubSpot-nyckel för " + BRANDS[brand].label + " ännu." });
  try {
    hubspotEnsureSchema(token, account);
    const label = BRANDS[brand].label;
    const email = /@/.test(o.email) ? o.email.toLowerCase() : "";
    const isNew = !state.contactId && !state.companyId;

    if (o.customerType === "foretag") {
      if (!state.companyId) state.companyId = hubspotSearch(token, "companies", "name", o.customerName);
      const companyProps = { name: o.customerName, phone: o.phone, address: o.site };
      if (isNew) companyProps.varumarke = label;
      state.companyId = hubspotUpsert(token, "companies", state.companyId, companyProps);
    }
    if (o.customerType !== "foretag" || email) {
      if (!state.contactId) state.contactId = hubspotSearch(token, "contacts", "email", email);
      const parts = o.customerType === "foretag" ? [] : String(o.customerName).split(/\s+/);
      const contactProps = { phone: o.phone, address: o.site };
      if (email) contactProps.email = email;
      if (parts.length) { contactProps.firstname = parts[0]; contactProps.lastname = parts.slice(1).join(" "); }
      if (o.customerType === "foretag") contactProps.company = o.customerName;
      if (isNew) contactProps.varumarke = label;
      state.contactId = hubspotUpsert(token, "contacts", state.contactId, contactProps);
    }

    const totals = computeOfferTotals(o, settings);
    const dealProps = {
      dealname: o.id + " – " + (o.title || o.customerName), amount: String(totals.net), pipeline: "default",
      dealstage: HUBSPOT_STAGES[o.status] || "contractsent", varumarke: label,
      description: [o.site, o.pdfId ? "PDF: https://drive.google.com/file/d/" + o.pdfId + "/view" : ""].filter(Boolean).join("\n")
    };
    if (o.status === "godkänd" || o.status === "avböjd") dealProps.closedate = new Date().toISOString();
    const hadDeal = !!state.dealId;
    try { state.dealId = hubspotUpsert(token, "deals", state.dealId, dealProps); }
    catch (err) {
      if (err.code !== 400) throw err;
      // Egen pipeline i HubSpot: spara utan fas hellre än inte alls
      delete dealProps.pipeline; delete dealProps.dealstage;
      state.dealId = hubspotUpsert(token, "deals", state.dealId, dealProps);
    }
    if (!hadDeal) {
      hubspotAssociate(token, "deals", state.dealId, "contacts", state.contactId);
      hubspotAssociate(token, "deals", state.dealId, "companies", state.companyId);
      hubspotAssociate(token, "contacts", state.contactId, "companies", state.companyId);
    }
    return Object.assign(state, { status: "ok", at: nowStamp(), message: "" });
  } catch (err) {
    return Object.assign(state, { status: "fel", at: nowStamp(), message: String(err.message || err).slice(0, 300) });
  }
}

// Synkar en offert och sparar resultatet i arket. Fel i HubSpot stoppar aldrig offertflödet.
function syncOfferToHubspot(sheet, o, settings) {
  if (!o.sent) return o.hubspot || {};
  o.hubspot = hubspotSyncOffer(o, settings || getOfferSettings());
  o.brand = cleanBrand(o.brand) || guessBrand(o);
  o.brandSet = true; // varumärket låses när offerten har skickats
  writeOfferExtras(sheet, o.id, o.brand, o.hubspot);
  return o.hubspot;
}

// "Skicka väntande till HubSpot": skickade offerter som inte är synkade (max 25 per tryck)
function handleHubspotSyncPending() {
  const sheet = getOfferSheet();
  const settings = getOfferSettings();
  const rows = sheet.getDataRange().getValues();
  let done = 0, failed = 0, waiting = 0, remaining = 0;
  const errors = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    const o = offerFromRow(rows[i]);
    if (!o.sent || o.hubspot.status === "ok" || !hubspotTokenFor(o.brand)) {
      if (o.sent && o.hubspot.status !== "ok") waiting++;
      continue;
    }
    if (done + failed >= 25) { remaining++; continue; }
    const s = syncOfferToHubspot(sheet, o, settings);
    if (s.status === "ok") done++; else { failed++; errors.push(o.id + ": " + s.message); }
  }
  return createJsonResponse({ status: "success", synced: done, failed: failed, waiting: waiting, remaining: remaining,
    errors: errors.slice(0, 5), brands: hubspotBrandInfo() });
}

// ---------- KUNDREGISTER (fliken "Kunder", gemensam för ekonomi, radarn, offerter, HubSpot och Fortnox) ----------
// De 13 första kolumnerna är den ursprungliga kundfliken som ekonomi och radarn läser på fast plats.
// HubSpot och Fortnox lägger sina uppgifter i kolumner till höger, som hittas på rubrik (läggs till om de saknas).
// Fliken skrivs alltid tillbaka i sin helhet, så att rader utan Kund-ID och egna kolumner ligger kvar orörda.
// En HubSpot-kund känns igen på konto + typ + HubSpot-ID, en Fortnox-kund på kundnumret. Samma kund från
// båda källorna (samma e-post eller organisationsnummer) blir en rad. Personnummer tas aldrig in här.
const CUSTOMER_HEADERS = ["Kund-ID", "Namn", "Org-/personnr", "E-post", "Fakturerande bolag", "Status", "Kontakt", "Telefon", "Adress",
  "Kundtyp", "ROT/RUT", "Fastighetsbeteckning", "Logo-URL"];
const CUSTOMER_EXTRA = ["Varumärke", "Källa", "HubSpot-typ", "HubSpot-ID", "Affärer (JSON)", "Uppdaterad", "Fortnox-kundnr"];
const HUBSPOT_IMPORT_PROPS = {
  contacts: "firstname,lastname,email,phone,mobilephone,address,zip,city,company,varumarke",
  companies: "name,phone,address,zip,city,varumarke",
  deals: "dealname,amount,dealstage,closedate,createdate,varumarke"
};

function getCustomerSheet() { return getSheetOrCreate(getSS(), "Kunder", CUSTOMER_HEADERS.concat(CUSTOMER_EXTRA)); }

// Hela fliken i minnet: { rows (rubrik + data, alla lika breda), col: {rubrik: index}, save() }
function loadCustomerTable() {
  const sheet = getCustomerSheet();
  const rows = sheet.getDataRange().getValues();
  if (!rows.length) rows.push(CUSTOMER_HEADERS.concat(CUSTOMER_EXTRA));
  const head = rows[0];
  CUSTOMER_HEADERS.forEach((h, i) => { if (head[i] === "" || head[i] === undefined) head[i] = h; });
  const col = {};
  CUSTOMER_EXTRA.forEach(h => {
    let i = head.indexOf(h);
    if (i === -1) { i = Math.max(head.length, CUSTOMER_HEADERS.length); head[i] = h; }
    col[h] = i;
  });
  const width = () => Math.max.apply(null, rows.map(r => r.length).concat([head.length]));
  return {
    rows: rows, col: col,
    blank: function () { return new Array(width()).fill(""); },
    save: function () {
      const w = width();
      const data = rows.map(r => { const x = r.slice(); while (x.length < w) x.push(""); return x; });
      sheet.getRange(1, 1, data.length, w).setValues(data);
      sheet.getRange(1, 1, 1, w).setFontWeight("bold").setBackground("#f3f3f3");
    }
  };
}

const isOrgNr = (v) => { const d = String(v || "").replace(/\D/g, ""); return d.length === 10 && Number(d.slice(2, 4)) >= 20; };

function customerFromRow(r, col) {
  let deals = [];
  try { deals = JSON.parse(r[col["Affärer (JSON)"]] || "[]"); } catch (e) { deals = []; }
  const company = /^(company|foretag|företag)$/i.test(String(r[9] || "")) || (!r[9] && isOrgNr(r[2]));
  return { id: String(r[0] || ""), name: String(r[1] || ""), company: company ? String(r[1] || "") : "", contact: String(r[6] || ""),
    type: company ? "foretag" : "privat", phone: String(r[7] || ""), email: String(r[3] || ""), address: String(r[8] || ""),
    orgnr: isOrgNr(r[2]) ? String(r[2]) : "", brand: String(r[col["Varumärke"]] || ""), account: String(r[col["Källa"]] || ""),
    fortnoxNr: String(r[col["Fortnox-kundnr"]] || ""), deals: deals, updated: String(r[col["Uppdaterad"]] || "") };
}

function handleGetCustomers(auth) {
  const t = loadCustomerTable();
  const list = [];
  for (let i = 1; i < t.rows.length; i++) if (t.rows[i][1] && inScope(auth, t.rows[i][4])) list.push(customerFromRow(t.rows[i], t.col));
  list.sort((a, b) => a.name.localeCompare(b.name, "sv"));
  return createJsonResponse({ status: "success", customers: list });
}

// Index för att hitta en kund: HubSpot-nyckel, Fortnox-nummer, e-post, organisationsnummer, Kund-ID
function customerIndex(t) {
  const idx = { hs: {}, fx: {}, email: {}, org: {}, id: {} };
  for (let i = 1; i < t.rows.length; i++) {
    const r = t.rows[i];
    if (r[col_(t, "HubSpot-ID")]) idx.hs[r[col_(t, "Källa")] + ":" + r[col_(t, "HubSpot-typ")] + ":" + r[col_(t, "HubSpot-ID")]] = i;
    if (r[col_(t, "Fortnox-kundnr")]) idx.fx[String(r[col_(t, "Fortnox-kundnr")])] = i;
    if (r[3]) idx.email[String(r[3]).toLowerCase().trim()] = idx.email[String(r[3]).toLowerCase().trim()] || i;
    if (isOrgNr(r[2])) idx.org[String(r[2]).replace(/\D/g, "")] = i;
    if (r[0]) idx.id[String(r[0])] = i;
  }
  return idx;
}
function col_(t, h) { return t.col[h]; }

// Fyller bara tomma fält – det som redan står i fliken (t.ex. inskrivet för hand) skrivs aldrig över
function fillEmpty(row, i, value) { if (value && (row[i] === "" || row[i] === undefined)) row[i] = value; }

function hubspotImportSteps() {
  const props = PropertiesService.getScriptProperties();
  const steps = [];
  ["FASAD", "LINJE", "KLARYTA"].forEach(account => {
    if (props.getProperty("HUBSPOT_TOKEN_" + account)) ["contacts", "companies", "deals"].forEach(obj => steps.push({ account: account, obj: obj }));
  });
  return steps;
}

function joinAddress(p) {
  return [p.address, [p.zip, p.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

function handleHubspotImport() {
  const started = Date.now();
  const props = PropertiesService.getScriptProperties();
  const steps = hubspotImportSteps();
  if (!steps.length) return createJsonResponse({ status: "error", message: "Ingen HubSpot-nyckel finns ännu." });
  let progress = {};
  try { progress = JSON.parse(props.getProperty("HUBSPOT_IMPORT_PROGRESS") || "{}"); } catch (e) { progress = {}; }
  let step = Number(progress.step) || 0, after = progress.after || "";

  const t = loadCustomerTable();
  const idx = customerIndex(t);
  const C = t.col;
  const counts = { contacts: 0, companies: 0, deals: 0, dealsWithoutCustomer: 0 };
  const stageLabels = {};
  let done = false, error = "";

  // Hittar (eller skapar) raden för en HubSpot-kontakt/ett företag
  const rowFor = (account, type, id, email, orgName) => {
    const key = account + ":" + type + ":" + id;
    let i = idx.hs[key];
    if (i === undefined && idx.id[key] !== undefined) i = idx.id[key];                     // äldre rader: Kund-ID = nyckeln
    if (i === undefined && email && idx.email[email] !== undefined && !t.rows[idx.email[email]][C["HubSpot-ID"]]) i = idx.email[email]; // samma kund från Fortnox
    if (i === undefined && orgName) {
      for (let j = 1; j < t.rows.length; j++) if (!t.rows[j][C["HubSpot-ID"]] && String(t.rows[j][1]).toLowerCase() === orgName.toLowerCase()) { i = j; break; }
    }
    if (i === undefined) { const r = t.blank(); r[0] = key; t.rows.push(r); i = t.rows.length - 1; }
    const r = t.rows[i];
    if (!r[0]) r[0] = key;
    r[C["Källa"]] = account; r[C["HubSpot-typ"]] = type; r[C["HubSpot-ID"]] = id;
    idx.hs[key] = i;
    if (email) idx.email[email] = idx.email[email] || i;
    return r;
  };

  try {
    while (step < steps.length) {
      if (Date.now() - started > 240000) break; // fortsätter vid nästa tryck
      const s = steps[step];
      const token = props.getProperty("HUBSPOT_TOKEN_" + s.account);
      if (s.obj === "deals" && !stageLabels[s.account]) {
        stageLabels[s.account] = {};
        try {
          (hubspotFetch(token, "get", "/crm/v3/pipelines/deals").results || []).forEach(p =>
            (p.stages || []).forEach(st => { stageLabels[s.account][st.id] = st.label; }));
        } catch (e) { /* utan namn på faserna visas id:t */ }
      }
      const path = "/crm/v3/objects/" + s.obj + "?limit=100&properties=" + HUBSPOT_IMPORT_PROPS[s.obj] +
        (s.obj === "deals" ? "&associations=contacts,companies" : "") + (after ? "&after=" + encodeURIComponent(after) : "");
      const page = hubspotFetch(token, "get", path);
      (page.results || []).forEach(item => {
        const p = item.properties || {};
        if (s.obj === "contacts") {
          const email = String(p.email || "").toLowerCase().trim();
          const person = [p.firstname, p.lastname].filter(Boolean).join(" ") || p.email || "";
          const r = rowFor(s.account, "contact", String(item.id), email, "");
          r[1] = p.company || person; r[6] = p.company ? person : r[6];
          fillEmpty(r, 3, email); fillEmpty(r, 7, p.phone || p.mobilephone); fillEmpty(r, 8, joinAddress(p));
          fillEmpty(r, 9, p.company ? "company" : "private"); fillEmpty(r, 10, "none"); fillEmpty(r, 4, s.account === "KLARYTA" ? "Klaryta" : "LPV");
          if (p.varumarke) r[C["Varumärke"]] = p.varumarke;
          if (!r[C["Affärer (JSON)"]]) r[C["Affärer (JSON)"]] = "[]";
          r[C["Uppdaterad"]] = nowStamp();
          counts.contacts++;
        } else if (s.obj === "companies") {
          const r = rowFor(s.account, "company", String(item.id), "", p.name || "");
          r[1] = p.name || r[1];
          fillEmpty(r, 7, p.phone); fillEmpty(r, 8, joinAddress(p)); fillEmpty(r, 9, "company"); fillEmpty(r, 10, "none"); fillEmpty(r, 4, s.account === "KLARYTA" ? "Klaryta" : "LPV");
          if (p.varumarke) r[C["Varumärke"]] = p.varumarke;
          if (!r[C["Affärer (JSON)"]]) r[C["Affärer (JSON)"]] = "[]";
          r[C["Uppdaterad"]] = nowStamp();
          counts.companies++;
        } else {
          // Affären läggs som historik på företaget, annars på kontakten
          const assoc = item.associations || {};
          const firstId = (key) => assoc[key] && assoc[key].results && assoc[key].results.length ? String(assoc[key].results[0].id) : "";
          const ci = idx.hs[s.account + ":company:" + firstId("companies")], pi = idx.hs[s.account + ":contact:" + firstId("contacts")];
          const target = ci !== undefined ? ci : pi;
          if (target === undefined) { counts.dealsWithoutCustomer++; return; }
          const r = t.rows[target];
          let deals = [];
          try { deals = JSON.parse(r[C["Affärer (JSON)"]] || "[]"); } catch (e) { deals = []; }
          const deal = { id: String(item.id), name: p.dealname || "", amount: Number(p.amount) || 0,
            stage: (stageLabels[s.account] || {})[p.dealstage] || p.dealstage || "", stageId: p.dealstage || "",
            closed: String(p.closedate || "").slice(0, 10), created: String(p.createdate || "").slice(0, 10), brand: p.varumarke || "" };
          deals = deals.filter(d => d.id !== deal.id).concat([deal]).sort((a, b) => (b.closed || b.created).localeCompare(a.closed || a.created)).slice(0, 50);
          r[C["Affärer (JSON)"]] = JSON.stringify(deals);
          counts.deals++;
        }
      });
      after = page.paging && page.paging.next && page.paging.next.after ? String(page.paging.next.after) : "";
      if (!after) step++;
      props.setProperty("HUBSPOT_IMPORT_PROGRESS", JSON.stringify({ step: step, after: after }));
    }
    done = step >= steps.length;
  } catch (err) {
    error = String(err.message || err).slice(0, 300);
  }

  t.save(); // även vid fel/avbrott – det som hunnit hämtas sparas
  if (done) props.deleteProperty("HUBSPOT_IMPORT_PROGRESS");
  return createJsonResponse({ status: error ? "error" : "success", message: error ? "HubSpot: " + error + " – det som hann hämtas är sparat, tryck igen." : "",
    done: done, counts: counts, total: t.rows.length - 1 });
}

// Import från Fortnox (kundlista som tabell). Rader: { nr, name, orgnr, type, postnr, city, phone, email, address }
function handleImportCustomers(list, user) {
  if (!Array.isArray(list) || !list.length) return createJsonResponse({ status: "error", message: "Inga kunder skickades." });
  if (list.length > 1000) return createJsonResponse({ status: "error", message: "Högst 1000 kunder per gång." });
  const t = loadCustomerTable();
  const idx = customerIndex(t);
  const C = t.col;
  let created = 0, updated = 0;
  list.forEach(k => {
    const nr = sanitize(k.nr).replace(/\D/g, "").slice(0, 12);
    const name = sanitize(k.name).slice(0, 120);
    if (!nr || !name) return;
    const email = sanitize(k.email).toLowerCase().trim().slice(0, 120);
    const org = isOrgNr(k.orgnr) ? String(k.orgnr).replace(/[^\d-]/g, "") : "";
    const company = !!org || k.type === "foretag";
    const address = [sanitize(k.address), [sanitize(k.postnr), sanitize(k.city)].filter(Boolean).join(" ")].filter(Boolean).join(", ").slice(0, 200);
    let i = idx.fx[nr];
    // Fortnox-kundnumret är unikt: en rad som redan har ett annat Fortnox-nummer är en annan kund
    const free = (j) => j !== undefined && !t.rows[j][C["Fortnox-kundnr"]];
    if (i === undefined && org && free(idx.org[org.replace(/\D/g, "")])) i = idx.org[org.replace(/\D/g, "")];
    if (i === undefined && email && free(idx.email[email])) i = idx.email[email];
    let r;
    if (i === undefined) {
      r = t.blank(); r[0] = "FORTNOX:" + nr; t.rows.push(r); i = t.rows.length - 1; created++;
      r[1] = name; r[C["Källa"]] = "FORTNOX";
    } else {
      r = t.rows[i]; updated++;
      fillEmpty(r, 1, name);
    }
    r[C["Fortnox-kundnr"]] = nr;
    fillEmpty(r, 2, org); fillEmpty(r, 3, email); fillEmpty(r, 7, sanitize(k.phone).slice(0, 40)); fillEmpty(r, 8, address);
    fillEmpty(r, 9, company ? "company" : "private"); fillEmpty(r, 10, "none"); fillEmpty(r, 4, "LPV"); // LPV:s Fortnox
    if (!r[C["Affärer (JSON)"]]) r[C["Affärer (JSON)"]] = "[]";
    r[C["Uppdaterad"]] = nowStamp();
    idx.fx[nr] = i;
    if (email) idx.email[email] = idx.email[email] || i;
    if (org) idx.org[org.replace(/\D/g, "")] = i;
  });
  t.save();
  return createJsonResponse({ status: "success", created: created, updated: updated, total: t.rows.length - 1 });
}

// ==========================================
// 4e. BLACKSTA (grisgården): plan, händelselogg och läkemedelsjournal
// Händelser och journal är append-only: rader ändras/raderas aldrig, en rättelse
// blir en ny rad som pekar på den gamla. Journalen ska sparas i 5 år
// (se docs/blacksta-krav-lagstiftning.md).
// ==========================================
const BL_PLAN_HEADERS = ["Jobb-ID", "Stall", "Titel", "Dag", "Start tim", "Start min", "Minuter", "Status", "Tilldelade (JSON)", "Typ", "Packlista (JSON)", "Uppdaterad", "Uppdaterad av"];
const BL_EVENT_HEADERS = ["Händelse-ID", "Tidpunkt", "Typ", "Stall", "Jobb-ID", "Utförd av", "Beskrivning", "Detaljer (JSON)"];
const BL_MED_HEADERS = ["Post-ID", "Behandlingsdatum", "Klockslag", "Djur/grupp", "Stall", "Orsak/diagnos", "Läkemedel", "Dos", "Behandlingstid (dagar)",
  "Karenstid (dagar)", "Karens slut", "Förskrivande veterinär", "Inköpt från", "Utförd av", "Registrerad", "Rättar post", "Kommentar"];
const BL_EVENT_TYPES = ["slussning", "moment_utfort", "tillsyn", "kastrering", "besok", "karantan", "utlastning", "dodsfall", "ovrigt"];

function blPlanSheet() { return getSheetOrCreate(getSS(), "Blacksta_Plan", BL_PLAN_HEADERS); }
function blEventSheet() { return getSheetOrCreate(getSS(), "Blacksta_Händelser", BL_EVENT_HEADERS); }
function blMedSheet() { return getSheetOrCreate(getSS(), "Läkemedelsjournal", BL_MED_HEADERS); }
function blStamp(d) { return Utilities.formatDate(d || new Date(), Session.getScriptTimeZone() || "Europe/Stockholm", "yyyy-MM-dd HH:mm:ss"); }
function blDateStr(v) {
  return v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone() || "Europe/Stockholm", "yyyy-MM-dd") : String(v || "");
}

function handleBlackstaGetPlan() {
  const rows = blPlanSheet().getDataRange().getValues();
  const jobs = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;
    let assigned = [], packlist = [];
    try { assigned = JSON.parse(r[8] || "[]"); } catch (e) { assigned = []; }
    try { packlist = JSON.parse(r[10] || "[]"); } catch (e) { packlist = []; }
    jobs.push({ id: String(r[0]), client: String(r[1]), title: String(r[2]), dayIndex: Number(r[3]) || 0, startH: Number(r[4]) || 0, startM: Number(r[5]) || 0,
      durM: Number(r[6]) || 60, status: String(r[7] || "scheduled"), assigned: assigned, billingCompany: String(r[9] || ""), packlist: packlist });
  }
  return createJsonResponse({ status: "success", jobs: jobs });
}

// Hela planen sparas på en gång (arbetsledaren på iPad). Max 2000 jobb.
function handleBlackstaSavePlan(jobs, savedBy) {
  if (!Array.isArray(jobs) || jobs.length > 2000) return createJsonResponse({ status: "error", message: "Ogiltig plan." });
  const n = (v, min, max) => { const x = Number(v); return isFinite(x) ? Math.min(max, Math.max(min, Math.round(x))) : min; };
  const stamp = blStamp();
  const out = jobs.filter(j => j && j.id).map(j => [
    sanitize(j.id).slice(0, 60), sanitize(j.client).slice(0, 80), sanitize(j.title).slice(0, 200), n(j.dayIndex, 0, 400), n(j.startH, 0, 23), n(j.startM, 0, 59),
    n(j.durM, 1, 1440), ["scheduled", "unscheduled", "done"].indexOf(j.status) !== -1 ? j.status : "scheduled",
    JSON.stringify((Array.isArray(j.assigned) ? j.assigned : []).slice(0, 20).map(a => sanitize(a).slice(0, 40))),
    sanitize(j.billingCompany).slice(0, 40), JSON.stringify((Array.isArray(j.packlist) ? j.packlist : []).slice(0, 30).map(a => sanitize(a).slice(0, 80))),
    stamp, sanitize(savedBy)
  ]);
  const sheet = blPlanSheet();
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, BL_PLAN_HEADERS.length).clearContent();
  if (out.length) sheet.getRange(2, 1, out.length, BL_PLAN_HEADERS.length).setValues(out);
  return createJsonResponse({ status: "success", saved: out.length, at: stamp });
}

function handleBlackstaLogEvent(ev, user) {
  if (!ev || BL_EVENT_TYPES.indexOf(ev.type) === -1) return createJsonResponse({ status: "error", message: "Okänd händelsetyp." });
  const details = ev.details && typeof ev.details === "object" ? ev.details : {};
  // Lagkrav (sedan 2023-11-01): lokalbedövning OCH allmän smärtlindring före kastrering
  if (ev.type === "kastrering" && !(details.lokalbedovning === true && details.smartlindring === true)) {
    return createJsonResponse({ status: "error", message: "Kastrering får bara registreras när lokalbedövning och smärtlindring har getts." });
  }
  const id = "H-" + Utilities.getUuid().slice(0, 8);
  const cleanDetails = {};
  Object.keys(details).slice(0, 30).forEach(k => {
    const v = details[k];
    cleanDetails[sanitize(k).slice(0, 40)] = typeof v === "boolean" || typeof v === "number" ? v : sanitize(v).slice(0, 300);
  });
  blEventSheet().appendRow([id, blStamp(), ev.type, sanitize(ev.stall).slice(0, 80), sanitize(ev.jobId).slice(0, 60), sanitize(user),
    sanitize(ev.text).slice(0, 500), JSON.stringify(cleanDetails)]);
  return createJsonResponse({ status: "success", id: id });
}

function handleBlackstaGetEvents(data) {
  const rows = blEventSheet().getDataRange().getValues();
  const from = String(data.from || ""), to = String(data.to || "9999");
  const events = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;
    const t = r[1] instanceof Date ? blStamp(r[1]) : String(r[1]);
    if (t.slice(0, 10) < from || t.slice(0, 10) > to) continue;
    if (data.type && r[2] !== data.type) continue;
    let details = {};
    try { details = JSON.parse(r[7] || "{}"); } catch (e) { details = {}; }
    events.push({ id: String(r[0]), time: t, type: String(r[2]), stall: String(r[3]), jobId: String(r[4]), user: String(r[5]), text: String(r[6]), details: details });
  }
  return createJsonResponse({ status: "success", events: events.reverse().slice(0, 1000) });
}

// Läkemedelsjournal: obligatoriska fält enligt Jordbruksverket – djur/grupp, orsak, läkemedel, dos,
// behandlingstid, karenstid (även 0), förskrivande veterinär, datum (+ klockslag om karens < 1 dygn).
function handleBlackstaAddMed(e, user) {
  if (!e) return createJsonResponse({ status: "error", message: "Ingen journalpost skickades." });
  const date = String(e.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return createJsonResponse({ status: "error", message: "Ange behandlingsdatum." });
  const required = { animals: "djur/grupp", reason: "orsak/diagnos", drug: "läkemedel", dose: "dos", vet: "förskrivande veterinär" };
  const missing = Object.keys(required).filter(k => !String(e[k] || "").trim()).map(k => required[k]);
  const withdrawal = Number(e.withdrawalDays);
  const treatDays = Number(e.treatmentDays);
  const noWithdrawal = e.withdrawalDays === "" || e.withdrawalDays === null || e.withdrawalDays === undefined || !isFinite(withdrawal) || withdrawal < 0;
  if (noWithdrawal) missing.push("karenstid (skriv 0 om ingen)");
  if (!isFinite(treatDays) || treatDays < 1) missing.push("behandlingstid (dagar)");
  const time = String(e.time || "");
  if (!noWithdrawal && withdrawal < 1 && !/^\d{2}:\d{2}$/.test(time)) missing.push("klockslag (krävs när karenstiden är under ett dygn)");
  if (missing.length) return createJsonResponse({ status: "error", message: "Fyll i: " + missing.join(", ") + "." });

  // Karens slut = behandlingens slut + karenstiden
  const end = new Date(date + "T" + (/^\d{2}:\d{2}$/.test(time) ? time : "12:00") + ":00");
  end.setTime(end.getTime() + ((treatDays - 1) + withdrawal) * 24 * 3600 * 1000);
  const id = "L-" + Utilities.getUuid().slice(0, 8);
  blMedSheet().appendRow([id, date, time, sanitize(e.animals).slice(0, 120), sanitize(e.stall).slice(0, 80), sanitize(e.reason).slice(0, 200),
    sanitize(e.drug).slice(0, 120), sanitize(e.dose).slice(0, 80), treatDays, withdrawal,
    Utilities.formatDate(end, Session.getScriptTimeZone() || "Europe/Stockholm", withdrawal < 1 ? "yyyy-MM-dd HH:mm" : "yyyy-MM-dd"),
    sanitize(e.vet).slice(0, 120), sanitize(e.source).slice(0, 120), sanitize(user), blStamp(), sanitize(e.corrects).slice(0, 20), sanitize(e.comment).slice(0, 300)]);
  return createJsonResponse({ status: "success", id: id });
}

function handleBlackstaGetMed(data) {
  const rows = blMedSheet().getDataRange().getValues();
  const from = String(data.from || ""), to = String(data.to || "9999");
  const corrected = {};
  for (let i = 1; i < rows.length; i++) if (rows[i][15]) corrected[String(rows[i][15])] = String(rows[i][0]);
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;
    const d = blDateStr(r[1]);
    if (d < from || d > to) continue;
    list.push({ id: String(r[0]), date: d, time: String(r[2] || ""), animals: String(r[3]), stall: String(r[4]), reason: String(r[5]), drug: String(r[6]),
      dose: String(r[7]), treatmentDays: Number(r[8]), withdrawalDays: Number(r[9]), withdrawalEnd: r[10] instanceof Date ? blDateStr(r[10]) : String(r[10]),
      vet: String(r[11]), source: String(r[12]), user: String(r[13]), registered: r[14] instanceof Date ? blStamp(r[14]) : String(r[14]),
      corrects: String(r[15] || ""), comment: String(r[16] || ""), correctedBy: corrected[String(r[0])] || "" });
  }
  return createJsonResponse({ status: "success", entries: list.reverse() });
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
      return createJsonResponse({ status: "fallback", message: geminiErrorText(responseCode, jsonText), clayAvatarBase64: userBase64 });
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

function handleGetInvoiceBasis(auth) {
  const ss = getSS();
  const tz = Session.getScriptTimeZone() || "Europe/Stockholm";
  const settings = getOfferSettings();

  const reports = [];
  const tid = ss.getSheetByName(CONFIG.SHEET_REPORTS || "Tidrapporter");
  const tidRows = tid ? tid.getDataRange().getValues() : [];
  for (let i = 1; i < tidRows.length; i++) {
    const r = tidRows[i];
    if (!r[0] || isInvoicedValue(r[1]) || !inScope(auth, r[10] || "LPV")) continue;
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
    if (!inScope(auth, brandFromCell(offerRows[i][OFFER_BRAND_COLUMN - 1]) === "klaryta" ? "Klaryta" : "LPV")) continue;
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
    if (!k[1] || !inScope(auth, k[4])) continue;
    customers.push({ id: String(k[0]), name: String(k[1]), idNr: String(k[2] || ""), email: String(k[3] || ""),
      phone: String(k[7] || ""), address: String(k[8] || ""), type: String(k[9] || "company"), rotRut: String(k[10] || "none") });
  }

  return createJsonResponse({ status: "success", reports: reports, offers: offers, customers: customers, settings: settings });
}

// Markerar pass och offerter som fakturerade. Passen identifieras med rad + tidsstämpel,
// så att inget fel pass markeras om någon har sorterat eller tagit bort rader i arket.
function handleMarkInvoiced(data, user, auth) {
  const ss = getSS();
  const tz = Session.getScriptTimeZone() || "Europe/Stockholm";
  let marked = 0, skipped = 0;
  const tid = ss.getSheetByName(CONFIG.SHEET_REPORTS || "Tidrapporter");
  (Array.isArray(data.reports) ? data.reports : []).slice(0, 500).forEach(ref => {
    const rowNumber = Number(ref.row);
    if (!tid || !(rowNumber >= 2 && rowNumber <= tid.getLastRow())) { skipped++; return; }
    const row = tid.getRange(rowNumber, 1, 1, 11).getValues()[0];
    if (!inScope(auth, row[10] || "LPV")) { skipped++; return; }
    const stamp = row[7] instanceof Date ? Utilities.formatDate(row[7], tz, "yyyy-MM-dd HH:mm:ss") : String(row[7] || "");
    if (stamp !== String(ref.stamp) || String(row[8]) !== String(ref.user)) { skipped++; return; }
    tid.getRange(rowNumber, 2).setValue(typeof row[1] === "boolean" ? true : "Ja");
    marked++;
  });
  const offerSheet = getOfferSheet();
  (Array.isArray(data.offerIds) ? data.offerIds : []).slice(0, 100).forEach(id => {
    const hit = findRowById(offerSheet, id);
    if (!hit || String(hit.row[3]) !== "godkänd" || !inScope(auth, offerFromRow(hit.row).brand === "klaryta" ? "Klaryta" : "LPV")) { skipped++; return; }
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

function handleInvoicePdf(input, auth) {
  const d = cleanInvoiceDraft(input);
  if (!d.customer.name) return createJsonResponse({ status: "error", message: "Välj vilken kund underlaget gäller." });
  if (!d.rows.length) return createJsonResponse({ status: "error", message: "Underlaget har inga rader." });
  // Bolaget som fakturerar: från underlaget, men aldrig ett annat bolag än det man har behörighet till
  const company = scopeOf(auth) || companyOf(input && input.company);
  const brand = company === "Klaryta" ? "klaryta" : "lpv";
  const settings = settingsForBrand(brand);
  const t = computeOfferTotals({ rows: d.rows, customerType: d.customerType, deduction: d.deduction, deductionPersons: d.deductionPersons }, settings);
  const tz = Session.getScriptTimeZone() || "Europe/Stockholm";
  const number = "FU-" + Utilities.formatDate(new Date(), tz, "yyyyMMdd-HHmmss");
  const logo = brandLogoHtml(brand, 60);
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

function handleGetUsers(auth) {
  const ss = getSS();
  const personalSheet = ss.getSheetByName(CONFIG.SHEET_STAFF || "Personal");
  const sheetData = personalSheet.getDataRange().getValues();
  const users = [];

  for (let i = 1; i < sheetData.length; i++) {
    if (sheetData[i][0] !== "" && inScope(auth, sheetData[i][6])) {
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
