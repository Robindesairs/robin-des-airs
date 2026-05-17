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

const { isProduction, allowInsecureAuth } = require('./auth-config');
const { verifyPassword, hashPassword } = require('./password-hash');

/** Dev local uniquement si ALLOW_INSECURE_AUTH=true */
const DEV_FALLBACK = [
  {
    code: 'DEMO',
    pass: 'demo',
    name: 'Agence Démo',
    airtableMatch: 'DEMO',
  },
];

function normalizeAccount(a) {
  return {
    code: String(a.code || '').trim().toUpperCase(),
    pass: String(a.pass || ''),
    passHash: String(a.passHash || a.pass_hash || ''),
    name: String(a.name || a.code || '').trim(),
    airtableMatch: String(a.airtableMatch || a.code || '').trim(),
  };
}

function loadAgencyAccounts() {
  const raw = (process.env.AGENCY_ACCOUNTS || '').trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map(normalizeAccount).filter((a) => a.code && (a.pass || a.passHash));
      }
    } catch (e) {
      console.error('agency-accounts: JSON invalide', e.message);
    }
  }
  if (!isProduction() || allowInsecureAuth()) return DEV_FALLBACK.map(normalizeAccount);
  return [];
}

function accountPasswordOk(account, pass) {
  if (account.passHash) return verifyPassword(pass, account.passHash);
  if (account.pass) return account.pass === pass;
  return false;
}

function findAgencyAccount(code, pass) {
  const c = String(code || '').trim().toUpperCase();
  const p = String(pass || '');
  if (!c || !p) return null;
  const hit = loadAgencyAccounts().find((a) => a.code === c);
  if (!hit || !accountPasswordOk(hit, p)) return null;
  return hit;
}

function getAgencyByCode(code) {
  const c = String(code || '').trim().toUpperCase();
  return loadAgencyAccounts().find((a) => a.code === c) || null;
}

module.exports = {
  loadAgencyAccounts,
  findAgencyAccount,
  getAgencyByCode,
  hashPassword,
};
