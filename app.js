if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}

// ----------------------------------------------------
// TEMA-VÄXLARE (LJUST / MÖRKT + STATUS BAR-STÖD)
// ----------------------------------------------------
const themeBtn = document.getElementById('theme-toggle');
const themeMeta = document.getElementById('theme-color-meta');
const currentTheme = localStorage.getItem('tidrapport_theme') || 'dark';

if (currentTheme === 'light') {
  document.body.classList.add('light-theme');
  document.documentElement.classList.add('light-theme');
  if (themeMeta) themeMeta.setAttribute('content', '#F2F2F7');
}

themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('light-theme');
  document.documentElement.classList.toggle('light-theme');
  
  const isLight = document.body.classList.contains('light-theme');
  const newTheme = isLight ? 'light' : 'dark';
  localStorage.setItem('tidrapport_theme', newTheme);
  
  if (themeMeta) {
    themeMeta.setAttribute('content', isLight ? '#F2F2F7' : '#000000');
  }
});

// ----------------------------------------------------
// BILDUNDERLAG (KRYMPER FLERA BILDER LOKALT FÖR OFFLINE)
// ----------------------------------------------------
let currentImagesBase64 = [];

document.getElementById('camera-input').addEventListener('change', async function(e) {
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
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          
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
  document.querySelector('.add-photo-btn').style.borderColor = "#30D158";
  document.querySelector('.add-photo-btn').style.color = "#30D158";
});

function resetPhotoInput() {
  currentImagesBase64 = [];
  document.getElementById('camera-input').value = "";
  document.getElementById('photo-label').innerText = "Bifoga bild-underlag";
  document.querySelector('.add-photo-btn').style.borderColor = "var(--text-muted)";
  document.querySelector('.add-photo-btn').style.color = "var(--text-muted)";
}

// ----------------------------------------------------
// FORMULÄR, IKONER & LOGIK
// ----------------------------------------------------
let drafts = JSON.parse(localStorage.getItem('tidrapport_drafts')) || [];
let plannedJobs = [];
let currentActivity = "";
let currentJobType = "nya";
const DEFAULT_PLACES = ["Blacksta", "Coop", "Testplats"];

function setJobType(type) {
  currentJobType = type;
  document.getElementById('btn-type-new').classList.toggle('active', type === 'nya');
  document.getElementById('btn-type-ata').classList.toggle('active', type === 'ata');
  
  const ataRow = document.getElementById('row-ata-number');
  if (type === 'ata') {
    ataRow.style.display = 'flex';
    document.getElementById('input-ata').focus();
  } else {
    ataRow.style.display = 'none';
  }
}

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

function openSheet() { document.getElementById('sheetBackdrop').classList.add('active'); }
function closeSheet() { document.getElementById('sheetBackdrop').classList.remove('active'); }

function triggerPlaceAlert() {
  const row = document.getElementById('row-place');
  row.classList.remove('shake-alert');
  void row.offsetWidth; 
  row.classList.add('shake-alert');
  document.getElementById('input-place').focus();
  setTimeout(() => row.classList.remove('shake-alert'), 600);
}

function handleActivityClick() {
  if (!document.getElementById('input-place').value.trim()) triggerPlaceAlert();
  openSheet();
}

function selectActivity(name) {
  currentActivity = name;
  document.getElementById('selected-activity').innerHTML = `${name} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`;
  closeSheet();
}

function getCurrentTimeStr() {
  const nu = new Date();
  return String(nu.getHours()).padStart(2, '0') + ':' + String(nu.getMinutes()).padStart(2, '0');
}

function renderQuickChips() {
  const container = document.getElementById('chips-container');
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

document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  document.getElementById('input-date').value = localDate;
  document.getElementById('input-start').value = getCurrentTimeStr();
  
  renderQuickChips(); updateLiveHours(); renderOutbox(); fetchPlannedJobs();
});

async function fetchPlannedJobs() {
  if (!navigator.onLine) return;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'getCalendar', 
        date: document.getElementById('input-date').value,
        token: API_TOKEN
      })
    });
    const data = await res.json();
    if (data.status === 'success') { plannedJobs = data.events; renderOutbox(); }
  } catch (error) { console.error("Kunde inte hämta kalender", error); }
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

function clockInPlannedJob(jobId) {
  const job = plannedJobs.find(j => j.id === jobId);
  if(!job) return;

  const ongoing = drafts.find(d => !d.end);
  if (ongoing) {
    if (confirm(`Du har redan "${ongoing.activity}" pågående.\n\nVill du stämpla ut det förra passet nu?`)) {
      ongoing.end = getCurrentTimeStr();
    }
  }
  
  drafts.push({
    id: Date.now(), calendarJobId: job.id, type: 'normal',
    date: document.getElementById('input-date').value,
    place: job.place, activity: job.title, notes: job.description,
    start: getCurrentTimeStr(), end: '', images: []
  });
  
  saveDrafts(); renderOutbox(); renderQuickChips();
}

function createSplitPass(sourceId) {
  const src = drafts.find(d => d.id === sourceId);
  if (!src) return;

  const ongoing = drafts.find(d => !d.end);
  if (ongoing && confirm(`Du har redan "${ongoing.activity}" pågående.\n\nVill du stämpla ut det förra passet nu?`)) {
    ongoing.end = getCurrentTimeStr();
  }

  let baseName = src.activity; let passNum = 2;
  const match = src.activity.match(/^(.*?)\s*\(Pass\s*(\d+)\)$/i);
  if (match) { baseName = match[1]; passNum = parseInt(match[2]) + 1; } 
  else { src.activity = `${src.activity} (Pass 1)`; }

  drafts.push({
    id: Date.now(), calendarJobId: src.calendarJobId || null, type: src.type || 'normal',
    ataNumber: src.ataNumber || '', date: document.getElementById('input-date').value,
    place: src.place, activity: `${baseName} (Pass ${passNum})`, notes: src.notes || '',
    start: getCurrentTimeStr(), end: '', images: []
  });
  saveDrafts(); renderOutbox();
}

function clockOut(id) {
  const draftIndex = drafts.findIndex(d => d.id === id);
  if (draftIndex !== -1) { drafts[draftIndex].end = getCurrentTimeStr(); saveDrafts(); renderOutbox(); }
}

function saveDrafts() { localStorage.setItem('tidrapport_drafts', JSON.stringify(drafts)); }

function saveToOutbox() {
  const date = document.getElementById('input-date').value;
  const place = document.getElementById('input-place').value.trim();
  const notes = document.getElementById('input-notes').value;
  const start = document.getElementById('input-start').value;
  const end = document.getElementById('input-end').value;
  const ata = document.getElementById('input-ata').value;

  if (!place) { triggerPlaceAlert(); return; }
  if (!start) { alert("Fyll i starttid!"); return; }

  drafts.push({
    id: Date.now(), type: currentJobType, ataNumber: currentJobType === 'ata' ? ata : '',
    date: date, place: place, activity: currentActivity || "Övrigt",
    notes: notes, start: start, end: end,
    images: [...currentImagesBase64]
  });

  saveDrafts();
  
  document.getElementById('input-place').value = '';
  document.getElementById('input-notes').value = '';
  document.getElementById('input-end').value = '';
  document.getElementById('input-ata').value = '';
  document.getElementById('input-start').value = getCurrentTimeStr();
  document.getElementById('selected-activity').innerHTML = `Välj aktivitet <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`;
  currentActivity = ""; setJobType('nya'); resetPhotoInput(); updateLiveHours(); renderOutbox(); renderQuickChips();
}

function deleteDraft(id) { drafts = drafts.filter(d => d.id !== id); saveDrafts(); renderOutbox(); renderQuickChips(); }

function renderOutbox() {
  const container = document.getElementById('outbox-container');
  const section = document.getElementById('outbox-section');
  const title = document.getElementById('outbox-title');
  container.innerHTML = '';
  
  if (drafts.length === 0 && plannedJobs.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  
  let totalHours = 0; drafts.forEach(d => { if (d.start && d.end) totalHours += calculateHours(d.start, d.end); });
  title.innerText = `Dagens pass (${drafts.length} st · ${totalHours.toFixed(1)} h)`;

  plannedJobs.forEach(job => {
    if (drafts.some(d => d.calendarJobId === job.id)) return;
    const card = document.createElement('div'); card.className = 'draft-card';
    card.innerHTML = `
      <div class="card-body">
        <div class="card-title"><span style="color:var(--blue); margin-right:12px; display:inline-flex;">${getActivityIcon(job.title)}</span><span>${job.title}</span></div>
        <div class="card-meta"><span>📅 Planerat</span><span class="dot">•</span><span style="color:var(--text);">${job.place}</span></div>
        ${job.description ? `<div class="card-note">${job.description}</div>` : ''}
      </div>
      <div class="card-actions">
        <button class="btn-action clock-in" onclick="clockInPlannedJob('${job.id}')">Stämpla in</button>
      </div>`;
    container.appendChild(card);
  });

  drafts.forEach(draft => {
    const card = document.createElement('div'); card.className = 'draft-card';
    const isOngoing = !draft.end;
    const timeDisplay = isOngoing ? `<span class="ongoing-pulse">Pågår</span>` : `${draft.start} – ${draft.end}`;
    const hDisplay = isOngoing ? '' : `${calculateHours(draft.start, draft.end).toFixed(1)} h`;
    const photoIcon = (draft.images && draft.images.length > 0) ? `<span style="color:var(--green); margin-left:8px; font-size:12px;">📸 ${draft.images.length}</span>` : '';
    
    let btns = isOngoing 
      ? `<button class="btn-action clock-out" onclick="clockOut(${draft.id})">Stämpla ut nu</button>
         <button class="btn-action delete" onclick="deleteDraft(${draft.id})" style="flex:0 0 50px;">🗑</button>`
      : `<button class="btn-action split-pass" onclick="createSplitPass(${draft.id})">Nytt pass</button>
         <button class="btn-action delete" onclick="deleteDraft(${draft.id})">Radera</button>`;

    card.innerHTML = `
      <div class="card-body">
        <div class="card-title">
          <span style="color:var(--accent); margin-right:12px; display:inline-flex;">${getActivityIcon(draft.activity)}</span>
          ${draft.type === 'ata' ? `<span class="badge-ata">${draft.ataNumber || 'ÄTA'}</span>` : ''}
          <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${draft.activity}</span> ${photoIcon}
        </div>
        <div class="card-meta"><span>${draft.date}</span><span class="dot">•</span><span>${timeDisplay}</span><span class="dot">•</span><span style="color:var(--text); font-weight:500;">${hDisplay}</span></div>
        ${draft.notes ? `<div class="card-note">${draft.notes}</div>` : ''}
      </div>
      <div class="card-actions">${btns}</div>`;
    container.appendChild(card);
  });
}

async function submitAll() {
  if (drafts.length === 0) return;
  const btn = document.querySelector('.submit-pill-btn');
  btn.innerHTML = `Skickar...`; btn.disabled = true;
  try {
    const res = await fetch(API_URL, { 
      method: 'POST', 
      body: JSON.stringify({ 
        action: 'batchReports', 
        pass: drafts,
        token: API_TOKEN
      }) 
    });
    const result = await res.json();
    if (result && result.status === "success") {
      alert(`Klart! ${result.count} pass sparade i kalkylarket.`);
      drafts = []; saveDrafts(); renderOutbox(); renderQuickChips();
    } else { alert("Fel vid inskick: " + (result.message || "Okänt fel")); }
  } catch (err) { alert("Kunde inte nå kalkylarket. Passen ligger kvar säkert i telefonen!"); } 
  finally { btn.innerHTML = `Skicka in`; btn.disabled = false; }
}
