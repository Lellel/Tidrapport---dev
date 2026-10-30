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
if (appUrlParams.has('key')) {
  localStorage.setItem('lpv_key', appUrlParams.get('key'));
  const cleanParams = new URLSearchParams(window.location.search);
  cleanParams.delete('key');
  const cleanQuery = cleanParams.toString();
  history.replaceState(null, '', window.location.pathname + (cleanQuery ? '?' + cleanQuery : ''));
}

window.currentUser = appUrlParams.get('user') || localStorage.getItem('lpv_user') || localStorage.getItem('lpv_user_name') || 'Daniel';
var currentUser = window.currentUser;
let isAdmin = localStorage.getItem('lpv_is_admin') === 'true';

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
    body: JSON.stringify({ ...getAuthFields(), ...payload })
  });
  return res.json();
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
function closeSheet() { document.getElementById('sheetBackdrop')?.classList.remove('active'); }

function selectActivity(name) {
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

function clockInPlannedJob(jobId) {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  const job = plannedJobs.find(j => String(j.id) === String(jobId) || j.id === jobId);
  if (!job) {
    console.error("Kunde inte hitta jobb med ID:", jobId, plannedJobs);
    return;
  }

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
    activity: job.title || 'Planerat jobb',
    notes: job.description || '',
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
    return;
  }

  const readyToSend = drafts.filter(d => d.start && d.end);
  if (submitBtn) submitBtn.style.display = readyToSend.length > 0 ? 'flex' : 'none';

  let totalHours = 0;
  drafts.forEach(d => { if (d.start && d.end) totalHours += parseFloat(calculateHours(d.start, d.end)); });
  title.innerText = `Dagens pass (${drafts.length} st • ${totalHours.toFixed(1)} h)`;

  // Rendera Buffert och Planerade jobb
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
          <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${job.title}</span>
        </div>
        <div class="card-meta" style="margin-top:6px;">
          ${badgeHtml}
          <span style="color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:120px;">${job.place}</span>
          ${job.start ? `<span class="dot">•</span><span>${job.start}</span>` : ''}
        </div>
        ${job.description ? `<div class="card-note">${job.description}</div>` : ''}
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

    let actionButtons = isOngoing ? `
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
    `;

    card.innerHTML = `
      <div class="card-body">
        <div class="card-title">
          <span style="display:inline-flex; align-items:center; color:var(--accent); margin-right:8px; flex-shrink:0;">${iconSvg}</span>
          ${ataBadge}
          <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:110px;">${draft.place}</span>
          <span class="dot">•</span>
          <span style="font-weight:400; color:#A1A1A6; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${draft.activity}</span>
        </div>
        <div class="card-meta">
          <span>${draft.date}</span>
          <span class="dot">•</span>
          <span>${timeDisplay}</span>
          ${hoursDisplay ? `<span class="dot">•</span><span style="color:#FFF; font-weight:500;">${hoursDisplay}</span>` : ''}
          ${photoIcon}
        </div>
        ${draft.notes ? `<div class="card-note">${draft.notes}</div>` : ''}
      </div>
      <div class="card-actions">${actionButtons}</div>
    `;
    container.appendChild(card);
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
      select.innerHTML = '<option value="">Fel vid hämtning</option>';
    }
  } catch (err) {
    select.innerHTML = '<option value="">Offline</option>';
  }
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
  if (phone) window.location.href = `sms.html?to=${encodeURIComponent(phone)}&body=${encodeURIComponent(message)}`;
  else window.location.href = `sms:?&body=${encodeURIComponent(message)}`;
}

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
  if (!confirm(`Spärra ${targetUser}s nuvarande inloggningslänk och skapa en ny?\n\n${targetUser} behöver då få den nya länken.`)) return;
  const targetUrl = await getAdminTargetUrl(true);
  if (!targetUrl) return;
  alert(`Klart! ${targetUser}s gamla länk fungerar inte längre. Skicka den nya via SMS, Mail eller QR.`);
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

function openKabanossModal() {
  const modal = document.getElementById('kabanossModal');
  if (modal) modal.classList.add('active');
}

function closeKabanossModal() {
  const modal = document.getElementById('kabanossModal');
  if (modal) modal.classList.remove('active');
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
// DARK MODE / TEMA-HANTÉRING (v3.8)
// ==========================================
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('lpv_theme', isDark ? 'dark' : 'light');
  updateThemeIcon(isDark);
}

function initTheme() {
  const savedTheme = localStorage.getItem('lpv_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.body.classList.add('dark-mode');
    updateThemeIcon(true);
  } else {
    document.body.classList.remove('dark-mode');
    updateThemeIcon(false);
  }
}

function updateThemeIcon(isDark) {
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.innerText = isDark ? '☀️' : '🌙';
}

document.addEventListener('DOMContentLoaded', initTheme);
window.toggleDarkMode = toggleDarkMode;

// ==========================================
// DARK MODE / TEMA-HANTÉRING (v3.8)
// ==========================================
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('lpv_theme', isDark ? 'dark' : 'light');
  updateThemeIcon(isDark);
}

function initTheme() {
  const savedTheme = localStorage.getItem('lpv_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.body.classList.add('dark-mode');
    updateThemeIcon(true);
  } else {
    document.body.classList.remove('dark-mode');
    updateThemeIcon(false);
  }
}

function updateThemeIcon(isDark) {
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.innerText = isDark ? '☀️' : '🌙';
}

document.addEventListener('DOMContentLoaded', initTheme);
window.toggleDarkMode = toggleDarkMode;

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

      localStorage.setItem('lpv_user_avatar', base64Avatar);
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

// SWITCH TAB MED PROGRAMGOLVS-SUPPORT (v4.2)
function switchAdminTab(tab) {
  const views = ['kabanoss', 'radar', 'crm', 'offert'];
  views.forEach(v => {
    const el = document.getElementById(v + '-view');
    if (el) {
      if (v === tab) {
        el.style.display = (v === 'kabanoss') ? 'grid' : 'block';
        el.classList.add('view-container');
      } else {
        el.style.display = 'none';
      }
    }
  });
}

window.switchAdminTab = switchAdminTab;

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
// FULL VYY-RENDERING OCH RESURSER (v4.4)
// ==========================================

function switchAdminTab(tab) {
  const views = ['kabanoss', 'radar', 'crm', 'offert'];
  views.forEach(v => {
    const el = document.getElementById(v + '-view');
    if (el) {
      if (v === tab) {
        el.style.display = 'block';
        el.classList.add('view-container');
      } else {
        el.style.display = 'none';
      }
    }
  });

  if (tab === 'kabanoss') renderKabanossBoard();
  if (tab === 'radar') renderRadarGantt();
  if (tab === 'crm') renderCRMView();
  if (tab === 'offert') { location.href = 'offerter.html'; return; }
}

// 1. KABANOSS MED FALLBACK-RESURSER
async function renderKabanossBoard() {
  const cols = document.querySelectorAll('.kabanoss-column');
  if (cols.length === 0) return;

  const sampleJobs = [
    { id: 'j101', title: 'Coop Kylflytt', time: 'Mån 08:00', vehicle: 'Kramer Hjullastare (Svart huv)', driver: 'Daniel', status: 'planned' },
    { id: 'j102', title: 'Snöröjning Blacksta', time: 'Tis 04:00', vehicle: 'John Deere 3520 (Grön)', driver: 'UE Johanssons', status: 'planned' },
    { id: 'j103', title: 'Byggställning ICA', time: 'Ons 07:00', vehicle: 'Kärra m. Byggställning', driver: 'Personal', status: 'opportunity' },
    { id: 'j104', title: 'Handskottning & Sandning', time: 'Tor 06:00', vehicle: 'Ford Transit Flak (Silver)', driver: 'Mikael', status: 'in_progress' }
  ];

  cols.forEach(col => col.innerHTML = '');

  sampleJobs.forEach(job => {
    const card = document.createElement('div');
    card.className = 'kabanoss-card';
    card.dataset.id = job.id;
    card.dataset.status = job.status;
    card.style.cssText = 'padding: 14px; margin-bottom: 12px; border-radius: 14px; cursor: grab;';
    
    
    card.innerHTML = `
      <div style="font-weight:800; font-size:15px; color:var(--text-main);">${job.title}</div>
      <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">⏱️ ${job.time}</div>
      <div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:4px;">
        <span class="glass-bubble" style="font-size:11px; padding:4px 8px; margin:0;">🚜 ${job.vehicle}</span>
        <span class="glass-bubble" style="font-size:11px; padding:4px 8px; margin:0;">👤 ${job.driver}</span>
      </div>
    `;


    const targetCol = document.querySelector(`.kabanoss-column[data-status="${job.status}"]`) || document.getElementById('col-planned');
    if (targetCol) targetCol.appendChild(card);
  });

  if (typeof initKabanossDrag === 'function') initKabanossDrag();
}

// 2. FRAMTIDSRADARN (GANTT)
function renderRadarGantt() {
  const container = document.getElementById('radar-view');
  if (!container) return;

  container.innerHTML = `
    <h2 style="margin:0 0 12px 0; font-size:18px; color:var(--text-main);">🔭 Framtidsradarn (7-Dagars Resursöversikt)</h2>
    <div class="gantt-grid">
      <div style="display:grid; grid-template-columns: 180px repeat(7, 1fr); gap:8px; font-weight:700; font-size:12px; margin-bottom:12px; border-bottom:1px solid var(--glass-border); padding-bottom:8px;">
        <div>Resurs / Maskin</div>
        <div>Mån</div><div>Tis</div><div>Ons</div><div>Tor</div><div>Fre</div><div>Lör</div><div>Sön</div>
      </div>
      <div style="display:grid; grid-template-columns: 180px repeat(7, 1fr); gap:8px; font-size:12px; align-items:center; margin-bottom:8px;">
        <div>🚜 Kramer (Svart huv)</div>
        <div style="background:#0284c7; color:#fff; padding:4px; border-radius:6px; text-align:center;">Coop</div>
        <div>-</div>
        <div style="background:#0284c7; color:#fff; padding:4px; border-radius:6px; text-align:center;">ICA</div>
        <div>-</div><div>-</div><div>-</div><div>-</div>
      </div>
      <div style="display:grid; grid-template-columns: 180px repeat(7, 1fr); gap:8px; font-size:12px; align-items:center; margin-bottom:8px;">
        <div>🚜 John Deere 3520</div>
        <div>-</div>
        <div style="background:#10b981; color:#fff; padding:4px; border-radius:6px; text-align:center;">Blacksta</div>
        <div>-</div>
        <div style="background:#10b981; color:#fff; padding:4px; border-radius:6px; text-align:center;">Handskottning</div>
        <div>-</div><div>-</div><div>-</div>
      </div>
      <div style="display:grid; grid-template-columns: 180px repeat(7, 1fr); gap:8px; font-size:12px; align-items:center;">
        <div>🚚 Ford Transit Flak</div>
        <div style="background:#f59e0b; color:#fff; padding:4px; border-radius:6px; text-align:center;">Byggställn.</div>
        <div>-</div><div>-</div><div>-</div><div>-</div><div>-</div><div>-</div>
      </div>
    </div>
  `;
}


// 3. CRM & KUNDBILD (MED KARTNÅL OCH AUTO-LOGGA)
function renderCRMView() {
  const container = document.getElementById('crm-view');
  if (!container) return;

  const customers = [
    { name: 'Coop Fastigheter AB', id: 'K-1001', address: 'Storgatan 12, Katrineholm', email: 'info@coop.se', activeJob: 'Kylflytt & Snöröjning', offertData: 'Underlag: Snöröjning (450 m²)' },
    { name: 'Blacksta Vägförening', id: 'K-1002', address: 'Blacksta Väg 4, Katrineholm', email: 'kontakt@blacksta.se', activeJob: 'Snöröjning & Handskottning', offertData: 'Inget aktivt offertunderlag' },
    { name: 'ICA Supermarket', id: 'K-1003', address: 'Torget 1, Katrineholm', email: 'info@ica.se', activeJob: 'Byggställning & Underhåll', offertData: 'Skickad Offert: Byggställning - VÄNTAR' }
  ];

  let html = `<h2 style="margin:0 0 12px 0; font-size:18px; color:var(--text-main);">💼 360° Kundbild & CRM</h2>`;
  customers.forEach(c => {
    const domain = c.email.split('@')[1];
    const logoUrl = `https://logo.clearbit.com/${domain}`;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`;
    
    html += `
      <div class="crm-card" style="background:var(--input-bg); border-radius:14px; padding:16px; margin-top:12px; color:var(--text-main);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="display:flex; gap:12px; align-items:center;">
            <img src="${logoUrl}" onerror="this.outerHTML='<div class=\'glass-bubble\' style=\'margin:0;\'>🏢</div>'" style="width:40px; height:40px; border-radius:10px; object-fit:contain; background:#fff; padding:2px; border:1px solid var(--glass-border);">
            <div>
              <div style="font-weight:800; font-size:16px;">${c.name} <small style="color:var(--text-muted);">(${c.id})</small></div>
              <div style="font-size:13px; color:var(--text-muted); margin-top:2px;">📍 ${c.address}</div>
            </div>
          </div>
          <a href="${mapsUrl}" target="_blank" style="background:#0284c7; color:#fff; text-decoration:none; padding:8px 14px; border-radius:10px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
            📍 Kartnål
          </a>
        </div>
        <div style="margin-top:12px; font-size:12px; background:rgba(0,0,0,0.05); padding:10px; border-radius:8px;">
          <strong>Aktivt uppdrag:</strong> ${c.activeJob}<br>
          <strong style="color:#0284c7; display:inline-block; margin-top:4px;">📄 Offertstatus:</strong> ${c.offertData}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}


// 4. SMART OFFERTMOTOR (HYBRID ROT/RUT)
function renderOffertView() {
  const container = document.getElementById('offert-view');
  if (!container) return;

  container.innerHTML = `
    <h2 style="margin:0 0 12px 0; font-size:18px; color:var(--text-main);">📄 Smart Offertmotor (ROT/RUT & Restid)</h2>
    <div class="offert-box">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:12px;">
        <div>
          <label style="display:block; font-size:12px; font-weight:700; margin-bottom:4px;">Arbetstimmar (h):</label>
          <input type="number" id="offert-hours" value="8" oninput="calcOffert()" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--glass-border); background:var(--card-bg); color:var(--text-main);">
        </div>
        <div>
          <label style="display:block; font-size:12px; font-weight:700; margin-bottom:4px;">Körtid Garaget T/R (min):</label>
          <input type="number" id="offert-travel" value="30" oninput="calcOffert()" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--glass-border); background:var(--card-bg); color:var(--text-main);">
        </div>
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block; font-size:12px; font-weight:700; margin-bottom:4px;">Skatteavdrag:</label>
        <select id="offert-deduction" onchange="calcOffert()" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--glass-border); background:var(--card-bg); color:var(--text-main);">
          <option value="none">Inget avdrag</option>
          <option value="rot">ROT (30% på arbete)</option>
          <option value="rut">RUT (50% på arbete)</option>
        </select>
      </div>
      <div id="offert-result" style="background:#0284c7; color:#fff; padding:14px; border-radius:10px; font-weight:800; text-align:center; font-size:16px; margin-top:12px;">
        Totalt kund att betala: 5 150 kr (inkl. moms)
      </div>
    </div>
  `;
}

function calcOffert() {
  const h = parseFloat(document.getElementById('offert-hours')?.value || 0);
  const t = parseFloat(document.getElementById('offert-travel')?.value || 0);
  const ded = document.getElementById('offert-deduction')?.value || 'none';

  const hourlyRate = 650;
  const travelRate = 450;

  let workCost = h * hourlyRate;
  let travelCost = (t / 60) * travelRate;

  let discount = 0;
  if (ded === 'rot') discount = workCost * 0.30;
  if (ded === 'rut') discount = workCost * 0.50;

  let total = (workCost - discount) + travelCost;
  const res = document.getElementById('offert-result');
  if (res) {
    res.innerText = `Totalt kund att betala: ${Math.round(total * 1.25).toLocaleString('sv-SE')} kr (exkl. ev. milersättning, inkl. moms)`;
  }
}

window.switchAdminTab = switchAdminTab;
window.calcOffert = calcOffert;
window.calculateOffert = calcOffert;

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
        <div style="text-align:right;font-size:12px;color:#475569;white-space:nowrap;"><b>${customerEsc(o.company.name)}</b><br>${o.company.phone ? `<a href="tel:${customerEsc(o.company.phone.replace(/[^0-9+]/g, ''))}" style="color:#0369a1;">${customerEsc(o.company.phone)}</a>` : ''}</div>
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
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxZoom: 21, maxNativeZoom: 19, attribution: 'Esri' }).addTo(map);
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
