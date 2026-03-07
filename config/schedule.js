/**
 * config/schedule.js
 * ─────────────────────────────────────────────────────────────────
 * Gestion des plages horaires et de la politique de rafraîchissement.
 *
 * QUOTA PRIM (clé gratuite créée après mars 2024) : 1 000 appels/jour
 * Le dashboard fait désormais 5 appels PRIM par refresh :
 *   - stop-monitoring          (RER D horaires)
 *   - general-message × 2     (état RER D + Métro 9)
 *   - velib/station_status     (Vélib)
 *   - velib/station_information (Vélib)
 * La météo (Open-Meteo) est gratuite et sans quota PRIM.
 *
 * Budget recommandé :
 *   - Heure de pointe (7h–10h, 3h) : toutes les 90s
 *       → 3h × 40 cycles/h × 5 appels = 600 appels
 *   - Hors pointe                   : toutes les 10min
 *       → 21h × 6 cycles/h × 5 appels = 630 appels
 *   - TOTAL ESTIMÉ : ~1230 appels/jour → dépasse le quota !
 *
 * ⚠ Ajustement nécessaire avec 5 appels/refresh :
 *   - Heure de pointe : toutes les 120s
 *       → 3h × 30 cycles/h × 5 appels = 450 appels
 *   - Hors pointe     : toutes les 15min
 *       → 21h × 4 cycles/h × 5 appels = 420 appels
 *   - TOTAL ESTIMÉ : ~870 appels/jour  (marge ~13%)
 * ─────────────────────────────────────────────────────────────────
 */

export const SCHEDULE = {
  // ── Plage de pointe ────────────────────────────────────────────
  peak: {
    startHour:  7,
    endHour:    10,
    intervalS:  30,   
  },
  offPeak: {
    intervalS:  60,     
  },

  // ── Plage nuit : pas de rafraîchissement ──────────────────────
  // (optionnel – économise le quota la nuit)
  night: {
    startHour:  23,       // de 23h…
    endHour:    6,       // …à 6h : rafraîchissement suspendu
    intervalS:  null,    // null = pas de refresh automatique
  },
};

/**
 * Retourne l'intervalle de rafraîchissement en secondes selon l'heure actuelle.
 * @returns {number|null} Intervalle en secondes, ou null si nuit (suspend)
 */
export function getCurrentInterval() {
  const hour = new Date().getHours();
  const { peak, offPeak, night } = SCHEDULE;

  if (hour >= night.startHour && hour < night.endHour) {
    return night.intervalS; // null → suspend
  }
  if (hour >= peak.startHour && hour < peak.endHour) {
    return peak.intervalS;
  }
  return offPeak.intervalS;
}

/**
 * Retourne la plage active : 'peak' | 'offPeak' | 'night'
 */
export function getCurrentSlot() {
  const hour = new Date().getHours();
  const { peak, night } = SCHEDULE;
  if (hour >= night.startHour && hour < night.endHour) return 'night';
  if (hour >= peak.startHour  && hour < peak.endHour)  return 'peak';
  return 'offPeak';
}
