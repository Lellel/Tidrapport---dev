window.applyUEConstraints = window.applyUEConstraints || function(){};
var applyUEConstraints = window.applyUEConstraints;



// Registrera Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        // Ny version redan nedladdad och väntande, eller laddas ner nu
        if (reg.waiting && navigator.serviceWorker.controller) showUpdateToast(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdateToast(worker);
          });
        });
        // Kolla efter ny version när appen tas fram igen
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
      })
      .catch((err) => console.error('Kunde inte starta SW:', err));
  });

  let reloadingForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadingForUpdate) return;
    reloadingForUpdate = true;
    window.location.reload();
  });
}

function showUpdateToast(worker) {
  if (document.getElementById('update-toast')) return;
  const toast = document.createElement('button');
  toast.id = 'update-toast';
  toast.type = 'button';
  toast.textContent = '✨ Ny version – tryck för att uppdatera';
  toast.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 16px);transform:translateX(-50%);z-index:10000;' +
    'padding:14px 20px;border:none;border-radius:999px;background:#0284c7;color:#fff;font-weight:800;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.4);';
  toast.addEventListener('click', () => {
    toast.textContent = 'Uppdaterar…';
    // Utkast ligger i localStorage/IndexedDB och påverkas inte av uppdateringen
    worker.postMessage('skipWaiting');
  });
  document.body.appendChild(toast);
}

// ==========================================
// TIDRAPPORT-KÄRNA (återförd från PROD app.js 2026-10-21)
// ==========================================

// Global data & state
let drafts = loadAllDrafts();
let plannedJobs = []; // Hybrid Osthyvel (Kalender + Kalkylark)
let currentActivity = "";
let currentJobType = "nya";
let attachedPhotoBase64 = null;
let isSubmitting = false;

// Hämta kontaktboken från Sheets
let adminUserList = [];
let hasFetchedUsers = false;

// Engångslänk för datorn (?dator=KOD från välkomstmejlet): byts mot personens inloggning, sedan laddas sidan om
(function redeemPcLink() {
  const token = new URLSearchParams(window.location.search).get('dator');
  if (!token) return;
  history.replaceState(null, '', window.location.pathname);
  document.documentElement.style.visibility = 'hidden';
  fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow',
    body: JSON.stringify({ action: 'redeemPcLink', token }) })
    .then(r => r.json())
    .then(res => {
      if (res.status !== 'success') throw new Error(res.message || 'Länken fungerade inte.');
      localStorage.setItem('lpv_user', res.user);
      localStorage.setItem('lpv_user_name', res.user);
      localStorage.setItem('lpv_key', res.key);
      localStorage.setItem('lpv_is_admin', res.isAdmin ? 'true' : 'false');
      alert(`✅ Inloggad som ${res.user} på den här datorn.`);
    })
    .catch(err => alert('❌ ' + (/fetch|network|load/i.test(err.message) ? 'Ingen kontakt med servern. Försök igen.' : err.message)))
    .finally(() => location.reload());
})();

// Läs användare och Admin-status från URL / localStorage
const appUrlParams = new URLSearchParams(window.location.search);
if (appUrlParams.has('user')) {
  localStorage.setItem('lpv_user', appUrlParams.get('user'));
  localStorage.setItem('lpv_user_name', appUrlParams.get('user'));
}
if (appUrlParams.has('admin')) {
  const isAdm = appUrlParams.get('admin').toLowerCase() === 'true' || appUrlParams.get('admin') === '1';
  localStorage.setItem('lpv_is_admin', isAdm ? 'true' : 'false');
}

// Personlig nyckel från inloggningslänken (?user=Namn&key=...). Sparas i telefonen
// och tas bort ur adressfältet så att den inte syns på skärmdumpar.
// UNDANTAG iPhone/iPad i Safari: där ligger den kvar, annars får "Dela → Lägg till på hemskärmen" ingen
// nyckel med sig (hemskärmsappen har eget minne) och appen blir utloggad (2026-11-05).
const iosBrowser = (/iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1))
  && !(navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));
if (appUrlParams.has('key')) {
  localStorage.setItem('lpv_key', appUrlParams.get('key'));
  if (!iosBrowser) {
    const cleanParams = new URLSearchParams(window.location.search);
    cleanParams.delete('key');
    const cleanQuery = cleanParams.toString();
    history.replaceState(null, '', window.location.pathname + (cleanQuery ? '?' + cleanQuery : ''));
  }
}

// Ingen reserv: en enhet utan inloggning ska inte bli någon (förut 'Daniel' – gav admin via den gamla gemensamma nyckeln)
window.currentUser = appUrlParams.get('user') || localStorage.getItem('lpv_user') || localStorage.getItem('lpv_user_name') || '';
var currentUser = window.currentUser;
let isAdmin = localStorage.getItem('lpv_is_admin') === 'true';
// UE lägger inte till ÄTA (de är oftast lösningen på ÄTA) – knappen döljs
function applyRoleUI() {
  const ue = (localStorage.getItem('lpv_role') || '').toUpperCase() === 'UE';
  const ataBtn = document.getElementById('btn-type-ata');
  if (ataBtn) ataBtn.style.display = ue ? 'none' : '';
  if (ue && typeof currentJobType !== 'undefined' && currentJobType === 'ata' && typeof setJobType === 'function') setJobType('nya');
}
document.addEventListener('DOMContentLoaded', applyRoleUI);
// Sidomenyn leder bara till admin-sidor: dölj den för förare
document.body.classList.toggle('has-side-nav', isAdmin);
// Bolag och behörighet från servern: admin på Klaryta ser inte LPV:s snöplanering m.m.
document.body.classList.toggle('not-super', localStorage.getItem('lpv_is_super') === 'false');
(async () => {
  try {
    if (!navigator.onLine || !localStorage.getItem('lpv_key')) return;
    const me = await apiPost({ action: 'me' });
    if (me.status !== 'success') return;
    localStorage.setItem('lpv_company', me.company);
    localStorage.setItem('lpv_role', me.role || '');
    localStorage.setItem('lpv_guide_roll', me.guideRoll || ''); // vilken bruksanvisning (nyheter.js, guide.html)
    // Moduler per person (SU-panelen) och om det är SU själv – styr bara vad som visas, servern avgör behörigheten
    localStorage.setItem('lpv_modules', me.modules ? JSON.stringify(me.modules) : '');
    localStorage.setItem('lpv_su', me.su ? 'true' : 'false');
    localStorage.setItem('lpv_extra_modules', JSON.stringify(me.extras || [])); // tilläggsmoduler, t.ex. kartor
    if (window.lpvApplyModules) window.lpvApplyModules();
    showSuLinks();
    applyRoleUI();
    localStorage.setItem('lpv_is_super', me.isSuper ? 'true' : 'false');
    document.body.classList.toggle('not-super', !me.isSuper);
    // Admin bestäms av servern (fliken Personal), inte av länken – annars blev man förare på en ny enhet
    if (me.isAdmin !== isAdmin) {
      isAdmin = !!me.isAdmin;
      localStorage.setItem('lpv_is_admin', isAdmin ? 'true' : 'false');
      document.body.classList.toggle('has-side-nav', isAdmin);
      if (typeof updateAdminUI === 'function') updateAdminUI();
    }
  } catch (e) { /* offline – senaste kända behörighet gäller */ }
})();

// Notiser från radarn: "📅 Inplanerad / Ändrat / Borttagen". Visas när appen öppnas och när den kommer tillbaka i förgrunden.
async function checkPlanningNotices() {
  if (!navigator.onLine || !localStorage.getItem('lpv_key')) return;
  let res;
  try { res = await apiPost({ action: 'getNotices' }); } catch (e) { return; }
  const list = (res && res.notices) || [];
  let box = document.getElementById('plan-notices');
  if (!list.length) { if (box) box.remove(); return; }
  if (!box) {
    box = document.createElement('div'); box.id = 'plan-notices';
    box.style.cssText = 'margin:0 0 12px;padding:12px 14px;border-radius:16px;background:#1d4ed8;color:#fff;box-shadow:0 6px 18px rgba(29,78,216,.35);';
    const c = document.querySelector('.app-container') || document.body;
    c.insertBefore(box, c.firstChild);
  }
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  box.innerHTML = `<div style="font-weight:800;margin-bottom:6px;">Ändringar i din planering</div>` +
    list.map(n => `<div style="font-size:14px;line-height:1.4;padding:4px 0;border-top:1px solid rgba(255,255,255,.2);">${esc(n.text)}</div>`).join('') +
    `<button type="button" id="plan-notices-ok" style="margin-top:8px;width:100%;min-height:44px;border:0;border-radius:12px;background:#fff;color:#1d4ed8;font-weight:800;font-size:15px;">👍 Uppfattat</button>`;
  document.getElementById('plan-notices-ok').onclick = async () => {
    box.remove();
    try { await apiPost({ action: 'markNoticesRead', ids: list.map(n => n.id) }); } catch (e) { /* visas igen nästa gång */ }
    if (typeof fetchPlannedJobs === 'function') fetchPlannedJobs();
  };
  if (typeof fetchPlannedJobs === 'function') fetchPlannedJobs();
}
document.addEventListener('DOMContentLoaded', checkPlanningNotices);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkPlanningNotices(); });

// 🎛️ Moduler (SU-panelen) syns bara för SU. Servern kräver ändå en egen SU-inloggning.
function showSuLinks() {
  let su = false;
  try { su = localStorage.getItem('lpv_su') === 'true'; } catch (e) { su = false; }
  document.querySelectorAll('.su-only').forEach(el => { el.hidden = !su; });
}
document.addEventListener('DOMContentLoaded', showSuLinks);

// Väder: varje person väljer själv Plogometern och/eller Sandometern (sparas i telefonen, docs/moduler-su.md)
function initVaderVal() {
  const box = document.getElementById('vader-val');
  if (!box || typeof lpvVaderVal !== 'function') return;
  const paint = () => { const v = lpvVaderVal(); box.querySelectorAll('[data-vader]').forEach(b => b.setAttribute('aria-pressed', v[b.dataset.vader] ? 'true' : 'false')); };
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-vader]'); if (!b) return;
    const v = lpvVaderVal(); v[b.dataset.vader] = !v[b.dataset.vader];
    try { localStorage.setItem('lpv_vader_val', JSON.stringify(v)); } catch (err) { /* privat läge */ }
    paint(); checkWeatherNotice();
  });
  paint();
}
document.addEventListener('DOMContentLoaded', initVaderVal);

// Vädernotis: när Plogometern/Sandometern byter läge i förarens område ("Ladda kaffebryggaren" 70 %,
// "Starta kaffebryggaren" 90 %, "Avblåst"). Visas en gång per ändring, när appen öppnas.
async function checkWeatherNotice() {
  if (!navigator.onLine || !localStorage.getItem('lpv_key') || typeof vxBrewer !== 'function') return;
  let res;
  try { res = await apiPost({ action: 'getWeather' }); } catch (e) { return; }
  if (!res || res.status !== 'success') return;
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem('lpv_vader_sett') || '{}'); } catch (e) { seen = {}; }
  const names = res.mine || Object.keys(res.areas || {});
  renderWeatherMini(res, names);
  // Bara mätarna personen valt: ingen notis för en mätare som är avstängd
  const val = typeof lpvVaderVal === 'function' ? lpvVaderVal() : { plog: true, sand: true };
  const rel = (a) => Math.max(val.plog ? a.plog : 0, val.sand ? a.sand : 0);
  const fresh = (val.plog || val.sand) ? names.filter(n => res.areas[n] && res.areas[n].changeId && seen[n] !== res.areas[n].changeId && Date.now() - (res.areas[n].changedAt || 0) < 18 * 3600000
    && (res.areas[n].level === 0 || rel(res.areas[n]) >= 50)) : [];
  document.getElementById('vader-notice')?.remove();
  if (!fresh.length) return;
  const top = fresh.map(n => res.areas[n]).sort((a, b) => b.level - a.level)[0];
  const box = document.createElement('div');
  box.id = 'vader-notice';
  box.style.cssText = 'margin:0 0 12px;padding:14px;border-radius:18px;background:#0f1d33;color:#e7eef7;box-shadow:0 8px 24px rgba(15,29,51,.35);';
  const sandFirst = val.sand && (!val.plog || top.sand > top.plog);
  const title = top.level >= 2 ? (sandFirst ? 'Ut och sanda!' : 'Starta kaffebryggaren!') : top.level === 1 ? (sandFirst ? 'Fyll sandspridaren' : 'Ladda kaffebryggaren') : 'Avblåst – sov vidare';
  box.innerHTML = vxBrewer(top.level, title, fresh.map(n => String(res.areas[n].notice || '').replace(/^[^:]*?(–|!)\s*/, '')).join(' ')) +
    `<div style="display:flex;gap:8px;margin-top:10px;"><button type="button" id="vader-ok" style="flex:1;min-height:44px;border:0;border-radius:12px;background:#fff;color:#0f1d33;font-weight:800;font-size:15px;">👍 Uppfattat</button>` +
    `<button type="button" onclick="location.href='snojour.html'" style="flex:1;min-height:44px;border:1px solid rgba(255,255,255,.35);border-radius:12px;background:transparent;color:#fff;font-weight:700;font-size:15px;">🚜 Visa mätarna</button></div>`;
  const c = document.querySelector('.app-container') || document.body;
  c.insertBefore(box, c.firstChild);
  document.getElementById('vader-ok').onclick = () => {
    fresh.forEach(n => { seen[n] = res.areas[n].changeId; });
    try { localStorage.setItem('lpv_vader_sett', JSON.stringify(seen)); } catch (e) { /* privat läge */ }
    box.remove();
  };
}
// Mini-mätarna överst på startsidan för den som har snöfastigheter (kulan på kortet)
function renderWeatherMini(res, names) {
  const val = typeof lpvVaderVal === 'function' ? lpvVaderVal() : { plog: true, sand: true };
  const rel = (o) => Math.max(val.plog ? o.plog : 0, val.sand ? o.sand : 0);
  const a = names.map(n => res.areas[n] && Object.assign({ name: n }, res.areas[n])).filter(Boolean)
    .sort((x, y) => rel(y) - rel(x))[0];
  let box = document.getElementById('vader-mini');
  if (!a || typeof vxMeters !== 'function' || (!val.plog && !val.sand)) { if (box) box.remove(); return; }
  if (!box) {
    box = document.createElement('div'); box.id = 'vader-mini';
    box.style.cssText = 'margin:0 0 12px;padding:12px;border-radius:20px;background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow);color:var(--fg);cursor:pointer;';
    box.onclick = () => { location.href = 'snojour.html'; };
    const head = document.querySelector('.app-header');
    if (head && head.parentNode) head.parentNode.insertBefore(box, head.nextSibling);
    else (document.querySelector('.app-container') || document.body).prepend(box);
  }
  box.innerHTML = `<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-bottom:6px;"><span>❄️ ${a.name}</span><span style="opacity:.7;font-weight:600;">${typeof vxAge === 'function' ? vxAge(res.at) : ''}</span></div>` + vxMeters(a);
}
document.addEventListener('DOMContentLoaded', checkWeatherNotice);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkWeatherNotice(); });

// Alla anrop till backend går härigenom: skickar med användare + personlig nyckel.
// Gamla gemensamma nyckeln (CONFIG.API_TOKEN) skickas bara om den finns kvar i config.js.
function getAuthFields() {
  const auth = { user: currentUser, key: localStorage.getItem('lpv_key') || '' };
  if (typeof CONFIG !== 'undefined' && CONFIG.API_TOKEN) auth.token = CONFIG.API_TOKEN;
  return auth;
}

async function apiPost(payload) {
  const res = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    redirect: 'follow',
    // site = appens adress, så att servern hittar loggorna (loggor/) i rätt miljö (dev/prod)
    // Inloggningen läggs sist så att ett fält i payload (t.ex. key) aldrig kan skriva över den
    body: JSON.stringify({ site: location.origin + location.pathname.replace(/[^/]*$/, ''), ...payload, ...getAuthFields() })
  });
  // Svarar servern med något annat än data (t.ex. en felsida från Google) – säg vad, i stället för ett tyst fel
  const text = await res.text();
  try { return JSON.parse(text); }
  catch (e) { throw new Error(`Servern svarade inte med data (HTTP ${res.status}): ${text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90)}`); }
}
window.getAuthFields = getAuthFields;

// ==========================================
// INDEXED DB & LOCALSTORAGE VALV
// ==========================================
let db;
function initDatabase() {
  return new Promise((resolve) => {
    const request = indexedDB.open("LPV_Tidrapport_DB", 1);
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains("drafts")) {
        database.createObjectStore("drafts", { keyPath: "id" });
      }
    };
    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };
    request.onerror = (event) => {
      console.error("IndexedDB fel:", event.target.errorCode);
      resolve(null);
    };
  });
}

function loadAllDrafts() {
  const d1 = localStorage.getItem('tidrapport_drafts');
  const d2 = localStorage.getItem('lpv_tidrapport_drafts');
  try {
    if (d1) return JSON.parse(d1);
    if (d2) return JSON.parse(d2);
  } catch (e) {
    console.error("Kunde inte läsa utkast:", e);
  }
  return [];
}

function saveDraftsToStorage() {
  try {
    const json = JSON.stringify(drafts);
    localStorage.setItem('tidrapport_drafts', json);
    localStorage.setItem('lpv_tidrapport_drafts', json);
  } catch (e) {
    console.error("LocalStorage-fel:", e);
  }
  if (db) {
    try {
      const transaction = db.transaction(["drafts"], "readwrite");
      const store = transaction.objectStore("drafts");
      store.clear();
      drafts.forEach(draft => store.put(draft));
    } catch (e) {
      console.error("IndexedDB-fel:", e);
    }
  }
}

// ==========================================
// AUTOMATISK SYNK FÖR iOS SAFARI
// ==========================================
window.addEventListener('online', () => {
  submitAll(true);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && navigator.onLine) {
    submitAll(true);
  }
});

function checkForgottenClockOuts() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  let notified = localStorage.getItem('lpv_notified_drafts') ? JSON.parse(localStorage.getItem('lpv_notified_drafts')) : [];
  drafts.forEach(draft => {
    if (!draft.end && draft.start && draft.date) {
      const [h, m] = draft.start.split(':').map(Number);
      const draftDate = new Date(draft.date);
      draftDate.setHours(h, m, 0, 0);
      const diffHours = (now - draftDate) / (1000 * 60 * 60);
      if (diffHours >= 12 && !notified.includes(draft.id)) {
        new Notification('⚠️ Pågående pass', {
          body: `Passet "${draft.activity}" har varit igång i över 12 timmar. Dags att stämpla ut?`,
          icon: 'icon.png'
        });
        notified.push(draft.id);
      }
    }
  });
  localStorage.setItem('lpv_notified_drafts', JSON.stringify(notified));
}

// MASKINIKONER
function getActivityIcon(name) {
  const n = (name || "").toLowerCase();
  if (n.includes('kyl') || n.includes('frys')) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="19" r="2"/><path d="M5 17L8 4m-2-1h3M7 19h13"/><rect x="9.5" y="4" width="10.5" height="13" rx="1.5"/><path d="M14.5 4v10M13.5 7v4m2.5-4v4M11.5 15.5h6.5"/><path d="M21 2v3m-1.5-1.5h3" stroke-width="1.2"/></svg>`;
  }
  if (n.includes('snö') || n.includes('plog')) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 4v4m-2-2h4m-3.5-1.5l3 3m-3 0l3-3"/><path d="M12 16v-6h-4l-2-4h-4v10"/><circle cx="5" cy="16" r="2"/><circle cx="12" cy="16" r="2"/><path d="M16 19l2-8" stroke-width="2"/><path d="M17 17h4"/></svg>`;
  }
  if (n.includes('linje')) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6l3 5v4"/><rect x="7" y="11" width="6" height="4" rx="1"/><circle cx="8" cy="17" r="2"/><circle cx="15" cy="17" r="1.5"/><path d="M13 13h5M17 13v4M21 20H15M11 20H5" stroke-width="2"/></svg>`;
  }
  if (n.includes('fasad')) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-7 9 7v10H3z"/><path d="M9 20v-6h6v6"/><rect x="7" y="6" width="6" height="2.5" rx="1"/><path d="M10 8.5v3"/></svg>`;
  }
  if (n.includes('stalltvätt') || n.includes('stallvätt') || n.includes('tvätt')) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20c-1-1-1-3 0-4l3-3 4 4-3 3c-1 1-3 1-4 0z"/><path d="M10 14l5-5M14 8l2 2M17 7l4-4M19 9l3-2M15 5l2-3"/><path d="M21 14l-1 2-2 1 2 1 1 2 1-2 2-1-2-1-1-2z" stroke-width="1"/></svg>`;
  }
  if (n.includes('bandgrävare') || n.includes('gräv')) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="15" width="13" height="5" rx="2.5"/><circle cx="5.5" cy="17.5" r="1"/><circle cx="9.5" cy="17.5" r="1"/><circle cx="13.5" cy="17.5" r="1"/><path d="M5 15v-5a2 2 0 0 1 2-2h4v7M9 11l4-5 6 4-2 4M17 14h4l1-3-3-2"/></svg>`;
  }
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
}

function openSheet() { document.getElementById('sheetBackdrop')?.classList.add('active'); }
function closeSheet() { document.getElementById('sheetBackdrop')?.classList.remove('active'); if (pendingCalendarJob !== null) resetActivitySheet(); }

function selectActivity(name) {
  if (pendingCalendarJob !== null) { const id = pendingCalendarJob; resetActivitySheet(); closeSheet(); clockInPlannedJob(id, name); return; }
  currentActivity = name;
  document.getElementById('selected-activity').innerHTML = `${name} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`;
  closeSheet();
  // Offertbesök: admin får en genväg till en ny offert för platsen
  let shortcut = document.getElementById('offer-shortcut');
  if (name === 'Offertbesök' && isAdmin) {
    if (!shortcut) {
      shortcut = document.createElement('button');
      shortcut.id = 'offer-shortcut';
      shortcut.type = 'button';
      shortcut.className = 'main-btn';
      shortcut.style.cssText = 'width:100%; margin-top:10px; background: var(--input-bg); color: var(--accent-blue);';
      shortcut.textContent = '📄 Skapa offert från besöket';
      shortcut.onclick = () => {
        const place = document.getElementById('input-place')?.value.trim() || '';
        location.href = 'offerter.html?ny=offert' + (place ? '&plats=' + encodeURIComponent(place) : '');
      };
      document.getElementById('selected-activity')?.closest('.ios-card, .ios-row')?.after(shortcut);
    }
  } else if (shortcut) {
    shortcut.remove();
  }
}

function setJobType(type) {
  currentJobType = type;
  document.getElementById('btn-type-cal')?.classList.toggle('active', type === 'kalender');
  document.getElementById('btn-type-new')?.classList.toggle('active', type === 'nya');
  document.getElementById('btn-type-ata')?.classList.toggle('active', type === 'ata');

  const ataRow = document.getElementById('row-ata-number');
  if (type === 'ata') {
    if (ataRow) ataRow.style.display = 'flex';
    document.getElementById('input-ata')?.focus();
  } else {
    if (ataRow) ataRow.style.display = 'none';
  }
  if (type === 'kalender') {
    fetchPlannedJobs();
  }
}

// INITIERING
async function initApp() {
  await initDatabase();
  drafts = loadAllDrafts();

  const now = new Date();
  const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  const dateInput = document.getElementById('input-date');
  if (dateInput) dateInput.value = localDate;

  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const startInput = document.getElementById('input-start');
  if (startInput) startInput.value = `${h}:${m}`;

  updateAdminUI();
  window.addEventListener('resize', updateDashboardData);
  window.addEventListener('orientationchange', () => setTimeout(updateDashboardData, 150));

  updateLiveHours();
  renderOutbox();
  updateDashboardData();
  fetchPlannedJobs();

  checkForgottenClockOuts();
  setInterval(checkForgottenClockOuts, 60 * 60 * 1000);

  if (navigator.onLine) submitAll(true);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function updateAdminUI() {
  const userDisplay = document.getElementById('user-display');
  if (userDisplay) {
    userDisplay.innerText = isAdmin ? `${currentUser} 👑` : currentUser;
    userDisplay.classList.toggle('is-admin', isAdmin);
  }
  const adminSection = document.getElementById('admin-tools-section');
  if (adminSection) {
    if (isAdmin) {
      adminSection.style.display = 'block';
      if (!hasFetchedUsers) fetchAdminUsers();
    } else {
      adminSection.style.display = 'none';
    }
  }
}

function calculateHours(start, end) {
  if (!start || !end) return 0;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  let diff = (endH + endM / 60) - (startH + startM / 60);
  if (diff < 0) diff += 24;
  return diff;
}

function updateLiveHours() {
  const start = document.getElementById('input-start')?.value;
  const end = document.getElementById('input-end')?.value;
  const badge = document.getElementById('current-duration-badge');
  if (badge) {
    if (start && end) {
      const hours = calculateHours(start, end);
      badge.innerText = `${hours.toFixed(1)} h`;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

function handlePhotoSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1200;
      const scaleSize = MAX_WIDTH / img.width;
      canvas.width = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
      canvas.height = (img.width > MAX_WIDTH) ? (img.height * scaleSize) : img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      attachedPhotoBase64 = canvas.toDataURL('image/jpeg', 0.7);
      const label = document.getElementById('photo-label');
      if (label) label.innerText = "✓ Bild bifogad";
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// HYBRID-OSTHYVELN
async function fetchPlannedJobs() {
  if (!navigator.onLine) return;
  const chosenDate = document.getElementById('input-date')?.value || new Date().toISOString().split('T')[0];
  try {
    const data = await apiPost({ action: 'getJobs', date: chosenDate });
    if (data.status === 'success') {
      plannedJobs = data.events || [];
      renderOutbox();
    }
  } catch (error) {
    console.error("Kunde inte hämta planerade jobb:", error);
  }
}

// Kalenderjobb: "Stämpla in" frågar först vilken aktivitet passet ska ha (kalenderns titel förvald),
// så att t.ex. Stalltvätt ger arbetsordern. Radarjobb stämplas in direkt som förut. (2026-11-05)
let pendingCalendarJob = null;
function askCalendarActivity(job) {
  pendingCalendarJob = job.id;
  const sheet = document.querySelector('#sheetBackdrop .sheet-container');
  const label = sheet && sheet.querySelector('.section-label');
  if (label) { label.dataset.orig = label.dataset.orig || label.textContent; label.textContent = 'Aktivitet för kalenderjobbet'; }
  if (sheet && !document.getElementById('cal-activity-keep')) {
    const keep = document.createElement('div');
    keep.id = 'cal-activity-keep'; keep.className = 'sheet-item';
    keep.style.fontWeight = '700';
    sheet.querySelector('.sheet-header').after(keep);
  }
  const keep = document.getElementById('cal-activity-keep');
  if (keep) { keep.textContent = '📅 ' + (job.title || 'Kalenderjobb') + ' (som i kalendern)'; keep.onclick = () => selectActivity(job.title || 'Kalenderjobb'); }
  openSheet();
}
function resetActivitySheet() {
  pendingCalendarJob = null;
  const label = document.querySelector('#sheetBackdrop .section-label');
  if (label && label.dataset.orig) label.textContent = label.dataset.orig;
  const keep = document.getElementById('cal-activity-keep');
  if (keep) keep.remove();
}

function clockInPlannedJob(jobId, chosenActivity) {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  const job = plannedJobs.find(j => String(j.id) === String(jobId) || j.id === jobId);
  if (!job) {
    console.error("Kunde inte hitta jobb med ID:", jobId, plannedJobs);
    return;
  }
  if (job.source === 'kalender' && chosenActivity === undefined) { askCalendarActivity(job); return; }

  const ongoing = drafts.find(d => !d.end);
  if (ongoing) {
    if (confirm(`Du har redan "${ongoing.activity}" pågående.\n\nVill du stämpla ut det förra passet nu?`)) {
      const nu = new Date();
      ongoing.end = String(nu.getHours()).padStart(2, '0') + ':' + String(nu.getMinutes()).padStart(2, '0');
      ongoing.totalHours = calculateHours(ongoing.start, ongoing.end).toFixed(1);
    } else {
      return;
    }
  }

  const now = new Date();
  const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

  drafts.push({
    id: Date.now(),
    calendarJobId: job.id,
    type: 'normal',
    date: document.getElementById('input-date')?.value || new Date().toISOString().split('T')[0],
    user: currentUser,
    place: job.place || 'Okänd plats',
    activity: chosenActivity || job.title || 'Planerat jobb',
    // Kalenderns titel följer med i noteringen när en annan aktivitet valts (stallet känns igen på namnet)
    notes: [chosenActivity && job.title && chosenActivity !== job.title ? job.title : '', job.description || ''].filter(Boolean).join(' · '),
    start: timeStr,
    end: '',
    images: []
  });

  saveDraftsToStorage();
  renderOutbox();
  updateDashboardData();
}

function clockOut(id) {
  const nu = new Date();
  const timeString = String(nu.getHours()).padStart(2, '0') + ':' + String(nu.getMinutes()).padStart(2, '0');
  const draftIndex = drafts.findIndex(d => d.id === id);
  if (draftIndex !== -1) {
    drafts[draftIndex].end = timeString;
    drafts[draftIndex].totalHours = calculateHours(drafts[draftIndex].start, timeString).toFixed(1);
    saveDraftsToStorage();
    renderOutbox();
    updateDashboardData();
    if (navigator.onLine) submitAll(true);
  }
}

function saveToOutbox() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  const date = document.getElementById('input-date').value;
  const place = document.getElementById('input-place').value.trim();
  const notes = document.getElementById('input-notes').value.trim();
  const start = document.getElementById('input-start').value;
  const end = document.getElementById('input-end').value;
  const ata = document.getElementById('input-ata').value.trim();

  if (!place || !start) {
    alert("Fyll i Betalställe och Starttid!");
    return;
  }

  const hours = end ? calculateHours(start, end).toFixed(1) : "0.0";
  const draft = {
    id: Date.now(),
    type: currentJobType,
    ataNumber: currentJobType === 'ata' ? ata : '',
    date: date,
    user: currentUser,
    place: place,
    activity: currentActivity || "Övrigt",
    notes: notes,
    start: start,
    end: end,
    totalHours: hours,
    images: attachedPhotoBase64 ? [attachedPhotoBase64] : []
  };

  drafts.push(draft);
  saveDraftsToStorage();

  document.getElementById('input-place').value = '';
  document.getElementById('input-notes').value = '';
  document.getElementById('input-end').value = '';
  document.getElementById('input-ata').value = '';
  const photoLabel = document.getElementById('photo-label');
  if (photoLabel) photoLabel.innerText = "Bifoga bild-underlag";
  attachedPhotoBase64 = null;

  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('input-start').value = `${h}:${m}`;
  document.getElementById('selected-activity').innerHTML = `Välj aktivitet <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`;
  currentActivity = "";
  setJobType('nya');

  updateLiveHours();
  renderOutbox();
  updateDashboardData();

  if (navigator.onLine && end) {
    submitAll(true);
  }
}

function deleteDraft(id) {
  drafts = drafts.filter(draft => draft.id !== id);
  saveDraftsToStorage();
  renderOutbox();
  updateDashboardData();
}

function renderOutbox() {
  const container = document.getElementById('outbox-container');
  const title = document.getElementById('outbox-title');
  const submitBtn = document.getElementById('btnSubmitAll');

  if (!container || !title) return;

  container.innerHTML = '';

  if (drafts.length === 0 && plannedJobs.length === 0) {
    title.innerText = "Dagens pass (0 st)";
    if (submitBtn) submitBtn.style.display = 'none';
    container.innerHTML = `
      <div class="draft-card empty-placeholder">
        <div style="font-size: 13px; color: var(--text-muted);">
          Inga sparade pass än. Fyll i passet nedan och tryck på <strong>Spara pass lokalt</strong>.
        </div>
      </div>
    `;
    addSeasonReminders(container);
    return;
  }

  const readyToSend = drafts.filter(d => d.start && d.end);
  if (submitBtn) submitBtn.style.display = readyToSend.length > 0 ? 'flex' : 'none';

  let totalHours = 0;
  drafts.forEach(d => { if (d.start && d.end) totalHours += parseFloat(calculateHours(d.start, d.end)); });
  title.innerText = `Dagens pass (${drafts.length} st • ${totalHours.toFixed(1)} h)`;

  // Rendera Buffert och Planerade jobb
  // Texterna kommer från kalendern/radarn – skrivs aldrig in som HTML
  const escJob = (t) => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  plannedJobs.forEach(job => {
    if (drafts.some(d => String(d.calendarJobId) === String(job.id))) return;
    const card = document.createElement('div');
    card.className = 'draft-card';

    const badgeHtml = job.isBuffer
      ? `<span style="background: rgba(191, 90, 242, 0.15); color: #BF5AF2; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; border: 1px solid rgba(191, 90, 242, 0.4); margin-right: 8px;">⏱️ VID TILLFÄLLE</span>`
      : `<span style="background: rgba(10, 132, 255, 0.15); color: #0A84FF; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; border: 1px solid rgba(10, 132, 255, 0.4); margin-right: 8px;">📅 PLANERAT</span>`;

    card.innerHTML = `
      <div class="card-body">
        <div class="card-title">
          <span style="color:var(--blue); margin-right:12px; display:inline-flex;">${getActivityIcon(job.title)}</span>
          <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escJob(job.title)}</span>
        </div>
        <div class="card-meta" style="margin-top:6px;">
          ${badgeHtml}
          <span style="color:var(--fg); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:120px;">${escJob(job.place)}</span>
          ${job.start ? `<span class="dot">•</span><span>${escJob(job.start)}</span>` : ''}
        </div>
        ${job.description ? `<div class="card-note">${escJob(job.description)}</div>` : ''}
      </div>
      <div class="card-actions">
        <button class="btn-action clock-in">Stämpla in</button>
      </div>
    `;

    const clockInBtn = card.querySelector('.clock-in');
    if (clockInBtn) {
      clockInBtn.addEventListener('click', () => {
        clockInPlannedJob(job.id);
      });
    }

    container.appendChild(card);
  });

  // Rendera lokala pass
  drafts.forEach(draft => {
    const card = document.createElement('div');
    card.className = 'draft-card';
    const iconSvg = getActivityIcon(draft.activity);
    const isOngoing = !draft.end;
    const timeDisplay = isOngoing ? '<span class="ongoing-pulse">Pågår</span>' : `${draft.start} – ${draft.end}`;
    const hoursDisplay = isOngoing ? '' : `${calculateHours(draft.start, draft.end).toFixed(1)} h`;
    const ataBadge = draft.type === 'ata' ? `<span class="badge-ata">${draft.ataNumber || 'ÄTA'}</span>` : '';
    const photoIcon = (draft.images && draft.images.length > 0) ? `<span style="color:var(--green); margin-left:auto;">📸</span>` : '';

    const woButton = typeof isStallWash === 'function' && isStallWash(draft)
      ? `<button class="btn-action" onclick="openWorkOrder(${draft.id})" style="color:var(--accent-blue);">📋 Arbetsorder</button>` : '';
    const ekButton = typeof ekTemplateFor === 'function' && ekTemplateFor(draft)
      ? `<button class="btn-action" onclick="openEgenkontroll(${draft.id})" style="color:var(--green);">✅ Egenkontroll</button>` : '';
    let actionButtons = woButton + ekButton + (isOngoing ? `
      <button class="btn-action clock-out" onclick="clockOut(${draft.id})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
        Stämpla ut nu
      </button>
      <button class="btn-action delete" onclick="deleteDraft(${draft.id})" style="flex:0 0 50px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
      </button>
    ` : `
      <button class="btn-action delete" onclick="deleteDraft(${draft.id})">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
        Radera
      </button>
    `);

    card.innerHTML = `
      <div class="card-body">
        <div class="card-title">
          <span style="display:inline-flex; align-items:center; color:var(--accent); margin-right:8px; flex-shrink:0;">${iconSvg}</span>
          ${ataBadge}
          <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:110px;">${draft.place}</span>
          <span class="dot">•</span>
          <span class="card-activity">${draft.activity}</span>
        </div>
        <div class="card-meta">
          <span>${draft.date}</span>
          <span class="dot">•</span>
          <span>${timeDisplay}</span>
          ${hoursDisplay ? `<span class="dot">•</span><span class="hours">${hoursDisplay}</span>` : ''}
          ${photoIcon}
        </div>
        ${draft.notes ? `<div class="card-note">${draft.notes}</div>` : ''}
      </div>
      <div class="card-actions">${actionButtons}</div>
    `;
    container.appendChild(card);
  });
  addSeasonReminders(container);
}

// Påminnelse till admin 3 veckor innan ett säsongstema (sasong.js): skapa temats glaskulor i tid.
// "Göm" gäller det temat det året. Kortet försvinner när temat börjar eller alla kulor finns.
function addSeasonReminders(container) {
  if (!window.lpvSeason || localStorage.getItem('lpv_is_admin') !== 'true') return;
  let icons = {}, hidden = [];
  try { icons = JSON.parse(localStorage.getItem('lpv_app_icons') || '{}'); } catch (e) { icons = {}; }
  try { hidden = JSON.parse(localStorage.getItem('lpv_tema_gomd') || '[]'); } catch (e) { hidden = []; }
  const SUFFIXES = Object.keys(lpvSeason.THEMES);
  const base = Object.keys(icons).filter(k => !SUFFIXES.some(t => k.endsWith('_' + t)));
  lpvSeason.upcoming(21).reverse().forEach(u => {
    const tag = u.id + ':' + lpvSeason.iso(u.start);
    const done = base.filter(k => icons[k + '_' + u.id]).length;
    if (hidden.includes(tag) || (base.length && done >= base.length)) return;
    const card = document.createElement('div');
    card.className = 'draft-card';
    card.innerHTML = `
      <div class="card-body">
        <div class="card-title"><span style="margin-right:10px">${u.theme.emoji}</span>${u.theme.name} om ${u.days} ${u.days === 1 ? 'dag' : 'dagar'}</div>
        <div class="card-meta" style="margin-top:6px;">${done} av ${base.length || '–'} ${u.theme.name.toLowerCase()}-kulor klara</div>
      </div>
      <div class="card-actions">
        <button class="btn-action" onclick="location.href='ikoner.html#${u.id}'">🎨 Skapa kulor</button>
        <button class="btn-action" style="background:transparent" data-hide="${tag}">Göm</button>
      </div>`;
    card.querySelector('[data-hide]').onclick = () => {
      hidden.push(tag);
      try { localStorage.setItem('lpv_tema_gomd', JSON.stringify(hidden.slice(-30))); } catch (e) { /* privat läge */ }
      card.remove();
    };
    container.prepend(card);
  });
}

async function submitAll(silent = false) {
  if (isSubmitting) return;

  const readyToSend = drafts.filter(d => d.start && d.end);
  if (readyToSend.length === 0) return;

  isSubmitting = true;

  const btn = document.getElementById('btnSubmitAll');
  if (btn) {
    btn.innerHTML = `<svg class="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFF" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg> Skickar...`;
    btn.disabled = true;
  }

  try {
    const result = await apiPost({ action: 'batchReports', pass: readyToSend });
    if (result && result.status === 'success') {
      if (!silent) alert(`Klart! ${result.count || readyToSend.length} pass har sparats.`);
      const idsToRemove = readyToSend.map(d => d.id);
      drafts = drafts.filter(d => !idsToRemove.includes(d.id));
      saveDraftsToStorage();
      renderOutbox();
      updateDashboardData();
    } else if (!silent) {
      alert("Fel vid inskickning: " + (result.message || "Okänt fel"));
    }
  } catch (err) {
    if (!silent) alert("Kunde inte nå kalkylarket just nu. Passen synkas när du får nät!");
    console.error(err);
  } finally {
    isSubmitting = false;
    if (btn) {
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFF" stroke-width="2.5"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg> Skicka in`;
      btn.disabled = false;
    }
  }
}

// DASHBOARD
function updateDashboardData() {
  const totalHoursEl = document.getElementById('dash-total-hours');
  const passCountEl = document.getElementById('dash-pass-count');
  const listEl = document.getElementById('dash-activity-list');
  if (!totalHoursEl || !listEl) return;

  if (passCountEl) passCountEl.innerText = `${drafts.length} st`;
  let totalH = 0;
  listEl.innerHTML = '';

  if (drafts.length === 0) {
    listEl.innerHTML = '<div class="dash-empty">Inga registrerade pass än idag.</div>';
    totalHoursEl.innerText = '0.0 h';
    return;
  }

  drafts.forEach(p => {
    const hours = parseFloat(p.totalHours || calculateHours(p.start, p.end) || 0);
    totalH += hours;
    const row = document.createElement('div');
    row.className = 'dash-row';
    row.innerHTML = `
      <div>
        <div style="font-weight:600; color:var(--text-main);">${p.place || 'Uppdrag'}</div>
        <div style="font-size:11px; color:var(--text-muted);">${p.activity || 'Övrigt'} (${p.start}–${p.end || 'Pågår'})</div>
      </div>
      <div style="font-weight:600; color:var(--accent);">${hours.toFixed(1)} h</div>
    `;
    listEl.appendChild(row);
  });
  totalHoursEl.innerText = `${totalH.toFixed(1)} h`;
}

async function fetchAdminUsers() {
  const select = document.getElementById('admin-target-user');
  if (!select) return;
  select.innerHTML = '<option value="">Hämtar...</option>';
  try {
    const data = await apiPost({ action: 'getUsers' });
    if (data.status === 'success') {
      adminUserList = data.users;
      hasFetchedUsers = true;
      select.innerHTML = '<option value="">Välj person...</option>';
      adminUserList.forEach(u => {
        select.innerHTML += `<option value="${u.name}">${u.name}</option>`;
      });
    } else {
      // Visa serverns orsak (t.ex. "Kräver administratör" eller "Ogiltig inloggning") så att felet går att åtgärda
      const reason = String(data.message || 'okänt fel').replace(/[<>&"]/g, '');
      select.innerHTML = `<option value="">Fel vid hämtning: ${reason}</option>`;
    }
  } catch (err) {
    // Visa varför (nätfel eller konstigt svar) – underlättar felsökning på iPad
    const why = String((err && err.message) || 'ingen kontakt').replace(/[<>&"]/g, '').slice(0, 120);
    select.innerHTML = `<option value="">Offline – ${why}</option>`;
  }
}

// ➕ Ny person: läggs i fliken Personal med roll och bolag, får nyckel direkt och länken skickas
function toggleNewPerson() {
  const box = document.getElementById('admin-new-person');
  if (!box) return;
  box.style.display = box.style.display === 'none' ? 'block' : 'none';
  if (box.style.display === 'block') document.getElementById('new-person-name')?.focus();
}

async function saveNewPerson() {
  const val = (id) => document.getElementById(id)?.value.trim() || '';
  const msg = document.getElementById('new-person-msg');
  const person = { name: val('new-person-name'), phone: val('new-person-phone'), email: val('new-person-email'),
                   role: val('new-person-role'), company: val('new-person-company') };
  if (!person.name) { msg.textContent = '⚠️ Skriv personens namn.'; return; }
  msg.textContent = 'Sparar… ⏳';
  let data;
  try { data = await apiPost({ action: 'addStaff', ...person }); }
  catch (err) { data = { status: 'error', message: 'Ingen kontakt med servern.' }; }
  if (data.status !== 'success') { msg.textContent = '❌ ' + (data.message || 'Kunde inte spara.'); return; }

  adminUserList.push({ id: data.user, name: data.user, phone: person.phone, email: person.email, type: data.role, isAdmin: data.role === 'Admin', ownerCompany: person.company });
  const select = document.getElementById('admin-target-user');
  const option = document.createElement('option');
  option.value = data.user; option.textContent = data.user;
  select.appendChild(option);
  select.value = data.user;
  onAdminUserSelect();
  document.getElementById('admin-target-phone').value = person.phone;
  ['new-person-name', 'new-person-phone', 'new-person-email'].forEach(id => { document.getElementById(id).value = ''; });
  msg.textContent = `✅ ${data.user} är tillagd som ${data.role}.`;
  document.getElementById('admin-new-person').style.display = 'none';
  if (person.phone || person.email) adminSendWelcomeKit();
  else alert(`✅ ${data.user} är tillagd. Inget mobilnummer eller e-post – skicka länken med QR.`);
}

function onAdminUserSelect() {
  const select = document.getElementById('admin-target-user');
  const phoneInput = document.getElementById('admin-target-phone');
  const adminCheck = document.getElementById('admin-target-is-admin');

  if (!select || !phoneInput || !adminCheck) return;
  const selectedUser = adminUserList.find(u => u.name === select.value);
  if (selectedUser) {
    let phoneVal = selectedUser.phone ? String(selectedUser.phone).trim() : '';
    if (phoneVal.length === 9 && !phoneVal.startsWith('0')) phoneVal = '0' + phoneVal;
    phoneInput.value = phoneVal;
    adminCheck.checked = selectedUser.isAdmin;
  } else {
    phoneInput.value = '';
    adminCheck.checked = false;
  }
  updateAdminTargetLink();
}

// Bygger personens inloggningslänk med personlig nyckel (hämtas/skapas i backend).
// reset=true ger personen en ny nyckel och spärrar den gamla länken.
async function getAdminTargetUrl(reset = false) {
  const targetUser = document.getElementById('admin-target-user')?.value.trim();
  const targetIsAdmin = document.getElementById('admin-target-is-admin')?.checked;
  if (!targetUser) {
    alert('Välj en person först.');
    return null;
  }
  const data = await apiPost({ action: 'getUserKey', targetUser: targetUser, reset: reset });
  if (data.status !== 'success') {
    alert('Kunde inte hämta inloggningsnyckel: ' + (data.message || 'Okänt fel'));
    return null;
  }
  const baseUrl = window.location.origin + window.location.pathname;
  const params = new URLSearchParams();
  params.set('user', data.user);
  params.set('key', data.key);
  if (targetIsAdmin) params.set('admin', 'true');
  return `${baseUrl}?${params.toString()}`;
}

// QR-koden ritas lokalt i telefonen så att länken (med nyckel) aldrig skickas till en extern tjänst
function renderAdminQR(targetUrl) {
  const box = document.getElementById('admin-qr-code');
  const caption = document.getElementById('admin-qr-caption');
  const targetUser = document.getElementById('admin-target-user')?.value.trim();
  if (!box) return;
  box.innerHTML = '';
  if (typeof QRCode === 'undefined') {
    box.innerText = 'QR-biblioteket kunde inte laddas.';
    return;
  }
  new QRCode(box, { text: targetUrl, width: 160, height: 160, correctLevel: QRCode.CorrectLevel.M });
  if (caption) caption.innerText = targetUser ? `Skanna för att logga in som ${targetUser}:` : "Skanna för att logga in:";
}

async function updateAdminTargetLink() {
  const qrBox = document.getElementById('admin-qr-container');
  if (qrBox && qrBox.style.display === 'block') {
    const targetUrl = await getAdminTargetUrl();
    if (targetUrl) renderAdminQR(targetUrl);
  }
}

async function adminSendSMS() {
  const targetUrl = await getAdminTargetUrl();
  if (!targetUrl) return;
  const targetUser = document.getElementById('admin-target-user')?.value.trim() || 'kollega';
  const phone = document.getElementById('admin-target-phone')?.value.trim() || '';
  const message = `Hej ${targetUser}! Här är din personliga inloggningslänk till LPV Tidrapport (dela den inte): ${targetUrl}`;
  const openMessages = () => {
    if (phone) window.location.href = `sms.html?to=${encodeURIComponent(phone)}&body=${encodeURIComponent(message)}`;
    else window.location.href = `sms:?&body=${encodeURIComponent(message)}`;
  };
  if (!phone) { openMessages(); return; }
  // Via 46elks från servern (avsändare efter personens bolag). Inte inställt = Meddelanden som förut.
  let res;
  try { res = await apiPost({ action: 'sendSms', type: 'login', targetUser, to: phone, message }); }
  catch (err) { res = { status: 'error', message: 'Ingen kontakt med servern.' }; }
  if (res.status === 'success') { alert(`✅ SMS skickat till ${targetUser} från ${res.sender}.`); return; }
  if (res.code === 'not_configured' || confirm('❌ ' + (res.message || 'SMS kunde inte skickas.') + '\n\nÖppna Meddelanden i stället?')) openMessages();
}

// Välkomstpaket: SMS med inloggningen + mejl med engångslänk för datorn och kontorsdelarna (admin/ekonom)
async function adminSendWelcomeKit() {
  const targetUser = document.getElementById('admin-target-user')?.value.trim();
  if (!targetUser) { alert('Välj en person först.'); return; }
  let res;
  try { res = await apiPost({ action: 'sendWelcomeKit', targetUser }); }
  catch (err) { res = { status: 'error', message: 'Ingen kontakt med servern.' }; }
  if (res.status !== 'success') { alert('❌ ' + (res.message || 'Kunde inte skicka.')); return; }
  const roleNames = { admin: 'admin', ekonom: 'ekonom', ue: 'UE', forare: 'förare' };
  const smsLine = res.sms === 'skickat' ? '📱 SMS: skickat' : res.sms === 'not_configured' ? '📱 SMS: öppnar Meddelanden' : '📱 SMS: ' + res.sms;
  const mailLine = res.mail === 'behövs inte' ? '' : '\n✉️ Mejl: ' + res.mail;
  const receiptLine = res.receipt ? '\n🧾 Kvittens: ' + res.receipt : '';
  alert(`📦 Välkomstpaket till ${res.user} (${res.roles.map(r => roleNames[r] || r).join(' + ')})\n\n${smsLine}${mailLine}${receiptLine}`);
  if (res.sms === 'not_configured') {
    const phone = document.getElementById('admin-target-phone')?.value.trim() || '';
    window.location.href = `sms.html?to=${encodeURIComponent(phone)}&body=${encodeURIComponent(res.smsText)}`;
  }
}
window.adminSendWelcomeKit = adminSendWelcomeKit;

// Personen skickar själv en engångslänk för datorn till sin egen mejl
async function sendPcLinkToMe() {
  if (!confirm('Skicka en inloggningslänk för datorn till din e-post?\n\nLänken fungerar en gång och i 7 dagar.')) return;
  let res;
  try { res = await apiPost({ action: 'sendPcLink' }); }
  catch (err) { res = { status: 'error', message: 'Ingen kontakt med servern.' }; }
  alert(res.status === 'success' ? `✅ Skickat till ${res.sentTo}. Öppna mejlet på datorn och tryck på knappen.` : '❌ ' + (res.message || 'Kunde inte skicka.'));
}
window.sendPcLinkToMe = sendPcLinkToMe;

async function adminSendEmail() {
  const targetUrl = await getAdminTargetUrl();
  if (!targetUrl) return;
  const targetUser = document.getElementById('admin-target-user')?.value.trim() || 'kollega';
  const subject = "Inloggning LPV Tidrapport";
  const body = `Hej ${targetUser}!\n\nHär är din personliga inloggningslänk till LPV Tidrapport:\n${targetUrl}\n\nKlicka på länken från din telefon för att logga in. Dela inte länken med någon annan.`;
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function toggleAdminQR() {
  const qrBox = document.getElementById('admin-qr-container');
  if (!qrBox) return;
  if (qrBox.style.display === 'none' || qrBox.style.display === '') {
    const targetUrl = await getAdminTargetUrl();
    if (!targetUrl) return;
    renderAdminQR(targetUrl);
    qrBox.style.display = 'block';
  } else {
    qrBox.style.display = 'none';
  }
}

// Spärra personens gamla länk och skapa en ny nyckel
async function adminResetKey() {
  const targetUser = document.getElementById('admin-target-user')?.value.trim();
  if (!targetUser) { alert('Välj en person först.'); return; }
  // Spärrar man sig själv loggas alla ens enheter ut – varna tydligt, behåll inloggningen på den här enheten
  // och visa den nya länken direkt så att man aldrig blir utelåst (bestämt 2026-11-04).
  const me = (localStorage.getItem('lpv_user') || localStorage.getItem('lpv_user_name') || '').trim();
  const self = targetUser === me;
  const question = self
    ? `⚠️ Du håller på att spärra DIN EGEN inloggning.\n\nAlla dina enheter (telefon, iPad, dator) loggas ut. Den här enheten får den nya nyckeln direkt, men de andra måste öppna den nya länken.\n\nFortsätt?`
    : `Spärra ${targetUser}s nuvarande inloggningslänk och skapa en ny?\n\n${targetUser} behöver då få den nya länken.`;
  if (!confirm(question)) return;
  const targetUrl = await getAdminTargetUrl(true);
  if (!targetUrl) return;
  if (self) {
    const newKey = new URL(targetUrl).searchParams.get('key');
    if (newKey) localStorage.setItem('lpv_key', newKey);
    prompt('✅ Klart! Den här enheten är fortfarande inloggad.\n\nKopiera din nya länk och öppna den på dina andra enheter (eller skicka den till dig själv med SMS/Mail):', targetUrl);
  } else {
    alert(`Klart! ${targetUser}s gamla länk fungerar inte längre. Skicka den nya via SMS, Mail eller QR.`);
  }
  const qrBox = document.getElementById('admin-qr-container');
  if (qrBox && qrBox.style.display === 'block') renderAdminQR(targetUrl);
}

// FORDONSPARK & UTRUSTNING (v3.5 Postis Per 3D-Glas)
const VEHICLE_PARK = [
  { id: 'v1', name: 'Kramer Hjullastare (Svart huv)', icon: '🚜', color: '#1e293b' },
  { id: 'v2', name: 'Multiloader LT 30 (Gul)', icon: '🟡', color: '#eab308' },
  { id: 'v3', name: 'John Deere 3520 (Grön)', icon: '🚜', color: '#15803d' },
  { id: 'v4', name: 'Ford Transit (Silver/Grå + Blinkljus)', icon: '🚐', color: '#64748b' },
  { id: 'v5', name: 'Ford Transit (Vit + Blinkramp)', icon: '🚐', color: '#f8fafc' },
  { id: 'v6', name: 'VW Transporter m. Flak (Vit)', icon: '🛻', color: '#ffffff' },
  { id: 'v7', name: 'VW Transporter m. Bakgavellyft (Blå/Rost)', icon: '🚚', color: '#2563eb' },
  { id: 'v8', name: 'Släpkärra #1 (Gallergrind)', icon: '🛒', color: '#94a3b8' },
  { id: 'v9', name: 'Släpkärra #2 (Gallergrind)', icon: '🛒', color: '#94a3b8' },
  { id: 'v10', name: 'Kärra m. Byggställning', icon: '🏗️', color: '#0284c7' }
];

function selectVehicle(id) {
  const v = VEHICLE_PARK.find(item => item.id === id);
  if (v) {
    localStorage.setItem('lpv_active_vehicle', JSON.stringify(v));
    const titleEl = document.getElementById('welcome-title');
    if (titleEl) titleEl.innerText = v.name;
  }
}

window.selectVehicle = selectVehicle;


// ==========================================
// LÄGE: AUTO / LJUST / MÖRKT / NATT (fältanpassat glas)
// Auto följer telefonens ljust/mörkt. Natt = rött på svart för hytten.
// Läget sätts på <html data-theme>; body.dark-mode finns kvar för äldre kod.
// ==========================================
const THEMES = ['auto', 'light', 'dark', 'night'];
const THEME_COLORS = { light: '#bfe0ff', dark: '#0f172a', night: '#000000' };

function getThemeSetting() {
  let t = 'auto';
  try { t = localStorage.getItem('lpv_theme') || 'auto'; } catch (e) { /* ingen lagring */ }
  return THEMES.includes(t) ? t : 'auto';
}

function resolveTheme(setting) {
  if (setting !== 'auto') return setting;
  return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
}

function applyTheme(setting) {
  const theme = resolveTheme(setting);
  document.documentElement.setAttribute('data-theme', theme);
  document.body.classList.toggle('dark-mode', theme !== 'light');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[theme]);
  document.querySelectorAll('#theme-picker [data-theme-val]').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.themeVal === setting));
  });
}

function setTheme(setting) {
  if (!THEMES.includes(setting)) setting = 'auto';
  try { localStorage.setItem('lpv_theme', setting); } catch (e) { /* ingen lagring */ }
  applyTheme(setting);
}

// Gamla knappen växlade bara ljust/mörkt – behålls för säkerhets skull
function toggleDarkMode() {
  setTheme(resolveTheme(getThemeSetting()) === 'light' ? 'dark' : 'light');
}

function initTheme() {
  applyTheme(getThemeSetting());
  const picker = document.getElementById('theme-picker');
  if (picker) picker.addEventListener('click', e => {
    const b = e.target.closest('[data-theme-val]');
    if (b) setTheme(b.dataset.themeVal);
  });
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => { if (getThemeSetting() === 'auto') applyTheme('auto'); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }
}

document.addEventListener('DOMContentLoaded', initTheme);
window.toggleDarkMode = toggleDarkMode;
window.setTheme = setTheme;

// AVATAR DIRECT TRIGGER (v3.9.1)
function triggerAvatarUpload() {
  if (typeof window.openPostmanPatModal === 'function') {
    window.openPostmanPatModal();
  } else if (typeof openPostmanPatModal === 'function') {
    openPostmanPatModal();
  } else {
    const input = document.getElementById('avatar-upload');
    if (input) input.click();
  }
}

function processAvatarUpload(event) {
  const file = event.target && event.target.files ? event.target.files[0] : null;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');

      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 400, 400);
      const base64Avatar = canvas.toDataURL('image/jpeg', 0.85);

      const avatarImg = document.getElementById('user-avatar-img');
      if (avatarImg) avatarImg.src = base64Avatar;

      if (typeof window.saveAvatar === 'function') window.saveAvatar(base64Avatar);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

window.triggerAvatarUpload = triggerAvatarUpload;
window.processAvatarUpload = processAvatarUpload;

// ALIAS FÖR AVATAR-KLICK (v4.1)
function openAvatarModal() {
  const input = document.getElementById('avatar-upload');
  if (input) {
    input.click();
  } else if (typeof triggerAvatarUpload === 'function') {
    triggerAvatarUpload();
  }
}

window.openAvatarModal = openAvatarModal;

// ==========================================
// USER PILL CLICK FIX (v4.3.1)
// ==========================================
// Ett klick = byt profil, tre snabba klick = växla Admin-läge (från PROD)
let userClickCount = 0;
let userClickTimer = null;
function handleUserPillClick() {
  userClickCount++;
  clearTimeout(userClickTimer);
  if (userClickCount >= 3) {
    userClickCount = 0;
    isAdmin = !isAdmin;
    localStorage.setItem('lpv_is_admin', isAdmin ? 'true' : 'false');
    document.body.classList.toggle('has-side-nav', isAdmin);
    updateAdminUI();
    alert(isAdmin ? "👑 Admin-läge aktiverat!" : "Admin-läge avstängt.");
    return;
  }
  userClickTimer = setTimeout(() => {
    const clicks = userClickCount;
    userClickCount = 0;
    if (clicks !== 1) return;
    const newUser = prompt('Ändra inloggad användare / profil:', currentUser);
    if (newUser && newUser.trim() !== '') {
      localStorage.setItem('lpv_user', newUser.trim());
      localStorage.setItem('lpv_user_name', newUser.trim());
      location.reload();
    }
  }, 600);
}

window.handleUserPillClick = handleUserPillClick;


// ==========================================
// iMESSAGE & KUNDPORTAL LOGIK (v4.5)
// ==========================================

// ==========================================
// KUNDENS SIDA FÖR OFFERT / ÄTA
// Länk: index.html?offert=O-2026-014&code=KOD (eller ?ata=Ä-...). Koden signeras i
// backend per version, så en gammal länk slutar gälla när offerten ändras.
// Offerter skapas och skickas i offerter.html.
// ==========================================
let customerDoc = { type: '', id: '', code: '' };
let customerPicks = {};          // huskropp -> valt alternativ (index)
let customerColorGroups = [];     // huskroppar där kunden måste välja

function checkCustomerUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const safeId = (v) => (v && /^[A-Za-zÄÖÅäöå0-9_-]{1,40}$/.test(v)) ? v : null;
  const ataId = safeId(urlParams.get('ata'));
  const offertId = safeId(urlParams.get('offert'));
  if (!ataId && !offertId) return;
  customerDoc = { type: ataId ? 'ata' : 'offert', id: ataId || offertId, code: (urlParams.get('code') || '').replace(/[^A-Za-z0-9_-]/g, '') };
  renderPublicCustomerView();
}

function customerEsc(text) {
  return String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const customerMoney = (v) => Math.round(v).toLocaleString('sv-SE') + ' kr';

async function customerApi(payload) {
  const res = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    body: JSON.stringify({ ...payload, offerId: customerDoc.id, code: customerDoc.code })
  });
  return res.json();
}

function customerShell(inner) {
  // Kundsidan ska se ut som ett rent dokument – stäng av appens mörka tema
  document.querySelectorAll('link[rel="stylesheet"], style').forEach(el => el.remove());
  document.documentElement.className = '';
  document.documentElement.style.cssText = 'background:#f1f5f9;';
  document.body.className = '';
  document.body.style.cssText = 'margin:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#0f172a;';
  document.body.innerHTML = `<div style="max-width:560px;margin:0 auto;padding:20px 16px 40px;">${inner}</div>`;
}

async function renderPublicCustomerView() {
  customerShell('<div style="text-align:center;padding:60px 0;color:#64748b;">Hämtar…</div>');
  let res;
  try { res = await customerApi({ action: 'getOfferForCustomer' }); }
  catch (err) { res = { status: 'error', message: 'Ingen kontakt just nu. Försök igen om en stund.' }; }
  if (res.status !== 'success') {
    customerShell(`<div style="background:#fff;border-radius:18px;padding:24px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.08);">
      <div style="font-size:40px;">📄</div><h1 style="font-size:20px;">Det gick inte att visa dokumentet</h1>
      <p style="color:#475569;">${customerEsc(res.message)}</p></div>`);
    return;
  }
  drawCustomerOffer(res.offer);
}

function drawCustomerOffer(o) {
  const label = o.type === 'ata' ? 'Tilläggsarbete (ÄTA)' : 'Offert';
  const t = o.totals;
  const hasLayout = !!(o.layout && Array.isArray(o.layout.sections) && o.layout.sections.some(sec => Array.isArray(sec.anchor)));
  // Kulörförslag per huskropp: tryck på bilden = före/efter, välj ett alternativ per huskropp
  const colors = o.colorOptions || [];
  const groups = [...new Set(colors.map(c => c.building || ''))];
  const open = !['godkänd', 'avböjd'].includes(o.status) && !o.expired;
  const dot = (c) => c && c.hex ? `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${customerEsc(c.hex)};border:1px solid #cbd5e1;vertical-align:-1px;margin-right:4px;"></span>` : '';
  const colorCard = (c, i, canPick, g) => `<label style="display:block;border:2px solid ${customerPicks[g] === i ? '#0369a1' : '#e2e8f0'};border-radius:14px;overflow:hidden;margin-bottom:10px;cursor:pointer;">
      <img src="${customerEsc(c.url)}" data-after="${customerEsc(c.url)}" data-before="${customerEsc(c.beforeUrl || '')}" alt="Alternativ ${i + 1}" style="width:100%;display:block;"
        onclick="event.preventDefault(); if (this.dataset.before) { const after = this.src.endsWith(this.dataset.after) || this.src === this.dataset.after; this.src = after ? this.dataset.before : this.dataset.after; this.nextElementSibling.firstElementChild.textContent = after ? 'FÖRE' : 'EFTER'; }">
      <div style="padding:8px 10px;font-size:13px;color:#334155;display:flex;gap:8px;align-items:flex-start;">
        <span style="font-size:10px;font-weight:800;background:#0f172a;color:#fff;border-radius:6px;padding:2px 6px;">EFTER</span>
        <span style="flex:1;"><b>Alternativ ${i + 1}</b><br>${dot(c.main)}Fasad: ${customerEsc(c.main ? c.main.name : '')}${c.detail ? `<br>${dot(c.detail)}Detaljer: ${customerEsc(c.detail.name)}` : ''}${c.windows ? `<br>${dot(c.windows)}Fönster/dörrar: ${customerEsc(c.windows.name)}` : ''}</span>
        ${canPick ? `<input type="radio" name="cust-color-${groups.indexOf(g)}" value="${i}" ${customerPicks[g] === i ? 'checked' : ''} onchange="customerPicks[${customerEsc(JSON.stringify(g))}]=${i}" style="width:22px;height:22px;">` : ''}
      </div></label>`;
  const colorsHtml = colors.length ? `<div style="margin-top:14px;"><div style="font-size:13px;font-weight:700;color:#334155;margin-bottom:6px;">🎨 Kulörförslag${open && colors.length > 1 ? ' – välj det du gillar' + (groups.length > 1 ? ' för varje byggnad' : '') : ''}</div>
    ${groups.map(g => {
      const items = colors.map((c, i) => ({ c, i })).filter(x => (x.c.building || '') === g);
      const canPick = open && items.length > 1;
      if (open && items.length === 1) customerPicks[g] = items[0].i; // bara ett förslag = automatiskt valt
      return `${g ? `<div style="font-size:15px;font-weight:800;color:#0f172a;margin:12px 0 6px;">${customerEsc(g)}</div>` : ''}${items.map(x => colorCard(x.c, x.i, canPick, g)).join('')}`;
    }).join('')}
    <div style="font-size:12px;color:#64748b;">Tryck på bilden för att se före/efter. Bilderna är AI-illustrationer – färger på skärm skiljer sig från verklig kulör.</div>
    ${o.chosenColor ? `<div style="font-size:13px;color:#166534;margin-top:6px;">Valt: <b>${customerEsc(o.chosenColor)}</b></div>` : ''}</div>` : '';
  customerColorGroups = groups.filter(g => colors.filter(c => (c.building || '') === g).length > 1);
  const rows = o.rows.map(r => `<tr><td style="padding:8px 4px;border-bottom:1px solid #e2e8f0;">${customerEsc(r.text)}<div style="font-size:12px;color:#64748b;">${r.qty} ${customerEsc(r.unit)} × ${customerMoney(r.price)}</div></td>
    <td style="padding:8px 4px;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap;">${customerMoney(r.qty * r.price)}</td></tr>`).join('');
  let action = '';
  if (o.status === 'godkänd') {
    action = `<div style="background:#dcfce7;border-radius:14px;padding:16px;text-align:center;font-weight:700;color:#166534;">✅ Godkänd av ${customerEsc(o.approvedBy)} ${customerEsc(o.answered)}.<br><span style="font-weight:400;">Tack! Vi hör av oss om när vi kommer.</span></div>`;
  } else if (o.status === 'avböjd') {
    action = `<div style="background:#fee2e2;border-radius:14px;padding:16px;text-align:center;font-weight:700;color:#991b1b;">Du har tackat nej ${customerEsc(o.answered)}.<br><span style="font-weight:400;">Hör gärna av dig om du ändrar dig.</span></div>`;
  } else if (o.expired) {
    action = `<div style="background:#fef3c7;border-radius:14px;padding:16px;text-align:center;color:#92400e;">Offerten gick ut ${customerEsc(o.validUntil)}. Kontakta oss så tar vi fram en ny.</div>`;
  } else {
    action = `
      <label style="font-size:13px;font-weight:700;color:#334155;">Ditt namn</label>
      <input id="cust-name" autocomplete="name" placeholder="För- och efternamn" style="width:100%;box-sizing:border-box;padding:14px;border-radius:12px;border:1px solid #cbd5e1;font-size:16px;margin:6px 0 10px;">
      <label style="font-size:13px;font-weight:700;color:#334155;">Meddelande till oss (valfritt)</label>
      <textarea id="cust-comment" rows="2" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid #cbd5e1;font-size:15px;margin:6px 0 14px;"></textarea>
      <button id="btn-approve" onclick="respondCustomerOffer('godkänd')" style="width:100%;padding:16px;background:#10b981;color:#fff;font-size:17px;font-weight:800;border:none;border-radius:14px;">✅ Godkänn ${o.type === 'ata' ? 'tilläggsarbetet' : 'offerten'}</button>
      <button onclick="respondCustomerOffer('avböjd')" style="width:100%;padding:12px;margin-top:8px;background:transparent;color:#64748b;font-size:14px;font-weight:700;border:1px solid #cbd5e1;border-radius:14px;">Nej tack</button>
      <div id="approval-status" style="margin-top:12px;text-align:center;font-weight:700;"></div>`;
  }
  customerShell(`
    <div style="background:#fff;border-radius:18px;padding:22px;box-shadow:0 10px 30px rgba(0,0,0,.08);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div><div style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;">${label}</div>
          <h1 style="font-size:22px;margin:4px 0 0;color:#0369a1;">${customerEsc(o.title || label)}</h1>
          <div style="font-size:13px;color:#64748b;margin-top:2px;">${customerEsc(o.id)}${o.version > 1 ? ' · version ' + o.version : ''} · till ${customerEsc(o.customerName)}</div></div>
        <div style="text-align:right;font-size:12px;color:#475569;white-space:nowrap;">${['lpv', 'fasadmalarna', 'linjemalarna', 'klaryta'].includes(o.company.brand) ? `<img src="loggor/${o.company.brand}.png" alt="${customerEsc(o.company.name)}" style="display:block;margin-left:auto;max-height:48px;max-width:150px;margin-bottom:4px;">` : ''}<b>${customerEsc(o.company.name)}</b><br>${o.company.phone ? `<a href="tel:${customerEsc(o.company.phone.replace(/[^0-9+]/g, ''))}" style="color:#0369a1;">${customerEsc(o.company.phone)}</a>` : ''}</div>
      </div>
      ${o.site ? `<p style="font-size:14px;color:#334155;margin:14px 0 0;">📍 ${customerEsc(o.site)}</p>` : ''}
      ${o.description ? `<p style="font-size:14px;color:#334155;white-space:pre-wrap;">${customerEsc(o.description)}</p>` : ''}
      ${hasLayout ? `<div style="margin-top:14px;"><div style="font-size:13px;font-weight:700;color:#334155;margin-bottom:6px;">🅿️ Så här blir p-platserna</div>
        <div id="cust-map" style="height:300px;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;background:#e2e8f0;"></div></div>` : ''}
      ${colorsHtml}
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:10px;">${rows}</table>
      <div style="font-size:14px;margin-top:12px;display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;justify-content:space-between;"><span>Summa inkl. moms</span><span>${customerMoney(t.gross)}</span></div>
        ${t.deduction ? `<div style="display:flex;justify-content:space-between;color:#15803d;"><span>${customerEsc(t.deductionLabel)}</span><span>−${customerMoney(t.deduction)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:20px;font-weight:800;color:#0369a1;border-top:1px solid #e2e8f0;padding-top:8px;margin-top:4px;"><span>Att betala</span><span>${customerMoney(t.toPay)}</span></div>
        ${t.deduction ? '<div style="font-size:12px;color:#64748b;">Avdraget förutsätter att Skatteverket godkänner det.</div>' : ''}
      </div>
      <div style="font-size:13px;color:#64748b;margin:12px 0 16px;">Giltig till ${customerEsc(o.validUntil)}${o.pdfUrl ? ` · <a href="${customerEsc(o.pdfUrl)}" target="_blank" rel="noopener" style="color:#0369a1;font-weight:700;">📄 Ladda ner som PDF</a>` : ''}</div>
      ${action}
    </div>`);
  if (hasLayout) showCustomerMap(o.layout);
}

// Ritningen av p-platserna: Leaflet och linjer.js laddas bara när offerten har en ritning
function loadAssetOnce(tag, url) {
  const attr = tag === 'link' ? 'href' : 'src';
  if (document.querySelector(`${tag}[${attr}="${url}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const el = document.createElement(tag);
    if (tag === 'link') { el.rel = 'stylesheet'; el.href = url; } else { el.src = url; }
    el.onload = resolve; el.onerror = reject;
    document.head.appendChild(el);
  });
}

async function showCustomerMap(layout) {
  const box = document.getElementById('cust-map');
  try {
    await loadAssetOnce('link', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
    if (typeof L === 'undefined') await loadAssetOnce('script', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
    if (typeof drawLineLayout === 'undefined') await loadAssetOnce('script', 'linjer.js');
    const map = L.map(box, { scrollWheelZoom: false, maxZoom: 21 });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 21, maxNativeZoom: 19, attribution: '© OpenStreetMap-bidragsgivare' }).addTo(map);
    const group = drawLineLayout(map, layout, { weight: 3 });
    map.fitBounds(group.getBounds(), { padding: [24, 24], maxZoom: 20 });
  } catch (err) {
    if (box) box.innerHTML = '<div style="padding:30px;text-align:center;color:#64748b;font-size:13px;">Kartan kunde inte laddas just nu.</div>';
  }
}

async function respondCustomerOffer(decision) {
  const statusDiv = document.getElementById('approval-status');
  const name = (document.getElementById('cust-name')?.value || '').trim();
  const comment = (document.getElementById('cust-comment')?.value || '').trim();
  if (decision === 'godkänd' && name.length < 2) { statusDiv.style.color = '#b91c1c'; statusDiv.textContent = 'Skriv ditt namn för att godkänna.'; return; }
  const missing = customerColorGroups.filter(g => customerPicks[g] === undefined);
  if (decision === 'godkänd' && missing.length) {
    statusDiv.style.color = '#b91c1c';
    statusDiv.textContent = 'Välj ett kulörförslag' + (missing.some(Boolean) ? ' för ' + missing.filter(Boolean).join(' och ').toLowerCase() : '') + ' ovan.';
    return;
  }
  if (decision === 'avböjd' && !confirm('Vill du tacka nej?')) return;
  document.querySelectorAll('button').forEach(b => { b.disabled = true; });
  statusDiv.style.color = '#334155'; statusDiv.textContent = 'Skickar… ⏳';
  try {
    const res = await customerApi({ action: 'respondOffer', decision, name, comment, chosenColors: Object.values(customerPicks) });
    if (res.status !== 'success') throw new Error(res.message || 'Okänt fel');
    drawCustomerOffer(res.offer);
  } catch (err) {
    document.querySelectorAll('button').forEach(b => { b.disabled = false; });
    statusDiv.style.color = '#b91c1c';
    statusDiv.textContent = '❌ ' + (err.message || 'Kunde inte spara. Försök igen.');
  }
}

document.addEventListener('DOMContentLoaded', checkCustomerUrlParams);

// Lås maskinparken för UE (Inga tunga LPV-maskiner, och inga Admin-bubblor)
window.originalApplyUE = window.applyUEConstraints;
window.applyUEConstraints = function() {
  if (typeof window.originalApplyUE === 'function') window.originalApplyUE();
  const isUE = window.isUserUE;
  
  const bubbles = document.querySelectorAll('#vehicle-bubbles-container .glass-bubble');
  bubbles.forEach(bubble => {
    const text = bubble.innerText.toUpperCase();
    const isInternal = text.includes('KRAMER') || text.includes('JOHN DEERE') || text.includes('TRANSIT');
    if (isUE && isInternal) {
      bubble.style.display = 'none'; // Göm LPV-maskiner för UE
    } else {
      bubble.style.display = 'inline-flex';
    }
  });

  const addBtn = document.querySelector('.add-bubble-btn');
  if (addBtn) {
    addBtn.style.display = isUE ? 'none' : 'inline-flex';
  }
};
applyUEConstraints = window.applyUEConstraints;
document.addEventListener('DOMContentLoaded', window.applyUEConstraints);

// ==========================================
// DYNAMISK VERSIONSMÄRKNING (v4.7.1)
// ==========================================
const CURRENT_APP_VERSION = 'DEV v4.7.1';

function updateVersionBadge() {
  const badge = document.getElementById('app-version-tag');
  if (badge) {
    badge.innerText = CURRENT_APP_VERSION;
  }
}

document.addEventListener('DOMContentLoaded', updateVersionBadge);
// Statusraden syns bara när något är fel (docs/designsprak.md): ingen täckning
function updateStatusPill() {
  const pill = document.getElementById('status-pill');
  if (!pill) return;
  pill.hidden = navigator.onLine;
  const dot = pill.querySelector('.status-dot'); if (dot) dot.style.background = 'var(--warn)';
  const txt = document.getElementById('status-text'); if (txt) txt.textContent = 'Ingen täckning – passen skickas sen';
}
document.addEventListener('DOMContentLoaded', updateStatusPill);
window.addEventListener('online', updateStatusPill);
window.addEventListener('offline', updateStatusPill);
window.updateVersionBadge = updateVersionBadge;

// ==========================================
// OFFERTBESÖK & DYNAMISKA MALLAR (ÅTERSTÄLLDA)
// ==========================================
function handleActivityChange() {
  const activitySelect = document.getElementById('activity-select');
  if (!activitySelect) return;
  const activity = activitySelect.value;
  let templateContainer = document.getElementById('offert-template-container');
  
  if (!templateContainer) {
    templateContainer = document.createElement('div');
    templateContainer.id = 'offert-template-container';
    activitySelect.parentNode.insertBefore(templateContainer, activitySelect.nextSibling);
  }
  
  if (activity === 'offertbesok') {
    templateContainer.style.display = 'block';
    templateContainer.innerHTML = `
      <div style="background:var(--input-bg); padding:16px; border-radius:12px; margin-top:12px; border:1px solid var(--glass-border);">
        <label style="font-weight:800; font-size:13px; color:var(--text-main);">Välj typ av Offertbesök:</label>
        <select id="offert-type" onchange="renderOffertTemplate()" style="width:100%; padding:12px; border-radius:8px; margin-top:6px; background:var(--card-bg); color:var(--text-main); border:1px solid var(--glass-border);">
          <option value="">-- Välj mall --</option>
          <option value="sno">❄️ Snöröjning & Halkbekämpning</option>
          <option value="bygg">🏗️ Byggställning</option>
          <option value="mark">🚧 Markarbete / Sopning</option>
        </select>
        <div id="dynamic-template-content" style="margin-top:12px;"></div>
      </div>
    `;
  } else {
    templateContainer.style.display = 'none';
  }
}

function renderOffertTemplate() {
  const type = document.getElementById('offert-type')?.value;
  const content = document.getElementById('dynamic-template-content');
  if (!content) return;
  
  if (type === 'sno') {
    content.innerHTML = `
      <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">📱 Använd telefonens Mät-app (LiDAR)</div>
      <input type="number" placeholder="Total yta (m²)" style="width:100%; padding:12px; margin-bottom:8px; border-radius:8px; border:1px solid var(--glass-border); background:var(--card-bg); color:var(--text-main);">
      <label style="font-size:13px; font-weight:700;"><input type="checkbox"> Snöupplag fotat</label>
    `;
  } else if (type === 'bygg') {
    content.innerHTML = `
      <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">📱 Använd telefonens Mät-app (LiDAR)</div>
      <input type="number" placeholder="Längd på fasad (m)" style="width:100%; padding:12px; margin-bottom:8px; border-radius:8px; border:1px solid var(--glass-border); background:var(--card-bg); color:var(--text-main);">
    `;
  } else if (type === 'mark') {
    content.innerHTML = `
      <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">📱 Använd telefonens Mät-app (LiDAR)</div>
      <input type="number" placeholder="Total yta (m²)" style="width:100%; padding:12px; margin-bottom:8px; border-radius:8px; border:1px solid var(--glass-border); background:var(--card-bg); color:var(--text-main);">
    `;
  } else {
    content.innerHTML = '';
  }
}
window.renderOffertTemplate = renderOffertTemplate;
window.handleActivityChange = handleActivityChange;
