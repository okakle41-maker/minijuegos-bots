/* ============================================================
   Transiciones entre vistas — fade-out de la vista actual seguido
   de fade-in de la nueva, envolviendo el window.showView ya
   existente. No modifica ningún juego individual.
   ------------------------------------------------------------
   180ms de salida (la vista actual se desvanece y baja 6px) →
   220ms de entrada (la nueva vista aparece y sube desde -6px).
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  // app.js (y potencialmente otros scripts) define/envuelve
  // window.showView dentro de su propio handler de DOMContentLoaded.
  // Si transitions.js intentara envolverlo en este mismo tick, podría
  // adelantarse y encontrar window.showView todavía sin definir.
  // Diferimos con setTimeout(0) para correr recién después de que
  // todos los handlers de DOMContentLoaded ya registrados hayan
  // terminado de ejecutarse.
  setTimeout(function () {
    const originalShowView = window.showView;

    if (typeof originalShowView !== 'function') {
      // No hay nada para envolver — no rompemos nada, simplemente
      // nos quedamos sin animación de transición.
      return;
    }

    const EXIT_MS = 180;
    const ENTER_MS = 220;
    let isTransitioning = false;

    window.showView = function (id) {
      const nextView = document.getElementById(id);
      const currentView = Array.from(document.querySelectorAll('.view'))
        .find(v => !v.classList.contains('hidden'));

      // Protección anti-doble-clic: si ya hay una transición en curso,
      // o no hay nada que animar (vista inexistente o ya estamos ahí),
      // aplicamos el cambio directo sin animar — así evitamos encadenar
      // animaciones rotas.
      if (isTransitioning || !nextView || currentView === nextView) {
        originalShowView(id);
        return;
      }

      isTransitioning = true;

      function enterNextView() {
        // La vista entrante se pone invisible (desplazada hacia arriba,
        // sin transición) antes de mostrarse, para que no haya
        // parpadeo al quitarle 'hidden'.
        nextView.classList.add('view--enter');
        originalShowView(id); // quita 'hidden' de nextView, lo agrega a currentView

        // Doble requestAnimationFrame: forzamos a que el navegador
        // pinte el estado inicial invisible antes de quitar la clase,
        // para que la transición a opacity:1/translateY(0) se anime
        // en vez de saltar directo al estado final.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            nextView.classList.remove('view--enter');
            setTimeout(() => {
              isTransitioning = false;
            }, ENTER_MS);
          });
        });
      }

      if (currentView) {
        currentView.classList.add('view--exit');
        setTimeout(() => {
          currentView.classList.remove('view--exit');
          enterNextView();
        }, EXIT_MS);
      } else {
        enterNextView();
      }
    };
  }, 0);
});
