/**
 * capture-preuves-vol.js — Robin des Airs
 *
 * Génère une preuve horodatée d'un vol pour dossier CE 261/2004.
 * Source : API AeroDataBox (fiable, non-bloquable, données certifiables)
 *
 * Usage : node scripts/capture-preuves-vol.js <NUM_VOL> <AEROPORT_DEP>
 * Exemple : node scripts/capture-preuves-vol.js AF1234 CDG
 *
 * Sortie dans proofs/<NUM_VOL>-<DATE>/ :
 *   - preuve.json    → données brutes horodatées (pièce principale)
 *   - preuve.html    → rapport lisible pour impression / envoi compagnie
 */

const fs   = require('fs');
const path = require('path');
const http = require('https');

// ─── Validation des arguments ─────────────────────────────────────────────────

const numVol   = (process.argv[2] || '').trim().toUpperCase();
const aeroport = (process.argv[3] || '').trim().toUpperCase();

if (!numVol || !/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(numVol)) {
  console.error('❌ Numéro de vol invalide. Exemple : AF1234 ou U21234');
  process.exit(1);
}
if (!aeroport || !/^[A-Z]{3}$/.test(aeroport)) {
  console.error('❌ Code aéroport invalide (3 lettres IATA). Exemple : CDG, ORY, BSL');
  process.exit(1);
}

// ─── Dossier de sortie ────────────────────────────────────────────────────────

const dateTag  = new Date().toISOString().slice(0, 10);
const outDir   = path.join(__dirname, '..', 'proofs', `${numVol}-${dateTag}`);
fs.mkdirSync(outDir, { recursive: true });

// ─── Clé API (depuis .env ou variable d'environnement) ───────────────────────

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || process.env.AERODATABOX_RAPIDAPI_KEY || '';
if (!RAPIDAPI_KEY) {
  console.error('❌ RAPIDAPI_KEY manquant. Définir dans .env ou variables d\'environnement.');
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fetchJson(url, headers) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP ${res.statusCode} — ${data.slice(0, 200)}`));
        }
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Réponse non-JSON : ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
  });
}

function delayLabel(minutes) {
  if (minutes == null) return '—';
  if (minutes >= 180) return `${minutes} min ⚠️ RETARD MAJEUR (≥3h — CE 261 éligible)`;
  if (minutes >= 120) return `${minutes} min ⚠️ RETARD SIGNIFICATIF (≥2h)`;
  if (minutes >= 60)  return `${minutes} min 🟠 Retard notable`;
  if (minutes > 0)    return `${minutes} min`;
  return '0 min — À l\'heure';
}

function formatTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      timeZone: 'Europe/Paris',
      dateStyle: 'short',
      timeStyle: 'short',
    }) + ' (Paris)';
  } catch { return iso; }
}

// ─── Récupération données vol ─────────────────────────────────────────────────

async function fetchFlightData(flightNum) {
  const host = process.env.AERODATABOX_RAPIDAPI_HOST || 'aerodatabox.p.rapidapi.com';
  // Endpoint AeroDataBox : vol par numéro IATA, jour courant
  const today = new Date().toISOString().slice(0, 10);
  const url   = `https://${host}/flights/number/${encodeURIComponent(flightNum)}/${today}`;

  console.log(`🔍 Interrogation AeroDataBox pour ${flightNum} le ${today}…`);

  const data = await fetchJson(url, {
    'x-rapidapi-host': host,
    'x-rapidapi-key':  RAPIDAPI_KEY,
    'Accept':          'application/json',
  });

  // AeroDataBox retourne un tableau de segments
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`Aucune donnée trouvée pour ${flightNum} le ${today}`);
  }
  return data;
}

// ─── Génération preuve HTML ───────────────────────────────────────────────────

function generateHtml(flightNum, aeroport, capturedAt, segments) {
  const seg = segments[0];
  const dep = seg?.departure || {};
  const arr = seg?.arrival   || {};
  const st  = seg?.status    || '—';

  const schedDep = formatTime(dep.scheduledTimeUtc || dep.scheduledTimeLocal);
  const actDep   = formatTime(dep.actualTimeUtc   || dep.actualTimeLocal   || dep.estimatedTimeUtc);
  const schedArr = formatTime(arr.scheduledTimeUtc || arr.scheduledTimeLocal);
  const actArr   = formatTime(arr.actualTimeUtc   || arr.actualTimeLocal   || arr.estimatedTimeUtc);

  const depDelay = typeof dep.delay === 'number' ? dep.delay : null;
  const arrDelay = typeof arr.delay === 'number' ? arr.delay : null;
  const maxDelay = Math.max(depDelay ?? 0, arrDelay ?? 0);

  const cancelled = /cancel/i.test(st);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Preuve de vol ${flightNum} — Robin des Airs</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a2e; }
    h1   { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 8px; }
    .badge-ok  { background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-weight: bold; }
    .badge-ko  { background: #fef2f2; color: #991b1b; padding: 4px 12px; border-radius: 20px; font-weight: bold; }
    .badge-warn{ background: #fefce8; color: #854d0e; padding: 4px 12px; border-radius: 20px; font-weight: bold; }
    table  { width: 100%; border-collapse: collapse; margin: 20px 0; }
    td, th { border: 1px solid #e2e8f0; padding: 10px 14px; }
    th     { background: #f1f5f9; text-align: left; width: 40%; }
    .footer{ font-size: 12px; color: #64748b; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    .cert  { background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>✈️ Preuve de vol — ${flightNum}</h1>

  <div class="cert">
    <strong>📋 Document généré par Robin des Airs</strong><br>
    Horodatage capture : <strong>${capturedAt}</strong><br>
    Source des données : <strong>AeroDataBox / RapidAPI</strong> (données IATA officielles)
  </div>

  <span class="${cancelled ? 'badge-ko' : maxDelay >= 180 ? 'badge-warn' : 'badge-ok'}">
    ${cancelled ? '🚫 VOL ANNULÉ' : maxDelay >= 180 ? `⚠️ RETARD ${maxDelay} MIN` : maxDelay > 0 ? `🟠 RETARD ${maxDelay} MIN` : '✅ À L\'HEURE'}
  </span>

  <table>
    <tr><th>Numéro de vol</th><td><strong>${flightNum}</strong></td></tr>
    <tr><th>Aéroport interrogé</th><td>${aeroport}</td></tr>
    <tr><th>Statut</th><td>${st}</td></tr>
    <tr><th>Départ prévu</th><td>${schedDep}</td></tr>
    <tr><th>Départ réel</th><td>${actDep}</td></tr>
    <tr><th>Retard départ</th><td>${delayLabel(depDelay)}</td></tr>
    <tr><th>Arrivée prévue</th><td>${schedArr}</td></tr>
    <tr><th>Arrivée réelle</th><td>${actArr}</td></tr>
    <tr><th>Retard arrivée</th><td>${delayLabel(arrDelay)}</td></tr>
    <tr><th>Aéroport départ</th><td>${dep.airport?.iata || '—'} — ${dep.airport?.name || '—'}</td></tr>
    <tr><th>Aéroport arrivée</th><td>${arr.airport?.iata || '—'} — ${arr.airport?.name || '—'}</td></tr>
  </table>

  ${maxDelay >= 180 || cancelled ? `
  <div style="background:#fef2f2;border:1px solid #fca5a5;padding:16px;border-radius:8px;">
    <strong>⚖️ CE 261/2004 — Éligibilité probable</strong><br>
    ${cancelled ? 'Vol annulé : indemnisation pouvant aller jusqu\'à 600 €/passager.' : `Retard de ${maxDelay} min à l'arrivée : indemnisation pouvant aller jusqu'à 600 €/passager.`}<br>
    <a href="https://robindesairs.eu">Déposer votre dossier sur Robin des Airs →</a>
  </div>` : ''}

  <div class="footer">
    Ce document est généré automatiquement à partir de données officielles IATA via AeroDataBox.<br>
    Il peut être utilisé comme pièce complémentaire dans un dossier de réclamation aérienne.<br>
    Robin des Airs — <a href="https://robindesairs.eu">robindesairs.eu</a>
  </div>
</body>
</html>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log(`\n✈️  Robin des Airs — Capture preuve vol ${numVol} (${aeroport})\n`);

  const capturedAt = new Date().toISOString();

  try {
    const segments = await fetchFlightData(numVol);

    // Preuve JSON (données brutes — pièce principale)
    const jsonPath = path.join(outDir, 'preuve.json');
    const preuveJson = {
      meta: {
        generatedAt:  capturedAt,
        flightNumber: numVol,
        airport:      aeroport,
        source:       'AeroDataBox via RapidAPI',
        legalBasis:   'CE 261/2004',
        generator:    'Robin des Airs — robindesairs.eu',
      },
      data: segments,
    };
    fs.writeFileSync(jsonPath, JSON.stringify(preuveJson, null, 2), 'utf8');
    console.log(`✅ Données JSON enregistrées : ${jsonPath}`);

    // Rapport HTML lisible
    const htmlPath = path.join(outDir, 'preuve.html');
    fs.writeFileSync(htmlPath, generateHtml(numVol, aeroport, capturedAt, segments), 'utf8');
    console.log(`✅ Rapport HTML enregistré   : ${htmlPath}`);

    // Résumé console
    const seg      = segments[0];
    const depDelay = seg?.departure?.delay ?? null;
    const arrDelay = seg?.arrival?.delay   ?? null;
    const status   = seg?.status || '—';
    const maxDelay = Math.max(depDelay ?? 0, arrDelay ?? 0);

    console.log('\n─── Résumé ───────────────────────────────');
    console.log(`  Statut   : ${status}`);
    console.log(`  Retard   : ${maxDelay} min`);
    console.log(`  CE 261   : ${maxDelay >= 180 || /cancel/i.test(status) ? '⚠️  ÉLIGIBLE' : '✅ Non éligible'}`);
    console.log(`  Dossier  : ${outDir}`);
    console.log('──────────────────────────────────────────\n');

  } catch (err) {
    // En cas d'erreur API : sauvegarder quand même un JSON d'erreur horodaté
    const errPath = path.join(outDir, 'erreur.json');
    fs.writeFileSync(errPath, JSON.stringify({
      meta:    { generatedAt: capturedAt, flightNumber: numVol, airport: aeroport },
      error:   err.message,
      conseil: 'Vérifier RAPIDAPI_KEY ou que le vol existe bien aujourd\'hui.',
    }, null, 2), 'utf8');

    console.error(`❌ Erreur : ${err.message}`);
    console.error(`   Fichier erreur : ${errPath}`);
    process.exit(1);
  }
})();
