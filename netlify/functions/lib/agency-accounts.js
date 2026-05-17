/**
 * Comptes agences partenaires — variable Netlify AGENCY_ACCOUNTS (JSON).
 *
 * Exemple :
 * [
 *   {"code":"GSA-DKR-001","pass":"robin2024","name":"GSA Dakar","airtableMatch":"GSA-DKR-001"},
 *   {"code":"DEMO","pass":"demo","name":"Agence Démo","airtableMatch":"DEMO"}
 * ]
 */

const FALLBACK = [
  {
    code: 'GSA-DKR-001',
    pass: 'robin2024',
    name: 'GSA Dakar — Agence Teranga',
    airtableMatch: 'GSA-DKR-001',
  },
  {
    code: 'GSA-ABJ-002',
    pass: 'robin2024',
    name: 'GSA Abidjan — Voyages Ivoire',
    airtableMatch: 'GSA-ABJ-002',
  },
  {
    code: 'GSA-BKO-003',
    pass: 'robin2024',
    name: 'GSA Bamako — Mali Tours',
    airtableMatch: 'GSA-BKO-003',
  },
  { code: 'DEMO', pass: 'demo', name: 'Agence Démo', airtableMatch: 'DEMO' },
];

function loadAgencyAccounts() {
  const raw = (process.env.AGENCY_ACCOUNTS || '').trim();
  if (!raw) return FALLBACK;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return FALLBACK;
    return parsed.map((a) => ({
      code: String(a.code || '').trim().toUpperCase(),
      pass: String(a.pass || ''),
      name: String(a.name || a.code || '').trim(),
      airtableMatch: String(a.airtableMatch || a.code || '').trim(),
    })).filter((a) => a.code && a.pass);
  } catch {
    return FALLBACK;
  }
}

function findAgencyAccount(code, pass) {
  const c = String(code || '').trim().toUpperCase();
  const p = String(pass || '');
  if (!c || !p) return null;
  return loadAgencyAccounts().find((a) => a.code === c && a.pass === p) || null;
}

function getAgencyByCode(code) {
  const c = String(code || '').trim().toUpperCase();
  return loadAgencyAccounts().find((a) => a.code === c) || null;
}

module.exports = {
  loadAgencyAccounts,
  findAgencyAccount,
  getAgencyByCode,
};
