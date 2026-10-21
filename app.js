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
let currentCompany = "LPV";
let attachedPhotoBase64 = null;
let isSubmitting = false;

// CRM & Offert State
let customersList = [];
let decisionLogs = [];
let templatesList = [];
let selectedCustomer = null;
let draggedCardInfo = null;

let offertMode = "auto"; // "auto" eller "manual"
let offertDeductionType = "rut"; // "none", "rut", "rot", "manual"
let offertItems = [
  { id: 1, title: 'Fönsterputs villaglas', qty: 4, unit: 'tim', price: 562.50, vat: 25, type: 'rut' },
  { id: 2, title: 'Kem & Rengöringsmedel', qty: 1, unit: 'st', price: 150.00, vat: 25, type: 'none' }
];

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

function openNavigation(address) {
  if (!address || address.trim() === '' || address === 'Okänd') {
    alert("Ingen giltig adress angiven för navigering.");
    return;
  }
  const encoded = encodeURIComponent(address.trim());
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const mapsUrl = isIOS 
    ? `https://maps.apple.com/?daddr=${encoded}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  window.open(mapsUrl, '_blank');
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
      <button class="btn-action" style="margin-left: auto; background: var(--accent-blue);" onclick="toggleCRMModal()">👥 Öppna CRM & Offert</button>
    </div>
    <div class="kanban-board">
      <div class="kanban-column" id="kanban-col-planned" data-col="planned"><div class="kanban-col-header">📥 Planerade <span class="kanban-col-count" id="count-planned">0</span></div><div class="kanban-cards" id="cards-planned"></div></div>
      <div class="kanban-column" id="kanban-col-buffer" data-col="buffer"><div class="kanban-col-header">⏱️ Vid Tillfälle <span class="kanban-col-count" id="count-buffer">0</span></div><div class="kanban-cards" id="cards-buffer"></div></div>
      <div class="kanban-column" id="kanban-col-live" data-col="live"><div class="kanban-col-header">🚜 Pågående / Klara <span class="kanban-col-count" id="count-live">0</span></div><div class="kanban-cards" id="cards-live"></div></div>
      <div class="kanban-column" id="kanban-col-done" data-col="done"><div class="kanban-col-header">📊 Klara för faktura <span class="kanban-col-count" id="count-done">0</span></div><div class="kanban-cards" id="cards-done"></div></div>
    </div>
  `;
  document.body.appendChild(container);
  initCRMModalUI();
  setupKanbanDragAndDrop();
}

function setupKanbanDragAndDrop() {
  const cols = document.querySelectorAll('.kanban-column');
  cols.forEach(col => {
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => { col.classList.remove('drag-over'); });
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const targetCol = col.getAttribute('data-col');
      if (draggedCardInfo) { handleCardDrop(draggedCardInfo, targetCol); draggedCardInfo = null; }
    });
  });
}

function handleCardDrop(cardInfo, targetCol) {
  const { id, isLocal } = cardInfo;
  if (!isLocal) {
    const job = plannedJobs.find(j => String(j.id) === String(id));
    if (!job) return;
    if (targetCol === 'buffer') job.isBuffer = true;
    else if (targetCol === 'planned') job.isBuffer = false;
    else if (targetCol === 'live') clockInPlannedJob(job.id);
    else if (targetCol === 'done') markCalendarJobCompleted(job.id);
  } else {
    const draft = drafts.find(d => String(d.id) === String(id));
    if (!draft) return;
    if (targetCol === 'done') {
      if (!draft.end) draft.end = getCurrentTimeStr();
      draft.totalHours = calculateHours(draft.start, draft.end).toFixed(1);
      saveDraftsToStorage();
      submitAll(false);
    }
  }
  renderOutbox();
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
          <button class="crm-tab-btn" id="tab-btn-offert" onclick="switchCRMTab('offert')">📝 Skapa Offert (ROT/RUT)</button>
        </div>
        <button class="btn-close-kanban" onclick="toggleCRMModal()">✕ Stäng</button>
      </div>
      <div class="crm-body">
        <div class="crm-sidebar-list" id="crm-customer-list"></div>
        <div class="crm-main-view" id="crm-main-content">
          <div style="color:var(--text-muted); text-align:center; margin-top:50px;">Välj en kund i listan till vänster.</div>
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
    if (backdrop.classList.contains('active')) {
      renderCustomerSidebar();
      fetchCRMData();
    }
  }
}

function switchCRMTab(tab) {
  document.getElementById('tab-btn-kundbild')?.classList.toggle('active', tab === 'kundbild');
  document.getElementById('tab-btn-offert')?.classList.toggle('active', tab === 'offert');
  
  if (tab === 'offert') renderOffertBuilderView();
  else renderCustomerDetailView();
}

async function fetchCRMData(autoSearchPhone = null) {
  renderCustomerSidebar();
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

      if (autoSearchPhone) {
        const cleanIncoming = autoSearchPhone.replace(/[^0-9]/g, '').slice(-7);
        const found = customersList.find(c => (c.phone || '').replace(/[^0-9]/g, '').includes(cleanIncoming));
        if (found) {
          selectedCustomer = found;
          renderCustomerSidebar();
          renderCustomerDetailView();
        }
      }
    }
  } catch (err) { 
    console.error("CRM Fel:", err); 
    renderCustomerSidebar();
  }
}

function renderCustomerSidebar() {
  const container = document.getElementById('crm-customer-list');
  if (!container) return;
  
  container.innerHTML = `
    <div style="padding:12px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02);">
      <span style="font-size:12px; font-weight:700; color:var(--text-muted);">KUNDER (${customersList.length})</span>
      <button class="btn-action" style="padding:4px 10px; font-size:12px; background:var(--accent-green); color:#fff; font-weight:bold; border-radius:6px;" onclick="promptAddCustomer()">+ Ny kund</button>
    </div>
  `;

  if (customersList.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.style.cssText = "padding:20px 12px; text-align:center; color:var(--text-muted); font-size:12px; line-height:1.5;";
    emptyMsg.innerHTML = "Inga kunder inlästa än.<br><br>Klicka på <strong style='color:#fff;'>+ Ny kund</strong> ovan för att skapa en kund!";
    container.appendChild(emptyMsg);
    return;
  }

  customersList.forEach(c => {
    const item = document.createElement('div');
    item.className = `customer-item ${selectedCustomer && selectedCustomer.id === c.id ? 'active' : ''}`;
    item.onclick = () => {
      selectedCustomer = c;
      renderCustomerSidebar();
      const isOffertActive = document.getElementById('tab-btn-offert')?.classList.contains('active');
      if (isOffertActive) renderOffertBuilderView();
      else renderCustomerDetailView();
    };
    item.innerHTML = `
      <div style="font-weight:700; color:#fff;">${c.name}</div>
      <div style="font-size:12px; color:var(--text-muted);">${c.id} • ${c.contact || 'Ingen kontakt'}</div>
    `;
    container.appendChild(item);
  });
}

// ==========================================
// OFFERTBUILDER MED HYBRID (AUTO + MANUELL)
// ==========================================
function renderOffertBuilderView() {
  const main = document.getElementById('crm-main-content');
  if (!main) return;
  if (!selectedCustomer) {
    main.innerHTML = `<div style="color:var(--text-muted); text-align:center; margin-top:50px;">Välj en kund i listan till vänster för att skapa en offert.</div>`;
    return;
  }

  main.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <h2 style="margin:0; font-size:22px; color:#FFF;">📝 Skapa Offert — ${selectedCustomer.name}</h2>
      <div style="display:flex; gap:8px;">
        <button class="segment-btn ${offertMode === 'auto' ? 'active' : ''}" style="padding:6px 12px; font-size:12px;" onclick="setOffertMode('auto')">⚡ Auto (Mallar)</button>
        <button class="segment-btn ${offertMode === 'manual' ? 'active' : ''}" style="padding:6px 12px; font-size:12px;" onclick="setOffertMode('manual')">✏️ Manuell Överstyrning</button>
      </div>
    </div>
    
    <div class="offert-calc-card">
      <div class="form-group">
        <label class="form-label">Offertrubrik</label>
        <input type="text" id="offert-title" class="form-input" placeholder="T.ex. Fönsterputs & Trappstädning höst 2026" value="Fönsterputs & Underhåll 2026">
      </div>

      <!-- AUTO MODE: RADER FRÅN MALLAR -->
      <div id="offert-auto-section" style="display:${offertMode === 'auto' ? 'block' : 'none'}; margin-top:16px;">
        <label class="form-label" style="display:flex; justify-content:space-between;">
          <span>🛠️ OFFERTRADER (Hämtas från Sheets)</span>
          <span style="color:var(--accent-blue); cursor:pointer;" onclick="addOffertItemRow()">+ Lägg till rad</span>
        </label>
        <div id="offert-items-container" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;"></div>
      </div>

      <!-- MANUAL MODE: DIREKTBELOPP -->
      <div id="offert-manual-section" style="display:${offertMode === 'manual' ? 'block' : 'none'}; margin-top:16px;">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div>
            <label class="form-label">Arbetskostnad (kr inkl. moms)</label>
            <input type="number" id="manual-labor" class="form-input" placeholder="0" value="2250" oninput="calculateOffertTotals()">
          </div>
          <div>
            <label class="form-label">Material / Resor (kr inkl. moms)</label>
            <input type="number" id="manual-material" class="form-input" placeholder="0" value="150" oninput="calculateOffertTotals()">
          </div>
        </div>

        <div class="form-group" style="margin-top:12px;">
          <label class="form-label">Skatteavdrag (ROT/RUT)</label>
          <div class="segment-control" style="grid-template-columns: 1fr 1fr 1fr 1fr;">
            <button type="button" id="btn-deduct-none" class="segment-btn" onclick="setOffertDeduction('none')">Ingen</button>
            <button type="button" id="btn-deduct-rut" class="segment-btn active" onclick="setOffertDeduction('rut')">RUT (50%)</button>
            <button type="button" id="btn-deduct-rot" class="segment-btn" onclick="setOffertDeduction('rot')">ROT (30%)</button>
            <button type="button" id="btn-deduct-manual" class="segment-btn" onclick="setOffertDeduction('manual')">✏️ Eget belopp</button>
          </div>
        </div>

        <div id="manual-deduction-custom-row" style="display:none; margin-top:10px;">
          <label class="form-label">Egen Skattereduktion (kr)</label>
          <input type="number" id="manual-deduction-amount" class="form-input" placeholder="T.ex. 1000" oninput="calculateOffertTotals()">
        </div>
      </div>

      <!-- PERSON OCH FASTIGHETS-UPPGIFTER -->
      <div style="margin-top:16px; display:grid; grid-template-columns:1fr 1fr; gap:12px; background:rgba(255,255,255,0.02); padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
        <div>
          <label class="form-label">Personnummer (Skatteverket)</label>
          <input type="text" id="offert-pno" class="form-input" placeholder="19800101-1234">
        </div>
        <div>
          <label class="form-label">Fastighetsbet. / BRF-lägenhet</label>
          <input type="text" id="offert-property" class="form-input" placeholder="Slottet 1:2 / Lgh 1102">
        </div>
      </div>

      <!-- LIVE SAMMANSTÄLLNING -->
      <div class="offert-summary-box">
        <div class="offert-row"><span>Totalt arbete (inkl. moms):</span><span id="sum-labor">0 kr</span></div>
        <div class="offert-row"><span>Totalt material & resor (inkl. moms):</span><span id="sum-material">0 kr</span></div>
        <div class="offert-row"><span>Moms (25% ingår):</span><span id="sum-vat">0 kr</span></div>
        <div class="offert-row deduction" id="row-deduction-amount">
          <span id="lbl-deduction-type">− RUT-avdrag:</span>
          <span id="sum-deduction">−0 kr</span>
        </div>
        <div class="offert-row total">
          <span>ATT BETALA FÖR KUND:</span>
          <span id="sum-total-pay" style="color:var(--accent-green);">0 kr</span>
        </div>
      </div>

      <div style="display:flex; gap:12px; margin-top:20px;">
        <button class="btn-primary" style="flex:1;" onclick="saveAndSendOffert()">💾 Spara Offert</button>
        <button class="btn-action" style="background:var(--accent-blue); padding:0 16px;" onclick="alert('Kundlänk kopierad till urklipp!')">🔗 Skapa Kundlänk</button>
      </div>
    </div>
  `;

  renderOffertItemRows();
  calculateOffertTotals();
}

function setOffertMode(mode) {
  offertMode = mode;
  renderOffertBuilderView();
}

function renderOffertItemRows() {
  const container = document.getElementById('offert-items-container');
  if (!container) return;
  container.innerHTML = '';

  offertItems.forEach((item, index) => {
    const row = document.createElement('div');
    row.style.cssText = "display:flex; gap:8px; align-items:center; background:rgba(255,255,255,0.04); padding:8px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.08);";
    row.innerHTML = `
      <input type="text" class="form-input" style="flex:2; padding:6px 8px; font-size:12px;" value="${item.title}" onchange="offertItems[${index}].title=this.value; calculateOffertTotals();">
      <input type="number" class="form-input" style="width:60px; padding:6px 8px; font-size:12px;" value="${item.qty}" oninput="offertItems[${index}].qty=parseFloat(this.value||0); calculateOffertTotals();">
      <span style="font-size:11px; color:var(--text-muted);">${item.unit}</span>
      <input type="number" class="form-input" style="width:90px; padding:6px 8px; font-size:12px;" value="${item.price}" oninput="offertItems[${index}].price=parseFloat(this.value||0); calculateOffertTotals();">
      <select class="form-input" style="width:90px; padding:6px 4px; font-size:11px;" onchange="offertItems[${index}].type=this.value; calculateOffertTotals();">
        <option value="rut" ${item.type==='rut'?'selected':''}>RUT (50%)</option>
        <option value="rot" ${item.type==='rot'?'selected':''}>ROT (30%)</option>
        <option value="none" ${item.type==='none'?'selected':''}>Ej avdrag</option>
      </select>
      <button style="background:none; border:none; color:var(--accent-red); cursor:pointer; font-size:14px;" onclick="offertItems.splice(${index},1); renderOffertItemRows(); calculateOffertTotals();">🗑️</button>
    `;
    container.appendChild(row);
  });
}

function addOffertItemRow() {
  offertItems.push({ id: Date.now(), title: 'Ny aktivitet', qty: 1, unit: 'tim', price: 450, vat: 25, type: 'rut' });
  renderOffertItemRows();
  calculateOffertTotals();
}

function setOffertDeduction(type) {
  offertDeductionType = type;
  document.getElementById('btn-deduct-none')?.classList.toggle('active', type === 'none');
  document.getElementById('btn-deduct-rut')?.classList.toggle('active', type === 'rut');
  document.getElementById('btn-deduct-rot')?.classList.toggle('active', type === 'rot');
  document.getElementById('btn-deduct-manual')?.classList.toggle('active', type === 'manual');

  const customRow = document.getElementById('manual-deduction-custom-row');
  if (customRow) customRow.style.display = (type === 'manual') ? 'block' : 'none';

  calculateOffertTotals();
}

function calculateOffertTotals() {
  let laborTotal = 0;
  let materialTotal = 0;
  let deductionTotal = 0;

  if (offertMode === 'auto') {
    offertItems.forEach(item => {
      const lineTotal = item.qty * item.price;
      if (item.type === 'rut') {
        laborTotal += lineTotal;
        deductionTotal += lineTotal * 0.50;
      } else if (item.type === 'rot') {
        laborTotal += lineTotal;
        deductionTotal += lineTotal * 0.30;
      } else {
        materialTotal += lineTotal;
      }
    });
  } else {
    laborTotal = parseFloat(document.getElementById('manual-labor')?.value || 0);
    materialTotal = parseFloat(document.getElementById('manual-material')?.value || 0);

    if (offertDeductionType === 'rut') deductionTotal = laborTotal * 0.50;
    else if (offertDeductionType === 'rot') deductionTotal = laborTotal * 0.30;
    else if (offertDeductionType === 'manual') deductionTotal = parseFloat(document.getElementById('manual-deduction-amount')?.value || 0);
  }

  const grossTotal = laborTotal + materialTotal;
  const netTotal = grossTotal - deductionTotal;
  const vatAmount = grossTotal * 0.20;

  if (document.getElementById('sum-labor')) document.getElementById('sum-labor').innerText = `${laborTotal.toLocaleString('sv-SE')} kr`;
  if (document.getElementById('sum-material')) document.getElementById('sum-material').innerText = `${materialTotal.toLocaleString('sv-SE')} kr`;
  if (document.getElementById('sum-vat')) document.getElementById('sum-vat').innerText = `${vatAmount.toLocaleString('sv-SE', {maximumFractionDigits: 0})} kr`;
  
  if (document.getElementById('sum-deduction')) document.getElementById('sum-deduction').innerText = `−${deductionTotal.toLocaleString('sv-SE')} kr`;
  if (document.getElementById('sum-total-pay')) document.getElementById('sum-total-pay').innerText = `${netTotal.toLocaleString('sv-SE')} kr`;
}

async function saveAndSendOffert() {
  const title = document.getElementById('offert-title')?.value.trim();
  if (!title) { alert("Ange en rubrik för offerten."); return; }

  alert(`✅ Offert "${title}" sparad för ${selectedCustomer ? selectedCustomer.name : 'kunden'}!`);
  switchCRMTab('kundbild');
}

function renderCustomerDetailView() {
  const main = document.getElementById('crm-main-content');
  if (!main) return;
  if (!selectedCustomer) {
    main.innerHTML = `<div style="color:var(--text-muted); text-align:center; margin-top:50px;">Välj en kund till vänster.</div>`;
    return;
  }
  const addrNav = selectedCustomer.address ? `<button class="btn-nav-map" onclick="openNavigation('${selectedCustomer.address.replace(/'/g, "\\'")}')">🗺️ Navigera</button>` : '';

  main.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
      <div>
        <h2 style="margin:0; font-size:24px;">${selectedCustomer.name}</h2>
        <div style="color:var(--text-muted); font-size:13px; margin-top:4px;">ID: ${selectedCustomer.id} | Org.nr: ${selectedCustomer.org || 'Ej angivet'}</div>
      </div>
      <button class="btn-action" style="background:var(--accent-green);" onclick="promptAddDecision('${selectedCustomer.name}')">📌 Logga Beslut / ÄTA</button>
    </div>
    <div style="display:flex; gap:20px; align-items:center; background:rgba(255,255,255,0.03); padding:16px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); margin-top:12px;">
      <div><strong>Kontakt:</strong> ${selectedCustomer.contact}</div>
      <div><strong>Telefon:</strong> ${selectedCustomer.phone}</div>
      <div><strong>E-post:</strong> ${selectedCustomer.email || 'Ej angiven'}</div>
      <div><strong>Adress:</strong> ${selectedCustomer.address} ${addrNav}</div>
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
  const name = prompt("Kundens namn (t.ex. Ica Maxi eller Familjen Svensson):");
  if (!name || !name.trim()) return;
  const contact = prompt("Kontaktperson:") || "";
  const phone = prompt("Telefonnummer:") || "";
  const address = prompt("Adress för navigering:") || "";

  const newCustLocally = {
    id: 'K-' + Math.floor(1000 + Math.random() * 9000),
    name: name.trim(),
    contact: contact.trim(),
    phone: phone.trim(),
    address: address.trim(),
    email: '',
    org: ''
  };

  customersList.unshift(newCustLocally);
  selectedCustomer = newCustLocally;
  renderCustomerSidebar();
  renderCustomerDetailView();

  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        token: CONFIG.API_TOKEN, action: 'addCustomer',
        customerData: { name: newCustLocally.name, contact: newCustLocally.contact, phone: newCustLocally.phone, org: '', email: '', address: newCustLocally.address }
      })
    });
    const result = await res.json();
    if (result.status === 'success') {
      alert(`✅ Kund "${newCustLocally.name}" sparad i kalkylarket!`);
      fetchCRMData();
    }
  } catch (err) { 
    console.log("Kund sparades lokalt i vyn."); 
  }
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
  const safePlace = (place || '').replace(/'/g, "\\'");
  const navBtn = place ? `<button class="btn-nav-map" style="font-size:10px; padding:2px 6px; float:right;" onclick="event.stopPropagation(); openNavigation('${safePlace}')">🗺️</button>` : '';

  card.innerHTML = `
    <div style="font-weight: 600; color: #FFF; font-size: 14px; margin-bottom: 4px;">${title}</div>
    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">${place} ${navBtn}</div>
    <div style="font-size: 11px; font-weight: 700; color: #CCC; background: rgba(255,255,255,0.05); padding: 4px 6px; border-radius: 4px; display: inline-block;">${meta}</div>
  `;

  card.addEventListener('dragstart', (e) => {
    draggedCardInfo = { id, isLocal, type };
    card.classList.add('dragging');
    e.dataTransfer.setData('text/plain', id);
  });

  card.addEventListener('dragend', () => { card.classList.remove('dragging'); });

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

function setCompany(companyName) {
  currentCompany = companyName;
  document.getElementById('btn-company-lpv')?.classList.toggle('active', companyName === 'LPV');
  document.getElementById('btn-company-klaryta')?.classList.toggle('active', companyName === 'Klaryta');
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

  if (urlParams.has('phone')) {
    const incomingPhone = urlParams.get('phone');
    toggleCRMModal();
    fetchCRMData(incomingPhone);
  }

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
        kbtn.innerHTML = '📊 Öppna Flygledartornet & Offert';
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
    company: currentCompany,
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
    company: src.company || currentCompany,
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
    company: currentCompany,
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
      const safePlace = (draft.place || '').replace(/'/g, "\\'");
      const navBtn = draft.place ? `<button class="btn-nav-map" onclick="openNavigation('${safePlace}')">🗺️ Navigera</button>` : '';
      const companyBadge = draft.company ? `<span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-right: 6px;">🏢 ${draft.company}</span>` : '';

      let actionButtons = isOngoing ? `
        <button class="btn-action clock-out" onclick="clockOut(${draft.id})">Stämpla ut nu</button>
        <button class="btn-action delete" onclick="deleteDraft(${draft.id})" style="flex:0 0 45px;">Radera</button>
      ` : `
        <button class="btn-action split-pass" onclick="createSplitPass(${draft.id})">Nytt pass</button>
        <button class="btn-action delete" onclick="deleteDraft(${draft.id})">Radera</button>
      `;
      card.innerHTML = `<div class="card-body"><div class="card-title">${draft.place} ${navBtn}</div><div class="card-meta"><span>${companyBadge} ${isOngoing ? '<span class="ongoing-pulse">Pågår</span>' : `${draft.start} –${draft.end}`}</span></div></div><div class="card-actions">${actionButtons}</div>`;
      container.appendChild(card);
    });

    visiblePlannedJobs.forEach(job => {
      const card = document.createElement('div'); card.className = 'draft-card';
      const badgeHtml = job.isBuffer ? `<span>⏱️ VID TILLFÄLLE</span>` : `<span>📅 PLANERAT</span>`;
      const safePlace = (job.place || '').replace(/'/g, "\\'");
      const navBtn = job.place ? `<button class="btn-nav-map" onclick="openNavigation('${safePlace}')">🗺️ Navigera</button>` : '';

      card.innerHTML = `<div class="card-body"><div class="card-title">${job.title}</div><div class="card-meta">${badgeHtml} ${job.place} ${navBtn}</div></div><div class="card-actions"><button class="btn-action clock-in">Stämpla in</button></div>`;
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
