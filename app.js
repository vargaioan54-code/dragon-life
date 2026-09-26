/* Dragon Life — wellness app (single-file).
   Structure: helpers → state → charts → router → views → modals → actions → init. */
(() => {
'use strict';

// ─── helpers ────────────────────────────────────────────────────────────────
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const pad2 = (n) => String(n).padStart(2, '0');
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
const isoOffset = (n, base) => { const d = base ? new Date(base) : new Date(); d.setDate(d.getDate()+n); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
const parseISO = (s) => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const dayName = (dt, short=true) => ['Duminică','Luni','Marți','Miercuri','Joi','Vineri','Sâmbătă'][dt.getDay()].slice(0, short ? 1 : 99);
const monthName = (dt) => ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'][dt.getMonth()];
const fmtDur = (min) => { if (min == null) return '—'; const h = Math.floor(min/60), m = Math.round(min%60); return h ? `${h}h ${m}m` : `${m}m`; };
const fmtDate = (iso) => { const d = parseISO(iso); return `${d.getDate()} ${monthName(d).slice(0,3)}`; };
const fmtDateFull = (iso) => { const d = parseISO(iso); return `${d.getDate()} ${monthName(d)} ${d.getFullYear()}`; };
const min = (a, b) => a < b ? a : b;
const max = (a, b) => a > b ? a : b;
const sum = (arr) => arr.reduce((a,b) => a + (b||0), 0);
const avg = (arr) => arr.length ? sum(arr) / arr.length : 0;

// ─── state ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'dragon_life_v1';

const DEFAULT_ROUTINE_ITEMS = []; // empty — user builds their own

const DEFAULT_HABITS = []; // empty — user builds their own

const DEFAULT_RELAX = []; // empty — user adds their own exercises

const DEFAULT_STATE = {
  goals: { steps: 10000, water_ml: 2500, sleep_hours: 8, kcal: 2200, protein: 150, carbs: 270, fat: 70, stress_max: 50 },
  prefs: { notifications: true, morning_reminder: '07:30', sleep_reminder: '22:30' },
  routine_items: [],
  habits: [],
  relax_items: [],
  custom_cards: [],         // user-built Dashboard cards
  entries: {},              // { isoDate: { sleep, mood, nutrition, activity, routine, journal, habits_done } }
  meta: { last_seen: todayISO(), streak_days: 1, created_at: todayISO() },
  notifs: [],
};

let state = null;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    // shallow merge with defaults so new fields appear on old saves
    const merged = { ...structuredClone(DEFAULT_STATE), ...parsed };
    merged.goals = { ...DEFAULT_STATE.goals, ...(parsed.goals || {}) };
    merged.prefs = { ...DEFAULT_STATE.prefs, ...(parsed.prefs || {}) };
    delete merged.user;
    if (!merged.routine_items) merged.routine_items = [];
    merged.routine_items.forEach(it => { if (!it.slot) it.slot = 'morning'; });
    if (!merged.habits) merged.habits = [];
    if (!merged.relax_items) merged.relax_items = [];
    if (!merged.entries) merged.entries = {};
    if (!merged.notifs) merged.notifs = [];
    if (!merged.custom_cards) merged.custom_cards = [];
    return merged;
  } catch (e) { return structuredClone(DEFAULT_STATE); }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function reset() { state = structuredClone(DEFAULT_STATE); seedDemoHistory(); save(); }

function getEntry(iso) {
  if (!state.entries[iso]) state.entries[iso] = { sleep: null, mood: null, nutrition: null, activity: null, routine: null, journal: [], habits_done: [] };
  const e = state.entries[iso];
  if (!e.journal) e.journal = [];
  if (!e.habits_done) e.habits_done = [];
  return e;
}
function todayEntry() { return getEntry(todayISO()); }

function seedDemoHistory() {
  // pre-fill the last 14 days with reasonable variance so charts have data on first load
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
    const e = getEntry(iso);
    // sleep
    const total = 420 + Math.round((Math.sin(i * 0.7) + Math.random() * 0.5) * 40);
    const deep = Math.round(total * (0.24 + Math.random() * 0.08));
    const rem  = Math.round(total * (0.18 + Math.random() * 0.06));
    const light = total - deep - rem - 10;
    e.sleep = { total_min: total, deep_min: deep, light_min: light, rem_min: rem, awakenings: 1 + Math.round(Math.random() * 3), bedtime: '23:00', wakeup: '06:45' };
    // mood
    e.mood = { rating: 2 + Math.round(Math.random() * 2), energy: 55 + Math.round(Math.random() * 30), stress: 20 + Math.round(Math.random() * 40), note: '' };
    // nutrition
    e.nutrition = { meals: [], water_ml: 1200 + Math.round(Math.random() * 1300), totals: { kcal: 1500 + Math.round(Math.random() * 700), protein: 90 + Math.round(Math.random() * 60), carbs: 150 + Math.round(Math.random() * 80), fat: 40 + Math.round(Math.random() * 25) } };
    // activity
    const hourly = Array.from({length:24}, (_, h) => {
      if (h < 6 || h > 22) return 0;
      return Math.round(200 + Math.random() * 900 * (h > 8 && h < 20 ? 1 : 0.4));
    });
    const steps = sum(hourly);
    e.activity = { steps, distance_km: +(steps / 1350).toFixed(1), calories: Math.round(steps * 0.045), active_min: 60 + Math.round(Math.random() * 60), hourly, workouts: [] };
    // routine — mark most items complete on past days
    e.routine = { completed: DEFAULT_ROUTINE_ITEMS.filter(() => Math.random() > 0.15).map(x => x.id) };
    // habits — most habits done most days
    e.habits_done = DEFAULT_HABITS.filter(() => Math.random() > 0.18).map(h => h.id);
  }
  // today: partial to show progress
  const today = todayEntry();
  today.routine.completed = ['r1', 'r2'];
  today.habits_done = ['h1', 'h4'];
  today.mood = { rating: 3, energy: 76, stress: 35, note: 'Zi productivă, mă simt motivat și calm.' };
  today.nutrition.totals = { kcal: 1680, protein: 112, carbs: 180, fat: 56 };
  today.nutrition.water_ml = 1800;
  today.nutrition.meals = [];
  today.activity = { steps: 8432, distance_km: 6.2, calories: 412, active_min: 95, hourly: today.activity.hourly, workouts: [] };
  today.sleep = { total_min: 445, deep_min: 135, light_min: 260, rem_min: 55, awakenings: 2, bedtime: '23:00', wakeup: '06:45' };
}

// ─── derived metrics ────────────────────────────────────────────────────────
function scoreBalance(iso = todayISO()) {
  const e = getEntry(iso);
  const parts = [];
  if (e.sleep) parts.push(clamp(e.sleep.total_min / (state.goals.sleep_hours * 60), 0, 1.1) * 100);
  if (e.mood) {
    parts.push(e.mood.energy);
    parts.push(clamp(100 - e.mood.stress, 0, 100));
    parts.push((e.mood.rating / 4) * 100);
  }
  if (e.activity) parts.push(clamp(e.activity.steps / state.goals.steps, 0, 1.1) * 100);
  if (e.routine) parts.push((e.routine.completed.length / state.routine_items.length) * 100);
  const activeHabits = state.habits.filter(h => !h.archived).length;
  if (activeHabits) parts.push((e.habits_done.length / activeHabits) * 100);
  return parts.length ? Math.round(avg(parts)) : 0;
}
function balanceLabel(score) {
  if (score >= 85) return { label: 'Excelent', hint: 'Ai grijă de tine cu adevărat.' };
  if (score >= 70) return { label: 'Foarte bine', hint: 'Ține-o tot așa!' };
  if (score >= 55) return { label: 'Bine', hint: 'Ai spațiu de crescut.' };
  if (score >= 40) return { label: 'Moderat', hint: 'Fă câteva ajustări azi.' };
  return { label: 'Începe azi', hint: 'Chiar și un pas mic contează.' };
}
function sleepQualityLabel(e) {
  if (!e || !e.sleep) return { label: '—', tone: 'muted' };
  const h = e.sleep.total_min / 60;
  if (h >= 7.5) return { label: 'Bună', tone: 'green' };
  if (h >= 6.5) return { label: 'Ok',   tone: 'amber' };
  return          { label: 'Slabă', tone: 'red' };
}
function moodLabel(rating) { return ['Foarte rău','Rău','Neutru','Bine','Excelent'][rating] || 'Neutru'; }
function moodEmoji(rating) { return ['😞','☹️','😐','🙂','😃'][rating] || '😐'; }
function moodColor(rating) { return ['red','amber','','green','green'][rating] || ''; }

function streakForHabit(h) {
  let count = 0;
  for (let i = 0; i < 365; i++) {
    const iso = isoOffset(-i);
    const e = state.entries[iso];
    if (!e || !e.habits_done || !e.habits_done.includes(h.id)) break;
    count++;
  }
  return count;
}

function lastNDays(n) {
  return Array.from({length: n}, (_, i) => isoOffset(-(n - 1 - i)));
}

function series(field, n = 14) {
  return lastNDays(n).map(iso => {
    const e = state.entries[iso];
    if (!e) return 0;
    if (field === 'sleep')    return e.sleep ? +(e.sleep.total_min / 60).toFixed(1) : 0;
    if (field === 'steps')    return e.activity ? e.activity.steps : 0;
    if (field === 'stress')   return e.mood ? e.mood.stress : 0;
    if (field === 'energy')   return e.mood ? e.mood.energy : 0;
    if (field === 'mood')     return e.mood ? (e.mood.rating / 4) * 100 : 0;
    if (field === 'water')    return e.nutrition ? Math.round((e.nutrition.water_ml || 0) / 100) / 10 : 0;
    if (field === 'balance')  return scoreBalance(iso);
    return 0;
  });
}

// ─── chart primitives (SVG) ─────────────────────────────────────────────────
function ringSVG(pct, size = 100, stroke = 10, colorClass = '') {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - clamp(pct, 0, 1));
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle class="ring-track" cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke-width="${stroke}"/>
    <circle class="ring-fill ${colorClass}" cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke-width="${stroke}"
      stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"
      transform="rotate(-90 ${size/2} ${size/2})"/>
  </svg>`;
}
function ringBlock({ pct, size = 130, stroke = 12, colorClass = '', center = '' }) {
  return `<div class="ring" style="width:${size}px;height:${size}px;">
    ${ringSVG(pct, size, stroke, colorClass)}
    <div class="ring-center">${center}</div>
  </div>`;
}
function sparklineSVG(vals, { w = 320, h = 90, stroke = '#22c55e', fill = 'rgba(34,197,94,.15)', showDots = false } = {}) {
  if (!vals.length) return `<svg viewBox="0 0 ${w} ${h}"></svg>`;
  const lo = min(0, Math.min(...vals));
  const hi = Math.max(...vals, 1);
  const rng = hi - lo || 1;
  const stepX = w / (vals.length - 1 || 1);
  const pts = vals.map((v, i) => {
    const x = i * stepX;
    const y = h - ((v - lo) / rng) * (h - 10) - 5;
    return [x, y];
  });
  const pathD = pts.map(([x,y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const fillD = `${pathD} L${w},${h} L0,${h} Z`;
  const dots = showDots ? pts.map(([x,y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${stroke}"/>`).join('') : '';
  return `<svg class="linechart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <path d="${fillD}" fill="${fill}" stroke="none"/>
    <path d="${pathD}" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}
  </svg>`;
}
function barsSVG(vals, { color = '#22c55e' } = {}) {
  const hi = Math.max(...vals, 1);
  const bars = vals.map(v => {
    const h = clamp((v / hi) * 100, 3, 100);
    return `<div class="b" style="height:${h.toFixed(0)}%;background:${color}"></div>`;
  }).join('');
  return `<div class="bars">${bars}</div>
    <div class="bars-x">${vals.map((_, i) => `<span>${pad2(i)}</span>`).join('')}</div>`;
}
function donutMultiSVG(segments, size = 130, stroke = 14) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = sum(segments.map(s => s.value)) || 1;
  let offset = 0;
  const parts = segments.map(s => {
    const frac = s.value / total;
    const len = c * frac;
    const seg = `<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${stroke}"
      stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}"
      stroke-dashoffset="${(-offset).toFixed(2)}"
      transform="rotate(-90 ${size/2} ${size/2})"/>`;
    offset += len;
    return seg;
  }).join('');
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--border-2)" stroke-width="${stroke}"/>
    ${parts}
  </svg>`;
}

// ─── icons (tiny inline SVG) ────────────────────────────────────────────────
const ICONS = {
  droplet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/></svg>`,
  wind:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 11h18"/></svg>`,
  sun:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></svg>`,
  move:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3 4 14h7l-1 7 9-11h-7z"/></svg>`,
  list:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>`,
  moon:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`,
  energy:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>`,
  smile:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/></svg>`,
  activity:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>`,
  plus:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
  check:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>`,
  arrow:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>`,
  back:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>`,
  close:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  edit:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`,
  trash:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`,
  play:    `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4v16l14-8z"/></svg>`,
  pause:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>`,
  search:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`,
  archive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18v4H3zM4 10h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM10 14h4"/></svg>`,
  heart:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>`,
  bolt:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>`,
  bell:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>`,
  user:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>`,
  shield:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/></svg>`,
  device:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M11 18h2"/></svg>`,
  target:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>`,
  download:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13M6 12l6 6 6-6M4 21h16"/></svg>`,
  info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>`,
  more:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>`,
  water:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/></svg>`,
  meal:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v16M4 4c4 0 6 3 6 6s-2 4-6 4"/><path d="M15 3v18M18 3v5a3 3 0 0 1-3 3"/></svg>`,
  book:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/></svg>`,
};

// ─── router ─────────────────────────────────────────────────────────────────
const SLOT_TITLES = {
  morning: { title: 'Rutina de dimineață', hint: 'Începe ziua cu calm și intenție', hours: '8–12', range: [8, 12], color: 'amber' },
  noon:    { title: 'Rutina de amiază',    hint: 'Păstrează focus și energie',    hours: '12–17', range: [12, 17], color: 'green' },
  evening: { title: 'Rutina de seară',     hint: 'Încheie ziua ușor și calm',   hours: '17–22', range: [17, 22], color: 'purple' },
};
function currentSlot() {
  const h = new Date().getHours();
  if (h >= 17 && h < 22) return 'evening';
  if (h >= 12 && h < 17) return 'noon';
  return 'morning';
}

const VIEW_TITLES = {
  dashboard: 'Dashboard',
  routine: 'Rutina de dimineață',
  routine_noon: 'Rutina de amiază',
  routine_evening: 'Rutina de seară',
  sleep: 'Somn',
  mood: 'Stare zilnică',
  nutrition: 'Nutriție',
  activity: 'Activitate',
  journal: 'Jurnal',
  habits: 'Obiceiuri',
  progress: 'Progres',
  relax: 'Relaxare',
  stats: 'Statistici',
  settings: 'Setări',
  more: 'Mai mult',
};

const VIEWS = {}; // filled below

let currentView = 'dashboard';
let viewState = {};   // per-view ephemeral state (tab selection etc)

function go(view) {
  if (!VIEWS[view]) view = 'dashboard';
  currentView = view;
  viewState = viewState[view] || {};
  location.hash = view;
  render();
}
function render() {
  const view = currentView;
  const html = VIEWS[view] ? VIEWS[view]() : '<p>Necunoscut.</p>';
  const screen = $('#screen');
  screen.innerHTML = html;
  screen.scrollTop = 0;
  window.scrollTo(0, 0);
  $('#topTitle').textContent = VIEW_TITLES[view] || 'Dragon Life';
  $$('.side-item, .nav-btn').forEach(el => el.classList.toggle('is-active', el.dataset.view === view));
  wireViewActions();
}

// ─── modal / toast ──────────────────────────────────────────────────────────
function openModal(html, { center = false } = {}) {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="modal-backdrop ${center ? 'center' : ''}" id="modalBackdrop">
    <div class="modal ${center ? 'centered' : ''}" id="modalBox">${html}</div>
  </div>`;
  const bd = $('#modalBackdrop');
  bd.addEventListener('click', (e) => { if (e.target === bd) closeModal(); });
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  $('#modalRoot').innerHTML = '';
  document.body.style.overflow = '';
}
function toast(msg) {
  const root = $('#toastRoot');
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 1500);
  setTimeout(() => el.remove(), 2000);
}
function confirmDialog(msg, onYes) {
  openModal(`
    <div class="modal-head"><h3>Confirmare</h3>
      <button class="modal-close" onclick="DL.close()">${ICONS.close}</button>
    </div>
    <p>${esc(msg)}</p>
    <div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px">
      <button class="btn ghost" onclick="DL.close()">Anulează</button>
      <button class="btn danger" id="cfmYes">Confirm</button>
    </div>`, { center: true });
  $('#cfmYes').onclick = () => { closeModal(); onYes && onYes(); };
}
function notify(title, body) {
  state.notifs.unshift({ id: uid(), title, body, ts: Date.now() });
  if (state.notifs.length > 25) state.notifs.length = 25;
  const dot = $('#bellDot'); if (dot) dot.hidden = false;
  save();
}

// ─── views ──────────────────────────────────────────────────────────────────

// —— Dashboard ——
VIEWS.dashboard = function() {
  const iso = todayISO();
  const e = getEntry(iso);
  const bal = scoreBalance();
  const balMsg = balanceLabel(bal);
  const sq = sleepQualityLabel(e);
  const routineDone = e.routine ? e.routine.completed.length : 0;
  const routineTotal = state.routine_items.length;
  const routinePct = routineTotal ? routineDone / routineTotal : 0;
  const activeHabits = state.habits.filter(h => !h.archived).length;
  const habitsPct = activeHabits ? e.habits_done.length / activeHabits : 0;
  const sleepH = e.sleep ? fmtDur(e.sleep.total_min) : '—';
  const energy = e.mood ? e.mood.energy : 0;
  const moodTxt = e.mood ? moodLabel(e.mood.rating) : '—';
  const steps  = e.activity ? e.activity.steps.toLocaleString('ro-RO') : '0';
  const kcal   = e.nutrition && e.nutrition.totals ? e.nutrition.totals.kcal : 0;
  const hr = new Date().getHours();
  const greet = hr < 5 ? 'Noapte liniștită' : hr < 12 ? 'Bună dimineața' : hr < 18 ? 'Bună ziua' : 'Bună seara';
  const isEmpty = !state.routine_items.length && !state.habits.length && !e.sleep && !e.mood && !e.nutrition && !e.activity && !state.custom_cards.length;

  return `
  <h1>${greet}! 👋</h1>
  <p class="subtitle">${isEmpty ? 'Personalizează app-ul după tine. Adaugă orice secțiune cu +' : 'Ai grijă de tine, în fiecare zi.'}</p>

  <div class="balance-hero mt-14">
    <div class="ring" style="width:88px;height:88px">
      ${ringSVG(bal / 100, 88, 9)}
      <div class="ring-center"><div class="v">${bal}</div></div>
    </div>
    <div class="balance-txt">
      <div class="l" style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">Scor de echilibru</div>
      <div class="t">${balMsg.label}</div>
      <div class="s">${balMsg.hint}</div>
    </div>
  </div>

  <div class="grid-2 mt-14">
    <div class="metric card tap" data-view="sleep">
      <div class="row"><div class="m-icon blue">${ICONS.moon}</div><div class="chip ${sq.tone}">${sq.label}</div></div>
      <div class="m-label">Somn</div>
      <div class="m-value">${sleepH}</div>
      <div class="m-sub">Calitate ${sq.label.toLowerCase()}</div>
    </div>
    <div class="metric card tap" data-view="mood">
      <div class="row"><div class="m-icon amber">${ICONS.bolt}</div><div class="chip amber">${energy}%</div></div>
      <div class="m-label">Energie</div>
      <div class="m-value">${energy}%</div>
      <div class="m-sub">Ridicată</div>
    </div>
    <div class="metric card tap" data-view="mood">
      <div class="row"><div class="m-icon green">${ICONS.smile}</div><div class="chip green">${moodTxt}</div></div>
      <div class="m-label">Stare</div>
      <div class="m-value">${moodTxt}</div>
      <div class="m-sub">Stabilă</div>
    </div>
    <div class="metric card tap" data-view="activity">
      <div class="row"><div class="m-icon purple">${ICONS.activity}</div><div class="chip purple">${steps}</div></div>
      <div class="m-label">Activitate</div>
      <div class="m-value">${steps}</div>
      <div class="m-sub">pași</div>
    </div>
  </div>

  <div class="section-title"><h2>Rutinele zilei</h2><span class="chip green">${currentSlot() === 'morning' ? 'Dimineață' : currentSlot() === 'noon' ? 'Amiază' : 'Seară'}</span></div>
  ${['morning', 'noon', 'evening'].map(slot => {
    const meta = SLOT_TITLES[slot];
    const items = state.routine_items.filter(it => it.slot === slot);
    const done  = items.filter(it => e.routine && e.routine.completed.includes(it.id)).length;
    const p     = items.length ? done / items.length : 0;
    const view  = slot === 'morning' ? 'routine' : `routine_${slot}`;
    const iconName = slot === 'morning' ? 'sun' : slot === 'noon' ? 'bolt' : 'moon';
    const isNow = currentSlot() === slot;
    return `<div class="card tap" data-view="${view}" style="${isNow ? 'border-color:var(--green)' : ''}">
      <div class="row" style="gap:12px">
        <div class="m-icon ${meta.color}">${ICONS[iconName]}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:14px">${esc(meta.title)} <span class="chip" style="margin-left:6px">${meta.hours}</span></div>
          <div class="subtitle">${done}/${items.length} pași completați</div>
        </div>
        <div class="chip ${meta.color}">${Math.round(p * 100)}%</div>
      </div>
      <div class="pbar ${meta.color} mt-10"><i style="width:${(p*100).toFixed(0)}%"></i></div>
    </div>`;
  }).join('')}

  <div class="card">
    <div class="card-head"><h3>Progres obiceiuri</h3><span class="chip">${e.habits_done.length}/${activeHabits}</span></div>
    <div class="pbar amber"><i style="width:${(habitsPct*100).toFixed(0)}%"></i></div>
    <div class="subtitle mt-6">${Math.round(habitsPct * 100)}% din obiceiurile active</div>
  </div>

  <div class="section-title"><h2>Cardurile mele</h2><button class="link" data-action="add-card">+ adaugă</button></div>
  ${state.custom_cards.length ? state.custom_cards.map(c => `
    <div class="card tap" ${c.link ? `data-view="${c.link}"` : `data-action="open-card" data-id="${c.id}"`}>
      <div class="row" style="gap:12px">
        <div class="m-icon ${c.color || 'green'}">${ICONS[c.icon] || ICONS.plus}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:14px">${esc(c.title)}</div>
          ${c.subtitle ? `<div class="subtitle">${esc(c.subtitle)}</div>` : ''}
        </div>
        <button class="h-action" data-action="edit-card" data-id="${c.id}" onclick="event.stopPropagation()">${ICONS.edit}</button>
        <button class="h-action" data-action="del-card" data-id="${c.id}" onclick="event.stopPropagation()">${ICONS.trash}</button>
      </div>
      ${c.note ? `<div class="subtitle mt-6" style="white-space:pre-line">${esc(c.note)}</div>` : ''}
    </div>
  `).join('') : `
    <div class="empty">
      <div class="em-emoji">➕</div>
      <div class="em-title">Niciun card personal</div>
      <div class="em-hint">Apasă + adaugă pentru a-ți construi propriile scurtături.</div>
    </div>
  `}

  ${Object.keys(state.entries).length > 0 ? `
  <div class="section-title"><h2>Ultimele 7 zile</h2><button class="link" data-view="progress">Progres complet</button></div>
  <div class="card">
    <div class="spread"><div class="subtitle">Scor de echilibru</div><div class="chip green">${bal}</div></div>
    ${sparklineSVG(series('balance', 7))}
  </div>
  ` : ''}
  `;
};

// —— Rutinele (dimineață / amiază / seară) ——
function routineViewForSlot(slot) {
  return function() {
    const meta = SLOT_TITLES[slot];
    const e = todayEntry();
    const done = e.routine ? e.routine.completed : [];
    const items = state.routine_items.filter(it => it.slot === slot);
    const doneHere = items.filter(it => done.includes(it.id)).length;
    const pct = items.length ? doneHere / items.length : 0;
    return `
    <div class="row" style="gap:10px;margin-bottom:6px">
      <button class="icon-btn" data-action="back">${ICONS.back}</button>
      <div style="flex:1;text-align:center"><div style="font-size:11px;color:var(--text-dim)">${esc(meta.hint)} · ${meta.hours}</div></div>
      <button class="icon-btn" data-action="add-routine" data-slot="${slot}" aria-label="Adaugă">${ICONS.plus}</button>
    </div>

    ${items.length ? `<div class="card">${items.map(it => routineRow(it, done.includes(it.id))).join('')}</div>` : `
      <div class="empty"><div class="em-emoji">🌟</div><div class="em-title">Nimic în această rutină</div><div class="em-hint">Apasă + pentru a adăuga o activitate pentru ${meta.hours}.</div></div>
    `}

    <div class="card">
      <div class="card-head"><h3>Progres ${esc(meta.title.toLowerCase())}</h3><span class="chip ${meta.color}">${Math.round(pct*100)}%</span></div>
      <div class="pbar ${meta.color}"><i style="width:${(pct*100).toFixed(0)}%"></i></div>
      <div class="subtitle mt-6">${doneHere} din ${items.length} pași completați</div>
    </div>

    <div class="card">
      <div class="card-head"><h3>Istoric — 7 zile</h3></div>
      <div class="dow-row">
        ${lastNDays(7).map(iso => {
          const en = state.entries[iso];
          const c = en && en.routine ? en.routine.completed.filter(id => items.some(it => it.id === id)).length : 0;
          const t = items.length;
          const d = parseISO(iso);
          return `<div class="dow-dot ${t > 0 && c >= Math.max(1, t*0.8) ? 'done' : ''}"><span class="d"></span><span>${dayName(d)}</span></div>`;
        }).join('')}
      </div>
    </div>
    `;

    function routineRow(item, done) {
      return `<div class="list-row ${done ? 'done' : ''}" data-action="toggle-routine" data-id="${item.id}">
        <div class="icn ${done ? 'done' : ''}">${done ? ICONS.check : (ICONS[item.icon] || ICONS.check)}</div>
        <div>
          <div class="title">${esc(item.name)}</div>
          <div class="sub">${esc(item.desc)} · ${item.duration} min</div>
        </div>
        <div class="row" style="gap:4px">
          <button class="icon-btn" style="width:32px;height:32px;background:transparent;border:0" data-action="edit-routine" data-id="${item.id}" aria-label="Editează">${ICONS.edit}</button>
          <button class="icon-btn" style="width:32px;height:32px;background:transparent;border:0" data-action="del-routine" data-id="${item.id}" aria-label="Șterge">${ICONS.trash}</button>
        </div>
      </div>`;
    }
  };
}
VIEWS.routine         = routineViewForSlot('morning');
VIEWS.routine_noon    = routineViewForSlot('noon');
VIEWS.routine_evening = routineViewForSlot('evening');

// —— Somn ——
VIEWS.sleep = function() {
  const tab = viewState.tab || 'day';
  const iso = viewState.date || todayISO();
  const e = getEntry(iso);
  const s = e.sleep;
  const total = s ? s.total_min : 0;
  const totalH = total / 60;
  const goalMin = state.goals.sleep_hours * 60;
  const pct = goalMin ? clamp(total / goalMin, 0, 1) : 0;
  const p = (v) => total ? Math.round((v/total) * 100) : 0;

  const rangeSummary = () => {
    if (tab === 'day') return fmtDateFull(iso);
    if (tab === 'week') {
      const start = isoOffset(-6, iso), end = iso;
      return `${fmtDate(start)} – ${fmtDate(end)}`;
    }
    return `Ultimele 30 zile`;
  };
  const values = tab === 'day' ? null : series('sleep', tab === 'week' ? 7 : 30);
  const avgSleep = values ? avg(values) : 0;

  return `
  <div class="row" style="gap:10px">
    <button class="icon-btn" data-action="back">${ICONS.back}</button>
    <div style="flex:1"></div>
    <button class="icon-btn" data-action="add-sleep" aria-label="Adaugă">${ICONS.plus}</button>
  </div>
  <div class="tabs" style="display:flex;width:100%;justify-content:center;margin-top:8px">
    <button class="tab ${tab==='day'?'is-active':''}" data-action="sleep-tab" data-tab="day">Zile</button>
    <button class="tab ${tab==='week'?'is-active':''}" data-action="sleep-tab" data-tab="week">Săptămâni</button>
    <button class="tab ${tab==='month'?'is-active':''}" data-action="sleep-tab" data-tab="month">Luni</button>
  </div>

  <div class="card center" style="flex-direction:column;padding:22px">
    <div class="subtitle mb-6">${rangeSummary()}</div>
    ${tab === 'day' ? `
      ${ringBlock({ pct, size: 190, stroke: 14, colorClass: 'blue',
        center: `<div class="l">Obiectiv</div><div class="v">${fmtDur(total)}</div><div class="sub" style="color:var(--blue)">Durata totală</div><div class="l">Zilnic: ${state.goals.sleep_hours}h</div>` })}
    ` : `
      <div class="big" style="color:var(--blue)">${avgSleep.toFixed(1)}h</div>
      <div class="subtitle">Media pe ${tab === 'week' ? 'săptămână' : 'lună'}</div>
      <div style="width:100%;margin-top:12px">${sparklineSVG(values, { stroke:'#3b82f6', fill:'rgba(59,130,246,.15)' })}</div>
    `}
  </div>

  ${s ? `
  <div class="card">
    <div class="sleep-row"><span class="dot" style="background:var(--blue)"></span><span class="lbl">Somn profund</span><span class="val">${fmtDur(s.deep_min)}</span><span class="pct">${p(s.deep_min)}%</span></div>
    <div class="sleep-row"><span class="dot" style="background:#60a5fa"></span><span class="lbl">Somn ușor</span><span class="val">${fmtDur(s.light_min)}</span><span class="pct">${p(s.light_min)}%</span></div>
    <div class="sleep-row"><span class="dot" style="background:var(--pink)"></span><span class="lbl">REM</span><span class="val">${fmtDur(s.rem_min)}</span><span class="pct">${p(s.rem_min)}%</span></div>
    <div class="sleep-row"><span class="dot" style="background:var(--red)"></span><span class="lbl">Treziri</span><span class="val">${s.awakenings} ori</span><span class="pct">—</span></div>
  </div>

  <div class="card tap" data-action="add-sleep">
    <div class="row" style="gap:12px">
      <div class="m-icon blue">${ICONS.moon}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:14px">Calitate somn</div>
        <div class="subtitle">${sleepQualityLabel(e).label} · culcat ${s.bedtime} · trezit ${s.wakeup}</div>
      </div>
      <div class="arrow">${ICONS.arrow}</div>
    </div>
  </div>
  ` : `
  <div class="empty">
    <div class="em-emoji">🌙</div>
    <div class="em-title">Nu ai date de somn</div>
    <div class="em-hint">Apasă + pentru a adăuga o înregistrare.</div>
  </div>
  `}
  `;
};

// —— Stare zilnică ——
VIEWS.mood = function() {
  const iso = todayISO();
  const e = getEntry(iso);
  const cur = e.mood || { rating: 3, energy: 60, stress: 40, note: '' };
  return `
  <div class="row" style="gap:10px">
    <button class="icon-btn" data-action="back">${ICONS.back}</button>
    <div style="flex:1"><div class="subtitle" style="text-align:center">Cum te simți azi?</div></div>
    <div style="width:40px"></div>
  </div>

  <div class="card" style="margin-top:8px">
    <div class="subtitle mb-10">${fmtDateFull(iso)}</div>
    <div class="mood-row" id="moodRow">
      ${[0,1,2,3,4].map(r => `<button class="mood-btn ${cur.rating===r?'is-active':''}" data-action="mood-rate" data-r="${r}">
        <span class="emoji">${moodEmoji(r)}</span><span>${moodLabel(r).replace(' ',' ')}</span>
      </button>`).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-head"><div class="row"><div class="m-icon amber">${ICONS.bolt}</div><h3 style="margin-left:8px">Nivel energie</h3></div><span class="chip amber" id="energyVal">${cur.energy}%</span></div>
    <input type="range" min="0" max="100" value="${cur.energy}" class="slider green" id="energySlider" style="--v:${cur.energy}%"/>
  </div>

  <div class="card">
    <div class="card-head"><div class="row"><div class="m-icon red">${ICONS.heart}</div><h3 style="margin-left:8px">Nivel stres</h3></div><span class="chip red" id="stressVal">${cur.stress}%</span></div>
    <input type="range" min="0" max="100" value="${cur.stress}" class="slider red" id="stressSlider" style="--v:${cur.stress}%"/>
  </div>

  <div class="field">
    <label>Notițe (opțional)</label>
    <textarea class="input" id="moodNote" placeholder="Ce s-a întâmplat azi?">${esc(cur.note || '')}</textarea>
  </div>

  <button class="btn primary block" data-action="mood-save">Salvează</button>

  <div class="section-title"><h2>Istoric</h2></div>
  <div class="card">
    ${sparklineSVG(series('mood', 14), { stroke: '#22c55e' })}
    <div class="subtitle mt-6">Ultimele 14 zile · stare medie</div>
  </div>
  `;
};

// —— Nutriție ——
VIEWS.nutrition = function() {
  const iso = viewState.date || todayISO();
  const e = getEntry(iso);
  const n = e.nutrition || (e.nutrition = { meals: [], water_ml: 0, totals: { kcal:0, protein:0, carbs:0, fat:0 } });
  if (!n.totals) n.totals = { kcal:0, protein:0, carbs:0, fat:0 };
  const goals = state.goals;
  const kcalPct = clamp((n.totals.kcal || 0) / goals.kcal, 0, 1.05);
  return `
  <div class="row" style="gap:10px">
    <button class="icon-btn" data-action="back">${ICONS.back}</button>
    <div style="flex:1;display:flex;justify-content:center;align-items:center;gap:6px">
      <button class="icon-btn" data-action="nut-prev" style="width:28px;height:28px">${ICONS.back}</button>
      <div style="font-weight:600;font-size:13px">${fmtDateFull(iso)}</div>
      <button class="icon-btn" data-action="nut-next" style="width:28px;height:28px">${ICONS.arrow}</button>
    </div>
    <button class="icon-btn" data-action="add-meal">${ICONS.plus}</button>
  </div>

  <div class="card center" style="flex-direction:column;padding:20px;margin-top:8px">
    ${ringBlock({ pct: kcalPct, size: 170, stroke: 14, colorClass: '',
      center: `<div class="v">${(n.totals.kcal||0).toLocaleString('ro-RO')}</div><div class="l">consumate</div><div class="sub">din ${goals.kcal.toLocaleString('ro-RO')} kcal</div>` })}
  </div>

  <div class="card">
    <div class="sleep-row"><span class="dot" style="background:var(--green)"></span><span class="lbl">Proteine</span><span class="val">${n.totals.protein || 0} g</span><span class="pct">/${goals.protein}g</span></div>
    <div class="pbar" style="margin:4px 0 10px"><i style="width:${clamp((n.totals.protein||0)/goals.protein*100,0,100).toFixed(0)}%"></i></div>
    <div class="sleep-row"><span class="dot" style="background:var(--amber)"></span><span class="lbl">Carbohidrați</span><span class="val">${n.totals.carbs || 0} g</span><span class="pct">/${goals.carbs}g</span></div>
    <div class="pbar amber" style="margin:4px 0 10px"><i style="width:${clamp((n.totals.carbs||0)/goals.carbs*100,0,100).toFixed(0)}%"></i></div>
    <div class="sleep-row"><span class="dot" style="background:var(--purple)"></span><span class="lbl">Grăsimi</span><span class="val">${n.totals.fat || 0} g</span><span class="pct">/${goals.fat}g</span></div>
    <div class="pbar purple" style="margin:4px 0 6px"><i style="width:${clamp((n.totals.fat||0)/goals.fat*100,0,100).toFixed(0)}%"></i></div>
    <div class="sleep-row"><span class="dot" style="background:var(--cyan)"></span><span class="lbl">Apă</span><span class="val">${((n.water_ml||0)/1000).toFixed(1)} L</span><span class="pct">/${(goals.water_ml/1000).toFixed(1)}L</span></div>
    <div class="pbar cyan" style="margin:4px 0"><i style="width:${clamp((n.water_ml||0)/goals.water_ml*100,0,100).toFixed(0)}%"></i></div>
    <div class="row gap-6 mt-6">
      <button class="btn ghost" data-action="water-add" data-ml="250">+250 ml</button>
      <button class="btn ghost" data-action="water-add" data-ml="500">+500 ml</button>
      <button class="btn ghost" data-action="water-reset">Reset</button>
    </div>
  </div>

  <div class="section-title"><h2>Mese</h2><button class="link" data-action="add-meal">+ adaugă</button></div>
  ${(n.meals || []).length ? n.meals.map(mealCard).join('') : `<div class="empty"><div class="em-emoji">🥗</div><div class="em-title">Nicio masă înregistrată</div><div class="em-hint">Adaugă prima masă a zilei.</div></div>`}

  <button class="btn primary block" data-action="add-meal" style="margin-top:6px">Înregistrează masă</button>
  `;

  function mealCard(m) {
    return `<div class="meal">
      <div class="spread">
        <div>
          <div class="meal-name">${esc(m.name)}</div>
          <div class="meal-meta">${esc(m.time || '')} · P ${m.protein||0}g · C ${m.carbs||0}g · G ${m.fat||0}g</div>
        </div>
        <div class="row" style="gap:8px">
          <div class="kcal">${m.kcal||0} kcal</div>
          <button class="h-action" data-action="del-meal" data-id="${m.id}">${ICONS.trash}</button>
        </div>
      </div>
    </div>`;
  }
};

// —— Activitate fizică ——
VIEWS.activity = function() {
  const tab = viewState.tab || 'day';
  const iso = todayISO();
  const e = getEntry(iso);
  const a = e.activity || { steps: 0, distance_km: 0, calories: 0, active_min: 0, hourly: Array(24).fill(0), workouts: [] };
  const goal = state.goals.steps;
  const pct = clamp(a.steps / goal, 0, 1);
  const wkSeries = series('steps', tab === 'week' ? 7 : tab === 'month' ? 30 : 7);
  return `
  <div class="row" style="gap:10px">
    <button class="icon-btn" data-action="back">${ICONS.back}</button>
    <div style="flex:1"></div>
    <button class="icon-btn" data-action="add-activity">${ICONS.plus}</button>
  </div>
  <div class="tabs" style="display:flex;width:100%;justify-content:center;margin-top:8px">
    <button class="tab ${tab==='day'?'is-active':''}" data-action="act-tab" data-tab="day">Zile</button>
    <button class="tab ${tab==='week'?'is-active':''}" data-action="act-tab" data-tab="week">Săptămâni</button>
    <button class="tab ${tab==='month'?'is-active':''}" data-action="act-tab" data-tab="month">Luni</button>
  </div>

  <div class="card center" style="flex-direction:column;padding:18px">
    <div class="big" style="color:var(--green)">${(a.steps).toLocaleString('ro-RO')} <span style="font-size:14px;color:var(--text-dim);font-weight:500">pași</span></div>
    <div class="subtitle mb-10">Obiectiv: ${goal.toLocaleString('ro-RO')} pași</div>
    <div class="pbar" style="width:100%"><i style="width:${(pct*100).toFixed(0)}%"></i></div>
    <div class="chip green" style="margin-top:8px">${Math.round(pct*100)}%</div>
  </div>

  <div class="grid-3">
    <div class="card tight center" style="flex-direction:column">
      <div class="subtitle">Distanță</div><div style="font-size:17px;font-weight:700">${a.distance_km.toFixed(1)} <span style="font-size:11px;font-weight:500;color:var(--text-dim)">km</span></div>
    </div>
    <div class="card tight center" style="flex-direction:column">
      <div class="subtitle">Calorii</div><div style="font-size:17px;font-weight:700">${a.calories} <span style="font-size:11px;font-weight:500;color:var(--text-dim)">kcal</span></div>
    </div>
    <div class="card tight center" style="flex-direction:column">
      <div class="subtitle">Timp activ</div><div style="font-size:17px;font-weight:700">${a.active_min} <span style="font-size:11px;font-weight:500;color:var(--text-dim)">min</span></div>
    </div>
  </div>

  <div class="card">
    <div class="card-head"><h3>${tab === 'day' ? 'Pași pe ore' : `Ultimele ${tab==='week'?7:30} zile`}</h3><span class="chip green">${tab==='day' ? a.steps.toLocaleString('ro-RO') : Math.round(avg(wkSeries)).toLocaleString('ro-RO')}${tab==='day'?' azi':' medie'}</span></div>
    ${tab === 'day' ? barsSVG(a.hourly, { color: '#22c55e' }) : sparklineSVG(wkSeries)}
  </div>

  <button class="btn primary block" data-action="start-workout">${ICONS.activity}<span>Începe antrenament</span></button>

  ${(a.workouts || []).length ? `
  <div class="section-title"><h2>Antrenamente</h2></div>
  ${a.workouts.map(w => `<div class="card">
    <div class="spread"><div><div style="font-weight:600">${esc(w.type)}</div><div class="subtitle">${w.duration} min · ${w.calories} kcal</div></div><div class="chip green">${w.time}</div></div>
  </div>`).join('')}` : ''}
  `;
};

// —— Jurnal ——
VIEWS.journal = function() {
  const focusIso = viewState.date || todayISO();
  const strip = lastNDays(7);
  const q = (viewState.q || '').toLowerCase();
  // gather all entries across dates
  const all = [];
  for (const iso of Object.keys(state.entries)) {
    const entries = state.entries[iso].journal || [];
    entries.forEach(j => all.push({ ...j, date: iso }));
  }
  all.sort((a,b) => (b.ts || 0) - (a.ts || 0));
  const filtered = q ? all.filter(j => (j.title + ' ' + j.body).toLowerCase().includes(q)) : all.filter(j => j.date === focusIso);
  return `
  <div class="row" style="gap:10px">
    <button class="icon-btn" data-action="back">${ICONS.back}</button>
    <div style="flex:1"></div>
    <button class="icon-btn" data-action="add-journal">${ICONS.plus}</button>
  </div>

  <div class="week-strip">
    ${strip.map(iso => {
      const d = parseISO(iso);
      return `<div class="day-cell ${iso===focusIso?'is-active':''}" data-action="j-day" data-iso="${iso}">
        <div class="dow">${dayName(d)}</div>
        <div class="dnum">${d.getDate()}</div>
      </div>`;
    }).join('')}
  </div>

  <div class="searchbar">
    ${ICONS.search}
    <input type="text" placeholder="Caută în jurnal..." id="jSearch" value="${esc(q)}"/>
  </div>

  ${filtered.length ? filtered.map(entryHtml).join('') : `
    <div class="empty"><div class="em-emoji">📔</div><div class="em-title">${q ? 'Nu s-a găsit nimic' : 'Nicio intrare'}</div><div class="em-hint">${q ? 'Încearcă alt termen.' : 'Notează cum a fost ziua.'}</div></div>
  `}

  <button class="btn primary block" data-action="add-journal" style="margin-top:6px">Adaugă intrare</button>
  `;

  function entryHtml(j) {
    const e = getEntry(j.date);
    const mood = e.mood ? moodEmoji(e.mood.rating) : '';
    return `<div class="entry" data-action="edit-journal" data-id="${j.id}" data-date="${j.date}">
      <div class="e-head"><div class="e-title">${esc(j.title || 'Intrare')}</div><div class="e-time">${esc(j.time || '')}</div></div>
      <div class="e-body">${esc(j.body || '')}</div>
      <div class="e-meta">
        <span class="chip">${fmtDate(j.date)}</span>
        ${mood ? `<span class="chip">${mood} ${moodLabel(e.mood.rating)}</span>` : ''}
        ${e.sleep ? `<span class="chip blue">${fmtDur(e.sleep.total_min)} somn</span>` : ''}
        ${e.mood ? `<span class="chip amber">${e.mood.energy}% energie</span>` : ''}
        ${e.mood ? `<span class="chip red">${e.mood.stress}% stres</span>` : ''}
      </div>
    </div>`;
  }
};

// —— Obiceiuri ——
VIEWS.habits = function() {
  const tab = viewState.tab || 'all';
  const habits = state.habits.filter(h => tab==='all' ? true : tab==='active' ? !h.archived : h.archived);
  const iso = todayISO();
  return `
  <div class="row" style="gap:10px">
    <button class="icon-btn" data-action="back">${ICONS.back}</button>
    <div style="flex:1"></div>
    <button class="icon-btn" data-action="add-habit">${ICONS.plus}</button>
  </div>
  <div class="tabs" style="display:flex;width:100%;justify-content:center;margin-top:8px">
    <button class="tab ${tab==='all'?'is-active':''}"     data-action="hab-tab" data-tab="all">Toate</button>
    <button class="tab ${tab==='active'?'is-active':''}"  data-action="hab-tab" data-tab="active">Active</button>
    <button class="tab ${tab==='archived'?'is-active':''}" data-action="hab-tab" data-tab="archived">Arhivate</button>
  </div>

  ${habits.length ? habits.map(habitCard).join('') : `<div class="empty"><div class="em-emoji">🎯</div><div class="em-title">Niciun obicei</div><div class="em-hint">Apasă + pentru a adăuga.</div></div>`}
  `;

  function habitCard(h) {
    const streak = streakForHabit(h);
    const done7 = lastNDays(7).map(d => (state.entries[d] && state.entries[d].habits_done || []).includes(h.id));
    const isDoneToday = (state.entries[iso] && state.entries[iso].habits_done || []).includes(h.id);
    return `<div class="habit-card ${h.archived ? 'archived' : ''}" data-id="${h.id}">
      <div class="h-head">
        <button class="icn ${isDoneToday ? 'done' : ''}" data-action="toggle-habit" data-id="${h.id}" style="width:28px;height:28px;border-radius:8px;border:0;cursor:pointer">${isDoneToday ? ICONS.check : ''}</button>
        <div class="h-name">${esc(h.name)}</div>
        <span class="h-streak">${streak} zile</span>
        <button class="h-action" data-action="edit-habit" data-id="${h.id}">${ICONS.edit}</button>
        <button class="h-action" data-action="archive-habit" data-id="${h.id}">${ICONS.archive}</button>
      </div>
      <div class="dow-row">
        ${lastNDays(7).map((iso, i) => {
          const d = parseISO(iso);
          return `<div class="dow-dot ${done7[i] ? 'done' : ''}"><span class="d"></span><span>${dayName(d)}</span></div>`;
        }).join('')}
      </div>
    </div>`;
  }
};

// —— Progres ——
VIEWS.progress = function() {
  const period = viewState.period || 'week';
  const n = period === 'week' ? 7 : period === 'month' ? 30 : 365;
  const balV = series('balance', n);
  const avgSleep = avg(series('sleep', n));
  const avgSteps = Math.round(avg(series('steps', n)));
  const avgStress = Math.round(avg(series('stress', n)));
  const avgWater = avg(series('water', n));
  return `
  <div class="row" style="gap:10px">
    <button class="icon-btn" data-action="back">${ICONS.back}</button>
    <div style="flex:1"></div>
    <div style="width:40px"></div>
  </div>
  <div class="tabs" style="display:flex;width:100%;justify-content:center;margin-top:8px">
    <button class="tab ${period==='week'?'is-active':''}"  data-action="prog-period" data-p="week">Săptămâni</button>
    <button class="tab ${period==='month'?'is-active':''}" data-action="prog-period" data-p="month">Luni</button>
    <button class="tab ${period==='year'?'is-active':''}"  data-action="prog-period" data-p="year">Ani</button>
  </div>

  <div class="card">
    <div class="card-head"><h3>Scor de echilibru</h3><span class="chip green">Media ${Math.round(avg(balV))}</span></div>
    ${sparklineSVG(balV, { stroke: '#22c55e', fill: 'rgba(34,197,94,.15)' })}
  </div>

  <div class="section-title"><h2>Medii ${period==='week'?'săptămânale':period==='month'?'lunare':'anuale'}</h2></div>
  <div class="grid-2">
    <div class="card tight">
      <div class="row"><div class="m-icon blue">${ICONS.moon}</div><div style="flex:1"><div class="subtitle">Somn</div><div style="font-size:16px;font-weight:700">${avgSleep.toFixed(1)}h</div></div></div>
    </div>
    <div class="card tight">
      <div class="row"><div class="m-icon purple">${ICONS.activity}</div><div style="flex:1"><div class="subtitle">Pași</div><div style="font-size:16px;font-weight:700">${avgSteps.toLocaleString('ro-RO')}</div></div></div>
    </div>
    <div class="card tight">
      <div class="row"><div class="m-icon red">${ICONS.heart}</div><div style="flex:1"><div class="subtitle">Stres</div><div style="font-size:16px;font-weight:700">${avgStress}%</div></div></div>
    </div>
    <div class="card tight">
      <div class="row"><div class="m-icon cyan">${ICONS.water}</div><div style="flex:1"><div class="subtitle">Apă</div><div style="font-size:16px;font-weight:700">${avgWater.toFixed(1)} L</div></div></div>
    </div>
  </div>

  <div class="card">
    <div class="card-head"><h3>Energie & stres</h3></div>
    <div class="subtitle mb-6">Energie</div>
    ${sparklineSVG(series('energy', n), { stroke: '#f59e0b', fill: 'rgba(245,158,11,.15)' })}
    <div class="subtitle mt-14 mb-6">Stres</div>
    ${sparklineSVG(series('stress', n), { stroke: '#ef4444', fill: 'rgba(239,68,68,.15)' })}
  </div>
  `;
};

// —— Relaxare ——
VIEWS.relax = function() {
  return `
  <div class="row" style="gap:10px">
    <button class="icon-btn" data-action="back">${ICONS.back}</button>
    <div style="flex:1"></div>
    <div style="width:40px"></div>
  </div>
  <h2 style="margin:8px 0 12px">Exerciții recomandate</h2>
  ${state.relax_items.map(x => `
    <div class="card">
      <div class="row" style="gap:12px">
        <div class="m-icon ${x.color}">${x.kind === 'breath' ? ICONS.wind : x.kind === 'muscle' ? ICONS.energy : x.kind === 'meditate' ? ICONS.heart : ICONS.moon}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:14px">${esc(x.name)}</div>
          <div class="subtitle">${esc(x.desc)}</div>
        </div>
        <button class="icon-btn" data-action="relax-start" data-id="${x.id}" style="background:var(--green);color:#0a0f1c;border-color:var(--green)">${ICONS.play}</button>
      </div>
    </div>
  `).join('')}
  `;
};

// —— Statistici ——
VIEWS.stats = function() {
  const tab = viewState.tab || 'stress';
  const iso = todayISO();
  const n = 7;
  const days = lastNDays(n);

  let hero = '';
  let chart = '';
  let extra = '';

  if (tab === 'sleep') {
    const v = series('sleep', n);
    hero = `<div class="big" style="color:var(--blue)">${avg(v).toFixed(1)}h</div><div class="subtitle">Somn mediu · ultimele ${n} zile</div>`;
    chart = sparklineSVG(v, { stroke: '#3b82f6', fill: 'rgba(59,130,246,.15)' });
    const goal = state.goals.sleep_hours;
    const good = v.filter(x => x >= goal).length, ok = v.filter(x => x >= goal-1 && x < goal).length, low = v.length - good - ok;
    extra = distribution([
      { label: 'Bine', value: good, color: 'var(--green)' },
      { label: 'Ok', value: ok, color: 'var(--amber)' },
      { label: 'Scăzut', value: low, color: 'var(--red)' },
    ], v.length);
  } else if (tab === 'activity') {
    const v = series('steps', n);
    hero = `<div class="big" style="color:var(--purple)">${Math.round(avg(v)).toLocaleString('ro-RO')}</div><div class="subtitle">Pași în medie · ultimele ${n} zile</div>`;
    chart = sparklineSVG(v, { stroke: '#a855f7', fill: 'rgba(168,85,247,.15)' });
    const goal = state.goals.steps;
    const hit = v.filter(x => x >= goal).length;
    extra = distribution([
      { label: 'Obiectiv atins', value: hit, color: 'var(--green)' },
      { label: 'Sub obiectiv', value: v.length - hit, color: 'var(--amber)' },
    ], v.length);
  } else if (tab === 'mood') {
    const v = series('mood', n);
    hero = `<div class="big" style="color:var(--green)">${(avg(v)/25).toFixed(1)}/4</div><div class="subtitle">Stare medie · ultimele ${n} zile</div>`;
    chart = sparklineSVG(v, { stroke: '#22c55e', fill: 'rgba(34,197,94,.15)' });
    const counts = [0,0,0,0,0];
    days.forEach(iso => { const e = state.entries[iso]; if (e && e.mood) counts[e.mood.rating]++; });
    extra = distribution([
      { label: 'Excelent', value: counts[4], color: 'var(--green)' },
      { label: 'Bine',     value: counts[3], color: 'var(--cyan)' },
      { label: 'Neutru',   value: counts[2], color: 'var(--text-dim)' },
      { label: 'Rău',      value: counts[1], color: 'var(--amber)' },
      { label: 'Foarte rău', value: counts[0], color: 'var(--red)' },
    ], v.length);
  } else {
    const v = series('stress', n);
    hero = `<div class="big" style="color:var(--red)">${Math.round(avg(v))}%</div><div class="subtitle">Nivel stres mediu · ultimele ${n} zile</div>`;
    chart = sparklineSVG(v, { stroke: '#ef4444', fill: 'rgba(239,68,68,.15)' });
    const low = v.filter(x => x < 35).length, mid = v.filter(x => x >= 35 && x < 65).length, high = v.filter(x => x >= 65).length;
    extra = distribution([
      { label: 'Scăzut',  value: low,  color: 'var(--green)' },
      { label: 'Moderat', value: mid,  color: 'var(--amber)' },
      { label: 'Ridicat', value: high, color: 'var(--red)' },
    ], v.length);
  }

  return `
  <div class="row" style="gap:10px">
    <button class="icon-btn" data-action="back">${ICONS.back}</button>
    <div style="flex:1"></div>
    <div style="width:40px"></div>
  </div>
  <div class="tabs" style="display:flex;width:100%;justify-content:center;margin-top:8px">
    <button class="tab ${tab==='sleep'?'is-active':''}"    data-action="stat-tab" data-tab="sleep">Somn</button>
    <button class="tab ${tab==='activity'?'is-active':''}" data-action="stat-tab" data-tab="activity">Activitate</button>
    <button class="tab ${tab==='mood'?'is-active':''}"     data-action="stat-tab" data-tab="mood">Stare</button>
    <button class="tab ${tab==='stress'?'is-active':''}"   data-action="stat-tab" data-tab="stress">Stres</button>
  </div>

  <div class="card center" style="flex-direction:column;padding:18px">${hero}</div>
  <div class="card">${chart}</div>
  <div class="section-title"><h2>Distribuție săptămânală</h2></div>
  ${extra}
  `;

  function distribution(rows, total) {
    const segs = rows.filter(r => r.value > 0);
    const donut = donutMultiSVG(segs.map(r => ({ value: r.value, color: r.color })), 140, 14);
    return `<div class="card">
      <div class="row" style="gap:14px;align-items:center">
        <div>${donut}</div>
        <div style="flex:1">
          ${rows.map(r => `<div class="spread" style="padding:5px 0">
            <div class="row" style="gap:8px"><span style="width:10px;height:10px;border-radius:3px;background:${r.color}"></span><span style="font-size:13px">${r.label}</span></div>
            <div class="subtitle">${total ? Math.round((r.value/total)*100) : 0}%</div>
          </div>`).join('')}
        </div>
      </div>
    </div>`;
  }
};

// —— Setări ——
VIEWS.settings = function() {
  return `
  <div class="row" style="gap:10px">
    <button class="icon-btn" data-action="back">${ICONS.back}</button>
    <div style="flex:1"></div>
    <div style="width:40px"></div>
  </div>

  ${settingRow('target', 'Obiective & preferințe', 'edit-goals')}
  ${settingRow('bell', 'Mementouri', 'edit-notifs')}
  ${settingRow('device', 'Dispozitive conectate', 'devices')}
  ${settingRow('shield', 'Confidențialitate', 'privacy')}
  ${settingRow('download', 'Export date', 'export')}
  ${settingRow('info', 'Despre aplicație', 'about', 'v1.0.0')}

  <button class="btn danger block" data-action="reset-data" style="margin-top:16px">${ICONS.trash}<span>Șterge datele locale</span></button>
  `;

  function settingRow(icon, label, action, extra) {
    return `<div class="card tap" data-action="${action}" style="padding:12px 14px">
      <div class="row" style="gap:12px">
        <div class="m-icon">${ICONS[icon] || ICONS.info}</div>
        <div style="flex:1;font-size:14px">${label}</div>
        ${extra ? `<div class="subtitle">${extra}</div>` : ''}
        <div class="arrow">${ICONS.arrow}</div>
      </div>
    </div>`;
  }
};

// —— More menu (bottom nav) ——
VIEWS.more = function() {
  const items = [
    ['sleep','Somn','moon','blue'],
    ['mood','Stare zilnică','smile','green'],
    ['nutrition','Nutriție','meal','amber'],
    ['activity','Activitate fizică','activity','purple'],
    ['habits','Obiceiuri','target','green'],
    ['relax','Relaxare','heart','pink'],
    ['stats','Statistici','list','cyan'],
    ['settings','Setări','shield',''],
  ];
  return `
  <h1>Mai mult</h1>
  <p class="subtitle">Restul secțiunilor din aplicație.</p>
  <div class="grid-2 mt-14">
    ${items.map(([v,label,icon,color]) => `
      <div class="card tap" data-view="${v}" style="min-height:110px;display:flex;flex-direction:column;justify-content:space-between">
        <div class="m-icon ${color}">${ICONS[icon]}</div>
        <div style="font-weight:600;font-size:14px">${label}</div>
      </div>
    `).join('')}
  </div>
  `;
};

// ─── action wiring (event delegation) ──────────────────────────────────────
function wireViewActions() {
  const screen = $('#screen');
  screen.onclick = (ev) => {
    let el = ev.target.closest('[data-action], [data-view]');
    if (!el) return;
    const action = el.dataset.action;
    const view = el.dataset.view;
    if (view && !action) return go(view);
    if (!action) return;
    handleAction(action, el, ev);
  };
  // input handlers per view
  const eSlider = $('#energySlider'); if (eSlider) eSlider.oninput = e => { $('#energyVal').textContent = e.target.value + '%'; e.target.style.setProperty('--v', e.target.value + '%'); };
  const sSlider = $('#stressSlider'); if (sSlider) sSlider.oninput = e => { $('#stressVal').textContent = e.target.value + '%'; e.target.style.setProperty('--v', e.target.value + '%'); };
  const jSearch = $('#jSearch'); if (jSearch) jSearch.oninput = e => { viewState.q = e.target.value; renderSoft(); };
}
function renderSoft() { // avoid resetting scroll for the search
  const sy = window.scrollY;
  render();
  window.scrollTo(0, sy);
}

const ACTIONS = {};

ACTIONS['back'] = () => go('dashboard');
ACTIONS['go-routine'] = () => go('routine');

// —— Custom cards (Dashboard prebuilder) ——
const CARD_ICONS = ['plus','check','heart','bolt','moon','sun','wind','droplet','list','activity','meal','book','target','user','shield','bell','info','edit','archive','play','more'];
const CARD_COLORS = ['green','blue','amber','purple','pink','cyan','red'];
const CARD_LINKS = [
  ['', 'Fără link (doar notă)'],
  ['dashboard','Dashboard'],['routine','Rutina de dimineață'],['routine_noon','Rutina de amiază'],['routine_evening','Rutina de seară'],
  ['sleep','Somn'],['mood','Stare zilnică'],['nutrition','Nutriție'],['activity','Activitate'],
  ['journal','Jurnal'],['habits','Obiceiuri'],['progress','Progres'],['relax','Relaxare'],['stats','Statistici'],['settings','Setări'],
];
ACTIONS['add-card']  = () => openCardModal();
ACTIONS['edit-card'] = (el) => openCardModal(el.dataset.id);
ACTIONS['del-card']  = (el) => {
  const id = el.dataset.id;
  confirmDialog('Ștergi cardul?', () => {
    state.custom_cards = state.custom_cards.filter(c => c.id !== id);
    save(); toast('Șters'); render();
  });
};
ACTIONS['open-card'] = (el) => {
  const c = state.custom_cards.find(x => x.id === el.dataset.id);
  if (!c) return;
  openInfoModal(c.title, c.note || c.subtitle || '(fără conținut)');
};
function openCardModal(id) {
  const editing = id ? state.custom_cards.find(c => c.id === id) : null;
  const cur = editing || { title: '', subtitle: '', icon: 'plus', color: 'green', link: '', note: '' };
  openModal(`
    <div class="modal-head"><h3>${editing ? 'Editează' : 'Adaugă'} card</h3><button class="modal-close" onclick="DL.close()">${ICONS.close}</button></div>
    <div class="field"><label>Titlu</label><input class="input" id="ccT" value="${esc(cur.title)}" placeholder="Ex. Antrenament de seară"/></div>
    <div class="field"><label>Subtitlu (opțional)</label><input class="input" id="ccS" value="${esc(cur.subtitle)}" placeholder="Ex. 30 minute, după cină"/></div>
    <div class="grid-2">
      <div class="field"><label>Icon</label><select class="input" id="ccI">${CARD_ICONS.map(k => `<option value="${k}" ${cur.icon===k?'selected':''}>${k}</option>`).join('')}</select></div>
      <div class="field"><label>Culoare</label><select class="input" id="ccC">${CARD_COLORS.map(k => `<option value="${k}" ${cur.color===k?'selected':''}>${k}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>Acțiune la tap</label><select class="input" id="ccL">${CARD_LINKS.map(([v,l]) => `<option value="${v}" ${cur.link===v?'selected':''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label>Notă (opțional, apare la tap dacă n-are link)</label><textarea class="input" id="ccN" placeholder="Text personalizat">${esc(cur.note)}</textarea></div>
    <div class="row" style="gap:8px">
      <button class="btn primary block" id="ccSave">${editing ? 'Salvează' : 'Adaugă'}</button>
      ${editing ? `<button class="btn danger" id="ccDel">${ICONS.trash}</button>` : ''}
    </div>
  `);
  $('#ccSave').onclick = () => {
    const title = $('#ccT').value.trim();
    if (!title) return toast('Titlul e obligatoriu');
    const data = { title, subtitle: $('#ccS').value.trim(), icon: $('#ccI').value, color: $('#ccC').value, link: $('#ccL').value, note: $('#ccN').value };
    if (editing) Object.assign(editing, data);
    else state.custom_cards.push({ id: uid(), ...data });
    save(); closeModal(); toast(editing ? 'Salvat' : 'Adăugat'); render();
  };
  if (editing) $('#ccDel').onclick = () => {
    state.custom_cards = state.custom_cards.filter(c => c.id !== id);
    save(); closeModal(); toast('Șters'); render();
  };
}

// —— Routine actions ——
ACTIONS['toggle-routine'] = (el) => {
  const id = el.dataset.id;
  const e = todayEntry();
  if (!e.routine) e.routine = { completed: [] };
  const arr = e.routine.completed;
  const idx = arr.indexOf(id);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(id);
  save();
  toast(idx >= 0 ? 'Pas anulat' : 'Pas completat ✓');
  render();
};
ACTIONS['add-routine'] = (el) => openRoutineModal(null, el && el.dataset.slot);
ACTIONS['edit-routine'] = (el) => openRoutineModal(el.dataset.id);
ACTIONS['del-routine'] = (el) => {
  const id = el.dataset.id;
  confirmDialog('Ștergi această activitate din rutină?', () => {
    state.routine_items = state.routine_items.filter(x => x.id !== id);
    Object.values(state.entries).forEach(e => {
      if (e.routine) e.routine.completed = e.routine.completed.filter(x => x !== id);
    });
    save(); toast('Șters'); render();
  });
};
function openRoutineModal(editId, defaultSlot) {
  const editing = editId ? state.routine_items.find(x => x.id === editId) : null;
  const slot = editing ? editing.slot : (defaultSlot || currentSlot());
  openModal(`
    <div class="modal-head"><h3>${editing ? 'Editează' : 'Adaugă'} activitate</h3><button class="modal-close" onclick="DL.close()">${ICONS.close}</button></div>
    <div class="field"><label>Nume</label><input class="input" id="rN" value="${esc(editing ? editing.name : '')}" placeholder="Ex. Hidratare"/></div>
    <div class="field"><label>Descriere</label><input class="input" id="rD" value="${esc(editing ? editing.desc : '')}" placeholder="Ex. 1 pahar cu apă"/></div>
    <div class="grid-2">
      <div class="field"><label>Interval</label><select class="input" id="rS">
        <option value="morning" ${slot==='morning'?'selected':''}>Dimineață (8–12)</option>
        <option value="noon"    ${slot==='noon'?'selected':''}>Amiază (12–17)</option>
        <option value="evening" ${slot==='evening'?'selected':''}>Seară (17–22)</option>
      </select></div>
      <div class="field"><label>Durată (min)</label><input class="input" id="rM" type="number" min="1" max="120" value="${editing ? editing.duration : 5}"/></div>
    </div>
    <div class="field"><label>Culoare</label><select class="input" id="rC">
      ${['green','blue','amber','purple','pink','cyan','red'].map(c => `<option value="${c}" ${editing && editing.color===c?'selected':''}>${c}</option>`).join('')}
    </select></div>
    <button class="btn primary block" id="rSave">${editing ? 'Salvează' : 'Adaugă'}</button>
  `);
  $('#rSave').onclick = () => {
    const name = $('#rN').value.trim();
    const desc = $('#rD').value.trim();
    const duration = parseInt($('#rM').value, 10) || 5;
    const color = $('#rC').value;
    const slot = $('#rS').value;
    if (!name) return toast('Numele e obligatoriu');
    if (editing) Object.assign(editing, { name, desc, duration, color, slot });
    else state.routine_items.push({ id: uid(), name, desc, duration, color, slot, icon: 'list' });
    save(); closeModal(); toast(editing ? 'Actualizat' : 'Adăugat'); render();
  };
}

// —— Sleep actions ——
ACTIONS['sleep-tab'] = (el) => { viewState.tab = el.dataset.tab; render(); };
ACTIONS['add-sleep'] = () => openSleepModal();
function openSleepModal() {
  const iso = todayISO();
  const e = getEntry(iso);
  const s = e.sleep || { bedtime: '23:00', wakeup: '06:45', deep_min: 90, light_min: 220, rem_min: 60, awakenings: 2 };
  openModal(`
    <div class="modal-head"><h3>Adaugă somn</h3><button class="modal-close" onclick="DL.close()">${ICONS.close}</button></div>
    <div class="grid-2">
      <div class="field"><label>Culcat</label><input class="input" id="sBed" type="time" value="${s.bedtime}"/></div>
      <div class="field"><label>Trezit</label><input class="input" id="sWake" type="time" value="${s.wakeup}"/></div>
    </div>
    <div class="grid-3">
      <div class="field"><label>Profund (min)</label><input class="input" id="sDeep" type="number" min="0" max="600" value="${s.deep_min}"/></div>
      <div class="field"><label>Ușor (min)</label><input class="input" id="sLight" type="number" min="0" max="600" value="${s.light_min}"/></div>
      <div class="field"><label>REM (min)</label><input class="input" id="sRem" type="number" min="0" max="300" value="${s.rem_min}"/></div>
    </div>
    <div class="field"><label>Treziri</label><input class="input" id="sWk" type="number" min="0" max="20" value="${s.awakenings}"/></div>
    <button class="btn primary block" id="sSave">Salvează</button>
  `);
  $('#sSave').onclick = () => {
    const bedtime = $('#sBed').value, wakeup = $('#sWake').value;
    const deep_min = parseInt($('#sDeep').value, 10) || 0;
    const light_min = parseInt($('#sLight').value, 10) || 0;
    const rem_min = parseInt($('#sRem').value, 10) || 0;
    const awakenings = parseInt($('#sWk').value, 10) || 0;
    const total = deep_min + light_min + rem_min;
    e.sleep = { bedtime, wakeup, deep_min, light_min, rem_min, awakenings, total_min: total };
    save(); closeModal(); toast('Somn salvat'); render();
  };
}

// —— Mood actions ——
ACTIONS['mood-rate'] = (el) => {
  const r = parseInt(el.dataset.r, 10);
  const e = todayEntry();
  const cur = e.mood || { rating: r, energy: 60, stress: 40, note: '' };
  cur.rating = r;
  e.mood = cur;
  save();
  $$('.mood-btn').forEach(b => b.classList.toggle('is-active', parseInt(b.dataset.r, 10) === r));
};
ACTIONS['mood-save'] = () => {
  const e = todayEntry();
  const cur = e.mood || { rating: 3, energy: 60, stress: 40, note: '' };
  cur.energy = parseInt($('#energySlider').value, 10);
  cur.stress = parseInt($('#stressSlider').value, 10);
  cur.note = $('#moodNote').value.trim();
  e.mood = cur;
  save(); toast('Salvat ✓');
  notify('Stare zilnică salvată', `${moodLabel(cur.rating)} · energie ${cur.energy}%`);
};

// —— Nutrition actions ——
ACTIONS['nut-prev'] = () => { const cur = viewState.date || todayISO(); viewState.date = isoOffset(-1, cur); render(); };
ACTIONS['nut-next'] = () => {
  const cur = viewState.date || todayISO();
  const t = todayISO();
  const nxt = isoOffset(1, cur);
  if (nxt > t) return;
  viewState.date = nxt; render();
};
ACTIONS['water-add'] = (el) => {
  const ml = parseInt(el.dataset.ml, 10) || 250;
  const e = getEntry(viewState.date || todayISO());
  if (!e.nutrition) e.nutrition = { meals: [], water_ml: 0, totals: { kcal:0, protein:0, carbs:0, fat:0 } };
  e.nutrition.water_ml = (e.nutrition.water_ml || 0) + ml;
  save(); toast(`+${ml} ml apă`); render();
};
ACTIONS['water-reset'] = () => {
  const e = getEntry(viewState.date || todayISO());
  if (e.nutrition) e.nutrition.water_ml = 0;
  save(); render();
};
ACTIONS['add-meal'] = () => openMealModal();
ACTIONS['del-meal'] = (el) => {
  const id = el.dataset.id;
  const e = getEntry(viewState.date || todayISO());
  const n = e.nutrition;
  if (!n) return;
  const m = n.meals.find(x => x.id === id);
  if (!m) return;
  n.meals = n.meals.filter(x => x.id !== id);
  n.totals.kcal    = Math.max(0, (n.totals.kcal||0)    - (m.kcal||0));
  n.totals.protein = Math.max(0, (n.totals.protein||0) - (m.protein||0));
  n.totals.carbs   = Math.max(0, (n.totals.carbs||0)   - (m.carbs||0));
  n.totals.fat     = Math.max(0, (n.totals.fat||0)     - (m.fat||0));
  save(); toast('Șters'); render();
};
function openMealModal() {
  const iso = viewState.date || todayISO();
  openModal(`
    <div class="modal-head"><h3>Adaugă masă</h3><button class="modal-close" onclick="DL.close()">${ICONS.close}</button></div>
    <div class="field"><label>Nume</label><input class="input" id="mN" placeholder="Ex. Mic dejun · omletă"/></div>
    <div class="grid-2">
      <div class="field"><label>Ora</label><input class="input" id="mT" type="time" value="${pad2(new Date().getHours())}:${pad2(new Date().getMinutes())}"/></div>
      <div class="field"><label>Calorii</label><input class="input" id="mK" type="number" min="0" placeholder="450"/></div>
    </div>
    <div class="grid-3">
      <div class="field"><label>Proteine (g)</label><input class="input" id="mP" type="number" min="0" placeholder="25"/></div>
      <div class="field"><label>Carbo (g)</label><input class="input" id="mC" type="number" min="0" placeholder="55"/></div>
      <div class="field"><label>Grăsimi (g)</label><input class="input" id="mF" type="number" min="0" placeholder="12"/></div>
    </div>
    <button class="btn primary block" id="mSave">Adaugă</button>
  `);
  $('#mSave').onclick = () => {
    const meal = {
      id: uid(),
      name: $('#mN').value.trim() || 'Masă',
      time: $('#mT').value || '',
      kcal: parseInt($('#mK').value, 10) || 0,
      protein: parseInt($('#mP').value, 10) || 0,
      carbs: parseInt($('#mC').value, 10) || 0,
      fat: parseInt($('#mF').value, 10) || 0,
    };
    const e = getEntry(iso);
    if (!e.nutrition) e.nutrition = { meals: [], water_ml: 0, totals: { kcal:0, protein:0, carbs:0, fat:0 } };
    if (!e.nutrition.totals) e.nutrition.totals = { kcal:0, protein:0, carbs:0, fat:0 };
    e.nutrition.meals.push(meal);
    e.nutrition.totals.kcal    += meal.kcal;
    e.nutrition.totals.protein += meal.protein;
    e.nutrition.totals.carbs   += meal.carbs;
    e.nutrition.totals.fat     += meal.fat;
    save(); closeModal(); toast('Masă adăugată'); render();
  };
}

// —— Activity actions ——
ACTIONS['act-tab'] = (el) => { viewState.tab = el.dataset.tab; render(); };
ACTIONS['add-activity'] = () => openActivityModal();
ACTIONS['start-workout'] = () => openWorkoutModal();
function openActivityModal() {
  const e = todayEntry();
  const a = e.activity || { steps: 0, distance_km: 0, calories: 0, active_min: 0, hourly: Array(24).fill(0), workouts: [] };
  openModal(`
    <div class="modal-head"><h3>Actualizează activitate</h3><button class="modal-close" onclick="DL.close()">${ICONS.close}</button></div>
    <div class="grid-2">
      <div class="field"><label>Pași</label><input class="input" id="aS" type="number" min="0" value="${a.steps}"/></div>
      <div class="field"><label>Distanță (km)</label><input class="input" id="aD" type="number" step="0.1" min="0" value="${a.distance_km}"/></div>
      <div class="field"><label>Calorii</label><input class="input" id="aK" type="number" min="0" value="${a.calories}"/></div>
      <div class="field"><label>Timp activ (min)</label><input class="input" id="aM" type="number" min="0" value="${a.active_min}"/></div>
    </div>
    <button class="btn primary block" id="aSave">Salvează</button>
  `);
  $('#aSave').onclick = () => {
    a.steps = parseInt($('#aS').value, 10) || 0;
    a.distance_km = parseFloat($('#aD').value) || 0;
    a.calories = parseInt($('#aK').value, 10) || 0;
    a.active_min = parseInt($('#aM').value, 10) || 0;
    if (!a.hourly || !a.hourly.length) a.hourly = Array(24).fill(0);
    if (!a.workouts) a.workouts = [];
    e.activity = a;
    save(); closeModal(); toast('Salvat'); render();
  };
}
function openWorkoutModal() {
  openModal(`
    <div class="modal-head"><h3>Antrenament nou</h3><button class="modal-close" onclick="DL.close()">${ICONS.close}</button></div>
    <div class="field"><label>Tip</label><select class="input" id="wT">
      <option>Alergare</option><option>Ciclism</option><option>Yoga</option><option>Forță</option><option>Înot</option><option>Mers</option>
    </select></div>
    <div class="grid-2">
      <div class="field"><label>Durată (min)</label><input class="input" id="wD" type="number" min="1" value="30"/></div>
      <div class="field"><label>Calorii</label><input class="input" id="wK" type="number" min="0" value="250"/></div>
    </div>
    <button class="btn primary block" id="wSave">Salvează antrenament</button>
  `);
  $('#wSave').onclick = () => {
    const e = todayEntry();
    const a = e.activity;
    if (!a.workouts) a.workouts = [];
    const type = $('#wT').value;
    const duration = parseInt($('#wD').value, 10) || 30;
    const calories = parseInt($('#wK').value, 10) || 0;
    a.workouts.push({ id: uid(), type, duration, calories, time: `${pad2(new Date().getHours())}:${pad2(new Date().getMinutes())}` });
    a.active_min = (a.active_min || 0) + duration;
    a.calories = (a.calories || 0) + calories;
    save(); closeModal(); toast('Antrenament salvat'); notify('Antrenament înregistrat', `${type} · ${duration} min`); render();
  };
}

// —— Journal actions ——
ACTIONS['j-day']       = (el) => { viewState.date = el.dataset.iso; render(); };
ACTIONS['add-journal'] = ()   => openJournalModal(null, viewState.date || todayISO());
ACTIONS['edit-journal']= (el) => openJournalModal(el.dataset.id, el.dataset.date);
function openJournalModal(id, iso) {
  iso = iso || todayISO();
  const e = getEntry(iso);
  const existing = id ? e.journal.find(j => j.id === id) : null;
  openModal(`
    <div class="modal-head"><h3>${existing ? 'Editează' : 'Adaugă'} intrare</h3><button class="modal-close" onclick="DL.close()">${ICONS.close}</button></div>
    <div class="subtitle mb-10">${fmtDateFull(iso)}</div>
    <div class="field"><label>Titlu</label><input class="input" id="jT" value="${esc(existing ? existing.title : '')}" placeholder="Ex. Reflecția zilei"/></div>
    <div class="field"><label>Notă</label><textarea class="input" id="jB" style="min-height:160px" placeholder="Ce s-a întâmplat, ce simți?">${esc(existing ? existing.body : '')}</textarea></div>
    <div class="row" style="gap:8px">
      <button class="btn primary block" id="jSave">${existing ? 'Salvează' : 'Adaugă'}</button>
      ${existing ? `<button class="btn danger" id="jDel">${ICONS.trash}</button>` : ''}
    </div>
  `);
  $('#jSave').onclick = () => {
    const title = $('#jT').value.trim() || 'Intrare';
    const body  = $('#jB').value.trim();
    const time  = `${pad2(new Date().getHours())}:${pad2(new Date().getMinutes())}`;
    if (existing) { existing.title = title; existing.body = body; }
    else e.journal.push({ id: uid(), title, body, time, ts: Date.now() });
    save(); closeModal(); toast('Intrare salvată'); render();
  };
  if (existing) $('#jDel').onclick = () => {
    e.journal = e.journal.filter(j => j.id !== id);
    save(); closeModal(); toast('Șters'); render();
  };
}

// —— Habits actions ——
ACTIONS['hab-tab'] = (el) => { viewState.tab = el.dataset.tab; render(); };
ACTIONS['toggle-habit'] = (el) => {
  const id = el.dataset.id;
  const e = todayEntry();
  const arr = e.habits_done;
  const idx = arr.indexOf(id);
  if (idx >= 0) arr.splice(idx, 1); else arr.push(id);
  save();
  toast(idx >= 0 ? 'Anulat' : 'Bifat ✓');
  render();
};
ACTIONS['add-habit']  = () => openHabitModal();
ACTIONS['edit-habit'] = (el) => openHabitModal(el.dataset.id);
ACTIONS['archive-habit'] = (el) => {
  const h = state.habits.find(x => x.id === el.dataset.id);
  if (!h) return;
  h.archived = !h.archived;
  save(); toast(h.archived ? 'Arhivat' : 'Reactivat'); render();
};
function openHabitModal(id) {
  const editing = id ? state.habits.find(h => h.id === id) : null;
  openModal(`
    <div class="modal-head"><h3>${editing ? 'Editează' : 'Adaugă'} obicei</h3><button class="modal-close" onclick="DL.close()">${ICONS.close}</button></div>
    <div class="field"><label>Nume</label><input class="input" id="hN" value="${esc(editing ? editing.name : '')}" placeholder="Ex. Meditez 10 min"/></div>
    <div class="grid-2">
      <div class="field"><label>Frecvență</label><select class="input" id="hF">
        <option value="daily" ${editing && editing.freq==='daily'?'selected':''}>Zilnic</option>
        <option value="weekdays" ${editing && editing.freq==='weekdays'?'selected':''}>Zile lucrătoare</option>
        <option value="weekly" ${editing && editing.freq==='weekly'?'selected':''}>Săptămânal</option>
      </select></div>
      <div class="field"><label>Culoare</label><select class="input" id="hC">
        ${['green','blue','amber','purple','pink','cyan','red'].map(c => `<option value="${c}" ${editing && editing.color===c?'selected':''}>${c}</option>`).join('')}
      </select></div>
    </div>
    <div class="row" style="gap:8px">
      <button class="btn primary block" id="hSave">${editing ? 'Salvează' : 'Adaugă'}</button>
      ${editing ? `<button class="btn danger" id="hDel">${ICONS.trash}</button>` : ''}
    </div>
  `);
  $('#hSave').onclick = () => {
    const name = $('#hN').value.trim();
    const freq = $('#hF').value;
    const color = $('#hC').value;
    if (!name) return toast('Numele e obligatoriu');
    if (editing) Object.assign(editing, { name, freq, color });
    else state.habits.push({ id: uid(), name, freq, color, started: todayISO(), archived: false });
    save(); closeModal(); toast(editing ? 'Salvat' : 'Adăugat'); render();
  };
  if (editing) $('#hDel').onclick = () => {
    confirmDialog('Ștergi definitiv acest obicei?', () => {
      state.habits = state.habits.filter(h => h.id !== id);
      Object.values(state.entries).forEach(e => { if (e.habits_done) e.habits_done = e.habits_done.filter(x => x !== id); });
      save(); closeModal(); toast('Șters'); render();
    });
  };
}

// —— Progress ——
ACTIONS['prog-period'] = (el) => { viewState.period = el.dataset.p; render(); };

// —— Stats ——
ACTIONS['stat-tab'] = (el) => { viewState.tab = el.dataset.tab; render(); };

// —— Relax ——
let relaxTimer = null;
ACTIONS['relax-start'] = (el) => {
  const id = el.dataset.id;
  const x = state.relax_items.find(i => i.id === id);
  if (!x) return;
  openRelaxTimer(x);
};
function openRelaxTimer(x) {
  let running = false;
  let secondsLeft = x.duration_min * 60;
  const isBreath = x.kind === 'breath';
  openModal(`
    <div class="modal-head"><h3>${esc(x.name)}</h3><button class="modal-close" onclick="DL.stopRelax();DL.close()">${ICONS.close}</button></div>
    <div class="subtitle" style="text-align:center;margin-bottom:6px">${esc(x.desc)}</div>
    <div class="timer-face ${isBreath ? 'pulse' : ''}" id="relaxFace">
      <div>
        <div class="t-time" id="relaxTime">${pad2(Math.floor(secondsLeft/60))}:${pad2(secondsLeft%60)}</div>
      </div>
      <div class="t-phase" id="relaxPhase">${isBreath ? 'Respiră...' : 'Gata de start'}</div>
    </div>
    <div class="row" style="justify-content:center;gap:12px;margin-top:14px">
      <button class="btn ghost" id="relaxReset">Reset</button>
      <button class="btn primary" id="relaxToggle">${ICONS.play}<span>Start</span></button>
    </div>
  `, { center: true });

  const face = $('#relaxFace');
  const timeEl = $('#relaxTime');
  const phaseEl = $('#relaxPhase');
  const toggle = $('#relaxToggle');
  const reset  = $('#relaxReset');

  const breathPhases = [ ['Inspiră', 4], ['Ține',  7], ['Expiră', 8] ];
  let bpIdx = 0, bpSec = 0;

  function tick() {
    if (!running) return;
    secondsLeft = max(0, secondsLeft - 1);
    timeEl.textContent = `${pad2(Math.floor(secondsLeft/60))}:${pad2(secondsLeft%60)}`;
    if (isBreath) {
      bpSec++;
      if (bpSec >= breathPhases[bpIdx][1]) { bpIdx = (bpIdx + 1) % breathPhases.length; bpSec = 0; }
      phaseEl.textContent = breathPhases[bpIdx][0] + '…';
    }
    if (secondsLeft <= 0) {
      running = false;
      clearInterval(relaxTimer);
      relaxTimer = null;
      toggle.innerHTML = ICONS.play + '<span>Reia</span>';
      phaseEl.textContent = 'Terminat ✓';
      toast('Exercițiu terminat');
      notify('Relaxare completată', `${x.name} · ${x.duration_min} min`);
    }
  }
  toggle.onclick = () => {
    running = !running;
    if (running) {
      relaxTimer = setInterval(tick, 1000);
      toggle.innerHTML = ICONS.pause + '<span>Pauză</span>';
      phaseEl.textContent = isBreath ? breathPhases[bpIdx][0] + '…' : 'În desfășurare';
    } else {
      clearInterval(relaxTimer); relaxTimer = null;
      toggle.innerHTML = ICONS.play + '<span>Continuă</span>';
      phaseEl.textContent = 'Pauză';
    }
  };
  reset.onclick = () => {
    clearInterval(relaxTimer); relaxTimer = null;
    running = false;
    secondsLeft = x.duration_min * 60;
    bpIdx = 0; bpSec = 0;
    timeEl.textContent = `${pad2(Math.floor(secondsLeft/60))}:${pad2(secondsLeft%60)}`;
    phaseEl.textContent = 'Gata de start';
    toggle.innerHTML = ICONS.play + '<span>Start</span>';
  };
}

// —— Settings ——
ACTIONS['edit-goals'] = () => {
  const g = state.goals;
  openModal(`
    <div class="modal-head"><h3>Obiective & preferințe</h3><button class="modal-close" onclick="DL.close()">${ICONS.close}</button></div>
    <div class="grid-2">
      <div class="field"><label>Pași / zi</label><input class="input" id="gS" type="number" min="1000" value="${g.steps}"/></div>
      <div class="field"><label>Apă (ml)</label><input class="input" id="gW" type="number" min="500" value="${g.water_ml}"/></div>
      <div class="field"><label>Somn (ore)</label><input class="input" id="gSl" type="number" min="4" max="12" step="0.5" value="${g.sleep_hours}"/></div>
      <div class="field"><label>Calorii</label><input class="input" id="gK" type="number" min="800" value="${g.kcal}"/></div>
      <div class="field"><label>Proteine (g)</label><input class="input" id="gP" type="number" min="30" value="${g.protein}"/></div>
      <div class="field"><label>Carbo (g)</label><input class="input" id="gC" type="number" min="50" value="${g.carbs}"/></div>
      <div class="field"><label>Grăsimi (g)</label><input class="input" id="gF" type="number" min="20" value="${g.fat}"/></div>
    </div>
    <button class="btn primary block" id="gSave">Salvează</button>
  `);
  $('#gSave').onclick = () => {
    g.steps = parseInt($('#gS').value, 10) || g.steps;
    g.water_ml = parseInt($('#gW').value, 10) || g.water_ml;
    g.sleep_hours = parseFloat($('#gSl').value) || g.sleep_hours;
    g.kcal = parseInt($('#gK').value, 10) || g.kcal;
    g.protein = parseInt($('#gP').value, 10) || g.protein;
    g.carbs = parseInt($('#gC').value, 10) || g.carbs;
    g.fat = parseInt($('#gF').value, 10) || g.fat;
    save(); closeModal(); toast('Obiective salvate'); render();
  };
};
ACTIONS['edit-notifs'] = () => {
  const p = state.prefs;
  openModal(`
    <div class="modal-head"><h3>Mementouri</h3><button class="modal-close" onclick="DL.close()">${ICONS.close}</button></div>
    <div class="field"><label>Rutina de dimineață</label><input class="input" id="nM" type="time" value="${p.morning_reminder}"/></div>
    <div class="field"><label>Somn</label><input class="input" id="nS" type="time" value="${p.sleep_reminder}"/></div>
    <div class="row" style="gap:8px;margin-top:10px">
      <label style="display:flex;align-items:center;gap:8px;font-size:14px;color:var(--text-mid)">
        <input type="checkbox" id="nOn" ${p.notifications ? 'checked' : ''}/> Activate
      </label>
    </div>
    <button class="btn primary block" id="nSave" style="margin-top:12px">Salvează</button>
  `);
  $('#nSave').onclick = async () => {
    p.morning_reminder = $('#nM').value;
    p.sleep_reminder = $('#nS').value;
    p.notifications = $('#nOn').checked;
    if (p.notifications && 'Notification' in window && Notification.permission !== 'granted') {
      try { await Notification.requestPermission(); } catch (e) {}
    }
    save(); closeModal(); toast('Mementouri salvate');
  };
};
ACTIONS['devices'] = () => openInfoModal('Dispozitive conectate',
  'Nu ai dispozitive conectate.\n\nDragon Life poate primi date de la ceasuri și brățări prin standardul Web Bluetooth. Această integrare va fi disponibilă curând.');
ACTIONS['privacy'] = () => openInfoModal('Confidențialitate',
  'Datele tale sunt stocate LOCAL pe acest dispozitiv, în LocalStorage.\n\n• Nimic nu este trimis către servere.\n• Poți exporta oricând datele.\n• Le poți șterge complet din Setări.');
ACTIONS['about'] = () => openInfoModal('Dragon Life · v1.0.0',
  'Sănătate & echilibru zilnic.\n\nAplicație PWA (Progressive Web App). Funcționează offline după prima încărcare.\n\nDate: LocalStorage · Notificări: OneSignal (opțional) + Notification API.\n\n© 2026');
ACTIONS['export'] = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `dragon-life-export-${todayISO()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast('Date exportate');
};
ACTIONS['reset-data'] = () => {
  confirmDialog('Sigur vrei să ștergi toate datele locale? Acțiunea nu poate fi anulată.', () => {
    localStorage.removeItem(STORAGE_KEY);
    state = load();
    seedDemoHistory();
    save();
    toast('Date șterse');
    go('dashboard');
  });
};
function openInfoModal(title, body) {
  openModal(`
    <div class="modal-head"><h3>${esc(title)}</h3><button class="modal-close" onclick="DL.close()">${ICONS.close}</button></div>
    <p style="white-space:pre-line;color:var(--text-mid);font-size:14px;line-height:1.5">${esc(body)}</p>
    <button class="btn block" style="margin-top:12px" onclick="DL.close()">Închide</button>
  `, { center: true });
}

// ─── notifications tray ────────────────────────────────────────────────────
function toggleNotifs() {
  const tray = $('#notifRoot');
  if (!tray.hidden) { tray.hidden = true; return; }
  const items = state.notifs.slice(0, 10);
  tray.innerHTML = items.length ? items.map(n => `
    <div class="notif-item">
      <div class="n-title">${esc(n.title)}</div>
      <div class="n-body">${esc(n.body)}</div>
      <div class="n-time">${new Date(n.ts).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  `).join('') : `<div class="empty" style="padding:16px"><div class="em-hint">Nicio notificare</div></div>`;
  tray.hidden = false;
  $('#bellDot').hidden = true;
}

// ─── init ───────────────────────────────────────────────────────────────────
function initShellWiring() {
  $('#btnMenu').onclick = () => $('#sidebar').classList.add('open');
  $('#sidebarScrim').onclick = () => $('#sidebar').classList.remove('open');
  $('#btnBell').onclick = toggleNotifs;
  document.addEventListener('click', (e) => {
    const tray = $('#notifRoot');
    if (!tray.hidden && !e.target.closest('#notifRoot') && !e.target.closest('#btnBell')) tray.hidden = true;
  });
  // sidebar / bottom nav (delegated)
  document.addEventListener('click', (e) => {
    const item = e.target.closest('.side-item, .nav-btn');
    if (!item) return;
    e.preventDefault();
    const view = item.dataset.view;
    if (!view) return;
    go(view);
    $('#sidebar').classList.remove('open');
  });
  // route from hash
  window.addEventListener('hashchange', () => {
    const v = location.hash.replace('#','');
    if (v && v !== currentView) go(v);
  });
  const initV = location.hash.replace('#','') || 'dashboard';
  go(initV);
}

function handleAction(action, el, ev) {
  const fn = ACTIONS[action];
  if (fn) fn(el, ev);
}

function updateStreak() {
  const t = todayISO();
  if (state.meta.last_seen !== t) {
    const yesterday = isoOffset(-1);
    state.meta.streak_days = state.meta.last_seen === yesterday ? (state.meta.streak_days || 0) + 1 : 1;
    state.meta.last_seen = t;
    save();
  }
}

function localReminderTick() {
  if (!state.prefs.notifications || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  const hhmm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  const key = todayISO() + ':' + hhmm;
  if (state.meta.last_notif === key) return;
  if (hhmm === state.prefs.morning_reminder) {
    new Notification('Rutina de dimineață', { body: 'Începe ziua cu calm și intenție.' });
    notify('Rutina de dimineață', 'E timpul să începi ziua cu calm.');
    state.meta.last_notif = key; save();
  } else if (hhmm === state.prefs.sleep_reminder) {
    new Notification('Timp de somn', { body: 'Pregătește-te pentru un somn odihnitor.' });
    notify('Timp de somn', 'Pregătește-te pentru un somn odihnitor.');
    state.meta.last_notif = key; save();
  }
}

// public helpers for inline onclick
window.DL = {
  close: closeModal,
  stopRelax: () => { if (relaxTimer) { clearInterval(relaxTimer); relaxTimer = null; } },
};

document.addEventListener('DOMContentLoaded', () => {
  state = load();
  save();
  updateStreak();
  initShellWiring();
  setInterval(localReminderTick, 60 * 1000);
});

})();
