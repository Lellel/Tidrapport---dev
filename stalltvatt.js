// Arbetsorder för stalltvätt: stallets boxar som rutor som skiftar färg efter hur länge
// tvättroboten har gått, plus stallets egna steg med bilder. Admin kan redigera stallet.
// Stallregistret och robotens läge ligger i backend (Kod.gs, "4c3. STALLREGISTER").
// Använder apiPost, drafts, saveDraftsToStorage och isAdmin från app.js.
(function () {
  let stalls = null;          // från backend (eller senast hämtade)
  let clockOffset = 0;        // serverns klocka minus telefonens
  let current = null;         // { draftId, stallId, edit: stall-kopia | null }
  let timer = null, poll = null;
  let offline = false;

  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* fullt/privat */ } } };
  const admin = () => typeof isAdmin !== 'undefined' && isAdmin;
  const now = () => Date.now() + clockOffset;
  const hhmm = (ms) => { const d = new Date(ms - clockOffset); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const dur = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} h${m ? ' ' + m + ' min' : ''}` : `${m} min`; };

  // Stalltvätten är LPV:s – Klarytas personal får ingen arbetsorder eller larmbanner
  const isLpv = () => store.get('lpv_company') !== 'Klaryta';
  window.isStallWash = (d) => isLpv() && /tv[äa]tt|sanering|högtryck/i.test(`${d.activity || ''} ${d.place || ''}`);

  async function loadStalls() {
    try {
      const res = await apiPost({ action: 'getStalls' });
      if (res.status !== 'success') throw new Error(res.message || 'fel');
      stalls = res.stalls; clockOffset = (res.serverNow || Date.now()) - Date.now(); offline = false;
      store.set('lpv_stalls_cache', JSON.stringify(stalls));
    } catch (e) {
      offline = true;
      if (!stalls) { try { stalls = JSON.parse(store.get('lpv_stalls_cache') || 'null'); } catch (err) { stalls = null; } }
    }
    return stalls || [];
  }

  function guessStall(draft) {
    const text = `${draft.place || ''} ${draft.activity || ''} ${draft.notes || ''}`.toLowerCase();
    // Längsta namnet först så att "Stall 7BB" inte matchar "Stall 7"
    return (stalls || []).slice().sort((a, b) => b.name.length - a.name.length)
      .find(s => text.includes(s.name.toLowerCase()) || text.includes(s.name.replace(/\s*\(.*\)/, '').toLowerCase()));
  }

  // Hur långt roboten kommit på en rad: { done (antal klara boxar, med decimaler), state }
  function rowProgress(stall, r) {
    const st = ((stall.robotState || {}).rows || [])[r] || {};
    if (!st.start) return { done: 0, state: 'idle', st, alarms: [], downMin: 0 };
    const until = st.paused || now();
    const done = Math.min(stall.boxesPerRow, (st.from || 0) + Math.max(0, until - st.start) / (stall.minPerBox * 60000));
    const alarms = Array.isArray(st.alarms) ? st.alarms : [];
    const downMin = alarms.reduce((sum, a) => sum + ((a.cleared || now()) - a.at), 0) / 60000;
    const last = alarms[alarms.length - 1] || {};
    return { done, state: done >= stall.boxesPerRow ? 'done' : st.alarm ? 'alarm' : st.paused ? 'paused' : 'running', st, alarms, downMin,
      acked: !!(st.alarm && last.ack), last };
  }

  function robotHtml(stall) {
    if (!stall.robot) return `<div class="wo-muted">Roboten används inte i det här stallet.</div>`;
    const perRow = stall.boxesPerRow * stall.minPerBox;
    const running = Array.from({ length: stall.rows }, (_, r) => r).filter(r => rowProgress(stall, r).state === 'running');
    const alarmed = Array.from({ length: stall.rows }, (_, r) => r).filter(r => rowProgress(stall, r).state === 'alarm');
    // Stor knapp när en rad är igång: det är oftast den som larmar
    const big = alarmed.length ? alarmed.map(r => rowProgress(stall, r).acked
        ? `<button class="wo-big ok" onclick="woRobot(${r},'resume')">✅ Larmet åtgärdat – starta roboten (rad ${r + 1})</button>`
        : `<button class="wo-big" onclick="woRobot(${r},'ack')">👍 Kvittera – jag åtgärdar larmet nu (rad ${r + 1})</button>`).join('')
      : running.length === 1 ? `<button class="wo-big" onclick="woRobot(${running[0]},'alarm')">🚨 Roboten larmar (rad ${running[0] + 1})</button>` : '';
    return `${big}<div class="wo-legend"><span><i style="background:#cbd5e1"></i>Väntar</span><span><i style="background:#facc15"></i>Tvättas nu</span><span><i style="background:#ef4444"></i>Larm</span><span><i style="background:#fb923c"></i>Pausad</span><span><i style="background:#22c55e"></i>Klar</span><span><i style="background:#22c55e;box-shadow:inset 0 0 0 2px #dc2626"></i>Har larmat</span></div>
      ${Array.from({ length: stall.rows }, (_, r) => {
        const p = rowProgress(stall, r);
        const full = Math.floor(p.done);
        const status = p.state === 'idle' ? `Ej startad · tar ${dur(perRow)}`
          : p.state === 'done' ? 'Klar ✅'
          : p.state === 'alarm' ? `🚨 Larm${p.last.source === 'sms' ? ' (SMS)' : ''} på box ${full + 1} sedan ${hhmm(p.st.paused)} · står still ${dur(Math.max(0, (now() - p.st.paused) / 60000))} · ${p.acked ? `kvitterat ${hhmm(p.last.ack)}${p.last.ackBy ? ' av ' + esc(p.last.ackBy) : ''}` : '<b style="color:#dc2626">ej kvitterat</b>'}${p.last.text ? `<br>”${esc(p.last.text)}”` : ''}`
          : p.state === 'paused' ? `Pausad på box ${full + 1}`
          : `Box ${full + 1} av ${stall.boxesPerRow} · klar ca ${hhmm(now() + (stall.boxesPerRow - p.done) * stall.minPerBox * 60000)}`;
        const boxes = Array.from({ length: stall.boxesPerRow }, (_, b) => {
          const color = b < full ? '#22c55e' : (b === full && p.state === 'running') ? '#facc15' : (b === full && p.state === 'alarm') ? '#ef4444' : (b === full && p.state === 'paused') ? '#fb923c' : '#cbd5e1';
          const hadAlarm = p.alarms.some(a => a.box === b && a.cleared);
          return `<button class="wo-box${b === full && p.state === 'alarm' ? ' blink' : ''}" style="background:${color}${hadAlarm ? ';box-shadow:inset 0 0 0 2px #dc2626' : ''}" title="Box ${b + 1}" aria-label="Rad ${r + 1} box ${b + 1}" onclick="woSetBox(${r},${b})"></button>`;
        }).join('');
        const btns = p.state === 'idle' ? `<button class="wo-btn go" onclick="woRobot(${r},'start')">▶ Starta</button>`
          : p.state === 'running' ? `<button class="wo-btn alarm" onclick="woRobot(${r},'alarm')">🚨 Larm</button><button class="wo-btn" onclick="woRobot(${r},'pause')">⏸</button><button class="wo-btn" onclick="woRobot(${r},'reset')">↺</button>`
          : p.state === 'alarm' ? (p.acked ? `<button class="wo-btn go" onclick="woRobot(${r},'resume')">✅ Åtgärdat – starta</button>` : `<button class="wo-btn alarm" onclick="woRobot(${r},'ack')">👍 Kvittera</button>`)
          : p.state === 'paused' ? `<button class="wo-btn go" onclick="woRobot(${r},'resume')">▶ Fortsätt</button><button class="wo-btn" onclick="woRobot(${r},'reset')">↺</button>`
          : `<button class="wo-btn" onclick="woRobot(${r},'reset')">↺ Börja om</button>`;
        const down = p.alarms.length ? `<div class="wo-muted">Stillestånd: <b style="color:#dc2626">${dur(p.downMin)}</b> (${p.alarms.length} larm: ${p.alarms.map(a => hhmm(a.at) + (a.cleared ? '–' + hhmm(a.cleared) : '–pågår')).join(', ')})</div>` : '';
        const head = `<div class="wo-rowhead"><b>Rad ${r + 1}</b><span class="wo-muted">${status}</span><span style="margin-left:auto;display:flex;gap:6px">${btns}</span></div>${down}`;
        const grid = `<div class="wo-boxes" style="grid-template-columns:repeat(${stall.boxesPerRow},1fr)">${boxes}</div>`;
        // Rad 2 och 3 står rygg mot rygg i stallet: boxarna ritas tätt ihop, rad 3:s rubrik under sina boxar (2026-11-05)
        const pair = stall.rows >= 4 ? (r === 1 ? 'top' : r === 2 ? 'bottom' : '') : '';
        return pair === 'top' ? `<div class="wo-row wo-pair-top">${head}${grid}</div>`
          : pair === 'bottom' ? `<div class="wo-row wo-pair-bottom">${grid}${head}</div>`
          : `<div class="wo-row">${head}${grid}</div>`;
      }).join('')}
      <div class="wo-muted">Står roboten någon annanstans? Tryck på boxen där den är just nu.</div>`;
  }

  function stepsHtml(stall, draft) {
    if (!stall.steps.length) return `<div class="wo-empty">Instruktioner saknas för ${esc(stall.name)} ännu.${admin() ? ' Tryck på ✏️ Redigera för att lägga in steg och bilder.' : ''}</div>`;
    const checks = draft ? (((draft.woChecks || {})[stall.id]) || []) : [];
    return stall.steps.map((s, i) => `<label class="wo-step">
        <input type="checkbox" ${checks[i] ? 'checked' : ''} onchange="woCheck(${i}, this.checked)">
        <span class="wo-num">${i + 1}</span>
        <span style="flex:1">${esc(s.text).replace(/\n/g, '<br>')}
          ${s.photoId ? `<a href="https://drive.google.com/file/d/${encodeURIComponent(s.photoId)}/view" target="_blank" rel="noopener" onclick="event.stopPropagation()"><img src="${esc(s.photoUrl)}" alt="Bild till steg ${i + 1}" loading="lazy"></a>` : ''}
        </span></label>`).join('');
  }

  function viewHtml() {
    const draft = drafts.find(d => d.id === current.draftId);
    const stall = (stalls || []).find(s => s.id === current.stallId);
    const picker = `<select onchange="woPickStall(this.value)" class="wo-input">${stall ? '' : '<option value="">– Välj stall –</option>'}${(stalls || []).map(s => `<option value="${esc(s.id)}" ${stall && s.id === stall.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>`;
    if (!stall) return `<h2 class="wo-title">📋 Arbetsorder – stalltvätt</h2>${offline ? '<div class="wo-warn">Ingen kontakt – visar senast hämtade.</div>' : ''}
      ${(stalls || []).length ? `<div class="wo-muted">Vilket stall gäller passet?</div>${picker}` : '<div class="wo-empty">Stallregistret kunde inte hämtas. Kontrollera nätet.</div>'}
      ${admin() ? '<button class="wo-btn" onclick="woEdit(null)">➕ Nytt stall</button>' : ''}`;
    return `<h2 class="wo-title">📋 ${esc(stall.name)}</h2>
      ${offline ? '<div class="wo-warn">Ingen kontakt – visar senast hämtade. Robotens läge kan vara gammalt.</div>' : ''}
      ${picker}
      <div class="wo-muted">${stall.rows} rader × ${stall.boxesPerRow} boxar · ${stall.minPerBox} min/box${stall.robot ? ` · ${dur(stall.boxesPerRow * stall.minPerBox)} per rad med roboten` : ''}</div>
      <h3 class="wo-h3">🤖 Tvättroboten</h3><div id="wo-robot">${robotHtml(stall)}</div>
      <h3 class="wo-h3">📝 Arbetsorder</h3>${stepsHtml(stall, draft)}
      ${admin() ? `<div style="display:flex;gap:8px;margin-top:10px"><button class="wo-btn" onclick="woEdit('${esc(stall.id)}')">✏️ Redigera stallet</button><button class="wo-btn" onclick="woEdit(null)">➕ Nytt stall</button></div>` : ''}`;
  }

  // ---------- REDIGERA (admin) ----------
  function editHtml() {
    const e = current.edit;
    const f = (key, label, type = 'text') => `<label class="wo-field"><span>${label}</span><input class="wo-input" type="${type}" value="${esc(e[key])}" oninput="woEditField('${key}', this.value)"></label>`;
    return `<h2 class="wo-title">✏️ ${e.id ? esc(e.name) : 'Nytt stall'}</h2>
      <div class="wo-grid">${f('name', 'Namn')}${f('site', 'Site')}${f('rows', 'Rader', 'number')}${f('boxesPerRow', 'Boxar per rad', 'number')}${f('minPerBox', 'Min per box', 'number')}
        <label class="wo-field"><span>Tvättrobot</span><select class="wo-input" onchange="woEditField('robot', this.value === 'ja')"><option value="ja" ${e.robot ? 'selected' : ''}>Ja</option><option value="nej" ${e.robot ? '' : 'selected'}>Nej</option></select></label></div>
      <h3 class="wo-h3">Steg i arbetsordern</h3>
      ${e.steps.map((s, i) => `<div class="wo-editstep">
        <div style="display:flex;gap:6px;align-items:center"><span class="wo-num">${i + 1}</span>
          <button class="wo-btn" ${i === 0 ? 'disabled' : ''} onclick="woMoveStep(${i},-1)">↑</button><button class="wo-btn" ${i === e.steps.length - 1 ? 'disabled' : ''} onclick="woMoveStep(${i},1)">↓</button>
          <button class="wo-btn danger" style="margin-left:auto" onclick="woRemoveStep(${i})">Ta bort</button></div>
        <textarea class="wo-input" rows="3" placeholder="Vad ska göras i det här steget?" oninput="woStepText(${i}, this.value)">${esc(s.text)}</textarea>
        ${s.photoId ? `<img src="${esc(s.photoUrl)}" alt="Bild till steg ${i + 1}"><button class="wo-btn" onclick="woStepPhoto(${i}, null)">Ta bort bilden</button>`
          : `<label class="wo-btn" style="display:inline-block">📷 Lägg till bild<input type="file" accept="image/*" style="display:none" onchange="woStepPhoto(${i}, this.files[0])"></label>`}
        <span class="wo-muted" id="wo-photo-msg-${i}"></span></div>`).join('')}
      <button class="wo-btn" onclick="woAddStep()">➕ Lägg till steg</button>
      <div class="wo-warn" id="wo-edit-msg" style="display:none"></div>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="wo-btn go" style="flex:1" onclick="woSaveStall()">💾 Spara stallet</button><button class="wo-btn" onclick="woCancelEdit()">Avbryt</button></div>`;
  }

  function render() {
    let m = document.getElementById('wo-modal');
    if (!m) {
      m = document.createElement('div'); m.id = 'wo-modal';
      m.innerHTML = `<style>
        #wo-modal{position:fixed;inset:0;z-index:10001;background:rgba(15,23,42,.55);display:flex;align-items:flex-end;justify-content:center;padding:10px}
        #wo-sheet{background:#fff;color:#0f172a;border-radius:22px;max-width:760px;width:100%;max-height:94vh;overflow-y:auto;padding:16px 14px calc(16px + env(safe-area-inset-bottom));font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;box-shadow:0 20px 50px rgba(0,0,0,.3)}
        /* Appens style.css tvingar ljus text på h2/h3/span/p (mörkt glas) – arbetsordern är ljus */
        #wo-sheet h2,#wo-sheet h3,#wo-sheet span,#wo-sheet p,#wo-sheet strong,#wo-sheet small{color:inherit !important;text-shadow:none !important}
        #wo-sheet .wo-muted{color:#64748b !important}#wo-sheet .wo-num{color:#fff !important}
        #wo-sheet .wo-title{all:unset;display:block;font-size:20px;font-weight:800;margin:0 40px 8px 0;color:#0f172a}
        #wo-sheet .wo-h3{all:unset;display:block;font-size:15px;font-weight:800;margin:14px 0 6px;color:#0f172a}
        .wo-muted{font-size:12px;color:#64748b;margin:4px 0}.wo-warn{font-size:12px;color:#b45309;background:#fef3c7;border-radius:10px;padding:6px 10px;margin:6px 0}
        .wo-empty{font-size:14px;color:#475569;background:#f1f5f9;border-radius:12px;padding:12px}
        .wo-input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:9px 10px;font-size:15px;background:#fff;color:#0f172a;margin:4px 0}
        .wo-btn{border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a;border-radius:10px;padding:7px 11px;font-size:13px;font-weight:700;cursor:pointer;min-height:36px}
        .wo-btn.go{background:#0284c7;border-color:#0284c7;color:#fff}.wo-btn.alarm{color:#dc2626;border-color:#fca5a5}
        .wo-big{display:block;width:100%;min-height:56px;border:0;border-radius:14px;background:#dc2626;color:#fff;font-size:17px;font-weight:800;margin:4px 0 10px;cursor:pointer}.wo-big.ok{background:#16a34a}
        @keyframes woblink{50%{opacity:.35}}.wo-box.blink{animation:woblink 1s infinite}.wo-btn.danger{color:#dc2626}.wo-btn:disabled{opacity:.4}
        .wo-legend{display:flex;flex-wrap:wrap;gap:10px;font-size:11px;color:#475569;margin-bottom:6px}.wo-legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}
        .wo-row{margin:8px 0}.wo-rowhead{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;margin-bottom:4px}
        .wo-boxes{display:grid;gap:2px}.wo-box{border:0;padding:0;height:12px;border-radius:2px;cursor:pointer;min-width:0}
        .wo-row.wo-pair-top{margin-bottom:0}.wo-row.wo-pair-bottom{margin-top:2px}.wo-pair-bottom .wo-rowhead{margin:4px 0 0}
        .wo-step{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid #e2e8f0;font-size:15px;line-height:1.45}
        .wo-step input{width:22px;height:22px;margin-top:2px;flex:0 0 22px}.wo-step img,.wo-editstep img{display:block;width:100%;max-width:420px;border-radius:12px;margin-top:8px}
        .wo-num{flex:0 0 24px;height:24px;border-radius:50%;background:#0284c7;color:#fff;font-weight:800;font-size:13px;display:inline-flex;align-items:center;justify-content:center}
        .wo-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 10px}.wo-field span{font-size:11px;font-weight:700;color:#475569;text-transform:uppercase}
        .wo-editstep{border:1px solid #e2e8f0;border-radius:14px;padding:10px;margin:8px 0}
        #wo-close{position:sticky;top:0;float:right;border:0;background:#f1f5f9;border-radius:50%;width:36px;height:36px;font-size:16px;cursor:pointer}
      </style><div id="wo-sheet" role="dialog" aria-modal="true"></div>`;
      m.addEventListener('click', (e) => { if (e.target === m) closeWorkOrder(); });
      document.body.appendChild(m);
    }
    const sheet = document.getElementById('wo-sheet');
    const scroll = sheet.scrollTop;
    sheet.innerHTML = `<button id="wo-close" aria-label="Stäng" onclick="closeWorkOrder()">✕</button>` + (current.edit ? editHtml() : viewHtml());
    sheet.scrollTop = scroll;
  }

  function refreshRobot() {
    const el = document.getElementById('wo-robot');
    const stall = current && (stalls || []).find(s => s.id === current.stallId);
    if (el && stall && !current.edit) el.innerHTML = robotHtml(stall);
  }

  // draftId = passet arbetsordern hör till; null + stallId när den öppnas från larmbannern
  window.openWorkOrder = async function (draftId, stallId) {
    const draft = draftId ? drafts.find(d => d.id === draftId) : null;
    if (draftId && !draft) return;
    current = { draftId, stallId: stallId || (draft && draft.stallId) || '', edit: null };
    if (!stalls) { try { stalls = JSON.parse(store.get('lpv_stalls_cache') || 'null'); } catch (e) { stalls = null; } }
    render();
    await loadStalls();
    if (!current) return;
    if (draft && (!current.stallId || !stalls.some(s => s.id === current.stallId))) {
      const g = guessStall(draft);
      current.stallId = g ? g.id : '';
      if (g) { draft.stallId = g.id; saveDraftsToStorage(); }
    }
    render();
    clearInterval(timer); clearInterval(poll);
    timer = setInterval(refreshRobot, 20000);
    poll = setInterval(async () => { if (current && !current.edit) { await loadStalls(); refreshRobot(); } }, 60000);
  };

  window.closeWorkOrder = function () {
    clearInterval(timer); clearInterval(poll); current = null;
    const m = document.getElementById('wo-modal'); if (m) m.remove();
    checkRobotAlarms();
  };

  // ---------- LARMBANNER (admin): okvitterade robotlarm syns överst i appen ----------
  async function checkRobotAlarms() {
    if (!admin() || !isLpv() || store.get('lpv_is_super') === 'false' || !navigator.onLine) return;
    await loadStalls();
    const open = [];
    (stalls || []).forEach(st => ((st.robotState || {}).rows || []).forEach((row, r) => {
      const last = row && row.alarm && (row.alarms || [])[row.alarms.length - 1];
      if (last && !last.ack) open.push({ stall: st, row: r, at: last.at });
    }));
    let b = document.getElementById('wo-alarm-banner');
    if (!open.length) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('button'); b.id = 'wo-alarm-banner';
      b.style.cssText = 'display:block;width:100%;margin:0 0 12px;padding:14px;border:0;border-radius:14px;background:#dc2626;color:#fff;font-size:16px;font-weight:800;text-align:left;cursor:pointer;animation:woblink2 1.2s infinite;';
      const st = document.createElement('style'); st.textContent = '@keyframes woblink2{50%{background:#991b1b}}'; document.head.appendChild(st);
      const container = document.querySelector('.app-container') || document.body;
      container.insertBefore(b, container.firstChild);
    }
    const a = open[0];
    b.textContent = `🚨 Robotlarm: ${a.stall.name}, rad ${a.row + 1} sedan ${hhmm(a.at)} – tryck för att kvittera`;
    b.onclick = () => openWorkOrder(null, a.stall.id);
  }
  window.checkRobotAlarms = checkRobotAlarms;
  const startChecks = () => { checkRobotAlarms(); setInterval(checkRobotAlarms, 120000); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkRobotAlarms(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startChecks); else startChecks();

  window.woPickStall = function (id) {
    const draft = drafts.find(d => d.id === current.draftId);
    current.stallId = id;
    if (draft) { draft.stallId = id; saveDraftsToStorage(); }
    render();
  };

  window.woCheck = function (i, checked) {
    const draft = drafts.find(d => d.id === current.draftId);
    if (!draft) return;
    draft.woChecks = draft.woChecks || {};
    const list = draft.woChecks[current.stallId] = draft.woChecks[current.stallId] || [];
    list[i] = checked;
    saveDraftsToStorage();
  };

  async function robot(payload) {
    try {
      const draft = drafts.find(d => d.id === current.draftId);
      // Platsen följer med så att ett åtgärdat larm hamnar på rätt faktura (aktivitet "Robotlarm")
      const res = await apiPost({ action: 'setRobotRow', stallId: current.stallId, place: draft ? draft.place : '', ...payload });
      if (res.status !== 'success') throw new Error(res.message);
      const stall = stalls.find(s => s.id === current.stallId);
      stall.robotState = res.robotState; clockOffset = res.serverNow - Date.now();
      store.set('lpv_stalls_cache', JSON.stringify(stalls));
      refreshRobot();
    } catch (e) { alert('Kunde inte spara robotens läge: ' + (e.message || 'ingen kontakt') + '. Försök igen när du har täckning.'); }
  }
  window.woRobot = function (row, op) {
    if (op === 'reset' && !confirm(`Nollställa rad ${row + 1}? Alla boxar blir grå igen.`)) return;
    robot({ row, op });
  };
  window.woSetBox = function (row, box) {
    if (!confirm(`Står roboten på box ${box + 1} i rad ${row + 1} just nu?`)) return;
    robot({ row, op: 'setBox', box });
  };

  // ---------- redigering ----------
  window.woEdit = function (id) {
    const s = id ? stalls.find(x => x.id === id) : null;
    current.edit = s ? JSON.parse(JSON.stringify(s)) : { id: '', name: '', site: 'Site 1', rows: 4, boxesPerRow: 23, minPerBox: 20, robot: true, steps: [] };
    render();
  };
  window.woCancelEdit = function () { current.edit = null; render(); };
  window.woEditField = function (key, value) { current.edit[key] = value; };
  window.woStepText = function (i, text) { current.edit.steps[i].text = text; };
  window.woAddStep = function () { current.edit.steps.push({ text: '', photoId: '', photoUrl: '' }); render(); };
  window.woRemoveStep = function (i) { if (confirm(`Ta bort steg ${i + 1}?`)) { current.edit.steps.splice(i, 1); render(); } };
  window.woMoveStep = function (i, dir) { const s = current.edit.steps; [s[i], s[i + dir]] = [s[i + dir], s[i]]; render(); };

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
  window.woStepPhoto = async function (i, file) {
    const step = current.edit.steps[i];
    if (!file) { step.photoId = ''; step.photoUrl = ''; render(); return; }
    const msg = document.getElementById('wo-photo-msg-' + i);
    if (msg) msg.textContent = 'Laddar upp…';
    try {
      const res = await apiPost({ action: 'addStallPhoto', imageBase64: await compress(file) });
      if (res.status !== 'success') throw new Error(res.message);
      step.photoId = res.photo.id; step.photoUrl = res.photo.url;
      render();
    } catch (e) { if (msg) msg.textContent = '❌ ' + (e.message || 'Kunde inte ladda upp'); }
  };
  window.woSaveStall = async function () {
    const msg = document.getElementById('wo-edit-msg');
    const show = (t) => { msg.style.display = 'block'; msg.textContent = t; };
    show('Sparar…');
    try {
      const res = await apiPost({ action: 'saveStall', stall: current.edit });
      if (res.status !== 'success') throw new Error(res.message);
      await loadStalls();
      current.stallId = res.stall.id; current.edit = null;
      const draft = drafts.find(d => d.id === current.draftId);
      if (draft) { draft.stallId = res.stall.id; saveDraftsToStorage(); }
      render();
    } catch (e) { show('❌ ' + (e.message || 'Kunde inte spara')); }
  };
})();
