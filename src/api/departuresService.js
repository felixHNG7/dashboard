/**
 * src/api/departuresService.js
 * ─────────────────────────────────────────────────────────────────
 * Service métier : récupère et normalise les prochains départs
 * depuis un arrêt via l'endpoint SIRI stop-monitoring.
 * ─────────────────────────────────────────────────────────────────
 */

import { primGet } from './primClient.js';

/**
 * @typedef {Object} Departure
 * @property {string}  destination
 * @property {string}  missionCode     - code mission (ex: ZARA, ELBA…)
 * @property {string}  aimedTime       - ISO : heure théorique
 * @property {string}  expectedTime    - ISO : heure temps réel (peut être null)
 * @property {boolean} isRealtime
 * @property {number}  minutesUntil    - minutes avant départ (peut être négatif)
 */

/**
 * @typedef {Object} DeparturesResult
 * @property {Departure[]} departures
 * @property {string}      fetchedAt
 */

/**
 * Récupère les prochains passages à un arrêt pour une ligne donnée.
 * @param {string} stopRef           - MonitoringRef STIF
 * @param {string} lineRef           - LineRef STIF
 * @param {string} platformName      - filtre sur DeparturePlatformName (ex: '2B')
 * @param {number} count             - nombre max de résultats
 * @param {string} apiKey
 * @param {object} options
 * @param {boolean} options.omitLineRef - si true, ne passe pas LineRef à l'API (requis pour gares SNCF depuis 03/2025)
 * @returns {Promise<DeparturesResult>}
 */
export async function getNextDepartures(stopRef, lineRef, platformName, count, apiKey, { omitLineRef = false } = {}) {
  // ⚠️ Depuis mars 2025, l'API PRIM rejette le paramètre LineRef
  //    pour les gares SNCF. On le filtre côté client à la place.
  const params = omitLineRef
    ? { MonitoringRef: stopRef }
    : { MonitoringRef: stopRef, LineRef: lineRef };

  const data = await primGet('stop-monitoring', params, apiKey);

  const delivery = data?.Siri?.ServiceDelivery?.StopMonitoringDelivery;
  const visits   = [].concat(delivery || [])
    .flatMap(d => [].concat(d?.MonitoredStopVisit || []));

  // ── Filtrage par ligne (côté client si LineRef omis dans la requête) ──
  // L'API retourne toutes les lignes passant à l'arrêt : on filtre sur lineRef.
  const lineCode  = lineRef.match(/::([^:]+):/)?.[1] || '';  // extrait ex: C01728
  const byLine    = omitLineRef && lineCode
    ? visits.filter(v => {
        const ref = v?.MonitoredVehicleJourney?.LineRef?.value || '';
        return ref.includes(lineCode);
      })
    : visits;
  // Fallback si aucun résultat après filtrage (format lineRef inattendu)
  const linePool = byLine.length ? byLine : visits;

  // ── Filtrage par quai (DeparturePlatformName) ────────────────────
  const getPlatformName = (call) => {
    const raw = call?.DeparturePlatformName;
    if (typeof raw === 'string') return raw.trim();
    if (raw?.value) return String(raw.value).trim();
    if (Array.isArray(raw) && raw[0]?.value) return String(raw[0].value).trim();
    return '';
  };
  const filtered = platformName
    ? linePool.filter(v => {
        const call   = v?.MonitoredVehicleJourney?.MonitoredCall;
        const plat   = getPlatformName(call);
        return plat && plat.toUpperCase() === String(platformName).trim().toUpperCase();
      })
    : linePool;

  const pool = filtered.length ? filtered : linePool; // fallback si filtre trop restrictif

  // ── Normalisation & tri ───────────────────────────────────────
  const now = Date.now();

  const departures = pool
    .map(v => {
      const journey  = v?.MonitoredVehicleJourney;
      const call     = journey?.MonitoredCall;
      if (!call) return null;

      const aimed    = call.AimedDepartureTime    || call.AimedArrivalTime;
      const expected = call.ExpectedDepartureTime || call.ExpectedArrivalTime;
      const time     = expected || aimed;
      if (!time) return null;

      return {
        destination:  journey?.DestinationName?.[0]?.value || 'Destination inconnue',
        missionCode:  journey?.JourneyNote?.[0]?.value
                   || journey?.VehicleJourneyName?.[0]?.value
                   || '',
        aimedTime:    aimed,
        expectedTime: expected || null,
        isRealtime:   !!expected,
        minutesUntil: Math.round((new Date(time) - now) / 60_000),
      };
    })
    .filter(Boolean)
    .filter(d => d.minutesUntil > -1)    // exclure les départs passés
    .sort((a, b) => a.minutesUntil - b.minutesUntil)
    .slice(0, count);

  return { departures, fetchedAt: new Date().toISOString() };
}
