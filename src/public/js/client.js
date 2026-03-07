/**
 * src/public/js/client.js
 * ─────────────────────────────────────────────────────────────────
 * Gestion côté navigateur :
 *   - Horloge temps réel
 *   - Planificateur de refresh intelligent (pic / hors-pic / nuit)
 *   - Compteur de quota affiché
 *   - Mode nuit : overlay + réveil automatique
 * ─────────────────────────────────────────────────────────────────
 */

// ── Horloge ──────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const clockEl = document.getElementById('clock-time');
  const dateEl  = document.getElementById('clock-date');
  if (clockEl) clockEl.textContent = now.toLocaleTimeString('fr-FR');
  if (dateEl)  dateEl.textContent  = now.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}
setInterval(updateClock, 1000);
updateClock();

// ── État du scheduler ─────────────────────────────────────────────
let refreshTimer     = null;
let countdownTimer   = null;
let nextRefreshAt    = null;
let currentSlot      = null;

// ── Récupère le statut (quota + planning) depuis le serveur ──────
async function fetchStatus() {
  try {
    const res  = await fetch('/api/status');
    return await res.json();
  } catch {
    return null;
  }
}

// ── Met à jour les indicateurs UI ────────────────────────────────
function updateStatusUI(status) {
  if (!status) return;

  // Badge de plage horaire
  const badge = document.getElementById('schedule-badge');
  if (badge) {
    const { currentSlot: slot, currentInterval } = status.schedule;
    const labels = { peak: '⚡ Heure de pointe', offPeak: '● Hors pointe', night: '◌ Mode nuit' };
    badge.className  = `schedule-badge ${slot}`;
    badge.innerHTML  = `<span class="dot"></span>${labels[slot] || slot}${currentInterval ? ` — ${currentInterval}s` : ''}`;
    currentSlot = slot;
  }

  // Barre de quota
  const { used, limit, remaining, percent } = status.quota;
  const fillEl  = document.getElementById('quota-fill');
  const labelEl = document.getElementById('quota-label');
  if (fillEl) {
    fillEl.style.width = `${Math.min(percent, 100)}%`;
    fillEl.className   = `quota-fill${percent >= 90 ? ' crit' : percent >= 70 ? ' warn' : ''}`;
  }
  if (labelEl) labelEl.textContent = `Quota : ${used} / ${limit} (${remaining} restants)`;

  // Bannière si quota proche
  const warningEl = document.getElementById('quota-warning');
  if (warningEl) {
    if (percent >= 90) {
      warningEl.textContent = `⚠ Quota presque épuisé : ${remaining} appels restants aujourd'hui. Le rafraîchissement va ralentir.`;
      warningEl.classList.add('visible');
    } else {
      warningEl.classList.remove('visible');
    }
  }

  return status.schedule;
}

// ── Mode nuit : affiche l'overlay ────────────────────────────────
function showNightOverlay(wakeHour) {
  const el = document.getElementById('night-overlay');
  if (!el) return;
  const wakeStr = `${String(wakeHour).padStart(2, '0')}:00`;
  el.querySelector('.wake-at').textContent   = `Rafraîchissement suspendu jusqu'à ${wakeStr}`;
  el.querySelector('.next-wake').textContent = `Prochain réveil à ${wakeStr}`;
  el.classList.add('visible');
}

function hideNightOverlay() {
  const el = document.getElementById('night-overlay');
  if (el) el.classList.remove('visible');
}

// ── Countdown jusqu'au prochain refresh ──────────────────────────
function startCountdown(intervalS) {
  if (countdownTimer) clearInterval(countdownTimer);
  nextRefreshAt = Date.now() + intervalS * 1000;

  countdownTimer = setInterval(() => {
    const el = document.getElementById('refresh-countdown');
    if (!el) return;
    const secs = Math.max(0, Math.round((nextRefreshAt - Date.now()) / 1000));
    el.textContent = secs > 0 ? `↻ dans ${secs}s` : '↻ chargement…';
  }, 500);
}

function stopCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  const el = document.getElementById('refresh-countdown');
  if (el) el.textContent = '— suspendu';
}

// ── Rafraîchissement du contenu ───────────────────────────────────
async function refreshDashboard() {
  try {
    const res  = await fetch('/api/modules');
    const data = await res.json();
    if (!res.ok) { console.error('Erreur refresh:', data.error); return; }

    const grid = document.getElementById('modules-grid');
    if (grid) grid.innerHTML = data.modulesHtml.join('');

    const lastEl = document.getElementById('last-update');
    if (lastEl) lastEl.textContent = new Date().toLocaleTimeString('fr-FR');
  } catch (err) {
    console.error('Erreur réseau refresh :', err);
  }
}

// ── Planificateur principal ───────────────────────────────────────
// Replanifie dynamiquement selon l'heure (pic / hors-pic / nuit)
async function schedule() {
  if (refreshTimer) clearTimeout(refreshTimer);

  const status   = await fetchStatus();
  const sched    = updateStatusUI(status);
  const interval = sched?.currentInterval ?? null;
  const slot     = sched?.currentSlot     ?? 'offPeak';

  if (slot === 'night' || interval === null) {
    // Mode nuit : overlay + vérification toutes les minutes
    showNightOverlay(sched?.peak?.startHour ?? 7);
    stopCountdown();
    refreshTimer = setTimeout(schedule, 60_000);
    return;
  }

  hideNightOverlay();

  // Refresh immédiat + replanification
  await refreshDashboard();
  startCountdown(interval);

  refreshTimer = setTimeout(schedule, interval * 1000);
}

// ── Démarrage ─────────────────────────────────────────────────────
schedule();
