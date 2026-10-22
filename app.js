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
  const input = document.getElementById('avatar-upload');
  if (input) {
    input.click();
  } else {
    alert("Kunde inte öppna kameran. Vänligen ladda om sidan.");
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
