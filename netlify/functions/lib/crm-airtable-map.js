/**
 * Mapping dossier CRM (crm/index.html) ↔ payload Airtable (airtable-robin.js).
 */

const CRM_STATUT_TO_AT = {
  BROUILLON: 'Nouveau',
  ELIGIBLE: 'Documents en cours',
  MANDAT_SIGNE: 'Mandat signé',
  LRAR_ENVOYEE: 'LRAR envoyée',
  RELANCE_1: 'Relance 1',
  RELANCE_2: 'Relance 2',
  MEDIATION: 'Médiation',
  CONTENTIEUX: 'Contentieux',
  PAYE: 'Payé client',
  REFUSE_DEFINITIF: 'Refus définitif',
  ABANDON: 'Abandon',
  PRESCRIT: 'Prescrit',
};

const CRM_INC_TO_AT = {
  RETARD: 'Retard +3h',
  ANNULATION: 'Annulation',
  SURBOOKING: 'Surbooking',
  REFUS_EMBARQUEMENT: "Refus d'embarquement",
  CORRESPONDANCE_MANQUEE: 'Correspondance manquée',
};

const AT_STATUT_TO_CRM = Object.fromEntries(
  Object.entries(CRM_STATUT_TO_AT).map(([crm, at]) => [at, crm])
);

const AT_INC_TO_CRM = Object.fromEntries(
  Object.entries(CRM_INC_TO_AT).map(([crm, at]) => [at, crm])
);

function airtableStatutToCrm(statutSuivi) {
  const s = String(statutSuivi || '').trim();
  if (!s) return 'ELIGIBLE';
  if (AT_STATUT_TO_CRM[s]) return AT_STATUT_TO_CRM[s];
  const key = Object.keys(CRM_STATUT_TO_AT).find(
    (k) => CRM_STATUT_TO_AT[k].toLowerCase() === s.toLowerCase()
  );
  return key || 'ELIGIBLE';
}

function parseWhatsAppForCrm(whatsapp) {
  const raw = String(whatsapp || '').replace(/\s/g, '');
  if (!raw) return { indicatif: '+33', tel: '' };
  if (raw.startsWith('+33')) {
    return { indicatif: '+33', tel: raw.slice(3).replace(/\D/g, '') };
  }
  if (raw.startsWith('+32') || raw.startsWith('32')) {
    const n = raw.replace(/^\+?32/, '').replace(/\D/g, '');
    return { indicatif: '+32', tel: n };
  }
  if (raw.startsWith('+')) {
    const m = raw.match(/^\+(\d{1,3})(\d+)$/);
    if (m) return { indicatif: '+' + m[1], tel: m[2] };
  }
  return { indicatif: '+33', tel: raw.replace(/\D/g, '') };
}

function formatWhatsApp(indicatif, tel) {
  const ind = String(indicatif || '').replace(/\D/g, '');
  const num = String(tel || '').replace(/\D/g, '');
  if (!num) return '';
  if (ind === '33' && num.length === 9) return `+33${num}`;
  if (ind === '32') {
    if (num.length === 9) return `32${num.replace(/^0+/, '')}`;
    if (num.length === 10 && num[0] === '0') return `32${num.slice(1)}`;
  }
  if (ind) return `+${ind}${num}`;
  if (num.length >= 10) return num.startsWith('+') ? num : `+${num}`;
  return '';
}

function firstVol(d) {
  const vols = d && Array.isArray(d.vols) ? d.vols : [];
  return vols[0] || {};
}

function crmRemarques(d) {
  const parts = [];
  if (d.source) parts.push(`Source CRM: ${d.source}`);
  if (d.priorite) parts.push(`Priorité: ${d.priorite}`);
  if (d.lrar) parts.push(`LRAR: ${d.lrar}`);
  const ev = Array.isArray(d.events) && d.events.length ? d.events[d.events.length - 1] : null;
  if (ev && ev.action) {
    parts.push(`Dernier événement: ${ev.action}${ev.meta ? ` — ${ev.meta}` : ''}`);
  }
  if (d.updated_by) parts.push(`MAJ CRM: ${d.updated_by}`);
  return parts.join(' | ').slice(0, 900);
}

/** Dossier CRM → objet attendu par dossierToAirtableFields */
function crmDossierToAirtableDossier(d) {
  if (!d || !d.id) return null;
  const v = firstVol(d);
  const route =
    v.dep || v.arr
      ? `${(v.dep || '').trim()}→${(v.arr || '').trim()}`.replace(/^→|→$/g, '')
      : '';
  const adultes = parseInt(d.adultes, 10) || 1;
  const palier = parseInt(d.palier, 10) || 600;
  const indemnite = adultes * palier;

  return {
    ref: String(d.id).trim(),
    prenom: (d.prenom || '').trim(),
    nom: (d.nom || '').trim(),
    email: (d.email || '').trim(),
    whatsapp: formatWhatsApp(d.indicatif, d.tel),
    address: (d.adresse || '').trim(),
    vol: (v.vol || '').trim(),
    dateVol: (v.date || '').trim(),
    compagnie: (v.comp || '').trim(),
    pnr: (v.pnr || '').trim(),
    incident: CRM_INC_TO_AT[v.inc] || CRM_INC_TO_AT.RETARD,
    indemnite,
    route,
    statutSuivi: CRM_STATUT_TO_AT[d.statut] || d.statut || 'Nouveau',
    remarques: crmRemarques(d),
  };
}

/** Enregistrement Airtable (champs nommés) → squelette dossier CRM */
function airtableRecordToCrmDossier(data) {
  if (!data || !data.ref) return null;
  const parts = String(data.name || `${data.prenom || ''} ${data.nom || ''}`).trim().split(/\s+/);
  const prenom = data.prenom || (parts.length > 1 ? parts[0] : parts[0] || '');
  const nom = data.nom || (parts.length > 1 ? parts.slice(1).join(' ').toUpperCase() : '');

  let dateVol = data.date || '';
  if (/^\d{4}-\d{2}-\d{2}/.test(dateVol)) dateVol = dateVol.slice(0, 10);

  const route = (data.route || '').split('→');
  const dep = route[0] ? route[0].trim() : '';
  const arr = route[1] ? route[1].trim() : '';

  const statutKey = airtableStatutToCrm(data.statutSuivi);
  const wa = parseWhatsAppForCrm(data.whatsapp);
  const indemniteNum = parseInt(String(data.indemnite || '').replace(/[^\d]/g, ''), 10);
  const palier = indemniteNum > 0 ? indemniteNum : 600;
  const incKey = AT_INC_TO_CRM[data.incident] || 'RETARD';

  return {
    id: data.ref,
    statut: statutKey,
    priorite: 'STANDARD',
    date: new Date().toISOString().slice(0, 10),
    date_statut: new Date().toISOString().slice(0, 10),
    date_paiement: statutKey === 'PAYE' ? new Date().toISOString().slice(0, 10) : null,
    source: 'airtable',
    lrar: null,
    prenom,
    nom,
    indicatif: wa.indicatif,
    tel: wa.tel,
    email: data.email || `${String(data.ref).toLowerCase()}@robindesairs.eu`,
    adresse: data.address || '',
    adultes: 1,
    bebes: 0,
    coPassagers: [],
    vols: [
      {
        comp: data.compagnie || '—',
        vol: data.vol || '—',
        date: dateVol || '—',
        dep,
        arr,
        pnr: data.pnr || '',
        inc: incKey,
      },
    ],
    palier,
    pieces: [],
    events: [
      {
        date: new Date().toISOString().slice(0, 10),
        action: 'Import Airtable',
        meta: data.statutSuivi || '',
      },
    ],
    updated_at: new Date().toISOString(),
    updated_by: 'Airtable',
    airtable_record_id: data.recordId || null,
  };
}

module.exports = {
  CRM_STATUT_TO_AT,
  CRM_INC_TO_AT,
  AT_STATUT_TO_CRM,
  crmDossierToAirtableDossier,
  airtableRecordToCrmDossier,
  airtableStatutToCrm,
  formatWhatsApp,
};
