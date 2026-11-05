// LPV-widgeten för Scriptable (iPhone/iPad) – Plogometern, Sandometern och Mina jobb.
// Skapad i appen under 📱 Widget. Innehåller din personliga widgetnyckel: dela inte skriptet.
// Widgetens "Parameter" (tryck länge på widgeten → Redigera widget):
//   tomt  = Plogometern och Sandometern
//   jobb  = Mina jobb idag och i morgon
//   alla  = alla jobb idag (bara admin)
const API = "__API__";
const KEY = "__KEY__";
const SITE = "__SITE__";

const param = String(args.widgetParameter || "").toLowerCase();
const showJobs = param.includes("jobb") || param.includes("alla");
const family = config.widgetFamily || (showJobs ? "medium" : "small");

const C = {
  bg: Color.dynamic(new Color("#f2f7fc"), new Color("#0f1a2e")),
  text: Color.dynamic(new Color("#071d33"), new Color("#e7eef7")),
  muted: Color.dynamic(new Color("#5a6b7e"), new Color("#94a3b8")),
  zone: ["#2f9e6e", "#d9a400", "#e8762b", "#d6453d"].map(c => new Color(c))
};
const zoneColor = (v) => C.zone[v >= 90 ? 3 : v >= 70 ? 2 : v >= 25 ? 1 : 0];

async function load() {
  const fm = FileManager.local();
  const cache = fm.joinPath(fm.documentsDirectory(), "lpv-widget.json");
  try {
    const req = new Request(API + "?widget=" + KEY + (param.includes("alla") ? "&alla=1" : ""));
    req.timeoutInterval = 25;
    const d = await req.loadJSON();
    if (d.status === "success") fm.writeString(cache, JSON.stringify(d));
    return d;
  } catch (e) {
    if (fm.fileExists(cache)) return Object.assign(JSON.parse(fm.readString(cache)), { offline: true });
    return { status: "error", message: "Ingen kontakt" };
  }
}

// Halvcirkelmätare ritad som tjock linje (grönt → gult → orange → rött) med visare
function gauge(value, size) {
  const w = size, h = size * 0.62, ctx = new DrawContext();
  ctx.size = new Size(w, h); ctx.opaque = false; ctx.respectScreenScale = true;
  const cx = w / 2, cy = h * 0.92, r = w * 0.40, lw = w * 0.11;
  const arc = (from, to, color) => {
    const p = new Path(), steps = 24;
    for (let i = 0; i <= steps; i++) {
      const a = Math.PI + (from + (to - from) * i / steps) / 100 * Math.PI;
      const pt = new Point(cx + r * Math.cos(a), cy + r * Math.sin(a));
      i ? p.addLine(pt) : p.move(pt);
    }
    ctx.addPath(p); ctx.setStrokeColor(color); ctx.setLineWidth(lw); ctx.strokePath();
  };
  arc(0, 24, C.zone[0]); arc(26, 49, C.zone[1]); arc(51, 74, C.zone[2]); arc(76, 100, C.zone[3]);
  const a = Math.PI + value / 100 * Math.PI, n = new Path();
  n.move(new Point(cx, cy)); n.addLine(new Point(cx + r * 0.95 * Math.cos(a), cy + r * 0.95 * Math.sin(a)));
  ctx.addPath(n); ctx.setStrokeColor(Color.dynamic(new Color("#071d33"), Color.white())); ctx.setLineWidth(w * 0.035); ctx.strokePath();
  ctx.setFillColor(Color.dynamic(new Color("#071d33"), Color.white()));
  ctx.fillEllipse(new Rect(cx - w * 0.045, cy - w * 0.045, w * 0.09, w * 0.09));
  return ctx.getImage();
}

function text(stack, t, size, color, bold) {
  const el = stack.addText(String(t));
  el.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  el.textColor = color || C.text; el.lineLimit = 2; el.minimumScaleFactor = 0.7;
  return el;
}

function meterColumn(stack, title, value, label, size) {
  const col = stack.addStack(); col.layoutVertically(); col.centerAlignContent();
  text(col, title, 11, C.muted, true);
  col.addImage(gauge(value, size)).imageSize = new Size(size, size * 0.62);
  const row = col.addStack(); row.addSpacer();
  text(row, value + " %", 20, C.text, true); row.addSpacer();
  const l = text(col, label, 11, zoneColor(value), true); l.centerAlignText();
}

function meters(w, d) {
  const a = d.areas[0];
  if (!a) { text(w, "Inga snöfastigheter kopplade till dig.", 13, C.muted); return; }
  const head = w.addStack(); text(head, "❄️ " + a.name, 12, C.muted, true); head.addSpacer();
  if (d.offline) text(head, "utan nät", 10, C.muted);
  w.addSpacer(4);
  const row = w.addStack(); row.centerAlignContent();
  const size = family === "small" ? 58 : 92;
  meterColumn(row, "🚜 Plog", a.plog, a.plogLabel, size); row.addSpacer();
  meterColumn(row, "🪣 Sand", a.sand, a.sandLabel, size);
  if (family !== "small") {
    w.addSpacer(4);
    const why = [a.plog >= 25 ? a.plogWhy + (a.plogWhen ? " · " + a.plogWhen : "") : "", a.sand >= 25 ? a.sandWhy + (a.sandWhen ? " · " + a.sandWhen : "") : ""].filter(Boolean).join("  ·  ");
    text(w, why || "Lugnt i natt", 11, C.muted);
  }
  w.url = SITE + "snojour.html";
}

function jobs(w, d) {
  const big = family === "large", lists = [["Idag", d.jobs.today], ["I morgon", d.jobs.tomorrow]];
  text(w, d.all ? "📋 Alla jobb" : "📋 Mina jobb", 13, C.text, true);
  let shown = 0; const max = family === "small" ? 2 : big ? 9 : 4;
  for (const [label, list] of lists) {
    if (shown >= max) break;
    w.addSpacer(3); text(w, label, 11, C.muted, true);
    if (!list.length) { text(w, "Inget inplanerat", 12, C.muted); continue; }
    for (const j of list) {
      if (shown++ >= max) break;
      const row = w.addStack(); row.spacing = 6;
      text(row, j.start || "–", 12, C.text, true).font = Font.semiboldMonospacedSystemFont(12);
      const col = row.addStack(); col.layoutVertically();
      text(col, j.title, 12, C.text, true).lineLimit = 1;
      const sub = [j.place, family !== "small" && j.crew.length ? "👷 " + j.crew.join(", ") : ""].filter(Boolean).join(" · ");
      if (sub) text(col, sub, 10, C.muted).lineLimit = 1;
    }
  }
  w.url = SITE + "index.html";
}

// Låsskärmen: rund mätare, eller en rad med båda
function lockScreen(w, d) {
  const a = d.areas[0];
  if (family === "accessoryInline") { w.addText(a ? `🚜 ${a.plog}%  🪣 ${a.sand}%` : "LPV: ingen snö"); return; }
  if (family === "accessoryCircular") {
    const v = a ? Math.max(a.plog, a.sand) : 0;
    w.addImage(gauge(v, 60)).imageSize = new Size(52, 32);
    const t = w.addText((a && a.sand > a.plog ? "🪣" : "🚜") + v + "%"); t.font = Font.boldSystemFont(12); t.centerAlignText();
    return;
  }
  if (!a) { w.addText("Ingen snö"); return; }
  const t1 = w.addText(`🚜 ${a.plog}%  ${a.plogLabel}`); t1.font = Font.boldSystemFont(13);
  const t2 = w.addText(`🪣 ${a.sand}%  ${a.sandLabel}`); t2.font = Font.systemFont(12);
  const t3 = w.addText(a.name); t3.font = Font.systemFont(10);
}

const d = await load();
const w = new ListWidget();
w.refreshAfterDate = new Date(Date.now() + 15 * 60000);
if (!String(family).startsWith("accessory")) { w.backgroundColor = C.bg; w.setPadding(12, 12, 12, 12); }
if (d.status !== "success") text(w, "LPV: " + (d.message || "fel"), 12, C.muted);
else if (String(family).startsWith("accessory")) lockScreen(w, d);
else if (showJobs) jobs(w, d);
else meters(w, d);

if (config.runsInWidget) Script.setWidget(w);
else if (showJobs) await w.presentMedium(); else await w.presentSmall();
Script.complete();
