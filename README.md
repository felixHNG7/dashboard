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
│   └── dashboard.js      # Configuration du layout et des modules
│
├── src/
│   ├── server.js          # Point d'entrée Express
│   │
│   ├── api/               # Couche données (appels PRIM)
│   │   ├── primClient.js         # Client HTTP bas niveau
│   │   ├── lineStatusService.js  # Service : état d'une ligne
│   │   └── departuresService.js  # Service : prochains passages
│   │
│   ├── core/              # Orchestration
│   │   ├── moduleRegistry.js     # Registre des types de widgets
│   │   ├── dashboardRenderer.js  # Rendu parallèle de tous les modules
│   │   └── htmlLayout.js         # Template HTML principal
│   │
│   ├── widgets/           # Un fichier = un type de widget
│   │   ├── lineStatus.js         # Widget état de ligne
│   │   └── nextDepartures.js     # Widget prochains passages
│   │
│   └── public/            # Assets statiques servis par Express
│       ├── css/dashboard.css
│       └── js/client.js          # Horloge + auto-refresh AJAX
│
└── .env                   # IDFM_API_KEY=... (non versionné)
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

## Références API

- [Documentation PRIM](https://prim.iledefrance-mobilites.fr/fr/apis)
- [Référentiel des lignes](https://data.iledefrance-mobilites.fr/explore/dataset/referentiel-des-lignes)
- [Référentiel des arrêts](https://data.iledefrance-mobilites.fr/explore/dataset/arrets-lignes)
