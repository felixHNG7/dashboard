/**
 * src/api/lineStatusService.js
 * ─────────────────────────────────────────────────────────────────
 * Service : état du trafic d'une ligne via SIRI general-message PRIM.
 *
 * Le format PRIM peut varier : on applique un parsing défensif qui
 * tente toutes les structures connues et logue la réponse brute en
 * mode DEBUG pour faciliter le diagnostic.
 * ─────────────────────────────────────────────────────────────────
 */

import { primGet } from './primClient.js';

const DEBUG = process.env.DEBUG_GENERAL_MESSAGE === 'true';

/**
 * Extrait tous les textes de message d'une réponse general-message PRIM.
 * Tente les différentes structures observées sur le réseau IDFM.
 */
function extractMessages(delivery) {
  const infoMessages = [].concat(delivery || [])
    .flatMap(d => [].concat(d?.InfoMessage || []));
  if (DEBUG && infoMessages.length > 0) {
    console.log('[general-message] Structure brute InfoMessage[0] :',
      JSON.stringify(infoMessages[0], null, 2));
  }

  const texts = [];

  for (const msg of infoMessages) {
    const content = msg?.Content;
    if (!content) continue;

    // Filtre au niveau Content : n'afficher que SHORT_MESSAGE (exclure TEXT_ONLY)
    const contentMsgType = (content?.MessageType ?? content?.messageType ?? '').toUpperCase();
    if (contentMsgType === 'TEXT_ONLY') continue;

    // ── Forme 1 : Content.Message[].MessageText.value (SIRI-lite standard IDFM) ──
    const msgArray = [].concat(content.Message || []);
    for (const m of msgArray) {
      // Filtre : n'afficher que SHORT_MESSAGE (exclure TEXT_ONLY)
      const msgType = (m?.MessageType ?? m?.messageType ?? '').toUpperCase();
      if (msgType === 'TEXT_ONLY') continue;

      // MessageText peut être un objet {value, lang} ou directement une string
      const val = m?.MessageText?.value ?? m?.MessageText ?? m?.value ?? null;
      if (typeof val === 'string' && val.trim()) {
        texts.push(val.trim());
        continue;
      }
      // Tableau de traductions
      if (Array.isArray(m?.MessageText)) {
        const t = m.MessageText.find(x => x?.lang === 'FR' || x?.lang === 'fr')?.value
               ?? m.MessageText[0]?.value;
        if (t) texts.push(t.trim());
      }
    }

    // ── Forme 2 : Content directement une string ──
    if (!texts.length && typeof content === 'string' && content.trim()) {
      texts.push(content.trim());
    }

    // ── Forme 3 : Content.ShortMessage.value ──
    if (!texts.length) {
      const short = content?.ShortMessage?.value ?? content?.ShortMessage;
      if (typeof short === 'string' && short.trim()) texts.push(short.trim());
    }
  }

  return { infoMessages, texts };
}

/**
 * Détermine la sévérité à partir du contenu brut des messages.
 */
function detectSeverity(infoMessages, texts) {
  const raw = JSON.stringify(infoMessages).toLowerCase();
  const allText = texts.join(' ').toLowerCase();

  // Cherche dans les champs de sévérité natifs si présents
  const hasSeverityField = infoMessages.some(m => {
    const sev = (m?.Content?.Severity ?? m?.Severity ?? '').toLowerCase();
    return sev === 'disrupted' || sev === 'severe';
  });

  const isDisrupted = hasSeverityField
    || raw.includes('interr')
    || raw.includes('supprim')
    || allText.includes('arrêt')
    || allText.includes('interru');

  return isDisrupted ? 'disrupted' : 'warning';
}

export async function getLineStatus(lineRef, apiKey) {
  const data = await primGet('general-message', { LineRef: lineRef }, apiKey);

  if (DEBUG) {
    console.log('[general-message] Réponse brute complète :',
      JSON.stringify(data?.Siri?.ServiceDelivery?.GeneralMessageDelivery, null, 2));
  }

  const delivery = data?.Siri?.ServiceDelivery?.GeneralMessageDelivery;
  const { infoMessages, texts } = extractMessages(delivery);

  if (!infoMessages.length) {
    return { status: 'ok', messages: [], fetchedAt: new Date().toISOString() };
  }

  // Pas de messages texte extraits mais des InfoMessages présents = alerte sans texte
  if (!texts.length) {
    console.warn(`[general-message] ${lineRef} : InfoMessages présents mais aucun texte extrait.`,
      'Structure :', JSON.stringify(infoMessages[0]?.Content, null, 2));
    return {
      status:    'warning',
      messages:  ['Information disponible sur cette ligne (détail non disponible).'],
      fetchedAt: new Date().toISOString(),
    };
  }

  return {
    status:    detectSeverity(infoMessages, texts),
    messages:  texts,
    fetchedAt: new Date().toISOString(),
  };
}
