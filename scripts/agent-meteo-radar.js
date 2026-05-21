#!/usr/bin/env node
/**
 * Capture de preuves visuelles — vol (radar) + météo aéroport.
 * Usage : node scripts/agent-meteo-radar.js AF1234 BSL
 *         npm run proofs:capture -- AF718 BJL
 *
 * Sortie : proofs/<VOL>-<IATA>-<timestamp>-radar.png | -meteo.png
 *
 * Prérequis : npm install (playwright en devDependency)
 *   npx playwright install chromium
 *
 * Note : FlightRadar24 / FlightStats peuvent bloquer l’automatisation.
 * Pour des preuves METAR officielles, voir aussi aviationweather.gov (ajout optionnel).
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PROOFS_DIR = path.join(ROOT, 'proofs');

function usage() {
  console.log('Usage: node scripts/agent-meteo-radar.js <NUM_VOL> <IATA_AEROPORT>');
  console.log('Exemple: node scripts/agent-meteo-radar.js AF718 BJL');
  process.exit(1);
}

function normalizeFlight(num) {
  const s = String(num || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  if (!/^[A-Z]{2}\d{1,4}[A-Z]?$/.test(s)) {
    throw new Error(`Numéro de vol invalide : ${num} (ex. AF718, SN271)`);
  }
  return s;
}

function normalizeIata(code) {
  const s = String(code || '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{3}$/.test(s)) {
    throw new Error(`Code aéroport IATA invalide : ${code} (3 lettres, ex. BJL, CDG)`);
  }
  return s;
}

function stamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

async function capturePreuves(numVol, aeroport) {
  const vol = normalizeFlight(numVol);
  const iata = normalizeIata(aeroport);
  const ts = stamp();
  const prefix = path.join(PROOFS_DIR, `${vol}-${iata}-${ts}`);

  fs.mkdirSync(PROOFS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'fr-FR',
  });
  const page = await context.newPage();

  const out = { vol, iata, files: [], errors: [] };

  try {
    const fr24 = `https://www.flightradar24.com/data/flights/${vol.toLowerCase()}`;
    console.log(`Recherche du vol ${vol}…`);
    console.log(`  → ${fr24}`);
    try {
      await page.goto(fr24, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(4000);
      const radarPath = `${prefix}-radar.png`;
      await page.screenshot({ path: radarPath, fullPage: false });
      out.files.push(radarPath);
      console.log(`  ✓ ${path.relative(ROOT, radarPath)}`);
    } catch (e) {
      out.errors.push({ step: 'radar', message: e.message });
      console.warn(`  ⚠ Radar : ${e.message}`);
    }

    const meteoUrls = [
      {
        name: 'flightstats',
        url: `https://www.flightstats.com/v2/airport-conditions/${iata}`,
      },
      {
        name: 'aviationweather-metar',
        url: `https://aviationweather.gov/api/data/metar?ids=${iata}&format=raw`,
      },
    ];

    for (const { name, url } of meteoUrls) {
      console.log(`Météo (${name}) pour ${iata}…`);
      console.log(`  → ${url}`);
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(name === 'flightstats' ? 3000 : 1500);
        const meteoPath = `${prefix}-meteo-${name}.png`;
        await page.screenshot({ path: meteoPath, fullPage: name !== 'flightstats' });
        out.files.push(meteoPath);
        console.log(`  ✓ ${path.relative(ROOT, meteoPath)}`);
      } catch (e) {
        out.errors.push({ step: name, message: e.message });
        console.warn(`  ⚠ ${name} : ${e.message}`);
      }
    }

    const manifestPath = `${prefix}-manifest.json`;
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          vol,
          aeroport: iata,
          capturedAt: new Date().toISOString(),
          files: out.files.map((f) => path.relative(ROOT, f)),
          errors: out.errors,
        },
        null,
        2
      ),
      'utf8'
    );
    out.files.push(manifestPath);
    console.log(`  ✓ ${path.relative(ROOT, manifestPath)}`);

    if (out.files.length <= 1 && out.errors.length) {
      throw new Error('Aucune capture réussie — sites peut-être bloqués ou timeout.');
    }
    console.log('\n✅ Preuves enregistrées dans proofs/');
  } finally {
    await browser.close();
  }

  return out;
}

const numVol = process.argv[2];
const aeroport = process.argv[3];
if (!numVol || !aeroport) usage();

capturePreuves(numVol, aeroport).catch((err) => {
  console.error('Erreur :', err.message || err);
  process.exit(1);
});
