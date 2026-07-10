/**
 * config/schedule.js
 * ─────────────────────────────────────────────────────────────────
 * Gestion des plages horaires et de la politique de rafraîchissement.
 *
 * QUOTA PRIM (clé gratuite) : ~20 000 appels/jour (voir quotaTracker.js : DAILY_LIMIT)
 * Le dashboard fait 5 appels PRIM par refresh :
 *   - stop-monitoring          (RER D horaires)
 *   - general-message × 2     (état RER D + Métro 9)
 *   - velib/station_status     (Vélib)
 *   - velib/station_information (Vélib)
 * La météo (Open-Meteo) et EDF Tempo (api-couleur-tempo.fr) sont gratuites
 * et hors quota PRIM.
 *
 * Budget avec les intervalles actuels (peak=15s, offPeak=30s, nuit suspendue) :
 *   - Heure de pointe (7h–10h, 3h) : toutes les 15s
 *       → 3h × 240 cycles/h × 5 appels = 3600 appels
 *   - Hors pointe (10h–1h, 15h)    : toutes les 30s
 *       → 15h × 120 cycles/h × 5 appels = 9000 appels
 *   - Nuit (1h–6h) : suspendu, 0 appel (réveil manuel possible depuis le client, voir client.js)
 *   - TOTAL ESTIMÉ : ~12 600 appels/jour (marge ~37% sur 20 000)
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

  // ── Plage nuit : pas de rafraîchissement automatique ───────────
  // (le client peut forcer un réveil temporaire, voir showNightOverlay/wake dans client.js)
  night: {
    startHour:  1,        // de 1h du matin…
    endHour:    6,        // …à 6h : rafraîchissement suspendu
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
 * Teste si `hour` tombe dans la plage nuit, que celle-ci traverse minuit
 * (ex. 23h→6h) ou non (ex. 1h→6h).
 */
function isNightHour(hour, night) {
  const { startHour, endHour } = night;
  if (startHour === endHour) return false;
  return startHour > endHour
    ? (hour >= startHour || hour < endHour)  // plage qui traverse minuit
    : (hour >= startHour && hour < endHour); // plage classique dans la même journée
}

/**
 * Retourne l'intervalle de rafraîchissement en secondes selon l'heure actuelle (Paris).
 * @returns {number|null} Intervalle en secondes, ou null si nuit (suspend)
 */
export function getCurrentInterval() {
  const { hour } = getParisClock();
  const { peak, offPeak, night } = SCHEDULE;

  if (isNightHour(hour, night)) {
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
  if (isNightHour(hour, night)) return 'night';
  if (hour >= peak.startHour && hour < peak.endHour) return 'peak';
  return 'offPeak';
}
