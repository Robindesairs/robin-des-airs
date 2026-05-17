/**
 * Dossiers agence partenaire (lecture / création Airtable)
 * GET  /api/agency-dossiers
 * POST /api/agency-dossiers  { nom, prenom, email, tel, pnr, vol, … }
 */

const { airtableCfg } = require('./lib/airtable-robin');
const { getAgencySession } = require('./lib/agency-access');
const {
  listAgencyDossiers,
  createAgencyDossier,
  isAttenteIncidentInput,
  COMMISSION_FCFA,
} = require('./lib/agency-airtable');
const { corsHeaders } = require('./lib/auth-config');
const { notifyAgencyDossierCreated } = require('./lib/robin-notify');

const HEADERS = corsHeaders('agency');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  const agency = getAgencySession(event);
  if (!agency) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Non connecté' }) };
  }

  const cfg = airtableCfg();
  if (!cfg) {
    return {
      statusCode: 503,
      headers: HEADERS,
      body: JSON.stringify({
        error: 'Airtable non configuré (AIRTABLE_API_KEY, BASE, TABLE)',
      }),
    };
  }

  if (event.httpMethod === 'GET') {
    try {
      const dossiers = await listAgencyDossiers(cfg, agency);
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
          ok: true,
          agency: { code: agency.code, name: agency.name },
          commissionPerPax: COMMISSION_FCFA,
          count: dossiers.length,
          dossiers,
        }),
      };
    } catch (e) {
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({ error: e.message, dossiers: [] }),
      };
    }
  }

  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'JSON invalide' }) };
    }

    const required = ['nom', 'prenom', 'email', 'tel', 'pnr', 'vol', 'compagnie', 'date', 'depart', 'arrivee', 'probleme'];
    const missing = required.filter((k) => !String(body[k] || '').trim());
    if (missing.length) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ error: 'Champs obligatoires manquants', fields: missing }),
      };
    }

    if (String(body.pnr || '').replace(/\s/g, '').length !== 6) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ error: 'PNR : 6 caractères requis' }),
      };
    }

    try {
      const created = await createAgencyDossier(cfg, agency, body);
      const attente = isAttenteIncidentInput(body);
      notifyAgencyDossierCreated(agency, created.dossier, { attenteIncident: attente }).catch((err) => {
        console.warn('agency-dossiers: notify', err.message);
      });
      return {
        statusCode: 201,
        headers: HEADERS,
        body: JSON.stringify({
          ok: true,
          ref: created.ref,
          recordId: created.recordId,
          dossier: created.dossier,
          attenteIncident: attente,
          message: attente
            ? "Billet pré-enregistré — en attente d'incident (visible dans Airtable)."
            : 'Dossier enregistré dans Airtable — visible par Robin des Airs.',
        }),
      };
    } catch (e) {
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({ error: e.message }),
      };
    }
  }

  return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'GET ou POST' }) };
};
