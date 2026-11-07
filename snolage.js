// ❄️ Snöläget på startsidan (docs/startsidan.md, bestämt 2026-11-07). Bara admin, under snösäsong, bara iPad/dator.
// - Plogometern, klara/kvar, traktorer ute och knapparna ❄️ Snöjour (fylld blå) och 🚜 Snöplanering.
// - Under ett pågående snöfall: översiktskartan med lampor (⚪ ej påbörjad, 🟡 påbörjad, 🟢 klar, ⭕ saknar traktor),
//   förvalt hela kommunen med en rad per kommundel. ‹ › eller tryck på en rad = zooma dit. Tryck på en lampa = liten ruta.
// - Kulor som står (driftstopp.js) syns på kartan och i en lista – tryck för hela flödet.
// Larmraden "🔧 … står" överst på startsidan gäller admin i alla storlekar under snösäsong, och ?stopp= från SMS:et.
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const get = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', CENTER = [59.0572, 16.5880];

  let box = null, data = null, weather = null, kd = '', map = null, layers = [], timer = null, pick = null, loadingLeaflet = null;

  function leaflet() {
    if (window.L) return Promise.resolve();
    if (loadingLeaflet) return loadingLeaflet;
    loadingLeaflet = new Promise((ok, bad) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = LEAFLET_CSS; document.head.appendChild(css);
      const s = document.createElement('script'); s.src = LEAFLET_JS; s.onload = ok; s.onerror = bad; document.head.appendChild(s);
    });
    return loadingLeaflet;
  }

  async function load() {
    try {
      const [r, w] = await Promise.all([apiPost({ action: 'getSnowStatus' }), weather ? Promise.resolve(null) : apiPost({ action: 'getWeather' }).catch(() => null)]);
      if (w && w.status === 'success') weather = w;
      if (r.status !== 'success') { if (box) box.innerHTML = `<div class="section-label">❄️ Snöläget</div><div class="sl-sub">❌ ${esc(r.message || 'Kunde inte hämta.')}</div>`; return; }
      data = r;
      render();
      banner(null); // på iPad/dator syns stoppen i Snöläget – inte två gånger
    } catch (e) { if (box && !data) box.innerHTML = '<div class="section-label">❄️ Snöläget</div><div class="sl-sub">Ingen kontakt just nu.</div>'; }
  }

  function plogLine() {
    if (!weather || !weather.areas) return '';
    const names = Object.keys(weather.areas);
    if (!names.length) return '';
    const top = names.map(n => ({ n, a: weather.areas[n] })).sort((a, b) => (b.a.plog || 0) - (a.a.plog || 0))[0];
    return `<div class="sl-weather">🚜 Plogometern <b>${Math.round(top.a.plog || 0)} %</b> i ${esc(top.n)}${top.a.plogWhen ? ' · ' + esc(top.a.plogWhen) : ''}</div>`;
  }

  function render() {
    if (!box || !data) return;
    const all = data.properties, list = kd ? all.filter(p => p.kd === kd) : all;
    const assigned = list.filter(p => p.parts.length);
    const klara = assigned.filter(p => p.state === 'done').length;
    const downs = (data.stops.units || []).filter(lpvStopp.isDown);
    const kds = data.kommundelar;
    let h = `<div class="section-label">❄️ Snöläget</div>${plogLine()}`;
    if (data.pagar) {
      h += `<div class="sl-sum"><b>${klara} klara</b> · ${assigned.length - klara} kvar${kd ? ' i ' + esc(kd) : ''} · ${data.tractorsOut} ${data.tractorsOut === 1 ? 'traktor' : 'traktorer'} ute${downs.length ? ` · <span class="sl-bad">🔧 ${downs.length} står</span>` : ''}</div>
        <div class="sl-kd"><button type="button" class="main-btn" data-step="-1" aria-label="Föregående kommundel">‹</button><b>${kd ? esc(kd) : 'Hela kommunen'}</b><button type="button" class="main-btn" data-step="1" aria-label="Nästa kommundel">›</button></div>
        <div id="sl-map" class="sl-map"></div>
        <div id="sl-pick"></div>
        ${kd ? '' : `<div class="sl-rows">${kds.map(k => `<div class="sl-row" data-kd="${esc(k.name)}"><span>${esc(k.name)}</span><span class="sl-dots">${k.noTractor ? `<span class="sl-bad">⭕ ${k.noTractor}</span> ` : ''}<b>${k.done}/${k.total - k.noTractor}</b></span></div>`).join('')}</div>`}
        <div class="sl-legend"><span><i class="sl-lamp"></i>Inte påbörjad</span><span><i class="sl-lamp part"></i>Påbörjad</span><span><i class="sl-lamp done"></i>Klar</span><span><i class="sl-lamp ring"></i>Saknar traktor</span></div>`;
    } else {
      h += `<div class="sl-sub">Inget pågående snöfall${data.snowfall ? ' (senast ' + esc(String(data.snowfall.start).slice(5, 16)) + ')' : ''}.</div>`;
    }
    if (downs.length) h += `<div class="sl-stops">${downs.map(u => `<div class="ds-item" data-stopp="${esc(u.key)}">${lpvStopp.sceneHtml(u, 40)}<div class="ds-grow"><b>🔧 ${esc(u.label)}</b><span class="sl-sub">${esc(u.reasonText)} · ${esc(lpvStopp.etaText(u))}${lpvStopp.isLate(u) ? ' · <span class="sl-bad">⏱ försenad</span>' : ''} · ${u.left} kvar${u.handler ? ' · 🙋 ' + esc(u.handler) : ''}</span></div></div>`).join('')}</div>`;
    h += `<div class="sl-btns"><button type="button" class="main-btn main-btn-blue" onclick="location.href='snojour.html'">❄️ Snöjour – karta &amp; GPS</button>
      <button type="button" class="main-btn" onclick="location.href='planering.html'">🚜 Snöplanering</button>
      ${data.pagar ? '' : '<button type="button" class="main-btn" data-new>❄️ Nytt snöfall</button>'}</div>`;
    box.innerHTML = h;
    box.querySelectorAll('[data-step]').forEach(b => b.onclick = () => step(+b.dataset.step));
    box.querySelectorAll('[data-kd]').forEach(r => r.onclick = () => { kd = r.dataset.kd; pick = null; render(); });
    box.querySelectorAll('[data-stopp]').forEach(r => r.onclick = () => lpvStopp.openAdmin(r.dataset.stopp, { onChange: () => load() }));
    const nb = box.querySelector('[data-new]');
    if (nb) nb.onclick = async () => { if (!confirm('Starta ett nytt snöfall? Förarnas listor börjar om.')) return; await apiPost({ action: 'newSnowfall' }); load(); };
    if (data.pagar) drawMap(list, downs); else { if (map) { map.remove(); map = null; } }
    drawPick();
  }

  function step(d) {
    const names = [''].concat(data.kommundelar.map(k => k.name));
    kd = names[(names.indexOf(kd) + d + names.length) % names.length];
    pick = null; render();
  }

  async function drawMap(list, downs) {
    try { await leaflet(); } catch (e) { const m = $('sl-map'); if (m) m.innerHTML = '<div class="sl-sub">🗺️ Kartan kan inte visas utan täckning.</div>'; return; }
    const el = $('sl-map');
    if (!el) return;
    if (map) map.remove();
    map = L.map(el, { zoomControl: false, attributionControl: false }).setView(CENTER, 12);
    L.tileLayer(TILES, { maxZoom: 19 }).addTo(map);
    layers = [];
    const pts = [];
    list.filter(p => p.lat !== null).forEach(p => {
      const cls = p.noTractor ? 'ring' : p.state;
      const m = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', html: `<i class="sl-lamp ${cls}${p.priority ? ' prio' : ''}"></i>`, iconSize: [16, 16] }) }).addTo(map);
      m.on('click', () => { pick = p.id; drawPick(); });
      layers.push(m); pts.push([p.lat, p.lng]);
    });
    downs.filter(u => u.pos && (!kd || list.some(p => p.lat === u.pos[0] && p.lng === u.pos[1]))).forEach(u => {
      const m = L.marker(u.pos, { icon: L.divIcon({ className: '', html: lpvStopp.sceneHtml(u, 34), iconSize: [34, 34] }), zIndexOffset: 1000 }).addTo(map);
      m.on('click', () => lpvStopp.openAdmin(u.key, { onChange: () => load() }));
      layers.push(m);
    });
    if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [18, 18], maxZoom: 15 });
  }

  // Tryck på en lampa: adress, vem som kör, status och klockslag + Öppna i Snöplanering
  function drawPick() {
    const el = $('sl-pick');
    if (!el) return;
    const p = pick && data.properties.find(x => x.id === pick);
    if (!p) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="sl-pick"><div class="sl-row"><b>${p.priority ? '⭐ ' : ''}${esc(p.address)}</b><button type="button" class="main-btn" data-x aria-label="Stäng">✕</button></div>
      ${p.parts.length ? p.parts.map(x => `<div class="sl-sub">${x.part === 'traktor' ? '🚜' : '🧹'} ${esc(x.label)} · ${x.done ? '✅ ' + esc(x.done) : 'ej klar'}</div>`).join('') : '<div class="sl-sub sl-bad">⭕ Saknar traktor</div>'}
      <a class="sl-link" href="planering.html?p=${encodeURIComponent(p.id)}">Öppna i Snöplanering →</a></div>`;
    el.querySelector('[data-x]').onclick = () => { pick = null; drawPick(); };
  }

  // ===== Larmraden överst (admin, snösäsong, alla storlekar) =====
  function banner(stops) {
    const el = $('stopp-banner');
    if (!el) return;
    const downs = (stops && stops.units || []).filter(lpvStopp.isDown);
    el.innerHTML = downs.map(u => `<div class="draft-card stopp-card" data-stopp="${esc(u.key)}"><div class="card-body"><div class="card-title">🔧 ${esc(u.label)} står</div>
      <div class="card-meta" style="margin-top:4px;">${esc(u.reasonText)} · ${esc(lpvStopp.etaText(u))}${lpvStopp.isLate(u) ? ' · ⏱ försenad' : ''} · ${u.left} kvar${u.handler ? ' · 🙋 ' + esc(u.handler) + ' hanterar' : ''}</div></div>
      <div class="card-actions"><button class="btn-action">${u.handler ? 'Öppna' : '🙋 Öppna'}</button></div></div>`).join('');
    el.querySelectorAll('[data-stopp]').forEach(c => c.onclick = () => lpvStopp.openAdmin(c.dataset.stopp, { onChange: () => refreshBanner() }));
  }
  async function refreshBanner() {
    if (get('lpv_is_admin') !== 'true' || !window.lpvStopp) return;
    if (box && !box.hidden) { load(); return; }
    try { const r = await apiPost({ action: 'getStops' }); if (r.status === 'success') banner(r.stops); } catch (e) { /* ingen täckning */ }
  }

  window.lpvSnolage = {
    start(el) {
      box = el;
      if (!data) box.innerHTML = '<div class="section-label">❄️ Snöläget</div><div class="sl-sub">Hämtar… ⏳</div>';
      load();
      clearInterval(timer);
      timer = setInterval(() => { if (!document.hidden) load(); }, 60000);
    },
    stop() { clearInterval(timer); timer = null; box = null; if (map) { map.remove(); map = null; } },
    refreshBanner, ensureBanner
  };

  // Larmraden och SMS-länken (?stopp=traktor:T1) – admin, även i telefonen
  function boot() {
    const key = new URLSearchParams(location.search).get('stopp');
    if (key && window.lpvStopp && get('lpv_is_admin') === 'true') {
      try { const q = new URLSearchParams(location.search); q.delete('stopp'); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '')); } catch (e) { /* inget */ }
      lpvStopp.openAdmin(key, { onChange: () => refreshBanner() });
    }
    ensureBanner();
  }
  // Startar larmraden när det är snösäsong (anropas också av startspalt.js när appläget kommit från servern)
  let bannerTimer = null;
  function ensureBanner() {
    let lage = {};
    try { lage = JSON.parse(get('lpv_applage') || '{}'); } catch (e) { lage = {}; }
    if (!lage.sno || get('lpv_is_admin') !== 'true') { const el = $('stopp-banner'); if (el) el.innerHTML = ''; return; }
    if (!box) refreshBanner();
    if (!bannerTimer) bannerTimer = setInterval(() => { if (!document.hidden && !box) refreshBanner(); }, 120000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else setTimeout(boot, 0);
})();
