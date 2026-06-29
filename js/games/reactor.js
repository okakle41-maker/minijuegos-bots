/**
 * js/games/reactor.js
 *
 * Reactor Nuclear — mantén el reactor estable durante el tiempo configurado.
 * Sistema dinámico de variables interconectadas con eventos aleatorios,
 * personalidades de reactor y sensores con ruido por radiación.
 *
 * data-ui esperados dentro de <section id="reactor">:
 *   start, setupPhase, gamePhase, endPhase,
 *   reactorName, timerEl, stabilityEl,
 *   energyVal, tempVal, pressureVal, coolingVal, radiationVal, fuelVal,
 *   energyBar, tempBar, pressureBar, coolingBar, radiationBar, fuelBar,
 *   eventBanner, eventIcon, eventText, eventResolveBtn,
 *   logEl, resultEl, resultScore, restartBtn,
 *   durationSel, difficultySel, speedSel, eventsSel,
 *   typeButtons (data-ui-all)
 */

(function () {
  'use strict';

  /* ────────────────────────────────────────────
   * CONSTANTES
   * ──────────────────────────────────────────── */

  const REACTOR_TYPES = [
    {
      id: 'experimental',
      label: '🔵 Experimental',
      desc: 'Mucha energía, muy sensible a temperatura',
      dot: '#3b82f6',
      mod: { energySensitivity: 1.6, tempSensitivity: 1.8, coolingEff: 1.0, fuelRate: 1.0, pressureSens: 1.2 }
    },
    {
      id: 'antiguo',
      label: '🟢 Antiguo',
      desc: 'Responde lento — anticipa los cambios',
      dot: '#22c55e',
      mod: { energySensitivity: 0.9, tempSensitivity: 0.7, coolingEff: 0.8, fuelRate: 0.8, pressureSens: 0.9, lag: 3 }
    },
    {
      id: 'compacto',
      label: '🟠 Compacto',
      desc: 'Temperatura sube rápido, pero enfría bien',
      dot: '#f97316',
      mod: { energySensitivity: 1.0, tempSensitivity: 1.4, coolingEff: 1.5, fuelRate: 1.1, pressureSens: 1.3 }
    },
    {
      id: 'militar',
      label: '🟣 Militar',
      desc: 'Alta potencia y presión, consume mucho combustible',
      dot: '#a855f7',
      mod: { energySensitivity: 1.3, tempSensitivity: 1.0, coolingEff: 1.1, fuelRate: 2.0, pressureSens: 1.5, maxPressureTol: 1.15 }
    },
    {
      id: 'dañado',
      label: '⚫ Dañado',
      desc: 'Sensores fallan al inicio, acciones reducidas',
      dot: '#6b7280',
      mod: { energySensitivity: 1.0, tempSensitivity: 1.0, coolingEff: 0.7, fuelRate: 1.2, pressureSens: 1.0, brokenSensors: true, reducedActions: true }
    }
  ];

  // Límites "zona segura" de cada variable (0-100)
  const LIMITS = {
    energy:    { min: 10, max: 90, critLow: 5,  critHigh: 95 },
    temp:      { min: 20, max: 80, critLow: 10, critHigh: 92 },
    pressure:  { min: 15, max: 85, critLow: 5,  critHigh: 95 },
    cooling:   { min: 5,  max: 95, critLow: 0,  critHigh: 100 },
    radiation: { min: 0,  max: 60, critLow: 0,  critHigh: 80 },
    fuel:      { min: 0,  max: 100, critLow: 0, critHigh: 100 }
  };

  const EVENTS = [
    {
      id: 'steam_leak',
      label: '💨 Fuga de vapor',
      desc: 'La presión cae rápidamente. Cierra la válvula.',
      resolveLabel: 'Cerrar válvula',
      icon: '💨',
      effect: s => { s.pressure -= 25; },
      tick: s => { s.pressure -= 1.5; },
      resolveEffect: s => { s.pressure += 5; }
    },
    {
      id: 'pump_failure',
      label: '⚙️ Bomba averiada',
      desc: 'Refrigeración inoperativa. Activa la secundaria.',
      resolveLabel: 'Activar secundaria',
      icon: '⚙️',
      effect: s => {},
      tick: s => { s.cooling -= 2; s.temp += 1.5; },
      resolveEffect: s => { s.cooling += 15; }
    },
    {
      id: 'energy_spike',
      label: '⚡ Pico energético',
      desc: 'Demanda eléctrica alta. Produce más energía.',
      resolveLabel: 'Satisfacer demanda',
      icon: '⚡',
      effect: s => { s.energy -= 10; },
      tick: s => { s.energy -= 1; },
      resolveEffect: s => { s.energy += 20; s.temp += 6; }
    },
    {
      id: 'radiation_leak',
      label: '☢️ Fuga radiactiva',
      desc: 'Radiación elevada. Los sensores pueden mentir.',
      resolveLabel: 'Sellar fuga',
      icon: '☢️',
      effect: s => { s.radiation += 20; },
      tick: s => { s.radiation += 0.8; },
      resolveEffect: s => { s.radiation -= 15; }
    },
    {
      id: 'fire',
      label: '🔥 Incendio',
      desc: 'Una zona queda dañada. Acciones limitadas.',
      resolveLabel: 'Extinguir',
      icon: '🔥',
      effect: s => { s._fireDamage = true; },
      tick: s => { s.temp += 1; s.energy -= 0.5; },
      resolveEffect: s => { s._fireDamage = false; }
    },
    {
      id: 'sensor_broken',
      label: '🔧 Sensor roto',
      desc: 'Temperatura invisible. Usa otros indicadores.',
      resolveLabel: 'Reparar sensor',
      icon: '🔧',
      effect: s => { s._sensorBroken = true; },
      tick: s => {},
      resolveEffect: s => { s._sensorBroken = false; }
    }
  ];

  /* ────────────────────────────────────────────
   * ESTADO DEL JUEGO
   * ──────────────────────────────────────────── */

  let _gameState = null;
  let _mainInterval = null;
  let _eventCheckInterval = null;
  let _cooldowns = {};

  function makeState(cfg) {
    return {
      running: false,
      elapsed: 0,
      duration: cfg.duration,
      speed: cfg.speed,
      eventFreq: cfg.eventFreq,
      reactorType: cfg.reactorType,
      mod: cfg.mod,

      energy:    55 + (Math.random() * 10 - 5),
      temp:      42 + (Math.random() * 8  - 4),
      pressure:  48 + (Math.random() * 10 - 5),
      cooling:   40 + (Math.random() * 8  - 4),
      radiation: 8  + (Math.random() * 5),
      fuel:      100,

      // Colas de cambio (para reactor lento)
      _pendingTemp: 0,

      // Flags de eventos
      _fireDamage: false,
      _sensorBroken: false,

      // Evento activo
      activeEvent: null,

      log: []
    };
  }

  /* ────────────────────────────────────────────
   * FÍSICA DEL REACTOR
   * ──────────────────────────────────────────── */

  function tick(state) {
    const m = state.mod;
    state.elapsed += 1;

    // Consumo de combustible
    const fuelConsumption = 0.08 * m.fuelRate * (state.energy / 50);
    state.fuel = Math.max(0, state.fuel - fuelConsumption);

    // Energía → temperatura (si hay combustible)
    const fuelFactor = state.fuel < 20 ? state.fuel / 20 : 1;
    const energyHeat = (state.energy / 100) * 0.9 * m.energySensitivity * fuelFactor;

    // Temperatura sube por energía, baja por refrigeración
    const coolingEffect = (state.cooling / 100) * 1.2 * m.coolingEff;
    const tempDelta = energyHeat - coolingEffect;

    // Reactor antiguo: lag en respuesta de temperatura
    if (m.lag) {
      state._pendingTemp += tempDelta;
      const applied = state._pendingTemp / m.lag;
      state.temp += applied;
      state._pendingTemp -= applied;
    } else {
      state.temp += tempDelta * m.tempSensitivity;
    }

    // Drift natural para que no sea estático
    state.temp     += (Math.random() - 0.49) * 0.35;
    state.pressure += (Math.random() - 0.49) * 0.3;
    state.energy   += (Math.random() - 0.5)  * 0.2;
    state.radiation += (Math.random() - 0.5) * 0.15;

    // Presión depende de temperatura
    const pressureDelta = ((state.temp - 50) / 100) * 0.8 * m.pressureSens;
    state.pressure += pressureDelta;

    // Refrigeración consume algo de energía
    const coolingDrain = (state.cooling / 100) * 0.15;
    state.energy = Math.max(0, state.energy - coolingDrain);

    // Radiación: sube lento si temperatura alta
    if (state.temp > 70) {
      state.radiation += (state.temp - 70) * 0.04;
    }
    state.radiation = Math.max(0, state.radiation - 0.05);

    // Evento activo tick
    if (state.activeEvent) {
      state.activeEvent.tick(state);
    }

    // Clamp todo
    clampState(state);
  }

  function clampState(s) {
    s.energy    = clamp(s.energy,    0, 100);
    s.temp      = clamp(s.temp,      0, 100);
    s.pressure  = clamp(s.pressure,  0, 100);
    s.cooling   = clamp(s.cooling,   0, 100);
    s.radiation = clamp(s.radiation, 0, 100);
    s.fuel      = clamp(s.fuel,      0, 100);
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function checkFailure(state) {
    const checks = [
      { key: 'energy',    label: 'Energía',     lo: true,  hi: true  },
      { key: 'temp',      label: 'Temperatura', lo: true,  hi: true  },
      { key: 'pressure',  label: 'Presión',     lo: true,  hi: true  },
      { key: 'fuel',      label: 'Combustible', lo: true,  hi: false }
    ];
    for (const c of checks) {
      const lim = LIMITS[c.key];
      const v   = state[c.key];
      if (c.lo && v <= lim.critLow)  return `${c.label} críticamente baja`;
      if (c.hi && v >= lim.critHigh) return `${c.label} críticamente alta`;
    }
    return null;
  }

  function getStability(state) {
    let score = 100;
    const vars = ['energy', 'temp', 'pressure'];
    for (const k of vars) {
      const v = state[k];
      const lim = LIMITS[k];
      if (v < lim.min || v > lim.max) score -= 18;
      else if (v < lim.min + 8 || v > lim.max - 8) score -= 7;
    }
    if (state.radiation > 50) score -= 12;
    if (state.fuel < 15) score -= 10;
    if (state.activeEvent) score -= 10;
    return Math.max(0, score);
  }

  /* ────────────────────────────────────────────
   * ACCIONES DEL JUGADOR
   * ──────────────────────────────────────────── */

  const ACTIONS = [
    {
      id: 'insert_rods',
      label: 'Insertar barras de control',
      info: '▼ Energía · ▼ Temperatura',
      icon: '🔽',
      cd: 3,
      apply(s) {
        s.energy    -= 12;
        s.temp      -= 8;
        s.pressure  -= 4;
      }
    },
    {
      id: 'extract_rods',
      label: 'Extraer barras de control',
      info: '▲ Energía · ▲ Temperatura',
      icon: '🔼',
      cd: 3,
      apply(s) {
        s.energy += 14;
        s.temp   += 9;
        s.pressure += 5;
      }
    },
    {
      id: 'open_valve_a',
      label: 'Abrir válvula A',
      info: '▲ Presión · ▼ Temperatura leve',
      icon: '🔓',
      cd: 2,
      apply(s) {
        s.pressure += 10;
        s.temp     -= 3;
      }
    },
    {
      id: 'open_valve_b',
      label: 'Abrir válvula B',
      info: '▼ Presión · ▲ Refrigeración',
      icon: '🔑',
      cd: 2,
      apply(s) {
        s.pressure -= 12;
        s.cooling  += 8;
      }
    },
    {
      id: 'boost_cooling',
      label: 'Activar bomba de refrigeración',
      info: '▲▲ Refrigeración · consume Energía',
      icon: '❄️',
      cd: 4,
      apply(s) {
        s.cooling -= 20;
        s.pressure -= 6;
        s.energy  -= 6;
      }
    },
    {
      id: 'reduce_cooling',
      label: 'Reducir refrigeración',
      info: '▼ Refrigeración · ▲ Presión',
      icon: '🌡️',
      cd: 2,
      apply(s) {
        s.cooling  += 18;
        s.pressure += 5;
        s.temp     += 3;
      }
    },
    {
      id: 'emergency_vent',
      label: 'Ventilación de emergencia',
      info: '▼▼ Presión y Temperatura · ▼ Energía',
      icon: '🚨',
      cd: 8,
      apply(s) {
        s.pressure -= 20;
        s.temp     -= 12;
        s.energy   -= 8;
        s.radiation += 5;
      }
    },
    {
      id: 'switch_gen_mode',
      label: 'Cambiar modo de generación',
      info: 'Alterna eficiencia / estabilidad',
      icon: '⚙️',
      cd: 5,
      apply(s) {
        if (!s._highEfficiency) {
          s._highEfficiency = true;
          s.energy  += 18;
          s.temp    += 10;
          s.fuel    -= 5;
        } else {
          s._highEfficiency = false;
          s.energy  -= 12;
          s.temp    -= 8;
        }
      }
    },
    {
      id: 'restart_cooling',
      label: 'Reiniciar sistema de refrigeración',
      info: 'Restaura Refrigeración al 50% base',
      icon: '🔄',
      cd: 10,
      apply(s) {
        s.cooling = 50 + (Math.random() * 10 - 5);
        s.temp   -= 5;
      }
    },
    {
      id: 'close_circuit',
      label: 'Cerrar circuito secundario',
      info: '▲ Radiación · ▼ Temperatura',
      icon: '🔒',
      cd: 4,
      apply(s) {
        s.temp      -= 15;
        s.radiation += 8;
        s.pressure  -= 8;
      }
    }
  ];

  /* ────────────────────────────────────────────
   * INIT
   * ──────────────────────────────────────────── */

  function init(ui) {
    if (!ui.start) return;

    // Pintar botones de tipo de reactor
    if (ui.typeButtons) {
      let selectedType = REACTOR_TYPES[0].id;
      ui.typeButtons.forEach(btn => {
        const rt = REACTOR_TYPES.find(r => r.id === btn.dataset.reactorId);
        if (!rt) return;
        btn.innerHTML = `
          <span class="rx-type-dot" style="background:${rt.dot}"></span>
          <strong>${rt.label}</strong>
          <span>${rt.desc}</span>
        `;
        if (rt.id === selectedType) btn.classList.add('rx-selected');
        btn.addEventListener('click', () => {
          ui.typeButtons.forEach(b => b.classList.remove('rx-selected'));
          btn.classList.add('rx-selected');
          selectedType = rt.id;
        });
      });

      ui.start.addEventListener('click', () => {
        const rt = REACTOR_TYPES.find(r => r.id === selectedType) || REACTOR_TYPES[0];
        const duration = parseInt(ui.durationSel?.value || '90', 10);
        const speed    = parseFloat(ui.speedSel?.value  || '1');
        const eventFreq = parseFloat(ui.eventsSel?.value || '1');

        startGame(ui, {
          duration,
          speed,
          eventFreq,
          reactorType: rt,
          mod: rt.mod
        });
      });
    }
  }

  /* ────────────────────────────────────────────
   * INICIO / PARADA
   * ──────────────────────────────────────────── */

  function showPhase(ui, phase) {
    // phase: 'setup' | 'game' | 'end'
    if (ui.setupPhase) ui.setupPhase.style.display = phase === 'setup' ? '' : 'none';
    if (ui.gamePhase)  ui.gamePhase.style.display  = phase === 'game'  ? 'block' : 'none';
    if (ui.endPhase)   ui.endPhase.style.display   = phase === 'end'   ? 'block' : 'none';
  }

  function startGame(ui, cfg) {
    stopGame();
    _cooldowns = {};

    _gameState = makeState(cfg);
    _gameState.running = true;

    // Mostrar pantalla de juego
    showPhase(ui, 'game');

    // Nombre en HUD
    if (ui.reactorName) ui.reactorName.textContent = cfg.reactorType.label;

    // Reactor dañado: algunos sensores empiezan rotos
    if (cfg.mod.brokenSensors) {
      _gameState._sensorBroken = true;
      logEntry(ui, '\u26a0\ufe0f SENSOR DE TEMPERATURA AVERIADO', 'danger');
    }

    // Construir botones de acción
    renderActions(ui, cfg.mod);

    // Render inicial
    renderState(ui, _gameState);
    renderTimer(ui, _gameState);

    // Tick principal
    const msPerTick = Math.round(1000 / cfg.speed);
    _mainInterval = setInterval(() => {
      if (!_gameState || !_gameState.running) return;

      tick(_gameState);
      renderState(ui, _gameState);
      renderTimer(ui, _gameState);

      // Verificar derrota
      const fail = checkFailure(_gameState);
      if (fail) {
        endGame(ui, false, fail);
        return;
      }

      // Verificar victoria
      if (_gameState.elapsed >= _gameState.duration) {
        endGame(ui, true, null);
        return;
      }

      // Cooldowns
      tickCooldowns(ui);
    }, msPerTick);

    // Eventos aleatorios
    const eventMs = Math.round((18000 / cfg.eventFreq) / cfg.speed);
    _eventCheckInterval = setInterval(() => {
      if (!_gameState || !_gameState.running) return;
      if (_gameState.activeEvent) return;
      if (Math.random() < 0.55) {
        triggerEvent(ui, _gameState);
      }
    }, eventMs);

    logEntry(ui, `Reactor ${cfg.reactorType.label} iniciado. ¡Mantén la estabilidad!`, 'ok');
  }

  function stopGame() {
    if (_mainInterval)      { clearInterval(_mainInterval);      _mainInterval = null; }
    if (_eventCheckInterval){ clearInterval(_eventCheckInterval); _eventCheckInterval = null; }
    if (_gameState) { _gameState.running = false; _gameState = null; }
    _cooldowns = {};
  }

  function endGame(ui, won, reason) {
    if (!_gameState) return;
    _gameState.running = false;
    clearInterval(_mainInterval);
    clearInterval(_eventCheckInterval);
    _mainInterval = null;
    _eventCheckInterval = null;

    const elapsed   = _gameState.elapsed;
    const stability = getStability(_gameState);
    const score     = won
      ? Math.round(elapsed * 10 + stability * 5)
      : Math.round(elapsed * 4);

    if (ui.resultEl) {
      ui.resultEl.innerHTML = won
        ? `<div class="rx-end-screen">
            <div class="rx-end-icon">✅</div>
            <h3>¡Reactor estabilizado!</h3>
            <p>Mantuviste el reactor activo durante ${elapsed}s.<br>Estabilidad final: ${stability}% · Puntuación: ${score}</p>
          </div>`
        : `<div class="rx-end-screen">
            <div class="rx-end-icon">💥</div>
            <h3>Fallo de reactor</h3>
            <p>Causa: <strong>${reason}</strong><br>Tiempo activo: ${elapsed}s · Puntuación: ${score}</p>
          </div>`;
    }

    // Mostrar pantalla de fin
    showPhase(ui, 'end');

    if (ui.restartBtn) {
      ui.restartBtn.onclick = () => {
        showPhase(ui, 'setup');
        if (ui.resultEl) ui.resultEl.innerHTML = '';
      };
    }

    if (window.Leaderboard) Leaderboard.save('reactor', score);
    audioManager.play(won ? 'perfect' : 'gameover');
  }

  /* ────────────────────────────────────────────
   * RENDER
   * ──────────────────────────────────────────── */

  const VAR_CONFIG = [
    { key: 'energy',    label: '⚡ Energía',     unit: '%',  barClass: 'rx-bar-energy',    uiVal: 'energyVal',    uiBar: 'energyBar'    },
    { key: 'temp',      label: '🌡️ Temperatura', unit: '°',  barClass: 'rx-bar-temp',      uiVal: 'tempVal',      uiBar: 'tempBar'      },
    { key: 'pressure',  label: '💨 Presión',      unit: '%',  barClass: 'rx-bar-pressure',  uiVal: 'pressureVal',  uiBar: 'pressureBar'  },
    { key: 'cooling',   label: '❄️ Refrigeración',unit: '%',  barClass: 'rx-bar-cooling',   uiVal: 'coolingVal',   uiBar: 'coolingBar'   },
    { key: 'radiation', label: '☢️ Radiación',    unit: '%',  barClass: 'rx-bar-radiation', uiVal: 'radiationVal', uiBar: 'radiationBar' },
    { key: 'fuel',      label: '🔋 Combustible',  unit: '%',  barClass: 'rx-bar-fuel',      uiVal: 'fuelVal',      uiBar: 'fuelBar'      }
  ];

  function renderState(ui, state) {
    const radNoise = state.radiation > 40 ? (state.radiation - 40) / 60 : 0;

    VAR_CONFIG.forEach(cfg => {
      const raw = state[cfg.key];
      const lim = LIMITS[cfg.key];

      // Valor con posible ruido por radiación
      let displayed = raw;
      let fuzzy = false;

      if (cfg.key === 'temp' && (state._sensorBroken || state.mod?.brokenSensors)) {
        if (ui[cfg.uiVal]) {
          ui[cfg.uiVal].textContent = '???';
          ui[cfg.uiVal].className = 'rx-var-value rx-dead';
        }
        fuzzy = true;
      } else if (radNoise > 0 && cfg.key !== 'radiation' && cfg.key !== 'fuel') {
        const noise = (Math.random() - 0.5) * radNoise * 22;
        displayed = clamp(raw + noise, 0, 100);
        fuzzy = radNoise > 0.3;
      }

      if (!fuzzy || cfg.key === 'fuel') {
        let display;
        if (cfg.key === 'temp') {
          display = Math.round(displayed * 5.5 + 100) + '°C'; // escalar a grados reales
        } else {
          display = Math.round(displayed) + cfg.unit;
        }
        if (ui[cfg.uiVal]) {
          ui[cfg.uiVal].textContent = display;
          ui[cfg.uiVal].className = 'rx-var-value' + (fuzzy ? ' rx-fuzzy' : '');
        }
      }

      // Barra
      if (ui[cfg.uiBar]) {
        const fill = ui[cfg.uiBar].querySelector('.rx-bar-fill');
        if (fill) {
          fill.style.width = Math.round(raw) + '%';
          const isAlert = raw < lim.min || raw > lim.max;
          fill.classList.toggle('rx-alert', isAlert);
        }
      }
    });

    // Radiación overlay
    const overlay = document.querySelector('#reactor .rx-radiation-overlay');
    if (overlay) overlay.classList.toggle('active', state.radiation > 45);

    // Estabilidad
    if (ui.stabilityEl) {
      const stab = getStability(state);
      let cls = 'stable';
      let label = 'ESTABLE';
      if (stab < 60) { cls = 'warning'; label = 'INESTABLE'; }
      if (stab < 35) { cls = 'critical'; label = '⚠ CRÍTICO'; }
      ui.stabilityEl.textContent = label;
      ui.stabilityEl.className = 'rx-stability ' + cls;
    }
  }

  function renderTimer(ui, state) {
    if (!ui.timerEl) return;
    const remaining = Math.max(0, state.duration - state.elapsed);
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    ui.timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
    ui.timerEl.style.color = remaining < 15 ? '#ef4444' : remaining < 30 ? '#f97316' : '#22c55e';
  }

  /* ────────────────────────────────────────────
   * ACCIONES
   * ──────────────────────────────────────────── */

  function renderActions(ui, mod) {
    if (!ui.actionsContainer) return;
    ui.actionsContainer.innerHTML = '';

    let availableActions = ACTIONS;
    // Reactor dañado: menos acciones disponibles
    if (mod.reducedActions) {
      availableActions = ACTIONS.filter((_, i) => i % 2 === 0);
    }

    availableActions.forEach(action => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rx-action-btn';
      btn.dataset.actionId = action.id;
      btn.innerHTML = `
        <span class="rx-action-icon">${action.icon}</span>
        <span>
          ${action.label}
          <span class="rx-action-info">${action.info}</span>
        </span>
      `;

      btn.addEventListener('click', () => {
        if (!_gameState || !_gameState.running) return;
        if (_cooldowns[action.id] > 0) return;

        action.apply(_gameState);
        clampState(_gameState);
        audioManager.play('ui_click');
        logEntry(ui, `→ ${action.label}`, 'info');

        _cooldowns[action.id] = action.cd;
        btn.classList.add('rx-cooldown');
        btn.disabled = true;
        renderState(ui, _gameState);
      });

      ui.actionsContainer.appendChild(btn);
    });
  }

  function tickCooldowns(ui) {
    if (!ui.actionsContainer) return;
    Object.keys(_cooldowns).forEach(id => {
      if (_cooldowns[id] > 0) {
        _cooldowns[id] -= (1 / _gameState.speed);
        if (_cooldowns[id] <= 0) {
          _cooldowns[id] = 0;
          const btn = ui.actionsContainer.querySelector(`[data-action-id="${id}"]`);
          if (btn) {
            btn.classList.remove('rx-cooldown');
            btn.disabled = false;
          }
        }
      }
    });
  }

  /* ────────────────────────────────────────────
   * EVENTOS
   * ──────────────────────────────────────────── */

  function triggerEvent(ui, state) {
    const evt = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    state.activeEvent = evt;
    evt.effect(state);

    // Mostrar banner
    if (ui.eventBanner) {
      ui.eventBanner.classList.add('active');
      if (ui.eventIcon) ui.eventIcon.textContent = evt.icon;
      if (ui.eventText) ui.eventText.textContent = `${evt.label}: ${evt.desc}`;
      if (ui.eventResolveBtn) {
        ui.eventResolveBtn.textContent = evt.resolveLabel;
        ui.eventResolveBtn.onclick = () => resolveEvent(ui, state);
      }
    }

    logEntry(ui, `🚨 EVENTO: ${evt.label}`, 'danger');
    audioManager.play('miss');
  }

  function resolveEvent(ui, state) {
    if (!state.activeEvent) return;
    const evt = state.activeEvent;
    evt.resolveEffect(state);
    clampState(state);
    state.activeEvent = null;

    if (ui.eventBanner) ui.eventBanner.classList.remove('active');
    logEntry(ui, `✓ Resuelto: ${evt.label}`, 'ok');
    audioManager.play('good');
  }

  /* ────────────────────────────────────────────
   * LOG
   * ──────────────────────────────────────────── */

  function logEntry(ui, text, type) {
    if (!ui.logEl) return;
    const entry = document.createElement('div');
    entry.className = 'rx-log-entry' + (type ? ` rx-log-${type}` : '');
    const elapsed = _gameState ? _gameState.elapsed : 0;
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    entry.innerHTML = `<span class="rx-log-time">${m}:${String(s).padStart(2,'0')}</span><span>${text}</span>`;
    ui.logEl.insertBefore(entry, ui.logEl.firstChild);
    // Mantener solo 30 entradas
    while (ui.logEl.children.length > 30) ui.logEl.lastChild.remove();
  }

  /* ────────────────────────────────────────────
   * STOP (requerido por GameRegistry)
   * ──────────────────────────────────────────── */

  function stop() {
    stopGame();
  }

  /* ────────────────────────────────────────────
   * REGISTRO
   * ──────────────────────────────────────────── */

  window.GameRegistry.register({
    id:          'reactor',
    name:        'Reactor Nuclear',
    tag:         'ESTRATEGIA',
    accent:      '#22c55e',
    icon:        '☢️',
    num:         '21',
    description: 'Mantén el reactor estable bajo presión. Variables interconectadas, eventos aleatorios y reactores con personalidad.',
    difficulty:  5,
    css:         'css/reactor.css',

    init,
    stop,
    leaderboard: { format: v => `${v} pts` }
  });

}());
