// Registrera Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('SW aktiv:', reg.scope))
      .catch((err) => console.error('Kunde inte starta SW:', err));
  });
}

// Global data & state
let drafts = loadAllDrafts();
let plannedJobs = []; // Hybrid Osthyvel (Kalender + Kalkylark)
let completedCalendarJobIds = JSON.parse(localStorage.getItem('lpv_completed_cal_jobs')) || [];
let currentActivity = "";
let currentJobType = "nya";
let attachedPhotoBase64 = null;
let isSubmitting = false;

// Hämta kontaktboken från Sheets
let adminUserList = [];
let hasFetchedUsers = false;

// Läs användare och Admin-status från URL / localStorage
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('user')) localStorage.setItem('lpv_user', urlParams.get('user'));
if (urlParams.has('admin')) {
  const isAdm = urlParams.get('admin').toLowerCase() === 'true' || urlParams.get('admin') === '1';
  localStorage.setItem('lpv_is_admin', isAdm ? 'true' : 'false');
}

const currentUser = urlParams.get('user') || localStorage.getItem('lpv_user') || 'Daniel';
let isAdmin = (urlParams.get('admin') && (urlParams.get('admin').toLowerCase() === 'true' || urlParams.get('admin') === '1'))
           || localStorage.getItem('lpv_is_admin') === 'true';

// Hantera klick på namn-pillret
let userClickCount = 0;
let userClickTimer = null;
function handleUserPillClick() {
  userClickCount++;
  clearTimeout(userClickTimer);
  userClickTimer = setTimeout(() => { userClickCount = 0; }, 1000);
  if (userClickCount >= 3) {
    userClickCount = 0;
    isAdmin = !isAdmin;
    localStorage.setItem('lpv_is_admin', isAdmin ? 'true' : 'false');
    updateAdminUI();
    alert(isAdmin ? "👑 Admin-läge aktiverat!" : "Admin-läge avstängt.");
  }
}

function getCurrentTimeStr() {
  const now = new Date();
  return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
}

function markCalendarJobCompleted(jobId) {
  if (!jobId) return;
  const strId = String(jobId);
  if (!completedCalendarJobIds.includes(strId)) {
    completedCalendarJobIds.push(strId);
    localStorage.setItem('lpv_completed_cal_jobs', JSON.stringify(completedCalendarJobIds));
  }
}

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
      document.getElementById('photo-label').innerText = "✓ Bild bifogad";
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
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      body: JSON.stringify({
        token: CONFIG.API_TOKEN,
        action: 'getJobs',
        date: chosenDate,
        user: currentUser
      })
    });
    const data = await res.json();
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
      ongoing.end = getCurrentTimeStr();
      ongoing.totalHours = calculateHours(ongoing.start, ongoing.end).toFixed(1);
    } else {
      return;
    }
  }

  drafts.push({
    id: Date.now(),
    calendarJobId: job.id,
    type: 'normal',
    date: document.getElementById('input-date')?.value || new Date().toISOString().split('T')[0],
    user: currentUser,
    place: job.place || 'Okänd plats',
    activity: job.title || 'Planerat jobb',
    notes: job.description || '',
    start: getCurrentTimeStr(),
    end: '',
    images: []
  });

  saveDraftsToStorage();
  renderOutbox();
  updateDashboardData();
}

function createSplitPass(sourceId) {
  const src = drafts.find(d => d.id === sourceId);
  if (!src) return;

  const ongoing = drafts.find(d => !d.end);
  if (ongoing) {
    if (confirm(`Du har redan "${ongoing.activity}" pågående.\n\nVill du stämpla ut det förra passet nu?`)) {
      ongoing.end = getCurrentTimeStr();
      ongoing.totalHours = calculateHours(ongoing.start, ongoing.end).toFixed(1);
    } else {
      return;
    }
  }

  let baseName = src.activity;
  let passNum = 2;
  const match = src.activity.match(/^(.*?)\s*\(Pass\s*(\d+)\)$/i);
  if (match) {
    baseName = match[1];
    passNum = parseInt(match[2]) + 1;
  } else {
    src.activity = `${src.activity} (Pass 1)`;
  }

  drafts.push({
    id: Date.now(),
    calendarJobId: src.calendarJobId || null,
    type: src.type || 'normal',
    ataNumber: src.ataNumber || '',
    date: document.getElementById('input-date')?.value || new Date().toISOString().split('T')[0],
    user: currentUser,
    place: src.place,
    activity: `${baseName} (Pass ${passNum})`,
    notes: src.notes || '',
    start: getCurrentTimeStr(),
    end: '',
    images: []
  });

  saveDraftsToStorage();
  renderOutbox();
  updateDashboardData();
}

function clockOut(id) {
  const draftIndex = drafts.findIndex(d => d.id === id);
  if (draftIndex !== -1) {
    drafts[draftIndex].end = getCurrentTimeStr();
    drafts[draftIndex].totalHours = calculateHours(drafts[draftIndex].start, drafts[draftIndex].end).toFixed(1);
    saveDraftsToStorage();
    renderOutbox();
    updateDashboardData();
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
  document.getElementById('photo-label').innerText = "Bifoga bild-underlag";
  attachedPhotoBase64 = null;

  document.getElementById('input-start').value = getCurrentTimeStr();
  document.getElementById('selected-activity').innerHTML = `Välj aktivitet <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`;
  currentActivity = "";
  setJobType('nya');

  updateLiveHours();
  renderOutbox();
  updateDashboardData();
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

  const visiblePlannedJobs = plannedJobs.filter(job => {
    const isDrafted = drafts.some(d => String(d.calendarJobId) === String(job.id));
    const isCompleted = completedCalendarJobIds.includes(String(job.id));
    return !isDrafted && !isCompleted;
  });

  if (drafts.length === 0 && visiblePlannedJobs.length === 0) {
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
      <button class="btn-action delete" onclick="deleteDraft(${draft.id})" style="flex:0 0 45px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
      </button>
    ` : `
      <button class="btn-action split-pass" onclick="createSplitPass(${draft.id})">Nytt pass</button>
      <button class="btn-action delete" onclick="deleteDraft(${draft.id})">Radera</button>
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

  visiblePlannedJobs.forEach(job => {
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
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        token: CONFIG.API_TOKEN,
        action: 'batchReports',
        pass: readyToSend
      })
    });
    const result = await res.json();
    if (result && result.status === 'success') {
      if (!silent) alert(`Klart! ${result.count || readyToSend.length} pass har sparats i kalkylarket.`);
      
      readyToSend.forEach(d => {
        if (d.calendarJobId) {
          markCalendarJobCompleted(d.calendarJobId);
        }
      });

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

  passCountEl.innerText = `${drafts.length} st`;
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
        <div style="font-weight:600; color:#FFF;">${p.place || 'Uppdrag'}</div>
        <div style="font-size:11px; color:var(--text-muted);">${p.activity || 'Övrigt'} (${p.start}–${p.end || 'Pågår'})</div>
      </div>
      <div style="font-weight:600; color:#FFF;">${hours.toFixed(1)} h</div>
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
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ token: CONFIG.API_TOKEN, action: 'getUsers' })
    });
    const data = await res.json();
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

function getAdminTargetUrl() {
  const targetUser = document.getElementById('admin-target-user')?.value.trim();
  const targetIsAdmin = document.getElementById('admin-target-is-admin')?.checked;
  const baseUrl = window.location.origin + window.location.pathname;
  const params = new URLSearchParams();
  if (targetUser) params.set('user', targetUser);
  if (targetIsAdmin) params.set('admin', 'true');
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

function updateAdminTargetLink() {
  const qrBox = document.getElementById('admin-qr-container');
  const qrImg = document.getElementById('admin-qr-image');
  const caption = document.getElementById('admin-qr-caption');
  if (qrBox && qrBox.style.display === 'block' && qrImg) {
    const targetUrl = getAdminTargetUrl();
    const targetUser = document.getElementById('admin-target-user')?.value.trim();
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(targetUrl)}`;
    if (caption) {
      caption.innerText = targetUser ? `Skanna för att logga in som ${targetUser}:` : "Skanna för att logga in:";
    }
  }
}

function adminSendSMS() {
  const targetUrl = getAdminTargetUrl();
  const targetUser = document.getElementById('admin-target-user')?.value.trim() || 'kollega';
  const phone = document.getElementById('admin-target-phone')?.value.trim() || '';
  const message = `Hej ${targetUser}! Här är din inloggningslänk till LPV Tidrapport: ${targetUrl}`;
  if (phone) window.location.href = `sms.html?to=${encodeURIComponent(phone)}&body=${encodeURIComponent(message)}`;
  else window.location.href = `sms:?&body=${encodeURIComponent(message)}`;
}

function adminSendEmail() {
  const targetUrl = getAdminTargetUrl();
  const targetUser = document.getElementById('admin-target-user')?.value.trim() || 'kollega';
  const subject = "Inloggning LPV Tidrapport";
  const body = `Hej ${targetUser}!\n\nHär är din inloggningslänk till LPV Tidrapport:\n${targetUrl}\n\nKlicka på länken från din telefon för att logga in.`;
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function toggleAdminQR() {
  const qrBox = document.getElementById('admin-qr-container');
  const qrImg = document.getElementById('admin-qr-image');
  const caption = document.getElementById('admin-qr-caption');
  if (!qrBox || !qrImg) return;
  if (qrBox.style.display === 'none' || qrBox.style.display === '') {
    const targetUrl = getAdminTargetUrl();
    const targetUser = document.getElementById('admin-target-user')?.value.trim();
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(targetUrl)}`;
    if (caption) caption.innerText = targetUser ? `Skanna för att logga in som ${targetUser}:` : "Skanna för att logga in:";
    qrBox.style.display = 'block';
  } else {
    qrBox.style.display = 'none';
  }
}
