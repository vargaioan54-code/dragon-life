'use strict';

/* =========================================================
   Dragon Life — full app with push + all buttons wired
   ========================================================= */

const KEY = 'dragonlife.v2';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const todayISO = () => new Date().toISOString().slice(0, 10);
const nowTime = () => {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const DEFAULT_STATE = {
  v: 2,
  currentTab: 'dashboard',
  profile: {
    name: 'Ionuț',
    photo: 'assets/avatar.jpg',
    motto: 'Concentrează-te pe progres, nu pe perfecțiune.',
    userId: null,
  },
  tasks: [],
  habits: [],
  habitHistory: {},
  health: {
    date: '',
    energy: 85,
    water: 0,
    waterGoal: 2500,
    meals: { mic: false, pranz: false, gustare: false, cina: false },
    sleepFrom: '23:25',
    sleepTo: '07:00',
    bedtimeNotify: false,
    wakeNotify: false,
    bedtimeNotifyId: null,
    wakeNotifyId: null,
  },
  healthHistory: [],
  stats: {
    points: 0,
    streak: 0,
    tasksCompletedTotal: 0,
    lastDate: null,
    pointsHistory: [],
    tasksHistory: [],
    sleepHistory: [],
    bpmHistory: [],
    energyHistory: [],
  },
  notes: [],
  plan: [],
  usage: { dates: [], currentStreak: 0, longestStreak: 0 },
  notifications: [],
  push: { enabled: false, permission: 'default', serverOk: null, checkedAt: 0 },
  quoteIndex: 0,
  localFiredToday: {},
  localFiredDate: '',
  monthlyArchive: [],
  lastMonthReset: '',
};

const SEED_TASKS = [
  { title: 'Antrenament dimineață', emoji: '💪', time: '07:00', done: true },
  { title: 'Citit 20 pagini', emoji: '📖', time: '08:30', done: true },
  { title: 'Lucru proiect Dragons', emoji: '💼', time: '10:00', done: false },
  { title: 'Mese sănătoase', emoji: '🥗', time: '13:00', done: false },
  { title: 'Fără ecrane seara', emoji: '📱', time: '22:00', done: false },
];
const SEED_LONG = [
  { title: 'Revizuire săptămânală (Reflect)', emoji: '📝', time: '20:00', scope: 'weekly',  offsetDays: 3 },
  { title: 'Sport 3x săptămâna asta',         emoji: '🏋️', time: '',      scope: 'weekly',  offsetDays: 6 },
  { title: 'Consultație medicală',           emoji: '🩺', time: '10:00', scope: 'monthly', offsetDays: 14 },
  { title: 'Buget lunar + facturi',          emoji: '💰', time: '',      scope: 'monthly', offsetDays: 25 },
];
const SEED_HABITS = [
  { title: 'Hidratare',  emoji: '💧', time: '10:00', done: true  },
  { title: 'Meditație',  emoji: '🧘', time: '07:30', done: true  },
  { title: 'Citit',      emoji: '📖', time: '20:00', done: true  },
  { title: 'Somn 7h+',   emoji: '🌙', time: '23:00', done: true  },
  { title: 'Fără zahăr', emoji: '🚫', time: '',      done: false },
  { title: 'Jurnal',     emoji: '✏️', time: '21:00', done: true  },
  { title: 'Învățare',   emoji: '🧠', time: '',      done: false },
];
const QUOTES = [
  { text: 'Disciplină astăzi, libertate mâine.', author: '– Tu, peste 1 an' },
  { text: 'Nu conteaza cat de incet mergi, atat timp cat nu te opresti.', author: '– Confucius' },
  { text: 'Fiecare zi este o noua sansa de a-ti schimba viata.', author: '– Anonim' },
  { text: 'Disciplina este puntea dintre obiective si realizari.', author: '– Jim Rohn' },
];

/* ===== STATE PERSISTENCE ===== */
let state = {};
function deepMerge(target, source) {
  const out = Object.assign({}, target);
  for (const k of Object.keys(source)) {
    if (source[k] !== null && typeof source[k] === 'object' && !Array.isArray(source[k])) {
      out[k] = deepMerge(target[k] || {}, source[k]);
    } else if (source[k] !== undefined) {
      out[k] = source[k];
    }
  }
  return out;
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) { state = JSON.parse(JSON.stringify(DEFAULT_STATE)); seedIfEmpty(); return; }
    const parsed = JSON.parse(raw);
    state = deepMerge(JSON.parse(JSON.stringify(DEFAULT_STATE)), parsed);
    if (!state.profile.photo) state.profile.photo = 'assets/avatar.jpg';
    if (!state.profile.userId) state.profile.userId = 'dl_' + uid();
    seedIfEmpty();
  } catch (e) {
    console.error('load error', e);
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    state.profile.userId = 'dl_' + uid();
    seedIfEmpty();
  }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.error('save error', e); }
}
function seedIfEmpty() {
  const today = todayISO();
  if (!state.tasks.length) {
    state.tasks = SEED_TASKS.map((t) => ({ id: uid(), title: t.title, emoji: t.emoji, date: today, time: t.time, done: !!t.done, chip: null, notifyId: null, scope: 'daily' }));
    const base = new Date();
    SEED_LONG.forEach((t) => {
      const d = new Date(base); d.setDate(base.getDate() + t.offsetDays);
      state.tasks.push({ id: uid(), title: t.title, emoji: t.emoji, date: d.toISOString().slice(0, 10), time: t.time, done: false, chip: null, notifyId: null, scope: t.scope });
    });
  } else {
    state.tasks.forEach((t) => { if (!t.scope) t.scope = 'daily'; });
  }
  if (!state.habits.length) {
    state.habits = SEED_HABITS.map((h) => ({ id: uid(), title: h.title, emoji: h.emoji, time: h.time || '', done: !!h.done, doneDate: h.done ? today : null, streak: 0, notifyId: null }));
  }
  save();
}

/* ===== MONTHLY RESET ===== */
function currentMonth() { return todayISO().slice(0, 7); }
function ensureMonthlyReset() {
  const nowMonth = currentMonth();
  if (!state.lastMonthReset) { state.lastMonthReset = nowMonth; save(); return; }
  if (state.lastMonthReset === nowMonth) return;

  const prevMonth = state.lastMonthReset;
  const sleepArr = state.stats.sleepHistory || [];
  const avgSleep = sleepArr.length ? Math.round(sleepArr.reduce((a, b) => a + b, 0) / sleepArr.length) : 0;
  const bpmArr = state.stats.bpmHistory || [];
  const avgBpm = bpmArr.length ? Math.round(bpmArr.reduce((a, b) => a + b, 0) / bpmArr.length) : (state.health.bpm || 0);
  const energyArr = state.stats.energyHistory || [];
  const avgEnergy = energyArr.length ? Math.round(energyArr.reduce((a, b) => a + b, 0) / energyArr.length) : (state.health.energy || 0);

  const archive = {
    month: prevMonth,
    tasksCompleted: state.stats.tasksCompletedTotal || 0,
    points: state.stats.points || 0,
    longestStreak: state.usage.longestStreak || state.stats.streak || 0,
    activeDays: (state.usage.dates || []).filter((d) => d.startsWith(prevMonth)).length,
    avgSleep,
    avgBpm,
    avgEnergy,
    habitStreaks: state.habits.map((h) => ({ id: h.id, title: h.title, emoji: h.emoji, streak: h.streak || 0 })),
    closedAt: new Date().toISOString(),
  };
  state.monthlyArchive = state.monthlyArchive || [];
  state.monthlyArchive.unshift(archive);
  if (state.monthlyArchive.length > 24) state.monthlyArchive.length = 24;

  state.stats.tasksCompletedTotal = 0;
  state.stats.points = 0;
  state.stats.streak = 0;
  state.stats.pointsHistory = [];
  state.stats.tasksHistory = [];
  state.stats.sleepHistory = [];
  state.stats.bpmHistory = [];
  state.stats.energyHistory = [];
  state.habits.forEach((h) => { h.streak = 0; });
  state.habitHistory = {};
  state.usage.dates = [todayISO()];
  state.usage.currentStreak = 1;
  state.usage.longestStreak = 1;
  state.lastMonthReset = nowMonth;
  save();
  toast(`Lună nouă: ${nowMonth}. Contoare resetate.`);
}

/* ===== DAILY RESET ===== */
function ensureTasksDay() {
  const today = todayISO();
  let touched = false;
  let doneYesterday = 0;
  let prevDate = null;
  state.tasks.forEach((t) => {
    if ((t.scope || 'daily') !== 'daily') return;
    if (t.date !== today) {
      if (t.done) { doneYesterday++; prevDate = t.date || prevDate; }
      t.done = false;
      t.date = today;
      t.notifyId = null;
      touched = true;
    }
  });
  if (touched && doneYesterday > 0 && prevDate) {
    const hist = state.stats.tasksHistory || (state.stats.tasksHistory = []);
    const last = hist[hist.length - 1];
    if (!last || last.date !== prevDate) hist.push({ date: prevDate, done: doneYesterday });
    else last.done = Math.max(last.done || 0, doneYesterday);
    if (hist.length > 30) hist.shift();
  }
  if (touched) {
    save();
    if (state.push.enabled) {
      state.tasks.forEach((t) => { if ((t.scope || 'daily') === 'daily' && t.time && !t.done) scheduleTaskPush(t); });
    }
  }
}
function ensureHabitsDay() {
  const today = todayISO();
  let touched = false;
  state.habits.forEach((h) => {
    if (h.doneDate !== today && h.done) {
      const hist = state.habitHistory[h.id] || (state.habitHistory[h.id] = []);
      if (h.doneDate && !hist.includes(h.doneDate)) hist.push(h.doneDate);
      if (hist.length > 90) hist.shift();
      h.streak = (h.streak || 0) + 1;
      h.done = false;
      h.doneDate = null;
      h.notifyId = null;
      touched = true;
    }
  });
  if (touched) {
    save();
    if (state.push.enabled) {
      state.habits.forEach((h) => { if (h.time && !h.done) scheduleHabitPush(h); });
    }
  }
}

/* ===== HELPERS ===== */
function tasksToday() {
  const today = todayISO();
  return state.tasks.filter((t) => (t.scope || 'daily') === 'daily' && (!t.date || t.date === today));
}
function tasksLong() {
  const today = todayISO();
  return state.tasks
    .filter((t) => t.scope === 'weekly' || t.scope === 'monthly')
    .sort((a, b) => ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || '')))
    .filter((t) => !t.date || t.date >= today || !t.done);
}
function daysUntil(dateISO) {
  if (!dateISO) return null;
  const d = new Date(dateISO + 'T00:00:00');
  const today = new Date(todayISO() + 'T00:00:00');
  return Math.round((d - today) / 86400000);
}
function longChipLabel(t) {
  const dU = daysUntil(t.date);
  const scope = t.scope === 'weekly' ? 'Săptămânal' : 'Lunar';
  if (dU == null) return scope;
  if (dU < 0) return `${scope} · întârziat`;
  if (dU === 0) return `${scope} · azi`;
  if (dU === 1) return `${scope} · mâine`;
  return `${scope} · în ${dU} zile`;
}
function habitsDone() { return state.habits.filter((h) => h.done).length; }
function tasksDone() { return tasksToday().filter((t) => t.done).length; }
function progressPct() {
  const t = tasksToday();
  if (!t.length) return 0;
  return Math.round((t.filter((x) => x.done).length / t.length) * 100);
}
function productivityPct() {
  const tPct = progressPct();
  const h = state.habits.length ? Math.round((habitsDone() / state.habits.length) * 100) : 0;
  return Math.round(tPct * 0.6 + h * 0.4);
}
function sleepQuality() {
  const m = sleepMinutes();
  // 100% at 7-9h (420-540 min). Falls off linearly outside.
  if (m >= 420 && m <= 540) return 1;
  if (m < 420) return Math.max(0, m / 420);
  return Math.max(0, 1 - (m - 540) / 240);
}
function computeEnergy() {
  const t = tasksToday();
  const taskPct = t.length ? (t.filter((x) => x.done).length / t.length) : 0;
  const habitPct = state.habits.length ? (habitsDone() / state.habits.length) : 0;
  return Math.round((sleepQuality() * 0.4 + taskPct * 0.3 + habitPct * 0.3) * 100);
}
function healthPct() {
  const w = clamp((state.health.water || 0) / (state.health.waterGoal || 2500), 0, 1);
  const sleep = sleepQuality();
  const e = computeEnergy() / 100;
  return Math.round(((w * 0.35) + (sleep * 0.4) + (e * 0.25)) * 100);
}
function pointsTotal() { return state.stats.points || 0; }
function streakDays() { return state.stats.streak || state.usage.currentStreak || 0; }
function sleepMinutes(from, to) {
  from = from || state.health.sleepFrom || '23:25';
  to = to || state.health.sleepTo || '07:00';
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  let s = fh * 60 + fm;
  let e = th * 60 + tm;
  if (e <= s) e += 24 * 60;
  return e - s;
}
function sleepLabel(m) {
  m = m || sleepMinutes();
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm > 0 ? `${h}h ${mm}m` : `${h}h`;
}
function synthSeries(n, base, range) {
  const arr = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v += (Math.random() - 0.4) * range;
    v = Math.max(base * 0.4, Math.min(base * 1.8, v));
    arr.push(Math.round(v));
  }
  return arr;
}
function getSeries(key, n) {
  n = n || 12;
  const stat = state.stats || {};
  const map = {
    points:  () => stat.pointsHistory && stat.pointsHistory.length >= 2 ? stat.pointsHistory.slice(-n).map((x) => typeof x === 'object' ? Number(x.pts) || 0 : Number(x) || 0) : synthSeries(n, Math.max(30, pointsTotal() / 6 || 40), 12),
    tasks:   () => stat.tasksHistory && stat.tasksHistory.length >= 2 ? stat.tasksHistory.slice(-n).map((x) => typeof x === 'object' ? Number(x.done) || 0 : Number(x) || 0) : synthSeries(n, 6, 3),
    streak:  () => synthSeries(n, Math.max(3, streakDays()), 1.5),
    sleep:   () => stat.sleepHistory && stat.sleepHistory.length >= 2 ? stat.sleepHistory.slice(-n) : synthSeries(n, 430, 25),
    bpm:     () => stat.bpmHistory && stat.bpmHistory.length >= 2 ? stat.bpmHistory.slice(-n) : synthSeries(n, state.health.bpm || 72, 6),
    energy:  () => stat.energyHistory && stat.energyHistory.length >= 2 ? stat.energyHistory.slice(-n) : synthSeries(n, computeEnergy() || 60, 10),
  };
  return (map[key] || (() => synthSeries(n, 40, 10)))();
}
function sparkline(data, w, h, color) {
  w = w || 100; h = h || 28; color = color || '#6366f1';
  let d = data && data.length >= 2 ? data.slice() : [30, 45, 35, 55, 40, 60, 50, 70, 55, 65];
  const min = Math.min(...d), max = Math.max(...d), range = max - min || 1;
  const step = w / (d.length - 1);
  const pts = d.map((v, i) => [i * step, h - 4 - ((v - min) / range) * (h - 8)]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0].toFixed(1)},${p[1].toFixed(1)}` : `L${p[0].toFixed(1)},${p[1].toFixed(1)}`)).join(' ');
  const id = 'g' + Math.random().toString(36).slice(2, 7);
  return `<svg viewBox="0 0 ${w} ${h}" fill="none" preserveAspectRatio="none">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${path} L${w},${h} L0,${h} Z" fill="url(#${id})"/>
    <path d="${path}" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
function donutRing(done, total, size) {
  size = size || 132;
  const pct = total > 0 ? done / total : 0;
  const r = (size - 20) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const gap = circ - dash;
  const gid = 'dg' + Math.random().toString(36).slice(2, 7);
  return `<svg viewBox="0 0 ${size} ${size}">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#a855f7"/>
      <stop offset="60%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient></defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="10"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#${gid})" stroke-width="10"
      stroke-linecap="round" stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}"/>
  </svg>`;
}

/* ===== ICONS ===== */
const IC = {
  check:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-11"/></svg>',
  fire:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s4 4 4 8a4 4 0 1 1-8 0c0-1.5.5-3 1.5-4C11 5 12 2 12 2Z"/><path d="M12 22c5 0 8-3 8-7 0-3-2-5-3-6-.5 4-3 5-3 5 0 4-3 6-3 8Z" opacity=".6"/></svg>',
  trophy:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V4Z"/><path d="M4 5h2v3a4 4 0 0 0 2 3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 5h-2v3a4 4 0 0 1-2 3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 14h6v2H9zM8 20h8v-2H8z"/></svg>',
  moon:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11Z"/></svg>',
  sun:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>',
  heart:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.5-9-9c-1.5-3.5 1-7 4.5-7 2 0 3.3 1 4.5 2.5C13.2 6 14.5 5 16.5 5c3.5 0 6 3.5 4.5 7-2 4.5-9 9-9 9Z"/></svg>',
  bell:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 8H4c0-2 2-3 2-8Z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
  chev:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
  plus:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  target:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
  cal:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  stats:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 20V10M12 20V4M19 20v-6"/></svg>',
  note:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h11l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M16 4v4h4M8 12h8M8 16h6"/></svg>',
  doc:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M15 3v4h4M8 12h8M8 16h6M8 8h3"/></svg>',
  bed:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18V8"/><path d="M3 12h13a4 4 0 0 1 4 4v2"/><path d="M6 12v-2h5v2"/><path d="M20 18H3"/></svg>',
  bolt:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z"/></svg>',
  edit:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
  wave:    '👋',
};

/* ===== PUSH NOTIFICATIONS ===== */
const PUSH = {
  osReady: false,
  osInstance: null,
  serverOk: null,
  apiBase: '/api',
};

async function waitForOneSignal(timeoutMs = 4000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      if (window.OneSignal && typeof window.OneSignal.User !== 'undefined') {
        PUSH.osReady = true;
        PUSH.osInstance = window.OneSignal;
        resolve(window.OneSignal);
      } else if (Date.now() - start > timeoutMs) {
        resolve(null);
      } else {
        setTimeout(check, 200);
      }
    };
    check();
  });
}

async function checkServerPush() {
  if (PUSH.serverOk !== null) return PUSH.serverOk;
  try {
    const r = await fetch(PUSH.apiBase + '?action=config', { method: 'GET' });
    PUSH.serverOk = r.ok;
  } catch (e) {
    PUSH.serverOk = false;
  }
  state.push.serverOk = PUSH.serverOk;
  state.push.checkedAt = Date.now();
  save();
  return PUSH.serverOk;
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const p = await Notification.requestPermission();
    return p;
  } catch { return 'error'; }
}

async function enablePush() {
  const perm = await requestNotificationPermission();
  state.push.permission = perm;
  state.push.enabled = perm === 'granted';
  save();

  if (perm !== 'granted') {
    toast('Permisiune notificări refuzată.');
    return false;
  }

  const OS = await waitForOneSignal();
  const serverOk = await checkServerPush();

  if (OS) {
    try {
      await OS.login(state.profile.userId);
      await OS.User.PushSubscription.optIn();
    } catch (e) { console.warn('OneSignal login failed', e); }
  }

  toast(serverOk ? 'Push activat pentru toate task-urile.' : 'Push local activat (offline).');

  state.tasks.forEach((t) => { if (!t.done && t.date === todayISO()) scheduleTaskPush(t); });
  state.habits.forEach((h) => { if (!h.done && h.time) scheduleHabitPush(h); });
  save();
  return true;
}

function nextOccurrenceISO(dateStr, timeStr) {
  if (!timeStr) return null;
  const [hh, mm] = timeStr.split(':').map(Number);
  const target = new Date();
  if (dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    target.setFullYear(y); target.setMonth(m - 1); target.setDate(d);
  }
  target.setHours(hh, mm, 0, 0);
  if (target.getTime() <= Date.now() + 30000) {
    if (!dateStr) target.setDate(target.getDate() + 1);
    else return null;
  }
  return target.toISOString();
}

async function scheduleServerPush(item, title, body) {
  if (!state.push.enabled) return null;
  const serverOk = await checkServerPush();
  if (!serverOk) return null;
  const sendAt = nextOccurrenceISO(item.date, item.time);
  if (!sendAt) return null;
  try {
    const r = await fetch(PUSH.apiBase + '?action=schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ externalId: state.profile.userId, title, body, sendAt }),
    });
    const j = await r.json();
    return j.id || null;
  } catch (e) {
    console.warn('schedule failed', e);
    return null;
  }
}

async function cancelServerPush(notifyId) {
  if (!notifyId) return;
  try {
    await fetch(PUSH.apiBase + '?action=cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: notifyId }),
    });
  } catch (e) { /* ignore */ }
}

async function scheduleTaskPush(task) {
  if (!task.time || task.done) return;
  await cancelServerPush(task.notifyId);
  const id = await scheduleServerPush(task, `${task.emoji || '⏰'} ${task.title}`, `E ora ${task.time} — dă-i drumul!`);
  if (id) { task.notifyId = id; save(); }
}
async function scheduleHabitPush(habit) {
  if (!habit.time || habit.done) return;
  await cancelServerPush(habit.notifyId);
  const id = await scheduleServerPush({ time: habit.time, date: '' }, `${habit.emoji || '🎯'} ${habit.title}`, `Obicei zilnic — hai ${habit.time}!`);
  if (id) { habit.notifyId = id; save(); }
}
async function cancelTaskPush(task) {
  if (task.notifyId) { await cancelServerPush(task.notifyId); task.notifyId = null; save(); }
}
async function cancelHabitPush(habit) {
  if (habit.notifyId) { await cancelServerPush(habit.notifyId); habit.notifyId = null; save(); }
}

/* Local Notification fallback: fires when app tab is open + a task/habit/sleep time == now */
function localNotifTick() {
  const today = todayISO();
  if (state.localFiredDate !== today) {
    state.localFiredDate = today; state.localFiredToday = {};
    ensureMonthlyReset();
    ensureTasksDay();
    ensureHabitsDay();
    if (state.currentTab === 'dashboard') renderScreen();
  }
  if (state.push.permission !== 'granted') return;
  const now = nowTime();
  const items = [
    ...state.tasks.filter((t) => t.date === today && t.time === now && !t.done).map((t) => ({ key: 't:' + t.id, item: t, kind: 'task' })),
    ...state.habits.filter((h) => h.time === now && !h.done).map((h) => ({ key: 'h:' + h.id, item: h, kind: 'habit' })),
  ];
  items.forEach(({ key, item, kind }) => {
    if (state.localFiredToday[key]) return;
    state.localFiredToday[key] = true;
    const title = `${item.emoji || (kind === 'task' ? '⏰' : '🎯')} ${item.title}`;
    const body = kind === 'task' ? `E ora ${item.time} — dă-i drumul!` : 'Obicei zilnic — fă-l acum';
    fireLocalNotif(title, body, kind, item.id);
  });
  if (state.health.bedtimeNotify && state.health.sleepFrom === now && !state.localFiredToday['sleep:bed']) {
    state.localFiredToday['sleep:bed'] = true;
    fireLocalNotif('🌙 E timpul de somn', 'Închide ecranele și odihnește-te bine.', 'sleep', 'bed');
  }
  if (state.health.wakeNotify && state.health.sleepTo === now && !state.localFiredToday['sleep:wake']) {
    state.localFiredToday['sleep:wake'] = true;
    fireLocalNotif('☀️ Trezirea!', 'Bună dimineața. Începe puternic.', 'sleep', 'wake');
  }
  save();
}
async function fireLocalNotif(title, body, kind, itemId) {
  const entry = { id: uid(), title, body, date: new Date().toISOString(), kind, itemId };
  state.notifications.unshift(entry);
  if (state.notifications.length > 40) state.notifications.length = 40;
  save();
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg && reg.showNotification) {
      reg.showNotification(title, { body, icon: 'assets/avatar.jpg', badge: 'icon.svg', tag: kind + ':' + itemId, renotify: true });
    } else if ('Notification' in window) {
      new Notification(title, { body, icon: 'assets/avatar.jpg' });
    }
  } catch (e) { /* silent */ }
  toast(title);
}

/* ===== ROUTING ===== */
function switchTab(name) {
  state.currentTab = name;
  save();
  $$('.nav-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === name));
  renderScreen();
}
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-btn');
  if (btn && btn.dataset.tab) switchTab(btn.dataset.tab);
});

/* ===== RENDER: DASHBOARD ===== */
function renderDashboard() {
  const done = habitsDone();
  const total = state.habits.length;
  const q = QUOTES[state.quoteIndex % QUOTES.length];
  const pAzi = progressPct();
  const prod = productivityPct();
  const hp = healthPct();
  const tToday = tasksToday();
  const showTasks = tToday.slice(0, 5);
  const showHabits = state.habits.slice(0, 7);
  const bellClass = state.push.enabled ? 'hdr-bell -on' : 'hdr-bell';

  return `
    <div class="tab-view is-active" id="v-dashboard">
      <header class="hdr">
        <div class="hdr-avatar" style="background-image:url('${esc(state.profile.photo || 'assets/avatar.jpg')}')"></div>
        <div class="hdr-text">
          <h1>Bună, ${esc(state.profile.name)} <span class="wave">${IC.wave}</span></h1>
          <p>${esc(state.profile.motto)}</p>
        </div>
        <button class="${bellClass}" data-act="notif" aria-label="Notificări">${IC.bell}</button>
      </header>

      <section class="stats-row">
        <div class="stat-card">
          <div class="stat-ico -green">${IC.check}</div>
          <div class="stat-value">${state.stats.tasksCompletedTotal || 12}</div>
          <div class="stat-label">Task-uri finalizate</div>
          <div class="stat-spark">${sparkline(getSeries('tasks'), 100, 22, '#22c55e')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-ico -orange">${IC.fire}</div>
          <div class="stat-value">${streakDays() || 7}</div>
          <div class="stat-label">Zile serie activă</div>
          <div class="stat-spark">${sparkline(getSeries('streak'), 100, 22, '#f97316')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-ico -purple">${IC.trophy}</div>
          <div class="stat-value">${pointsTotal() || 850}</div>
          <div class="stat-label">Puncte acumulate</div>
          <div class="stat-spark">${sparkline(getSeries('points'), 100, 22, '#a855f7')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-ico -blue">${IC.moon}</div>
          <div class="stat-value">${sleepLabel()}</div>
          <div class="stat-label">Somn mediu săptămâna asta</div>
          <div class="stat-spark">${sparkline(getSeries('sleep'), 100, 22, '#3b82f6')}</div>
        </div>
      </section>

      <section class="progress-card">
        <div class="progress-top"><h3>Progres azi</h3><span class="pct">${pAzi}%</span></div>
        <div class="progress-bar"><span style="width:${pAzi}%"></span></div>
        <div class="progress-mini">
          <div class="pmini">
            <span class="pmini-ico -green">${IC.check}</span>
            <div class="pmini-txt"><div class="pmini-v">${tasksDone()} / ${tToday.length || 0}</div><div class="pmini-l">Task-uri</div></div>
          </div>
          <div class="pmini">
            <span class="pmini-ico -yellow">${IC.sun}</span>
            <div class="pmini-txt"><div class="pmini-v">${prod}%</div><div class="pmini-l">Productivitate</div></div>
          </div>
          <div class="pmini">
            <span class="pmini-ico -red">${IC.heart}</span>
            <div class="pmini-txt"><div class="pmini-v">${hp}%</div><div class="pmini-l">Sănătate</div></div>
          </div>
        </div>
      </section>

      <section class="grid-2">
        <div class="panel -left-accent">
          <div class="panel-hdr"><h3>Task-uri azi</h3><button data-act="goTasks">Vezi toate</button></div>
          <div class="tlist">
            ${showTasks.map((t) => `
              <div class="trow ${t.done ? 'done' : ''}" data-act="toggleTask" data-id="${t.id}">
                <span class="tcheck">${IC.check}</span>
                <span class="ttext">${esc(t.title)} ${esc(t.emoji || '')}</span>
                <span class="ttime">${esc(t.time || '')}</span>
              </div>
            `).join('') || '<div class="empty" style="padding:12px 0">Niciun task azi.</div>'}
          </div>
          <button class="btn-add-task" data-act="openAddTask">${IC.plus} Task nou</button>
        </div>

        <div class="panel">
          <div class="panel-hdr"><h3>Obiceiuri</h3><button data-act="goHabits">Vezi toate</button></div>
          <div class="habits-donut">
            ${donutRing(done, total, 132)}
            <div class="donut-center">
              <b>${done}<span>&nbsp;/&nbsp;${total}</span></b>
              <small>obiceiuri completate</small>
            </div>
          </div>
          <div class="hlist">
            ${showHabits.map((h) => `
              <div class="hrow ${h.done ? 'done' : ''}" data-act="toggleHabit" data-id="${h.id}">
                <span class="hico">${esc(h.emoji || '•')}</span>
                <span class="hname">${esc(h.title)}</span>
                <span class="hcheck">${IC.check}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </section>

      <section class="health-quote">
        <div class="health-card">
          <div class="panel-hdr" data-act="openProtocol" style="cursor:pointer"><h3>Sănătate &amp; Odihnă</h3><span class="chev">${IC.chev}</span></div>
          <div class="health-metrics -two">
            <button class="hmetric-btn" data-act="openSleep" aria-label="Somn">
              <div class="hmetric-ico" style="color:#a855f7">${IC.bed}<span style="color:#f0f2f8">${sleepLabel()}</span></div>
              <div class="hmetric-label">Somn ${state.health.bedtimeNotify || state.health.wakeNotify ? '🔔' : ''}</div>
              <div class="hmetric-spark">${sparkline(getSeries('sleep'), 90, 22, '#a855f7')}</div>
            </button>
            <button class="hmetric-btn" data-act="openEnergy" aria-label="Energie">
              <div class="hmetric-ico" style="color:#22c55e">${IC.bolt}<span style="color:#f0f2f8">${computeEnergy()}%</span></div>
              <div class="hmetric-label">Energie</div>
              <div class="hmetric-spark">${sparkline(getSeries('energy'), 90, 22, '#22c55e')}</div>
            </button>
          </div>
          <button class="btn-protocol" data-act="openProtocol">${IC.doc} Vezi protocolul complet</button>
        </div>

        <div class="quote-card" data-act="nextQuote">
          <div class="quote-mark">"</div>
          <div class="quote-text">${esc(q.text)}</div>
          <div class="quote-author">${esc(q.author)}</div>
        </div>
      </section>

      <section class="quick-row">
        <div class="qtile" data-act="planZi"><span class="qtile-ico -green">${IC.target}</span><div><div class="qtile-title">Planifică</div><div class="qtile-sub">ziua</div></div></div>
        <div class="qtile" data-act="calendar"><span class="qtile-ico -blue">${IC.cal}</span><div><div class="qtile-title">Calendar</div></div></div>
        <div class="qtile" data-act="stats"><span class="qtile-ico -purple">${IC.stats}</span><div><div class="qtile-title">Statistici</div></div></div>
        <div class="qtile" data-act="notes"><span class="qtile-ico -orange">${IC.note}</span><div><div class="qtile-title">Note rapide</div></div></div>
      </section>

      ${renderLongSection()}
    </div>
  `;
}

function renderLongSection() {
  const list = tasksLong();
  const wk = list.filter((t) => t.scope === 'weekly').length;
  const mo = list.filter((t) => t.scope === 'monthly').length;
  return `
    <section class="panel -long" style="margin-top:6px">
      <div class="panel-hdr">
        <h3>Task-uri lunare &amp; săptămânale</h3>
        <button data-act="openAddLong">${IC.plus} Nou</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <span class="chip-scope -weekly">Săptămânal · ${wk}</span>
        <span class="chip-scope -monthly">Lunar · ${mo}</span>
      </div>
      <div class="tlist">
        ${list.map((t) => `
          <div class="trow long ${t.done ? 'done' : ''}">
            <span class="tcheck" data-act="toggleTask" data-id="${t.id}">${IC.check}</span>
            <div data-act="editTask" data-id="${t.id}" style="min-width:0;cursor:pointer">
              <div class="ttext">${esc(t.title)} ${esc(t.emoji || '')}</div>
              <div class="tsub"><span class="chip-scope -${t.scope}">${esc(longChipLabel(t))}</span>${t.notifyId ? ' <span style="color:var(--yellow)">🔔</span>' : ''}</div>
            </div>
            <span class="ttime">${esc(t.time || '')}</span>
          </div>
        `).join('') || '<div class="empty" style="padding:14px 0">Nimic în plan. Adaugă primul.</div>'}
      </div>
    </section>
  `;
}

/* ===== RENDER: TASKS TAB ===== */
function renderTasks() {
  const list = tasksToday();
  const upcoming = state.tasks.filter((t) => t.date && t.date > todayISO()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return `
    <div class="tab-view is-active" id="v-tasks">
      <div class="tab-title">Task-uri azi</div>
      <div class="tab-sub">${list.filter((t) => t.done).length} din ${list.length} finalizate</div>
      <div class="tasks-list">
        ${list.map((t) => `
          <div class="task-lg ${t.done ? 'done' : ''}">
            <span class="tcheck" data-act="toggleTask" data-id="${t.id}">${IC.check}</span>
            <div data-act="editTask" data-id="${t.id}" style="min-width:0;cursor:pointer">
              <div class="ttext">${esc(t.title)} ${esc(t.emoji || '')}</div>
              <div class="ttime" style="font-size:11px;color:var(--text-mute)">${esc(t.time || '')}${t.notifyId ? ' · 🔔' : ''}</div>
            </div>
            <button style="color:var(--text-mute);padding:6px" data-act="delTask" data-id="${t.id}" aria-label="Șterge">${IC.trash}</button>
          </div>
        `).join('') || '<div class="empty">Niciun task azi. Adaugă unul cu butonul +.</div>'}
      </div>
      ${upcoming.length ? `<div class="tab-title" style="font-size:16px;margin-top:22px">Următoarele zile</div>
        <div class="tasks-list">
          ${upcoming.slice(0, 10).map((t) => `
            <div class="task-lg" data-act="editTask" data-id="${t.id}">
              <span class="tcheck">${IC.check}</span>
              <div><div class="ttext">${esc(t.title)} ${esc(t.emoji || '')}</div>
                <div class="ttime" style="font-size:11px;color:var(--text-mute)">${esc(t.date)} · ${esc(t.time || '')}</div>
              </div>
              <span class="chev" style="color:var(--text-mute)">${IC.chev}</span>
            </div>
          `).join('')}
        </div>` : ''}
      <button class="btn-add-task" style="margin-top:14px" data-act="openAddTask">${IC.plus} Task nou</button>
    </div>
  `;
}

/* ===== RENDER: HABITS TAB ===== */
function renderHabits() {
  return `
    <div class="tab-view is-active" id="v-habits">
      <div class="tab-title">Obiceiuri</div>
      <div class="tab-sub">${habitsDone()} din ${state.habits.length} completate azi</div>
      <div class="habits-full">
        ${state.habits.map((h) => `
          <div class="habit-lg ${h.done ? 'done' : ''}">
            <span class="hico" data-act="toggleHabit" data-id="${h.id}" style="cursor:pointer">${esc(h.emoji || '•')}</span>
            <div data-act="editHabit" data-id="${h.id}" style="cursor:pointer;min-width:0">
              <div class="hname">${esc(h.title)}</div>
              <div class="hsub">${h.time ? `${esc(h.time)} · ` : ''}${h.streak ? `${h.streak} zile serie` : 'Zero serie'}${h.notifyId ? ' · 🔔' : ''}</div>
            </div>
            <span class="hcheck" data-act="toggleHabit" data-id="${h.id}" style="cursor:pointer">${IC.check}</span>
          </div>
        `).join('')}
      </div>
      <button class="btn-add-task" style="margin-top:16px" data-act="openAddHabit">${IC.plus} Obicei nou</button>
    </div>
  `;
}

/* ===== RENDER: PROFILE TAB ===== */
function renderProfile() {
  const p = state.push;
  const pushLabel = !('Notification' in window) ? 'Neacceptat de browser'
    : p.enabled ? 'Push activ ✓'
    : p.permission === 'denied' ? 'Blocat — schimbă în setările browserului'
    : 'Activează push-ul';
  const pushBtnColor = p.enabled ? 'var(--green)' : (p.permission === 'denied' ? 'var(--red)' : 'var(--blue)');

  return `
    <div class="tab-view is-active" id="v-profile">
      <div class="profile-hero">
        <div class="hdr-avatar" style="background-image:url('${esc(state.profile.photo || 'assets/avatar.jpg')}')"></div>
        <h2>${esc(state.profile.name)}</h2>
        <p>${esc(state.profile.motto)}</p>
      </div>
      <div class="profile-stats">
        <div class="pstat"><b>${state.stats.tasksCompletedTotal || 12}</b><span>Task-uri</span></div>
        <div class="pstat"><b>${streakDays() || 7}</b><span>Zile serie</span></div>
        <div class="pstat"><b>${pointsTotal() || 850}</b><span>Puncte</span></div>
      </div>
      <div class="profile-list">
        <div class="plist-row" data-act="togglePush">
          <div class="plist-ico" style="color:${pushBtnColor}">${IC.bell}</div>
          <div class="plist-txt">${pushLabel}</div>
          <div class="plist-chev">${IC.chev}</div>
        </div>
        <div class="plist-row" data-act="editProfile">
          <div class="plist-ico">${IC.edit}</div>
          <div class="plist-txt">Editează profil</div>
          <div class="plist-chev">${IC.chev}</div>
        </div>
        <div class="plist-row" data-act="openProtocol">
          <div class="plist-ico">${IC.doc}</div>
          <div class="plist-txt">Protocol Sănătate</div>
          <div class="plist-chev">${IC.chev}</div>
        </div>
        <div class="plist-row" data-act="stats">
          <div class="plist-ico">${IC.stats}</div>
          <div class="plist-txt">Statistici</div>
          <div class="plist-chev">${IC.chev}</div>
        </div>
        <div class="plist-row" data-act="notes">
          <div class="plist-ico">${IC.note}</div>
          <div class="plist-txt">Note rapide</div>
          <div class="plist-chev">${IC.chev}</div>
        </div>
        <div class="plist-row" data-act="testPush">
          <div class="plist-ico" style="color:var(--purple)">${IC.bell}</div>
          <div class="plist-txt">Test notificare (acum)</div>
          <div class="plist-chev">${IC.chev}</div>
        </div>
        <div class="plist-row" data-act="resetData">
          <div class="plist-ico" style="color:var(--red)">${IC.trash}</div>
          <div class="plist-txt" style="color:var(--red)">Resetează datele</div>
          <div class="plist-chev">${IC.chev}</div>
        </div>
      </div>
    </div>
  `;
}

/* ===== SCREEN RENDER ===== */
function renderScreen() {
  const screen = $('#screen');
  const tab = state.currentTab || 'dashboard';
  let html = '';
  if (tab === 'dashboard') html = renderDashboard();
  else if (tab === 'tasks') html = renderTasks();
  else if (tab === 'habits') html = renderHabits();
  else if (tab === 'profile') html = renderProfile();
  else html = renderDashboard();
  screen.innerHTML = html;
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

/* ===== ACTIONS ===== */
function toast(msg) {
  const root = $('#toastRoot');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}
async function toggleTask(id) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return;
  t.done = !t.done;
  if (t.done) { addPoints(10); await cancelTaskPush(t); flashPoints('+10'); }
  else { state.stats.points = Math.max(0, (state.stats.points || 0) - 10); await scheduleTaskPush(t); }
  bumpTasksHistory();
  save();
  patchAfterToggle('task', t);
}
async function toggleHabit(id) {
  const h = state.habits.find((x) => x.id === id);
  if (!h) return;
  h.done = !h.done;
  h.doneDate = h.done ? todayISO() : null;
  if (h.done) { h.streak = (h.streak || 0) + 1; addPoints(5); await cancelHabitPush(h); flashPoints('+5'); }
  else { h.streak = Math.max(0, (h.streak || 0) - 1); await scheduleHabitPush(h); }
  save();
  patchAfterToggle('habit', h);
}

/* Update DOM in place without full re-render — smooth transitions */
function patchAfterToggle(kind, item) {
  const tab = state.currentTab || 'dashboard';

  document.querySelectorAll(`[data-id="${item.id}"]`).forEach((el) => {
    const row = el.closest('.trow, .hrow, .task-lg, .habit-lg');
    if (row) row.classList.toggle('done', !!item.done);
  });

  if (tab === 'dashboard') {
    const pAzi = progressPct();
    const bar = document.querySelector('.progress-bar > span');
    if (bar) bar.style.width = pAzi + '%';
    const pctEl = document.querySelector('.progress-top .pct');
    if (pctEl) pctEl.textContent = pAzi + '%';

    const tToday = tasksToday();
    const miniVals = document.querySelectorAll('.progress-mini .pmini-v');
    if (miniVals[0]) miniVals[0].textContent = `${tasksDone()} / ${tToday.length || 0}`;
    if (miniVals[1]) miniVals[1].textContent = productivityPct() + '%';
    if (miniVals[2]) miniVals[2].textContent = healthPct() + '%';

    const statValues = document.querySelectorAll('.stats-row .stat-value');
    if (statValues[0]) statValues[0].textContent = state.stats.tasksCompletedTotal || 12;
    if (statValues[2]) statValues[2].textContent = pointsTotal() || 850;

    const energyBtn = document.querySelector('[data-act="openEnergy"] .hmetric-ico span');
    if (energyBtn) energyBtn.textContent = computeEnergy() + '%';

    const donut = document.querySelector('.habits-donut');
    if (donut) {
      const done = habitsDone();
      const total = state.habits.length;
      const active = donut.querySelector('svg circle:nth-of-type(2)');
      if (active) {
        const r = Number(active.getAttribute('r'));
        const circ = 2 * Math.PI * r;
        const dash = circ * (total > 0 ? done / total : 0);
        const gap = circ - dash;
        active.style.transition = 'stroke-dasharray 600ms cubic-bezier(0.4, 0, 0.2, 1)';
        active.setAttribute('stroke-dasharray', `${dash.toFixed(2)} ${gap.toFixed(2)}`);
      }
      const bText = donut.querySelector('.donut-center b');
      if (bText) bText.innerHTML = `${done}<span>&nbsp;/&nbsp;${total}</span>`;
    }

    if (item.scope === 'weekly' || item.scope === 'monthly') {
      const list = tasksLong();
      const wk = list.filter((t) => t.scope === 'weekly').length;
      const mo = list.filter((t) => t.scope === 'monthly').length;
      const chips = document.querySelectorAll('.panel.-long .chip-scope');
      if (chips[0]) chips[0].textContent = `Săptămânal · ${wk}`;
      if (chips[1]) chips[1].textContent = `Lunar · ${mo}`;
    }
  } else if (tab === 'tasks') {
    const list = tasksToday();
    const sub = document.querySelector('#v-tasks .tab-sub');
    if (sub) sub.textContent = `${list.filter((t) => t.done).length} din ${list.length} finalizate`;
  } else if (tab === 'habits') {
    const sub = document.querySelector('#v-habits .tab-sub');
    if (sub) sub.textContent = `${habitsDone()} din ${state.habits.length} completate azi`;
    const streakSub = document.querySelector(`.habit-lg [data-act="editHabit"][data-id="${item.id}"] .hsub`);
    if (streakSub) {
      streakSub.textContent = `${item.time ? item.time + ' · ' : ''}${item.streak ? item.streak + ' zile serie' : 'Zero serie'}${item.notifyId ? ' · 🔔' : ''}`;
    }
  }
}

function flashPoints(text) {
  const card = document.querySelectorAll('.stats-row .stat-card')[2];
  if (!card) return;
  const flash = document.createElement('div');
  flash.className = 'points-flash';
  flash.textContent = text;
  card.appendChild(flash);
  setTimeout(() => flash.remove(), 1200);
}
async function delTask(id) {
  const t = state.tasks.find((x) => x.id === id);
  if (t) await cancelTaskPush(t);
  state.tasks = state.tasks.filter((t) => t.id !== id);
  save();
  renderScreen();
}
function addPoints(n) {
  state.stats.points = (state.stats.points || 0) + n;
  const today = todayISO();
  const hist = state.stats.pointsHistory || (state.stats.pointsHistory = []);
  const last = hist[hist.length - 1];
  if (last && last.date === today) last.pts = state.stats.points;
  else hist.push({ date: today, pts: state.stats.points });
  if (hist.length > 14) hist.shift();
  state.stats.tasksCompletedTotal = (state.stats.tasksCompletedTotal || 0) + (n >= 10 ? 1 : 0);
}
function bumpTasksHistory() {
  const today = todayISO();
  const done = tasksDone();
  const hist = state.stats.tasksHistory || (state.stats.tasksHistory = []);
  const last = hist[hist.length - 1];
  if (last && last.date === today) last.done = done;
  else hist.push({ date: today, done });
  if (hist.length > 14) hist.shift();
}

/* ===== MODAL ===== */
function closeModal() { $('#modalRoot').innerHTML = ''; }
function openModal(html) {
  $('#modalRoot').innerHTML = `<div class="modal-backdrop" data-close-modal>
    <div class="modal" onclick="event.stopPropagation()">${html}</div>
  </div>`;
}
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-close-modal]')) closeModal();
});

function openAddTaskModal(editId, defaultScope) {
  const editing = editId ? state.tasks.find((t) => t.id === editId) : null;
  const emojis = ['💪','📖','💼','🥗','📱','🎯','🧘','☕','🏃','💧','🧠','✏️','🌙','🚫','⏰','📝','🏋️','🩺','💰','🎓'];
  const cur = editing || { title: '', emoji: '🎯', time: '', date: todayISO(), scope: defaultScope || 'daily' };
  const scope = cur.scope || 'daily';
  openModal(`
    <h3>${editing ? 'Editează task' : (scope === 'daily' ? 'Task nou' : (scope === 'weekly' ? 'Task săptămânal' : 'Task lunar'))}</h3>
    <div class="fld"><label>Titlu</label><input id="mTitle" type="text" placeholder="ex: Antrenament dimineață" value="${esc(cur.title)}"/></div>
    <div class="fld"><label>Emoji</label>
      <div class="emoji-picker" id="mEmojis">
        ${emojis.map((e) => `<button type="button" data-emoji="${e}" class="${e === cur.emoji ? 'sel' : ''}">${e}</button>`).join('')}
      </div>
    </div>
    <div class="fld"><label>Scop</label>
      <div class="emoji-picker" id="mScopes">
        <button type="button" data-scope="daily"   class="${scope==='daily'?'sel':''}"   style="width:auto;padding:8px 14px;font-size:12px">📅 Zilnic</button>
        <button type="button" data-scope="weekly"  class="${scope==='weekly'?'sel':''}"  style="width:auto;padding:8px 14px;font-size:12px">🗓️ Săptămânal</button>
        <button type="button" data-scope="monthly" class="${scope==='monthly'?'sel':''}" style="width:auto;padding:8px 14px;font-size:12px">📆 Lunar</button>
      </div>
    </div>
    <div class="fld" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div><label>Ora</label><input id="mTime" type="time" value="${esc(cur.time || '08:00')}"/></div>
      <div><label>${scope === 'daily' ? 'Data' : 'Deadline'}</label><input id="mDate" type="date" value="${esc(cur.date || todayISO())}"/></div>
    </div>
    <div class="btn-row">
      ${editing ? `<button class="btn -danger" id="mDel">Șterge</button>` : ''}
      <button class="btn -ghost" data-close-modal>Anulează</button>
      <button class="btn -primary" id="mSave">${editing ? 'Salvează' : 'Adaugă'}</button>
    </div>
  `);
  let selEmoji = cur.emoji;
  let selScope = scope;
  $$('#mEmojis button').forEach((b) => b.addEventListener('click', () => {
    selEmoji = b.dataset.emoji;
    $$('#mEmojis button').forEach((x) => x.classList.toggle('sel', x === b));
  }));
  $$('#mScopes button').forEach((b) => b.addEventListener('click', () => {
    selScope = b.dataset.scope;
    $$('#mScopes button').forEach((x) => x.classList.toggle('sel', x === b));
  }));
  $('#mSave').addEventListener('click', async () => {
    const title = $('#mTitle').value.trim();
    if (!title) { toast('Adaugă un titlu.'); return; }
    const time = $('#mTime').value || '';
    const date = $('#mDate').value || todayISO();
    let target;
    if (editing) {
      target = editing;
      await cancelTaskPush(editing);
      editing.title = title; editing.emoji = selEmoji; editing.time = time; editing.date = date; editing.scope = selScope;
    } else {
      target = { id: uid(), title, emoji: selEmoji, date, time, done: false, chip: null, notifyId: null, scope: selScope };
      state.tasks.push(target);
    }
    save();
    if (!target.done && target.time) await scheduleTaskPush(target);
    closeModal();
    renderScreen();
    toast(editing ? 'Task actualizat.' : (selScope === 'daily' ? 'Task adăugat.' : 'Adăugat în plan.'));
  });
  if (editing) $('#mDel').addEventListener('click', async () => { await delTask(editing.id); closeModal(); toast('Task șters.'); });
}

function openAddHabitModal(editId) {
  const editing = editId ? state.habits.find((h) => h.id === editId) : null;
  const emojis = ['💧','🧘','📖','🌙','🚫','✏️','🧠','🏃','☕','🥗','😴','🎧','💪','🎯','⏰'];
  const cur = editing || { title: '', emoji: '💧', time: '' };
  openModal(`
    <h3>${editing ? 'Editează obicei' : 'Obicei nou'}</h3>
    <div class="fld"><label>Nume</label><input id="mTitle" type="text" placeholder="ex: Hidratare" value="${esc(cur.title)}"/></div>
    <div class="fld"><label>Emoji</label>
      <div class="emoji-picker" id="mEmojis">
        ${emojis.map((e) => `<button type="button" data-emoji="${e}" class="${e === cur.emoji ? 'sel' : ''}">${e}</button>`).join('')}
      </div>
    </div>
    <div class="fld"><label>Ora reamintirii (opțional)</label><input id="mTime" type="time" value="${esc(cur.time || '')}"/></div>
    <div class="btn-row">
      ${editing ? `<button class="btn -danger" id="mDel">Șterge</button>` : ''}
      <button class="btn -ghost" data-close-modal>Anulează</button>
      <button class="btn -primary" id="mSave">${editing ? 'Salvează' : 'Adaugă'}</button>
    </div>
  `);
  let selEmoji = cur.emoji;
  $$('#mEmojis button').forEach((b) => b.addEventListener('click', () => {
    selEmoji = b.dataset.emoji;
    $$('#mEmojis button').forEach((x) => x.classList.toggle('sel', x === b));
  }));
  $('#mSave').addEventListener('click', async () => {
    const title = $('#mTitle').value.trim();
    if (!title) { toast('Adaugă un nume.'); return; }
    const time = $('#mTime').value || '';
    let target;
    if (editing) {
      target = editing;
      await cancelHabitPush(editing);
      editing.title = title; editing.emoji = selEmoji; editing.time = time;
    } else {
      target = { id: uid(), title, emoji: selEmoji, time, done: false, doneDate: null, streak: 0, notifyId: null };
      state.habits.push(target);
    }
    save();
    if (target.time && !target.done) await scheduleHabitPush(target);
    closeModal(); renderScreen();
    toast(editing ? 'Obicei actualizat.' : 'Obicei adăugat.');
  });
  if (editing) $('#mDel').addEventListener('click', async () => {
    await cancelHabitPush(editing);
    state.habits = state.habits.filter((h) => h.id !== editing.id);
    save(); closeModal(); renderScreen(); toast('Obicei șters.');
  });
}

function openProtocolModal() {
  const m = sleepMinutes();
  openModal(`
    <h3>Protocol Sănătate</h3>
    <p style="color:var(--text-dim);font-size:13px;margin:0 0 14px">Câteva reguli simple, verificate.</p>
    <div class="fld" style="padding:12px;background:rgba(255,255,255,0.04);border-radius:12px">
      <b>Somn:</b> ${sleepLabel(m)} (țintă 7-9h)<br>
      <b>Hidratare:</b> ${state.health.water || 0} / ${state.health.waterGoal} ml<br>
      <b>Energie:</b> ${state.health.energy}%
    </div>
    <div class="btn-row">
      <button class="btn -ghost" data-close-modal>Închide</button>
      <button class="btn -primary" id="mEdit">Editează</button>
    </div>
  `);
  $('#mEdit').addEventListener('click', () => { closeModal(); openHealthEditModal(); });
}
function openHealthEditModal() {
  openModal(`
    <h3>Sănătate & odihnă</h3>
    <div class="fld"><label>Hidratare (ml azi)</label><input id="mW" type="number" value="${state.health.water || 0}"/></div>
    <div class="fld"><label>Țintă hidratare (ml)</label><input id="mWg" type="number" value="${state.health.waterGoal || 2500}"/></div>
    <div class="btn-row">
      <button class="btn -ghost" data-close-modal>Anulează</button>
      <button class="btn -primary" id="mSave">Salvează</button>
    </div>
  `);
  $('#mSave').addEventListener('click', () => {
    state.health.water = Number($('#mW').value) || 0;
    state.health.waterGoal = Number($('#mWg').value) || 2500;
    save(); closeModal(); renderScreen(); toast('Actualizat.');
  });
}

function openEnergyModal() {
  const e = computeEnergy();
  const t = tasksToday();
  const sq = Math.round(sleepQuality() * 100);
  const tp = t.length ? Math.round((t.filter((x) => x.done).length / t.length) * 100) : 0;
  const hp = state.habits.length ? Math.round((habitsDone() / state.habits.length) * 100) : 0;
  const bar = (label, value, color) => `
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>${label}</span><span style="color:${color};font-weight:700">${value}%</span></div>
      <div style="height:8px;background:rgba(255,255,255,0.06);border-radius:999px;overflow:hidden"><div style="height:100%;width:${value}%;background:${color};border-radius:999px;transition:width 700ms cubic-bezier(0.22,0.9,0.24,1)"></div></div>
    </div>`;
  openModal(`
    <h3>Energie — ${e}%</h3>
    <div style="font-size:12px;color:var(--text-dim);margin-bottom:14px">Auto-calculată din somn, task-uri și obiceiuri.</div>
    ${bar('🌙 Calitate somn (40%)', sq, '#a855f7')}
    ${bar('✅ Task-uri azi (30%)', tp, '#22c55e')}
    ${bar('🎯 Obiceiuri azi (30%)', hp, '#3b82f6')}
    <div style="padding:12px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:12px;color:var(--text-dim);margin-top:6px">
      Crește energia dormind 7-9h, bifând task-uri și menținând obiceiurile.
    </div>
    <div class="btn-row" style="margin-top:14px">
      <button class="btn -primary" data-close-modal>Am înțeles</button>
    </div>
  `);
}

async function openSleepModal() {
  const m = sleepMinutes();
  const arr = state.stats.sleepHistory || [];
  const avgMin = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : m;
  const hoursGood = m >= 420 && m <= 540;
  openModal(`
    <h3>Somn</h3>
    <div style="padding:14px;background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.25);border-radius:14px;margin-bottom:14px">
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px">
        <b style="font-size:24px;color:${hoursGood ? 'var(--green)' : 'var(--yellow)'}">${sleepLabel(m)}</b>
        <span style="font-size:11px;color:var(--text-dim)">Aseară</span>
      </div>
      <div style="font-size:12px;color:var(--text-dim)">${state.health.sleepFrom} → ${state.health.sleepTo} · ${hoursGood ? '✓ în interval optim' : '⚠ recomandat 7-9h'}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      <div class="pstat"><b>${sleepLabel(avgMin)}</b><span>Somn mediu</span></div>
      <div class="pstat"><b>${arr.length}</b><span>Zile înregistrate</span></div>
    </div>
    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:12px;margin-bottom:16px">
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:6px">Istoric somn (ultimele zile)</div>
      ${sparkline(getSeries('sleep', 20), 320, 60, '#a855f7')}
    </div>

    <h3 style="font-size:15px;margin:6px 0 10px">Ore culcare & trezire</h3>
    <div class="fld" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div><label>🌙 Culcare</label><input id="mSf" type="time" value="${esc(state.health.sleepFrom || '23:25')}"/></div>
      <div><label>☀️ Trezire</label><input id="mSt" type="time" value="${esc(state.health.sleepTo || '07:00')}"/></div>
    </div>

    <h3 style="font-size:15px;margin:14px 0 10px">Notificări push</h3>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
      <label style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:rgba(255,255,255,0.04);border-radius:12px;cursor:pointer">
        <span>🌙 Reamintește-mi să merg la culcare</span>
        <input type="checkbox" id="mBed" ${state.health.bedtimeNotify ? 'checked' : ''}/>
      </label>
      <label style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:rgba(255,255,255,0.04);border-radius:12px;cursor:pointer">
        <span>☀️ Reamintește-mi să mă trezesc</span>
        <input type="checkbox" id="mWake" ${state.health.wakeNotify ? 'checked' : ''}/>
      </label>
    </div>
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:14px">Vei primi push în fiecare zi la ora setată.${!state.push.enabled ? ' <b style="color:var(--yellow)">Push global inactiv</b> — activează-l din clopoțel.' : ''}</div>

    <div class="btn-row">
      <button class="btn -ghost" data-close-modal>Anulează</button>
      <button class="btn -primary" id="mSave">Salvează</button>
    </div>
  `);
  $('#mSave').addEventListener('click', async () => {
    state.health.sleepFrom = $('#mSf').value || state.health.sleepFrom;
    state.health.sleepTo = $('#mSt').value || state.health.sleepTo;
    state.health.bedtimeNotify = !!$('#mBed').checked;
    state.health.wakeNotify = !!$('#mWake').checked;
    save();
    await syncSleepPush();
    closeModal();
    renderScreen();
    toast('Setări somn actualizate.');
  });
}

async function syncSleepPush() {
  if (state.health.bedtimeNotifyId) { await cancelServerPush(state.health.bedtimeNotifyId); state.health.bedtimeNotifyId = null; }
  if (state.health.wakeNotifyId) { await cancelServerPush(state.health.wakeNotifyId); state.health.wakeNotifyId = null; }
  if (!state.push.enabled) { save(); return; }
  if (state.health.bedtimeNotify) {
    const id = await scheduleServerPush({ time: state.health.sleepFrom, date: '' }, '🌙 E timpul de somn', 'Închide ecranele și odihnește-te bine.');
    if (id) state.health.bedtimeNotifyId = id;
  }
  if (state.health.wakeNotify) {
    const id = await scheduleServerPush({ time: state.health.sleepTo, date: '' }, '☀️ Trezirea!', 'Bună dimineața. Începe puternic.');
    if (id) state.health.wakeNotifyId = id;
  }
  save();
}
function openProfileEditModal() {
  openModal(`
    <h3>Profil</h3>
    <div class="fld"><label>Nume</label><input id="mName" type="text" value="${esc(state.profile.name)}"/></div>
    <div class="fld"><label>Motto</label><textarea id="mMotto" rows="3">${esc(state.profile.motto)}</textarea></div>
    <div class="fld"><label>Poză (URL sau lasă avatarul default)</label><input id="mPhoto" type="text" value="${esc(state.profile.photo || 'assets/avatar.jpg')}"/></div>
    <div class="btn-row">
      <button class="btn -ghost" data-close-modal>Anulează</button>
      <button class="btn -primary" id="mSave">Salvează</button>
    </div>
  `);
  $('#mSave').addEventListener('click', () => {
    state.profile.name = $('#mName').value.trim() || state.profile.name;
    state.profile.motto = $('#mMotto').value.trim() || state.profile.motto;
    state.profile.photo = $('#mPhoto').value.trim() || 'assets/avatar.jpg';
    save(); closeModal(); renderScreen(); toast('Profil actualizat.');
  });
}

function openNotifModal() {
  const p = state.push;
  const status = !('Notification' in window) ? 'Browser-ul nu acceptă notificări.'
    : p.enabled ? '✓ Push activ. Vei primi notificări la ora fiecărui task/obicei.'
    : p.permission === 'denied' ? '✗ Blocat. Deschide setările browserului să activezi.'
    : 'Push încă neactivat. Apasă butonul de mai jos.';
  const btn = p.enabled
    ? `<button class="btn -ghost" id="mOff">Dezactivează</button>`
    : `<button class="btn -primary" id="mOn">Activează push</button>`;
  const list = state.notifications.slice(0, 10);
  openModal(`
    <h3>Notificări</h3>
    <div style="padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:13px;margin-bottom:14px">
      ${status}<br>
      <small style="color:var(--text-dim)">Server push: ${p.serverOk === true ? 'ok' : p.serverOk === false ? 'indisponibil (local doar)' : 'necunoscut'}</small>
    </div>
    <div class="btn-row" style="margin-bottom:14px">
      ${btn}
      <button class="btn -ghost" data-close-modal>Închide</button>
    </div>
    <div style="font-size:12px;color:var(--text-dim);margin-bottom:6px">Ultimele notificări</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${list.map((n) => `<div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px 12px;font-size:13px">
        <b>${esc(n.title)}</b><br>
        <span style="color:var(--text-dim);font-size:11px">${esc(n.body || '')}</span><br>
        <span style="color:var(--text-mute);font-size:10px">${new Date(n.date).toLocaleString('ro-RO')}</span>
      </div>`).join('') || '<div class="empty" style="padding:20px 0">Nicio notificare încă.</div>'}
    </div>
  `);
  $('#mOn')?.addEventListener('click', async () => { await enablePush(); closeModal(); renderScreen(); });
  $('#mOff')?.addEventListener('click', async () => {
    state.push.enabled = false; save();
    for (const t of state.tasks) await cancelTaskPush(t);
    for (const h of state.habits) await cancelHabitPush(h);
    toast('Push dezactivat.');
    closeModal(); renderScreen();
  });
}

function openStatsModal() {
  const arch = state.monthlyArchive || [];
  const monthLabel = (m) => {
    const [y, mo] = m.split('-').map(Number);
    return new Date(y, mo - 1, 1).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
  };
  openModal(`
    <h3>Statistici</h3>
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px">Luna curentă: ${monthLabel(state.lastMonthReset || currentMonth())}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0 16px">
      <div class="pstat"><b>${state.stats.tasksCompletedTotal || 0}</b><span>Task-uri luna asta</span></div>
      <div class="pstat"><b>${streakDays()}</b><span>Zile serie</span></div>
      <div class="pstat"><b>${pointsTotal()}</b><span>Puncte</span></div>
      <div class="pstat"><b>${state.habits.length}</b><span>Obiceiuri</span></div>
      <div class="pstat"><b>${state.usage.longestStreak || 0}</b><span>Cea mai lungă serie</span></div>
      <div class="pstat"><b>${(state.usage.dates || []).length}</b><span>Zile active</span></div>
    </div>
    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:12px;margin-bottom:12px">
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:6px">Puncte în timp</div>
      ${sparkline(getSeries('points', 20), 320, 60, '#a855f7')}
    </div>
    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:12px;margin-bottom:12px">
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:6px">Task-uri făcute / zi</div>
      ${sparkline(getSeries('tasks', 20), 320, 60, '#22c55e')}
    </div>
    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:12px;margin-bottom:12px">
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:6px">Somn</div>
      ${sparkline(getSeries('sleep', 20), 320, 60, '#3b82f6')}
    </div>
    ${arch.length ? `<h3 style="margin:18px 0 10px;font-size:15px">Luni anterioare</h3>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${arch.map((a) => `
        <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:12px">
          <div style="font-weight:700;text-transform:capitalize;margin-bottom:6px">${esc(monthLabel(a.month))}</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:12px">
            <div><b style="font-size:15px">${a.tasksCompleted}</b><br><span style="color:var(--text-dim)">Task-uri</span></div>
            <div><b style="font-size:15px">${a.points}</b><br><span style="color:var(--text-dim)">Puncte</span></div>
            <div><b style="font-size:15px">${a.activeDays}</b><br><span style="color:var(--text-dim)">Zile active</span></div>
            <div><b style="font-size:15px">${a.longestStreak}</b><br><span style="color:var(--text-dim)">Serie max</span></div>
            <div><b style="font-size:15px">${a.avgSleep ? sleepLabel(a.avgSleep) : '—'}</b><br><span style="color:var(--text-dim)">Somn mediu</span></div>
            <div><b style="font-size:15px">${a.avgEnergy || '—'}${a.avgEnergy ? '%' : ''}</b><br><span style="color:var(--text-dim)">Energie</span></div>
          </div>
        </div>
      `).join('')}
    </div>` : ''}
    <div class="btn-row" style="margin-top:14px"><button class="btn -primary" data-close-modal>Închide</button></div>
  `);
}

function openNotesModal() {
  const list = (state.notes || []).slice(-10).reverse();
  openModal(`
    <h3>Note rapide</h3>
    <div class="fld"><textarea id="mNote" rows="3" placeholder="Scrie o notă rapidă..."></textarea></div>
    <div class="btn-row">
      <button class="btn -ghost" data-close-modal>Închide</button>
      <button class="btn -primary" id="mSave">Adaugă</button>
    </div>
    <div style="margin-top:16px;display:flex;flex-direction:column;gap:8px">
      ${list.map((n) => `<div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px 12px;font-size:13px">${esc(n.text)}<div style="font-size:10px;color:var(--text-dim);margin-top:2px">${esc(n.date)}</div></div>`).join('') || '<div class="empty">Nicio notă încă.</div>'}
    </div>
  `);
  $('#mSave').addEventListener('click', () => {
    const text = $('#mNote').value.trim();
    if (!text) return;
    state.notes.push({ id: uid(), text, date: todayISO() });
    save(); closeModal(); toast('Notă adăugată.');
  });
}

function openCalendarModal() {
  const days = [];
  const start = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    days.push({
      iso,
      label: d.toLocaleDateString('ro-RO', { weekday: 'short', day: '2-digit', month: 'short' }),
      tasks: state.tasks.filter((t) => t.date === iso).sort((a, b) => (a.time || '').localeCompare(b.time || '')),
    });
  }
  openModal(`
    <h3>Calendar — următoarele 7 zile</h3>
    <div style="display:flex;flex-direction:column;gap:12px;max-height:60vh;overflow-y:auto;padding-right:4px">
      ${days.map((d) => `
        <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:12px">
          <div style="font-weight:700;font-size:13px;margin-bottom:8px;text-transform:capitalize">${esc(d.label)}${d.iso === todayISO() ? ' <span style="color:var(--blue);font-weight:600">· azi</span>' : ''}</div>
          ${d.tasks.length ? d.tasks.map((t) => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--line);font-size:13px">
              <span style="width:14px;height:14px;border-radius:50%;background:${t.done ? 'var(--green)' : 'rgba(255,255,255,0.1)'};flex-shrink:0"></span>
              <span style="flex:1;${t.done ? 'color:var(--text-mute);text-decoration:line-through' : ''}">${esc(t.title)} ${esc(t.emoji || '')}</span>
              <span style="font-size:11px;color:var(--text-dim)">${esc(t.time || '')}</span>
            </div>
          `).join('') : '<div style="font-size:12px;color:var(--text-dim);padding:4px 0">— nimic planificat —</div>'}
        </div>
      `).join('')}
    </div>
    <div class="btn-row" style="margin-top:14px">
      <button class="btn -ghost" data-close-modal>Închide</button>
      <button class="btn -primary" data-act="openAddTask">${IC.plus} Task nou</button>
    </div>
  `);
}

function openPlanModal() {
  openModal(`
    <h3>Planifică ziua</h3>
    <p style="color:var(--text-dim);font-size:13px">Alege un template rapid și îți adaug task-urile.</p>
    <div style="display:grid;gap:10px;margin:12px 0">
      <button class="btn -ghost" id="tpl1" style="text-align:left;padding:14px">🌅 Dimineață focus (Antrenament, Citit, Deep work)</button>
      <button class="btn -ghost" id="tpl2" style="text-align:left;padding:14px">💼 Zi de lucru completă (5 task-uri)</button>
      <button class="btn -ghost" id="tpl3" style="text-align:left;padding:14px">🧘 Zi liniștită (Meditație, plimbare, jurnal)</button>
    </div>
    <div class="btn-row"><button class="btn -ghost" data-close-modal>Anulează</button></div>
  `);
  const tpls = {
    tpl1: [
      { title: 'Antrenament dimineață', emoji: '💪', time: '07:00' },
      { title: 'Citit 20 pagini', emoji: '📖', time: '08:30' },
      { title: 'Deep work', emoji: '💼', time: '10:00' },
    ],
    tpl2: SEED_TASKS.map((t) => ({ ...t, done: false })),
    tpl3: [
      { title: 'Meditație', emoji: '🧘', time: '08:00' },
      { title: 'Plimbare 30min', emoji: '🚶', time: '11:00' },
      { title: 'Jurnal seara', emoji: '✏️', time: '21:00' },
    ],
  };
  ['tpl1', 'tpl2', 'tpl3'].forEach((k) => $('#' + k).addEventListener('click', async () => {
    const today = todayISO();
    const added = tpls[k].map((t) => {
      const task = { id: uid(), title: t.title, emoji: t.emoji, date: today, time: t.time, done: false, chip: null, notifyId: null };
      state.tasks.push(task);
      return task;
    });
    save();
    for (const t of added) await scheduleTaskPush(t);
    closeModal(); renderScreen(); toast('Zi planificată.');
  }));
}

async function testPushNow() {
  const perm = await requestNotificationPermission();
  if (perm !== 'granted') { toast('Permisiune necesară.'); return; }
  state.push.permission = perm; state.push.enabled = true; save();
  await fireLocalNotif('🐉 Test Dragon Life', 'Push local funcționează!', 'test', 'test');
}

/* ===== CLICK ROUTER ===== */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const id = el.dataset.id;
  switch (act) {
    case 'toggleTask':   e.stopPropagation(); toggleTask(id); break;
    case 'toggleHabit':  e.stopPropagation(); toggleHabit(id); break;
    case 'editTask':     e.stopPropagation(); openAddTaskModal(id); break;
    case 'editHabit':    e.stopPropagation(); openAddHabitModal(id); break;
    case 'delTask':      e.stopPropagation(); delTask(id); break;
    case 'goTasks':      switchTab('tasks'); break;
    case 'goHabits':     switchTab('habits'); break;
    case 'openAddTask':  openAddTaskModal(); break;
    case 'openAddLong':  openAddTaskModal(null, 'weekly'); break;
    case 'openAddHabit': openAddHabitModal(); break;
    case 'openProtocol': openProtocolModal(); break;
    case 'openSleep':    openSleepModal(); break;
    case 'openEnergy':   openEnergyModal(); break;
    case 'editProfile':  openProfileEditModal(); break;
    case 'notif':        openNotifModal(); break;
    case 'stats':        openStatsModal(); break;
    case 'notes':        openNotesModal(); break;
    case 'planZi':       openPlanModal(); break;
    case 'calendar':     openCalendarModal(); break;
    case 'nextQuote':    state.quoteIndex = (state.quoteIndex + 1) % QUOTES.length; save(); renderScreen(); break;
    case 'togglePush':   openNotifModal(); break;
    case 'testPush':     testPushNow(); break;
    case 'resetData':
      if (confirm('Sigur resetezi TOATE datele? Nu se poate anula.')) {
        localStorage.removeItem(KEY);
        location.reload();
      }
      break;
  }
});
document.addEventListener('click', (e) => {
  if (e.target.closest('#fabBtn')) {
    if (state.currentTab === 'habits') openAddHabitModal();
    else openAddTaskModal();
  }
});

/* ===== INIT ===== */
load();
ensureMonthlyReset();
ensureTasksDay();
ensureHabitsDay();
updateUsageStreak();
renderScreen();
checkServerPush().catch(() => {});
if (state.push.enabled && Notification.permission === 'granted') {
  waitForOneSignal().then((OS) => {
    if (OS) OS.login(state.profile.userId).catch(() => {});
  });
}
setInterval(localNotifTick, 30_000);
setTimeout(localNotifTick, 5000);

function updateUsageStreak() {
  const today = todayISO();
  if (!state.usage.dates.includes(today)) {
    state.usage.dates.push(today);
    if (state.usage.dates.length > 365) state.usage.dates.shift();
  }
  const sorted = [...state.usage.dates].sort();
  let streak = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    const diff = (new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000;
    if (diff === 1) streak++; else break;
  }
  state.usage.currentStreak = streak;
  if (streak > (state.usage.longestStreak || 0)) state.usage.longestStreak = streak;
  state.stats.streak = streak;
  save();
}
