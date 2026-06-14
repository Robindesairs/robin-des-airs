/**
 * crm-depot-link — génère (ou réutilise) un LIEN DE DÉPÔT personnalisé pour un dossier CRM.
 *
 * But : un opérateur, depuis le CRM, fait envoyer au client un lien sécurisé pour qu'il
 * dépose lui-même sa CARTE D'EMBARQUEMENT + son/ses PASSEPORT(S) → zéro saisie au téléphone,
 * zéro erreur de compréhension. Le client uploade sur depot-en-ligne.html?r=<ref>.
 *
 * POST /api/crm-depot-link   (auth : session CRM ou ?code= via checkCrmAccess)
 *   { id, ref?, name?, prenom?, nom?, phone?, vol?, date?, pnr?, compagnie?,
 *     palier?, pax?, passengers?:[{name}], address? }
 *   - ref fourni (depotRef déjà connu) → réutilisé (idempotent), on rafraîchit juste le blob.
 *   - sinon → on frappe un jeton opaque non devinable et on crée m/<ref> dans le store 'mandats'
 *     (depot-upload.js exige que m/<ref> existe pour accepter un upload).
 *
 * Réponse : { ok, ref, link }  où link = https://robindesairs.eu/depot-en-ligne.html?r=<ref>
 *
 * NB : on N'écrit PAS dans Airtable ici (le dossier CRM y est déjà via crm-airtable-sync) —
 * on évite ainsi tout doublon. Les pièces déposées restent visibles côté CRM via
 * /api/crm-pieces?r=<ref> (store 'pieces', clé p/<ref>/…).
 */

'use strict';

const crypto = require('crypto');
const { getBlobStore } = require('./lib/netlify-blobs-store');
const { checkCrmAccess } = require('./lib/crm-access');
const { corsHeaders } = require('./lib/auth-config');

const HEADERS = { ...corsHeaders(), 'Cache-Control': 'no-store' };
const SITE = (process.env.PUBLIC_SITE_URL || 'https://robindesairs.eu').replace(/\/+$/, '');

function genDepotRef() {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `RDA-${ymd}-${crypto.randomBytes(9).toString('hex').toUpperCase()}`;
}

function cleanRef(r) {
  return String(r || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };

  const auth = checkCrmAccess(event);
  if (!auth.ok) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: auth.error || 'Non autorisé' }) };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'POST uniquement' }) };

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'JSON invalide' }) }; }

  const crmId = String(b.id || '').trim().slice(0, 64);
  if (!crmId) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'id dossier obligatoire' }) };

  // Réutilise le jeton existant si fourni (idempotent), sinon en frappe un nouveau.
  const ref = cleanRef(b.ref) || genDepotRef();

  const name = String(b.name || `${b.prenom || ''} ${b.nom || ''}`).trim();
  const passengers = Array.isArray(b.passengers) && b.passengers.length
    ? b.passengers.map((p) => ({ name: String((p && p.name) || '').trim() })).filter((p) => p.name)
    : (name ? [{ name }] : []);

  // Objet dossier minimal, compatible mandat/depot (depot-upload ne lit que l'existence de m/<ref>).
  const dossier = {
    ref,
    crmId,
    name,
    phone: String(b.phone || '').replace(/\D/g, ''),
    address: String(b.address || '').trim(),
    vol: String(b.vol || '').trim(),
    date: String(b.date || '').trim(),
    pnr: String(b.pnr || '').trim(),
    compagnie: String(b.compagnie || '').trim(),
    pax: Number(b.pax) || passengers.length || 1,
    indemnite: Number(b.palier) || null,
    passengers,
    source: 'crm-depot',
  };

  const st = getBlobStore(event, 'mandats');
  if (!st) return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'store indisponible' }) };

  try {
    await st.setJSON('m/' + ref, { ...dossier, _ts: new Date().toISOString() });
  } catch (e) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: e.message }) };
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ ok: true, ref, link: `${SITE}/depot-en-ligne.html?r=${encodeURIComponent(ref)}` }),
  };
};
