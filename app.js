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
