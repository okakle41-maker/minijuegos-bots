/* ============================================================
   Leaderboard — sistema de récords persistente por módulo
   ------------------------------------------------------------
   Guarda el mejor resultado de cada módulo en localStorage y
   actualiza el badge naranja (⬡ Xpts) de la carta correspondiente
   en el lobby. El badge solo aparece después de jugar esa carta
   por primera vez, y se refresca inmediatamente al guardar un
   nuevo récord (no hace falta recargar la página).
   ============================================================ */
(function () {
  const STORAGE_KEY = 'minijuegos_leaderboard';

  // Cómo formatear el valor guardado de cada módulo en el badge.
  const GAME_CONFIG = {
    termita:     { format: v => `${v} pts` },     // Puntuación total (aciertos)
    simon:       { format: v => `${v} rondas` },  // Rondas completadas
    arrow:       { format: v => `${v}%` },        // Porcentaje de precisión
    soup:        { format: v => `${v} racha` },   // Max streak (Hacking Device)
    letters:     { format: v => `${v} pts` },     // Puntuación máxima
    unlocked:    { format: v => `${v} rondas` },  // Rondas completadas correctamente
    skillchecks: { format: v => `${v} pts` }      // Puntuación en círculos
  };

  function readStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeStore(store) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      /* localStorage no disponible (modo privado, cuota, etc.) — se ignora */
    }
  }

  // Pinta (o esconde) el badge de cada carta según lo guardado.
  function renderBadges() {
    const store = readStore();
    document.querySelectorAll('.card-record-badge[data-record]').forEach(badge => {
      const key = badge.dataset.record;
      const record = store[key];
      const config = GAME_CONFIG[key];
      if (!record || !record.played || !config) {
        badge.hidden = true;
        badge.textContent = '';
        return;
      }
      badge.textContent = `⬡ ${config.format(record.value)}`;
      badge.hidden = false;
    });
  }

  // Llamado por cada juego al terminar una partida.
  // value = métrica relevante de ese módulo (ver tabla en GAME_CONFIG).
  function save(gameKey, value, total, meta) {
    const config = GAME_CONFIG[gameKey];
    if (!config) return null;

    const numericValue = Number(value) || 0;
    const store = readStore();
    const current = store[gameKey];
    const isNewRecord = !current || !current.played || numericValue > current.value;
    const finalValue = isNewRecord ? numericValue : current.value;

    store[gameKey] = {
      value: finalValue,
      total: total !== undefined ? total : (current ? current.total : undefined),
      meta: meta !== undefined ? meta : (current ? current.meta : undefined),
      played: true,
      updatedAt: Date.now()
    };

    writeStore(store);
    renderBadges();

    return { isNewRecord, value: finalValue };
  }

  function get(gameKey) {
    const store = readStore();
    return store[gameKey] || null;
  }

  /**
   * Permite que gameBootstrap (o cualquier otro módulo) extienda
   * GAME_CONFIG con los juegos declarados en gameRegistry.js,
   * sin tocar este archivo.
   *
   * @param {Object} extraConfig  — objeto { gameId: { format: fn }, … }
   */
  function patchConfig(extraConfig) {
    Object.assign(GAME_CONFIG, extraConfig);
    renderBadges();
  }

  window.Leaderboard = { save, get, renderBadges, _patchConfig: patchConfig };

  document.addEventListener('DOMContentLoaded', renderBadges);
})();
