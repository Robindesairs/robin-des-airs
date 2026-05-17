/**
 * Airtable — config partagée Robin des Airs (noms de colonnes + IDs champs optionnels).
 */

const SITE_URL = (process.env.URL || 'https://robindesairs.eu').replace(/\/$/, '');

function col(nameEnv, defaultLabel) {
  return (process.env[nameEnv] || defaultLabel).trim();
}

function airtableCfg() {
  const key = (process.env.AIRTABLE_API_KEY || '').trim();
  const base = (process.env.AIRTABLE_BASE_ID || 'appv72lKbQtjt7EIP').trim();
  const table = (process.env.AIRTABLE_TABLE_ID || 'tblfg688AGxaywi7O').trim();
  if (!key || !base || !table) return null;

  const labels = {
    ref: col('AIRTABLE_COL_REF', 'Référence Dossier'),
    prenom: col('AIRTABLE_COL_PRENOM', 'Prénom Passager'),
    nom: col('AIRTABLE_COL_NOM', 'Nom Passager'),
    email: col('AIRTABLE_COL_EMAIL', 'Email'),
    whatsapp: col('AIRTABLE_COL_WHATSAPP', 'Numéro WhatsApp'),
    adresse: col('AIRTABLE_COL_ADRESSE', 'Adresse domicile'),
    vol: col('AIRTABLE_COL_VOL', 'Numéro de vol'),
    dateVol: col('AIRTABLE_COL_DATE_VOL', 'Date du vol'),
    compagnie: col('AIRTABLE_COL_COMPAGNIE', 'Compagnie Aérienne'),
    pnr: col('AIRTABLE_COL_PNR', 'PNR (Référence réservation)'),
    incident: col('AIRTABLE_COL_INCIDENT', "Type d'incident"),
    indemnite: col('AIRTABLE_COL_INDEMNITE', "Montant de l'indemnité"),
    itineraire: col('AIRTABLE_COL_ITINERAIRE', 'Itinéraire'),
    trajet: col('AIRTABLE_COL_TRAJET', 'Trajet'),
    statutSuivi: col('AIRTABLE_COL_STATUT_SUIVI', 'Statut du Dossier Suivi'),
    remarques: col('AIRTABLE_COL_REMARQUES', 'Remarques'),
  };

  return {
    key,
    base,
    table,
    labels,
    fRef: (process.env.AIRTABLE_F_REF_DOSSIER || '').trim() || labels.ref,
    fWa: (process.env.AIRTABLE_F_WHATSAPP || '').trim() || labels.whatsapp,
    fRemarques: (process.env.AIRTABLE_F_REMARQUES || '').trim() || labels.remarques,
    fStatutSuivi: (process.env.AIRTABLE_F_STATUT_SUIVI || '').trim() || labels.statutSuivi,
    fCompagnie: (process.env.AIRTABLE_F_COMPAGNIE || '').trim() || labels.compagnie,
    fVol: (process.env.AIRTABLE_F_NUMERO_VOL || '').trim() || labels.vol,
    fDateVol: (process.env.AIRTABLE_F_DATE_VOL || '').trim() || labels.dateVol,
    fPnr: (process.env.AIRTABLE_F_PNR || '').trim() || labels.pnr,
    fIncident: (process.env.AIRTABLE_F_TYPE_INCIDENT || '').trim() || labels.incident,
    fItineraire: (process.env.AIRTABLE_F_ITINERAIRE || '').trim() || labels.itineraire,
    statutMandatSigne: (process.env.AIRTABLE_STATUT_SUIVI_MANDAT_SIGNE || 'Mandat signé').trim(),
    statutMandatAEnvoyer: (process.env.AIRTABLE_STATUT_MANDAT_A_ENVOYER || 'Mandat à envoyer').trim(),
    statutSignatureAttente: (process.env.AIRTABLE_STATUT_SIGNATURE_ATTENTE || 'Signature en attente').trim(),
  };
}

function atHeaders(key) {
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

function escapeFormulaValue(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function fieldVal(fields, key) {
  if (!fields || key == null) return '';
  const v = fields[key];
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

/** Lit les champs Airtable (clés = noms de colonnes ou IDs selon le payload). */
function recordFromAirtableFields(cfg, fields) {
  const L = cfg.labels;
  const get = (label, altId) => fieldVal(fields, label) || (altId ? fieldVal(fields, altId) : '');
  const prenom = get(L.prenom, cfg.fRef && L.prenom);
  const nom = get(L.nom);
  const phone = get(L.whatsapp, cfg.fWa);
  let pphone = phone.replace(/\s/g, '');
  if (pphone && !pphone.startsWith('+')) pphone = `+${pphone}`;

  const dateRaw = get(L.dateVol, cfg.fDateVol);
  let dateFr = dateRaw;
  if (/^\d{4}-\d{2}-\d{2}/.test(dateRaw)) {
    const [y, m, d] = dateRaw.slice(0, 10).split('-');
    dateFr = `${d}/${m}/${y}`;
  }

  const route = get(L.itineraire, cfg.fItineraire) || get(L.trajet);

  return {
    ref: get(L.ref, cfg.fRef),
    prenom,
    nom,
    name: [prenom, nom].filter(Boolean).join(' ').trim(),
    email: get(L.email),
    whatsapp: pphone,
    address: get(L.adresse),
    vol: get(L.vol, cfg.fVol),
    date: dateFr,
    compagnie: get(L.compagnie, cfg.fCompagnie),
    pnr: get(L.pnr, cfg.fPnr),
    motif: get(L.incident, cfg.fIncident),
    indemnite: get(L.indemnite),
    route,
    statutSuivi: get(L.statutSuivi, cfg.fStatutSuivi),
    remarques: get(L.remarques, cfg.fRemarques),
  };
}

function buildMandatUrl(data, source) {
  const p = new URLSearchParams();
  if (data.ref) p.set('ref', data.ref);
  if (data.whatsapp) p.set('phone', data.whatsapp);
  if (data.name) p.set('name', data.name);
  if (data.email) p.set('email', data.email);
  if (data.address) p.set('address', data.address);
  if (data.vol) p.set('vol', data.vol);
  if (data.date) p.set('date', data.date);
  if (data.route) p.set('route', data.route);
  if (data.pnr) p.set('pnr', data.pnr);
  if (data.compagnie) p.set('compagnie', data.compagnie);
  if (data.motif) p.set('motif', data.motif);
  if (data.indemnite) p.set('indemnite', String(data.indemnite).replace(/[^\d.]/g, '') || data.indemnite);
  p.set('source', source || 'airtable');
  return `${SITE_URL}/mandat.html?${p.toString()}`;
}

async function airtableFindByRef(cfg, ref) {
  const refCol = cfg.labels.ref;
  const formula = `{${refCol}}='${escapeFormulaValue(ref)}'`;
  const url = `https://api.airtable.com/v0/${cfg.base}/${cfg.table}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=20`;
  const r = await fetch(url, { headers: atHeaders(cfg.key) });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Airtable find ${r.status}: ${t.slice(0, 200)}`);
  }
  const data = await r.json();
  return data.records || [];
}

async function airtableGetRecord(cfg, recordId) {
  const url = `https://api.airtable.com/v0/${cfg.base}/${cfg.table}/${recordId}`;
  const r = await fetch(url, { headers: atHeaders(cfg.key) });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Airtable get ${r.status}: ${t.slice(0, 200)}`);
  }
  return r.json();
}

async function airtablePatch(cfg, recordId, fieldsPatch) {
  const url = `https://api.airtable.com/v0/${cfg.base}/${cfg.table}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: atHeaders(cfg.key),
    body: JSON.stringify({
      typecast: true,
      records: [{ id: recordId, fields: fieldsPatch }],
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Airtable patch ${r.status}: ${t.slice(0, 300)}`);
  }
  return r.json();
}

async function airtableCreate(cfg, fieldsPatch) {
  const url = `https://api.airtable.com/v0/${cfg.base}/${cfg.table}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: atHeaders(cfg.key),
    body: JSON.stringify({
      typecast: true,
      records: [{ fields: fieldsPatch }],
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Airtable create ${r.status}: ${t.slice(0, 300)}`);
  }
  const data = await r.json();
  return data.records && data.records[0];
}

function clientEmailForRef(ref) {
  if (!ref) return '';
  return `${String(ref).trim().toLowerCase()}@robindesairs.eu`;
}

function dossierToAirtableFields(cfg, dossier) {
  const L = cfg.labels;
  const f = {};
  if (dossier.ref) f[L.ref] = dossier.ref;
  if (dossier.prenom) f[L.prenom] = dossier.prenom;
  if (dossier.nom) f[L.nom] = dossier.nom;
  const proxyEmail = clientEmailForRef(dossier.ref);
  if (proxyEmail) f[L.email] = proxyEmail;
  else if (dossier.email) f[L.email] = dossier.email;
  if (dossier.whatsapp) f[L.whatsapp] = dossier.whatsapp;
  if (dossier.address) f[L.adresse] = dossier.address;
  if (dossier.vol) f[L.vol] = dossier.vol;
  if (dossier.dateVol) f[L.dateVol] = dossier.dateVol;
  if (dossier.compagnie) f[L.compagnie] = dossier.compagnie;
  if (dossier.pnr) f[L.pnr] = dossier.pnr;
  if (dossier.incident) f[L.incident] = dossier.incident;
  if (dossier.indemnite != null) f[L.indemnite] = dossier.indemnite;
  if (dossier.route) f[L.itineraire] = dossier.route;
  if (dossier.statutSuivi) f[L.statutSuivi] = dossier.statutSuivi;
  if (dossier.remarques) f[L.remarques] = dossier.remarques;
  return f;
}

function verifySecret(body, headers) {
  const expected = (process.env.AIRTABLE_WEBHOOK_SECRET || process.env.AIRTABLE_SYNC_SECRET || '').trim();
  if (!expected) return { ok: false, error: 'AIRTABLE_WEBHOOK_SECRET non configuré sur Netlify' };
  const fromBody = body && body.secret;
  const fromHeader = headers['x-airtable-secret'] || headers['X-Airtable-Secret'];
  if (fromBody === expected || fromHeader === expected) return { ok: true };
  return { ok: false, error: 'Secret invalide' };
}

module.exports = {
  SITE_URL,
  airtableCfg,
  recordFromAirtableFields,
  buildMandatUrl,
  airtableFindByRef,
  airtableGetRecord,
  airtablePatch,
  airtableCreate,
  dossierToAirtableFields,
  clientEmailForRef,
  verifySecret,
  fieldVal,
};
