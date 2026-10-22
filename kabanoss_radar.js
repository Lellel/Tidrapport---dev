// ==========================================
// KABANOSSEN & FRAMTIDSRADARN v3.0
// ==========================================

const KABANOSS_STATE = {
  activeTab: 'overview', // 'overview', 'kabanoss', 'radar'
  weatherStatus: 'OK', // 'OK' (🟢), 'RISK' (🟠), 'SNOW_ALERT' (🔴)
  resources: [
    { id: 'res-1', name: 'Erik P', role: 'Förare / Höghöjd', avatar: '👨‍🔧', isAvailable: true },
    { id: 'res-2', name: 'Kalle A', role: 'Fältarbetare', avatar: '👷‍♂️', isAvailable: true },
    { id: 'res-3', name: 'Valtra T174', role: 'Traktor / Plog', avatar: '🚜', isAvailable: true },
    { id: 'res-4', name: 'Servicebil LPV 1', role: 'Transport', avatar: '🚚', isAvailable: false }
  ],
  futureProjects: [
    { id: 'proj-101', name: 'Höghöjdstvätt Storgatan', dateRange: '23–27 Okt', neededStaff: 2, currentStaff: 1, circle: '🟠' },
    { id: 'proj-102', name: 'Snöröjning Coop City', dateRange: '28–31 Okt', neededStaff: 1, currentStaff: 0, circle: '🔴' }
  ]
};

function initAdminViews() {
  const container = document.getElementById('admin-views-root');
  if (!container) return;

  container.innerHTML = `
    <!-- DASHBOARD TABS -->
    <div class="dash-tab-bar">
      <button class="dash-tab-btn active" onclick="switchDashTab('overview')">📊 Översikt</button>
      <button class="dash-tab-btn" onclick="switchDashTab('kabanoss')">🌭 Kabanossen</button>
      <button class="dash-tab-btn" onclick="switchDashTab('radar')">🔭 Framtidsradarn</button>
      
      <!-- VÄDERRADAR INDICATOR -->
      <div class="weather-badge" id="weather-indicator" onclick="toggleWeatherAlert()">
        <span class="weather-dot green"></span>
        <span class="weather-text">SMHI: Normalt</span>
      </div>
    </div>

    <!-- VY 1: ÖVERSIKT (Befintlig) -->
    <div id="tab-overview" class="dash-tab-content active">
      <!-- Befintligt innehåll visas här -->
    </div>

    <!-- VY 2: KABANOSSEN (OPERATIV DAGSVY) -->
    <div id="tab-kabanoss" class="dash-tab-content">
      <div class="kabanoss-grid">
        <div class="kabanoss-col">
          <div class="kabanoss-header">Planerade</div>
          <div class="kabanoss-list" id="kab-planerade">
            <div class="kabanoss-card">
              <div class="card-title">Fasadtvätt Kronan</div>
              <div class="card-meta">2 Personer • 08:00</div>
            </div>
          </div>
        </div>
        <div class="kabanoss-col">
          <div class="kabanoss-header">Vid tillfälle</div>
          <div class="kabanoss-list" id="kab-tillfalle">
            <div class="kabanoss-card">
              <div class="card-title">Platsbesök Storgatan 14</div>
              <div class="card-meta">Måttpilar / Ytkalkyl</div>
            </div>
          </div>
        </div>
        <div class="kabanoss-col">
          <div class="kabanoss-header">Pågående</div>
          <div class="kabanoss-list" id="kab-pagaende"></div>
        </div>
        <div class="kabanoss-col">
          <div class="kabanoss-header">Klara (Idag)</div>
          <div class="kabanoss-list" id="kab-klara"></div>
        </div>
      </div>
    </div>

    <!-- VY 3: FRAMTIDSRADARN (STRATEGISK GANTT-LINJE) -->
    <div id="tab-radar" class="dash-tab-content">
      <div class="radar-layout">
        <!-- VÄNSTER: PROJEKT MED CIRKLAR -->
        <div class="radar-projects-col">
          <div class="section-title">Kommande Projekt</div>
          <div id="radar-project-list" class="space-y-2"></div>
        </div>

        <!-- HÖGER: RESURSPOOL OCH 3D GLASS AVATARER -->
        <div class="radar-resources-col">
          <div class="section-title">3D Glass Resurspool</div>
          <div id="radar-avatar-pool" class="avatar-pool-grid"></div>
        </div>
      </div>
    </div>
  `;

  renderRadarData();
}

function switchDashTab(tabName) {
  KABANOSS_STATE.activeTab = tabName;
  document.querySelectorAll('.dash-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.dash-tab-content').forEach(c => c.classList.remove('active'));

  event.target.classList.add('active');
  const target = document.getElementById('tab-' + tabName);
  if (target) target.classList.add('active');
}

function renderRadarData() {
  const projContainer = document.getElementById('radar-project-list');
  const poolContainer = document.getElementById('radar-avatar-pool');
  if (!projContainer || !poolContainer) return;

  // Rendera Projekt
  projContainer.innerHTML = '';
  KABANOSS_STATE.futureProjects.forEach(p => {
    projContainer.innerHTML += `
      <div class="radar-proj-card" ondragover="allowDrop(event)" ondrop="dropAvatar(event, '${p.id}')">
        <div class="flex-between">
          <span class="radar-circle">${p.circle}</span>
          <span class="radar-date">${p.dateRange}</span>
        </div>
        <div class="radar-title">${p.name}</div>
        <div class="radar-staff-req">Bemannat: ${p.currentStaff} / ${p.neededStaff}</div>
      </div>
    `;
  });

  // Rendera 3D Glass Avatarer
  poolContainer.innerHTML = '';
  KABANOSS_STATE.resources.forEach(r => {
    poolContainer.innerHTML += `
      <div class="glass-avatar-card ${r.isAvailable ? '' : 'disabled'}" 
           draggable="${r.isAvailable}" 
           ondragstart="dragAvatar(event, '${r.id}')">
        <div class="avatar-3d-sphere">${r.avatar}</div>
        <div class="avatar-name">${r.name}</div>
        <div class="avatar-role">${r.role}</div>
      </div>
    `;
  });
}

function dragAvatar(e, id) {
  e.dataTransfer.setData("text/plain", id);
}

function allowDrop(e) {
  e.preventDefault();
}

function dropAvatar(e, projId) {
  e.preventDefault();
  const resId = e.dataTransfer.getData("text/plain");
  const proj = KABANOSS_STATE.futureProjects.find(p => p.id === projId);
  if (proj) {
    proj.currentStaff++;
    if (proj.currentStaff >= proj.neededStaff) proj.circle = '🟢';
    renderRadarData();
  }
}

function toggleWeatherAlert() {
  const badge = document.getElementById('weather-indicator');
  if (KABANOSS_STATE.weatherStatus === 'OK') {
    KABANOSS_STATE.weatherStatus = 'SNOW_ALERT';
    badge.innerHTML = `<span class="weather-dot red"></span><span class="weather-text">🔴 SNÖLARM (SMHI)</span>`;
  } else {
    KABANOSS_STATE.weatherStatus = 'OK';
    badge.innerHTML = `<span class="weather-dot green"></span><span class="weather-text">🟢 SMHI: Normalt</span>`;
  }
}

window.initAdminViews = initAdminViews;
window.switchDashTab = switchDashTab;
window.toggleWeatherAlert = toggleWeatherAlert;
window.dragAvatar = dragAvatar;
window.allowDrop = allowDrop;
window.dropAvatar = dropAvatar;
