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
  plan: [],
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

// ===== DRAGON SCORE ENGINE =====
function computeDragonScore() {
  const today = todayISO();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // ── TASKS (weight 35%) ──────────────────────────────────────────
  const todayTasks = state.tasks.filter(t => t.date === today);
  const doneTasks = todayTasks.filter(t => t.done).length;
  const totalTasks = todayTasks.length;
  let tasksScore = 0;
  if (totalTasks === 0) {
    tasksScore = 0;
  } else {
    const basePct = (doneTasks / totalTasks) * 100;
    const allDoneBonus = doneTasks === totalTasks ? 15 : 0;
    const workBonus = Math.min(15, todayTasks.filter(t => t.done && t.chip === 'work').length * 5);
    const overduePenalty = todayTasks.filter(t => {
      if (t.done) return false;
      const [th, tm] = (t.time || '23:59').split(':').map(Number);
      return (th * 60 + tm) < nowMin;
    }).length * 5;
    tasksScore = Math.min(100, Math.max(0, basePct + allDoneBonus + workBonus - overduePenalty));
  }

  // ── HABITS (weight 30%) ─────────────────────────────────────────
  const doneHabits = state.habits.filter(h => h.done).length;
  const totalHabits = state.habits.length;
  let habitsScore = 0;
  if (totalHabits > 0) {
    const baseH = (doneHabits / totalHabits) * 100;
    const allHabitsBonus = doneHabits === totalHabits ? 20 : 0;
    const avgStreak = state.habits.length > 0
      ? state.habits.reduce((s, h) => s + (h.streak || 0), 0) / state.habits.length
      : 0;
    const streakBonus = Math.min(20, (avgStreak / 7) * 20);
    habitsScore = Math.min(100, baseH + allHabitsBonus + streakBonus);
  }

  // ── HEALTH (weight 20%) ─────────────────────────────────────────
  const sleepMin = sleepMinutes(state.health.sleepFrom, state.health.sleepTo);
  const sleepHas = !!(state.health.sleepFrom && state.health.sleepTo);
  let sleepScore = sleepHas
    ? (sleepMin < 300 ? 20 : sleepMin < 360 ? 40 : sleepMin < 420 ? 70 : sleepMin <= 540 ? 100 : 75)
    : 0;
  const energyScore = state.health.energy || 0;
  const waterScore = state.health.waterGoal > 0
    ? Math.min(100, ((state.health.water || 0) / state.health.waterGoal) * 100)
    : 0;
  const mealsCount = Object.values(state.health.meals || {}).filter(Boolean).length;
  const mealScore = (mealsCount / 4) * 100;
  const bpm = state.health.bpm || 0;
  const bpmScore = bpm === 0 ? 0
    : bpm >= 55 && bpm <= 75 ? 100
    : bpm >= 75 && bpm <= 85 ? 85
    : bpm >= 45 && bpm <= 55 ? 70
    : 50;
  const healthInputs = sleepHas ? [sleepScore, energyScore, waterScore, mealScore, bpmScore]
    : [energyScore, waterScore, mealScore];
  const healthScore = healthInputs.length > 0
    ? healthInputs.reduce((a, b) => a + b, 0) / healthInputs.length
    : 0;

  // ── MOMENTUM (weight 15%) ───────────────────────────────────────
  const streak = state.stats.streak || 0;
  const streakScore = Math.min(100, streak * 8);
  const usageDays = (state.usage.dates || []);
  const last7 = usageDays.filter(d => {
    const diff = (Date.now() - new Date(d).getTime()) / 86400000;
    return diff <= 7;
  }).length;
  const consistencyScore = Math.min(100, (last7 / 7) * 100);
  const pts = state.stats.pointsHistory || [];
  let trendScore = 50;
  if (pts.length >= 3) {
    const recent = pts.slice(-3).map(p => p.pts);
    if (recent[2] > recent[1] && recent[1] > recent[0]) trendScore = 100;
    else if (recent[2] > recent[0]) trendScore = 75;
    else if (recent[2] < recent[0]) trendScore = 25;
  }
  const momentumScore = (streakScore * 0.5 + consistencyScore * 0.3 + trendScore * 0.2);

  // ── COMPOSITE ──────────────────────────────────────────────────
  const weights = totalTasks > 0
    ? { t: 0.35, h: 0.30, he: 0.20, m: 0.15 }
    : { t: 0, h: 0.45, he: 0.30, m: 0.25 };
  const total = Math.round(
    tasksScore * weights.t +
    habitsScore * weights.h +
    healthScore * weights.he +
    momentumScore * weights.m
  );

  // ── GRADE & INSIGHTS ───────────────────────────────────────────
  const grade = total >= 91 ? { label: 'Dragon Mode', emoji: '🐉', color: '#a855f7' }
    : total >= 81 ? { label: 'Excelent', emoji: '🏆', color: '#eab308' }
    : total >= 61 ? { label: 'Productiv', emoji: '🔥', color: '#f97316' }
    : total >= 41 ? { label: 'Activ', emoji: '⚡', color: '#3b82f6' }
    : total >= 21 ? { label: 'In formare', emoji: '🌱', color: '#22c55e' }
    : { label: 'Inceput', emoji: '😴', color: '#6060a0' };

  const insights = [];
  if (totalTasks > 0 && doneTasks < totalTasks) insights.push(`${totalTasks - doneTasks} task${totalTasks - doneTasks > 1 ? '-uri' : ''} neTerminate`);
  if (totalHabits > 0 && doneHabits < totalHabits) insights.push(`${totalHabits - doneHabits} obicei${totalHabits - doneHabits > 1 ? 'uri' : ''} bifabile`);
  if (sleepHas && sleepMin < 420) insights.push('Somn sub 7h — prioritizeaza odihna');
  if (state.health.water > 0 && waterScore < 60) insights.push('Hidratare scazuta — mai bea apa');
  if (streak >= 7) insights.push(`Serie de ${streak} zile — continua!`);
  if (total >= 90) insights.push('Zi perfecta! Felicitari!');

  return {
    total,
    grade,
    insights,
    components: {
      tasks: { score: Math.round(tasksScore), done: doneTasks, total: totalTasks, label: 'Task-uri' },
      habits: { score: Math.round(habitsScore), done: doneHabits, total: totalHabits, label: 'Obiceiuri' },
      health: { score: Math.round(healthScore), label: 'Sanatate', details: { sleep: Math.round(sleepScore), energy: energyScore, water: Math.round(waterScore), meals: Math.round(mealScore) } },
      momentum: { score: Math.round(momentumScore), label: 'Momentum', streak }
    }
  };
}

function computeProgress() {
  const ds = computeDragonScore();
  return {
    overallPct: ds.total,
    doneTasks: ds.components.tasks.done,
    totalTasks: ds.components.tasks.total || 1,
    tasksPct: ds.components.tasks.score,
    productivityPct: ds.components.habits.score,
    healthPct: ds.components.health.score
  };
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
    case 'notes': screen.innerHTML = renderNotes(); break;
    case 'plan': screen.innerHTML = renderPlan(); break;
    default: screen.innerHTML = renderDashboard();
  }
}

// ===== DASHBOARD SCREEN =====
function renderDashboard() {
  const ds = computeDragonScore();
  const today = todayISO();
  const sleepMin = sleepMinutes(state.health.sleepFrom, state.health.sleepTo);
  const unread = state.notifications.filter(n => !n.read).length;
  const photo = state.profile.photo;
  const avatarContent = photo
    ? `<img src="${photo}" alt="avatar"/>`
    : `<span>😊</span>`;
  const c = ds.components;
  const barColor = ds.total >= 81 ? '#a855f7' : ds.total >= 61 ? '#f97316' : ds.total >= 41 ? '#3b82f6' : '#22c55e';

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

    <div class="dragon-score-card" data-act="openScoreModal">
      <div class="ds-left">
        <div class="ds-grade-emoji">${ds.grade.emoji}</div>
        <div>
          <div class="ds-grade-label" style="color:${ds.grade.color}">${ds.grade.label}</div>
          <div class="ds-grade-sub">Scor Dragon</div>
        </div>
      </div>
      <div class="ds-right">
        <div class="ds-score" style="color:${ds.grade.color}">${ds.total}</div>
        <div class="ds-score-max">/100</div>
      </div>
      <div class="ds-bar-track" style="margin-top:14px">
        <div class="ds-bar-fill" style="width:${ds.total}%;background:${ds.grade.color}"></div>
      </div>
      <div class="ds-components">
        <div class="ds-comp">
          <div class="ds-comp-val">${c.tasks.done}/${c.tasks.total || '—'}</div>
          <div class="ds-comp-lbl">Tasks</div>
          <div class="ds-comp-bar"><div style="width:${c.tasks.score}%;background:#22c55e"></div></div>
        </div>
        <div class="ds-comp">
          <div class="ds-comp-val">${c.habits.done}/${c.habits.total || '—'}</div>
          <div class="ds-comp-lbl">Habits</div>
          <div class="ds-comp-bar"><div style="width:${c.habits.score}%;background:#a855f7"></div></div>
        </div>
        <div class="ds-comp">
          <div class="ds-comp-val">${c.health.score}%</div>
          <div class="ds-comp-lbl">Health</div>
          <div class="ds-comp-bar"><div style="width:${c.health.score}%;background:#ef4444"></div></div>
        </div>
        <div class="ds-comp">
          <div class="ds-comp-val">${c.momentum.streak}🔥</div>
          <div class="ds-comp-lbl">Streak</div>
          <div class="ds-comp-bar"><div style="width:${c.momentum.score}%;background:#f97316"></div></div>
        </div>
      </div>
      ${ds.insights.length > 0 ? `<div class="ds-insight">💡 ${ds.insights[0]}</div>` : ''}
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
let tasksSort = 'time-asc';
let planViewMonth = null;

function renderTasks() {
  const today = todayISO();
  let filtered = state.tasks;
  if (tasksFilter === 'today') filtered = state.tasks.filter(t => t.date === today);
  else if (tasksFilter === 'done') filtered = state.tasks.filter(t => t.done);
  if (tasksSort === 'time-asc') filtered = filtered.slice().sort((a, b) => a.time.localeCompare(b.time));
  else if (tasksSort === 'time-desc') filtered = filtered.slice().sort((a, b) => b.time.localeCompare(a.time));
  else filtered = filtered.slice().sort((a, b) => Number(a.done) - Number(b.done));

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
      <div class="filter-chip${tasksSort === 'time-asc' ? '' : tasksSort === 'time-desc' ? ' sort-desc' : ' sort-done'} sort-chip" data-act="cycleTaskSort">⇅ ${tasksSort === 'time-asc' ? 'Ora ↑' : tasksSort === 'time-desc' ? 'Ora ↓' : 'Status'}</div>
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

// ===== NOTES SCREEN =====
function renderNotes() {
  return `<div class="notes-page">
    <div class="page-header">
      <span class="page-title">Note</span>
    </div>
    <div class="note-compose">
      <textarea class="note-textarea" id="noteCompose" placeholder="Scrie o nota..." rows="3"></textarea>
      <button class="btn btn-primary note-add-btn" id="noteAddBtn">Adauga</button>
    </div>
    <div class="notes-list" id="notesList">
      ${state.notes.length === 0
        ? '<div class="empty-state"><div class="empty-icon">📝</div><p>Nicio nota inca</p><small>Scrie prima ta nota mai sus</small></div>'
        : state.notes.slice().reverse().map(n => `
        <div class="note-card" data-note-id="${n.id}">
          <div class="note-card-text">${n.text.replace(/\n/g, '<br>')}</div>
          <div class="note-card-footer">
            <span class="note-card-date">${n.date}</span>
            <button class="note-card-del" data-act="deleteNote" data-id="${n.id}">✕</button>
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

// ===== PLAN SCREEN =====
function renderPlan() {
  const today = new Date();
  if (!planViewMonth) planViewMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2,'0');
  const [yr, mo] = planViewMonth.split('-').map(Number);
  const monthDate = new Date(yr, mo - 1, 1);
  const monthName = monthDate.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
  const firstDay = (monthDate.getDay() + 6) % 7;
  const daysInMonth = new Date(yr, mo, 0).getDate();

  const eventsThisMonth = (state.plan || []).filter(e => e.date.startsWith(planViewMonth));
  const eventsByDay = {};
  eventsThisMonth.forEach(e => {
    const d = parseInt(e.date.split('-')[2]);
    if (!eventsByDay[d]) eventsByDay[d] = [];
    eventsByDay[d].push(e);
  });

  const todayISO2 = todayISO();

  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += '<div class="plan-cal-cell empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = yr + '-' + String(mo).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    const isToday = dateStr === todayISO2;
    const hasEvents = eventsByDay[d] && eventsByDay[d].length > 0;
    const dots = hasEvents ? `<div class="plan-cal-dots">${eventsByDay[d].slice(0,3).map(() => '<span class="plan-cal-dot"></span>').join('')}</div>` : '';
    cells += `<div class="plan-cal-cell${isToday ? ' today' : ''}${hasEvents ? ' has-events' : ''}" data-act="openPlanDay" data-date="${dateStr}">
      <span class="plan-cal-num">${d}</span>${dots}
    </div>`;
  }

  const upcoming = (state.plan || [])
    .filter(e => e.date >= todayISO2)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 20);

  return `<div class="plan-page">
    <div class="page-header">
      <span class="page-title">Planificare</span>
      <button class="icon-btn" data-act="openAddPlanModal" aria-label="Eveniment nou">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
      </button>
    </div>
    <div class="plan-cal-header">
      <button class="plan-cal-nav" data-act="planPrevMonth">‹</button>
      <span class="plan-cal-month">${monthName}</span>
      <button class="plan-cal-nav" data-act="planNextMonth">›</button>
    </div>
    <div class="plan-cal-weekdays">
      ${['Lu','Ma','Mi','Jo','Vi','Sa','Du'].map(d => `<div class="plan-cal-wd">${d}</div>`).join('')}
    </div>
    <div class="plan-cal-grid">${cells}</div>
    <div class="plan-upcoming">
      <div class="section-title" style="padding:12px 16px 8px">Urmatoare</div>
      ${upcoming.length === 0
        ? '<div class="empty-state" style="padding:20px"><div class="empty-icon">📅</div><p>Niciun eveniment planificat</p><small>Apasa + pentru a adauga</small></div>'
        : upcoming.map(e => `
        <div class="plan-event-item">
          <div class="plan-event-emoji">${e.emoji || '📅'}</div>
          <div class="plan-event-body">
            <div class="plan-event-title">${e.title}</div>
            <div class="plan-event-meta">${e.date} · ${e.time}</div>
          </div>
          <button class="plan-event-del" data-act="deletePlanEvent" data-id="${e.id}">✕</button>
        </div>`).join('')}
    </div>
  </div>`;
}

async function schedulePlanNotif(ev) {
  const extId = state.profile._pushId;
  if (!extId) return null;
  const sendAt = new Date(ev.date + 'T' + ev.time + ':00').toISOString();
  if (new Date(sendAt) <= new Date()) return null;
  const res = await fetch('/api?action=schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ externalId: extId, title: (ev.emoji || '📅') + ' ' + ev.title, body: 'Astazi la ' + ev.time, sendAt })
  }).then(r => r.json()).catch(() => ({}));
  return res.id || null;
}

function openAddPlanModal(prefillDate) {
  closeAllModals();
  const today = todayISO();
  const { modal, close } = openModal(`
    <div class="modal-header">
      <span class="modal-title">Eveniment nou</span>
      <button class="modal-close" data-close>✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Titlu</label>
        <input class="form-input" id="pTitle" placeholder="Ex: Intalnire doctor..." />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Data</label>
          <input class="form-input" id="pDate" type="date" value="${prefillDate || today}" />
        </div>
        <div class="form-group">
          <label class="form-label">Ora</label>
          <input class="form-input" id="pTime" type="time" value="09:00" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Emoji</label>
        <div class="emoji-picker" id="pEmojiPicker">
          ${['📅','🏥','💼','🎂','✈️','🏋️','📞','🎯','💡','🎉'].map(em => `<div class="emoji-opt${em === '📅' ? ' selected' : ''}" data-emoji="${em}">${em}</div>`).join('')}
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-close>Anuleaza</button>
      <button class="btn btn-primary" id="pSaveBtn">Salveaza + Push</button>
    </div>
  `);

  let selEmoji = '📅';
  modal.querySelectorAll('.emoji-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      modal.querySelectorAll('.emoji-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selEmoji = opt.dataset.emoji;
    });
  });

  modal.querySelector('#pSaveBtn').addEventListener('click', async () => {
    const title = modal.querySelector('#pTitle').value.trim();
    const date = modal.querySelector('#pDate').value;
    const time = modal.querySelector('#pTime').value;
    if (!title || !date || !time) { toast('Completeaza toate campurile'); return; }
    const ev = { id: uid(), title, emoji: selEmoji, date, time, notifId: null };
    if (!state.plan) state.plan = [];
    state.plan.push(ev);
    save();
    close();
    render();
    toast('Eveniment adaugat! 📅');
    const notifId = await schedulePlanNotif(ev);
    if (notifId) {
      ev.notifId = notifId;
      save();
      toast('Push programat! 🔔');
    }
  });
}

function deletePlanEvent(id) {
  const ev = (state.plan || []).find(e => e.id === id);
  if (!ev) return;
  if (ev.notifId) {
    fetch('/api?action=cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ev.notifId }) }).catch(() => {});
  }
  state.plan = state.plan.filter(e => e.id !== id);
  save();
  render();
  toast('Eveniment sters');
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
function openScoreModal() {
  const ds = computeDragonScore();
  const c = ds.components;
  function bar(score, color) {
    return `<div class="score-bar-track"><div class="score-bar-fill" style="width:${score}%;background:${color}"></div></div>`;
  }
  openModal(`
    <div class="modal-header">
      <span class="modal-title">Dragon Score</span>
      <button class="modal-close" data-close>✕</button>
    </div>
    <div class="modal-body">
      <div style="text-align:center;padding:12px 0 20px">
        <div style="font-size:56px;line-height:1">${ds.grade.emoji}</div>
        <div style="font-size:52px;font-weight:900;color:${ds.grade.color};line-height:1.1">${ds.total}</div>
        <div style="font-size:18px;font-weight:700;color:${ds.grade.color};margin-top:4px">${ds.grade.label}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:13px;font-weight:600;color:var(--text)">✅ Task-uri</span><span style="font-size:13px;font-weight:700;color:#22c55e">${c.tasks.score}%</span></div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px">${c.tasks.done} din ${c.tasks.total} finalizate azi · bonus muncă + penalizare restante</div>
          ${bar(c.tasks.score, '#22c55e')}
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:13px;font-weight:600;color:var(--text)">🔄 Obiceiuri</span><span style="font-size:13px;font-weight:700;color:#a855f7">${c.habits.score}%</span></div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px">${c.habits.done} din ${c.habits.total} bifate · bonus serie + toate complete</div>
          ${bar(c.habits.score, '#a855f7')}
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:13px;font-weight:600;color:var(--text)">❤️ Sanatate</span><span style="font-size:13px;font-weight:700;color:#ef4444">${c.health.score}%</span></div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px">Somn ${c.health.details.sleep}% · Energie ${c.health.details.energy}% · Apa ${c.health.details.water}% · Mese ${c.health.details.meals}%</div>
          ${bar(c.health.score, '#ef4444')}
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:13px;font-weight:600;color:var(--text)">🔥 Momentum</span><span style="font-size:13px;font-weight:700;color:#f97316">${c.momentum.score}%</span></div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px">Serie ${c.momentum.streak} zile · consistenta + trend puncte</div>
          ${bar(c.momentum.score, '#f97316')}
        </div>
      </div>
      ${ds.insights.length > 0 ? `<div style="margin-top:16px;padding:12px;background:var(--bg3);border-radius:var(--radius-sm);border:1px solid var(--border)">
        <div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:8px">💡 Observatii</div>
        ${ds.insights.map(i => `<div style="font-size:12px;color:var(--text);margin-bottom:4px">• ${i}</div>`).join('')}
      </div>` : ''}
    </div>
  `);
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
    case 'openScoreModal': openScoreModal(); break;
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
    case 'deleteNote': {
      state.notes = state.notes.filter(x => x.id !== id);
      save();
      render();
      break;
    }
    case 'cycleTaskSort': {
      tasksSort = tasksSort === 'time-asc' ? 'time-desc' : tasksSort === 'time-desc' ? 'done' : 'time-asc';
      render();
      break;
    }
    case 'openAddPlanModal': openAddPlanModal(); break;
    case 'openPlanDay': openAddPlanModal(el.dataset.date); break;
    case 'deletePlanEvent': deletePlanEvent(id); break;
    case 'planPrevMonth': {
      const [yr, mo] = planViewMonth.split('-').map(Number);
      const prev = new Date(yr, mo - 2, 1);
      planViewMonth = prev.getFullYear() + '-' + String(prev.getMonth() + 1).padStart(2,'0');
      render();
      break;
    }
    case 'planNextMonth': {
      const [yr, mo] = planViewMonth.split('-').map(Number);
      const next = new Date(yr, mo, 1);
      planViewMonth = next.getFullYear() + '-' + String(next.getMonth() + 1).padStart(2,'0');
      render();
      break;
    }
    case 'goNotes': setTab('notes'); break;
    case 'goPlan': setTab('plan'); break;
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

document.addEventListener('click', e => {
  const btn = e.target.closest('#noteAddBtn');
  if (!btn) return;
  const ta = document.getElementById('noteCompose');
  const text = ta ? ta.value.trim() : '';
  if (!text) return;
  state.notes.push({ id: uid(), text, date: todayISO() });
  save();
  render();
});

// ===== SWIPE NAVIGATION =====
const TABS = ['dashboard', 'tasks', 'habits', 'notes', 'plan', 'profile'];
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