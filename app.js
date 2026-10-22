// ==========================================
// LPV & KLARYTA v3.0 - MAIN APP ENGINE
// ==========================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('SW aktiv:', reg.scope))
      .catch((err) => console.error('SW fel:', err));
  });

  navigator.serviceWorker.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'SYNC_COMPLETE') {
      drafts = await loadAllDrafts();
      renderOutbox();
      updateDashboardData();
    }
  });
}

// Global data & state
let drafts = [];
let plannedJobs = [];
let currentActivity = "";
let currentJobType = "nya";
let currentImagesBase64 = [];
let isSubmitting = false;

// URL & Användarhantering
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('user')) localStorage.setItem('lpv_user', urlParams.get('user'));
if (urlParams.has('admin')) {
  const isAdm = urlParams.get('admin').toLowerCase() === 'true' || urlParams.get('admin') === '1';
  localStorage.setItem('lpv_is_admin', isAdm ? 'true' : 'false');
}

const currentUser = urlParams.get('user') || localStorage.getItem('lpv_user') || 'Daniel';
let isAdmin = (urlParams.get('admin') && (urlParams.get('admin').toLowerCase() === 'true' || urlParams.get('admin') === '1')) || localStorage.getItem('lpv_is_admin') === 'true';

let adminUserList = [];
let hasFetchedUsers = false;

// 1. IndexedDB (Offline-valvet)
const DB_NAME = "LPV_Tidrapport_DB";
const DB_VERSION = 1;
const STORE_NAME = "drafts";
let db;

function initDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };
    request.onerror = (event) => {
      reject(event.target.errorCode);
    };
  });
}

async function loadAllDrafts() {
  return new Promise((resolve) => {
    if (!db) return resolve([]);
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
}

async function saveDraftsToStorage() {
  if (!db) return;
  const transaction = db.transaction([STORE_NAME], "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  store.clear();
  drafts.forEach(draft => store.put(draft));
  return new Promise((resolve) => {
    transaction.oncomplete = () => {
      requestBackgroundSync();
      resolve();
    };
  });
}

async function requestBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-drafts');
    } catch (err) {
      console.log('Background sync ej tillgänglig:', err);
    }
  }
}

// 2. Ikon-bibliotek
function getActivityIcon(name) {
  const n = (name || "").toLowerCase();
  if (n.includes('kyl') || n.includes('frys')) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="5" cy="19" r="2"/><path d="M5 17L8 4m-2-1h3M7 19h13"/><rect x="9.5" y="4" width="10.5" height="13" rx="1.5"/><path d="M14.5 4v10M13.5 7v4m2.5-4v4M11.5 15.5h6.5"/></svg>`;
  }
  if (n.includes('snö') || n.includes('plog')) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 4v4m-2-2h4m-3.5-1.5l3 3m-3 0l3-3"/><path d="M12 16v-6h-4l-2-4h-4v10"/><circle cx="5" cy="16" r="2"/><circle cx="12" cy="16" r="2"/></svg>`;
  }
  if (n.includes('bandgrävare') || n.includes('gräv')) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="15" width="13" height="5" rx="2.5"/><circle cx="5.5" cy="17.5" r="1"/><circle cx="9.5" cy="17.5" r="1"/><circle cx="13.5" cy="17.5" r="1"/><path d="M5 15v-5a2 2 0 0 1 2-2h4v7M9 11l4-5 6 4-2 4M17 14h4l1-3-3-2"/></svg>`;
  }
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/></svg>`;
}

// 3. Utkorgs-rendering
function renderOutbox() {
  const container = document.getElementById('outbox-container');
  const section = document.getElementById('outbox-section');
  const title = document.getElementById('outbox-title');
  const submitBtn = document.getElementById('btnSubmitAll');
  if (!container) return;

  container.innerHTML = '';

  if (drafts.length === 0 && plannedJobs.length === 0) {
    if (title) title.innerText = "Dagens pass (0 st)";
    if (submitBtn) submitBtn.style.display = 'none';
    container.innerHTML = `
      <div class="draft-card empty-placeholder">
        <div style="font-size: 13px; color: var(--text-muted);">
          Inga sparade pass än. Fyll i passet nedan och tryck på <strong>Spara pass lokalt</strong>.
        </div>
      </div>
    `;
    return;
  }

  const readyToSend = drafts.filter(d => d.start && d.end);
  if (submitBtn) submitBtn.style.display = readyToSend.length > 0 ? 'flex' : 'none';

  let totalHours = 0;
  drafts.forEach(d => { if (d.start && d.end) totalHours += parseFloat(calculateHours(d.start, d.end)); });
  if (title) title.innerText = `Dagens pass (${drafts.length} st • ${totalHours.toFixed(1)} h)`;

  drafts.forEach(draft => {
    const card = document.createElement('div');
    card.className = 'draft-card';
    const iconSvg = getActivityIcon(draft.activity);
    const isOngoing = !draft.end;
    const timeDisplay = isOngoing ? '<span class="ongoing-pulse">Pågår</span>' : `${draft.start} – ${draft.end}`;
    const hoursDisplay = isOngoing ? '' : `${calculateHours(draft.start, draft.end).toFixed(1)} h`;
    const ataBadge = draft.type === 'ata' ? `<span class="badge-ata">${draft.ataNumber || 'ÄTA'}</span>` : '';

    let actionButtons = isOngoing ? `
      <button class="btn-action clock-out" onclick="clockOut(${draft.id})">Stämpla ut nu</button>
      <button class="btn-action delete" onclick="deleteDraft(${draft.id})" style="flex:0 0 50px;">Radera</button>
    ` : `
      <button class="btn-action delete" onclick="deleteDraft(${draft.id})">Radera</button>
    `;

    card.innerHTML = `
      <div class="card-body">
        <div class="card-title">
          <span style="color:var(--accent-blue); margin-right:8px; display:inline-flex;">${iconSvg}</span>
          ${ataBadge}
          <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${draft.place || 'Uppdrag'}</span>
        </div>
        <div class="card-meta">
          <span>${draft.date}</span>
          <span class="dot">•</span>
          <span>${timeDisplay}</span>
          ${hoursDisplay ? `<span class="dot">•</span><span>${hoursDisplay}</span>` : ''}
        </div>
        ${draft.notes ? `<div class="card-note">${draft.notes}</div>` : ''}
      </div>
      <div class="card-actions">${actionButtons}</div>
    `;
    container.appendChild(card);
  });
}

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
        <div style="font-weight:600;">${p.place || 'Uppdrag'}</div>
        <div style="font-size:11px; color:var(--text-muted);">${p.activity || 'Övrigt'} (${p.start}–${p.end || 'Pågår'})</div>
      </div>
      <div style="font-weight:600; color:var(--accent-blue);">${hours.toFixed(1)} h</div>
    `;
    listEl.appendChild(row);
  });
  totalHoursEl.innerText = `${totalH.toFixed(1)} h`;
}

function calculateHours(start, end) {
  if (!start || !end) return 0;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  let diff = (endH + endM / 60) - (startH + startM / 60);
  if (diff < 0) diff += 24;
  return diff;
}

function clockOut(id) {
  const nu = new Date();
  const timeString = nu.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  const draftIndex = drafts.findIndex(d => d.id === id);
  if (draftIndex !== -1) {
    drafts[draftIndex].end = timeString;
    drafts[draftIndex].totalHours = calculateHours(drafts[draftIndex].start, timeString).toFixed(1);
    saveDraftsToStorage();
    renderOutbox();
    updateDashboardData();
  }
}

function deleteDraft(id) {
  drafts = drafts.filter(draft => draft.id !== id);
  saveDraftsToStorage();
  renderOutbox();
  updateDashboardData();
}

// 4. AUTOMATISK ADMIN-KONTROLL OCH ANVÄNDARHÄMTNING
async function fetchAdminUsers() {
  const select = document.getElementById('admin-target-user');
  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        token: CONFIG.API_TOKEN,
        action: 'getUsers'
      })
    });
    const data = await res.json();
    if (data.status === 'success') {
      adminUserList = data.users || [];
      hasFetchedUsers = true;

      // KONTROLLERA OM INLOGGAD ANVÄNDARE ÄR ADMIN I DATABASEN
      const userProfile = adminUserList.find(u => u.name.toLowerCase() === currentUser.toLowerCase());
      if (userProfile && userProfile.isAdmin) {
        isAdmin = true;
        localStorage.setItem('lpv_is_admin', 'true');
        updateAdminUI();
      }

      if (select) {
        select.innerHTML = '<option value="">Välj person...</option>';
        adminUserList.forEach(u => {
          select.innerHTML += `<option value="${u.name}">${u.name}</option>`;
        });
      }
    }
  } catch (err) {
    console.log("Kunde inte hämta användarlista:", err);
  }
}

function updateAdminUI() {
  const userDisplay = document.getElementById('user-display');
  if (userDisplay) {
    userDisplay.innerText = isAdmin ? `${currentUser} 👑` : currentUser;
    userDisplay.classList.toggle('is-admin', isAdmin);
  }
  const adminSection = document.getElementById('admin-tools-section');
  if (adminSection) {
    adminSection.style.display = isAdmin ? 'block' : 'none';
  }
}

function handleUserPillClick() {
  isAdmin = !isAdmin;
  localStorage.setItem('lpv_is_admin', isAdmin ? 'true' : 'false');
  updateAdminUI();
}

async function submitAll() {
  const readyToSend = drafts.filter(d => d.start && d.end);
  if (readyToSend.length === 0) return;
  const btn = document.getElementById('btnSubmitAll');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: JSON.stringify({
        token: CONFIG.API_TOKEN,
        action: 'batchReports',
        pass: readyToSend
      })
    });
    const result = await res.json();
    if (result && result.status === 'success') {
      const idsToRemove = readyToSend.map(d => d.id);
      drafts = drafts.filter(d => !idsToRemove.includes(d.id));
      await saveDraftsToStorage();
      renderOutbox();
      updateDashboardData();
      alert(`Klart! ${result.count || readyToSend.length} pass har sparats i kalkylarket.`);
    }
  } catch (err) {
    console.error("Fel vid inskickning:", err);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// 5. Initiering vid sidstart
async function initApp() {
  await initDatabase();
  drafts = await loadAllDrafts();
  
  const dateInput = document.getElementById('input-date');
  if (dateInput) {
    const now = new Date();
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    dateInput.value = localDate;
  }

  const startInput = document.getElementById('input-start');
  if (startInput) {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    startInput.value = `${h}:${m}`;
  }

  const welcomeTitle = document.getElementById('welcome-title');
  if (welcomeTitle) {
    const hour = new Date().getHours();
    let greeting = "God dag";
    if (hour < 10) greeting = "God morgon";
    else if (hour > 17) greeting = "God kväll";
    welcomeTitle.innerText = `${greeting}, ${currentUser}!`;
  }

  const savedAvatar = localStorage.getItem('lpv_user_avatar');
  const avatarImg = document.getElementById('user-pat-avatar');
  if (savedAvatar && avatarImg) {
    avatarImg.src = savedAvatar;
  }

  updateAdminUI();
  fetchAdminUsers(); // Hämtar från Sheets och sätter Admin automatiskt om kontot är flaggat som Admin

  renderOutbox();
  updateDashboardData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

window.initApp = initApp;
window.renderOutbox = renderOutbox;
window.updateDashboardData = updateDashboardData;
window.clockOut = clockOut;
window.deleteDraft = deleteDraft;
window.submitAll = submitAll;
window.handleUserPillClick = handleUserPillClick;

function openKabanossModal() {
  if (typeof initAdminViews === 'function') {
    initAdminViews();
  } else {
    alert("Kabanoss-motorn öppnas! (Skrolla ned eller växla vy)");
  }
}
window.openKabanossModal = openKabanossModal;

function openKabanossModalWithTab(tab) {
  openKabanossModal();
  switchAdminTab(tab);
}

function switchAdminTab(tab) {
  const views = ['kabanoss', 'radar', 'crm', 'offert'];
  views.forEach(v => {
    const el = document.getElementById(v + '-view');
    if (el) el.style.display = (v === tab) ? (v === 'kabanoss' ? 'grid' : 'block') : 'none';
  });
}

window.openKabanossModalWithTab = openKabanossModalWithTab;
window.switchAdminTab = switchAdminTab;

// ==========================================
// AVATAR & SELFIE UPLOAD
// ==========================================
function openAvatarModal() {
  const fileInput = document.getElementById('avatar-upload');
  if (fileInput) fileInput.click();
}

async function processAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const titleEl = document.getElementById('welcome-title');
  const oldTitle = titleEl.innerText;
  titleEl.innerText = "Laddar in AI-Avatar...";

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = async function() {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 400; // Optimal storlek för Base64 avatar

      // Kvadratisk beskärning i mitten
      const size = Math.min(img.width, img.height);
      const offsetX = (img.width - size) / 2;
      const offsetY = (img.height - size) / 2;

      canvas.width = MAX_SIZE;
      canvas.height = MAX_SIZE;
      const ctx = canvas.getContext('2d');
      
      // Rita in bilden centrerad och krympt
      ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, MAX_SIZE, MAX_SIZE);

      const base64Avatar = canvas.toDataURL('image/jpeg', 0.8);

      // Uppdatera gränssnittet direkt
      document.getElementById('user-pat-avatar').src = base64Avatar;
      localStorage.setItem('lpv_user_avatar', base64Avatar);

      // Synka till databasen
      try {
        const res = await fetch(CONFIG.API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          body: JSON.stringify({
            token: CONFIG.API_TOKEN,
            action: 'updateAvatar',
            user: currentUser,
            avatar: base64Avatar
          })
        });
        const result = await res.json();
        if (result && result.status === 'success') {
          titleEl.innerText = "Avatar sparad! ✅";
          setTimeout(() => { titleEl.innerText = oldTitle; }, 2500);
        }
      } catch (err) {
        console.error("Fel vid avatar-synk:", err);
        titleEl.innerText = "Sparad lokalt!";
        setTimeout(() => { titleEl.innerText = oldTitle; }, 2500);
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

window.openAvatarModal = openAvatarModal;
window.processAvatarUpload = processAvatarUpload;

// ==========================================
// AVATAR & SELFIE UPLOAD (v3.3)
// ==========================================
function openAvatarModal() {
  const fileInput = document.getElementById('avatar-upload');
  if (fileInput) fileInput.click();
}

async function processAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const titleEl = document.getElementById('welcome-title');
  const oldTitle = titleEl ? titleEl.innerText : "God dag!";
  if (titleEl) titleEl.innerText = "Laddar in AI-Avatar...";

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = async function() {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 400; // Kvadratisk storlek i px

      // Centrerad kvadratisk beskärning
      const size = Math.min(img.width, img.height);
      const offsetX = (img.width - size) / 2;
      const offsetY = (img.height - size) / 2;

      canvas.width = MAX_SIZE;
      canvas.height = MAX_SIZE;
      const ctx = canvas.getContext('2d');
      
      ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, MAX_SIZE, MAX_SIZE);

      const base64Avatar = canvas.toDataURL('image/jpeg', 0.8);

      // Uppdatera gränssnittet och lokal lagring
      const avatarImg = document.getElementById('user-pat-avatar');
      if (avatarImg) avatarImg.src = base64Avatar;
      localStorage.setItem('lpv_user_avatar', base64Avatar);

      // Synka till Google Sheets
      try {
        const res = await fetch(CONFIG.API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          body: JSON.stringify({
            token: CONFIG.API_TOKEN,
            action: 'updateAvatar',
            user: currentUser,
            avatar: base64Avatar
          })
        });
        const result = await res.json();
        if (result && result.status === 'success') {
          if (titleEl) titleEl.innerText = "Avatar sparad! ✅";
          setTimeout(() => { if (titleEl) titleEl.innerText = oldTitle; }, 2500);
        }
      } catch (err) {
        console.error("Fel vid avatar-synk:", err);
        if (titleEl) titleEl.innerText = "Sparad lokalt!";
        setTimeout(() => { if (titleEl) titleEl.innerText = oldTitle; }, 2500);
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

window.openAvatarModal = openAvatarModal;
window.processAvatarUpload = processAvatarUpload;

// ==========================================
// FLYGLEDARTORNET / KABANOSS MODAL (v3.4 - Utan Popups)
// ==========================================
function openKabanossModal() {
  const modal = document.getElementById('kabanossModal');
  if (modal) {
    modal.classList.add('active');
  }
}

function closeKabanossModal() {
  const modal = document.getElementById('kabanossModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function openKabanossModalWithTab(tab) {
  openKabanossModal();
  switchAdminTab(tab);
}

function switchAdminTab(tab) {
  const views = ['kabanoss', 'radar', 'crm', 'offert'];
  views.forEach(v => {
    const el = document.getElementById(v + '-view');
    if (el) el.style.display = (v === tab) ? (v === 'kabanoss' ? 'grid' : 'block') : 'none';
  });
}

window.openKabanossModal = openKabanossModal;
window.closeKabanossModal = closeKabanossModal;
window.openKabanossModalWithTab = openKabanossModalWithTab;
window.switchAdminTab = switchAdminTab;

// ==========================================
// FORDONSPARK & UTRUSTNING (v3.5 Postis Per 3D-Glas)
// ==========================================
const VEHICLE_PARK = [
  { id: 'v1', name: 'Kramer Hjullastare (Svart huv)', icon: '🚜', color: '#1e293b' },
  { id: 'v2', name: 'Multiloader LT 30 (Gul)', icon: '🟡', color: '#eab308' },
  { id: 'v3', name: 'John Deere 3520 (Grön)', icon: '🚜', color: '#15803d' },
  { id: 'v4', name: 'Ford Transit (Silver/Grå + Blinkljus)', icon: '🚐', color: '#64748b' },
  { id: 'v5', name: 'Ford Transit (Vit + Blinkramp)', icon: '🚐', color: '#f8fafc' },
  { id: 'v6', name: 'Släpkärra #1 (Gallergrind)', icon: '🛒', color: '#94a3b8' },
  { id: 'v7', name: 'Släpkärra #2 (Gallergrind)', icon: '🛒', color: '#94a3b8' },
  { id: 'v8', name: 'Kärra m. Byggställning', icon: '🏗️', color: '#0284c7' }
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
