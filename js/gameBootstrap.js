/**
 * ============================================================
 *  js/gameBootstrap.js  — generación automática de cartas del lobby
 * ============================================================
 *
 *  Lee los juegos registrados en GameRegistry y:
 *
 *    1. Genera las cartas en #gameList (solo juegos con hidden:false).
 *    2. Genera los botones de filtro en #filterBar.
 *    3. Actualiza los contadores de módulos.
 *    4. Registra el hover/click sound en las cartas.
 *    5. Parcha leaderboard con la config de los juegos registrados.
 * ============================================================
 */

(function () {
  'use strict';

  /* ── 1. Generar cartas del lobby ── */
  function buildGameCards() {
    const gameList = document.getElementById('gameList');
    if (!gameList) return;

    gameList.innerHTML = '';

    const arrowSVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.5">
      <polyline points="9 18 15 12 9 6"/>
    </svg>`;

    const games = window.GameRegistry.visible();
    
    // Agregar todos los juegos (incluido virusOverload) con la misma estructura
    games.forEach(function (game, index) {
      
      const btn = document.createElement('button');
      btn.className = 'game-card';
      btn.dataset.game = game.id;
      btn.dataset.tags = game.tag || '';
      btn.dataset.order = index;
      btn.style.setProperty('--accent', game.accent || '#fff');
      btn.style.animationDelay = (index * 50) + 'ms';

      const maxDots = 5;
      let dotsHTML = '';
      for (let i = 0; i < maxDots; i++) {
        dotsHTML += `<span class="diff-dot ${i < (game.difficulty || 3) ? 'diff-dot--filled' : 'diff-dot--empty'}"></span>`;
      }

      // Icono vectorial coherente por id de juego; emoji como respaldo.
      const vectorIcon = (window.GameIcons && window.GameIcons.get(game.id)) || null;
      const iconHTML = vectorIcon
        ? vectorIcon
        : `<span class="card-icon-emoji">${game.icon || '🎮'}</span>`;

      const numStr = game.num !== undefined && game.num !== null
        ? String(game.num).padStart(2, '0')
        : String(index + 1).padStart(2, '0');

      btn.innerHTML = `
        <div class="card-border"></div>
        <div class="card-shine"></div>
        <div class="card-glare"></div>
        <div class="card-3d">
          <div class="card-accent-strip"></div>
          <div class="card-hero">
            <div class="card-hero-bg"></div>
            <span class="card-num">${numStr}</span>
            <span class="card-icon-lg">${iconHTML}</span>
          </div>
          <div class="card-body">
            <div class="card-meta">
              <span class="card-tag">${game.tag || ''}</span>
              <span class="card-recent-badge">● ÚLTIMO ACCESO</span>
            </div>
            <h3 class="card-name">${game.name || game.id}</h3>
            <p class="card-desc">${game.description || ''}</p>
            <span class="card-record-badge" data-record="${game.id}" hidden></span>
            <div class="card-bottom">
              <div class="diff-dots">${dotsHTML}</div>
              <span class="card-cta">EJECUTAR ${arrowSVG}</span>
            </div>
          </div>
        </div>
        <div class="card-bottom-glow"></div>
      `;

      gameList.appendChild(btn);
    });
  }

  /* ── Marcar la carta jugada más recientemente ── */
  function markRecentCard() {
    const gameList = document.getElementById('gameList');
    if (!gameList) return;

    // Limpiar marca anterior
    gameList.querySelectorAll('.game-card--recent').forEach(function (c) {
      c.classList.remove('game-card--recent');
    });

    // Leer leaderboard y encontrar el juego con updatedAt más reciente
    var store = {};
    try {
      var raw = localStorage.getItem('minijuegos_leaderboard');
      store = raw ? JSON.parse(raw) : {};
    } catch (e) {}

    var latestId = null;
    var latestTs = 0;
    Object.keys(store).forEach(function (gameId) {
      var rec = store[gameId];
      if (rec && rec.played && rec.updatedAt > latestTs) {
        latestTs = rec.updatedAt;
        latestId = gameId;
      }
    });

    if (!latestId) return;

    var card = gameList.querySelector('.game-card[data-game="' + latestId + '"]');
    if (card) card.classList.add('game-card--recent');
  }

  /* ── 2. Filtros del lobby ── */
  function initFilterBar() {
    const filterBar = document.getElementById('filterBar');
    const gameList  = document.getElementById('gameList');
    if (!filterBar || !gameList) return;

    const existingDynamic = filterBar.querySelectorAll('.filter-btn:not([data-filter="TODOS"])');
    existingDynamic.forEach(function (b) { b.remove(); });

    const cards  = Array.from(gameList.querySelectorAll('.game-card[data-tags]'));
    const allTags = [];

    cards.forEach(function (c) {
      (c.dataset.tags || '').split(',').map(function (t) { return t.trim(); })
        .filter(Boolean)
        .forEach(function (t) {
          if (!allTags.includes(t)) allTags.push(t);
        });
    });

    allTags.sort().forEach(function (tag) {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.filter = tag;
      btn.textContent = tag;
      filterBar.appendChild(btn);
    });

    let activeFilter = 'TODOS';

    function applyFilter(tag) {
      activeFilter = tag;
      filterBar.querySelectorAll('.filter-btn').forEach(function (b) {
        b.classList.toggle('filter-btn--active', b.dataset.filter === tag);
      });

      if (tag === 'TODOS') {
        // Restaurar orden original y quitar filtro
        cards.forEach(function (card) {
          card.classList.remove('game-card--filtered', 'game-card--lift');
        });
        // Reordenar al orden original
        var originalOrder = cards.slice().sort(function (a, b) {
          return parseInt(a.dataset.order || 0, 10) - parseInt(b.dataset.order || 0, 10);
        });
        var frag = document.createDocumentFragment();
        originalOrder.forEach(function (c) { frag.appendChild(c); });
        gameList.appendChild(frag);
        return;
      }

      // Separar coincidentes de no coincidentes
      var matching = [];
      var nonMatching = [];
      cards.forEach(function (card) {
        var tags = (card.dataset.tags || '').split(',').map(function (t) { return t.trim(); });
        if (tags.includes(tag)) {
          matching.push(card);
        } else {
          nonMatching.push(card);
        }
      });

      // Reordenar: coincidentes primero (suben), luego las demás
      var frag = document.createDocumentFragment();
      matching.forEach(function (c) { frag.appendChild(c); });
      nonMatching.forEach(function (c) { frag.appendChild(c); });
      gameList.appendChild(frag);

      // Aplicar clases con un frame de delay para que la transición surta efecto
      requestAnimationFrame(function () {
        cards.forEach(function (card) {
          var tags = (card.dataset.tags || '').split(',').map(function (t) { return t.trim(); });
          var isMatch = tags.includes(tag);
          card.classList.toggle('game-card--filtered', !isMatch);
          card.classList.toggle('game-card--lift', isMatch);
        });
      });
    }

    filterBar.addEventListener('click', function (e) {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      applyFilter(btn.dataset.filter);
    });
  }

  /* ── 3. Contadores de módulos ── */
  function updateModuleCount() {
    const total = window.GameRegistry.visible().length;
    ['modsCountHeader', 'modsCountPill', 'modsCountStats'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.textContent = total;
    });
  }

  /* ── 4. Sonidos de hover/click en cartas ── */
  function initCardSounds() {
    const gameGrid = document.getElementById('gameList');
    if (!gameGrid) return;

    let inside = false;
    const audio = window.audioManager || (typeof audioManager !== 'undefined' ? audioManager : null);

    gameGrid.addEventListener('mouseenter', function (e) {
      if (e.target.closest('.game-card') || e.target.closest('.virus-simple-btn')) {
        if (inside) return;
        inside = true;
        if (audio) audio.play('hover');
      }
    }, true);

    gameGrid.addEventListener('mouseleave', function (e) {
      if (e.target.closest('.game-card') || e.target.closest('.virus-simple-btn')) inside = false;
    }, true);

    gameGrid.addEventListener('click', function (e) {
      const card = e.target.closest('.game-card[data-game]') || e.target.closest('.virus-simple-btn[data-game]');
      if (!card) return;
      if (audio) audio.play('open');
      setTimeout(function () { window.showView(card.dataset.game); }, 80);
    });
  }

  /* ── 5. Leaderboard ── */
  function patchLeaderboard() {
    if (!window.Leaderboard) return;
    const cfg = {};
    window.GameRegistry.all().forEach(function (g) {
      if (g.leaderboard) cfg[g.id] = g.leaderboard;
    });
    if (Object.keys(cfg).length && typeof window.Leaderboard._patchConfig === 'function') {
      window.Leaderboard._patchConfig(cfg);
    }
  }

  /* ── Entry point ── */
  document.addEventListener('DOMContentLoaded', function () {
    buildGameCards();
    markRecentCard();
    updateModuleCount();
    patchLeaderboard();
    initFilterBar();
    initCardSounds();

    // Re-marcar carta reciente cada vez que se vuelve al lobby
    var _origBackToMenu = window.backToMenu;
    window.backToMenu = function (id) {
      var result = _origBackToMenu.apply(this, arguments);
      // Esperar a que la vista home sea visible antes de marcar
      setTimeout(markRecentCard, 120);
      // Refrescar sidebar con datos actualizados
      setTimeout(function () {
        window.dispatchEvent(new CustomEvent('leaderboard:updated'));
      }, 150);
      return result;
    };
  });

}());
