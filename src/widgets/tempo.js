/**
 * src/widgets/tempo.js
 * Widget : couleur tarifaire EDF Tempo et prix du kWh.
 */

import { getTempoColor } from '../api/tempoService.js';

export const tempoModule = {
  async fetch() {
    return getTempoColor();
  },

  render(data) {
    const { today, tomorrow, current } = data;

    const colorMap = {
      bleu:  { bg: '#1a5c9a', text: '#fff', label: 'Bleue' },
      blanc: { bg: '#e8e8e8', text: '#1a1a1a', label: 'Blanche' },
      rouge: { bg: '#c41e3a', text: '#fff', label: 'Rouge' },
      gris: { bg: '#353535', text: '#fff', label: 'Inconnu' },
    };

    const todayColor = colorMap[today.color] || colorMap.bleu;
    const tomorrowColor = colorMap[tomorrow.color] || colorMap.bleu;
    const currentPrice = current.price ? parseFloat(current.price).toFixed(2) : '—';

    return `
      <div class="card card--tempo">
        <div class="card-header">
          <div class="line-badge" style="background:#1a5c9a;color:#fff;font-size:1.4rem;width:42px;height:42px;">
            ⚡
          </div>
          <div class="line-info">
            <h2>Électricité</h2>
            <small>EDF Tempo</small>
          </div>
        </div>
        <div class="tempo-body">
          <div class="tempo-row">
            <div class="tempo-today" style="background:${todayColor.bg};color:${todayColor.text}">
              <div class="tempo-label">Aujourd'hui</div>
              <div class="tempo-color">${todayColor.label}</div>
              <div class="tempo-price">${currentPrice} € /kWh</div>
            </div>
          </div>
          <div class="tempo-divider"></div>
          <div class="tempo-row">
            <div class="tempo-tomorrow" style="background:${tomorrowColor.bg};color:${tomorrowColor.text}">
              <div class="tempo-label">Demain</div>
              <div class="tempo-color">${tomorrowColor.label}</div>
              <div class="tempo-date">${tomorrow.date}</div>
            </div>
          </div>
        </div>
      </div>`;
  },
};
