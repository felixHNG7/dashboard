/**
 * src/api/weatherService.js
 * ─────────────────────────────────────────────────────────────────
 * Météo via Open-Meteo /v1/forecast (modèle best_match, inclut MF).
 *
 * Correction fondamentale :
 *  - Les valeurs ACTUELLES viennent de data.current.* — jamais du tableau hourly.
 *  - Les timestamps hourly retournés par l'API (avec timezone=Europe/Paris)
 *    sont des strings locales "YYYY-MM-DDTHH:MM". On les compare à
 *    data.current.time (même format) sans aucun calcul d'offset manuel.
 *  - On ne fait PAS Math.round() ni new Date(localString) — on parse
 *    directement la partie HH des strings.
 * ─────────────────────────────────────────────────────────────────
 */

import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

// Réutiliser l'agent proxy si configuré
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : null;

const WMO_CODES = {
  0:  { label: 'Ciel dégagé',          emoji: '☀️'  },
  1:  { label: 'Peu nuageux',           emoji: '🌤️' },
  2:  { label: 'Partiellement nuageux', emoji: '⛅'  },
  3:  { label: 'Couvert',              emoji: '☁️'  },
  45: { label: 'Brouillard',           emoji: '🌫️' },
  48: { label: 'Brouillard givrant',   emoji: '🌫️' },
  51: { label: 'Bruine légère',        emoji: '🌦️' },
  53: { label: 'Bruine modérée',       emoji: '🌦️' },
  55: { label: 'Bruine forte',         emoji: '🌧️' },
  61: { label: 'Pluie légère',         emoji: '🌧️' },
  63: { label: 'Pluie modérée',        emoji: '🌧️' },
  65: { label: 'Pluie forte',          emoji: '🌧️' },
  71: { label: 'Neige légère',         emoji: '🌨️' },
  73: { label: 'Neige modérée',        emoji: '❄️'  },
  75: { label: 'Neige forte',          emoji: '❄️'  },
  80: { label: 'Averses légères',      emoji: '🌦️' },
  81: { label: 'Averses modérées',     emoji: '🌧️' },
  82: { label: 'Averses violentes',    emoji: '⛈️'  },
  95: { label: 'Orage',               emoji: '⛈️'  },
  99: { label: 'Orage violent',        emoji: '🌩️' },
};

function decodeWmo(code) {
  return WMO_CODES[code] ?? { label: 'Inconnu', emoji: '❓' };
}

function degToCompass(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round((deg ?? 0) / 45) % 8];
}

export async function getWeather(lat, lon) {
  const url = new URL(BASE_URL);
  url.searchParams.set('latitude',  lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('timezone',  'Europe/Paris');
  // best_match utilise AROME (1.3 km) pour la France = même source que MF
  // mais via l'endpoint stable /v1/forecast
  url.searchParams.set('current', [
    'temperature_2m',
    'apparent_temperature',
    'wind_speed_10m',
    'wind_direction_10m',
    'relative_humidity_2m',
    'weather_code',
    'precipitation',
  ].join(','));
  url.searchParams.set('hourly', [
    'temperature_2m',
    'precipitation',
    'weather_code',
  ].join(','));
  url.searchParams.set('forecast_days', '2');

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000), agent: proxyAgent });
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const data = await res.json();

  const cur    = data.current;
  const hourly = data.hourly;

  // ── Valeurs actuelles : directement depuis data.current ──────────
  // current.time peut être "2026-03-05T14:00" ou "2026-03-05T23:15" (avec minutes)
  // hourly.time n'a que des heures pleines "2026-03-05T14:00" → on normalise
  const currentTimeStr = cur.time;
  const currentHourSlot = currentTimeStr.slice(0, 13) + ':00'; // "2026-03-05T23:15" → "2026-03-05T23:00"
  const todayDate      = currentTimeStr.slice(0, 10);

  // ── Index horaire : crénau horaire contenant l'heure actuelle ─────
  const currentHourIdx = hourly.time.indexOf(currentHourSlot);
  const baseIdx = currentHourIdx >= 0 ? currentHourIdx : 0;

  // ── Pluie prévue dans les 3 prochaines heures ────────────────────
  const precipNext3h = hourly.precipitation
    .slice(baseIdx + 1, baseIdx + 4)
    .reduce((s, v) => s + (v ?? 0), 0);

  const JOURS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
  const [y, m, d] = todayDate.split('-').map(Number);
  const tomorrow = new Date(y, m - 1, d + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  const formatTimeLabel = (timeStr) => {
    const forecastDate = timeStr.slice(0, 10);
    const hour         = parseInt(timeStr.slice(11, 13), 10) || 0;
    const hourStr      = `${hour}h`;
    if (forecastDate === todayDate) return hourStr;
    if (forecastDate === tomorrowStr) return `Demain ${hourStr}`;
    const dayName = JOURS[new Date(forecastDate + 'T12:00:00').getDay()];
    return `${dayName} ${hourStr}`;
  };

  // ── Prévisions toutes les 2h sur 6 points (à partir de l'heure actuelle) ──
  // Date prise en compte : "Demain 0h" quand minuit est le lendemain
  const forecasts = [];
  for (let i = 0; i < 6; i++) {
    const idx = baseIdx + i * 2;
    if (!hourly.time[idx]) break;
    const timeStr   = hourly.time[idx];
    const timeLabel = formatTimeLabel(timeStr);
    const w         = decodeWmo(hourly.weather_code[idx] ?? 0);
    forecasts.push({
      time:   timeLabel,
      temp:   Math.round(hourly.temperature_2m[idx] ?? 0),
      precip: Math.round((hourly.precipitation[idx] ?? 0) * 10) / 10,
      emoji:  w.emoji,
      label:  w.label,
    });
  }

  const wmo = decodeWmo(cur.weather_code);

  return {
    // Température : directement depuis current, jamais du tableau hourly
    temp:         Math.round(cur.temperature_2m),
    feelsLike:    Math.round(cur.apparent_temperature),
    windSpeed:    Math.round(cur.wind_speed_10m),
    windDir:      degToCompass(cur.wind_direction_10m),
    humidity:     cur.relative_humidity_2m,
    emoji:        wmo.emoji,
    label:        wmo.label,
    precipNext3h: Math.round(precipNext3h * 10) / 10,
    hourly:       forecasts,
    fetchedAt:    new Date().toISOString(),
  };
}
