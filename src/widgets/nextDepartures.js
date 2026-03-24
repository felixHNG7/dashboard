/**
 * src/widgets/nextDepartures.js
 * ─────────────────────────────────────────────────────────────────
 * Widget : prochains départs depuis un arrêt (stop-monitoring).
 * ─────────────────────────────────────────────────────────────────
 */

import { getNextDepartures } from '../api/departuresService.js';

export const nextDeparturesModule = {
  async fetch(context, apiKey) {
    const { line, stop, platformName = '', count = 3 } = context;
    return getNextDepartures(
      stop.id, line.id, platformName, count, apiKey,
      { omitLineRef: !!stop.omitLineRef }
    );
  },

  render(data, context) {
    const { line, stop, platformName, count } = context;
    const { departures } = data;

    const subtitle = platformName
      ? `${stop.label}`
      : stop.label;

    const listHtml = departures.length
      ? departures.map((d, i) => renderDepartureRow(d, i)).join('')
      : `<div class="state-message">Aucun passage trouvé sur ce quai.</div>`;

    const pillLabel = departures.length
      ? formatWait(departures[0].minutesUntil)
      : 'Aucun';
    const pillClass = departures.length ? 'pill-ok' : 'pill-warn';

    return `
      <div class="card">
        <div class="card-header">
          <div class="line-badge" style="background:${line.color};color:${line.textColor}">
            ${line.badge}
          </div>
          <div class="line-info">
            <h2>Prochains ${line.label}</h2>
          </div>
          <div class="status-pill ${pillClass}">
            <span class="dot"></span>
            <span>${pillLabel}</span>
          </div>
        </div>
        <div class="passage-list">${listHtml}</div>
      </div>`;
  },
};

// ─── Helpers de rendu ────────────────────────────────────────────

function renderDepartureRow(departure, index) {
  const { destination, missionCode, expectedTime, aimedTime, isRealtime, minutesUntil } = departure;
  const displayTime  = formatTime(expectedTime || aimedTime);
  const waitLabel    = formatWait(minutesUntil);
  const timeClass    = minutesUntil <= 2 ? 'time-imminent' : minutesUntil <= 5 ? 'time-soon' : '';
  const missionHtml  = missionCode
    ? `<div class="passage-mission">${missionCode}${isRealtime ? '' : ' · théorique'}</div>`
    : '';

  return `
    <div class="passage-item">
      <span class="passage-num">${index + 1}</span>
      <div>
        <div class="passage-dest">${destination}</div>
        ${missionHtml}
      </div>
      <div class="passage-time">
        <div class="time-main ${timeClass}">${displayTime}</div>
        <div class="time-wait ${timeClass}">${waitLabel}</div>
      </div>
    </div>`;
}

function formatTime(iso) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatWait(minutes) {
  if (minutes < 1)  return 'À quai';
  if (minutes === 1) return 'dans 1 min';
  return `dans ${minutes} min`;
}
