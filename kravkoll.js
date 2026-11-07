// Lägsta krav (bestämt med Daniel 2026-11-07): hellre en tydlig spärr än en app som fungerar halvbra.
// Appen kräver det som finns från iOS 16.2 / Safari 16.2 (och motsvarande Chrome/Edge/Firefox):
// color-mix() och dvh i CSS samt ?. och ?? i JavaScript. Saknas något visas en ruta om att uppdatera.
// Skrivs med gammal JavaScript (var/function) så att just den här filen fungerar även på gamla telefoner.
// Laddas först i <head> på appens sidor. Kunder som öppnar en offertlänk (?offert= / ?ata=) spärras inte.
(function () {
  var q = location.search || '';
  if (/[?&](offert|ata)=/.test(q)) return;
  function ok() {
    try { new Function('var a = { b: 1 }; return a?.b ?? 0;'); } catch (e) { return false; }
    if (!window.CSS || !CSS.supports) return false;
    return CSS.supports('color', 'color-mix(in srgb, red, blue)') && CSS.supports('height', '1dvh');
  }
  if (ok()) return;
  window.LPV_FOR_GAMMAL = true;
  var ios = (navigator.userAgent.match(/OS (\d+)_(\d+)/) || []);
  var version = ios[1] ? 'iOS ' + ios[1] + '.' + ios[2] : 'den här webbläsaren';
  function show() {
    document.body.innerHTML =
      '<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:460px;margin:12vh auto;padding:24px;line-height:1.5;color:#071d33">' +
      '<div style="font-size:48px">📱</div>' +
      '<h1 style="font-size:22px;margin:8px 0 12px">Telefonen behöver uppdateras</h1>' +
      '<p>Appen kräver <b>iOS 16.2 eller senare</b> (eller en ny version av Chrome, Edge eller Firefox). Den här enheten har ' + version + '.</p>' +
      '<p><b>iPhone/iPad:</b> Inställningar → Allmänt → Programuppdatering.</p>' +
      '<p style="color:#64748b">Går det inte att uppdatera (för gammal telefon)? Prata med arbetsledaren.</p></div>';
    document.body.style.background = '#e6eff9';
  }
  if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
})();
