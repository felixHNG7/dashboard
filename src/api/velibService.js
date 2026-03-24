/**
 * src/api/velibService.js
 * Vélib via l'API PRIM IDF Mobilités (clé API requise).
 */

import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const PRIM_BASE = 'https://prim.iledefrance-mobilites.fr/marketplace/velib';

// Réutiliser l'agent proxy si configuré
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : null;

async function primFetch(endpoint, apiKey) {
  const res = await fetch(`${PRIM_BASE}/${endpoint}`, {
    headers: { apiKey },
    signal:  AbortSignal.timeout(8000),
    agent:   proxyAgent,
  });
  if (!res.ok) throw new Error(`Vélib PRIM ${endpoint} HTTP ${res.status}`);
  return res.json();
}

export async function getVelibStation(stationId, apiKey) {
  const sid = String(stationId);

  const [statusData, infoData] = await Promise.all([
    primFetch('station_status.json', apiKey),
    primFetch('station_information.json', apiKey),
  ]);

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
