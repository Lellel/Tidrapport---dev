// Driftstopp – traktorn/handskottaren står (docs/snoplanering.md "Strandade traktorer och byten", 2026-11-07).
// Samma ruta i telefon, iPad och dator. Används av Snöjour (föraren rapporterar, 🆕 + 👍 Uppfattat),
// Snöplaneringen och startsidans ❄️ Snöläge (admin: ⏳ Vänta / 🔁 hela rundan / 🧩 fördela, Meddela förarna).
// Kräver driftstopp.css. API: window.lpvStopp.
(function () {
  const TRAKTOR = [['hydraul', '💦 Hydraulslang', 120], ['sand', '🪣 Sandspridaren', 30], ['punktering', '🛞 Punktering', 60], ['diesel', '⛽ Slut på diesel', 30],
    ['fast', '🧊 Fast i snön', 15], ['el', '💡 Elfel / lampor', 45], ['plogblad', '❄️ Plogbladet', 60], ['kyla', '🥶 Startar inte', 45], ['sjuk', '🤒 Föraren sjuk', 'resten'], ['annat', '❓ Annat', null]];
  const HAND = [['slunga', '🧹 Snöslungan', 60], ['skyffel', '🪓 Skyffeln gick av', 30], ['bil', '🚗 Bilen startar inte', 45], ['salt', '🧂 Slut på sand/salt', 30],
    ['frusen', '🥶 Frusen', 30], ['sjuk', '🤒 Sjuk', 'resten'], ['annat', '❓ Annat', null]];

  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = (payload) => (typeof snoApi === 'function' ? snoApi(payload) : apiPost(payload));
  const me = () => { try { return (localStorage.getItem('lpv_user') || localStorage.getItem('lpv_user_name') || '').trim(); } catch (e) { return ''; } };
  // Startsidan har eget stilsystem (style.css), övriga sidor theme.css
  const themed = () => !!document.querySelector('link[href="theme.css"]');
  const btn = (kind) => themed() ? 'lpv-btn ' + (kind || '') : 'main-btn' + (kind && /primary/.test(kind) ? ' main-btn-blue' : '');
  const hhmm = (ms) => { const d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const etaText = (u) => u.eta === 'resten' ? '⏱ resten av passet' : typeof u.eta === 'number' ? '⏱ åter ~' + hhmm(u.eta) : '⏱ vet inte när';
  const isDown = (u) => u && !u.back;
  const isLate = (u) => isDown(u) && typeof u.eta === 'number' && Date.now() > u.eta;

  // ===== Kulan som står =====
  const FX = {
    hydraul: '<div class="ds-fx ds-dx"><div class="ds-dy"></div></div>'.repeat(5) + '<div class="ds-fx ds-puddle"></div>',
    sand: '<div class="ds-fx ds-disc"></div>' + '<div class="ds-fx ds-puff"></div>'.repeat(3),
    punktering: '<div class="ds-fx ds-air"></div>'.repeat(3) + '<span class="ds-fx ds-txt">pfff…</span>',
    diesel: '<div class="ds-fx ds-gauge"><div class="ds-needle"></div></div><div class="ds-fx ds-ring"></div><span class="ds-fx ds-zzz">💤</span>',
    fast: '<div class="ds-fx ds-mound"></div>' + '<div class="ds-fx ds-flake"></div>'.repeat(4),
    el: '<div class="ds-fx ds-beam b1"></div><div class="ds-fx ds-beam b2"></div><span class="ds-fx ds-spark">⚡</span>',
    plogblad: '<div class="ds-fx ds-blade"></div><div class="ds-fx ds-bolt"></div>',
    kyla: '<div class="ds-fx ds-ice i1"></div><div class="ds-fx ds-ice i2"></div><div class="ds-fx ds-ice i3"></div><div class="ds-fx ds-ice i4"></div><span class="ds-fx ds-txt">brrr</span>',
    sjuk: '<div class="ds-fx ds-thermo"><div class="ds-merc"></div></div><span class="ds-fx ds-tea">☕</span>' + '<div class="ds-fx ds-steam"></div>'.repeat(3),
    annat: '<div class="ds-fx ds-smoke"></div>'.repeat(3),
    slunga: '<div class="ds-fx ds-ball"></div><span class="ds-fx ds-txt">*hack*</span>',
    skyffel: '<div class="ds-fx ds-shaft"></div><div class="ds-fx ds-shaft top"></div><div class="ds-fx ds-scoop"></div><span class="ds-fx ds-txt">boing!</span>',
    bil: '<span class="ds-fx ds-car">🚗</span>' + '<div class="ds-fx ds-exh"></div>'.repeat(2) + '<span class="ds-fx ds-txt">rrr-rrr…</span>',
    salt: '<div class="ds-fx ds-bucket"></div><div class="ds-fx ds-grain"></div>'
  };
  FX.frusen = FX.kyla;
  const handQ = '<span class="ds-fx ds-q">❓</span>';
  // u: { part, reason, avatarUrl }. px = kulans storlek (84 = fullstor scen). badge: 🔧 Ur drift-brickan.
  function sceneHtml(u, px, badge) {
    const reason = u.reason || 'annat';
    const cls = 'ds-scene ds-live ds-s-' + reason + (reason === 'kyla' || reason === 'frusen' ? ' ds-frost' : '');
    const inner = u.avatarUrl ? `<img src="${esc(u.avatarUrl)}" alt="">` : (u.part === 'hand' ? '🧹' : '🚜');
    const fx = u.part === 'hand' && reason === 'annat' ? handQ : (FX[reason] || FX.annat);
    const scene = `<div class="${cls}">${badge ? '<span class="ds-badge">🔧 Ur drift</span>' : ''}<div class="ds-orb">${inner}</div>${fx}</div>`;
    if (!px || px === 84) return scene;
    const s = px / 84;
    return `<div class="ds-mini" style="width:${px}px;height:${px}px">${scene.replace('class="ds-scene', `style="left:${-33 * s}px;top:${-22 * s}px;transform:scale(${s})" class="ds-scene`)}</div>`;
  }

  // ===== Rutan =====
  let overlay = null;
  function close() { if (overlay) { overlay.remove(); overlay = null; } }
  function sheet(html) {
    close();
    overlay = document.createElement('div');
    overlay.className = 'ds-overlay';
    overlay.innerHTML = `<div class="ds-sheet" role="dialog" aria-modal="true">${html}</div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    return overlay.querySelector('.ds-sheet');
  }
  const closeBtn = `<button type="button" class="${btn('small')} ds-close" data-close>✕ Stäng</button>`;
  function wire(el) { el.querySelectorAll('[data-close]').forEach(b => b.onclick = close); }
  const say = (el, t, bad) => { const m = el.querySelector('.ds-msg'); if (m) { m.textContent = t; m.classList.toggle('ds-bad', !!bad); } };
  const fail = (res) => (res && res.message) || 'Ingen kontakt med servern.';
  async function call(payload) { try { return await api(payload); } catch (e) { return { status: 'error', message: 'Ingen kontakt med servern.' }; } }

  // Klockslaget: nu + standardtiden för orsaken, avrundat uppåt till kvart
  function defaultTime(mins) {
    const d = new Date(Date.now() + (mins || 30) * 60000);
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    return hhmm(d.getTime());
  }
  function timeToMs(v) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(v || '');
    if (!m) return null;
    const d = new Date(); d.setHours(+m[1], +m[2], 0, 0);
    if (d.getTime() < Date.now() - 30 * 60000) d.setDate(d.getDate() + 1); // efter midnatt
    return d.getTime();
  }

  // ⚠️ Traktorn står – föraren (eller UE-ansvarig/admin för någon annan). units: [{ part, unit, label }]
  function openReport(units, onDone) {
    if (!units || !units.length) return;
    let unit = units[0], reason = '', eta = null, etaMode = 'tid';
    function draw() {
      const list = unit.part === 'hand' ? HAND : TRAKTOR;
      const el = sheet(`
        <div class="ds-head"><h2>⚠️ ${unit.part === 'hand' ? 'Jag kan inte fortsätta' : 'Traktorn står'}</h2>${closeBtn}</div>
        ${units.length > 1 ? `<div class="ds-row">${units.map((x, i) => `<button type="button" class="${themed() ? 'lpv-chip' : 'main-btn'} ${x === unit ? 'on' : ''}" aria-pressed="${x === unit}" data-unit="${i}">${x.part === 'hand' ? '🧹' : '🚜'} ${esc(x.label)}</button>`).join('')}</div>` : `<div class="ds-sub">${unit.part === 'hand' ? '🧹' : '🚜'} ${esc(unit.label)}</div>`}
        <div class="ds-sub">Vad har hänt?</div>
        <div class="ds-grid">${list.map(([k, t]) => `<button type="button" class="${themed() ? 'lpv-toggle' : 'main-btn'}" aria-pressed="${reason === k}" data-reason="${k}">${esc(t)}</button>`).join('')}</div>
        <div class="ds-sub">Igång igen ca</div>
        <div class="ds-time"><input type="time" step="900" id="ds-eta" value="${esc(eta || defaultTime(30))}" ${etaMode !== 'tid' ? 'disabled' : ''} aria-label="Igång igen ca">
          <button type="button" class="${themed() ? 'lpv-toggle' : 'main-btn'}" aria-pressed="${etaMode === 'vet'}" data-vet>Vet inte</button></div>
        <button type="button" class="${btn('primary big block')}" data-send>⚠️ Skicka till arbetsledningen</button>
        <div class="ds-msg"></div>`);
      wire(el);
      el.querySelectorAll('[data-unit]').forEach(b => b.onclick = () => { unit = units[+b.dataset.unit]; reason = ''; draw(); });
      el.querySelectorAll('[data-reason]').forEach(b => b.onclick = () => {
        reason = b.dataset.reason;
        const def = list.find(x => x[0] === reason)[2];
        etaMode = def === null ? 'vet' : def === 'resten' ? 'resten' : 'tid';
        eta = typeof def === 'number' ? defaultTime(def) : eta;
        draw();
      });
      el.querySelector('#ds-eta').onchange = (e) => { eta = e.target.value; };
      el.querySelector('[data-vet]').onclick = () => { etaMode = etaMode === 'vet' ? 'tid' : 'vet'; draw(); };
      if (etaMode === 'resten') el.querySelector('.ds-time').insertAdjacentHTML('afterend', '<div class="ds-sub">⏱ Resten av passet</div>');
      el.querySelector('[data-send]').onclick = async () => {
        if (!reason) { say(el, '⚠️ Välj vad som har hänt.', true); return; }
        say(el, 'Skickar… ⏳');
        const v = etaMode === 'vet' ? null : etaMode === 'resten' ? 'resten' : timeToMs(el.querySelector('#ds-eta').value);
        const res = await call({ action: 'reportStop', part: unit.part, unit: unit.unit, reason, eta: v });
        if (res.status !== 'success') { say(el, '❌ ' + fail(res), true); return; }
        close();
        if (onDone) onDone(res.stops, res.sms);
      };
    }
    draw();
  }

  // Ändra tiden (föraren eller admin)
  function openEta(u, onDone) {
    const el = sheet(`<div class="ds-head"><h2>⏱ Igång igen ca</h2>${closeBtn}</div>
      <div class="ds-time"><input type="time" step="900" id="ds-eta" value="${typeof u.eta === 'number' ? hhmm(u.eta) : defaultTime(30)}" aria-label="Igång igen ca"></div>
      <div class="ds-row"><button type="button" class="${btn('primary')}" data-save>💾 Spara</button><button type="button" class="${btn()}" data-resten>Resten av passet</button><button type="button" class="${btn()}" data-vet>Vet inte</button></div>
      <div class="ds-msg"></div>`);
    wire(el);
    const send = async (payload) => { const res = await call({ action: 'stopUpdate', stop: u.key, ...payload }); if (res.status !== 'success') { say(el, '❌ ' + fail(res), true); return; } close(); if (onDone) onDone(res.stops); };
    el.querySelector('[data-save]').onclick = () => send({ op: 'eta', eta: timeToMs(el.querySelector('#ds-eta').value) });
    el.querySelector('[data-resten]').onclick = () => send({ op: 'resten' });
    el.querySelector('[data-vet]').onclick = () => send({ op: 'eta', eta: null });
  }

  // ===== Snöjour: min egen status, mjukfrågan och kollegor som står =====
  // mine: nycklar ("traktor:T1") som jag får rapportera för. Ritar i box; onChange(stops) när något ändrats.
  function renderJour(box, stops, mineUnits, onChange) {
    if (!box) return;
    const units = (stops && stops.units || []).filter(isDown);
    const mineKeys = mineUnits.map(x => x.part + ':' + x.unit);
    const own = units.filter(u => mineKeys.includes(u.key));
    const others = units.filter(u => !mineKeys.includes(u.key));
    let h = own.map(u => `<div class="ds-card" data-key="${esc(u.key)}">
        <div class="ds-row">${sceneHtml(u, 56)}<div class="ds-grow"><b>🔧 ${esc(u.short || u.label)} står</b><div class="ds-sub">${esc(u.reasonText)} · ${esc(etaText(u))}${u.handler ? ' · 🙋 ' + esc(u.handler) + ' hanterar' : ''}</div></div></div>
        ${isLate(u) ? `<div class="ds-row"><b class="ds-grow">Igång igen?</b></div>
          <div class="ds-row"><button type="button" class="${btn('go')}" data-op="back">✅ Ja</button><button type="button" class="${btn()}" data-op="plus30">⏱ +30 min</button><button type="button" class="${btn()}" data-op="resten">Nej, resten av passet</button></div>`
        : `<div class="ds-row"><button type="button" class="${btn('go')}" data-op="back">✅ Igång igen</button><button type="button" class="${btn()}" data-op="eta">⏱ Ändra tid</button></div>`}
      </div>`).join('');
    const free = mineUnits.filter(x => !own.some(u => u.key === x.part + ':' + x.unit));
    if (free.length) h += `<button type="button" class="${btn('block')}" data-report>⚠️ ${free.every(x => x.part === 'hand') ? 'Jag kan inte fortsätta' : 'Traktorn står'}</button>`;
    if (others.length) h += `<div class="ds-card"><b>🔧 Ur drift nu</b>${others.map(u => `<div class="ds-item" data-key="${esc(u.key)}">${sceneHtml(u, 40)}<div class="ds-grow"><b>${esc(u.label)}</b><span class="ds-sub">${esc(u.reasonText)} · ${esc(etaText(u))}</span></div></div>`).join('')}</div>`;
    box.innerHTML = h;
    box.querySelectorAll('[data-op]').forEach(b => b.onclick = async () => {
      const u = own.find(x => x.key === b.closest('[data-key]').dataset.key);
      if (b.dataset.op === 'eta') { openEta(u, onChange); return; }
      b.disabled = true;
      const res = await call({ action: 'stopUpdate', stop: u.key, op: b.dataset.op });
      if (res.status !== 'success') { b.disabled = false; alert('❌ ' + fail(res)); return; }
      if (onChange) onChange(res.stops);
    });
    const rb = box.querySelector('[data-report]');
    if (rb) rb.onclick = () => openReport(free, (s, sms) => { if (onChange) onChange(s); if (sms && sms.notConfigured) alert('⚠️ SMS är inte inställt – ring arbetsledningen.'); });
  }

  // 🆕 på kort som flyttats hit + 👍 Uppfattat (mjukfråga, låser ingenting)
  function movedHtml(p, myUnitKeys) {
    const m = (p.moved || []).filter(x => !myUnitKeys || myUnitKeys.includes(x.part + ':' + x.to));
    if (!m.length) return '';
    const acked = m.every(x => x.ack);
    return `<div class="ds-row"><span class="ds-new">🆕 från ${esc(m[0].fromLabel)}</span>${acked ? '<span class="ds-done">✓ Uppfattat</span>' : `<button type="button" class="${btn('small')}" data-ack="${esc(p.id)}">👍 Uppfattat</button>`}</div>`;
  }
  async function ack(pid) { return call({ action: 'stopAck', propertyId: pid }); }

  // ===== Admin: hela flödet för en enhet som står =====
  // opts: { onChange(stops) }
  async function openAdmin(key, opts) {
    opts = opts || {};
    let el = sheet(`<div class="ds-head"><h2>🔧 Hämtar…</h2>${closeBtn}</div>`); wire(el);
    let res = await call({ action: 'getStops' });
    if (res.status !== 'success') { el.innerHTML = `<div class="ds-head"><h2>❌ ${esc(fail(res))}</h2>${closeBtn}</div>`; wire(el); return; }
    let stops = res.stops, u = stops.units.find(x => x.key === key);
    if (!u) { el.innerHTML = `<div class="ds-head"><h2>Inget driftstopp</h2>${closeBtn}</div><div class="ds-sub">Det är redan löst, eller ett nytt snöfall har startat.</div>`; wire(el); return; }
    const changed = (s) => { if (s) stops = s; if (opts.onChange) opts.onChange(stops); };
    let sug = null;

    function header() {
      return `<div class="ds-head">${sceneHtml(u, 84, true)}<div class="ds-grow"><h2>${esc(u.label)} står</h2>
        <div class="ds-sub">${esc(u.reasonText)} · ${esc(etaText(u))}${isLate(u) ? ' · <span class="ds-late">⏱ försenad</span>' : ''}</div>
        <div class="ds-sub">${u.left} kvar${u.leftPriority ? ` (${u.leftPriority} ⭐)` : ''} · rapporterat ${esc(hhmm(u.at))} av ${esc(u.by)}</div></div>${closeBtn}</div>`;
    }
    function handlerRow() {
      return u.handler ? `<div class="ds-row"><span class="ds-grow">🙋 <b>${esc(u.handler === me() ? 'Du' : u.handler)}</b> hanterar</span>${u.handler !== me() ? `<button type="button" class="${btn('small')}" data-take>Ta över</button>` : ''}</div>`
        : `<button type="button" class="${btn()}" data-take>🙋 Jag tar det</button>`;
    }
    function footer() {
      return `<div class="ds-row">${u.phone ? `<a class="${btn()}" href="tel:${esc(u.phone.replace(/[^\d+]/g, ''))}">📞 Ring ${esc(u.driver || 'föraren')}</a>` : ''}
        <button type="button" class="${btn()}" data-eta>⏱ Ändra tid</button><button type="button" class="${btn('go')}" data-back>✅ Tillbaka i drift</button></div><div class="ds-msg"></div>`;
    }
    function wireCommon() {
      wire(el);
      el.querySelectorAll('[data-take]').forEach(b => b.onclick = async () => { const r = await call({ action: 'stopUpdate', stop: key, op: 'take' }); if (r.status !== 'success') return say(el, '❌ ' + fail(r), true); changed(r.stops); u = stops.units.find(x => x.key === key) || u; main(); });
      const eb = el.querySelector('[data-eta]'); if (eb) eb.onclick = () => openEta(u, (s) => { changed(s); openAdmin(key, opts); });
      const bb = el.querySelector('[data-back]'); if (bb) bb.onclick = async () => { const r = await call({ action: 'stopUpdate', stop: key, op: 'back' }); if (r.status !== 'success') return say(el, '❌ ' + fail(r), true); changed(r.stops); close(); };
    }

    async function main() {
      el.innerHTML = header() + handlerRow() + `<div class="ds-msg">Räknar ut förslag… ⏳</div>`;
      wireCommon();
      if (!sug) { sug = await call({ action: 'stopSuggest', stop: key }); }
      if (sug.status !== 'success') { el.innerHTML = header() + handlerRow() + footer(); wireCommon(); say(el, '❌ ' + fail(sug), true); return; }
      const rec = sug.recommend;
      const why = rec === 'vanta' ? `Åter inom ${sug.limit} min – det blir bara en fördröjning.` : typeof u.eta === 'number' ? `Mer än ${sug.limit} min${sug.limit === 15 ? ' och ⭐ prio kvar' : ''} – flytta det som är kvar.` : 'Ingen tid angiven – flytta det som är kvar.';
      const choice = (k, icon, title, sub) => `<button type="button" class="${btn(k === rec ? 'primary block' : 'block')}" data-choice="${k}">${icon} ${title}</button>${k === rec ? `<div class="ds-rec">Rekommenderas: ${esc(why)}</div>` : ''}${sub ? `<div class="ds-sub">${sub}</div>` : ''}`;
      const order = rec === 'vanta' ? ['vanta', 'hela', 'fordela'] : ['fordela', 'hela', 'vanta'];
      const C = { vanta: choice('vanta', '⏳', 'Vänta', 'Inget flyttas. Kulan behåller sina fastigheter.'),
        hela: choice('hela', '🔁', 'En annan traktor tar hela rundan', ''), fordela: choice('fordela', '🧩', 'Fördela det som är kvar', '') };
      el.innerHTML = header() + handlerRow() + (u.decision === 'vanta' ? '<div class="ds-card">⏳ Ni väntar. Kulan behåller sina fastigheter.</div>' : '') +
        (sug.remaining.length ? `<div class="ds-stack">${order.map(k => C[k]).join('')}</div>` : '<div class="ds-card">✅ Inget kvar att flytta.</div>') + footer();
      wireCommon();
      el.querySelectorAll('[data-choice]').forEach(b => b.onclick = () => ({ vanta: wait, hela: whole, fordela: split })[b.dataset.choice]());
    }

    async function wait() {
      const r = await call({ action: 'stopUpdate', stop: key, op: 'wait' });
      if (r.status !== 'success') return say(el, '❌ ' + fail(r), true);
      changed(r.stops); u = stops.units.find(x => x.key === key) || u; main();
    }

    function whole() {
      const list = sug.whole;
      el.innerHTML = header() + `<b>🔁 Vem tar hela rundan (${sug.remaining.length})?</b>` +
        (list.length ? `<div class="ds-stack">${list.map(w => `<button type="button" class="${btn('block')}" data-to="${esc(w.unit)}" ${w.fitsAll ? '' : 'disabled'}>
          ${u.part === 'hand' ? '🧹' : '🚜'} ${esc(w.label)} · ${w.left ? w.left + ' kvar' : 'ledig'}${w.km !== null ? ' · ' + String(w.km).replace('.', ',') + ' km' : ''}${w.fitsAll ? '' : ' · ⚠️ för stor'}</button>`).join('')}</div>`
          : '<div class="ds-card">Ingen annan är i drift.</div>') +
        `<button type="button" class="${btn()}" data-backto>← Tillbaka</button><div class="ds-msg"></div>`;
      wire(el);
      el.querySelector('[data-backto]').onclick = main;
      el.querySelectorAll('[data-to]').forEach(b => b.onclick = () => move(sug.remaining.map(p => ({ propertyId: p.id, to: b.dataset.to }))));
    }

    function split() {
      el.innerHTML = header() + `<b>🧩 Fördela det som är kvar</b><div class="ds-sub">Förslaget: närmaste som passar, de med minst kvar först. Tryck för att ändra.</div>` +
        `<div class="ds-stack">${sug.remaining.map(p => `<div class="ds-card"><div class="ds-prop">${p.priority ? '⭐ ' : ''}${esc(p.address)}</div>
          <select data-pid="${esc(p.id)}" aria-label="Vem tar ${esc(p.address)}">${p.suggest ? '' : '<option value="">⚠️ ingen passar – välj</option>'}${p.options.map(o => `<option value="${esc(o.unit)}" ${o.unit === p.suggest ? 'selected' : ''} ${o.fits ? '' : 'disabled'}>${esc(o.label)}${o.km !== null ? ' · ' + String(o.km).replace('.', ',') + ' km' : ''} · ${o.left} kvar${o.fits ? '' : ' · för stor'}</option>`).join('')}</select></div>`).join('')}</div>
        <button type="button" class="${btn('primary block')}" data-confirm>✅ Bekräfta</button><button type="button" class="${btn()}" data-backto>← Tillbaka</button><div class="ds-msg"></div>`;
      wire(el);
      el.querySelector('[data-backto]').onclick = main;
      el.querySelector('[data-confirm]').onclick = () => {
        const moves = [...el.querySelectorAll('select[data-pid]')].filter(s => s.value).map(s => ({ propertyId: s.dataset.pid, to: s.value }));
        if (!moves.length) return say(el, '⚠️ Välj vem som tar fastigheterna.', true);
        move(moves);
      };
    }

    async function move(moves) {
      say(el, 'Flyttar… ⏳');
      const r = await call({ action: 'stopMove', stop: key, moves });
      if (r.status !== 'success') return say(el, '❌ ' + fail(r), true);
      changed(r.stops);
      notify(r.receivers);
    }

    // Meddela förarna: appen är redan uppdaterad. 📞 Ring / 💬 SMS per förare – inget skickas automatiskt.
    function notify(receivers) {
      const n = receivers.reduce((s, x) => s + x.addresses.length, 0);
      el.innerHTML = `<div class="ds-head"><h2>✅ Flyttat – ${n} ${n === 1 ? 'fastighet' : 'fastigheter'}</h2>${closeBtn}</div>
        <div class="ds-sub">Appen är uppdaterad – korten har 🆕 i Snöjour. Vill du ringa eller skicka SMS också?</div>
        <div class="ds-stack">${receivers.map((x, i) => `<div class="ds-card" data-i="${i}"><b>${esc(x.label)} · +${x.addresses.length}</b><div class="ds-sub">${esc(x.addresses.join(', '))}</div>
          <div class="ds-row">${x.phone ? `<a class="${btn()}" href="tel:${esc(x.phone.replace(/[^\d+]/g, ''))}" data-ring>📞 Ring</a>` : '<span class="ds-sub">Inget nummer</span>'}
          ${x.phone ? `<button type="button" class="${btn()}" data-sms>💬 SMS</button>` : ''}<span class="ds-done" data-st></span></div></div>`).join('')}</div>
        <button type="button" class="${btn('primary block')}" data-close>Klar</button><div class="ds-msg"></div>`;
      wire(el);
      el.querySelectorAll('[data-i]').forEach(card => {
        const x = receivers[+card.dataset.i], st = card.querySelector('[data-st]');
        const ring = card.querySelector('[data-ring]'); if (ring) ring.addEventListener('click', () => { st.textContent = '✓ Ringd'; });
        const sb = card.querySelector('[data-sms]');
        if (sb) sb.onclick = async () => {
          sb.disabled = true; st.textContent = 'Skickar…';
          const r = await call({ action: 'stopSms', stop: key, to: x.driver, text: x.smsText });
          if (r.status === 'success') { st.textContent = '✓ SMS skickat'; return; }
          sb.disabled = false; st.textContent = '';
          if (r.code === 'not_configured') location.href = `sms:${x.phone.replace(/[^\d+]/g, '')}&body=${encodeURIComponent(x.smsText)}`;
          else say(el, '❌ ' + fail(r), true);
        };
      });
    }
    main();
  }

  // Traktormenyn (tavlan, traktorlistan): står den → hela flödet, annars 🚨 / 👤 Byt förare / 📞 Ring
  // t: { part, unit, label, driver }, ctx: { stops, drivers: [namn], onChange }
  function openUnitMenu(t, ctx) {
    ctx = ctx || {};
    const key = t.part + ':' + t.unit;
    const down = (ctx.stops && ctx.stops.units || []).find(x => x.key === key && isDown(x));
    if (down) { openAdmin(key, { onChange: ctx.onChange }); return; }
    const phone = ctx.stops && ctx.stops.phones ? ctx.stops.phones[t.driver] : '';
    const el = sheet(`<div class="ds-head"><h2>${t.part === 'hand' ? '🧹' : '🚜'} ${esc(t.label)}</h2>${closeBtn}</div>
      <div class="ds-stack">
        <button type="button" class="${btn('block')}" data-stop>🚨 ${t.part === 'hand' ? 'Kan inte fortsätta' : 'Traktorn står'}</button>
        ${t.part === 'traktor' ? `<button type="button" class="${btn('block')}" data-swap>👤 Byt förare</button>` : ''}
        ${phone ? `<a class="${btn('block')}" href="tel:${esc(phone.replace(/[^\d+]/g, ''))}">📞 Ring ${esc(t.driver)}</a>` : ''}
      </div><div class="ds-msg"></div>`);
    wire(el);
    el.querySelector('[data-stop]').onclick = () => openReport([t], (s) => { if (ctx.onChange) ctx.onChange(s); openAdmin(key, { onChange: ctx.onChange }); });
    const sw = el.querySelector('[data-swap]');
    if (sw) sw.onclick = () => {
      const names = (ctx.drivers || []).filter(n => n !== t.driver);
      const e2 = sheet(`<div class="ds-head"><h2>👤 Byt förare på ${esc(t.label)}</h2>${closeBtn}</div>
        <div class="ds-sub">Samma traktor och runda. Gäller tills du byter tillbaka.</div>
        <select id="ds-drv"><option value="">– Ingen förare –</option>${names.map(n => `<option>${esc(n)}</option>`).join('')}</select>
        <button type="button" class="${btn('primary block')}" data-save>💾 Byt förare</button><div class="ds-msg"></div>`);
      wire(e2);
      e2.querySelector('[data-save]').onclick = async () => {
        const r = await call({ action: 'stopSwapDriver', tractorId: t.unit, driver: e2.querySelector('#ds-drv').value });
        if (r.status !== 'success') return say(e2, '❌ ' + fail(r), true);
        close(); if (ctx.onSwap) ctx.onSwap(r.tractor);
      };
    };
  }

  window.lpvStopp = { sceneHtml, openReport, openAdmin, openUnitMenu, renderJour, movedHtml, ack, close, isDown, isLate, etaText, TRAKTOR, HAND };
})();
