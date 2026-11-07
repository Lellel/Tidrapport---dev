// Startsidans högerspalt och säsongsläge (docs/startsidan.md, bestämt 2026-11-07).
// - Knappmenyn (admin, iPad/dator): ordning och synlighet efter ❄️ Snösäsong. Utanför säsongen ligger
//   snöknapparna under "⋯ Fler". Mer-menyn i telefonen får samma ordning.
// - Översikt & Tider: dold, SU slår på den i moduler.html.
// - ❄️ Snöläget (admin, snösäsong, bara iPad/dator): snolage.js ritar det om det finns.
// - Påminnelsekort till SU i kortsnurran: slå på/av snösäsongen.
// Appläget kommer från servern (me → lpv_applage). Det styr bara vad som visas.
(function () {
  const $ = (id) => document.getElementById(id);
  const get = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* privat läge */ } };
  const lage = () => { try { return Object.assign({ sno: false, oversikt: false }, JSON.parse(get('lpv_applage') || '{}')); } catch (e) { return { sno: false, oversikt: false }; } };
  const isAdmin = () => get('lpv_is_admin') === 'true';
  const isSu = () => get('lpv_su') === 'true';
  // Samma gräns som style.css använder för högerspalten
  const wide = () => window.matchMedia && matchMedia('screen and (min-width: 768px), screen and (orientation: landscape)').matches;

  const ORDER_SNO = ['sno', 'kontor', 'ovrigt'];
  const ORDER_KONTOR = ['kontor', 'ovrigt'];

  function arrangeMenu(sno) {
    const grid = $('admin-menu-grid'), fler = $('admin-menu-fler'), more = $('admin-menu-more');
    if (!grid || !fler) return;
    const all = [...grid.querySelectorAll('[data-grupp]'), ...fler.querySelectorAll('[data-grupp]')];
    const rank = (b) => { const g = b.dataset.grupp; const i = (sno ? ORDER_SNO : ORDER_KONTOR).indexOf(g); return i === -1 ? 9 : i; };
    all.sort((a, b) => rank(a) - rank(b) || all.indexOf(a) - all.indexOf(b));
    all.forEach(b => { (!sno && b.dataset.grupp === 'sno' ? fler : grid).appendChild(b); });
    more.hidden = !fler.children.length;
  }

  // Mer-menyn: under snösäsong snö först, annars snö sist under en egen rubrik
  function arrangeMore(sno) {
    const sheet = document.querySelector('#moreSheet .sheet-container');
    if (!sheet) return;
    const items = [...sheet.querySelectorAll('.sheet-item[data-grupp]')];
    const label = sheet.querySelector('.sheet-label') || Object.assign(document.createElement('div'), { className: 'sheet-label', textContent: 'Snö – utanför säsongen' });
    const snow = items.filter(i => i.dataset.grupp === 'sno'), rest = [...sheet.querySelectorAll('.sheet-item')].filter(i => snow.indexOf(i) === -1);
    label.remove();
    if (sno) { const first = rest[0]; snow.forEach(i => sheet.insertBefore(i, first || null)); }
    else { sheet.appendChild(label); snow.forEach(i => sheet.appendChild(i)); }
  }

  function refresh() {
    const l = lage(), admin = isAdmin();
    const aside = $('landscape-dashboard'), menu = $('admin-menu'), over = $('dash-oversikt'), snoBox = $('sno-lage');
    if (menu) menu.hidden = !admin;
    if (over) over.hidden = !l.oversikt;
    arrangeMenu(!!l.sno);
    arrangeMore(!!l.sno);
    const showSno = admin && l.sno && wide();
    if (snoBox) {
      snoBox.hidden = !showSno;
      if (showSno && window.lpvSnolage) window.lpvSnolage.start(snoBox);
      else if (window.lpvSnolage) window.lpvSnolage.stop();
    }
    if (aside) aside.hidden = !(admin || l.oversikt);
  }

  // ===== Påminnelser till SU (kort i kortsnurran) =====
  const DAGAR = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
  const MANAD = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
  function dayName(ms) {
    const d = new Date(ms), today = new Date();
    const diff = Math.round((new Date(d.toDateString()) - new Date(today.toDateString())) / 86400000);
    return diff <= 0 ? 'i dag' : diff === 1 ? 'i morgon' : DAGAR[d.getDay()];
  }
  const stampMs = (s) => { const t = Date.parse(String(s || '').replace(' ', 'T')); return isNaN(t) ? 0 : t; };

  function reminder() {
    const l = lage(), now = new Date(), p = l.prognos || { cm: 0, first: 0 };
    if (!l.sno && p.cm >= 1 && p.first) {
      const tag = 'pa:' + new Date(p.first).toDateString();
      if (get('lpv_sno_paminn') === tag) return null;
      return { tag, turnOn: true, title: `❄️ Snö i prognosen ${dayName(p.first)}`,
        meta: `Plogometern: ca ${String(p.cm).replace('.', ',')} cm${p.omrade ? ' i ' + p.omrade : ''} de närmaste 5 dygnen. Snösäsongen är avstängd.`, btn: '❄️ Slå på' };
    }
    const last = stampMs(l.senasteSnofall);
    const spring = now.getMonth() >= 3 && now.getMonth() <= 8; // från 1 april (och över sommaren om den glömts på)
    if (l.sno && spring && (!last || now - last > 21 * 86400000) && !(p.cm >= 1)) {
      const tag = 'av:' + now.toISOString().slice(0, 10);
      const snoozed = get('lpv_sno_paminn');
      if (snoozed.indexOf('av:') === 0 && now - Date.parse(snoozed.slice(3)) < 7 * 86400000) return null;
      const since = last ? `sedan ${new Date(last).getDate()} ${MANAD[new Date(last).getMonth()]}` : 'på länge';
      return { tag, turnOn: false, title: `🌱 Inget snöfall ${since}`, meta: 'Och ingen snö i prognosen. Slå av snösäsongen?', btn: '🌱 Slå av' };
    }
    return null;
  }

  async function setSno(on) {
    const session = get('lpv_su_session');
    if (!session) { location.href = 'moduler.html'; return false; }
    let r;
    try {
      const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow',
        body: JSON.stringify({ action: 'suCall', session, op: 'setAppLage', sno: on }) });
      r = await res.json();
    } catch (e) { r = { status: 'error', message: 'Ingen kontakt med servern.' }; }
    if (r.code === 'su_login') { location.href = 'moduler.html'; return false; }
    if (r.status !== 'success') { alert('❌ ' + (r.message || 'Kunde inte spara.')); return false; }
    set('lpv_applage', JSON.stringify(r.appLage));
    refresh();
    return true;
  }

  function reminderCards(container) {
    if (!isSu() || !container) return;
    const r = reminder();
    if (!r) return;
    const card = document.createElement('div');
    card.className = 'draft-card';
    card.innerHTML = `<div class="card-body"><div class="card-title"></div><div class="card-meta" style="margin-top:6px;"></div></div>
      <div class="card-actions"><button class="btn-action" data-go></button><button class="btn-action" style="background:transparent" data-later>Inte nu</button></div>`;
    card.querySelector('.card-title').textContent = r.title;
    card.querySelector('.card-meta').textContent = r.meta;
    card.querySelector('[data-go]').textContent = r.btn;
    card.querySelector('[data-go]').onclick = async () => { if (await setSno(r.turnOn)) card.remove(); };
    card.querySelector('[data-later]').onclick = () => { set('lpv_sno_paminn', r.tag); card.remove(); };
    container.prepend(card);
  }

  window.lpvSpalt = { refresh, reminderCards };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh); else refresh();
  if (window.matchMedia) matchMedia('screen and (min-width: 768px), screen and (orientation: landscape)').addEventListener('change', refresh);
})();
