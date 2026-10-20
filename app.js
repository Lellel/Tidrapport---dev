// Registrera Service Worker för offline-drift
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
let attachedPhotoBase64 = null;

// Läs användare och Admin-status från URL / localStorage
const urlParams = new URLSearchParams(window.location.search);

if (urlParams.has('user')) {
  localStorage.setItem('lpv_user', urlParams.get('user'));
}
if (urlParams.has('admin')) {
  const isAdm = urlParams.get('admin').toLowerCase() === 'true' || urlParams.get('admin') === '1';
  localStorage.setItem('lpv_is_admin', isAdm ? 'true' : 'false');
}

const currentUser = urlParams.get('user') || localStorage.getItem('lpv_user') || 'Daniel';
let isAdmin = (urlParams.get('admin') && (urlParams.get('admin').toLowerCase() === 'true' || urlParams.get('admin') === '1'))
           || localStorage.getItem('lpv_is_admin') === 'true';

// Hantera klick på namn-pillret (Tryck 3 ggr för att slå på/av Admin manuellt)
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

// Hämtar pass ur båda historiska nycklarna
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
  const json = JSON.stringify(drafts);
  localStorage.setItem('tidrapport_drafts', json);
  localStorage.setItem('lpv_tidrapport_drafts', json);
}

// Ikon-bibliotek (SVG 20x20)
function getActivityIcon(name) {
  switch (name) {
    case 'Bandgrävare':
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18h18"/><path d="M4 18v-5c0-2 2-3 4-3h8c2 0 4 1 4 3v5"/></svg>`;
    case 'Stalltvätt':
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;
    case 'Snöröjning':
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/></svg>`;
    case 'Kyl- & frysflytt':
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M4 12h16"/><path d="M12 4v16"/></svg>`;
    case 'Linjemålning':
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5"/><path d="M5 12h14"/></svg>`;
    case 'Fasadmålning':
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
    default:
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
  }
}

// Action Sheet-kontroll
function openSheet() {
  document.getElementById('sheetBackdrop').classList.add('active');
}

function closeSheet() {
  document.getElementById('sheetBackdrop').classList.remove('active');
}

function selectActivity(name) {
  currentActivity = name;
  document.getElementById('selected-activity').innerHTML = `
    ${name}
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
  `;
  closeSheet();
}

// Jobbtyp (Kalender / Nya / ÄTA)
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

  if (type === 'kalender') {
    fetchCalendarData();
  }
}

// Initiering
function initApp() {
  // Sätt dagens datum & aktuell starttid
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
  window.addEventListener('orientationchange', () => {
    setTimeout(updateDashboardData, 150);
  });

  updateLiveHours();
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
    adminSection.style.display = isAdmin ? 'block' : 'none';
  }
}

// Tidsberäkning
function calculateHours(start, end) {
  if (!start || !end) return 0;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  let diff = (endH + endM / 60) - (startH + startM / 60);
  if (diff < 0) diff += 24;
  return diff;
}

// Live-indikator på tider
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

// Bilduppladdning och komprimering till Base64
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

// Stämpla ut pågående pass
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

// Spara till Utkorg
function saveToOutbox() {
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
    photo: attachedPhotoBase64
  };

  drafts.push(draft);
  saveDraftsToStorage();

  // Återställ formulär
  document.getElementById('input-place').value = '';
  document.getElementById('input-notes').value = '';
  document.getElementById('input-end').value = '';
  document.getElementById('input-ata').value = '';
  document.getElementById('photo-label').innerText = "Bifoga bild-underlag";
  attachedPhotoBase64 = null;

  const nu = new Date();
  const h = String(nu.getHours()).padStart(2, '0');
  const m = String(nu.getMinutes()).padStart(2, '0');
  document.getElementById('input-start').value = `${h}:${m}`;
  document.getElementById('selected-activity').innerHTML = `
    Välj aktivitet
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
  `;
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

// Rendera utkorgskorten
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
  drafts.forEach(d => {
    if (d.start && d.end) {
      totalHours += parseFloat(calculateHours(d.start, d.end));
    }
  });

  title.innerText = `Dagens pass (${drafts.length} st • ${totalHours.toFixed(1)} h)`;

  drafts.forEach(draft => {
    const card = document.createElement('div');
    card.className = 'draft-card';
    const iconSvg = getActivityIcon(draft.activity);
    const isOngoing = !draft.end;
    const timeDisplay = isOngoing ? '<span class="ongoing-pulse">Pågår</span>' : `${draft.start} – ${draft.end}`;
    const hoursDisplay = isOngoing ? '' : `${calculateHours(draft.start, draft.end).toFixed(1)} h`;
    const ataBadge = draft.type === 'ata' ? `<span class="badge-ata">${draft.ataNumber ? draft.ataNumber : 'ÄTA'}</span>` : '';

    let actionButtons = '';
    if (isOngoing) {
      actionButtons = `
        <button class="btn-action clock-out" onclick="clockOut(${draft.id})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
          Stämpla ut nu
        </button>
        <button class="btn-action delete" onclick="deleteDraft(${draft.id})" style="flex:0 0 45px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
        </button>
      `;
    } else {
      actionButtons = `
        <button class="btn-action delete" onclick="deleteDraft(${draft.id})">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
          Radera
        </button>
      `;
    }

    card.innerHTML = `
      <div class="card-body">
        <div class="card-title">
          <span style="display:inline-flex; align-items:center; color:var(--accent); margin-right:8px; flex-shrink:0;">
            ${iconSvg}
          </span>
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
        </div>
        ${draft.notes ? `<div class="card-note">${draft.notes}</div>` : ''}
      </div>
      <div class="card-actions">
        ${actionButtons}
      </div>
    `;
    container.appendChild(card);
  });
}

// Skicka in allt till backend (Batch)
async function submitAll() {
  if (drafts.length === 0) return;

  const btn = document.getElementById('btnSubmitAll');
  btn.innerHTML = `<svg class="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFF" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg> Skickar...`;
  btn.disabled = true;

  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
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

// Osthyveln: Hämta jobb från Google Kalender
async function fetchCalendarData() {
  const chosenDate = document.getElementById('input-date').value;
  try {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
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
      if (ev.description) {
        document.getElementById('input-notes').value = ev.description;
      }
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

// ==========================================
// DASHBOARD & ADMIN-LOGIK
// ==========================================

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
      <div style="font-weight:600; color:var(--accent);">${hours.toFixed(1)} h</div>
    `;
    listEl.appendChild(row);
  });

  totalHoursEl.innerText = `${totalH.toFixed(1)} h`;
}

// Skicka länk via SMS
function adminSendSMS() {
  const baseUrl = window.location.origin + window.location.pathname;
  window.location.href = `sms:?&body=${encodeURIComponent("Här är inloggningen till LPV Tidrapport: " + baseUrl)}`;
}

// Skicka länk via E-post
function adminSendEmail() {
  const baseUrl = window.location.origin + window.location.pathname;
  window.location.href = `mailto:?subject=${encodeURIComponent("Inloggning LPV Tidrapport")}&body=${encodeURIComponent("Klicka här för att logga in på telefonen: " + baseUrl)}`;
}

// Växla QR-kodsvisning
function toggleAdminQR() {
  const qrBox = document.getElementById('admin-qr-container');
  const qrImg = document.getElementById('admin-qr-image');
  if (!qrBox || !qrImg) return;

  if (qrBox.style.display === 'none' || qrBox.style.display === '') {
    const currentUrl = window.location.origin + window.location.pathname;
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}`;
    qrBox.style.display = 'block';
  } else {
    qrBox.style.display = 'none';
  }
}
