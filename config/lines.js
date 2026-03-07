/**
 * config/lines.js
 * ─────────────────────────────────────────────────────────────────
 * Référentiel centralisé de toutes les lignes et arrêts configurés.
 * Modifiez ce fichier pour ajouter/retirer des lignes ou des arrêts.
 *
 * Sources des identifiants :
 *  - Lignes  : https://data.iledefrance-mobilites.fr/explore/dataset/referentiel-des-lignes
 *  - Arrêts  : https://data.iledefrance-mobilites.fr/explore/dataset/arrets-lignes
 * ─────────────────────────────────────────────────────────────────
 */

export const LINES = {
  RERD: {
    id:    'STIF:Line::C01728:',
    label: 'RER D',
    badge: 'D',
    type:  'rer',
    color: '#113234',
    textColor: '#ffffff',
  },
  METRO9: {
    id:    'STIF:Line::C01379:',
    label: 'Métro 9',
    badge: '9',
    type:  'metro',
    color: '#b6bd00',
    textColor: '#1a1a00',
  },
};

export const STOPS = {
  MAISONS_ALFORT_ALFORTVILLE: {
    // ⚠️  Depuis le 13/03/2025, l'API PRIM exige un ZdAid (zone d'arrêt)
    //     pour les lignes SNCF/Transilien/RER gérées par SNCF.
    //
    //     Pour trouver le bon identifiant :
    //       1. Allez sur https://data.iledefrance-mobilites.fr/explore/dataset/zones-d-arrets
    //       2. Onglet "Tableau" → cherchez "Maisons-Alfort"
    //       3. Filtrez ZdAType = "railStation"
    //       4. Copiez la valeur de la colonne ZdAId (ex: 87_001_XXX)
    //       5. Le MonitoringRef devient : STIF:StopArea:SP:<ZdAId>:
    //  
    //     ID confirmé pour Maisons-Alfort – Alfortville (RER D, SNCF) :
    id:    'STIF:StopArea:SP:43154:',
    label: 'Maisons-Alfort – Alfortville',
    lines: ['RERD'],
    // lineRef omis volontairement : l'API PRIM rejette LineRef pour les
    // gares SNCF depuis mars 2025 — le filtrage se fait côté client.
    omitLineRef: true,
  },
  // Pour ajouter un arrêt : copiez ce bloc et remplissez les champs
  // MON_ARRET: {
  //   id:    'STIF:StopArea:SP:XXXXX:',
  //   label: 'Nom de l\'arrêt',
  //   lines: ['RERD', 'METRO9'],
  // },
};
