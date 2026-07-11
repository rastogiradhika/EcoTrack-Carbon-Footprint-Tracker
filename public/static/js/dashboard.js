// EcoTrack — Dashboard JS (CSP-safe: no inline handlers)
// ─────────────────────────────────────────────────────────────────────
// UPGRADED: SUB_TYPES now maps exactly to the keys in emissionFactors.js
// so sub_type values sent to the API match what emissionsController.js
// uses to look up IPCC/DEFRA factors.
//
// WHAT CHANGED vs original:
//   - SUB_TYPES keys/values updated to match emissionFactors.js entries.
//   - updateSubTypes() now also fetches /api/emission-factors on first
//     load to hydrate unit labels from the server (falls back to local
//     SUB_TYPES if the endpoint is unreachable).
//   - updateUnitLabel() extracted for reuse on both cat and sub change.
//
// WHAT DID NOT CHANGE:
//   - All CSS class names, HTML IDs, or layout: untouched.
//   - apiFetch(), loadAll(), loadStats(), loadHistory(), loadTips(),
//     loadChatHistory(), sendChat(), loadLeaderboard(), loadBadges(),
//     loadOffsetActions(), loadGoal(), saveGoal(), showFeedback(),
//     showToast(), showBadges(), handleFileUpload(), deleteEntry(),
//     logOffset(): ALL UNTOUCHED.
// ─────────────────────────────────────────────────────────────────────
'use strict';

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

// Keys must match emissionFactors.js EMISSION_FACTORS sub-type keys exactly.
const SUB_TYPES = {
  transport: [
    { val: 'car',                  label: '🚗 Car (Petrol)',          unit: 'km' },
    { val: 'car_diesel',           label: '🚗 Car (Diesel)',          unit: 'km' },
    { val: 'bike',                 label: '🏍 Motorbike/Scooter',     unit: 'km' },
    { val: 'bus',                  label: '🚌 Bus',                   unit: 'km' },
    { val: 'metro',                label: '🚇 Metro / Urban Rail',    unit: 'km' },
    { val: 'auto',                 label: '🛺 Auto-Rickshaw (CNG)',   unit: 'km' },
    { val: 'auto_petrol',          label: '🛺 Auto-Rickshaw (Petrol)', unit: 'km' },
    { val: 'train',                label: '🚆 Train (Indian Railways)', unit: 'km' },
    { val: 'flight_domestic',      label: '✈️ Flight (Domestic)',     unit: 'km' },
    { val: 'flight_international', label: '✈️ Flight (International)', unit: 'km' },
    { val: 'ev_car',               label: '🔋 Electric Car',          unit: 'km' },
  ],
  food: [
    { val: 'beef',        label: '🥩 Beef / Mutton',   unit: 'kg' },
    { val: 'lamb',        label: '🐑 Lamb',             unit: 'kg' },
    { val: 'pork',        label: '🐷 Pork',             unit: 'kg' },
    { val: 'chicken',     label: '🍗 Chicken / Poultry', unit: 'kg' },
    { val: 'fish_farmed', label: '🐟 Fish (Farmed)',    unit: 'kg' },
    { val: 'eggs',        label: '🥚 Eggs',             unit: 'kg' },
    { val: 'dairy_milk',  label: '🥛 Dairy Milk',       unit: 'litres' },
    { val: 'dairy_cheese',label: '🧀 Cheese',           unit: 'kg' },
    { val: 'rice',        label: '🍚 Rice',             unit: 'kg' },
    { val: 'wheat_bread', label: '🍞 Wheat / Roti',     unit: 'kg' },
    { val: 'vegetables',  label: '🥗 Vegetables',       unit: 'kg' },
    { val: 'legumes',     label: '🫘 Dal / Legumes',    unit: 'kg' },
    { val: 'fruits',      label: '🍎 Fruits',           unit: 'kg' },
  ],
  energy: [
    { val: 'electricity',      label: '💡 Electricity (Grid)',   unit: 'kWh' },
    { val: 'electricity_solar',label: '☀️ Solar (Rooftop)',      unit: 'kWh' },
    { val: 'lpg',              label: '🔥 LPG (by weight)',      unit: 'kg'  },
    { val: 'lpg_cylinder',     label: '🔥 LPG Cylinder (14.2kg)', unit: 'cylinders' },
    { val: 'natural_gas',      label: '⛽ Natural Gas (PNG)',    unit: 'm³'  },
    { val: 'coal',             label: '⚫ Coal',                 unit: 'kg'  },
    { val: 'biomass',          label: '🌿 Firewood / Biomass',   unit: 'kg'  },
    { val: 'generator_diesel', label: '🔌 Diesel Generator',     unit: 'litres' },
  ],
  lifestyle: [
    { val: 'shopping_clothes',     label: '👕 Clothing (New)',       unit: 'kg'    },
    { val: 'shopping_electronics', label: '📱 Electronics',          unit: 'items' },
    { val: 'plastic_bag',          label: '🛍 Plastic Bags',         unit: 'bags'  },
    { val: 'paper',                label: '📄 Paper / Printing',     unit: 'kg'    },
    { val: 'hotel_night',          label: '🏨 Hotel Stay',           unit: 'nights' },
    { val: 'streaming_video',      label: '📺 Video Streaming (HD)', unit: 'hours' },
  ],
};

let trendChart = null;
let catChart   = null;

// ── API helper — sends cookies, handles 401 ──────────────
async function apiFetch(url, options = {}) {
  const res = await fetch(url, { credentials: 'include', ...options });
  if (res.status === 401) {
    console.warn('[EcoTrack] Session expired — redirecting to login');
    window.location.href = '/login';
    return null;
  }
  return res;
}

// ── Boot ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateSubTypes();
  loadAll();
  loadChatHistory();
  loadGoal();
  loadOffsetActions();
  setupListeners();
});

function loadAll() {
  loadStats();
  loadHistory();
  loadTips();
  loadLeaderboard();
  loadBadges();
}

// ── Unit label helper ─────────────────────────────────────
function updateUnitLabel(unit) {
  document.getElementById('unitLabel').textContent    = unit ? `(${unit})` : '';
  document.getElementById('amountLabel').textContent  = `Amount ${unit ? '(' + unit + ')' : ''}`;
}

// ── Sub-type dropdown ─────────────────────────────────────
function updateSubTypes() {
  const cat  = document.getElementById('addCat').value;
  const sub  = document.getElementById('addSub');
  const subs = SUB_TYPES[cat] || [];
  sub.innerHTML = subs.map(s => `<option value="${s.val}">${s.label}</option>`).join('');
  const unit = subs[0]?.unit || '';
  updateUnitLabel(unit);
  sub.dispatchEvent(new Event('change'));
}

// ── Event listeners (CSP-safe — no inline onclick) ───────
function setupListeners() {
  document.getElementById('addCat').addEventListener('change', updateSubTypes);

  document.getElementById('addSub').addEventListener('change', function () {
    const cat  = document.getElementById('addCat').value;
    const subs = SUB_TYPES[cat] || [];
    const sel  = subs.find(s => s.val === this.value);
    updateUnitLabel(sel?.unit || '');
  });

  document.getElementById('refreshBtn').addEventListener('click', loadAll);

  // ── Add emission form ──
  document.getElementById('addForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('addBtn');
    btn.textContent = 'Adding…';
    btn.disabled    = true;
    try {
      const cat    = document.getElementById('addCat').value;
      const sub    = document.getElementById('addSub').value;
      const subs   = SUB_TYPES[cat] || [];
      const selSub = subs.find(s => s.val === sub);
      const res    = await apiFetch('/api/emissions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          category: cat,
          sub_type: sub,
          activity: document.getElementById('addAct').value,
          amount:   document.getElementById('addAmt').value,
          unit:     selSub?.unit || '',
        }),
      });
      if (!res) return;
      const data = await res.json();
      showFeedback('addFeedback', data.success, data.success ? `✅ Logged ${data.co2} kg CO₂` : data.message);
      if (data.success) {
        e.target.reset();
        updateSubTypes();
        loadAll();
        showBadges(data.new_badges);
      }
    } catch {
      showFeedback('addFeedback', false, '❌ Network error');
    }
    btn.textContent = 'Add Emission';
    btn.disabled    = false;
  });

  // ── File upload / drop zone ──
  const dropZone = document.getElementById('dropZone');
  dropZone.addEventListener('click',    () => document.getElementById('fileInput').click());
  dropZone.addEventListener('dragover', e  => { e.preventDefault(); dropZone.style.borderColor = 'var(--green)'; });
  dropZone.addEventListener('dragleave',()  => { dropZone.style.borderColor = 'var(--border)'; });
  dropZone.addEventListener('drop',     e  => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border)';
    if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files[0]);
  });
  document.getElementById('fileInput').addEventListener('change', e => {
    if (e.target.files[0]) handleFileUpload(e.target.files[0]);
  });

  // ── Chat ──
  document.getElementById('chatSendBtn').addEventListener('click', sendChat);
  document.getElementById('chatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') sendChat();
  });

  // ── Goal ──
  document.getElementById('saveGoalBtn').addEventListener('click', saveGoal);

  // ── History delete (event delegation) ──
  document.getElementById('histBody').addEventListener('click', e => {
    const btn = e.target.closest('[data-delete-id]');
    if (btn) deleteEntry(btn.dataset.deleteId);
  });

  // ── Offset quick list (event delegation) ──
  document.getElementById('offsetQuickList').addEventListener('click', e => {
    const card = e.target.closest('[data-offset-action]');
    if (card) logOffset(card.dataset.offsetAction);
  });
}

// ── File upload ──────────────────────────────────────────
async function handleFileUpload(file) {
  showFeedback('uploadFeedback', null, '⏳ Processing receipt…');
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res  = await apiFetch('/api/emissions/upload', { method: 'POST', body: fd });
    if (!res) return;
    const data = await res.json();
    showFeedback('uploadFeedback', data.success,
      data.success ? `✅ ${data.item} — ${data.co2} kg CO₂ logged!` : '❌ ' + data.message);
    if (data.success) { loadAll(); showBadges(data.new_badges); }
  } catch {
    showFeedback('uploadFeedback', false, '❌ Upload failed');
  }
}

// ── Stats ────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await apiFetch('/api/dashboard-stats');
    if (!res) return;
    const raw   = await res.json();
    const stats = (raw && raw.success && raw.data) ? raw.data : raw;

    const safe = (v, suffix = '') => (v != null) ? v + suffix : '—';
    document.getElementById('statTotal').textContent   = safe(stats.total,       ' kg');
    document.getElementById('statWeek').textContent    = safe(stats.weekly,      ' kg');
    document.getElementById('statWeekSub').textContent = `of ${safe(stats.weekly_goal)} kg goal`;
    document.getElementById('statNet').textContent     = safe(stats.net_total,   ' kg');
    document.getElementById('statScore').textContent   = stats.eco_score != null ? stats.eco_score + '/10' : '—';
    document.getElementById('statStreak').textContent  = `🔥 ${safe(stats.streak)} day streak`;
    document.getElementById('goalLabel').textContent   = `${safe(stats.weekly_pct)}% of ${safe(stats.weekly_goal)} kg`;

    const bar = document.getElementById('goalBar');
    if (bar) {
      bar.style.width      = (stats.weekly_pct || 0) + '%';
      bar.style.background = stats.weekly_pct < 60
        ? 'var(--green)' : stats.weekly_pct < 90 ? 'var(--gold)' : 'var(--red)';
    }
    updateCharts(stats.trend, stats.categories);
  } catch (e) {
    console.error('[EcoTrack] loadStats:', e);
  }
}

// ── Charts ───────────────────────────────────────────────
function updateCharts(trend, cats) {
  if (trendChart) { trendChart.destroy(); trendChart = null; }
  if (catChart)   { catChart.destroy();   catChart   = null; }

  const C = { color: '#9dc5af', grid: 'rgba(255,255,255,0.04)' };

  if (trend && trend.length && trend.some(d => d.co2 > 0)) {
    document.getElementById('trendEmpty').style.display = 'none';
    document.getElementById('trendChart').style.display = '';
    trendChart = new Chart(document.getElementById('trendChart'), {
      type: 'line',
      data: {
        labels:   trend.map(d => d.date.slice(5)),
        datasets: [{
          label:            'kg CO₂',
          data:             trend.map(d => d.co2),
          borderColor:      '#10b981',
          backgroundColor:  'rgba(16,185,129,0.08)',
          tension:          0.45,
          fill:             true,
          pointBackgroundColor: '#10b981',
          pointRadius:      4,
          pointHoverRadius: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend:  { display: false },
          tooltip: { backgroundColor:'#162819', borderColor:'#10b981', borderWidth:1, titleColor:'#e8f5ef', bodyColor:'#9dc5af' },
        },
        scales: {
          y: { beginAtZero:true, grid:{ color:C.grid }, ticks:{ color:C.color, font:{ size:11 } } },
          x: { grid:{ display:false },                  ticks:{ color:C.color, font:{ size:10 } } },
        },
      },
    });
  } else {
    document.getElementById('trendChart').style.display = 'none';
    document.getElementById('trendEmpty').style.display = 'flex';
  }

  if (cats && cats.length && cats.some(c => c.co2 > 0)) {
    document.getElementById('catEmpty').style.display = 'none';
    document.getElementById('catChart').style.display = '';
    catChart = new Chart(document.getElementById('catChart'), {
      type: 'doughnut',
      data: {
        labels:   cats.map(c => c.category[0].toUpperCase() + c.category.slice(1)),
        datasets: [{
          data:            cats.map(c => c.co2),
          backgroundColor: ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4'],
          borderWidth:     2,
          borderColor:     '#162819',
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: {
          legend:  { position:'right', labels:{ color:'#9dc5af', font:{ size:11 }, padding:10 } },
          tooltip: { backgroundColor:'#162819', borderColor:'#10b981', borderWidth:1, titleColor:'#e8f5ef', bodyColor:'#9dc5af' },
        },
      },
    });
  } else {
    document.getElementById('catChart').style.display = 'none';
    document.getElementById('catEmpty').style.display = 'flex';
  }
}

// ── Emission history ─────────────────────────────────────
async function loadHistory() {
  try {
    const res = await apiFetch('/api/emissions');
    if (!res) return;
    const raw   = await res.json();
    const hist  = Array.isArray(raw) ? raw : (raw.data || raw.emissions || []);
    const tbody = document.getElementById('histBody');
    const icons = { food:'🍽', transport:'🚗', energy:'⚡', lifestyle:'👟' };

    if (!hist.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state" style="text-align:center;padding:2rem;color:var(--text3);font-size:0.82rem">No activity yet — log your first emission!</td></tr>';
      return;
    }
    tbody.innerHTML = hist.map(r => {
      const date = r.date_logged
        ? new Date(r.date_logged).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })
        : '—';
      return `<tr>
        <td style="white-space:nowrap">${date}</td>
        <td>${icons[r.category] || '📌'} ${escHtml(r.activity)}</td>
        <td style="color:var(--green2);font-weight:600">${r.co2_amount} kg</td>
        <td><button class="btn btn-danger btn-sm" data-delete-id="${r.id}">✕</button></td>
      </tr>`;
    }).join('');
  } catch (e) { console.error('[EcoTrack] loadHistory:', e); }
}

async function deleteEntry(id) {
  if (!confirm('Delete this entry?')) return;
  try {
    const res = await apiFetch('/api/emissions', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    });
    if (!res || !res.ok) {
      showToast('❌', 'Deletion Failed', 'Could not delete entry.');
      return;
    }
    const data = await res.json();
    if (!data.success) {
      showToast('❌', 'Deletion Failed', data.message || 'Could not delete entry.');
      return;
    }
    loadAll();
    showToast('🗑️', 'Entry deleted', 'Your emission log has been removed.');
  } catch (err) {
    showToast('❌', 'Error', 'Network error while deleting entry.');
  }
}

// ── Tips ─────────────────────────────────────────────────
async function loadTips() {
  try {
    const res = await apiFetch('/api/recommendations');
    if (!res) return;
    const raw  = await res.json();
    const tips = Array.isArray(raw) ? raw : (raw.data || raw.recommendations || []);
    const impactClass = { High:'badge-high', Medium:'badge-medium', Low:'badge-low' };
    document.getElementById('tipsGrid').innerHTML = tips.map(t => `
      <div class="tip-card">
        <div class="tip-icon">${t.icon || '💡'}</div>
        <div class="tip-title">${escHtml(t.title)}</div>
        <div class="tip-desc">${escHtml(t.desc)}</div>
        <div style="margin-top:8px"><span class="badge-pill ${impactClass[t.impact] || 'badge-low'}">${t.impact} Impact</span></div>
      </div>`).join('');
  } catch (e) { console.error('[EcoTrack] loadTips:', e); }
}

// ── Chat ─────────────────────────────────────────────────
async function loadChatHistory() {
  try {
    const res = await apiFetch('/api/chat/history');
    if (!res) return;
    const raw  = await res.json();
    const msgs = Array.isArray(raw) ? raw : (raw.data || raw.messages || []);
    const box  = document.getElementById('chatMessages');
    msgs.forEach(m => appendBubble(m.role, m.message));
    box.scrollTop = box.scrollHeight;
  } catch { /* no history yet */ }
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const msg   = input.value.trim();
  if (!msg) return;
  input.value = '';
  appendBubble('user', msg);
  try {
    const res  = await apiFetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message: msg }),
    });
    if (!res) return;
    const data = await res.json();
    if (data.success) { appendBubble('bot', data.reply, data.title); showBadges(data.new_badges); }
  } catch {
    appendBubble('bot', 'Sorry, something went wrong.');
  }
}

function appendBubble(role, text, title) {
  const box  = document.getElementById('chatMessages');
  const wrap = document.createElement('div');
  wrap.className = `chat-bubble ${role}`;
  const avatar = `<div class="chat-avatar ${role}">${role === 'bot' ? '🤖' : '👤'}</div>`;
  const bubble = `<div class="chat-text ${role}">${title ? `<div class="chat-title">${title}</div>` : ''}${text.replace(/\n/g, '<br>')}</div>`;
  wrap.innerHTML = role === 'user' ? bubble + avatar : avatar + bubble;
  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
}

// ── Leaderboard ──────────────────────────────────────────
async function loadLeaderboard() {
  try {
    const res   = await apiFetch('/api/leaderboard');
    if (!res) return;
    const raw   = await res.json();
    const board = Array.isArray(raw) ? raw : (raw.data || raw.leaderboard || []);
    const medals = ['🥇','🥈','🥉'];

    if (!board.length) {
      document.getElementById('lbList').innerHTML =
        '<div class="empty-state"><div class="empty-icon">🏅</div><div class="empty-text">No users yet</div></div>';
      return;
    }
    document.getElementById('lbList').innerHTML = board.map(u => `
      <div class="lb-row ${u.is_you ? 'is-you' : ''}">
        <div class="lb-rank">${medals[u.rank - 1] || u.rank}</div>
        <div class="lb-avatar" style="background:${u.avatar_color}">${escHtml((u.username && u.username[0] ? u.username[0] : 'U').toUpperCase())}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:5px">
            <span class="lb-name">${escHtml(u.username)}</span>
            ${u.is_you ? '<span class="lb-you-tag">You</span>' : ''}
          </div>
          <div style="font-size:0.68rem;color:var(--text3)">${u.logs} logs · -${u.offset_total} kg offset</div>
        </div>
        <div class="lb-co2">${u.net} kg<br><span style="font-size:0.68rem;color:var(--text3);font-weight:400">net</span></div>
      </div>`).join('');
  } catch (e) { console.error('[EcoTrack] loadLeaderboard:', e); }
}

// ── Badges ───────────────────────────────────────────────
async function loadBadges() {
  try {
    const res    = await apiFetch('/api/badges');
    if (!res) return;
    const raw    = await res.json();
    const badges = Array.isArray(raw) ? raw : (raw.data || raw.badges || []);
    document.getElementById('badgeGrid').innerHTML = badges.map(b => `
      <div class="badge-card ${b.earned ? 'earned' : 'locked'}">
        <div class="badge-emoji">${b.icon}</div>
        <div class="badge-name">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
        ${b.earned ? '<div class="badge-status">✅ Earned</div>' : '<div class="badge-locked-text">🔒 Locked</div>'}
      </div>`).join('');
  } catch (e) { console.error('[EcoTrack] loadBadges:', e); }
}

// ── Offset actions ───────────────────────────────────────
async function loadOffsetActions() {
  try {
    const res  = await apiFetch('/api/offsets');
    if (!res) return;
    const data = await res.json();
    const acts = data.actions || (data.data && data.data.actions) || {};
    document.getElementById('offsetQuickList').innerHTML = Object.entries(acts).slice(0, 5).map(([k, v]) => `
      <div class="offset-card" data-offset-action="${k}">
        <div>
          <div class="offset-name">${v.name}</div>
          <div class="offset-value">-${v.co2_per_unit} kg CO₂ / ${v.unit}</div>
        </div>
        <span style="color:var(--green2);font-size:1rem">+</span>
      </div>`).join('');
  } catch (e) { console.error('[EcoTrack] loadOffsetActions:', e); }
}

async function logOffset(action) {
  const qty = prompt('How many units? (e.g. 1 for one tree)', '1');
  if (!qty || isNaN(qty) || qty <= 0) return;
  try {
    const res  = await apiFetch('/api/offsets', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action, quantity: qty }),
    });
    if (!res) return;
    const data = await res.json();
    showFeedback('offsetFeedback', data.success,
      data.success ? `✅ Saved ${data.co2_saved} kg CO₂!` : '❌ Error');
    if (data.success) { loadAll(); showBadges(data.new_badges); }
  } catch {
    showFeedback('offsetFeedback', false, '❌ Error');
  }
}

// ── Goal ─────────────────────────────────────────────────
async function loadGoal() {
  try {
    const res = await apiFetch('/api/goals');
    if (!res) return;
    const raw  = await res.json();
    const data = (raw && raw.success && raw.data) ? raw.data : raw;
    document.getElementById('goalInput').value = data.weekly_goal || data.weeklyGoal || '';
  } catch { /* ignore */ }
}

async function saveGoal() {
  const val = parseFloat(document.getElementById('goalInput').value);
  if (!val || val <= 0) return;
  const res  = await apiFetch('/api/goals', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ weekly_goal: val }),
  });
  if (!res) return;
  const data = await res.json();
  if (data.success) {
    showToast('🎯', 'Goal Updated!', `Weekly target: ${val} kg CO₂`);
    loadStats();
  }
}

// ── UI helpers ───────────────────────────────────────────
function showFeedback(id, success, msg) {
  const el = document.getElementById(id);
  el.textContent   = msg;
  el.className     = 'feedback ' + (success === null ? 'ok' : success ? 'ok' : 'err');
  el.style.display = 'block';
  if (success !== null) setTimeout(() => (el.style.display = 'none'), 4000);
}

function showBadges(badges) {
  if (!badges || !badges.length) return;
  badges.forEach((b, i) =>
    setTimeout(() => {
      showToast(b.icon, '🏆 Badge Earned: ' + b.name, b.desc);
      loadBadges();
    }, i * 2200)
  );
}