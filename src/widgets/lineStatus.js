/**
 * src/widgets/lineStatus.js
 */

import { getLineStatus } from '../api/lineStatusService.js';

export const STATUS_META = {
  ok:        { label: 'Normal',    pillClass: 'pill-ok',   icon: '✓' },
  warning:   { label: 'Info',      pillClass: 'pill-warn', icon: '⚠' },
  disrupted: { label: 'Perturbé',  pillClass: 'pill-err',  icon: '✕' },
  error:     { label: 'Erreur',    pillClass: 'pill-err',  icon: '!' },
};

export const lineStatusModule = {
  async fetch(context, apiKey) {
    return getLineStatus(context.line.id, apiKey);
  },

  render(data, context) {
    const { line } = context;
    const meta     = STATUS_META[data.status] ?? STATUS_META.error;

    let bodyHtml;
    if (!data.messages.length) {
      bodyHtml = `<div class="status-ok-msg">✓ Trafic normal</div>`;
    } else {
      // Chaque message sur une ligne, scrollable si la case est petite
      const items = data.messages.map(m =>
        `<div class="status-msg-item">${m}</div>`
      ).join('');
      bodyHtml = `
        <div class="status-messages-list">
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
            <h2>${line.label}</h2>
            <small>État du trafic</small>
          </div>
          <div class="status-pill ${meta.pillClass}">
            <span class="dot"></span>
            <span>${meta.label}</span>
          </div>
        </div>
        ${bodyHtml}
      </div>`;
  },
};
