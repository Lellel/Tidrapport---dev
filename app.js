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
let currentActivity = "";
let currentJobType = "nya";
let currentImagesBase64 = []; // Flerbildsuppladdning

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

let adminUserList = [];
let hasFetchedUsers = false;

// TEMA-VÄXLARE
const themeBtn = document.getElementById('theme-toggle');
const themeMeta = document.getElementById('theme-color-meta');
const currentTheme = localStorage.getItem('tidrapport_theme') || 'dark';

if (currentTheme === 'light') {
  document.documentElement.classList.add('light-theme');
  document.body.classList.add('light-theme');
  if (themeMeta) themeMeta.setAttribute('content', '#F2F2F7');
}

if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    document.documentElement.classList.toggle('light-theme');
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('tidrapport_theme', isLight ? 'light' : 'dark');
    if (themeMeta) themeMeta.setAttribute('content', isLight ? '#F2F2F7' : '#000000');
  });
}

// 3 klick för manuell admin-togglande
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

function loadAllDrafts() {
  const d1 = localStorage.getItem('tidrapport_drafts');
  const d2 = localStorage.getItem('lpv_tidrapport_drafts');
  try {
    if (d1) return JSON.parse(d1);
    if (d2) return JSON.parse(d2);
  } catch (e) { console.error(e); }
  return [];
}

function saveDraftsToStorage() {
  const json = JSON.stringify(drafts);
  localStorage.setItem('tidrapport_drafts', json);
  localStorage.setItem('lpv_tidrapport_drafts', json);
}

// ORIGINAL-IKONERNA DIREKT FRÅN ORIGINALKODEN
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

// Action Sheet & Aktivitetsval
function openSheet() { document.getElementById('sheetBackdrop').classList.add('active'); }
function closeSheet() { document.getElementById('sheetBackdrop').classList.remove('active'); }
function selectActivity(name) {
  currentActivity = name;
  document.getElementById('selected-activity').innerHTML = `${name} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`;
  closeSheet();
}
function handleActivityClick() {
  if (!document.getElementById('input-place').value.trim()) triggerPlaceAlert();
  openSheet();
}

function setJobType(type) {
  currentJobType = type;
  document.getElementById('btn-type-cal').classList.toggle('active', type === 'kalender');
  document.getElementById('btn-type-new').classList.toggle('active', type === 'nya');
  document.getElementById('btn-type-ata').classList.toggle('active', type === 'ata');

  const ataRow = document.getElementById('row-ata-number');
  if (type === 'ata') {
    ataRow.style.display = 'flex';
    document.getElementById('input-ata').focus();
  } else {
    ataRow.style.display = 'none';
  }
  if (type === 'kalender') fetchCalendarData();
}

// CHIPS (SNABBVAL) OCH SKAK-ALERT
const DEFAULT_PLACES = ["Blacksta", "Coop", "Testplats"];
function renderQuickChips() {
  const container = document.getElementById('chips-container');
  if (!container) return;
  container.innerHTML = '';
  const recentPlaces = drafts.map(d => d.place).filter(Boolean);
  const places = Array.from(new Set([...DEFAULT_PLACES, ...recentPlaces])).slice(0, 5);
  
  places.forEach(place => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'chip-btn'; btn.innerText = place;
    btn.onclick = () => {
      document.getElementById('input-place').value = place;
      document.getElementById('row-place').classList.remove('shake-alert');
    };
    container.appendChild(btn);
  });
}

function triggerPlaceAlert() {
  const row = document.getElementById('row-place');
  row.classList.remove('shake-alert');
  void row.offsetWidth;
  row.classList.add('shake-alert');
  document.getElementById('input-place').focus();
  setTimeout(() => row.classList.remove('shake-alert'), 600);
}

// INITIERING
function initApp() {
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
  renderQuickChips();
  renderOutbox();
  updateDashboardData();
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
  const start = document.getElementById('input-start').value;
  const end = document.getElementById('input-end').value;
  const badge = document.getElementById('current-duration-badge');
  if (start && end) {
    const hours = calculateHours(start, end);
    badge.innerText = `${hours.toFixed(1)} h`;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

// BILD-UPPLADDNING (MULTI)
document.getElementById('camera-input')?.addEventListener('change', async function(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  const maxFiles = Math.min(files.length, 5);
  document.getElementById('photo-label').innerText = "Bearbetar bilder...";

  for (let i = 0; i < maxFiles; i++) {
    const file = files[i];
    await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
          canvas.height = (img.width > MAX_WIDTH) ? (img.height * scaleSize) : img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          currentImagesBase64.push(canvas.toDataURL('image/jpeg', 0.7));
          resolve();
        };
      };
      reader.readAsDataURL(file);
    });
  }
  document.getElementById('photo-label').innerText = currentImagesBase64.length + " Bilder bifogade";
  document.querySelector('.add-photo-btn').style.borderColor = "var(--green)";
  document.querySelector('.add-photo-btn').style.color = "var(--green)";
});

function resetPhotoInput() {
  currentImagesBase64 = [];
  const camInput = document.getElementById('camera-input');
  if(camInput) camInput.value = "";
  document.getElementById('photo-label').innerText = "Bifoga bild-underlag";
  document.querySelector('.add-photo-btn').style.borderColor = "rgba(255, 159, 10, 0.3)";
  document.querySelector('.add-photo-btn').style.color = "var(--accent)";
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
  }
}

function saveToOutbox() {
  const date = document.getElementById('input-date').value;
  const place = document.getElementById('input-place').value.trim();
  const notes = document.getElementById('input-notes').value.trim();
  const start = document.getElementById('input-start').value;
  const end = document.getElementById('input-end').value;
  const ata = document.getElementById('input-ata').value.trim();

  if (!place) { triggerPlaceAlert(); return; }
  if (!start) { alert("Fyll i starttid!"); return; }

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
    images: [...currentImagesBase64]
  };

  drafts.push(draft);
  saveDraftsToStorage();

  document.getElementById('input-place').value = '';
  document.getElementById('input-notes').value = '';
  document.getElementById('input-end').value = '';
  document.getElementById('input-ata').value = '';
  resetPhotoInput();

  const nu = new Date();
  const h = String(nu.getHours()).padStart(2, '0');
  const m = String(nu.getMinutes()).padStart(2, '0');
  document.getElementById('input-start').value = `${h}:${m}`;
  document.getElementById('selected-activity').innerHTML = `Välj aktivitet <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`;
  currentActivity = "";
  setJobType('nya');

  updateLiveHours();
  renderQuickChips();
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

  container.innerHTML = '';
  if (drafts.length === 0) {
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

  if (submitBtn) submitBtn.style.display = 'flex';
  let totalHours = 0;
  drafts.forEach(d => { if (d.start && d.end) totalHours += parseFloat(calculateHours(d.start, d.end)); });
  title.innerText = `Dagens pass (${drafts.length} st • ${totalHours.toFixed(1)} h)`;

  drafts.forEach(draft => {
    const card = document.createElement('div');
    card.className = 'draft-card';
    const iconSvg = getActivityIcon(draft.activity);
    const isOngoing = !draft.end;
    const timeDisplay = isOngoing ? '<span class="ongoing-pulse">Pågår</span>' : `${draft.start} –${draft.end}`;
    const hoursDisplay = isOngoing ? '' : `${calculateHours(draft.start, draft.end).toFixed(1)} h`;
    const ataBadge = draft.type === 'ata' ? `<span class="badge-ata">${draft.ataNumber ? draft.ataNumber : 'ÄTA'}</span>` : '';
    const photoIcon = (draft.images && draft.images.length > 0) ? `<span style="color:var(--green); margin-left:auto;">📸</span>` : '';

    let actionButtons = isOngoing ? `
      <button class="btn-action clock-out" onclick="clockOut(${draft.id})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
        Stämpla ut nu
      </button>
      <button class="btn-action delete" onclick="deleteDraft(${draft.id})" style="flex:0 0 45px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg></button>
    ` : `
      <button class="btn-action delete" onclick="deleteDraft(${draft.id})">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
        Radera
      </button>
    `;

    card.innerHTML = `
      <div class="card-body">
        <div class="card-title">
          <span style="display:inline-flex; align-items:center; color:var(--accent); margin-right:8px; flex-shrink:0;">${iconSvg}</span>${ataBadge}
          <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:110px;">${draft.place}</span>
          <span class="dot">•</span>
          <span style="font-weight:400; color:#A1A1A6; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${draft.activity}</span>${photoIcon}
        </div>
        <div class="card-meta">
          <span>${draft.date}</span><span class="dot">•</span><span>${timeDisplay}</span>${hoursDisplay ? `<span class="dot">•</span><span style="color:var(--text); font-weight:500;">${hoursDisplay}</span>` : ''}
        </div>
        ${draft.notes ? `<div class="card-note">${draft.notes}</div>` : ''}
      </div>
      <div class="card-actions">${actionButtons}</div>
    `;
    container.appendChild(card);
  });
}

// BATCH-RAPPORT MED CORS-FIX
async function submitAll() {
  if (drafts.length === 0) return;
  const btn = document.getElementById('btnSubmitAll');
  btn.innerHTML = `<svg class="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFF" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg> Skickar...`;
  btn.disabled = true;

  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      body: JSON.stringify({
        token: CONFIG.API_TOKEN,
        action: 'batchReports',
        pass: drafts
      })
    });
    const result = await res.json();
    if (result && result.status === 'success') {
      alert(`Klart! ${result.count || drafts.length} pass har sparats i kalkylarket.`);
      drafts = [];
      saveDraftsToStorage();
      renderOutbox();
      updateDashboardData();
    } else {
      alert("Fel vid inskickning: " + (result.message || "Okänt fel"));
    }
  } catch (err) {
    alert("Kunde inte nå kalkylarket just nu. Passen ligger kvar säkert i telefonen!");
    console.error(err);
  } finally {
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFF" stroke-width="2.5"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg> Skicka in`;
    btn.disabled = false;
  }
}

// KALENDER MED CORS-FIX
async function fetchCalendarData() {
  const chosenDate = document.getElementById('input-date').value;
  try {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      body: JSON.stringify({
        token: CONFIG.API_TOKEN,
        action: "getCalendar",
        date: chosenDate
      })
    });
    const data = await res.json();
    if (data.status === "success" && data.events && data.events.length > 0) {
      const ev = data.events[0];
      document.getElementById('input-place').value = ev.place;
      selectActivity(ev.title);
      if (!ev.isAllDay) {
        document.getElementById('input-start').value = ev.start;
        document.getElementById('input-end').value = ev.end;
      }
      if (ev.description) document.getElementById('input-notes').value = ev.description;
      updateLiveHours();
      alert(`Hämtade schemalagt jobb: ${ev.title} (${ev.place})`);
    } else {
      alert("Inga kalenderjobb hittades för valt datum.");
    }
  } catch (err) {
    console.error("Kalenderfel:", err);
    alert("Kunde inte hämta kalenderdata.");
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
        <div style="font-weight:600; color:var(--text);">${p.place || 'Uppdrag'}</div>
        <div style="font-size:11px; color:var(--text-muted);">${p.activity || 'Övrigt'} (${p.start}–${p.end || 'Pågår'})</div>
      </div>
      <div style="font-weight:600; color:var(--accent);">${hours.toFixed(1)} h</div>
    `;
    listEl.appendChild(row);
  });
  totalHoursEl.innerText = `${totalH.toFixed(1)} h`;
}

// ADMIN-LOGIK & KONTAKTBOK MED DETALJERAD FELVISNING
async function fetchAdminUsers() {
  const select = document.getElementById('admin-target-user');
  if (!select) return;
  select.innerHTML = '<option value="">Hämtar...</option>';
  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      body: JSON.stringify({ token: CONFIG.API_TOKEN, action: 'getUsers' })
    });
    const data = await res.json();
    if (data.status === 'success') {
      adminUserList = data.users;
      hasFetchedUsers = true;
      select.innerHTML = '<option value="">Välj person...</option>';
      adminUserList.forEach(u => { select.innerHTML += `<option value="${u.name}">${u.name}</option>`; });
    } else {
      console.error("Backend felmeddelande:", data.message);
      select.innerHTML = `<option value="">Fel: ${data.message || 'Okänt backendfel'}</option>`;
    }
  } catch (err) {
    console.error("Nätverksfel:", err);
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
  const targetUser = document.getElementById('admin-target-user')?.value.trim() || '';
  const targetIsAdmin = document.getElementById('admin-target-is-admin')?.checked;
  const baseUrl = window.location.origin + window.location.pathname;
  const params = new URLSearchParams();
  if (targetUser) params.set('user', targetUser);
  if (targetIsAdmin) params.set('admin', 'true');
  const qs = params.toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}

function updateAdminTargetLink() {
  const qrBox = document.getElementById('admin-qr-container');
  const qrImg = document.getElementById('admin-qr-image');
  const caption = document.getElementById('admin-qr-caption');
  if (qrBox && qrBox.style.display === 'block' && qrImg) {
    const targetUrl = getAdminTargetUrl();
    const targetUser = document.getElementById('admin-target-user')?.value.trim() || '';
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(targetUrl)}`;
    if (caption) caption.innerText = targetUser ? `Skanna för att logga in som ${targetUser}:` : "Skanna för att logga in:";
  }
}

function adminSendSMS() {
  const targetUrl = getAdminTargetUrl();
  const targetUser = document.getElementById('admin-target-user')?.value.trim() || 'kollega';
  const phone = document.getElementById('admin-target-phone')?.value.trim() || '';
  const message = `Hej ${targetUser}! Här är din inloggningslänk till LPV Tidrapport: ${
