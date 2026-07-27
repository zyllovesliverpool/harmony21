/* ===========================================
   21天 · 快乐一家人 - 打卡神器 (API Edition)
   Data encrypted at rest, shared via server.
   =========================================== */

// ============================
// 1. API Client
// ============================
const API = {
  _key: sessionStorage.getItem('harmony21_apikey') || null,

  _headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this._key) h['Authorization'] = `Bearer ${this._key}`;
    return h;
  },

  async _fetch(method, path, body) {
    let data;
    const res = await fetch(path, {
      method,
      headers: this._headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    try { data = await res.json(); } catch(_){ throw new Error("请求失败 (" + res.status + ")"); }
    if (!res.ok) throw new Error(data ? (data.detail || "请求失败 (" + res.status + ")") : "请求失败 (" + res.status + ")");
    return data;
  },

  async register(password) {
    const data = await this._fetch('POST', '/api/register', { password });
    this._key = data.api_key;
    sessionStorage.setItem('harmony21_apikey', data.api_key);
    return data;
  },

  async login(password) {
    const data = await this._fetch('POST', '/api/login', { password });
    this._key = data.api_key;
    sessionStorage.setItem('harmony21_apikey', data.api_key);
    return data;
  },

  async loadState() {
    const data = await this._fetch('GET', '/api/state');
    return data.state;
  },

  async saveState(state) {
    await this._fetch('PUT', '/api/state', { state });
  },

  clearKey() {
    this._key = null;
    sessionStorage.removeItem('harmony21_apikey');
  }
};

// ============================
// 2. Missions Data
// ============================
const MISSIONS = [
  { week: 1, theme: '重新认识彼此', text: '真诚地感谢对方为你做的一件小事，并告诉对方', hint: '越具体越好，比如"谢谢你今天帮我倒了杯水"' },
  { week: 1, theme: '重新认识彼此', text: '放下手机，和对方一起专注地吃一顿饭（至少20分钟）', hint: '看着对方的眼睛聊聊天，不刷视频不刷朋友圈' },
  { week: 1, theme: '重新认识彼此', text: '写下对方的3个优点，念给对方听', hint: '可以是性格、习惯、外貌……任何你欣赏的地方' },
  { week: 1, theme: '重新认识彼此', text: '主动做一件对方平时负责的家务', hint: '洗个碗、倒个垃圾、叠个衣服——不需要说出来' },
  { week: 1, theme: '重新认识彼此', text: '问对方："今天有什么需要我支持你的吗？"', hint: '认真听，然后说"好"' },
  { week: 1, theme: '重新认识彼此', text: '一起看一张老照片，分享当时的回忆', hint: '翻翻手机相册，聊聊照片背后的故事' },
  { week: 1, theme: '重新认识彼此', text: '给对方一个拥抱，至少持续20秒', hint: '什么都不用说，抱着就好。20秒后你会感受到不同' },
  { week: 2, theme: '深度连接', text: '为对方准备一个小惊喜', hint: '一杯茶、一张小纸条、一首歌……心意最重要' },
  { week: 2, theme: '深度连接', text: '一起做一顿饭，分工合作', hint: '一个人负责切配，一个人负责掌勺，做完一起享用' },
  { week: 2, theme: '深度连接', text: '聊聊各自的童年：最快乐的回忆是什么？', hint: '还记得小时候最开心的一天吗？讲给对方听' },
  { week: 2, theme: '深度连接', text: '给对方一个真诚的道歉', hint: '为一件你一直想说但没说出口的事，说"对不起"' },
  { week: 2, theme: '深度连接', text: '一起出门散步15分钟，手牵手', hint: '不需要目的地，走一走就很美好' },
  { week: 2, theme: '深度连接', text: '写下对方的梦想，讨论你可以如何支持', hint: '哪怕只是一个小心愿：一起想想怎么实现它' },
  { week: 2, theme: '深度连接', text: '给对方按摩肩膀或背部5分钟', hint: '不用专业手法，温柔的碰触本身就是一种语言' },
  { week: 3, theme: '共创未来', text: '一起聊聊：我们各自最欣赏对方的哪个习惯？', hint: '那个让你觉得"和TA在一起真好"的小习惯' },
  { week: 3, theme: '共创未来', text: '为对方朗读一段文字', hint: '可以是一首诗、一篇文章的一节，或者你自己写的' },
  { week: 3, theme: '共创未来', text: '一起规划一件未来想做的事', hint: '下个月的旅行？明年的新爱好？大胆地一起做梦' },
  { week: 3, theme: '共创未来', text: '写下"我希望我们能一直……"的3个句子', hint: '写完念给对方听，然后保存起来' },
  { week: 3, theme: '共创未来', text: '做一件对方喜欢但你平时不太主动做的事', hint: '也许是一起看TA喜欢的剧，或者陪TA打一把游戏' },
  { week: 3, theme: '共创未来', text: '给对方写一封短信，说说这21天里的感受', hint: '写写你看到了对方什么变化，你感受到了什么' },
  { week: 3, theme: '共创未来', text: '一起庆祝！回顾这21天，给对方一个最走心的感谢', hint: '坚持到了最后，你们真的很棒。好好为彼此庆祝吧' }
];

const WEEK_LABELS = { 1: '第 1 周 · 重新认识彼此', 2: '第 2 周 · 深度连接', 3: '第 3 周 · 共创未来' };
const WEEK_THEMES = { 1: '✨ 重新认识彼此', 2: '💞 深度连接', 3: '🌟 共创未来' };

// ============================
// 3. Global State
// ============================
let STATE = {
  players: ['', ''],
  emojis: ['😊', '🥰'],
  startDate: null,
  currentDay: 1,
  completedDays: {},
  moods: {},
  ratings: {},
  journals: {}
};

let _saveTimer = null;
let _viewDay = 1;

function _defaultState() {
  return {
    players: ['', ''],
    emojis: ['😊', '🥰'],
    startDate: null,
    currentDay: 1,
    completedDays: {},
    moods: {},
    ratings: {},
    journals: {}
  };
}

// ============================
// 4. Autosave (debounced)
// ============================
function _scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    try {
      await API.saveState(STATE);
    } catch (e) {
      console.warn('Save failed:', e.message);
      if (e.message.includes('重新登录') || e.message.includes('无效')) {
        logout();
      }
    }
  }, 800);
}

// ============================
// 5. Navigation
// ============================
function navigate(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(screen === 'main' ? 'main-app' : screen + '-screen');
  if (el) el.classList.add('active');
}

// ============================
// 6. Auth Flow
// ============================
async function init() {
  if (API._key) {
    try {
      STATE = await API.loadState();
      if (STATE.players && STATE.players[0]) {
        enterMainApp();
      } else {
        navigate('setup');
      }
      return;
    } catch (e) {
      API.clearKey();
    }
  }
  navigate('welcome');
}

async function handlePassword() {
  const input = document.getElementById('password-input');
  const pw = input.value.trim();
  const errEl = document.getElementById('password-error');
  const btn = document.getElementById('password-btn');
  const hint = document.getElementById('password-hint');

  if (pw.length < 4) { errEl.textContent = '密码至少4位'; return; }

  btn.disabled = true;
  btn.textContent = '请稍候...';
  errEl.textContent = '';
  hint.textContent = '';

  // First try login
  try {
    const data = await API.login(pw);
    STATE = data.state;
    await afterLogin();
    btn.textContent = '进入';
    btn.disabled = false;
    return;
  } catch (e) {
    if (e.message.includes('还未设置密码')) {
      // First time → register
      try {
        const data = await API.register(pw);
        STATE = data.state;
        await afterLogin();
        btn.textContent = '进入';
        btn.disabled = false;
        return;
      } catch (regErr) {
        errEl.textContent = regErr.message;
      }
    } else {
      errEl.textContent = e.message;
      if (e.message.includes('已注册')) hint.textContent = '试试登录已有账号';
    }
  }

  btn.textContent = '进入';
  btn.disabled = false;
}

async function afterLogin() {
  if (STATE.players && STATE.players[0]) {
    enterMainApp();
  } else {
    navigate('setup');
  }
}

function logout() {
  API.clearKey();
  STATE = _defaultState();
  navigate('welcome');
}

// ============================
// 7. Setup Players
// ============================
// Emoji picker (same as before)
document.addEventListener('click', function(e) {
  const display = e.target.closest('.emoji-display');
  if (display) {
    const pi = display.dataset.player;
    const opts = document.querySelector(`.emoji-options[data-player="${pi}"]`);
    const wasOpen = opts.classList.contains('open');
    document.querySelectorAll('.emoji-options').forEach(o => o.classList.remove('open'));
    if (!wasOpen) opts.classList.add('open');
    return;
  }
  const opt = e.target.closest('.emoji-options span');
  if (opt) {
    const container = opt.closest('.emoji-options');
    const pi = container.dataset.player;
    const emoji = opt.textContent;
    STATE.emojis[pi] = emoji;
    document.querySelector(`.emoji-display[data-player="${pi}"]`).textContent = emoji;
    return;
  }
  document.querySelectorAll('.emoji-options').forEach(o => o.classList.remove('open'));
});

async function startJourney() {
  const inputs = document.querySelectorAll('.name-input');
  STATE.players[0] = inputs[0].value.trim() || '第一位';
  STATE.players[1] = inputs[1].value.trim() || '第二位';
  STATE.startDate = new Date().toISOString().split('T')[0];
  STATE.currentDay = 1;
  STATE.completedDays = {};
  STATE.moods = {};
  STATE.ratings = {};
  STATE.journals = {};

  try {
    await API.saveState(STATE);
    enterMainApp();
  } catch (e) {
    alert('保存失败：' + e.message);
  }
}

// ============================
// 8. Enter Main App & Render
// ============================
function enterMainApp() {
  _viewDay = STATE.currentDay;
  navigate('main');
  renderAll();
}

function renderAll() {
  renderHeader();
  renderMission();
  renderMood();
  renderRating();
  renderJournal();
  renderHarmonyScore();
  renderProgress();
  renderJournalTimeline();
  renderChart();
  checkNextDay();
}

function renderHeader() {
  const d = _viewDay;
  document.getElementById('day-number').textContent = `第 ${d} 天`;
  document.getElementById('progress-text').textContent = `${Math.min(d, 21)}/21`;
  document.getElementById('progress-fill').style.width = `${(Math.min(d, 21) / 21) * 100}%`;
  const ms = MISSIONS[d - 1];
  document.getElementById('week-label').textContent = ms ? WEEK_LABELS[ms.week] : '';
  document.getElementById('day-theme').textContent = ms ? WEEK_THEMES[ms.week] : '';
}

function renderMission() {
  const d = _viewDay;
  const ms = MISSIONS[d - 1];
  if (!ms) return;
  document.getElementById('mission-text').textContent = ms.text;
  document.getElementById('mission-hint').textContent = ms.hint;
  for (let pi = 0; pi < 2; pi++) {
    document.getElementById(`p${pi}-emoji-mission`).textContent = STATE.emojis[pi];
    document.getElementById(`p${pi}-name-mission`).textContent = STATE.players[pi];
    const done = _getCompleted(d, pi);
    document.querySelector(`.mission-player[data-player="${pi}"]`).classList.toggle('completed', done);
    document.getElementById(`p${pi}-check`).textContent = done ? '✅' : '⬜';
  }
}

function renderMood() {
  const d = _viewDay;
  for (let pi = 0; pi < 2; pi++) {
    document.getElementById(`p${pi}-label-mood`).textContent = _label(pi);
    const mood = _getMood(d, pi);
    document.getElementById(`p${pi}-mood-options`).querySelectorAll('span').forEach(s => {
      s.classList.toggle('selected', s.dataset.mood === mood);
    });
  }
}

function renderRating() {
  const d = _viewDay;
  const both = _getCompleted(d, 0) && _getCompleted(d, 1);
  document.getElementById('rating-card').style.display = both ? 'block' : 'none';
  for (let pi = 0; pi < 2; pi++) {
    document.getElementById(`p${pi}-label-rating`).textContent = _label(pi);
    const r = _getRating(d, pi);
    const stars = document.getElementById(`p${pi}-stars`);
    stars.querySelectorAll('span').forEach(s => {
      const v = parseInt(s.dataset.val);
      s.classList.toggle('filled', v <= r);
      s.textContent = v <= r ? '★' : '☆';
    });
  }
}

function renderJournal() {
  const d = _viewDay;
  for (let pi = 0; pi < 2; pi++) {
    document.getElementById(`p${pi}-label-journal`).textContent = _label(pi);
    const text = _getJournal(d, pi);
    const ta = document.getElementById(`p${pi}-journal`);
    if (ta.value !== text) ta.value = text;
  }
}

function renderHarmonyScore() {
  let total = 0, count = 0;
  for (let d = 1; d <= 21; d++) {
    for (let pi = 0; pi < 2; pi++) {
      const r = _getRating(d, pi);
      if (r > 0) { total += r; count++; }
    }
  }
  document.getElementById('harmony-score').textContent = count > 0 ? (total / count).toFixed(1) : '--';
}

// ============================
// 9. Interactions (mutations)
// ============================
function toggleComplete(pi) {
  const d = _viewDay;
  const k = String(d);
  if (!STATE.completedDays[k]) STATE.completedDays[k] = {};
  STATE.completedDays[k][pi] = !_getCompleted(d, pi);
  _scheduleSave();
  renderMission();
  renderRating();
  renderProgress();
  renderChart();
  renderHarmonyScore();
  checkNextDay();
}

function setMood(pi, mood) {
  const d = _viewDay;
  const k = String(d);
  if (!STATE.moods[k]) STATE.moods[k] = {};
  STATE.moods[k][pi] = mood;
  _scheduleSave();
  renderMood();
  renderProgress();
}

function setRating(pi, val) {
  const d = _viewDay;
  const k = String(d);
  if (!STATE.ratings[k]) STATE.ratings[k] = {};
  STATE.ratings[k][pi] = val;
  _scheduleSave();
  renderRating();
  renderHarmonyScore();
  renderProgress();
  renderChart();
}

function saveJournal(pi) {
  const d = _viewDay;
  const k = String(d);
  if (!STATE.journals[k]) STATE.journals[k] = {};
  STATE.journals[k][pi] = document.getElementById(`p${pi}-journal`).value;
  _scheduleSave();
}

// ============================
// 10. State Getters
// ============================
function _getCompleted(day, pi) {
  const k = String(day);
  return STATE.completedDays[k] ? !!STATE.completedDays[k][pi] : false;
}
function _getMood(day, pi) {
  const k = String(day);
  return STATE.moods[k] ? STATE.moods[k][pi] || null : null;
}
function _getRating(day, pi) {
  const k = String(day);
  return STATE.ratings[k] ? STATE.ratings[k][pi] || 0 : 0;
}
function _getJournal(day, pi) {
  const k = String(day);
  return STATE.journals[k] ? STATE.journals[k][pi] || '' : '';
}
function _label(pi) {
  return `${STATE.emojis[pi]} ${STATE.players[pi]}`;
}
function moodWeight(m) {
  return { '😄': 5, '😊': 4, '🙂': 3, '😐': 2, '😞': 1 }[m] || 3;
}
function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ============================
// 11. Next Day
// ============================
function checkNextDay() {
  const d = STATE.currentDay;
  const both = _getCompleted(d, 0) && _getCompleted(d, 1);
  const btn = document.getElementById('btn-next');
  if (both && d < 21) {
    btn.style.display = 'block';
    document.getElementById('next-day-num').textContent = d + 1;
    btn.textContent = '进入第 ' + (d + 1) + ' 天 →';
    btn.disabled = false;
  } else if (both && d === 21) {
    btn.style.display = 'block';
    btn.textContent = '🎉 恭喜完成 21 天！';
    btn.disabled = true;
  } else {
    btn.style.display = 'none';
  }
}

async function nextDay() {
  if (STATE.currentDay >= 21) return;
  STATE.currentDay++;
  _viewDay = STATE.currentDay;
  try {
    await API.saveState(STATE);
    renderAll();
    document.getElementById('content-area').scrollTop = 0;
  } catch (e) {
    STATE.currentDay--;
    _viewDay = STATE.currentDay;
    alert('保存失败：' + e.message);
  }
}

// ============================
// 11b. Day Navigation & Manual Save
// ============================
function goToPrevDay() {
  if (_viewDay > 1) {
    _viewDay--;
    _updateDayNav();
    renderAll();
  }
}

function goToNextDayView() {
  if (_viewDay < STATE.currentDay) {
    _viewDay++;
    _updateDayNav();
    renderAll();
  }
}

function goToToday() {
  _viewDay = STATE.currentDay;
  _updateDayNav();
  renderAll();
}

function _updateDayNav() {
  const nav = document.getElementById('day-nav');
  if (!nav) return;
  const atFirst = _viewDay <= 1;
  const atCurrent = _viewDay >= STATE.currentDay;
  nav.innerHTML = \`<button class="day-nav-btn" onclick="goToPrevDay()" \${atFirst ? 'disabled' : ''}>‹</button>
<span class="day-nav-title">\${atCurrent ? '📌 今天' : '📖 第 ' + _viewDay + ' 天'}</span>
\${!atCurrent ? '<button class="day-nav-btn today-btn" onclick="goToToday()">今天</button>' : '<span style="min-width:52px"></span>'}
<button class="day-nav-btn" onclick="goToNextDayView()" \${atCurrent ? 'disabled' : ''}>›</button>\`;
}

async function manualSave() {
  const btn = document.getElementById('save-btn');
  const status = document.getElementById('save-status');
  if (!btn || !status) return;
  btn.style.opacity = '0.5';
  status.textContent = '保存中...';
  status.style.display = 'inline';
  try {
    await API.saveState(STATE);
    status.textContent = '✓ 已保存';
    setTimeout(() => { status.style.display = 'none'; }, 2000);
  } catch (e) {
    status.textContent = '✗ 保存失败';
    setTimeout(() => { status.style.display = 'none'; }, 3000);
  }
  btn.style.opacity = '1';
}

// ============================
// 12. View Switching
// ============================
function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[onclick*="'${view}'"]`).classList.add('active');
  if (view === 'progress') { renderProgress(); renderChart(); }
  if (view === 'journal') renderJournalTimeline();
}

// ============================
// 13. Progress View
// ============================
function renderProgress() {
  const grid = document.getElementById('progress-grid');
  grid.innerHTML = '';
  let completedCount = 0, totalMood = 0, moodCount = 0;

  for (let d = 1; d <= 21; d++) {
    const cell = document.createElement('div');
    cell.className = 'grid-day';
    cell.dataset.day = d;
    const c0 = _getCompleted(d, 0), c1 = _getCompleted(d, 1);
    const status = c0 && c1 ? 'completed' : (c0 || c1 ? 'partial' : 'empty');
    cell.classList.add(status);
    if (d === STATE.currentDay) cell.classList.add('today');
    cell.innerHTML = `<span class="day-num">${d}</span>`;
    if (status === 'completed') { cell.innerHTML += '<span class="day-status">✅</span>'; completedCount++; }
    else if (status === 'partial') cell.innerHTML += '<span class="day-status">⏳</span>';
    cell.onclick = () => showDayDetail(d);
    grid.appendChild(cell);
    const m0 = _getMood(d, 0), m1 = _getMood(d, 1);
    if (m0) { totalMood += moodWeight(m0); moodCount++; }
    if (m1) { totalMood += moodWeight(m1); moodCount++; }
  }

  let totalRating = 0, ratingCount = 0;
  for (let d = 1; d <= 21; d++) {
    for (let pi = 0; pi < 2; pi++) {
      const r = _getRating(d, pi);
      if (r > 0) { totalRating += r; ratingCount++; }
    }
  }
  document.getElementById('progress-stats').innerHTML = `
    <div class="stat-item"><span class="stat-value">${completedCount}/21</span><span class="stat-label">完成天数</span></div>
    <div class="stat-item"><span class="stat-value">${moodCount > 0 ? (totalMood / moodCount).toFixed(1) : '--'}</span><span class="stat-label">平均心情</span></div>
    <div class="stat-item"><span class="stat-value">${ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : '--'}/5</span><span class="stat-label">平均和谐度</span></div>
  `;
}

// ============================
// 14. Harmony Chart
// ============================
function renderChart() {
  const chart = document.getElementById('harmony-chart');
  chart.innerHTML = '';
  let max = 1;
  const vals = [];
  const maxDay = Math.max(STATE.currentDay, 1);
  for (let d = 1; d <= maxDay; d++) {
    let sum = 0, cnt = 0;
    for (let pi = 0; pi < 2; pi++) {
      const r = _getRating(d, pi);
      if (r > 0) { sum += r; cnt++; }
    }
    const avg = cnt > 0 ? sum / cnt : 0;
    vals.push(avg);
    if (avg > max) max = avg;
  }
  if (max < 1) max = 1;
  vals.forEach((v, i) => {
    const bar = document.createElement('div');
    bar.className = 'chart-bar' + (v === 0 ? ' empty-bar' : '');
    bar.style.height = Math.max(v > 0 ? (v / 5) * 100 : 4, 4) + '%';
    bar.innerHTML = `<span class="bar-label">${i + 1}</span>`;
    bar.title = `第${i + 1}天: ${v > 0 ? v.toFixed(1) : '未评'}`;
    chart.appendChild(bar);
  });
}

// ============================
// 15. Journal Timeline
// ============================
function renderJournalTimeline() {
  const tl = document.getElementById('journal-timeline');
  tl.innerHTML = '';
  let hasEntry = false;
  for (let d = 21; d >= 1; d--) {
    for (let pi = 0; pi < 2; pi++) {
      const text = _getJournal(d, pi);
      if (!text.trim()) continue;
      hasEntry = true;
      const ms = MISSIONS[d - 1];
      const entry = document.createElement('div');
      entry.className = 'timeline-entry';
      entry.innerHTML = `
        <div class="entry-header">
          <span class="entry-day">第 ${d} 天</span>
          <span class="entry-name">${STATE.emojis[pi]} ${STATE.players[pi]}</span>
          <span class="entry-mood">${_getMood(d, pi) || ''}</span>
        </div>
        <div class="entry-text">${escapeHtml(text)}</div>
        <div class="entry-mission">📋 ${ms.text}</div>
      `;
      tl.appendChild(entry);
    }
  }
  if (!hasEntry) tl.innerHTML = '<p class="empty-hint">还没有日记，开始打卡吧 📝</p>';
}

// ============================
// 16. Day Detail Modal
// ============================
function showDayDetail(day) {
  const ms = MISSIONS[day - 1];
  if (!ms) return;

  const overlay = document.createElement('div');
  overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.35);z-index:100;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease-out;`;

  const c0 = _getCompleted(day, 0), c1 = _getCompleted(day, 1);

  overlay.innerHTML = `
    <div style="background:white;border-radius:20px;padding:24px;max-width:360px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,0.12);animation:popIn 0.25s ease-out">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="font-size:18px;color:var(--pink-dark);margin:0">第 ${day} 天</h3>
        <span style="font-size:12px;color:var(--text-light)">${WEEK_THEMES[ms.week]}</span>
      </div>
      <p style="font-size:14px;line-height:1.6;background:#FFF0E6;padding:12px;border-radius:10px;margin-bottom:14px">📋 ${ms.text}</p>
      <div style="display:flex;gap:12px;margin-bottom:12px">
        <div style="flex:1;text-align:center;padding:10px;background:${c0 ? '#E8F8F0' : '#F5F0F0'};border-radius:10px">
          <div style="font-size:24px">${STATE.emojis[0]}</div>
          <div style="font-size:12px;margin:2px 0">${STATE.players[0]}</div>
          <div>${c0 ? '✅' : '⬜'} ${_getMood(day, 0) || '--'}</div>
          <div style="font-size:13px;color:var(--gold)">${'★'.repeat(_getRating(day, 0))}${'☆'.repeat(5 - _getRating(day, 0))}</div>
        </div>
        <div style="flex:1;text-align:center;padding:10px;background:${c1 ? '#E8F8F0' : '#F5F0F0'};border-radius:10px">
          <div style="font-size:24px">${STATE.emojis[1]}</div>
          <div style="font-size:12px;margin:2px 0">${STATE.players[1]}</div>
          <div>${c1 ? '✅' : '⬜'} ${_getMood(day, 1) || '--'}</div>
          <div style="font-size:13px;color:var(--gold)">${'★'.repeat(_getRating(day, 1))}${'☆'.repeat(5 - _getRating(day, 1))}</div>
        </div>
      </div>
      <button onclick="this.parentElement.parentElement.remove()"
        style="width:100%;padding:10px;border:none;border-radius:10px;background:#F0E8E8;font-size:14px;cursor:pointer;font-family:inherit;color:var(--text-light)">关闭</button>
    </div>
  `;
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

// ============================
// 17. Init
// ============================
document.addEventListener('DOMContentLoaded', () => {
  // Allow Enter key on password screen
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const pwInput = document.getElementById('password-input');
      if (pwInput && pwInput === document.activeElement) {
        handlePassword();
      }
    }
  });
  init();
});
