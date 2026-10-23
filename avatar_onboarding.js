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
    <div class="morning-avatar-slot" onclick="if(typeof openPostmanPatModal === 'function') openPostmanPatModal();" title="Klicka för att ändra selfie" style="width:40px; height:40px; border-radius:50%; overflow:hidden; flex-shrink:0; border:2px solid rgba(255,255,255,0.2); cursor:pointer;">
      <img src="${savedAvatar}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; display:block;">
    </div>
    <div style="flex:1;">
      <div style="font-size: 11px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.5px;">LPV & Klaryta v4.7.1</div>
      <div style="font-size: 16px; font-weight: 700; color: #FFF;">${greeting},${currentUser}!</div>
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
        <h2 style="font-size: 18px; font-weight: 800; color: #FFF; margin-bottom: 4px;">Skapa din 3D-Pjäs</h2>
        <p style="font-size: 12px; color: var(--text-muted);">Välj bild och roll för Kabanossen & Radarn.</p>
        
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

function updateAvatarDisplays(base64Data) {
  const imgData = base64Data || localStorage.getItem('lpv_user_avatar');
  if (!imgData) return;

  const previewImg = document.getElementById('avatar-preview-img');
  if (previewImg) previewImg.src = imgData;

  document.querySelectorAll('.avatar-3d-sphere, .user-avatar-bubble, .glass-avatar-card, [data-avatar]').forEach(el => {
    el.style.backgroundImage = `url("${imgData}")`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
  });

  document.querySelectorAll('#user-avatar-img, #user-pat-avatar, .morning-avatar-slot img, .avatar-img, img[data-avatar-img]').forEach(img => {
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
  reader.readAsDataURL(selectedFile);
}

window.checkAvatarOnboarding = checkAvatarOnboarding;
window.openAvatarModal = openAvatarModal;
window.closeAvatarModal = closeAvatarModal;
window.updateAvatarDisplays = updateAvatarDisplays;
window.handleSelfieCapture = handleSelfieCapture;

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(checkAvatarOnboarding, 300);
  setTimeout(() => updateAvatarDisplays(), 400);
});


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
  let modal = document.getElementById('postman-pat-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'postman-pat-modal';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15, 23, 42, 0.75); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); z-index:99999; display:flex !important; align-items:center !important; justify-content:center !important; padding:16px; box-sizing:border-box;';
    
    modal.innerHTML = `
      <div style="background:#ffffff !important; color:#0f172a !important; max-width:400px; width:100%; border-radius:24px; padding:24px; text-align:center; position:relative; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); border:1px solid #e2e8f0; display:flex !important; flex-direction:column !important; box-sizing:border-box !important;">
        <button onclick="closePostmanPatModal()" style="position:absolute; top:16px; right:16px; border:none; background:#f1f5f9; width:32px; height:32px; border-radius:50%; font-size:18px; cursor:pointer; color:#475569; display:flex; align-items:center; justify-content:center; line-height:1;">✕</button>
        
        <h2 style="font-size:20px; font-weight:800; color:#0f172a !important; margin:0 0 4px 0 !important; text-align:center;">Välj din roll ✨</h2>
        <p style="font-size:12px; color:#475569 !important; margin:0 0 14px 0 !important; line-height:1.4; text-align:center;">Välj din typ och ta en selfie för profilbilden.</p>

        <!-- ROLLVÄLJARE -->
        <div style="display:flex; gap:8px; margin-bottom:14px;">
          <button id
