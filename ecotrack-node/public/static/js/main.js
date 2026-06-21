// ─────────────────────────────────────────────
// EcoTrack v3 — Global Utilities (main.js)
// ─────────────────────────────────────────────

function showToast(icon, title, desc, ms = 4000) {
  const t = document.getElementById('toast');
  const tIcon = document.getElementById('toastIcon');
  const tTitle = document.getElementById('toastTitle');
  const tDesc = document.getElementById('toastDesc');
  if (t && tTitle) {
    if (tIcon) tIcon.textContent = icon || '';
    tTitle.textContent = title || '';
    if (tDesc) tDesc.textContent = desc || '';
    t.style.display = 'flex';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.display = 'none'; }, ms);
    return;
  }
  let container = document.getElementById('_toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = '_toastContainer';
    Object.assign(container.style, {
      position: 'fixed', bottom: '1.5rem', right: '1.5rem',
      zIndex: '9999', display: 'flex', flexDirection: 'column', gap: '0.5rem',
    });
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span style="font-size:1.2rem">${icon || ''}</span><div><strong>${title || ''}</strong>${desc ? `<br><span style="font-size:0.82rem;opacity:0.8">${desc}</span>` : ''}</div>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

function showBadgeToasts(badges) {
  if (!badges || !badges.length) return;
  badges.forEach((b, i) => {
    setTimeout(() => showToast(b.icon || '🏆', 'Badge Unlocked!', b.name || b.key, 5000), i * 600);
  });
}

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, { credentials: 'include', ...opts });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

window.showToast = showToast;
window.showBadgeToasts = showBadgeToasts;
window.apiFetch = apiFetch;
console.log("🌿 main.js loaded");
