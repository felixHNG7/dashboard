/**
 * src/server.js
 */

import 'dotenv/config';
import express           from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { renderAllModules }                           from './core/dashboardRenderer.js';
import { renderLayout }                               from './core/htmlLayout.js';
import { getQuotaStats }                              from './core/quotaTracker.js';
import {
  getCurrentInterval,
  getCurrentSlot,
  getMsUntilNextScheduleBoundaryMs,
  SCHEDULE,
} from '../config/schedule.js';
import rawApiRoutes                                   from './routes/rawApiRoutes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app       = express();
const PORT      = process.env.PORT || 3000;
const API_KEY   = process.env.IDFM_API_KEY;

app.use(express.static(join(__dirname, 'public')));
app.use('/api/raw', rawApiRoutes);

app.get('/', async (req, res) => {
  if (!API_KEY) return res.status(500).send(missingKeyPage());
  try {
    const { modulesHtml, errors } = await renderAllModules(API_KEY);
    if (errors.length) console.warn('Erreurs partielles :', errors);
    res.send(renderLayout(modulesHtml));
  } catch (err) {
    console.error('Erreur critique :', err);
    res.status(500).send(`<pre>Erreur serveur : ${err.message}</pre>`);
  }
});

app.get('/api/modules', async (req, res) => {
  if (!API_KEY) return res.status(500).json({ error: 'IDFM_API_KEY non configurée.' });
  try {
    const { modulesHtml, errors } = await renderAllModules(API_KEY);
    res.json({ modulesHtml, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    quota:    getQuotaStats(),
    schedule: {
      currentSlot:                   getCurrentSlot(),
      currentInterval:               getCurrentInterval(),
      msUntilNextScheduleBoundary:   getMsUntilNextScheduleBoundaryMs(),
      peak:    SCHEDULE.peak,
      offPeak: SCHEDULE.offPeak,
      night:   SCHEDULE.night,
    },
  });
});

app.listen(PORT, () => {
  console.log(`\n🚇 Transport Dashboard — http://localhost:${PORT}`);
  console.log(`   Clé API : ${API_KEY ? '✓ configurée' : '✗ MANQUANTE'}`);
  const interval = getCurrentInterval();
  console.log(`   Plage   : ${getCurrentSlot()} — refresh ${interval ? `toutes les ${interval}s` : 'suspendu (nuit)'}\n`);
});

function missingKeyPage() {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Config manquante</title>
  <style>body{font-family:monospace;background:#0a0a0f;color:#e8e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .box{background:#111118;border:1px solid #3a1010;border-radius:12px;padding:2rem;max-width:480px}
  h1{color:#ef4444;margin-bottom:1rem}pre{background:#0a0a0f;padding:1rem;border-radius:8px;color:#f59e0b}</style>
  </head><body><div class="box"><h1>⚠ Clé API manquante</h1>
  <p>Créez un fichier <strong>.env</strong> :</p><pre>IDFM_API_KEY=votre_cle_ici</pre>
  <p>Puis relancez avec <code>npm start</code>.</p></div></body></html>`;
}
