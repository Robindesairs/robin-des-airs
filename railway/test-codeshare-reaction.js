/**
 * Démo : réaction du bot face à un e-billet CODE-SHARE.
 * Utilise le VRAI normalize() (lib/extract-eticket) + les helpers/message RECOPIÉS À L'IDENTIQUE
 * de server.js (commit 1a60c13). On simule l'OCR par le JSON qu'un modèle correct produirait
 * pour le billet e-billet-codeshare-test.html, puis on imprime le message WhatsApp exact.
 */
'use strict';
const { normalize } = require('./lib/extract-eticket');

// ── Verbatim server.js ────────────────────────────────────────────────────────
const AIRLINES = { AF: 'Air France', SN: 'Brussels Airlines', TP: 'TAP Air Portugal', AT: 'Royal Air Maroc', HC: 'Air Sénégal', KQ: 'Kenya Airways', ET: 'Ethiopian Airlines', EK: 'Emirates', TK: 'Turkish Airlines', KL: 'KLM', LH: 'Lufthansa', IB: 'Iberia', EJU: 'easyJet', U2: 'easyJet', FR: 'Ryanair', TO: 'Transavia', KP: 'ASKY', DN: 'Senegal Airlines' };
const UE_CARRIERS = new Set(['AF', 'KL', 'SN', 'TP', 'LH', 'IB', 'U2', 'EJU', 'FR', 'TO', 'HV', 'LX', 'OS', 'EW', 'AZ', 'A3', 'SK', 'AY', 'LO', 'VY', 'DY', 'EN', 'WK', 'WF', 'IG']);
function isCarrierUE(code) { return UE_CARRIERS.has(String(code || '').toUpperCase().replace(/\s+/g, '')); }
const EU_AIRPORTS = new Set(['CDG', 'ORY', 'LYS', 'MRS', 'NCE', 'BOD', 'TLS', 'NTE', 'SXB', 'MLH', 'LIL', 'RNS', 'CLY', 'AJA', 'BIA', 'BRU', 'CRL', 'AMS', 'EIN', 'LHR', 'LGW', 'STN', 'LTN', 'LCY', 'MAN', 'BHX', 'EDI', 'GLA', 'BRS', 'DUB', 'FRA', 'MUC', 'BER', 'DUS', 'HAM', 'CGN', 'STR', 'NUE', 'VIE', 'ZRH', 'GVA', 'BSL', 'OSL', 'ARN', 'CPH', 'HEL', 'LIS', 'OPO', 'MAD', 'BCN', 'VLC', 'FCO', 'MXP', 'VCE', 'NAP', 'ATH', 'WAW', 'PRG', 'BUD', 'SOF', 'OTP']);
function isEUAirport(code) { return EU_AIRPORTS.has(String(code || '').toUpperCase().trim()); }
function carrierCode(vol) {
  const v = String(vol || '').toUpperCase().replace(/\s+/g, '');
  const m3 = v.match(/^([0-9A-Z]{3})\d/); if (m3 && AIRLINES[m3[1]]) return m3[1];
  const m2 = v.match(/^([0-9A-Z]{2})\d/); return m2 ? m2[1] : '';
}
function effectiveCarrier(s, e) {
  const op = (e && e.operePar) || (s && s.operePar) || '';
  if (op) return op.toUpperCase();
  const vol = (e && e.vol) || (s && s.vol) || '';
  const last = String(vol).split('+').pop().trim();
  return carrierCode(last);
}
function markOperateurEffectif(s, e) {
  const eff = effectiveCarrier(s, e);
  if (eff) s.operateur_code = eff;
  s.operateurNonUe = !!(s.europeTouch === 'arrivee' && eff && !isCarrierUE(eff));
  if (s.operateurNonUe) s.escalade = s.escalade || 'operateur_non_ue';
  s.compagnie_reclamation = (eff && AIRLINES[eff]) || s.compagnie || eff || '';
}
// Corps du message scanConfirmCard (verbatim — header simplifié à « SCAN_REUSSI »)
function scanConfirmBody(s) {
  const pageLine = '';
  const paxLine = (s.names && s.names.length) ? `\n👥 ${s.names.length} passager(s) : ${s.names.join(', ')}` : '';
  const header = '✅ J\'ai bien lu votre billet 👇';
  const opName = (s.operateur_code && AIRLINES[s.operateur_code]) || s.compagnie || 'une compagnie hors-UE';
  const opNote = s.operateurNonUe ? `\n\nℹ️ Vol *opéré par ${opName}* (compagnie hors-UE) à l'arrivée en Europe : l'indemnisation européenne ne s'applique pas *automatiquement*. Un expert vérifie *gratuitement* un autre recours — *on garde votre dossier dans tous les cas*. 🤝` : '';
  const claimLine = (!s.operateurNonUe && !s.operateurAVerifier && s.compagnie_reclamation) ? `\n📮 Réclamation auprès de : *${s.compagnie_reclamation}*` : '';
  return `${header}${pageLine}\n\n✈️ Vol : ${s.vol || '—'} — ${s.compagnie || '—'}\n📅 Date : ${s.date || '—'}\n🎫 PNR : ${s.pnr || '—'}\n🗺️ Trajet : ${s.route || '—'}${claimLine}${paxLine}${opNote}\n\n_E-billet en plusieurs pages ? Envoyez-les, je complète._\nTout est correct ?`;
}
// setEticketFields (extrait utile) + markOperateurEffectif
function setEticketFields(s, e) {
  if (e.vol) s.vol = e.vol;
  if (e.compagnie) s.compagnie = e.compagnie;
  if (e.operePar) s.operePar = e.operePar;
  if (e.date) s.date = e.date;
  if (e.pnr) s.pnr = e.pnr;
  if (e.route) s.route = e.route;
  if (e.passengers && e.passengers.length) s.names = e.passengers.map((p) => p.name);
  markOperateurEffectif(s, e);
}

// applyTrajet (verbatim) — bascule sur la jambe choisie + recalcule le sens/drapeau
function applyTrajet(s, t) {
  if (!t) return;
  if (t.vol) s.vol = t.vol;
  if (t.date) s.date = t.date;
  if (t.route) s.route = t.route;
  s.type_vol = t.escale ? 'escale' : 'direct';
  s.operePar = t.operePar || '';
  const dep = (t.segments && t.segments[0] && t.segments[0].depart) || '';
  const arr = (t.segments && t.segments.length ? t.segments[t.segments.length - 1].arrivee : '') || '';
  if (isEUAirport(arr) && !isEUAirport(dep)) s.europeTouch = 'arrivee';
  else if (isEUAirport(dep) && !isEUAirport(arr)) s.europeTouch = 'depart';
  markOperateurEffectif(s, { vol: s.vol, operePar: s.operePar });
}

// ── Scénarios : le JSON est ce que l'OCR lirait sur le billet ──────────────────
function run(titre, europeTouch, ocr) {
  const e = normalize(ocr);
  const s = { europeTouch };
  setEticketFields(s, e);
  console.log('\n' + '═'.repeat(70));
  console.log('🧪 ' + titre + '   (europeTouch=' + europeTouch + ')');
  console.log('   → normalize: vol=' + e.vol + ' | operePar=' + JSON.stringify(e.operePar) + ' | transporteur effectif=' + (s.operateur_code || '—') + ' | drapeau hors-UE=' + s.operateurNonUe + (s.escalade ? ' | escalade=' + s.escalade : ''));
  console.log('─'.repeat(70) + '\n📱 Message WhatsApp du bot :\n');
  console.log(scanConfirmBody(s).split('\n').map((l) => '   ' + l).join('\n'));
}

const PAX = [{ nom: 'DIALLO', prenom: 'Aminata', type: 'adulte' }, { nom: 'DIALLO', prenom: 'Ousmane', type: 'adulte' }];

// LE billet ALLER-RETOUR (e-billet-codeshare-test.html) : CDG→NBO (aller) + NBO→CDG (retour),
// les DEUX vols AF mais « opérés par KENYA AIRWAYS ». Ce que l'OCR lirait :
const OCR_AR = {
  lisible: true, confidence: 1, compagnie: 'Air France', pnr: 'RJ8KQE', aller_retour: true,
  trajets: [
    { sens: 'aller', date: '01/03/2026', depart: 'CDG', arrivee: 'NBO',
      segments: [{ vol: 'AF6891', depart: 'CDG', arrivee: 'NBO', date: '01/03/2026', operateur: 'KQ' }] },
    { sens: 'retour', date: '14/03/2026', depart: 'NBO', arrivee: 'CDG',
      segments: [{ vol: 'AF6892', depart: 'NBO', arrivee: 'CDG', date: '14/03/2026', operateur: 'KQ' }] }],
  passagers: PAX };

function runAR(titre, legChoisie) {
  const e = normalize(OCR_AR);
  const s = {};
  setEticketFields(s, e);            // scan : on lit tout, on détecte l'aller-retour
  s.trajets = e.trajets;
  applyTrajet(s, e.trajets[legChoisie]); // le client tape « Aller » (0) ou « Retour » (1)
  console.log('\n' + '═'.repeat(70));
  console.log('🧪 ' + titre);
  console.log('   → aller_retour détecté=' + e.allerRetour + ' | jambe choisie=' + (legChoisie === 0 ? 'ALLER' : 'RETOUR') + ' (' + s.route + ')');
  console.log('   → sens dérivé europeTouch=' + s.europeTouch + ' | transporteur effectif=' + (s.operateur_code || '—') + ' | drapeau hors-UE=' + s.operateurNonUe + (s.escalade ? ' | escalade=' + s.escalade : ''));
  console.log('─'.repeat(70) + '\n📱 Message WhatsApp du bot :\n');
  console.log(scanConfirmBody(s).split('\n').map((l) => '   ' + l).join('\n'));
}

console.log('\n🎫 E-BILLET ALLER-RETOUR — Air France AF6891/AF6892, opérés par Kenya Airways (KQ)');
console.log('   Le bot détecte l\'aller-retour et DEMANDE quelle jambe a été perturbée (étape « scan_sens »).');

// Le client a eu un souci sur l'ALLER (Paris→Nairobi) : part d'Europe → couvert quelle que soit la compagnie
runAR('Le client choisit l\'ALLER perturbé (Paris→Nairobi)', 0);

// Le client a eu un souci sur le RETOUR (Nairobi→Paris) : arrive en Europe sur métal KQ → PAS auto-couvert
runAR('Le client choisit le RETOUR perturbé (Nairobi→Paris)', 1);

// ── Variante : PREMIER vol depuis l'Afrique (e-billet-codeshare-afrique-dabord.html) ──
// L'« aller » est maintenant NBO→CDG (arrive en Europe) ; le « retour » est CDG→NBO (part d'Europe).
// Le label aller/retour est INVERSÉ → le bot doit suivre les AÉROPORTS, pas l'étiquette.
const OCR_AR_AFR = {
  lisible: true, confidence: 1, compagnie: 'Air France', pnr: 'QM4KQT', aller_retour: true,
  trajets: [
    { sens: 'aller', date: '02/03/2026', depart: 'NBO', arrivee: 'CDG',
      segments: [{ vol: 'AF6892', depart: 'NBO', arrivee: 'CDG', date: '02/03/2026', operateur: 'KQ' }] },
    { sens: 'retour', date: '24/03/2026', depart: 'CDG', arrivee: 'NBO',
      segments: [{ vol: 'AF6891', depart: 'CDG', arrivee: 'NBO', date: '24/03/2026', operateur: 'KQ' }] }],
  passagers: PAX };

function runAR_AFR(titre, legChoisie) {
  const e = normalize(OCR_AR_AFR);
  const s = {};
  setEticketFields(s, e);
  s.trajets = e.trajets;
  applyTrajet(s, e.trajets[legChoisie]);
  console.log('\n' + '═'.repeat(70));
  console.log('🧪 ' + titre);
  console.log('   → jambe choisie=' + (legChoisie === 0 ? 'ALLER (1er vol, depuis Afrique)' : 'RETOUR (vers Afrique)') + ' (' + s.route + ')');
  console.log('   → sens dérivé europeTouch=' + s.europeTouch + ' | transporteur effectif=' + (s.operateur_code || '—') + ' | drapeau hors-UE=' + s.operateurNonUe + (s.escalade ? ' | escalade=' + s.escalade : ''));
  console.log('─'.repeat(70) + '\n📱 Message WhatsApp du bot :\n');
  console.log(scanConfirmBody(s).split('\n').map((l) => '   ' + l).join('\n'));
}

console.log('\n\n🎫 E-BILLET ALLER-RETOUR — PREMIER VOL DEPUIS L\'AFRIQUE (Nairobi→Paris d\'abord)');
console.log('   Piège : ici l\'ALLER arrive en Europe (sensible), le RETOUR part d\'Europe (couvert).');

// L'ALLER perturbé = Nairobi→Paris : arrive en Europe sur métal KQ → PAS auto-couvert
runAR_AFR('Le client choisit l\'ALLER perturbé (Nairobi→Paris, 1er vol)', 0);

// Le RETOUR perturbé = Paris→Nairobi : part d'Europe → couvert quelle que soit la compagnie
runAR_AFR('Le client choisit le RETOUR perturbé (Paris→Nairobi)', 1);

// ── Correspondance : départ Afrique, 1er tronçon compagnie AFRICAINE, dernier tronçon RAMÈNE en
//    Europe via compagnie EUROPÉENNE. UN SEUL billet (un PNR) → trajet unique avec escale. ──
function runConn(titre, lastVolCode) {
  const OCR = {
    lisible: true, confidence: 1, compagnie: 'Air France', pnr: 'CONN12', aller_retour: false,
    trajets: [{ sens: 'aller', date: '05/03/2026', depart: 'DKR', arrivee: 'CDG',
      segments: [
        { vol: 'HC301', depart: 'DKR', arrivee: 'CMN', date: '05/03/2026' },        // Air Sénégal (non-UE)
        { vol: lastVolCode, depart: 'CMN', arrivee: 'CDG', date: '05/03/2026' }] }], // dernier tronçon → Europe
    passagers: PAX };
  const e = normalize(OCR);
  const s = { europeTouch: 'arrivee' }; // « arrive en Europe » (répondu à l'étape route)
  setEticketFields(s, e);
  console.log('\n' + '═'.repeat(70));
  console.log('🧪 ' + titre);
  console.log('   → vol (chaîné)=' + e.vol + ' | escale=' + e.escale + ' | multi_pnr=' + e.multiPNR);
  console.log('   → transporteur effectif (tronçon qui ARRIVE en Europe)=' + (s.operateur_code || '—') + ' | drapeau hors-UE=' + s.operateurNonUe + (s.escalade ? ' | escalade=' + s.escalade : ''));
  console.log('─'.repeat(70) + '\n📱 Message WhatsApp du bot :\n');
  console.log(scanConfirmBody(s).split('\n').map((l) => '   ' + l).join('\n'));
}

console.log('\n\n🎫 CORRESPONDANCE — départ Afrique, 1er tronçon africain, dernier tronçon → Europe');
console.log('   Dakar →(Air Sénégal HC, non-UE)→ Casablanca →(?)→ Paris, UN SEUL billet (PNR unique).');

// (a) dernier tronçon CMN→CDG opéré par AIR FRANCE (UE) → couvert, on réclame à Air France
runConn('Dernier tronçon Casa→Paris par AIR FRANCE (UE)', 'AF1234');

// (b) dernier tronçon CMN→CDG opéré par ROYAL AIR MAROC (AT, non-UE) → PAS auto-couvert
runConn('Dernier tronçon Casa→Paris par ROYAL AIR MAROC (AT, non-UE)', 'AT801');

console.log('\n' + '═'.repeat(70));
