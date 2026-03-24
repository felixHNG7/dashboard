/**
 * src/api/primClient.js
 * ─────────────────────────────────────────────────────────────────
 * Client HTTP bas niveau pour l'API PRIM (IDF Mobilités).
 * Responsabilité unique : faire des requêtes HTTP et retourner du JSON.
 * ─────────────────────────────────────────────────────────────────
 */

import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { trackCalls } from '../core/quotaTracker.js';

const PRIM_BASE_URL = 'https://prim.iledefrance-mobilites.fr/marketplace';

// Créer un agent proxy si HTTPS_PROXY est configuré
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTPS_PROXY;
const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : null;

export class PrimApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'PrimApiError';
    this.status = status;
  }
}

/**
 * Effectue une requête GET vers l'API PRIM.
 * @param {string} endpoint - ex: 'general-message', 'stop-monitoring'
 * @param {Record<string, string>} params - query params
 * @param {string} apiKey
 * @returns {Promise<object>} JSON parsé
 */
export async function primGet(endpoint, params, apiKey) {
  const url = new URL(`${PRIM_BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const response = await fetch(url.toString(), {
    headers: { apiKey },
    signal:  AbortSignal.timeout(8000), // timeout 8s
    agent:   proxyAgent,
  });

  if (!response.ok) {
    throw new PrimApiError(
      `Réponse API invalide : HTTP ${response.status} pour ${endpoint}`,
      response.status
    );
  }

  trackCalls(1);
  return response.json();
}
