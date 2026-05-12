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
    intervalS:  15,   
  },
  offPeak: {
    intervalS:  30,     
  },

  // ── Plage nuit : pas de rafraîchissement ──────────────────────
  // (optionnel – économise le quota la nuit)
  night: {
    startHour:  23,       // de 23h…
    endHour:    6,       // …à 6h : rafraîchissement suspendu
    intervalS:  null,    // null = pas de refresh automatique
  },
};

const PARIS_TZ = 'Europe/Paris';

/**
 * Heure locale Paris (alignée sur l’usage IDF du dashboard).
 */
export function getParisClock(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone:     PARIS_TZ,
    hour:         'numeric',
    minute:       'numeric',
    second:       'numeric',
    hour12:       false,
  });
  const parts = fmt.formatToParts(date);
  const n = type => parseInt(parts.find(p => p.type === type)?.value ?? '0', 10);
  return { hour: n('hour'), minute: n('minute'), second: n('second') };
}

/**
 * Millisecondes jusqu’au prochain instant où la plage (nuit / pointe / hors pointe) peut changer.
 * Utilisé pour replanifier le refresh avant le prochain changement de créneau.
 */
export function getMsUntilNextScheduleBoundaryMs(date = new Date()) {
  const { hour, minute, second } = getParisClock(date);
  const secFromMidnight = hour * 3600 + minute * 60 + second;
  const { peak, night } = SCHEDULE;
  const boundarySecs = [
    night.endHour * 3600,
    peak.startHour * 3600,
    peak.endHour * 3600,
    night.startHour * 3600,
  ].sort((a, b) => a - b);

  for (const b of boundarySecs) {
    if (b > secFromMidnight) return (b - secFromMidnight) * 1000;
  }
  return (86400 - secFromMidnight + boundarySecs[0]) * 1000;
}

/**
 * Retourne l'intervalle de rafraîchissement en secondes selon l'heure actuelle (Paris).
 * @returns {number|null} Intervalle en secondes, ou null si nuit (suspend)
 */
export function getCurrentInterval() {
  const { hour } = getParisClock();
  const { peak, offPeak, night } = SCHEDULE;

  if (hour >= night.startHour || hour < night.endHour) {
    return night.intervalS; // null → suspend
  }
  if (hour >= peak.startHour && hour < peak.endHour) {
    return peak.intervalS;
  }
  return offPeak.intervalS;
}

/**
 * Retourne la plage active : 'peak' | 'offPeak' | 'night' (heure Paris).
 */
export function getCurrentSlot() {
  const { hour } = getParisClock();
  const { peak, night } = SCHEDULE;
  if (hour >= night.startHour || hour < night.endHour) return 'night';
  if (hour >= peak.startHour && hour < peak.endHour) return 'peak';
  return 'offPeak';
}
