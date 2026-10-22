// Registrera Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('SW aktiv:', reg.scope))
      .catch((err) => console.error('SW fel:', err));
  });
}

let drafts = [];
let plannedJobs = [];
let currentActivity = "";
let currentJobType = "nya";
let currentImagesBase64 = [];
let isSubmitting = false;
let snowDrawer = null;

// Läs URL/localStorage
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

// INDEXED DB
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
    request.onsuccess = (event) => { db = event.target.result; resolve(db); };
    request.onerror = (event) => reject(event.target.errorCode);
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
    transaction.oncomplete = () => resolve();
  });
}

// RENDERA AKTIVITETSLISTA FRÅN MALLAR
function renderActivitySheet() {
  const container = document.getElementById('activity-sheet-list');
  if (!container) return;
  container.innerHTML = '';

  Object.values(window.JOB_TEMPLATES).forEach(tmpl => {
    const item = document.createElement('div');
    item.className = 'sheet-item';
    item.onclick = () => selectActivity(tmpl.name, tmpl.id);
    item.innerHTML = `${tmpl.icon} <span>${tmpl.name}</span>`;
    container.appendChild(item);
  });
}

function selectActivity(name, tmplId) {
  currentActivity = name;
  document.getElementById('selected-activity').innerHTML = `${name} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`;
  
  // Visa/Göm specifikationsblock för mallar
  const platsbesokFields = document.getElementById('platsbesok-fields');
  const plogTrigger = document.getElementById('plogkarta-trigger');

  if (tmplId === 'PLATSBESOK') {
    platsbesokFields.style.display = 'block';
    plogTrigger.style.display = 'none';
  } else if (tmplId === 'SNOROJNING_SANDNING') {
    platsbesokFields.style.display = 'none';
    plogTrigger.style.display = 'block';
  } else {
    platsbesokFields.style.display = 'none';
    plogTrigger.style.display = 'none';
  }

  closeSheet();
}

function calcArea() {
  const l = parseFloat(document.getElementById('measure-length').value) || 0;
  const w = parseFloat(document.getElementById('measure-width').value) || 0;
  document.getElementById('calculated-area').innerText = (l * w).toFixed(1) + " m²";
}

function openPlogMapModal() {
  document.getElementById('plogmap-modal').classList.add('active');
  if (!snowDrawer) {
    snowDrawer = new window.SnowMapDrawer('plog-canvas');
  }
}

function closePlogMapModal() {
  document.getElementById('plogmap-modal').classList.remove('active');
}

function setMapTool(tool) {
  if (snowDrawer) snowDrawer.setTool(tool);
}

function clearPlogCanvas() {
  if (snowDrawer) snowDrawer.clearMap();
}

function openSheet() { document.getElementById('sheetBackdrop').classList.add('active'); }
function closeSheet() { document.getElementById('sheetBackdrop').classList.remove('active'); }

function setJobType(type) {
  currentJobType = type;
  document.getElementById('btn-type-new').classList.toggle('active', type === 'nya');
  document.getElementById('btn-type-ata').classList.toggle('active', type === 'ata');
  const ataRow = document.getElementById('row-ata-number');
  ataRow.style.display = type === 'ata' ? 'flex' : 'none';
}

function getCurrentTimeStr() {
  const now = new Date();
  return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
}

async function initApp() {
  await initDatabase();
  drafts = await loadAllDrafts();
  const now = new Date();
  document.getElementById('input-date').value = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  document.getElementById('input-start').value = getCurrentTimeStr();
  
  renderActivitySheet();
  renderOutbox();
  updateDashboardData();
}

document.addEventListener('DOMContentLoaded', initApp);
