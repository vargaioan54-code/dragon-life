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

// Curated pool of quotes with psychological tags (RO). User likes/dislikes,
// app reads dominant tags + average energy to infer mood.
const QUOTES = [
  { text: 'Fericirea nu e ceva de-a gata. Vine din propriile tale acțiuni.',                  author: 'Dalai Lama',        tags: ['motivat','calm','acțiune'],    energy: 70 },
  { text: 'Nu putem controla vântul, dar putem regla pânzele.',                                 author: 'Aristotel',          tags: ['adaptare','calm','curajos'],    energy: 65 },
  { text: 'Cine îți cunoaște umbra, își cunoaște lumina.',                                    author: 'Carl Jung',          tags: ['reflexiv','profund'],           energy: 45 },
  { text: 'Cel mai bun moment să plantezi un copac a fost acum 20 de ani. Al doilea, e azi.',    author: 'Proverb chinezesc',  tags: ['motivat','acțiune','curajos'], energy: 80 },
  { text: 'Nu contează cât de încet mergi, atâta timp cât nu te oprești.',                        author: 'Confucius',          tags: ['perseverență','calm'],         energy: 60 },
  { text: 'Universul nu se grăbește; și totuși, totul se îndeplinește.',                        author: 'Lao Tzu',            tags: ['calm','răbdare','reflexiv'],   energy: 40 },
  { text: 'Fii tu însuți. Toți ceilalți sunt deja luați.',                                       author: 'Oscar Wilde',        tags: ['curajos','autentic'],           energy: 75 },
  { text: 'Viața e 10% ce se întâmplă și 90% cum reacționezi.',                                  author: 'Charles Swindoll',   tags: ['acțiune','reflexiv'],           energy: 70 },
  { text: 'Cea mai grea bătălie e între cine ești și cine vrei să fii.',                          author: '—',                   tags: ['profund','motivat','curajos'],  energy: 65 },
  { text: 'Respiră. E doar o zi grea, nu o viață grea.',                                          author: '—',                   tags: ['calm','recunoscător'],          energy: 50 },
  { text: 'Recunoștința transformă puținul în suficient.',                                       author: '—',                   tags: ['recunoscător','calm'],           energy: 60 },
  { text: 'Când nu poți controla ce se întâmplă, controlează cum răspunzi.',                       author: 'Epictet',            tags: ['calm','adaptare','curajos'],    energy: 65 },
  { text: 'Cel care are un DE CE poate suporta aproape orice CUM.',                                author: 'Nietzsche',          tags: ['motivat','profund','curajos'],  energy: 80 },
  { text: 'Liniștea e vocea Dumnezeirii.',                                                        author: 'Rumi',               tags: ['calm','reflexiv','profund'],    energy: 35 },
  { text: 'Cine se trezește devreme prinde ziua.',                                                author: 'Proverb',            tags: ['motivat','acțiune'],            energy: 85 },
  { text: 'Fericirea e un drum, nu o destinație.',                                                author: 'Buddha',             tags: ['calm','reflexiv','recunoscător'],energy: 55 },
  { text: 'Nu am fost triști pentru că nu am avut. Am fost triști pentru că nu am observat.',      author: '—',                   tags: ['reflexiv','recunoscător'],       energy: 45 },
  { text: 'Ai grijă de corp — e singurul loc în care trebuie să trăiești.',                        author: 'Jim Rohn',           tags: ['acțiune','recunoscător'],       energy: 70 },
  { text: 'Când nu știi ce să faci, fă următorul lucru corect.',                                  author: '—',                   tags: ['acțiune','curajos'],             energy: 65 },
  { text: 'Un zbor de o mie de mile începe cu un singur pas.',                                    author: 'Lao Tzu',            tags: ['motivat','răbdare','curajos'],  energy: 75 },
  { text: 'Nu te compara cu alții. Compară-te cu cine erai ieri.',                                author: 'Jordan Peterson',    tags: ['reflexiv','motivat'],           energy: 65 },
  { text: 'Blândețea e forță sub control.',                                                       author: '—',                   tags: ['calm','profund','curajos'],     energy: 55 },
  { text: 'Fă azi ce alții nu vor, pentru a trăi mâine cum alții nu pot.',                          author: 'Jerry Rice',         tags: ['motivat','acțiune'],            energy: 90 },
  { text: 'Zaharul și somnul sunt dușmani. Odihna și legumele sunt prieteni.',                     author: '—',                   tags: ['acțiune','recunoscător'],       energy: 60 },
  { text: 'Cel mai liniștit spirit are cea mai clară vedere.',                                     author: '—',                   tags: ['calm','reflexiv','profund'],    energy: 40 },
  { text: 'Încrederea nu vine din a avea toate răspunsurile, ci din a fi deschis la orice întrebare.', author: '—',                tags: ['curajos','reflexiv'],           energy: 65 },
  { text: 'Suferința trece. Faptul că ai supraviețuit rămâne.',                                    author: '—',                   tags: ['curajos','profund'],            energy: 55 },
  { text: 'Puţin câte puțin, pas cu pas.',                                                          author: 'Proverb',            tags: ['calm','răbdare'],                energy: 50 },
  { text: 'Alege pacea în locul dreptului de a avea dreptate.',                                   author: '—',                   tags: ['calm','profund'],               energy: 45 },
  { text: 'Fii apa. Curge, adaptează-te, răbdă.',                                                author: 'Bruce Lee',          tags: ['calm','adaptare','profund'],    energy: 50 },
];

const DEFAULT_HABITS = []; // empty — user builds their own

const DEFAULT_RELAX = []; // empty — user adds their own exercises

const DATA_VERSION = 'v2';

const DEFAULT_STATE = {
  goals: { steps: 10000, water_ml: 2500, sleep_hours: 8, kcal: 2200, protein: 150, carbs: 270, fat: 70, stress_max: 50 },
  prefs: {
    notifications: true,
    bedtime: '22:00',          // alarmă culcare — auto-logează sleep.bedtime pe ziua următoare
    wakeup:  '08:00',          // alarmă trezire — auto-logează sleep.wakeup pe ziua curentă
    smoke_shake: false,        // detectare 3× agitare pentru +1 țigară
    smoke_flash: false,        // blink lanternă pe fiecare țigară
  },
  routine_items: [],
  habits: [],
  relax_items: [],
  custom_cards: [],         // user-built Dashboard cards
  entries: {},              // { isoDate: { sleep, mood, nutrition, activity, routine, journal, habits_done } }
  meta: { last_seen: todayISO(), streak_days: 1, created_at: todayISO(), data_version: DATA_VERSION, started_at: null, push_id: null, scheduled: {}, notif_prompted: false },
  notifs: [],
  current_sleep: null,       // { bedtime_ts, bedtime_hhmm, iso_day } | null — live sleep session
};

function isStarted() { return !!(state.meta && state.meta.started_at); }
function requireStarted() {
  if (isStarted()) return true;
  toast('Apasă „Pornește” în Setări ca să începi contorizarea');
  return false;
}

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
    if (!merged.meta) merged.meta = { last_seen: todayISO(), streak_days: 1, created_at: todayISO(), data_version: DATA_VERSION };
    // One-time cleanup of the old seeded demo dataset
    if (merged.meta.data_version !== DATA_VERSION) {
      merged.entries = {};
      merged.routine_items = merged.routine_items.filter(it => !/^r(1[0-4]|[1-9])$/.test(it.id));
      merged.habits        = merged.habits.filter(h => !/^h[1-6]$/.test(h.id));
      merged.relax_items   = merged.relax_items.filter(x => !/^x[1-4]$/.test(x.id));
      merged.meta.data_version = DATA_VERSION;
      merged.meta.created_at = todayISO();
    }
    // Migrate legacy reminder keys
    if (merged.prefs.morning_reminder && !merged.prefs.wakeup)  merged.prefs.wakeup  = merged.prefs.morning_reminder;
    if (merged.prefs.sleep_reminder   && !merged.prefs.bedtime) merged.prefs.bedtime = merged.prefs.sleep_reminder;
    delete merged.prefs.morning_reminder;
    delete merged.prefs.sleep_reminder;
    if (!merged.prefs.bedtime) merged.prefs.bedtime = '22:00';
    if (!merged.prefs.wakeup)  merged.prefs.wakeup  = '08:00';
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
  smoke:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="14" width="14" height="4" rx="1"/><path d="M17 14v4M20 14v4M10 10c0-2 2-2 2-4M14 10c0-2 2-2 2-4"/></svg>`,
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
  smoking: 'Fumat',
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
  const smokingCount = e.smoking && e.smoking.entries ? e.smoking.entries.length : 0;
  const hr = new Date().getHours();
  const greet = hr < 5 ? 'Noapte liniștită' : hr < 12 ? 'Bună dimineața' : hr < 18 ? 'Bună ziua' : 'Bună seara';
  const isEmpty = !state.routine_items.length && !state.habits.length && !e.sleep && !e.mood && !e.nutrition && !e.activity && !state.custom_cards.length;

  const started = isStarted();

  return `
  <h1>${greet}! 👋</h1>
  <p class="subtitle">${!started ? 'Configurează app-ul, apoi apasă Pornește în Setări.' : isEmpty ? 'Personalizează app-ul după tine. Adaugă orice secțiune cu +' : 'Ai grijă de tine, în fiecare zi.'}</p>

  ${!started ? `
    <div class="card" style="border-color:var(--green);background:linear-gradient(135deg,rgba(34,197,94,.12),rgba(34,197,94,.03))">
      <div class="row" style="gap:12px;align-items:flex-start">
        <div class="m-icon">${ICONS.play}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:15px">Contorizarea e oprită</div>
          <div class="subtitle mt-6">Configurează obiceiurile, rutinele, orele de somn — apoi apasă <b>Pornește</b> în Setări. De atunci, totul se va înregistra doar cu date reale.</div>
        </div>
      </div>
      <button class="btn primary block mt-10" data-view="settings">${ICONS.play}<span>Deschide Setări</span></button>
    </div>
  ` : ''}

  <div class="grid-2 mt-14">
    <div class="metric card tap" data-view="sleep">
      <div class="m-icon blue">${ICONS.moon}</div>
      <div class="m-label">Somn</div>
      <div class="m-value">${sleepH}</div>
    </div>
    <div class="metric card tap" data-view="smoking">
      <div class="m-icon red">${ICONS.smoke}</div>
      <div class="m-label">Fumat</div>
      <div class="m-value">${smokingCount}</div>
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
    return `<div class="card" style="${isNow ? 'border-color:var(--green)' : ''}">
      <div class="row" style="gap:12px">
        <div class="m-icon ${meta.color}">${ICONS[iconName]}</div>
        <div style="flex:1;cursor:pointer" data-view="${view}">
          <div style="font-weight:600;font-size:14px">${esc(meta.title)} <span class="chip" style="margin-left:6px">${meta.hours}</span></div>
          <div class="subtitle">${done}/${items.length} pași completați</div>
        </div>
        <button class="icon-btn" data-action="add-routine" data-slot="${slot}" aria-label="Adaugă activitate" style="width:36px;height:36px">${ICONS.plus}</button>
      </div>
      <div class="pbar ${meta.color} mt-10" data-view="${view}" style="cursor:pointer"><i style="width:${(p*100).toFixed(0)}%"></i></div>
      <div class="spread mt-6" data-view="${view}" style="cursor:pointer">
        <div class="subtitle">Apăsă + pentru a adăuga o activitate</div>
        <div class="chip ${meta.color}">${Math.round(p * 100)}%</div>
      </div>
    </div>`;
  }).join('')}

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
      const timeTxt = item.start_time && item.end_time ? `${item.start_time}–${item.end_time}` : `${item.duration || 5} min`;
      return `<div class="list-row ${done ? 'done' : ''}" data-action="toggle-routine" data-id="${item.id}">
        <div class="icn ${done ? 'done' : ''}">${done ? ICONS.check : (ICONS[item.icon] || ICONS.check)}</div>
        <div>
          <div class="title">${esc(item.name)}</div>
          <div class="sub">${timeTxt}</div>
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

// —— Fumat (simplu) ——
VIEWS.smoking = function() {
  const e = todayEntry();
  const count = (e.smoking && e.smoking.entries) ? e.smoking.entries.length : 0;
  const startedApp = isStarted();
  return `
  <div class="row" style="gap:10px">
    <button class="icon-btn" data-action="back">${ICONS.back}</button>
    <div style="flex:1"></div>
    <div style="width:40px"></div>
  </div>

  <div class="card" style="text-align:center;padding:28px 18px">
    <div class="big" style="color:var(--red);font-size:56px">${count}</div>
    <div class="subtitle mt-6">azi</div>
    <button class="btn primary block mt-14" data-action="smoke-log" ${!startedApp ? 'disabled' : ''}>${ICONS.plus}<span>+1</span></button>
    ${count ? `<button class="btn ghost block" data-action="smoke-undo" style="margin-top:6px">Anulează</button>` : ''}
    <div class="subtitle mt-14"><a class="link" data-view="more" style="color:var(--green);cursor:pointer">Setări Fumat →</a></div>
  </div>
  `;
};

// —— Somn ——
function sleepLiveDuration() {
  const cs = state.current_sleep;
  if (!cs) return null;
  const min = Math.max(0, Math.round((Date.now() - cs.bedtime_ts) / 60000));
  return min;
}
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

  const cs = state.current_sleep;
  const liveMin = sleepLiveDuration();
  const startedApp = isStarted();

  return `
  <div class="row" style="gap:10px">
    <button class="icon-btn" data-action="back">${ICONS.back}</button>
    <div style="flex:1"></div>
    <button class="icon-btn" data-action="add-sleep" aria-label="Adaugă manual">${ICONS.plus}</button>
  </div>

  ${cs ? `
    <div class="card" style="border-color:var(--blue);background:linear-gradient(135deg,rgba(59,130,246,.14),transparent);text-align:center;padding:18px">
      <div class="m-icon blue" style="margin:0 auto 8px">${ICONS.moon}</div>
      <div style="font-weight:700;font-size:15px">Dormi de la ${cs.bedtime_hhmm}</div>
      <div class="big" style="color:var(--blue);margin-top:8px">${fmtDur(liveMin)}</div>
      <div class="subtitle">Apăsă când te trezești — se calculează totul</div>
      <button class="btn primary block mt-14" data-action="sleep-wake">${ICONS.sun}<span>M-am trezit</span></button>
      <button class="btn ghost block" data-action="sleep-cancel" style="margin-top:6px">Anulează somnul</button>
    </div>
  ` : `
    <div class="card" style="text-align:center;padding:18px">
      <div style="font-weight:700;font-size:15px">Ce faci acum?</div>
      <div class="subtitle mt-6">Apasă când te culci sau când te trezești — app-ul contorizează automat.</div>
      <div class="grid-2 mt-14">
        <button class="btn primary" data-action="sleep-bed" ${!startedApp ? 'disabled' : ''}>${ICONS.moon}<span>Mă culc</span></button>
        <button class="btn" data-action="sleep-wake" ${!startedApp ? 'disabled' : ''}>${ICONS.sun}<span>M-am trezit</span></button>
      </div>
      ${!startedApp ? '<div class="subtitle mt-10">Pornește contorizarea din Setări ca să folosești butoanele.</div>' : ''}
    </div>
  `}

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
function getQuotePool() {
  const e = todayEntry();
  const shown = new Set((e.quote_reactions || []).map(r => r.qi));
  const pool = QUOTES.map((_, i) => i).filter(i => !shown.has(i));
  if (pool.length < 3) return QUOTES.map((_, i) => i); // reshuffle
  // deterministic per-day random subset of 5
  const seed = parseInt(todayISO().replace(/-/g, ''), 10);
  const rng = (n) => (seed * (n+1) * 9301 + 49297) % 233280;
  return pool.sort((a,b) => rng(a) - rng(b)).slice(0, 5);
}
function moodReading(e) {
  const reactions = e.quote_reactions || [];
  const liked = reactions.filter(r => r.like);
  if (liked.length < 2) return null;
  const tagCount = {};
  let energySum = 0;
  liked.forEach(r => {
    const q = QUOTES[r.qi];
    if (!q) return;
    energySum += q.energy;
    q.tags.forEach(t => tagCount[t] = (tagCount[t] || 0) + 1);
  });
  const dominant = Object.entries(tagCount).sort((a,b) => b[1] - a[1]).slice(0, 3);
  const inferredEnergy = Math.round(energySum / liked.length);
  const readings = {
    'calm':          'Îi cauți liniștea — ești în echilibru interior.',
    'motivat':       'Ai foc în tine. Ești gata să acționezi.',
    'reflexiv':      'Ești într-un mod de contemplare, ți analizezi viața.',
    'acțiune':       'Vrei mișcare, să construiești ceva.',
    'curajos':       'Ești în modul "pot orice" — curaj și determinare.',
    'profund':       'Căuți sens, răspunsuri mari.',
    'recunoscător':  'Apreciezi ce ai — stare de recunoștință.',
    'răbdare':       'Accepți ritmul lucrurilor — nu forțezi.',
    'adaptare':      'Ești flexibil, gata să te adaptezi.',
    'autentic':      'Cauți să fii tu însuți fără compromisuri.',
    'perseverență':  'Nu te oprești — dedicație constantă.',
  };
  return {
    energy: inferredEnergy,
    tags: dominant.map(([t, c]) => ({ tag: t, count: c, msg: readings[t] || '' })),
    likedCount: liked.length,
  };
}

VIEWS.mood = function() {
  const iso = todayISO();
  const e = getEntry(iso);
  const cur = e.mood || { rating: 3, energy: 60, stress: 40, note: '' };
  const quotePool = getQuotePool();
  const reactions = e.quote_reactions || [];
  const reactedIds = new Set(reactions.map(r => r.qi));
  const reading = moodReading(e);
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
    <textarea class="input" id="moodNote" placeholder="">${esc(cur.note || '')}</textarea>
  </div>

  <button class="btn primary block" data-action="mood-save">Salvează</button>

  <div class="section-title"><h2>Citate care rezonează cu tine</h2></div>
  <p class="subtitle mb-10">Dă ❤️ la ce simți, ✕ la ce nu. După câteva reacții app-ul îți citește starea.</p>
  ${quotePool.filter(qi => !reactedIds.has(qi)).map(qi => {
    const q = QUOTES[qi];
    return `<div class="card quote">
      <div style="font-size:15px;line-height:1.45;color:var(--text)">„${esc(q.text)}”</div>
      <div class="subtitle mt-6">— ${esc(q.author)}</div>
      <div class="row" style="gap:8px;margin-top:12px;justify-content:flex-end">
        <button class="btn ghost" data-action="quote-react" data-qi="${qi}" data-like="0">${ICONS.close}<span>Nu</span></button>
        <button class="btn primary" data-action="quote-react" data-qi="${qi}" data-like="1">${ICONS.heart}<span>Rezonează</span></button>
      </div>
    </div>`;
  }).join('') || `<div class="empty"><div class="em-emoji">🌟</div><div class="em-title">Ai reacționat la toate azi</div><div class="em-hint">Mai vin altele mâine.</div></div>`}

  ${reading ? `
    <div class="section-title"><h2>Citirea stării tale</h2><span class="chip green">${reading.likedCount} rezonanțe</span></div>
    <div class="card">
      <div class="row" style="gap:12px;align-items:flex-start">
        <div class="m-icon amber">${ICONS.bolt}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:14px">Nivel energie inferat</div>
          <div class="subtitle">${reading.energy}% — pe baza citatelor care rezonează</div>
          <div class="pbar mt-6"><i style="width:${reading.energy}%"></i></div>
        </div>
      </div>
      <div class="divider"></div>
      <div style="font-weight:600;font-size:13px;margin-bottom:6px">Stările care te definesc azi</div>
      ${reading.tags.map(t => `<div style="padding:6px 0">
        <div class="spread"><span class="chip purple" style="text-transform:capitalize">${esc(t.tag)}</span><span class="subtitle">×${t.count}</span></div>
        ${t.msg ? `<div class="subtitle mt-6">${esc(t.msg)}</div>` : ''}
      </div>`).join('')}
      <button class="btn ghost block mt-10" data-action="apply-reading">${ICONS.check}<span>Aplică pe slidere</span></button>
      <button class="btn ghost block" data-action="reset-quotes" style="margin-top:6px">${ICONS.trash}<span>Șterge reacțiile</span></button>
    </div>
  ` : reactions.length > 0 ? `
    <div class="card"><div class="subtitle">Mai dă ❤️ la încă ${Math.max(1, 2 - (reading ? reading.likedCount : reactions.filter(r=>r.like).length))} citate ca să pot citi starea.</div></div>
  ` : ''}

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
  const started = isStarted();
  const sdate = started ? state.meta.started_at : null;
  const sinceTxt = sdate ? fmtDateFull(sdate.slice(0,10)) : '';
  return `
  <div class="row" style="gap:10px">
    <button class="icon-btn" data-action="back">${ICONS.back}</button>
    <div style="flex:1"></div>
    <div style="width:40px"></div>
  </div>

  ${started ? `
    <div class="card" style="border-color:var(--green);background:linear-gradient(135deg,rgba(34,197,94,.1),transparent)">
      <div class="row" style="gap:12px">
        <div class="m-icon">${ICONS.check}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:14px">Contorizare activă</div>
          <div class="subtitle mt-6">Pornită pe ${sinceTxt}. Toate datele se înregistrează doar din acest moment.</div>
        </div>
      </div>
      <button class="btn ghost block mt-10" data-action="stop-tracking">${ICONS.pause}<span>Oprire contorizare</span></button>
    </div>
  ` : `
    <div class="card" style="border-color:var(--amber);background:linear-gradient(135deg,rgba(245,158,11,.12),transparent)">
      <div class="row" style="gap:12px">
        <div class="m-icon amber">${ICONS.play}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:14px">Contorizare oprită</div>
          <div class="subtitle mt-6">Configurează obiceiuri, rutine, alarme, obiective — apoi apasă Pornește.</div>
        </div>
      </div>
      <button class="btn primary block mt-10" data-action="start-tracking">${ICONS.play}<span>Pornește contorizarea</span></button>
    </div>
  `}

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
  const shakeToggle = $('#shakeToggle'); if (shakeToggle) shakeToggle.onchange = async () => {
    if (shakeToggle.checked) {
      const ok = await requestShakePermission();
      if (!ok) { shakeToggle.checked = false; toast('Permisiune de mișcare refuzată'); return; }
      state.prefs.smoke_shake = true; save(); startShakeDetection();
      toast('Detecție activă — agită 5×');
    } else {
      state.prefs.smoke_shake = false; save(); stopShakeDetection();
      toast('Detecție oprită');
    }
  };
  const flashToggle = $('#flashToggle'); if (flashToggle) flashToggle.onchange = async () => {
    if (flashToggle.checked) {
      const ok = await requestFlashlight();
      if (!ok) { flashToggle.checked = false; return; }
      state.prefs.smoke_flash = true; save();
      toast('Lanternă gata — va clipi la fiecare țigară');
      blinkFlashlight(1, 200);
    } else {
      state.prefs.smoke_flash = false; save(); releaseFlashlight();
      toast('Lanternă dezactivată');
    }
  };
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
    <div class="field"><label>Titlu</label><input class="input" id="ccT" value="${esc(cur.title)}" placeholder=""/></div>
    <div class="field"><label>Subtitlu (opțional)</label><input class="input" id="ccS" value="${esc(cur.subtitle)}" placeholder=""/></div>
    <div class="grid-2">
      <div class="field"><label>Icon</label><select class="input" id="ccI">${CARD_ICONS.map(k => `<option value="${k}" ${cur.icon===k?'selected':''}>${k}</option>`).join('')}</select></div>
      <div class="field"><label>Culoare</label><select class="input" id="ccC">${CARD_COLORS.map(k => `<option value="${k}" ${cur.color===k?'selected':''}>${k}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>Acțiune la tap</label><select class="input" id="ccL">${CARD_LINKS.map(([v,l]) => `<option value="${v}" ${cur.link===v?'selected':''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label>Notă (opțional, apare la tap dacă n-are link)</label><textarea class="input" id="ccN" placeholder="">${esc(cur.note)}</textarea></div>
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
  if (!requireStarted()) return;
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
async function afterRoutineChange() { try { await syncRoutinePushes(); } catch(e){} }
function slotDefaultStart(slot) {
  return { morning: '08:00', noon: '12:00', evening: '17:00' }[slot] || '08:00';
}
function addMinutesToTime(hhmm, minutes) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24, nm = total % 60;
  return `${pad2(nh)}:${pad2(nm)}`;
}
function minutesFromTimes(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return diff;
}
function openRoutineModal(editId, defaultSlot) {
  const editing = editId ? state.routine_items.find(x => x.id === editId) : null;
  const slot = editing ? editing.slot : (defaultSlot || currentSlot());
  const startVal = editing && editing.start_time ? editing.start_time : slotDefaultStart(slot);
  const endVal   = editing && editing.end_time ? editing.end_time : addMinutesToTime(startVal, editing ? (editing.duration || 15) : 15);
  openModal(`
    <div class="modal-head"><h3>${editing ? 'Editează' : 'Adaugă'} activitate</h3><button class="modal-close" onclick="DL.close()">${ICONS.close}</button></div>
    <div class="field"><label>Nume</label><input class="input" id="rN" value="${esc(editing ? editing.name : '')}" placeholder=""/></div>
    <div class="field"><label>Interval</label><select class="input" id="rS">
      <option value="morning" ${slot==='morning'?'selected':''}>Dimineață (8–12)</option>
      <option value="noon"    ${slot==='noon'?'selected':''}>Amiază (12–17)</option>
      <option value="evening" ${slot==='evening'?'selected':''}>Seară (17–22)</option>
    </select></div>
    <div class="grid-2">
      <div class="field"><label>Ora de început</label><input class="input" id="rStart" type="time" value="${startVal}"/></div>
      <div class="field"><label>Ora de sfârșit</label><input class="input" id="rEnd" type="time" value="${endVal}"/></div>
    </div>
    <button class="btn primary block" id="rSave">${editing ? 'Salvează' : 'Adaugă'}</button>
  `);
  // when slot changes, snap start time to slot start
  $('#rS').addEventListener('change', () => {
    const newSlot = $('#rS').value;
    const s = slotDefaultStart(newSlot);
    const currDur = minutesFromTimes($('#rStart').value, $('#rEnd').value);
    $('#rStart').value = s;
    $('#rEnd').value = addMinutesToTime(s, currDur || 15);
  });
  // when start changes, keep the same duration on end
  let lastStart = startVal, lastEnd = endVal;
  $('#rStart').addEventListener('change', () => {
    const dur = minutesFromTimes(lastStart, lastEnd);
    lastStart = $('#rStart').value;
    $('#rEnd').value = addMinutesToTime(lastStart, dur || 15);
    lastEnd = $('#rEnd').value;
  });
  $('#rEnd').addEventListener('change', () => { lastEnd = $('#rEnd').value; });
  $('#rSave').onclick = () => {
    const name = $('#rN').value.trim();
    const slot = $('#rS').value;
    const start_time = $('#rStart').value;
    const end_time   = $('#rEnd').value;
    const duration   = minutesFromTimes(start_time, end_time);
    if (!name) return toast('Numele e obligatoriu');
    const defaultColor = { morning: 'amber', noon: 'green', evening: 'purple' }[slot] || 'green';
    if (editing) Object.assign(editing, { name, desc: '', duration, color: editing.color || defaultColor, slot, start_time, end_time });
    else state.routine_items.push({ id: uid(), name, desc: '', duration, color: defaultColor, slot, start_time, end_time, icon: 'list' });
    save(); closeModal(); toast(editing ? 'Actualizat' : 'Adăugat'); render();
    afterRoutineChange();
  };
}

// —— Sleep actions ——
ACTIONS['sleep-tab'] = (el) => { viewState.tab = el.dataset.tab; render(); };
ACTIONS['add-sleep'] = () => openSleepModal();

// —— Smoking ——
ACTIONS['smoke-log'] = (el, ev, opts = {}) => {
  if (!requireStarted()) return;
  const e = todayEntry();
  if (!e.smoking) e.smoking = { entries: [] };
  if (!e.smoking.entries) e.smoking.entries = [];
  e.smoking.entries.push({ ts: Date.now(), src: opts.src || 'manual' });
  save();
  const n = e.smoking.entries.length;
  const via = opts.src === 'shake' ? ' (agitare)' : '';
  const body = `Ai fumat astăzi ${n} țigări${via ? ' · înregistrat prin agitare' : ''}.`;
  toast(`țigară #${n}${via}`);
  notify('🚬 țigară înregistrată', body);
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('🚬 țigară #' + n, { body, icon: 'icon.svg', tag: 'smoke', renotify: true }); } catch (e) {}
  }
  if (state.prefs.smoke_flash) blinkFlashlight();
  sendSmokePush(n, opts.src);
  render();
};
ACTIONS['smoke-undo'] = () => {
  const e = todayEntry();
  if (!e.smoking || !e.smoking.entries || !e.smoking.entries.length) return;
  e.smoking.entries.pop();
  save(); toast('Anulat'); render();
};

ACTIONS['sleep-bed'] = () => {
  if (!requireStarted()) return;
  const now = new Date();
  const hhmm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  // wakeup day = tomorrow if bedtime after 18:00, else today
  const wakeIso = now.getHours() >= 18 ? isoOffset(1) : todayISO();
  state.current_sleep = { bedtime_ts: now.getTime(), bedtime_hhmm: hhmm, iso_day: wakeIso };
  const e = getEntry(wakeIso);
  if (!e.sleep) e.sleep = {};
  e.sleep.bedtime = hhmm;
  save(); toast(`Culcare înregistrată la ${hhmm} — noapte bună 🌙`);
  notify('Culcare', `Înregistrată la ${hhmm}. Apasă "M-am trezit" când te scoli.`);
  render();
  if (sleepTicker) clearInterval(sleepTicker);
  sleepTicker = setInterval(() => { if (currentView === 'sleep' && state.current_sleep) render(); }, 60000);
};
ACTIONS['sleep-wake'] = () => {
  if (!requireStarted()) return;
  const now = new Date();
  const hhmm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  const cs = state.current_sleep;
  if (!cs) {
    // No prior bedtime — ask user
    return openSleepModal();
  }
  const iso = cs.iso_day;
  const e = getEntry(iso);
  if (!e.sleep) e.sleep = {};
  e.sleep.bedtime = cs.bedtime_hhmm;
  e.sleep.wakeup  = hhmm;
  const total = Math.max(1, Math.round((now.getTime() - cs.bedtime_ts) / 60000));
  e.sleep.total_min = total;
  e.sleep.deep_min  = Math.round(total * 0.22);
  e.sleep.rem_min   = Math.round(total * 0.20);
  e.sleep.light_min = total - e.sleep.deep_min - e.sleep.rem_min;
  e.sleep.awakenings = e.sleep.awakenings ?? 1;
  state.current_sleep = null;
  save();
  toast(`Trezire la ${hhmm} — ai dormit ${fmtDur(total)} ☀️`);
  notify('Trezire', `Trezire la ${hhmm}. Ai dormit ${fmtDur(total)}.`);
  viewState.date = iso;
  if (sleepTicker) { clearInterval(sleepTicker); sleepTicker = null; }
  render();
};
ACTIONS['sleep-cancel'] = () => {
  confirmDialog('Anulezi somnul curent? Nu se înregistrează nimic.', () => {
    if (state.current_sleep) {
      const e = getEntry(state.current_sleep.iso_day);
      if (e.sleep && e.sleep.bedtime && !e.sleep.wakeup) e.sleep = null;
    }
    state.current_sleep = null;
    if (sleepTicker) { clearInterval(sleepTicker); sleepTicker = null; }
    save(); toast('Anulat'); render();
  });
};
let sleepTicker = null;
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
  if (!requireStarted()) return;
  const e = todayEntry();
  const cur = e.mood || { rating: 3, energy: 60, stress: 40, note: '' };
  cur.energy = parseInt($('#energySlider').value, 10);
  cur.stress = parseInt($('#stressSlider').value, 10);
  cur.note = $('#moodNote').value.trim();
  e.mood = cur;
  save(); toast('Salvat ✓');
  notify('Stare zilnică salvată', `${moodLabel(cur.rating)} · energie ${cur.energy}%`);
};
ACTIONS['quote-react'] = (el) => {
  const qi = parseInt(el.dataset.qi, 10);
  const like = el.dataset.like === '1';
  const e = todayEntry();
  if (!e.quote_reactions) e.quote_reactions = [];
  e.quote_reactions.push({ qi, like, ts: Date.now() });
  save();
  toast(like ? 'Notat: rezonează ❤' : 'Notat');
  render();
};
ACTIONS['apply-reading'] = () => {
  const e = todayEntry();
  const r = moodReading(e);
  if (!r) return;
  const cur = e.mood || { rating: 3, energy: r.energy, stress: 40, note: '' };
  cur.energy = r.energy;
  // higher inferred energy usually means lower stress
  cur.stress = clamp(100 - r.energy - 10, 0, 100);
  // map dominant tag to mood rating
  const top = r.tags[0] ? r.tags[0].tag : '';
  if (['recunoscător','motivat','curajos','acțiune'].includes(top)) cur.rating = 4;
  else if (['calm','autentic','adaptare','perseverență'].includes(top)) cur.rating = 3;
  else if (['reflexiv','profund','răbdare'].includes(top)) cur.rating = 3;
  e.mood = cur;
  save(); toast('Aplicat pe slidere'); render();
};
ACTIONS['reset-quotes'] = () => {
  const e = todayEntry();
  e.quote_reactions = [];
  save(); toast('Reacții șterse'); render();
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
  if (!requireStarted()) return;
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
    <div class="field"><label>Nume</label><input class="input" id="mN" placeholder=""/></div>
    <div class="grid-2">
      <div class="field"><label>Ora</label><input class="input" id="mT" type="time" value="${pad2(new Date().getHours())}:${pad2(new Date().getMinutes())}"/></div>
      <div class="field"><label>Calorii</label><input class="input" id="mK" type="number" min="0" placeholder=""/></div>
    </div>
    <div class="grid-3">
      <div class="field"><label>Proteine (g)</label><input class="input" id="mP" type="number" min="0" placeholder=""/></div>
      <div class="field"><label>Carbo (g)</label><input class="input" id="mC" type="number" min="0" placeholder=""/></div>
      <div class="field"><label>Grăsimi (g)</label><input class="input" id="mF" type="number" min="0" placeholder=""/></div>
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

// —— Start / Stop tracking ——
ACTIONS['start-tracking'] = async () => {
  state.meta.started_at = new Date().toISOString();
  state.meta.streak_days = 1;
  save();
  toast('Contorizare pornită ✅');
  notify('Contorizare pornită', 'Toate datele se înregistrează din acest moment.');
  render();
  await syncSleepPushes();
  await syncRoutinePushes();
};
ACTIONS['stop-tracking'] = () => {
  confirmDialog('Oprire contorizare? Datele existente rămân, dar nu se mai înregistrează nimic nou până la Pornește.', async () => {
    state.meta.started_at = null;
    await cancelPush('bedtime');
    await cancelPush('wakeup');
    await cancelPush('routine_morning');
    await cancelPush('routine_noon');
    await cancelPush('routine_evening');
    save(); toast('Contorizare oprită'); render();
  });
};

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
    <div class="field"><label>Titlu</label><input class="input" id="jT" value="${esc(existing ? existing.title : '')}" placeholder=""/></div>
    <div class="field"><label>Notă</label><textarea class="input" id="jB" style="min-height:160px" placeholder="">${esc(existing ? existing.body : '')}</textarea></div>
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
  if (!requireStarted()) return;
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
    <div class="field"><label>Nume</label><input class="input" id="hN" value="${esc(editing ? editing.name : '')}" placeholder=""/></div>
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
  const permTxt = ('Notification' in window)
    ? (Notification.permission === 'granted' ? '<span class="chip green">Permisiune acordată</span>'
      : Notification.permission === 'denied' ? '<span class="chip red">Blocate din browser</span>'
      : '<span class="chip amber">Neactivate</span>')
    : '<span class="chip red">Neacceptate</span>';
  openModal(`
    <div class="modal-head"><h3>Alarme &amp; scurtături</h3><button class="modal-close" onclick="DL.close()">${ICONS.close}</button></div>
    <p class="subtitle" style="margin-bottom:10px">La ora setată sună telefonul și somnul se logează automat.</p>
    <div class="grid-2">
      <div class="field"><label>🌙 Culcare (bedtime)</label><input class="input" id="nB" type="time" value="${p.bedtime}"/></div>
      <div class="field"><label>☀️ Trezire (wakeup)</label><input class="input" id="nW" type="time" value="${p.wakeup}"/></div>
    </div>
    <div class="card" style="padding:10px 12px;margin:6px 0 12px">
      <div class="spread"><label style="display:flex;align-items:center;gap:8px;font-size:14px"><input type="checkbox" id="nOn" ${p.notifications ? 'checked' : ''}/> Alarme active</label>${permTxt}</div>
    </div>
    <div class="card" style="padding:10px 12px;margin:6px 0">
      <div class="spread"><label style="display:flex;align-items:center;gap:8px;font-size:14px"><input type="checkbox" id="nShake" ${p.smoke_shake ? 'checked' : ''}/> Agită 5× pentru +1 țigară</label></div>
    </div>
    <div class="card" style="padding:10px 12px;margin:0 0 12px">
      <div class="spread"><label style="display:flex;align-items:center;gap:8px;font-size:14px"><input type="checkbox" id="nFlash" ${p.smoke_flash ? 'checked' : ''}/> Blink lanternă la țigară</label></div>
    </div>
    <button class="btn ghost block" id="nTest">${ICONS.bell}<span>Test notificare</span></button>
    <button class="btn primary block" id="nSave" style="margin-top:8px">Salvează</button>
  `);
  $('#nSave').onclick = async () => {
    p.bedtime = $('#nB').value || '22:00';
    p.wakeup  = $('#nW').value || '08:00';
    p.notifications = $('#nOn').checked;
    if (p.notifications) await registerPushUser({ prompt: true });
    const wantShake = $('#nShake').checked;
    const wantFlash = $('#nFlash').checked;
    if (wantShake && !p.smoke_shake) {
      const ok = await requestShakePermission();
      if (ok) { p.smoke_shake = true; startShakeDetection(); }
    } else if (!wantShake && p.smoke_shake) {
      p.smoke_shake = false; stopShakeDetection();
    }
    if (wantFlash && !p.smoke_flash) {
      const ok = await requestFlashlight();
      if (ok) { p.smoke_flash = true; blinkFlashlight(1, 200); }
    } else if (!wantFlash && p.smoke_flash) {
      p.smoke_flash = false; releaseFlashlight();
    }
    save(); closeModal(); toast('Setat — culcare ' + p.bedtime + ' · trezire ' + p.wakeup);
    await syncSleepPushes();
  };
  $('#nTest').onclick = async () => {
    const externalId = await registerPushUser({ prompt: true });
    if (!externalId) { toast('Permite notificările mai întâi'); return; }
    try {
      const r = await fetch(API_BASE + '/api?action=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ externalId }),
      });
      toast(r.ok ? 'Test trimis — vine în câteva secunde' : 'Trimitere eșuată');
    } catch (e) { toast('Trimitere eșuată'); }
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

function minutesBetween(a, b) {
  // wrap: if b < a, add 24h
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  let diff = (bh * 60 + bm) - (ah * 60 + am);
  if (diff <= 0) diff += 24 * 60;
  return diff;
}
function autoLogBedtime() {
  // Called on bedtime alarm. Attach bedtime to TOMORROW's entry (day of wakeup).
  const tomorrow = isoOffset(1);
  const e = getEntry(tomorrow);
  if (!e.sleep) e.sleep = {};
  e.sleep.bedtime = state.prefs.bedtime;
  save();
}
function autoLogWakeup() {
  // Called on wakeup alarm. Attach wakeup to TODAY's entry, compute totals.
  const iso = todayISO();
  const e = getEntry(iso);
  if (!e.sleep) e.sleep = { bedtime: state.prefs.bedtime };
  e.sleep.wakeup = state.prefs.wakeup;
  if (!e.sleep.bedtime) e.sleep.bedtime = state.prefs.bedtime;
  const total = minutesBetween(e.sleep.bedtime, e.sleep.wakeup);
  e.sleep.total_min = total;
  e.sleep.deep_min  = Math.round(total * 0.22);
  e.sleep.rem_min   = Math.round(total * 0.20);
  e.sleep.light_min = total - e.sleep.deep_min - e.sleep.rem_min;
  e.sleep.awakenings = e.sleep.awakenings ?? 1;
  save();
}
function localReminderTick() {
  if (!state.prefs.notifications) return;
  if (!isStarted()) return;
  const now = new Date();
  const hhmm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  const key = todayISO() + ':' + hhmm;
  if (state.meta.last_notif === key) return;
  const canNotify = 'Notification' in window && Notification.permission === 'granted';
  if (hhmm === state.prefs.bedtime) {
    autoLogBedtime();
    if (canNotify) new Notification('🌙 E ora de somn', { body: 'Culcarea a fost înregistrată automat. Noapte bună!', icon: 'icon.svg' });
    notify('Timp de somn', `Culcare înregistrată la ${state.prefs.bedtime}. Noapte bună!`);
    state.meta.last_notif = key; save();
    if (currentView === 'dashboard' || currentView === 'sleep') render();
  } else if (hhmm === state.prefs.wakeup) {
    autoLogWakeup();
    const e = todayEntry();
    const totalTxt = e.sleep && e.sleep.total_min ? fmtDur(e.sleep.total_min) : '';
    if (canNotify) new Notification('☀️ Bună dimineața!', { body: `Trezire înregistrată. Ai dormit ${totalTxt}.`, icon: 'icon.svg' });
    notify('Trezire', `Trezire înregistrată la ${state.prefs.wakeup} · dormit ${totalTxt}.`);
    state.meta.last_notif = key; save();
    if (currentView === 'dashboard' || currentView === 'sleep') render();
  }
}

// —— Flashlight (torch) — open camera on-demand only (avoid the 'recording' indicator) ——
async function requestFlashlight() {
  // just probe capabilities — open, check, close immediately
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast('Camera nu e disponibilă'); return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const track = stream.getVideoTracks()[0];
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    track.stop(); // release right away — no persistent 'in use' indicator
    if (!caps.torch) {
      toast('Lanterna nu e suportată pe acest telefon/browser');
      return false;
    }
    return true;
  } catch (e) {
    toast('Permisiune cameră refuzată');
    return false;
  }
}
function releaseFlashlight() { /* nothing persistent to release */ }
async function blinkFlashlight(times = 3, onMs = 180, offMs = 140) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  let stream = null, track = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    track = stream.getVideoTracks()[0];
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    if (!caps.torch) { track.stop(); return; }
    for (let i = 0; i < times; i++) {
      try { await track.applyConstraints({ advanced: [{ torch: true }] }); } catch(e) { break; }
      await new Promise(r => setTimeout(r, onMs));
      try { await track.applyConstraints({ advanced: [{ torch: false }] }); } catch(e) {}
      if (i < times - 1) await new Promise(r => setTimeout(r, offMs));
    }
  } catch (e) { /* silent */ }
  finally { if (track) { try { track.stop(); } catch(e){} } }
}

// —— Shake detection (5× agitare = +1 țigară) + wake lock pentru screen-on ——
const SHAKE_COUNT = 5;
const shakeState = { last: null, times: [], enabled: false, cooldown: 0, wakeLock: null };
async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try { shakeState.wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
}
function releaseWakeLock() {
  if (shakeState.wakeLock) { try { shakeState.wakeLock.release(); } catch(e){} shakeState.wakeLock = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state && state.prefs.smoke_shake && !shakeState.wakeLock) acquireWakeLock();
});
async function requestShakePermission() {
  if (typeof DeviceMotionEvent === 'undefined') { toast('Dispozitiv fără senzor de mișcare'); return false; }
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    try { const p = await DeviceMotionEvent.requestPermission(); return p === 'granted'; }
    catch (e) { return false; }
  }
  return true; // Android — no permission prompt
}
function onShakeMotion(ev) {
  if (!isStarted() || !state.prefs.smoke_shake) return;
  const now = Date.now();
  if (now - shakeState.cooldown < 5000) return;
  const a = ev.accelerationIncludingGravity || ev.acceleration;
  if (!a || a.x == null) return;
  if (!shakeState.last) { shakeState.last = { x: a.x, y: a.y, z: a.z, t: now }; return; }
  const dt = Math.max(1, now - shakeState.last.t) / 1000;
  const dx = a.x - shakeState.last.x, dy = a.y - shakeState.last.y, dz = a.z - shakeState.last.z;
  const mag = Math.sqrt(dx*dx + dy*dy + dz*dz) / dt;
  shakeState.last = { x: a.x, y: a.y, z: a.z, t: now };
  if (mag > 25) {
    shakeState.times.push(now);
    shakeState.times = shakeState.times.filter(t => now - t < 2000);
    if (shakeState.times.length >= SHAKE_COUNT) {
      shakeState.times = [];
      shakeState.cooldown = now;
      if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 80, 40, 120]);
      ACTIONS['smoke-log'](null, null, { src: 'shake' });
    }
  }
}
function startShakeDetection() {
  if (shakeState.enabled) return;
  window.addEventListener('devicemotion', onShakeMotion);
  shakeState.enabled = true;
  acquireWakeLock();
}
function stopShakeDetection() {
  window.removeEventListener('devicemotion', onShakeMotion);
  shakeState.enabled = false;
  shakeState.last = null; shakeState.times = [];
  releaseWakeLock();
}

// —— OneSignal server push (works when app is closed) ——
const API_BASE = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'https://dragon-life.vercel.app' : '';
async function waitOneSignal(timeoutMs = 6000) {
  if (window.__DL_ONESIGNAL_READY) return true;
  return await new Promise(resolve => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve(!!window.__DL_ONESIGNAL_READY); } }, timeoutMs);
    window.addEventListener('onesignal-ready', () => { if (!done) { done = true; clearTimeout(t); resolve(true); } }, { once: true });
  });
}
async function registerPushUser({ prompt = false } = {}) {
  const ready = await waitOneSignal();
  if (!ready) return null;
  try {
    const OS = window.OneSignal;
    if (Notification.permission === 'default') {
      if (!prompt) return null; // silent skip — caller must opt in explicitly
      await OS.Notifications.requestPermission();
      state.meta.notif_prompted = true; save();
    }
    if (Notification.permission !== 'granted') return null;
    if (!state.meta.push_id) state.meta.push_id = 'dl_' + uid();
    await OS.login(state.meta.push_id);
    try {
      const sub = OS.User && OS.User.PushSubscription;
      if (sub && !sub.optedIn && typeof sub.optIn === 'function') await sub.optIn();
    } catch (e) {}
    for (let i = 0; i < 20; i++) {
      try {
        const sid = OS.User && OS.User.PushSubscription && OS.User.PushSubscription.id;
        if (sid) break;
      } catch (e) {}
      await new Promise(r => setTimeout(r, 250));
    }
    save();
    return state.meta.push_id;
  } catch (e) { return null; }
}

function openWelcomePrompt() {
  openModal(`
    <div class="modal-head"><h3>🐉 Bine ai venit în Dragon Life</h3></div>
    <p class="subtitle">Configurează o singură dată notificările și scurtăturile pentru fumat. Le poți schimba oricând din Setări → Alarme.</p>

    <label class="card" style="display:flex;align-items:flex-start;gap:12px;padding:12px;margin-top:12px;cursor:pointer">
      <input type="checkbox" id="wNotif" checked style="margin-top:2px"/>
      <div>
        <div style="font-weight:600;font-size:14px">🔔 Notificări</div>
        <div class="subtitle mt-6">Alarme culcare / trezire, mementouri rutine, confirmări țigară — chiar și când app-ul e închis.</div>
      </div>
    </label>

    <label class="card" style="display:flex;align-items:flex-start;gap:12px;padding:12px;cursor:pointer">
      <input type="checkbox" id="wShake" style="margin-top:2px"/>
      <div>
        <div style="font-weight:600;font-size:14px">📱 Agită 5× pentru +1 țigară</div>
        <div class="subtitle mt-6">Agită telefonul de 5 ori rapid — se înregistrează automat o țigară.</div>
      </div>
    </label>

    <label class="card" style="display:flex;align-items:flex-start;gap:12px;padding:12px;cursor:pointer">
      <input type="checkbox" id="wFlash" style="margin-top:2px"/>
      <div>
        <div style="font-weight:600;font-size:14px">🔦 Blink lanternă la țigară</div>
        <div class="subtitle mt-6">Lanterna telefonului clipește 3× la fiecare țigară (Android/Chrome).</div>
      </div>
    </label>

    <div class="row" style="gap:8px;margin-top:14px">
      <button class="btn ghost block" id="wLater">Sări peste</button>
      <button class="btn primary block" id="wEnable">${ICONS.check}<span>Salvează</span></button>
    </div>
  `, { center: true });
  $('#wLater').onclick = () => {
    state.meta.notif_prompted = true; save(); closeModal();
  };
  $('#wEnable').onclick = async () => {
    const wantNotif = $('#wNotif').checked;
    const wantShake = $('#wShake').checked;
    const wantFlash = $('#wFlash').checked;
    closeModal();
    state.meta.notif_prompted = true;
    if (wantNotif) {
      const id = await registerPushUser({ prompt: true });
      if (id) {
        state.prefs.notifications = true;
        toast('Notificări active ✅');
        if (isStarted()) { await syncSleepPushes(); await syncRoutinePushes(); }
      } else {
        state.prefs.notifications = false;
        toast('Notificările rămân dezactivate');
      }
    } else {
      state.prefs.notifications = false;
    }
    if (wantShake) {
      const ok = await requestShakePermission();
      if (ok) { state.prefs.smoke_shake = true; startShakeDetection(); toast('Detecție agitare activă'); }
      else { state.prefs.smoke_shake = false; }
    }
    if (wantFlash) {
      const ok = await requestFlashlight();
      if (ok) { state.prefs.smoke_flash = true; blinkFlashlight(1, 200); toast('Flash lanternă activ'); }
      else { state.prefs.smoke_flash = false; }
    }
    save();
  };
}
function nextOccurrenceISO(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target.toISOString();
}
async function schedulePush(kind, title, body, hhmm) {
  const externalId = await registerPushUser();
  if (!externalId) return null;
  const sendAt = nextOccurrenceISO(hhmm);
  try {
    const r = await fetch(API_BASE + '/api?action=schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ externalId, title, body, sendAt }),
    });
    const j = await r.json();
    if (j.id) {
      if (!state.meta.scheduled) state.meta.scheduled = {};
      state.meta.scheduled[kind] = j.id;
      save();
      return j.id;
    }
  } catch (e) { /* offline */ }
  return null;
}
async function cancelPush(kind) {
  const id = state.meta.scheduled && state.meta.scheduled[kind];
  if (!id) return;
  try {
    await fetch(API_BASE + '/api?action=cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  } catch (e) {}
  delete state.meta.scheduled[kind];
  save();
}
async function syncSleepPushes() {
  if (!state.prefs.notifications || !isStarted()) return;
  await cancelPush('bedtime');
  await cancelPush('wakeup');
  await schedulePush('bedtime', '🌙 E ora de somn', 'Culcarea se înregistrează automat în aplicație.', state.prefs.bedtime);
  await schedulePush('wakeup',  '☀️ Bună dimineața!',  'Trezirea se înregistrează automat în aplicație.',   state.prefs.wakeup);
}
async function syncRoutinePushes() {
  if (!state.prefs.notifications || !isStarted()) return;
  for (const slot of ['morning', 'noon', 'evening']) {
    await cancelPush('routine_' + slot);
  }
  const items = state.routine_items;
  if (!items.length) return;
  const slotHours = { morning: '08:00', noon: '12:00', evening: '17:00' };
  const titles = { morning: '☀️ Rutina de dimineață', noon: '🌞 Rutina de amiază', evening: '🌙 Rutina de seară' };
  for (const slot of ['morning', 'noon', 'evening']) {
    const slotItems = items.filter(it => it.slot === slot);
    if (!slotItems.length) continue;
    await schedulePush('routine_' + slot, titles[slot], `${slotItems.length} activități te așteaptă. Deschide app-ul și bifează.`, slotHours[slot]);
  }
}
async function sendSmokePush(count, via) {
  const externalId = state.meta.push_id;
  if (!externalId) return;
  try {
    await fetch(API_BASE + '/api?action=schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalId,
        title: '🚬 țigară #' + count,
        body: `Ai fumat astăzi ${count} țigări${via === 'shake' ? ' · din agitare' : ''}.`,
        sendAt: new Date(Date.now() + 2000).toISOString(),
      }),
    });
  } catch (e) {}
}

// public helpers for inline onclick
window.DL = {
  close: closeModal,
  stopRelax: () => { if (relaxTimer) { clearInterval(relaxTimer); relaxTimer = null; } },
};

document.addEventListener('DOMContentLoaded', async () => {
  state = load();
  save();
  updateStreak();
  initShellWiring();
  setInterval(localReminderTick, 60 * 1000);
  if (state.prefs.smoke_shake) {
    // Attempt to reactivate; permission may still be granted from previous session
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission !== 'function') {
      startShakeDetection();
    }
  }
  // Show onboarding notification prompt exactly once, ever
  if (!state.meta.notif_prompted && Notification.permission === 'default') {
    setTimeout(openWelcomePrompt, 600);
  }
  // Register silently (no prompt) if already granted, refresh scheduled pushes
  if (Notification.permission === 'granted') {
    try { await registerPushUser(); } catch (e) {}
    if (isStarted() && state.prefs.notifications) {
      try { await syncSleepPushes(); } catch (e) {}
      try { await syncRoutinePushes(); } catch (e) {}
    }
  }
});

})();
