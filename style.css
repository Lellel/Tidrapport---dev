:root {
  --ios-bg: #000000;
  --ios-card: #1C1C1E;
  --ios-accent: #FF9F0A;
  --ios-gray: #8E8E93;
  --ios-separator: rgba(84, 84, 88, 0.45);
  --ios-label: #FFFFFF;
  --ios-secondary-label: #8E8E93;
  --apple-yellow: #FFD60A; --apple-yellow-bg: rgba(255, 214, 10, 0.12); --apple-yellow-border: rgba(255, 214, 10, 0.25);
  --apple-green: #30D158; --apple-green-bg: rgba(48, 209, 88, 0.12); --apple-green-border: rgba(48, 209, 88, 0.25);
  --apple-red: #FF453A; --apple-red-bg: rgba(255, 69, 58, 0.12); --apple-red-border: rgba(255, 69, 58, 0.25);
  --apple-purple: #BF5AF2; --apple-purple-bg: rgba(191, 90, 242, 0.12); --apple-purple-border: rgba(191, 90, 242, 0.25);
}
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; background-color: var(--ios-bg); color: var(--ios-label); padding: calc(env(safe-area-inset-top) + 8px) 16px calc(env(safe-area-inset-bottom) + 30px) 16px; touch-action: manipulation; }

.app-wrapper { width: 100%; max-width: 580px; margin: 0 auto; position: relative; }
.app-container { width: 100%; }

@media (min-width: 850px) {
  body { padding-top: 40px; }
  .app-wrapper { display: flex; justify-content: center; gap: 32px; max-width: 1080px; align-items: flex-start; }
  .app-container { flex: 1; max-width: 480px; flex-shrink: 0; }
  #viewDash { display: block !important; flex: 1; max-width: 480px; flex-shrink: 0; position: sticky; top: calc(env(safe-area-inset-top) + 40px); }
}

header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 14px; padding: 0 4px; }
h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; color: #FFFFFF; }
.status-pill { display: inline-flex; align-items: center; gap: 6px; background: rgba(28, 28, 30, 0.85); border: 0.5px solid rgba(255,255,255,0.08); padding: 4px 11px; border-radius: 20px; font-size: 13px; font-weight: 500; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--apple-green); }
.status-dot.offline { background: var(--apple-red); }

.segmented-control { display: flex; background: rgba(118, 118, 128, 0.24); border-radius: 10px; padding: 2px; margin-bottom: 18px; }
.seg-btn { flex: 1; border: none; background: transparent; padding: 8px 4px; font-size: 14px; font-weight: 600; color: var(--ios-secondary-label); border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.seg-btn.active { background: #636366; color: #FFFFFF; }
.seg-badge { background: var(--apple-red); color: white; font-size: 11px; padding: 1px 6px; border-radius: 10px; margin-left: 5px; }

.type-control { display: flex; background: rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 2px; margin: 12px 14px 14px 14px; }
.type-btn { flex: 1; border: none; background: transparent; padding: 7px 0; font-size: 13px; font-weight: 600; color: var(--ios-secondary-label); border-radius: 6px; cursor: pointer; transition: all 0.15s; }
.type-btn.active { background: rgba(255, 255, 255, 0.16); color: #FFFFFF; }

.section-title { font-size: 12px; font-weight: 600; color: var(--ios-secondary-label); text-transform: uppercase; margin-left: 14px; margin-bottom: 6px; letter-spacing: 0.3px; }
.ios-card { background: var(--ios-card); border-radius: 14px; overflow: hidden; margin-bottom: 16px; border: 0.5px solid rgba(255, 255, 255, 0.08); }
.ios-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 0.5px solid var(--ios-separator); font-size: 16px; }
.ios-row:last-child { border-bottom: none; }

select, input[type="date"], input[type="text"] { border: none; background: transparent; font-family: inherit; font-size: 16px; color: var(--ios-accent); outline: none; max-width: 65%; text-align: right; }
input[type="text"]::placeholder { color: rgba(255,255,255,0.25); }
.time-badge { font-size: 16px; font-weight: 500; color: var(--ios-accent); background: rgba(255, 159, 10, 0.12); padding: 5px 12px; border-radius: 8px; cursor: pointer; }

.photo-btn { display: flex; justify-content: center; align-items: center; gap: 8px; padding: 12px; background: rgba(255,255,255,0.04); color: var(--ios-accent); font-weight: 500; border-radius: 10px; cursor: pointer; font-size: 14px; border: 1px dashed var(--ios-separator); margin: 12px 16px; }
textarea { width: 100%; border: none; background: transparent; font-family: inherit; font-size: 15px; color: var(--ios-label); outline: none; resize: none; min-height: 55px; padding: 10px 16px; }

.note-toggle-btn { background: none; border: none; color: var(--ios-gray); font-size: 14px; font-weight: 500; padding: 6px 14px; margin-bottom: 16px; cursor: pointer; display: flex; align-items: center; gap: 4px; }
.note-toggle-btn:hover { color: #FFF; }

.ios-btn { width: 100%; background-color: var(--ios-accent); color: #FFFFFF; font-size: 16px; font-weight: 600; padding: 14px; border-radius: 12px; border: none; cursor: pointer; display: flex; justify-content: center; align-items: center; transition: 0.2s; }
.ios-btn:active { opacity: 0.8; }
.ios-btn.blue { background-color: #0A84FF; margin-top: 14px; }

.summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 14px; }
.apple-box { padding: 14px 12px; border-radius: 14px; text-align: left; display: flex; flex-direction: column; justify-content: space-between; min-height: 78px; backdrop-filter: blur(10px); }
.apple-box-yellow { background: var(--apple-yellow-bg); border: 0.5px solid var(--apple-yellow-border); }
.apple-box-green { background: var(--apple-green-bg); border: 0.5px solid var(--apple-green-border); }
.apple-box-red { background: var(--apple-red-bg); border: 0.5px solid var(--apple-red-border); }
.apple-box-purple { background: var(--apple-purple-bg); border: 0.5px solid var(--apple-purple-border); }
.box-title { font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.3px; opacity: 0.9; }
.box-val { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-top: 4px; }
.apple-box-yellow .box-title, .apple-box-yellow .box-val { color: var(--apple-yellow); }
.apple-box-green .box-title, .apple-box-green .box-val { color: var(--apple-green); }
.apple-box-red .box-title, .apple-box-red .box-val { color: var(--apple-red); }
.apple-box-purple .box-title, .apple-box-purple .box-val { color: var(--apple-purple); }

.person-list { background: var(--ios-card); border-radius: 14px; border: 0.5px solid rgba(255, 255, 255, 0.08); overflow: hidden; }
.person-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 0.5px solid var(--ios-separator); }
.person-row:last-child { border-bottom: none; }
.person-stats { display: flex; gap: 14px; text-align: right; }
.stat-box { display: flex; flex-direction: column; }
.stat-label { font-size: 9px; color: var(--ios-secondary-label); text-transform: uppercase; font-weight: 600; }
.stat-val { font-size: 13px; font-weight: 600; }
.refresh-btn { width: 100%; background: rgba(118, 118, 128, 0.2); color: var(--ios-accent); font-size: 14px; font-weight: 600; padding: 12px; border-radius: 10px; border: none; cursor: pointer; margin-top: 14px; }

.action-sheet-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); z-index: 100; opacity: 0; transition: opacity 0.25s; }
.action-sheet-overlay.show { display: block; opacity: 1; }
.action-sheet { position: fixed; bottom: -100%; left: 0; right: 0; background: var(--ios-card); border-radius: 16px 16px 0 0; z-index: 101; transition: bottom 0.3s; padding-bottom: calc(env(safe-area-inset-bottom) + 16px); }
.action-sheet.open { bottom: 0; }
.picker-container { position: relative; height: 180px; display: flex; justify-content: center; overflow: hidden; }
.picker-highlight { position: absolute; top: 70px; left: 16px; right: 16px; height: 40px; background: rgba(118, 118, 128, 0.2); border-radius: 8px; pointer-events: none; z-index: 31; }
.picker-column { width: 90px; height: 100%; overflow-y: scroll; scroll-snap-type: y mandatory; scrollbar-width: none; padding: 70px 0; z-index: 33; }
.picker-column::-webkit-scrollbar { display: none; }
.picker-item { height: 40px; line-height: 40px; text-align: center; font-size: 22px; font-weight: 600; color: #FFF; scroll-snap-align: center; }

.pin-box { display:none; position: fixed; top: 35%; left: 50%; transform: translate(-50%, -50%); width: 85%; max-width: 300px; background: rgba(28,28,30,0.96); border-radius: 16px; z-index: 200; padding: 20px; text-align: center; border: 0.5px solid rgba(255,255,255,0.1); }
.pin-input { font-size: 26px; letter-spacing: 6px; text-align: center; width: 100%; padding: 8px; border-radius: 8px; margin-bottom: 16px; outline: none; background: #000; color: #FFF; border: 1px solid var(--ios-separator); }
.pin-buttons { display: flex; margin: 0 -20px -20px -20px; border-top: 0.5px solid var(--ios-separator); }
.pin-btn { flex: 1; padding: 12px; background: none; border: none; color: var(--ios-accent); font-size: 16px; cursor: pointer; }
#statusBox { display: none; padding: 10px; border-radius: 10px; margin-bottom: 14px; font-weight: 500; text-align: center; font-size: 14px; }
