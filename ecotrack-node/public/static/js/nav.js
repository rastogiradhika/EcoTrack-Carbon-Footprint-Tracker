// ─────────────────────────────────────────────
// EcoTrack v3 — Navigation & Auth
// ─────────────────────────────────────────────

/**
 * Check session and update navbar based on auth status
 */
async function initNav() {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (data.user_id) {
        // User is logged in
        const navAuth = document.getElementById('navAuth');
        const navUser = document.getElementById('navUser');
        const dashboardLink = document.getElementById('dashboardLink');
        const username = document.getElementById('username');
        const userAvatar = document.getElementById('userAvatar');
        
        if (navAuth) navAuth.style.display = 'none';
        if (navUser) navUser.style.display = 'flex';
        if (dashboardLink) dashboardLink.style.display = 'block';
        if (username) username.textContent = data.username || 'User';
        const usernameDisplay = document.getElementById('usernameDisplay');
        if (usernameDisplay) usernameDisplay.textContent = data.username || 'User';
        if (userAvatar) {
          userAvatar.textContent = (data.username || '?')[0].toUpperCase();
          if (data.avatar_color) {
            userAvatar.style.background = data.avatar_color;
          }
        }
        
        // Update home page buttons if they exist
        const startBtn = document.getElementById('startBtn');
        const dashBtn = document.getElementById('dashBtn');
        const signInBtn = document.getElementById('signInBtn');
        
        if (startBtn) startBtn.style.display = 'none';
        if (dashBtn) dashBtn.style.display = 'inline-block';
        if (signInBtn) signInBtn.style.display = 'none';
      }
    }
  } catch (err) {
    console.error('Session check failed:', err);
  }
}

/**
 * Logout and redirect to home
 */
async function logout(e) {
  if (e) e.preventDefault();
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/';
  } catch (err) {
    console.error('Logout failed:', err);
  }
}

function bindLogoutLinks() {
  document.querySelectorAll('[data-action="logout"]').forEach((link) => {
    link.addEventListener('click', logout);
  });
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    bindLogoutLinks();
  });
} else {
  initNav();
  bindLogoutLinks();
}
