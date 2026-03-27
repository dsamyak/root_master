// =====================================================================
// DATA: Perfect squares and cubes
// =====================================================================
const SQUARE_ROOTS = [
  {n:1,root:1},{n:4,root:2},{n:9,root:3},{n:16,root:4},{n:25,root:5},
  {n:36,root:6},{n:49,root:7},{n:64,root:8},{n:81,root:9},{n:100,root:10},
  {n:121,root:11},{n:144,root:12},{n:169,root:13},{n:196,root:14},{n:225,root:15}
];
const CUBE_ROOTS = [
  {n:1,root:1},{n:8,root:2},{n:27,root:3},{n:64,root:4},{n:125,root:5},
  {n:216,root:6},{n:343,root:7},{n:512,root:8},{n:729,root:9},{n:1000,root:10}
];

const AGE_CONFIG = [
  { label:'Beginner',  sqMax:5,  cbMax:3 },
  { label:'Intermediate', sqMax:10, cbMax:5 },
  { label:'Advanced',  sqMax:15, cbMax:10 }
];

const OBJECTS = ['🌱','🍀','🌿','🌾','🌸','🌻','🍁','🍄','🎋','🪴'];
const COLORS = ['#10B981','#8B5CF6','#F59E0B','#00C896','#4FC3F7','#CE93D8','#FF7043','#26C6DA'];

// =====================================================================
// STATE
// =====================================================================
const STATE = {
  ageGroup: 1,
  rootType: 'square',   // 'square', 'cube', 'both'
  xp: 0, level: 1, combo: 0, bestCombo: 0,
  totalCorrect: 0, totalAnswered: 0,
  masteredSquares: new Set(),
  masteredCubes: new Set(),
  currentGame: null,
  adaptSpeed: 1,
  recentResults: [],
  practiceType: 'square',
  get accuracy() {
    if (this.totalAnswered === 0) return 0;
    return Math.round((this.totalCorrect / this.totalAnswered) * 100);
  },
  get xpForNextLevel() { return this.level * 120; }
};

const gameTimers = [];
function stopAllGameTimers() {
  gameTimers.forEach(t => clearInterval(t));
  gameTimers.length = 0;
}

// =====================================================================
// HELPER: Generate a question based on current settings
// =====================================================================
function getPool() {
  const cfg = AGE_CONFIG[STATE.ageGroup];
  let pool = [];
  if (STATE.rootType === 'square' || STATE.rootType === 'both')
    pool = pool.concat(SQUARE_ROOTS.slice(0, cfg.sqMax));
  if (STATE.rootType === 'cube' || STATE.rootType === 'both')
    pool = pool.concat(CUBE_ROOTS.slice(0, cfg.cbMax));
  return pool;
}

function generateQuestion() {
  const pool = getPool();
  const item = pool[Math.floor(Math.random() * pool.length)];
  const isSquare = SQUARE_ROOTS.includes(item);
  return {
    n: item.n,
    root: item.root,
    type: isSquare ? 'square' : 'cube',
    symbol: isSquare ? '√' : '∛',
    display: isSquare ? `√${item.n}` : `∛${item.n}`
  };
}

function generateWrongAnswers(correct, count) {
  const pool = getPool();
  const allRoots = [...new Set(pool.map(p => p.root))];
  const wrongs = new Set();
  const candidates = allRoots.filter(r => r !== correct);
  shuffle(candidates);
  while (wrongs.size < Math.min(count, candidates.length)) {
    wrongs.add(candidates[wrongs.size]);
  }
  // pad with nearby
  let extra = correct;
  while (wrongs.size < count) {
    extra++;
    if (extra !== correct) wrongs.add(extra);
  }
  return [...wrongs].slice(0, count);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// =====================================================================
// BG NUMBERS
// =====================================================================
function initBgNumbers() {
  const container = document.getElementById('bgNumbers');
  container.innerHTML = '';
  const syms = ['√','∛','²','³','=','1','4','9','16','25','64','√','∛'];
  for (let i = 0; i < 22; i++) {
    const el = document.createElement('div');
    el.className = 'bg-num';
    el.textContent = syms[Math.floor(Math.random() * syms.length)];
    const size = 30 + Math.random() * 80;
    el.style.cssText = `left:${Math.random()*100}%;font-size:${size}px;animation-duration:${10+Math.random()*20}s;animation-delay:${-Math.random()*20}s;`;
    container.appendChild(el);
  }
}
initBgNumbers();

// =====================================================================
// SCREENS
// =====================================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
  if (id === 'dashboard-screen') updateDashboard();
  if (id === 'practice-screen') buildPracticeList();
  if (id === 'menu-screen') updateMenuHud();
}

function selectAge(idx, el) {
  document.querySelectorAll('.age-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  STATE.ageGroup = idx;
}

function setRootType(type, btn) {
  STATE.rootType = type;
  document.querySelectorAll('#welcomeRootToggle .root-toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function goToMenu() { showScreen('menu-screen'); updateMenuHud(); }

function exitGame() { stopAllGameTimers(); showScreen('menu-screen'); }

function updateMenuHud() {
  document.getElementById('menu-xp').textContent = STATE.xp + ' XP';
  document.getElementById('menu-level').textContent = STATE.level;
  document.getElementById('menu-acc').textContent = STATE.accuracy + '%';
  const pct = Math.min(100, (STATE.xp / STATE.xpForNextLevel) * 100);
  document.getElementById('menuXpBar').style.width = pct + '%';
  const labels = { square: '√ Square', cube: '∛ Cube', both: '√ + ∛ Both' };
  document.getElementById('menu-root-badge').textContent = labels[STATE.rootType] || '√ Square';
}

// =====================================================================
// XP & LEVELING
// =====================================================================
function addXP(amount) {
  STATE.xp += amount;
  while (STATE.xp >= STATE.xpForNextLevel) {
    STATE.xp -= STATE.xpForNextLevel;
    STATE.level++;
    showLevelUp();
  }
  updateMenuHud();
}

function showLevelUp() {
  document.getElementById('newLevelNum').textContent = STATE.level;
  document.getElementById('levelUpText').innerHTML = `You reached Level <strong>${STATE.level}</strong>! 🎊`;
  document.getElementById('levelUpModal').classList.add('open');
  triggerConfetti();
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// =====================================================================
// COMBO
// =====================================================================
function incrementCombo() {
  STATE.combo++;
  if (STATE.combo > STATE.bestCombo) STATE.bestCombo = STATE.combo;
  if (STATE.combo >= 3) {
    document.getElementById('comboNum').textContent = STATE.combo;
    const banner = document.getElementById('comboBanner');
    banner.classList.add('show');
    setTimeout(() => banner.classList.remove('show'), 1800);
  }
}
function resetCombo() { STATE.combo = 0; }

// =====================================================================
// FEEDBACK
// =====================================================================
function showFeedback(correct) {
  const msg = document.getElementById('feedbackMsg');
  msg.textContent = correct ? '✓' : '✗';
  msg.className = 'feedback-msg ' + (correct ? 'correct' : 'wrong');
  msg.classList.add('pop');
  setTimeout(() => { msg.classList.remove('pop'); setTimeout(() => { msg.style.opacity = 0; }, 150); }, 500);
}

function showStarPop(x, y) {
  const el = document.createElement('div');
  el.className = 'star-pop';
  el.textContent = ['⭐','✨','💫','🌟'][Math.floor(Math.random() * 4)];
  el.style.cssText = `left:${x}px;top:${y}px;`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// =====================================================================
// CONFETTI
// =====================================================================
function triggerConfetti() {
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `left:${Math.random()*100}vw;top:-10px;background:${COLORS[Math.floor(Math.random()*COLORS.length)]};animation-delay:${Math.random()*0.5}s;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }
}

// =====================================================================
// RECORD ANSWER
// =====================================================================
function recordAnswer(q, correct) {
  STATE.totalAnswered++;
  if (correct) {
    STATE.totalCorrect++;
    incrementCombo();
    if (q.type === 'square') STATE.masteredSquares.add(q.n);
    else STATE.masteredCubes.add(q.n);
  } else { resetCombo(); }
  STATE.recentResults.push(correct);
  if (STATE.recentResults.length > 10) STATE.recentResults.shift();
  const recentAcc = STATE.recentResults.filter(Boolean).length / STATE.recentResults.length;
  if (STATE.recentResults.length >= 5) {
    STATE.adaptSpeed = recentAcc > 0.8 ? Math.min(2, STATE.adaptSpeed + 0.1) : Math.max(0.4, STATE.adaptSpeed - 0.1);
  }
}

// =====================================================================
// GAME LAUNCHER
// =====================================================================
function startGame(num) {
  stopAllGameTimers();
  STATE.currentGame = num;
  showScreen('game' + num + '-screen');
  if (num === 2) initGame2();
  else if (num === 3) initGame3();
  else if (num === 4) initGame4();
  else if (num === 5) initGame5();
  else if (num === 6) initGame6();
  else if (num === 7) initGame7();
  document.getElementById('playAgainBtn').onclick = () => { closeModal('gameOverModal'); startGame(num); };
}

// =====================================================================
// GAME 2: DRAG & MATCH
// =====================================================================
let g2 = { xp: 0, pairs: [], dragItem: null, slots: {}, score: 0, total: 0 };

function initGame2() {
  g2.xp = 0; g2.score = 0;
  const pool = getPool();
  const shuffled = shuffle([...pool]);
  const items = shuffled.slice(0, Math.min(5, shuffled.length));
  g2.total = items.length;

  const equations = document.getElementById('matchEquations');
  const answers = document.getElementById('matchAnswers');
  equations.innerHTML = '';
  answers.innerHTML = '';
  g2.slots = {};

  items.forEach(item => {
    const isSquare = SQUARE_ROOTS.includes(item);
    const symbol = isSquare ? '√' : '∛';
    const eq = document.createElement('div');
    eq.className = 'match-item';
    eq.textContent = `${symbol}${item.n} = ?`;
    eq.dataset.answer = item.root;

    const slot = document.createElement('div');
    slot.className = 'match-slot';
    slot.dataset.expected = item.root;
    slot.textContent = '?';
    equations.appendChild(eq);
    answers.appendChild(slot);
    g2.slots[item.root] = slot;
  });

  const answerItems = items.map(i => {
    const d = document.createElement('div');
    d.className = 'match-item';
    d.textContent = i.root;
    d.draggable = true;
    d.dataset.value = i.root;
    d.addEventListener('dragstart', e => { g2.dragItem = d; d.classList.add('dragging'); e.dataTransfer.setData('text', i.root); });
    d.addEventListener('dragend', () => d.classList.remove('dragging'));
    // Touch support
    d.addEventListener('touchstart', touchStartG2, { passive: true });
    d.addEventListener('touchmove', touchMoveG2, { passive: false });
    d.addEventListener('touchend', touchEndG2);
    return d;
  });
  shuffle(answerItems);
  const ansCol = document.createElement('div');
  ansCol.className = 'match-col';
  ansCol.id = 'dragAnswerCol';
  ansCol.style.cssText = 'position:relative;';
  answerItems.forEach(a => ansCol.appendChild(a));
  answers.parentElement.appendChild(ansCol);
  answers.remove();

  document.querySelectorAll('.match-slot').forEach(slot => {
    slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('over'); });
    slot.addEventListener('dragleave', () => slot.classList.remove('over'));
    slot.addEventListener('drop', e => {
      e.preventDefault();
      slot.classList.remove('over');
      const val = e.dataTransfer.getData('text');
      slot.textContent = val;
      slot.dataset.placed = val;
    });
  });

  document.getElementById('g2-xp').textContent = g2.xp;
  document.getElementById('g2-score').textContent = g2.score + '/' + g2.total;
}

let touchG2El = null, touchG2Clone = null;
function touchStartG2(e) {
  touchG2El = e.currentTarget;
  const rect = touchG2El.getBoundingClientRect();
  touchG2Clone = touchG2El.cloneNode(true);
  touchG2Clone.style.cssText = `position:fixed;z-index:9999;opacity:0.8;width:${rect.width}px;pointer-events:none;left:${rect.left}px;top:${rect.top}px;`;
  document.body.appendChild(touchG2Clone);
}
function touchMoveG2(e) {
  e.preventDefault();
  if (!touchG2Clone) return;
  const t = e.touches[0];
  touchG2Clone.style.left = (t.clientX - 50) + 'px';
  touchG2Clone.style.top = (t.clientY - 25) + 'px';
}
function touchEndG2(e) {
  if (!touchG2Clone || !touchG2El) return;
  const t = e.changedTouches[0];
  document.querySelectorAll('.match-slot').forEach(slot => {
    const r = slot.getBoundingClientRect();
    if (t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom) {
      slot.textContent = touchG2El.dataset.value;
      slot.dataset.placed = touchG2El.dataset.value;
    }
  });
  touchG2Clone.remove(); touchG2Clone = null; touchG2El = null;
}

function checkMatchGame() {
  let correct = 0;
  document.querySelectorAll('.match-slot').forEach(slot => {
    const placed = slot.dataset.placed;
    const expected = slot.dataset.expected;
    if (placed == expected) { slot.classList.add('correct'); correct++; }
    else { slot.classList.remove('correct'); slot.classList.add('wrong'); }
  });
  g2.score = correct;
  document.getElementById('g2-score').textContent = correct + '/' + g2.total;
  const xpGain = correct * 12;
  g2.xp += xpGain;
  document.getElementById('g2-xp').textContent = g2.xp;
  addXP(xpGain);
  showFeedback(correct === g2.total);
  if (correct === g2.total) { triggerConfetti(); showStarPop(window.innerWidth / 2, 200); }
  setTimeout(() => initGame2(), 2200);
}

// =====================================================================
// GAME 3: VISUAL BUILDER
// =====================================================================
let g3 = { xp: 0, score: 0 };

function initGame3() { g3.xp = 0; g3.score = 0; nextG3Question(); }

function nextG3Question() {
  const q = generateQuestion();
  document.getElementById('visualQuestion').textContent = `${q.symbol}${q.n} = ?`;

  const display = document.getElementById('groupsDisplay');
  display.innerHTML = '';

  const hint = document.getElementById('visualHint');
  if (q.type === 'square') {
    hint.textContent = `${q.n} = ${q.root} × ${q.root} (a ${q.root}×${q.root} grid)`;
    // Show grid of dots
    const box = document.createElement('div');
    box.className = 'group-box';
    box.style.width = (q.root * 28 + 20) + 'px';
    for (let r = 0; r < q.root; r++) {
      for (let c = 0; c < q.root; c++) {
        const dot = document.createElement('span');
        dot.className = 'obj-icon';
        dot.style.animationDelay = ((r * q.root + c) * 0.03) + 's';
        dot.textContent = OBJECTS[q.root % OBJECTS.length];
        box.appendChild(dot);
      }
    }
    display.appendChild(box);
  } else {
    hint.textContent = `${q.n} = ${q.root} × ${q.root} × ${q.root} (${q.root} layers of ${q.root}×${q.root})`;
    // Show cube layers
    for (let layer = 0; layer < Math.min(q.root, 4); layer++) {
      const box = document.createElement('div');
      box.className = 'group-box';
      for (let i = 0; i < q.root * q.root; i++) {
        const dot = document.createElement('span');
        dot.className = 'obj-icon';
        dot.style.animationDelay = (i * 0.03) + 's';
        dot.textContent = OBJECTS[(q.root + layer) % OBJECTS.length];
        box.appendChild(dot);
      }
      const lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:0.7rem;font-weight:700;color:var(--text-light);width:100%;text-align:center;';
      lbl.textContent = `Layer ${layer + 1}`;
      box.appendChild(lbl);
      display.appendChild(box);
    }
    if (q.root > 4) {
      const more = document.createElement('div');
      more.style.cssText = 'font-family:var(--font);font-weight:800;font-size:1.2rem;color:var(--text-light);align-self:center;';
      more.textContent = `...+${q.root - 4} more`;
      display.appendChild(more);
    }
  }

  const wrongs = generateWrongAnswers(q.root, 3);
  const opts = shuffle([q.root, ...wrongs]);
  const btns = document.getElementById('visualAnsBtns');
  btns.innerHTML = '';
  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'ans-btn normal';
    btn.textContent = opt;
    btn.onclick = () => {
      const correct = opt === q.root;
      recordAnswer(q, correct);
      showFeedback(correct);
      btn.className = 'ans-btn ' + (correct ? 'correct-ans' : 'wrong-ans');
      if (correct) {
        g3.score++;
        g3.xp += 10;
        addXP(10);
        showStarPop(btn.getBoundingClientRect().left, btn.getBoundingClientRect().top);
      }
      document.getElementById('g3-score').textContent = g3.score;
      document.getElementById('g3-xp').textContent = g3.xp;
      setTimeout(() => nextG3Question(), 900);
    };
    btns.appendChild(btn);
  });
}

// =====================================================================
// GAME 4: SPEED TAP
// =====================================================================
let g4 = { xp: 0, score: 0, combo: 0, timeLeft: 60, interval: null };

function initGame4() {
  g4.xp = 0; g4.score = 0; g4.combo = 0; g4.timeLeft = 60;
  document.getElementById('g4-xp').textContent = 0;
  document.getElementById('g4-score').textContent = 0;
  document.getElementById('g4-combo').textContent = 0;
  document.getElementById('g4-time').textContent = '60s';
  document.getElementById('speedTimerFill').style.width = '100%';
  document.getElementById('speedTimerFill').style.background = 'linear-gradient(90deg, var(--green), var(--accent))';
  newG4Question();

  g4.interval = setInterval(() => {
    if (!document.getElementById('game4-screen').classList.contains('active')) { clearInterval(g4.interval); return; }
    g4.timeLeft -= 0.1;
    const pct = (g4.timeLeft / 60) * 100;
    document.getElementById('speedTimerFill').style.width = pct + '%';
    if (pct < 30) document.getElementById('speedTimerFill').style.background = 'linear-gradient(90deg, var(--red), #FF8A80)';
    document.getElementById('g4-time').textContent = Math.ceil(g4.timeLeft) + 's';
    if (g4.timeLeft <= 0) {
      clearInterval(g4.interval);
      document.getElementById('goScore').textContent = g4.score;
      document.getElementById('gameOverModal').classList.add('open');
    }
  }, 100);
  gameTimers.push(g4.interval);
}

function newG4Question() {
  const q = generateQuestion();
  document.getElementById('speedQuestion').textContent = q.display + ' = ?';
  const wrongs = generateWrongAnswers(q.root, 3);
  const opts = shuffle([q.root, ...wrongs]);
  const btns = document.getElementById('speedAnswers');
  btns.innerHTML = '';
  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'speed-ans-btn';
    btn.textContent = opt;
    btn.onclick = () => {
      const correct = opt === q.root;
      recordAnswer(q, correct);
      showFeedback(correct);
      if (correct) {
        g4.score += 10;
        g4.xp += 10;
        addXP(10);
        g4.combo++;
        showStarPop(btn.getBoundingClientRect().left, btn.getBoundingClientRect().top);
      } else {
        g4.combo = 0;
        g4.timeLeft = Math.max(0, g4.timeLeft - 3);
      }
      document.getElementById('g4-score').textContent = g4.score;
      document.getElementById('g4-xp').textContent = g4.xp;
      document.getElementById('g4-combo').textContent = g4.combo;
      newG4Question();
    };
    btns.appendChild(btn);
  });
}

// =====================================================================
// GAME 5: MEMORY FLIP
// =====================================================================
let g5 = { xp: 0, flipped: [], matched: 0, total: 0, locked: false };

function initGame5() {
  g5.xp = 0; g5.flipped = []; g5.matched = 0; g5.locked = false;
  const pool = getPool();
  const shuffled = shuffle([...pool]);
  const count = Math.min(6, shuffled.length);
  g5.total = count;
  document.getElementById('g5-pairs').textContent = '0/' + count;

  const cards = [];
  shuffled.slice(0, count).forEach(item => {
    const isSquare = SQUARE_ROOTS.includes(item);
    const symbol = isSquare ? '√' : '∛';
    cards.push({ id: item.n + '_q', pairId: item.n, text: `${symbol}${item.n}`, type: 'question' });
    cards.push({ id: item.n + '_a', pairId: item.n, text: `${item.root}`, type: 'answer' });
  });
  shuffle(cards);

  const grid = document.getElementById('memoryGrid');
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
  cards.forEach(card => {
    const el = document.createElement('div');
    el.className = 'mem-card';
    el.dataset.id = card.id;
    el.dataset.pairId = card.pairId;
    el.dataset.text = card.text;
    el.textContent = '?';
    el.onclick = () => flipMemCard(el);
    grid.appendChild(el);
  });
  document.getElementById('g5-xp').textContent = g5.xp;
}

function flipMemCard(el) {
  if (g5.locked || el.classList.contains('flipped') || el.classList.contains('matched')) return;
  el.textContent = el.dataset.text;
  el.classList.add('flipped');
  g5.flipped.push(el);

  if (g5.flipped.length === 2) {
    g5.locked = true;
    const [a, b] = g5.flipped;
    const isMatch = a.dataset.pairId === b.dataset.pairId && a.dataset.id !== b.dataset.id;
    const pool = getPool();
    const item = pool.find(p => p.n == a.dataset.pairId);
    const isSquare = item ? SQUARE_ROOTS.includes(item) : true;
    const q = { type: isSquare ? 'square' : 'cube', n: parseInt(a.dataset.pairId) };

    setTimeout(() => {
      if (isMatch) {
        a.classList.remove('flipped'); b.classList.remove('flipped');
        a.classList.add('matched'); b.classList.add('matched');
        g5.matched++;
        g5.xp += 15;
        addXP(15);
        recordAnswer(q, true);
        showFeedback(true);
        showStarPop(b.getBoundingClientRect().left, b.getBoundingClientRect().top);
        document.getElementById('g5-pairs').textContent = g5.matched + '/' + g5.total;
        document.getElementById('g5-xp').textContent = g5.xp;
        if (g5.matched === g5.total) { triggerConfetti(); setTimeout(() => initGame5(), 1200); }
      } else {
        a.classList.add('wrong-flip'); b.classList.add('wrong-flip');
        recordAnswer(q, false);
        showFeedback(false);
        setTimeout(() => {
          a.classList.remove('flipped','wrong-flip'); b.classList.remove('flipped','wrong-flip');
          a.textContent = '?'; b.textContent = '?';
        }, 600);
      }
      g5.flipped = [];
      g5.locked = false;
    }, 700);
  }
}

// =====================================================================
// GAME 6: ROOT RUNNER
// =====================================================================
let g6 = { xp: 0, dist: 0, speed: 1, running: true, question: null, obsInterval: null };

function initGame6() {
  g6.xp = 0; g6.dist = 0; g6.running = true;
  g6.speed = 1 * STATE.adaptSpeed;

  clearInterval(g6.obsInterval);
  document.getElementById('runnerChar').style.animationPlayState = 'running';
  document.getElementById('runnerObstacle').style.display = 'none';
  newG6Question();

  g6.obsInterval = setInterval(() => {
    if (!document.getElementById('game6-screen').classList.contains('active')) { clearInterval(g6.obsInterval); return; }
    if (g6.running) {
      g6.dist += g6.speed;
      document.getElementById('g6-dist').textContent = Math.floor(g6.dist) + 'm';
    }
  }, 100);
  gameTimers.push(g6.obsInterval);
}

function newG6Question() {
  const q = generateQuestion();
  g6.question = q;
  document.getElementById('runnerQ').textContent = q.display + ' = ?';
  document.getElementById('runnerObstacle').textContent = q.display;
  document.getElementById('runnerObstacle').style.display = 'block';

  const wrongs = generateWrongAnswers(q.root, STATE.ageGroup === 0 ? 2 : 3);
  const opts = shuffle([q.root, ...wrongs]);
  const row = document.getElementById('runnerAns');
  row.innerHTML = '';
  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'runner-ans';
    btn.textContent = opt;
    btn.onclick = () => checkG6(opt, btn);
    row.appendChild(btn);
  });
  animateObstacle();
}

function animateObstacle() {
  const obs = document.getElementById('runnerObstacle');
  obs.style.right = '-100px';
  obs.style.transition = 'none';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    obs.style.transition = 'right ' + (4 / STATE.adaptSpeed) + 's linear';
    obs.style.right = '110%';
  }));
}

function checkG6(val, btn) {
  const correct = val === g6.question.root;
  recordAnswer(g6.question, correct);
  showFeedback(correct);
  if (correct) {
    g6.xp += 15; addXP(15);
    showStarPop(btn.getBoundingClientRect().left, btn.getBoundingClientRect().top);
    g6.running = true; g6.speed = Math.min(3, g6.speed + 0.1);
    document.getElementById('runnerChar').style.animationPlayState = 'running';
    document.getElementById('runnerChar').textContent = '🧮';
    document.getElementById('g6-xp').textContent = g6.xp;
    setTimeout(() => { if (document.getElementById('game6-screen').classList.contains('active')) newG6Question(); }, 600);
  } else {
    g6.speed = Math.max(0.3, g6.speed - 0.2);
    document.getElementById('runnerChar').textContent = '😵';
    document.getElementById('runnerChar').classList.add('shake');
    setTimeout(() => { document.getElementById('runnerChar').classList.remove('shake'); document.getElementById('runnerChar').textContent = '🧮'; }, 500);
    document.getElementById('g6-xp').textContent = g6.xp;
  }
}

// =====================================================================
// GAME 7: GRID CHALLENGE
// =====================================================================
let g7 = { xp: 0, score: 0, selected: new Set(), correct: new Set(), gridType: 'square' };

function initGame7() { g7.xp = 0; g7.score = 0; nextGridRound(); }

function nextGridRound() {
  g7.selected = new Set();
  g7.correct = new Set();

  // Decide grid type
  if (STATE.rootType === 'both') g7.gridType = Math.random() < 0.5 ? 'square' : 'cube';
  else g7.gridType = STATE.rootType === 'cube' ? 'cube' : 'square';

  const pool = g7.gridType === 'square'
    ? SQUARE_ROOTS.slice(0, AGE_CONFIG[STATE.ageGroup].sqMax)
    : CUBE_ROOTS.slice(0, AGE_CONFIG[STATE.ageGroup].cbMax);

  const correctNums = new Set(pool.map(p => p.n));
  g7.correct = correctNums;
  const symbol = g7.gridType === 'square' ? 'perfect squares' : 'perfect cubes';
  document.getElementById('gridInstruction').textContent = `🔲 Select all ${symbol}`;

  const max = g7.gridType === 'square' ? (AGE_CONFIG[STATE.ageGroup].sqMax ** 2) + 30 : (AGE_CONFIG[STATE.ageGroup].cbMax ** 3) + 50;
  const allNums = [...correctNums];
  while (allNums.length < 40) {
    const n = randInt(2, max);
    if (!correctNums.has(n) && !allNums.includes(n)) allNums.push(n);
  }
  shuffle(allNums);

  const grid = document.getElementById('numberGrid');
  grid.innerHTML = '';
  allNums.slice(0, 40).forEach(n => {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.textContent = n;
    cell.dataset.num = n;
    cell.onclick = () => toggleGridCell(cell, n);
    grid.appendChild(cell);
  });
  document.getElementById('g7-score').textContent = g7.score;
  document.getElementById('g7-xp').textContent = g7.xp;
}

function toggleGridCell(cell, n) {
  if (g7.selected.has(n)) { g7.selected.delete(n); cell.classList.remove('selected'); }
  else { g7.selected.add(n); cell.classList.add('selected'); }
}

function checkGrid() {
  let correct = 0, wrong = 0;
  document.querySelectorAll('.grid-cell').forEach(cell => {
    const n = parseInt(cell.dataset.num);
    const isCorrect = g7.correct.has(n);
    const isSelected = g7.selected.has(n);
    if (isCorrect && isSelected) { cell.classList.add('correct'); correct++; }
    else if (!isCorrect && isSelected) { cell.classList.add('wrong-sel'); wrong++; }
    else if (isCorrect && !isSelected) { cell.classList.add('revealed'); }
  });

  const total = g7.correct.size;
  const accuracy = correct / total;
  const pool = getPool();
  const item = pool[0];
  recordAnswer({ type: g7.gridType, n: item ? item.n : 1 }, accuracy >= 0.8);
  showFeedback(accuracy >= 0.8);

  if (accuracy >= 0.8) {
    const xpGain = correct * 5;
    g7.xp += xpGain;
    addXP(xpGain);
    g7.score += correct;
    if (accuracy === 1 && wrong === 0) { triggerConfetti(); showStarPop(window.innerWidth / 2, window.innerHeight / 2); }
  }
  document.getElementById('g7-xp').textContent = g7.xp;
  document.getElementById('g7-score').textContent = g7.score;
}

// =====================================================================
// PRACTICE MODE
// =====================================================================
let practiceType = 'square';

function setPracticeType(type, btn) {
  practiceType = type;
  document.querySelectorAll('#practiceRootToggle .root-toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  buildPracticeList();
  document.getElementById('practiceSteps').style.display = 'none';
}

function buildPracticeList() {
  const list = document.getElementById('practiceTableList');
  list.innerHTML = '';

  if (practiceType === 'square') {
    const cfg = AGE_CONFIG[STATE.ageGroup];
    SQUARE_ROOTS.slice(0, cfg.sqMax).forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'practice-num-btn' + (STATE.masteredSquares.has(item.n) ? ' mastered' : '');
      btn.innerHTML = `√${item.n}<br><span style="font-size:0.7em;opacity:0.7">=${item.root}</span>`;
      btn.onclick = () => showPracticeTable(item.n, 'square');
      list.appendChild(btn);
    });
  } else {
    const cfg = AGE_CONFIG[STATE.ageGroup];
    CUBE_ROOTS.slice(0, cfg.cbMax).forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'practice-num-btn' + (STATE.masteredCubes.has(item.n) ? ' mastered' : '');
      btn.innerHTML = `∛${item.n}<br><span style="font-size:0.7em;opacity:0.7">=${item.root}</span>`;
      btn.onclick = () => showPracticeTable(item.n, 'cube');
      list.appendChild(btn);
    });
  }
}

function showPracticeTable(n, type) {
  document.getElementById('practiceSteps').style.display = 'block';
  const symbol = type === 'square' ? '√' : '∛';
  const pool = type === 'square' ? SQUARE_ROOTS : CUBE_ROOTS;
  const item = pool.find(p => p.n === n);
  if (!item) return;

  document.getElementById('practiceTitle').textContent = `${symbol}${n} = ${item.root}`;
  const list = document.getElementById('practiceStepsList');
  list.innerHTML = '';

  const dotColor = COLORS[item.root % COLORS.length];

  if (type === 'square') {
    // Show the factorization and proof
    const steps = [
      { eq: `${n} = ${item.root} × ${item.root}`, hint: 'Perfect square' },
      { eq: `${symbol}${n} = ${item.root}`, hint: 'Because ' + item.root + '² = ' + n },
      { eq: `${item.root}² = ${n}`, hint: item.root + ' rows of ' + item.root }
    ];
    steps.forEach(step => {
      const row = document.createElement('div');
      row.className = 'practice-step';
      const dots = [];
      if (n <= 100) {
        for (let d = 0; d < n; d++) dots.push(`<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${dotColor};margin:2px;animation:popIn 0.3s ease ${d*0.02}s both"></span>`);
      }
      row.innerHTML = `<span class="eq">${step.eq}</span><span style="font-size:0.8rem;color:var(--text-light);font-weight:600">${step.hint}</span>`;
      if (d => d < n) row.innerHTML += `<div class="practice-dots">${dots.join('')}</div>`;
      list.appendChild(row);
    });
  } else {
    const steps = [
      { eq: `${n} = ${item.root} × ${item.root} × ${item.root}`, hint: 'Perfect cube' },
      { eq: `${symbol}${n} = ${item.root}`, hint: 'Because ' + item.root + '³ = ' + n },
      { eq: `${item.root}³ = ${n}`, hint: item.root + ' layers of ' + item.root + '×' + item.root }
    ];
    steps.forEach(step => {
      const row = document.createElement('div');
      row.className = 'practice-step';
      row.innerHTML = `<span class="eq">${step.eq}</span><span style="font-size:0.8rem;color:var(--text-light);font-weight:600">${step.hint}</span>`;
      list.appendChild(row);
    });
    // Multiplication table for this root
    const header = document.createElement('div');
    header.style.cssText = 'font-family:var(--font);font-weight:700;font-size:1rem;color:var(--primary);margin:10px 0 6px;';
    header.textContent = `Powers of ${item.root}:`;
    list.appendChild(header);
    [1,2,3,4].forEach(p => {
      const row = document.createElement('div');
      row.className = 'practice-step';
      row.innerHTML = `<span class="eq">${item.root}^${p}</span><span class="eq-ans">${Math.pow(item.root, p)}</span>`;
      list.appendChild(row);
    });
  }
  list.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// =====================================================================
// DASHBOARD
// =====================================================================
function updateDashboard() {
  document.getElementById('dash-xp').textContent = STATE.xp;
  document.getElementById('dash-level').textContent = STATE.level;
  document.getElementById('dash-acc').textContent = STATE.accuracy + '%';
  document.getElementById('dash-streak').textContent = STATE.bestCombo;
  document.getElementById('dash-sq').textContent = STATE.masteredSquares.size;
  document.getElementById('dash-cb').textContent = STATE.masteredCubes.size;

  const sqWrap = document.getElementById('sqBadges');
  sqWrap.innerHTML = '';
  const sqCfg = AGE_CONFIG[STATE.ageGroup];
  SQUARE_ROOTS.slice(0, sqCfg.sqMax).forEach(item => {
    const badge = document.createElement('div');
    badge.className = 'table-badge' + (STATE.masteredSquares.has(item.n) ? ' done' : '');
    badge.textContent = `√${item.n}` + (STATE.masteredSquares.has(item.n) ? ' ✓' : '');
    sqWrap.appendChild(badge);
  });

  const cbWrap = document.getElementById('cbBadges');
  cbWrap.innerHTML = '';
  CUBE_ROOTS.slice(0, AGE_CONFIG[STATE.ageGroup].cbMax).forEach(item => {
    const badge = document.createElement('div');
    badge.className = 'table-badge' + (STATE.masteredCubes.has(item.n) ? ' done' : '');
    badge.textContent = `∛${item.n}` + (STATE.masteredCubes.has(item.n) ? ' ✓' : '');
    cbWrap.appendChild(badge);
  });
}

// =====================================================================
// INIT
// =====================================================================
document.querySelectorAll('.age-card')[1].classList.add('selected');
document.addEventListener('dragover', e => e.preventDefault());


// Make functions global for inline HTML handlers
window.closeModal = typeof closeModal !== 'undefined' ? closeModal : null;
window.showScreen = typeof showScreen !== 'undefined' ? showScreen : null;
window.selectAge = typeof selectAge !== 'undefined' ? selectAge : null;
window.setRootType = typeof setRootType !== 'undefined' ? setRootType : null;
window.goToMenu = typeof goToMenu !== 'undefined' ? goToMenu : null;
window.startGame = typeof startGame !== 'undefined' ? startGame : null;
window.exitGame = typeof exitGame !== 'undefined' ? exitGame : null;
window.checkMatchGame = typeof checkMatchGame !== 'undefined' ? checkMatchGame : null;
window.checkGrid = typeof checkGrid !== 'undefined' ? checkGrid : null;
window.nextGridRound = typeof nextGridRound !== 'undefined' ? nextGridRound : null;
window.setPracticeType = typeof setPracticeType !== 'undefined' ? setPracticeType : null;