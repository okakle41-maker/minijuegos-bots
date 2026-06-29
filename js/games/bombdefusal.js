/**
 * js/games/bombdefusal.js
 *
 * Bomb Defusal — operador vs manual bajo presión.
 * Elementos esperados (data-ui dentro de <section id="bombdefusal">):
 *   setupPhase, gamePhase, start, restart,
 *   timeLimit, moduleCount, maxStrikes, difficulty, animSpeed, allowDup,
 *   modTypeChips, roleOperator, roleExpert,
 *   operatorPanel, expertPanel, bombGrid, manualContent, manualNav,
 *   timerEl, timerBar, strikesEl, modulesEl, serialEl, indicatorEl,
 *   info, result
 */

(function () {
  'use strict';

  let timerInterval = null;
  let holdInterval = null;
  let activeState = null;
  let audioContext = null;
  let soundEnabled = true;
  let soundVolume = 0.3;

  function initAudio() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }

  function playSound(type) {
    if (!soundEnabled || !audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    gainNode.gain.value = soundVolume;
    
    switch(type) {
      case 'success':
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
      case 'error':
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
        break;
      case 'strike':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
        break;
      case 'win':
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.15);
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.3);
        oscillator.frequency.setValueAtTime(1046.50, audioContext.currentTime + 0.45);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.6);
        break;
      case 'lose':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.2);
        oscillator.frequency.setValueAtTime(100, audioContext.currentTime + 0.4);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.6);
        break;
      case 'click':
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.05);
        break;
    }
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    return soundEnabled;
  }

  function setVolume(vol) {
    soundVolume = Math.max(0, Math.min(1, vol));
  }

  const WIRE_COLORS = ['red', 'blue', 'yellow', 'white', 'black'];
  const BTN_COLORS = ['blue', 'white', 'yellow', 'red'];
  const BTN_LABELS = ['PRESIONAR', 'MANTENER', 'ABORTAR', 'DETONAR', 'ACTIVAR'];
  const SYMBOLS = ['★', 'Ω', '©', '?', 'λ', 'Ϙ', '¶', '¿'];
  const FREQS = ['3.55', '3.70', '3.85', '4.00', '4.15', '4.30'];
  const FREQ_LABELS = ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT'];
  const SCREEN_MSGS = ['SÍ', 'NO', 'ARRIBA', 'ABAJO', 'IZQ', 'DER', '¿?', '88:88', '12:34', '99:99'];
  const SCREEN_OPTS = ['SÍ', 'NO', 'ARRIBA', 'ABAJO', 'IZQ', 'DER', 'LISTO', 'ESPERA'];

  const MODULE_NAMES = {
    wires: 'Cables',
    buttons: 'Botones',
    symbols: 'Símbolos',
    memory: 'Memoria',
    screen: 'Pantalla',
    frequency: 'Frecuencias',
    colors: 'Colores',
    pattern: 'Patrones',
    switches: 'Interruptores',
    code: 'Código',
    keypad: 'Teclado',
    morse: 'Morse',
    password: 'Contraseña',
    simon: 'Simon',
    knobs: 'Perillas',
    maze: 'Laberinto',
    timer: 'Cronómetro',
    sequence: 'Secuencia',
    binary: 'Binario',
    math: 'Matemáticas',
    word: 'Palabra',
    reaction: 'Reacción',
    matching: 'Parejas',
    cipher: 'Cifrado',
    timing: 'Sincronía',
    coordinates: 'Coordenadas',
    battery: 'Batería',
    ports: 'Puertos',
    compass: 'Brújula',
    slots: 'Ranuras'
  };

  const COLOR_NAMES = ['rojo', 'azul', 'verde', 'amarillo'];
  const COLOR_CSS = { rojo: '#ef4444', azul: '#3b82f6', verde: '#22c55e', amarillo: '#eab308' };
  const PASSWORD_WORDS = ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF', 'HOTEL'];
  const SIMON_COLORS = ['red', 'blue', 'green', 'yellow'];
  const KNOB_POSITIONS = ['IZQ', 'ARRIBA', 'DER', 'ABAJO'];
  const MAZE_SIZE = 5;
  const SEQUENCE_NUMBERS = ['1', '2', '3', '4', '5'];
  const MATH_OPERATIONS = ['+', '-', '×'];
  const WORD_WORDS = ['BOMBA', 'FUEGO', 'TIEMPO', 'CABLE', 'SECRETO', 'CODIGO', 'PULSAR', 'DETENER'];
  const MATCHING_SYMBOLS = ['★', 'Ω', '©', 'λ', 'Ϙ', '¶', '¿', '♡'];
  const CIPHER_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const KEYPAD_GRID = ['λ', 'ψ', 'Ω', 'Ϙ', '☆', '¿', '¶', '♡', 'β'];
  const MORSE_WORDS = [
    { code: '·−·−', letter: 'C' },
    { code: '−··', letter: 'D' },
    { code: '·', letter: 'E' },
    { code: '··−·', letter: 'F' },
    { code: '−−·', letter: 'G' },
    { code: '····', letter: 'H' },
    { code: '··', letter: 'I' },
    { code: '·−−−', letter: 'J' },
    { code: '−·−', letter: 'K' },
    { code: '·−··', letter: 'L' },
    { code: '−−', letter: 'M' },
    { code: '−·', letter: 'N' },
    { code: '−−−', letter: 'O' },
    { code: '·−−·', letter: 'P' },
    { code: '−−·−', letter: 'Q' },
    { code: '·−·', letter: 'R' },
    { code: '···', letter: 'S' },
    { code: '−', letter: 'T' }
  ];

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function genSerial() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
    return s;
  }

  function genBatteryLevel() {
    return randInt(1, 4);
  }

  function genPortType() {
    const ports = ['DVI', 'Parallel', 'PS/2', 'RJ-45', 'Stereo RCA', 'USB'];
    return pick(ports);
  }

  function genPortCount() {
    return randInt(1, 6);
  }

  function genIndicatorColor() {
    const colors = ['rojo', 'azul', 'verde', 'amarillo', 'blanco'];
    return pick(colors);
  }

  function genPlateColor() {
    const colors = ['negro', 'azul', 'rojo', 'blanco'];
    return pick(colors);
  }

  function genBatteryHolders() {
    return randInt(0, 3);
  }

  function genParallelPort() {
    return Math.random() > 0.5;
  }

  function serialLastDigitEven(serial) {
    const d = serial.slice(-1);
    return '02468'.includes(d);
  }

  function countColor(wires, color) {
    return wires.filter(w => w === color).length;
  }

  function lastIndexOfColor(wires, color) {
    for (let i = wires.length - 1; i >= 0; i--) {
      if (wires[i] === color) return i;
    }
    return -1;
  }

  /* ── Solvers (reglas del manual) ── */

  function solveWires(wires, serial) {
    const n = wires.length;
    const reds = countColor(wires, 'red');
    const blues = countColor(wires, 'blue');
    const yellows = countColor(wires, 'yellow');
    const blacks = countColor(wires, 'black');

    if (n === 3) {
      if (reds === 0) return 1;
      if (blues === 1) return wires.indexOf('blue');
      return n - 1;
    }
    if (n === 4) {
      if (reds > 1) return lastIndexOfColor(wires, 'red');
      if (wires[n - 1] === 'yellow' && reds === 0) return 0;
      if (blues === 1) return 0;
      return 1;
    }
    if (n === 5) {
      if (wires[n - 1] === 'black') return 3;
      if (reds === 1 && yellows > 1) return 0;
      if (blacks === 0) return 1;
      return 0;
    }
    if (n === 6) {
      if (yellows === 0 && serialLastDigitEven(serial)) return 2;
      if (yellows === 1 && countColor(wires, 'white') > 1) return 3;
      if (reds === 0) return 1;
      return 0;
    }
    return 0;
  }

  function solveButton(color, label, serial, strikes, indicatorLit) {
    const vowel = /[AEIOU]/.test(serial[0]);
    if (color === 'blue' && label === 'ABORTAR') return { action: 'hold', releaseOnSecondDigit: 1 };
    if (color === 'white' && indicatorLit) return { action: 'tap' };
    if (color === 'yellow') return { action: 'hold', releaseOnLight: true };
    if (color === 'red' && label === 'DETONAR') return { action: 'tap' };
    if (color === 'red' && strikes > 0) return { action: 'hold', releaseOnLight: true };
    if (color === 'white') return { action: 'tap' };
    if (color === 'blue' && !vowel) return { action: 'tap' };
    return { action: 'hold', releaseOnLight: true };
  }

  function solveSymbols(symbols) {
    const hasStar = symbols.includes('★');
    const hasCopyright = symbols.includes('©');
    const hasLambda = symbols.includes('λ');
    const hasQuestion = symbols.includes('?');
    const hasOmega = symbols.includes('Ω');
    const hasParagraph = symbols.includes('¶');
    const hasKoppa = symbols.includes('Ϙ');
    const hasUpside = symbols.includes('¿');

    let order;
    if (symbols.length === 4) {
      if (hasStar && hasCopyright) order = ['©', '★', '?', 'λ'];
      else if (hasLambda && hasQuestion) order = ['λ', '?', '★', 'Ϙ'];
      else if (hasParagraph && hasKoppa) order = ['Ϙ', '¶', '★', 'λ'];
      else if (hasOmega && hasUpside) order = ['Ω', '¿', '?', '★'];
      else order = shuffle(symbols);
    } else {
      order = symbols.slice();
    }
    return order.filter(s => symbols.includes(s));
  }

  function solveMemoryStage(stage, display, history) {
    const labels = history.map(h => h.label);
    const positions = history.map(h => h.position);

    if (stage === 1) {
      if (display === 1) return 1;
      if (display === 4) return 3;
      return 0;
    }
    if (stage === 2) {
      if (display === 1) return labels.indexOf(1);
      if (display === 4) return 0;
      if (display === 2) return positions[0];
      return 1;
    }
    if (stage === 3) {
      if (display === 3) return labels.indexOf(3);
      if (display === 1) return labels.indexOf(1);
      return 2;
    }
    if (stage === 4) {
      if (display === 4) return positions[0];
      if (display === 2) return 0;
      return positions[1];
    }
    if (display === 1) return 0;
    if (display === 2) return positions[1];
    if (display === 4) return positions[0];
    return 1;
  }

  function solveScreen(msg, serial, strikes) {
    const lastDigit = parseInt(serial.slice(-1), 10) || 0;
    const vowel = /[AEIOU]/.test(serial[0]);

    if (msg === 'SÍ') return strikes > 0 ? 'NO' : 'SÍ';
    if (msg === 'NO') return vowel ? 'SÍ' : 'NO';
    if (msg === 'ARRIBA') return 'ABAJO';
    if (msg === 'ABAJO') return lastDigit % 2 === 0 ? 'ARRIBA' : 'IZQ';
    if (msg === 'IZQ') return 'DER';
    if (msg === 'DER') return strikes > 0 ? 'ESPERA' : 'LISTO';
    if (msg === '¿?') return 'SÍ';
    if (msg === '88:88') return 'ESPERA';
    if (msg === '12:34') return lastDigit <= 5 ? 'IZQ' : 'DER';
    if (msg === '99:99') return 'ABAJO';
    return pick(SCREEN_OPTS);
  }

  function serialDigitSum(serial) {
    let sum = 0;
    for (const ch of serial) {
      const d = parseInt(ch, 10);
      if (!isNaN(d)) sum += d;
    }
    return sum;
  }

  function serialVowelCount(serial) {
    return (serial.match(/[AEIOU]/gi) || []).length;
  }

  function solveFrequency(labelA, labelB) {
    const idxA = FREQ_LABELS.indexOf(labelA);
    const idxB = FREQ_LABELS.indexOf(labelB);
    const map = [
      ['3.55', '3.70'], ['3.70', '3.85'], ['3.85', '4.00'],
      ['4.00', '4.15'], ['4.15', '4.30'], ['4.30', '3.55']
    ];
    if (idxA >= 0 && idxB >= 0) {
      const pair = map[(idxA + idxB) % map.length];
      return pair[0];
    }
    return FREQS[0];
  }

  function solveColors(serial, strikes, indicatorLit) {
    const orders = [
      ['rojo', 'azul', 'verde', 'amarillo'],
      ['azul', 'verde', 'amarillo', 'rojo'],
      ['verde', 'amarillo', 'rojo', 'azul'],
      ['amarillo', 'rojo', 'azul', 'verde']
    ];
    let idx = serialDigitSum(serial) % 4;
    if (strikes > 0) idx = (idx + strikes) % 4;
    let order = orders[idx].slice();
    if (indicatorLit) order = order.slice(1);
    return order;
  }

  function solvePattern(litCount, serial, strikes) {
    const size = 5;
    const cells = [];
    const vowel = /[AEIOU]/.test(serial[0]);

    if (litCount === 4) {
      [[0, 0], [0, 4], [4, 0], [4, 4]].forEach(([r, c]) => cells.push(r * size + c));
    } else if (litCount === 5) {
      [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [0, 2], [1, 2], [3, 2], [4, 2]].forEach(([r, c]) => cells.push(r * size + c));
    } else {
      if (vowel) {
        for (let r = 0; r < size; r++) cells.push(r * size + 2);
      } else {
        for (let c = 0; c < size; c++) cells.push(2 * size + c);
      }
    }

    if (strikes > 0) {
      return cells.map(i => {
        const r = Math.floor(i / size);
        const c = i % size;
        return r * size + (size - 1 - c);
      });
    }
    return cells;
  }

  function solveSwitches(serial, strikes, indicatorLit) {
    const last = serial.slice(-1);
    const lastDigit = parseInt(last, 10);
    const sw1 = !isNaN(lastDigit) && lastDigit % 2 === 0;
    const sw2 = indicatorLit;
    const sw3 = (strikes + serialDigitSum(serial)) % 2 === 1;
    return [sw1, sw2, sw3];
  }

  function solveCode(serial) {
    const code = (serialDigitSum(serial) * 7 + serialVowelCount(serial) * 13) % 10000;
    return code.toString().padStart(4, '0');
  }

  function solveKeypad(serial, strikes, indicatorLit) {
    const first = serial[0].toUpperCase();
    const col3 = [KEYPAD_GRID[2], KEYPAD_GRID[5], KEYPAD_GRID[8]];
    const row1 = [KEYPAD_GRID[0], KEYPAD_GRID[1], KEYPAD_GRID[2]];
    let order = first <= 'M' ? row1 : col3;
    order = order.slice();
    if (indicatorLit) order = ['¶'].concat(order.filter(s => s !== '¶'));
    if (strikes > 0) order = order.slice().reverse();
    return order;
  }

  function solveMorse(code) {
    const found = MORSE_WORDS.find(w => w.code === code);
    return found ? found.letter : 'E';
  }

  function solvePassword(clues, serial) {
    const digitSum = serialDigitSum(serial);
    const vowelCount = serialVowelCount(serial);
    const idx = (digitSum + vowelCount) % PASSWORD_WORDS.length;
    return PASSWORD_WORDS[idx];
  }

  function solveSimon(sequence, serial, strikes) {
    const lastDigit = parseInt(serial.slice(-1), 10) || 0;
    const vowel = /[AEIOU]/.test(serial[0]);
    
    let colors = SIMON_COLORS.slice();
    if (strikes > 0) colors = colors.reverse();
    if (vowel) colors = [colors[1], colors[0], colors[3], colors[2]];
    if (lastDigit % 2 === 0) colors = [colors[2], colors[3], colors[0], colors[1]];
    
    return colors;
  }

  function solveKnobs(serial, strikes, indicatorLit) {
    const digitSum = serialDigitSum(serial);
    const positions = [];
    
    for (let i = 0; i < 3; i++) {
      let idx = (digitSum + i + strikes) % KNOB_POSITIONS.length;
      if (indicatorLit && i === 1) idx = (idx + 2) % KNOB_POSITIONS.length;
      positions.push(KNOB_POSITIONS[idx]);
    }
    
    return positions;
  }

  function solveMaze(serial, strikes) {
    const digitSum = serialDigitSum(serial);
    const exitRow = digitSum % MAZE_SIZE;
    const exitCol = (digitSum + strikes) % MAZE_SIZE;
    return { row: exitRow, col: exitCol };
  }

  function solveTimer(serial, strikes) {
    const digitSum = serialDigitSum(serial);
    const targetSecond = (digitSum + strikes) % 60;
    return targetSecond;
  }

  function solveSequence(serial, strikes) {
    const digitSum = serialDigitSum(serial);
    const startIdx = digitSum % SEQUENCE_NUMBERS.length;
    let order = SEQUENCE_NUMBERS.slice(startIdx).concat(SEQUENCE_NUMBERS.slice(0, startIdx));
    if (strikes > 0) order = order.reverse();
    return order;
  }

  function solveBinary(serial, strikes) {
    const digitSum = serialDigitSum(serial);
    const target = (digitSum + strikes) % 32;
    return target.toString(2).padStart(5, '0');
  }

  function solveMath(serial, strikes) {
    const digitSum = serialDigitSum(serial);
    const a = digitSum % 10;
    const b = (digitSum + strikes) % 10;
    const op = MATH_OPERATIONS[digitSum % MATH_OPERATIONS.length];
    let result;
    if (op === '+') result = a + b;
    else if (op === '-') result = Math.abs(a - b);
    else result = a * b;
    return { a, b, op, result };
  }

  function solveWord(serial, strikes) {
    const digitSum = serialDigitSum(serial);
    const idx = (digitSum + strikes) % WORD_WORDS.length;
    return WORD_WORDS[idx];
  }

  function solveReaction(serial, strikes) {
    const digitSum = serialDigitSum(serial);
    const targetMs = 2000 + (digitSum * 100) + (strikes * 200);
    return targetMs;
  }

  function solveMatching(serial, strikes) {
    const digitSum = serialDigitSum(serial);
    const pairs = [];
    const symbols = shuffle(MATCHING_SYMBOLS.slice());
    for (let i = 0; i < 4; i++) {
      pairs.push([symbols[i * 2], symbols[i * 2 + 1]]);
    }
    return pairs;
  }

  function solveCipher(serial, strikes) {
    const digitSum = serialDigitSum(serial);
    const shift = (digitSum + strikes) % 26;
    const original = pick(WORD_WORDS);
    let encoded = '';
    for (const char of original) {
      const idx = CIPHER_ALPHABET.indexOf(char);
      if (idx >= 0) {
        const newIdx = (idx + shift) % 26;
        encoded += CIPHER_ALPHABET[newIdx];
      } else {
        encoded += char;
      }
    }
    return { original, encoded, shift };
  }

  function solveTiming(serial, strikes) {
    const digitSum = serialDigitSum(serial);
    const offset = (digitSum + strikes) % 10;
    return offset;
  }

  function solveCoordinates(serial, strikes) {
    const digitSum = serialDigitSum(serial);
    const x = (digitSum + strikes) % 10;
    const y = (digitSum + strikes * 2) % 10;
    return { x, y };
  }

  function solveBattery(batteryLevel, serial) {
    const digitSum = serialDigitSum(serial);
    const targetLevel = (digitSum % 4) + 1;
    return targetLevel;
  }

  function solvePorts(portType, portCount, serial) {
    const digitSum = serialDigitSum(serial);
    const targetPortIndex = digitSum % 6;
    const portTypes = ['DVI', 'Parallel', 'PS/2', 'RJ-45', 'Stereo RCA', 'USB'];
    return portTypes[targetPortIndex];
  }

  function solveCompass(serial, strikes) {
    const digitSum = serialDigitSum(serial);
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const targetIndex = (digitSum + strikes) % 8;
    return directions[targetIndex];
  }

  function solveSlots(batteryLevel, portCount, serial) {
    const digitSum = serialDigitSum(serial);
    const targetSlot = (digitSum + batteryLevel + portCount) % 5;
    return targetSlot;
  }

  function solveWindows(indicatorColor, plateColor, serial) {
    const digitSum = serialDigitSum(serial);
    const colorIndex = (digitSum + (indicatorColor === 'rojo' ? 1 : 0) + (plateColor === 'negro' ? 1 : 0)) % 4;
    const colors = ['rojo', 'azul', 'verde', 'amarillo'];
    return colors[colorIndex];
  }

  function solveWhoAmI(moduleCount, batteryHolders, parallelPort, serial) {
    const digitSum = serialDigitSum(serial);
    const moduleType = (digitSum + moduleCount + batteryHolders + (parallelPort ? 1 : 0)) % 5;
    const types = ['Cables', 'Botones', 'Teclado', 'Simon', 'Laberinto'];
    return types[moduleType];
  }

  function solveSecurity(indicatorColor, plateColor, batteryHolders, parallelPort, serial) {
    const digitSum = serialDigitSum(serial);
    const code = (digitSum + (indicatorColor === 'azul' ? 2 : 0) + (plateColor === 'rojo' ? 3 : 0) + batteryHolders + (parallelPort ? 1 : 0)) % 100;
    return code.toString().padStart(2, '0');
  }

  function solveComplexWires(wires, indicatorColor, batteryHolders, serial) {
    const digitSum = serialDigitSum(serial);
    const wireCount = wires.length;
    let targetIndex = 0;
    
    if (wireCount === 3) {
      targetIndex = (digitSum % 3);
    } else if (wireCount === 4) {
      targetIndex = (digitSum + (indicatorColor === 'rojo' ? 1 : 0)) % 4;
    } else if (wireCount === 5) {
      targetIndex = (digitSum + batteryHolders) % 5;
    } else {
      targetIndex = digitSum % wireCount;
    }
    
    return targetIndex;
  }

  /* ── Module factories ── */

  function createWiresModule(difficulty) {
    const count = randInt(3, difficulty >= 4 ? 6 : 5);
    const wires = [];
    for (let i = 0; i < count; i++) wires.push(pick(WIRE_COLORS));
    return {
      type: 'wires',
      solved: false,
      data: { wires, cutIndex: null },
      getSolution(bomb) {
        return { wireIndex: solveWires(wires, bomb.serial) };
      }
    };
  }

  function createButtonsModule() {
    return {
      type: 'buttons',
      solved: false,
      data: {
        color: pick(BTN_COLORS),
        label: pick(BTN_LABELS),
        pressed: false,
        holding: false
      },
      getSolution(bomb) {
        return solveButton(
          this.data.color, this.data.label,
          bomb.serial, bomb.strikes, bomb.indicatorLit
        );
      }
    };
  }

  function createSymbolsModule() {
    const ruleSets = [
      ['©', '★', '?', 'λ'],
      ['λ', '?', '★', 'Ϙ'],
      ['Ϙ', '¶', '★', 'λ'],
      ['Ω', '¿', '?', '★']
    ];
    const order = pick(ruleSets);
    const symbols = shuffle(order.slice());
    return {
      type: 'symbols',
      solved: false,
      data: { symbols, order, step: 0 },
      getSolution() {
        return { order: this.data.order };
      }
    };
  }

  function createMemoryModule() {
    const labels = shuffle([0, 1, 2, 3]);
    return {
      type: 'memory',
      solved: false,
      data: {
        stage: 1,
        display: randInt(1, 4),
        labels,
        history: []
      },
      getSolution(bomb) {
        const d = this.data;
        return {
          position: solveMemoryStage(d.stage, d.display, d.history)
        };
      }
    };
  }

  function createScreenModule() {
    const msg = pick(SCREEN_MSGS);
    return {
      type: 'screen',
      solved: false,
      data: { msg },
      getSolution(bomb) {
        return { answer: solveScreen(this.data.msg, bomb.serial, bomb.strikes) };
      }
    };
  }

  function createFrequencyModule() {
    const labelA = pick(FREQ_LABELS);
    let labelB = pick(FREQ_LABELS);
    while (labelB === labelA) labelB = pick(FREQ_LABELS);
    return {
      type: 'frequency',
      solved: false,
      data: { labelA, labelB },
      getSolution() {
        return { freq: solveFrequency(this.data.labelA, this.data.labelB) };
      }
    };
  }

  function createColorsModule() {
    const colors = shuffle(COLOR_NAMES.slice());
    return {
      type: 'colors',
      solved: false,
      data: { colors, step: 0 },
      getSolution(bomb) {
        return { order: solveColors(bomb.serial, bomb.strikes, bomb.indicatorLit) };
      }
    };
  }

  function createPatternModule() {
    const size = 5;
    const litCount = pick([4, 5, 6]);
    const decoy = new Set();
    while (decoy.size < litCount) decoy.add(randInt(0, size * size - 1));
    return {
      type: 'pattern',
      solved: false,
      data: { size, litCount, decoy: [...decoy], selected: new Set() },
      getSolution(bomb) {
        return { cells: solvePattern(this.data.litCount, bomb.serial, bomb.strikes) };
      }
    };
  }

  function createSwitchesModule() {
    return {
      type: 'switches',
      solved: false,
      data: {
        states: [Math.random() > 0.5, Math.random() > 0.5, Math.random() > 0.5]
      },
      getSolution(bomb) {
        return { states: solveSwitches(bomb.serial, bomb.strikes, bomb.indicatorLit) };
      }
    };
  }

  function createCodeModule() {
    return {
      type: 'code',
      solved: false,
      data: { input: '' },
      getSolution(bomb) {
        return { code: solveCode(bomb.serial) };
      }
    };
  }

  function createKeypadModule() {
    return {
      type: 'keypad',
      solved: false,
      data: { symbols: KEYPAD_GRID.slice(), step: 0 },
      getSolution(bomb) {
        return { order: solveKeypad(bomb.serial, bomb.strikes, bomb.indicatorLit) };
      }
    };
  }

  function createMorseModule() {
    const entry = pick(MORSE_WORDS);
    const distractors = shuffle(
      MORSE_WORDS.filter(w => w.letter !== entry.letter).map(w => w.letter)
    ).slice(0, 3);
    const options = shuffle([entry.letter, ...distractors]);
    return {
      type: 'morse',
      solved: false,
      data: { code: entry.code, options },
      getSolution() {
        return { letter: solveMorse(this.data.code) };
      }
    };
  }

  function createPasswordModule() {
    const clues = shuffle(PASSWORD_WORDS.slice()).slice(0, 4);
    return {
      type: 'password',
      solved: false,
      data: { clues, input: '' },
      getSolution(bomb) {
        return { password: solvePassword(this.data.clues, bomb.serial) };
      }
    };
  }

  function createSimonModule() {
    const sequenceLength = randInt(4, 6);
    return {
      type: 'simon',
      solved: false,
      data: { sequenceLength, step: 0, playerSequence: [] },
      getSolution(bomb) {
        return { colors: solveSimon(this.data.sequenceLength, bomb.serial, bomb.strikes) };
      }
    };
  }

  function createKnobsModule() {
    return {
      type: 'knobs',
      solved: false,
      data: { positions: [0, 0, 0] },
      getSolution(bomb) {
        return { positions: solveKnobs(bomb.serial, bomb.strikes, bomb.indicatorLit) };
      }
    };
  }

  function createMazeModule() {
    return {
      type: 'maze',
      solved: false,
      data: { playerRow: 0, playerCol: 0 },
      getSolution(bomb) {
        return solveMaze(bomb.serial, bomb.strikes);
      }
    };
  }

  function createTimerModule() {
    return {
      type: 'timer',
      solved: false,
      data: { stopped: false, stopSecond: null },
      getSolution(bomb) {
        return { targetSecond: solveTimer(bomb.serial, bomb.strikes) };
      }
    };
  }

  function createSequenceModule() {
    return {
      type: 'sequence',
      solved: false,
      data: { step: 0 },
      getSolution(bomb) {
        return { order: solveSequence(bomb.serial, bomb.strikes) };
      }
    };
  }

  function createBinaryModule() {
    return {
      type: 'binary',
      solved: false,
      data: { input: '' },
      getSolution(bomb) {
        return { binary: solveBinary(bomb.serial, bomb.strikes) };
      }
    };
  }

  function createMathModule() {
    return {
      type: 'math',
      solved: false,
      data: { answer: '' },
      getSolution(bomb) {
        return solveMath(bomb.serial, bomb.strikes);
      }
    };
  }

  function createWordModule() {
    const word = pick(WORD_WORDS);
    const hidden = word.split('').map(() => '_').join('');
    return {
      type: 'word',
      solved: false,
      data: { word, revealed: [], input: '' },
      getSolution(bomb) {
        return { word: solveWord(bomb.serial, bomb.strikes) };
      }
    };
  }

  function createReactionModule() {
    return {
      type: 'reaction',
      solved: false,
      data: { lit: false, litTime: null, pressed: false },
      getSolution(bomb) {
        return { targetMs: solveReaction(bomb.serial, bomb.strikes) };
      }
    };
  }

  function createMatchingModule() {
    return {
      type: 'matching',
      solved: false,
      data: { selected: [], matched: [] },
      getSolution(bomb) {
        return { pairs: solveMatching(bomb.serial, bomb.strikes) };
      }
    };
  }

  function createCipherModule() {
    return {
      type: 'cipher',
      solved: false,
      data: { input: '' },
      getSolution(bomb) {
        return solveCipher(bomb.serial, bomb.strikes);
      }
    };
  }

  function createTimingModule() {
    return {
      type: 'timing',
      solved: false,
      data: { synced: false },
      getSolution(bomb) {
        return { offset: solveTiming(bomb.serial, bomb.strikes) };
      }
    };
  }

  function createCoordinatesModule() {
    return {
      type: 'coordinates',
      solved: false,
      data: { x: '', y: '' },
      getSolution(bomb) {
        return solveCoordinates(bomb.serial, bomb.strikes);
      }
    };
  }

  function createBatteryModule() {
    return {
      type: 'battery',
      solved: false,
      data: { currentLevel: randInt(1, 4), selectedLevel: null },
      getSolution(bomb) {
        return { targetLevel: solveBattery(bomb.batteryLevel, bomb.serial) };
      }
    };
  }

  function createPortsModule() {
    const portTypes = ['DVI', 'Parallel', 'PS/2', 'RJ-45', 'Stereo RCA', 'USB'];
    return {
      type: 'ports',
      solved: false,
      data: { currentPort: pick(portTypes), portCount: randInt(1, 6), selectedPort: null },
      getSolution(bomb) {
        return { targetPort: solvePorts(bomb.portType, bomb.portCount, bomb.serial) };
      }
    };
  }

  function createCompassModule() {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return {
      type: 'compass',
      solved: false,
      data: { currentDirection: pick(directions), selectedDirection: null },
      getSolution(bomb) {
        return { targetDirection: solveCompass(bomb.serial, bomb.strikes) };
      }
    };
  }

  function createSlotsModule() {
    return {
      type: 'slots',
      solved: false,
      data: { selectedSlot: null },
      getSolution(bomb) {
        return { targetSlot: solveSlots(bomb.batteryLevel, bomb.portCount, bomb.serial) };
      }
    };
  }

  function createWindowsModule() {
    const colors = ['rojo', 'azul', 'verde', 'amarillo'];
    return {
      type: 'windows',
      solved: false,
      data: { currentColor: pick(colors), selectedColor: null },
      getSolution(bomb) {
        return { targetColor: solveWindows(bomb.indicatorColor, bomb.plateColor, bomb.serial) };
      }
    };
  }

  function createWhoAmIModule() {
    const types = ['Cables', 'Botones', 'Teclado', 'Simon', 'Laberinto'];
    return {
      type: 'whoami',
      solved: false,
      data: { currentType: pick(types), selectedType: null },
      getSolution(bomb) {
        return { targetType: solveWhoAmI(bomb.modules.length, bomb.batteryHolders, bomb.parallelPort, bomb.serial) };
      }
    };
  }

  function createSecurityModule() {
    return {
      type: 'security',
      solved: false,
      data: { inputCode: '', selectedCode: null },
      getSolution(bomb) {
        return { targetCode: solveSecurity(bomb.indicatorColor, bomb.plateColor, bomb.batteryHolders, bomb.parallelPort, bomb.serial) };
      }
    };
  }

  function createComplexWiresModule(difficulty) {
    const count = randInt(3, difficulty >= 4 ? 6 : 5);
    const wires = [];
    for (let i = 0; i < count; i++) wires.push(pick(WIRE_COLORS));
    return {
      type: 'complexwires',
      solved: false,
      data: { wires, cutIndex: null },
      getSolution(bomb) {
        return { wireIndex: solveComplexWires(wires, bomb.indicatorColor, bomb.batteryHolders, bomb.serial) };
      }
    };
  }

  const MODULE_FACTORIES = {
    wires: createWiresModule,
    buttons: createButtonsModule,
    symbols: createSymbolsModule,
    memory: createMemoryModule,
    screen: createScreenModule,
    frequency: createFrequencyModule,
    colors: createColorsModule,
    pattern: createPatternModule,
    switches: createSwitchesModule,
    code: createCodeModule,
    keypad: createKeypadModule,
    morse: createMorseModule,
    password: createPasswordModule,
    simon: createSimonModule,
    knobs: createKnobsModule,
    maze: createMazeModule,
    timer: createTimerModule,
    sequence: createSequenceModule,
    binary: createBinaryModule,
    math: createMathModule,
    word: createWordModule,
    reaction: createReactionModule,
    matching: createMatchingModule,
    cipher: createCipherModule,
    timing: createTimingModule,
    coordinates: createCoordinatesModule,
    battery: createBatteryModule,
    ports: createPortsModule,
    compass: createCompassModule,
    slots: createSlotsModule
  };

  function buildManualHTML() {
    return `
      <div class="bd-manual-intro">
        <p class="bd-manual-callsign">📻 <strong>CANAL SEGURO ABIERTO · UNIDAD EOD-7</strong></p>
        <p><em>«Aquí Central. Lo que tienes delante es el <strong>Manual de Desactivación Clasificado vS-7</strong>, redactado por ingenieros muertos y revisado por nadie. No es una receta: es un mapa cifrado. Cada protocolo está escrito en jerga de campo y solo se entiende si pides al Operador los datos correctos. Si lees rápido, alguien muere.»</em></p>
        <p class="bd-manual-warn">⚠️ <strong>Vocabulario operativo:</strong> «el código» = serie alfanumérica del lateral · «la luz» = indicador activo/inactivo · «las marcas» = strikes acumulados · «cifras del código» = solo los dígitos · «letras del código» = solo las letras · «vocales» = A, E, I, O, U. Sin estos datos no se dicta nada.</p>
      </div>

      <h3 id="man-wires">📕 Protocolo W · Desarmado de cableado</h3>
      <p class="bd-manual-flavor"><em>«Que te recite los cables uno a uno, de arriba abajo, por color. Cuéntalos tú también: nunca te fíes de la primera lectura.»</em></p>
      <ul>
        <li><strong>Si son tres hilos:</strong> cuando la sangre no aparece, el sacrificio es el del medio; si hay un solitario azul, ese es el elegido; en cualquier otro caso, el último siempre cae.</li>
        <li><strong>Si son cuatro:</strong> ante una mayoría carmesí (dos o más), elimina al último de los carmesí; si la cola es dorada y no hay sangre, abre por el principio; un único azul también pide el primero; si nada anterior aplica, cae el segundo.</li>
        <li><strong>Si son cinco:</strong> con la cola en luto, el cuarto es el camino; con un solo carmesí acompañado de dos o más dorados, el primero basta; sin luto en ningún hilo, el segundo; en lo demás, el primero.</li>
        <li><strong>Si son seis:</strong> ausencia total de dorado y código terminado en cifra par → el tercero; un solo dorado con dos o más níveos → el cuarto; ausencia de carmesí → el segundo; cuando dudes, el primero nunca falla.</li>
      </ul>

      <h3 id="man-buttons">📗 Protocolo B · Pulsadores armados</h3>
      <p class="bd-manual-flavor"><em>«Pídele color y verbo grabado. Aplica las cláusulas en este orden y detente en la primera que case: si ninguna casa, el último renglón es ley.»</em></p>
      <ul>
        <li>El botón del cielo que pide rendirse → no lo sueltes hasta que el reloj enseñe la cifra de la unidad en sus segundos.</li>
        <li>Lo níveo despierta solo cuando hay vigilia: si la luz vela, toca y aparta la mano sin demora.</li>
        <li>Lo dorado nunca tiene prisa: aguarda con él hasta que la franja de estado cante.</li>
        <li>El rojo que ordena estallar exige el gesto opuesto: caricia breve y suelta.</li>
        <li>El mismo rojo, cuando ya hemos errado al menos una vez, te pide paciencia hasta que la franja se ilumine.</li>
        <li>Lo níveo sin más adornos: caricia breve.</li>
        <li>El azul, si el código abre sin vocal, también pide caricia breve.</li>
        <li>Cualquier escenario que escape de lo anterior se resuelve esperando a la franja.</li>
      </ul>

      <h3 id="man-symbols">📒 Protocolo Σ · Glifos cirílicos</h3>
      <p class="bd-manual-flavor"><em>«Que te dicte los cuatro grabados sin interpretarlos. Identifica la pareja de testigos y la página correcta se revela por sí sola.»</em></p>
      <ul>
        <li>Cuatro toques, uno tras otro, sin volver atrás.</li>
        <li>Página I — pareja <em>estrella</em> y <em>copyright</em>: empieza por el círculo de marca, después la estrella, luego el signo de duda y cierra con la onda griega.</li>
        <li>Página II — pareja <em>onda</em> e <em>interrogante</em>: onda primero, duda después, estrella en tercer lugar y la koppa al final.</li>
        <li>Página III — pareja <em>calderón</em> y <em>koppa</em>: koppa, calderón, estrella y onda griega.</li>
        <li>Página IV — pareja <em>omega</em> e <em>interrogante invertido</em>: omega, invertido, duda y, para cerrar, la estrella.</li>
      </ul>

      <h3 id="man-memory">📘 Protocolo M · Secuencia de memoria volátil</h3>
      <p class="bd-manual-flavor"><em>«Anota cada etapa antes de actuar. La memoria del módulo es volátil; la tuya, también. "Posición" = el sitio físico; "etiqueta" = el número impreso. No los confundas o se acabó.»</em></p>
      <ul>
        <li>Cinco etapas. La pantalla canta del uno al cuatro; los botones llevan etiquetas del cero al tres.</li>
        <li><strong>Etapa primera —</strong> si la pantalla dice "uno", el segundo desde la izquierda; si dice "cuatro", el cuarto; en cualquier otro caso, el primero.</li>
        <li><strong>Etapa segunda —</strong> con "uno", busca el botón cuya etiqueta sea un uno; con "cuatro", pulsa el primero por posición; con "dos", repite la misma posición que usaste en la primera etapa; ante el resto, el segundo por posición.</li>
        <li><strong>Etapa tercera —</strong> con "tres", el botón etiquetado con tres; con "uno", el botón etiquetado con uno; con cualquier otra cifra, el tercero por posición.</li>
        <li><strong>Etapa cuarta —</strong> con "cuatro", repite la posición de la primera etapa; con "dos", el primero por posición; el resto, repite la posición de la segunda etapa.</li>
        <li><strong>Etapa quinta y final —</strong> con "uno", el primero por posición; con "dos", repite la segunda etapa; con "cuatro", repite la primera; con cualquier otra cifra, repite la tercera.</li>
      </ul>

      <h3 id="man-screen">📕 Protocolo P · Pantalla parlante</h3>
      <p class="bd-manual-flavor"><em>«La pantalla afirma una cosa; tu respuesta es otra. Decide según lo que ella muestre y lo que el campo te diga.»</em></p>
      <ul>
        <li>Si afirma → responde afirmando solo cuando el historial está limpio; en caso contrario, niega.</li>
        <li>Si niega → responde afirmando solo cuando el código abre con vocal; en caso contrario, niega también.</li>
        <li>Si apunta al cielo → la respuesta mira al suelo.</li>
        <li>Si apunta al suelo → al cielo, pero solo cuando la última cifra del código es par; si no, gira a la mano siniestra.</li>
        <li>Si apunta a la siniestra → responde con la diestra.</li>
        <li>Si apunta a la diestra → cuando hay marcas previas, pide espera; cuando no las hay, declara listo.</li>
        <li>Casos espejados: la duda pura se responde afirmando; los cuatro ochos exigen espera; doce-treinta-y-cuatro pide siniestra o diestra según si la última cifra es cinco o menor; los cuatro nueves siempre hacia el suelo.</li>
      </ul>

      <h3 id="man-frequency">📗 Protocolo F · Sintonía de detonador</h3>
      <p class="bd-manual-flavor"><em>«Te dicta dos llamadas OTAN. La rueda fonética las traduce a números desde Alfa (cero) y los suma, descartando vueltas completas de seis.»</em></p>
      <ul>
        <li>El detonador se afina solo en una de seis bandas cíclicas; la posición de la banda es el resto de esa suma.</li>
        <li>Cada banda abre dos frecuencias permitidas: la inferior y la superior. Cualquier otra es muerte.</li>
        <li>Catálogo de bandas (banda → par MHz permitido): 0 → 3.55 ó 3.70 · 1 → 3.70 ó 3.85 · 2 → 3.85 ó 4.00 · 3 → 4.00 ó 4.15 · 4 → 4.15 ó 4.30 · 5 → 4.30 ó 3.55.</li>
        <li>Si lees el manual al revés, el ciclo se cierra: la última banda devuelve a la primera frecuencia.</li>
      </ul>

      <h3 id="man-colors">📒 Protocolo C · Cromática Hostil</h3>
      <p class="bd-manual-flavor"><em>«Cuatro toques. Suma las cifras del código y descarta vueltas de cuatro: ese resto te dice por dónde empezar a leer la rueda cromática.»</em></p>
      <ul>
        <li>Rueda base, leída en sentido horario: sangre, cielo, bosque, oro.</li>
        <li>Si el resto es 0 → arranca por sangre y sigue la rueda; 1 → arranca por cielo; 2 → por bosque; 3 → por oro. La secuencia tiene siempre cuatro toques.</li>
        <li>Cada marca acumulada en el campo desplaza el punto de partida una posición más en el mismo sentido.</li>
        <li>Si la luz está viva, el primer toque de la secuencia se omite y se entrega solo desde el segundo en adelante.</li>
      </ul>

      <h3 id="man-pattern">📘 Protocolo Π · Patrón fantasma</h3>
      <p class="bd-manual-flavor"><em>«Lo que brilla no es lo que se pulsa. Pregunta cuántas celdas relucen y olvida sus posiciones: las verdaderas están aquí escritas.»</em></p>
      <ul>
        <li>Cuadrícula de cinco por cinco.</li>
        <li>Si el módulo enciende cuatro luces, los cuatro extremos del cuadrado son la respuesta.</li>
        <li>Si enciende cinco, el patrón forma una cruz que parte del corazón de la cuadrícula.</li>
        <li>Si enciende seis, decide la inicial del código: consonante → eje horizontal central; vocal → eje vertical central.</li>
        <li>Cualquier marca previa en el historial obliga a leer el patrón como en un espejo, intercambiando lo de la siniestra con lo de la diestra.</li>
        <li>Confirma solo cuando hayas marcado el patrón completo y nada más.</li>
      </ul>

      <h3 id="man-switches">📕 Protocolo S · Interruptores tácticos</h3>
      <p class="bd-manual-flavor"><em>«Tres palancas, tres condiciones. Cada palanca solo despierta si su condición se cumple. Confirma cuando las tres estén dictadas.»</em></p>
      <ul>
        <li>La primera palanca despierta cuando el último carácter del código es una cifra par; en otro caso, descansa.</li>
        <li>La segunda obedece a la luz: si la luz está viva, despierta; si está muerta, descansa.</li>
        <li>La tercera responde a la suma de marcas más la suma de cifras del código: despierta si esa suma es impar; descansa si es par.</li>
      </ul>

      <h3 id="man-code">📗 Protocolo K · Código de anulación</h3>
      <p class="bd-manual-flavor"><em>«El número de anulación se cosecha del propio código. Calcula tú; el Operador solo teclea cuatro cifras cuando se las dictes enteras.»</em></p>
      <ul>
        <li>Toma las cifras del código y súmalas; toma las vocales de las letras del código y cuéntalas.</li>
        <li>Multiplica esa suma de cifras por siete; multiplica la cuenta de vocales por trece; suma ambos productos.</li>
        <li>Del resultado, guarda únicamente sus cuatro últimas cifras (descarta cualquier vuelta completa de diez mil).</li>
        <li>Si lo obtenido no llega a cuatro cifras, antepón ceros hasta completarlas.</li>
      </ul>

      <h3 id="man-keypad">📒 Protocolo T · Teclado rúnico</h3>
      <p class="bd-manual-flavor"><em>«El teclado nunca cambia: tres filas de tres glifos. Lo que cambia es por dónde se entra y en qué orden.»</em></p>
      <ul>
        <li>Distribución fija — fila superior: onda griega, psi, omega · fila central: koppa, estrella, signo de duda invertido · fila inferior: calderón, corazón, beta.</li>
        <li>Si la primera letra del código pertenece a la primera mitad del abecedario, recorre la fila superior de la siniestra a la diestra.</li>
        <li>Si pertenece a la segunda mitad, recorre la columna de la diestra de arriba abajo.</li>
        <li>Si la luz está viva, el calderón se adelanta al recorrido y se pulsa antes que el resto.</li>
        <li>Si ya existe alguna marca previa en el campo, el recorrido entero se ejecuta del último al primero.</li>
      </ul>

      <h3 id="man-morse">📘 Protocolo · — · · Morse Bravo</h3>
      <p class="bd-manual-flavor"><em>«El Operador canta el patrón en pulsos cortos y largos. Tú traduces de cabeza. Aquí solo tienes la cartilla parcial: lo demás, memoria de academia.»</em></p>
      <ul>
        <li>Cartilla parcial (corto = punto, largo = raya): E · · T − · A · − · I · · · S · · · · N − · · O − − − · M − − · R · − · · L · − · ·</li>
        <li>Letras compuestas: C · − · − · D − · · · F · · − · · G − − · · H · · · · · J · − − − · K − · − · P · − − · · Q − − · −</li>
        <li>Si tu cartilla no contiene la letra, descártala en las opciones por exclusión: las que sí están deben coincidir exactamente con lo cantado.</li>
      </ul>

      <h3 id="man-password">📕 Protocolo Ψ · Contraseña OTAN</h3>
      <p class="bd-manual-flavor"><em>«La candidata correcta está siempre dentro de las cuatro que ve el Operador. La eliges contando.»</em></p>
      <ul>
        <li>Suma las cifras del código y añade el número de vocales que contiene su parte alfabética.</li>
        <li>De esa suma, descarta cualquier vuelta completa de ocho; el resto te da la posición exacta dentro del léxico fonético OTAN.</li>
        <li>Léxico fonético en orden (posición 0 a 7): Alfa, Bravo, Charlie, Delta, Echo, Foxtrot, Golf, Hotel.</li>
        <li>Si la palabra deducida no está entre las cuatro candidatas, has contado mal o el Operador te ha leído mal el código: vuelve a empezar, no improvises.</li>
      </ul>

      <h3 id="man-simon">📗 Protocolo Σi · Eco lumínico</h3>
      <p class="bd-manual-flavor"><em>«El módulo canta colores; tú no los repites tal cual. Aplica las transformaciones sobre la rueda base antes de dictar nada.»</em></p>
      <ul>
        <li>Rueda base, en orden: sangre, cielo, bosque, oro.</li>
        <li>Si hay alguna marca previa en el campo, la rueda entera se lee invertida.</li>
        <li>Si la primera letra del código es vocal, los dos primeros colores intercambian su sitio entre sí, y también lo hacen los dos últimos entre sí.</li>
        <li>Si la última cifra del código es par, la rueda gira dos posiciones: lo que estaba en tercer y cuarto lugar pasa al frente.</li>
        <li>Las transformaciones se aplican en este orden y se acumulan. Solo entonces se traduce cada flash con la rueda resultante.</li>
      </ul>

      <h3 id="man-knobs">📒 Protocolo Δ · Perillas balísticas</h3>
      <p class="bd-manual-flavor"><em>«Tres ruedas, cuatro posiciones cada una. Calcula la orientación de cada rueda por separado antes de pedir el primer giro.»</em></p>
      <ul>
        <li>Ciclo de posiciones, siempre en este orden: siniestra, arriba, diestra, abajo.</li>
        <li>Para cada rueda, parte de la suma de cifras del código. A esa suma añádele el número de orden de la rueda (la primera suma uno, la segunda dos, la tercera tres) y, después, el número de marcas acumuladas.</li>
        <li>Descarta vueltas completas de cuatro; el resto indica cuántos pasos avanzar dentro del ciclo desde la siniestra.</li>
        <li>Si la luz está viva, la rueda central recibe dos pasos extra sobre lo calculado.</li>
      </ul>

      <h3 id="man-maze">📘 Protocolo L · Cartografía del laberinto</h3>
      <p class="bd-manual-flavor"><em>«El Operador empieza siempre en la esquina superior siniestra (origen 0,0). Tú calculas dónde está la salida y le vas dictando movimientos cardinales.»</em></p>
      <ul>
        <li>El laberinto se inscribe en una cuadrícula de cinco por cinco. Filas y columnas se cuentan desde el cero.</li>
        <li>La fila de la salida es la suma de cifras del código, descartando vueltas completas de cinco.</li>
        <li>La columna de la salida es esa misma suma más el número de marcas, descartando también vueltas completas de cinco.</li>
        <li>Dicta cada movimiento de uno en uno y espera confirmación antes de cantar el siguiente.</li>
      </ul>

      <h3 id="man-timer">📕 Protocolo χ · Cronómetro al filo</h3>
      <p class="bd-manual-flavor"><em>«El módulo avanza un segundo por cada segundo real. Tú calculas el instante exacto en el que el Operador debe golpear STOP.»</em></p>
      <ul>
        <li>El segundo objetivo se halla sumando las cifras del código y el número de marcas acumuladas, descartando vueltas completas de sesenta.</li>
        <li>Solo es válido el instante en que la pantalla muestra exactamente ese segundo: ni el anterior, ni el siguiente.</li>
        <li>Canta una cuenta atrás propia: el ojo del Operador siempre llega tarde al cristal.</li>
      </ul>

      <h3 id="man-sequence">📗 Protocolo N · Secuencia numérica</h3>
      <p class="bd-manual-flavor"><em>«Cinco números visibles. La secuencia correcta no es 1-2-3-4-5: es ese mismo bucle rotado.»</em></p>
      <ul>
        <li>Toma la suma de cifras del código y descarta vueltas completas de cinco. El resto te dice por cuál número del bucle 1→2→3→4→5→1 hay que empezar.</li>
        <li>El bucle se recorre siempre completo: cinco pulsaciones.</li>
        <li>Si existen marcas previas en el campo, la secuencia resultante se dicta del final al principio.</li>
      </ul>

      <h3 id="man-binary">📒 Protocolo 01 · Cifra binaria</h3>
      <p class="bd-manual-flavor"><em>«Cinco bits. Calcula en base diez, traduce a base dos y dicta encendidos y apagados, en ese orden.»</em></p>
      <ul>
        <li>Suma las cifras del código y añade el número de marcas. Descarta vueltas completas de treinta y dos.</li>
        <li>Convierte ese valor a binario y exprésalo con exactamente cinco posiciones, anteponiendo ceros si fuera necesario.</li>
        <li>Lee siempre del bit más significativo al menos significativo cuando dictes al Operador.</li>
      </ul>

      <h3 id="man-math">📘 Protocolo Σ+ · Aritmética bajo fuego</h3>
      <p class="bd-manual-flavor"><em>«Tanto operandos como operación se cosechan del código. Calcula tú mentalmente; el Operador solo escribe la cifra final.»</em></p>
      <ul>
        <li>Primer operando: suma de cifras del código, descartando vueltas completas de diez.</li>
        <li>Segundo operando: esa misma suma más el número de marcas, descartando también vueltas completas de diez.</li>
        <li>El signo se elige por el resto de dividir la suma de cifras del código entre tres: cero → suma, uno → resta, dos → producto.</li>
        <li>Verifica el resultado antes de cantarlo: este módulo no admite signo negativo.</li>
      </ul>

      <h3 id="man-word">📕 Protocolo Ω · Palabra clave</h3>
      <p class="bd-manual-flavor"><em>«Las letras visibles son ruido controlado. La palabra exacta sale del cálculo, no de adivinarla.»</em></p>
      <ul>
        <li>Suma las cifras del código y añade el número de marcas; descarta vueltas completas de ocho. El resto es la posición exacta dentro del léxico EOD.</li>
        <li>Léxico EOD en orden (posición 0 a 7): BOMBA, FUEGO, TIEMPO, CABLE, SECRETO, CODIGO, PULSAR, DETENER.</li>
        <li>Si las letras visibles en el módulo contradicen tu cálculo, confía en el cálculo: la pantalla puede mentir, la posición no.</li>
      </ul>

      <h3 id="man-reaction">📗 Protocolo R · Reflejo controlado</h3>
      <p class="bd-manual-flavor"><em>«Calcula la ventana objetivo antes de que la luz arda. Cuando arda, ya es tarde para pensar.»</em></p>
      <ul>
        <li>Parte de dos segundos enteros como base; añade una décima por cada unidad en la suma de cifras del código y dos décimas por cada marca acumulada.</li>
        <li>El resultado, en milisegundos, es el instante en que el Operador debe presionar tras el encendido de la luz.</li>
        <li>Existe una tolerancia de dos décimas a cada lado del objetivo. Fuera de esa franja, la pulsación se considera fallo.</li>
        <li>La luz tarda en encenderse entre dos y cinco segundos: empieza a contar desde el encendido, no desde el inicio del módulo.</li>
      </ul>

      <h3 id="man-matching">📒 Protocolo ⇆ · Pares espejo</h3>
      <p class="bd-manual-flavor"><em>«Sin manual de pares: este módulo no se calcula, se recuerda. Tu trabajo es ser la memoria del Operador.»</em></p>
      <ul>
        <li>Hay ocho casillas, cuatro parejas exactas. Cada pareja revelada queda fija; las erróneas se ocultan de nuevo.</li>
        <li>Pide siempre coordenadas en formato fila-columna y anótalas a medida que aparezcan; no confíes en tu cabeza bajo presión.</li>
        <li>No reveles dos casillas iguales si ya conoces la pareja correcta de una de ellas en otra posición: estás regalando una marca.</li>
      </ul>

      <h3 id="man-cipher">📘 Protocolo Φ · Cifrado César</h3>
      <p class="bd-manual-flavor"><em>«Cifrado clásico, llave nueva por bomba. Calcula la llave antes de que el Operador te lea la primera letra.»</em></p>
      <ul>
        <li>El desplazamiento que ha aplicado el atacante es la suma de cifras del código más el número de marcas, descartando vueltas completas del abecedario (veintiséis letras).</li>
        <li>Para descifrar, retrocede cada letra del mensaje cifrado tantas posiciones como indique ese desplazamiento.</li>
        <li>Cuando la resta caiga antes de la A, vuelve a entrar por la Z: el abecedario se considera circular.</li>
      </ul>

      <h3 id="man-timing">📕 Protocolo τ · Sincronía dual</h3>
      <p class="bd-manual-flavor"><em>«Dos relojes. El segundo nunca debe coincidir con el primero: debe llevarle exactamente un desfase calculado por ti.»</em></p>
      <ul>
        <li>El desfase entre el segundo y el primero (en segundos) es la suma de cifras del código más el número de marcas, descartando vueltas completas de diez.</li>
        <li>Dicta al Operador cuántos pasos hacia adelante o hacia atrás necesita: nunca le dejes adivinar el cálculo.</li>
        <li>Confirma solo cuando la diferencia leída en pantalla coincida con tu desfase, ni un segundo de más.</li>
      </ul>

      <h3 id="man-coordinates">📗 Protocolo XY · Coordenadas tácticas</h3>
      <p class="bd-manual-flavor"><em>«Dos cifras entre cero y nueve. Calcula primero, dicta después, confirma con OK. Última página del manual: cierra el canal cuando termines.»</em></p>
      <ul>
        <li>La coordenada X se obtiene sumando las cifras del código y el número de marcas, descartando vueltas completas de diez.</li>
        <li>La coordenada Y se obtiene sumando las cifras del código y el doble del número de marcas, descartando también vueltas completas de diez.</li>
        <li>Ambas coordenadas deben ser válidas (0–9) por construcción: si te sale otra cosa, has contado mal.</li>
      </ul>

      <h3 id="man-battery">📕 Protocolo 🔋 · Nivel de batería</h3>
      <p class="bd-manual-flavor"><em>«El módulo muestra un nivel actual. Tu trabajo es calcular cuál debería ser según el código.»</em></p>
      <ul>
        <li>Suma las cifras del código y descarta vueltas completas de cuatro.</li>
        <li>El resultado más uno es el nivel objetivo (rango 1-4).</li>
        <li>El Operador debe seleccionar el nivel calculado en el módulo.</li>
      </ul>

      <h3 id="man-ports">📗 Protocolo ⚓ · Identificación de puertos</h3>
      <p class="bd-manual-flavor"><em>«El módulo muestra un tipo de puerto y un conteo. Calcula cuál es el puerto correcto.»</em></p>
      <ul>
        <li>Suma las cifras del código y descarta vueltas completas de seis.</li>
        <li>El resultado indica el índice del puerto correcto en la lista: 0=DVI, 1=Parallel, 2=PS/2, 3=RJ-45, 4=Stereo RCA, 5=USB.</li>
        <li>El Operador debe pulsar el puerto calculado.</li>
      </ul>

      <h3 id="man-compass">📘 Protocolo 🧭 · Orientación cardinal</h3>
      <p class="bd-manual-flavor"><em>«La brújula apunta en una dirección. Calcula cuál es la dirección correcta según el código y las marcas.»</em></p>
      <ul>
        <li>Suma las cifras del código y añade el número de marcas.</li>
        <li>Descarta vueltas completas de ocho.</li>
        <li>El resultado indica la dirección: 0=N, 1=NE, 2=E, 3=SE, 4=S, 5=SW, 6=W, 7=NW.</li>
        <li>El Operador debe seleccionar la dirección calculada.</li>
      </ul>

      <h3 id="man-slots">📕 Protocolo ☰ · Ranuras de seguridad</h3>
      <p class="bd-manual-flavor"><em>«Cinco ranuras numeradas. Solo una es segura según el nivel de batería, los puertos y el código.»</em></p>
      <ul>
        <li>Suma las cifras del código, añade el nivel de batería y el número de puertos.</li>
        <li>Descarta vueltas completas de cinco.</li>
        <li>El resultado es la ranura segura (0-4).</li>
        <li>El Operador debe pulsar la ranura calculada.</li>
      </ul>

      <div class="bd-manual-outro">
        <p><em>📻 «Central a EOD-7: el manual es deliberadamente espeso. Si lo entiendes a la primera, no estabas leyendo de verdad. Vuelve a leerlo bajo el cronómetro. Cambio y corto.»</em></p>
      </div>
    `;
  }

  function init(ui) {
    const {
      setupPhase, gamePhase, start, restart,
      timeLimit, moduleCount, maxStrikes, difficulty, animSpeed, allowDup,
      modTypeChips, roleOperator, roleExpert,
      operatorPanel, expertPanel, bombGrid, manualContent, manualNav,
      timerEl, timerBar, strikesEl, modulesEl, serialEl, indicatorEl,
      info, result
    } = ui;

    if (!start) return;

    manualContent.innerHTML = buildManualHTML();

    manualNav.querySelectorAll('.bd-manual-link').forEach(link => {
      link.addEventListener('click', () => {
        const target = manualContent.querySelector(link.dataset.target);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    let state = {
      playing: false,
      serial: '',
      timeLeft: 300,
      totalTime: 300,
      strikes: 0,
      maxStrikes: 3,
      indicatorLit: false,
      modules: [],
      animMs: 400,
      role: 'operator',
      buttonLight: false,
      batteryLevel: 0,
      portType: '',
      portCount: 0,
      indicatorColor: '',
      plateColor: '',
      batteryHolders: 0,
      parallelPort: false
    };
    activeState = state;

    function getConfig() {
      const types = [];
      modTypeChips.forEach(chip => {
        const input = chip.querySelector('input');
        if (input && input.checked) types.push(input.value);
      });
      const volumeInput = document.querySelector('[data-ui="volume"]');
      if (volumeInput) {
        setVolume(parseInt(volumeInput.value, 10) / 100);
      }
      return {
        totalTime: parseInt(timeLimit.value, 10) || 300,
        moduleCount: parseInt(moduleCount.value, 10) || 4,
        maxStrikes: parseInt(maxStrikes.value, 10),
        difficulty: parseInt(difficulty.value, 10) || 3,
        animMs: parseInt(animSpeed.value, 10) || 400,
        allowDup: allowDup.checked,
        types: types.length ? types : Object.keys(MODULE_FACTORIES)
      };
    }

    function setPhase(phase) {
      setupPhase.classList.toggle('bd-phase--active', phase === 'setup');
      gamePhase.classList.toggle('bd-phase--active', phase === 'game');
    }

    function setRole(role) {
      state.role = role;
      roleOperator.classList.toggle('bd-role-btn--active', role === 'operator');
      roleExpert.classList.toggle('bd-role-btn--active', role === 'expert');
      operatorPanel.classList.toggle('bd-panel--visible', role === 'operator');
      expertPanel.classList.toggle('bd-panel--visible', role === 'expert');
    }

    function updateHud() {
      const mins = Math.floor(state.timeLeft / 60);
      const secs = state.timeLeft % 60;
      timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      const pct = (state.timeLeft / state.totalTime) * 100;
      timerBar.style.width = pct + '%';
      timerBar.style.background = pct > 40 ? 'var(--accent)' : pct > 15 ? '#f97316' : '#ef4444';
      strikesEl.textContent = state.maxStrikes > 0
        ? `${state.strikes} / ${state.maxStrikes}`
        : `${state.strikes} (∞)`;
      modulesEl.textContent = state.modules.filter(m => !m.solved).length;
      serialEl.textContent = state.serial;
      indicatorEl.querySelector('.bd-indicator-dot').classList.toggle(
        'bd-indicator-dot--lit', state.indicatorLit
      );
    }

    function setInfo(msg, type) {
      info.textContent = msg;
      info.className = 'bd-info' + (type ? ` bd-info--${type}` : '');
    }

    function generateBomb(cfg) {
      const pool = cfg.types.slice();
      const modules = [];
      const used = new Set();

      for (let i = 0; i < cfg.moduleCount; i++) {
        let type;
        if (cfg.allowDup) {
          type = pick(pool);
        } else {
          const available = pool.filter(t => !used.has(t));
          type = available.length ? pick(available) : pick(pool);
          used.add(type);
        }
        const factory = MODULE_FACTORIES[type];
        if (factory) modules.push(factory(cfg.difficulty));
      }
      return modules;
    }

    function onModuleStrike(modEl) {
      playSound('strike');
      if (state.maxStrikes > 0) {
        state.strikes += 1;
        if (modEl) {
          modEl.classList.add('bd-module--strike', 'bd-module--error');
          setTimeout(() => modEl.classList.remove('bd-module--strike', 'bd-module--error'), 500);
        }
        updateHud();
        setInfo(`¡Strike! Error en módulo ${MODULE_NAMES[state.modules.find(m => !m.solved)?.type] || ''}.`, 'fail');
        if (state.strikes >= state.maxStrikes) endGame(false);
      } else {
        setInfo('Error en módulo — sin límite de strikes activo.', 'fail');
      }
    }

    function onModuleSolved(mod, modEl) {
      playSound('success');
      mod.solved = true;
      if (modEl) {
        modEl.classList.add('bd-module--success');
        setTimeout(() => modEl.classList.remove('bd-module--success'), 500);
      }
      updateHud();
      const left = state.modules.filter(m => !m.solved).length;
      setInfo(`Módulo ${MODULE_NAMES[mod.type]} desactivado. Quedan ${left}.`, 'ok');
      if (left === 0) endGame(true);
    }

    function renderModules() {
      bombGrid.innerHTML = '';
      state.modules.forEach((mod, idx) => {
        const el = document.createElement('div');
        el.className = 'bd-module' + (mod.solved ? ' bd-module--solved' : '');
        el.innerHTML = `<div class="bd-module-tag">${MODULE_NAMES[mod.type]}</div><div class="bd-module-body"></div>`;
        const body = el.querySelector('.bd-module-body');
        if (!mod.solved) renderModuleBody(mod, body, el, idx);
        else body.innerHTML = '<span style="color:#86efac;font-size:0.8rem">✓ DESACTIVADO</span>';
        bombGrid.appendChild(el);
      });
    }

    function renderModuleBody(mod, body, modEl, modIdx) {
      if (mod.type === 'wires') renderWires(mod, body, modEl);
      else if (mod.type === 'buttons') renderButtons(mod, body, modEl);
      else if (mod.type === 'symbols') renderSymbols(mod, body, modEl);
      else if (mod.type === 'memory') renderMemory(mod, body, modEl);
      else if (mod.type === 'screen') renderScreen(mod, body, modEl);
      else if (mod.type === 'frequency') renderFrequency(mod, body, modEl);
      else if (mod.type === 'colors') renderColors(mod, body, modEl);
      else if (mod.type === 'pattern') renderPattern(mod, body, modEl);
      else if (mod.type === 'switches') renderSwitches(mod, body, modEl);
      else if (mod.type === 'code') renderCode(mod, body, modEl);
      else if (mod.type === 'keypad') renderKeypad(mod, body, modEl);
      else if (mod.type === 'morse') renderMorse(mod, body, modEl);
      else if (mod.type === 'password') renderPassword(mod, body, modEl);
      else if (mod.type === 'simon') renderSimon(mod, body, modEl);
      else if (mod.type === 'knobs') renderKnobs(mod, body, modEl);
      else if (mod.type === 'maze') renderMaze(mod, body, modEl);
      else if (mod.type === 'timer') renderTimer(mod, body, modEl);
      else if (mod.type === 'sequence') renderSequence(mod, body, modEl);
      else if (mod.type === 'binary') renderBinary(mod, body, modEl);
      else if (mod.type === 'math') renderMath(mod, body, modEl);
      else if (mod.type === 'word') renderWord(mod, body, modEl);
      else if (mod.type === 'reaction') renderReaction(mod, body, modEl);
      else if (mod.type === 'matching') renderMatching(mod, body, modEl);
      else if (mod.type === 'cipher') renderCipher(mod, body, modEl);
      else if (mod.type === 'timing') renderTiming(mod, body, modEl);
      else if (mod.type === 'coordinates') renderCoordinates(mod, body, modEl);
      else if (mod.type === 'battery') renderBattery(mod, body, modEl);
      else if (mod.type === 'ports') renderPorts(mod, body, modEl);
      else if (mod.type === 'compass') renderCompass(mod, body, modEl);
      else if (mod.type === 'slots') renderSlots(mod, body, modEl);
    }

    function renderWires(mod, body, modEl) {
      const wrap = document.createElement('div');
      wrap.className = 'bd-wires';
      mod.data.wires.forEach((color, i) => {
        const w = document.createElement('div');
        w.className = `bd-wire bd-wire--${color}`;
        if (mod.data.cutIndex === i) w.classList.add('bd-wire--cut');
        w.title = `Cable ${i + 1}`;
        w.addEventListener('click', () => {
          if (mod.solved || mod.data.cutIndex !== null) return;
          const sol = mod.getSolution(state).wireIndex;
          mod.data.cutIndex = i;
          if (i === sol) onModuleSolved(mod, modEl);
          else onModuleStrike(modEl);
          renderModules();
        });
        wrap.appendChild(w);
      });
      body.appendChild(wrap);
    }

    function renderButtons(mod, body, modEl) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `bd-big-btn bd-big-btn--${mod.data.color}`;
      btn.textContent = mod.data.label.slice(0, 6);

      const label = document.createElement('div');
      label.className = 'bd-btn-label';
      label.textContent = mod.data.label;

      const light = document.createElement('div');
      light.className = 'bd-indicator';
      light.innerHTML = '<span class="bd-indicator-dot"></span> Luz estado';
      const lightDot = light.querySelector('.bd-indicator-dot');

      let holdTimer = null;
      let holdStart = 0;

      function finishButton(success) {
        if (mod.solved) return;
        mod.data.pressed = true;
        if (success) onModuleSolved(mod, modEl);
        else onModuleStrike(modEl);
        renderModules();
      }

      btn.addEventListener('mousedown', () => {
        if (mod.solved) return;
        mod.data.holding = true;
        holdStart = Date.now();
        state.buttonLight = false;
        lightDot.classList.remove('bd-indicator-dot--lit');

        const sol = mod.getSolution(state);
        if (sol.action === 'hold') {
          holdTimer = setTimeout(() => {
            state.buttonLight = true;
            lightDot.classList.add('bd-indicator-dot--lit');
          }, state.animMs * 2);
        }
      });

      btn.addEventListener('mouseup', () => {
        if (mod.solved || !mod.data.holding) return;
        mod.data.holding = false;
        clearTimeout(holdTimer);

        const sol = mod.getSolution(state);
        const elapsed = Date.now() - holdStart;
        const secs = state.timeLeft % 60;
        let success = false;

        if (sol.action === 'tap') {
          success = elapsed < 250;
        } else if (sol.releaseOnSecondDigit === 1) {
          success = Math.floor(secs / 10) === 1 || secs % 10 === 1;
        } else if (sol.releaseOnLight) {
          success = state.buttonLight;
        } else {
          success = elapsed > 300;
        }

        finishButton(success);
      });

      btn.addEventListener('mouseleave', () => {
        if (mod.data.holding) {
          mod.data.holding = false;
          clearTimeout(holdTimer);
        }
      });

      body.appendChild(btn);
      body.appendChild(label);
      body.appendChild(light);
    }

    function renderSymbols(mod, body, modEl) {
      const grid = document.createElement('div');
      grid.className = 'bd-symbols-grid';
      mod.data.symbols.forEach(sym => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-symbol-btn';
        b.textContent = sym;
        b.addEventListener('click', () => {
          if (mod.solved) return;
          const expected = mod.data.order[mod.data.step];
          if (sym === expected) {
            mod.data.step += 1;
            if (mod.data.step >= mod.data.order.length) onModuleSolved(mod, modEl);
            else setInfo(`Símbolos: ${mod.data.step}/${mod.data.order.length}`, 'ok');
          } else {
            mod.data.step = 0;
            onModuleStrike(modEl);
          }
          renderModules();
        });
        grid.appendChild(b);
      });
      body.appendChild(grid);
    }

    function renderMemory(mod, body, modEl) {
      const disp = document.createElement('div');
      disp.className = 'bd-mem-display';
      disp.textContent = mod.data.display;

      const btns = document.createElement('div');
      btns.className = 'bd-mem-btns';
      mod.data.labels.forEach((lab, pos) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-mem-btn';
        b.textContent = lab;
        b.addEventListener('click', () => {
          if (mod.solved) return;
          const sol = mod.getSolution(state).position;
          if (pos === sol) {
            mod.data.history.push({ position: pos, label: lab });
            if (mod.data.stage >= 5) {
              onModuleSolved(mod, modEl);
            } else {
              mod.data.stage += 1;
              mod.data.display = randInt(1, 4);
              setInfo(`Memoria: etapa ${mod.data.stage}/5`, 'ok');
            }
          } else {
            mod.data.stage = 1;
            mod.data.display = randInt(1, 4);
            mod.data.history = [];
            onModuleStrike(modEl);
          }
          renderModules();
        });
        btns.appendChild(b);
      });

      body.appendChild(disp);
      body.appendChild(btns);
      const hint = document.createElement('div');
      hint.className = 'bd-btn-label';
      hint.textContent = `Etapa ${mod.data.stage}/5`;
      body.appendChild(hint);
    }

    function renderScreen(mod, body, modEl) {
      const disp = document.createElement('div');
      disp.className = 'bd-screen-display';
      disp.textContent = mod.data.msg;

      const opts = document.createElement('div');
      opts.className = 'bd-screen-options';
      SCREEN_OPTS.forEach(opt => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-screen-opt';
        b.textContent = opt;
        b.addEventListener('click', () => {
          if (mod.solved) return;
          const sol = mod.getSolution(state).answer;
          if (opt === sol) onModuleSolved(mod, modEl);
          else onModuleStrike(modEl);
          renderModules();
        });
        opts.appendChild(b);
      });

      body.appendChild(disp);
      body.appendChild(opts);
    }

    function renderFrequency(mod, body, modEl) {
      const labels = document.createElement('div');
      labels.className = 'bd-freq-labels';
      labels.textContent = `${mod.data.labelA} · ${mod.data.labelB}`;

      const dial = document.createElement('div');
      dial.className = 'bd-freq-dial';
      FREQS.forEach(freq => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-freq-opt';
        b.textContent = freq;
        b.addEventListener('click', () => {
          if (mod.solved) return;
          const sol = mod.getSolution(state).freq;
          if (freq === sol) onModuleSolved(mod, modEl);
          else onModuleStrike(modEl);
          renderModules();
        });
        dial.appendChild(b);
      });

      body.appendChild(labels);
      body.appendChild(dial);
    }

    function renderColors(mod, body, modEl) {
      const grid = document.createElement('div');
      grid.className = 'bd-colors-grid';
      mod.data.colors.forEach(color => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-color-btn';
        b.style.background = COLOR_CSS[color];
        b.title = color;
        b.addEventListener('click', () => {
          if (mod.solved) return;
          const expected = mod.getSolution(state).order[mod.data.step];
          if (color === expected) {
            mod.data.step += 1;
            if (mod.data.step >= mod.getSolution(state).order.length) onModuleSolved(mod, modEl);
            else setInfo(`Colores: ${mod.data.step}/${mod.getSolution(state).order.length}`, 'ok');
          } else {
            mod.data.step = 0;
            onModuleStrike(modEl);
          }
          renderModules();
        });
        grid.appendChild(b);
      });
      const hint = document.createElement('div');
      hint.className = 'bd-btn-label';
      hint.textContent = `Secuencia ${mod.data.step}/${mod.getSolution(state).order.length}`;
      body.appendChild(grid);
      body.appendChild(hint);
    }

    function renderPattern(mod, body, modEl) {
      const { size, litCount, decoy, selected } = mod.data;
      const hint = document.createElement('div');
      hint.className = 'bd-btn-label';
      hint.textContent = `${litCount} celdas iluminadas (señuelo)`;

      const grid = document.createElement('div');
      grid.className = 'bd-pattern-grid';
      grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

      for (let i = 0; i < size * size; i++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'bd-pattern-cell';
        if (decoy.includes(i)) cell.classList.add('bd-pattern-cell--decoy');
        if (selected.has(i)) cell.classList.add('bd-pattern-cell--sel');
        cell.addEventListener('click', () => {
          if (mod.solved) return;
          if (selected.has(i)) selected.delete(i);
          else selected.add(i);
          renderModules();
        });
        grid.appendChild(cell);
      }

      const confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.className = 'bd-pattern-confirm';
      confirm.textContent = 'Confirmar';
      confirm.addEventListener('click', () => {
        if (mod.solved) return;
        const sol = new Set(mod.getSolution(state).cells);
        const sel = selected;
        const match = sol.size === sel.size && [...sol].every(c => sel.has(c));
        if (match) onModuleSolved(mod, modEl);
        else {
          selected.clear();
          onModuleStrike(modEl);
        }
        renderModules();
      });

      body.appendChild(hint);
      body.appendChild(grid);
      body.appendChild(confirm);
    }

    function renderSwitches(mod, body, modEl) {
      const wrap = document.createElement('div');
      wrap.className = 'bd-switches-wrap';
      mod.data.states.forEach((on, i) => {
        const row = document.createElement('div');
        row.className = 'bd-switch-row';
        const lbl = document.createElement('span');
        lbl.textContent = `SW${i + 1}`;
        const sw = document.createElement('button');
        sw.type = 'button';
        sw.className = 'bd-switch' + (on ? ' bd-switch--on' : '');
        sw.textContent = on ? 'ON' : 'OFF';
        sw.addEventListener('click', () => {
          if (mod.solved) return;
          mod.data.states[i] = !mod.data.states[i];
          renderModules();
        });
        row.appendChild(lbl);
        row.appendChild(sw);
        wrap.appendChild(row);
      });

      const confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.className = 'bd-pattern-confirm';
      confirm.textContent = 'Confirmar';
      confirm.addEventListener('click', () => {
        if (mod.solved) return;
        const sol = mod.getSolution(state).states;
        const match = sol.every((v, i) => v === mod.data.states[i]);
        if (match) onModuleSolved(mod, modEl);
        else onModuleStrike(modEl);
        renderModules();
      });

      body.appendChild(wrap);
      body.appendChild(confirm);
    }

    function renderCode(mod, body, modEl) {
      const display = document.createElement('div');
      display.className = 'bd-code-display';
      display.textContent = mod.data.input.padEnd(4, '_').split('').join(' ');

      const pad = document.createElement('div');
      pad.className = 'bd-code-pad';
      for (let d = 0; d <= 9; d++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-code-key';
        b.textContent = d;
        b.addEventListener('click', () => {
          if (mod.solved || mod.data.input.length >= 4) return;
          mod.data.input += d;
          renderModules();
        });
        pad.appendChild(b);
      }

      const actions = document.createElement('div');
      actions.className = 'bd-code-actions';
      const clr = document.createElement('button');
      clr.type = 'button';
      clr.className = 'bd-code-key bd-code-key--wide';
      clr.textContent = '⌫';
      clr.addEventListener('click', () => {
        if (mod.solved) return;
        mod.data.input = mod.data.input.slice(0, -1);
        renderModules();
      });
      const ok = document.createElement('button');
      ok.type = 'button';
      ok.className = 'bd-code-key bd-code-key--wide bd-code-key--ok';
      ok.textContent = 'OK';
      ok.addEventListener('click', () => {
        if (mod.solved) return;
        const sol = mod.getSolution(state).code;
        if (mod.data.input === sol) onModuleSolved(mod, modEl);
        else {
          mod.data.input = '';
          onModuleStrike(modEl);
        }
        renderModules();
      });
      actions.appendChild(clr);
      actions.appendChild(ok);

      body.appendChild(display);
      body.appendChild(pad);
      body.appendChild(actions);
    }

    function renderKeypad(mod, body, modEl) {
      const grid = document.createElement('div');
      grid.className = 'bd-keypad-grid';
      mod.data.symbols.forEach(sym => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-symbol-btn';
        b.textContent = sym;
        b.addEventListener('click', () => {
          if (mod.solved) return;
          const order = mod.getSolution(state).order;
          const expected = order[mod.data.step];
          if (sym === expected) {
            mod.data.step += 1;
            if (mod.data.step >= order.length) onModuleSolved(mod, modEl);
            else setInfo(`Teclado: ${mod.data.step}/${order.length}`, 'ok');
          } else {
            mod.data.step = 0;
            onModuleStrike(modEl);
          }
          renderModules();
        });
        grid.appendChild(b);
      });
      const hint = document.createElement('div');
      hint.className = 'bd-btn-label';
      hint.textContent = `Teclas ${mod.data.step}/${mod.getSolution(state).order.length}`;
      body.appendChild(grid);
      body.appendChild(hint);
    }

    function renderMorse(mod, body, modEl) {
      const disp = document.createElement('div');
      disp.className = 'bd-morse-display';
      disp.textContent = mod.data.code;

      const opts = document.createElement('div');
      opts.className = 'bd-morse-opts';
      mod.data.options.forEach(letter => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-screen-opt';
        b.textContent = letter;
        b.addEventListener('click', () => {
          if (mod.solved) return;
          const sol = mod.getSolution(state).letter;
          if (letter === sol) onModuleSolved(mod, modEl);
          else onModuleStrike(modEl);
          renderModules();
        });
        opts.appendChild(b);
      });

      body.appendChild(disp);
      body.appendChild(opts);
    }

    function renderPassword(mod, body, modEl) {
      const clues = document.createElement('div');
      clues.className = 'bd-password-clues';
      clues.textContent = 'Posibles: ' + mod.data.clues.join(', ');

      const display = document.createElement('div');
      display.className = 'bd-code-display';
      display.textContent = mod.data.input.padEnd(6, '_').split('').join(' ');

      const pad = document.createElement('div');
      pad.className = 'bd-code-pad';
      pad.style.gridTemplateColumns = 'repeat(4, 1fr)';
      mod.data.clues.forEach(word => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-code-key bd-code-key--wide';
        b.textContent = word;
        b.addEventListener('click', () => {
          if (mod.solved || mod.data.input.length > 0) return;
          mod.data.input = word;
          renderModules();
        });
        pad.appendChild(b);
      });

      const actions = document.createElement('div');
      actions.className = 'bd-code-actions';
      const clr = document.createElement('button');
      clr.type = 'button';
      clr.className = 'bd-code-key bd-code-key--wide';
      clr.textContent = '⌫';
      clr.addEventListener('click', () => {
        if (mod.solved) return;
        mod.data.input = '';
        renderModules();
      });
      const ok = document.createElement('button');
      ok.type = 'button';
      ok.className = 'bd-code-key bd-code-key--wide bd-code-key--ok';
      ok.textContent = 'OK';
      ok.addEventListener('click', () => {
        if (mod.solved) return;
        const sol = mod.getSolution(state).password;
        if (mod.data.input === sol) onModuleSolved(mod, modEl);
        else {
          mod.data.input = '';
          onModuleStrike(modEl);
        }
        renderModules();
      });
      actions.appendChild(clr);
      actions.appendChild(ok);

      body.appendChild(clues);
      body.appendChild(display);
      body.appendChild(pad);
      body.appendChild(actions);
    }

    function renderSimon(mod, body, modEl) {
      const hint = document.createElement('div');
      hint.className = 'bd-btn-label';
      hint.textContent = `Secuencia: ${mod.data.step + 1}/${mod.data.sequenceLength}`;

      const grid = document.createElement('div');
      grid.className = 'bd-simon-grid';
      SIMON_COLORS.forEach((color, idx) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `bd-simon-btn bd-simon-btn--${color}`;
        b.addEventListener('click', () => {
          if (mod.solved) return;
          const order = mod.getSolution(state).colors;
          const expected = order[mod.data.step];
          if (color === expected) {
            mod.data.step += 1;
            if (mod.data.step >= mod.data.sequenceLength) onModuleSolved(mod, modEl);
            else setInfo(`Simon: ${mod.data.step + 1}/${mod.data.sequenceLength}`, 'ok');
          } else {
            mod.data.step = 0;
            onModuleStrike(modEl);
          }
          renderModules();
        });
        grid.appendChild(b);
      });

      body.appendChild(hint);
      body.appendChild(grid);
    }

    function renderKnobs(mod, body, modEl) {
      const wrap = document.createElement('div');
      wrap.className = 'bd-knobs-wrap';
      mod.data.positions.forEach((pos, i) => {
        const row = document.createElement('div');
        row.className = 'bd-knob-row';
        const lbl = document.createElement('span');
        lbl.className = 'bd-btn-label';
        lbl.textContent = `K${i + 1}`;
        const controls = document.createElement('div');
        controls.className = 'bd-knob-controls';
        
        KNOB_POSITIONS.forEach((position, idx) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'bd-knob-btn' + (pos === idx ? ' bd-knob-btn--active' : '');
          b.textContent = position[0];
          b.addEventListener('click', () => {
            if (mod.solved) return;
            mod.data.positions[i] = idx;
            renderModules();
          });
          controls.appendChild(b);
        });
        
        row.appendChild(lbl);
        row.appendChild(controls);
        wrap.appendChild(row);
      });

      const confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.className = 'bd-pattern-confirm';
      confirm.textContent = 'Confirmar';
      confirm.addEventListener('click', () => {
        if (mod.solved) return;
        const sol = mod.getSolution(state).positions;
        const current = mod.data.positions;
        const match = sol.every((pos, i) => KNOB_POSITIONS[pos] === KNOB_POSITIONS[current[i]]);
        if (match) onModuleSolved(mod, modEl);
        else onModuleStrike(modEl);
        renderModules();
      });

      body.appendChild(wrap);
      body.appendChild(confirm);
    }

    function renderMaze(mod, body, modEl) {
      const hint = document.createElement('div');
      hint.className = 'bd-btn-label';
      hint.textContent = `Pos: (${mod.data.playerRow},${mod.data.playerCol})`;

      const grid = document.createElement('div');
      grid.className = 'bd-maze-grid';
      grid.style.gridTemplateColumns = `repeat(${MAZE_SIZE}, 1fr)`;

      for (let r = 0; r < MAZE_SIZE; r++) {
        for (let c = 0; c < MAZE_SIZE; c++) {
          const cell = document.createElement('div');
          cell.className = 'bd-maze-cell';
          if (r === mod.data.playerRow && c === mod.data.playerCol) {
            cell.classList.add('bd-maze-cell--player');
            cell.textContent = '●';
          }
          grid.appendChild(cell);
        }
      }

      const controls = document.createElement('div');
      controls.className = 'bd-maze-controls';
      const directions = [
        { label: '↑', dr: -1, dc: 0 },
        { label: '↓', dr: 1, dc: 0 },
        { label: '←', dr: 0, dc: -1 },
        { label: '→', dr: 0, dc: 1 }
      ];
      directions.forEach(dir => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-maze-btn';
        b.textContent = dir.label;
        b.addEventListener('click', () => {
          if (mod.solved) return;
          const newRow = mod.data.playerRow + dir.dr;
          const newCol = mod.data.playerCol + dir.dc;
          if (newRow >= 0 && newRow < MAZE_SIZE && newCol >= 0 && newCol < MAZE_SIZE) {
            mod.data.playerRow = newRow;
            mod.data.playerCol = newCol;
            const sol = mod.getSolution(state);
            if (newRow === sol.row && newCol === sol.col) {
              onModuleSolved(mod, modEl);
            }
            renderModules();
          }
        });
        controls.appendChild(b);
      });

      body.appendChild(hint);
      body.appendChild(grid);
      body.appendChild(controls);
    }

    function renderTimer(mod, body, modEl) {
      const display = document.createElement('div');
      display.className = 'bd-timer-display';
      display.textContent = mod.data.stopped ? `: ${mod.data.stopSecond}s` : ': --';

      const stopBtn = document.createElement('button');
      stopBtn.type = 'button';
      stopBtn.className = 'bd-pattern-confirm';
      stopBtn.textContent = 'STOP';
      stopBtn.addEventListener('click', () => {
        if (mod.solved || mod.data.stopped) return;
        const secs = state.timeLeft % 60;
        mod.data.stopped = true;
        mod.data.stopSecond = secs;
        const sol = mod.getSolution(state).targetSecond;
        if (secs === sol) onModuleSolved(mod, modEl);
        else onModuleStrike(modEl);
        renderModules();
      });

      body.appendChild(display);
      body.appendChild(stopBtn);
    }

    function renderSequence(mod, body, modEl) {
      const hint = document.createElement('div');
      hint.className = 'bd-btn-label';
      hint.textContent = `Paso ${mod.data.step + 1}/5`;

      const grid = document.createElement('div');
      grid.className = 'bd-sequence-grid';
      SEQUENCE_NUMBERS.forEach(num => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-sequence-btn';
        b.textContent = num;
        b.addEventListener('click', () => {
          if (mod.solved) return;
          const order = mod.getSolution(state).order;
          const expected = order[mod.data.step];
          if (num === expected) {
            mod.data.step += 1;
            if (mod.data.step >= order.length) onModuleSolved(mod, modEl);
            else setInfo(`Secuencia: ${mod.data.step + 1}/${order.length}`, 'ok');
          } else {
            mod.data.step = 0;
            onModuleStrike(modEl);
          }
          renderModules();
        });
        grid.appendChild(b);
      });

      body.appendChild(hint);
      body.appendChild(grid);
    }

    function renderBinary(mod, body, modEl) {
      const display = document.createElement('div');
      display.className = 'bd-code-display';
      display.textContent = mod.data.input.padEnd(5, '_').split('').join(' ');

      const pad = document.createElement('div');
      pad.className = 'bd-code-pad';
      pad.style.gridTemplateColumns = 'repeat(5, 1fr)';
      for (let i = 0; i < 5; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-code-key';
        b.textContent = i === 0 ? '0' : '1';
        b.addEventListener('click', () => {
          if (mod.solved || mod.data.input.length >= 5) return;
          mod.data.input += b.textContent;
          renderModules();
        });
        pad.appendChild(b);
      }

      const actions = document.createElement('div');
      actions.className = 'bd-code-actions';
      const clr = document.createElement('button');
      clr.type = 'button';
      clr.className = 'bd-code-key bd-code-key--wide';
      clr.textContent = '⌫';
      clr.addEventListener('click', () => {
        if (mod.solved) return;
        mod.data.input = mod.data.input.slice(0, -1);
        renderModules();
      });
      const ok = document.createElement('button');
      ok.type = 'button';
      ok.className = 'bd-code-key bd-code-key--wide bd-code-key--ok';
      ok.textContent = 'OK';
      ok.addEventListener('click', () => {
        if (mod.solved) return;
        const sol = mod.getSolution(state).binary;
        if (mod.data.input === sol) onModuleSolved(mod, modEl);
        else {
          mod.data.input = '';
          onModuleStrike(modEl);
        }
        renderModules();
      });
      actions.appendChild(clr);
      actions.appendChild(ok);

      body.appendChild(display);
      body.appendChild(pad);
      body.appendChild(actions);
    }

    function renderMath(mod, body, modEl) {
      const sol = mod.getSolution(state);
      const equation = document.createElement('div');
      equation.className = 'bd-math-equation';
      equation.textContent = `${sol.a} ${sol.op} ${sol.b} = ?`;

      const display = document.createElement('div');
      display.className = 'bd-code-display';
      display.textContent = mod.data.answer || '_';

      const pad = document.createElement('div');
      pad.className = 'bd-code-pad';
      pad.style.gridTemplateColumns = 'repeat(5, 1fr)';
      for (let d = 0; d <= 9; d++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-code-key';
        b.textContent = d;
        b.addEventListener('click', () => {
          if (mod.solved || mod.data.answer.length >= 3) return;
          mod.data.answer += d;
          renderModules();
        });
        pad.appendChild(b);
      }

      const actions = document.createElement('div');
      actions.className = 'bd-code-actions';
      const clr = document.createElement('button');
      clr.type = 'button';
      clr.className = 'bd-code-key bd-code-key--wide';
      clr.textContent = '⌫';
      clr.addEventListener('click', () => {
        if (mod.solved) return;
        mod.data.answer = mod.data.answer.slice(0, -1);
        renderModules();
      });
      const ok = document.createElement('button');
      ok.type = 'button';
      ok.className = 'bd-code-key bd-code-key--wide bd-code-key--ok';
      ok.textContent = 'OK';
      ok.addEventListener('click', () => {
        if (mod.solved) return;
        if (parseInt(mod.data.answer, 10) === sol.result) onModuleSolved(mod, modEl);
        else {
          mod.data.answer = '';
          onModuleStrike(modEl);
        }
        renderModules();
      });
      actions.appendChild(clr);
      actions.appendChild(ok);

      body.appendChild(equation);
      body.appendChild(display);
      body.appendChild(pad);
      body.appendChild(actions);
    }

    function renderWord(mod, body, modEl) {
      const display = document.createElement('div');
      display.className = 'bd-word-display';
      display.textContent = mod.data.input.padEnd(6, '_').split('').join(' ');

      const letters = document.createElement('div');
      letters.className = 'bd-word-letters';
      const sol = mod.getSolution(state).word;
      const available = shuffle(sol.split(''));
      available.forEach(letter => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-word-btn';
        b.textContent = letter;
        b.addEventListener('click', () => {
          if (mod.solved || mod.data.input.length >= sol.length) return;
          mod.data.input += letter;
          renderModules();
        });
        letters.appendChild(b);
      });

      const actions = document.createElement('div');
      actions.className = 'bd-code-actions';
      const clr = document.createElement('button');
      clr.type = 'button';
      clr.className = 'bd-code-key bd-code-key--wide';
      clr.textContent = '⌫';
      clr.addEventListener('click', () => {
        if (mod.solved) return;
        mod.data.input = mod.data.input.slice(0, -1);
        renderModules();
      });
      const ok = document.createElement('button');
      ok.type = 'button';
      ok.className = 'bd-code-key bd-code-key--wide bd-code-key--ok';
      ok.textContent = 'OK';
      ok.addEventListener('click', () => {
        if (mod.solved) return;
        if (mod.data.input === sol) onModuleSolved(mod, modEl);
        else {
          mod.data.input = '';
          onModuleStrike(modEl);
        }
        renderModules();
      });
      actions.appendChild(clr);
      actions.appendChild(ok);

      body.appendChild(display);
      body.appendChild(letters);
      body.appendChild(actions);
    }

    function renderReaction(mod, body, modEl) {
      const indicator = document.createElement('div');
      indicator.className = 'bd-reaction-indicator' + (mod.data.lit ? ' bd-reaction-indicator--lit' : '');
      indicator.textContent = mod.data.lit ? '¡PULSA!' : 'ESPERA...';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bd-pattern-confirm';
      btn.textContent = 'PULSAR';
      btn.addEventListener('click', () => {
        if (mod.solved || mod.data.pressed) return;
        mod.data.pressed = true;
        if (mod.data.lit) {
          const elapsed = Date.now() - mod.data.litTime;
          const sol = mod.getSolution(state).targetMs;
          if (Math.abs(elapsed - sol) <= 200) onModuleSolved(mod, modEl);
          else onModuleStrike(modEl);
        } else {
          onModuleStrike(modEl);
        }
        renderModules();
      });

      if (!mod.data.lit && !mod.data.pressed) {
        const delay = randInt(2000, 5000);
        setTimeout(() => {
          if (!mod.solved && !mod.data.pressed) {
            mod.data.lit = true;
            mod.data.litTime = Date.now();
            renderModules();
          }
        }, delay);
      }

      body.appendChild(indicator);
      body.appendChild(btn);
    }

    function renderMatching(mod, body, modEl) {
      const grid = document.createElement('div');
      grid.className = 'bd-matching-grid';
      grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
      
      const sol = mod.getSolution(state).pairs;
      const allSymbols = sol.flat();
      const shuffled = shuffle(allSymbols.slice());
      
      shuffled.forEach((sym, idx) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-matching-card' + (mod.data.matched.includes(idx) ? ' bd-matching-card--matched' : '');
        b.textContent = mod.data.matched.includes(idx) || mod.data.selected.includes(idx) ? sym : '?';
        b.addEventListener('click', () => {
          if (mod.solved || mod.data.matched.includes(idx)) return;
          
          if (mod.data.selected.length === 2) {
            mod.data.selected = [];
          }
          
          if (mod.data.selected.includes(idx)) {
            mod.data.selected = mod.data.selected.filter(i => i !== idx);
          } else {
            mod.data.selected.push(idx);
          }
          
          if (mod.data.selected.length === 2) {
            const [i1, i2] = mod.data.selected;
            if (shuffled[i1] === shuffled[i2]) {
              mod.data.matched.push(i1, i2);
              mod.data.selected = [];
              if (mod.data.matched.length === 8) onModuleSolved(mod, modEl);
            }
          }
          renderModules();
        });
        grid.appendChild(b);
      });

      body.appendChild(grid);
    }

    function renderCipher(mod, body, modEl) {
      const sol = mod.getSolution(state);
      const cipher = document.createElement('div');
      cipher.className = 'bd-cipher-text';
      cipher.textContent = `Cifrado: ${sol.encoded}`;
      
      const shiftInfo = document.createElement('div');
      shiftInfo.className = 'bd-btn-label';
      shiftInfo.textContent = `Desplazamiento: ${sol.shift}`;

      const display = document.createElement('div');
      display.className = 'bd-code-display';
      display.textContent = mod.data.input.padEnd(6, '_').split('').join(' ');

      const pad = document.createElement('div');
      pad.className = 'bd-code-pad';
      pad.style.gridTemplateColumns = 'repeat(6, 1fr)';
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-code-key';
        b.textContent = letter;
        b.addEventListener('click', () => {
          if (mod.solved || mod.data.input.length >= 6) return;
          mod.data.input += letter;
          renderModules();
        });
        pad.appendChild(b);
      });

      const actions = document.createElement('div');
      actions.className = 'bd-code-actions';
      const clr = document.createElement('button');
      clr.type = 'button';
      clr.className = 'bd-code-key bd-code-key--wide';
      clr.textContent = '⌫';
      clr.addEventListener('click', () => {
        if (mod.solved) return;
        mod.data.input = mod.data.input.slice(0, -1);
        renderModules();
      });
      const ok = document.createElement('button');
      ok.type = 'button';
      ok.className = 'bd-code-key bd-code-key--wide bd-code-key--ok';
      ok.textContent = 'OK';
      ok.addEventListener('click', () => {
        if (mod.solved) return;
        if (mod.data.input === sol.original) onModuleSolved(mod, modEl);
        else {
          mod.data.input = '';
          onModuleStrike(modEl);
        }
        renderModules();
      });
      actions.appendChild(clr);
      actions.appendChild(ok);

      body.appendChild(cipher);
      body.appendChild(shiftInfo);
      body.appendChild(display);
      body.appendChild(pad);
      body.appendChild(actions);
    }

    function renderTiming(mod, body, modEl) {
      const sol = mod.getSolution(state).offset;
      const clock1 = document.createElement('div');
      clock1.className = 'bd-timing-clock';
      clock1.textContent = `Reloj 1: ${state.timeLeft % 60}s`;

      const clock2 = document.createElement('div');
      clock2.className = 'bd-timing-clock';
      clock2.textContent = `Reloj 2: ${((state.timeLeft % 60) + sol) % 60}s`;

      const hint = document.createElement('div');
      hint.className = 'bd-btn-label';
      hint.textContent = `Offset: +${sol}s`;

      const confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.className = 'bd-pattern-confirm';
      confirm.textContent = 'Sincronizado';
      confirm.addEventListener('click', () => {
        if (mod.solved) return;
        onModuleSolved(mod, modEl);
        renderModules();
      });

      body.appendChild(clock1);
      body.appendChild(clock2);
      body.appendChild(hint);
      body.appendChild(confirm);
    }

    function renderCoordinates(mod, body, modEl) {
      const sol = mod.getSolution(state);
      const hint = document.createElement('div');
      hint.className = 'bd-btn-label';
      hint.textContent = 'Introduce X, Y';

      const display = document.createElement('div');
      display.className = 'bd-code-display';
      display.textContent = `X:${mod.data.x || '_'} Y:${mod.data.y || '_'}`;

      const pad = document.createElement('div');
      pad.className = 'bd-code-pad';
      pad.style.gridTemplateColumns = 'repeat(5, 1fr)';
      for (let d = 0; d <= 9; d++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-code-key';
        b.textContent = d;
        b.addEventListener('click', () => {
          if (mod.solved) return;
          if (mod.data.x.length < 1) mod.data.x += d;
          else if (mod.data.y.length < 1) mod.data.y += d;
          renderModules();
        });
        pad.appendChild(b);
      }

      const actions = document.createElement('div');
      actions.className = 'bd-code-actions';
      const clr = document.createElement('button');
      clr.type = 'button';
      clr.className = 'bd-code-key bd-code-key--wide';
      clr.textContent = '⌫';
      clr.addEventListener('click', () => {
        if (mod.solved) return;
        mod.data.x = '';
        mod.data.y = '';
        renderModules();
      });
      const ok = document.createElement('button');
      ok.type = 'button';
      ok.className = 'bd-code-key bd-code-key--wide bd-code-key--ok';
      ok.textContent = 'OK';
      ok.addEventListener('click', () => {
        if (mod.solved) return;
        if (parseInt(mod.data.x, 10) === sol.x && parseInt(mod.data.y, 10) === sol.y) onModuleSolved(mod, modEl);
        else {
          mod.data.x = '';
          mod.data.y = '';
          onModuleStrike(modEl);
        }
        renderModules();
      });
      actions.appendChild(clr);
      actions.appendChild(ok);

      body.appendChild(hint);
      body.appendChild(display);
      body.appendChild(pad);
      body.appendChild(actions);
    }

    function renderBattery(mod, body, modEl) {
      const display = document.createElement('div');
      display.className = 'bd-code-display';
      display.style.fontSize = '1rem';
      display.textContent = `Nivel: ${mod.data.currentLevel}/4`;

      const pad = document.createElement('div');
      pad.className = 'bd-code-pad';
      pad.style.gridTemplateColumns = 'repeat(4, 1fr)';
      for (let i = 1; i <= 4; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-code-key';
        b.textContent = i;
        b.addEventListener('click', () => {
          if (mod.solved) return;
          mod.data.selectedLevel = i;
          const sol = mod.getSolution(state);
          if (i === sol.targetLevel) onModuleSolved(mod, modEl);
          else onModuleStrike(modEl);
          renderModules();
        });
        pad.appendChild(b);
      }

      body.appendChild(display);
      body.appendChild(pad);
    }

    function renderPorts(mod, body, modEl) {
      const display = document.createElement('div');
      display.className = 'bd-password-clues';
      display.textContent = `Puerto: ${mod.data.currentPort} (${mod.data.portCount})`;

      const pad = document.createElement('div');
      pad.className = 'bd-code-pad';
      pad.style.gridTemplateColumns = 'repeat(3, 1fr)';
      const portTypes = ['DVI', 'Parallel', 'PS/2', 'RJ-45', 'Stereo RCA', 'USB'];
      portTypes.forEach(port => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-code-key bd-code-key--wide';
        b.textContent = port;
        b.addEventListener('click', () => {
          if (mod.solved) return;
          mod.data.selectedPort = port;
          const sol = mod.getSolution(state);
          if (port === sol.targetPort) onModuleSolved(mod, modEl);
          else onModuleStrike(modEl);
          renderModules();
        });
        pad.appendChild(b);
      });

      body.appendChild(display);
      body.appendChild(pad);
    }

    function renderCompass(mod, body, modEl) {
      const display = document.createElement('div');
      display.className = 'bd-code-display';
      display.textContent = `Dirección: ${mod.data.currentDirection}`;

      const pad = document.createElement('div');
      pad.className = 'bd-code-pad';
      pad.style.gridTemplateColumns = 'repeat(4, 1fr)';
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      directions.forEach(dir => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-code-key';
        b.textContent = dir;
        b.addEventListener('click', () => {
          if (mod.solved) return;
          mod.data.selectedDirection = dir;
          const sol = mod.getSolution(state);
          if (dir === sol.targetDirection) onModuleSolved(mod, modEl);
          else onModuleStrike(modEl);
          renderModules();
        });
        pad.appendChild(b);
      });

      body.appendChild(display);
      body.appendChild(pad);
    }

    function renderSlots(mod, body, modEl) {
      const display = document.createElement('div');
      display.className = 'bd-code-display';
      display.textContent = 'Selecciona ranura (0-4)';

      const pad = document.createElement('div');
      pad.className = 'bd-code-pad';
      pad.style.gridTemplateColumns = 'repeat(5, 1fr)';
      for (let i = 0; i <= 4; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-code-key';
        b.textContent = i;
        b.addEventListener('click', () => {
          if (mod.solved) return;
          mod.data.selectedSlot = i;
          const sol = mod.getSolution(state);
          if (i === sol.targetSlot) onModuleSolved(mod, modEl);
          else onModuleStrike(modEl);
          renderModules();
        });
        pad.appendChild(b);
      }

      body.appendChild(display);
      body.appendChild(pad);
    }

    function tick() {
      if (!state.playing) return;
      state.timeLeft -= 1;
      if (state.timeLeft % 7 === 0) state.indicatorLit = !state.indicatorLit;
      updateHud();
      if (state.timeLeft <= 0) endGame(false);
    }

    function startGame() {
      clearInterval(timerInterval);
      initAudio();
      const cfg = getConfig();
      state.playing = true;
      state.serial = genSerial();
      state.totalTime = cfg.totalTime;
      state.timeLeft = cfg.totalTime;
      state.strikes = 0;
      state.maxStrikes = cfg.maxStrikes;
      state.animMs = cfg.animMs;
      state.indicatorLit = Math.random() > 0.5;
      state.batteryLevel = genBatteryLevel();
      state.portType = genPortType();
      state.portCount = genPortCount();
      state.modules = generateBomb(cfg);
      state.role = 'operator';

      result.textContent = '';
      setPhase('game');
      setRole('operator');
      updateHud();
      renderModules();
      setInfo('💣 Operador: desactiva módulos. Experto: consulta el manual. Alterna roles con los botones superiores.');

      timerInterval = setInterval(tick, 1000);
    }

    function endGame(won) {
      state.playing = false;
      clearInterval(timerInterval);
      timerInterval = null;

      const defused = state.modules.filter(m => m.solved).length;
      const score = defused * 1000 + (won ? state.timeLeft : 0);

      if (won) {
        playSound('win');
        result.textContent = `¡Bomba desactivada! Tiempo restante: ${timerEl.textContent} · Puntuación: ${score}`;
        result.style.color = '#86efac';
        setInfo('Todos los módulos desactivados. ¡Victoria!', 'ok');
      } else {
        playSound('lose');
        const reason = state.timeLeft <= 0 ? 'Tiempo agotado' : 'Demasiados strikes';
        result.textContent = `${reason}. Módulos desactivados: ${defused}/${state.modules.length} · Puntuación: ${score}`;
        result.style.color = '#fca5a5';
        setInfo(reason + '.', 'fail');
      }

      if (window.Leaderboard) Leaderboard.save('bombdefusal', score);

      renderModules();
    }

    function stopGame() {
      state.playing = false;
      clearInterval(timerInterval);
      timerInterval = null;
      setPhase('setup');
      setInfo('');
    }

    roleOperator.addEventListener('click', () => setRole('operator'));
    roleExpert.addEventListener('click', () => setRole('expert'));
    start.addEventListener('click', startGame);
    if (restart) restart.addEventListener('click', stopGame);
  }

  function stop() {
    if (activeState) activeState.playing = false;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (holdInterval) { clearInterval(holdInterval); holdInterval = null; }
  }

  window.GameRegistry.register({
    id:          'bombdefusal',
    name:        'Bomb Defusal',
    tag:         'ANÁLISIS',
    accent:      '#ef4444',
    icon:        '💣',
    num:         '20',
    description: 'Desactiva módulos bajo presión consultando el manual. Operador vs Experto: ninguno tiene toda la información.',
    difficulty:  5,
    css:         'css/bombdefusal.css',

    init,
    stop,

    leaderboard: { format: v => `${v} pts` }
  });

}());
