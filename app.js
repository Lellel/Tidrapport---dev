if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('SW aktiv:', reg.scope))
      .catch((err) => console.error('Kunde inte starta SW:', err));
  });
}

// Global state
let drafts = loadAllDrafts();
let plannedJobs = []; 
let completedCalendarJobIds = JSON.parse(localStorage.getItem('lpv_completed_cal_jobs')) || [];
let currentActivity = "";
let currentJobType = "nya";
let attachedPhotoBase64 = null;
let isSubmitting = false;

// CRM State
let customersList = [];
let decisionLogs = [];
let templatesList = [];
let selectedCustomer = null;

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('user')) localStorage.setItem('lpv_user', urlParams.get('user'));
if (urlParams.has('admin')) {
  const isAdm = urlParams.get('admin').toLowerCase() === 'true' || urlParams.get('admin') === '1';
  localStorage.setItem('lpv_is_admin', isAdm ? 'true' : 'false');
}

const currentUser = urlParams.get('user') || localStorage.getItem('lpv_user') || 'Daniel';
let isAdmin = (urlParams.get('admin') && (urlParams.get('admin').toLowerCase() === 'true' || urlParams.get('admin') === '1'))
           || localStorage.getItem('lpv_is_admin') === 'true';

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
// KABANOSS (FLYGLEDARTORNET) & CRM MODAL
// ==========================================
function initKabanossUI() {
  if (document.getElementById('kabanoss-container')) return;

  const container = document.createElement('div');
  container.id = 'kabanoss-container';
  container.className = 'kabanoss-container';
  container.innerHTML = `
    <div class="kabanoss-header">
      <button class="btn-close-kanban" onclick="toggleKabanoss()">✕ Stäng</button>
      <span style="color:#fff; font-size: 20px; font-weight:700; margin-left: 20px;">🌭 Flygledartornet & Kabanoss</span>
      <button class="btn-action" style="margin-left: auto; background: var(--accent-blue);" onclick="toggleCRMModal()">👥 Öppna CRM & Kundbild</button>
    </div>
    <div class="kanban-board">
      <div class="kanban-column" id="kanban-col-planned"><div class="kanban-col-header">📥 Planerade <span class="kanban-col-count" id="count-planned">0</span></div><div class="kanban-cards" id="cards-planned"></div></div>
      <div class="kanban-column" id="kanban-col-buffer"><div class="kanban-col-header">⏱️ Vid Tillfälle <span class="kanban-col-count" id="count-buffer">0</span></div><div class="kanban-cards" id="cards-buffer"></div></div>
      <div class="kanban-column" id="kanban-col-live"><div class="kanban-col-header">🚜 Pågående / Klara <span class="kanban-col-count" id="count-live">0</span></div><div class="kanban-cards" id="cards-live"></div></div>
      <div class="kanban-column" id="kanban-col-done"><div class="kanban-col-header">📊 Klara för faktura <span class="kanban-col-count" id="count-done">0</span></div><div class="kanban-cards" id="cards-done"></div></div>
    </div>
  `;
  document.body.appendChild(container);
  initCRMModalUI();
}

function initCRMModalUI() {
  if (document.getElementById('crm-modal-backdrop')) return;

  const backdrop = document.createElement('div');
  backdrop.id = 'crm-modal-backdrop';
  backdrop.className = 'crm-modal-backdrop';
  backdrop.innerHTML = `
    <div class="crm-window">
      <div class="crm-header">
        <div class="crm-nav-tabs">
          <button class="crm-tab-btn active" id="tab-btn-kundbild" onclick="switchCRMTab('kundbild')">👥 360° Kundbild</button>
          <button class="crm-tab-btn" id="tab-btn-beslut" onclick="switchCRMTab('beslut')">📌 Beslut & Logg</button>
        </div>
        <button class="btn-close-kanban" onclick="toggleCRMModal()">✕ Stäng CRM</button>
      </div>
      <div class="crm-body">
        <div class="crm-sidebar-list" id="crm-customer-list"></div>
        <div class="crm-main-view" id="crm-main-content">
          <div style="color:var(--text-muted); text-align:center; margin-top:50px;">Välj en kund i listan till vänster för att öppna Kundbilden.</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
}

function toggleCRMModal() {
  const backdrop = document.getElementById('crm-modal-backdrop');
  if (backdrop) {
    backdrop.classList.toggle('active');
    if (backdrop.classList.contains('active')) fetchCRMData();
  }
}

function switchCRMTab(tab) {
  document.getElementById('tab-btn-kundbild').classList.toggle('active', tab === 'kundbild');
  document.getElementById('tab-btn-beslut').classList.toggle('active', tab === 'beslut');
  if (tab === 'beslut') renderDecisionLogView();
  else renderCustomerDetailView();
}

// API CRM ANROP
async function fetchCRMData() {
  if (!navigator.onLine) return;
  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ token: CONFIG.API_TOKEN, action: 'getCustomers' })
    });
    const data = await res.json();
    if (data.status === 'success') {
      customersList = data.customers || [];
      renderCustomerSidebar();
    }
  } catch (err) { console.error("CRM Fel:", err); }
}

function renderCustomerSidebar() {
  const container = document.getElementById('crm-customer-list');
  if (!container) return;
  container.innerHTML = `
    <div style="padding:12px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">
      <span style="font-size:12px; font-weight:700; color:var(--text-muted);">KUNDER (${customersList.length})</span>
      <button class="btn-action" style="padding:4px 8px; font-size:11px;" onclick="promptAddCustomer()">+ Ny</button>
    </div>
  `;
  customersList.forEach(c => {
    const item = document.createElement('div');
    item.className = `customer-item ${selectedCustomer && selectedCustomer.id === c.id ? 'active' : ''}`;
    item.onclick = () => { selectedCustomer = c; renderCustomerSidebar(); renderCustomerDetailView(); };
    item.innerHTML = `
      <div style="font-weight:700; color:#fff;">${c.name}</div>
      <div style="font-size:12px; color:var(--text-muted);">${c.id} • ${c.contact || 'Ingen kontakt'}</div>
    `;
    container.appendChild(item);
  });
}

function renderCustomerDetailView() {
  const main = document.getElementById('crm-main-content');
  if (!main) return;
  if (!selectedCustomer) {
    main.innerHTML = `<div style="color:var(--text-muted); text-align:center; margin-top:50px;">Välj en kund till vänster.</div>`;
    return;
  }
  main.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
      <div>
        <h2 style="margin:0; font-size:24px;">${selectedCustomer.name}</h2>
        <div style="color:var(--text-muted); font-size:13px; margin-top:4px;">ID: ${selectedCustomer.id} | Org.nr: ${selectedCustomer.org || 'Ej angivet'}</div>
      </div>
      <button class="btn-action" style="background:var(--accent-green);" onclick="promptAddDecision('${selectedCustomer.name}')">📌 Logga Beslut / ÄTA</button>
    </div>
    <div style="display:flex; gap:20px; background:rgba(255,255,255,0.03); padding:16px; border-radius:12px; border:1px solid rgba(255,255,255,0.08);">
      <div><strong>Kontakt:</strong> ${selectedCustomer.contact} (${selectedCustomer.phone})</div>
      <div><strong>E-post:</strong> ${selectedCustomer.email}</div>
      <div><strong>Adress:</strong> ${selectedCustomer.address}</div>
    </div>
    <h3 style="margin-top:20px; font-size:16px;">Tidslinje & Historik</h3>
    <div id="customer-timeline"><div style="color:var(--text-muted); font-size:13px;">Hämtar historik...</div></div>
  `;
  fetchCustomerTimeline(selectedCustomer.name);
}

async function fetchCustomerTimeline(customerName) {
  if (!navigator.onLine) return;
  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ token: CONFIG.API_TOKEN, action: 'getDecisionLog' })
    });
    const data = await res.json();
    const container = document.getElementById('customer-timeline');
    if (!container) return;
    if (data.status === 'success') {
      const logs = (data.decisions || []).filter(d => d.customer.toLowerCase() === customerName.toLowerCase());
      if (logs.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted); font-size:13px;">Inga loggade beslut eller ÄTOr för denna kund än.</div>`;
        return;
      }
      container.innerHTML = '';
      logs.forEach(l => {
        const card = document.createElement('div');
        card.className = 'timeline-card';
        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-muted); margin-bottom:6px;">
            <span style="color:var(--accent-orange); font-weight:700;">${l.category}</span>
            <span>${l.date} • Av ${l.user}</span>
          </div>
          <div style="font-size:14px; color:#FFF;">${l.note}</div>
        `;
        container.appendChild(card);
      });
    }
  } catch (err) { console.error(err); }
}

async function promptAddCustomer() {
  const name = prompt("Kundens namn (t.ex. Ica Maxi):");
  if (!name) return;
  const contact = prompt("Kontaktperson:") || "";
  const phone = prompt("Telefonnummer:") || "";
  
  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        token: CONFIG.API_TOKEN, action: 'addCustomer',
        customerData: { name, contact, phone, org: '', email: '', address: '' }
      })
    });
    const result = await res.json();
    if (result.status === 'success') {
      alert("✅ Kund skapad med unikt ID!");
      fetchCRMData();
    }
  } catch (err) { alert("Fel vid skapande av kund."); }
}

async function promptAddDecision(customerName) {
  const note = prompt(`Vad har bestämts / kommit överens om för ${customerName}?`);
  if (!note) return;
  
  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        token: CONFIG.API_TOKEN, action: 'addDecision',
        decisionData: { customer: customerName, place: '', category: '📌 Spikat Beslut', note, user: currentUser }
      })
    });
    const result = await res.json();
    if (result.status === 'success') {
      alert("✅ Beslut loggat i tidslinjen!");
      fetchCustomerTimeline(customerName);
    }
  } catch (err) { alert("Fel vid sparning av beslut."); }
}

function toggleKabanoss() {
  const container = document.getElementById('kabanoss-container');
  if (container) {
    container.classList.toggle('active');
    if (container.classList.contains('active')) {
      renderKabanoss();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
}

function renderKabanoss() {
  const colPlanned = document.getElementById('cards-planned');
  const colBuffer = document.getElementById('cards-buffer');
  const colLive = document.getElementById('cards-live');
  const colDone = document.getElementById('cards-done');

  if (!colPlanned) return;

  colPlanned.innerHTML = ''; colBuffer.innerHTML = ''; colLive.innerHTML = ''; colDone.innerHTML = '';
  let cPlan = 0, cBuff = 0, cLive = 0, cDone = 0;

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

  drafts.forEach(draft => {
    cLive++;
    const status = draft.end ? `Klar lokalt: ${calculateHours(draft.start, draft.end).toFixed(1)} h` : `🔴 PÅGÅR: Start ${draft.start}`;
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

  let borderLeft = '4px solid #444';
  if (type === 'buffer') borderLeft = '4px solid #BF5AF2';
  if (type === 'planned') borderLeft = '4px solid #0A84FF';
  if (type === 'live') borderLeft = '4px solid #FF375F';
  if (type === 'local-done') borderLeft = '4px solid #30D158';
  if (type === 'done') borderLeft = '4px solid #636366';

  card.style.borderLeft = borderLeft;
  card.innerHTML = `
    <div style="font-weight: 600; color: #FFF; font-size: 14px; margin-bottom: 4px;">${title}</div>
    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">${place}</div>
    <div style="font-size: 11px; font-weight: 700; color: #CCC; background: rgba(255,255,255,0.05); padding: 4px 6px; border-radius: 4px; display: inline-block;">${meta}</div>
  `;
  return card;
}

// INDEXEDDB & BASE APP LOGIC
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
    request.onsuccess = (event) => { db = event.target.result; resolve(db); };
    request.onerror = (event) => { resolve(null); };
  });
}

function loadAllDrafts() {
  const d1 = localStorage.getItem('tidrapport_drafts');
  const d2 = localStorage.getItem('lpv_tidrapport_drafts');
  try {
    if (d1) return JSON.parse(d1);
    if (d2) return JSON.parse(d2);
  } catch (e) {}
  return [];
}

function saveDraftsToStorage() {
  try {
    const json = JSON.stringify(drafts);
    localStorage.setItem('tidrapport_drafts', json);
    localStorage.setItem('lpv_tidrapport_drafts', json);
  } catch (e) {}
  if (db) {
    try {
      const transaction = db.transaction(["drafts"], "readwrite");
      const store = transaction.objectStore("drafts");
      store.clear();
      drafts.forEach(draft => store.put(draft));
    } catch (e) {}
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
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>`;
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
  if (type === 'kalender') fetchPlannedJobs();
}

async function initApp() {
  await initDatabase();
  drafts = loadAllDrafts();

  initKabanossUI();

  const now = new Date();
  const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  const dateInput = document.getElementById('input-date');
  if (dateInput) dateInput.value = localDate;

  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const startInput = document.getElementById('input-start');
  if (startInput) startInput.value = `${h}:${m}`;

  updateAdminUI();
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
      if (!document.getElementById('btn-kanban-trigger')) {
        const kbtn = document.createElement('button');
        kbtn.id = 'btn-kanban-trigger';
        kbtn.className = 'btn-action';
        kbtn.style.width = '100%';
        kbtn.style.marginTop = '20px';
        kbtn.style.background = 'linear-gradient(135deg, #BF5AF2, #0A84FF)';
        kbtn.style.color = '#FFF';
        kbtn.style.border = 'none';
        kbtn.innerHTML = '📊 Öppna Flygledartornet & CRM';
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
  } catch (error) {}
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
  } catch (err) {} finally {
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
