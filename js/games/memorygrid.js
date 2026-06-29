/**
 * js/games/memorygrid.js
 *
 * Memory Grid — atraviesa la cuadrícula recordando los números de cada casilla.
 * Desde S (arriba-izq) hasta E (abajo-der) moviéndote exactamente el valor indicado.
 */

(function () {
  'use strict';

  const CARDINAL = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  const DIAGONAL = [
    { dx: -1, dy: -1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: 1 },
    { dx: 1, dy: 1 },
  ];

  const KNIGHT_OFFSETS = [
    { dx: 1, dy: 2 }, { dx: 2, dy: 1 }, { dx: 2, dy: -1 }, { dx: 1, dy: -2 },
    { dx: -1, dy: -2 }, { dx: -2, dy: -1 }, { dx: -2, dy: 1 }, { dx: -1, dy: 2 },
  ];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const intVal = (el, d) => {
    const n = parseInt(el?.value, 10);
    return Number.isFinite(n) ? n : d;
  };
  const boolVal = (el, d = false) => (el ? !!el.checked : d);
  const key = (x, y) => `${x},${y}`;

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function manhattan(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  function getDirections(dirMode) {
    if (dirMode === 'all8') return CARDINAL.concat(DIAGONAL);
    if (dirMode === 'knight') return KNIGHT_OFFSETS;
    return CARDINAL;
  }

  function stepDistance(from, to) {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    return Math.max(dx, dy);
  }

  function inBounds(x, y, size) {
    return x >= 0 && y >= 0 && x < size && y < size;
  }

  function getValidMoves(from, value, size, dirMode, visited) {
    if (value <= 0) return [];

    if (dirMode === 'knight') {
      if (value !== 1) return [];
      return KNIGHT_OFFSETS
        .map(({ dx, dy }) => ({ x: from.x + dx, y: from.y + dy }))
        .filter(p => inBounds(p.x, p.y, size))
        .filter(p => !visited || !visited.has(key(p.x, p.y)));
    }

    const dirs = getDirections(dirMode);
    const moves = [];

    dirs.forEach(dir => {
      const tx = from.x + dir.dx * value;
      const ty = from.y + dir.dy * value;
      if (!inBounds(tx, ty, size)) return;
      const dest = { x: tx, y: ty };
      if (visited && visited.has(key(tx, ty))) return;
      moves.push(dest);
    });

    return moves;
  }

  function enumerateRawSteps(from, size, dirMode, minVal, maxVal) {
    const dirs = getDirections(dirMode);
    const steps = [];

    if (dirMode === 'knight') {
      KNIGHT_OFFSETS.forEach(({ dx, dy }) => {
        const tx = from.x + dx;
        const ty = from.y + dy;
        if (inBounds(tx, ty, size)) steps.push({ to: { x: tx, y: ty }, value: 1 });
      });
      return steps;
    }

    for (let v = minVal; v <= maxVal; v++) {
      dirs.forEach(dir => {
        const tx = from.x + dir.dx * v;
        const ty = from.y + dir.dy * v;
        if (inBounds(tx, ty, size)) steps.push({ to: { x: tx, y: ty }, value: v });
      });
    }

    return steps;
  }

  function buildFallbackPath(size) {
    const path = [{ x: 0, y: 0 }];
    let x = 0;
    let y = 0;
    while (x < size - 1) {
      x++;
      path.push({ x, y });
    }
    while (y < size - 1) {
      y++;
      path.push({ x, y });
    }
    return path;
  }

  function generatePath(size, dirMode, minVal, maxVal, allowRepeat) {
    const end = { x: size - 1, y: size - 1 };

    for (let attempt = 0; attempt < 400; attempt++) {
      const path = [{ x: 0, y: 0 }];
      let pos = { x: 0, y: 0 };
      const visited = allowRepeat ? null : new Set([key(0, 0)]);
      const maxSteps = size * size * 4;

      for (let step = 0; step < maxSteps; step++) {
        if (pos.x === end.x && pos.y === end.y) return path;

        const candidates = enumerateRawSteps(pos, size, dirMode, minVal, maxVal)
          .filter(({ to }) => !visited || !visited.has(key(to.x, to.y)))
          .filter(({ to }) => manhattan(to, end) <= manhattan(pos, end) || Math.random() < 0.25);

        if (candidates.length === 0) break;

        const choice = pick(candidates);
        path.push({ ...choice.to });
        pos = choice.to;
        if (visited) visited.add(key(pos.x, pos.y));
      }

      if (pos.x === end.x && pos.y === end.y) return path;
    }

    return buildFallbackPath(size);
  }

  function assignValuesFromPath(path, size, minVal, maxVal, dirMode) {
    const values = Array.from({ length: size }, () => Array(size).fill(0));

    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      if (dirMode === 'knight') {
        values[from.y][from.x] = 1;
      } else {
        values[from.y][from.x] = stepDistance(from, to);
      }
    }

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (values[y][x] === 0) {
          values[y][x] = randInt(minVal, maxVal);
        }
      }
    }

    values[size - 1][size - 1] = 0;
    return values;
  }

  function generateBoard(cfg) {
    const { size, minVal, maxVal, dirMode, allowRepeat, addTraps } = cfg;

    for (let attempt = 0; attempt < 60; attempt++) {
      const path = generatePath(size, dirMode, minVal, maxVal, allowRepeat);
      const values = assignValuesFromPath(path, size, minVal, maxVal, dirMode);

      if (addTraps) {
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            if ((x === 0 && y === 0) || (x === size - 1 && y === size - 1)) continue;
            if (Math.random() < 0.18) values[y][x] = randInt(minVal, maxVal);
          }
        }
      }

      if (verifySolution(values, path, size, dirMode, allowRepeat)) {
        return { values, solutionPath: path };
      }
    }

    const path = buildFallbackPath(size);
    return {
      values: assignValuesFromPath(path, size, minVal, maxVal, dirMode),
      solutionPath: path,
    };
  }

  function verifySolution(values, path, size, dirMode, allowRepeat) {
    if (!path.length) return false;
    let pos = { ...path[0] };
    const visited = allowRepeat ? null : new Set([key(pos.x, pos.y)]);

    for (let i = 1; i < path.length; i++) {
      const next = path[i];
      const v = values[pos.y][pos.x];
      const moves = getValidMoves(pos, v, size, dirMode, visited);
      if (!moves.some(m => m.x === next.x && m.y === next.y)) return false;
      pos = next;
      if (visited) visited.add(key(pos.x, pos.y));
    }

    return pos.x === size - 1 && pos.y === size - 1;
  }

  function init(ui) {
    if (!ui.start || !ui.board) return;

    let activeGame = null;

    function createGame() {
      const timers = new Set();

      function setTimer(fn, ms) {
        const id = setTimeout(() => {
          timers.delete(id);
          fn();
        }, ms);
        timers.add(id);
        return id;
      }

      function clearAllTimers() {
        timers.forEach(clearTimeout);
        timers.clear();
        if (game._playInterval) {
          clearInterval(game._playInterval);
          game._playInterval = null;
        }
      }

      const game = {
        cfg: null,
        values: [],
        cells: [],
        size: 4,
        pos: { x: 0, y: 0 },
        path: [],
        visited: new Set(),
        solutionPath: [],
        lives: 3,
        errors: 0,
        moves: 0,
        playing: false,
        phase: 'idle',
        numbersVisible: false,
        timeLeft: 0,
        _playInterval: null,

        readConfig() {
          const size = clamp(intVal(ui.size, 4), 4, 8);
          const minVal = clamp(intVal(ui.minVal, 1), 1, 5);
          const maxVal = clamp(intVal(ui.maxVal, 3), minVal, 6);
          const timeLimit = intVal(ui.timeLimit, 60);
          const maxErrors = intVal(ui.maxErrors, 0);
          const maxMoves = intVal(ui.maxMoves, 0);

          this.cfg = {
            size,
            minVal,
            maxVal,
            dirMode: ui.dirMode?.value || 'cardinal',
            allowRepeat: boolVal(ui.allowRepeat, false),
            timeLimit: timeLimit === 0 ? 0 : clamp(timeLimit, 10, 600),
            showPath: boolVal(ui.showPath, true),
            showHints: boolVal(ui.showHints, false),
            showTime: clamp(intVal(ui.showTime, 3000), 500, 30000),
            lives: clamp(intVal(ui.livesInput, 3), 1, 9),
            useLives: boolVal(ui.useLives, true),
            allowUndo: boolVal(ui.allowUndo, true),
            addTraps: boolVal(ui.addTraps, false),
            revealOnVisit: boolVal(ui.revealOnVisit, true),
            maxErrors: maxErrors === 0 ? 0 : clamp(maxErrors, 1, 99),
            maxMoves: maxMoves === 0 ? 0 : clamp(maxMoves, 1, 99),
            showSolutionOnEnd: boolVal(ui.showSolutionOnEnd, true),
          };
          this.size = size;
          return this.cfg;
        },

        setStatus(text) {
          if (ui.status) ui.status.textContent = text;
        },

        setLives(n) {
          if (!ui.lives) return;
          if (!this.cfg?.useLives) {
            ui.lives.textContent = '';
            return;
          }
          ui.lives.textContent = '❤️'.repeat(Math.max(0, n));
        },

        setHudExtra() {
          if (ui.movesEl) {
            const max = this.cfg.maxMoves;
            ui.movesEl.textContent = max
              ? `Movimientos: ${this.moves}/${max}`
              : `Movimientos: ${this.moves}`;
          }
          if (ui.errorsEl) {
            const max = this.cfg.maxErrors;
            ui.errorsEl.textContent = max
              ? `Errores: ${this.errors}/${max}`
              : (this.errors ? `Errores: ${this.errors}` : '');
          }
        },

        setResult(text) {
          if (ui.result) ui.result.textContent = text || '';
        },

        setTimerLabel(text) {
          if (ui.timerEl) ui.timerEl.textContent = text || '';
        },

        cellSize() {
          const sizes = { 4: 64, 5: 56, 6: 48, 7: 44, 8: 40 };
          return sizes[this.size] || 48;
        },

        indexAt(x, y) {
          return y * this.size + x;
        },

        coords(index) {
          return { x: index % this.size, y: Math.floor(index / this.size) };
        },

        buildBoard() {
          this.readConfig();
          const cellPx = this.cellSize();
          ui.board.innerHTML = '';
          ui.board.style.gridTemplateColumns = `repeat(${this.size}, ${cellPx}px)`;
          this.cells = [];

          for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
              const index = this.indexAt(x, y);
              const cell = document.createElement('button');
              cell.type = 'button';
              cell.className = 'memory-cell';
              cell.dataset.x = x;
              cell.dataset.y = y;
              cell.disabled = true;
              cell.addEventListener('click', () => this.handleCellClick(x, y));
              ui.board.appendChild(cell);
              this.cells[index] = cell;
            }
          }
        },

        cellLabel(x, y) {
          if (x === this.size - 1 && y === this.size - 1) return 'E';
          const v = this.values[y]?.[x];
          return String(v ?? '');
        },

        shouldShowNumber(x, y) {
          if (!this.numbersVisible) {
            if (this.cfg.revealOnVisit && this.visited.has(key(x, y))) return true;
            return false;
          }
          return true;
        },

        renderCell(x, y) {
          const cell = this.cells[this.indexAt(x, y)];
          if (!cell) return;

          cell.classList.remove(
            'current', 'path', 'hint', 'flash-error', 'flash-ok',
            'reveal-solution', 'hidden-value', 'start-cell', 'end-cell'
          );

          if (x === 0 && y === 0) cell.classList.add('start-cell');
          if (x === this.size - 1 && y === this.size - 1) cell.classList.add('end-cell');

          if (this.cfg.showPath && this.path.some((p, i) => i > 0 && p.x === x && p.y === y)) {
            cell.classList.add('path');
          }

          if (this.pos.x === x && this.pos.y === y) cell.classList.add('current');

          const showNum = this.shouldShowNumber(x, y);
          if (showNum) {
            cell.textContent = this.cellLabel(x, y);
            cell.classList.remove('hidden-value');
          } else if (x === 0 && y === 0) {
            cell.textContent = 'S';
            cell.classList.add('hidden-value');
          } else if (x === this.size - 1 && y === this.size - 1) {
            cell.textContent = 'E';
            cell.classList.add('hidden-value');
          } else {
            cell.textContent = '?';
            cell.classList.add('hidden-value');
          }
        },

        renderBoard() {
          for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
              this.renderCell(x, y);
            }
          }

          if (this.phase === 'playing' && this.cfg.showHints) {
            this.getCurrentMoves().forEach(p => {
              const cell = this.cells[this.indexAt(p.x, p.y)];
              if (cell) cell.classList.add('hint');
            });
          }

          const interactive = this.playing && this.phase === 'playing';
          this.cells.forEach(cell => {
            cell.disabled = !interactive;
          });

          if (ui.undoBtn) {
            ui.undoBtn.hidden = !(interactive && this.cfg.allowUndo && this.path.length > 1);
          }
        },

        getCurrentMoves() {
          const v = this.values[this.pos.y][this.pos.x];
          const visited = this.cfg.allowRepeat ? null : this.visited;
          return getValidMoves(this.pos, v, this.size, this.cfg.dirMode, visited);
        },

        showAllNumbers() {
          this.numbersVisible = true;
          this.renderBoard();
        },

        hideAllNumbers() {
          this.numbersVisible = false;
          this.renderBoard();
        },

        startMemorizePhase() {
          this.phase = 'memorizing';
          this.setStatus(`Memoriza el tablero (${this.cfg.showTime / 1000}s)`);
          this.showAllNumbers();
          setTimer(() => this.startPlayPhase(), this.cfg.showTime);
        },

        startPlayPhase() {
          this.phase = 'playing';
          this.hideAllNumbers();
          this.setStatus('Llega a E desde S usando movimientos exactos');
          this.startPlayTimer();
          this.renderBoard();
        },

        startPlayTimer() {
          if (this._playInterval) {
            clearInterval(this._playInterval);
            this._playInterval = null;
          }
          if (!this.cfg.timeLimit) {
            this.setTimerLabel('');
            return;
          }
          this.timeLeft = this.cfg.timeLimit;
          this.setTimerLabel(`${this.timeLeft}s`);
          this._playInterval = setInterval(() => {
            if (this.phase !== 'playing') return;
            this.timeLeft--;
            this.setTimerLabel(`${Math.max(0, this.timeLeft)}s`);
            if (this.timeLeft <= 0) this.failGame('Tiempo agotado');
          }, 1000);
        },

        stopPlayTimer() {
          if (this._playInterval) {
            clearInterval(this._playInterval);
            this._playInterval = null;
          }
          this.setTimerLabel('');
        },

        handleCellClick(x, y) {
          if (!this.playing || this.phase !== 'playing') return;

          const valid = this.getCurrentMoves();
          const match = valid.find(p => p.x === x && p.y === y);

          if (!match) {
            this.registerError(x, y);
            return;
          }

          this.moveTo(x, y);
        },

        moveTo(x, y) {
          this.pos = { x, y };
          this.path.push({ x, y });
          if (!this.cfg.allowRepeat) this.visited.add(key(x, y));
          this.moves++;
          this.setHudExtra();
          audioManager.play('step1');
          const cell = this.cells[this.indexAt(x, y)];
          if (cell) cell.classList.add('flash-ok');

          if (x === this.size - 1 && y === this.size - 1) {
            setTimer(() => this.winGame(), 400);
            return;
          }

          if (this.cfg.maxMoves && this.moves >= this.cfg.maxMoves) {
            this.failGame('Límite de movimientos alcanzado');
            return;
          }

          const nextMoves = this.getCurrentMoves();
          if (nextMoves.length === 0) {
            if (this.cfg.allowUndo) {
              this.setStatus('Sin movimientos válidos — deshaz o reinicia');
            } else {
              this.failGame('Sin movimientos válidos');
            }
          }

          this.renderBoard();
        },

        registerError(x, y) {
          this.errors++;
          this.setHudExtra();
          audioManager.play('miss');
          const cell = this.cells[this.indexAt(x, y)];
          if (cell) {
            cell.classList.add('flash-error');
            setTimer(() => cell.classList.remove('flash-error'), 500);
          }

          if (this.cfg.maxErrors && this.errors >= this.cfg.maxErrors) {
            this.failGame('Demasiados errores');
            return;
          }

          if (this.cfg.useLives) {
            this.lives--;
            this.setLives(this.lives);
            if (this.lives <= 0) {
              this.failGame('Sin vidas');
              return;
            }
          }

          this.setStatus('Movimiento inválido — intenta otra casilla');
        },

        undoMove() {
          if (!this.cfg.allowUndo || this.path.length <= 1) return;
          const removed = this.path.pop();
          if (!this.cfg.allowRepeat) this.visited.delete(key(removed.x, removed.y));
          this.pos = { ...this.path[this.path.length - 1] };
          this.moves = Math.max(0, this.moves - 1);
          this.setHudExtra();
          this.setStatus('Movimiento deshecho');
          this.renderBoard();
        },

        revealSolution() {
          this.solutionPath.forEach(p => {
            const cell = this.cells[this.indexAt(p.x, p.y)];
            if (cell) cell.classList.add('reveal-solution');
          });
          this.numbersVisible = true;
          this.renderBoard();
        },

        winGame() {
          this.stopPlayTimer();
          this.phase = 'ended';
          this.playing = false;
          this.numbersVisible = true;
          this.renderBoard();
          ui.start.disabled = false;
          if (ui.undoBtn) ui.undoBtn.hidden = true;
          audioManager.play('perfect');
          const timeBonus = this.cfg.timeLimit ? this.timeLeft : 0;
          const score = this.moves * 10 + timeBonus;
          this.setResult(`🏆 ¡Victoria! ${this.moves} movimiento${this.moves === 1 ? '' : 's'}${timeBonus ? ` · ${timeBonus}s restantes` : ''}.`);
          this.setStatus('Meta alcanzada');
          if (window.Leaderboard) {
            window.Leaderboard.save('memorygrid', score);
          }
        },

        failGame(reason) {
          this.stopPlayTimer();
          this.phase = 'ended';
          this.playing = false;
          ui.start.disabled = false;
          if (ui.undoBtn) ui.undoBtn.hidden = true;
          audioManager.play('gameover');
          if (this.cfg.showSolutionOnEnd) this.revealSolution();
          else this.renderBoard();

          this.setResult(`💀 Derrota: ${reason}.`);
          this.setStatus('Partida terminada');
        },

        resetRunState() {
          this.pos = { x: 0, y: 0 };
          this.path = [{ x: 0, y: 0 }];
          this.visited = new Set([key(0, 0)]);
          this.errors = 0;
          this.moves = 0;
          this.numbersVisible = false;
        },

        startGame() {
          clearAllTimers();
          this.readConfig();
          this.lives = this.cfg.lives;
          this.playing = true;
          this.setLives(this.lives);
          this.setHudExtra();
          this.setResult('');
          ui.start.disabled = true;
          if (ui.undoBtn) ui.undoBtn.hidden = true;

          this.buildBoard();
          const board = generateBoard(this.cfg);
          this.values = board.values;
          this.solutionPath = board.solutionPath;
          this.resetRunState();
          this.renderBoard();
          this.startMemorizePhase();
        },

        stop() {
          clearAllTimers();
          this.playing = false;
          this.phase = 'idle';
          if (ui.start) ui.start.disabled = false;
          if (ui.undoBtn) ui.undoBtn.hidden = true;
          this.setTimerLabel('');
        },
      };

      return game;
    }

    activeGame = createGame();

    ui.start.addEventListener('click', () => activeGame.startGame());

    if (ui.undoBtn) {
      ui.undoBtn.addEventListener('click', () => activeGame.undoMove());
    }

    if (ui.minVal && ui.maxVal) {
      ui.minVal.addEventListener('change', () => {
        const min = intVal(ui.minVal, 1);
        if (intVal(ui.maxVal, 3) < min) ui.maxVal.value = min;
      });
    }

    window.stopMemoryGrid = () => activeGame.stop();

    return activeGame;
  }

  function stop() {
    if (typeof window.stopMemoryGrid === 'function') window.stopMemoryGrid();
  }

  window.GameRegistry.register({
    id:          'memorygrid',
    name:        'Memory Grid',
    tag:         'MEMORIA',
    accent:      '#06b6d4',
    icon:        '🧩',
    num:         '17',
    description: 'Memoriza los números del tablero y encuentra la ruta de S a E con saltos exactos.',
    difficulty:  3,
    css:         'css/memorygrid.css',

    init,
    stop,
    leaderboard: { format: v => `${v} pts` },
  });

}());
