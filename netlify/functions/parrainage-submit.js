/**
 * parrainage-submit — reçoit un parrainage depuis /parrainage.html et l'écrit
 * directement dans Airtable (table "Parrainages"), pour traitement dans le CRM.
 *
 * POST /api/parrainage-submit  { ref, parrain:{prenom,tel}, filleul:{prenom,tel},
 *                                vol:{numero,date,probleme}, recompense, date }
 *
 * Le token Airtable (AIRTABLE_API_KEY) doit avoir le droit d'écriture des records.
 * La table "Parrainages" doit exister dans la base (le token ne peut pas la créer).
 * En cas d'échec, renvoie une erreur : le front bascule alors sur son fallback WhatsApp.
 */
const BASE = process.env.AIRTABLE_BASE_ID || 'appv72lKbQtjt7EIP';
const TABLE = process.env.AIRTABLE_PARRAINAGES_TABLE || 'Parrainages';

const H = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': 'https://robindesairs.eu',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const s = (v) => String(v == null ? '' : v).slice(0, 300).trim();

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: H, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: H, body: JSON.stringify({ error: 'POST only' }) };

  const key = process.env.AIRTABLE_API_KEY;
  if (!key) return { statusCode: 500, headers: H, body: JSON.stringify({ error: 'Airtable non configuré' }) };

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'JSON invalide' }) }; }

  const parrain = b.parrain || {};
  const filleul = b.filleul || {};
  const vol = b.vol || {};
  if (!s(filleul.tel) && !s(parrain.tel)) {
    return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'Coordonnées manquantes.' }) };
  }

  const fields = {
    'Ref': s(b.ref),
    'Parrain prenom': s(parrain.prenom),
    'Parrain tel': s(parrain.tel),
    'Filleul prenom': s(filleul.prenom),
    'Filleul tel': s(filleul.tel),
    'Vol numero': s(vol.numero),
    'Date vol': s(vol.date),
    'Probleme': s(vol.probleme),
    'Recompense': s(b.recompense),
    'Recu le': s(b.date) || new Date().toISOString(),
    'Statut': 'Nouveau',
  };

  try {
    const url = `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(TABLE)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [{ fields }], typecast: true }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error('[parrainage-submit] Airtable', res.status, txt.slice(0, 300));
      return { statusCode: 502, headers: H, body: JSON.stringify({ error: 'Enregistrement impossible' }) };
    }
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error('[parrainage-submit]', e);
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: 'Erreur serveur' }) };
  }
};
