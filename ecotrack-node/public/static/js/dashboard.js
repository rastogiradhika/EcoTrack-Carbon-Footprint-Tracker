// EcoTrack v3 — Dashboard logic (CSP-safe: no inline handlers)
const SUB_TYPES = {
  transport: [
    { val: 'car', label: '🚗 Car', unit: 'km' },
    { val: 'bike', label: '🏍 Motorbike', unit: 'km' },
    { val: 'bus', label: '🚌 Bus', unit: 'km' },
    { val: 'metro', label: '🚇 Metro/Rail', unit: 'km' },
    { val: 'auto', label: '🛺 Auto-rickshaw', unit: 'km' },
    { val: 'train', label: '🚆 Train', unit: 'km' },
    { val: 'flight', label: '✈️ Flight', unit: 'km' },
  ],
  food: [
    { val: 'beef', label: '🥩 Beef/Mutton', unit: 'servings' },
    { val: 'chicken', label: '🍗 Chicken', unit: 'servings' },
    { val: 'rice', label: '🍚 Rice meal', unit: 'servings' },
    { val: 'dairy', label: '🥛 Dairy', unit: 'servings' },
    { val: 'eggs', label: '🥚 Eggs', unit: 'servings' },
    { val: 'vegetables', label: '🥗 Vegetables', unit: 'servings' },
  ],
  energy: [
    { val: 'electricity', label: '💡 Electricity', unit: 'kWh' },
    { val: 'lpg', label: '🔥 LPG Cylinder', unit: 'kg' },
    { val: 'coal', label: '⚫ Coal', unit: 'kg' },
  ],
  lifestyle: [
    { val: 'shopping', label: '🛍 Shopping', unit: 'items' },
    { val: 'plastic', label: '🧴 Plastic bags', unit: 'bags' },
    { val: 'paper', label: '📄 Paper/printing', unit: 'reams' },
  ],
};

let trendChart = null;
let catChart = null;

const apiFetch = (url, options = {}) =>
  fetch(url, { credentials: 'include', ...options });

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

function updateSubTypes() {
  const cat = document.getElementById('addCat').value;
  const sub = document.getElementById('addSub');
  const subs = SUB_TYPES[cat] || [];
  sub.innerHTML = subs.map((s) => `<option value="${s.val}">${s.label}</option>`).join('');
  const unit = subs[0]?.unit || '';
  document.getElementById('unitLabel').textContent = unit ? `(${unit})` : '';
  document.getElementById('amountLabel').textContent = `Amount ${unit ? '(' + unit + ')' : ''}`;
  sub.dispatchEvent(new Event('change'));
}

function setupListeners() {
  document.getElementById('addCat').addEventListener('change', updateSubTypes);

  document.getElementById('addSub').addEventListener('change', function () {
    const cat = document.getElementById('addCat').value;
    const subs = SUB_TYPES[cat] || [];
    const sel = subs.find((s) => s.val === this.value);
    const unit = sel?.unit || '';
    document.getElementById('unitLabel').textContent = unit ? `(${unit})` : '';
    document.getElementById('amountLabel').textContent = `Amount ${unit ? '(' + unit + ')' : ''}`;
  });

  document.getElementById('refreshBtn').addEventListener('click', loadAll);

  document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('addBtn');
    btn.textContent = 'Adding…';
    btn.disabled = true;
    try {
      const cat = document.getElementById('addCat').value;
      const sub = document.getElementById('addSub').value;
      const subs = SUB_TYPES[cat] || [];
      const selSub = subs.find((s) => s.val === sub);
      const res = await apiFetch('/api/emissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: cat,
          sub_type: sub,
          activity: document.getElementById('addAct').value,
          amount: document.getElementById('addAmt').value,
          unit: selSub?.unit || '',
        }),
      });
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
    btn.disabled = false;
  });

  const dropZone = document.getElementById('dropZone');
  dropZone.addEventListener('click', () => document.getElementById('fileInput').click());
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--green)';
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'var(--border)';
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border)';
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileUpload(files[0]);
  });

  document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
  });

  document.getElementById('chatSendBtn').addEventListener('click', sendChat);
  document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChat();
  });

  document.getElementById('saveGoalBtn').addEventListener('click', saveGoal);

  document.getElementById('histBody').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-delete-id]');
    if (btn) deleteEntry(btn.dataset.deleteId);
  });

  document.getElementById('offsetQuickList').addEventListener('click', (e) => {
    const card = e.target.closest('[data-offset-action]');
    if (card) logOffset(card.dataset.offsetAction);
  });
}

async function handleFileUpload(file) {
  showFeedback('uploadFeedback', null, '⏳ Processing receipt…');
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await apiFetch('/api/emissions/upload', { method: 'POST', body: fd });
    const data = await res.json();
    showFeedback(
      'uploadFeedback',
      data.success,
      data.success ? `✅ ${data.item} — ${data.co2} kg CO₂ logged!` : '❌ ' + data.message
    );
    if (data.success) {
      loadAll();
      showBadges(data.new_badges);
    }
  } catch {
    showFeedback('uploadFeedback', false, '❌ Upload failed');
  }
}

async function loadStats() {
  try {
    const stats = await (await apiFetch('/api/dashboard-stats')).json();
    document.getElementById('statTotal').textContent = stats.total + ' kg';
    document.getElementById('statWeek').textContent = stats.weekly + ' kg';
    document.getElementById('statWeekSub').textContent = `of ${stats.weekly_goal} kg goal`;
    document.getElementById('statNet').textContent = stats.net_total + ' kg';
    document.getElementById('statScore').textContent = stats.eco_score + '/10';
    document.getElementById('statStreak').textContent = `🔥 ${stats.streak} day streak`;
    document.getElementById('goalLabel').textContent = `${stats.weekly_pct}% of ${stats.weekly_goal} kg`;
    const bar = document.getElementById('goalBar');
    bar.style.width = stats.weekly_pct + '%';
    bar.style.background =
      stats.weekly_pct < 60 ? 'var(--green)' : stats.weekly_pct < 90 ? 'var(--gold)' : 'var(--red)';
    updateCharts(stats.trend, stats.categories);
  } catch (e) {
    console.error(e);
  }
}

function updateCharts(trend, cats) {
  if (trendChart) {
    trendChart.destroy();
    trendChart = null;
  }
  if (catChart) {
    catChart.destroy();
    catChart = null;
  }

  const C = { color: '#9dc5af', grid: 'rgba(255,255,255,0.04)' };

  if (trend && trend.length) {
    document.getElementById('trendEmpty').style.display = 'none';
    document.getElementById('trendChart').style.display = '';
    trendChart = new Chart(document.getElementById('trendChart'), {
      type: 'line',
      data: {
        labels: trend.map((d) => d.date.slice(5)),
        datasets: [
          {
            label: 'kg CO₂',
            data: trend.map((d) => d.co2),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.08)',
            tension: 0.45,
            fill: true,
            pointBackgroundColor: '#10b981',
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#162819',
            borderColor: '#10b981',
            borderWidth: 1,
            titleColor: '#e8f5ef',
            bodyColor: '#9dc5af',
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: C.grid },
            ticks: { color: C.color, font: { size: 11 } },
          },
          x: { grid: { display: false }, ticks: { color: C.color, font: { size: 10 } } },
        },
      },
    });
  } else {
    document.getElementById('trendChart').style.display = 'none';
    document.getElementById('trendEmpty').style.display = 'flex';
  }

  if (cats && cats.length) {
    document.getElementById('catEmpty').style.display = 'none';
    catChart = new Chart(document.getElementById('catChart'), {
      type: 'doughnut',
      data: {
        labels: cats.map((c) => c.category[0].toUpperCase() + c.category.slice(1)),
        datasets: [
          {
            data: cats.map((c) => c.co2),
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
            borderWidth: 2,
            borderColor: '#162819',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { position: 'right', labels: { color: '#9dc5af', font: { size: 11 }, padding: 10 } },
          tooltip: {
            backgroundColor: '#162819',
            borderColor: '#10b981',
            borderWidth: 1,
            titleColor: '#e8f5ef',
            bodyColor: '#9dc5af',
          },
        },
      },
    });
  } else {
    document.getElementById('catEmpty').style.display = 'flex';
  }
}

async function loadHistory() {
  try {
    const hist = await (await apiFetch('/api/emissions')).json();
    const tbody = document.getElementById('histBody');
    const icons = { food: '🍽', transport: '🚗', energy: '⚡', lifestyle: '👟' };
    if (!hist.length) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="empty-state" style="text-align:center;padding:2rem;color:var(--text3);font-size:0.82rem">No activity yet — log your first emission!</td></tr>';
      return;
    }
    tbody.innerHTML = hist
      .map((r) => {
        const date = r.date_logged
          ? new Date(r.date_logged).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
          : '—';
        const cat = icons[r.category] || '📌';
        return `<tr>
        <td style="white-space:nowrap">${date}</td>
        <td>${cat} ${r.activity}</td>
        <td style="color:var(--green2);font-weight:600">${r.co2_amount} kg</td>
        <td><button class="btn btn-danger btn-sm" data-delete-id="${r.id}">✕</button></td>
      </tr>`;
      })
      .join('');
  } catch (e) {
    console.error(e);
  }
}

async function deleteEntry(id) {
  if (!confirm('Delete this entry?')) return;
  await apiFetch('/api/emissions', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  loadAll();
  showToast('🗑️', 'Entry deleted', 'Your emission log has been removed.');
}

async function loadTips() {
  try {
    const tips = await (await apiFetch('/api/recommendations')).json();
    const impactClass = { High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
    document.getElementById('tipsGrid').innerHTML = tips
      .map(
        (t) => `
      <div class="tip-card">
        <div class="tip-icon">${t.icon || '💡'}</div>
        <div class="tip-title">${t.title}</div>
        <div class="tip-desc">${t.desc}</div>
        <div style="margin-top:8px"><span class="badge-pill ${impactClass[t.impact] || 'badge-low'}">${t.impact} Impact</span></div>
      </div>`
      )
      .join('');
  } catch (e) {
    console.error(e);
  }
}

async function loadChatHistory() {
  try {
    const msgs = await (await apiFetch('/api/chat/history')).json();
    const box = document.getElementById('chatMessages');
    msgs.forEach((m) => appendBubble(m.role, m.message));
    box.scrollTop = box.scrollHeight;
  } catch {
    /* no history */
  }
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  appendBubble('user', msg);
  try {
    const res = await apiFetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg }),
    });
    const data = await res.json();
    if (data.success) {
      appendBubble('bot', data.reply, data.title);
      showBadges(data.new_badges);
    }
  } catch {
    appendBubble('bot', 'Sorry, something went wrong.');
  }
}

function appendBubble(role, text, title) {
  const box = document.getElementById('chatMessages');
  const wrap = document.createElement('div');
  wrap.className = `chat-bubble ${role}`;
  const avatar = `<div class="chat-avatar ${role}">${role === 'bot' ? '🤖' : '👤'}</div>`;
  const bubble = `<div class="chat-text ${role}">${title ? `<div class="chat-title">${title}</div>` : ''}${text.replace(/\n/g, '<br>')}</div>`;
  wrap.innerHTML = role === 'user' ? bubble + avatar : avatar + bubble;
  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
}

async function loadLeaderboard() {
  try {
    const board = await (await apiFetch('/api/leaderboard')).json();
    const medals = ['🥇', '🥈', '🥉'];
    if (!board.length) {
      document.getElementById('lbList').innerHTML =
        '<div class="empty-state"><div class="empty-icon">🏅</div><div class="empty-text">No users yet</div></div>';
      return;
    }
    document.getElementById('lbList').innerHTML = board
      .map(
        (u) => `
      <div class="lb-row ${u.is_you ? 'is-you' : ''}">
        <div class="lb-rank">${medals[u.rank - 1] || u.rank}</div>
        <div class="lb-avatar" style="background:${u.avatar_color}">${u.username[0].toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:5px">
            <span class="lb-name">${u.username}</span>
            ${u.is_you ? '<span class="lb-you-tag">You</span>' : ''}
          </div>
          <div style="font-size:0.68rem;color:var(--text3)">${u.logs} logs · -${u.offset_total} kg offset</div>
        </div>
        <div class="lb-co2">${u.net} kg<br><span style="font-size:0.68rem;color:var(--text3);font-weight:400">net</span></div>
      </div>`
      )
      .join('');
  } catch (e) {
    console.error(e);
  }
}

async function loadBadges() {
  try {
    const badges = await (await apiFetch('/api/badges')).json();
    document.getElementById('badgeGrid').innerHTML = badges
      .map(
        (b) => `
      <div class="badge-card ${b.earned ? 'earned' : 'locked'}">
        <div class="badge-emoji">${b.icon}</div>
        <div class="badge-name">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
        ${b.earned ? '<div class="badge-status">✅ Earned</div>' : '<div class="badge-locked-text">🔒 Locked</div>'}
      </div>`
      )
      .join('');
  } catch (e) {
    console.error(e);
  }
}

async function loadOffsetActions() {
  try {
    const data = await (await apiFetch('/api/offsets')).json();
    const acts = data.actions;
    const list = document.getElementById('offsetQuickList');
    list.innerHTML = Object.entries(acts)
      .slice(0, 5)
      .map(
        ([k, v]) => `
      <div class="offset-card" data-offset-action="${k}">
        <div>
          <div class="offset-name">${v.name}</div>
          <div class="offset-value">-${v.co2_per_unit} kg CO₂ / ${v.unit}</div>
        </div>
        <span style="color:var(--green2);font-size:1rem">+</span>
      </div>`
      )
      .join('');
  } catch (e) {
    console.error(e);
  }
}

async function logOffset(action) {
  const qty = prompt('How many units? (e.g. 1 for one tree)', '1');
  if (!qty || isNaN(qty) || qty <= 0) return;
  try {
    const res = await apiFetch('/api/offsets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, quantity: qty }),
    });
    const data = await res.json();
    showFeedback('offsetFeedback', data.success, data.success ? `✅ Saved ${data.co2_saved} kg CO₂!` : '❌ Error');
    if (data.success) {
      loadAll();
      showBadges(data.new_badges);
    }
  } catch {
    showFeedback('offsetFeedback', false, '❌ Error');
  }
}

async function loadGoal() {
  try {
    const data = await (await apiFetch('/api/goals')).json();
    document.getElementById('goalInput').value = data.weekly_goal;
  } catch {
    /* ignore */
  }
}

async function saveGoal() {
  const val = parseFloat(document.getElementById('goalInput').value);
  if (!val || val <= 0) return;
  const res = await apiFetch('/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weekly_goal: val }),
  });
  const data = await res.json();
  if (data.success) {
    showToast('🎯', 'Goal Updated!', `Weekly target: ${val} kg CO₂`);
    loadStats();
  }
}

function showFeedback(id, success, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = 'feedback ' + (success === null ? 'ok' : success ? 'ok' : 'err');
  el.style.display = 'block';
  if (success !== null) setTimeout(() => (el.style.display = 'none'), 4000);
}

function showToast(icon, title, desc) {
  const t = document.getElementById('toast');
  document.getElementById('toastIcon').textContent = icon;
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastDesc').textContent = desc;
  t.style.display = 'flex';
  setTimeout(() => (t.style.display = 'none'), 4500);
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
