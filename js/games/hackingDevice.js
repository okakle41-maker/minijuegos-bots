/**
 * js/games/hackingDevice.js
 *
 * Migrado al sistema GameRegistry.
 * Elementos esperados (data-ui dentro de <section id="soup">):
 *   start, hackingBoard, hackingSize, hackingLength, hackingTime,
 *   hackingRounds, hackingMoveAll, hackingHighlightTarget,
 *   hackingStreak, hackingMax, hackingTimer, hackingTarget, hackingInfo
 */

(function () {
  'use strict';

  let activeState = null; // referencia al state activo, usada por stop()

  function init(ui) {
    const { start: startHacking, hackingBoard, hackingSize, hackingLength,
            hackingTime, hackingRounds, hackingMoveAll, hackingHighlightTarget,
            hackingStreak, hackingMax, hackingTimer, hackingTarget, hackingInfo } = ui;

    if (!startHacking) return; // sección no presente

    hackingBoard.after(startHacking);

    const pools = {
      letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
      numbers: '0123456789',
      symbols: '✉☢✦☮♆☎♞♫☚✧✪✦✶',
      greek: 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩψσπφ',
      runes: 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ',
      braille: '⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚',
      cyrillic: 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
      arabic: 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي',
      chinese:'中国人大小天地山水火木金土日月东西南北上下左右文字学生力心手目'
    };

    let state = {
      target: '',
      grid: [],
      size: 10,
      length: 2,
      time: 15,
      rounds: 5,
      currentRound: 0,
      streak: 0,
      maxStreak: 0,
      timer: null,
      timeLeft: 0,
      playing: false,
      instances: [],
      moveTimer: null,
      moveInterval: 1100
    };
    activeState = state;

    state.moveAll = false;

    function getSelectedPools() {
      const opts = Array.from(
        document.getElementById('soup').querySelectorAll('.symbol-chip.active')
      ).map(el => el.dataset.value);
      let chars = '';
      opts.forEach(k => {
        if (pools[k]) chars += pools[k];
      });
      if (!chars) {
        chars = pools.letters + pools.numbers;
      }
      return chars;
    }

    document.getElementById('soup').querySelectorAll('.symbol-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
      });
    });

    function randomChar(chars) {
      return chars.charAt(Math.floor(Math.random() * chars.length));
    }

    function generateTarget() {
      const chars = getSelectedPools();
      let t = '';
      for (let i = 0; i < state.length; i++) t += randomChar(chars);
      state.target = t;
      hackingTarget.querySelector('strong').innerHTML =
        Array.from(t).join('<br>');
    }

    function createGrid() {
      state.grid = [];
      const chars = getSelectedPools();
      for (let r = 0; r < state.size; r++) {
        const row = [];
        for (let c = 0; c < state.size; c++) {
          let cell = '';
          let attempts = 0;
          do {
            cell = cell.trim();
            for (let k = 0; k < state.length; k++) cell += randomChar(chars);
            attempts += 1;
            if (attempts > 8) break;
          } while (state.target && cell === state.target);
          row.push(cell);
        }
        state.grid.push(row);
      }

      state.instances.forEach(inst => {
        const rr = ((inst.r % state.size) + state.size) % state.size;
        const rc = ((inst.c % state.size) + state.size) % state.size;
        state.grid[rr][rc] = inst.text;
      });
    }

    function renderBoard() {
      hackingBoard.innerHTML = '';
      hackingBoard.style.gridTemplateColumns = `repeat(${state.size}, 1fr)`;
      state.grid.forEach((row, r) => {
        row.forEach((cell, c) => {
          const btn = document.createElement('button');
          btn.className = 'symbol-cell';
          btn.type = 'button';

          btn.innerHTML = Array.from(cell)
            .map(ch => `<span>${ch}</span>`)
            .join('');

          btn.dataset.pos = `${r},${c}`;
          btn.addEventListener('click', () => onCellClick(r, c, btn));
          const shouldHighlight = hackingHighlightTarget && hackingHighlightTarget.checked && cell === state.target;
          if (shouldHighlight) btn.classList.add('highlight');
          hackingBoard.appendChild(btn);
        });
      });
      hackingBoard.classList.remove('hidden');
    }

    function initInstances() {
      state.instances = [];
      const inst = {
        r: Math.floor(Math.random() * state.size),
        c: Math.floor(Math.random() * state.size),
        text: state.target
      };
      state.instances.push(inst);
    }

    function moveInstancesStep() {
      if (state.moveAll) {
        shiftWholeBoard();
      } else {
        state.instances.forEach(inst => {
          inst.c -= 1;
          if (inst.c < 0) {
            inst.r -= 1;
            inst.c = state.size - 1;
          }
          if (inst.r < 0) {
            inst.r = state.size - 1;
            inst.c = state.size - 1;
          }
        });
        createGrid();
      }
      renderBoard();
    }

    function onCellClick(r, c, el) {
      if (!state.playing) return;
      const val = state.grid[r][c];
      if (val === state.target) {
        el.classList.add('correct');
        audioManager.play('good');
        state.streak += 1;
        state.maxStreak = Math.max(state.maxStreak, state.streak);
        hackingStreak.textContent = `STREAK: ${state.streak}`;
        hackingMax.textContent = `MAX STREAK: ${state.maxStreak}`;
        hackingInfo.textContent = `¡Correcto! Generando nuevo tablero...`;
        resetTimer();
        setTimeout(() => nextRound(true), 600);
      } else {
        el.classList.add('wrong');
        audioManager.play('miss');
        hackingInfo.textContent = `Incorrecto.`;
      }
    }

    function updateTimerDisplay() {
      hackingTimer.textContent = `TIEMPO: ${state.timeLeft.toFixed(1)}s`;
    }

    function tick() {
      state.timeLeft -= 0.1;
      if (state.timeLeft <= 0) {
        clearInterval(state.timer);
        state.timer = null;
        hackingInfo.textContent = `Tiempo agotado. Ronda finalizada.`;
        state.streak = 0;
        hackingStreak.textContent = `STREAK: ${state.streak}`;
        state.playing = false;
        startHacking.disabled = false;
        audioManager.play('gameover');
        if (state.moveTimer) { clearInterval(state.moveTimer); state.moveTimer = null; }
        if (window.Leaderboard) window.Leaderboard.save('soup', state.maxStreak);
        return;
      }
      updateTimerDisplay();
    }

    function resetTimer() {
      if (state.timer) { clearInterval(state.timer); state.timer = null; }
      state.timeLeft = state.time;
      updateTimerDisplay();
      state.timer = setInterval(tick, 100);
      if (state.moveTimer) { clearInterval(state.moveTimer); state.moveTimer = null; }
      moveInstancesStep();
      state.moveTimer = setInterval(moveInstancesStep, state.moveInterval);
    }

    function nextRound(found) {
      if (found) state.currentRound += 1;
      if (state.currentRound >= state.rounds) {
        hackingInfo.textContent = `¡Completaste ${state.rounds} rondas! Puntuación: ${state.streak}`;
        state.playing = false;
        startHacking.disabled = false;
        audioManager.play('perfect');
        if (state.timer) { clearInterval(state.timer); state.timer = null; }
        if (state.moveTimer) { clearInterval(state.moveTimer); state.moveTimer = null; }
        if (window.Leaderboard) window.Leaderboard.save('soup', state.maxStreak);
        return;
      }

      generateTarget();
      initInstances();
      createGrid();
      renderBoard();
      resetTimer();
      hackingInfo.textContent = `Ronda ${state.currentRound + 1}/${state.rounds}. Busca el patrón.`;
    }

    function shiftWholeBoard() {
      const flat = state.grid.flat();
      const first = flat.shift();
      flat.push(first);
      state.grid = [];
      for (let r = 0; r < state.size; r++) {
        state.grid.push(
          flat.slice(
            r * state.size,
            (r + 1) * state.size
          )
        );
      }
    }

    startHacking.addEventListener('click', () => {
      state.size = Math.max(5, Math.min(parseInt(hackingSize.value, 10) || 10, 20));
      state.length = Math.max(1, Math.min(parseInt(hackingLength.value, 10) || 2, 4));
      state.time = Math.max(1, Math.min(parseInt(hackingTime.value, 10) || 15, 60));
      state.rounds = Math.max(1, Math.min(parseInt(hackingRounds.value, 10) || 5, 50));
      state.moveAll = hackingMoveAll && hackingMoveAll.checked;
      state.currentRound = 0;
      state.streak = 0;
      state.maxStreak = 0;
      hackingStreak.textContent = `STREAK: ${state.streak}`;
      hackingMax.textContent = `MAX STREAK: ${state.maxStreak}`;
      state.playing = true;
      startHacking.disabled = true;
      nextRound(false);
    });
  }

  function stop() {
    const state = activeState;
    if (!state) return;
    state.playing = false;
    if (state.timer)     { clearInterval(state.timer);     state.timer = null; }
    if (state.moveTimer) { clearInterval(state.moveTimer); state.moveTimer = null; }
  }

  window.GameRegistry.register({
    id:          'soup',
    name:        'Hacking Device',
    tag:         'CIFRADO',
    accent:      '#f43f5e',
    icon:        '💀',
    num:         '04',
    description: 'Descifra el código de acceso e infiltra el sistema antes de que el firewall te detecte.',
    difficulty:  5,
    css:         'css/hacking.css',

    init,
    stop,
    leaderboard: { format: v => `${v} racha` }
  });

}());
