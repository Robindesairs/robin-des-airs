#!/usr/bin/env node
'use strict';

/**
 * scraper-agences-cameroun.js — Robin des Airs
 *
 * Scrape les agences de voyage au Cameroun depuis plusieurs sources :
 *   1. Pages Jaunes Cameroun (pagesjaunes.cm)
 *   2. Google Maps (recherche "agences de voyage Douala/Yaoundé")
 *
 * Sortie : data/agences-cameroun.json + data/agences-cameroun.csv
 *
 * Usage :
 *   node scripts/scraper-agences-cameroun.js              → toutes les sources
 *   node scripts/scraper-agences-cameroun.js --source=pj  → Pages Jaunes seulement
 *   node scripts/scraper-agences-cameroun.js --source=gmaps → Google Maps seulement
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../data');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'agences-cameroun.json');
const OUTPUT_CSV = path.join(OUTPUT_DIR, 'agences-cameroun.csv');

const SOURCE = (process.argv.find(a => a.startsWith('--source=')) || '').replace('--source=', '') || 'all';

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString('fr-FR')}] ${msg}`);
}

function dedup(agences) {
  const seen = new Set();
  return agences.filter(a => {
    const key = (a.nom + a.telephone).toLowerCase().replace(/\s/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toCSV(agences) {
  const headers = ['nom', 'telephone', 'email', 'adresse', 'ville', 'site', 'source'];
  const lines = [headers.join(';')];
  for (const a of agences) {
    lines.push(headers.map(h => `"${(a[h] || '').replace(/"/g, '""')}"`).join(';'));
  }
  return lines.join('\n');
}

// ─── Scraper Pages Jaunes Cameroun ───────────────────────────────────────────

async function scrapePagesJaunes(page) {
  const agences = [];
  const villes = ['douala', 'yaounde', 'bafoussam', 'garoua', 'bamenda'];

  for (const ville of villes) {
    log(`Pages Jaunes → recherche agences de voyage à ${ville}...`);
    try {
      await page.goto(
        `https://www.pagesjaunes.cm/search?q=agence+de+voyage&where=${ville}`,
        { waitUntil: 'domcontentloaded', timeout: 20000 }
      );
      await sleep(2000);

      const results = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('.listing-item, .business-card, .result-item, article').forEach(el => {
          const nom = el.querySelector('h2, h3, .name, .title, [class*="name"]')?.textContent?.trim();
          const tel = el.querySelector('[href^="tel:"], .phone, [class*="phone"], [class*="tel"]')?.textContent?.trim()
                   || el.querySelector('[href^="tel:"]')?.href?.replace('tel:', '');
          const adresse = el.querySelector('.address, [class*="address"], [class*="adresse"]')?.textContent?.trim();
          const site = el.querySelector('a[href^="http"]')?.href;
          if (nom) items.push({ nom, telephone: tel || '', adresse: adresse || '', site: site || '' });
        });
        return items;
      });

      for (const r of results) {
        agences.push({ ...r, ville, email: '', source: 'pagesjaunes.cm' });
      }
      log(`  → ${results.length} résultats à ${ville}`);
    } catch (e) {
      log(`  ⚠ Erreur ${ville}: ${e.message}`);
    }
    await sleep(1500);
  }

  return agences;
}

// ─── Scraper Google Maps ──────────────────────────────────────────────────────

async function scrapeGoogleMaps(page) {
  const agences = [];
  const recherches = [
    'agences de voyage Douala Cameroun',
    'agences de voyage Yaoundé Cameroun',
    'travel agency Douala',
    'agence billet avion Douala',
  ];

  for (const query of recherches) {
    log(`Google Maps → "${query}"...`);
    try {
      await page.goto(
        `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
        { waitUntil: 'networkidle2', timeout: 30000 }
      );
      await sleep(3000);

      // Scroll pour charger plus de résultats
      const listSelector = '[role="feed"], .m6QErb';
      for (let i = 0; i < 5; i++) {
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) el.scrollTop += 800;
        }, listSelector);
        await sleep(1000);
      }

      const results = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('[data-result-index], .Nv2PK, [jsaction*="pane.result"]').forEach(el => {
          const nom = el.querySelector('.qBF1Pd, .fontHeadlineSmall, h3')?.textContent?.trim();
          const adresse = el.querySelector('.W4Efsd:last-child, .UsdlK, [data-tooltip]')?.textContent?.trim();
          const tel = el.querySelector('[data-item-id*="phone"], [href^="tel:"]')?.textContent?.trim()
                    || el.querySelector('[href^="tel:"]')?.href?.replace('tel:', '');
          const site = el.querySelector('[data-item-id*="authority"], [href^="https://"]')?.href;
          if (nom) items.push({ nom, telephone: tel || '', adresse: adresse || '', site: site || '' });
        });
        return items;
      });

      // Extraire la ville de la query
      const ville = query.includes('Yaoundé') ? 'Yaoundé' : 'Douala';
      for (const r of results) {
        agences.push({ ...r, ville, email: '', source: 'google-maps' });
      }
      log(`  → ${results.length} résultats`);

      // Ouvrir chaque fiche pour récupérer le tel/email détaillé
      // (optionnel, décommenter si tu veux les détails complets)
      // await enrichFromGoogleMaps(page, results);

    } catch (e) {
      log(`  ⚠ Erreur: ${e.message}`);
    }
    await sleep(2000);
  }

  return agences;
}

// ─── Enrichissement email ─────────────────────────────────────────────────────

async function enrichEmails(page, agences) {
  log('Enrichissement emails (sites des agences)...');
  for (const agence of agences) {
    if (!agence.site || agence.email) continue;
    try {
      await page.goto(agence.site, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await sleep(500);
      const email = await page.evaluate(() => {
        const body = document.body.innerHTML;
        const match = body.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
        return match ? match[0] : '';
      });
      if (email) {
        agence.email = email;
        process.stdout.write(`  ✓ ${agence.nom}: ${email}\n`);
      }
    } catch { /* site inaccessible */ }
  }
  return agences;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  log('Lancement du navigateur...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=fr-FR'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: 1280, height: 800 });
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'fr-FR,fr;q=0.9' });

  let agences = [];

  if (SOURCE === 'all' || SOURCE === 'pj') {
    const pj = await scrapePagesJaunes(page);
    agences = agences.concat(pj);
    log(`Pages Jaunes : ${pj.length} agences trouvées`);
  }

  if (SOURCE === 'all' || SOURCE === 'gmaps') {
    const gm = await scrapeGoogleMaps(page);
    agences = agences.concat(gm);
    log(`Google Maps : ${gm.length} agences trouvées`);
  }

  // Enrichissement emails depuis les sites
  await enrichEmails(page, agences);

  await browser.close();

  // Déduplication
  agences = dedup(agences);
  log(`Total après déduplication : ${agences.length} agences`);

  // Sauvegarde
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(agences, null, 2), 'utf8');
  fs.writeFileSync(OUTPUT_CSV, toCSV(agences), 'utf8');

  log(`✅ Sauvegardé :`);
  log(`   JSON → ${OUTPUT_JSON}`);
  log(`   CSV  → ${OUTPUT_CSV}`);

  // Aperçu
  console.log('\n── Aperçu (10 premiers) ──────────────────────────────');
  agences.slice(0, 10).forEach((a, i) => {
    console.log(`${i + 1}. ${a.nom} | ${a.ville} | ${a.telephone || 'pas de tel'} | ${a.email || 'pas d\'email'}`);
  });
}

main().catch(err => {
  console.error('Erreur fatale :', err.message);
  process.exit(1);
});
