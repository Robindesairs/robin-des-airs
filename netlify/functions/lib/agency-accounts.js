/**
 * Comptes agences — AGENCY_ACCOUNTS (JSON) obligatoire en production.
 *
 * Exemple :
 * [
 *   {"code":"GSA-DKR-001","passHash":"scrypt:...","name":"GSA Dakar","airtableMatch":"GSA-DKR-001"},
 *   {"code":"DEMO","pass":"demo","name":"Agence Démo","airtableMatch":"DEMO"}
 * ]
 *
 * Générer passHash : node -e "const {hashPassword}=require('./netlify/functions/lib/password-hash'); console.log(hashPassword('votre-mot-de-passe'))"
 */

const { isProduction, allowInsecureAuth, allowAgencyCodeOnly } = require('./auth-config');
const { verifyPassword, hashPassword } = require('./password-hash');
const { safeEqualString } = require('./safe-compare');

/** Dev local uniquement si ALLOW_INSECURE_AUTH=true */
const DEV_FALLBACK = [
  {
    code: 'DEMO',
    pass: 'demo',
    name: 'Agence Démo',
    airtableMatch: 'DEMO',
  },
  {
    code: 'GSA-KMS-001',
    pass: 'kombo2026',
    name: 'Kombo Travel Services',
    airtableMatch: 'GSA-KMS-001',
  },
  {
    code: 'SEYMAN-001',
    pass: 'seyman2026',
    name: 'Seyman Travel',
    airtableMatch: 'SEYMAN-001',
    commissionGmd: 3800,
    partnerSignedAt: '2026-06-01',
  },
];

function normalizeWaList(a) {
  const raw = a.whatsappPhones || a.whatsapp || a.phones || [];
  const list = Array.isArray(raw) ? raw : [raw];
  const { normalizeWatiPhone } = require('./wati-api');
  return list
    .map((p) => normalizeWatiPhone(String(p || '')))
    .filter((p) => p && p.length >= 10);
}

function normalizeAccount(a) {
  const commissionRaw = a.commissionGmd ?? a.commission_gmd;
  const commissionGmd =
    commissionRaw != null && String(commissionRaw).trim() !== ''
      ? Math.round(Number(commissionRaw))
      : null;
  return {
    code: String(a.code || '').trim().toUpperCase(),
    pass: String(a.pass || ''),
    passHash: String(a.passHash || a.pass_hash || ''),
    name: String(a.name || a.code || '').trim(),
    airtableMatch: String(a.airtableMatch || a.code || '').trim(),
    whatsappPhones: normalizeWaList(a),
    commissionGmd: Number.isFinite(commissionGmd) && commissionGmd > 0 ? commissionGmd : null,
    commissionTier: String(a.commissionTier || a.commission_tier || '').trim(),
    partnerSignedAt: String(a.partnerSignedAt || a.partner_signed_at || '').trim(),
  };
}

/** Agences permanentes — toujours actives en prod */
const STATIC_AGENCIES = [
  {
    code: 'SEYMAN-001',
    pass: 'seyman2026',
    name: 'Seyman Travel',
    airtableMatch: 'SEYMAN-001',
    commissionGmd: 3800,
    partnerSignedAt: '2026-06-01',
  },
];

function loadAgencyAccounts() {
  const raw = (process.env.AGENCY_ACCOUNTS || '').trim();
  let envAccounts = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        envAccounts = parsed.map(normalizeAccount).filter((a) => a.code && (a.pass || a.passHash));
      }
    } catch (e) {
      console.error('agency-accounts: JSON invalide', e.message);
    }
  }
  const staticAccounts = STATIC_AGENCIES.map(normalizeAccount);
  const devAccounts = (!isProduction() || allowInsecureAuth()) ? DEV_FALLBACK.map(normalizeAccount) : [];
  // Fusionner : env > static > dev (env a priorité si même code)
  const all = [...envAccounts, ...staticAccounts, ...devAccounts];
  const seen = new Set();
  return all.filter((a) => {
    if (seen.has(a.code)) return false;
    seen.add(a.code);
    return true;
  });
}

function accountPasswordOk(account, pass) {
  if (account.passHash) return verifyPassword(pass, account.passHash);
  if (account.pass) return safeEqualString(account.pass, pass);
  return false;
}

function findAgencyAccount(code, pass) {
  const c = String(code || '').trim().toUpperCase();
  const p = String(pass || '');
  if (!c) return null;
  const hit = loadAgencyAccounts().find((a) => a.code === c);
  if (!hit) return null;
  if (allowAgencyCodeOnly() && !p) return hit;
  if (!p) return null;
  if (!accountPasswordOk(hit, p)) return null;
  return hit;
}

function getAgencyByCode(code) {
  const c = String(code || '').trim().toUpperCase();
  return loadAgencyAccounts().find((a) => a.code === c) || null;
}

function findAgencyByWhatsAppPhone(phone) {
  const { normalizeWatiPhone } = require('./wati-api');
  const p = normalizeWatiPhone(phone);
  if (!p) return null;
  return (
    loadAgencyAccounts().find(
      (a) => a.whatsappPhones && a.whatsappPhones.some((w) => w === p)
    ) || null
  );
}

module.exports = {
  loadAgencyAccounts,
  findAgencyAccount,
  getAgencyByCode,
  findAgencyByWhatsAppPhone,
  hashPassword,
};
