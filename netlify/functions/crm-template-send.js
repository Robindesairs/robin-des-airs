/**
 * Envoi d'un TEMPLATE WhatsApp approuvé depuis le CRM (agent humain), par dossier.
 * POST /api/crm-template-send
 *   { "phone":"336…", "template":"relance_dossier_a_finaliser", "params":["Awa","AF718","600 €"],
 *     "dossierRef":"RDA-…", "agent":"Marie", "dryRun":true }
 * Auth : session CRM ou ?code= (checkCrmAccess).
 *
 * Sert à re-toucher un client HORS fenêtre 24h (la fenêtre fermée bloque le texte libre de
 * /api/crm-wa-send). Le template doit être APPROUVÉ côté Meta/WATI. Cf. docs/TEMPLATES-WATI.md.
 */

'use strict';

const { checkCrmAccess } = require('./lib/crm-access');
const { appendWaMessage, normalizeWaPhone } = require('./lib/wa-convo-store');
const { watiAgencySendTemplate } = require('./lib/wati-api');
const { corsHeaders } = require('./lib/auth-config');

const HEADERS = { ...corsHeaders(), 'Cache-Control': 'no-store' };

// Allowlist = les 14 templates de docs/TEMPLATES-WATI.md (on n'envoie jamais un nom arbitraire).
const ALLOWED = new Set([
  'relance_dossier_a_finaliser', 'relance_preuve_sociale', 'relance_derniere_chance',
  'dossier_recu', 'mandat_signe', 'reclamation_envoyee', 'relance_compagnie',
  'reponse_compagnie_accord', 'escalade_procedure', 'paiement_en_cours',
  'piece_manquante', 'photo_a_reprendre', 'rappel_programme', 'parrainage',
]);

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };

  const auth = checkCrmAccess(event);
  if (!auth.ok) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: auth.error || 'Non autorisé' }) };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'POST uniquement' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'JSON invalide' }) }; }

  const phone = normalizeWaPhone(body.phone || body.to || '');
  const template = String(body.template || '').trim();
  const rawParams = Array.isArray(body.params) ? body.params : [];
  const dossierRef = String(body.dossierRef || body.ref || '').trim();
  const agent = String(body.agent || body.by || 'Agent CRM').trim().slice(0, 80);
  const dryRun = body.dryRun === true || body.dryRun === '1';

  if (!phone) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'phone obligatoire' }) };
  if (!template) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'template obligatoire' }) };
  if (!ALLOWED.has(template)) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'template inconnu (hors allowlist)' }) };

  // Paramètres WATI nommés [{name:'1',value}] ; on coupe les valeurs vides → '—' (Meta refuse le vide).
  const parameters = rawParams.map((v, i) => ({ name: String(i + 1), value: String(v == null ? '' : v).trim().slice(0, 180) || '—' }));

  if (dryRun) {
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, dryRun: true, phone, template, parameters }) };
  }

  const res = await watiAgencySendTemplate(phone, template, parameters, 'robin');
  if (!res || !res.ok) {
    return { statusCode: 502, headers: HEADERS, body: JSON.stringify({ error: (res && res.error) || 'Échec envoi template', details: res && res.details, template }) };
  }

  // Journalise dans le fil de conversation (visible côté CRM / bureau).
  try {
    const label = `[${dossierRef || phone}] 📤 template « ${template} »`;
    await appendWaMessage(event, phone, { role: 'assistant', text: label, source: 'crm-template', by: agent });
  } catch (_) {}

  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, phone, template, messageId: res.messageId }) };
};
