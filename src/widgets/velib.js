/**
 * src/widgets/velib.js
 * ─────────────────────────────────────────────────────────────────
 * Widget Vélib : disponibilité d'une station en temps réel.
 * ─────────────────────────────────────────────────────────────────
 */

import { getVelibStation } from '../api/velibService.js';

export const velibModule = {
  async fetch(context, apiKey) {
    const { stationId } = context;
    if (!stationId) throw new Error('stationId manquant dans la config du module Vélib');
    return getVelibStation(stationId, apiKey);
  },

  render(data) {
    const statusPill = data.isRenting
      ? `<div class="status-pill pill-ok"><span class="dot"></span>En service</div>`
      : `<div class="status-pill pill-err"><span class="dot"></span>Hors service</div>`;

    const mechLevel  = data.capacity > 0 ? Math.round((data.mechanical / data.capacity) * 100) : 0;
    const docksLevel = data.capacity > 0 ? Math.round((data.docksAvailable / data.capacity) * 100) : 0;

    const mechClass  = data.mechanical <= 2    ? 'level-low' : data.mechanical <= 5 ? 'level-mid' : 'level-ok';
    const docksClass = data.docksAvailable <= 2 ? 'level-low' : data.docksAvailable <= 5 ? 'level-mid' : 'level-ok';

    return `
      <div class="card card--velib">
        <div class="card-header">
          <div class="line-badge" style="background:#009a44;color:#fff;font-size:2rem;width:50px;height:50px;">
            🚲
          </div>
          <div class="line-info">
            <h2>Vélib'</h2>
            <small>${data.name}</small>
          </div>
          ${statusPill}
        </div>
        <div class="velib-body">

          <div class="velib-stat-row">
            <div class="velib-stat" ${mechClass}>
              <div class="velib-count ">${data.mechanical}</div>
              <div class="velib-label">Mécaniques</div>
              <div class="velib-bar-wrap">
                <div class="velib-bar-fill " style="width:${mechLevel}%"></div>
              </div>
            </div>

            <div class="velib-divider"></div>

            <div class="velib-stat">
              <div class="velib-count ${docksClass}">${data.docksAvailable}</div>
              <div class="velib-label">Places libres</div>
              <div class="velib-bar-wrap">
                <div class="velib-bar-fill ${docksClass}" style="width:${docksLevel}%"></div>
              </div>
            </div>
          </div>

          <div class="velib-capacity">Capacité totale : ${data.capacity} bornettes</div>
        </div>
      </div>`;
  },
};
