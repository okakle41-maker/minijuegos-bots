/**
 * ============================================================
 *  js/core/gameIcons.js  — set de iconos vectoriales del lobby
 * ============================================================
 *
 *  Reemplaza los emojis de las cartas por iconos monolínea
 *  coherentes (viewBox 0 0 24 24, stroke = currentColor).
 *  El color lo hereda de --accent vía CSS (.card-icon-lg svg).
 *
 *  Uso:
 *    window.GameIcons.get('mechlock')  → string SVG (o null)
 *
 *  Mapeado por id de juego (ver GameRegistry.register de cada juego).
 * ============================================================
 */

(function (global) {
  'use strict';

  // Envuelve el contenido interno en un <svg> con atributos comunes.
  function svg(inner) {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false">' + inner + '</svg>'
    );
  }

  const ICONS = {
    // LÓGICA — engranajes entrelazados (cerradura mecánica)
    'mechlock': svg(
      '<circle cx="9" cy="9" r="2.4"/>' +
      '<path d="M9 4.6v1.6M9 11.8v1.6M4.6 9h1.6M11.8 9h1.6' +
      'M6.1 6.1l1.1 1.1M10.8 10.8l1.1 1.1M11.9 6.1l-1.1 1.1M7.2 10.8l-1.1 1.1"/>' +
      '<circle cx="16" cy="16" r="1.8"/>' +
      '<path d="M16 12.6v1.1M16 18.3v1.1M12.6 16h1.1M18.3 16h1.1' +
      'M13.8 13.8l.8.8M17.4 17.4l.8.8M18.2 13.8l-.8.8M14.6 17.4l-.8.8"/>'
    ),

    // TIPEO — teclado
    'typix': svg(
      '<rect x="2.5" y="6" width="19" height="12" rx="2"/>' +
      '<path d="M6 10h.5M9.5 10h.5M13 10h.5M16.5 10h.5M8 14h8"/>'
    ),

    // MEMORIA — cuadrícula con celda marcada (termita)
    'termita': svg(
      '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/>' +
      '<path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/>' +
      '<rect x="9.8" y="9.8" width="4.4" height="4.4" rx="0.6" fill="currentColor" stroke="none"/>'
    ),

    // REFLEJOS — diana / objetivo
    'skillchecks': svg(
      '<circle cx="12" cy="12" r="8.5"/>' +
      '<circle cx="12" cy="12" r="4"/>' +
      '<path d="M12 1.5v3.5M12 19v3.5M1.5 12H5M19 12h3.5"/>'
    ),

    // SECUENCIA — disco de 4 cuadrantes (Simon)
    'simon': svg(
      '<circle cx="12" cy="12" r="8.5"/>' +
      '<path d="M12 3.5v17M3.5 12h17"/>'
    ),

    // LÓGICA — anillos concéntricos
    'ring-puzzle': svg(
      '<circle cx="12" cy="12" r="8.5"/>' +
      '<circle cx="12" cy="12" r="5"/>' +
      '<circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"/>'
    ),

    // ESTRATEGIA — átomo (reactor)
    'reactor': svg(
      '<circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"/>' +
      '<ellipse cx="12" cy="12" rx="9.5" ry="3.6"/>' +
      '<ellipse cx="12" cy="12" rx="9.5" ry="3.6" transform="rotate(60 12 12)"/>' +
      '<ellipse cx="12" cy="12" rx="9.5" ry="3.6" transform="rotate(120 12 12)"/>'
    ),

    // ESTRATEGIA — par de cartas
    'pairs': svg(
      '<rect x="3.5" y="5.5" width="10" height="13.5" rx="1.6"/>' +
      '<rect x="10.5" y="2.5" width="10" height="13.5" rx="1.6"/>'
    ),

    // MEMORIA — red neuronal
    'neuralfragment': svg(
      '<circle cx="5" cy="6.5" r="2"/>' +
      '<circle cx="5" cy="17.5" r="2"/>' +
      '<circle cx="12.5" cy="12" r="2.2"/>' +
      '<circle cx="19" cy="12" r="2"/>' +
      '<path d="M6.7 7.6l4 3M6.7 16.4l4-3M14.7 12H17"/>'
    ),

    // MEMORIA — cuadrícula 3x3
    'memorygrid': svg(
      '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/>' +
      '<path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/>'
    ),

    // TIPEO — letra cayendo
    'letters': svg(
      '<path d="M5 18.5 9.5 5.5 14 18.5M6.6 14h5.8"/>' +
      '<path d="M18.5 7.5v8M16 13l2.5 2.5L21 13"/>'
    ),

    // PERCEPCIÓN — encajar forma en hueco
    'holematch': svg(
      '<rect x="3" y="3" width="9.5" height="9.5" rx="1.4" stroke-dasharray="2.6 2.2"/>' +
      '<rect x="11.5" y="11.5" width="9.5" height="9.5" rx="1.4"/>'
    ),

    // CIFRADO — candado
    'soup': svg(
      '<rect x="4" y="10" width="16" height="10.5" rx="2"/>' +
      '<path d="M7.5 10V7a4.5 4.5 0 0 1 9 0v3"/>' +
      '<path d="M12 14v3"/>'
    ),

    // MEMORIA — base de datos
    'datarecallgrid': svg(
      '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/>' +
      '<path d="M4.5 5.5v13c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8v-13"/>' +
      '<path d="M4.5 12c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8"/>'
    ),

    // ANÁLISIS — diagrama de color (Venn)
    'colorcount': svg(
      '<circle cx="9" cy="9.5" r="5"/>' +
      '<circle cx="15" cy="9.5" r="5"/>' +
      '<circle cx="12" cy="15" r="5"/>'
    ),

    // ANÁLISIS — bomba con mecha vertical
    'bombdefusal': svg(
      '<circle cx="11" cy="15.5" r="5.5"/>' +
      '<path d="M11 10V8M11 8h2.4"/>' +
      '<path d="M13.4 8c0-1.8 1-2.6 2.4-2.6s1.8.9 1.8 1.8"/>' +
      '<path d="M17.6 4.3l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5z" fill="currentColor" stroke="none"/>'
    ),

    // REFLEJOS — flecha
    'arrow': svg(
      '<path d="M12 20.5V4.5"/>' +
      '<path d="M5.5 11 12 4.5 18.5 11"/>'
    ),
  };

  global.GameIcons = {
    get(id) { return ICONS[id] || null; },
    has(id) { return Object.prototype.hasOwnProperty.call(ICONS, id); },
    all() { return Object.assign({}, ICONS); },
  };

}(window));
