#!/usr/bin/env node
/**
 * Test rapide clé RapidAPI / AeroDataBox (ne pas committer la clé).
 * Usage : RAPIDAPI_KEY=votre_cle node scripts/test-rapidapi-key.mjs
 */

const key = (process.env.RAPIDAPI_KEY || process.env.AERODATABOX_RAPIDAPI_KEY || '').trim();
if (!key) {
  console.error('❌ Définir RAPIDAPI_KEY dans l’environnement.');
  process.exit(1);
}

const host = process.env.AERODATABOX_RAPIDAPI_HOST || 'aerodatabox.p.rapidapi.com';
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
const url = `https://${host}/flights/airports/icao/LFPG/${today}T12:00/${today}T20:59?direction=Departure&withLeg=true&withCancelled=true`;

console.log('Test AeroDataBox — CDG départs après-midi', today);
console.log('URL:', url.replace(key, '***'));

const res = await fetch(url, {
  headers: {
    'x-rapidapi-host': host,
    'x-rapidapi-key': key,
    Accept: 'application/json',
  },
});

const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  json = null;
}

console.log('HTTP', res.status);
if (res.status === 403) {
  console.log('❌ 403 — pas abonné à AeroDataBox sur cette clé, ou clé invalide.');
  console.log(text.slice(0, 200));
  process.exit(1);
}
if (!res.ok) {
  console.log('❌ Erreur:', text.slice(0, 300));
  process.exit(1);
}

const deps = json?.departures || [];
console.log('✅ OK —', deps.length, 'départs CDG (créneau 12h–20h)');
if (deps[0]) {
  const n = deps[0].number || deps[0].flightNumber || '?';
  console.log('   Exemple:', n);
}
