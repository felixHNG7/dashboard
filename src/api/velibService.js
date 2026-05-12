/**
 * src/api/velibService.js
 * Vélib via l'API PRIM IDF Mobilités (clé API requise).
 *
 * Réduit les 429 : un seul couple status+info par rafraîchissement (même pour 2 stations),
 * requêtes séquentielles avec léger espacement, retry sur 429 avec backoff.
 */

import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const PRIM_BASE = 'https://prim.iledefrance-mobilites.fr/marketplace/velib';

const proxyUrl   = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : null;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function primFetch(endpoint, apiKey) {
  const maxAttempts = 5;
  let lastErr;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      const backoff = Math.min(400 * (2 ** (attempt - 2)), 10_000) + Math.floor(Math.random() * 200);
      await sleep(backoff);
    }

    const res = await fetch(`${PRIM_BASE}/${endpoint}`, {
      headers: { apiKey },
      signal:  AbortSignal.timeout(12_000),
      agent:   proxyAgent,
    });

    if (res.status === 429) {
      const ra = res.headers.get('retry-after');
      const sec = ra ? parseInt(ra, 10) : NaN;
      if (!Number.isNaN(sec) && sec > 0) {
        await sleep(Math.min(sec * 1000, 20_000));
      } else {
        await sleep(800 * attempt);
      }
      lastErr = new Error(`Vélib PRIM ${endpoint} HTTP 429`);
      continue;
    }

    if (!res.ok) throw new Error(`Vélib PRIM ${endpoint} HTTP ${res.status}`);
    return res.json();
  }

  throw lastErr ?? new Error(`Vélib PRIM ${endpoint} HTTP 429`);
}

/**
 * Télécharge une fois les deux jeux de données (évite 4 appels parallèles pour 2 stations).
 */
export async function fetchVelibDatasetsOnce(apiKey) {
  const statusData = await primFetch('station_status.json', apiKey);
  await sleep(120);
  const infoData = await primFetch('station_information.json', apiKey);
  return { statusData, infoData };
}

function buildStationFromDatasets({ statusData, infoData }, stationId) {
  const sid    = String(stationId);
  const status = statusData?.data?.stations?.find(s => String(s.stationCode) === sid);
  const info   = infoData?.data?.stations?.find(s => String(s.stationCode) === sid);

  if (!status) throw new Error(`Station Vélib ${sid} introuvable`);

  const types      = status.num_bikes_available_types ?? [];
  const mechanical = types.find(t => t.mechanical != null)?.mechanical
                  ?? status.num_bikes_available ?? 0;
  const electric   = types.find(t => t.ebike != null)?.ebike ?? 0;

  return {
    stationId:      sid,
    name:           info?.name ?? `Station ${sid}`,
    mechanical,
    electric,
    docksAvailable: status.num_docks_available ?? 0,
    capacity:       info?.capacity ?? (status.num_bikes_available + status.num_docks_available),
    isRenting:      status.is_renting === 1,
    fetchedAt:      new Date().toISOString(),
  };
}

/**
 * Données agrégées pour le widget (1 station ou 2 pour mécaniques / places).
 */
export async function getVelibModuleData({ stationId, docksStationId }, apiKey) {
  const datasets = await fetchVelibDatasetsOnce(apiKey);
  const main       = buildStationFromDatasets(datasets, stationId);
  if (!docksStationId) return main;
  const docks = buildStationFromDatasets(datasets, docksStationId);
  return {
    ...main,
    docksAvailable:   docks.docksAvailable,
    docksCapacity:    docks.capacity,
    docksStationName: docks.name,
  };
}

/** @deprecated Préférer getVelibModuleData ; conservé pour compatibilité */
export async function getVelibStation(stationId, apiKey) {
  return getVelibModuleData({ stationId }, apiKey);
}
