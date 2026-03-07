/**
 * src/routes/rawApiRoutes.js
 * ─────────────────────────────────────────────────────────────────
 * Endpoints de debug : retourne les JSON bruts des APIs appelées.
 * Utile pour inspecter les réponses PRIM, Vélib, Open-Meteo.
 *
 * GET /api/raw                      → toutes les réponses agrégées
 * GET /api/raw/departures           → stop-monitoring (RER D, Maisons Alfort)
 * GET /api/raw/line-status/:lineKey → general-message (RERD ou METRO9)
 * GET /api/raw/velib                → station_status + station_information
 * GET /api/raw/weather              → Open-Meteo forecast
 * ─────────────────────────────────────────────────────────────────
 */

import { Router } from 'express';
import { primGet } from '../api/primClient.js';
import { LINES, STOPS } from '../../config/lines.js';
import fetch from 'node-fetch';

const router = Router();
const PRIM_BASE = 'https://prim.iledefrance-mobilites.fr/marketplace';
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

async function fetchDeparturesRaw(apiKey) {
  const stop = STOPS.MAISONS_ALFORT_ALFORTVILLE;
  const line = LINES.RERD;
  const params = stop.omitLineRef
    ? { MonitoringRef: stop.id }
    : { MonitoringRef: stop.id, LineRef: line.id };
  return primGet('stop-monitoring', params, apiKey);
}

async function fetchLineStatusRaw(lineKey, apiKey) {
  const line = LINES[lineKey] ?? LINES.RERD;
  return primGet('general-message', { LineRef: line.id }, apiKey);
}

async function fetchVelibRaw(apiKey) {
  const [status, info] = await Promise.all([
    fetch(`${PRIM_BASE}/velib/station_status.json`, { headers: { apiKey }, signal: AbortSignal.timeout(8000) }).then(r => r.json()),
    fetch(`${PRIM_BASE}/velib/station_information.json`, { headers: { apiKey }, signal: AbortSignal.timeout(8000) }).then(r => r.json()),
  ]);
  return { station_status: status, station_information: info };
}

async function fetchWeatherRaw() {
  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set('latitude', 48.8566);
  url.searchParams.set('longitude', 2.3522);
  url.searchParams.set('timezone', 'Europe/Paris');
  url.searchParams.set('current', 'temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,relative_humidity_2m,weather_code,precipitation');
  url.searchParams.set('hourly', 'temperature_2m,precipitation,weather_code');
  url.searchParams.set('forecast_days', '2');
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  return res.json();
}

function requireApiKey(req, res, next) {
  const apiKey = process.env.IDFM_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'IDFM_API_KEY non configurée' });
  }
  req.apiKey = apiKey;
  next();
}

// ── Routes unitaires ─────────────────────────────────────────────

router.get('/departures', requireApiKey, async (req, res) => {
  try {
    const data = await fetchDeparturesRaw(req.apiKey);
    res.json(data);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

router.get('/line-status/:lineKey', requireApiKey, async (req, res) => {
  const { lineKey } = req.params;
  const valid = ['RERD', 'METRO9'];
  if (!valid.includes(lineKey)) {
    return res.status(400).json({ error: `lineKey doit être RERD ou METRO9` });
  }
  try {
    const data = await fetchLineStatusRaw(lineKey, req.apiKey);
    res.json(data);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

router.get('/velib', requireApiKey, async (req, res) => {
  try {
    const data = await fetchVelibRaw(req.apiKey);
    res.json(data);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

router.get('/weather', async (req, res) => {
  try {
    const data = await fetchWeatherRaw();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Agrégation : toutes les réponses en un coup ───────────────────

router.get('/', requireApiKey, async (req, res) => {
  const results = {
    departures:   null,
    lineStatusRerd: null,
    lineStatusMetro9: null,
    velib:        null,
    weather:      null,
    errors:       {},
  };

  const tasks = [
    ['departures', () => fetchDeparturesRaw(req.apiKey)],
    ['lineStatusRerd', () => fetchLineStatusRaw('RERD', req.apiKey)],
    ['lineStatusMetro9', () => fetchLineStatusRaw('METRO9', req.apiKey)],
    ['velib', () => fetchVelibRaw(req.apiKey)],
    ['weather', () => fetchWeatherRaw()],
  ];

  const settled = await Promise.allSettled(tasks.map(([k, fn]) => fn().then(data => [k, data])));

  settled.forEach((result, i) => {
    const [key] = tasks[i];
    if (result.status === 'fulfilled') {
      results[result.value[0]] = result.value[1];
    } else {
      results[key] = null;
      results.errors[key] = result.reason?.message ?? 'Erreur inconnue';
    }
  });

  res.json(results);
});

export default router;
