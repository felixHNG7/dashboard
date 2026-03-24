/**
 * src/api/tempoService.js
 * Récupère la couleur tarifaire EDF Tempo et le prix du kWh.
 * Utilise l'API api-couleur-tempo.fr (gratuite, sans clé).
 */

import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const API_BASE = 'https://www.api-couleur-tempo.fr/api';

// Réutiliser l'agent proxy si configuré
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : null;

async function tempoFetch(endpoint) {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    signal:  AbortSignal.timeout(10000),
    agent:   proxyAgent,
  });
  if (!res.ok) throw new Error(`Tempo API HTTP ${res.status}`);
  return res.json();
}

export async function getTempoColor() {
  const [today, tomorrow, now] = await Promise.all([
    tempoFetch('jourTempo/today'),
    tempoFetch('jourTempo/tomorrow'),
    tempoFetch('now'),
  ]);

  return {
    today: {
      color:  getColorLabel(today.codeJour),
      date:   today.dateJour,
      period: today.periode,
    },
    tomorrow: {
      color:  getColorLabel(tomorrow.codeJour),
      date:   tomorrow.dateJour,
      period: tomorrow.periode,
    },
    current: {
      colorCode:   now.codeCouleur,
      hourCode:    now.codeHoraire,
      price:       now.tarifKwh,
      label:       now.libTarif,
      applicableIn: now.applicableIn,
    },
    fetchedAt: new Date().toISOString(),
  };
}

function getColorLabel(code) {
  switch (code) {
    case 1: return 'bleu';
    case 2: return 'blanc';
    case 3: return 'rouge';
    case 0: return 'gris';
    default: return 'gris';
  }
}
