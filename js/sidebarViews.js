/**
 * ============================================================
 *  js/sidebarViews.js — vistas del sidebar
 * ============================================================
 *
 *  Genera el contenido dinámico de:
 *    - Estadísticas (resumen global + por categoría)
 *    - Progreso (récords por módulo)
 *    - Ranking (tabla ordenada de mejores marcas)
 *    - Configuración (tema, sonido, cursor, VFX, reset)
 *    - Manual (guía de referencia por módulo)
 *
 *  También conecta la navegación del sidebar con showView.
 * ============================================================
 */

(function () {
  'use strict';

  /* ── Navegación del sidebar ── */
  function initSidebarNav() {
    var navButtons = document.querySelectorAll('[data-side-nav]');
    var navMap = {
      modulos: 'home',
      estadisticas: 'estadisticas',
      progreso: 'progreso',
      ranking: 'ranking',
      configuracion: 'configuracion',
      manual: 'manual'
    };

    navButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.dataset.sideNav;
        var targetId = navMap[key];
        if (!targetId) return;

        // Actualizar estado activo
        navButtons.forEach(function (b) { b.classList.remove('side-nav-link--active'); });
        btn.classList.add('side-nav-link--active');

        // Reproducir sonido si está disponible
        var audio = window.audioManager || (typeof audioManager !== 'undefined' ? audioManager : null);
        if (audio && audio.play) audio.play('click');

        // Mostrar vista
        if (targetId === 'home') {
          window.backToMenu('home');
        } else {
          // Detener juegos activos antes de mostrar una vista del sidebar
          if (window.GameRegistry) {
            window.GameRegistry.all().forEach(function (g) {
              if (typeof g.stop === 'function') {
                try { g.stop(); } catch (e) {}
              }
            });
          }
          window.showView(targetId);
          // Renderizar contenido de la vista
          renderView(targetId);
        }
      });
    });
  }

  /* ── Actualizar botón activo al volver al lobby ── */
  function syncActiveNav(viewId) {
    var navButtons = document.querySelectorAll('[data-side-nav]');
    var navMap = {
      home: 'modulos',
      estadisticas: 'estadisticas',
      progreso: 'progreso',
      ranking: 'ranking',
      configuracion: 'configuracion',
      manual: 'manual'
    };
    var activeKey = navMap[viewId];
    navButtons.forEach(function (b) {
      b.classList.toggle('side-nav-link--active', b.dataset.sideNav === activeKey);
    });
  }

  /* ── Datos compartidos ── */
  function getLeaderboardStore() {
    try {
      var raw = localStorage.getItem('minijuegos_leaderboard');
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function getGames() {
    return window.GameRegistry ? window.GameRegistry.visible() : [];
  }

  function formatRecord(gameId, value) {
    var game = window.GameRegistry ? window.GameRegistry.get(gameId) : null;
    if (game && game.leaderboard && game.leaderboard.format) {
      return game.leaderboard.format(value);
    }
    return value + ' pts';
  }

  /* ── Estadísticas ── */
  function renderStats() {
    var grid = document.getElementById('statsGrid');
    var catContainer = document.getElementById('statsByCategory');
    if (!grid || !catContainer) return;

    var store = getLeaderboardStore();
    var games = getGames();

    var totalModules = games.length;
    var completed = 0;
    var totalSessions = 0;
    var categories = {};

    games.forEach(function (g) {
      var rec = store[g.id];
      if (rec && rec.played) {
        completed++;
        totalSessions++;
      }
      var tag = g.tag || 'OTROS';
      if (!categories[tag]) categories[tag] = { total: 0, completed: 0, games: [] };
      categories[tag].total++;
      if (rec && rec.played) categories[tag].completed++;
      categories[tag].games.push(g);
    });

    // Tarjetas de resumen
    grid.innerHTML = '';
    var stats = [
      { label: 'MÓDULOS TOTALES', value: totalModules, icon: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>' },
      { label: 'COMPLETADOS', value: completed, icon: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' },
      { label: 'SESIONES', value: totalSessions, icon: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
      { label: 'CATEGORÍAS', value: Object.keys(categories).length, icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' }
    ];

    stats.forEach(function (s) {
      var el = document.createElement('div');
      el.className = 'stat-card';
      el.innerHTML =
        '<div class="stat-card-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + s.icon + '</svg></div>' +
        '<div class="stat-card-info">' +
          '<span class="stat-card-value">' + s.value + '</span>' +
          '<span class="stat-card-label">' + s.label + '</span>' +
        '</div>';
      grid.appendChild(el);
    });

    // Por categoría
    catContainer.innerHTML = '<h3 class="section-subtitle">POR CATEGORÍA</h3>';
    var catGrid = document.createElement('div');
    catGrid.className = 'category-grid';

    Object.keys(categories).sort().forEach(function (tag) {
      var cat = categories[tag];
      var pct = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;
      var el = document.createElement('div');
      el.className = 'category-card';
      el.innerHTML =
        '<div class="category-head">' +
          '<span class="category-tag">' + tag + '</span>' +
          '<span class="category-count">' + cat.completed + '/' + cat.total + '</span>' +
        '</div>' +
        '<div class="category-bar"><span style="width:' + pct + '%"></span></div>' +
        '<span class="category-pct">' + pct + '% completado</span>';
      catGrid.appendChild(el);
    });

    catContainer.appendChild(catGrid);
  }

  /* ── Progreso ── */
  function renderProgress() {
    var list = document.getElementById('progressList');
    if (!list) return;

    var store = getLeaderboardStore();
    var games = getGames();

    list.innerHTML = '';
    games.forEach(function (g) {
      var rec = store[g.id];
      var played = rec && rec.played;
      var value = played ? formatRecord(g.id, rec.value) : '—';
      var updated = played ? new Date(rec.updatedAt).toLocaleDateString('es-ES') : 'Sin jugar';

      var el = document.createElement('div');
      el.className = 'progress-item' + (played ? ' progress-item--done' : '');
      el.innerHTML =
        '<div class="progress-item-icon" style="--accent:' + (g.accent || '#f97316') + '">' +
          (window.GameIcons && window.GameIcons.get(g.id) || '<span style="font-size:20px">' + (g.icon || '🎮') + '</span>') +
        '</div>' +
        '<div class="progress-item-body">' +
          '<div class="progress-item-top">' +
            '<span class="progress-item-name">' + (g.name || g.id) + '</span>' +
            '<span class="progress-item-tag">' + (g.tag || '') + '</span>' +
          '</div>' +
          '<div class="progress-item-bottom">' +
            '<span class="progress-item-record">' + value + '</span>' +
            '<span class="progress-item-date">' + updated + '</span>' +
          '</div>' +
        '</div>';
      list.appendChild(el);
    });
  }

  /* ── Ranking ── */
  function renderRanking() {
    var list = document.getElementById('rankingList');
    if (!list) return;

    var store = getLeaderboardStore();
    var games = getGames();

    // Filtrar solo juegos jugados
    var played = games.filter(function (g) {
      return store[g.id] && store[g.id].played;
    });

    if (played.length === 0) {
      list.innerHTML = '<div class="ranking-empty">Aún no hay récords. Juega algún módulo para aparecer en el ranking.</div>';
      return;
    }

    // Ordenar por valor descendente
    played.sort(function (a, b) {
      return (store[b.id].value || 0) - (store[a.id].value || 0);
    });

    list.innerHTML = '';
    played.forEach(function (g, i) {
      var rec = store[g.id];
      var value = formatRecord(g.id, rec.value);
      var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
      var rank = i + 1;

      var el = document.createElement('div');
      el.className = 'ranking-item' + (i < 3 ? ' ranking-item--top' : '');
      el.innerHTML =
        '<span class="ranking-rank">' + (medal || '#' + rank) + '</span>' +
        '<div class="ranking-icon" style="--accent:' + (g.accent || '#f97316') + '">' +
          (window.GameIcons && window.GameIcons.get(g.id) || '<span style="font-size:18px">' + (g.icon || '🎮') + '</span>') +
        '</div>' +
        '<div class="ranking-info">' +
          '<span class="ranking-name">' + (g.name || g.id) + '</span>' +
          '<span class="ranking-tag">' + (g.tag || '') + '</span>' +
        '</div>' +
        '<span class="ranking-value">' + value + '</span>';
      list.appendChild(el);
    });
  }

  /* ── Configuración ── */
  function renderConfig() {
    var themeSelect = document.getElementById('configThemeSelect');
    var sfxToggle = document.getElementById('configSfxToggle');
    var musicToggle = document.getElementById('configMusicToggle');
    var cursorToggle = document.getElementById('configCursorToggle');
    var vfxToggle = document.getElementById('configVfxToggle');
    var resetBtn = document.getElementById('configResetBtn');

    // Cargar estado guardado
    var savedTheme = localStorage.getItem('gameTheme') || 'dark';
    if (themeSelect) {
      themeSelect.value = savedTheme;
      themeSelect.addEventListener('change', function () {
        var themeSelectHeader = document.getElementById('themeSelect');
        if (themeSelectHeader) {
          themeSelectHeader.value = themeSelect.value;
          themeSelectHeader.dispatchEvent(new Event('change'));
        }
      });
    }

    if (sfxToggle) {
      sfxToggle.checked = localStorage.getItem('config_sfx') !== 'off';
      sfxToggle.addEventListener('change', function () {
        localStorage.setItem('config_sfx', sfxToggle.checked ? 'on' : 'off');
        applySfxSetting(sfxToggle.checked);
      });
    }

    if (musicToggle) {
      musicToggle.checked = localStorage.getItem('config_music') !== 'off';
      musicToggle.addEventListener('change', function () {
        localStorage.setItem('config_music', musicToggle.checked ? 'on' : 'off');
        applyMusicSetting(musicToggle.checked);
      });
    }

    if (cursorToggle) {
      cursorToggle.checked = localStorage.getItem('config_cursor') !== 'off';
      cursorToggle.addEventListener('change', function () {
        localStorage.setItem('config_cursor', cursorToggle.checked ? 'on' : 'off');
        applyCursorSetting(cursorToggle.checked);
      });
    }

    if (vfxToggle) {
      vfxToggle.checked = localStorage.getItem('config_vfx') !== 'off';
      vfxToggle.addEventListener('change', function () {
        localStorage.setItem('config_vfx', vfxToggle.checked ? 'on' : 'off');
        applyVfxSetting(vfxToggle.checked);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (resetBtn.dataset.confirming === 'true') {
          localStorage.removeItem('minijuegos_leaderboard');
          if (window.Leaderboard && window.Leaderboard.renderBadges) window.Leaderboard.renderBadges();
          resetBtn.textContent = 'BORRAR TODOS LOS RÉCORDS';
          resetBtn.dataset.confirming = 'false';
          resetBtn.classList.remove('config-danger-btn--confirm');
        } else {
          resetBtn.textContent = '¿CONFIRMAR? CLIC OTRA VEZ';
          resetBtn.dataset.confirming = 'true';
          resetBtn.classList.add('config-danger-btn--confirm');
          setTimeout(function () {
            if (resetBtn.dataset.confirming === 'true') {
              resetBtn.textContent = 'BORRAR TODOS LOS RÉCORDS';
              resetBtn.dataset.confirming = 'false';
              resetBtn.classList.remove('config-danger-btn--confirm');
            }
          }, 3000);
        }
      });
    }
  }

  function applySfxSetting(on) {
    if (window.audioManager || (typeof audioManager !== 'undefined' && audioManager)) {
      var am = window.audioManager || audioManager;
      if (on) {
        am._muted = false;
      } else {
        am._muted = true;
      }
    }
  }

  function applyMusicSetting(on) {
    var player = document.getElementById('musicPlayer');
    if (!player) return;
    player.style.display = on ? '' : 'none';
  }

  function applyCursorSetting(on) {
    var glow = document.getElementById('cursorGlow');
    var ring = document.getElementById('cursorRing');
    if (glow) glow.style.display = on ? '' : 'none';
    if (ring) ring.style.display = on ? '' : 'none';
    document.body.classList.toggle('cursor-disabled', !on);
  }

  function applyVfxSetting(on) {
    var fog = document.getElementById('ambientFog');
    var beams = document.querySelector('.beams');
    var particles = document.getElementById('particles');
    var grid = document.querySelector('.diagonal-grid');
    var scanlines = document.querySelector('.scanlines');
    if (fog) fog.style.display = on ? '' : 'none';
    if (beams) beams.style.display = on ? '' : 'none';
    if (particles) particles.style.display = on ? '' : 'none';
    if (grid) grid.style.display = on ? '' : 'none';
    if (scanlines) scanlines.style.display = on ? '' : 'none';
  }

  /* ── Manual ── */
  function renderManual() {
    var list = document.getElementById('manualList');
    if (!list) return;

    var games = getGames();
    list.innerHTML = '';

    games.forEach(function (g) {
      var el = document.createElement('div');
      el.className = 'manual-item';
      el.style.setProperty('--accent', g.accent || '#f97316');

      var dots = '';
      for (var i = 0; i < 5; i++) {
        dots += '<span class="diff-dot ' + (i < (g.difficulty || 3) ? 'diff-dot--filled' : 'diff-dot--empty') + '"></span>';
      }

      el.innerHTML =
        '<div class="manual-item-icon">' +
          (window.GameIcons && window.GameIcons.get(g.id) || '<span style="font-size:24px">' + (g.icon || '🎮') + '</span>') +
        '</div>' +
        '<div class="manual-item-body">' +
          '<div class="manual-item-head">' +
            '<span class="manual-item-tag">' + (g.tag || '') + '</span>' +
            '<span class="manual-item-num">MÓD-' + (g.num || '?') + '</span>' +
          '</div>' +
          '<h3 class="manual-item-name">' + (g.name || g.id) + '</h3>' +
          '<p class="manual-item-desc">' + (g.description || '') + '</p>' +
          '<div class="manual-item-foot">' +
            '<div class="diff-dots">' + dots + '</div>' +
            '<button class="manual-item-launch" data-game="' + g.id + '">EJECUTAR MÓDULO</button>' +
          '</div>' +
        '</div>';

      list.appendChild(el);
    });

    // Conectar botones de lanzamiento
    list.addEventListener('click', function (e) {
      var btn = e.target.closest('.manual-item-launch');
      if (!btn) return;
      var audio = window.audioManager || (typeof audioManager !== 'undefined' ? audioManager : null);
      if (audio && audio.play) audio.play('open');
      // Restaurar nav activo a Módulos
      syncActiveNav('home');
      setTimeout(function () { window.showView(btn.dataset.game); }, 80);
    });
  }

  /* ── Dispatcher de renderizado ── */
  function renderView(viewId) {
    switch (viewId) {
      case 'estadisticas': renderStats(); break;
      case 'progreso': renderProgress(); break;
      case 'ranking': renderRanking(); break;
      case 'configuracion': renderConfig(); break;
      case 'manual': renderManual(); break;
    }
  }

  /* ── Hook: sincronizar nav al volver al lobby ── */
  var originalBackToMenu = window.backToMenu;
  window.backToMenu = function (id) {
    syncActiveNav('home');
    return originalBackToMenu.apply(this, arguments);
  };

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', function () {
    initSidebarNav();

    // Aplicar configuraciones guardadas al cargar
    if (localStorage.getItem('config_sfx') === 'off') applySfxSetting(false);
    if (localStorage.getItem('config_music') === 'off') applyMusicSetting(false);
    if (localStorage.getItem('config_cursor') === 'off') applyCursorSetting(false);
    if (localStorage.getItem('config_vfx') === 'off') applyVfxSetting(false);
  });

})();
