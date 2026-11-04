// Tydligt besked när enhetens inloggning inte gäller längre (bestämt 2026-11-04).
// Servern svarar "Åtkomst nekad: Ogiltig inloggning" när nyckeln som enheten har sparat inte stämmer
// med kolumn L i Personal (t.ex. efter "Spärra & skapa ny länk") eller när personen är i karantän.
// I stället för ett kryptiskt fel vid en enskild knapp visas en banderoll överst på sidan.
(function () {
  if (window.__lpvInloggning) return;
  window.__lpvInloggning = true;
  const orig = window.fetch;
  if (!orig) return;

  let shown = false;
  function show() {
    if (shown || !document.body) return;
    shown = true;
    const standalone = window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
    const bar = document.createElement('div');
    bar.setAttribute('role', 'alert');
    bar.style.cssText = 'position:fixed;z-index:5000;left:calc(env(safe-area-inset-left) + 10px);right:calc(env(safe-area-inset-right) + 10px);' +
      'top:calc(env(safe-area-inset-top) + 8px);max-width:640px;margin:0 auto;padding:12px 44px 12px 14px;border-radius:14px;' +
      'background:#b91c1c;color:#fff;font:600 14px/1.4 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3)';
    bar.innerHTML = '🔒 <b>Inloggningen på den här enheten gäller inte längre.</b><br>' +
      'Öppna din senaste inloggningslänk (SMS eller mejl) – eller be admin om en ny.' +
      (standalone ? '<br><span style="font-weight:500;opacity:.92">Appen från hemskärmen: ta bort den och lägg till den igen från länken i Safari.</span>' : '') +
      '<button type="button" aria-label="Stäng" style="position:absolute;top:6px;right:6px;width:32px;height:32px;min-height:0;padding:0;border:0;border-radius:50%;' +
      'background:rgba(255,255,255,.2);color:#fff;font-size:16px;cursor:pointer">✕</button>';
    bar.querySelector('button').onclick = () => bar.remove();
    document.body.appendChild(bar);
  }

  window.fetch = function (input) {
    const p = orig.apply(this, arguments);
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (typeof CONFIG === 'undefined' || !CONFIG.API_URL || url.indexOf(CONFIG.API_URL) !== 0) return p;
    // Läs en kopia av svaret – sidans egen kod läser originalet som vanligt
    p.then(res => res.clone().json())
      .then(j => { if (j && j.status === 'error' && /Ogiltig inloggning/i.test(j.message || '')) show(); })
      .catch(() => { /* inte JSON eller ingen täckning – inget att visa */ });
    return p;
  };
})();
