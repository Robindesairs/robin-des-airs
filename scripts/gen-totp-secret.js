#!/usr/bin/env node
/**
 * Génère un secret TOTP pour la 2FA du CRM (bureau.html, /crm/, radar).
 *
 * Usage : node scripts/gen-totp-secret.js
 *   1. Copier le secret affiché dans la variable d'env Netlify CRM_TOTP_SECRET
 *      (Site settings → Environment variables), pour TOUS les contextes (production).
 *   2. Scanner le QR (ou saisir le secret manuellement) dans une app d'authentification
 *      (Google Authenticator, Authy, 1Password…).
 *   3. Se reconnecter au CRM : un code à 6 chiffres sera désormais demandé après le code
 *      d'accès habituel.
 *
 * Tant que CRM_TOTP_SECRET n'est pas défini sur Netlify, la 2FA reste désactivée
 * (rétrocompatible) — voir netlify/functions/lib/auth-config.js.
 */
const { generateSecret, otpauthUri } = require('../netlify/functions/lib/totp');

const secret = generateSecret();
const uri = otpauthUri(secret, { issuer: 'Robin des Airs', account: 'CRM' });

console.log('\n=== Secret TOTP CRM (Robin des Airs) ===\n');
console.log('CRM_TOTP_SECRET =', secret);
console.log('\nURI d\'enrôlement (à convertir en QR si besoin, ex. https://www.qr-code-generator.com/) :');
console.log(uri);
console.log('\nÉtapes :');
console.log('1. Netlify → Site settings → Environment variables → ajouter CRM_TOTP_SECRET =', secret);
console.log('2. Ajouter ce secret dans une app d\'authentification (compte "Robin des Airs : CRM").');
console.log('3. Redéployer / attendre la prise en compte de la variable, puis se reconnecter au CRM.\n');
