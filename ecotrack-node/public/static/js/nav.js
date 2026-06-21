// ─────────────────────────────────────────────
// EcoTrack v3 — Navigation & Auth
// ─────────────────────────────────────────────

async function initNav() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    
    if (data.loggedIn && data.userId) {
      const navAuth = document.getElementById('navAuth');
      const navUser = document.getElementById('navUser');
      const dashboardLink = document.getElementById('dashboardLink');
      const usernameEl = document.getElementById('username');
      const userAvatar = document.getElementById('userAvatar');
      
      if (navAuth) navAuth.style.display = 'none';
      if (navUser) navUser.style.display = 'flex';
      if (dashboardLink) dashboardLink.style.display = 'block';
      if (usernameEl) usernameEl.textContent = data.username || 'User';
      
      const usernameDisplay = document.getElementById('usernameDisplay');
      if (usernameDisplay) usernameDisplay.textContent = data.username || 'User';
      
      if (userAvatar) {
        userAvatar.textContent = (data.username || 'U')[0].toUpperCase();
        userAvatar.style.background = data.avatarColor || '#10b981';
      }
      
      const startBtn = document.getElementById('startBtn');
      const dashBtn = document.getElementById('dashBtn');
      const signInBtn = document.getElementById('signInBtn');
      if (startBtn) startBtn.style.display = 'none';
      if (dashBtn) dashBtn.style.display = 'inline-block';
      if (signInBtn) signInBtn.style.display = 'none';
    }
  } catch (err) {
    console.error('Session check failed:', err);
  }
}

async function logout(e) {
  if (e) e.preventDefault();
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  } catch (_) { }
  window.location.href = '/';
}

function bindLogoutLinks() {
  document.querySelectorAll('[data-action="logout"]').forEach(link => {
    link.addEventListener('click', logout);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { initNav(); bindLogoutLinks(); });
} else {
  initNav();
  bindLogoutLinks();
}