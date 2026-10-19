// Registrera Service Worker för offline-drift
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('SW aktiv:', reg.scope))
      .catch((err) => console.error('Kunde inte starta SW:', err));
  });
}

let drafts = JSON.parse(localStorage.getItem('tidrapport_drafts')) || [];
let currentActivity = "";

// Ikon-bibliotek med fasta mått (20x20)
function getActivityIcon(name) {
  switch (name) {
    case 'Kyl- & frysflytt':
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="19" r="2"/><path d="M5 17L8 4m-2-1h3M7 19h13"/><rect x="9.5" y="4" width="10.5" height="13" rx="1.5"/><path d="M14.5 4v10M13.5 7v4m2.5-4v4M11.5 15.5h6.5"/><path d="M21 2v3m-1.5-1.5h3" stroke-width="1.2"/></svg>`;
    case 'Snöröjning':
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 4v4m-2-2h4m-3.5-1.5l3 3m-3 0l3-3"/><path d="M12 16v-6h-4l-2-4h-4v10"/><circle cx="5" cy="16" r="2"/><circle cx="12" cy="16" r="2"/><path d="M16 19l2-8" stroke-width="2"/><path d="M17 17h4"/></svg>`;
    case 'Linjemålning':
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6l3 5v4"/><rect x="7" y="11" width="6" height="4" rx="1"/><circle cx="8" cy="17" r="2"/><circle cx="15" cy="17" r="1.5"/><path d="M13 13h5M17 13v4M21 20H15M11 20H5" stroke-width="2"/></svg>`;
    case 'Fasadmålning':
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-7 9 7v10H3z"/><path d="M9 20v-6h6v6"/><rect x="7" y="6" width="6" height="2.5" rx="1"/><path d="M10 8.5v3"/></svg>`;
    case 'Stalltvätt':
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20c-1-1-1-3 0-4l3-3 4 4-3 3c-1 1-3 1-4 0z"/><path d="M10 14l5-5M14 8l2 2M17 7l4-4M19 9l3-2M15 5l2-3"/><path d="M21 14l-1 2-2 1 2 1 1 2 1-2 2-1-2-1-1-2z" stroke-width="1"/></svg>`;
    case 'Bandgrävare':
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="15" width="13" height="5" rx="2.5"/><circle cx="5.5" cy="17.5" r="1"/><circle cx="9.5" cy="17.5" r="1"/><circle cx="13.5" cy="17.5" r="1"/><path d="M5 15v-5a2 2 0 0 1 2-2h4v7M9 11l4-5 6 4-2 4M17 14h4l1-3-3-2"/></svg>`;
    default:
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  }
}

// Action Sheet-styrning
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
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  `;
  closeSheet();
}

// Starta och initiera datum
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  document.getElementById('input-date').value = localDate;
  
  updateLiveHours();
  renderOutbox();
});

// Tidsberäkning
function calculateHours(start, end) {
  if (!start || !end) return 0;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  let diff = (endH + endM / 60) - (startH + startM / 60);
  if (diff < 0) diff += 24;
  return diff;
}

// Live-indikator på tider under inmatning
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

// Stämpla ut pågående pass
function clockOut(id) {
  const nu = new Date();
  const timeString = nu.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

  const draftIndex = drafts.findIndex(d => d.id === id);
  if (draftIndex !== -1) {
    drafts[draftIndex].end = timeString;
    localStorage.setItem('tidrapport_drafts', JSON.stringify(drafts));
    renderOutbox();
  }
}

// Spara till Utkorg
function saveToOutbox() {
  const date = document.getElementById('input-date').value;
  const place = document.getElementById('input-place').value;
  const notes = document.getElementById('input-notes').value;
  const start = document.getElementById('input-start').value;
  const end = document.getElementById('input-end').value;

  if (!place || !start) {
    alert("Fyll i Betalställe och Starttid!");
    return;
  }

  const draft = {
    id: Date.now(),
    date: date,
    place: place,
    activity: currentActivity || "Övrigt",
    notes: notes,
    start: start,
    end: end // Kan vara tom = Pågående pass!
  };

  drafts.push(draft);
  localStorage.setItem('tidrapport_drafts', JSON.stringify(drafts));

  // Töm formuläret
  document.getElementById('input-place').value = '';
  document.getElementById('input-notes').value = '';
  document.getElementById('input-end').value = '';
  document.getElementById('selected-activity').innerHTML = `
    Välj aktivitet
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  `;
  currentActivity = "";
  updateLiveHours();

  renderOutbox();
}

function deleteDraft(id) {
  drafts = drafts.filter(draft => draft.id !== id);
  localStorage.setItem('tidrapport_drafts', JSON.stringify(drafts));
  renderOutbox();
}

// Rita upp karusellen
function renderOutbox() {
  const container = document.getElementById('outbox-container');
  const section = document.getElementById('outbox-section');
  const title = document.getElementById('outbox-title');

  container.innerHTML = '';

  if (drafts.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  let totalHours = 0;
  drafts.forEach(d => {
    if (d.start && d.end) {
      totalHours += calculateHours(d.start, d.end);
    }
  });

  title.innerText = `Dagens pass (${drafts.length} st · ${totalHours.toFixed(1)} h)`;

  drafts.forEach(draft => {
    const card = document.createElement('div');
    card.className = 'draft-card';
    const iconSvg = getActivityIcon(draft.activity);

    const isOngoing = !draft.end;
    const timeDisplay = isOngoing ? `<span class="ongoing-pulse">Pågår</span>` : `${draft.start} – ${draft.end}`;
    const hoursDisplay = isOngoing ? `-` : `${calculateHours(draft.start, draft.end).toFixed(1)} h`;

    let actionButtons = '';
    if (isOngoing) {
      actionButtons = `
        <button class="btn-action clock-out" onclick="clockOut(${draft.id})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          Stämpla ut nu
        </button>
        <button class="btn-action delete" onclick="deleteDraft(${draft.id})" style="flex:0 0 45px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
        </button>
      `;
    } else {
      actionButtons = `
        <button class="btn-action">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          Ändra
        </button>
        <button class="btn-action delete" onclick="deleteDraft(${draft.id})">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
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
          <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:110px;">${draft.place}</span>
          <span class="dot">•</span>
          <span style="font-weight:400; color:#A1A1A6; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${draft.activity}</span>
        </div>
        <div class="card-meta">
          <span>${draft.date}</span>
          <span class="dot">•</span>
          <span>${timeDisplay}</span>
          <span class="dot">•</span>
          <span style="color:#FFF; font-weight:500;">${hoursDisplay}</span>
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

function submitAll() {
  alert("Nu skickas " + drafts.length + " pass in till kalkylarket!");
}
