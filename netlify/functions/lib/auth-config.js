/**
 * Configuration auth / CORS — fail-closed en production Netlify.
 */

const SITE_ORIGIN = (process.env.SITE_ORIGIN || process.env.URL || 'https://robindesairs.eu').replace(
  /\/$/,
  ''
);

function isProduction() {
  const ctx = (process.env.CONTEXT || '').toLowerCase();
  if (ctx === 'production') return true;
  const url = (process.env.URL || '').toLowerCase();
  return url.includes('robindesairs.eu') && !url.includes('deploy-preview');
}

/** Preview / local uniquement — jamais en production. */
function allowInsecureAuth() {
  if (isProduction()) return false;
  return (process.env.ALLOW_INSECURE_AUTH || '').trim() === 'true';
}

/** Preview uniquement — jamais en production (fail-closed). */
function allowAgencyCodeOnly() {
  if (isProduction()) return false;
  return (process.env.ALLOW_AGENCY_CODE_ONLY || '').trim() === 'true';
}

/**
 * Accès espace agence sans code (lien ?trial=1).
 * Netlify : AGENCY_TRIAL_PUBLIC=true (+ compte AGENCY_ACCOUNTS pour AGENCY_TRIAL_CODE).
 */
function allowAgencyTrialPublic() {
  return (process.env.AGENCY_TRIAL_PUBLIC || '').trim() === 'true';
}

function getAgencyTrialCode() {
  return String(process.env.AGENCY_TRIAL_CODE || 'GSA-KMS-001')
    .trim()
    .toUpperCase();
}

function getCrmAuthConfig() {
  const accessCode = (process.env.CRM_ACCESS_CODE || '').trim();
  const authSecret = (process.env.CRM_AUTH_SECRET || '').trim();
  if (accessCode && authSecret) return { accessCode, authSecret };
  if (allowInsecureAuth()) {
    const devCode = accessCode || 'robin-dakar';
    return { accessCode: devCode, authSecret: authSecret || devCode, insecure: true };
  }
  return null;
}

function getAgencyAuthSecret() {
  const s = (process.env.AGENCY_AUTH_SECRET || process.env.CRM_AUTH_SECRET || '').trim();
  if (s) return s;
  if (allowInsecureAuth()) {
    return (process.env.CRM_ACCESS_CODE || 'robin-dakar-agency-dev').trim();
  }
  return '';
}

function getMandatLinkSecret() {
  return (process.env.MANDAT_LINK_SECRET || process.env.CRM_AUTH_SECRET || '').trim();
}

/** APIs publiques du site (bandeau, dépôt) — origine fixe, pas de wildcard. */
function publicCorsHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': SITE_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    ...extra,
  };
}

function corsHeaders(kind) {
  const base = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  };
  if (kind === 'agency') {
    return {
      ...base,
      'Access-Control-Allow-Origin': SITE_ORIGIN,
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    };
  }
  return {
    ...base,
    'Access-Control-Allow-Origin': SITE_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, X-CRM-Code',
    'Access-Control-Allow-Credentials': 'true',
  };
}

module.exports = {
  SITE_ORIGIN,
  isProduction,
  allowInsecureAuth,
  allowAgencyCodeOnly,
  allowAgencyTrialPublic,
  getAgencyTrialCode,
  getCrmAuthConfig,
  getAgencyAuthSecret,
  getMandatLinkSecret,
  corsHeaders,
  publicCorsHeaders,
};
