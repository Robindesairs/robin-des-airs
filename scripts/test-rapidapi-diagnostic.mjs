#!/usr/bin/env node
/**
 * Diagnostic clé RapidAPI / AeroDataBox (même URL que le radar retour FCO).
 *
 * Usage :
 *   RAPIDAPI_KEY=xxx node scripts/test-rapidapi-diagnostic.mjs
 *   RAPIDAPI_KEY=xxx node scripts/test-rapidapi-diagnostic.mjs FCO
 *
 * Compare la fin de clé avec Netlify (RAPIDAPI_KEY) — doivent correspondre.
 */

const hub = (process.argv[2] || 'FCO').toUpperCase();
const ICAO = { FCO: 'LIRF', CDG: 'LFPG', FRA: 'EDDF', BRU: 'EBBR' };
const icao = ICAO[hub] || 'LIRF';

const key = (process.env.RAPIDAPI_KEY || process.env.AERODATABOX_RAPIDAPI_KEY || '').trim();
if (!key) {
  console.error('❌ Définir RAPIDAPI_KEY (ou AERODATABOX_RAPIDAPI_KEY).');
  process.exit(1);
}

const host = (process.env.AERODATABOX_RAPIDAPI_HOST || 'aerodatabox.p.rapidapi.com').trim();
if (host.indexOf('.') < 0) {
  console.error('❌ AERODATABOX_RAPIDAPI_HOST invalide:', host);
  console.error('   Doit être : aerodatabox.p.rapidapi.com');
  process.exit(1);
}

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
const params =
  'direction=Arrival&withLeg=true&withCancelled=true&withCodeshared=true&withCargo=false&withPrivate=false&withLocation=false';

const urls = [
  {
    label: `${hub} matin (radar returnSlot=1)`,
    url: `https://${host}/flights/airports/icao/${icao}/${today}T00:00/${today}T11:59?${params}`,
  },
  {
    label: `${hub} après-midi (returnSlot=2)`,
    url: `https://${host}/flights/airports/icao/${icao}/${today}T12:00/${today}T23:59?${params}`,
  },
  {
    label: 'CDG sonde (comme radar probe)',
    url: `https://${host}/flights/airports/icao/LFPG/${today}T12:00/${today}T14:00?direction=Departure&withLeg=true&withCancelled=true&withCodeshared=true`,
  },
];

console.log('── Diagnostic AeroDataBox ──');
console.log('Host     :', host);
console.log('Clé      : ...' + key.slice(-4), `(${key.length} car.)`);
console.log('Date Paris:', today);
console.log('');

const headers = {
  'x-rapidapi-host': host,
  'x-rapidapi-key': key,
  Accept: 'application/json',
};

for (const { label, url } of urls) {
  console.log('▶', label);
  console.log('  ', url);
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (_) {}

    const rl = res.headers.get('x-ratelimit-requests-remaining');
    const rlLimit = res.headers.get('x-ratelimit-requests-limit');
    console.log('   HTTP', res.status, rl != null ? `| quota restant ${rl}/${rlLimit || '?'}` : '');

    if (res.status === 403) {
      console.log('   → 403 : clé invalide OU pas abonné à AeroDataBox sur RapidAPI (Subscribe).');
      console.log('   Corps:', text.slice(0, 220).replace(/\s+/g, ' '));
    } else if (res.status === 429) {
      console.log('   → 429 : quota / débit dépassé (mensuel ou 1 req/s).');
      console.log('   Corps:', text.slice(0, 220).replace(/\s+/g, ' '));
      console.log('   Si RapidAPI affiche 0 appel aujourd’hui : quota MENSUEL épuisé, ou mauvaise clé sur Netlify.');
    } else if (!res.ok) {
      console.log('   Corps:', text.slice(0, 220).replace(/\s+/g, ' '));
    } else {
      const n = Array.isArray(json?.arrivals)
        ? json.arrivals.length
        : Array.isArray(json?.departures)
          ? json.departures.length
          : 0;
      console.log('   ✅ OK —', n, 'lignes');
    }
  } catch (e) {
    console.log('   ❌ Réseau:', e.message);
  }
  console.log('');
  await new Promise((r) => setTimeout(r, 1100));
}

console.log('Vérifiez sur rapidapi.com → My Apps → clé …' + key.slice(-4));
console.log('→ APIs → AeroDataBox → Analytics (filtre API = AeroDataBox uniquement).');
