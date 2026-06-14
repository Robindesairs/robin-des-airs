/**
 * Test de lib/ig-prospector.js (découverte agences via Instagram — logique pure).
 * Lance : node test-ig-prospector.js
 */
'use strict';

const assert = require('assert');
const IG = require('./netlify/functions/lib/ig-prospector');

let pass = 0;
function ok(name, cond, extra) { assert.ok(cond, `${name} ${extra || ''}`); console.log('  ✓', name); pass++; }

console.log('\n— igTargets —');
ok('défaut = SN+CI+GM (≥ 4 hashtags chacun)', IG.igTargets([]).length >= 12, String(IG.igTargets([]).length));
ok('filtre SN', IG.igTargets(['SN']).every((t) => t.pays === 'SN'));
ok('pays inconnu ignoré', IG.igTargets(['XX']).length === 0);

console.log('\n— extractPhones —');
ok('wa.me', IG.extractPhones('Réservez ! wa.me/221771234567').includes('+221771234567'), JSON.stringify(IG.extractPhones('wa.me/221771234567')));
ok('numéro +indicatif espacé', IG.extractPhones('Contact : +221 77 123 45 67').includes('+221771234567'));
ok('phone= dans une URL', IG.extractPhones('https://api.whatsapp.com/send?phone=2250707070707').includes('+2250707070707'));
ok('aucun numéro → []', IG.extractPhones('Belle photo de Dakar').length === 0);

console.log('\n— extractHandles —');
ok('capture @handle', IG.extractHandles('Suivez @teranga_voyages et @dakar.travel').includes('teranga_voyages'));
ok('aucun @ → []', IG.extractHandles('texte simple').length === 0);

console.log('\n— looksLikeAgency —');
ok('« agence de voyage » détecté', IG.looksLikeAgency('Votre agence de voyage à Dakar'));
ok('« travel »/« billet » détecté', IG.looksLikeAgency('Cheap billet avion + visa'));
ok('texte neutre rejeté', !IG.looksLikeAgency('Bonne journée à tous'));

console.log('\n— mediaToProspect —');
const m1 = { caption: 'Teranga Voyages ✈️\nBillets pas chers Dakar-Paris. WhatsApp +221 77 555 44 33', permalink: 'https://instagram.com/p/AAA' };
const p1 = IG.mediaToProspect(m1, { ville: 'Dakar', pays: 'SN', tag: 'voyagedakar' });
ok('média agence+tél → prospect', p1 && p1.phone === '+221775554433', p1 && p1.phone);
ok('source = instagram', p1.source === 'instagram');
ok('paysNom rempli', p1.paysNom === 'Sénégal', p1.paysNom);
ok('nom deviné depuis 1re ligne', /Teranga Voyages/.test(p1.name), p1.name);

const m2 = { caption: 'Magnifique coucher de soleil 🌅', permalink: 'x' }; // pas agence
ok('média non-agence → null', IG.mediaToProspect(m2, { ville: 'Dakar', pays: 'SN' }) === null);

const m3 = { caption: 'Agence de voyage, on adore voyager !', permalink: 'x' }; // agence mais sans contact
ok('agence sans contact → null (non actionnable)', IG.mediaToProspect(m3, { ville: 'Dakar', pays: 'SN' }) === null);

console.log('\n— mediaListToProspects (dédup) —');
const list = [m1, { caption: 'Autre pub. WhatsApp +221 77 555 44 33 (même numéro)', permalink: 'y' }, m2];
const prospects = IG.mediaListToProspects(list, { ville: 'Dakar', pays: 'SN', tag: 'voyagedakar' });
ok('dédoublonne par téléphone (1 prospect)', prospects.length === 1, `len=${prospects.length}`);

console.log(`\n✅ ${pass} assertions OK\n`);
