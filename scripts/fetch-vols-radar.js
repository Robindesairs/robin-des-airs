/**
 * Récupère les vols du radar (Dakar par défaut) et écrit le résultat dans docs/vols-radar.txt
 * Pour voir les vols dans Cursor : exécute ce script puis ouvre docs/vols-radar.txt
 *
 * Usage : node scripts/fetch-vols-radar.js
 * (Optionnel) SITE_URL=https://robindesairs.eu node scripts/fetch-vols-radar.js
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = process.env.SITE_URL || 'https://robindesairs.eu';
const AIRPORT = process.env.AIRPORT || 'DSS';
const TYPE = process.env.TYPE || 'departure';

const url = `${SITE_URL}/.netlify/functions/radar?airport=${AIRPORT}&type=${TYPE}`;

async function main() {
  console.log('Récupération des vols', AIRPORT, TYPE, '...');
  let data;
  try {
    const res = await fetch(url);
    data = await res.json();
  } catch (e) {
    const out = `Erreur réseau : ${e.message}\n\nVérifiez que le site est déployé sur Netlify et que l'URL est correcte (SITE_URL=${SITE_URL}).`;
    const outPath = path.join(__dirname, '..', 'docs', 'vols-radar.txt');
    fs.writeFileSync(outPath, out, 'utf8');
    console.log('Écrit:', outPath);
    return;
  }

  const flights = data.flights || [];
  const lines = [
    `Radar Robin des Airs — Vols ${AIRPORT} (${TYPE === 'departure' ? 'Départs' : 'Arrivées'})`,
    `Mis à jour : ${data.updatedAt || new Date().toISOString()}`,
    data.error ? `\n⚠ ${data.error}\n` : '',
    '—'.repeat(80),
    ''
  ];

  if (flights.length === 0) {
    lines.push('Aucun vol retourné.');
    if (data.error) lines.push('', data.error);
  } else {
    const headers = ['Vol', 'Compagnie', 'Départ', 'Arrivée', 'Retard', 'Éligible', 'Signal'];
    const maxLen = [6, 10, 8, 8, 8, 10, 10];
    headers.forEach((h, i) => { maxLen[i] = Math.max(maxLen[i], h.length); });
    flights.forEach(f => {
      maxLen[0] = Math.max(maxLen[0], String(f.flight || '—').length);
      maxLen[1] = Math.max(maxLen[1], String(f.airline || '—').length);
      maxLen[2] = Math.max(maxLen[2], String(f.dep || '—').length);
      maxLen[3] = Math.max(maxLen[3], String(f.arr || '—').length);
      maxLen[4] = Math.max(maxLen[4], (f.cancelled ? '—' : (f.delayMinutes != null ? f.delayMinutes + ' min' : '—')).length);
      maxLen[5] = Math.max(maxLen[5], (f.eligible ? 'Oui' : 'Non').length);
      maxLen[6] = Math.max(maxLen[6], (f.cancelled ? 'ANNULÉ' : (f.color || 'GREY')).length);
    });
    const pad = (s, i) => String(s).padEnd(maxLen[i], ' ');
    lines.push(headers.map((h, i) => pad(h, i)).join('  '));
    lines.push(headers.map((_, i) => '—'.repeat(maxLen[i])).join('  '));
    flights.forEach(f => {
      const retard = f.cancelled ? '—' : (f.delayMinutes != null ? f.delayMinutes + ' min' : '—');
      const signal = f.cancelled ? 'ANNULÉ' : (f.color || 'GREY');
      lines.push(
        pad(f.flight || '—', 0) + '  ' +
        pad(f.airline || '—', 1) + '  ' +
        pad(f.dep || '—', 2) + '  ' +
        pad(f.arr || '—', 3) + '  ' +
        pad(retard, 4) + '  ' +
        pad(f.eligible ? 'Oui' : 'Non', 5) + '  ' +
        pad(signal, 6)
      );
    });
  }

  const outPath = path.join(__dirname, '..', 'docs', 'vols-radar.txt');
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log('Écrit:', outPath, '—', flights.length, 'vols');
}

main();
