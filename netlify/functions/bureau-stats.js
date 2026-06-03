/**
 * GET /api/bureau-stats
 * Agrège les vraies données Airtable (Dossiers Passagers + Agences Partenaires)
 * pour alimenter le tableau de bord interne « Le Bureau ».
 * La clé Airtable reste côté serveur (env AIRTABLE_API_KEY) — jamais exposée au client.
 */

const BASE = (process.env.AIRTABLE_BASE_ID || 'appv72lKbQtjt7EIP').trim();
const T_DOSSIERS = (process.env.AIRTABLE_TABLE_ID || 'tblfg688AGxaywi7O').trim();
const T_AGENCES = (process.env.AIRTABLE_TABLE_AGENCES || 'tbleJVsy8Is5VygkQ').trim();

// IDs de champs (stables, insensibles aux accents)
const F = {
  indemnite: 'fldlzkJOqqC8AYbIM',     // Montant de l'indemnité (Dossiers)
  montantClient: 'fldloBwQlvX9I3dyu', // Montant Client (Dossiers)
  statutSuivi: 'fldUnBUQFKeoKf8LL',   // Statut du Dossier Suivi
  whatsapp: 'fldsFH0PoWe3AV0sI',      // Numéro WhatsApp
  ag_statut: 'fldXE9N3wp1EDTblM',     // Statut (Agences)
  ag_revenu: 'fldS2mXrWeBgiCeXk',     // Revenu Total Généré (Agences)
  nom: 'fldCtJysGhTYF2LNf',           // Nom Passager
  prenom: 'fldai6AzcJXIePgAe',        // Prénom Passager
  compagnie: 'fld8Ku1jGMOPWnrQc',     // Compagnie Aérienne
  vol: 'fldcVnS4B86eZntjr',           // Numéro de vol
};
const selVal = (v) => (v && typeof v === 'object' ? (v.name || '') : (v || ''));

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=120',
  'Access-Control-Allow-Origin': '*',
};

// statuts de suivi considérés comme « gagné / payé »
const WON = new Set(['Payé client', 'Indemnisé', 'Indemnité reçue', 'Clôturé payé', 'Payé']);
// statuts indiquant un dossier engagé EN COURS (hors gagnés, pour ne pas double-compter)
const ENGAGED = new Set([
  'Mandat signé', 'LRAR envoyée', 'Documents en cours', 'Médiation', 'Contentieux',
]);

async function fetchAll(table) {
  const key = (process.env.AIRTABLE_API_KEY || '').trim();
  if (!key) throw new Error('AIRTABLE_API_KEY manquant');
  const out = [];
  let offset = '';
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE}/${table}`);
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('returnFieldsByFieldId', 'true');
    if (offset) url.searchParams.set('offset', offset);
    const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${key}` } });
    if (!r.ok) throw new Error(`Airtable ${table} → ${r.status}`);
    const data = await r.json();
    out.push(...(data.records || []));
    offset = data.offset || '';
  } while (offset);
  return out;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };
  try {
    const [dossiers, agences] = await Promise.all([fetchAll(T_DOSSIERS), fetchAll(T_AGENCES)]);

    let eur = 0, gagnes = 0, engages = 0, whatsappLeads = 0, dossiersValides = 0;
    for (const rec of dossiers) {
      const f = rec.fields || {};
      const indemnite = Number(f[F.indemnite] || 0);
      const montant = Number(f[F.montantClient] || 0);
      const statut = f[F.statutSuivi] ? (f[F.statutSuivi].name || f[F.statutSuivi]) : '';
      const hasContent = indemnite || montant || statut || f[F.whatsapp];
      if (!hasContent) continue; // ignore lignes vides
      dossiersValides++;
      eur += indemnite || montant || 0;
      if (WON.has(statut)) gagnes++;
      if (ENGAGED.has(statut)) engages++;
      if (f[F.whatsapp]) whatsappLeads++;
    }

    let agencesActives = 0, prospects = 0, revenuAgences = 0, agencesValides = 0;
    for (const rec of agences) {
      const f = rec.fields || {};
      const statut = f[F.ag_statut] ? (f[F.ag_statut].name || f[F.ag_statut]) : '';
      const nom = rec.fields && Object.keys(rec.fields).length;
      if (!nom) continue;
      agencesValides++;
      if (statut === 'Actif') agencesActives++;
      if (statut === 'À contacter') prospects++;
      revenuAgences += Number(f[F.ag_revenu] || 0);
    }

    const base = engages + gagnes;
    const taux = base > 0 ? Math.round((gagnes / Math.max(base, 1)) * 100) : null;

    // Activité récente RÉELLE (anonymisée : initiales seulement — endpoint public)
    const recent = dossiers
      .filter((r) => r.fields && (r.fields[F.statutSuivi] || r.fields[F.vol] || r.fields[F.compagnie]))
      .sort((a, b) => String(b.createdTime || '').localeCompare(String(a.createdTime || '')))
      .slice(0, 8)
      .map((r) => {
        const f = r.fields || {};
        const nom = String(selVal(f[F.nom])).trim();
        const prenom = String(selVal(f[F.prenom])).trim();
        const initiales = ((prenom[0] || '') + '.' + (nom[0] || '') + '.').toUpperCase().replace(/^\.+|\.+$/g, '') || 'Client';
        return {
          initiales,
          compagnie: String(selVal(f[F.compagnie])).slice(0, 24),
          vol: String(selVal(f[F.vol])).slice(0, 12),
          statut: String(selVal(f[F.statutSuivi]) || 'Nouveau').slice(0, 28),
          montant: Number(f[F.indemnite] || f[F.montantClient] || 0),
          at: r.createdTime || null,
        };
      });

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        ok: true,
        updatedAt: new Date().toISOString(),
        dossiers: dossiersValides,
        eur,
        gagnes,
        engages,
        whatsappLeads,
        agences: agencesValides,
        agencesActives,
        prospects,
        revenuAgences,
        taux, // % gagnés parmi les dossiers engagés (null si aucun)
        recent, // derniers dossiers réels (anonymisés) pour le fil d'activité
      }),
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: e.message }),
    };
  }
};
