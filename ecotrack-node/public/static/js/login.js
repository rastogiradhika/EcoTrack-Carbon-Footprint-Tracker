document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const msg = document.getElementById('loginMsg');
  btn.textContent = 'Signing in…';
  btn.disabled = true;
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
      }),
    });
    const data = await res.json();
    if (data.success) {
      msg.className = 'auth-msg success';
      msg.textContent = '✅ Login successful! Redirecting…';
      msg.style.display = 'block';
      setTimeout(() => (window.location.href = '/dashboard'), 1000);
    } else {
      msg.className = 'auth-msg error';
      msg.textContent = '❌ ' + (data.message || 'Login failed');
      msg.style.display = 'block';
      btn.textContent = 'Sign In';
      btn.disabled = false;
    }
  } catch {
    msg.className = 'auth-msg error';
    msg.textContent = '❌ Network error. Is the server running?';
    msg.style.display = 'block';
    btn.textContent = 'Sign In';
    btn.disabled = false;
  }
});
