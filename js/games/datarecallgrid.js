/**
 * js/games/datarecallgrid.js
 *
 * Data Recall Grid - Minijuego de memoria visual + asociación rápida
 * Elementos esperados (data-ui dentro de <section id="datarecallgrid">):
 *   start, gridDisplay, questionDisplay, answerInput, submitBtn,
 *   scoreEl, questionCountEl, timerEl, messageEl,
 *   objectCountSelect, displayTimeSelect, questionCountSelect
 */

(function () {
  'use strict';

  let timerInterval = null;
  let gameState = null;

  function init(ui) {
    const {
      start,
      gridDisplay,
      questionDisplay,
      answerInput,
      submitBtn,
      scoreEl,
      questionCountEl,
      timerEl,
      messageEl,
      objectCountSelect,
      displayTimeSelect,
      questionCountSelect
    } = ui;

    if (!start) return;

    // Objetos disponibles con iconos
    const OBJECTS = [
      { icon: '🏠', name: 'House' },
      { icon: '🏭', name: 'Factory' },
      { icon: '🏪', name: 'Shop' },
      { icon: '🏦', name: 'Bank' },
      { icon: '⛽', name: 'Gas Station' },
      { icon: '🏥', name: 'Hospital' },
      { icon: '🏫', name: 'School' },
      { icon: '🏰', name: 'Castle' },
      { icon: '🌆', name: 'City' },
      { icon: '🌉', name: 'Bridge' },
      { icon: '🗼', name: 'Tower' },
      { icon: '🏟️', name: 'Stadium' }
    ];

    // Colores disponibles
    const COLORS = [
      { name: 'red', hex: '#ff4444' },
      { name: 'blue', hex: '#4444ff' },
      { name: 'green', hex: '#44ff44' },
      { name: 'yellow', hex: '#ffff44' },
      { name: 'purple', hex: '#aa44ff' },
      { name: 'orange', hex: '#ff8844' },
      { name: 'pink', hex: '#ff44aa' },
      { name: 'cyan', hex: '#44ffff' }
    ];

    function generateData(count) {
      const shuffledObjects = [...OBJECTS].sort(() => Math.random() - 0.5).slice(0, count);
      const shuffledColors = [...COLORS].sort(() => Math.random() - 0.5).slice(0, count);
      
      return shuffledObjects.map((obj, idx) => ({
        ...obj,
        color: shuffledColors[idx],
        position: idx + 1
      }));
    }

    function renderGrid(data, visible = true) {
      gridDisplay.innerHTML = '';
      
      data.forEach((item, idx) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'grid-item';
        
        if (visible) {
          itemEl.innerHTML = `
            <span class="item-icon">${item.icon}</span>
            <span class="item-name">${item.name}</span>
            <span class="item-arrow">→</span>
            <span class="item-color" style="color: ${item.color.hex}">${item.color.name}</span>
          `;
        } else {
          itemEl.innerHTML = `
            <span class="item-icon">${item.icon}</span>
            <span class="item-name">???</span>
            <span class="item-arrow">→</span>
            <span class="item-color">???</span>
          `;
          itemEl.classList.add('hidden');
        }
        
        gridDisplay.appendChild(itemEl);
      });
    }

    function generateQuestion(data) {
      const questionTypes = ['color_of', 'object_of', 'position_of'];
      const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];
      const item = data[Math.floor(Math.random() * data.length)];
      
      let question, answer;
      
      switch (type) {
        case 'color_of':
          question = `What color was the ${item.name}?`;
          answer = item.color.name;
          break;
        case 'object_of':
          question = `Which object was ${item.color.name}?`;
          answer = item.name;
          break;
        case 'position_of':
          question = `What was in position ${item.position}?`;
          answer = item.name;
          break;
      }
      
      return { question, answer };
    }

    function getSettings() {
      return {
        objectCount: parseInt(objectCountSelect.value),
        displayTime: parseInt(displayTimeSelect.value) * 1000,
        questionCount: parseInt(questionCountSelect.value)
      };
    }

    function startGame() {
      const settings = getSettings();
      
      gameState = {
        data: generateData(settings.objectCount),
        currentQuestion: 0,
        totalQuestions: settings.questionCount,
        score: 0,
        displayTime: settings.displayTime,
        active: true
      };
      
      start.disabled = true;
      updateUI();
      
      // Fase 1: Escaneo visual
      renderGrid(gameState.data, true);
      messageEl.textContent = '👁️ MEMORIZE THE DATA...';
      messageEl.className = 'message info';
      questionDisplay.textContent = '';
      answerInput.value = '';
      answerInput.disabled = true;
      submitBtn.disabled = true;
      
      let timeLeft = gameState.displayTime;
      timerEl.textContent = `${(timeLeft / 1000).toFixed(1)}s`;
      
      timerInterval = setInterval(() => {
        timeLeft -= 100;
        timerEl.textContent = `${(timeLeft / 1000).toFixed(1)}s`;
        
        if (timeLeft <= 0) {
          clearInterval(timerInterval);
          startInterrogation();
        }
      }, 100);
    }

    function startInterrogation() {
      // Fase 2: Ocultación
      renderGrid(gameState.data, false);
      messageEl.textContent = '🌫️ DATA HIDDEN - ANSWER THE QUESTIONS';
      messageEl.className = 'message warning';
      
      answerInput.disabled = false;
      submitBtn.disabled = false;
      answerInput.focus();
      
      showQuestion();
    }

    function showQuestion() {
      if (gameState.currentQuestion >= gameState.totalQuestions) {
        endGame(true);
        return;
      }
      
      const { question, answer } = generateQuestion(gameState.data);
      gameState.currentAnswer = answer;
      
      questionDisplay.textContent = question;
      answerInput.value = '';
      
      // Timer para responder (10 segundos por pregunta)
      let timeLeft = 10;
      timerEl.textContent = `${timeLeft}s`;
      
      if (timerInterval) clearInterval(timerInterval);
      
      timerInterval = setInterval(() => {
        timeLeft--;
        timerEl.textContent = `${timeLeft}s`;
        
        if (timeLeft <= 0) {
          clearInterval(timerInterval);
          handleAnswer(false);
        }
      }, 1000);
    }

    function handleAnswer(userAnswer) {
      clearInterval(timerInterval);
      
      const isCorrect = userAnswer === gameState.currentAnswer;
      
      if (isCorrect) {
        gameState.score++;
        messageEl.textContent = '✓ CORRECT';
        messageEl.className = 'message success';
        audioManager.play('good');
      } else {
        messageEl.textContent = `✗ WRONG! Answer: ${gameState.currentAnswer}`;
        messageEl.className = 'message error';
        audioManager.play('miss');
      }
      
      gameState.currentQuestion++;
      updateUI();
      
      setTimeout(() => {
        if (gameState.active) {
          showQuestion();
        }
      }, 1500);
    }

    function submitAnswer() {
      const userAnswer = answerInput.value.trim().toLowerCase();
      const correctAnswer = gameState.currentAnswer.toLowerCase();
      handleAnswer(userAnswer === correctAnswer ? gameState.currentAnswer : null);
    }

    function endGame(completed = false) {
      gameState.active = false;
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      
      start.disabled = false;
      answerInput.disabled = true;
      submitBtn.disabled = true;
      
      if (completed) {
        audioManager.play('perfect');
        messageEl.textContent = `🎯 HACK COMPLETE: ${gameState.score}/${gameState.totalQuestions}`;
        messageEl.className = 'message success';
      } else {
        audioManager.play('gameover');
        messageEl.textContent = `❌ CONNECTION LOST: ${gameState.score}/${gameState.totalQuestions}`;
        messageEl.className = 'message error';
      }
      
      if (window.Leaderboard) {
        window.Leaderboard.save('datarecallgrid', gameState.score);
      }
    }

    function updateUI() {
      if (scoreEl) scoreEl.textContent = `Score: ${gameState.score}`;
      if (questionCountEl) questionCountEl.textContent = `Question: ${gameState.currentQuestion}/${gameState.totalQuestions}`;
    }

    start.addEventListener('click', startGame);
    submitBtn.addEventListener('click', submitAnswer);
    answerInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !submitBtn.disabled) {
        submitAnswer();
      }
    });
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
    id:          'datarecallgrid',
    name:        'Data Recall Grid',
    tag:         'MEMORIA',
    accent:      '#ff4444',
    icon:        '🧠',
    num:         '02',
    description: 'Memoriza la red de datos y responde bajo presión. Escanea, recuerda, responde.',
    difficulty:  3,
    css:         'css/datarecallgrid.css',

    init,
    stop,
    leaderboard: { format: v => `${v} respuestas` }
  });

}());
