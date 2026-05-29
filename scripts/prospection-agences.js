#!/usr/bin/env node
'use strict';

/**
 * prospection-agences.js — Robin des Airs
 *
 * Lit data/agences-cameroun.json (produit par scraper-agences-cameroun.js)
 * et envoie un template WhatsApp Wati à chaque agence non encore contactée.
 *
 * Pré-requis :
 *   - WATI_AGENCY_API_BASE et WATI_AGENCY_API_TOKEN dans .env
 *   - WATI_AGENCY_CHANNEL_PHONE dans .env
 *   - Template "outreach_agence_partenaire" approuvé dans Wati
 *
 * Usage :
 *   node scripts/prospection-agences.js             → envoie à tous les numéros non contactés
 *   node scripts/prospection-agences.js --dry-run   → affiche sans envoyer
 *   node scripts/prospection-agences.js --limit=20  → max 20 envois
 *
 * Suivi : data/prospection-log.json (évite les doublons entre sessions)
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const AGENCIES_FILE = path.join(DATA_DIR, 'agences-cameroun.json');
const LOG_FILE = path.join(DATA_DIR, 'prospection-log.json');

// Variables d'env Wati
const WATI_BASE = (process.env.WATI_AGENCY_API_BASE || process.env.WATI_API_BASE || '').replace(/\/$/, '');
const WATI_TOKEN = process.env.WATI_AGENCY_API_TOKEN || process.env.WATI_API_TOKEN || '';
const WATI_CHANNEL = (process.env.WATI_AGENCY_CHANNEL_PHONE || '').replace(/\D/g, '');

// Nom du template approuvé dans Wati (à adapter selon votre compte)
const TEMPLATE_NAME = process.env.PROSPECTION_TEMPLATE || 'outreach_agence_partenaire';

// ─── Args ────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.replace('--limit=', ''), 10) : 50;
const DELAY_MS = 2500; // délai entre envois pour éviter le rate limit Wati

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function log(msg) { console.log(`[${new Date().toLocaleTimeString('fr-FR')}] ${msg}`); }

function normalizePhone(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  // Cameroun : +237 6XX XXX XXX
  if (d.startsWith('237')) return d;
  if (d.startsWith('6') && d.length === 9) return '237' + d;
  if (d.startsWith('0') && d.length === 10) return '237' + d.slice(1);
  return d;
}

function loadLog() {
  try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch { return {}; }
}

function saveLog(log_) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(log_, null, 2), 'utf8');
}

async function sendTemplate(phone, agencyName) {
  if (!WATI_BASE || !WATI_TOKEN) {
    return { ok: false, error: 'WATI_AGENCY_API_BASE / WATI_AGENCY_API_TOKEN manquants dans .env' };
  }

  const url = `${WATI_BASE}/api/v1/sendTemplateMessage?whatsappNumber=${encodeURIComponent(phone)}`;

  const body = {
    template_name: TEMPLATE_NAME,
    broadcast_name: `prospection_cmr_${Date.now()}`,
    parameters: [
      // Adaptez les noms de variables selon votre template Wati
      { name: 'agency_name', value: agencyName || 'votre agence' },
    ],
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WATI_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.ok === false) {
      const errMsg = data?.message || data?.error || `HTTP ${res.status}`;
      return { ok: false, error: String(errMsg).slice(0, 200) };
    }
    return { ok: true, messageId: data?.message?.whatsappMessageId || data?.id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(AGENCIES_FILE)) {
    console.error(`❌ Fichier introuvable : ${AGENCIES_FILE}`);
    console.error('   Lance d\'abord : npm run scraper:agences');
    process.exit(1);
  }

  const agencies = JSON.parse(fs.readFileSync(AGENCIES_FILE, 'utf8'));
  const contacted = loadLog();

  if (DRY_RUN) log('MODE DRY-RUN — aucun envoi réel');
  if (!WATI_BASE || !WATI_TOKEN) log('⚠ Variables Wati manquantes — mode dry-run forcé');
  if (!WATI_CHANNEL) log('⚠ WATI_AGENCY_CHANNEL_PHONE manquant');

  log(`${agencies.length} agences dans le fichier — ${Object.keys(contacted).length} déjà contactées`);

  let sent = 0, skipped = 0, errors = 0;
  const results = [];

  for (const agence of agencies) {
    if (sent >= LIMIT) break;

    const phone = normalizePhone(agence.telephone);
    if (!phone || phone.length < 9) {
      skipped++;
      continue;
    }

    if (contacted[phone]) {
      skipped++;
      continue;
    }

    const label = `${agence.nom} (${agence.ville || '?'}) — ${phone}`;

    if (DRY_RUN || !WATI_BASE || !WATI_TOKEN) {
      log(`[DRY] → ${label}`);
      results.push({ phone, nom: agence.nom, ville: agence.ville, status: 'dry-run' });
      sent++;
      continue;
    }

    process.stdout.write(`  Envoi → ${label}... `);
    const result = await sendTemplate(phone, agence.nom);

    if (result.ok) {
      contacted[phone] = { sentAt: new Date().toISOString(), nom: agence.nom, ville: agence.ville };
      saveLog(contacted);
      results.push({ phone, nom: agence.nom, ville: agence.ville, status: 'sent', messageId: result.messageId });
      process.stdout.write('✅\n');
      sent++;
    } else {
      results.push({ phone, nom: agence.nom, ville: agence.ville, status: 'error', error: result.error });
      process.stdout.write(`❌ ${result.error}\n`);
      errors++;
    }

    await sleep(DELAY_MS);
  }

  console.log('\n─────────────────────────────────────');
  log(`✅ Envoyés  : ${sent}`);
  log(`⏭ Ignorés  : ${skipped} (déjà contactés ou sans tel)`);
  if (errors) log(`❌ Erreurs  : ${errors}`);

  // Rapport
  const reportFile = path.join(DATA_DIR, `prospection-rapport-${new Date().toISOString().slice(0,10)}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2), 'utf8');
  log(`Rapport → ${reportFile}`);
}

main().catch(err => {
  console.error('Erreur fatale :', err.message);
  process.exit(1);
});
