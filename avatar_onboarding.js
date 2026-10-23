window.GAS_API_URL = window.GAS_API_URL || (window.CONFIG && window.CONFIG.API_URL) || 'https://script.google.com/macros/s/AKfycbyn-mxt1REReA0T4UC4lmf-cbDPcDkv5X5WCJapqyZ06d76tKzxsaCBgaYqTeFfmYPekw/exec';
window.currentUser = window.currentUser || localStorage.getItem('lpv_user_name') || 'Daniel';
var currentUser = window.currentUser;

// ==========================================
// AVATAR ONBOARDING & SELFIE RENDERER v4.7.1
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
    <div class="morning-avatar-slot" onclick="openPostmanPatModal()" title="Klicka för att ändra selfie" style="width:40px; height:40px; border-radius:50%; overflow:hidden; flex-shrink:0; border:2px solid rgba(255,255,255,0.2); cursor:pointer;">
      <img src="${savedAvatar}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; display:block;">
    </div>
    <div style="flex:1;">
      <div style="font-size: 11px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.5px;">LPV & Klaryta v4.7.1</div>
      <div style="font-size: 16px; font-weight: 700; color: #FFF;">${greeting}, ${currentUser}!</div>
    </div>
  `;
}

function updateAvatarDisplays(base64Data) {
  const imgData = base64Data || localStorage.getItem('lpv_user_avatar');
  if (!imgData) return;

  const previewImg = document.getElementById('avatar-preview-img');
  if (previewImg) previewImg.src = imgData;

  document.querySelectorAll('.avatar-3d-sphere, .user-avatar-bubble, .glass-avatar-card, .postman-pat-bubble, [data-avatar]').forEach(el => {
    el.style.backgroundImage = `url("${imgData}")`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
  });

  document.querySelectorAll('#user-avatar-img, #user-pat-avatar, .morning-avatar-slot img, .avatar-img, img[data-avatar-img]').forEach(img => {
    img.src = imgData;
  });
}

// ==========================================
// 3D AVATAR-MODAL & ROLLVÄLJARE (v4.7.1)
// ==========================================
let currentResursTyp = 'handskottare';

function selectResursTyp(type) {
  currentResursTyp = type;
  const btnHand = document.getElementById('style-btn-hand');
  const btnBob = document.getElementById('style-btn-bob');
  
  if (btnHand && btnBob) {
    if (type === 'handskottare') {
      btnHand.style.background = '#2563eb';
      btnHand.style.color = '#ffffff';
      btnHand.style.borderColor = '#2563eb';
      btnBob.style.background = '#f8fafc';
      btnBob.style.color = '#475569';
      btnBob.style.borderColor = '#cbd5e1';
    } else {
      btnBob.style.background = '#2563eb';
      btnBob.style.color = '#ffffff';
      btnBob.style.borderColor = '#2563eb';
      btnHand.style.background = '#f8fafc';
      btnHand.style.color = '#475569';
      btnHand.style.borderColor = '#cbd5e1';
    }
  }

  const genBtn = document.getElementById('postman-generate-btn');
  if (genBtn && !genBtn.disabled) {
    genBtn.innerHTML = 'Spara 3D-Avatar ✨';
  }
}

function openPostmanPatModal() {
  // Radera gammal/cachad modal om den finns i minnet
  const oldModal = document.getElementById('postman-pat-modal');
  if (oldModal) oldModal.remove();

  const modal = document.createElement('div');
  modal.id = 'postman-pat-modal';
  modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15, 23, 42, 0.75); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); z-index:99999; display:flex !important; align-items:center !important; justify-content:center !important; padding:16px; box-sizing:border-box;';
  
  modal.innerHTML = `
    <div style="background:#ffffff !important; color:#0f172a !important; max-width:400px; width:100%; border-radius:24px; padding:24px; text-align:center; position:relative; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); border:1px solid #e2e8f0; display:flex !important; flex-direction:column !important; box-sizing:border-box !important;" onclick="event.stopPropagation()">
      <button onclick="closePostmanPatModal()" style="position:absolute; top:16px; right:16px; border:none; background:#f1f5f9; width:32px; height:32px; border-radius:50%; font-size:18px; cursor:pointer; color:#475569; display:flex; align-items:center; justify-content:center; line-height:1;">✕</button>
      
      <h2 style="font-size:20px; font-weight:800; color:#0f172a !important; margin:0 0 4px 0 !important; text-align:center;">Välj din roll ✨</h2>
      <p style="font-size:12px; color:#475569 !important; margin:0 0 14px 0 !important; line-height:1.4; text-align:center;">Välj din typ och ta en selfie för profilbilden.</p>

      <!-- ROLLVÄLJARE -->
      <div style="display:flex; gap:8px; margin-bottom:14px;">
        <button id="style-btn-hand" onclick="selectResursTyp('handskottare')" style="flex:1; padding:10px 6px; border-radius:12px; border:2px solid #2563eb; background:#2563eb; color:#ffffff; font-weight:700; font-size:12px; cursor:pointer; transition:all 0.2s ease;">
          🦸‍♂️ Handskottare<br><span style="font-size:10px; font-weight:400; opacity:0.85;">(Snö & Fält)</span>
        </button>
        <button id="style-btn-bob" onclick="selectResursTyp('byggare')" style="flex:1; padding:10px 6px; border-radius:12px; border:2px solid #cbd5e1; background:#f8fafc; color:#475569; font-weight:700; font-size:12px; cursor:pointer; transition:all 0.2s ease;">
          👷‍♂️ Övrigt<br><span style="font-size:10px; font-weight:400; opacity:0.85;">(Maskin & Bygg)</span>
        </button>
      </div>

      <input type="file" id="postman-photo-input" accept="image/*" capture="user" style="display:none;" onchange="handlePostmanPhoto(event)">
      
      <div id="postman-preview-area" onclick="document.getElementById('postman-photo-input').click()" style="border:2px dashed #cbd5e1; border-radius:16px; padding:14px; cursor:pointer; background:#f8fafc; margin-bottom:14px; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:110px; box-sizing:border-box;">
        <p id="postman-preview-text" style="font-size:13px; font-weight:600; color:#475569 !important; margin:0; text-align:center;">Klicka här för att ta en selfie eller välja bild 📷</p>
        <img id="postman-preview-img" style="max-height:150px; max-width:100%; border-radius:12px; display:none; margin:0 auto; box-shadow:0 4px 12px rgba(0,0,0,0.15); object-fit:contain;">
      </div>

      <button id="postman-generate-btn" onclick="generatePostmanPatAvatar()" style="width:100% !important; padding:14px; background:linear-gradient(135deg, #2563eb, #1d4ed8); color:#ffffff !important; border:none; border-radius:14px; font-weight:700; font-size:15px; cursor:pointer; box-shadow:0 4px 12px rgba(37,99,235,0.3); opacity:0.5; box-sizing:border-box !important;" disabled>
        Spara 3D-Avatar ✨
      </button>
    </div>
  `;
  document.body.appendChild(modal);
}

function closePostmanPatModal() {
  const modal = document.getElementById('postman-pat-modal');
  if (modal) modal.remove();
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
    btn.innerHTML = 'Skapar 3D-Avatar... 🎨';
    btn.disabled = true;
  }

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
        btn.innerHTML = 'Spara 3D-Avatar ✨';
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
        imageBase64: compressedBase64,
        resursTyp: currentResursTyp
      })
    })
    .then(res => res.json())
    .then(data => {
      if ((data.status === 'success' || data.status === 'fallback') && data.clayAvatarBase64) {
        localStorage.setItem('lpv_user_avatar', data.clayAvatarBase64);
        if (typeof updateAvatarDisplays === 'function') {
          updateAvatarDisplays(data.clayAvatarBase64);
        }
        closePostmanPatModal();
      } else {
        alert('Ett fel uppstod när avataren sparades: ' + (data.message || 'Okänt svar från servern'));
      }
    })
    .catch(err => {
      alert('Nätverksfel: ' + err.message);
    })
    .finally(() => {
      if (btn) {
        btn.innerHTML = 'Spara 3D-Avatar ✨';
        btn.disabled = false;
      }
    });
  };

  tempImg.src = img.src;
}

// EKSPORT TILL WINDOW
window.selectResursTyp = selectResursTyp;
window.openPostmanPatModal = openPostmanPatModal;
window.closePostmanPatModal = closePostmanPatModal;
window.handlePostmanPhoto = handlePostmanPhoto;
window.generatePostmanPatAvatar = generatePostmanPatAvatar;
window.checkAvatarOnboarding = checkAvatarOnboarding;
window.updateAvatarDisplays = updateAvatarDisplays;

// GLOBAL OCH DIREKT TOUCH/KLICK-LYSSNARE FÖR SAMTLIGA AVATARER
function attachAvatarClickListeners() {
  const avatarTargets = document.querySelectorAll('.postman-pat-bubble, #user
