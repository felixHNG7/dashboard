/**
 * src/core/dashboardRenderer.js
 * Orchestre le rendu de tous les modules configurés en parallèle.
 */

import { DASHBOARD_CONFIG } from '../../config/dashboard.js';
import { LINES, STOPS }     from '../../config/lines.js';
import { resolveModule }    from './moduleRegistry.js';

export async function renderAllModules(apiKey) {
  const activeModules = DASHBOARD_CONFIG.modules.filter(m => m.enabled);

  const results = await Promise.allSettled(
    activeModules.map(cfg => renderModule(cfg, apiKey))
  );

  const modulesHtml = [];
  const errors      = [];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      modulesHtml.push(result.value);
    } else {
      const cfg = activeModules[i];
      errors.push(`Module ${cfg.id} : ${result.reason?.message}`);
      modulesHtml.push(renderErrorModule(cfg, result.reason?.message));
    }
  });

  return { modulesHtml, errors };
}

async function renderModule(moduleConfig, apiKey) {
  const mod     = resolveModule(moduleConfig.type);
  const context = buildContext(moduleConfig);
  const data    = await mod.fetch(context, apiKey);
  const inner   = mod.render(data, context);
  return `<div class="module-cell layout-${moduleConfig.layout?.replace(/\s+/g,'-') || 'default'}" data-module-id="${moduleConfig.id}">${inner}</div>`;
}

function buildContext(moduleConfig) {
  const { params } = moduleConfig;
  return {
    ...params,
    line: params.lineKey ? LINES[params.lineKey] : null,
    stop: params.stopKey ? STOPS[params.stopKey] : null,
  };
}

function renderErrorModule(cfg, message) {
  return `<div class="module-cell layout-${cfg.layout?.replace(/\s+/g,'-') || 'default'}" data-module-id="${cfg.id}">
    <div class="card card--error">
      <div class="card-header"><span class="error-icon">⚠</span><span>Erreur — ${cfg.id}</span></div>
      <p class="error-msg">${message || 'Erreur inconnue'}</p>
    </div></div>`;
}
