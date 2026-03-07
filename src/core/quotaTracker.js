/**
 * src/core/quotaTracker.js
 * ─────────────────────────────────────────────────────────────────
 * Suivi du nombre d'appels API effectués dans la journée.
 * Stockage en mémoire + fichier JSON pour persistance au redémarrage.
 * ─────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, '../../.quota-state.json');
const DAILY_LIMIT = 1000; // quota PRIM clé gratuite

let state = loadState();

function loadState() {
  try {
    if (existsSync(STATE_FILE)) {
      const raw  = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
      const today = todayKey();
      // Remet à zéro si le fichier date d'un autre jour
      if (raw.date === today) return raw;
    }
  } catch { /* ignore */ }
  return { date: todayKey(), count: 0, lastReset: new Date().toISOString() };
}

function saveState() {
  try { writeFileSync(STATE_FILE, JSON.stringify(state), 'utf8'); } catch { /* ignore */ }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function checkAndReset() {
  const today = todayKey();
  if (state.date !== today) {
    state = { date: today, count: 0, lastReset: new Date().toISOString() };
    saveState();
  }
}

/**
 * Incrémente le compteur d'appels.
 * @param {number} calls - nombre d'appels effectués (défaut: 1)
 */
export function trackCalls(calls = 1) {
  checkAndReset();
  state.count += calls;
  saveState();
}

/**
 * Retourne les statistiques de quota.
 */
export function getQuotaStats() {
  checkAndReset();
  return {
    used:      state.count,
    limit:     DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - state.count),
    percent:   Math.round((state.count / DAILY_LIMIT) * 100),
    date:      state.date,
  };
}

/**
 * Retourne true si le quota est dépassé.
 */
export function isQuotaExceeded() {
  checkAndReset();
  return state.count >= DAILY_LIMIT;
}
