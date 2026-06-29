(() => {

GameRegistry.register({
  id:          'typix',
  name:        'Typix',
  tag:         'TIPEO',
  accent:      '#38bdf8',
  icon:        '📝',
  num:         '09',
  description: 'Adivina el número de 5 dígitos en un máximo de 6 intentos.',
  difficulty:  2,
  css:         'css/typix.css',

  init(ui) {
    const board      = document.getElementById('typixBoard');
    if (!board) return;

    const timerEl    = document.getElementById('typixTimer');
    const inputEl    = document.getElementById('typixInput');
    const messageEl  = document.getElementById('typixMessage');
    const uniqueEl   = document.getElementById('typixUniqueDigits');
    const guessBtn   = document.getElementById('typixGuessBtn');

    let secretWord = '', currentRow = 0, timer = null, timeLeft = 60;

    function generateRepeated() {
      let r = '';
      for (let i = 0; i < 5; i++) r += Math.floor(Math.random() * 10);
      return r;
    }

    function generateUnique() {
      const digits = ['0','1','2','3','4','5','6','7','8','9'];
      let r = '';
      while (r.length < 5) {
        const idx = Math.floor(Math.random() * digits.length);
        r += digits[idx];
        digits.splice(idx, 1);
      }
      return r;
    }

    function createBoard() {
      board.innerHTML = '';
      for (let r = 0; r < 6; r++) {
        const row = document.createElement('div');
        row.className = 'typix-row';
        for (let c = 0; c < 5; c++) {
          const cell = document.createElement('div');
          cell.className = 'typix-cell';
          row.appendChild(cell);
        }
        board.appendChild(row);
      }
    }

    function startGame() {
      clearInterval(timer);
      secretWord = uniqueEl.checked ? generateUnique() : generateRepeated();
      currentRow = 0;
      timeLeft = 60;
      timerEl.textContent = timeLeft;
      inputEl.value = '';
      messageEl.textContent = '';
      createBoard();
      timer = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft;
        if (timeLeft <= 0) loseGame();
      }, 1000);
    }

    function evaluateGuess(guess) {
      const row = board.querySelectorAll('.typix-row')[currentRow];
      let correct = 0, present = 0;
      for (let i = 0; i < 5; i++) {
        if (guess[i] === secretWord[i]) correct++;
        else if (secretWord.includes(guess[i])) present++;
      }
      row.innerHTML = `
        <span class="typix-guess">${guess}</span>
        <span class="typix-result">[${'!'.repeat(correct)}${'*'.repeat(present)}]</span>`;
      if (guess === secretWord) {
        clearInterval(timer);
        audioManager.play('perfect');
        messageEl.textContent = '¡Ganaste!';
        return;
      }
      audioManager.play('click');
      currentRow++;
      if (currentRow >= 6) loseGame();
    }

    function loseGame() {
      clearInterval(timer);
      audioManager.play('gameover');
      messageEl.textContent = `❌ Perdiste. La palabra era ${secretWord}`;
    }

    function onGuess() {
      const guess = inputEl.value.trim();
      if (!/^\d{5}$/.test(guess)) return;
      evaluateGuess(guess);
      inputEl.value = '';
    }

    guessBtn.addEventListener('click', onGuess);
    inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') onGuess(); });

    // start immediately on first load
    startGame();

    this._stop = function () {
      if (timer) { clearInterval(timer); timer = null; }
    };
    this._start = startGame;
  },

  stop()  { if (this._stop)  this._stop(); },
  start() { if (this._start) this._start(); },
});

})();
