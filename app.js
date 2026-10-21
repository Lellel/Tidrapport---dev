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
let plannedJobs = []; 
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
// KABANOSS (FLYGLEDARTORNET) - Mac / PC
// ==========================================
function initKabanossUI() {
  if (document.getElementById('kabanoss-container')) return;

  const container = document.createElement('div');
  container.id = 'kabanoss-container';
  container.className = 'kabanoss-container';
  container.innerHTML = `
    <div class="kabanoss-header">
      <button class="btn-close-kanban" onclick="toggleKabanoss()">✕ Stäng Flygledartornet</button>
      <span style="color:#fff; font-size: 20px; font-weight:700; margin-left: 20px;">🌭 Kabanoss-Vy (Realtid)</span>
    </div>
    <div class="kanban-board">
      
      <!-- Kolumn 1: Planerade -->
      <div class="kanban-column" id="kanban-col-planned" ondragover="allowDrop(event)" ondrop="drop(event, 'planned')">
        <div class="kanban-col-header">📥 Planerade <span class="kanban-col-count" id="count-planned">0</span></div>
        <div class="kanban-cards" id="cards-planned"></div>
      </div>
      
      <!-- Kolumn 2: Buffert -->
      <div class="kanban-column" id="kanban-col-buffer" ondragover="allowDrop(event)" ondrop="drop(event, 'buffer')">
        <div class="kanban-col-header">⏱️ Vid Tillfälle <span class="kanban-col-count" id="count-buffer">0</span></div>
        <div class="kanban-cards" id="cards-buffer"></div>
      </div>
      
      <!-- Kolumn 3: Live / Pågående -->
      <div class="kanban-column" id="kanban-col-live" ondragover="allowDrop(event)" ondrop="drop(event, 'live')">
        <div class="kanban-col-header">🚜 Pågående / Klára <span class="kanban-col-count" id="count-live">0</span></div>
        <div class="kanban-cards" id="cards-live"></div>
      </div>
      
      <!-- Kolumn 4: Klart -->
      <div class="kanban-column" id="kanban-col-done" ondragover="allowDrop(event)" ondrop="drop(event, 'done')">
        <div class="kanban-col-header">📊 Klara för faktura <span class="kanban-col-count" id="count-done">0</span></div>
        <div class="kanban-cards" id="cards-done"></div>
      </div>
      
    </div>
  `;
  document.body.appendChild(container);
}

function toggleKabanoss() {
  const container = document.getElementById('kabanoss-container');
  if (container) {
    container.classList.toggle('active');
    if (container.classList.contains('active')) {
      renderKabanoss();
      document.body.style.overflow = 'hidden'; // Förhindra scroll i bakgrunden
    } else {
      document.body.style.overflow = ''; // Återställ scroll
    }
  }
}

function renderKabanoss() {
  const colPlanned = document.getElementById('cards-planned');
  const colBuffer = document.getElementById('cards-buffer');
  const colLive = document.getElementById('cards-live');
  const colDone = document.getElementById('cards-done');

  if (!colPlanned) return; // UI ej skapat än

  colPlanned.innerHTML = '';
  colBuffer.innerHTML = '';
  colLive.innerHTML = '';
  colDone.innerHTML = '';

  let cPlan = 0, cBuff = 0, cLive = 0, cDone = 0;

  // 1. Planerade och Buffert
  plannedJobs.forEach(job => {
    const isDrafted = drafts.some(d => String(d.calendarJobId) === String(job.id));
    const isCompleted = completedCalendarJobIds.includes(String(job.id));

    if (isCompleted) {
      cDone++;
      colDone.appendChild(createKanbanCard(job.title, job.place, "Insänt via App", "done", job.id));
    } else if (!isDrafted) {
      if (job.isBuffer) {
        cBuff++;
        colBuffer.appendChild(createKanbanCard(job.title, job.place, job.description || "Inget förfallodatum", "buffer", job.id));
      } else {
        cPlan++;
        colPlanned.appendChild(createKanbanCard(job.title, job.place, job.start || "Spikad tid", "planned", job.id));
      }
    }
  });

  // 2. Drafts (Pågående eller avslutade lokalt)
  drafts.forEach(draft => {
    cLive++;
    const status = draft.end ? \`Klar lokalt: \${calculateHours(draft.start, draft.end).toFixed(1)} h\` : \`🔴 PÅGÅR: Start \${draft.start}\`;
    colLive.appendChild(createKanbanCard(draft.activity, draft.place, status, draft.end ? "local-done" : "live", draft.id, true));
  });

  document.getElementById('count-planned').innerText = cPlan;
  document.getElementById('count-buffer').innerText = cBuff;
  document.getElementById('count-live').innerText = cLive;
  document.getElementById('count-done').innerText = cDone;
}

function createKanbanCard(title, place, meta, type, id, isLocal = false) {
  const card = document.createElement('div');
  card.className = 'kanban-card';
  card.draggable = true;
  card.id = 'kb-' + (isLocal ? 'draft-' : 'job-') + id;
  card.ondragstart = drag;

  let borderLeft = '4px solid #444';
  if (type === 'buffer') borderLeft = '4px solid #BF5AF2'; // Lila
  if (type === 'planned') borderLeft = '4px solid #0A84FF'; // Blå
  if (type === 'live') borderLeft = '4px solid #FF375F'; // Röd (Pågår)
  if (type === 'local-done') borderLeft = '4px solid #30D158'; // Grön (Stämplat ut)
  if (type === 'done') borderLeft = '4px solid #636366'; // Grå (Insänt)

  card.style.borderLeft = borderLeft;

  card.innerHTML = `
    <div style="font-weight: 600; color: #FFF; font-size: 14px; margin-bottom: 4px;">\${title}</div>
    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">\${place}</div>
    <div style="font-size: 11px; font-weight: 700; color: #CCC; background: rgba(255,255,255,0.05); padding: 4px 6px; border-radius: 4px; display: inline-block;">\${meta}</div>
  `;
  return card;
}

// Drag & Drop händelser
function drag(ev) { ev.dataTransfer.setData("text", ev.target.id); }
function allowDrop(ev) { ev.preventDefault(); }
function drop(ev, column) {
  ev.preventDefault();
  const data = ev.dataTransfer.getData("text");
  console.log("Framtida funktion: Flyttade kort", data, "till kolumn", column);
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

window.addEventListener('online', () => { submitAll(true); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && navigator.onLine) { submitAll(true); }
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

function getActivityIcon(name) {
  const n = (name || "").toLowerCase();
  if (n.includes('kyl') || n.includes('frys')) return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="19" r="2"/><path d="M5 17L8 4m-2-1h3M7 19h13"/><rect x="9.5" y="4" width="10.5" height="13" rx="1.5"/><path d="M14.5 4v10M13.5 7v4m2.5-4v4M11.5 15.5h6.5"/><path d="M21 2v3m-1.5-1.5h3" stroke-width="1.2"/></svg>`;
  if (n.includes('snö') || n.includes('plog')) return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 4v4m-2-2h4m-3.5-1.5l3 3m-3 0l3-3"/><path d="M12 16v-6h-4l-2-4h-4v10"/><circle cx="5" cy="16" r="2"/><circle cx="12" cy="16" r="2"/><path d="M16 19l2-8" stroke-width="2"/><path d="M17 17h4"/></svg>`;
  if (n.includes('linje')) return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6l3 5v4"/><rect x="7" y="11" width="6" height="4" rx="1"/><circle cx="8" cy="17" r="2"/><circle cx="15" cy="17" r="1.5"/><path d="M13 13h5M17 13v4M21 20H15M11 20H5" stroke-width="2"/></svg>`;
  if (n.includes('fasad')) return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-7 9 7v10H3z"/><path d="M9 20v-6h6v6"/><rect x="7" y="6" width="6" height="2.5" rx="1"/><path d="M10 8.5v3"/></svg>`;
  if (n.includes('stalltvätt') || n.includes('stallvätt') || n.includes('tvätt')) return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20c-1-1-1-3 0-4l3-3 4 4-3 3c-1 1-3 1-4 0z"/><path d="M10 14l5-5M14 8l2 2M17 7l4-4M19 9l3-2M15 5l2-3"/><path d="M21 14l-1 2-2 1 2 1 1 2 1-2 2-1-2-1-1-2z" stroke-width="1"/></svg>`;
  if (n.includes('bandgrävare') || n.includes('gräv')) return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="15" width="13" height="5" rx="2.5"/><circle cx="5.5" cy="17.5" r="1"/><circle cx="9.5" cy="17.5" r="1"/><circle cx="13.5" cy="17.5" r="1"/><path d="M5 15v-5a2 2 0 0 1 2-2h4v7M9 11l4-5 6 4-2 4M17 14h4l1-3-3-2"/></svg>`;
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

  initKabanossUI(); // Ladda in Flygledartornet i bakgrunden!

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

      // Lägg till Kabanoss-knappen i Adminpanelen!
      if (!document.getElementById('btn-kanban-trigger')) {
        const kbtn = document.createElement('button');
        kbtn.id = 'btn-kanban-trigger';
        kbtn.className = 'btn-action';
        kbtn.style.width = '100%';
        kbtn.style.marginTop = '20px';
        kbtn.style.background = 'linear-gradient(135deg, #BF5AF2, #0A84FF)';
        kbtn.style.color = '#FFF';
        kbtn.style.border = 'none';
        kbtn.innerHTML = '📊 Öppna Flygledartornet';
        kbtn.onclick = toggleKabanoss;
        adminSection.appendChild(kbtn);
      }
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
      body: JSON.stringify({ token: CONFIG.API_TOKEN, action: 'getJobs', date: chosenDate, user: currentUser })
    });
    const data = await res.json();
    if (data.status === 'success') {
      plannedJobs = data.events || [];
      renderOutbox();
    }
  } catch (error) { console.error("Fel:", error); }
}

function clockInPlannedJob(jobId) {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  const job = plannedJobs.find(j => String(j.id) === String(jobId) || j.id === jobId);
  if (!job) return;

  const ongoing = drafts.find(d => !d.end);
  if (ongoing) {
    if (confirm(`Vill du stämpla ut "${ongoing.activity}" nu?`)) {
      ongoing.end = getCurrentTimeStr();
      ongoing.totalHours = calculateHours(ongoing.start, ongoing.end).toFixed(1);
    } else return;
  }

  drafts.push({
    id: Date.now(), calendarJobId: job.id, type: 'normal',
    date: document.getElementById('input-date')?.value || new Date().toISOString().split('T')[0],
    user: currentUser, place: job.place || 'Okänd', activity: job.title, notes: job.description || '',
    start: getCurrentTimeStr(), end: '', images: []
  });
  saveDraftsToStorage(); renderOutbox(); updateDashboardData();
}

function createSplitPass(sourceId) {
  const src = drafts.find(d => d.id === sourceId);
  if (!src) return;
  const ongoing = drafts.find(d => !d.end);
  if (ongoing) {
    if (confirm(`Vill du stämpla ut "${ongoing.activity}" nu?`)) {
      ongoing.end = getCurrentTimeStr();
      ongoing.totalHours = calculateHours(ongoing.start, ongoing.end).toFixed(1);
    } else return;
  }
  let baseName = src.activity; let passNum = 2;
  const match = src.activity.match(/^(.*?)\s*\(Pass\s*(\d+)\)$/i);
  if (match) { baseName = match[1]; passNum = parseInt(match[2]) + 1; } else { src.activity = `${src.activity} (Pass 1)`; }
  drafts.push({
    id: Date.now(), calendarJobId: src.calendarJobId || null, type: src.type || 'normal', ataNumber: src.ataNumber || '',
    date: document.getElementById('input-date')?.value || new Date().toISOString().split('T')[0],
    user: currentUser, place: src.place, activity: `${baseName} (Pass ${passNum})`, notes: src.notes || '',
    start: getCurrentTimeStr(), end: '', images: []
  });
  saveDraftsToStorage(); renderOutbox(); updateDashboardData();
}

function clockOut(id) {
  const i = drafts.findIndex(d => d.id === id);
  if (i !== -1) {
    drafts[i].end = getCurrentTimeStr();
    drafts[i].totalHours = calculateHours(drafts[i].start, drafts[i].end).toFixed(1);
    saveDraftsToStorage(); renderOutbox(); updateDashboardData();
  }
}

function saveToOutbox() {
  const date = document.getElementById('input-date').value;
  const place = document.getElementById('input-place').value.trim();
  const notes = document.getElementById('input-notes').value.trim();
  const start = document.getElementById('input-start').value;
  const end = document.getElementById('input-end').value;
  if (!place || !start) { alert("Fyll i Betalställe och Starttid!"); return; }

  drafts.push({
    id: Date.now(), type: currentJobType, ataNumber: currentJobType === 'ata' ? document.getElementById('input-ata').value.trim() : '',
    date: date, user: currentUser, place: place, activity: currentActivity || "Övrigt",
    notes: notes, start: start, end: end, totalHours: end ? calculateHours(start, end).toFixed(1) : "0.0",
    images: attachedPhotoBase64 ? [attachedPhotoBase64] : []
  });
  saveDraftsToStorage();
  document.getElementById('input-place').value = ''; document.getElementById('input-notes').value = ''; document.getElementById('input-end').value = '';
  document.getElementById('input-start').value = getCurrentTimeStr();
  document.getElementById('selected-activity').innerHTML = `Välj aktivitet <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`;
  currentActivity = ""; setJobType('nya'); attachedPhotoBase64 = null; document.getElementById('photo-label').innerText = "Bifoga bild-underlag";
  updateLiveHours(); renderOutbox(); updateDashboardData();
}

function deleteDraft(id) { drafts = drafts.filter(draft => draft.id !== id); saveDraftsToStorage(); renderOutbox(); updateDashboardData(); }

function renderOutbox() {
  const container = document.getElementById('outbox-container');
  const title = document.getElementById('outbox-title');
  const submitBtn = document.getElementById('btnSubmitAll');
  if (!container || !title) return;

  container.innerHTML = '';
  const visiblePlannedJobs = plannedJobs.filter(job => !drafts.some(d => String(d.calendarJobId) === String(job.id)) && !completedCalendarJobIds.includes(String(job.id)));

  if (drafts.length === 0 && visiblePlannedJobs.length === 0) {
    title.innerText = "Dagens pass (0 st)";
    if (submitBtn) submitBtn.style.display = 'none';
    container.innerHTML = `<div class="draft-card empty-placeholder"><div style="font-size: 13px; color: var(--text-muted);">Inga sparade pass än.</div></div>`;
  } else {
    const readyToSend = drafts.filter(d => d.start && d.end);
    if (submitBtn) submitBtn.style.display = readyToSend.length > 0 ? 'flex' : 'none';
    let totalHours = 0; drafts.forEach(d => { if (d.start && d.end) totalHours += parseFloat(calculateHours(d.start, d.end)); });
    title.innerText = `Dagens pass (${drafts.length} st • ${totalHours.toFixed(1)} h)`;

    drafts.forEach(draft => {
      const card = document.createElement('div'); card.className = 'draft-card';
      const isOngoing = !draft.end;
      let actionButtons = isOngoing ? `
        <button class="btn-action clock-out" onclick="clockOut(${draft.id})">Stämpla ut nu</button>
        <button class="btn-action delete" onclick="deleteDraft(${draft.id})" style="flex:0 0 45px;">Radera</button>
      ` : `
        <button class="btn-action split-pass" onclick="createSplitPass(${draft.id})">Nytt pass</button>
        <button class="btn-action delete" onclick="deleteDraft(${draft.id})">Radera</button>
      `;
      card.innerHTML = `<div class="card-body"><div class="card-title">${draft.place}</div><div class="card-meta"><span>${isOngoing ? '<span class="ongoing-pulse">Pågår</span>' : `${draft.start} –${draft.end}`}</span></div></div><div class="card-actions">${actionButtons}</div>`;
      container.appendChild(card);
    });

    visiblePlannedJobs.forEach(job => {
      const card = document.createElement('div'); card.className = 'draft-card';
      const badgeHtml = job.isBuffer ? `<span>⏱️ VID TILLFÄLLE</span>` : `<span>📅 PLANERAT</span>`;
      card.innerHTML = `<div class="card-body"><div class="card-title">${job.title}</div><div class="card-meta">${badgeHtml} ${job.place}</div></div><div class="card-actions"><button class="btn-action clock-in">Stämpla in</button></div>`;
      card.querySelector('.clock-in').addEventListener('click', () => clockInPlannedJob(job.id));
      container.appendChild(card);
    });
  }
  
  // Synka Kabanoss-tavlan varje gång vi ritar om utkorgen!
  renderKabanoss();
}

async function submitAll(silent = false) {
  if (isSubmitting) return;
  const readyToSend = drafts.filter(d => d.start && d.end);
  if (readyToSend.length === 0) return;
  isSubmitting = true;
  const btn = document.getElementById('btnSubmitAll');
  if (btn) { btn.innerHTML = `Skickar...`; btn.disabled = true; }

  try {
    const res = await fetch(CONFIG.API_URL, { method: 'POST', body: JSON.stringify({ token: CONFIG.API_TOKEN, action: 'batchReports', pass: readyToSend }) });
    const result = await res.json();
    if (result && result.status === 'success') {
      if (!silent) alert(`Klart!`);
      readyToSend.forEach(d => { if (d.calendarJobId) markCalendarJobCompleted(d.calendarJobId); });
      const idsToRemove = readyToSend.map(d => d.id);
      drafts = drafts.filter(d => !idsToRemove.includes(d.id));
      saveDraftsToStorage(); renderOutbox(); updateDashboardData();
    }
  } catch (err) { console.error(err); } finally {
    isSubmitting = false;
    if (btn) { btn.innerHTML = `Skicka in`; btn.disabled = false; }
  }
}

function updateDashboardData() {
  const totalHoursEl = document.getElementById('dash-total-hours');
  const passCountEl = document.getElementById('dash-pass-count');
  if (!totalHoursEl || !passCountEl) return;
  passCountEl.innerText = `${drafts.length} st`;
  let totalH = 0; drafts.forEach(p => { totalH += parseFloat(p.totalHours || calculateHours(p.start, p.end) || 0); });
  totalHoursEl.innerText = `${totalH.toFixed(1)} h`;
}

async function fetchAdminUsers() { /* ... admin users func ... */ }
