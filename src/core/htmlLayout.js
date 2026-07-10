import { DASHBOARD_CONFIG } from '../../config/dashboard.js';
import { SCHEDULE }         from '../../config/schedule.js';

export function renderLayout(modulesHtml) {
  const { title } = DASHBOARD_CONFIG;
  const { peak }  = SCHEDULE;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="theme-color" content="#0a0a0f" />
  <title>${title}</title>
  <link rel="stylesheet" href="/css/dashboard.css" />
</head>
<body>

  <div class="night-overlay" id="night-overlay">
    <div class="moon">🌙</div>
    <div class="wake-at">Rafraîchissement suspendu</div>
    <div class="next-wake">Réveil à ${String(peak.startHour).padStart(2,'0')}:00</div>
    <button type="button" class="wake-btn" id="wake-btn">Réveiller (5 min)</button>
  </div>

  <div class="quota-warning" id="quota-warning"></div>

  <header class="header">
    <div class="header-left">
      <div class="schedule-badge" id="schedule-badge"><span class="dot"></span>—</div>
      <div class="quota-bar-wrap">
        <div class="quota-label"><span id="quota-label">Quota —</span></div>
        <div class="quota-bar"><div class="quota-fill" id="quota-fill" style="width:0%"></div></div>
      </div>
    </div>
    <div class="header-clock">
      <div class="clock-time" id="clock-time">--:--:--</div>
      <div class="clock-date" id="clock-date">--</div>
    </div>
  </header>

  <div class="dashboard-grid" id="modules-grid">
    ${modulesHtml.join('\n    ')}
  </div>

  <footer class="footer">
    <span><a href="https://prim.iledefrance-mobilites.fr" target="_blank">PRIM IDFM</a> · <a href="https://open-meteo.com" target="_blank">Open-Meteo</a> · <a href="https://www.velib-metropole.fr" target="_blank">Vélib'</a></span>
    <div class="footer-right">
      <span>Mise à jour : <span id="last-update">—</span></span>
      <span id="refresh-countdown">—</span>
    </div>
  </footer>

  <script src="/js/client.js"></script>
</body>
</html>`;
}
