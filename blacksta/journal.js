// ==========================================
// BLACKSTA – lagring, händelselogg och läkemedelsjournal
// Laddas efter sidans eget skript. Använder samma inloggning som Tidrapporten
// (../config.js + ../sno.js). Lagkraven: ../docs/blacksta-krav-lagstiftning.md
// ==========================================

const BL_MED_PRESETS = {
  jarn:       { label: 'Järn',       drug: 'Järnpreparat (injektion)', reason: 'Förebyggande mot järnbrist hos smågrisar', animals: 'Smågrisar' },
  kastrering: { label: 'Kastrering', drug: '', reason: 'Kastrering av hangrisar', animals: 'Hangrisar' },
  pcv2:       { label: 'PCV2-vaccin', drug: 'PCV2-vaccin', reason: 'Vaccination mot PCV2', animals: 'Smågrisar' },
  improvac:   { label: 'Improvac',   drug: 'Improvac', reason: 'Immunokastrering', animals: 'Hangrisar' },
  ovrigt:     { label: 'Övrigt',     drug: '', reason: '', animals: '' }
};
const BL_MEDICAL_TITLE = /järn|kastr|vaccin|pcv|improvac|antibio|behandl|medicin/i;

const bl = { lastSavedPlan: '', saveTimer: null, planLoaded: false, kind: 'ovrigt', job: null, corrects: '' };
const blEsc = (t) => (typeof snoEscape === 'function' ? snoEscape(t) : String(t ?? ''));
const blToday = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const blNow = () => new Date().toTimeString().slice(0, 5);
function blLoggedIn() { return !!(localStorage.getItem('lpv_key') || (typeof CONFIG !== 'undefined' && CONFIG.API_TOKEN)); }
function blMemory(key, value) {
  try {
    const all = JSON.parse(localStorage.getItem('bl_memory') || '{}');
    if (value === undefined) return all[key];
    all[key] = value; localStorage.setItem('bl_memory', JSON.stringify(all));
  } catch (e) { return undefined; }
}

// ---------- STATUS I HEADERN ----------
function blStatus(text, tone) {
  let el = document.getElementById('bl-status');
  if (!el) return;
  el.textContent = text;
  el.className = 'text-[10px] font-bold px-2 py-1 rounded-lg ' + (tone === 'bad' ? 'bg-red-900/60 text-red-200' : tone === 'warn' ? 'bg-amber-900/60 text-amber-200' : 'bg-emerald-900/60 text-emerald-200');
}

// ---------- PLANEN: hämta vid start, spara när arbetsledaren ändrar ----------
function blPlanJson() {
  return JSON.stringify(state.jobs.map(j => ({ id: j.id, client: j.client, title: j.title, dayIndex: j.dayIndex, startH: j.startH, startM: j.startM,
    durM: j.durM, status: j.status, assigned: j.assigned, billingCompany: j.billingCompany, packlist: j.packlist || [] })));
}

async function blLoadPlan() {
  if (!blLoggedIn()) { blStatus('⚠️ Ej inloggad – logga in i Tidrapporten', 'bad'); return; }
  try {
    const res = await snoApi({ action: 'blacksta_getPlan' });
    if (res.status !== 'success') { blStatus('⚠️ ' + (res.message || 'Kunde inte hämta planen'), 'bad'); return; }
    if (res.jobs.length) {
      state.jobs = res.jobs;
      bl.lastSavedPlan = blPlanJson();
      blStatus('💾 Plan hämtad', 'ok');
    } else {
      blStatus(snoIsAdmin() ? '💾 Ny plan – sparas vid första ändring' : 'ℹ️ Ingen sparad plan än', 'warn');
    }
    bl.planLoaded = true;
    if (typeof renderPaddaAll === 'function' && !document.getElementById('view-padda').classList.contains('hidden')) blOriginalRenderPadda();
    renderMobile();
  } catch (err) {
    blStatus('⚠️ Ingen kontakt – visar standardplan', 'bad');
  }
}

function blSchedulePlanSave() {
  if (!bl.planLoaded || !snoIsAdmin()) return;
  const json = blPlanJson();
  if (json === bl.lastSavedPlan) return;
  clearTimeout(bl.saveTimer);
  blStatus('✏️ Ändrat – sparar…', 'warn');
  bl.saveTimer = setTimeout(async () => {
    try {
      const res = await snoApi({ action: 'blacksta_savePlan', jobs: JSON.parse(json) });
      if (res.status === 'success') { bl.lastSavedPlan = json; blStatus('💾 Sparat ' + new Date().toTimeString().slice(0, 5), 'ok'); }
      else blStatus('⚠️ Ej sparat: ' + (res.message || ''), 'bad');
    } catch (err) { blStatus('⚠️ Ej sparat – ingen kontakt', 'bad'); }
  }, 1200);
}

// Varje omritning av Paddan kontrollerar om något ändrats och sparar i så fall
const blOriginalRenderPadda = renderPaddaAll;
renderPaddaAll = function () { blOriginalRenderPadda(); blSchedulePlanSave(); };

// ---------- HÄNDELSER ----------
async function blLogEvent(type, stall, jobId, text, details) {
  try {
    const res = await snoApi({ action: 'blacksta_logEvent', event: { type, stall, jobId, text, details: details || {} } });
    if (res.status !== 'success') { alert('Kunde inte spara: ' + (res.message || '')); return false; }
    return true;
  } catch (err) { alert('Ingen kontakt – händelsen sparades inte. Försök igen när du har täckning.'); return false; }
}

// Slussning loggas med vem och när
const blOriginalSluss = confirmSlussCheck;
confirmSlussCheck = async function () {
  if (await blLogEvent('slussning', '', '', 'Stövelbyte och desinfektion i slussen vid stallbyte', { bekraftad: true })) blOriginalSluss();
};

// "Utförd & Avbockad" i Stöveln
async function blMarkDone(jobId) {
  const job = state.jobs.find(j => j.id === jobId);
  if (!job) return;
  if (await blLogEvent('moment_utfort', job.client, job.id, job.title, { dag: job.dayIndex })) {
    if (BL_MEDICAL_TITLE.test(job.title) && confirm('Utfört! ✅\n\nMomentet innehåller läkemedel. Journalför nu?')) blOpenMedForm(job);
    else alert('Utfört och sparat ✅');
  }
}

// ---------- JOBBDETALJ: knapp för läkemedelsjournal ----------
const blOriginalOpenDetail = openJobDetailModal;
openJobDetailModal = function (jobId) {
  blOriginalOpenDetail(jobId);
  const job = state.jobs.find(j => j.id === jobId);
  const box = document.getElementById('detail-med-section');
  if (!box || !job) return;
  box.innerHTML = BL_MEDICAL_TITLE.test(job.title)
    ? `<button onclick="blOpenMedForm(state.jobs.find(j => j.id === '${blEsc(job.id)}'))" class="w-full py-2.5 bg-rose-700 hover:bg-rose-600 text-white text-xs font-black rounded-xl">💉 Journalför läkemedel för detta moment</button>
       <p class="text-[10px] text-slate-400 mt-1">Läkemedelsjournalen sparas i 5 år. Karenstid ska anges även om den är 0.</p>`
    : '';
};

// ---------- LÄKEMEDELSFORMULÄR ----------
function blKindForTitle(title) {
  const t = String(title || '').toLowerCase();
  if (t.includes('kastr')) return 'kastrering';
  if (t.includes('järn')) return 'jarn';
  if (t.includes('pcv')) return 'pcv2';
  if (t.includes('improvac')) return 'improvac';
  return 'ovrigt';
}

function blOpenMedForm(job, corrects) {
  bl.job = job || null;
  bl.corrects = corrects ? corrects.id : '';
  bl.kind = corrects ? 'ovrigt' : blKindForTitle(job && job.title);
  blRenderMedForm(corrects);
  document.getElementById('bl-med-modal').classList.remove('hidden');
  document.getElementById('bl-med-modal').classList.add('flex');
}
function blCloseMed() { document.getElementById('bl-med-modal').classList.add('hidden'); document.getElementById('bl-med-modal').classList.remove('flex'); }

function blField(id, label, value, opts = {}) {
  return `<div class="${opts.wide ? 'col-span-2' : ''}"><label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">${label}${opts.req ? ' *' : ''}</label>
    <input id="${id}" type="${opts.type || 'text'}" value="${blEsc(value ?? '')}" ${opts.step ? `step="${opts.step}"` : ''} placeholder="${blEsc(opts.ph || '')}"
      class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-100"></div>`;
}

function blRenderMedForm(c) {
  const p = BL_MED_PRESETS[bl.kind];
  const job = bl.job;
  const mem = (k) => blMemory(k);
  const drugMem = mem('drug:' + p.drug) || {};
  const animals = c ? c.animals : `${p.animals}${job ? ', ' + job.client : ''}${typeof START_DATE !== 'undefined' ? ', omgång från ' + START_DATE.toISOString().slice(0, 10) : ''}`;
  const kast = bl.kind === 'kastrering' && !c;
  document.getElementById('bl-med-body').innerHTML = `
    <div class="flex justify-between items-start border-b border-slate-700/50 pb-3">
      <div><span class="text-[10px] font-black uppercase text-rose-300">💉 Läkemedelsjournal</span>
        <h3 class="font-black text-lg text-white mt-1">${c ? 'Rätta post ' + blEsc(c.id) : blEsc(job ? job.title : 'Ny behandling')}</h3></div>
      <button onclick="blCloseMed()" class="text-slate-400 hover:text-white text-xs font-bold bg-slate-800 p-1.5 rounded-lg">✖</button>
    </div>
    ${c ? '<p class="text-[11px] text-amber-300">Den gamla posten finns kvar i journalen och markeras som rättad.</p>' : `
    <div class="flex flex-wrap gap-1.5">${Object.entries(BL_MED_PRESETS).map(([k, v]) => `<button onclick="bl.kind='${k}'; blRenderMedForm()" class="px-3 py-1.5 rounded-full text-xs font-bold ${bl.kind === k ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'}">${v.label}</button>`).join('')}</div>`}
    ${kast ? `
      <div class="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-3 space-y-2 text-xs text-amber-100">
        <b>Lagkrav vid kastrering (sedan 1 nov 2023):</b> lokalbedövning <u>och</u> allmän smärtlindring före ingreppet. Utan veterinär bara före 7 dagars ålder och med godkänd utbildning.
        <label class="flex gap-2 items-center"><input type="checkbox" id="bl-k-bed" class="w-5 h-5"> Lokalbedövning har getts</label>
        <label class="flex gap-2 items-center"><input type="checkbox" id="bl-k-smart" class="w-5 h-5"> Allmän smärtlindring har getts</label>
        <label class="flex gap-2 items-center"><input type="checkbox" id="bl-k-utb" class="w-5 h-5"> Jag har godkänd utbildning i kastrering och läkemedelshantering</label>
        <label class="flex gap-2 items-center"><input type="checkbox" id="bl-k-alder" class="w-5 h-5"> Grisarna är yngre än 7 dagar</label>
      </div>
      <div class="grid grid-cols-2 gap-2">
        ${blField('bl-k-antal', 'Antal hangrisar', '', { type: 'number', req: true })}
        ${blField('bl-k-bed-drug', 'Bedövningsmedel', mem('k:bed') || '', { req: true })}
        ${blField('bl-k-bed-dose', 'Dos bedövning', mem('k:beddos') || '', { req: true })}
        ${blField('bl-k-bed-kar', 'Karens bedövning (dagar)', mem('k:bedkar') ?? '', { type: 'number', step: '0.5', req: true })}
        ${blField('bl-k-sm-drug', 'Smärtlindring', mem('k:sm') || '', { req: true })}
        ${blField('bl-k-sm-dose', 'Dos smärtlindring', mem('k:smdos') || '', { req: true })}
        ${blField('bl-k-sm-kar', 'Karens smärtlindring (dagar)', mem('k:smkar') ?? '', { type: 'number', step: '0.5', req: true })}
      </div>` : `
      <div class="grid grid-cols-2 gap-2">
        ${blField('bl-drug', 'Läkemedel', c ? c.drug : p.drug, { req: true, wide: true })}
        ${blField('bl-reason', 'Orsak / diagnos', c ? c.reason : p.reason, { req: true, wide: true })}
        ${blField('bl-dose', 'Dos', c ? c.dose : (drugMem.dose || ''), { req: true, ph: 't.ex. 1 ml/gris' })}
        ${blField('bl-days', 'Behandlingstid (dagar)', c ? c.treatmentDays : (drugMem.days || 1), { type: 'number', req: true })}
        ${blField('bl-kar', 'Karenstid (dagar, 0 om ingen)', c ? c.withdrawalDays : (drugMem.kar ?? ''), { type: 'number', step: '0.5', req: true })}
      </div>`}
    <div class="grid grid-cols-2 gap-2">
      ${blField('bl-animals', 'Djur / grupp', animals, { req: true, wide: true })}
      ${blField('bl-date', 'Behandlingsdatum', c ? c.date : blToday(), { type: 'date', req: true })}
      ${blField('bl-time', 'Klockslag', c ? c.time : blNow(), { type: 'time' })}
      ${blField('bl-vet', 'Förskrivande veterinär', c ? c.vet : (mem('vet') || ''), { req: true })}
      ${blField('bl-source', 'Inköpt från / recept', c ? c.source : (mem('source') || ''))}
      ${blField('bl-comment', c ? 'Varför rättas posten?' : 'Kommentar', '', { wide: true, req: !!c })}
    </div>
    <div id="bl-med-msg" class="text-xs font-bold text-red-300 min-h-[1em]"></div>
    <div class="flex justify-end gap-2"><button onclick="blCloseMed()" class="px-4 py-2 bg-slate-800 text-xs font-bold rounded-xl text-slate-300">Avbryt</button>
      <button id="bl-med-save" onclick="blSaveMed()" class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-xs font-black text-white rounded-xl">💾 Spara i journalen</button></div>`;
}

const blVal = (id) => { const el = document.getElementById(id); return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : ''; };

async function blSaveMed() {
  const msg = document.getElementById('bl-med-msg');
  const btn = document.getElementById('bl-med-save');
  const common = { date: blVal('bl-date'), time: blVal('bl-time'), animals: blVal('bl-animals'), stall: bl.job ? bl.job.client : '', vet: blVal('bl-vet'), source: blVal('bl-source') };
  if (bl.corrects && !blVal('bl-comment')) { msg.textContent = 'Skriv varför posten rättas.'; return; }
  let entries = [], kastEvent = null;
  if (bl.kind === 'kastrering' && !bl.corrects) {
    if (!blVal('bl-k-bed') || !blVal('bl-k-smart')) { msg.textContent = 'Både lokalbedövning och smärtlindring krävs före kastrering.'; return; }
    if (!blVal('bl-k-utb')) { msg.textContent = 'Den som kastrerar ska ha godkänd utbildning. Annars ska veterinär utföra ingreppet.'; return; }
    if (!blVal('bl-k-alder')) { msg.textContent = 'Efter 7 dagars ålder får bara djurhälsopersonal kastrera.'; return; }
    const antal = blVal('bl-k-antal');
    entries = [
      { ...common, drug: blVal('bl-k-bed-drug'), dose: blVal('bl-k-bed-dose'), withdrawalDays: blVal('bl-k-bed-kar'), treatmentDays: 1, reason: 'Lokalbedövning vid kastrering' + (antal ? ` (${antal} hangrisar)` : '') },
      { ...common, drug: blVal('bl-k-sm-drug'), dose: blVal('bl-k-sm-dose'), withdrawalDays: blVal('bl-k-sm-kar'), treatmentDays: 1, reason: 'Smärtlindring vid kastrering' + (antal ? ` (${antal} hangrisar)` : '') }
    ];
    kastEvent = { antal: Number(antal) || 0, lokalbedovning: true, smartlindring: true, utbildning: true, under7dagar: true };
    blMemory('k:bed', blVal('bl-k-bed-drug')); blMemory('k:beddos', blVal('bl-k-bed-dose')); blMemory('k:bedkar', blVal('bl-k-bed-kar'));
    blMemory('k:sm', blVal('bl-k-sm-drug')); blMemory('k:smdos', blVal('bl-k-sm-dose')); blMemory('k:smkar', blVal('bl-k-sm-kar'));
  } else {
    entries = [{ ...common, drug: blVal('bl-drug'), reason: blVal('bl-reason'), dose: blVal('bl-dose'), treatmentDays: blVal('bl-days'),
      withdrawalDays: blVal('bl-kar'), corrects: bl.corrects, comment: blVal('bl-comment') }];
    blMemory('drug:' + blVal('bl-drug'), { dose: blVal('bl-dose'), days: blVal('bl-days'), kar: blVal('bl-kar') });
  }
  blMemory('vet', common.vet); blMemory('source', common.source);
  btn.disabled = true; msg.textContent = '';
  try {
    for (const entry of entries) {
      const res = await snoApi({ action: 'blacksta_addMed', entry });
      if (res.status !== 'success') { msg.textContent = res.message || 'Kunde inte spara.'; btn.disabled = false; return; }
    }
    if (kastEvent) await blLogEvent('kastrering', common.stall, bl.job ? bl.job.id : '', 'Kastrering med lokalbedövning och smärtlindring', kastEvent);
    blCloseMed();
    alert('Sparat i läkemedelsjournalen ✅');
    if (!document.getElementById('bl-journal-modal').classList.contains('hidden')) blOpenJournal();
  } catch (err) {
    msg.textContent = 'Ingen kontakt – inget sparades. Försök igen när du har täckning.';
    btn.disabled = false;
  }
}

// ---------- JOURNALVY (för kontroll) ----------
let blJournal = { tab: 'med', from: '', to: '', med: [], events: [] };

async function blOpenJournal() {
  const m = document.getElementById('bl-journal-modal');
  m.classList.remove('hidden'); m.classList.add('flex');
  if (!blJournal.from) { const d = new Date(); d.setDate(d.getDate() - 90); blJournal.from = d.toISOString().slice(0, 10); blJournal.to = blToday(); }
  document.getElementById('bl-journal-body').innerHTML = '<p class="text-slate-400 text-sm">Hämtar…</p>';
  try {
    const [med, ev] = await Promise.all([
      snoApi({ action: 'blacksta_getMed', from: blJournal.from, to: blJournal.to }),
      snoApi({ action: 'blacksta_getEvents', from: blJournal.from, to: blJournal.to })
    ]);
    blJournal.med = med.status === 'success' ? med.entries : [];
    blJournal.events = ev.status === 'success' ? ev.events : [];
    if (med.status !== 'success') throw new Error(med.message);
  } catch (err) {
    document.getElementById('bl-journal-body').innerHTML = `<p class="text-red-300 text-sm">Kunde inte hämta journalen: ${blEsc(err.message || 'ingen kontakt')}</p>`;
    return;
  }
  blRenderJournal();
}
function blCloseJournal() { const m = document.getElementById('bl-journal-modal'); m.classList.add('hidden'); m.classList.remove('flex'); }

function blRenderJournal() {
  const today = blToday();
  const active = blJournal.med.filter(e => !e.correctedBy && e.withdrawalEnd.slice(0, 10) >= today && e.withdrawalDays > 0);
  const tabBtn = (k, t) => `<button onclick="blJournal.tab='${k}'; blRenderJournal()" class="px-3 py-1.5 rounded-lg text-xs font-bold ${blJournal.tab === k ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'}">${t}</button>`;
  const medRows = blJournal.med.map(e => `<tr class="border-b border-slate-800 ${e.correctedBy ? 'opacity-50 line-through' : ''}">
      <td class="p-1.5 whitespace-nowrap">${blEsc(e.date)} ${blEsc(e.time)}</td><td class="p-1.5">${blEsc(e.animals)}</td><td class="p-1.5">${blEsc(e.reason)}</td>
      <td class="p-1.5 font-bold">${blEsc(e.drug)}</td><td class="p-1.5">${blEsc(e.dose)}</td><td class="p-1.5">${e.treatmentDays} d</td>
      <td class="p-1.5 whitespace-nowrap ${e.withdrawalEnd.slice(0, 10) >= today && e.withdrawalDays > 0 ? 'text-amber-300 font-bold' : ''}">${e.withdrawalDays} d → ${blEsc(e.withdrawalEnd)}</td>
      <td class="p-1.5">${blEsc(e.vet)}</td><td class="p-1.5">${blEsc(e.user)}</td>
      <td class="p-1.5">${e.correctedBy ? `rättad (${blEsc(e.correctedBy)})` : `<button onclick='blOpenMedForm(null, ${JSON.stringify(e).replace(/'/g, '&#39;')})' class="text-sky-300 underline">Rätta</button>`}</td></tr>`).join('');
  const evRows = blJournal.events.map(e => `<tr class="border-b border-slate-800"><td class="p-1.5 whitespace-nowrap">${blEsc(e.time)}</td><td class="p-1.5 font-bold">${blEsc(e.type)}</td>
      <td class="p-1.5">${blEsc(e.stall)}</td><td class="p-1.5">${blEsc(e.text)}</td><td class="p-1.5">${blEsc(e.user)}</td></tr>`).join('');
  document.getElementById('bl-journal-body').innerHTML = `
    <div class="flex flex-wrap gap-2 items-end">
      ${tabBtn('med', '💉 Läkemedelsjournal')}${tabBtn('ev', '📋 Händelser')}
      <label class="text-[10px] text-slate-400 font-bold uppercase ml-auto">Från <input type="date" value="${blJournal.from}" onchange="blJournal.from=this.value; blOpenJournal()" class="block bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white"></label>
      <label class="text-[10px] text-slate-400 font-bold uppercase">Till <input type="date" value="${blJournal.to}" onchange="blJournal.to=this.value; blOpenJournal()" class="block bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white"></label>
      <button onclick="blExportCsv()" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 text-white">⬇️ CSV</button>
      <button onclick="blOpenMedForm(null)" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-700 text-white">➕ Ny behandling</button>
    </div>
    ${active.length ? `<div class="bg-amber-950/50 border border-amber-500/50 rounded-xl p-2 text-xs text-amber-100">⏳ <b>Pågående karens:</b> ${active.map(e => `${blEsc(e.animals)} (${blEsc(e.drug)}) till ${blEsc(e.withdrawalEnd)}`).join(' · ')} – inte till slakt före dess.</div>` : ''}
    <div class="overflow-auto max-h-[55vh] text-[11px] text-slate-200">
      ${blJournal.tab === 'med'
        ? `<table class="w-full"><tr class="text-slate-400 text-left"><th class="p-1.5">Datum</th><th class="p-1.5">Djur/grupp</th><th class="p-1.5">Orsak</th><th class="p-1.5">Läkemedel</th><th class="p-1.5">Dos</th><th class="p-1.5">Tid</th><th class="p-1.5">Karens</th><th class="p-1.5">Veterinär</th><th class="p-1.5">Utförd av</th><th></th></tr>${medRows || '<tr><td class="p-3 text-slate-400" colspan="10">Inga poster i perioden.</td></tr>'}</table>`
        : `<table class="w-full"><tr class="text-slate-400 text-left"><th class="p-1.5">Tid</th><th class="p-1.5">Typ</th><th class="p-1.5">Stall</th><th class="p-1.5">Beskrivning</th><th class="p-1.5">Av</th></tr>${evRows || '<tr><td class="p-3 text-slate-400" colspan="5">Inga händelser i perioden.</td></tr>'}</table>`}
    </div>
    <p class="text-[10px] text-slate-500">Journalen sparas i 5 år och skrivs aldrig över – rättelser blir nya poster. Allt finns även i kalkylarket (flikarna Läkemedelsjournal och Blacksta_Händelser).</p>`;
}

function blExportCsv() {
  const med = blJournal.tab === 'med';
  const head = med ? ['Post-ID', 'Datum', 'Klockslag', 'Djur/grupp', 'Stall', 'Orsak', 'Läkemedel', 'Dos', 'Behandlingstid (dagar)', 'Karenstid (dagar)', 'Karens slut', 'Veterinär', 'Inköpt från', 'Utförd av', 'Registrerad', 'Rättar', 'Rättad av', 'Kommentar']
    : ['Händelse-ID', 'Tid', 'Typ', 'Stall', 'Jobb', 'Utförd av', 'Beskrivning'];
  const rows = med ? blJournal.med.map(e => [e.id, e.date, e.time, e.animals, e.stall, e.reason, e.drug, e.dose, e.treatmentDays, e.withdrawalDays, e.withdrawalEnd, e.vet, e.source, e.user, e.registered, e.corrects, e.correctedBy, e.comment])
    : blJournal.events.map(e => [e.id, e.time, e.type, e.stall, e.jobId, e.user, e.text]);
  const csv = [head, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `${med ? 'lakemedelsjournal' : 'handelser'}_${blJournal.from}_${blJournal.to}.csv`;
  a.click();
}

// ---------- RUTOR, KNAPPAR OCH START ----------
(function blInit() {
  document.body.insertAdjacentHTML('beforeend', `
    <div id="bl-med-modal" class="fixed inset-0 modal-backdrop hidden items-center justify-center p-4 z-[300]" onclick="if (event.target === this) blCloseMed()">
      <div id="bl-med-body" class="glass-modal p-5 rounded-3xl max-w-lg w-full space-y-3 border border-slate-700/60 shadow-2xl max-h-[92vh] overflow-y-auto"></div></div>
    <div id="bl-journal-modal" class="fixed inset-0 modal-backdrop hidden items-center justify-center p-4 z-[280]" onclick="if (event.target === this) blCloseJournal()">
      <div class="glass-modal p-5 rounded-3xl max-w-5xl w-full space-y-3 border border-slate-700/60 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div class="flex justify-between items-center"><h3 class="font-black text-lg text-white">📒 Journal – Blacksta</h3>
          <button onclick="blCloseJournal()" class="text-slate-400 hover:text-white text-xs font-bold bg-slate-800 p-1.5 rounded-lg">✖</button></div>
        <div id="bl-journal-body" class="space-y-3"></div></div></div>`);
  // Journalknapp + sparstatus i Paddans header, journalknapp i Stöveln
  const paddaLeft = document.querySelector('#view-padda header > div');
  if (paddaLeft) paddaLeft.insertAdjacentHTML('beforeend', `<button onclick="blOpenJournal()" class="px-3 py-1 bg-rose-800 hover:bg-rose-700 rounded-lg text-xs font-bold text-white">📒 Journal</button><span id="bl-status"></span>`);
  const mobile = document.getElementById('view-mobile');
  if (mobile) mobile.insertAdjacentHTML('afterbegin', `<button onclick="blOpenJournal()" class="absolute top-4 left-4 z-50 text-xs bg-rose-800/90 px-3 py-1 rounded-lg text-white border border-rose-600">📒 Journal</button>`);
  blLoadPlan();
})();
