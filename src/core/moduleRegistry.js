/**
 * src/core/moduleRegistry.js
 * ─────────────────────────────────────────────────────────────────
 * Registre des types de modules disponibles.
 * Chaque type associe un nom à sa fonction de fetch et son template.
 *
 * Pour créer un nouveau type de module :
 *   1. Créez src/widgets/monWidget.js  (fetch + render)
 *   2. Importez-le ici et ajoutez une entrée dans REGISTRY
 * ─────────────────────────────────────────────────────────────────
 */

import { lineStatusModule }    from '../widgets/lineStatus.js';
import { nextDeparturesModule } from '../widgets/nextDepartures.js';
import { weatherModule }        from '../widgets/weather.js';
import { velibModule }          from '../widgets/velib.js';
import { tempoModule }          from '../widgets/tempo.js';

export const REGISTRY = {
  'line-status':     lineStatusModule,
  'next-departures': nextDeparturesModule,
  'weather':         weatherModule,
  'velib':           velibModule,
  'tempo':           tempoModule,
};

/**
 * Résout un type de module ou lève une erreur explicite.
 * @param {string} type
 */
export function resolveModule(type) {
  const mod = REGISTRY[type];
  if (!mod) throw new Error(`Module inconnu : "${type}". Types disponibles : ${Object.keys(REGISTRY).join(', ')}`);
  return mod;
}
