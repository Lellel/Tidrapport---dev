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
  const file = e.target.files[0];
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
