/* ============================================================
   multipoint.js — Multi-Point Progress + Bounce Bar
   Dos minijuegos de timing en el sublobby de SkillChecks
   ============================================================ */

(() => {

// ── Multi-Point Progress ────────────────────────────────────
GameRegistry.register({
  id:          'multipoint',
  name:        'Multi-Point',
  tag:         'REFLEJOS',
  accent:      '#a78bfa',
  icon:        '🎯',
  num:         'SC-A',
  description: 'Haz clic al pasar por cada punto marcado en la barra.',
  difficulty:  3,
  hidden:      true,
  css:         'css/multipoint.css',

  init() {
    const wrap = document.getElementById('multipoint');
    if (!wrap) return;

    const $ = id => wrap.querySelector('#' + id);

    /* ── Config state ── */
    const cfg = {
      points:   5,
      duration: 4000,   // ms
      window:   80,     // ms half-window for a hit
    };

    /* ── Build HTML ── */
    wrap.innerHTML = `
      <div class="mp2-card">
        <div class="mp2-header">
          <div>
            <div class="mp2-title">Multi-Point Progress</div>
            <div class="mp2-sub">Haz clic cuando el marcador pase por cada punto</div>
          </div>
          <div class="mp2-badge" id="mp2Badge">LISTO</div>
        </div>

        <div class="mp2-config" id="mp2Config">
          <div class="mp2-cfg-row">
            <label class="mp2-cfg-label">Puntos <span id="mp2PtsVal">5</span></label>
            <input class="mp2-slider" type="range" id="mp2Pts" min="2" max="12" value="5">
          </div>
          <div class="mp2-cfg-row">
            <label class="mp2-cfg-label">Duración <span id="mp2DurVal">4.0s</span></label>
            <input class="mp2-slider" type="range" id="mp2Dur" min="1500" max="8000" step="250" value="4000">
          </div>
          <div class="mp2-cfg-row">
            <label class="mp2-cfg-label">Tolerancia <span id="mp2WinVal">Normal</span></label>
            <input class="mp2-slider" type="range" id="mp2Win" min="30" max="150" step="10" value="80">
          </div>
        </div>

        <div class="mp2-track-wrap">
          <div class="mp2-track" id="mp2Track">
            <div class="mp2-fill" id="mp2Fill"></div>
            <div class="mp2-cursor" id="mp2Cursor"></div>
          </div>
        </div>

        <div class="mp2-result" id="mp2Result"></div>

        <div class="mp2-stats" id="mp2Stats" style="display:none">
          <div class="mp2-stat"><span class="mp2-stat-val" id="mp2StatHit">0</span><span class="mp2-stat-lbl">Acertados</span></div>
          <div class="mp2-stat"><span class="mp2-stat-val" id="mp2StatMiss">0</span><span class="mp2-stat-lbl">Fallados</span></div>
          <div class="mp2-stat"><span class="mp2-stat-val" id="mp2StatScore">0</span><span class="mp2-stat-lbl">Puntos</span></div>
        </div>

        <div class="mp2-actions">
          <button class="mp2-btn mp2-btn--start" id="mp2Start">▶ EMPEZAR</button>
        </div>
      </div>
    `;

    /* ── Refs ── */
    const track    = $('mp2Track');
    const fill     = $('mp2Fill');
    const cursor   = $('mp2Cursor');
    const result   = $('mp2Result');
    const stats    = $('mp2Stats');
    const badge    = $('mp2Badge');
    const startBtn = $('mp2Start');
    const slPts    = $('mp2Pts'),  valPts = $('mp2PtsVal');
    const slDur    = $('mp2Dur'),  valDur = $('mp2DurVal');
    const slWin    = $('mp2Win'),  valWin = $('mp2WinVal');

    /* ── Config sliders ── */
    slPts.addEventListener('input', () => {
      cfg.points = +slPts.value;
      valPts.textContent = cfg.points;
    });
    slDur.addEventListener('input', () => {
      cfg.duration = +slDur.value;
      valDur.textContent = (cfg.duration / 1000).toFixed(1) + 's';
    });
    slWin.addEventListener('input', () => {
      cfg.window = +slWin.value;
      valWin.textContent = cfg.window <= 50 ? 'Estricta' : cfg.window <= 90 ? 'Normal' : 'Amplia';
    });

    /* ── Game state ── */
    let running = false, raf = null, startTime = 0;
    let points = [];      // {pos: 0-1, hit: bool, missed: bool, el: div}
    let hits = 0, misses = 0, score = 0;
    let pendingClick = false;

    function buildPoints() {
      // Remove old dots
      wrap.querySelectorAll('.mp2-dot').forEach(d => d.remove());
      points = [];

      const positions = [];
      // Ensure spread: divide bar into n segments
      for (let i = 0; i < cfg.points; i++) {
        const segStart = i / cfg.points;
        const segEnd   = (i + 1) / cfg.points;
        // random within segment, avoid very edges
        const pos = segStart + (segEnd - segStart) * (0.15 + Math.random() * 0.7);
        positions.push(pos);
      }

      positions.forEach(pos => {
        const dot = document.createElement('div');
        dot.className = 'mp2-dot';
        dot.style.left = (pos * 100) + '%';
        track.appendChild(dot);
        points.push({ pos, hit: false, missed: false, el: dot });
      });
    }

    function endGame() {
      running = false;
      cancelAnimationFrame(raf);
      fill.style.width  = '100%';
      cursor.style.left = '100%';

      // Mark any remaining as missed
      points.forEach(p => {
        if (!p.hit) {
          p.missed = true;
          p.el.classList.add('mp2-dot--miss');
          misses++;
        }
      });

      const pct = Math.round((hits / cfg.points) * 100);
      score = hits * 100 - misses * 30;
      score = Math.max(0, score);

      $('mp2StatHit').textContent   = hits;
      $('mp2StatMiss').textContent  = misses;
      $('mp2StatScore').textContent = score;
      stats.style.display = 'flex';

      if (pct >= 70) {
        badge.textContent = '✔ SUPERADO';
        badge.className = 'mp2-badge mp2-badge--win';
        result.innerHTML = `<span style="color:#4ade80">✔ ${pct}% — ¡Superado!</span>`;
        if (typeof audioManager !== 'undefined') audioManager.play('perfect');
      } else {
        badge.textContent = '✖ FALLADO';
        badge.className = 'mp2-badge mp2-badge--fail';
        result.innerHTML = `<span style="color:#f87171">✖ ${pct}% — Inténtalo de nuevo</span>`;
        if (typeof audioManager !== 'undefined') audioManager.play('gameover');
      }

      if (window.Leaderboard) window.Leaderboard.save('multipoint', score);
      startBtn.textContent = '↺ REINICIAR';
      startBtn.disabled = false;

      document.removeEventListener('keydown', onKey);
      wrap.removeEventListener('click', onClick);
    }

    function processClick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / cfg.duration, 1);

      // Find nearest unhit point within window
      let best = null, bestDist = Infinity;
      points.forEach(p => {
        if (p.hit || p.missed) return;
        const dist = Math.abs((p.pos - progress) * cfg.duration);
        if (dist < cfg.window && dist < bestDist) {
          best = p;
          bestDist = dist;
        }
      });

      if (best) {
        best.hit = true;
        best.el.classList.add('mp2-dot--hit');
        hits++;
        // precision bonus
        const precision = 1 - (bestDist / cfg.window);
        const gained = Math.round(100 + precision * 50);
        result.innerHTML = `<span style="color:#4ade80">+${gained}</span>`;
        if (typeof audioManager !== 'undefined') audioManager.play(precision > 0.7 ? 'perfect' : 'good');
        // burst
        flashCursor('hit');
      } else {
        result.innerHTML = `<span style="color:#f87171">✖ Miss</span>`;
        if (typeof audioManager !== 'undefined') audioManager.play('miss');
        flashCursor('miss');
      }
    }

    function flashCursor(type) {
      cursor.classList.remove('mp2-cursor--hit', 'mp2-cursor--miss');
      void cursor.offsetWidth;
      cursor.classList.add(type === 'hit' ? 'mp2-cursor--hit' : 'mp2-cursor--miss');
      setTimeout(() => cursor.classList.remove('mp2-cursor--hit', 'mp2-cursor--miss'), 280);
    }

    function loop(ts) {
      if (!running) return;
      const elapsed  = ts - startTime;
      const progress = Math.min(elapsed / cfg.duration, 1);

      fill.style.width  = (progress * 100) + '%';
      cursor.style.left = (progress * 100) + '%';

      // Auto-mark missed points well past window
      points.forEach(p => {
        if (!p.hit && !p.missed) {
          const pElapsed = p.pos * cfg.duration;
          if (elapsed > pElapsed + cfg.window * 1.5) {
            p.missed = true;
            p.el.classList.add('mp2-dot--miss');
            misses++;
          }
        }
      });

      if (progress >= 1) { endGame(); return; }
      raf = requestAnimationFrame(loop);
    }

    function startGame() {
      running = false;
      cancelAnimationFrame(raf);

      hits = 0; misses = 0; score = 0;
      fill.style.width  = '0%';
      fill.style.transition = 'none';
      cursor.style.left = '0%';
      result.innerHTML  = '';
      stats.style.display = 'none';
      badge.textContent = '▶ JUGANDO';
      badge.className   = 'mp2-badge mp2-badge--run';
      startBtn.disabled = true;

      buildPoints();

      // Countdown
      let count = 3;
      result.innerHTML = `<span style="color:#a78bfa;font-size:2rem">${count}</span>`;
      const cd = setInterval(() => {
        count--;
        if (count > 0) {
          result.innerHTML = `<span style="color:#a78bfa;font-size:2rem">${count}</span>`;
        } else {
          clearInterval(cd);
          result.innerHTML = `<span style="color:#c4b5fd">¡YA!</span>`;
          running = true;
          startTime = performance.now();
          raf = requestAnimationFrame(loop);

          document.addEventListener('keydown', onKey);
          wrap.addEventListener('click', onClick);
        }
      }, 1000);
    }

    function onKey(e) {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        processClick(performance.now());
      }
    }
    function onClick(e) {
      if (e.target === startBtn) return;
      processClick(performance.now());
    }

    startBtn.addEventListener('click', () => {
      if (!running) startGame();
    });

    this._stop = () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      wrap.removeEventListener('click', onClick);
    };
  },

  stop() { if (this._stop) this._stop(); },
});


// ── Bounce Bar ──────────────────────────────────────────────
GameRegistry.register({
  id:          'bouncebar',
  name:        'Bounce Bar',
  tag:         'REFLEJOS',
  accent:      '#f472b6',
  icon:        '⚡',
  num:         'SC-B',
  description: 'La barra retrocede y se lanza — pulsa justo en la zona.',
  difficulty:  4,
  hidden:      true,
  css:         'css/multipoint.css',   // shared CSS

  init() {
    const wrap = document.getElementById('bouncebar');
    if (!wrap) return;

    const $ = id => wrap.querySelector('#' + id);

    wrap.innerHTML = `
      <div class="mp2-card bb-card">
        <div class="mp2-header">
          <div>
            <div class="mp2-title">Bounce Bar</div>
            <div class="mp2-sub">La barra retrocede y se lanza — pulsa cuando llegue a la zona</div>
          </div>
          <div class="mp2-badge" id="bbBadge">LISTO</div>
        </div>

        <div class="mp2-track-wrap">
          <div class="mp2-track bb-track" id="bbTrack">
            <div class="bb-zone" id="bbZone"></div>
            <div class="bb-fill" id="bbFill"></div>
            <div class="bb-cursor" id="bbCursor"></div>
          </div>
        </div>

        <div class="bb-phase-label" id="bbPhase">Preparado</div>
        <div class="mp2-result" id="bbResult"></div>

        <div class="mp2-stats" id="bbStats" style="display:none">
          <div class="mp2-stat"><span class="mp2-stat-val" id="bbStatHit">0</span><span class="mp2-stat-lbl">Acertados</span></div>
          <div class="mp2-stat"><span class="mp2-stat-val" id="bbStatRounds">0</span><span class="mp2-stat-lbl">Rondas</span></div>
          <div class="mp2-stat"><span class="mp2-stat-val" id="bbStatScore">0</span><span class="mp2-stat-lbl">Puntos</span></div>
        </div>

        <div class="mp2-actions">
          <button class="mp2-btn mp2-btn--start bb-start" id="bbStart">▶ EMPEZAR</button>
        </div>
      </div>
    `;

    const track    = $('bbTrack');
    const zone     = $('bbZone');
    const fill     = $('bbFill');
    const cursor   = $('bbCursor');
    const phase    = $('bbPhase');
    const result   = $('bbResult');
    const stats    = $('bbStats');
    const badge    = $('bbBadge');
    const startBtn = $('bbStart');

    const TOTAL_ROUNDS = 5;
    const ZONE_WIDTH   = 14;   // % width of hit zone

    let running = false, raf = null;
    let pos = 0;             // 0–100 %
    let roundHits = 0, totalRounds = 0, score = 0;
    let difficulty = 1;
    let phaseState = 'idle'; // idle | pullback | launch | result

    // Per-round config (randomized each round)
    let zonePos = 0;
    let pullTarget = 0, launchSpeed = 0;
    let pullSpeed  = 0;
    let t = 0;
    let canHit = false, hitThisRound = false;
    let frameTs = 0;

    function placeZone() {
      // Zone can be anywhere from 55% to 85%
      zonePos = 55 + Math.random() * 30;
      zone.style.left  = zonePos + '%';
      zone.style.width = ZONE_WIDTH + '%';
    }

    function startRound() {
      totalRounds++;
      hitThisRound = false;
      canHit = false;

      // Difficulty ramps up
      difficulty = 1 + (totalRounds - 1) * 0.3;
      pullTarget = 5 + Math.random() * 15;       // pull back to 5–20%
      pullSpeed  = 18 + difficulty * 4;           // px/s in %/s
      launchSpeed= 55 + difficulty * 10;

      placeZone();
      pos = 30 + Math.random() * 10;             // start ~30–40%
      fill.style.width  = pos + '%';
      fill.style.transition = 'none';
      cursor.style.left = pos + '%';

      phaseState = 'pullback';
      phase.textContent = '⬅ Retrocediendo…';
      phase.style.color = '#f472b6';

      t = 0;
    }

    function endGame(won) {
      running = false;
      cancelAnimationFrame(raf);
      phaseState = 'idle';

      stats.style.display = 'flex';
      $('bbStatHit').textContent    = roundHits;
      $('bbStatRounds').textContent = TOTAL_ROUNDS;
      $('bbStatScore').textContent  = score;

      if (won) {
        badge.textContent = '✔ SUPERADO';
        badge.className   = 'mp2-badge mp2-badge--win';
        result.innerHTML  = `<span style="color:#4ade80">✔ ¡Superado! ${roundHits}/${TOTAL_ROUNDS}</span>`;
        if (typeof audioManager !== 'undefined') audioManager.play('perfect');
      } else {
        badge.textContent = '✖ FALLADO';
        badge.className   = 'mp2-badge mp2-badge--fail';
        result.innerHTML  = `<span style="color:#f87171">✖ ${roundHits}/${TOTAL_ROUNDS} acertados</span>`;
        if (typeof audioManager !== 'undefined') audioManager.play('gameover');
      }

      if (window.Leaderboard) window.Leaderboard.save('bouncebar', score);
      startBtn.textContent = '↺ REINICIAR';
      startBtn.disabled    = false;

      document.removeEventListener('keydown', onKey);
      wrap.removeEventListener('click', onClick);
    }

    function processHit() {
      if (!canHit || hitThisRound) return;
      const inZone = pos >= zonePos && pos <= zonePos + ZONE_WIDTH;
      hitThisRound = true;
      canHit       = false;

      if (inZone) {
        const center   = zonePos + ZONE_WIDTH / 2;
        const dist     = Math.abs(pos - center);
        const precision = 1 - (dist / (ZONE_WIDTH / 2));
        const gained   = Math.round(100 + precision * 150);
        score  += gained;
        roundHits++;
        result.innerHTML = `<span style="color:#4ade80">✔ +${gained}</span>`;
        cursor.classList.add('bb-cursor--hit');
        setTimeout(() => cursor.classList.remove('bb-cursor--hit'), 400);
        if (typeof audioManager !== 'undefined') audioManager.play(precision > 0.7 ? 'perfect' : 'good');
      } else {
        result.innerHTML = `<span style="color:#f87171">✖ ¡Fallaste!</span>`;
        cursor.classList.add('bb-cursor--miss');
        setTimeout(() => cursor.classList.remove('bb-cursor--miss'), 400);
        if (typeof audioManager !== 'undefined') audioManager.play('miss');
      }

      // Pause briefly then next round or end
      phaseState = 'result';
      phase.textContent = '';
      setTimeout(() => {
        if (!running) return;
        if (totalRounds >= TOTAL_ROUNDS) {
          endGame(roundHits >= Math.ceil(TOTAL_ROUNDS * 0.6));
        } else {
          startRound();
        }
      }, 900);
    }

    let lastFrame2 = 0;
    function loop(ts) {
      if (!running) return;
      const dt = Math.min((ts - lastFrame2) / 1000, 0.05);
      lastFrame2 = ts;

      if (phaseState === 'pullback') {
        pos -= pullSpeed * dt;
        if (pos <= pullTarget) {
          pos = pullTarget;
          phaseState = 'launch';
          phase.textContent = '🚀 ¡AHORA!';
          phase.style.color = '#fbbf24';
          canHit = true;

          // flash zone
          zone.classList.add('bb-zone--pulse');
          setTimeout(() => zone.classList.remove('bb-zone--pulse'), 500);
        }
      } else if (phaseState === 'launch') {
        pos += launchSpeed * dt;
        if (pos > 100) {
          pos = 100;
          // Auto-miss if not clicked
          if (!hitThisRound) {
            result.innerHTML = `<span style="color:#f87171">✖ ¡Demasiado tarde!</span>`;
            if (typeof audioManager !== 'undefined') audioManager.play('miss');
          }
          phaseState = 'result';
          phase.textContent = '';
          canHit = false;
          setTimeout(() => {
            if (!running) return;
            if (totalRounds >= TOTAL_ROUNDS) {
              endGame(roundHits >= Math.ceil(TOTAL_ROUNDS * 0.6));
            } else {
              startRound();
            }
          }, 900);
        }
      }

      fill.style.width  = pos + '%';
      cursor.style.left = pos + '%';
      raf = requestAnimationFrame(loop);
    }

    function startGame() {
      running = false;
      cancelAnimationFrame(raf);

      roundHits = 0; totalRounds = 0; score = 0; difficulty = 1;
      stats.style.display = 'none';
      result.innerHTML  = '';
      badge.textContent = '▶ JUGANDO';
      badge.className   = 'mp2-badge mp2-badge--run';
      startBtn.disabled = true;
      phaseState        = 'idle';
      pos = 30;
      fill.style.width  = '0%';
      cursor.style.left = '0%';

      let count = 3;
      phase.textContent = count;
      phase.style.color = '#a78bfa';
      const cd = setInterval(() => {
        count--;
        if (count > 0) {
          phase.textContent = count;
        } else {
          clearInterval(cd);
          running    = true;
          lastFrame2 = performance.now();
          startRound();
          raf = requestAnimationFrame(loop);

          document.addEventListener('keydown', onKey);
          wrap.addEventListener('click', onClick);
        }
      }, 1000);
    }

    function onKey(e) {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        processHit();
      }
    }
    function onClick(e) {
      if (e.target === startBtn) return;
      processHit();
    }

    startBtn.addEventListener('click', () => {
      if (!running) startGame();
    });

    this._stop = () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      wrap.removeEventListener('click', onClick);
    };
  },

  stop() { if (this._stop) this._stop(); },
});

})();
