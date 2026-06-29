// Skillcheck.js — hub de navegación + Circle mini-game

(() => {

// ── Hub: SkillChecks ────────────────────────────────────────
GameRegistry.register({
  id:          'skillchecks',
  name:        'Skill Check',
  tag:         'REFLEJOS',
  accent:      '#10b981',
  icon:        '🎯',
  num:         '08',
  description: 'Colección de minijuegos de habilidad y reflejos.',
  difficulty:  3,
  css:         'css/Skillcheck.css',

  init() {
    const map = {
      rapidlines:     'rapidlines-game',
      circle:         'circle-game',
      maze:           'maze-game',
      keyspam:        'keyspam-game',
      sequence:       'sequence-game',
      rhythmclick:    'rhythmclick',
      progresstiming: 'progresstiming',
      multipoint:    'multipoint',
      bouncebar:     'bouncebar',
    };

    document.querySelectorAll('.skill-cube').forEach(cube => {
      cube.addEventListener('click', () => {
        const key = cube.dataset.game;
        if (map[key]) window.showView(map[key]);
      });
    });
  },

  stop() {},   // hub has no running state to clean up
});


// ── Circle mini-game ────────────────────────────────────────
GameRegistry.register({
  id:          'circle-game',
  name:        'Circle',
  tag:         'REFLEJOS',
  accent:      '#10b981',
  icon:        '⭕',
  num:         '08b',
  description: 'Detén la aguja en la zona verde. Cada acierto la hace más pequeña y rápida.',
  difficulty:  3,
  hidden:      true,     // sub-view, not shown as lobby card
  leaderboard: { format: v => `${v} pts` },

  init() {
    const needle   = document.getElementById('circleNeedle');
    const target   = document.getElementById('circleTarget');
    const startBtn = document.getElementById('startCircle');
    const result   = document.getElementById('circleResult');
    if (!needle || !target || !startBtn || !result) return;

    const scoreEl = document.getElementById('circleScore');
    const comboEl = document.getElementById('circleCombo');
    const bestEl  = document.getElementById('circleBest');

    let angle = 0, running = false, animationId = null;
    let speed = 2, zoneSize = 50;
    let score = 0, combo = 0;
    let bestScore = Number(localStorage.getItem('circleBest')) || 0;
    let targetAngle = 0;

    const MIN_ZONE_SIZE = 20, MAX_SPEED = 5, RADIUS = 150;

    if (bestEl) bestEl.textContent = bestScore;

    function placeTarget() {
      targetAngle = Math.random() * 360;
      const rad = (targetAngle - 90) * Math.PI / 180;
      target.style.left      = `calc(50% + ${Math.cos(rad) * RADIUS}px)`;
      target.style.top       = `calc(50% + ${Math.sin(rad) * RADIUS}px)`;
      target.style.width     = `${zoneSize}px`;
      target.style.transform = `translate(-50%, -50%) rotate(${targetAngle}deg)`;
    }

    function animate() {
      if (!running) return;
      angle += speed;
      needle.style.transform = `translateX(-50%) rotate(${angle}deg)`;
      animationId = requestAnimationFrame(animate);
    }

    startBtn.addEventListener('click', e => {
      e.preventDefault(); startBtn.blur();
      if (running) return;
      speed = 1.5; zoneSize = 50;
      score = 0; combo = 0;
      if (scoreEl) scoreEl.textContent = 0;
      if (comboEl) comboEl.textContent = 0;
      angle = Math.random() * 360;
      placeTarget();
      running = true;
      result.textContent = 'Pulsa ESPACIO';
      animate();
    });

    document.addEventListener('keydown', e => {
      if (e.code !== 'Space') return;
      e.preventDefault(); startBtn.blur();
      if (e.repeat || !running) return;

      const pos  = angle % 360;
      let diff   = Math.abs(pos - targetAngle);
      if (diff > 180) diff = 360 - diff;

      const ringRect = document.querySelector('.circle-ring').getBoundingClientRect();
      const radius   = ringRect.width / 2 - 10;
      const hitAngle = (zoneSize / radius) * (180 / Math.PI) / 2;

      if (diff <= hitAngle) {
        combo++;
        const precision = 1 - (diff / hitAngle);
        const gained    = Math.round(100 + precision * 100 + speed * 20 + combo * 5);
        score += gained;
        audioManager.play(precision > 0.8 ? 'perfect' : 'good');
        if (scoreEl) scoreEl.textContent = score;
        if (comboEl) comboEl.textContent = combo;
        if (score > bestScore) {
          bestScore = score;
          localStorage.setItem('circleBest', bestScore);
          if (bestEl) bestEl.textContent = bestScore;
        }
        zoneSize = Math.max(MIN_ZONE_SIZE, zoneSize - 1);
        speed    = Math.min(MAX_SPEED, speed + 0.5);
        placeTarget();
        result.innerHTML = `<span style="color:#44ff88">✔ +${gained}</span>`;
      } else {
        running = false;
        cancelAnimationFrame(animationId);
        combo = 0;
        if (comboEl) comboEl.textContent = 0;
        audioManager.play('gameover');
        result.innerHTML = `<span style="color:#ff5555">✖ Fallaste<br>Score: ${score}</span>`;
        if (window.Leaderboard) window.Leaderboard.save('circle-game', score);
      }
    });

    placeTarget();

    this._stop = function () {
      if (!running) return;
      running = false;
      cancelAnimationFrame(animationId);
    };
  },

  stop() { if (this._stop) this._stop(); },
});

})();
