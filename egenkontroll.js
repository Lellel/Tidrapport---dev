// Egenkontroll i fält: mallen (från Kod.gs, EK_TEMPLATES) fylls i punkt för punkt med
// ja/nej/ej aktuellt, mätvärden, text och foton. Avvikelser kräver en åtgärd. Signerad
// kontroll blir en PDF. Sparas löpande; utan täckning ligger ändringarna kvar i telefonen.
// Använder apiPost, drafts, saveDraftsToStorage och isAdmin från app.js.
(function () {
  let templates = null;
  let ek = null;              // egenkontrollen som är öppen
  let draftId = null;
  let pending = {};           // ändrade svar som inte har sparats än
  let saveTimer = null, saveState = '';
  let listMode = false, list = [];

  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* fullt */ } }, del: (k) => { try { localStorage.removeItem(k); } catch (e) { /* - */ } } };
  const admin = () => typeof isAdmin !== 'undefined' && isAdmin;
  const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const pendingKey = () => 'lpv_ek_pending:' + (ek && ek.id ? ek.id : 'draft' + draftId);

  // Vilken mall ett pass hör till (null = ingen egenkontroll)
  function templateFor(d) {
    if (!templates) { try { templates = JSON.parse(store.get('lpv_ek_templates') || 'null'); } catch (e) { templates = null; } }
    const text = `${d.activity || ''} ${d.place || ''}`;
    if (/linje/i.test(text)) return null; // linjemålning får en egen mall
    const fallback = { fasad: 'fasad|målning|måla|fönster|snickeri' };
    const all = templates || {};
    const key = Object.keys(all).length ? Object.keys(all).find(k => new RegExp(all[k].match, 'i').test(text))
      : Object.keys(fallback).find(k => new RegExp(fallback[k], 'i').test(text));
    return key || null;
  }
  window.ekTemplateFor = templateFor;

  // Samma regler som ekCheck i Kod.gs
  function check(tpl, answers) {
    const missing = [], deviations = [];
    tpl.sections.forEach(sec => sec.items.forEach(it => {
      const key = sec.id + '.' + it.id, a = answers[key] || {}, v = a.v;
      const empty = it.type === 'photo' ? !(a.photos && a.photos.length) : (v === undefined || v === null || v === '');
      if (empty) { if (it.req) missing.push(key); return; }
      const n = Number(String(v).replace(',', '.'));
      if ((it.type === 'check' && v === 'nej') || (it.type === 'number' && ((it.min !== undefined && n < it.min) || (it.max !== undefined && n > it.max)))) {
        deviations.push({ key, note: String(a.note || '') });
      }
    }));
    return { missing, deviations, withoutAction: deviations.filter(d => !d.note.trim()) };
  }

  function answers() {
    const out = JSON.parse(JSON.stringify((ek && ek.answers) || {}));
    Object.keys(pending).forEach(k => { out[k] = { ...(out[k] || {}), ...pending[k] }; });
    return out;
  }

  // ---------- RITA ----------
  function itemHtml(sec, it, a, locked, isDev) {
    const key = sec.id + '.' + it.id;
    const dis = locked ? 'disabled' : '';
    let input = '';
    if (it.type === 'check') {
      const b = (v, t) => `<button class="ek-opt ${a.v === v ? 'on ' + v : ''}" ${dis} onclick="ekSet('${key}','v','${v}')">${t}</button>`;
      input = `<div class="ek-opts">${b('ja', '✔ Ja')}${b('nej', '✘ Nej')}${b('ea', 'Ej aktuellt')}</div>`;
    } else if (it.type === 'number') {
      const lim = [it.min !== undefined ? `minst ${it.min}` : '', it.max !== undefined ? `högst ${it.max}` : ''].filter(Boolean).join(', ');
      input = `<div class="ek-num"><input class="ek-input" inputmode="decimal" ${dis} value="${esc(a.v ?? '')}" onchange="ekSet('${key}','v',this.value)"><span>${esc(it.unit || '')}</span>${lim ? `<small>${lim}</small>` : ''}</div>`;
    } else if (it.type === 'date') {
      input = `<input class="ek-input" type="date" ${dis} value="${esc(a.v || '')}" onfocus="if(!this.value){this.value='${today()}'; ekSet('${key}','v',this.value)}" onchange="ekSet('${key}','v',this.value)">`;
    } else if (it.type === 'text') {
      input = `<input class="ek-input" ${dis} value="${esc(a.v || '')}" placeholder="${esc(it.help || '')}" onchange="ekSet('${key}','v',this.value)">`;
    } else if (it.type === 'photo') {
      input = `<div class="ek-photos">${(a.photos || []).map(p => `<img src="https://drive.google.com/thumbnail?id=${encodeURIComponent(p)}&sz=w300" alt="">`).join('')}
        ${locked ? '' : `<label class="ek-btn">📷 Ta foto<input type="file" accept="image/*" capture="environment" style="display:none" onchange="ekPhoto('${key}', this.files[0])"></label>`}<span class="ek-muted" id="ekmsg-${key.replace('.', '-')}"></span></div>`;
    }
    const help = it.help && it.type !== 'text' ? `<div class="ek-muted">${esc(it.help)}</div>` : '';
    const note = isDev || a.note ? `<textarea class="ek-input ek-note ${isDev && !String(a.note || '').trim() ? 'need' : ''}" ${dis} rows="2" placeholder="${isDev ? 'Avvikelse – vilken åtgärd har gjorts? (krävs)' : 'Kommentar'}" onchange="ekSet('${key}','note',this.value)">${esc(a.note || '')}</textarea>`
      : (locked ? '' : `<button class="ek-link" onclick="ekSet('${key}','note',' '); ekRender()">+ kommentar</button>`);
    return `<div class="ek-item ${isDev ? 'dev' : ''}"><div class="ek-label">${esc(it.label)}${it.req ? '' : ' <span class="ek-muted">(valfri)</span>'}</div>${help}${input}${note}</div>`;
  }

  function formHtml() {
    const tpl = templates[ek.template];
    const ans = answers();
    const c = check(tpl, ans);
    const devKeys = new Set(c.deviations.map(d => d.key));
    const locked = ek.status === 'klar';
    const total = tpl.sections.reduce((n, s) => n + s.items.filter(i => i.req).length, 0);
    return `<div class="ek-title">✅ ${esc(tpl.name)}</div>
      <div class="ek-muted">${esc(ek.id || 'Ny')} · ${esc(ek.customer || '')} ${esc(ek.place || '')} ${ek.link ? '· ' + esc(ek.link) : ''}</div>
      ${!ek.id ? `<div class="ek-grid"><input class="ek-input" placeholder="Kund" value="${esc(ek.customer || '')}" onchange="ekMeta('customer',this.value)"><input class="ek-input" placeholder="Plats/adress" value="${esc(ek.place || '')}" onchange="ekMeta('place',this.value)"></div>` : ''}
      ${locked ? `<div class="ek-ok">Signerad av ${esc(ek.signedBy)} ${esc(ek.signed)}. ${ek.pdfUrl ? `<a href="${esc(ek.pdfUrl)}" target="_blank" rel="noopener">📄 Öppna PDF</a>` : ''}</div>` : ''}
      <div class="ek-progress">${total - c.missing.length} av ${total} obligatoriska punkter klara${c.deviations.length ? ` · <b class="ek-red">${c.deviations.length} avvikelse${c.deviations.length > 1 ? 'r' : ''}</b>` : ''} <span class="ek-save">${esc(saveState)}</span></div>
      ${tpl.sections.map(sec => `<div class="ek-sec"><div class="ek-sectitle">${esc(sec.title)}</div>${sec.items.map(it => itemHtml(sec, it, ans[sec.id + '.' + it.id] || {}, locked, devKeys.has(sec.id + '.' + it.id))).join('')}</div>`).join('')}
      ${locked ? '' : `<div class="ek-sec"><div class="ek-sectitle">Signera</div>
        ${c.missing.length ? `<div class="ek-warn">${c.missing.length} obligatoriska punkter saknas.</div>` : ''}
        ${c.withoutAction.length ? `<div class="ek-warn">${c.withoutAction.length} avvikelse${c.withoutAction.length > 1 ? 'r' : ''} saknar åtgärd.</div>` : ''}
        <input class="ek-input" id="ek-signname" placeholder="Ditt namn" value="${esc(typeof currentUser !== 'undefined' ? currentUser : '')}">
        <button class="ek-big" ${c.missing.length || c.withoutAction.length || !ek.id ? 'disabled' : ''} onclick="ekSign()">✍️ Signera egenkontrollen</button>
        <div class="ek-muted">Efter signering går den inte att ändra, och en PDF skapas.</div></div>`}`;
  }

  function listHtml() {
    return `<div class="ek-title">📂 Egenkontroller</div>${list.length ? list.map(e => `<button class="ek-row" onclick="ekOpenId('${esc(e.id)}')">
        <b>${esc(e.customer || e.place || e.id)}</b> <span class="ek-muted">${esc(e.id)} · ${esc(e.created)} · ${esc(e.createdBy)}</span>
        <span class="ek-badge ${e.status === 'klar' ? 'ok' : ''}">${e.status === 'klar' ? 'Signerad' : 'Pågår'}</span></button>`).join('') : '<div class="ek-muted">Inga egenkontroller ännu.</div>'}`;
  }

  function render() {
    let m = document.getElementById('ek-modal');
    if (!m) {
      m = document.createElement('div'); m.id = 'ek-modal';
      m.innerHTML = `<style>
        #ek-modal{position:fixed;inset:0;z-index:10001;background:rgba(15,23,42,.55);display:flex;align-items:flex-end;justify-content:center;padding:10px}
        #ek-sheet{background:#f8fafc;color:#0f172a;border-radius:22px;max-width:760px;width:100%;max-height:94vh;overflow-y:auto;padding:16px 14px calc(16px + env(safe-area-inset-bottom));font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
        #ek-sheet span,#ek-sheet p,#ek-sheet strong,#ek-sheet small,#ek-sheet b{color:inherit !important;text-shadow:none !important}
        #ek-sheet .ek-muted{color:#64748b !important}#ek-sheet .ek-red{color:#dc2626 !important}
        .ek-title{font-size:20px;font-weight:800;margin:0 40px 4px 0}.ek-muted{font-size:12px;color:#64748b}
        .ek-sec{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:12px;margin:10px 0}.ek-sectitle{font-size:15px;font-weight:800;margin-bottom:4px}
        .ek-item{padding:10px 0;border-top:1px solid #f1f5f9}.ek-item.dev{background:#fef2f2;margin:0 -12px;padding:10px 12px}
        .ek-label{font-size:15px;font-weight:600;margin-bottom:6px;line-height:1.35}
        .ek-opts{display:flex;gap:6px}.ek-opt{flex:1;min-height:44px;border:1px solid #cbd5e1;background:#fff;border-radius:12px;font-size:14px;font-weight:700;color:#0f172a}
        .ek-opt.on.ja{background:#16a34a;border-color:#16a34a;color:#fff}.ek-opt.on.nej{background:#dc2626;border-color:#dc2626;color:#fff}.ek-opt.on.ea{background:#64748b;border-color:#64748b;color:#fff}
        .ek-input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font-size:16px;background:#fff;color:#0f172a;margin:4px 0}
        .ek-num{display:flex;align-items:center;gap:8px}.ek-num .ek-input{max-width:120px}.ek-num small{color:#64748b !important;font-size:12px}
        .ek-note.need{border-color:#dc2626;background:#fff}.ek-link{border:0;background:none;color:#0284c7;font-size:12px;padding:4px 0}
        .ek-photos{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.ek-photos img{width:84px;height:84px;object-fit:cover;border-radius:10px}
        .ek-btn{border:1px solid #cbd5e1;background:#fff;border-radius:10px;padding:10px 12px;font-size:14px;font-weight:700;cursor:pointer}
        .ek-big{display:block;width:100%;min-height:52px;border:0;border-radius:14px;background:#0284c7;color:#fff;font-size:17px;font-weight:800;margin-top:8px}.ek-big:disabled{opacity:.4}
        .ek-warn{font-size:13px;color:#b91c1c;margin:4px 0}.ek-ok{background:#dcfce7;border-radius:12px;padding:10px;margin:8px 0;font-size:14px}
        .ek-progress{position:sticky;top:-16px;background:#f8fafc;padding:8px 0;font-size:13px;z-index:2}.ek-save{float:right;color:#64748b}
        .ek-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
        .ek-row{display:block;width:100%;text-align:left;border:1px solid #e2e8f0;background:#fff;border-radius:12px;padding:10px;margin:6px 0;font-size:14px;color:#0f172a}
        .ek-badge{float:right;font-size:11px;font-weight:800;background:#fde68a;border-radius:999px;padding:2px 8px}.ek-badge.ok{background:#bbf7d0}
        #ek-close{position:sticky;top:0;float:right;border:0;background:#e2e8f0;border-radius:50%;width:36px;height:36px;font-size:16px;z-index:3}
      </style><div id="ek-sheet" role="dialog" aria-modal="true"></div>`;
      document.body.appendChild(m);
    }
    const sheet = document.getElementById('ek-sheet');
    const scroll = sheet.scrollTop;
    sheet.innerHTML = `<button id="ek-close" aria-label="Stäng" onclick="ekClose()">✕</button>` +
      (listMode ? listHtml() : formHtml()) +
      (admin() && !listMode ? `<button class="ek-link" style="margin-top:8px" onclick="ekList()">📂 Alla egenkontroller</button>` : '');
    sheet.scrollTop = scroll;
  }
  window.ekRender = render;

  async function loadTemplates() {
    if (templates && Object.keys(templates).length) return;
    const res = await apiPost({ action: 'getEk', id: '__mallar__' });
    if (res.status === 'success') { templates = res.templates; store.set('lpv_ek_templates', JSON.stringify(templates)); }
  }

  // ---------- ÖPPNA ----------
  window.openEgenkontroll = async function (id) {
    const draft = drafts.find(d => d.id === id);
    if (!draft) return;
    draftId = id; listMode = false; pending = {};
    try { await loadTemplates(); } catch (e) { /* offline: mallar från cache */ }
    if (!templates) { alert('Egenkontrollen kunde inte hämtas – kontrollera täckningen.'); return; }
    try { pending = JSON.parse(store.get('lpv_ek_pending:' + (draft.ekId || 'draft' + id)) || '{}'); } catch (e) { pending = {}; }
    if (draft.ekId) {
      try {
        const res = await apiPost({ action: 'getEk', id: draft.ekId });
        ek = (res.items || [])[0] || null;
      } catch (e) { ek = null; }
      if (!ek) { try { ek = JSON.parse(store.get('lpv_ek_cache:' + draft.ekId) || 'null'); } catch (e) { ek = null; } }
    }
    if (!ek) {
      const radar = String(draft.calendarJobId || '').match(/^radar:J-(.+)$/);
      ek = { id: draft.ekId || '', template: templateFor(draft), link: radar ? radar[1] : '', customer: radar ? String(draft.notes || '').split(' · ')[0] : '', place: draft.place || '', answers: {}, status: 'pågår' };
    }
    saveState = Object.keys(pending).length ? 'Osparade ändringar' : '';
    render();
    if (Object.keys(pending).length) save();
  };
  window.ekOpenId = async function (id) {
    const res = await apiPost({ action: 'getEk', id });
    ek = (res.items || [])[0]; templates = res.templates || templates; draftId = null; listMode = false; pending = {}; saveState = '';
    if (ek) render();
  };
  window.ekList = async function () {
    const res = await apiPost({ action: 'getEk' });
    list = res.items || []; templates = res.templates || templates; listMode = true; render();
  };
  window.ekClose = function () { if (Object.keys(pending).length) save(); const m = document.getElementById('ek-modal'); if (m) m.remove(); };

  // ---------- ÄNDRA & SPARA ----------
  window.ekMeta = function (field, value) { ek[field] = value; };
  window.ekSet = function (key, field, value) {
    if (ek.status === 'klar') return;
    const cur = { ...((ek.answers || {})[key] || {}), ...(pending[key] || {}) };
    pending[key] = { v: cur.v, note: cur.note, photos: cur.photos || [], [field]: value };
    store.set(pendingKey(), JSON.stringify(pending));
    saveState = 'Sparar…';
    render();
    clearTimeout(saveTimer); saveTimer = setTimeout(save, 800);
  };

  async function save() {
    const batch = pending;
    if (!Object.keys(batch).length && ek.id) return;
    try {
      const res = await apiPost({ action: 'saveEk', ek: { id: ek.id, template: ek.template, link: ek.link, customer: ek.customer, place: ek.place, answers: batch } });
      if (res.status !== 'success') throw new Error(res.message);
      Object.keys(batch).forEach(k => { if (pending[k] === batch[k]) delete pending[k]; });
      const wasNew = !ek.id;
      store.del(pendingKey());
      ek = res.item;
      store.set('lpv_ek_cache:' + ek.id, JSON.stringify(ek));
      if (Object.keys(pending).length) store.set(pendingKey(), JSON.stringify(pending));
      if (wasNew && draftId) { const d = drafts.find(x => x.id === draftId); if (d) { d.ekId = ek.id; saveDraftsToStorage(); store.del('lpv_ek_pending:draft' + draftId); } }
      saveState = 'Sparat ✓';
    } catch (e) {
      saveState = 'Inte sparat – sparas när du har täckning';
    }
    if (document.getElementById('ek-modal')) render();
  }

  function compress(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
          const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject; img.src = reader.result;
      };
      reader.onerror = reject; reader.readAsDataURL(file);
    });
  }
  window.ekPhoto = async function (key, file) {
    if (!file) return;
    const msg = document.getElementById('ekmsg-' + key.replace('.', '-'));
    if (msg) msg.textContent = 'Laddar upp…';
    try {
      const res = await apiPost({ action: 'addEkPhoto', imageBase64: await compress(file) });
      if (res.status !== 'success') throw new Error(res.message);
      const cur = { ...((ek.answers || {})[key] || {}), ...(pending[key] || {}) };
      ekSet(key, 'photos', (cur.photos || []).concat([res.photo.id]));
    } catch (e) { if (msg) msg.textContent = '❌ Fotot kunde inte laddas upp – försök igen med täckning.'; }
  };

  window.ekSign = async function () {
    await save();
    if (Object.keys(pending).length) { alert('Ändringarna är inte sparade än – försök igen när du har täckning.'); return; }
    const name = (document.getElementById('ek-signname') || {}).value || '';
    if (!confirm(`Signera egenkontrollen som ${name}?\n\nDen kan inte ändras efteråt.`)) return;
    const res = await apiPost({ action: 'signEk', id: ek.id, name });
    if (res.status !== 'success') { alert(res.message || 'Kunde inte signera.'); return; }
    ek = res.item;
    store.set('lpv_ek_cache:' + ek.id, JSON.stringify(ek));
    saveState = res.pdfNote || '';
    render();
  };
})();
