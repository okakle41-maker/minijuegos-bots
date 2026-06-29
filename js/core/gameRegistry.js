/**
 * ============================================================
 *  js/core/gameRegistry.js  — registro central de minijuegos
 * ============================================================
 *
 *  Uso:
 *    GameRegistry.register({ id, name, tag, accent, icon, num,
 *                            description, difficulty,
 *                            css,   ← inyectado automáticamente
 *                            init,  ← (ui) => {}  función de arranque
 *                            stop,  ← () => {}    llamada en backToMenu
 *                            start, ← () => {}    llamada al entrar a la vista
 *                          });
 *
 *  El registry se encarga de:
 *    1. Inyectar el <link rel="stylesheet"> del campo `css`.
 *    2. Resolver el objeto `ui` desde la <section id="{id}">
 *       buscando [data-ui] y [data-ui-all] dentro de ella.
 *    3. Llamar `init(ui)` en DOMContentLoaded.
 *    4. Exponer GameRegistry.all() para que viewManager itere.
 *    5. Exponer GameRegistry.get(id) para lookups por id.
 * ============================================================
 */

(function (global) {
  'use strict';

  const _games   = [];          // array en orden de registro
  const _byId    = {};          // índice por id

  /* ── CSS auto-injection ── */
  function injectCSS(href) {
    if (!href) return;
    // evitar dobles (puede llamarse antes de DOMContentLoaded)
    const existing = document.querySelector(`link[href="${href}"]`);
    if (existing) return;
    const link = document.createElement('link');
    link.rel   = 'stylesheet';
    link.href  = href;
    (document.head || document.documentElement).appendChild(link);
  }

  /* ── UI resolver: [data-ui] y [data-ui-all] dentro de la section ── */
  function resolveUi(id) {
    const section = document.getElementById(id);
    if (!section) return {};

    const ui = {};

    // data-ui="name"  → ui.name = element
    section.querySelectorAll('[data-ui]').forEach(el => {
      const key = el.dataset.ui;
      if (key) ui[key] = el;
    });

    // data-ui-all="name"  → ui.name = NodeList
    section.querySelectorAll('[data-ui-all]').forEach(el => {
      const key = el.dataset.uiAll;
      if (!key) return;
      if (!ui[key]) {
        ui[key] = section.querySelectorAll(`[data-ui-all="${key}"]`);
      }
    });

    return ui;
  }

  /* ── Registro principal ── */
  function register(cfg) {
    if (!cfg || !cfg.id) {
      console.warn('[GameRegistry] register() llamado sin id:', cfg);
      return;
    }
    if (_byId[cfg.id]) {
      console.warn('[GameRegistry] id duplicado:', cfg.id);
      return;
    }

    // Inyectar CSS inmediatamente (funciona antes y después de DOMContentLoaded)
    injectCSS(cfg.css);

    const entry = Object.assign({
      name:        '',
      tag:         '',
      accent:      '#ffffff',
      icon:        '🎮',
      num:         '?',
      description: '',
      difficulty:  3,
      hidden:      false,   // true = sub-view, not shown as lobby card
      css:         null,
      init:        null,
      stop:        null,
      start:       null,
      leaderboard: null,
    }, cfg);

    _games.push(entry);
    _byId[cfg.id] = entry;

    // Llamar init(ui) cuando el DOM esté listo
    if (typeof entry.init === 'function') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function onReady() {
          entry.init(resolveUi(entry.id));
          document.removeEventListener('DOMContentLoaded', onReady);
        });
      } else {
        // DOMContentLoaded ya pasó (carga dinámica)
        entry.init(resolveUi(entry.id));
      }
    }
  }

  /* ── API pública ── */
  const GameRegistry = {
    register,

    /** Todos los juegos en orden de registro */
    all() { return _games.slice(); },

    /** Juegos visibles (hidden:false) — usados para cartas del lobby */
    visible() { return _games.filter(g => !g.hidden); },

    /** Busca por id */
    get(id) { return _byId[id] || null; },

    /** Para compatibilidad con el bootstrap antiguo */
    allStopFns() {
      return _games
        .filter(g => typeof g.stop === 'function')
        .map(g => ({ id: g.id, stop: g.stop }));
    },

    /** Resuelve el ui object de un juego (útil externamente) */
    resolveUi,
  };

  global.GameRegistry = GameRegistry;

}(window));
