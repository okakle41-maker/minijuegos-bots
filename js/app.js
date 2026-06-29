/**
 * ============================================================
 *  js/app.js — arranque de la aplicación (versión slim)
 * ============================================================
 *
 *  Qué hace este archivo:
 *    - Inicializar backgroundManager.
 *    - Llamar los initFn de los juegos legacy que aún usan el
 *      patrón initXxx(uiObject) en lugar de GameRegistry.register().
 *
 *  Qué ya NO hace (delegado a otros módulos):
 *    - showView / backToMenu        → js/core/viewManager.js
 *    - Hex tick, themes, ESC        → js/core/viewManager.js
 *    - Cartas del lobby, filtros    → js/gameBootstrap.js
 *    - Registro de juegos           → js/core/gameRegistry.js
 *
 *  Para migrar un juego del patrón legacy a GameRegistry:
 *    1. Añade GameRegistry.register({ id, init, stop, ... }) en el .js del juego.
 *    2. Marca sus elementos con data-ui="name" en index.html.
 *    3. Elimina su bloque initXxx({ ... }) de aquí.
 *    ¡Eso es todo!
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', function () {

  backgroundManager.init();

  // ── Todos los juegos migrados a GameRegistry.register() ─────────────────────
  // Ya no se necesitan bloques de inicialización legacy aquí.
  // Cada juego se auto-registra en su propio archivo JS.

});
