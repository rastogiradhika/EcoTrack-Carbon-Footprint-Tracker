document.getElementById('regForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const btn = document.getElementById('regBtn');
  const msg = document.getElementById('regMsg');
  const pw = document.getElementById('password').value;
  const cpw = document.getElementById('confirmPw').value;
  if (pw !== cpw) {
    msg.className = 'auth-msg error';
    msg.textContent = '❌ Passwords do not match';
    msg.style.display = 'block';
    return;
  }
  btn.textContent = 'Creating…';
  btn.disabled = true;
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        password: pw,
      }),
    });
    const data = await res.json();
    if (data.success) {
      msg.className = 'auth-msg success';
      msg.textContent = '✅ Account created! Taking you to your dashboard…';
      msg.style.display = 'block';
      setTimeout(() => (window.location.href = '/'), 1200);
    } else {
      msg.className = 'auth-msg error';
      msg.textContent = '❌ ' + (data.message || 'Registration failed');
      msg.style.display = 'block';
      btn.textContent = 'Create Account';
      btn.disabled = false;
    }
  } catch {
    msg.className = 'auth-msg error';
    msg.textContent = '❌ Network error';
    msg.style.display = 'block';
    btn.textContent = 'Create Account';
    btn.disabled = false;
  }
});

document.getElementById('confirmPw').addEventListener('input', function () {
  this.style.borderColor =
    this.value && this.value !== document.getElementById('password').value ? '#ef4444' : '';
});
