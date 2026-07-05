/**
 * lead-action — Robin des Airs
 * POST /api/lead-action   { phone, action, until?, ref?, agent?, note? }
 *
 * Qualifie un appel de la file « À rappeler » (Bureau) : issue d'appel (pas dispo / injoignable /
 * rappelé / faux numéro), programmation, éligibilité, suppression.
 *
 * Chaîne : CRM (auth cookie rda_crm / X-CRM-Code) → ce proxy → bot Railway (état du lead, persisté).
 * Le secret du bot reste côté serveur. Cas « non_eligible » AVEC dossier : on passe aussi la fiche
 * Airtable en « Éligibilité = Non » (déclenche la purge RGPD 30j) — best-effort, n'échoue pas l'action.
 *
 * actions : snooze | schedule | injoignable | done | faux_numero | eligible | non_eligible | delete
 */

const { checkCrmAccess } = require('./lib/crm-access');
const { corsHeaders } = require('./lib/auth-config');
const { airtableCfg, airtableFindByRef, airtablePatch } = require('./lib/airtable-robin');

const HEADERS = { ...corsHeaders(), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const J = (code, obj) => ({ statusCode: code, headers: HEADERS, body: JSON.stringify(obj) });

const ACTIONS = ['snooze', 'schedule', 'injoignable', 'done', 'faux_numero', 'eligible', 'non_eligible', 'delete'];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return J(405, { ok: false, error: 'POST uniquement' });

  const auth = checkCrmAccess(event);
  if (!auth.ok) return J(401, { ok: false, error: auth.error || 'Non autorisé' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (_) { return J(400, { ok: false, error: 'JSON invalide' }); }

  const phone = String(body.phone || '').replace(/\D/g, '');
  const action = String(body.action || '').trim();
  if (!phone) return J(400, { ok: false, error: 'phone requis' });
  if (ACTIONS.indexOf(action) === -1) return J(400, { ok: false, error: 'action inconnue' });

  const ref = String(body.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);

  // Non éligible + dossier existant → Airtable « Éligibilité = Non » (best-effort, ne bloque pas l'action).
  let airtable = null;
  if (action === 'non_eligible' && ref) {
    try {
      const cfg = airtableCfg();
      if (cfg) {
        const recs = await airtableFindByRef(cfg, ref);
        const rec = recs && recs[0];
        if (rec && rec.id) {
          await airtablePatch(cfg, rec.id, { 'Éligibilité': 'Non' });
          airtable = { ok: true, ref };
        } else {
          airtable = { ok: false, reason: 'dossier introuvable' };
        }
      }
    } catch (e) { airtable = { ok: false, reason: e.message }; }
  }

  // Relais vers le bot (état du lead, persisté).
  const base = (process.env.RAILWAY_BOT_URL || 'https://robin-bot-v8-production.up.railway.app').replace(/\/$/, '');
  const secret = (process.env.WATI_WEBHOOK_SECRET || process.env.MANDAT_SIGNED_WEBHOOK_SECRET || process.env.CRM_ACCESS_CODE || '').trim();
  const payload = { phone, action };
  if (body.until != null) payload.until = Number(body.until);
  if (body.agent) payload.agent = String(body.agent).slice(0, 80);
  if (body.note != null) payload.note = String(body.note).slice(0, 200);

  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 7000);
    const r = await fetch(base + '/api/lead-action', {
      method: 'POST',
      headers: { 'x-secret': secret, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(to);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return J(200, { ok: false, error: (data && data.error) || ('bot ' + r.status), airtable });
    return J(200, { ok: true, action, phone, airtable, bot: data });
  } catch (e) {
    return J(200, { ok: false, error: e.message, airtable });
  }
};
