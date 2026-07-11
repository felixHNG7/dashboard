/**
 * src/widgets/weather.js
 * ─────────────────────────────────────────────────────────────────
 * Widget météo : température, ressenti, vent, pluie + prévisions horaires
 * sur 24h (défilement latéral).
 * ─────────────────────────────────────────────────────────────────
 */

import { getWeather } from '../api/weatherService.js';

export const weatherModule = {
  async fetch(context) {
    const { lat = 48.8566, lon = 2.3522 } = context; // Paris par défaut
    return getWeather(lat, lon);
  },

  render(data) {
    const rainAlert = data.precipNext3h > 0
      ? `<div class="weather-rain-alert">🌧 ${data.precipNext3h} mm attendus dans les 3 prochaines heures</div>`
      : '';

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
          </div>
          ${rainAlert}
          <div class="forecast-row">
            ${forecastHtml}
          </div>
        </div>
      </div>`;
  },
};
