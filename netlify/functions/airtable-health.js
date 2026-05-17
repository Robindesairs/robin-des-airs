/**
 * Santé config Airtable + auth CRM/agence (GET, auth CRM requis).
 */

const { airtableCfg, atHeaders } = require('./lib/airtable-robin');
const { checkCrmAccess } = require('./lib/crm-access');
const { getCrmAuthConfig, getAgencyAuthSecret, corsHeaders } = require('./lib/auth-config');
const { loadAgencyAccounts } = require('./lib/agency-accounts');
const { canSendWhatsApp, getProvider } = require('./lib/whatsapp-send-core');
const { blobsAvailable } = require('./lib/wa-convo-store');

const HEADERS = corsHeaders('crm');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  const auth = checkCrmAccess(event);
  if (!auth.ok) {
    return {
      statusCode: auth.configured === false ? 503 : 401,
      headers: HEADERS,
      body: JSON.stringify({ error: auth.error }),
    };
  }

  const cfg = airtableCfg();
  const report = {
    ok: true,
    timestamp: new Date().toISOString(),
    crm: {
      configured: !!getCrmAuthConfig(),
    },
    agency: {
      accounts: loadAgencyAccounts().length,
      authSecret: !!getAgencyAuthSecret(),
    },
    whatsapp: {
      provider: getProvider().name,
      canSend: canSendWhatsApp(),
    },
    blobs: blobsAvailable(),
    airtable: {
      configured: !!cfg,
      columns: [],
      missing: [],
    },
  };

  if (!cfg) {
    report.ok = false;
    report.airtable.error = 'AIRTABLE_API_KEY / BASE / TABLE manquants';
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(report) };
  }

  try {
    const url = `https://api.airtable.com/v0/meta/bases/${cfg.base}/tables`;
    const r = await fetch(url, { headers: atHeaders(cfg.key) });
    if (r.ok) {
      const meta = await r.json();
      const table = (meta.tables || []).find((t) => t.id === cfg.table || t.name === cfg.table);
      if (table) {
        const names = new Set((table.fields || []).map((f) => f.name));
        const required = Object.values(cfg.labels);
        required.forEach((col) => {
          report.airtable.columns.push({ name: col, present: names.has(col) });
          if (!names.has(col)) report.airtable.missing.push(col);
        });
        if (report.airtable.missing.length) report.ok = false;
      }
    } else {
      report.airtable.metaError = `HTTP ${r.status}`;
    }
  } catch (e) {
    report.airtable.metaError = e.message;
  }

  return { statusCode: 200, headers: HEADERS, body: JSON.stringify(report) };
};
