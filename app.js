'use strict';
// ===== STATE & PERSISTENCE =====
const KEY = 'dragonlife.v2';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

const DEFAULT_STATE = {
  v: 2,
  currentTab: 'dashboard',
  profile: {
    name: 'Ionut',
    photo: null,
    motto: 'Concentreaza-te pe progres, nu pe perfectiune.'
  },
  tasks: [],
  habits: [],
  habitHistory: {},
  health: {
    date: '',
    bpm: 0,
    energy: 0,
    water: 0,
    waterGoal: 2500,
    meals: { mic: false, pranz: false, gustare: false, cina: false },
    sleepFrom: '',
    sleepTo: ''
  },
  healthHistory: [],
  stats: {
    points: 0,
    streak: 0,
    tasksCompletedTotal: 0,
    lastDate: null,
    pointsHistory: [],
    tasksHistory: [],
    sleepHistory: []
  },
  notes: [],
  usage: { dates: [], currentStreak: 0, longestStreak: 0 },
  notifications: [],
  quoteIndex: 0
};

let state = {};

function deepMerge(target, source) {
  const out = Object.assign({}, target);
  for (const k of Object.keys(source)) {
    if (source[k] !== null && typeof source[k] === 'object' && !Array.isArray(source[k])) {
      out[k] = deepMerge(target[k] || {}, source[k]);
    } else {
      out[k] = target[k] !== undefined ? target[k] : source[k];
    }
  }
  return out;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      return;
    }
    const parsed = JSON.parse(raw);
    // v1 -> v2 migration
    if (!parsed.v || parsed.v < 2) {
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      if (parsed.tasks) state.tasks = parsed.tasks.map(t => ({ ...DEFAULT_STATE.tasks[0], ...t }));
      if (parsed.habits) state.habits = parsed.habits.map(h => ({ ...DEFAULT_STATE.habits[0], ...h }));
      if (parsed.profile) state.profile = { ...DEFAULT_STATE.profile, ...parsed.profile };
      if (parsed.stats) state.stats = { ...DEFAULT_STATE.stats, ...parsed.stats };
      state.v = 2;
      return;
    }
    state = deepMerge(JSON.parse(JSON.stringify(DEFAULT_STATE)), parsed);
  } catch (e) {
    console.error('load error', e);
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('save error', e);
  }
}

// ===== QUOTES =====
const QUOTES = [
  { text: 'Succesul nu este final, esecul nu este fatal: curajul de a continua este cel care conteaza.', author: 'Winston Churchill' },
  { text: 'Disciplina este puntea dintre obiective si realizari.', author: 'Jim Rohn' },
  { text: 'Nu astepta momentul perfect. Incepe si fa-l perfect.', author: 'Anonim' },
  { text: 'Fiecare zi este o noua sansa de a-ti schimba viata.', author: 'Anonim' },
  { text: 'Cele mai mari descoperiri ale generatiei mele sunt ca oamenii isi pot schimba viata schimbandu-si atitudinea.', author: 'William James' },
  { text: 'Nu conteaza cat de incet mergi, atat timp cat nu te opresti.', author: 'Confucius' },
  { text: 'Fericirea nu este ceva gata facut. Vine din propriile tale actiuni.', author: 'Dalai Lama' },
  { text: 'Fii schimbarea pe care vrei sa o vezi in lume.', author: 'Mahatma Gandhi' }
];

// ===== SVG HELPERS =====
function sparkline(data, w, h, color) {
  w = w || 80; h = h || 28; color = color || '#6366f1';
  let d = data && data.length >= 2 ? data.slice() : null;
  if (!d) {
    d = [30, 45, 35, 55, 40, 60, 50, 70, 55, 65];
  }
  if (d.length < 2) d = d.concat([d[0] * 1.1, d[0] * 0.9, d[0] * 1.2]);
  const min = Math.min(...d);
  const max = Math.max(...d);
  const range = max - min || 1;
  const step = w / (d.length - 1);
  const pts = d.map((v, i) => {
    const x = i * step;
    const y = h - 4 - ((v - min) / range) * (h - 8);
    return [x, y];
  });
  const pathD = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const fillD = pathD + ` L${w},${h} L0,${h} Z`;
  const id = 'sg' + Math.random().toString(36).slice(2, 7);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <path d="${fillD}" fill="url(#${id})"/>
    <path d="${pathD}" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function donutChart(done, total, size) {
  size = size || 110;
  const pct = total > 0 ? done / total : 0;
  const r = (size - 16) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  const gap = circ - dash;
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + pct * 2 * Math.PI;
  const gradStart = pct > 0.5 ? '#a855f7' : '#6366f1';
  const gradEnd = '#22c55e';
  const id = 'dg' + Math.random().toString(36).slice(2, 7);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${gradStart}"/>
        <stop offset="100%" stop-color="${gradEnd}"/>
      </linearGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="12"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#${id})" stroke-width="12"
      stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}"
      stroke-dashoffset="${(circ * 0.25).toFixed(2)}"
      stroke-linecap="round"
      transform="rotate(-90 ${cx} ${cy})"
    />
    <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="#f0f0f8" font-size="18" font-weight="800" font-family="system-ui,sans-serif">${done}/${total}</text>
  </svg>`;
}

// ===== TIME HELPERS =====
function sleepMinutes(from, to) {
  const [fh, fm] = (from || '23:00').split(':').map(Number);
  const [th, tm] = (to || '06:30').split(':').map(Number);
  let start = fh * 60 + fm;
  let end = th * 60 + tm;
  if (end <= start) end += 24 * 60;
  return end - start;
}

function sleepLabel(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ===== NIGHT MODE =====
function isNightMode() {
  const sf = state.health.sleepFrom;
  const st = state.health.sleepTo;
  if (!sf || !st) return false;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const [fh, fm] = sf.split(':').map(Number);
  const [th, tm] = st.split(':').map(Number);
  const start = fh * 60 + fm;
  const end = th * 60 + tm;
  if (start > end) return cur >= start || cur < end;
  return cur >= start && cur < end;
}

function showNightMode() {
  const existing = document.getElementById('nightModeScreen');
  if (existing) return;
  const sf = state.health.sleepFrom;
  const st = state.health.sleepTo;
  const overlay = document.createElement('div');
  overlay.id = 'nightModeScreen';
  overlay.innerHTML = `
    <div class="night-clock" id="nightClock"></div>
    <div class="night-icon">🌙</div>
    <div class="night-title">Mod Noapte</div>
    <div class="night-sub">Trezire la ${st || '—'}</div>
    <button class="night-unlock" id="nightUnlock">Deblocheaza</button>
  `;
  document.body.appendChild(overlay);
  function updateClock() {
    const n = new Date();
    const el = document.getElementById('nightClock');
    if (el) el.textContent = n.getHours().toString().padStart(2,'0') + ':' + n.getMinutes().toString().padStart(2,'0');
  }
  updateClock();
  const timer = setInterval(updateClock, 30000);
  document.getElementById('nightUnlock').addEventListener('click', () => {
    clearInterval(timer);
    overlay.remove();
  });
}

function checkNightMode() {
  if (isNightMode()) showNightMode();
  else {
    const el = document.getElementById('nightModeScreen');
    if (el) el.remove();
  }
}

async function scheduleSleepNotifs(sf, st, name) {
  if (!sf || !st) return;
  const prev = state.health._sleepNotifIds || {};
  if (prev.bed) fetch('/api?action=cancel', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: prev.bed }) }).catch(()=>{});
  if (prev.wake) fetch('/api?action=cancel', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: prev.wake }) }).catch(()=>{});

  const extId = state.profile._pushId;
  if (!extId) return;

  function nextOccurrence(hh, mm) {
    const now = new Date();
    const t = new Date(now);
    t.setHours(hh, mm, 0, 0);
    if (t <= now) t.setDate(t.getDate() + 1);
    return t.toISOString();
  }

  const [bh, bm] = sf.split(':').map(Number);
  const [wh, wm] = st.split(':').map(Number);

  const [bedRes, wakeRes] = await Promise.all([
    fetch('/api?action=schedule', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ externalId: extId, title: '🌙 Timp de culcare!', body: `Noapte buna, ${name}! Somn usor 😴`, sendAt: nextOccurrence(bh, bm) }) }).then(r=>r.json()).catch(()=>({})),
    fetch('/api?action=schedule', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ externalId: extId, title: '☀️ Buna dimineata!', body: `Trezire usoara, ${name}! 🌅 O zi buna!`, sendAt: nextOccurrence(wh, wm) }) }).then(r=>r.json()).catch(()=>({}) )
  ]);

  state.health._sleepNotifIds = { bed: bedRes.id || null, wake: wakeRes.id || null };
  save();
}

// ===== COMPUTED PROGRESS =====
function computeProgress() {
  const today = todayISO();
  const todayTasks = state.tasks.filter(t => t.date === today);
  const doneTasks = todayTasks.filter(t => t.done).length;
  const totalTasks = todayTasks.length || 1;
  const tasksPct = Math.round((doneTasks / totalTasks) * 100);

  const doneHabits = state.habits.filter(h => h.done).length;
  const totalHabits = state.habits.length || 1;
  const habitsPct = Math.round((doneHabits / totalHabits) * 100);

  const productivityPct = Math.round((tasksPct * 0.7) + (habitsPct * 0.3));
  const healthPct = Math.round(
    (state.health.energy || 0) * 0.4 +
    Math.min(100, ((state.health.water || 0) / (state.health.waterGoal || 2500)) * 100) * 0.3 +
    Math.min(100, (sleepMinutes(state.health.sleepFrom, state.health.sleepTo) / 480) * 100) * 0.3
  );
  const overallPct = Math.round((tasksPct + productivityPct + healthPct) / 3);

  return { tasksPct, productivityPct, healthPct, overallPct, doneTasks, totalTasks };
}

// ===== POINTS =====
function addPoints(n) {
  state.stats.points = (state.stats.points || 0) + n;
  if (!state.stats.pointsHistory) state.stats.pointsHistory = [];
  state.stats.pointsHistory.push({ date: todayISO(), pts: state.stats.points });
  if (state.stats.pointsHistory.length > 30) state.stats.pointsHistory.shift();
  save();
  toast(`+${n} puncte 🎯`);
}

// ===== ENSURE DAY RESETS =====
function ensureHabitsDay() {
  const today = todayISO();
  if (!state.habitHistory) state.habitHistory = {};
  state.habits.forEach(h => {
    if (h.doneDate !== today) {
      if (h.done) {
        if (!state.habitHistory[h.id]) state.habitHistory[h.id] = [];
        state.habitHistory[h.id].push(h.doneDate || today);
        h.streak = (h.streak || 0) + 1;
      }
      h.done = false;
      h.doneDate = null;
    }
  });
  save();
}

function ensureHealthDay() {
  const today = todayISO();
  if (state.health.date !== today) {
    const prev = Object.assign({}, state.health);
    if (!state.healthHistory) state.healthHistory = [];
    if (prev.date) state.healthHistory.push(prev);
    if (state.healthHistory.length > 30) state.healthHistory.shift();
    if (!state.stats.sleepHistory) state.stats.sleepHistory = [];
    state.stats.sleepHistory.push(sleepMinutes(prev.sleepFrom, prev.sleepTo));
    if (state.stats.sleepHistory.length > 14) state.stats.sleepHistory.shift();
    state.health.date = today;
    state.health.water = 0;
    state.health.meals = { mic: false, pranz: false, gustare: false, cina: false };
    state.health.energy = 70;
    save();
  }
}

// ===== STREAK =====
function updateStreak() {
  const today = todayISO();
  if (!state.usage.dates) state.usage.dates = [];
  if (!state.usage.dates.includes(today)) {
    state.usage.dates.push(today);
    if (state.usage.dates.length > 365) state.usage.dates.shift();
  }
  const sorted = [...state.usage.dates].sort();
  let streak = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    const d1 = new Date(sorted[i]);
    const d2 = new Date(sorted[i - 1]);
    const diff = (d1 - d2) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  state.usage.currentStreak = streak;
  if (streak > (state.usage.longestStreak || 0)) state.usage.longestStreak = streak;
  state.stats.streak = streak;
  save();
}

// ===== DAILY DATA FOR SPARKLINES =====
function getDailyData(key, n) {
  n = n || 10;
  if (key === 'points' && state.stats.pointsHistory && state.stats.pointsHistory.length > 0) {
    return state.stats.pointsHistory.slice(-n).map(x => x.pts);
  }
  if (key === 'tasks' && state.stats.tasksHistory && state.stats.tasksHistory.length > 0) {
    return state.stats.tasksHistory.slice(-n).map(x => x.done);
  }
  if (key === 'sleep' && state.stats.sleepHistory && state.stats.sleepHistory.length > 0) {
    return state.stats.sleepHistory.slice(-n);
  }
  if (key === 'streak') {
    const base = state.usage.currentStreak || 1;
    return Array.from({ length: n }, (_, i) => Math.max(1, base - (n - 1 - i)));
  }
  // demo data
  const seeds = { points: [620,650,680,720,750,780,800,820,840,850], tasks: [3,5,4,6,5,7,6,8,7,9], sleep: [420,450,440,460,430,470,450,455,460,455], streak: [1,2,3,4,5,6,7,7,7,7] };
  return (seeds[key] || seeds.points).slice(-n);
}
// ===== TOAST =====
function toast(msg, duration) {
  duration = duration || 2800;
  const root = document.getElementById('toastRoot');
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast-item';
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 280);
  }, duration);
}


function showLoadingBar() {
  const bar = document.getElementById('loadingBar');
  if (!bar) return;
  bar.style.width = '0%';
  bar.style.opacity = '1';
  bar.style.transition = 'none';
  requestAnimationFrame(() => {
    bar.style.transition = 'width 0.25s ease';
    bar.style.width = '70%';
    setTimeout(() => {
      bar.style.transition = 'width 0.15s ease, opacity 0.3s ease';
      bar.style.width = '100%';
      setTimeout(() => { bar.style.opacity = '0'; }, 150);
    }, 250);
  });
}

// ===== MODAL SYSTEM =====
function openModal(html, opts) {
  opts = opts || {};
  const root = document.getElementById('modalRoot');
  root.style.pointerEvents = 'all';
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay' + (opts.center ? ' center' : '');
  const modal = document.createElement('div');
  modal.className = 'modal' + (opts.center ? ' center-modal' : '');
  modal.innerHTML = (opts.center ? '' : '<div class="modal-handle"></div>') + html;
  overlay.appendChild(modal);
  root.appendChild(overlay);

  function close() {
    overlay.remove();
    if (!root.querySelector('.modal-overlay')) root.style.pointerEvents = 'none';
  }

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  modal.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', close));
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });
  return { overlay, modal, close };
}

function closeAllModals() {
  const root = document.getElementById('modalRoot');
  root.innerHTML = '';
  root.style.pointerEvents = 'none';
}

// ===== NAV & RENDER =====
function setTab(tab) {
  showLoadingBar();
  state.currentTab = tab;
  save();
  document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  render();
}

function render() {
  const screen = document.getElementById('screen');
  switch (state.currentTab) {
    case 'dashboard': screen.innerHTML = renderDashboard(); break;
    case 'tasks': screen.innerHTML = renderTasks(); break;
    case 'habits': screen.innerHTML = renderHabits(); break;
    case 'profile': screen.innerHTML = renderProfile(); break;
    default: screen.innerHTML = renderDashboard();
  }
}

// ===== DASHBOARD SCREEN =====
function renderDashboard() {
  const prog = computeProgress();
  const today = todayISO();
  const sleepMin = sleepMinutes(state.health.sleepFrom, state.health.sleepTo);
  const unread = state.notifications.filter(n => !n.read).length;
  const photo = state.profile.photo;
  const avatarContent = photo
    ? `<img src="${photo}" alt="avatar"/>`
    : `<span>😊</span>`;

  return `<div class="dashboard-page">
    <div class="dash-header">
      <div class="dash-header-left">
        <div class="dash-avatar" data-act="goProfile">${avatarContent}</div>
        <div class="dash-greeting">
          <h2>Buna, ${state.profile.name} 👋</h2>
          <p>${state.profile.motto}</p>
        </div>
      </div>
      <div class="dash-header-right">
        <button class="icon-btn" data-act="openNotifsListModal" aria-label="Notificari">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" stroke-linejoin="round"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>
          ${unread > 0 ? '<span class="notif-badge"></span>' : ''}
        </button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-card-top"><span class="stat-label">Finalizate</span><span class="stat-icon">✅</span></div>
        <div class="stat-value green">${prog.doneTasks}</div>
        <div class="stat-sub">din ${prog.totalTasks} task-uri azi</div>
        <div class="stat-spark">${sparkline(getDailyData('tasks'), 80, 28, '#22c55e')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-top"><span class="stat-label">Serie activa</span><span class="stat-icon">🔥</span></div>
        <div class="stat-value orange">${state.stats.streak}</div>
        <div class="stat-sub">zile consecutive</div>
        <div class="stat-spark">${sparkline(getDailyData('streak'), 80, 28, '#f97316')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-top"><span class="stat-label">Puncte</span><span class="stat-icon">🏆</span></div>
        <div class="stat-value violet">${state.stats.points}</div>
        <div class="stat-sub">puncte acumulate</div>
        <div class="stat-spark">${sparkline(getDailyData('points'), 80, 28, '#a855f7')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-top"><span class="stat-label">Somn mediu</span><span class="stat-icon">🌙</span></div>
        <div class="stat-value blue">${sleepLabel(sleepMin)}</div>
        <div class="stat-sub">azi noapte</div>
        <div class="stat-spark">${sparkline(getDailyData('sleep'), 80, 28, '#3b82f6')}</div>
      </div>
    </div>

    <div class="progress-card">
      <div class="progress-card-header">
        <span class="progress-card-title">Progres azi</span>
        <span class="progress-pct">${prog.overallPct}%</span>
      </div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width:${prog.overallPct}%"></div>
      </div>
      <div class="progress-metrics">
        <div class="progress-metric">
          <div class="progress-metric-val">${prog.doneTasks}/${prog.totalTasks}</div>
          <div class="progress-metric-lbl">Task-uri</div>
        </div>
        <div class="progress-metric">
          <div class="progress-metric-val">${prog.productivityPct}%</div>
          <div class="progress-metric-lbl">Productivitate</div>
        </div>
        <div class="progress-metric">
          <div class="progress-metric-val">${prog.healthPct}%</div>
          <div class="progress-metric-lbl">Sanatate</div>
        </div>
      </div>
    </div>

    <div class="health-dash-card" style="margin:0 16px 12px" data-act="openHealthModal">
      <div class="card-title-row">
        <span class="card-title">Sanatate &amp; Odihna</span>
        <span style="font-size:10px;color:var(--accent)">Edit</span>
      </div>
      <div class="health-metric-row">
        <span class="health-metric-icon">🌙</span>
        <div class="health-metric-info">
          <div class="health-metric-val">${sleepMin > 0 ? sleepLabel(sleepMin) : '—'}</div>
          <div class="health-metric-lbl">Somn</div>
          ${sleepMin > 0 ? `<div class="health-mini-bar"><div class="health-mini-bar-fill blue" style="width:${Math.min(100, (sleepMin / 480) * 100)}%"></div></div>` : ''}
        </div>
        <span class="health-metric-icon" style="margin-left:12px">⚡</span>
        <div class="health-metric-info">
          <div class="health-metric-val">${state.health.energy > 0 ? state.health.energy + '%' : '—'}</div>
          <div class="health-metric-lbl">Energie</div>
          ${state.health.energy > 0 ? `<div class="health-mini-bar"><div class="health-mini-bar-fill yellow" style="width:${state.health.energy}%"></div></div>` : ''}
        </div>
        <span class="health-metric-icon" style="margin-left:12px">💧</span>
        <div class="health-metric-info">
          <div class="health-metric-val">${state.health.water > 0 ? Math.round(state.health.water / 100) / 10 + 'L' : '—'}</div>
          <div class="health-metric-lbl">Apa</div>
          ${state.health.water > 0 ? `<div class="health-mini-bar"><div class="health-mini-bar-fill blue" style="width:${Math.min(100, (state.health.water / state.health.waterGoal) * 100)}%"></div></div>` : ''}
        </div>
      </div>
    </div>

    <div class="quick-actions">
      <div class="quick-grid">
        <button class="quick-btn" data-act="openAddTaskModal">
          <span class="quick-btn-icon">✅</span>
          <span class="quick-btn-label">Task nou</span>
        </button>
        <button class="quick-btn" data-act="openAddHabitModal">
          <span class="quick-btn-icon">🔄</span>
          <span class="quick-btn-label">Habit nou</span>
        </button>
        <button class="quick-btn" data-act="openHealthModal">
          <span class="quick-btn-icon">❤️</span>
          <span class="quick-btn-label">Sanatate</span>
        </button>
        <button class="quick-btn" data-act="openNotesModal">
          <span class="quick-btn-icon">📝</span>
          <span class="quick-btn-label">Note</span>
        </button>
      </div>
    </div>
  </div>`;
}
// ===== TASKS SCREEN =====
let tasksFilter = 'today';

function renderTasks() {
  const today = todayISO();
  let filtered = state.tasks;
  if (tasksFilter === 'today') filtered = state.tasks.filter(t => t.date === today);
  else if (tasksFilter === 'done') filtered = state.tasks.filter(t => t.done);
  filtered = filtered.slice().sort((a, b) => a.time.localeCompare(b.time));

  return `<div class="tasks-page">
    <div class="page-header">
      <span class="page-title">Task-uri</span>
      <button class="icon-btn" data-act="openAddTaskModal" aria-label="Adauga task">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
      </button>
    </div>
    <div class="filter-bar">
      <button class="filter-chip ${tasksFilter === 'today' ? 'active' : ''}" data-act="filterTasks" data-filter="today">Azi</button>
      <button class="filter-chip ${tasksFilter === 'all' ? 'active' : ''}" data-act="filterTasks" data-filter="all">Toate</button>
      <button class="filter-chip ${tasksFilter === 'done' ? 'active' : ''}" data-act="filterTasks" data-filter="done">Completate</button>
    </div>
    <div class="tasks-list">
      ${filtered.length === 0 ? `<div class="empty-state"><div class="empty-icon">✅</div><p>Niciun task ${tasksFilter === 'today' ? 'azi' : ''}</p><small>Apasa + pentru a adauga</small></div>` : filtered.map(t => `
      <div class="task-item">
        <div class="task-checkbox ${t.done ? 'done' : ''}" data-act="toggleTask" data-id="${t.id}"></div>
        <div class="task-body" data-act="openEditTaskModal" data-id="${t.id}">
          <div class="task-title-row">
            <span class="task-emoji">${t.emoji}</span>
            <span class="task-title ${t.done ? 'done' : ''}">${t.title}</span>
          </div>
          <div class="task-meta">
            <span class="task-time">🕐 ${t.time}</span>
            <span class="task-chip ${t.chip || 'personal'}">${t.chip === 'work' ? 'Munca' : t.chip === 'health' ? 'Sanatate' : 'Personal'}</span>
          </div>
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

// ===== HABITS SCREEN =====
function renderHabits() {
  const doneHabits = state.habits.filter(h => h.done).length;
  const totalHabits = state.habits.length;
  const today = new Date();
  const days30 = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days30.push(d.toISOString().slice(0, 10));
  }

  return `<div class="habits-page">
    <div class="page-header">
      <span class="page-title">Obiceiuri</span>
      <button class="icon-btn" data-act="openAddHabitModal" aria-label="Adauga obicei">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
      </button>
    </div>
    <div class="donut-section">
      <div class="donut-wrap">
        ${donutChart(doneHabits, totalHabits, 110)}
        <div class="donut-label">${doneHabits} din ${totalHabits} obiceiuri azi</div>
      </div>
    </div>
    <div class="habits-grid">
      ${state.habits.map(h => `
      <div class="habit-item">
        <div class="habit-cb-big ${h.done ? 'done' : ''}" data-act="toggleHabit" data-id="${h.id}"></div>
        <div class="habit-body">
          <div class="habit-name-row">
            <span class="habit-emoji">${h.emoji}</span>
            <span class="habit-name">${h.title}</span>
          </div>
          <div class="habit-streak">${h.streak > 0 ? '🔥 ' + h.streak + ' zile la rand' : 'Incepe azi!'}</div>
        </div>
        <button class="habit-edit-btn" data-act="openEditHabitModal" data-id="${h.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/><path d="M17.414 2.586a2 2 0 0 1 2.828 2.828L11 14.828 7 16l1.172-4L17.414 2.586z" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>`).join('')}
    </div>
    <div class="habit-calendar">
      <div class="habit-cal-title">Ultimele 30 zile</div>
      <div class="habit-cal-grid">
        ${days30.map(d => {
          const isToday = d === todayISO();
          const hasActivity = state.usage.dates && state.usage.dates.includes(d);
          return `<div class="cal-day ${hasActivity ? 'has-activity' : ''} ${isToday ? 'today' : ''}">${new Date(d + 'T12:00:00').getDate()}</div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

// ===== PROFILE SCREEN =====
function renderProfile() {
  const prog = computeProgress();
  const photo = state.profile.photo;
  const avatarContent = photo
    ? `<img src="${photo}" alt="avatar"/>`
    : `<span style="font-size:36px">😊</span>`;

  return `<div class="profile-page">
    <input type="file" id="avatarInput" accept="image/*" data-act="handleAvatarUpload"/>
    <div class="profile-hero">
      <div class="profile-avatar-big" data-act="triggerAvatarUpload">
        ${avatarContent}
        <div style="position:absolute;bottom:0;right:0;width:26px;height:26px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:12px">📷</div>
      </div>
      <div class="profile-name">${state.profile.name}</div>
      <div class="profile-motto">${state.profile.motto}</div>
    </div>

    <div class="profile-stats-grid">
      <div class="profile-stat">
        <div class="profile-stat-val">${state.stats.points}</div>
        <div class="profile-stat-lbl">Puncte</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-val">${state.stats.streak}</div>
        <div class="profile-stat-lbl">Serie zile</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-val">${state.tasks.filter(t => t.done).length}</div>
        <div class="profile-stat-lbl">Task-uri done</div>
      </div>
    </div>

    <div class="profile-section" style="margin-top:12px">
      <div class="profile-section-title">Cont</div>
      <div class="profile-row" data-act="openEditProfileModal">
        <span class="profile-row-icon">👤</span>
        <div class="profile-row-body">
          <div class="profile-row-label">Editeaza profil</div>
          <div class="profile-row-sub">Nume, motto, avatar</div>
        </div>
        <span class="profile-row-arrow">›</span>
      </div>
      <div class="profile-row" data-act="openStatsModal">
        <span class="profile-row-icon">📊</span>
        <div class="profile-row-body">
          <div class="profile-row-label">Statistici detaliate</div>
          <div class="profile-row-sub">Grafice saptamanale</div>
        </div>
        <span class="profile-row-arrow">›</span>
      </div>
      <div class="profile-row" data-act="openCalendarModal">
        <span class="profile-row-icon">📅</span>
        <div class="profile-row-body">
          <div class="profile-row-label">Calendar activitate</div>
          <div class="profile-row-sub">Zile active</div>
        </div>
        <span class="profile-row-arrow">›</span>
      </div>
    </div>
`;
}
// ===== MODALS =====
const TASK_EMOJIS = ['💪','📖','🏢','🥗','📵','🎯','🏃','🧘','💊','📝','🎨','🎸','💻','🌿','☕'];
const HABIT_EMOJIS = ['💧','🌸','📖','🌙','🚫','✏️','🧠','🏃','🧘','💊','🥗','☕','🎨','🎸','📝'];

function openAddTaskModal() {
  closeAllModals();
  let selEmoji = '📝';
  let selChip = 'personal';
  const today = todayISO();
  const { modal, close } = openModal(`
    <div class="modal-header">
      <span class="modal-title">Task nou</span>
      <button class="modal-close" data-close>✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Titlu task</label>
        <input class="form-input" id="mTaskTitle" placeholder="Ex: Antrenament dimineata" maxlength="60"/>
      </div>
      <div class="form-group">
        <label class="form-label">Emoji</label>
        <div class="emoji-picker" id="mTaskEmojiPicker">
          ${TASK_EMOJIS.map(e => `<div class="emoji-opt${e === selEmoji ? ' selected' : ''}" data-emoji="${e}">${e}</div>`).join('')}
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Data</label>
          <input class="form-input" id="mTaskDate" type="date" value="${today}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Ora</label>
          <input class="form-input" id="mTaskTime" type="time" value="08:00"/>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Categorie</label>
        <div class="chip-row">
          <div class="chip work${selChip === 'work' ? ' selected' : ''}" data-chip="work">Munca</div>
          <div class="chip health${selChip === 'health' ? ' selected' : ''}" data-chip="health">Sanatate</div>
          <div class="chip personal${selChip === 'personal' ? ' selected' : ''}" data-chip="personal">Personal</div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-close>Anuleaza</button>
      <button class="btn btn-primary" id="mTaskSave">Salveaza</button>
    </div>
  `);

  modal.querySelectorAll('.emoji-opt').forEach(el => {
    el.addEventListener('click', () => {
      selEmoji = el.dataset.emoji;
      modal.querySelectorAll('.emoji-opt').forEach(e => e.classList.remove('selected'));
      el.classList.add('selected');
    });
  });
  modal.querySelectorAll('[data-chip]').forEach(el => {
    el.addEventListener('click', () => {
      selChip = el.dataset.chip;
      modal.querySelectorAll('[data-chip]').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
    });
  });
  modal.querySelector('#mTaskSave').addEventListener('click', () => {
    const title = modal.querySelector('#mTaskTitle').value.trim();
    const date = modal.querySelector('#mTaskDate').value;
    const time = modal.querySelector('#mTaskTime').value;
    if (!title) { toast('Scrie un titlu!'); return; }
    const task = { id: uid(), title, emoji: selEmoji, date: date || today, time: time || '08:00', done: false, chip: selChip, notifyId: null };
    state.tasks.push(task);
    save();
    scheduleNotification(task);
    close();
    render();
    toast('Task adaugat! ✅');
  });
}

function openEditTaskModal(id) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  let selEmoji = t.emoji || '📝';
  let selChip = t.chip || 'personal';

  const { modal, close } = openModal(`
    <div class="modal-header">
      <span class="modal-title">Editeaza task</span>
      <button class="modal-close" data-close>✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Titlu task</label>
        <input class="form-input" id="mTaskTitle" value="${t.title}" maxlength="60"/>
      </div>
      <div class="form-group">
        <label class="form-label">Emoji</label>
        <div class="emoji-picker" id="mTaskEmojiPicker">
          ${TASK_EMOJIS.map(e => `<div class="emoji-opt${e === selEmoji ? ' selected' : ''}" data-emoji="${e}">${e}</div>`).join('')}
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Data</label>
          <input class="form-input" id="mTaskDate" type="date" value="${t.date}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Ora</label>
          <input class="form-input" id="mTaskTime" type="time" value="${t.time}"/>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Categorie</label>
        <div class="chip-row">
          <div class="chip work${selChip === 'work' ? ' selected' : ''}" data-chip="work">Munca</div>
          <div class="chip health${selChip === 'health' ? ' selected' : ''}" data-chip="health">Sanatate</div>
          <div class="chip personal${selChip === 'personal' ? ' selected' : ''}" data-chip="personal">Personal</div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-danger" id="mTaskDel">Sterge</button>
      <button class="btn btn-primary" id="mTaskSave">Salveaza</button>
    </div>
  `);

  modal.querySelectorAll('.emoji-opt').forEach(el => {
    el.addEventListener('click', () => {
      selEmoji = el.dataset.emoji;
      modal.querySelectorAll('.emoji-opt').forEach(e => e.classList.remove('selected'));
      el.classList.add('selected');
    });
  });
  modal.querySelectorAll('[data-chip]').forEach(el => {
    el.addEventListener('click', () => {
      selChip = el.dataset.chip;
      modal.querySelectorAll('[data-chip]').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
    });
  });
  modal.querySelector('#mTaskSave').addEventListener('click', () => {
    const title = modal.querySelector('#mTaskTitle').value.trim();
    const date = modal.querySelector('#mTaskDate').value;
    const time = modal.querySelector('#mTaskTime').value;
    if (!title) { toast('Scrie un titlu!'); return; }
    const idx = state.tasks.findIndex(x => x.id === id);
    if (idx !== -1) {
      state.tasks[idx] = { ...state.tasks[idx], title, emoji: selEmoji, date, time, chip: selChip };
      save();
      scheduleNotification(state.tasks[idx]);
    }
    close();
    render();
    toast('Task actualizat!');
  });
  modal.querySelector('#mTaskDel').addEventListener('click', () => {
    state.tasks = state.tasks.filter(x => x.id !== id);
    save();
    close();
    render();
    toast('Task sters');
  });
}

function openAddHabitModal() {
  closeAllModals();
  let selEmoji = '✏️';
  const { modal, close } = openModal(`
    <div class="modal-header">
      <span class="modal-title">Obicei nou</span>
      <button class="modal-close" data-close>✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Titlu obicei</label>
        <input class="form-input" id="mHabitTitle" placeholder="Ex: Hidratare" maxlength="40"/>
      </div>
      <div class="form-group">
        <label class="form-label">Emoji</label>
        <div class="emoji-picker">
          ${HABIT_EMOJIS.map(e => `<div class="emoji-opt${e === selEmoji ? ' selected' : ''}" data-emoji="${e}">${e}</div>`).join('')}
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-close>Anuleaza</button>
      <button class="btn btn-primary" id="mHabitSave">Adauga</button>
    </div>
  `);
  modal.querySelectorAll('.emoji-opt').forEach(el => {
    el.addEventListener('click', () => {
      selEmoji = el.dataset.emoji;
      modal.querySelectorAll('.emoji-opt').forEach(e => e.classList.remove('selected'));
      el.classList.add('selected');
    });
  });
  modal.querySelector('#mHabitSave').addEventListener('click', () => {
    const title = modal.querySelector('#mHabitTitle').value.trim();
    if (!title) { toast('Scrie un titlu!'); return; }
    state.habits.push({ id: uid(), title, emoji: selEmoji, done: false, doneDate: null, streak: 0 });
    save();
    close();
    render();
    toast('Obicei adaugat! 🌟');
  });
}

function openEditHabitModal(id) {
  const h = state.habits.find(x => x.id === id);
  if (!h) return;
  let selEmoji = h.emoji || '✏️';
  const { modal, close } = openModal(`
    <div class="modal-header">
      <span class="modal-title">Editeaza obicei</span>
      <button class="modal-close" data-close>✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Titlu</label>
        <input class="form-input" id="mHabitTitle" value="${h.title}" maxlength="40"/>
      </div>
      <div class="form-group">
        <label class="form-label">Emoji</label>
        <div class="emoji-picker">
          ${HABIT_EMOJIS.map(e => `<div class="emoji-opt${e === selEmoji ? ' selected' : ''}" data-emoji="${e}">${e}</div>`).join('')}
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-danger" id="mHabitDel">Sterge</button>
      <button class="btn btn-primary" id="mHabitSave">Salveaza</button>
    </div>
  `);
  modal.querySelectorAll('.emoji-opt').forEach(el => {
    el.addEventListener('click', () => {
      selEmoji = el.dataset.emoji;
      modal.querySelectorAll('.emoji-opt').forEach(e => e.classList.remove('selected'));
      el.classList.add('selected');
    });
  });
  modal.querySelector('#mHabitSave').addEventListener('click', () => {
    const title = modal.querySelector('#mHabitTitle').value.trim();
    if (!title) { toast('Scrie un titlu!'); return; }
    const idx = state.habits.findIndex(x => x.id === id);
    if (idx !== -1) state.habits[idx] = { ...state.habits[idx], title, emoji: selEmoji };
    save();
    close();
    render();
    toast('Obicei actualizat!');
  });
  modal.querySelector('#mHabitDel').addEventListener('click', () => {
    state.habits = state.habits.filter(x => x.id !== id);
    save();
    close();
    render();
    toast('Obicei sters');
  });
}

function openHealthModal() {
  const h = state.health;
  const { modal, close } = openModal(`
    <div class="modal-header">
      <span class="modal-title">Sanatate &amp; Odihna</span>
      <button class="modal-close" data-close>✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Ritm cardiac (BPM)</label>
        <input class="form-input" id="mBpm" type="number" min="40" max="200" value="${h.bpm}"/>
      </div>
      <div class="form-group">
        <label class="form-label">Nivel energie: <span id="mEnergyVal">${h.energy}%</span></label>
        <input class="form-slider" id="mEnergy" type="range" min="0" max="100" value="${h.energy}"/>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Culcare</label>
          <input class="form-input" id="mSleepFrom" type="time" value="${h.sleepFrom}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Trezire</label>
          <input class="form-input" id="mSleepTo" type="time" value="${h.sleepTo}"/>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Apa consumata (ml)</label>
        <input class="form-input" id="mWater" type="number" min="0" max="5000" value="${h.water}" step="50"/>
      </div>
      <div class="form-group">
        <label class="form-label">Mese</label>
        <div class="meal-chips">
          <div class="meal-chip${h.meals.mic ? ' active' : ''}" data-meal="mic">Mic dejun</div>
          <div class="meal-chip${h.meals.pranz ? ' active' : ''}" data-meal="pranz">Pranz</div>
          <div class="meal-chip${h.meals.gustare ? ' active' : ''}" data-meal="gustare">Gustare</div>
          <div class="meal-chip${h.meals.cina ? ' active' : ''}" data-meal="cina">Cina</div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-close>Anuleaza</button>
      <button class="btn btn-primary" id="mHealthSave">Salveaza</button>
    </div>
  `);

  const energySlider = modal.querySelector('#mEnergy');
  const energyVal = modal.querySelector('#mEnergyVal');
  energySlider.addEventListener('input', () => { energyVal.textContent = energySlider.value + '%'; });

  const mealMap = {};
  modal.querySelectorAll('[data-meal]').forEach(el => {
    mealMap[el.dataset.meal] = h.meals[el.dataset.meal] || false;
    el.addEventListener('click', () => {
      mealMap[el.dataset.meal] = !mealMap[el.dataset.meal];
      el.classList.toggle('active', mealMap[el.dataset.meal]);
    });
  });

  modal.querySelector('#mHealthSave').addEventListener('click', () => {
    const bpm = parseInt(modal.querySelector('#mBpm').value) || 0;
    const energy = parseInt(modal.querySelector('#mEnergy').value) || 0;
    const sleepFrom = modal.querySelector('#mSleepFrom').value;
    const sleepTo = modal.querySelector('#mSleepTo').value;
    const water = parseInt(modal.querySelector('#mWater').value) || 0;
    const prevSf = state.health.sleepFrom;
    const prevSt = state.health.sleepTo;
    state.health = { ...state.health, bpm, energy, sleepFrom, sleepTo, water, meals: { ...mealMap } };
    save();
    close();
    render();
    toast('Date sanatate salvate! 💪');
    if (sleepFrom && sleepTo && (sleepFrom !== prevSf || sleepTo !== prevSt)) {
      scheduleSleepNotifs(sleepFrom, sleepTo, state.profile.name).catch(() => {});
    }
    checkNightMode();
  });
}
function openStatsModal() {
  const prog = computeProgress();
  const days = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sa', 'Du'];
  const taskData = getDailyData('tasks', 7);
  const maxTasks = Math.max(...taskData, 1);
  const { close } = openModal(`
    <div class="modal-header">
      <span class="modal-title">Statistici</span>
      <button class="modal-close" data-close>✕</button>
    </div>
    <div class="modal-body">
      <div class="stats-section">
        <div class="stats-section-title">Sumar general</div>
        <div class="stats-row">
          <div class="stats-kpi"><div class="stats-kpi-val">${state.stats.points}</div><div class="stats-kpi-lbl">Puncte</div></div>
          <div class="stats-kpi"><div class="stats-kpi-val">${state.stats.streak}</div><div class="stats-kpi-lbl">Serie zile</div></div>
          <div class="stats-kpi"><div class="stats-kpi-val">${state.usage.longestStreak || 0}</div><div class="stats-kpi-lbl">Maxim serie</div></div>
        </div>
        <div class="stats-row">
          <div class="stats-kpi"><div class="stats-kpi-val">${prog.overallPct}%</div><div class="stats-kpi-lbl">Progres azi</div></div>
          <div class="stats-kpi"><div class="stats-kpi-val">${state.habits.filter(h => h.done).length}/${state.habits.length}</div><div class="stats-kpi-lbl">Obiceiuri azi</div></div>
          <div class="stats-kpi"><div class="stats-kpi-val">${state.tasks.filter(t => t.done).length}</div><div class="stats-kpi-lbl">Tasks done</div></div>
        </div>
      </div>
      <div class="stats-section">
        <div class="stats-section-title">Task-uri ultima saptamana</div>
        <div class="weekly-bars">
          ${days.map((d, i) => {
            const val = taskData[i] || 0;
            const pct = Math.round((val / maxTasks) * 100);
            return `<div class="weekly-bar-wrap">
              <div class="weekly-bar-track"><div class="weekly-bar-fill" style="height:${pct}%"></div></div>
              <div class="weekly-bar-lbl">${d}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="stats-section">
        <div class="stats-section-title">Somn ultima saptamana</div>
        <div style="padding:8px 0">${sparkline(getDailyData('sleep', 7), 280, 60, '#3b82f6')}</div>
      </div>
      <div class="stats-section">
        <div class="stats-section-title">Puncte acumulate</div>
        <div style="padding:8px 0">${sparkline(getDailyData('points', 10), 280, 60, '#a855f7')}</div>
      </div>
    </div>
  `);
}

function openCalendarModal() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'];
  const startPad = (firstDay + 6) % 7;
  const activeDates = new Set(state.usage.dates || []);

  let calCells = '';
  for (let p = 0; p < startPad; p++) calCells += '<div class="cal-modal-day empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayISO();
    const isActive = activeDates.has(dateStr);
    calCells += `<div class="cal-modal-day${isActive ? ' active' : ''}${isToday ? ' today' : ''}">${d}</div>`;
  }

  openModal(`
    <div class="modal-header">
      <span class="modal-title">📅 ${monthNames[month]} ${year}</span>
      <button class="modal-close" data-close>✕</button>
    </div>
    <div class="modal-body">
      <div class="cal-modal-grid">
        <div class="cal-modal-hdr">Lu</div>
        <div class="cal-modal-hdr">Ma</div>
        <div class="cal-modal-hdr">Mi</div>
        <div class="cal-modal-hdr">Jo</div>
        <div class="cal-modal-hdr">Vi</div>
        <div class="cal-modal-hdr">Sa</div>
        <div class="cal-modal-hdr">Du</div>
        ${calCells}
      </div>
      <div style="margin-top:16px;display:flex;gap:12px;font-size:12px;color:var(--text2)">
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--accent);margin-right:4px"></span>Zi activa</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;border:1.5px solid var(--accent);margin-right:4px"></span>Azi</span>
      </div>
    </div>
  `);
}

function openNotesModal() {
  closeAllModals();
  function renderNotesList(modal) {
    const list = modal.querySelector('#notesList');
    list.innerHTML = state.notes.length === 0
      ? '<div class="empty-state" style="padding:20px"><div class="empty-icon">📝</div><p>Nicio nota</p></div>'
      : state.notes.map(n => `
        <div class="note-item">
          <div class="note-text">${n.text}</div>
          <button class="note-del" data-note-id="${n.id}">✕</button>
        </div>`).join('');
    list.querySelectorAll('[data-note-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.notes = state.notes.filter(x => x.id !== btn.dataset.noteId);
        save();
        renderNotesList(modal);
      });
    });
  }

  const { modal, close } = openModal(`
    <div class="modal-header">
      <span class="modal-title">Note rapide</span>
      <button class="modal-close" data-close>✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <textarea class="form-input" id="noteInput" rows="3" placeholder="Scrie o nota rapida..."></textarea>
      </div>
      <button class="btn btn-primary btn-full" id="noteSaveBtn" style="margin-bottom:16px">Adauga nota</button>
      <div id="notesList"></div>
    </div>
  `);
  renderNotesList(modal);
  modal.querySelector('#noteSaveBtn').addEventListener('click', () => {
    const text = modal.querySelector('#noteInput').value.trim();
    if (!text) return;
    state.notes.push({ id: uid(), text, date: todayISO() });
    save();
    modal.querySelector('#noteInput').value = '';
    renderNotesList(modal);
    toast('Nota salvata! 📝');
  });
}

function openPlanDayModal() {
  const today = todayISO();
  const todayTasks = state.tasks.filter(t => t.date === today).sort((a, b) => a.time.localeCompare(b.time));

  const { modal, close } = openModal(`
    <div class="modal-header">
      <span class="modal-title">🎯 Planifica ziua</span>
      <button class="modal-close" data-close>✕</button>
    </div>
    <div class="modal-body">
      <p style="font-size:13px;color:var(--text2);margin-bottom:12px">Task-urile tale pentru azi (ordonate dupa ora):</p>
      ${todayTasks.length === 0
        ? '<div class="empty-state"><div class="empty-icon">🎯</div><p>Niciun task azi</p></div>'
        : todayTasks.map(t => `
          <div class="plan-task-item">
            <span class="plan-drag-handle">⠿</span>
            <span style="font-size:16px">${t.emoji}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:${t.done ? 'var(--text3)' : 'var(--text)'};${t.done ? 'text-decoration:line-through' : ''}">${t.title}</div>
              <div style="font-size:11px;color:var(--text3)">${t.time}</div>
            </div>
            <div class="task-checkbox ${t.done ? 'done' : ''}" data-act="toggleTask" data-id="${t.id}"></div>
          </div>`).join('')}
      <button class="btn btn-primary btn-full" id="planAddTask" style="margin-top:12px">+ Adauga task nou</button>
    </div>
  `);
  modal.querySelector('#planAddTask').addEventListener('click', () => { close(); openAddTaskModal(); });
  modal.querySelectorAll('[data-act="toggleTask"]').forEach(cb => {
    cb.addEventListener('click', () => {
      const taskId = cb.dataset.id;
      const task = state.tasks.find(t => t.id === taskId);
      if (task) {
        const wasDone = task.done;
        task.done = !task.done;
        if (!wasDone && task.done) {
          addPoints(10);
          checkAllTasksBonus();
        }
        save();
        close();
        render();
      }
    });
  });
}

function openNotifsListModal() {
  function renderList(modal) {
    const list = modal.querySelector('#notifsList');
    if (state.notifications.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">🔔</div><p>Nicio notificare</p></div>';
      return;
    }
    list.innerHTML = state.notifications.slice().reverse().map(n => `
      <div class="notif-item">
        <div class="notif-dot ${n.read ? 'read' : ''}"></div>
        <div class="notif-body">
          <div class="notif-text">${n.text}</div>
          <div class="notif-time">${n.time}</div>
        </div>
      </div>`).join('');
  }

  const { modal, close } = openModal(`
    <div class="modal-header">
      <span class="modal-title">Notificari</span>
      <button class="modal-close" data-close>✕</button>
    </div>
    <div class="modal-body">
      <button class="btn btn-secondary btn-full" id="markAllRead" style="margin-bottom:12px">Marcheaza toate citite</button>
      <div id="notifsList"></div>
    </div>
  `);
  renderList(modal);
  modal.querySelector('#markAllRead').addEventListener('click', () => {
    state.notifications.forEach(n => n.read = true);
    save();
    renderList(modal);
    render();
  });
}

function openEditProfileModal() {
  const { modal, close } = openModal(`
    <div class="modal-header">
      <span class="modal-title">Editeaza profil</span>
      <button class="modal-close" data-close>✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Nume</label>
        <input class="form-input" id="mProfName" value="${state.profile.name}" maxlength="30"/>
      </div>
      <div class="form-group">
        <label class="form-label">Motto personal</label>
        <textarea class="form-input" id="mProfMotto" rows="2" maxlength="100">${state.profile.motto}</textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-close>Anuleaza</button>
      <button class="btn btn-primary" id="mProfSave">Salveaza</button>
    </div>
  `);
  modal.querySelector('#mProfSave').addEventListener('click', () => {
    const name = modal.querySelector('#mProfName').value.trim();
    const motto = modal.querySelector('#mProfMotto').value.trim();
    if (!name) { toast('Scrie un nume!'); return; }
    state.profile.name = name;
    state.profile.motto = motto || state.profile.motto;
    save();
    close();
    render();
    toast('Profil actualizat!');
  });
}

function openFabMenu() {
  const { close } = openModal(`
    <div class="modal-header">
      <span class="modal-title">Ce vrei sa adaugi?</span>
      <button class="modal-close" data-close>✕</button>
    </div>
    <div class="fab-sheet">
      <div class="fab-sheet-item" class="fab-sheet-item fab-task-btn">
        <div class="fab-sheet-icon bg-blue-dim" style="background:var(--blue-dim)">✅</div>
        <div>
          <div class="fab-sheet-label">Task nou</div>
          <div class="fab-sheet-sub">Adauga un task pentru azi sau viitor</div>
        </div>
      </div>
      <div class="fab-sheet-item" class="fab-sheet-item fab-habit-btn">
        <div class="fab-sheet-icon" style="background:var(--violet-dim)">⭕</div>
        <div>
          <div class="fab-sheet-label">Obicei nou</div>
          <div class="fab-sheet-sub">Adauga un obicei de urmat zilnic</div>
        </div>
      </div>
      <div class="fab-sheet-item" class="fab-sheet-item fab-note-btn">
        <div class="fab-sheet-icon" style="background:var(--green-dim)">📝</div>
        <div>
          <div class="fab-sheet-label">Nota rapida</div>
          <div class="fab-sheet-sub">Noteaza ceva rapid</div>
        </div>
      </div>
    </div>
  `);
  document.querySelector('.fab-task-btn').addEventListener('click', () => { close(); openAddTaskModal(); });
  document.querySelector('.fab-habit-btn').addEventListener('click', () => { close(); openAddHabitModal(); });
  document.querySelector('.fab-note-btn').addEventListener('click', () => { close(); openNotesModal(); });
}
// ===== ACTIONS =====
function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  const wasDone = task.done;
  task.done = !task.done;
  if (!wasDone && task.done) {
    addPoints(10);
    checkAllTasksBonus();
    addNotification(`Task finalizat: ${task.title} ✅`);
  }
  save();
  render();
}

function checkAllTasksBonus() {
  const today = todayISO();
  const todayTasks = state.tasks.filter(t => t.date === today);
  if (todayTasks.length > 0 && todayTasks.every(t => t.done)) {
    addPoints(20);
    toast('🎉 Toate task-urile azi completate! +20 puncte bonus!');
    addNotification('Toate task-urile de azi completate! 🎉 +20 puncte bonus');
  }
}

function toggleHabit(id) {
  const h = state.habits.find(x => x.id === id);
  if (!h) return;
  const wasDone = h.done;
  h.done = !h.done;
  if (!wasDone && h.done) {
    h.doneDate = todayISO();
    h.streak = (h.streak || 0) + 1;
    addPoints(5);
    checkAllHabitsBonus();
    addNotification(`Obicei bifat: ${h.title} ${h.emoji}`);
  } else if (wasDone && !h.done) {
    h.doneDate = null;
    h.streak = Math.max(0, (h.streak || 1) - 1);
    state.stats.points = Math.max(0, state.stats.points - 5);
    save();
  }
  save();
  render();
}

function checkAllHabitsBonus() {
  if (state.habits.length > 0 && state.habits.every(h => h.done)) {
    addPoints(15);
    toast('🌟 Toate obiceiurile completate! +15 puncte bonus!');
    addNotification('Toate obiceiurile de azi completate! 🌟 +15 puncte bonus');
  }
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  cancelNotification(id);
  save();
  render();
  toast('Task sters');
}

function nextQuote() {
  state.quoteIndex = (state.quoteIndex + 1) % QUOTES.length;
  save();
  render();
}

function addNotification(text) {
  if (!state.notifications) state.notifications = [];
  state.notifications.push({
    id: uid(),
    text,
    time: new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
    read: false
  });
  if (state.notifications.length > 50) state.notifications.shift();
  save();
}

// ===== ONESIGNAL / PUSH =====
function scheduleNotification(task) {
  if (!task.time || !task.date) return;
  const os = window.__oneSignalReady;
  if (!os) return;
  try {
    const dt = new Date(`${task.date}T${task.time}:00`);
    if (dt <= new Date()) return;
    // Store for display — actual scheduling via OneSignal API would need backend
    if (!state.notifications) state.notifications = [];
    addNotification(`Programat: ${task.title} la ${task.time}`);
  } catch (e) { /* ignore */ }
}

function cancelNotification(id) {
  // placeholder — would cancel via OneSignal external ID
}

async function testPushNotification() {
  const os = window.__oneSignalReady;
  if (os) {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('Dragon Life 🐉', {
          body: 'Notificarile push functioneaza! 🎉',
          icon: '/icon.svg'
        });
        toast('Notificare trimisa! 🔔');
        addNotification('Test notificare push reusit!');
      } else {
        toast('Permisiune notificari refuzata');
      }
    } catch (e) {
      toast('Notificarile nu sunt disponibile pe acest dispozitiv');
    }
  } else {
    if ('Notification' in window) {
      const p = await Notification.requestPermission();
      if (p === 'granted') {
        new Notification('Dragon Life', { body: 'Test ok! 🐉' });
        toast('Notificare trimisa!');
      }
    } else {
      toast('Notificarile nu sunt suportate');
    }
  }
}

// ===== EXPORT / IMPORT / RESET =====


function confirmReset() {
  const { modal, close } = openModal(`
    <div class="modal-header">
      <span class="modal-title" style="color:var(--red)">Reseteaza aplicatia</span>
      <button class="modal-close" data-close>✕</button>
    </div>
    <div class="modal-body">
      <p style="font-size:14px;color:var(--text2);margin-bottom:16px">Aceasta actiune va sterge <strong style="color:var(--text)">toate datele</strong> si nu poate fi anulata.</p>
      <p style="font-size:13px;color:var(--text3)">Asigura-te ca ai exportat datele inainte.</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-close>Anuleaza</button>
      <button class="btn btn-danger" id="confirmResetBtn">Da, reseteaza tot</button>
    </div>
  `, { center: true });
  modal.querySelector('#confirmResetBtn').addEventListener('click', () => {
    localStorage.removeItem(KEY);
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    save();
    close();
    render();
    toast('Aplicatia a fost resetata');
  });
}

function triggerAvatarUpload() {
  document.getElementById('avatarInput').click();
}

function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    state.profile.photo = ev.target.result;
    save();
    render();
    toast('Avatar actualizat! 📷');
  };
  reader.readAsDataURL(file);
}

// ===== GLOBAL EVENT DELEGATION =====
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const id = el.dataset.id;
  const filter = el.dataset.filter;

  switch (act) {
    case 'toggleTask': toggleTask(id); break;
    case 'toggleHabit': toggleHabit(id); break;
    case 'deleteTask': deleteTask(id); break;
    case 'openAddTaskModal': openAddTaskModal(); break;
    case 'openEditTaskModal': openEditTaskModal(id); break;
    case 'openAddHabitModal': openAddHabitModal(); break;
    case 'openEditHabitModal': openEditHabitModal(id); break;
    case 'openHealthModal': openHealthModal(); break;
    case 'openStatsModal': openStatsModal(); break;
    case 'openCalendarModal': openCalendarModal(); break;
    case 'openNotesModal': openNotesModal(); break;
    case 'openPlanDayModal': openPlanDayModal(); break;
    case 'openNotifsListModal': openNotifsListModal(); break;
    case 'openEditProfileModal': openEditProfileModal(); break;
    case 'openFabMenu': openFabMenu(); break;
    case 'filterTasks':
      tasksFilter = filter;
      render();
      break;
    case 'nextQuote': nextQuote(); break;
    case 'goProfile': setTab('profile'); break;
    case 'goTasks': setTab('tasks'); break;
    case 'goHabits': setTab('habits'); break;
    case 'confirmReset': confirmReset(); break;
    case 'testPushNotification': testPushNotification(); break;
    case 'triggerAvatarUpload': triggerAvatarUpload(); break;
    case 'handleAvatarUpload': handleAvatarUpload(e); break;
  }
});

document.addEventListener('change', e => {
  if (e.target.id === 'avatarInput') handleAvatarUpload(e);
});

// Nav tab clicks
document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => setTab(btn.dataset.tab));
});

// FAB handled via data-act delegation above

// ===== SWIPE NAVIGATION =====
const TABS = ['dashboard', 'tasks', 'habits', 'profile'];
let swipeStartX = 0, swipeStartY = 0, swipeActive = false;

document.addEventListener('touchstart', e => {
  const t = e.touches[0];
  swipeStartX = t.clientX;
  swipeStartY = t.clientY;
  swipeActive = true;
}, { passive: true });

document.addEventListener('touchmove', e => {
  if (!swipeActive) return;
  const dx = e.touches[0].clientX - swipeStartX;
  const dy = e.touches[0].clientY - swipeStartY;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
    const modalRoot = document.getElementById('modalRoot');
    if (modalRoot && modalRoot.children.length > 0) return;
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener('touchend', e => {
  if (!swipeActive) return;
  swipeActive = false;
  const dx = e.changedTouches[0].clientX - swipeStartX;
  const dy = e.changedTouches[0].clientY - swipeStartY;
  if (Math.abs(dx) < Math.abs(dy) || Math.abs(dx) < 50) return;
  const modalRoot = document.getElementById('modalRoot');
  if (modalRoot && modalRoot.children.length > 0) {
    if (dx > 0) closeAllModals();
    return;
  }
  const idx = TABS.indexOf(state.currentTab);
  if (dx < 0 && idx < TABS.length - 1) setTab(TABS[idx + 1]);
  if (dx > 0 && idx > 0) setTab(TABS[idx - 1]);
}, { passive: true });

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  load();
  ensureHealthDay();
  ensureHabitsDay();
  updateStreak();
  setTab(state.currentTab || 'dashboard');
  checkNightMode();
  setInterval(checkNightMode, 60000);
});