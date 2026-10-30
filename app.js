window.applyUEConstraints = window.applyUEConstraints || function(){};
var applyUEConstraints = window.applyUEConstraints;



// Registrera Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('SW aktiv:', reg.scope))
      .catch((err) => console.error('Kunde inte starta SW:', err));
  });
}

// FORDONSPARK & UTRUSTNING (v3.5 Postis Per 3D-Glas)
const VEHICLE_PARK = [
  { id: 'v1', name: 'Kramer Hjullastare (Svart huv)', icon: '🚜', color: '#1e293b' },
  { id: 'v2', name: 'Multiloader LT 30 (Gul)', icon: '🟡', color: '#eab308' },
  { id: 'v3', name: 'John Deere 3520 (Grön)', icon: '🚜', color: '#15803d' },
  { id: 'v4', name: 'Ford Transit (Silver/Grå + Blinkljus)', icon: '🚐', color: '#64748b' },
  { id: 'v5', name: 'Ford Transit (Vit + Blinkramp)', icon: '🚐', color: '#f8fafc' },
  { id: 'v6', name: 'VW Transporter m. Flak (Vit)', icon: '🛻', color: '#ffffff' },
  { id: 'v7', name: 'VW Transporter m. Bakgavellyft (Blå/Rost)', icon: '🚚', color: '#2563eb' },
  { id: 'v8', name: 'Släpkärra #1 (Gallergrind)', icon: '🛒', color: '#94a3b8' },
  { id: 'v9', name: 'Släpkärra #2 (Gallergrind)', icon: '🛒', color: '#94a3b8' },
  { id: 'v10', name: 'Kärra m. Byggställning', icon: '🏗️', color: '#0284c7' }
];

function selectVehicle(id) {
  const v = VEHICLE_PARK.find(item => item.id === id);
  if (v) {
    localStorage.setItem('lpv_active_vehicle', JSON.stringify(v));
    const titleEl = document.getElementById('welcome-title');
    if (titleEl) titleEl.innerText = v.name;
  }
}

window.selectVehicle = selectVehicle;

function openKabanossModal() {
  const modal = document.getElementById('kabanossModal');
  if (modal) modal.classList.add('active');
}

function closeKabanossModal() {
  const modal = document.getElementById('kabanossModal');
  if (modal) modal.classList.remove('active');
}

function openKabanossModalWithTab(tab) {
  openKabanossModal();
  switchAdminTab(tab);
}

function switchAdminTab(tab) {
  const views = ['kabanoss', 'radar', 'crm', 'offert'];
  views.forEach(v => {
    const el = document.getElementById(v + '-view');
    if (el) el.style.display = (v === tab) ? (v === 'kabanoss' ? 'grid' : 'block') : 'none';
  });
}

window.openKabanossModal = openKabanossModal;
window.closeKabanossModal = closeKabanossModal;
window.openKabanossModalWithTab = openKabanossModalWithTab;
window.switchAdminTab = switchAdminTab;

// ==========================================
// DARK MODE / TEMA-HANTÉRING (v3.8)
// ==========================================
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('lpv_theme', isDark ? 'dark' : 'light');
  updateThemeIcon(isDark);
}

function initTheme() {
  const savedTheme = localStorage.getItem('lpv_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.body.classList.add('dark-mode');
    updateThemeIcon(true);
  } else {
    document.body.classList.remove('dark-mode');
    updateThemeIcon(false);
  }
}

function updateThemeIcon(isDark) {
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.innerText = isDark ? '☀️' : '🌙';
}

document.addEventListener('DOMContentLoaded', initTheme);
window.toggleDarkMode = toggleDarkMode;

// ==========================================
// DARK MODE / TEMA-HANTÉRING (v3.8)
// ==========================================
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('lpv_theme', isDark ? 'dark' : 'light');
  updateThemeIcon(isDark);
}

function initTheme() {
  const savedTheme = localStorage.getItem('lpv_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.body.classList.add('dark-mode');
    updateThemeIcon(true);
  } else {
    document.body.classList.remove('dark-mode');
    updateThemeIcon(false);
  }
}

function updateThemeIcon(isDark) {
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.innerText = isDark ? '☀️' : '🌙';
}

document.addEventListener('DOMContentLoaded', initTheme);
window.toggleDarkMode = toggleDarkMode;

// AVATAR DIRECT TRIGGER (v3.9.1)
function triggerAvatarUpload() {
  if (typeof window.openPostmanPatModal === 'function') {
    window.openPostmanPatModal();
  } else if (typeof openPostmanPatModal === 'function') {
    openPostmanPatModal();
  } else {
    const input = document.getElementById('avatar-upload');
    if (input) input.click();
  }
}

function processAvatarUpload(event) {
  const file = event.target && event.target.files ? event.target.files[0] : null;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');

      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 400, 400);
      const base64Avatar = canvas.toDataURL('image/jpeg', 0.85);

      const avatarImg = document.getElementById('user-avatar-img');
      if (avatarImg) avatarImg.src = base64Avatar;

      localStorage.setItem('lpv_user_avatar', base64Avatar);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

window.triggerAvatarUpload = triggerAvatarUpload;
window.processAvatarUpload = processAvatarUpload;

// ALIAS FÖR AVATAR-KLICK (v4.1)
function openAvatarModal() {
  const input = document.getElementById('avatar-upload');
  if (input) {
    input.click();
  } else if (typeof triggerAvatarUpload === 'function') {
    triggerAvatarUpload();
  }
}

window.openAvatarModal = openAvatarModal;

// SWITCH TAB MED PROGRAMGOLVS-SUPPORT (v4.2)
function switchAdminTab(tab) {
  const views = ['kabanoss', 'radar', 'crm', 'offert'];
  views.forEach(v => {
    const el = document.getElementById(v + '-view');
    if (el) {
      if (v === tab) {
        el.style.display = (v === 'kabanoss') ? 'grid' : 'block';
        el.classList.add('view-container');
      } else {
        el.style.display = 'none';
      }
    }
  });
}

window.switchAdminTab = switchAdminTab;

// ==========================================
// USER PILL CLICK FIX (v4.3.1)
// ==========================================
function handleUserPillClick() {
  const currentUser = localStorage.getItem('lpv_user_name') || 'Daniel';
  const newUser = prompt('Ändra inloggad användare / profil:', currentUser);
  
  if (newUser && newUser.trim() !== '') {
    localStorage.setItem('lpv_user_name', newUser.trim());
    location.reload();
  }
}

window.handleUserPillClick = handleUserPillClick;

// ==========================================
// FULL VYY-RENDERING OCH RESURSER (v4.4)
// ==========================================

function switchAdminTab(tab) {
  const views = ['kabanoss', 'radar', 'crm', 'offert'];
  views.forEach(v => {
    const el = document.getElementById(v + '-view');
    if (el) {
      if (v === tab) {
        el.style.display = 'block';
        el.classList.add('view-container');
      } else {
        el.style.display = 'none';
      }
    }
  });

  if (tab === 'kabanoss') renderKabanossBoard();
  if (tab === 'radar') renderRadarGantt();
  if (tab === 'crm') renderCRMView();
  if (tab === 'offert') renderOffertView();
}

// 1. KABANOSS MED FALLBACK-RESURSER
async function renderKabanossBoard() {
  const cols = document.querySelectorAll('.kabanoss-column');
  if (cols.length === 0) return;

  const sampleJobs = [
    { id: 'j101', title: 'Coop Kylflytt', time: 'Mån 08:00', vehicle: 'Kramer Hjullastare (Svart huv)', driver: 'Daniel', status: 'planned' },
    { id: 'j102', title: 'Snöröjning Blacksta', time: 'Tis 04:00', vehicle: 'John Deere 3520 (Grön)', driver: 'UE Johanssons', status: 'planned' },
    { id: 'j103', title: 'Byggställning ICA', time: 'Ons 07:00', vehicle: 'Kärra m. Byggställning', driver: 'Personal', status: 'opportunity' },
    { id: 'j104', title: 'Handskottning & Sandning', time: 'Tor 06:00', vehicle: 'Ford Transit Flak (Silver)', driver: 'Mikael', status: 'in_progress' }
  ];

  cols.forEach(col => col.innerHTML = '');

  sampleJobs.forEach(job => {
    const card = document.createElement('div');
    card.className = 'kabanoss-card';
    card.dataset.id = job.id;
    card.dataset.status = job.status;
    card.style.cssText = 'padding: 14px; margin-bottom: 12px; border-radius: 14px; cursor: grab;';
    
    
    card.innerHTML = `
      <div style="font-weight:800; font-size:15px; color:var(--text-main);">${job.title}</div>
      <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">⏱️ ${job.time}</div>
      <div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:4px;">
        <span class="glass-bubble" style="font-size:11px; padding:4px 8px; margin:0;">🚜 ${job.vehicle}</span>
        <span class="glass-bubble" style="font-size:11px; padding:4px 8px; margin:0;">👤 ${job.driver}</span>
      </div>
    `;


    const targetCol = document.querySelector(`.kabanoss-column[data-status="${job.status}"]`) || document.getElementById('col-planned');
    if (targetCol) targetCol.appendChild(card);
  });

  if (typeof initKabanossDrag === 'function') initKabanossDrag();
}

// 2. FRAMTIDSRADARN (GANTT)
function renderRadarGantt() {
  const container = document.getElementById('radar-view');
  if (!container) return;

  container.innerHTML = `
    <h2 style="margin:0 0 12px 0; font-size:18px; color:var(--text-main);">🔭 Framtidsradarn (7-Dagars Resursöversikt)</h2>
    <div class="gantt-grid">
      <div style="display:grid; grid-template-columns: 180px repeat(7, 1fr); gap:8px; font-weight:700; font-size:12px; margin-bottom:12px; border-bottom:1px solid var(--glass-border); padding-bottom:8px;">
        <div>Resurs / Maskin</div>
        <div>Mån</div><div>Tis</div><div>Ons</div><div>Tor</div><div>Fre</div><div>Lör</div><div>Sön</div>
      </div>
      <div style="display:grid; grid-template-columns: 180px repeat(7, 1fr); gap:8px; font-size:12px; align-items:center; margin-bottom:8px;">
        <div>🚜 Kramer (Svart huv)</div>
        <div style="background:#0284c7; color:#fff; padding:4px; border-radius:6px; text-align:center;">Coop</div>
        <div>-</div>
        <div style="background:#0284c7; color:#fff; padding:4px; border-radius:6px; text-align:center;">ICA</div>
        <div>-</div><div>-</div><div>-</div><div>-</div>
      </div>
      <div style="display:grid; grid-template-columns: 180px repeat(7, 1fr); gap:8px; font-size:12px; align-items:center; margin-bottom:8px;">
        <div>🚜 John Deere 3520</div>
        <div>-</div>
        <div style="background:#10b981; color:#fff; padding:4px; border-radius:6px; text-align:center;">Blacksta</div>
        <div>-</div>
        <div style="background:#10b981; color:#fff; padding:4px; border-radius:6px; text-align:center;">Handskottning</div>
        <div>-</div><div>-</div><div>-</div>
      </div>
      <div style="display:grid; grid-template-columns: 180px repeat(7, 1fr); gap:8px; font-size:12px; align-items:center;">
        <div>🚚 Ford Transit Flak</div>
        <div style="background:#f59e0b; color:#fff; padding:4px; border-radius:6px; text-align:center;">Byggställn.</div>
        <div>-</div><div>-</div><div>-</div><div>-</div><div>-</div><div>-</div>
      </div>
    </div>
  `;
}


// 3. CRM & KUNDBILD (MED KARTNÅL OCH AUTO-LOGGA)
function renderCRMView() {
  const container = document.getElementById('crm-view');
  if (!container) return;

  const customers = [
    { name: 'Coop Fastigheter AB', id: 'K-1001', address: 'Storgatan 12, Katrineholm', email: 'info@coop.se', activeJob: 'Kylflytt & Snöröjning', offertData: 'Underlag: Snöröjning (450 m²)' },
    { name: 'Blacksta Vägförening', id: 'K-1002', address: 'Blacksta Väg 4, Katrineholm', email: 'kontakt@blacksta.se', activeJob: 'Snöröjning & Handskottning', offertData: 'Inget aktivt offertunderlag' },
    { name: 'ICA Supermarket', id: 'K-1003', address: 'Torget 1, Katrineholm', email: 'info@ica.se', activeJob: 'Byggställning & Underhåll', offertData: 'Skickad Offert: Byggställning - VÄNTAR' }
  ];

  let html = `<h2 style="margin:0 0 12px 0; font-size:18px; color:var(--text-main);">💼 360° Kundbild & CRM</h2>`;
  customers.forEach(c => {
    const domain = c.email.split('@')[1];
    const logoUrl = `https://logo.clearbit.com/${domain}`;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`;
    
    html += `
      <div class="crm-card" style="background:var(--input-bg); border-radius:14px; padding:16px; margin-top:12px; color:var(--text-main);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="display:flex; gap:12px; align-items:center;">
            <img src="${logoUrl}" onerror="this.outerHTML='<div class=\'glass-bubble\' style=\'margin:0;\'>🏢</div>'" style="width:40px; height:40px; border-radius:10px; object-fit:contain; background:#fff; padding:2px; border:1px solid var(--glass-border);">
            <div>
              <div style="font-weight:800; font-size:16px;">${c.name} <small style="color:var(--text-muted);">(${c.id})</small></div>
              <div style="font-size:13px; color:var(--text-muted); margin-top:2px;">📍 ${c.address}</div>
            </div>
          </div>
          <a href="${mapsUrl}" target="_blank" style="background:#0284c7; color:#fff; text-decoration:none; padding:8px 14px; border-radius:10px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
            📍 Kartnål
          </a>
        </div>
        <div style="margin-top:12px; font-size:12px; background:rgba(0,0,0,0.05); padding:10px; border-radius:8px;">
          <strong>Aktivt uppdrag:</strong> ${c.activeJob}<br>
          <strong style="color:#0284c7; display:inline-block; margin-top:4px;">📄 Offertstatus:</strong> ${c.offertData}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}


// 4. SMART OFFERTMOTOR (HYBRID ROT/RUT)
function renderOffertView() {
  const container = document.getElementById('offert-view');
  if (!container) return;

  container.innerHTML = `
    <h2 style="margin:0 0 12px 0; font-size:18px; color:var(--text-main);">📄 Smart Offertmotor (ROT/RUT & Restid)</h2>
    <div class="offert-box">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:12px;">
        <div>
          <label style="display:block; font-size:12px; font-weight:700; margin-bottom:4px;">Arbetstimmar (h):</label>
          <input type="number" id="offert-hours" value="8" oninput="calcOffert()" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--glass-border); background:var(--card-bg); color:var(--text-main);">
        </div>
        <div>
          <label style="display:block; font-size:12px; font-weight:700; margin-bottom:4px;">Körtid Garaget T/R (min):</label>
          <input type="number" id="offert-travel" value="30" oninput="calcOffert()" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--glass-border); background:var(--card-bg); color:var(--text-main);">
        </div>
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block; font-size:12px; font-weight:700; margin-bottom:4px;">Skatteavdrag:</label>
        <select id="offert-deduction" onchange="calcOffert()" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--glass-border); background:var(--card-bg); color:var(--text-main);">
          <option value="none">Inget avdrag</option>
          <option value="rot">ROT (30% på arbete)</option>
          <option value="rut">RUT (50% på arbete)</option>
        </select>
      </div>
      <div id="offert-result" style="background:#0284c7; color:#fff; padding:14px; border-radius:10px; font-weight:800; text-align:center; font-size:16px; margin-top:12px;">
        Totalt kund att betala: 5 150 kr (inkl. moms)
      </div>
    </div>
  `;
}

function calcOffert() {
  const h = parseFloat(document.getElementById('offert-hours')?.value || 0);
  const t = parseFloat(document.getElementById('offert-travel')?.value || 0);
  const ded = document.getElementById('offert-deduction')?.value || 'none';

  const hourlyRate = 650;
  const travelRate = 450;

  let workCost = h * hourlyRate;
  let travelCost = (t / 60) * travelRate;

  let discount = 0;
  if (ded === 'rot') discount = workCost * 0.30;
  if (ded === 'rut') discount = workCost * 0.50;

  let total = (workCost - discount) + travelCost;
  const res = document.getElementById('offert-result');
  if (res) {
    res.innerText = `Totalt kund att betala: ${Math.round(total * 1.25).toLocaleString('sv-SE')} kr (exkl. ev. milersättning, inkl. moms)`;
  }
}

window.switchAdminTab = switchAdminTab;
window.calcOffert = calcOffert;

// ==========================================
// iMESSAGE & KUNDPORTAL LOGIK (v4.5)
// ==========================================

function checkCustomerUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const ataId = urlParams.get('ata');
  const offertId = urlParams.get('offert');

  if (ataId) {
    renderPublicCustomerView('ata', ataId);
  } else if (offertId) {
    renderPublicCustomerView('offert', offertId);
  }
}

function sendAtaViaIMessage(ataId, phone, title) {
  const customerPhone = phone || prompt("Ange kundens mobilnummer:", "0701234567");
  if (!customerPhone) return;
  const baseUrl = window.location.origin + window.location.pathname;
  const link = `${baseUrl}?ata=${ataId}`;
  const text = `Hej! Ett tilläggsarbete (${ataId}) har registrerats för ${title || 'ert projekt'}. Klicka på länken för att se foton och godkänna: ${link}`;
  window.open(`sms:${customerPhone}?&body=${encodeURIComponent(text)}`, '_self');
}

function sendOffertViaIMessage(offertId, phone, title, total) {
  const customerPhone = phone || prompt("Ange kundens mobilnummer:", "0701234567");
  if (!customerPhone) return;
  const baseUrl = window.location.origin + window.location.pathname;
  const link = `${baseUrl}?offert=${offertId}`;
  const text = `Hej! Här kommer er offert (${offertId}) på ${total || 'överenskommet arbete'} för ${title || 'ert projekt'}. Klicka för att granska och godkänna: ${link}`;
  window.open(`sms:${customerPhone}?&body=${encodeURIComponent(text)}`, '_self');
}

function renderPublicCustomerView(type, id) {
  document.body.innerHTML = `
    <div style="max-width:500px; margin:30px auto; padding:24px; font-family:sans-serif; background:#ffffff; border-radius:20px; box-shadow:0 10px 30px rgba(0,0,0,0.15); color:#0f172a;">
      <div style="text-align:center; margin-bottom:20px;">
        <h1 style="font-size:22px; margin:0; color:#0284c7;">LPV & Klaryta</h1>
        <p style="font-size:13px; color:#64748b; margin-top:4px;">Digitalt godkännande av ${type === 'ata' ? 'Tilläggsarbete (ÄTA)' : 'Offert'}</p>
      </div>
      <div style="background:#f1f5f9; padding:16px; border-radius:12px; margin-bottom:20px;">
        <div style="font-weight:800; font-size:16px;">${type.toUpperCase()}-${id}</div>
        <p style="font-size:14px; color:#334155; margin-top:8px;">
          ${type === 'ata' ? 'Snöröjning & Handskottning av tillkommande yta bakom kylanläggning.' : 'Bortforsling av kylaggregat samt 8 timmar maskinarbete m. Kramer.'}
        </p>
        <div style="font-size:18px; font-weight:800; color:#0284c7; margin-top:12px;">
          ${type === 'ata' ? 'Totalt: 2 450 kr (exkl. moms)' : 'Totalt: 6 438 kr (inkl. moms & ROT/RUT)'}
        </div>
      </div>
      <button onclick="approveCustomerDocument('${type}', '${id}')" style="width:100%; padding:16px; background:#10b981; color:#ffffff; font-size:16px; font-weight:800; border:none; border-radius:12px; cursor:pointer;">
        ✅ Godkänn & Signera ${type.toUpperCase()}
      </button>
      <div id="approval-status" style="margin-top:14px; text-align:center; font-weight:700;"></div>
    </div>
  `;
}

async function approveCustomerDocument(type, id) {
  const statusDiv = document.getElementById('approval-status');
  if (statusDiv) statusDiv.innerHTML = "Sparar godkännande... ⏳";

  try {
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: JSON.stringify({
        token: CONFIG.API_TOKEN,
        action: type === 'ata' ? 'approveAta' : 'approveOffert',
        documentId: id,
        ataId: type === 'ata' ? id : undefined,
        offertId: type === 'offert' ? id : undefined
      })
    });
    const result = await response.json();
    if (!result.success && result.status !== 'success') throw new Error(result.message || 'Okänt svar');
    if (statusDiv) statusDiv.innerHTML = "<span style='color:#10b981;'>🎉 Tack! Dokumentet är nu godkänt och signerat.</span>";
  } catch (err) {
    if (statusDiv) statusDiv.innerHTML = "<span style='color:#ef4444;'>❌ Kunde inte spara. Försök igen.</span>";
  }
}

document.addEventListener('DOMContentLoaded', checkCustomerUrlParams);
window.sendAtaViaIMessage = sendAtaViaIMessage;
window.sendOffertViaIMessage = sendOffertViaIMessage;
window.approveCustomerDocument = approveCustomerDocument;

// Lås maskinparken för UE (Inga tunga LPV-maskiner, och inga Admin-bubblor)
window.originalApplyUE = window.applyUEConstraints;
window.applyUEConstraints = function() {
  if (typeof window.originalApplyUE === 'function') window.originalApplyUE();
  const isUE = window.isUserUE;
  
  const bubbles = document.querySelectorAll('#vehicle-bubbles-container .glass-bubble');
  bubbles.forEach(bubble => {
    const text = bubble.innerText.toUpperCase();
    const isInternal = text.includes('KRAMER') || text.includes('JOHN DEERE') || text.includes('TRANSIT');
    if (isUE && isInternal) {
      bubble.style.display = 'none'; // Göm LPV-maskiner för UE
    } else {
      bubble.style.display = 'inline-flex';
    }
  });

  const addBtn = document.querySelector('.add-bubble-btn');
  if (addBtn) {
    addBtn.style.display = isUE ? 'none' : 'inline-flex';
  }
};
applyUEConstraints = window.applyUEConstraints;
document.addEventListener('DOMContentLoaded', window.applyUEConstraints);

// ==========================================
// DYNAMISK VERSIONSMÄRKNING (v4.7.1)
// ==========================================
const CURRENT_APP_VERSION = 'DEV v4.7.1';

function updateVersionBadge() {
  const badge = document.getElementById('app-version-tag');
  if (badge) {
    badge.innerText = CURRENT_APP_VERSION;
  }
}

document.addEventListener('DOMContentLoaded', updateVersionBadge);
window.updateVersionBadge = updateVersionBadge;

// ==========================================
// OFFERTBESÖK & DYNAMISKA MALLAR (ÅTERSTÄLLDA)
// ==========================================
function handleActivityChange() {
  const activitySelect = document.getElementById('activity-select');
  if (!activitySelect) return;
  const activity = activitySelect.value;
  let templateContainer = document.getElementById('offert-template-container');
  
  if (!templateContainer) {
    templateContainer = document.createElement('div');
    templateContainer.id = 'offert-template-container';
    activitySelect.parentNode.insertBefore(templateContainer, activitySelect.nextSibling);
  }
  
  if (activity === 'offertbesok') {
    templateContainer.style.display = 'block';
    templateContainer.innerHTML = `
      <div style="background:var(--input-bg); padding:16px; border-radius:12px; margin-top:12px; border:1px solid var(--glass-border);">
        <label style="font-weight:800; font-size:13px; color:var(--text-main);">Välj typ av Offertbesök:</label>
        <select id="offert-type" onchange="renderOffertTemplate()" style="width:100%; padding:12px; border-radius:8px; margin-top:6px; background:var(--card-bg); color:var(--text-main); border:1px solid var(--glass-border);">
          <option value="">-- Välj mall --</option>
          <option value="sno">❄️ Snöröjning & Halkbekämpning</option>
          <option value="bygg">🏗️ Byggställning</option>
          <option value="mark">🚧 Markarbete / Sopning</option>
        </select>
        <div id="dynamic-template-content" style="margin-top:12px;"></div>
      </div>
    `;
  } else {
    templateContainer.style.display = 'none';
  }
}

function renderOffertTemplate() {
  const type = document.getElementById('offert-type')?.value;
  const content = document.getElementById('dynamic-template-content');
  if (!content) return;
  
  if (type === 'sno') {
    content.innerHTML = `
      <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">📱 Använd telefonens Mät-app (LiDAR)</div>
      <input type="number" placeholder="Total yta (m²)" style="width:100%; padding:12px; margin-bottom:8px; border-radius:8px; border:1px solid var(--glass-border); background:var(--card-bg); color:var(--text-main);">
      <label style="font-size:13px; font-weight:700;"><input type="checkbox"> Snöupplag fotat</label>
    `;
  } else if (type === 'bygg') {
    content.innerHTML = `
      <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">📱 Använd telefonens Mät-app (LiDAR)</div>
      <input type="number" placeholder="Längd på fasad (m)" style="width:100%; padding:12px; margin-bottom:8px; border-radius:8px; border:1px solid var(--glass-border); background:var(--card-bg); color:var(--text-main);">
    `;
  } else if (type === 'mark') {
    content.innerHTML = `
      <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">📱 Använd telefonens Mät-app (LiDAR)</div>
      <input type="number" placeholder="Total yta (m²)" style="width:100%; padding:12px; margin-bottom:8px; border-radius:8px; border:1px solid var(--glass-border); background:var(--card-bg); color:var(--text-main);">
    `;
  } else {
    content.innerHTML = '';
  }
}
window.renderOffertTemplate = renderOffertTemplate;
window.handleActivityChange = handleActivityChange;
