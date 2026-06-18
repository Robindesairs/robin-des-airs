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

const { airtableCfg, airtableFindByRef, airtableCreate, airtablePatch, dossierToAirtableFields } = require('./airtable-robin');

/** Date du bot (« JJ/MM/AAAA » français, ou ISO) → « AAAA-MM-JJ » pour le champ date Airtable. */
function toAirtableDate(d) {
  const s = String(d || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); // déjà ISO
  const m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/); // JJ/MM/AAAA
  if (m) { const yy = m[3].length === 2 ? '20' + m[3] : m[3]; return `${yy}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  return '';
}

/** « Aminata Diallo » → { prenom:'Aminata', nom:'Diallo' } ; 1 seul mot → tout en nom. */
function splitName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { prenom: '', nom: '' };
  if (parts.length === 1) return { prenom: '', nom: parts[0] };
  return { prenom: parts[0], nom: parts.slice(1).join(' ') };
}

/**
 * Co-passagers (tous les passagers SAUF le mandant) → texte multiligne pour Airtable.
 * Cœur du support « famille diaspora » : un dossier = N passagers, le principal dans
 * Nom/Prénom Passager, les autres ici. Vide si dossier mono-passager.
 */
function coPassagersText(dossier) {
  const list = Array.isArray(dossier && dossier.passengers) ? dossier.passengers : [];
  if (list.length <= 1) return '';
  const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const main = norm(dossier && dossier.name);
  let others = list.filter((p) => p && p.name && norm(p.name) !== main);
  if (others.length === list.length) others = list.slice(1); // mandant non identifié par nom → on retire le 1er
  return others.map((p) => {
    const nm = String((p && p.name) || '').trim();
    const dob = String((p && p.dob) || '').trim();
    return nm ? (dob ? `${nm} (né(e) le ${dob})` : nm) : '';
  }).filter(Boolean).join('\n');
}

/** Montant → nombre sûr (Airtable attend un nombre), sinon undefined (champ omis). */
function indemniteNumber(v) {
  if (v == null) return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  const n = parseFloat(String(v).replace(/[^\d.,]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Code interne du bot (server.js : delay/cancel/denied) → libellé Airtable du champ
 * « Type d'incident » (singleSelect). Évite que le code brut « delay » fuite dans le CRM.
 * Repli sur `motif` (libellé FR déjà propre, posé par le bot), puis sur la valeur telle quelle.
 */
const INCIDENT_CODE_TO_AT = { delay: 'Retard +3h', cancel: 'Annulation', denied: 'Surbooking' };
function incidentLabel(d) {
  const code = String((d && d.incident) || '').toLowerCase();
  if (INCIDENT_CODE_TO_AT[code]) return INCIDENT_CODE_TO_AT[code];
  return (String((d && d.motif) || '').trim()) || (d && d.incident) || '';
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

    const L = cfg.labels;
    // Champs FACTUELS du dossier (date convertie en ISO ; route avec repli depAirport→arrAirport).
    const dateVol = toAirtableDate(dossier.date);
    const route = dossier.route || [dossier.depAirport, dossier.arrAirport].filter(Boolean).join(' → ');
    const vol = dossier.vol || '';
    const compagnie = dossier.compagnie || '';
    const pnr = dossier.pnr ? String(dossier.pnr).toUpperCase() : '';

    const existing = await airtableFindByRef(cfg, ref);
    if (existing && existing.length) {
      // Dossier déjà présent (signé, en cours…) : on ne touche JAMAIS le statut ni un champ déjà
      // rempli. On AUTO-RÉPARE seulement les champs factuels VIDES (date, route, vol, compagnie, pnr).
      const rec = existing[0];
      const cur = rec.fields || {};
      const patch = {};
      if (dateVol && !cur[L.dateVol]) patch[L.dateVol] = dateVol;
      if (route && !cur[L.itineraire]) patch[L.itineraire] = route;
      if (vol && !cur[L.vol]) patch[L.vol] = vol;
      if (compagnie && !cur[L.compagnie]) patch[L.compagnie] = compagnie;
      if (pnr && !cur[L.pnr]) patch[L.pnr] = pnr;
      const coP = coPassagersText(dossier);
      if (coP && !cur[L.coPassagers]) patch[L.coPassagers] = coP;
      if (Object.keys(patch).length) {
        try { await airtablePatch(cfg, rec.id, patch); return { ok: true, action: 'repaired', recordId: rec.id, patched: Object.keys(patch).length }; }
        catch (e) { return { ok: false, error: 'patch: ' + e.message }; }
      }
      return { ok: true, skipped: 'exists', recordId: rec.id };
    }

    const { prenom, nom } = splitName(dossier.name);
    const fields = dossierToAirtableFields(cfg, {
      ref,
      prenom,
      nom,
      whatsapp: dossier.phone || '',
      address: dossier.address || '',
      vol,
      dateVol,
      compagnie,
      pnr,
      incident: incidentLabel(dossier),
      indemnite: indemniteNumber(dossier.indemnite),
      route,
      coPassagers: coPassagersText(dossier),
      statutSuivi: cfg.statutSignatureAttente, // « Signature en attente » : mandat prêt, pas encore signé
      remarques: `Dossier complété via bot WhatsApp le ${new Date().toISOString().slice(0, 10)} — en attente de signature.`,
    });

    const created = await airtableCreate(cfg, fields);
    return { ok: true, action: 'created', recordId: created && created.id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { syncNewDossierToAirtable, splitName, indemniteNumber, coPassagersText };
