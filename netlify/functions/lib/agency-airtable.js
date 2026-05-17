/**
 * Dossiers agences ↔ Airtable.
 */

const {
  airtableCfg,
  atHeaders,
  fieldVal,
  recordFromAirtableFields,
  airtableCreate,
  escapeFormulaValue,
} = require('./airtable-robin');

const COMMISSION_FCFA = parseInt(process.env.AGENCY_COMMISSION_FCFA || '30000', 10) || 30000;

/** Libellé Airtable « Type d'incident » — à ajouter dans la liste Airtable si champ single-select. */
const INCIDENT_ATTENTE_LABEL =
  (process.env.AIRTABLE_INCIDENT_ATTENTE || "En attente d'incident (billet vendu)").trim();

function isAttenteIncidentInput(body) {
  if (body && body.attenteIncident === true) return true;
  const p = String((body && body.probleme) || '').trim();
  return /attente/i.test(p) || /billet vendu/i.test(p);
}

const AT_STATUT_TO_AGENCY = {
  Nouveau: 'nouveau',
  'Documents en cours': 'en-cours',
  'Mandat à envoyer': 'nouveau',
  'Signature en attente': 'en-cours',
  'Mandat signé': 'en-cours',
  'LRAR envoyée': 'en-cours',
  'Relance 1': 'en-cours',
  'Relance 2': 'en-cours',
  Médiation: 'en-cours',
  Contentieux: 'en-cours',
  'Payé client': 'paye',
  'Refus définitif': 'rejete',
  Abandon: 'rejete',
  Prescrit: 'rejete',
};

function agencyCol(cfg) {
  return (process.env.AIRTABLE_COL_AGENCE || 'Agence Partenaire').trim();
}

function agencyCodeCol(cfg) {
  return (process.env.AIRTABLE_COL_AGENCE_CODE || '').trim();
}

function agencyStatutToUi(statutSuivi) {
  const s = String(statutSuivi || '').trim();
  if (AT_STATUT_TO_AGENCY[s]) return AT_STATUT_TO_AGENCY[s];
  const key = Object.keys(AT_STATUT_TO_AGENCY).find((k) => k.toLowerCase() === s.toLowerCase());
  return key ? AT_STATUT_TO_AGENCY[key] : 'en-cours';
}

function agencyStatutFromRecord(data) {
  const inc = String((data && (data.motif || data.incident)) || '');
  if (/attente d'incident|billet vendu/i.test(inc)) {
    const base = agencyStatutToUi(data.statutSuivi);
    if (base === 'paye' || base === 'rejete') return base;
    return 'attente-incident';
  }
  return agencyStatutToUi(data.statutSuivi);
}

function generateAgencyRef() {
  const d = new Date();
  const y = String(d.getFullYear()).slice(2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `RDA-${y}${m}${day}-${rnd}`;
}

function recordToAgencyDossier(cfg, rec, agencyAccount) {
  const data = recordFromAirtableFields(cfg, rec.fields || {});
  const L = cfg.labels;
  const agenceField = fieldVal(rec.fields, agencyCol(cfg));
  const nbPassagers = Math.max(
    1,
    parseInt(fieldVal(rec.fields, process.env.AIRTABLE_COL_NB_PAX || ''), 10) || 1
  );
  const statut = agencyStatutFromRecord(data);
  const route = data.route || '';
  const parts = route.split('→').map((x) => x.trim());

  return {
    ref: data.ref || rec.id,
    recordId: rec.id,
    nom: (data.nom || '').toUpperCase(),
    prenom: data.prenom || '',
    email: data.email || '',
    tel: data.whatsapp || '',
    pnr: data.pnr || '',
    vol: data.vol || '',
    compagnie: data.compagnie || '',
    depart: parts[0] || '',
    arrivee: parts[1] || '',
    date: data.date ? data.date.slice(0, 10) : '',
    probleme: data.motif || data.incident || '',
    nbPassagers,
    statut,
    statutLabel: data.statutSuivi || '',
    agence: agenceField || agencyAccount.airtableMatch,
    dateCreation: fieldVal(rec.fields, process.env.AIRTABLE_COL_DATE_DOSSIER || 'Date Dossier') || '',
    commissionFcfa: (statut === 'gagne' || statut === 'paye') ? nbPassagers * COMMISSION_FCFA : 0,
  };
}

async function listAgencyDossiers(cfg, agencyAccount) {
  const match = escapeFormulaValue(agencyAccount.airtableMatch || agencyAccount.code);
  const codeCol = agencyCodeCol(cfg);
  const formula = codeCol
    ? `{${codeCol}} = '${match}'`
    : (() => {
        const col = agencyCol(cfg);
        return `FIND('${match}', {${col}}) > 0`;
      })();
  const records = [];
  let offset = '';

  while (records.length < 500) {
    let url = `https://api.airtable.com/v0/${cfg.base}/${cfg.table}?filterByFormula=${encodeURIComponent(formula)}&pageSize=100&sort%5B0%5D%5Bfield%5D=${encodeURIComponent(cfg.labels.ref)}&sort%5B0%5D%5Bdirection%5D=desc`;
    if (offset) url += `&offset=${encodeURIComponent(offset)}`;
    const r = await fetch(url, { headers: atHeaders(cfg.key) });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Airtable list agence ${r.status}: ${t.slice(0, 200)}`);
    }
    const data = await r.json();
    records.push(...(data.records || []));
    offset = data.offset || '';
    if (!offset) break;
  }

  return records.map((rec) => recordToAgencyDossier(cfg, rec, agencyAccount));
}

function dossierPayloadToAirtable(cfg, agencyAccount, body) {
  const L = cfg.labels;
  const ref = body.ref || generateAgencyRef();
  const route =
    body.depart || body.arrivee
      ? `${(body.depart || '').trim()}→${(body.arrivee || '').trim()}`.replace(/^→|→$/g, '')
      : '';
  const nb = Math.max(1, parseInt(body.nbPassagers, 10) || 1);
  const attente = isAttenteIncidentInput(body);
  const remarques = [
    `Soumis par agence ${agencyAccount.code} (${agencyAccount.name})`,
    attente ? 'Pré-enregistrement billet vendu — incident pas encore constaté (retard/annulation à confirmer)' : '',
    body.notes ? String(body.notes).trim() : '',
    !attente && body.retard ? `Retard déclaré: ${body.retard}h` : '',
  ]
    .filter(Boolean)
    .join(' | ')
    .slice(0, 900);

  const fields = {};
  fields[L.ref] = ref;
  fields[L.prenom] = (body.prenom || '').trim();
  fields[L.nom] = (body.nom || '').trim().toUpperCase();
  if (body.email) fields[L.email] = body.email.trim();
  if (body.tel) fields[L.whatsapp] = body.tel.trim();
  if (body.pnr) fields[L.pnr] = body.pnr.trim().toUpperCase();
  if (body.vol) fields[L.vol] = body.vol.trim().toUpperCase();
  if (body.compagnie) fields[L.compagnie] = body.compagnie.trim();
  if (body.date) fields[L.dateVol] = body.date;
  if (route) fields[L.itineraire] = route;
  if (attente) {
    fields[L.incident] = INCIDENT_ATTENTE_LABEL;
    fields[L.statutSuivi] =
      (process.env.AIRTABLE_STATUT_ATTENTE_INCIDENT || 'Nouveau').trim();
  } else if (body.probleme) {
    fields[L.incident] = body.probleme.trim();
    fields[L.statutSuivi] = 'Nouveau';
  } else {
    fields[L.statutSuivi] = 'Nouveau';
  }
  const codeCol = agencyCodeCol(cfg);
  if (codeCol) fields[codeCol] = agencyAccount.airtableMatch || agencyAccount.code;
  fields[agencyCol(cfg)] = `${agencyAccount.code} — ${agencyAccount.name}`;
  fields[L.remarques] = remarques;
  const palier = 600;
  fields[L.indemnite] = nb * palier;

  return { ref, fields };
}

async function createAgencyDossier(cfg, agencyAccount, body) {
  const { ref, fields } = dossierPayloadToAirtable(cfg, agencyAccount, body);
  const created = await airtableCreate(cfg, fields);
  return {
    ref,
    recordId: created && created.id,
    dossier: recordToAgencyDossier(
      cfg,
      { id: created.id, fields: created.fields || fields },
      agencyAccount
    ),
  };
}

module.exports = {
  COMMISSION_FCFA,
  INCIDENT_ATTENTE_LABEL,
  isAttenteIncidentInput,
  listAgencyDossiers,
  createAgencyDossier,
  generateAgencyRef,
  agencyStatutToUi,
  agencyStatutFromRecord,
};
