// Registrera Service Worker för offline-drift
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('SW redo för offline-drift:', reg.scope))
      .catch((err) => console.error('Kunde inte starta SW:', err));
  });
}

let drafts = JSON.parse(localStorage.getItem('tidrapport_drafts')) || [];

// Action Sheet-logik
function openSheet() {
    document.getElementById('sheetBackdrop').classList.add('active');
}

function closeSheet(e) {
    document.getElementById('sheetBackdrop').classList.remove('active');
}

// Nya variabler för att hålla koll på både namn och ikon
let currentActivity = "";
let currentIcon = "";

// Uppdaterad funktion som tar emot både namnet och SVG-ikonen från Action Sheet
function selectActivity(name, element) {
    currentActivity = name;
    // Hämta SVG-koden från det klickade elementet
    currentIcon = element.querySelector('svg').outerHTML;
    
    // Uppdaterar raden i gränssnittet
    document.getElementById('selected-activity').innerHTML = `
        ${name}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
    `;
    closeSheet();
}

// Ladda om och sätt datum vid start
document.addEventListener('DOMContentLoaded', () => {
    // Sätt dagens datum snyggt i fältet (utan tidszon-konstigheter)
    const now = new Date();
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    document.getElementById('input-date').value = localDate;
    
    renderOutbox();
});

// Spara till Utkorg
function saveToOutbox() {
    const date = document.getElementById('input-date').value;
    const place = document.getElementById('input-place').value;
    const notes = document.getElementById('input-notes').value;
    const start = document.getElementById('input-start').value;
    const end = document.getElementById('input-end').value;

    if (!place || !start || !end) {
        alert("Fyll i Betalställe, Start och Slut!");
        return;
    }

    // Vi sätter en standard-ikon om föraren glömt välja aktivitet
    const defaultIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

    const draft = {
        id: Date.now(),
        date: date,
        place: place,
        activity: currentActivity || "Övrigt",
        icon: currentIcon || defaultIcon, // Sparar ikonen!
        notes: notes,
        start: start,
        end: end
    };

    drafts.push(draft);
    localStorage.setItem('tidrapport_drafts', JSON.stringify(drafts));

    // Rensa efter sparning
    document.getElementById('input-place').value = '';
    document.getElementById('input-notes').value = '';
    document.getElementById('selected-activity').innerHTML = `
        Välj aktivitet
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
    `;
    currentActivity = "";
    currentIcon = "";

    renderOutbox();
}

// Radera från Utkorg
function deleteDraft(id) {
    drafts = drafts.filter(draft => draft.id !== id);
    localStorage.setItem('tidrapport_drafts', JSON.stringify(drafts));
    renderOutbox();
}

// Räkna ut tidsskillnad i timmar
function calculateHours(start, end) {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let diff = (endH + endM / 60) - (startH + startM / 60);
    // Hantera nattpass
    if (diff < 0) diff += 24; 
    return diff;
}

// Rita upp utkorgen
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
    
    // Räkna ihop totala timmar
    let totalHours = 0;
    drafts.forEach(d => {
        totalHours += calculateHours(d.start, d.end);
    });
    
    // Uppdatera rubriken med pass OCH timmar
    title.innerText = `Dagens Utkorg (${drafts.length} pass · ${totalHours.toFixed(1)} h)`;

    drafts.forEach(draft => {
        const card = document.createElement('div');
        card.className = 'draft-card';
        card.innerHTML = `
            <div class="card-body">
                <div class="card-title">
                    <!-- HÄR RITAS IKONEN UT -->
                    <div style="width: 20px; height: 20px; color: var(--accent); margin-right: 4px; display: flex; align-items: center;">
                        ${draft.icon}
                    </div>
                    <span>${draft.place}</span>
                    <span class="dot">•</span>
                    <span style="font-weight:400; color:#A1A1A6;">${draft.activity}</span>
                </div>
                <div class="card-meta">
                    <span>${draft.date}</span>
                    <span class="dot">•</span>
                    <span>${draft.start} – ${draft.end}</span>
                    <span class="dot">•</span>
                    <span style="color:#FFF; font-weight:500;">${calculateHours(draft.start, draft.end).toFixed(1)} h</span>
                </div>
                ${draft.notes ? `<div class="card-note">${draft.notes}</div>` : ''}
            </div>
            <div class="card-actions">
                <button class="btn-action">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    Ändra
                </button>
                <button class="btn-action delete" onclick="deleteDraft(${draft.id})">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    Radera
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function submitAll() {
    alert("Nu skickas " + drafts.length + " pass in till kalkylarket!");
}
