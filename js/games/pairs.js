/**
 * js/games/pairs.js
 *
 * Migrado al sistema GameRegistry.
 * Elementos esperados (data-ui dentro de <section id="pairs">):
 *   startPairs, pairsBoard, pairsMovesEl, pairsPairsEl, pairsTimeEl,
 *   pairsTimerBar, pairsDiffBtns, pairsMessage
 */

(function () {
  'use strict';

  let timerInterval = null;
  let lock = false;

  function init(ui) {
    const {
      startPairs, pairsBoard,
      pairsMovesEl, pairsPairsEl, pairsTimeEl,
      pairsTimerBar, pairsDiffBtns,
      pairsMessage
    } = ui;

    if (!startPairs) return; // sección no presente

    const ICONS = [
      'skull','flame','bolt','star','moon','sun','cloud','snowflake',
      'diamond','crown','anchor','leaf','bug','rocket','compass','eye',
      'lock','key','shield','ghost','fish','heart','bell','camera'
    ];

    const ICON_COLORS = [
      '#f87171','#fb923c','#fbbf24','#34d399','#22d3ee','#818cf8',
      '#e879f9','#f472b6','#94a3b8','#4ade80','#2dd4bf','#60a5fa',
      '#c084fc','#f9a8d4','#fcd34d','#86efac','#67e8f9','#a5b4fc',
      '#fda4af','#f97316','#22d3ee','#a78bfa','#86efac','#f43f5e'
    ];

    let pairs = 12, totalTime = 90;
    let cards = [], flipped = [], matched = 0, moves = 0;
    let timeLeft = 90;

    function setDifficulty(n, time) {
      pairs = n;
      totalTime = time;
      timeLeft = time;
      pairsDiffBtns.forEach(b => {
        b.classList.toggle('pairs-diff--active', parseInt(b.dataset.pairs) === n);
      });
      startGame();
    }

    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    function startGame() {
      clearInterval(timerInterval);
      flipped = []; matched = 0; moves = 0; lock = false;
      timeLeft = totalTime;
      pairsMovesEl.textContent = '0';
      pairsPairsEl.textContent = '0';
      pairsTimeEl.textContent = timeLeft;
      pairsMessage.textContent = '';
      pairsMessage.className = 'pairs-message';
      pairsTimerBar.style.width = '100%';
      pairsTimerBar.style.background = '#22d3ee';

      const pool = shuffle([...ICONS]).slice(0, pairs);
      const colorMap = {};
      pool.forEach((ic, i) => { colorMap[ic] = ICON_COLORS[i % ICON_COLORS.length]; });

      cards = shuffle([...pool, ...pool].map((icon, i) => ({
        icon, id: i, color: colorMap[icon], flipped: false, matched: false
      })));

      renderBoard();
      timerInterval = setInterval(tick, 1000);
    }

    function tick() {
      timeLeft--;
      pairsTimeEl.textContent = timeLeft;
      const pct = timeLeft / totalTime * 100;
      pairsTimerBar.style.width = pct + '%';
      pairsTimerBar.style.background =
        pct > 50 ? '#22d3ee' : pct > 25 ? '#f97316' : '#f43f5e';
      if (timeLeft <= 0) { clearInterval(timerInterval); endGame(false); }
    }

    function getColumns() {
      if (pairs === 12) return 6;  // 24 cards → 6×4
      if (pairs === 16) return 8;  // 32 cards → 8×4
      if (pairs === 20) return 8;  // 40 cards → 8×5
      return 6;
    }

    function renderBoard() {
      pairsBoard.innerHTML = '';
      const cols = getColumns();
      pairsBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

      cards.forEach((c, i) => {
        const el = document.createElement('div');
        el.className = 'pairs-card';
        if (c.flipped || c.matched) el.classList.add('pairs-card--flipped');
        if (c.matched) el.classList.add('pairs-card--matched');
        el.innerHTML = `
          <div class="pairs-card-inner">
            <div class="pairs-card-front"></div>
            <div class="pairs-card-back">
              <svg class="pairs-icon" width="55%" height="55%" viewBox="0 0 24 24"
                   fill="none" stroke="${c.color}" stroke-width="1.6"
                   stroke-linecap="round" stroke-linejoin="round">
                ${getIconPath(c.icon)}
              </svg>
            </div>
          </div>`;
        el.addEventListener('click', () => flip(i, el));
        pairsBoard.appendChild(el);
      });
    }

    function flip(i, el) {
      const c = cards[i];
      if (lock || c.flipped || c.matched) return;
      c.flipped = true;
      el.classList.add('pairs-card--flipped');
      audioManager.play('click');
      flipped.push({ i, el });

      if (flipped.length === 2) {
        lock = true;
        moves++;
        pairsMovesEl.textContent = moves;
        const [a, b] = flipped;

        if (cards[a.i].icon === cards[b.i].icon) {
          audioManager.play('good');
          setTimeout(() => {
            cards[a.i].matched = cards[b.i].matched = true;
            a.el.classList.add('pairs-card--matched');
            b.el.classList.add('pairs-card--matched');
            matched++;
            pairsPairsEl.textContent = matched;
            flipped = []; lock = false;
            if (matched === pairs) endGame(true);
          }, 350);
        } else {
          audioManager.play('miss');
          setTimeout(() => {
            a.el.classList.add('pairs-card--shake');
            b.el.classList.add('pairs-card--shake');
            setTimeout(() => {
              cards[a.i].flipped = false;
              cards[b.i].flipped = false;
              a.el.classList.remove('pairs-card--flipped', 'pairs-card--shake');
              b.el.classList.remove('pairs-card--flipped', 'pairs-card--shake');
              flipped = []; lock = false;
            }, 380);
          }, 620);
        }
      }
    }

    function endGame(won) {
      clearInterval(timerInterval);
      lock = true;
      if (won) {
        audioManager.play('perfect');
        pairsMessage.textContent = '✓ ¡Todos los pares encontrados!';
        pairsMessage.classList.add('pairs-message--win');
      } else {
        audioManager.play('gameover');
        pairsMessage.textContent = '✗ Tiempo agotado. Inténtalo de nuevo.';
        pairsMessage.classList.add('pairs-message--fail');
      }
    }

    function getIconPath(name) {
      const paths = {
        skull:      '<circle cx="12" cy="8" r="5"/><path d="M8 14v1a4 4 0 0 0 8 0v-1"/><line x1="10" y1="14" x2="10" y2="17"/><line x1="14" y1="14" x2="14" y2="17"/>',
        flame:      '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
        bolt:       '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
        star:       '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
        moon:       '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
        sun:        '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
        cloud:      '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
        snowflake:  '<line x1="12" y1="2" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="19.07" y2="4.93"/>',
        diamond:    '<polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/>',
        crown:      '<path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 20h14"/>',
        anchor:     '<circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="21"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/>',
        leaf:       '<path d="M2 22c1.25-.987 2.27-1.975 3.9-2.99C19 11 22 2 22 2S11 5 7.1 18.09c-1.015 1.63-2.001 2.668-3.1 3.91z"/>',
        bug:        '<circle cx="12" cy="10" r="4"/><path d="M8 10H2m18 0h-6M4 4l4 3m8-3l-4 3M4 20l4-4m8 4l-4-4M12 14v7"/>',
        rocket:     '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>',
        compass:    '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
        eye:        '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
        lock:       '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
        key:        '<path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zM0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
        shield:     '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        ghost:      '<path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/>',
        fish:       '<path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6z"/>',
        heart:      '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
        bell:       '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
        camera:     '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'
      };
      return paths[name] || '<circle cx="12" cy="12" r="8"/>';
    }

    pairsDiffBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const n = parseInt(btn.dataset.pairs);
        const t = parseInt(btn.dataset.time);
        setDifficulty(n, t);
      });
    });

    startPairs.addEventListener('click', startGame);
    window._pairsStart = startGame;
  }

  function stop() {
    lock = true;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  window.GameRegistry.register({
    id:          'pairs',
    name:        'Pairs',
    tag:         'ESTRATEGIA',
    accent:      '#fb7185',
    icon:        '🃏',
    num:         '08',
    description: 'Encuentra todos los pares iguales con el menor número de movimientos posible.',
    difficulty:  2,
    css:         'css/pairs.css',

    init,
    stop,
  });

}());
