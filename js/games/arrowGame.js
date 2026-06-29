/**
 * js/games/arrowGame.js
 *
 * Migrado al sistema GameRegistry.
 * Elementos esperados (data-ui dentro de <section id="arrow">):
 *   start, arrowLevel, arrowLength, arrowTimeInput, arrowButtons (opcional),
 *   arrowDisplay, arrowStep, arrowCombo, arrowPercent, arrowProgress,
 *   arrowTime, arrowRecord, arrowResult, arrowMessage, arrowSequence
 */

(function () {
  'use strict';

  function init(ui) {
    const {
      start: startArrow,
      arrowLevel: arrowLevelEl,
      arrowLength: arrowLengthEl,
      arrowTimeInput,
      arrowButtons,
      arrowDisplay,
      arrowStep,
      arrowCombo,
      arrowPercent,
      arrowProgress,
      arrowRecord,
      arrowMessage,
      arrowSequence
    } = ui;

    if (!startArrow) return; // sección no presente

    class ArrowClicker {
      constructor(ui, options = {}) {
        this.ui = ui;
        this.options = {
          steps: 20,
          time: 15,
          penalty: 0.5,
          ...options
        };
        this.arrows = [
          { key: 'ArrowUp', symbol: '↑', name: 'Arriba' },
          { key: 'ArrowDown', symbol: '↓', name: 'Abajo' },
          { key: 'ArrowLeft', symbol: '←', name: 'Izquierda' },
          { key: 'ArrowRight', symbol: '→', name: 'Derecha' }
        ];
        this.recordKey = 'arrowClickerRecord';
        this.loadRecord();
        this.reset();
      }

      loadRecord() {
        const stored = localStorage.getItem(this.recordKey);
        this.record = stored ? Number(stored) : 0;
      }

      saveRecord() {
        localStorage.setItem(this.recordKey, String(this.record));
      }

      generateSequence(length) {
        return Array.from({ length }, () => this.arrows[Math.floor(Math.random() * this.arrows.length)]);
      }

      reset() {
        this.state = {
          sequence: [],
          currentStep: 0,
          timeLeft: this.options.time,
          active: false,
          timer: null,
          combo: 0,
          lastResult: null
        };
        this.clearTimer();
        this.clearMessage();
        this.clearDisplayState();
        this.updateUI();
      }

      start(options = {}) {
        if (this.state.active) return;
        this.options.steps = Number(options.steps || this.options.steps);
        this.options.time = Number(options.time || this.options.time);
        this.state.sequence = this.generateSequence(this.options.steps);
        this.state.currentStep = 0;
        this.state.timeLeft = this.options.time;
        this.state.combo = 0;
        this.state.active = true;
        this.state.lastResult = null;
        this.clearMessage();
        this.clearDisplayState();
        startArrow.disabled = true;
        this.updateUI();
        this.startTimer();
        return true;
      }

      stop(success) {
        if (!this.state.active) return success === true;
        this.state.active = false;
        this.clearTimer();
        startArrow.disabled = false;
        this.state.lastResult = success;
        if (success) {
          this.setMessage('HACK COMPLETE', 'success');
          this.ui.arrowDisplay?.classList.add('correct');
          audioManager.play('perfect');
          this.updateRecord(100);
        } else {
          this.setMessage('ACCESS DENIED', 'fail');
          this.ui.arrowDisplay?.classList.add('wrong');
          audioManager.play('gameover');
          const percent = Math.round((this.state.currentStep / this.state.sequence.length) * 100);
          this.updateRecord(percent);
        }
        this.updateUI();
        return success === true;
      }

      updateRecord(percent) {
        if (percent > this.record) {
          this.record = percent;
          this.saveRecord();
        }
        if (window.Leaderboard) window.Leaderboard.save('arrow', percent);
      }

      clearTimer() {
        if (this.state.timer) {
          clearInterval(this.state.timer);
          this.state.timer = null;
        }
      }

      startTimer() {
        this.clearTimer();
        this.state.timer = setInterval(() => {
          if (!this.state.active) return;
          this.state.timeLeft = Math.max(0, this.state.timeLeft - 0.1);
          this.updateUI();
          if (this.state.timeLeft <= 0) {
            this.stop(false);
          }
        }, 100);
      }

      clearMessage() {
        if (!this.ui.arrowMessage) return;
        this.ui.arrowMessage.textContent = '';
        this.ui.arrowMessage.classList.remove('visible', 'success', 'fail');
      }

      clearDisplayState() {
        this.ui.arrowDisplay?.classList.remove('correct', 'wrong', 'shake');
        this.ui.arrowMessage?.classList.remove('visible', 'success', 'fail');
      }

      setMessage(text, type) {
        if (!this.ui.arrowMessage) return;
        this.ui.arrowMessage.textContent = text;
        this.ui.arrowMessage.classList.remove('success', 'fail', 'visible');
        if (type) this.ui.arrowMessage.classList.add(type);
        requestAnimationFrame(() => this.ui.arrowMessage?.classList.add('visible'));
      }

      flashButton(key, correct) {
        const buttons = Array.from(this.ui.arrowButtons?.querySelectorAll('button[data-key]') || []);
        const button = buttons.find((btn) => btn.dataset.key === key);
        if (!button) return;
        button.classList.add('active');
        setTimeout(() => button.classList.remove('active'), 140);
      }

      shakeDisplay() {
        const display = this.ui.arrowDisplay;
        if (!display) return;
        display.classList.add('shake');
        setTimeout(() => display.classList.remove('shake'), 260);
      }

      formatTime(value) {
        return `${Math.max(0, value).toFixed(1)}s`;
      }

      handleInput(key) {
        if (!this.state.active) return;
        const expected = this.state.sequence[this.state.currentStep];
        if (!expected) return;
        const isCorrect = key === expected.key;
        if (isCorrect) {
          this.state.currentStep += 1;
          this.state.combo += 1;
          this.ui.arrowDisplay?.classList.remove('wrong');
          this.ui.arrowDisplay?.classList.add('correct');
          this.setMessage('Correcto', 'success');
          this.flashButton(key, true);
          audioManager.play('click');
          if (this.state.currentStep >= this.state.sequence.length) {
            return this.stop(true);
          }
        } else {
          this.state.combo = 0;
          this.state.timeLeft = Math.max(0, this.state.timeLeft - this.options.penalty);
          this.ui.arrowDisplay?.classList.remove('correct');
          this.ui.arrowDisplay?.classList.add('wrong');
          this.shakeDisplay();
          this.setMessage('Penalización -0.5s', 'fail');
          audioManager.play('miss');
          this.flashButton(key, false);
          if (this.state.timeLeft <= 0) {
            return this.stop(false);
          }
        }
        this.updateUI();
      }

      handleKey(event) {
        if (!this.state.active) return;
        if (!event.key.startsWith('Arrow')) return;
        event.preventDefault();
        this.handleInput(event.key);
      }

      updateUI() {
        const currentArrow = this.state.sequence[this.state.currentStep] || this.arrows[0];
        const percent = this.state.sequence.length
          ? Math.round((this.state.currentStep / this.state.sequence.length) * 100)
          : 0;
        if (this.ui.arrowDisplay) this.ui.arrowDisplay.textContent = currentArrow.symbol;
        if (this.ui.arrowStep) this.ui.arrowStep.textContent = `${Math.min(this.state.currentStep, this.state.sequence.length)}/${this.state.sequence.length}`;
        if (this.ui.arrowPercent) this.ui.arrowPercent.textContent = `${percent}%`;
        if (this.ui.arrowProgress) this.ui.arrowProgress.style.width = `${percent}%`;
        if (this.ui.arrowCombo) this.ui.arrowCombo.textContent = `Combo: ${this.state.combo}`;
        if (this.ui.arrowRecord) this.ui.arrowRecord.textContent = `Récord: ${this.record}%`;
        if (this.ui.arrowTime) {
          this.ui.arrowTime.textContent = this.formatTime(this.state.timeLeft);
          const ratio = this.state.timeLeft / this.options.time;
          if (ratio > 0.5) {
            this.ui.arrowTime.style.color = '#00ff88';
          } else if (ratio > 0.25) {
            this.ui.arrowTime.style.color = '#ffd166';
          } else {
            this.ui.arrowTime.style.color = '#ff3333';
          }
        }
        if (this.ui.arrowSequence) {
          this.ui.arrowSequence.innerHTML = this.state.sequence.map((arrow, index) => {
            const classes = [
              index < this.state.currentStep ? 'passed' : '',
              index === this.state.currentStep ? 'current' : ''
            ].filter(Boolean).join(' ');
            return `<span class="${classes}">${arrow.symbol}</span>`;
          }).join('');
        }
      }
    }

    const clicker = new ArrowClicker(
      {
        arrowDisplay,
        arrowStep,
        arrowCombo,
        arrowPercent,
        arrowProgress,
        arrowTime: ui.arrowTime,
        arrowRecord,
        arrowMessage,
        arrowSequence,
        arrowButtons
      },
      {
        steps: 20,
        time: 15,
        penalty: 0.5
      }
    );

    const difficultyLevels = {
      easy: { time: 20 },
      normal: { time: 15 },
      hard: { time: 10 }
    };

    if (arrowLevelEl) {
      const applyLevel = () => {
        const level = arrowLevelEl.value || 'normal';
        const targetTime = difficultyLevels[level]?.time || 15;
        if (arrowTimeInput) arrowTimeInput.value = targetTime;
        clicker.options.time = targetTime;
        clicker.updateUI();
      };
      arrowLevelEl.addEventListener('change', applyLevel);
      applyLevel();
    }

    startArrow.addEventListener('click', () => {
      const steps = Math.max(1, Math.min(parseInt(arrowLengthEl.value, 10) || 20, 30));
      const time = Math.max(5, Math.min(parseFloat(arrowTimeInput.value) || 15, 30));
      clicker.start({ steps, time });
    });

    if (arrowButtons) {
      arrowButtons.querySelectorAll('button[data-key]').forEach((btn) => {
        btn.addEventListener('click', () => {
          clicker.handleInput(btn.dataset.key);
        });
      });
    }

    document.addEventListener('keydown', (event) => clicker.handleKey(event));
    window._arrowClicker = clicker;
  }

  function stop() {
    if (window._arrowClicker) window._arrowClicker.stop(false);
  }

  window.GameRegistry.register({
    id:          'arrow',
    name:        'Desafío Flechas',
    tag:         'REFLEJOS',
    accent:      '#ff9a3c',
    icon:        '⬆️',
    num:         '03',
    description: 'Presiona la tecla de flecha correcta antes de que caduque la señal. Velocidad máxima requerida.',
    difficulty:  2,
    css:         'css/arrow.css',

    init,
    stop,
    leaderboard: { format: v => `${v}%` }
  });

}());
