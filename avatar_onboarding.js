window.GAS_API_URL = window.GAS_API_URL || (window.CONFIG && window.CONFIG.API_URL) || 'https://script.google.com/macros/s/AKfycbyn-mxt1REReA0T4UC4lmf-cbDPcDkv5X5WCJapqyZ06d76tKzxsaCBgaYqTeFfmYPekw/exec';
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

  // Förhandsgranskningar
  const previewImg = document.getElementById('avatar-preview-img');
  if (previewImg) previewImg.src = imgData;

  // Bakgrundsbilder
  document.querySelectorAll('.avatar-3d-sphere, .user-avatar-bubble, .glass-avatar-card, [data-avatar]').forEach(el => {
    el.style.backgroundImage = `url("${imgData}")`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
  });

  // Direct <img>-element
  document.querySelectorAll('#user-avatar-img, #user-pat-avatar, .avatar-img, img[data-avatar-img]').forEach(img => {
    img.src = imgData;
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
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15, 23, 42, 0.75); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); z-index:99999; display:flex !important; align-items:center !important; justify-content:center !important; padding:16px; box-sizing:border-box;';
    
    modal.innerHTML = `
      <div style="background:#ffffff !important; color:#0f172a !important; max-width:400px; width:100%; border-radius:24px; padding:24px; text-align:center; position:relative; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); border:1px solid #e2e8f0; display:flex !important; flex-direction:column !important; box-sizing:border-box !important;">
        <button onclick="closePostmanPatModal()" style="position:absolute; top:16px; right:16px; border:none; background:#f1f5f9; width:32px; height:32px; border-radius:50%; font-size:18px; cursor:pointer; color:#475569; display:flex; align-items:center; justify-content:center; line-height:1;">✕</button>
        
        <h2 style="font-size:20px; font-weight:800; color:#0f172a !important; margin:0 0 6px 0 !important; text-align:center;">Postis Per-ifiera din selfie! 📬</h2>
        <p style="font-size:13px; color:#475569 !important; margin:0 0 16px 0 !important; line-height:1.4; text-align:center;">Omvandla ditt foto till en 3D-figur i klassisk lera-stil via AI.</p>

        <div style="display:flex !important; flex-direction:row !important; justify-content:space-between; align-items:center; background:#f8fafc; padding:10px 14px; border-radius:16px; margin-bottom:16px; border:1px solid #e2e8f0;">
          <div style="flex:1; text-align:center;">
            <div style="width:40px; height:40px; margin:0 auto; background:#e2e8f0; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px;">📸</div>
            <span style="font-size:10px; font-weight:700; color:#475569 !important; display:block; margin-top:4px;">1. Selfie</span>
          </div>
          <div style="font-size:12px; color:#94a3b8; padding:0 4px;">➔</div>
          <div style="flex:1; text-align:center;">
            <div style="width:40px; height:40px; margin:0 auto; background:#e2e8f0; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px;">🎨</div>
            <span style="font-size:10px; font-weight:700; color:#475569 !important; display:block; margin-top:4px;">2. Ler-stil</span>
          </div>
          <div style="font-size:12px; color:#94a3b8; padding:0 4px;">➔</div>
          <div style="flex:1; text-align:center;">
            <div style="width:40px; height:40px; margin:0 auto; background:#2563eb; color:#ffffff; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px;">👷</div>
            <span style="font-size:10px; font-weight:700; color:#2563eb !important; display:block; margin-top:4px;">3. 3D-Figur</span>
          </div>
        </div>

        <input type="file" id="postman-photo-input" accept="image/*" capture="user" style="display:none;" onchange="handlePostmanPhoto(event)">
        
        <div id="postman-preview-area" onclick="document.getElementById('postman-photo-input').click()" style="border:2px dashed #cbd5e1; border-radius:16px; padding:16px; cursor:pointer; background:#f8fafc; margin-bottom:16px; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:110px; box-sizing:border-box;">
          <p id="postman-preview-text" style="font-size:13px; font-weight:600; color:#475569 !important; margin:0; text-align:center;">Klicka här för att ta en selfie eller välja bild 📷</p>
          <img id="postman-preview-img" style="max-height:160px; max-width:100%; border-radius:12px; display:none; margin:0 auto; box-shadow:0 4px 12px rgba(0,0,0,0.15); object-fit:contain;">
        </div>

        <button id="postman-generate-btn" onclick="generatePostmanPatAvatar()" style="width:100% !important; padding:14px; background:linear-gradient(135deg, #2563eb, #1d4ed8); color:#ffffff !important; border:none; border-radius:14px; font-weight:700; font-size:15px; cursor:pointer; box-shadow:0 4px 12px rgba(37,99,235,0.3); opacity:0.5; box-sizing:border-box !important;" disabled>
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

  // Komprimera bilden till max 512x512 för stabil överföring till Google Apps Script
  const tempImg = new Image();
  tempImg.onload = function() {
    const canvas = document.createElement('canvas');
    const maxDim = 512;
    let width = tempImg.width;
    let height = tempImg.height;

    if (width > height) {
      if (width > maxDim) {
        height *= maxDim / width;
        width = maxDim;
      }
    } else {
      if (height > maxDim) {
        width *= maxDim / height;
        height = maxDim;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(tempImg, 0, 0, width, height);
    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

    const gasUrl = window.GAS_API_URL || localStorage.getItem('lpv_gas_url');

    if (!gasUrl) {
      alert('Ingen Apps Script URL konfigurerad!');
      if (btn) {
        btn.innerHTML = 'Generera min Postis Per-gubbe! 📸✨';
        btn.disabled = false;
      }
      return;
    }

    fetch(gasUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'transform_to_clay',
        imageBase64: compressedBase64
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success' && data.clayAvatarBase64) {
        localStorage.setItem('lpv_user_avatar', data.clayAvatarBase64);
        if (typeof updateAvatarDisplays === 'function') {
          updateAvatarDisplays(data.clayAvatarBase64);
        }
        closePostmanPatModal();
      } else {
        alert('AI-transformering misslyckades: ' + (data.message || 'Okänt svar från servern'));
      }
    })
    .catch(err => {
      alert('Nätverksfel vid AI-anrop: ' + err.message);
    })
    .finally(() => {
      if (btn) {
        btn.innerHTML = 'Generera min Postis Per-gubbe! 📸✨';
        btn.disabled = false;
      }
    });
  };

  tempImg.src = img.src;
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


// FORCE AVATAR CLICK TO OPEN POSTIS PER AI MODAL
document.addEventListener('click', function(e) {
  const target = e.target.closest('#app-user-pill, .glass-avatar-card, .avatar-3d-sphere, .user-avatar-bubble, [data-avatar]');
  if (target) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof openPostmanPatModal === 'function') {
      openPostmanPatModal();
    }
  }
}, true);
