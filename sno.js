// ==========================================
// SNÖZONER – delad kod för snozoner.html (rita, iPad) och snojour.html (förare)
// Kräver Leaflet och config.js. Inloggning: samma personliga nyckel som appen.
// ==========================================

// Om kartbiblioteket inte kunde laddas (ingen täckning första gången) ersätts det med
// en tom attrapp, så att listan med objekt och "Kör dit" ändå fungerar.
const SNO_MAP_MISSING = typeof L === 'undefined';
if (SNO_MAP_MISSING) {
  const noop = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : noop), apply: () => noop });
  window.L = noop;
}

const SNO_TYPES = {
  maskin:   { label: 'Maskinzon',     color: '#2563eb', kind: 'polygon' },
  hand:     { label: 'Handskottning', color: '#f59e0b', kind: 'polygon' },
  stracka:  { label: 'Sträcka',       color: '#a78bfa', kind: 'line' },
  kantsten: { label: 'Kantsten',      icon: '⚠️', kind: 'marker' },
  lucka:    { label: 'Brunnslock',    icon: '🛑', kind: 'marker' },
  trappa:   { label: 'Trappa',        icon: '🪜', kind: 'marker' },
  hinder:   { label: 'Övrigt hinder', icon: '❗', kind: 'marker' },
  // Snöupplag ritas som yta; äldre upplag är sparade som en punkt och visas då som 🏔️
  upplag:   { label: 'Snöupplag',     icon: '🏔️', color: '#d946ef', kind: 'polygon', allowPoint: true }
};

// Zonens form: ett upplag med en enda punkt är en markör, annars gäller typen
function snoZoneKind(zone) {
  const def = SNO_TYPES[zone.type] || SNO_TYPES.maskin;
  return def.allowPoint && zone.coords && zone.coords.length < 3 ? 'marker' : def.kind;
}

// Färgförklaring för kartan
function snoLegendHtml() {
  return ['maskin', 'hand', 'upplag', 'stracka'].map(t =>
    `<span><i style="background:${SNO_TYPES[t].color}"></i>${SNO_TYPES[t].label}</span>`).join('');
}

const SNO_TILES = {
  sat: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  // OpenStreetMap: ritar ut husen (Esris vägkarta saknar byggnader i Sverige)
  street: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
};
const SNO_ATTRIB = { sat: 'Bild: Esri, Maxar', street: '© OpenStreetMap-bidragsgivare' };
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
    body: JSON.stringify({ ...auth, site: location.origin + location.pathname.replace(/[^/]*$/, ''), ...payload })
  });
  return res.json();
}

function snoEscape(text) {
  return String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Karta med satellit/vägkarta. Returnerar { map, setTiles(name) }
function snoCreateMap(elementId) {
  if (SNO_MAP_MISSING) {
    const el = document.getElementById(elementId);
    el.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;color:#94a3b8;font-size:14px;">🗺️ Kartan kan inte visas utan täckning.<br>Listan nedan fungerar ändå.</div>';
    return { map: L, setTiles() {} };
  }
  const map = L.map(elementId, { zoomControl: false }).setView(SNO_FLEN_CENTER, 15);
  let tiles = L.tileLayer(SNO_TILES.sat, { maxZoom: 19, attribution: SNO_ATTRIB.sat }).addTo(map);
  return {
    map,
    setTiles(name) {
      map.removeLayer(tiles);
      tiles = L.tileLayer(SNO_TILES[name], { maxZoom: 19, attribution: SNO_ATTRIB[name] }).addTo(map);
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
  const kind = snoZoneKind(zone);
  if (kind === 'polygon') {
    layer = L.polygon(zone.coords, { color: def.color, fillColor: def.color, fillOpacity: 0.35, weight: 3, bubblingMouseEvents: false });
  } else if (kind === 'line') {
    layer = L.polyline(zone.coords, { color: def.color, weight: 6, bubblingMouseEvents: false });
  } else {
    const icon = L.divIcon({ className: 'sno-hazard', html: `<span>${def.icon}</span>`, iconSize: [30, 30] });
    layer = L.marker(zone.coords[0], { icon });
  }
  const title = `<b>${snoEscape(zone.property || 'Utan adress')}</b><br>${def.label}` +
    (zone.areaM2 ? ` · ${Math.round(zone.areaM2).toLocaleString('sv-SE')} m²` : '') +
    (zone.slinga ? `<br>Slinga: ${snoEscape(zone.slinga)}` : '') +
    (zone.note ? `<br><i>${snoEscape(zone.note)}</i>` : '') +
    (zone.photoUrl ? `<br><img src="${snoEscape(zone.photoUrl)}" alt="Foto" style="width:180px;max-width:100%;border-radius:8px;margin-top:6px;">` : '');
  layer.bindPopup(title);
  if (onClick) layer.on('click', (e) => onClick(zone, layer, e));
  return layer.addTo(map);
}

function snoSlingor(zones) {
  return [...new Set(zones.map(z => z.slinga).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sv'));
}

function snoLineLength(coords) {
  let m = 0;
  for (let i = 1; i < coords.length; i++) m += snoDistance(coords[i - 1], coords[i]);
  return m;
}

function snoPointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i], [yj, xj] = poly[j];
    if ((yi > pt[0]) !== (yj > pt[0]) && pt[1] < (xj - xi) * (pt[0] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Gör en gångväg (linje) till en smal yta, widthM bred – för handskottning
function snoBufferLine(coords, widthM) {
  const lat0 = coords[0][0] * Math.PI / 180;
  const mLat = 111320, mLng = 111320 * Math.cos(lat0);
  const xy = coords.map(c => [c[1] * mLng, c[0] * mLat]);
  const half = widthM / 2, left = [], right = [];
  xy.forEach((p, i) => {
    const a = xy[Math.max(0, i - 1)], b = xy[Math.min(xy.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len * half, ny = dx / len * half;
    left.push([(p[1] + ny) / mLat, (p[0] + nx) / mLng]);
    right.push([(p[1] - ny) / mLat, (p[0] - nx) / mLng]);
  });
  return left.concat(right.reverse());
}

// Förslag från OpenStreetMap inom kartutsnittet: parkeringar → plogzon, gångvägar och trappor → handskottning
async function snoOsmSuggestions(bounds) {
  const bbox = [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()].map(n => n.toFixed(6)).join(',');
  const q = `[out:json][timeout:20];(way["amenity"="parking"](${bbox});way["highway"~"^(footway|steps|pedestrian|path)$"](${bbox});node["entrance"](${bbox}););out geom;`;
  // Den publika Overpass-servern är ofta överbelastad (502/504/429) – prova reservservrar i tur och ordning
  const servers = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter'];
  let json = null, lastErr = '';
  for (const url of servers) {
    try {
      const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 25000);
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), signal: ctrl.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      clearTimeout(timer);
      if (!res.ok) { lastErr = 'HTTP ' + res.status; continue; }
      json = await res.json();
      break;
    } catch (e) { lastErr = e.name === 'AbortError' ? 'tog för lång tid' : 'nätverksfel'; }
  }
  if (!json) throw new Error('Kartdatan svarade inte (' + lastErr + '). Kartservrarna är tillfälligt överbelastade – försök igen om en stund.');
  const out = [];
  (json.elements || []).forEach(el => {
    // Entré (OSM-nod): handskottningsyta på 3 × 3 m runt dörren
    if (el.type === 'node' && el.tags && el.tags.entrance) {
      const d = 1.5 / 111320, e = 1.5 / (111320 * Math.cos(el.lat * Math.PI / 180));
      const sq = [[el.lat + d, el.lon - e], [el.lat + d, el.lon + e], [el.lat - d, el.lon + e], [el.lat - d, el.lon - e]];
      out.push({ type: 'hand', coords: sq, icon: '🚪', what: 'Entré', size: '9 m²', areaM2: 9 });
      return;
    }
    const line = (el.geometry || []).map(g => [g.lat, g.lon]);
    if (line.length < 2) return;
    const t = el.tags || {};
    if (t.amenity === 'parking') {
      const poly = line.slice(0, line[0][0] === line[line.length - 1][0] && line[0][1] === line[line.length - 1][1] ? -1 : undefined);
      if (poly.length < 3) return;
      out.push({ type: 'maskin', coords: poly, icon: '🅿️', what: t.name ? 'Parkering ' + t.name : 'Parkering',
        size: Math.round(snoGeodesicArea(poly)).toLocaleString('sv-SE') + ' m²', areaM2: snoGeodesicArea(poly) });
    } else {
      const steps = t.highway === 'steps';
      const poly = snoBufferLine(line, steps ? 1.5 : 2);
      out.push({ type: 'hand', coords: poly, icon: steps ? '🪜' : '🚶', what: steps ? 'Trappa' : 'Gångväg',
        size: Math.round(snoLineLength(line)) + ' m', areaM2: snoGeodesicArea(poly) });
    }
  });
  return out;
}
