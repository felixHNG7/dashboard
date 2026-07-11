/**
 * src/widgets/nextDepartures.js
 * ─────────────────────────────────────────────────────────────────
 * Widget : prochains départs depuis un arrêt (stop-monitoring).
 * ─────────────────────────────────────────────────────────────────
 */

import { getNextDepartures } from '../api/departuresService.js';
import { getLineStatus } from '../api/lineStatusService.js';
import { STATUS_META } from './lineStatus.js';

export const nextDeparturesModule = {
  async fetch(context, apiKey) {
    const { line, stop, platformName = '', count = 3 } = context;
    const [departuresData, lineStatus] = await Promise.all([
      getNextDepartures(
        stop.id, line.id, platformName, count, apiKey,
        { omitLineRef: !!stop.omitLineRef }
      ),
      getLineStatus(line.id, apiKey),
    ]);
    return { ...departuresData, lineStatus };
  },

  render(data, context) {
    const { line, stop, platformName } = context;
    const { departures, lineStatus } = data;

    const subtitle = platformName
      ? `${stop.label} — Quai ${platformName}`
      : stop.label;

    const listHtml = departures.length
      ? departures.map((d, i) => renderDepartureRow(d, i)).join('')
      : `<div class="state-message">Aucun passage trouvé sur ce quai.</div>`;

    const meta = STATUS_META[lineStatus?.status] ?? STATUS_META.error;

    let statusHtml = '';
    if (lineStatus && lineStatus.status !== 'ok' && lineStatus.messages?.length) {
      const items = lineStatus.messages.map(m =>
        `<div class="status-msg-item">${m}</div>`
      ).join('');
      statusHtml = `
        <div class="status-messages-list status-messages-list--compact">
          <div class="perturbation-title">${meta.icon} Info trafic</div>
          ${items}
        </div>`;
    }

    return `
      <div class="card">
        <div class="card-header">
          <div class="line-badge" style="background:${line.color};color:${line.textColor}">
            ${line.badge}
          </div>
          <div class="line-info">
            <h2>Prochains ${line.label}</h2>
            <small>${subtitle}</small>
          </div>
          <div class="status-pill ${meta.pillClass}">
            <span class="dot"></span>
            <span>${meta.icon} ${meta.label}</span>
          </div>
        </div>
        <div class="passage-list">${listHtml}</div>
        ${statusHtml}
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

  const isNext = index === 0;

  return `
    <div class="passage-item${isNext ? ' passage-item--next' : ''}">
      <span class="passage-num">${index + 1}</span>
      <div>
        <div class="passage-dest">${destination}</div>
        ${missionHtml}
      </div>
      <div class="passage-time">
        <div class="time-wait ${timeClass}">${waitLabel}</div>
        <div class="time-main ${timeClass}">${displayTime}</div>
      </div>
    </div>`;
}

function formatTime(iso) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour:     '2-digit',
    minute:   '2-digit',
    timeZone: 'Europe/Paris',
  });
}

function formatWait(minutes) {
  if (minutes < 1)  return 'À quai';
  if (minutes === 1) return '1 min';
  return `${minutes} min`;
}
