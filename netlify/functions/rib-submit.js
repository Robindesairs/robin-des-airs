/**
 * rib-submit — collecte sécurisée du RIB (IBAN) du client pour le virement de sa part.
 *
 * Le client arrive sur rib.html?r=<ref> (jeton opaque = bearer), saisit titulaire + IBAN.
 * POST { ref, titulaire, iban, bic? }
 *  - Sécurité : on n'accepte QUE pour un dossier RÉEL existant (clé m/<ref> dans 'mandats').
 *  - Validation IBAN côté serveur (structure + clé de contrôle mod-97) → refuse un IBAN faux
 *    AVANT enregistrement (un IBAN erroné = virement perdu).
 *  - Stocke en JSON sous rib/<ref> dans le store 'pieces' (chiffré au repos par Netlify).
 *  - Notifie l'équipe (Make) en best-effort, IBAN MASQUÉ dans la notif (jamais en clair côté logs).
 */
'use strict';

const { getBlobStore } = require('./lib/netlify-blobs-store');

const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };

function normIban(raw) { return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

// Validation IBAN : structure + clé de contrôle mod-97 (ISO 13616). Longueur quelconque (15–34).
function validIban(raw) {
  const s = normIban(raw);
  if (s.length < 15 || s.length > 34) return false;
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(s)) return false;
  const rearr = s.slice(4) + s.slice(0, 4);
  let expanded = '';
  for (let i = 0; i < rearr.length; i++) {
    const c = rearr.charCodeAt(i);
    expanded += (c >= 65 && c <= 90) ? (c - 55).toString() : rearr[i]; // A=10 … Z=35
  }
  let rem = 0;
  for (let i = 0; i < expanded.length; i++) rem = (rem * 10 + (expanded.charCodeAt(i) - 48)) % 97;
  return rem === 1;
}

function maskIban(raw) { const i = normIban(raw); return i.length > 8 ? `${i.slice(0, 4)} …… ${i.slice(-4)}` : i; }

// Zone SEPA (code pays ISO en tête d'IBAN). Hors liste = virement international (BIC requis, frais client).
const SEPA = new Set(['AD','AT','BE','BG','CH','CY','CZ','DE','DK','EE','ES','FI','FR','GB','GI','GR','HR','HU','IE','IS','IT','LI','LT','LU','LV','MC','MT','NL','NO','PL','PT','RO','SE','SI','SK','SM','VA']);
function isSepa(iban) { return SEPA.has(normIban(iban).slice(0, 2)); }
function validBic(raw) { const s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(s); }

// Comparaison souple titulaire ↔ nom du dossier (tolère accents, ordre, initiales). Sert à FLAGGER, pas à bloquer.
function nameTokens(s) {
  return new Set(String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter((t) => t.length >= 3));
}
function namesOverlap(a, b) {
  const ta = nameTokens(a), tb = nameTokens(b);
  if (!ta.size || !tb.size) return null; // indéterminé
  for (const t of ta) if (tb.has(t)) return true;
  return false;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: H, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: H, body: JSON.stringify({ error: 'POST only' }) };

  let b; try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'bad json' }) }; }
  const ref = String(b.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  const iban = normIban(b.iban);
  const titulaire = String(b.titulaire || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  const bic = String(b.bic || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);

  if (!ref) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'Lien invalide (référence manquante).' }) };
  if (titulaire.length < 2) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'Indiquez le nom du titulaire du compte.' }) };
  if (!validIban(iban)) return { statusCode: 422, headers: H, body: JSON.stringify({ error: 'IBAN invalide — vérifiez la saisie.' }) };
  const sepa = isSepa(iban);
  if (bic && !validBic(bic)) return { statusCode: 422, headers: H, body: JSON.stringify({ error: 'BIC invalide (8 ou 11 caractères).' }) };
  // Hors zone SEPA = virement international → BIC/SWIFT obligatoire.
  if (!sepa && !validBic(bic)) return { statusCode: 422, headers: H, body: JSON.stringify({ error: 'Compte hors zone SEPA : le BIC/SWIFT est obligatoire.' }) };

  try {
    // Sécurité : le dossier doit exister (réf-jeton valide). On lit aussi le nom pour vérifier le titulaire.
    const mandats = getBlobStore(event, 'mandats');
    let dossier = null;
    if (mandats) {
      const raw = await mandats.get('m/' + ref);
      if (!raw) return { statusCode: 404, headers: H, body: JSON.stringify({ error: 'Dossier inconnu ou lien expiré.' }) };
      try { dossier = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { dossier = null; }
    }

    // Titulaire ≠ nom du dossier ? → on FLAG pour vérification humaine (jamais de blocage : faux positifs accents/ordre).
    let nameMismatch = false;
    if (dossier) {
      const candidats = [
        dossier.name,
        [dossier.firstName, dossier.lastName].filter(Boolean).join(' '),
        ...(Array.isArray(dossier.passengers) ? dossier.passengers.map((p) => p && p.name) : []),
        ...(Array.isArray(dossier.passengerNames) ? dossier.passengerNames : []),
      ].filter(Boolean).join(' ');
      const ov = namesOverlap(titulaire, candidats);
      nameMismatch = ov === false; // null (nom dossier inconnu) → on ne flagge pas
    }

    const store = getBlobStore(event, 'pieces');
    if (!store) return { statusCode: 500, headers: H, body: JSON.stringify({ error: 'store indisponible' }) };
    await store.setJSON('rib/' + ref, { ref, titulaire, iban, bic, sepa, nameMismatch, ts: new Date().toISOString(), source: 'rib-en-ligne' });

    // Notif équipe (best-effort) — IBAN MASQUÉ + drapeaux à vérifier avant virement.
    const flags = [];
    if (!sepa) flags.push('HORS SEPA (frais + change a la charge du client)');
    if (nameMismatch) flags.push('titulaire != nom dossier — A VERIFIER avant virement');
    try {
      const u = process.env.MAKE_WEBHOOK_NEW_DOSSIER;
      if (u) await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'rib_recu', ref, titulaire, iban_masque: maskIban(iban), bic, sepa, nameMismatch, flags, source: 'rib-en-ligne' }) });
    } catch (_) {}

    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, iban_masque: maskIban(iban) }) };
  } catch (e) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: e.message }) };
  }
};
