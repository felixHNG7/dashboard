# 🚇 Transport Dashboard — IDF Mobilités

Dashboard temps réel pour le RER D et le Métro 9, construit avec Node.js + Express.

## Installation

```bash
npm install
cp .env.example .env
# Éditez .env et ajoutez votre clé API PRIM
npm run dev      # mode développement (--watch)
npm start        # production
```

Ouvrez [http://localhost:3000](http://localhost:3000).

---

## Structure du projet

```
transport-dashboard/
├── config/
│   ├── lines.js          # Référentiel des lignes et arrêts (IDs STIF)
│   ├── dashboard.js      # Configuration du layout et des modules
│   └── schedule.js       # Plages horaires (peak/offPeak/night) + intervalles de refresh
│
├── src/
│   ├── server.js          # Point d'entrée Express
│   │
│   ├── api/               # Couche données (appels externes)
│   │   ├── primClient.js         # Client HTTP bas niveau PRIM
│   │   ├── lineStatusService.js  # Service : état d'une ligne
│   │   ├── departuresService.js  # Service : prochains passages
│   │   ├── velibService.js       # Service : disponibilité Vélib
│   │   ├── weatherService.js     # Service : météo Open-Meteo
│   │   └── tempoService.js       # Service : couleur tarifaire EDF Tempo
│   │
│   ├── core/              # Orchestration
│   │   ├── moduleRegistry.js     # Registre des types de widgets
│   │   ├── dashboardRenderer.js  # Rendu parallèle de tous les modules
│   │   ├── htmlLayout.js         # Template HTML principal
│   │   └── quotaTracker.js       # Suivi des appels PRIM, persistance .quota-state.json
│   │
│   ├── widgets/           # Un fichier = un type de widget
│   │   ├── lineStatus.js         # Widget état de ligne
│   │   ├── nextDepartures.js     # Widget prochains passages
│   │   ├── velib.js              # Widget disponibilité Vélib
│   │   ├── weather.js            # Widget météo
│   │   └── tempo.js              # Widget couleur tarifaire EDF Tempo
│   │
│   ├── routes/
│   │   └── rawApiRoutes.js       # Endpoints de debug /api/raw/*
│   │
│   └── public/            # Assets statiques servis par Express
│       ├── css/dashboard.css
│       └── js/client.js          # Horloge + auto-refresh AJAX + barre de quota
│
├── Dockerfile              # Build production Node 20 alpine
├── docker-compose.yml      # Déploiement conteneur local
├── kube/                   # Manifests Kubernetes (deployment, service, ingress, ...)
└── .env                    # IDFM_API_KEY=... (non versionné)
```

---

## Ajouter un module au dashboard

### 1. Utiliser un widget existant sur un nouvel arrêt

Éditez `config/lines.js` pour ajouter votre arrêt :
```js
export const STOPS = {
  // ...
  MON_ARRET: {
    id:    'STIF:StopArea:SP:XXXXX:',
    label: 'Mon Arrêt',
    lines: ['RERD'],
  },
};
```

Puis ajoutez le module dans `config/dashboard.js` :
```js
{
  id:      'departures-mon-arret',
  type:    'next-departures',
  enabled: true,
  width:   'full',
  params:  { lineKey: 'RERD', stopKey: 'MON_ARRET', directionKeyword: 'LYON', count: 3 },
},
```

### 2. Créer un nouveau type de widget

Créez `src/widgets/monWidget.js` avec cette interface :
```js
export const monWidgetModule = {
  async fetch(context, apiKey) { /* retourne des données */ },
  render(data, context)        { /* retourne du HTML */ },
};
```

Enregistrez-le dans `src/core/moduleRegistry.js` :
```js
import { monWidgetModule } from '../widgets/monWidget.js';
export const REGISTRY = {
  // ...
  'mon-widget': monWidgetModule,
};
```

---

## Déploiement

```bash
docker compose up -d --build   # via docker-compose.yml
```

Les manifests Kubernetes (`kube/`) déploient la même image : `namespace.yaml`, `deployment.yaml`, `service.yaml`, `ingress.yaml`, `secret.yaml` (contient `IDFM_API_KEY`), assemblés par `kustomization.yaml`.

```bash
kubectl apply -k kube/
```

## Références API

- [Documentation PRIM](https://prim.iledefrance-mobilites.fr/fr/apis)
- [Référentiel des lignes](https://data.iledefrance-mobilites.fr/explore/dataset/referentiel-des-lignes)
- [Référentiel des arrêts](https://data.iledefrance-mobilites.fr/explore/dataset/arrets-lignes)
- [api-couleur-tempo.fr](https://www.api-couleur-tempo.fr) — couleur tarifaire EDF Tempo (widget `tempo`)
