if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW aktiv:', reg.scope))
      .catch(err => console.error('Kunde inte starta SW:', err));
  });
}

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

// Ikon-bibliotek (24x24)
function getActivityIcon(name) {
  const props = 'width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  if (name.includes('Kyl- & frysflytt')) return `<svg ${props}><path d="M4 4h16v16H4z"/><path d="M4 12h16"/><path d="M12 4v16"/></svg>`;
  if (name.includes('Snöröjning')) return `<svg ${props}><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><path d="M8 16h.01"/><path d="M8 20h.01"/><path d="M12 18h.01"/><path d="M12 22h.01"/><path d="M16 16h.01"/><path d="M16 20h.01"/></svg>`;
  if (name.includes('Linjemålning')) return `<svg ${props}><path d="M12 19V5"/><path d="M5 12h14"/></svg>`;
  if (name.includes('Fasadmålning')) return `<svg ${props}><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
  if (name.includes('Stalltvätt')) return `<svg ${props}><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;
  if (name.includes('Bandgrävare')) return `<svg ${props}><path d="M3 18h18"/><path d="M4 18v-5c0-2 2-3 4-3h8c2 0 4 1 4 3v5"/></svg>`;
  return `<svg ${props}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;
}

function openSheet() { document.getElementById('sheetBackdrop').classList.add('active'); }
function closeSheet() { document.getElementById('sheetBackdrop').classList.remove('active'); }

function triggerPlaceAlert() {
  const row = document.getElementById('row-place');
  row.classList.remove('shake-alert');
  void row.offsetWidth; // Tvinga reflow
  row.classList.add('shake-alert');
  document.getElementById('input-place').focus();
  setTimeout(() => row.classList.remove('shake-alert'), 600);
}

function handleActivityClick() {
  const place = document.getElementById('input-place').value.trim();
  if (!place) {
    triggerPlaceAlert();
  }
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

// RITA UT ORANGEA BUBBLOR
function renderQuickChips() {
  const container = document.getElementById('chips-container');
  container.innerHTML = '';
  
  const recentPlaces = drafts.map(d => d.place).filter(Boolean);
  const places = Array.from(new Set([...DEFAULT_PLACES, ...recentPlaces])).slice(0, 5);

  places.forEach(place => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip-btn';
    btn.innerText = place;
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
  
  renderQuickChips();
  updateLiveHours();
  renderOutbox();
  fetchPlannedJobs();
});

// Hämtar kalenderjobb
async function fetchPlannedJobs() {
  if (!navigator.onLine) return;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'getCalendar', date: document.getElementById('input-date').value })
    });
    const data = await res.json();
    if (data.status === 'success') {
      plannedJobs = data.events;
      renderOutbox();
    }
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

// Stämpla in på planerat jobb med snabbväxlings-koll
function clockInPlannedJob(jobId) {
  const job = plannedJobs.find(j => j.id === jobId);
  if(!job) return;

  const ongoing = drafts.find(d => !d.end);
  if (ongoing) {
    const shouldStop = confirm(`Du har redan "${ongoing.activity}" pågående.\n\nVill du stämpla ut det förra passet nu?`);
    if (shouldStop) {
      ongoing.end = getCurrentTimeStr();
    }
  }
  
  const draft = {
    id: Date.now(),
    calendarJobId: job.id,
    type: 'normal',
    date: document.getElementById('input-date').value,
    place: job.place,
    activity: job.title,
    notes: job.description,
    start: getCurrentTimeStr(),
    end: ''
  };
  
  drafts.push(draft);
  saveDrafts();
  renderOutbox();
  renderQuickChips();
}

// Skapa delat pass (+ Nytt pass)
function createSplitPass(sourceId) {
  const src = drafts.find(d => d.id === sourceId);
  if (!src) return;

  const ongoing = drafts.find(d => !d.end);
  if (ongoing) {
    const shouldStop = confirm(`Du har redan "${ongoing.activity}" pågående.\n\nVill du stämpla ut det förra passet nu?`);
    if (shouldStop) {
      ongoing.end = getCurrentTimeStr();
    }
  }

  // Räkna ut passnummer
  let baseName = src.activity;
  let passNum = 2;
  const match = src.activity.match(/^(.*?)\s*\(Pass\s*(\d+)\)$/i);
  if (match) {
    baseName = match[1];
    passNum = parseInt(match[2]) + 1;
  } else {
    src.activity = `${src.activity} (Pass 1)`;
  }

  const newDraft = {
    id: Date.now(),
    calendarJobId: src.calendarJobId || null,
    type: src.type || 'normal',
    ataNumber: src.ataNumber || '',
    date: document.getElementById('input-date').value,
    place: src.place,
    activity: `${baseName} (Pass ${passNum})`,
    notes: src.notes || '',
    start: getCurrentTimeStr(),
    end: ''
  };

  drafts.push(newDraft);
  saveDrafts();
  renderOutbox();
}

function clockOut(id) {
  const draftIndex = drafts.findIndex(d => d.id === id);
  if (draftIndex !== -1) {
    drafts[draftIndex].end = getCurrentTimeStr();
    saveDrafts();
    renderOutbox();
  }
}

function saveDrafts() {
  localStorage.setItem('tidrapport_drafts', JSON.stringify(drafts));
}

function saveToOutbox() {
  const date = document.getElementById('input-date').value;
  const place = document.getElementById('input-place').value.trim();
  const notes = document.getElementById('input-notes').value;
  const start = document.getElementById('input-start').value;
  const end = document.getElementById('input-end').value;
  const ata = document.getElementById('input-ata').value;

  if (!place) {
    triggerPlaceAlert();
    return;
  }
  if (!start) {
    alert("Fyll i starttid!");
    return;
  }

  const draft = {
    id: Date.now(),
    type: currentJobType,
    ataNumber: currentJobType === 'ata' ? ata : '',
    date: date,
    place: place,
    activity: currentActivity || "Övrigt",
    notes: notes,
    start: start,
    end: end
  };

  drafts.push(draft);
  saveDrafts();

  document.getElementById('input-place').value = '';
  document.getElementById('input-notes').value = '';
  document.getElementById('input-end').value = '';
  document.getElementById('input-ata').value = '';
  document.getElementById('input-start').value = getCurrentTimeStr();
  document.getElementById('selected-activity').innerHTML = `Välj aktivitet <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`;
  currentActivity = "";
  setJobType('nya');
  updateLiveHours();
  renderOutbox();
  renderQuickChips();
}

function deleteDraft(id) {
  drafts = drafts.filter(draft => draft.id !== id);
  saveDrafts();
  renderOutbox();
  renderQuickChips();
}

function renderOutbox() {
  const container = document.getElementById('outbox-container');
  const section = document.getElementById('outbox-section');
  const title = document.getElementById('outbox-title');
  container.innerHTML = '';
  
  if (drafts.length === 0 && plannedJobs.length === 0) {
    section.style.display = 'none';
    return;
  }
  
  section.style.display = 'block';
  let totalHours = 0;
  drafts.forEach(d => { if (d.start && d.end) totalHours += calculateHours(d.start, d.end); });
  title.innerText = `Dagens pass (${drafts.length} st · ${totalHours.toFixed(1)} h)`;

  // Planerade jobb (matchar på unikt kalender-ID)
  plannedJobs.forEach(job => {
    if (drafts.some(d => d.calendarJobId === job.id)) return;

    const card = document.createElement('div');
    card.className = 'draft-card';
    const iconSvg = getActivityIcon(job.title);
    
    card.innerHTML = `
      <div class="card-body">
        <div class="card-title">
          <span style="display:inline-flex; align-items:center; color:var(--blue); margin-right:12px; flex-shrink:0;">${iconSvg}</span>
          <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${job.title}</span>
        </div>
        <div class="card-meta">
          <span>📅 Planerat</span><span class="dot">•</span>
          <span style="color:#FFF;">${job.place}</span>
        </div>
        ${job.description ? `<div class="card-note">${job.description}</div>` : ''}
      </div>
      <div class="card-actions">
        <button class="btn-action clock-in" onclick="clockInPlannedJob('${job.id}')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
          Stämpla in
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  // Sparade pass i utkorgen
  drafts.forEach(draft => {
    const card = document.createElement('div');
    card.className = 'draft-card';
    const iconSvg = getActivityIcon(draft.activity);
    const isOngoing = !draft.end;
    const timeDisplay = isOngoing ? `<span class="ongoing-pulse">Pågår</span>` : `${draft.start} – ${draft.end}`;
    const hoursDisplay = isOngoing ? '' : `${calculateHours(draft.start, draft.end).toFixed(1)} h`;
    const ataBadge = draft.type === 'ata' ? `<span class="badge-ata">${draft.ataNumber ? draft.ataNumber : 'ÄTA'}</span>` : '';

    let actionButtons = '';
    if (isOngoing) {
      actionButtons = `
        <button class="btn-action clock-out" onclick="clockOut(${draft.id})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
          Stämpla ut nu
        </button>
        <button class="btn-action delete" onclick="deleteDraft(${draft.id})" style="flex:0 0 50px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>`;
    } else {
      actionButtons = `
        <button class="btn-action split-pass" onclick="createSplitPass(${draft.id})">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg> Nytt pass
        </button>
        <button class="btn-action delete" onclick="deleteDraft(${draft.id})">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg> Radera
        </button>`;
    }

    card.innerHTML = `
      <div class="card-body">
        <div class="card-title">
          <span style="display:inline-flex; align-items:center; color:var(--accent); margin-right:12px; flex-shrink:0;">${iconSvg}</span>
          ${ataBadge}
          <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${draft.activity}</span>
        </div>
        <div class="card-meta">
          <span>${draft.date}</span><span class="dot">•</span>
          <span>${timeDisplay}</span><span class="dot">•</span>
          <span style="color:#FFF; font-weight:500;">${hoursDisplay}</span>
        </div>
        ${draft.notes ? `<div class="card-note">${draft.notes}</div>` : ''}
      </div>
      <div class="card-actions">${actionButtons}</div>
    `;
    container.appendChild(card);
  });
}

// Skicka in batch
async function submitAll() {
  if (drafts.length === 0) return;
  const btn = document.querySelector('.submit-pill-btn');
  btn.innerHTML = `Skickar...`;
  btn.disabled = true;

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'batchReports', pass: drafts })
    });
    const result = await res.json();
    if (result && result.status === "success") {
      alert(`Klart! ${result.count} pass sparade i kalkylarket.`);
      drafts = [];
      saveDrafts();
      renderOutbox();
      renderQuickChips();
    } else {
      alert("Fel vid inskick: " + (result.message || "Okänt fel"));
    }
  } catch (err) {
    alert("Kunde inte nå kalkylarket. Passen ligger kvar säkert i telefonen!");
  } finally {
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFF" stroke-width="2.5"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg> Skicka in`;
    btn.disabled = false;
  }
}
