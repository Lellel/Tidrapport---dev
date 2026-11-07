// UE-sidan: 🔍 Hämta från Bolagsverket (org.nr → namn och adress) och ☐ F-skatt kontrollerad.
// Beslut 2026-11-07 (docs/snoplanering.md "UE-vyn"): Bolagsverkets öppna API (gratis, ingen namnsökning).
// F-skatt kontrolleras för hand hos Skatteverket – deras API kräver certifikat och avtal.
// Använder ue.html:s $, esc, api, say, cur, coBy, load och ensureRegistered.

const SKV_FORETAGSINFO = 'https://www.skatteverket.se/hamtaforetagsinformation';

async function lookupOrgNr() {
  const nr = $('cOrg').value.trim();
  if (!nr) { say('❌ Skriv org.nr först.'); return; }
  say('Frågar Bolagsverket…');
  const res = await api({ action: 'lookupOrgNr', orgNr: nr });
  if (res.status !== 'success') { say('❌ ' + esc(res.message)); return; }
  const fill = (id, v) => {
    const el = $(id), old = el.value.trim();
    if (!v || old === v) return;
    if (!old || confirm(`Byta "${old}" mot "${v}" från Bolagsverket?`)) el.value = v;
  };
  $('cOrg').value = res.orgNr;
  fill('cName', res.name);
  fill('cAddr', res.address);
  say(res.deregistered ? `⚠️ ${esc(res.name)} är avregistrerat sedan ${esc(res.deregistered)} hos Bolagsverket.`
    : `✅ ${esc(res.name)}${res.form ? ' · ' + esc(res.form) : ''}. Fyll i kontaktuppgifterna och tryck 💾 Spara.`);
}

// Rutan i företagskortet, under avtalet
function fskattBlock(c) {
  return `<label class="agree"><input type="checkbox" ${c.fskattAt ? 'checked' : ''} onchange="setFskatt(this)">
    <div><b>F-skatt kontrollerad</b><div class="sub">${c.fskattAt ? 'Kryssat ' + esc(c.fskattAt) + (c.fskattBy ? ' av ' + esc(c.fskattBy) : '')
      : 'Kolla hos Skatteverket att företaget har F-skatt innan det börjar jobba.'}</div></div></label>
    <div class="links"><button class="lpv-btn small" onclick="openSkatteverket()">🔎 Kolla F-skatt</button></div>`;
}

// Öppnar Skatteverkets "Hämta företagsinformation" och lägger org.nr i urklipp
async function openSkatteverket() {
  const c = coBy(cur), nr = (c && c.orgNr || '').trim();
  window.open(SKV_FORETAGSINFO, '_blank', 'noopener');
  if (!nr) { say('⚠️ Inget org.nr ifyllt – lägg in det under Uppgifter.'); return; }
  try { await navigator.clipboard.writeText(nr.replace(/\D/g, '')); say(`📋 Org.nr ${esc(nr)} kopierat – klistra in det hos Skatteverket.`); }
  catch (e) { say(`Sök på org.nr ${esc(nr)} hos Skatteverket.`); }
}

async function setFskatt(box) {
  const c = coBy(cur), on = box.checked;
  if (on && !confirm(`Har du sett hos Skatteverket att ${c.name} har F-skatt?`)) { box.checked = false; return; }
  say('Sparar…');
  try {
    const reg = await ensureRegistered(c);
    const res = await api({ action: 'setUeFskatt', id: reg.id, checked: on });
    if (res.status !== 'success') throw new Error(res.message);
    await load();
    say(on ? '✅ F-skatt kontrollerad.' : 'F-skattekontrollen borttagen.');
  } catch (e) { box.checked = !on; say('❌ ' + esc(e.message || e)); }
}
