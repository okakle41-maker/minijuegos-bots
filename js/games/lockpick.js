class LockpickGame {
  constructor(ui) {
    this.ui = ui;
    this.state = this.createInitialState();
    this.bindEvents();
    this.updateUI();
  }

  createInitialState() {
    return {
      active: false,
      sweetSpot: 0,
      pickAngle: 90,
      tolerance: 8,
      pickHealth: 100,
      timeRemaining: 20,
      lockRotation: 0,
      isTurning: false,
      lastTime: 0,
      message: '',
      status: 'ready'
    };
  }

  bindEvents() {
    const { pickArea, startLockpick, difficultySelect } = this.ui;

    if (pickArea) {
      pickArea.addEventListener('mousemove', (event) => this.onMouseMove(event));
      pickArea.addEventListener('mousedown', () => this.startTurn());
      pickArea.addEventListener('mouseup', () => this.stopTurn());
      pickArea.addEventListener('mouseleave', () => this.stopTurn());
    }

    document.addEventListener('keydown', (event) => {
      if (!this.state.active) return;
      if (event.key === 'a' || event.key === 'A') {
        this.adjustPick(-1.4);
      }
      if (event.key === 'd' || event.key === 'D') {
        this.adjustPick(1.4);
      }
      if (event.code === 'Space') {
        this.startTurn();
      }
    });

    document.addEventListener('keyup', (event) => {
      if (event.code === 'Space') {
        this.stopTurn();
      }
    });

    if (startLockpick) {
      startLockpick.addEventListener('click', () => this.start());
    }

    if (difficultySelect) {
      difficultySelect.addEventListener('change', () => {
        this.state.tolerance = this.getTolerance();
        this.updateUI();
      });
    }
  }

  getTolerance() {
    const value = this.ui.difficultySelect.value;
    if (value === 'easy') return 15;
    if (value === 'hard') return 4;
    return 8;
  }

  start() {
    this.state = this.createInitialState();
    this.state.active = true;
    this.state.sweetSpot = Math.random() * 180;
    this.state.tolerance = this.getTolerance();
    this.state.lastTime = performance.now();
    this.state.status = 'playing';
    this.state.message = 'Busca el ángulo correcto';
    requestAnimationFrame(this.update.bind(this));
    this.updateUI();
  }

  onMouseMove(event) {
    if (!this.state.active) return;
    const rect = this.ui.pickArea.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const relative = Math.max(0, Math.min(1, x / rect.width));
    this.state.pickAngle = relative * 180;
    this.updatePick();
  }

  adjustPick(delta) {
    this.state.pickAngle = Math.max(0, Math.min(180, this.state.pickAngle + delta));
    this.updatePick();
  }

  startTurn() {
    if (!this.state.active) return;
    this.state.isTurning = true;
  }

  stopTurn() {
    if (!this.state.active) return;
    this.state.isTurning = false;
  }

  update(timestamp) {
    if (!this.state.active) return;
    const deltaTime = (timestamp - this.state.lastTime) / 1000;
    this.state.lastTime = timestamp;
    this.state.timeRemaining = Math.max(0, this.state.timeRemaining - deltaTime);

    if (this.state.timeRemaining <= 0) {
      this.fail('Tiempo agotado');
    }

    if (this.state.isTurning && this.state.status === 'playing') {
      this.testLock(deltaTime);
    }

    this.updateUI();

    if (this.state.active) {
      requestAnimationFrame(this.update.bind(this));
    }
  }

  testLock(deltaTime) {
    const distance = Math.abs(this.state.pickAngle - this.state.sweetSpot);
    if (distance <= this.state.tolerance) {
      this.state.lockRotation = Math.min(100, this.state.lockRotation + 90 * deltaTime);
      if (this.state.lockRotation >= 100) {
        this.unlock();
      } else {
        this.state.message = 'Cerca: gira la cerradura';
        this.state.status = 'near';
      }
      this.ui.lockElement.classList.add('correct');
      this.ui.lockElement.classList.remove('fail');
    } else {
      this.ui.lockElement.classList.remove('correct');
      if (distance < 8) {
        this.state.message = 'Muy cerca: ajusta lentamente';
        this.state.status = 'close';
      } else if (distance > 30) {
        this.state.message = 'Muy lejos: no hay respuesta';
        this.state.status = 'far';
      } else {
        this.state.message = 'Acércate más';
        this.state.status = 'nearby';
      }

      if (this.state.isTurning) {
        this.state.pickHealth = Math.max(0, this.state.pickHealth - 10 * deltaTime);
        if (this.state.pickHealth <= 0) {
          this.breakPick();
          return;
        }
      }

      if (distance < 10) {
        this.ui.lockElement.classList.add('correct');
      }
    }

    this.updatePick();
  }

  breakPick() {
    this.state.active = false;
    this.state.status = 'broken';
    this.state.message = 'LOCKPICK BROKEN';
    audioManager.play('gameover');
    this.ui.lockElement.classList.add('fail');
    this.ui.pickElement.classList.add('broken');
  }

  unlock() {
    this.state.active = false;
    this.state.status = 'unlocked';
    this.state.message = 'UNLOCKED';
    audioManager.play('perfect');
    this.ui.lockElement.classList.add('correct');
    this.ui.pickArea.classList.add('unlocked');
  }

  updatePick() {
    if (!this.ui.pickElement) return;
    this.ui.pickElement.style.transform = `translateX(-50%) rotate(${this.state.pickAngle}deg)`;
  }

  updateUI() {
    if (this.ui.toleranceText) {
      this.ui.toleranceText.textContent = `Tolerancia: ${this.state.tolerance}°`;
    }
    if (this.ui.healthBar) {
      this.ui.healthBar.style.width = `${this.state.pickHealth}%`;
      this.ui.healthText.textContent = `${Math.round(this.state.pickHealth)}%`;
    }
    if (this.ui.timerText) {
      this.ui.timerText.textContent = `Tiempo: ${this.state.timeRemaining.toFixed(1)}s`;
    }
    if (this.ui.progressBar) {
      this.ui.progressBar.style.width = `${this.state.lockRotation}%`;
    }
    if (this.ui.messageText) {
      this.ui.messageText.textContent = this.state.message;
    }
    this.updatePick();
    this.ui.lockElement.style.transform = `translate(-50%, -50%) rotate(${this.state.lockRotation * 3.6}deg)`;
  }
}

function initLockpick(ui) {
  const game = new LockpickGame(ui);
  ui.startLockpick.addEventListener('click', () => game.start());
}

window.initLockpick = initLockpick;
