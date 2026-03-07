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
 * @param {string} directionKeyword  - filtre sur le nom de destination (ex: 'LYON')
 * @param {number} count             - nombre max de résultats
 * @param {string} apiKey
 * @param {object} options
 * @param {boolean} options.omitLineRef - si true, ne passe pas LineRef à l'API (requis pour gares SNCF depuis 03/2025)
 * @returns {Promise<DeparturesResult>}
 */
export async function getNextDepartures(stopRef, lineRef, directionKeyword, count, apiKey, { omitLineRef = false } = {}) {
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

  // ── Filtrage directionnel ──────────────────────────────────────
  const filtered = directionKeyword
    ? linePool.filter(v => {
        const journey = v?.MonitoredVehicleJourney;
        const dest    = (journey?.DestinationName?.[0]?.value || '').toUpperCase();
        const dir     = (journey?.DirectionRef?.value || '').toUpperCase();
        return dest.includes(directionKeyword.toUpperCase())
          || dir.includes('1')
          || dir.includes('PARIS');
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
