const OUTBOX_KEY = "lpv_tid_outbox";

let staffData=[], calendarEvents=[], unreportedData=[], locationData=["Blacksta"];
let selectedUserObj=null, candidateUserObj=null, selectedEvent=null;
const MINUTE_STEPS=[0,15,30,45];
let timeState={startH:7,startM:0,endH:16,endM:0}, tempTime={h:0,m:0}, activeTimeType=null, userIndexState=0;
let currentType = 'kalender', currentPhotoBase64 = "";
let isSyncing = false;

window.onload = () => { 
  let today = new Date().toISOString().split('T')[0];
  document.getElementById('customDate').value = today;
  setupWheels(); loadData(); loadDashboard();
  
  // Lyssna på nätverket för Outbox
  window.addEventListener('online', updateNetworkStatus); 
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();
};

// ==========================================
// OUTBOX ENGINE (GRIPEN-SYSTEMET)
// ==========================================

function updateNetworkStatus() {
  let q = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
  let dot = document.getElementById('liveDot');
  let txt = document.getElementById('liveText');
  
  if (navigator.onLine) {
    if (q.length > 0) {
      dot.className = "status-dot offline";
      dot.style.background = "var(--apple-yellow)"; // Lyser gult när den jobbar
      txt.textContent = `Synkar ${q.length} köade...`;
      processOutbox(); // Tryck upp allt till Google
    } else {
      dot.className = "status-dot";
      dot.style.background = "var(--apple-green)"; // Grönt och skönt
      txt.textContent = "Ansluten";
    }
  } else {
    dot.className = "status-dot offline";
    dot.style.background = "var(--apple-red)";
    txt.textContent = q.length > 0 ? `Offline (${q.length} i kö)` : "Offline";
  }
}

function saveToOutbox(payload) {
  let q = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
  payload._id = Date.now(); // Ge rapporten ett unikt ID
  q.push(payload);
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(q));
  
  showStatus("Sparad i utkorgen! ✓");
  resetFormAfterSubmit();
  updateNetworkStatus();
}

function processOutbox() {
  if (!navigator.onLine || isSyncing) return;
  let q = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
  if (q.length === 0) {
    updateNetworkStatus();
    return;
  }
  
  isSyncing = true;
  let payload = q[0]; // Ta första i kön
  
  const form = document.getElementById('tank_form'); 
  form.action = API_URL; 
  form.innerHTML = '';
  
  for (let key in payload) { 
    if (key === '_id') continue; 
    let i = document.createElement('input'); 
    i.type = 'hidden'; i.name = key; i.value = payload[key]; 
    form.appendChild(i); 
  }
  
  let iframeLoaded = false;
  document.getElementById('tank_iframe').onload = () => { 
    if(!iframeLoaded) { iframeLoaded = true; outboxSuccess(payload._id); } 
  };
  form.submit();
  
  // Säkerhets-timer om iframe fastnar
  setTimeout(()=>{ 
    if(!iframeLoaded && navigator.onLine){ 
      iframeLoaded=true; outboxSuccess(payload._id); 
    } else if (!navigator.onLine) {
      isSyncing = false; updateNetworkStatus(); // Avbryt om vi tappade nätet
    }
  }, 3500);
}

function outboxSuccess(id) {
  let q = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
  q = q.filter(item => item._id !== id);
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(q));
  
  isSyncing = false;
  processOutbox(); // Fortsätt med nästa om det finns fler
  setTimeout(() => { loadData(); loadDashboard(); }, 1000);
}

// ==========================================
// UI LOGIK
// ==========================================

function switchView(v) { 
  ['report','notes'].forEach(id => { 
    document.getElementById('tab'+id.charAt(0).toUpperCase()+id.slice(1)+'Btn').classList.remove('active'); 
    document.getElementById('view'+id.charAt(0).toUpperCase()+id.slice(1)).style.display='none'; 
  }); 
  document.getElementById('tab'+v.charAt(0).toUpperCase()+v.slice(1)+'Btn').classList.add('active'); 
  document.getElementById('view'+v.charAt(0).toUpperCase()+v.slice(1)).style.display='block'; 
  if(v==='notes') renderNotes(); 
}

function setType(type) {
  currentType = type;
  ['kalender', 'nya', 'ata'].forEach(t => {
    document.getElementById('btn' + t.charAt(0).toUpperCase() + t.slice(1)).classList.toggle('active', t === type);
  });
  document.getElementById('passRow').style.display = (type === 'kalender') ? 'flex' : 'none';
  if (type === 'kalender') {
    document.getElementById('blockKalender').style.display = 'block';
    document.getElementById('blockCustom').style.display = 'none';
    document.getElementById('noteWrapper').style.display = 'block';
  } else {
    document.getElementById('blockKalender').style.display = 'none';
    document.getElementById('blockCustom').style.display = 'block';
    if (type === 'nya') {
      document.getElementById('customTextLabel').textContent = "Vad har gjorts?";
      document.getElementById('customText').placeholder = "T.ex. Tvätt av maskinhall...";
      document.getElementById('photoBlock').style.display = 'none';
      document.getElementById('noteWrapper').style.display = 'block';
    } else if (type === 'ata') {
      document.getElementById('customTextLabel').textContent = "Beskrivning av ÄTA";
      document.getElementById('customText').placeholder = "Vad gjordes? T.ex. Lagat ventil i stall 4...";
      document.getElementById('photoBlock').style.display = 'block';
      document.getElementById('noteWrapper').style.display = 'none';
    }
  }
  if (type !== 'ata') {
    currentPhotoBase64 = "";
    document.getElementById('photoStatus').textContent = "Bifoga bild-underlag";
    document.getElementById('photoStatus').style.color = "var(--ios-accent)";
  }
}

function toggleNoteField() {
  let card = document.getElementById('noteCard');
  let btn = document.getElementById('noteToggleBtn');
  if (card.style.display === 'none') {
    card.style.display = 'block';
    btn.textContent = "- Dölj anteckning";
    document.getElementById('noteInput').focus();
  } else {
    card.style.display = 'none';
    btn.textContent = "+ Lägg till anteckning";
  }
}

function handleLocationChange() { 
  document.getElementById('customLocationRow').style.display = (document.getElementById('locationSelect').value === "NEW") ? 'flex' : 'none'; 
}

function compressAndSaveImage(e) {
  let file = e.target.files[0]; if(!file) return;
  document.getElementById('photoStatus').textContent = "Laddar...";
  let reader = new FileReader();
  reader.onload = function(ev) {
    let img = new Image();
    img.onload = function() {
      let canvas = document.createElement('canvas');
      let MAX = 800, w = img.width, h = img.height;
      if (w > h && w > MAX) { h *= MAX/w; w = MAX; } else if (h > MAX) { w *= MAX/h; h = MAX; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      currentPhotoBase64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
      document.getElementById('photoStatus').textContent = "Bild bifogad ✓";
      document.getElementById('photoStatus').style.color = "var(--apple-green)";
    }
    img.src = ev.target.result;
  }
  reader.readAsDataURL(file);
}

function loadData() {
  if(navigator.onLine) {
    fetch(API_URL+"?action=getData").then(r=>r.json()).then(d=>{
      staffData=d.staff||[]; calendarEvents=d.events||[]; unreportedData=d.unreported||[]; locationData=d.locations||["Blacksta"];
      buildUserWheel(); populateEvents(); updateBadge(); populateLocations(); renderNotes();
    }).catch(e=>console.log("Fetch err:",e));
  }
}

function loadDashboard() {
  document.getElementById('dashLoading').style.display = 'block'; document.getElementById('dashContent').style.display = 'none';
  if(navigator.onLine) {
    fetch(API_URL+"?action=getDashboardData").then(r=>r.json()).then(d=>{
      renderDashContent(d.allReports||[]);
      document.getElementById('dashLoading').style.display = 'none'; document.getElementById('dashContent').style.display = 'block';
    }).catch(e=>console.log("Dash err:",e));
  }
}

function forceRefreshNotes(btn) {
  if (btn) { btn.textContent = "Hämtar..."; btn.style.opacity = "0.6"; }
  document.getElementById('noteBulletList').innerHTML = "<div style='color:var(--ios-secondary-label);text-align:center;padding:20px;'>Hämtar senaste tiderna...</div>";
  document.getElementById('noteSumText').textContent = "0 tim";
  loadData(); loadDashboard();
  setTimeout(() => { if (btn) { btn.textContent = "↻ Uppdatera"; btn.style.opacity = "1"; } }, 1200);
}

function populateLocations() {
  let sel = document.getElementById('locationSelect'); let current = sel.value;
  sel.innerHTML = locationData.map(l => `<option value="${l}">${l}</option>`).join('');
  sel.innerHTML += `<option value="NEW">+ Skriv in ny plats...</option>`;
  if(locationData.includes(current)) sel.value = current; else sel.value = "Blacksta";
}

function buildUserWheel() { let c = document.getElementById('userColumn'); c.innerHTML = staffData.map(u=>`<div class="picker-item">${u.name}</div>`).join(''); c.addEventListener('scroll', ()=>{ setTimeout(()=>{userIndexState=Math.max(0,Math.round(c.scrollTop/40))}, 60)}); }
function setupWheels() { buildTimeWheel('timeHours', Array.from({length:24},(_,i)=>i), false); buildTimeWheel('timeMinutes', MINUTE_STEPS, true); calcDur(); }
function buildTimeWheel(id, vals, isMin) { let c = document.getElementById(id); c.innerHTML = vals.map(v=>`<div class="picker-item">${String(v).padStart(2,'0')}</div>`).join(''); c.addEventListener('scroll', ()=>{ setTimeout(()=>{let idx=Math.max(0,Math.round(c.scrollTop/40)); if(!isMin)tempTime.h=idx; else tempTime.m=MINUTE_STEPS[Math.min(3,idx)]}, 60)}); }
function pad(n) { return String(n).padStart(2,'0'); }
function openUserPicker() { document.getElementById('overlay').classList.add('show'); document.getElementById('userPickerSheet').classList.add('open'); }
function confirmUser() { candidateUserObj=staffData[userIndexState]; closeAllPickers(); openPin(); }
function openPin() { document.getElementById('pinNameDisplay').textContent=candidateUserObj.name; document.getElementById('pinInput').value=''; document.getElementById('overlay').classList.add('show'); document.getElementById('pinBox').style.display='block'; setTimeout(()=>document.getElementById('pinInput').focus(),100); }
function closePin() { document.getElementById('overlay').classList.remove('show'); document.getElementById('pinBox').style.display='none'; }
function verifyPin() { if(document.getElementById('pinInput').value === (candidateUserObj.pin||"0000")) { selectedUserObj=candidateUserObj; document.getElementById('userValDisplay').textContent=selectedUserObj.name; closePin(); updateBadge(); renderNotes(); } else { alert("Fel PIN"); document.getElementById('pinInput').value=''; } }
function closeAllPickers() { ['userPickerSheet','timePickerSheet'].forEach(id=>document.getElementById(id).classList.remove('open')); document.getElementById('overlay').classList.remove('show'); }
function openTimePicker(t) { activeTimeType=t; document.getElementById('timePickerTitle').innerText = t==='start'?"VÄLJ STARTTID":"VÄLJ SLUTTID"; document.getElementById('overlay').classList.add('show'); document.getElementById('timePickerSheet').classList.add('open'); }
function confirmTimePicker() { if(activeTimeType==='start'){timeState.startH=tempTime.h; timeState.startM=tempTime.m;}else{timeState.endH=tempTime.h; timeState.endM=tempTime.m;} document.getElementById('startBadge').textContent=`${pad(timeState.startH)}:${pad(timeState.startM)}`; document.getElementById('endBadge').textContent=`${pad(timeState.endH)}:${pad(timeState.endM)}`; calcDur(); closeAllPickers(); }
function calcDur() { let d = (timeState.endH*60+timeState.endM)-(timeState.startH*60+timeState.startM); if(d<0)d+=1440; document.getElementById('totalDurationText').textContent = `${Math.floor(d/60)} tim ${d%60} min`; return document.getElementById('totalDurationText').textContent; }
function populateEvents() { let s = document.getElementById('eventSelect'); s.innerHTML='<option value="">-- Välj händelse --</option>'; calendarEvents.forEach((e,i)=> s.innerHTML+=`<option value="${i}">${new Date(e.start).toLocaleDateString('sv-SE',{month:'short',day:'numeric'})}: ${e.title}</option>`); }
function handleEventChange() { let i=document.getElementById('eventSelect').value, d=document.getElementById('dateSelect'); d.innerHTML=''; if(!i){d.innerHTML='<option>Välj händelse</option>'; selectedEvent=null; return;} selectedEvent=calendarEvents[i]; let c=new Date(selectedEvent.start); d.innerHTML+=`<option value="${c.toISOString().split('T')[0]}">${c.toLocaleDateString('sv-SE',{weekday:'short',day:'numeric',month:'short'})}</option>`; }
function parseMins(str) { if(!str)return 0; let s=String(str).toLowerCase(), h=0, m=0; let hm=s.match(/(\d+)\s*(tim|h)/); if(hm)h=parseInt(hm[1]); let mm=s.match(/(\d+)\s*(min|m)/); if(mm)m=parseInt(mm[1]); if(!hm&&!mm){let n=parseFloat(s.replace(',','.')); if(!isNaN(n))return Math.round(n*60);} return h*60+m; }
function fmtHrs(m) { let h=m/60; return (Number.isInteger(h)?h:h.toFixed(1).replace('.',','))+" tim"; }
function updateBadge() { let my = unreportedData.filter(i=>i.anvandare===selectedUserObj?.name); let b = document.getElementById('unreportedBadge'); if(my.length){b.textContent=my.length;b.style.display='inline-block';}else b.style.display='none'; }
function renderNotes() { 
  let l = document.getElementById('noteBulletList'), s = document.getElementById('noteSumText');
  if(!selectedUserObj) { l.innerHTML = "<div style='color:var(--ios-secondary-label);text-align:center;padding:20px;'>Välj ditt namn under 'Rapportera' först.</div>"; s.textContent="0 tim"; return; }
  let my = unreportedData.filter(i=>i.anvandare===selectedUserObj.name);
  if(!my.length) { l.innerHTML = "<div style='color:var(--apple-green);text-align:center;padding:20px;'>Allt är inrapporterat och klart!</div>"; s.textContent="0 tim"; return; }
  let tot=0;
  l.innerHTML = my.map(i=>{
    let mins = parseMins(i.totaltid); tot+=mins; let isAta = i.aktivitet.includes("[ÄTA]");
    return `<li style="margin-bottom:12px; padding-bottom:8px; border-bottom:0.5px solid rgba(255,255,255,0.05);"><div style="display:flex; justify-content:space-between;"><b style="color:${isAta?'var(--apple-purple)':'#FFF'};">${i.datum}</b><span style="font-weight:600;">${fmtHrs(mins)}</span></div><div style="font-size:14px; color:var(--ios-secondary-label); margin-top:2px;">${i.aktivitet} (${i.ort})</div></li>`;
  }).join('');
  s.textContent = fmtHrs(tot);
}
function renderDashContent(reports) {
  let t=0, d=0, p=0, a=0, pObj={};
  reports.forEach(r=>{
    let m=parseMins(r.totaltid), isD=(String(r.status).toLowerCase()==="ja"), isA=String(r.aktivitet).includes("[ÄTA]");
    t+=m; if(isD)d+=m; else p+=m; if(isA)a+=m;
    let n=r.anvandare||"Okänd"; if(!pObj[n])pObj[n]={t:0,d:0,p:0,a:0};
    pObj[n].t+=m; if(isD)pObj[n].d+=m; else pObj[n].p+=m; if(isA)pObj[n].a+=m;
  });
  document.getElementById('dashTot').innerText=fmtHrs(t); document.getElementById('dashDone').innerText=fmtHrs(d); document.getElementById('dashPend').innerText=fmtHrs(p); document.getElementById('dashAta').innerText=fmtHrs(a);
  let html="", keys=Object.keys(pObj).sort((x,y)=>pObj[y].t-pObj[x].t);
  if(!keys.length) html=`<div style="padding:16px;color:var(--ios-secondary-label);">Ingen data...</div>`;
  else keys.forEach(k=>{ let o=pObj[k]; html+=`<div class="person-row"><div style="font-weight:600;">${k}</div><div class="person-stats"><div class="stat-box"><span class="stat-label">Klart</span><span class="stat-val" style="color:var(--apple-green);">${fmtHrs(o.d)}</span></div><div class="stat-box"><span class="stat-label">Väntar</span><span class="stat-val" style="color:var(--apple-red);">${fmtHrs(o.p)}</span></div><div class="stat-box"><span class="stat-label">ÄTA</span><span class="stat-val" style="color:var(--apple-purple);">${fmtHrs(o.a)}</span></div><div class="stat-box"><span class="stat-label">Totalt</span><span class="stat-val">${fmtHrs(o.t)}</span></div></div></div>`; });
  document.getElementById('dashPersonList').innerHTML=html;
}

function showStatus(msg) { let b=document.getElementById('statusBox'); b.textContent=msg; b.style.display='block'; b.style.background='rgba(48,209,88,0.15)'; b.style.color='#30D158'; setTimeout(()=>{if(b.textContent===msg)b.style.display='none';}, 4000); }

function resetFormAfterSubmit() {
  document.getElementById('noteInput').value = "";
  document.getElementById('customText').value = "";
  document.getElementById('noteCard').style.display = 'none';
  document.getElementById('noteToggleBtn').textContent = "+ Lägg till anteckning";
  setType('kalender');
}

function initiateSubmit() {
  if(!selectedUserObj) return alert("Välj ditt namn först.");
  let loc = "Blacksta", akt = "", dat = "", note = "";

  if (currentType === 'kalender') {
    if(!selectedEvent) return alert("Välj en kalenderhändelse först.");
    dat = document.getElementById('dateSelect').value; 
    akt = selectedEvent.title + " (" + document.getElementById('passSelect').value + ")";
    note = document.getElementById('noteInput').value.trim();
  } else {
    loc = document.getElementById('locationSelect').value;
    if (loc === "NEW") { loc = document.getElementById('customLocationInput').value.trim(); if(!loc) return alert("Skriv in namnet på betalstället."); }
    dat = document.getElementById('customDate').value; if(!dat) return alert("Välj ett datum.");
    let textVal = document.getElementById('customText').value.trim();
    if (currentType === 'nya') {
      akt = textVal || "Nytt arbete"; note = document.getElementById('noteInput').value.trim();
    } else if (currentType === 'ata') {
      if (!textVal) return alert("Beskriv vad som gjorts under ÄTA.");
      akt = "[ÄTA] " + textVal; note = "";
    }
  }

  // Spara omedelbart i Utkorgen istället för att vänta på nätverket
  saveToOutbox({
    action: 'saveReport', anvandare: selectedUserObj.name, datum: dat, aktivitet: akt, plats: loc,
    starttid: `${pad(timeState.startH)}:${pad(timeState.startM)}`, sluttid: `${pad(timeState.endH)}:${pad(timeState.endM)}`,
    totaltid: calcDur(), anteckning: note, photoBase64: (currentType === 'ata' ? currentPhotoBase64 : "")
  });
}

function sendInvoiceMail() {
  if(!navigator.onLine) return alert("Du måste ha nätverkstäckning för att skicka fakturaunderlag.");
  if(!selectedUserObj) return alert("Välj namn i flik 1 först.");
  let my = unreportedData.filter(i=>i.anvandare===selectedUserObj.name);
  if(!my.length) return alert("Finns inget att skicka in.");
  
  document.getElementById('invoiceBtnText').innerText = "Skickar underlag...";
  const form = document.getElementById('tank_form'); form.action = API_URL; form.innerHTML = '';
  let payload = { action: 'markAsReported', anvandare: selectedUserObj.name };
  for (let key in payload) { let i = document.createElement('input'); i.type = 'hidden'; i.name = key; i.value = payload[key]; form.appendChild(i); }
  
  let done = false;
  document.getElementById('tank_iframe').onload = () => { if(!done) { done=true; onSuccess(); } };
  form.submit();
  setTimeout(()=>{ if(!done){ done=true; onSuccess(); } }, 2500);

  function onSuccess() {
    showStatus("Underlaget har skickats till mailen!");
    document.getElementById('invoiceBtnText').innerText = "Klart att fakturera (Skicka underlag)";
    setTimeout(() => { loadData(); loadDashboard(); }, 1000);
  }
}
