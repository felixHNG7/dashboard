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
- **PRIM IDFM** (clé API requise) : stop-monitoring (départs), general-message (état ligne), vélib (station_status + station_information)
- **Open-Meteo** (gratuit) : météo
- **api-couleur-tempo.fr** (gratuit, sans clé) : couleur tarifaire EDF Tempo (widget `tempo`)

**Gestion du quota :**
- Quota gratuit PRIM : ~20 000 appels/jour (`DAILY_LIMIT` dans `quotaTracker.js`)
- `quotaTracker.js` : suit les appels, persiste dans `.quota-state.json`
- `schedule.js` : adapte la fréquence (15s en pointe 7h-10h, 30s hors pointe, suspend la nuit 23h-6h) — voir le détail du calcul de budget en tête de fichier
- Seuls les appels PRIM comptent dans le quota ; Open-Meteo et EDF Tempo n'en consomment pas

## Ajouter un widget

1. Créer `src/widgets/nomWidget.js` avec `fetch(context, apiKey)` et `render(data, context)`
2. Importer et enregistrer dans `moduleRegistry.js`
3. Ajouter une entrée dans `config/dashboard.js` avec `type: 'nom-widget'`

## API de debug

- `/api/raw` → Toutes les réponses API brutes (PRIM + Open-Meteo, agrégées)
- `/api/raw/departures` → stop-monitoring
- `/api/raw/line-status/:lineKey` → general-message
- `/api/raw/velib` → Vélib status
- `/api/raw/weather` → Open-Meteo
- `/api/status` → état quota + plage horaire courante (utilisé par le client pour l'overlay nuit et la barre de quota)

## Layout

Grille CSS en mode portrait (tablette, vertical) par défaut : une seule colonne principale sur 4 lignes. Chaque module cible une zone via `layout: 'row-main'` etc. dans `config/dashboard.js` ; ces valeurs sont converties en classes `layout-xxx` par `dashboardRenderer.js` et doivent avoir une règle correspondante dans `src/public/css/dashboard.css` (sinon le module tombe dans `.layout-default`, pleine largeur). Zones existantes : `row-main` (ligne 1, pleine largeur, occupe le plus de hauteur — RER D), `row-split-left` / `row-split-right` (ligne 2, 2 colonnes égales — Tempo EDF / Métro 9), `row-weather` (ligne 3, pleine largeur), `row-velib` (ligne 4, pleine largeur). L'ordre des modules dans `config/dashboard.js` doit rester cohérent avec l'ordre des lignes (placement automatique de la grille CSS). Un fallback `@media (orientation: landscape)` reprend une disposition 3 colonnes proche de l'ancien design, mais le portrait reste la cible par défaut.

## Déploiement

- `Dockerfile` : build multi-stage Node 20 alpine, utilisateur non-root, healthcheck sur `/api/status`
- `docker-compose.yml` : lance l'image avec un volume persistant pour `.quota-state.json`
- `kube/` : manifests Kubernetes (namespace, deployment, service, ingress, secret, kustomization)
