window.currentUser = window.currentUser || localStorage.getItem('lpv_user_name') || 'Daniel';
var currentUser = window.currentUser;

// Säkerställ global variabel för användarnamn

// ==========================================
// AVATAR ONBOARDING & SELFIE RENDERER v3.0
// ==========================================

function checkAvatarOnboarding() {
  const savedAvatar = localStorage.getItem('lpv_user_avatar');
  const userDisplay = document.getElementById('user-display');

  if (savedAvatar && userDisplay) {
    userDisplay.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px;">
        <img src="${savedAvatar}" style="width:20px; height:20px; border-radius:50%; object-fit:cover;">
        <span>${currentUser}</span>
      </div>
    `;
  }

  renderMorningGreeting();
}

function renderMorningGreeting() {
  const container = document.getElementById('outbox-section');
  if (!container) return;

  const savedAvatar = localStorage.getItem('lpv_user_avatar') || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  const hour = new Date().getHours();
  let greeting = "God dag";
  if (hour < 10) greeting = "God morgon";
  else if (hour > 17) greeting = "God kväll";

  let greetingHtml = document.getElementById('morning-greeting-card');
  if (!greetingHtml) {
    greetingHtml = document.createElement('div');
    greetingHtml.id = 'morning-greeting-card';
    greetingHtml.className = 'morning-header-card';
    container.parentNode.insertBefore(greetingHtml, container);
  }

  greetingHtml.innerHTML = `
    <div class="morning-avatar-slot" onclick="openAvatarModal()" title="Klicka för att ändra selfie">
      <img src="${savedAvatar}" alt="Avatar">
    </div>
    <div>
      <div style="font-size: 11px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.5px;">LPV & Klaryta v3.0</div>
      <div style="font-size: 16px; font-weight: 700; color: #FFF;">${greeting}, ${currentUser}!</div>
    </div>
  `;
}

function openAvatarModal() {
  let modal = document.getElementById('avatar-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'avatar-modal';
    modal.className = 'sheet-backdrop active';
    modal.innerHTML = `
      <div class="sheet-container avatar-onboarding-card" style="max-width: 360px; margin: 0 auto;" onclick="event.stopPropagation()">
        <h2 style="font-size: 18px; font-weight: 800; color: #FFF; margin-bottom: 4px;">Skapa din 3D Glass-Pjäs</h2>
        <p style="font-size: 12px; color: var(--text-muted);">Ta en selfie för att generera din personliga avatar till Kabanossen & Radarn.</p>
        
        <div class="avatar-preview-bubble">
          <img id="avatar-preview-img" src="${localStorage.getItem('lpv_user_avatar') || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}">
        </div>

        <input type="file" id="selfie-file-input" accept="image/*" capture="user" style="display:none;" onchange="handleSelfieCapture(event)">
        
        <button type="button" class="main-btn" style="margin-bottom: 8px;" onclick="document.getElementById('selfie-file-input').click()">
          📸 Ta Ny Selfie
        </button>
        <button type="button" class="sheet-close" style="width: 100%; text-align: center;" onclick="closeAvatarModal()">
          Spara & Klar
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    modal.classList.add('active');
  }
}

function closeAvatarModal() {
  const modal = document.getElementById('avatar-modal');
  if (modal) modal.classList.remove('active');
}

function handleSelfieCapture(e) {
  const evt = e || window.event;
  const file = (evt && evt.target && evt.target.files) ? evt.target.files[0] : null;
  if (!file) return;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const base64 = evt.target.result;
    localStorage.setItem('lpv_user_avatar', base64);
    document.getElementById('avatar-preview-img').src = base64;
    checkAvatarOnboarding();
  };
  reader.readAsDataURL(file);
}

window.checkAvatarOnboarding = checkAvatarOnboarding;
window.openAvatarModal = openAvatarModal;
window.closeAvatarModal = closeAvatarModal;
window.handleSelfieCapture = handleSelfieCapture;

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(checkAvatarOnboarding, 300);
});


// ==========================================
// KIRURGISK FIX: AVATAR & SELFIE RENDERING
// ==========================================
function updateAvatarDisplays(base64Data) {
  const imgData = base64Data || localStorage.getItem('lpv_user_avatar');
  if (!imgData) return;

  // 1. Förhandsgranskning i modal
  const previewImg = document.getElementById('avatar-preview-img');
  if (previewImg) previewImg.src = imgData;

  // 2. Alla 3D-sfärer och avatarbubblor på skärmen
  document.querySelectorAll('.avatar-3d-sphere, .user-avatar-bubble, .glass-avatar-card').forEach(el => {
    el.style.backgroundImage = `url("${imgData}")`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
    el.style.border = '2px solid rgba(255, 255, 255, 0.6)';
  });
}

function handleSelfieCapture(e) {
  const evt = e || window.event;
  const selectedFile = (evt && evt.target && evt.target.files) ? evt.target.files[0] : (e instanceof File ? e : null);
  if (!selectedFile) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    const base64 = evt.target.result;
    localStorage.setItem('lpv_user_avatar', base64);
    updateAvatarDisplays(base64);
    if (typeof closeAvatarModal === 'function') closeAvatarModal();
  };
  reader.readAsDataURL(file);
}

window.updateAvatarDisplays = updateAvatarDisplays;
window.handleSelfieCapture = handleSelfieCapture;

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => updateAvatarDisplays(), 400);
});


// ==========================================
// POSTIS PER-IFIERA SELFIE MODAL & AI FLOW
// ==========================================
function openPostmanPatModal() {
  let modal = document.getElementById('postman-pat-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'postman-pat-modal';
    modal.className = 'glass-modal-overlay';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.6); backdrop-filter:blur(10px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:15px;';
    modal.innerHTML = `
      <div class="glass-bubble" style="background:rgba(255,255,255,0.95); max-width:420px; width:100%; border-radius:24px; padding:24px; text-align:center; position:relative; box-shadow:0 20px 40px rgba(0,0,0,0.3); border:2px solid rgba(255,255,255,0.8);">
        <button onclick="closePostmanPatModal()" style="position:absolute; top:16px; right:16px; border:none; background:none; font-size:22px; cursor:pointer; color:#666;">✕</button>
        <h2 style="font-size:22px; font-weight:800; color:#1e293b; margin-bottom:8px;">Postis Per-ifiera din selfie! 📬</h2>
        <p style="font-size:13px; color:#64748b; margin-bottom:20px;">Omvandla ditt foto till en unikt designad 3D-figur i klassisk lera-stil.</p>

        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(241,245,249,0.8); padding:12px; border-radius:16px; margin-bottom:20px;">
          <div style="flex:1; text-align:center;">
            <div style="width:48px; height:48px; margin:0 auto; background:#e2e8f0; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px;">📸</div>
            <span style="font-size:10px; font-weight:600; color:#475569; display:block; margin-top:4px;">1. Selfie</span>
          </div>
          <div style="font-size:14px; color:#94a3b8;">➔</div>
          <div style="flex:1; text-align:center;">
            <div style="width:48px; height:48px; margin:0 auto; background:#e2e8f0; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px;">🎨</div>
            <span style="font-size:10px; font-weight:600; color:#475569; display:block; margin-top:4px;">2. Ler-stil</span>
          </div>
          <div style="font-size:14px; color:#94a3b8;">➔</div>
          <div style="flex:1; text-align:center;">
            <div style="width:48px; height:48px; margin:0 auto; background:#3b82f6; color:white; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px;">👷</div>
            <span style="font-size:10px; font-weight:600; color:#2563eb; display:block; margin-top:4px;">3. 3D-Figur</span>
          </div>
        </div>

        <input type="file" id="postman-photo-input" accept="image/*" capture="user" style="display:none;" onchange="handlePostmanPhoto(event)">
        
        <div id="postman-preview-area" onclick="document.getElementById('postman-photo-input').click()" style="border:2px dashed #cbd5e1; border-radius:16px; padding:20px; cursor:pointer; background:#f8fafc; margin-bottom:20px;">
          <p id="postman-preview-text" style="font-size:13px; color:#64748b; margin:0;">Klicka här för att ta en selfie eller välja bild 📷</p>
          <img id="postman-preview-img" style="max-height:180px; border-radius:12px; display:none; margin:0 auto; box-shadow:0 8px 16px rgba(0,0,0,0.15);">
        </div>

        <button id="postman-generate-btn" onclick="generatePostmanPatAvatar()" style="width:100%; padding:14px; background:linear-gradient(135deg, #2563eb, #1d4ed8); color:white; border:none; border-radius:14px; font-weight:700; font-size:15px; cursor:pointer; box-shadow:0 4px 12px rgba(37,99,235,0.3);" disabled>
          Generera min Postis Per-gubbe! 📸✨
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
}

function closePostmanPatModal() {
  const modal = document.getElementById('postman-pat-modal');
  if (modal) modal.style.display = 'none';
}

let selectedPostmanFile = null;

function handlePostmanPhoto(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  selectedPostmanFile = file;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = document.getElementById('postman-preview-img');
    const txt = document.getElementById('postman-preview-text');
    const btn = document.getElementById('postman-generate-btn');
    if (img && txt && btn) {
      img.src = e.target.result;
      img.style.display = 'block';
      txt.style.display = 'none';
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  };
  reader.readAsDataURL(file);
}

function generatePostmanPatAvatar() {
  const btn = document.getElementById('postman-generate-btn');
  const img = document.getElementById('postman-preview-img');

  if (!img || !img.src) {
    alert('Ta en selfie eller välj en bild först!');
    return;
  }

  if (btn) {
    btn.innerHTML = 'Formar 3D-lera via AI... 🎨✨';
    btn.disabled = true;
  }

  const base64Data = img.src;
  const gasUrl = window.GAS_API_URL || localStorage.getItem('lpv_gas_url');

  if (!gasUrl) {
    console.warn('Ingen Apps Script URL angiven, kör lokalt sparad bild som reserv.');
    setTimeout(() => {
      localStorage.setItem('lpv_user_avatar', base64Data);
      if (typeof updateAvatarDisplays === 'function') updateAvatarDisplays(base64Data);
      if (btn) {
        btn.innerHTML = 'Generera min Postis Per-gubbe! 📸✨';
        btn.disabled = false;
      }
      closePostmanPatModal();
    }, 1000);
    return;
  }

  fetch(gasUrl, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'transform_to_clay',
      imageBase64: base64Data
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'success' && data.clayAvatarBase64) {
      localStorage.setItem('lpv_user_avatar', data.clayAvatarBase64);
      if (typeof updateAvatarDisplays === 'function') {
        updateAvatarDisplays(data.clayAvatarBase64);
      }
    } else {
      console.error('AI-transformering misslyckades:', data.message);
      localStorage.setItem('lpv_user_avatar', base64Data);
      if (typeof updateAvatarDisplays === 'function') updateAvatarDisplays(base64Data);
    }
  })
  .catch(err => {
    console.error('Nätverksfel vid AI-anrop:', err);
    localStorage.setItem('lpv_user_avatar', base64Data);
    if (typeof updateAvatarDisplays === 'function') updateAvatarDisplays(base64Data);
  })
  .finally(() => {
    if (btn) {
      btn.innerHTML = 'Generera min Postis Per-gubbe! 📸✨';
      btn.disabled = false;
    }
    closePostmanPatModal();
  });
}

window.openPostmanPatModal = openPostmanPatModal;
window.closePostmanPatModal = closePostmanPatModal;
window.handlePostmanPhoto = handlePostmanPhoto;
window.generatePostmanPatAvatar = generatePostmanPatAvatar;


// GLOBAL KLICK-LYSSNARE FÖR POSTIS PER MODAL
document.addEventListener('click', (e) => {
  const avatarEl = e.target.closest('.avatar-3d-sphere, .user-avatar-bubble, .glass-avatar-card, #app-user-pill, [data-avatar]');
  if (avatarEl) {
    if (typeof openPostmanPatModal === 'function') {
      openPostmanPatModal();
    }
  }
});

window.triggerAvatarUpload = window.triggerAvatarUpload || function() {
  if (typeof openPostmanPatModal === 'function') {
    openPostmanPatModal();
  } else {
    const inp = document.getElementById('postman-photo-input') || document.getElementById('avatar-input');
    if (inp) inp.click();
  }
};
