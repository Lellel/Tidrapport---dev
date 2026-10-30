// ==========================================
// SNÖZONER – delad kod för snozoner.html (rita, iPad) och snojour.html (förare)
// Kräver Leaflet och config.js. Inloggning: samma personliga nyckel som appen.
// ==========================================

const SNO_TYPES = {
  maskin:   { label: 'Maskinzon',     color: '#38bdf8', kind: 'polygon' },
  hand:     { label: 'Handskottning', color: '#f59e0b', kind: 'polygon' },
  stracka:  { label: 'Sträcka',       color: '#a78bfa', kind: 'line' },
  kantsten: { label: 'Kantsten',      icon: '⚠️', kind: 'marker' },
  lucka:    { label: 'Brunnslock',    icon: '🛑', kind: 'marker' },
  trappa:   { label: 'Trappa',        icon: '🪜', kind: 'marker' }
};

const SNO_TILES = {
  sat: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  street: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
};
const SNO_FLEN_CENTER = [59.0572, 16.5880];

function snoCurrentUser() {
  return localStorage.getItem('lpv_user') || localStorage.getItem('lpv_user_name') || '';
}

function snoIsAdmin() {
  return localStorage.getItem('lpv_is_admin') === 'true';
}

async function snoApi(payload) {
  const auth = { user: snoCurrentUser(), key: localStorage.getItem('lpv_key') || '' };
  if (typeof CONFIG !== 'undefined' && CONFIG.API_TOKEN) auth.token = CONFIG.API_TOKEN;
  const res = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    redirect: 'follow',
    body: JSON.stringify({ ...auth, ...payload })
  });
  return res.json();
}

function snoEscape(text) {
  return String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Karta med satellit/vägkarta. Returnerar { map, setTiles(name) }
function snoCreateMap(elementId) {
  const map = L.map(elementId, { zoomControl: false }).setView(SNO_FLEN_CENTER, 15);
  let tiles = L.tileLayer(SNO_TILES.sat, { maxZoom: 19 }).addTo(map);
  return {
    map,
    setTiles(name) {
      map.removeLayer(tiles);
      tiles = L.tileLayer(SNO_TILES[name], { maxZoom: 19 }).addTo(map);
    }
  };
}

// Yta i m² för en polygon på jordytan (samma formel som Leaflet.draw)
function snoGeodesicArea(coords) {
  if (!coords || coords.length < 3) return 0;
  const R = 6378137, rad = Math.PI / 180;
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const [lat1, lng1] = coords[i];
    const [lat2, lng2] = coords[(i + 1) % coords.length];
    area += (lng2 - lng1) * rad * (2 + Math.sin(lat1 * rad) + Math.sin(lat2 * rad));
  }
  return Math.abs(area * R * R / 2);
}

// Avstånd i meter mellan två [lat, lng]
function snoDistance(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function snoCenter(coords) {
  const n = coords.length || 1;
  return [coords.reduce((s, c) => s + c[0], 0) / n, coords.reduce((s, c) => s + c[1], 0) / n];
}

function snoFormatDistance(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

// Ritar en sparad zon på kartan och returnerar lagret
function snoRenderZone(map, zone, onClick) {
  const def = SNO_TYPES[zone.type] || SNO_TYPES.maskin;
  let layer;
  // bubblingMouseEvents: false = tryck på zonen räknas inte också som tryck på kartan
  if (def.kind === 'polygon') {
    layer = L.polygon(zone.coords, { color: def.color, fillColor: def.color, fillOpacity: 0.35, weight: 3, bubblingMouseEvents: false });
  } else if (def.kind === 'line') {
    layer = L.polyline(zone.coords, { color: def.color, weight: 6, bubblingMouseEvents: false });
  } else {
    const icon = L.divIcon({ className: 'sno-hazard', html: `<span>${def.icon}</span>`, iconSize: [30, 30] });
    layer = L.marker(zone.coords[0], { icon });
  }
  const title = `<b>${snoEscape(zone.property || 'Utan adress')}</b><br>${def.label}` +
    (zone.areaM2 ? ` · ${Math.round(zone.areaM2).toLocaleString('sv-SE')} m²` : '') +
    (zone.slinga ? `<br>Slinga: ${snoEscape(zone.slinga)}` : '') +
    (zone.note ? `<br><i>${snoEscape(zone.note)}</i>` : '');
  layer.bindPopup(title);
  if (onClick) layer.on('click', (e) => onClick(zone, layer, e));
  return layer.addTo(map);
}

function snoSlingor(zones) {
  return [...new Set(zones.map(z => z.slinga).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sv'));
}
