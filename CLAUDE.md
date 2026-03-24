# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

Dashboard temps réel pour la Mobilité IDF (RER D, Métro 9, Vélib', météo), conçu pour une tablette en mode vertical. Application Node.js + Express avec architecture modulaire basée sur des widgets.

## Commandes

```bash
npm install              # Dépendances
cp .env.example .env     # Créer le fichier d'environnement (ajouter IDFM_API_KEY)
npm run dev              # Mode développement (--watch)
npm start                # Production
```

## Architecture

**Flux de rendu :**
1. `server.js` → route `/` appelle `renderAllModules()`
2. `dashboardRenderer.js` → filtre les modules activés, exécute `fetch()` + `render()` en parallèle (Promise.allSettled)
3. `moduleRegistry.js` → résout le type de widget vers son module (fetch + render)
4. Chaque widget (`src/widgets/*.js`) expose `{ fetch(context, apiKey), render(data, context) }`
5. `htmlLayout.js` → enveloppe les modules HTML dans la grille finale

**Configuration :**
- `config/lines.js` → Référentiel LINES (RERD, METRO9) et STOPS avec IDs STIF
- `config/dashboard.js` → Liste des modules (id, type, enabled, layout, params)
- `config/schedule.js` → Plages horaires (peak/offPeak/night) + intervalles de refresh

**APIs utilisées :**
- **PRIM IDFM** (clé API requise) : stop-monitoring (départs), general-message (état ligne), vélib
- **Open-Meteo** (gratuit) : météo

**Gestion du quota :**
- Quota gratuit PRIM : ~20 000 appels/jour
- `quotaTracker.js` : suit les appels, persiste dans `.quota-state.json`
- `schedule.js` : adapte la fréquence (30s pointe, 60s hors pointe, suspend la nuit)

## Ajouter un widget

1. Créer `src/widgets/nomWidget.js` avec `fetch(context, apiKey)` et `render(data, context)`
2. Importer et enregistrer dans `moduleRegistry.js`
3. Ajouter une entrée dans `config/dashboard.js` avec `type: 'nom-widget'`

## API de debug

- `/api/raw` → Toutes les réponses API brutes
- `/api/raw/departures` → stop-monitoring
- `/api/raw/line-status/:lineKey` → general-message
- `/api/raw/velib` → Vélib status
- `/api/raw/weather` → Open-Meteo

## Layout

Grille CSS en mode vertical (tablette). Layouts définis via `layout: 'col-left row-top'` etc. dans `config/dashboard.js`. Le CSS est dans `src/public/css/dashboard.css`.
