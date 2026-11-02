// Onboarding: så lägger man appen på hemskärmen (iPhone/iPad och Android).
// Visas automatiskt första gången en inloggad person öppnar appen i mobilens webbläsare,
// och kan öppnas igen från bannern överst. Visas aldrig för kunder (offertlänkar),
// på datorer eller i den installerade appen.
//
// iPhone: appen på hemskärmen får ett EGET minne, skilt från Safari. Nyckeln som
// sparades när länken öppnades i Safari följer alltså inte med. Därför läggs
// ?user=&key= tillbaka i adressen medan guiden är öppen – då sparas de i genvägen
// och appen loggas in första gången den startas. (manifest.json får därför inte
// ha någon start_url, då skulle iPhone använda den i stället för adressen.)
(function () {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const standalone = navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  const params = new URLSearchParams(location.search);
  const isCustomerLink = params.has('offert') || params.has('ata') || params.has('code');

  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* privat läge */ } };

  if (standalone) { set('lpv_installed', 'true'); return; }
  // Android delar minne mellan Chrome och appen, så där vet vi att den redan är installerad
  if (isCustomerLink || !(isIOS || isAndroid) || !get('lpv_key') || get('lpv_installed') === 'true') return;

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; if (document.getElementById('inst-modal')) render(); });
  window.addEventListener('appinstalled', () => { set('lpv_installed', 'true'); close(); hideBanner(); });

  const name = String(get('lpv_user') || get('lpv_user_name') || '').replace(/[<>&"']/g, '');
  const isSafari = isIOS && !/CriOS|FxiOS|EdgiOS/.test(ua);

  const ICON_SHARE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-5px"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  const ICON_ADD = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" style="vertical-align:-5px"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  const ICON_DOTS = '<b style="font-size:20px;line-height:1;color:#0284c7">⋮</b>';

  // iPhone: nyckeln i adressen så att den följer med till hemskärmen
  function putKeyInUrl() {
    if (!isIOS) return;
    const q = new URLSearchParams(location.search);
    q.set('user', get('lpv_user') || get('lpv_user_name') || '');
    q.set('key', get('lpv_key') || '');
    if (get('lpv_is_admin') === 'true') q.set('admin', 'true');
    history.replaceState(null, '', location.pathname + '?' + q.toString());
  }
  function removeKeyFromUrl() {
    const q = new URLSearchParams(location.search);
    if (!q.has('key')) return;
    q.delete('key');
    const rest = q.toString();
    history.replaceState(null, '', location.pathname + (rest ? '?' + rest : ''));
  }

  const step = (n, html) => `<div style="display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-top:1px solid #e2e8f0">
    <div style="flex:0 0 28px;height:28px;border-radius:50%;background:#0284c7;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center">${n}</div>
    <div style="font-size:15px;line-height:1.45;color:#0f172a">${html}</div></div>`;

  function iosSteps() {
    return step(1, isSafari
        ? `Tryck på <b>Dela</b> ${ICON_SHARE} – längst ner i Safari (på iPad uppe till höger). Syns den inte: tryck först på <b>•••</b>.`
        : `Tryck på <b>Dela</b> ${ICON_SHARE} uppe till höger i adressfältet. Fungerar det inte: öppna länken i <b>Safari</b> i stället.`) +
      step(2, `Bläddra ner och välj <b>Lägg till på hemskärmen</b> ${ICON_ADD}`) +
      step(3, `Låt <b>Öppna som webbapp</b> vara påslaget om det finns, och tryck <b>Lägg till</b>.`) +
      step(4, `Stäng Safari och öppna <b>appen från hemskärmen</b>. Du är inloggad direkt.`);
  }
  function androidSteps() {
    const button = deferredPrompt
      ? `<button id="inst-native" style="width:100%;min-height:52px;margin:6px 0 4px;border:0;border-radius:14px;background:#0284c7;color:#fff;font-size:17px;font-weight:800">📲 Installera appen</button>
         <div style="font-size:12px;color:#64748b;text-align:center;margin-bottom:6px">…eller gör det för hand:</div>`
      : '';
    return button +
      step(1, `Tryck på menyn ${ICON_DOTS} uppe till höger i Chrome. <span style="color:#64748b">(Samsung: menyn ☰ längst ner.)</span>`) +
      step(2, `Välj <b>Installera app</b> eller <b>Lägg till på startskärmen</b>.`) +
      step(3, `Tryck <b>Installera</b> / <b>Lägg till</b>.`) +
      step(4, `Öppna <b>appen från startskärmen</b>. Du är inloggad direkt.`);
  }

  // Appens style.css tvingar ljus text på span/p/strong (mörkt glas) – guiden och bannern har egna färger
  function ensureStyle() {
    if (document.getElementById('inst-style')) return;
    const st = document.createElement('style');
    st.id = 'inst-style';
    st.textContent = '#inst-modal span,#inst-modal p,#inst-modal strong,#inst-banner span{color:inherit !important;text-shadow:none !important}';
    document.head.appendChild(st);
  }

  function render() {
    ensureStyle();
    let m = document.getElementById('inst-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'inst-modal';
      m.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,.55);display:flex;align-items:flex-end;justify-content:center;padding:12px;';
      document.body.appendChild(m);
    }
    m.innerHTML = `<div role="dialog" aria-modal="true" aria-labelledby="inst-title" style="background:#fff;border-radius:22px;max-width:460px;width:100%;max-height:92vh;overflow-y:auto;padding:20px 18px calc(16px + env(safe-area-inset-bottom));box-shadow:0 20px 50px rgba(0,0,0,.3);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      <div style="text-align:center;margin-bottom:8px">
        <img src="icon.png" alt="" width="64" height="64" style="border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,.15)">
        <div id="inst-title" role="heading" aria-level="2" style="margin:10px 0 4px;font-size:21px;font-weight:800;color:#0f172a">Välkommen${name ? ', ' + name : ''}! 👋</div>
        <div style="font-size:14px;color:#475569">Lägg appen på ${isIOS ? 'hemskärmen' : 'startskärmen'} – då öppnas den som en vanlig app, utan adressfält, och du är alltid inloggad.</div>
      </div>
      ${isIOS ? iosSteps() : androidSteps()}
      <button id="inst-done" style="width:100%;min-height:48px;margin-top:12px;border:0;border-radius:14px;background:#16a34a;color:#fff;font-size:16px;font-weight:800">✅ Klart, jag har lagt till den</button>
      <button id="inst-later" style="width:100%;min-height:44px;margin-top:8px;border:1px solid #cbd5e1;border-radius:14px;background:#fff;color:#475569;font-size:15px;font-weight:600">Senare</button>
    </div>`;
    m.querySelector('#inst-done').onclick = () => { set('lpv_install_seen', 'true'); set('lpv_install_banner_hidden', 'true'); close(); hideBanner(); };
    m.querySelector('#inst-later').onclick = () => { set('lpv_install_seen', 'true'); close(); };
    const native = m.querySelector('#inst-native');
    if (native) native.onclick = async () => {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice.catch(() => null);
      deferredPrompt = null;
      if (choice && choice.outcome === 'accepted') { set('lpv_installed', 'true'); close(); hideBanner(); } else render();
    };
  }

  function open() { putKeyInUrl(); render(); }
  function close() { const m = document.getElementById('inst-modal'); if (m) m.remove(); removeKeyFromUrl(); }
  window.showInstallGuide = open;

  function hideBanner() { const b = document.getElementById('inst-banner'); if (b) b.remove(); }
  function showBanner() {
    if (get('lpv_install_banner_hidden') === 'true' || document.getElementById('inst-banner')) return;
    ensureStyle();
    const b = document.createElement('div');
    b.id = 'inst-banner';
    b.style.cssText = 'display:flex;align-items:center;gap:8px;margin:0 0 12px;padding:10px 12px;border-radius:14px;background:#0284c7;color:#fff;font-size:14px;font-weight:700;cursor:pointer;';
    b.innerHTML = `<span style="flex:1">📲 Lägg appen på ${isIOS ? 'hemskärmen' : 'startskärmen'}</span><button aria-label="Dölj" style="border:0;background:rgba(255,255,255,.2);color:#fff;border-radius:8px;width:32px;height:32px;font-size:15px">✕</button>`;
    b.onclick = open;
    b.querySelector('button').onclick = (e) => { e.stopPropagation(); set('lpv_install_banner_hidden', 'true'); hideBanner(); };
    const container = document.querySelector('.app-container') || document.body;
    container.insertBefore(b, container.firstChild);
  }

  function start() {
    showBanner();
    if (get('lpv_install_seen') !== 'true') open();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
