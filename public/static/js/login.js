// EcoTrack — Login page JS
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const btn = document.getElementById('loginBtn');
  const msgEl = document.getElementById('loginMsg');
  
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
      msgEl.textContent = 'Please fill in all fields.';
      msgEl.style.color = 'var(--red, #ef4444)';
      return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    msgEl.textContent = '';
    
    try {
      const { ok, data } = await window.apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      if (ok && data.success) {
        msgEl.textContent = 'Success! Redirecting…';
        msgEl.style.color = 'var(--green, #10b981)';
        window.location.href = '/dashboard';
      } else {
        msgEl.textContent = data.message || 'Login failed. Please try again.';
        msgEl.style.color = 'var(--red, #ef4444)';
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    } catch (err) {
      msgEl.textContent = 'Network error. Please try again.';
      msgEl.style.color = 'var(--red, #ef4444)';
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });
});