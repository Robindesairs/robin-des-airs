/**
 * submit-claim-to-airline — POST /api/submit-claim-to-airline  { ref, secret, confirm? }
 *
 * RÔLE : dépose la réclamation CE 261 chez la compagnie, EN MODE BROUILLON par défaut.
 *   - Sans `confirm` (ou ≠ 'SEND') → BROUILLON : renvoie le « package » (destinataire, objet,
 *     corps, liste des pièces, readyToSend, blocker). N'ENVOIE RIEN.
 *   - Avec `confirm: 'SEND'` → appelle sendClaimEmail (l'envoi ne part QUE si le canal est 'email'
 *     ET que AIRLINE_AUTOSEND !== '0'). Voir lib/airline-auto-submit.js pour le double verrou.
 *
 * FLAG DE SÉCURITÉ : human-in-the-loop. Le défaut est BROUILLON. Aucun email ne part sans
 *   `confirm:'SEND'` explicite, et le kill-switch env AIRLINE_AUTOSEND=0 bloque tout envoi.
 *
 * AUTH interne : secret partagé (CLAIM_SUBMIT_SECRET en priorité, sinon les secrets internes
 *   habituels via verifyInternalSecret : RADAR_MONITOR_SECRET / AIRTABLE_WEBHOOK_SECRET /
 *   CRM_AUTH_SECRET / WHATSAPP_WEBHOOK_SECRET). En dev local sans secret configuré : bypass.
 */

const { verifyInternalSecret, publicCorsHeaders, denyResponse } = require('./lib/internal-auth');
const { safeEqualString } = require('./lib/safe-compare');
const { prepareClaimPackage, sendClaimEmail } = require('./lib/airline-auto-submit');

const HEADERS = publicCorsHeaders({ 'Cache-Control': 'no-store' });

/** Auth : secret dédié CLAIM_SUBMIT_SECRET OU un des secrets internes du repo. */
function verifyAuth(event, body) {
  const dedicated = (process.env.CLAIM_SUBMIT_SECRET || '').trim();
  if (dedicated) {
    const q = event.queryStringParameters || {};
    const h = event.headers || {};
    const provided = String(
      (body && (body.secret || body.webhookSecret)) ||
        h['x-rda-secret'] || h['X-Rda-Secret'] ||
        h['x-webhook-secret'] || h['X-Webhook-Secret'] ||
        q.secret || ''
    ).trim();
    if (provided && safeEqualString(provided, dedicated)) return { ok: true };
    // Pas le secret dédié : on retombe sur les secrets internes génériques.
  }
  return verifyInternalSecret(event, body);
}

/** Retire les buffers internes avant sérialisation HTTP (jamais de base64 lourd côté client). */
function publicView(pkg) {
  const { _buffers, ...rest } = pkg;
  return {
    ...rest,
    attachments: (pkg.attachments || []).map((a) => ({ filename: a.filename, bytes: a.bytes, store: a.store })),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'POST uniquement' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'JSON invalide' }) }; }

  const auth = verifyAuth(event, body);
  if (!auth.ok) return denyResponse(401, auth.error || 'Non autorisé', 'public');

  const ref = (body.ref || '').trim();
  if (!ref) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'ref requis' }) };

  let pkg;
  try {
    pkg = await prepareClaimPackage(ref, event);
  } catch (e) {
    const msg = e.message || String(e);
    const status = /introuvable/i.test(msg) ? 404 : /Airtable non configuré/i.test(msg) ? 503 : 502;
    return { statusCode: status, headers: HEADERS, body: JSON.stringify({ ok: false, error: msg }) };
  }

  // ── MODE BROUILLON (défaut) : on renvoie le package, on n'envoie RIEN ──────────
  if (body.confirm !== 'SEND') {
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ ok: true, mode: 'draft', package: publicView(pkg) }),
    };
  }

  // ── MODE ENVOI : confirm === 'SEND' (le double verrou vit dans sendClaimEmail) ──
  let result;
  try {
    result = await sendClaimEmail(pkg, { confirm: 'SEND', event, force: !!body.force });
  } catch (e) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'envoi: ' + (e.message || String(e)) }) };
  }

  return {
    statusCode: result.sent ? 200 : 409,
    headers: HEADERS,
    body: JSON.stringify({ ok: !!result.sent, mode: 'send', result, package: publicView(pkg) }),
  };
};
