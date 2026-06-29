/**
 * js/games/ringpuzzle.js
 *
 * Ring Puzzle — alinea los nodos de colores en cada anillo y confírmalos.
 * Registrado en GameRegistry como id: 'ring-puzzle'.
 */

(function () {
  'use strict';

  /* ── Constants ── */
  const COLORS = [
    '#EF4444', '#22C55E', '#3B82F6', '#F59E0B',
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
  ];

  const DEFAULT_CONFIG = {
    numRings: 3,
    nodesPerRing: 6,
    numColors: 4,
    allowRepeated: true,
    timeLimitSeconds: 90,
    errorMarginDeg: 3,
  };

  const NODE_RADIUS = 11;
  const PENALTY_SECONDS = 3;
  const FEEDBACK_DURATION = 800;

  /* Layout dinámico según cantidad de anillos */
  let layout = { svgSize: 560, cx: 280, cy: 280, baseRadius: 70, ringGap: 58 };

  function computeLayout(numRings) {
    const baseRadius = 70;
    const ringGap = numRings <= 3 ? 58 : numRings === 4 ? 50 : 42;
    const markerOffset = 26;
    const strokeHalf = 20;
    const padding = 36;
    const maxRingRadius = baseRadius + (numRings - 1) * ringGap;
    const outerExtent = maxRingRadius + markerOffset + NODE_RADIUS + 3 + strokeHalf + padding;
    const svgSize = Math.max(400, Math.ceil(outerExtent * 2));
    return { svgSize, cx: svgSize / 2, cy: svgSize / 2, baseRadius, ringGap };
  }

  function applyLayout() {
    layout = computeLayout(config.numRings);
    if (!ui.rpSvg) return;
    ui.rpSvg.setAttribute('width', layout.svgSize);
    ui.rpSvg.setAttribute('height', layout.svgSize);
    ui.rpSvg.setAttribute('viewBox', `0 0 ${layout.svgSize} ${layout.svgSize}`);
  }

  /* ── State ── */
  let config = Object.assign({}, DEFAULT_CONFIG);
  let rings = [];
  let activeRingIndex = 0;
  let phase = 'menu'; // 'menu' | 'playing' | 'won' | 'lost'
  let timeLeft = 90;
  let wrongCount = 0;
  let lastFeedback = null; // 'correct' | 'wrong' | null
  let exitReason = null;   // 'timeout' | 'abandon' | null
  let timerInterval = null;
  let feedbackTimeout = null;

  /* Drag state */
  let dragState = null; // { startAngle, startRotation, ringIndex }

  /* ── Math helpers ── */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function angleBetween(cx, cy, px, py) {
    const dx = px - cx;
    const dy = py - cy;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    return (deg + 360) % 360;
  }

  function nodePosition(radius, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: layout.cx + radius * Math.cos(rad),
      y: layout.cy + radius * Math.sin(rad),
    };
  }

  function checkRing(ring) {
    return ring.nodes.every(node => {
      const displayAngle = (node.baseAngle + ring.rotation + 360) % 360;
      const target = (node.targetAngle + 360) % 360;
      const diff = Math.abs(displayAngle - target);
      const normalizedDiff = Math.min(diff, 360 - diff);
      return normalizedDiff <= config.errorMarginDeg;
    });
  }

  /* ── Puzzle generation ── */
  function generatePuzzle() {
    const { numRings, nodesPerRing, numColors, allowRepeated } = config;
    const stepDeg = 360 / nodesPerRing;

    return Array.from({ length: numRings }, (_, ringIndex) => {
      const solutionStep = Math.floor(Math.random() * nodesPerRing);
      const solutionRotation = solutionStep * stepDeg;
      const offset = 1 + Math.floor(Math.random() * (nodesPerRing - 1));
      const startRotation = ((solutionStep + offset) % nodesPerRing) * stepDeg;

      let colorIndices;
      if (!allowRepeated) {
        const pool = Array.from({ length: numColors }, (_, i) => i);
        const repeated = [];
        while (repeated.length < nodesPerRing) repeated.push(...pool);
        colorIndices = shuffle(repeated).slice(0, nodesPerRing);
      } else {
        colorIndices = Array.from({ length: nodesPerRing }, () =>
          Math.floor(Math.random() * numColors)
        );
      }

      const nodes = colorIndices.map((colorIndex, i) => {
        const baseAngle = i * stepDeg;
        const targetAngle = (baseAngle + solutionRotation) % 360;
        return { colorIndex, color: COLORS[colorIndex % COLORS.length], baseAngle, targetAngle };
      });

      return {
        index: ringIndex,
        nodes,
        rotation: startRotation,
        solutionRotation,
        locked: false,
        radius: layout.baseRadius + ringIndex * layout.ringGap,
      };
    });
  }

  /* ── SVG rendering ── */
  function svgEl(tag, attrs, children) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    (children || []).forEach(c => typeof c === 'string'
      ? el.appendChild(document.createTextNode(c))
      : c && el.appendChild(c));
    return el;
  }

  function renderBoard(svgEl_) {
    svgEl_.innerHTML = '';

    const defs = svgEl('defs', {});
    const bgGrad = svgEl('radialGradient', { id: 'rpBgGrad', cx: '50%', cy: '50%', r: '50%' });
    [['0%', '#1c0e00'], ['70%', '#0f0600'], ['100%', '#080300']].forEach(([o, c]) => {
      bgGrad.appendChild(svgEl('stop', { offset: o, 'stop-color': c }));
    });
    defs.appendChild(bgGrad);

    const glow = svgEl('filter', { id: 'rpGlow' });
    glow.appendChild(svgEl('feGaussianBlur', { stdDeviation: '3', result: 'coloredBlur' }));
    const merge = svgEl('feMerge', {});
    merge.appendChild(svgEl('feMergeNode', { in: 'coloredBlur' }));
    merge.appendChild(svgEl('feMergeNode', { in: 'SourceGraphic' }));
    glow.appendChild(merge);
    defs.appendChild(glow);

    const glowStrong = svgEl('filter', { id: 'rpGlowStrong' });
    glowStrong.appendChild(svgEl('feGaussianBlur', { stdDeviation: '6', result: 'coloredBlur' }));
    const merge2 = svgEl('feMerge', {});
    merge2.appendChild(svgEl('feMergeNode', { in: 'coloredBlur' }));
    merge2.appendChild(svgEl('feMergeNode', { in: 'SourceGraphic' }));
    glowStrong.appendChild(merge2);
    defs.appendChild(glowStrong);

    svgEl_.appendChild(defs);

    const maxRadius = rings.length > 0 ? rings[rings.length - 1].radius + 30 : 200;
    svgEl_.appendChild(svgEl('circle', {
      cx: layout.cx, cy: layout.cy, r: maxRadius + 10, fill: 'url(#rpBgGrad)',
    }));

    // Grid circles
    rings.forEach(ring => {
      svgEl_.appendChild(svgEl('circle', {
        cx: layout.cx, cy: layout.cy, r: ring.radius,
        fill: 'none', stroke: 'rgba(255,140,30,0.07)', 'stroke-width': 1,
      }));
    });

    // Target markers
    rings.forEach(ring => {
      ring.nodes.forEach(node => {
        const SPAN = 10;
        const markerR = ring.radius + 26;
        const toXY = (deg) => {
          const r = ((deg - 90) * Math.PI) / 180;
          return { x: layout.cx + markerR * Math.cos(r), y: layout.cy + markerR * Math.sin(r) };
        };
        const s = toXY(node.targetAngle - SPAN);
        const e = toXY(node.targetAngle + SPAN);
        const d = `M ${s.x} ${s.y} A ${markerR} ${markerR} 0 0 1 ${e.x} ${e.y}`;
        svgEl_.appendChild(svgEl('path', {
          d,
          fill: 'none',
          stroke: node.color,
          'stroke-width': 4,
          'stroke-linecap': 'round',
          opacity: ring.locked ? 0.2 : 0.8,
        }));
      });
    });

    // Rings
    rings.forEach(ring => {
      const isActive = ring.index === activeRingIndex && !ring.locked;
      const isLocked = ring.locked;
      const g = svgEl('g', { style: `cursor: ${isActive ? 'grab' : 'default'}` });

      // Ring track
      g.appendChild(svgEl('circle', {
        cx: layout.cx, cy: layout.cy, r: ring.radius,
        fill: 'none',
        stroke: isLocked
          ? 'rgba(180,80,10,0.35)'
          : isActive
          ? 'rgba(255,180,80,0.18)'
          : 'rgba(255,140,30,0.07)',
        'stroke-width': isActive ? 36 : 32,
        filter: isActive ? 'url(#rpGlow)' : '',
      }));

      if (isLocked) {
        g.appendChild(svgEl('circle', {
          cx: layout.cx, cy: layout.cy, r: ring.radius,
          fill: 'none',
          stroke: 'rgba(249,115,22,0.15)',
          'stroke-width': 36,
        }));
      }

      // Nodes
      ring.nodes.forEach(node => {
        const displayAngle = (node.baseAngle + ring.rotation + 360) % 360;
        const pos = nodePosition(ring.radius, displayAngle);
        const ng = svgEl('g', { filter: isActive ? 'url(#rpGlowStrong)' : '' });
        ng.appendChild(svgEl('circle', {
          cx: pos.x, cy: pos.y, r: NODE_RADIUS + 3, fill: 'rgba(0,0,0,0.5)',
        }));
        ng.appendChild(svgEl('circle', {
          cx: pos.x, cy: pos.y, r: NODE_RADIUS,
          fill: node.color, opacity: isLocked ? 0.4 : 1,
        }));
        if (isLocked) {
          const t = svgEl('text', {
            x: pos.x, y: pos.y + 1,
            'text-anchor': 'middle', 'dominant-baseline': 'middle',
            'font-size': 10, fill: 'white', opacity: 0.8,
          }, ['✓']);
          ng.appendChild(t);
        }
        g.appendChild(ng);
      });

      // Pointer events for dragging
      g.dataset.ringIndex = ring.index;
      svgEl_.appendChild(g);
    });

    // Center hub
    svgEl_.appendChild(svgEl('circle', {
      cx: layout.cx, cy: layout.cy, r: 38, fill: '#100600', stroke: 'rgba(255,140,30,0.2)', 'stroke-width': 1.5,
    }));
    svgEl_.appendChild(svgEl('circle', { cx: layout.cx, cy: layout.cy, r: 26, fill: '#1c0900' }));

    const centerText = svgEl('text', {
      x: layout.cx, y: layout.cy + 6, 'text-anchor': 'middle',
    });
    if (lastFeedback === 'correct') {
      centerText.setAttribute('font-size', 22);
      centerText.setAttribute('fill', '#f97316');
      centerText.setAttribute('filter', 'url(#rpGlowStrong)');
      centerText.appendChild(document.createTextNode('✓'));
    } else if (lastFeedback === 'wrong') {
      centerText.setAttribute('font-size', 22);
      centerText.setAttribute('fill', '#ef4444');
      centerText.setAttribute('filter', 'url(#rpGlowStrong)');
      centerText.appendChild(document.createTextNode('✗'));
    } else {
      centerText.setAttribute('font-size', 11);
      centerText.setAttribute('fill', 'rgba(255,140,30,0.3)');
      centerText.setAttribute('font-family', 'monospace');
      centerText.appendChild(document.createTextNode('◆◆◆'));
    }
    svgEl_.appendChild(centerText);
  }

  /* ── UI references ── */
  let ui = {};

  function getPhaseEl(name) { return ui[name]; }

  function showPhase(name) {
    ['rp-phase-menu', 'rp-phase-playing', 'rp-phase-result'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('active', el.id === id && id === `rp-phase-${name}`);
    });
    const section = document.getElementById('ring-puzzle');
    if (!section) return;
    section.querySelectorAll('.rp-phase').forEach(el => {
      el.classList.toggle('active', el.id === `rp-phase-${name}`);
    });
  }

  /* ── Timer ── */
  function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
      if (phase !== 'playing') return stopTimer();
      timeLeft = Math.max(0, timeLeft - 1);
      updateTimerUI();
      if (timeLeft <= 0) {
        exitReason = 'timeout';
        phase = 'lost';
        audioManager.play('gameover');
        stopTimer();
        showResult();
        exitReason = null;
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  function updateTimerUI() {
    if (!ui.rpTimerFill || !ui.rpTimerLabel) return;
    const pct = timeLeft / config.timeLimitSeconds;
    const color = pct > 0.5 ? '#f97316' : pct > 0.25 ? '#fbbf24' : '#ef4444';
    ui.rpTimerFill.style.width = (pct * 100) + '%';
    ui.rpTimerFill.style.background = `linear-gradient(90deg, ${color}66, ${color})`;
    ui.rpTimerFill.style.boxShadow = `0 0 8px ${color}88`;
    ui.rpTimerLabel.style.color = color;
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    ui.rpTimerLabel.textContent = `${m}:${String(s).padStart(2, '0')}`;
  }

  /* ── Ring pills ── */
  function updatePills() {
    if (!ui.rpRingPills) return;
    ui.rpRingPills.innerHTML = '';
    rings.forEach((r, i) => {
      const pill = document.createElement('div');
      pill.className = 'rp-ring-pill';
      if (r.locked) pill.classList.add('locked');
      else if (i === activeRingIndex) pill.classList.add('active');
      ui.rpRingPills.appendChild(pill);
    });
  }

  /* ── Wrong count ── */
  function updateWrongCount() {
    if (!ui.rpWrongCount) return;
    ui.rpWrongCount.textContent = wrongCount > 0 ? `✗${wrongCount}` : '';
    ui.rpWrongCount.style.color = wrongCount > 0 ? '#ef4444' : 'transparent';
  }

  /* ── Rotation ── */
  function rotate(dir) {
    if (phase !== 'playing') return;
    if (rings[activeRingIndex].locked) return;
    const step = 360 / config.nodesPerRing;
    const delta = dir === 'left' ? -step : step;
    rings[activeRingIndex].rotation = (rings[activeRingIndex].rotation + delta + 360) % 360;
    if (ui.rpSvg) renderBoard(ui.rpSvg);
  }

  /* ── Confirm ── */
  function confirm() {
    if (phase !== 'playing') return;
    const ring = rings[activeRingIndex];
    if (ring.locked) return;

    if (feedbackTimeout) { clearTimeout(feedbackTimeout); feedbackTimeout = null; }

    const correct = checkRing(ring);
    if (correct) {
      rings[activeRingIndex].locked = true;
      lastFeedback = 'correct';
      audioManager.play('good');
      const nextActive = activeRingIndex + 1;
      if (nextActive >= rings.length) {
        stopTimer();
        phase = 'won';
        audioManager.play('perfect');
        if (ui.rpSvg) renderBoard(ui.rpSvg);
        feedbackTimeout = setTimeout(() => {
          lastFeedback = null;
          showResult();
        }, FEEDBACK_DURATION);
        return;
      }
      activeRingIndex = nextActive;
    } else {
      timeLeft = Math.max(0, timeLeft - PENALTY_SECONDS);
      lastFeedback = 'wrong';
      audioManager.play('miss');
      wrongCount++;
      updateWrongCount();
      updateTimerUI();
    }

    updatePills();
    if (ui.rpSvg) renderBoard(ui.rpSvg);
    showFeedback(lastFeedback);

    feedbackTimeout = setTimeout(() => {
      lastFeedback = null;
      if (ui.rpSvg) renderBoard(ui.rpSvg);
      hideFeedback();
    }, FEEDBACK_DURATION);
  }

  /* ── Feedback overlays ── */
  function showFeedback(type) {
    if (!ui.rpFeedbackCorrect || !ui.rpFeedbackWrong) return;
    ui.rpFeedbackCorrect.classList.toggle('visible', type === 'correct');
    ui.rpFeedbackWrong.classList.toggle('visible', type === 'wrong');
  }
  function hideFeedback() {
    if (!ui.rpFeedbackCorrect || !ui.rpFeedbackWrong) return;
    ui.rpFeedbackCorrect.classList.remove('visible');
    ui.rpFeedbackWrong.classList.remove('visible');
  }

  /* ── Start game ── */
  function startGame() {
    stopTimer();
    applyLayout();
    rings = generatePuzzle();
    activeRingIndex = 0;
    phase = 'playing';
    timeLeft = config.timeLimitSeconds;
    wrongCount = 0;
    lastFeedback = null;

    showPhase('playing');
    updatePills();
    updateWrongCount();
    updateTimerUI();
    if (ui.rpSvg) renderBoard(ui.rpSvg);
    startTimer();
  }

  /* ── Show result ── */
  function showResult() {
    showPhase('result');
    const won = phase === 'won';
    const abandoned = exitReason === 'abandon';
    const lockedCount = rings.filter(r => r.locked).length;
    const totalRings = rings.length;
    const timeTaken = config.timeLimitSeconds - timeLeft;

    if (ui.rpResultIcon) {
      ui.rpResultIcon.textContent = won ? '🔓' : abandoned ? '🚪' : '⏱';
      ui.rpResultIcon.className = 'rp-result-icon ' + (won ? 'won' : 'lost');
    }
    if (ui.rpResultTitle) {
      ui.rpResultTitle.textContent = won
        ? 'Desbloqueado'
        : abandoned
        ? 'Abandonaste'
        : 'Tiempo agotado';
      ui.rpResultTitle.style.color = won ? '#f97316' : '#f87171';
      ui.rpResultTitle.style.textShadow = won ? '0 0 30px rgba(249,115,22,0.4)' : 'none';
    }
    if (ui.rpResultSub) {
      ui.rpResultSub.textContent = won
        ? `Resuelto en ${Math.floor(timeTaken / 60)}:${String(timeTaken % 60).padStart(2, '0')}`
        : abandoned
        ? `${lockedCount} de ${totalRings} anillos desbloqueados antes de salir`
        : `${lockedCount} de ${totalRings} anillos desbloqueados`;
    }
    if (ui.rpStatRings) ui.rpStatRings.textContent = `${lockedCount} / ${totalRings}`;
    if (ui.rpStatWrong) {
      ui.rpStatWrong.textContent = String(wrongCount);
      ui.rpStatWrong.style.color = wrongCount > 0 ? '#f87171' : '#e8c99a';
    }
    if (ui.rpStatPenalty) ui.rpStatPenalty.textContent = `−${wrongCount * PENALTY_SECONDS}s`;
    const remainRow = document.getElementById('rp-stat-remaining-row');
    if (remainRow) {
      remainRow.style.display = won ? 'flex' : 'none';
      if (ui.rpStatRemaining) {
        ui.rpStatRemaining.textContent = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;
        ui.rpStatRemaining.style.color = '#f97316';
      }
    }
  }

  /* ── Drag handlers ── */
  function getSVGPoint(svg, clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const scaleX = layout.svgSize / rect.width;
    const scaleY = layout.svgSize / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function onPointerDown(e) {
    if (phase !== 'playing') return;
    // Find which ring group was clicked
    let el = e.target;
    let ringIndex = null;
    while (el && el !== ui.rpSvg) {
      if (el.dataset && el.dataset.ringIndex !== undefined) {
        ringIndex = parseInt(el.dataset.ringIndex);
        break;
      }
      el = el.parentElement;
    }
    if (ringIndex === null || ringIndex !== activeRingIndex) return;
    if (rings[ringIndex].locked) return;

    e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getSVGPoint(ui.rpSvg, e.clientX, e.clientY);
    dragState = {
      startAngle: angleBetween(layout.cx, layout.cy, pt.x, pt.y),
      startRotation: rings[ringIndex].rotation,
      ringIndex,
    };
  }

  function onPointerMove(e) {
    if (!dragState) return;
    const pt = getSVGPoint(ui.rpSvg, e.clientX, e.clientY);
    const { startAngle, startRotation, ringIndex } = dragState;
    const currentAngle = angleBetween(layout.cx, layout.cy, pt.x, pt.y);
    let delta = currentAngle - startAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    rings[ringIndex].rotation = (startRotation + delta + 360) % 360;
    if (ui.rpSvg) renderBoard(ui.rpSvg);
  }

  function onPointerUp() {
    dragState = null;
  }

  /* ── Menu UI helpers ── */
  function buildColorDots() {
    if (!ui.rpColorDots) return;
    ui.rpColorDots.innerHTML = '';
    for (let i = 0; i < config.numColors; i++) {
      const dot = document.createElement('div');
      dot.className = 'rp-color-dot';
      dot.style.backgroundColor = COLORS[i];
      dot.style.boxShadow = `0 0 7px ${COLORS[i]}aa`;
      ui.rpColorDots.appendChild(dot);
    }
  }

  function buildSlider(trackId, fillId, inputId, valId, min, max, step, key, displayFn) {
    const fill = document.getElementById(fillId);
    const input = document.getElementById(inputId);
    const val = document.getElementById(valId);
    if (!fill || !input || !val) return;

    function update(v) {
      config[key] = Number(v);
      const pct = ((v - min) / (max - min)) * 100;
      fill.style.width = pct + '%';
      val.textContent = displayFn ? displayFn(Number(v)) : v;
      if (key === 'numColors') buildColorDots();
      if (key === 'numRings') applyLayout();
    }

    input.min = min;
    input.max = max;
    input.step = step;
    input.value = config[key];
    input.addEventListener('input', () => update(input.value));
    update(config[key]);
  }

  function buildToggle(btnId, key) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    function sync() {
      btn.classList.toggle('on', !!config[key]);
    }
    sync();
    btn.addEventListener('click', () => {
      config[key] = !config[key];
      sync();
    });
  }

  function formatTime(v) {
    if (v < 60) return `${v}s`;
    const m = Math.floor(v / 60);
    const s = v % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }

  function abandonGame() {
    if (phase !== 'playing') return false;
    stopTimer();
    if (feedbackTimeout) { clearTimeout(feedbackTimeout); feedbackTimeout = null; }
    dragState = null;
    lastFeedback = null;
    hideFeedback();
    exitReason = 'abandon';
    phase = 'lost';
    showResult();
    exitReason = null;
    return true;
  }

  /* ── Stop (called by GameRegistry on backToMenu) ── */
  function stop() {
    stopTimer();
    if (feedbackTimeout) { clearTimeout(feedbackTimeout); feedbackTimeout = null; }
    dragState = null;
    lastFeedback = null;
    hideFeedback();

    if (phase === 'playing') {
      exitReason = 'abandon';
      phase = 'lost';
      showResult();
      exitReason = null;
    }

    phase = 'menu';
    showPhase('menu');
  }

  /* ── Init ── */
  function init(resolvedUi) {
    // Collect UI references from section
    const section = document.getElementById('ring-puzzle');
    if (!section) return;

    ui.rpTimerFill = section.querySelector('[data-ui="rpTimerFill"]');
    ui.rpTimerLabel = section.querySelector('[data-ui="rpTimerLabel"]');
    ui.rpRingPills = section.querySelector('[data-ui="rpRingPills"]');
    ui.rpWrongCount = section.querySelector('[data-ui="rpWrongCount"]');
    ui.rpSvg = section.querySelector('[data-ui="rpSvg"]');
    ui.rpFeedbackCorrect = section.querySelector('[data-ui="rpFeedbackCorrect"]');
    ui.rpFeedbackWrong = section.querySelector('[data-ui="rpFeedbackWrong"]');
    ui.rpColorDots = section.querySelector('[data-ui="rpColorDots"]');
    ui.rpResultIcon = section.querySelector('[data-ui="rpResultIcon"]');
    ui.rpResultTitle = section.querySelector('[data-ui="rpResultTitle"]');
    ui.rpResultSub = section.querySelector('[data-ui="rpResultSub"]');
    ui.rpStatRings = section.querySelector('[data-ui="rpStatRings"]');
    ui.rpStatWrong = section.querySelector('[data-ui="rpStatWrong"]');
    ui.rpStatPenalty = section.querySelector('[data-ui="rpStatPenalty"]');
    ui.rpStatRemaining = section.querySelector('[data-ui="rpStatRemaining"]');

    // Sliders
    buildSlider('rp-track-rings', 'rp-fill-rings', 'rp-input-rings', 'rp-val-rings', 1, 5, 1, 'numRings');
    buildSlider('rp-track-nodes', 'rp-fill-nodes', 'rp-input-nodes', 'rp-val-nodes', 3, 12, 1, 'nodesPerRing');
    buildSlider('rp-track-colors', 'rp-fill-colors', 'rp-input-colors', 'rp-val-colors', 2, 8, 1, 'numColors');
    buildSlider('rp-track-time', 'rp-fill-time', 'rp-input-time', 'rp-val-time', 30, 300, 15, 'timeLimitSeconds', formatTime);

    buildToggle('rp-toggle-repeated', 'allowRepeated');
    buildColorDots();
    applyLayout();

    const backBtn = section.querySelector('.back-btn');
    if (backBtn) {
      backBtn.removeAttribute('onclick');
      backBtn.addEventListener('click', function (e) {
        if (phase === 'playing') {
          e.preventDefault();
          abandonGame();
          return;
        }
        window.backToMenu('home');
      });
    }

    // Buttons
    const startBtn = section.querySelector('[data-ui="rpStartBtn"]');
    if (startBtn) startBtn.addEventListener('click', startGame);

    const resetBtn = section.querySelector('[data-ui="rpResetBtn"]');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      config = Object.assign({}, DEFAULT_CONFIG);
      buildSlider('rp-track-rings', 'rp-fill-rings', 'rp-input-rings', 'rp-val-rings', 1, 5, 1, 'numRings');
      buildSlider('rp-track-nodes', 'rp-fill-nodes', 'rp-input-nodes', 'rp-val-nodes', 3, 12, 1, 'nodesPerRing');
      buildSlider('rp-track-colors', 'rp-fill-colors', 'rp-input-colors', 'rp-val-colors', 2, 8, 1, 'numColors');
      buildSlider('rp-track-time', 'rp-fill-time', 'rp-input-time', 'rp-val-time', 30, 300, 15, 'timeLimitSeconds', formatTime);
      buildToggle('rp-toggle-repeated', 'allowRepeated');
      buildColorDots();
    });

    const retryBtn = section.querySelector('[data-ui="rpRetryBtn"]');
    if (retryBtn) retryBtn.addEventListener('click', startGame);

    const menuBtn = section.querySelector('[data-ui="rpMenuBtn"]');
    if (menuBtn) menuBtn.addEventListener('click', () => showPhase('menu'));

    const rotLeftBtn = section.querySelector('[data-ui="rpRotLeft"]');
    if (rotLeftBtn) {
      rotLeftBtn.addEventListener('pointerdown', () => rotate('left'));
    }
    const rotRightBtn = section.querySelector('[data-ui="rpRotRight"]');
    if (rotRightBtn) {
      rotRightBtn.addEventListener('pointerdown', () => rotate('right'));
    }
    const confirmBtn = section.querySelector('[data-ui="rpConfirm"]');
    if (confirmBtn) confirmBtn.addEventListener('click', confirm);

    // SVG pointer events
    if (ui.rpSvg) {
      ui.rpSvg.addEventListener('pointerdown', onPointerDown);
      ui.rpSvg.addEventListener('pointermove', onPointerMove);
      ui.rpSvg.addEventListener('pointerup', onPointerUp);
      ui.rpSvg.addEventListener('pointerleave', onPointerUp);
    }

    // Keyboard
    window.addEventListener('keydown', function rpKey(e) {
      const sectionEl = document.getElementById('ring-puzzle');
      const inView = sectionEl && !sectionEl.classList.contains('hidden');
      if (!inView) return;

      if (e.key === 'Escape' && phase === 'playing') {
        e.preventDefault();
        e.stopImmediatePropagation();
        abandonGame();
        return;
      }

      if (phase !== 'playing') return;
      if (e.key === 'ArrowLeft') rotate('left');
      if (e.key === 'ArrowRight') rotate('right');
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); confirm(); }
    }, true);

    showPhase('menu');
  }

  window.GameRegistry.register({
    id:          'ring-puzzle',
    name:        'Ring Puzzle',
    tag:         'LÓGICA',
    accent:      '#f97316',
    icon:        '⭕',
    num:         '17',
    description: 'Alinea los nodos de colores en cada anillo girándolos hasta que encajen con su posición objetivo.',
    difficulty:  3,
    css:         'css/ringpuzzle.css',
    init,
    stop,
  });

}());
