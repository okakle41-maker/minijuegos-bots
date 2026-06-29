/**
 * js/games/neuralfragment.js
 *
 * Neural Fragment Hack - Minijuego de memoria con fragmentos corruptos
 * Elementos esperados (data-ui dentro de <section id="neuralfragment">):
 *   start, fragmentDisplay, optionsGrid, scoreEl, roundEl, timerEl,
 *   messageEl, difficultySelect, fragmentCountSelect
 */

(function () {
  'use strict';

  let timerInterval = null;
  let gameState = null;

  function init(ui) {
    const {
      start,
      fragmentDisplay,
      optionsGrid,
      scoreEl,
      roundEl,
      timerEl,
      messageEl,
      difficultySelect,
      fragmentCountSelect
    } = ui;

    if (!start) return;

    // Generador de fragmentos estilo código
    const CHAR_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    function generateFragment() {
      const char1 = CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)];
      const char2 = CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)];
      return char1 + char2;
    }

    function generateSequence(count) {
      return Array.from({ length: count }, () => generateFragment());
    }

    function generateDistractors(correct, count) {
      const distractors = [];
      while (distractors.length < count) {
        const variant = [...correct];
        // Cambiar 1-2 elementos aleatoriamente
        const changes = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < changes; i++) {
          const idx = Math.floor(Math.random() * variant.length);
          variant[idx] = generateFragment();
        }
        const variantStr = variant.join('-');
        if (variantStr !== correct.join('-') && !distractors.includes(variantStr)) {
          distractors.push(variantStr);
        }
      }
      return distractors;
    }

    function createMissingSequence(sequence, gapCount) {
      const withGaps = [...sequence];
      const gapIndices = [];
      
      // Seleccionar posiciones aleatorias para huecos
      while (gapIndices.length < gapCount) {
        const idx = Math.floor(Math.random() * withGaps.length);
        if (!gapIndices.includes(idx)) {
          gapIndices.push(idx);
          withGaps[idx] = '??';
        }
      }
      
      return { sequence: withGaps, gapIndices, original: sequence };
    }

    function renderFragmentDisplay(data) {
      fragmentDisplay.innerHTML = data.sequence
        .map((frag, idx) => {
          if (frag === '??') {
            return `<span class="fragment-gap">??</span>`;
          }
          return `<span class="fragment-item">${frag}</span>`;
        })
        .join('<span class="fragment-separator">-</span>');
    }

    function renderOptions(correctSequence, gapIndices, options) {
      optionsGrid.innerHTML = '';
      
      // Generar opciones para cada hueco
      gapIndices.forEach((gapIdx, i) => {
        const correctValue = correctSequence[gapIdx];
        const distractors = [];
        
        // Generar 3 distractores
        while (distractors.length < 3) {
          const d = generateFragment();
          if (d !== correctValue && !distractors.includes(d)) {
            distractors.push(d);
          }
        }
        
        // Mezclar correcta con distractores
        const allOptions = [correctValue, ...distractors].sort(() => Math.random() - 0.5);
        
        const optionGroup = document.createElement('div');
        optionGroup.className = 'option-group';
        optionGroup.innerHTML = `<span class="option-label">Hueco ${i + 1}:</span>`;
        
        allOptions.forEach(opt => {
          const btn = document.createElement('button');
          btn.className = 'option-btn';
          btn.textContent = opt;
          btn.dataset.gapIndex = gapIdx;
          btn.dataset.value = opt;
          btn.addEventListener('click', () => handleOptionSelect(gapIdx, opt, correctValue));
          optionGroup.appendChild(btn);
        });
        
        optionsGrid.appendChild(optionGroup);
      });
    }

    let selectedOptions = {};

    function handleOptionSelect(gapIdx, value, correctValue) {
      selectedOptions[gapIdx] = value;
      
      // Actualizar visualmente
      const buttons = optionsGrid.querySelectorAll(`[data-gap-index="${gapIdx}"]`);
      buttons.forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.value === value);
      });
      
      // Verificar si todos los huecos están completados
      const currentData = gameState.currentRoundData;
      if (Object.keys(selectedOptions).length === currentData.gapIndices.length) {
        checkSolution();
      }
    }

    function checkSolution() {
      const currentData = gameState.currentRoundData;
      let allCorrect = true;
      
      currentData.gapIndices.forEach(gapIdx => {
        if (selectedOptions[gapIdx] !== currentData.original[gapIdx]) {
          allCorrect = false;
        }
      });
      
      if (allCorrect) {
        gameState.score++;
        gameState.round++;
        audioManager.play('good');
        messageEl.textContent = '✓ Fragmento restaurado correctamente';
        messageEl.className = 'message success';
        setTimeout(() => startRound(), 1500);
      } else {
        audioManager.play('miss');
        messageEl.textContent = '✗ Datos corruptos detectados';
        messageEl.className = 'message error';
        setTimeout(() => endGame(), 1500);
      }
      
      updateUI();
    }

    function getDifficultySettings() {
      const difficulty = difficultySelect.value;
      switch (difficulty) {
        case 'easy':
          return { fragmentCount: 3, gapCount: 1, exposureTime: 3000 };
        case 'normal':
          return { fragmentCount: 5, gapCount: 2, exposureTime: 2500 };
        case 'hard':
          return { fragmentCount: 7, gapCount: 3, exposureTime: 2000 };
        default:
          return { fragmentCount: 5, gapCount: 2, exposureTime: 2500 };
      }
    }

    function startRound() {
      if (gameState.round > gameState.maxRounds) {
        endGame(true);
        return;
      }

      selectedOptions = {};
      const settings = getDifficultySettings();
      
      // Generar secuencia
      const sequence = generateSequence(settings.fragmentCount);
      const roundData = createMissingSequence(sequence, settings.gapCount);
      gameState.currentRoundData = roundData;
      
      // Fase de exposición
      renderFragmentDisplay({ sequence, gapIndices: [] });
      messageEl.textContent = 'Memoriza los fragmentos...';
      messageEl.className = 'message info';
      optionsGrid.innerHTML = '';
      
      let exposureTime = settings.exposureTime;
      timerEl.textContent = `${exposureTime / 1000}s`;
      
      const countdown = setInterval(() => {
        exposureTime -= 100;
        timerEl.textContent = `${(exposureTime / 1000).toFixed(1)}s`;
        if (exposureTime <= 0) {
          clearInterval(countdown);
          showReconstructionPhase(roundData);
        }
      }, 100);
    }

    function showReconstructionPhase(roundData) {
      // Fase de reconstrucción
      renderFragmentDisplay(roundData);
      messageEl.textContent = 'Reconstruye los fragmentos perdidos';
      messageEl.className = 'message info';
      
      // Generar opciones
      renderOptions(roundData.original, roundData.gapIndices, 4);
      
      // Timer para la ronda
      let roundTime = 15;
      timerEl.textContent = `${roundTime}s`;
      
      timerInterval = setInterval(() => {
        roundTime--;
        timerEl.textContent = `${roundTime}s`;
        if (roundTime <= 0) {
          clearInterval(timerInterval);
          messageEl.textContent = '⏱ Tiempo agotado';
          messageEl.className = 'message error';
          setTimeout(() => endGame(), 1500);
        }
      }, 1000);
    }

    function startGame() {
      gameState = {
        score: 0,
        round: 1,
        maxRounds: 5,
        currentRoundData: null,
        active: true
      };
      
      start.disabled = true;
      updateUI();
      startRound();
    }

    function endGame(won = false) {
      gameState.active = false;
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      
      start.disabled = false;
      
      if (won) {
        audioManager.play('perfect');
        messageEl.textContent = `🎯 Hack completado: ${gameState.score}/${gameState.maxRounds}`;
        messageEl.className = 'message success';
      } else {
        audioManager.play('gameover');
        messageEl.textContent = `❌ Conexión perdida: ${gameState.score}/${gameState.maxRounds}`;
        messageEl.className = 'message error';
      }
      
      if (window.Leaderboard) {
        window.Leaderboard.save('neuralfragment', gameState.score);
      }
    }

    function updateUI() {
      if (scoreEl) scoreEl.textContent = `Puntuación: ${gameState.score}`;
      if (roundEl) roundEl.textContent = `Ronda: ${gameState.round}/${gameState.maxRounds}`;
    }

    start.addEventListener('click', startGame);
  }

  function stop() {
    if (gameState) {
      gameState.active = false;
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }
  }

  window.GameRegistry.register({
    id:          'neuralfragment',
    name:        'Neural Fragment Hack',
    tag:         'MEMORIA',
    accent:      '#00ff88',
    icon:        '🧠',
    num:         '01',
    description: 'Reconstruye fragmentos de memoria corrupta. Filtra el ruido y restaura los datos perdidos.',
    difficulty:  3,
    css:         'css/neuralfragment.css',

    init,
    stop,
    leaderboard: { format: v => `${v} fragmentos` }
  });

}());
