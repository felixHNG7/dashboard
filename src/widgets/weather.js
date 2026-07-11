/**
 * src/widgets/weather.js
 * ─────────────────────────────────────────────────────────────────
 * Widget météo : température, ressenti, vent, pluie + prévisions horaires
 * sur 24h (défilement latéral).
 * ─────────────────────────────────────────────────────────────────
 */

import { getWeather } from '../api/weatherService.js';

const SPARK_W     = 200;
const SPARK_H     = 40;
const SPARK_PAD   = 4;
const MARKER_STEP = 4; // un marqueur (point + heure) toutes les 4h

function buildFeelsLikeSparkline(hourly) {
  const values = hourly.map(h => h.feelsLike);
  if (values.length < 2) return '';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (SPARK_W - SPARK_PAD * 2) + SPARK_PAD;
    const y = SPARK_H - SPARK_PAD - ((v - min) / range) * (SPARK_H - SPARK_PAD * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${SPARK_H} L${points[0].x.toFixed(1)},${SPARK_H} Z`;

  const markerIdx = points.map((_, i) => i).filter(i => i % MARKER_STEP === 0);

  const dotsSvg = markerIdx.map(i => `<circle cx="${points[i].x.toFixed(1)}" cy="${points[i].y.toFixed(1)}" r="2.2" fill="var(--blue)" stroke="var(--surface)" stroke-width="1" />`).join('');

  // Étiquettes horaires en HTML (positionnées en %), pas en <text> SVG : le
  // viewBox est étiré non-uniformément (preserveAspectRatio="none"), ce qui
  // déformerait des glyphes de texte.
  const labelsHtml = markerIdx.map(i => {
    const fraction = i / (values.length - 1);
    const align = fraction < 0.08 ? 'left' : fraction > 0.92 ? 'right' : 'center';
    const translateX = align === 'left' ? '0%' : align === 'right' ? '-100%' : '-50%';
    return `<span class="weather-trend-tick" style="left:${(fraction * 100).toFixed(1)}%; transform: translateX(${translateX});">${hourly[i].time}</span>`;
  }).join('');

  return `
    <div class="weather-trend">
      <div class="weather-trend-header">
        <span class="weather-trend-label">Ressenti 24h</span>
        <span class="weather-trend-minmax">${min}° / ${max}°</span>
      </div>
      <svg class="weather-trend-svg" viewBox="0 0 ${SPARK_W} ${SPARK_H}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--blue)" stop-opacity="0.35" />
            <stop offset="100%" stop-color="var(--blue)" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path d="${areaPath}" fill="url(#trendFill)" stroke="none" />
        <path d="${linePath}" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
        ${dotsSvg}
      </svg>
      <div class="weather-trend-ticks">${labelsHtml}</div>
    </div>`;
}

export const weatherModule = {
  async fetch(context) {
    const { lat = 48.8566, lon = 2.3522 } = context; // Paris par défaut
    return getWeather(lat, lon);
  },

  render(data) {
    const rainAlert = data.precipNext3h > 0
      ? `<div class="weather-rain-alert">🌧 ${data.precipNext3h} mm attendus dans les 3 prochaines heures</div>`
      : '';

    const trendHtml = buildFeelsLikeSparkline(data.hourly);

    const forecastHtml = data.hourly.map(h => `
      <div class="forecast-item">
        <span class="forecast-time">${h.time}</span>
        <span class="forecast-emoji">${h.emoji}</span>
        <span class="forecast-temp">${h.temp}°</span>
        ${h.precip > 0 ? `<span class="forecast-precip">${h.precip}mm</span>` : '<span class="forecast-precip">—</span>'}
      </div>`).join('');

    return `
      <div class="card card--weather">
        <div class="weather-body">
          <div class="weather-main">
            <div class="weather-temp">${data.temp}<span class="weather-unit">°C</span></div>
            <div class="weather-details">
              <div class="weather-detail">
                <span class="detail-icon">🌡</span>
                <span>Ressenti <strong>${data.feelsLike}°C</strong></span>
              </div>
              <div class="weather-detail">
                <span class="detail-icon">💨</span>
                <span>Vent <strong>${data.windSpeed} km/h ${data.windDir}</strong></span>
              </div>
              <div class="weather-detail">
                <span class="detail-icon">💧</span>
                <span>Humidité <strong>${data.humidity}%</strong></span>
              </div>
            </div>
            ${trendHtml}
          </div>
          ${rainAlert}
          <div class="forecast-row">
            ${forecastHtml}
          </div>
        </div>
      </div>`;
  },
};
