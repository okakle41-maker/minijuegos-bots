(function () {
  'use strict';

class Word {
  constructor(text, x, y, speed) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.element = null;
  }

  createElement() {
    const span = document.createElement('span');
    span.className = 'letters-word';
    span.textContent = this.text;
    span.style.left = `${this.x}px`;
    span.style.top = `${this.y}px`;
    this.element = span;
    return span;
  }

  updatePosition() {
    if (!this.element) return;
    this.element.style.top = `${this.y}px`;
  }
}

class LettersFallGame {
  constructor(ui) {
    this.ui = ui;
    this.state = {
      words: [],
      score: 0,
      best: 0,
      lives: 3,
      difficulty: 'normal',
      active: false,
      lastTime: 0,
      currentInput: '',
      nextSpawnTime: 0,
      wordsCleared: 0,
      spawnInterval: 0,
      wordSpeed: 0
    };
    this.wordPool = [
      'AGUA', 'ROCA', 'LUNA', 'NUBE', 'MALTA', 'MONTAÑA', 'RAPIDO', 'SERPIENTE', 'ESPACIO', 'DRAGON',
      'CASCADA', 'MANANTIAL', 'RESISTIR', 'COMPUTADORA', 'ALGORITMO', 'FANTASMA', 'PLANETA', 'CRISTAL',
      'TORBELLINO', 'SINTAXIS', 'CONECTOR', 'CIRCUITO', 'TECLADO', 'VELOCIDAD'
    ];
    this.loadBest();
    this.updateUI();
  }

  loadBest() {
    const stored = localStorage.getItem('lettersFallBest');
    this.state.best = stored ? Number(stored) : 0;
  }

  saveBest() {
    localStorage.setItem('lettersFallBest', String(this.state.best));
  }

  start() {
    this.reset();
    this.state.active = true;
    this.state.lastTime = performance.now();
    this.state.nextSpawnTime = performance.now() + this.state.spawnInterval;
    this.ui.lettersInput.focus();
    requestAnimationFrame(this.update.bind(this));
  }

  reset() {
    this.state.words.forEach(word => word.element?.remove());
    this.state.words = [];
    this.state.score = 0;
    this.state.lives = this.getStartingLives();
    this.state.currentInput = '';
    this.ui.lettersInput.value = '';
    this.ui.lettersArea.classList.remove('letters-flash');
    const config = this.getDifficultyConfig();
    this.state.spawnInterval = config.spawnStart;
    this.state.wordSpeed = config.speed * 4;
    this.updateUI();
  }

  getStartingLives() {
    const difficulty = this.ui.lettersDifficultySelect.value;
    if (difficulty === 'easy') return 5;
    if (difficulty === 'hard') return 2;
    return 3;
  }

  getDifficultyConfig() {
    const difficulty = this.ui.lettersDifficultySelect.value;
    if (difficulty === 'easy') {
      return {
        minLength: 3,
        maxLength: 5,
        speed: 18,
        spawnStart: 1400,
        spawnMin: 750,
        spawnAccel: 40,
        minVerticalSpacing: 140
      };
    }
    if (difficulty === 'hard') {
      return {
        minLength: 6,
        maxLength: 10,
        speed: 26,
        spawnStart: 950,
        spawnMin: 380,
        spawnAccel: 55,
        minVerticalSpacing: 120
      };
    }
    return {
      minLength: 4,
      maxLength: 7,
      speed: 22,
      spawnStart: 1200,
      spawnMin: 600,
      spawnAccel: 48,
      minVerticalSpacing: 130
    };
  }

  spawnWord() {
    const config = this.getDifficultyConfig();
    const areaWidth = this.ui.lettersArea.clientWidth - 120;
    const text = this.getRandomWord(config.minLength, config.maxLength);
    const x = Math.max(16, Math.random() * areaWidth);
    const word = new Word(text, x, 20, this.state.wordSpeed);
    this.state.words.push(word);
    this.ui.lettersArea.appendChild(word.createElement());
    this.updateUI();
  }

  getRandomWord(minLength, maxLength) {
    const candidates = this.wordPool.filter(word => word.length >= minLength && word.length <= maxLength);
    return candidates[Math.floor(Math.random() * candidates.length)] || 'PALABRA';
  }

  update(timestamp) {
    if (!this.state.active) return;
    const deltaTime = (timestamp - this.state.lastTime) / 1000;
    this.state.lastTime = timestamp;
    this.state.words.forEach(word => {
      word.y += word.speed * deltaTime;
      word.updatePosition();
    });

    const config = this.getDifficultyConfig();
    const now = performance.now();
    this.state.spawnInterval = Math.max(config.spawnMin, this.state.spawnInterval - config.spawnAccel * deltaTime);

    if (now >= this.state.nextSpawnTime) {
      const enoughSpace = this.state.words.every(word => word.y >= config.minVerticalSpacing);
      if (enoughSpace || this.state.words.length === 0) {
        this.spawnWord();
        this.state.nextSpawnTime = now + this.state.spawnInterval;
      } else {
        this.state.nextSpawnTime = now + 120;
      }
    }

    this.checkDangerZone();
    this.checkInputMatch();

    if (this.state.lives <= 0) {
      this.gameOver();
      return;
    }

    this.updateUI();
    requestAnimationFrame(this.update.bind(this));
  }

  checkDangerZone() {
    const dangerTop = this.ui.lettersArea.clientHeight * 0.9;
    const wordsToRemove = [];

    this.state.words.forEach(word => {
      if (word.y + word.element.clientHeight >= dangerTop) {
        wordsToRemove.push(word);
      }
    });

    wordsToRemove.forEach(word => this.loseLife(word));
  }

  loseLife(word) {
    word.element.classList.add('letters-removed');
    setTimeout(() => word.element.remove(), 200);
    this.state.words = this.state.words.filter(item => item !== word);
    this.state.lives -= 1;
    this.ui.lettersArea.classList.add('letters-flash');
    setTimeout(() => this.ui.lettersArea.classList.remove('letters-flash'), 240);
    audioManager.play('miss');
    this.showMessage('Perdido', 'fail');
  }

  checkInputMatch() {
    if (!this.state.currentInput.trim()) return;
    const typed = this.state.currentInput.toUpperCase();
    const matchIndex = this.state.words.findIndex(word => word.text === typed);
    if (matchIndex >= 0) {
      this.removeWord(this.state.words[matchIndex]);
      this.state.currentInput = '';
      this.ui.lettersInput.value = '';
      audioManager.play('good');
      this.showMessage('Correcto', 'success');
    }
  }

  removeWord(word) {
    word.element.classList.add('letters-removed');
    setTimeout(() => word.element.remove(), 200);
    this.state.words = this.state.words.filter(item => item !== word);
    this.state.score += this.getScoreForWord(word.text);
    this.state.score += 5;
    if (this.state.score > this.state.best) {
      this.state.best = this.state.score;
      this.saveBest();
    }
  }

  getScoreForWord(text) {
    if (text.length <= 4) return 10;
    if (text.length <= 7) return 20;
    return 30;
  }

  gameOver() {
    this.state.active = false;
    audioManager.play('gameover');
    this.ui.lettersMessage.textContent = 'GAME OVER';
    this.ui.lettersMessage.classList.add('fail');
    if (window.Leaderboard) window.Leaderboard.save('letters', this.state.score);
  }

  showMessage(text, type) {
    this.ui.lettersMessage.textContent = text;
    this.ui.lettersMessage.className = `letters-message ${type}`;
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => {
      this.ui.lettersMessage.textContent = '';
      this.ui.lettersMessage.className = 'letters-message';
    }, 900);
  }

  updateUI() {
    if (this.ui.lettersLevel) {
      this.ui.lettersLevel.textContent = '';
    }
    this.ui.lettersDifficulty.textContent = `Dificultad: ${this.ui.lettersDifficultySelect.value}`;
    this.ui.lettersScore.textContent = `Puntuación: ${this.state.score}`;
    this.ui.lettersBest.textContent = `Mejor: ${this.state.best}`;
    this.ui.lettersLives.innerHTML = Array.from({ length: this.state.lives }, () => '<span>❤️</span>').join('');
  }
}

function init(ui) {
  if (!ui.start) return; // sección no presente

  const game = new LettersFallGame(ui);

  ui.start.addEventListener('click', () => game.start());

  ui.lettersInput.addEventListener('input', (event) => {
    const value = event.target.value;
    game.state.currentInput = value;
  });

  ui.lettersInput.addEventListener('change', (event) => {
    ui.lettersInput.value = ui.lettersInput.value.toUpperCase();
    game.state.currentInput = ui.lettersInput.value;
  });

  ui.lettersInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      game.checkInputMatch();
      event.preventDefault();
    }
  });

  ui.lettersDifficultySelect.addEventListener('change', () => {
    ui.lettersInput.value = '';
    game.state.currentInput = '';
    game.state.lives = game.getStartingLives();
    game.updateUI();
  });

  window.lettersFallGame = game;
}

function stop() {
  if (window.lettersFallGame) window.lettersFallGame.reset();
}

window.GameRegistry.register({
  id:          'letters',
  name:        'Caída de letras',
  tag:         'TIPEO',
  accent:      '#a78bfa',
  icon:        '⌨️',
  num:         '05',
  description: 'Escribe las letras que caen en tiempo real. Si llegan al suelo, el sistema falla.',
  difficulty:  3,
  css:         'css/letters.css',

  init,
  stop,
  leaderboard: { format: v => `${v} pts` }
});

}());
