/**
 * js/games/termita.js
 *
 * Migrado al sistema GameRegistry.
 * Ya no usa getElementById globales: recibe `ui` resuelto desde
 * los atributos data-ui de la <section id="termita">.
 *
 * Elementos esperados (marcados en index.html con data-ui="..."):
 *   start, grid, gridSize, targets, showTime, rounds, info
 */

(function () {
  'use strict';

  function init(ui) {
    const { grid: gridEl, gridSize: gridSizeEl, targets: targetsEl,
            showTime: showTimeEl, rounds: roundsEl, info: termitaInfo,
            start: startTermita } = ui;

    if (!startTermita) return; // sección no presente

    let state = {
      size: 5,
      targets: 4,
      showTime: 800,
      rounds: 5,
      currentRound: 0,
      score: 0,
      targetsList: [],
      selections: new Set(),
      acceptingInput: false
    };

    function setupGrid(size) {
      gridEl.innerHTML = '';
      gridEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
      const total = size * size;
      for (let i = 0; i < total; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = String(i);
        cell.addEventListener('click', () => onCellClick(i));
        gridEl.appendChild(cell);
      }
    }

    function pickTargets(size, count) {
      const total = size * size;
      const picks = new Set();
      while (picks.size < Math.min(count, total)) {
        picks.add(Math.floor(Math.random() * total));
      }
      return Array.from(picks);
    }

    function lightTargets(targets) {
      targets.forEach(idx => {
        const el = gridEl.children[idx];
        if (el) el.classList.add('lit');
      });
    }

    function clearLights() {
      Array.from(gridEl.children).forEach(c => c.classList.remove('lit'));
    }

    function onCellClick(index) {
      if (!state.acceptingInput) return;
      const el = gridEl.children[index];
      if (!el || el.classList.contains('selected')) return;
      el.classList.add('selected');
      audioManager.play('click');
      state.selections.add(index);
      if (state.selections.size >= state.targets) {
        evaluateRound();
      }
    }

    function evaluateRound() {
      state.acceptingInput = false;
      const targetsSet = new Set(state.targetsList);
      let correct = 0;
      Array.from(gridEl.children).forEach((c, i) => {
        const idx = Number(i);
        if (targetsSet.has(idx) && state.selections.has(idx)) {
          c.classList.add('correct'); correct++;
        } else if (state.selections.has(idx) && !targetsSet.has(idx)) {
          c.classList.add('wrong');
        } else if (targetsSet.has(idx) && !state.selections.has(idx)) {
          c.classList.add('wrong');
        }
      });
      state.score += correct;
      const allCorrect = correct === state.targetsList.length && state.selections.size === state.targetsList.length;
      audioManager.play(allCorrect ? 'good' : 'miss');
      termitaInfo.textContent = `Ronda ${state.currentRound}/${state.rounds} — Aciertos: ${correct} — Puntuación total: ${state.score}`;
      setTimeout(() => {
        Array.from(gridEl.children).forEach(c => c.classList.remove('selected', 'correct', 'wrong'));
        state.selections.clear();
        if (state.currentRound < state.rounds) {
          playRound();
        } else {
          termitaInfo.textContent = `Juego terminado — Puntuación final: ${state.score}`;
          audioManager.play('perfect');
          if (window.Leaderboard) window.Leaderboard.save('termita', state.score, state.rounds);
        }
      }, 1000);
    }

    function playRound() {
      state.currentRound += 1;
      state.targetsList = pickTargets(state.size, state.targets);
      gridEl.classList.remove('hidden');
      lightTargets(state.targetsList);
      setTimeout(() => {
        clearLights();
        state.acceptingInput = true;
        termitaInfo.textContent = `Ronda ${state.currentRound}/${state.rounds} — Selecciona los ${state.targets} cubos.`;
      }, state.showTime);
    }

    startTermita.addEventListener('click', () => {
      state.size = parseInt(gridSizeEl.value, 10) || 5;
      state.targets = Math.max(1, Math.min(parseInt(targetsEl.value, 10) || 4, state.size * state.size));
      state.showTime = Math.max(100, parseInt(showTimeEl.value, 10) || 800);
      state.rounds = Math.max(1, parseInt(roundsEl.value, 10) || 5);
      state.currentRound = 0;
      state.score = 0;
      state.selections.clear();
      state.targetsList = [];
      setupGrid(state.size);
      termitaInfo.textContent = '';
      playRound();
      startTermita.disabled = true;
      const totalDuration = (state.showTime + 2000) * state.rounds;
      setTimeout(() => { startTermita.disabled = false; }, totalDuration);
    });
  }

  function stop() {
    // El juego no usa timers persistentes fuera de una ronda en curso;
    // no requiere limpieza adicional al volver al lobby.
  }

  /* ── Registro ── */
  window.GameRegistry.register({
    id:          'termita',
    name:        'Termita',
    tag:         'MEMORIA',
    accent:      '#f97316',
    icon:        '🐜',
    num:         '01',
    description: 'Memoriza la cuadrícula iluminada. Señala las celdas correctas antes de que el sistema las borre.',
    difficulty:  2,
    css:         'css/termita.css',

    init,   // recibe ui resuelto desde data-ui
    stop,
    leaderboard: {
      format: v => `${v} pts`
    }
  });

}());
