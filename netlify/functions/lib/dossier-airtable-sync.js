/**
 * Auto-sync d'un dossier complété (bot WhatsApp) → Airtable, à la création.
 *
 * Comble le trou « CRM Make pipeline cassé » : sans cela, seul le mandat SIGNÉ
 * atteint Airtable (submit-mandat). Les dossiers complétés mais NON encore signés
 * n'y arrivaient jamais (MAKE_WEBHOOK_NEW_DOSSIER absent côté Railway).
 *
 * SÛR PAR CONSTRUCTION : ne CRÉE que les enregistrements MANQUANTS, avec le statut
 * « Signature en attente ». Si le dossier existe déjà (ex. déjà signé), il n'est PAS
 * touché → aucun risque de downgrade de statut ni d'écrasement de données.
 * Best-effort : ne jette jamais (un échec Airtable ne doit pas casser le dépôt Blobs).
 */

const { airtableCfg, airtableFindByRef, airtableCreate, dossierToAirtableFields } = require('./airtable-robin');

/** « Aminata Diallo » → { prenom:'Aminata', nom:'Diallo' } ; 1 seul mot → tout en nom. */
function splitName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { prenom: '', nom: '' };
  if (parts.length === 1) return { prenom: '', nom: parts[0] };
  return { prenom: parts[0], nom: parts.slice(1).join(' ') };
}

/** Montant → nombre sûr (Airtable attend un nombre), sinon undefined (champ omis). */
function indemniteNumber(v) {
  if (v == null) return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  const n = parseFloat(String(v).replace(/[^\d.,]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * @param dossier shape bot : { ref, name, address, phone, vol, compagnie, pnr, date, indemnite, incident?, route? }
 * @returns {Promise<{ok:boolean, action?:string, skipped?:string, recordId?:string, error?:string}>}
 */
async function syncNewDossierToAirtable(dossier) {
  try {
    const cfg = airtableCfg();
    if (!cfg) return { ok: false, skipped: 'airtable_non_configure' };
    const ref = String((dossier && dossier.ref) || '').trim();
    if (!ref) return { ok: false, skipped: 'no_ref' };

    // Ne JAMAIS toucher un dossier déjà présent (signé, en cours…). On ne fait que combler les manques.
    const existing = await airtableFindByRef(cfg, ref);
    if (existing && existing.length) return { ok: true, skipped: 'exists', recordId: existing[0].id };

    const { prenom, nom } = splitName(dossier.name);
    const fields = dossierToAirtableFields(cfg, {
      ref,
      prenom,
      nom,
      whatsapp: dossier.phone || '',
      address: dossier.address || '',
      vol: dossier.vol || '',
      dateVol: /^\d{4}-\d{2}-\d{2}/.test(String(dossier.date)) ? String(dossier.date).slice(0, 10) : '',
      compagnie: dossier.compagnie || '',
      pnr: dossier.pnr ? String(dossier.pnr).toUpperCase() : '',
      incident: dossier.incident || '',
      indemnite: indemniteNumber(dossier.indemnite),
      route: dossier.route || '',
      statutSuivi: cfg.statutSignatureAttente, // « Signature en attente » : mandat prêt, pas encore signé
      remarques: `Dossier complété via bot WhatsApp le ${new Date().toISOString().slice(0, 10)} — en attente de signature.`,
    });

    const created = await airtableCreate(cfg, fields);
    return { ok: true, action: 'created', recordId: created && created.id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { syncNewDossierToAirtable, splitName, indemniteNumber };
