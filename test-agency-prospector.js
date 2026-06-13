/**
 * Test de lib/agency-prospector.js (prospection agences — logique pure).
 * Lance : node test-agency-prospector.js
 */
'use strict';

const assert = require('assert');
const P = require('./netlify/functions/lib/agency-prospector');

let pass = 0;
function ok(name, cond, extra) { assert.ok(cond, `${name} ${extra || ''}`); console.log('  ✓', name); pass++; }

console.log('\n— buildOverpassQL —');
const ql = P.buildOverpassQL({ ville: 'Dakar', lat: 14.6928, lng: -17.4467, radius: 11000 });
ok('contient shop=travel_agency', /shop"="travel_agency"/.test(ql));
ok('contient office=travel_agent', /office"="travel_agent"/.test(ql));
ok('contient around + coords', /around:11000,14.6928,-17.4467/.test(ql));
ok('demande les tags (out center tags)', /out center tags;/.test(ql));

console.log('\n— isAirlineOffice (exclure les compagnies) —');
ok('« Air Côte d’Ivoire » exclu', P.isAirlineOffice('Air Côte d’Ivoire'));
ok('« Royal Air Maroc » exclu', P.isAirlineOffice('Royal Air Maroc'));
ok('« Atlantic Express Airlines » exclu', P.isAirlineOffice('Atlantic Express Airlines'));
ok('« Agence ASKY » exclu', P.isAirlineOffice('Agence ASKY'));
ok('« Brussels Airlines » exclu', P.isAirlineOffice('Brussels Airlines'));
ok('« Senegalair-Voyages » GARDÉ (pas une compagnie)', !P.isAirlineOffice('Senegalair-Voyages'));
ok('« Relax Voyages » GARDÉ', !P.isAirlineOffice('Relax Voyages'));
ok('« Teranga Travel Tours » GARDÉ', !P.isAirlineOffice('Teranga Travel Tours'));

console.log('\n— parseElements (fixture type Overpass) —');
const elements = [
  { type: 'node', id: 1, lat: 14.69, lon: -17.44, tags: { name: 'Relax Voyages', shop: 'travel_agency', phone: '+221 33 869 90 80' } },
  { type: 'node', id: 2, lat: 14.70, lon: -17.45, tags: { name: 'Agence ASKY', shop: 'travel_agency', website: 'https://www.flyasky.com' } }, // compagnie → exclu
  { type: 'way', id: 3, center: { lat: 14.71, lon: -17.46 }, tags: { name: 'Teranga Travel Tours', office: 'travel_agent', 'addr:street': 'Av. Bourguiba', 'contact:phone': '+221 33 800 11 22' } },
  { type: 'node', id: 4, lat: 14.72, lon: -17.47, tags: { shop: 'travel_agency' } }, // sans nom → ignoré
  { type: 'node', id: 5, lat: 14.69, lon: -17.44, tags: { name: 'Relax Voyages', shop: 'travel_agency', phone: '+221338699080' } }, // doublon de #1
];
const parsed = P.parseElements(elements, { ville: 'Dakar', pays: 'SN' });
ok('parse garde les nommés non-compagnies (2 : Relax + Teranga, +1 doublon)', parsed.length === 3, `len=${parsed.length}`);
ok('exclut Agence ASKY (compagnie)', !parsed.some((p) => /asky/i.test(p.name)));
ok('exclut l’élément sans nom', !parsed.some((p) => !p.name));
const relax = parsed.find((p) => p.name === 'Relax Voyages');
ok('téléphone normalisé', relax.phone === '+221338699080', relax.phone);
ok('contactable=true (a un tél)', relax.contactable === true);
ok('paysNom rempli', relax.paysNom === 'Côte d’Ivoire' || relax.paysNom === 'Sénégal', relax.paysNom);
const teranga = parsed.find((p) => p.name === 'Teranga Travel Tours');
ok('way → coords via center', teranga.lat === 14.71 && teranga.lng === -17.46);
ok('adresse depuis addr:street', /Bourguiba/.test(teranga.address), teranga.address);

console.log('\n— dedupe —');
const deduped = P.dedupe(parsed);
ok('dédoublonne Relax (nom + tél identiques)', deduped.length === 2, `len=${deduped.length}`);

console.log('\n— filterNew (contre le CRM) —');
const news = P.filterNew(deduped, { names: ['Relax Voyages'], phones: [] });
ok('retire ce qui est déjà au CRM (Relax)', news.length === 1 && news[0].name === 'Teranga Travel Tours', JSON.stringify(news.map((p) => p.name)));
const newsByPhone = P.filterNew(deduped, { names: [], phones: ['+221 33 869 90 80'] });
ok('dédup CRM aussi par téléphone', !newsByPhone.some((p) => p.name === 'Relax Voyages'));

console.log('\n— sortProspects (contactables d’abord) —');
const mixed = [
  { name: 'Zeta Sans Tel', contactable: false },
  { name: 'Alpha Avec Tel', contactable: true },
];
const sorted = P.sortProspects(mixed);
ok('contactable en tête', sorted[0].name === 'Alpha Avec Tel');

console.log('\n— citiesFor —');
ok('défaut = SN+CI+GM (3 villes)', P.citiesFor([]).length === 3);
ok('pays filtré = SN seul', P.citiesFor(['SN']).length === 1 && P.citiesFor(['SN'])[0].pays === 'SN');
ok('pays inconnu ignoré', P.citiesFor(['XX']).length === 0);

console.log(`\n✅ ${pass} assertions OK\n`);
