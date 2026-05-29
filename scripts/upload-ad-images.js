/**
 * Upload tous les visuels publicitaires vers Meta Ads et retourne les hashes.
 * Les hashes sont à copier dans les variables d'environnement Netlify.
 *
 * Usage :
 *   META_ADS_ACCESS_TOKEN=xxx META_AD_ACCOUNT_ID=act_xxx node scripts/upload-ad-images.js
 *
 * Ou avec un fichier .env.local à la racine :
 *   node scripts/upload-ad-images.js
 */

const fs   = require('fs');
const path = require('path');

// Chargement optionnel d'un .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length && !process.env[k.trim()]) {
      process.env[k.trim()] = v.join('=').trim();
    }
  });
}

const TOKEN      = process.env.META_ADS_ACCESS_TOKEN;
const ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID; // act_XXXXXXXXX

if (!TOKEN || !ACCOUNT_ID) {
  console.error('❌  Manque META_ADS_ACCESS_TOKEN et/ou META_AD_ACCOUNT_ID');
  console.error('   Exemple : META_ADS_ACCESS_TOKEN=xxx META_AD_ACCOUNT_ID=act_xxx node scripts/upload-ad-images.js');
  process.exit(1);
}

const META_API = `https://graph.facebook.com/v19.0/${ACCOUNT_ID}/adimages`;

/**
 * Mapping fichier → variable(s) Netlify.
 *
 * Les 4 slots actifs dans ad-launch.js (priorité haute) :
 *   META_AD_HASH_URGENCE_STORY   → slot story-wa   "Encore en train d'attendre ?" (Story 9:16, WA)
 *   META_AD_HASH_FR_FEED         → slot feed-site  "Votre vol retardé ? 600€"     (Feed 16:9, Site)
 *   META_AD_HASH_URGENCE_SQUARE  → slot square-wa  "600€ — Réclamer sur WhatsApp" (Carré 1:1, WA)
 *   META_AD_HASH_SOCIAL_PROOF    → slot square-site Screenshot virement 1 350€    (Carré 1:1, Site)
 *
 *   Variantes EN :
 *   META_AD_HASH_EN_FEED / EN_SQUARE → aéroports anglophones (Lagos, Accra, Nairobi…)
 *
 * Un même fichier peut alimenter plusieurs variables (ex: EN_FEED et EN_SQUARE).
 */
const AD_FILES = [
  // ── 4 slots actifs ──────────────────────────────────────────────────────────
  {
    file: 'ad_set1_1D_urgence_emotionnelle.png',
    vars: ['META_AD_HASH_URGENCE_STORY'],
    note: 'SLOT 1 · Story WA · "Encore en train d\'attendre ?"',
  },
  {
    file: 'ad_fb_A.png',
    vars: ['META_AD_HASH_FR_FEED'],
    note: 'SLOT 2 · Feed Site · "Votre vol retardé ? 600€"',
  },
  {
    file: 'ad_set1_1A_montant_qui_frappe.png',
    vars: ['META_AD_HASH_URGENCE_SQUARE'],
    note: 'SLOT 3 · Carré WA · "600€ — Réclamer sur WhatsApp"',
  },
  {
    file: 'ad_set3_3B_social_proof.png',
    vars: ['META_AD_HASH_SOCIAL_PROOF'],
    note: 'SLOT 4 · Carré Site · Screenshot virement 1 350€',
  },

  // ── Variantes anglaises (aéroports EN) ──────────────────────────────────────
  {
    file: 'ad_set5_5A_english_standard.png',
    vars: ['META_AD_HASH_EN_FEED', 'META_AD_HASH_EN_SQUARE'],
    note: 'EN · Feed + Carré · "Flight delayed? €600. EU law."',
  },

  // ── Visuels supplémentaires (réserve / tests A/B futurs) ────────────────────
  { file: 'ad_fb_B.png',                       vars: ['META_AD_HASH_FR_FEED_B'],      note: 'Réserve · Feed FR B' },
  { file: 'ad_ig_A.png',                       vars: ['META_AD_HASH_FR_SQUARE'],      note: 'Réserve · Carré FR A' },
  { file: 'ad_ig_B.png',                       vars: ['META_AD_HASH_FR_SQUARE_B'],    note: 'Réserve · Carré FR B' },
  { file: 'ad_story_A.png',                    vars: ['META_AD_HASH_FR_STORY'],       note: 'Réserve · Story FR A' },
  { file: 'ad_story_B.png',                    vars: ['META_AD_HASH_FR_STORY_B'],     note: 'Réserve · Story Famille' },
  { file: 'ad_set1_1B_comparaison_cash.png',   vars: ['META_AD_HASH_COMPARAISON'],    note: 'Réserve · Robin vs AirHelp' },
  { file: 'ad_set1_1C_la_famille.png',         vars: ['META_AD_HASH_FAMILLE'],        note: 'Réserve · Famille 2 400€' },
  { file: 'ad_set2_2A_annulation_choc.png',    vars: ['META_AD_HASH_ANNULATION'],     note: 'Réserve · Vol annulé rouge' },
  { file: 'ad_set2_2B_bon_achat_vs_cash.png',  vars: ['META_AD_HASH_BON_ACHAT'],     note: 'Réserve · Bon d\'achat vs cash' },
  { file: 'ad_set3_3A_retroactif_5_ans.png',   vars: ['META_AD_HASH_RETROACTIF'],     note: 'Réserve · Rétroactif 5 ans' },
  { file: 'ad_cc1.png',                        vars: ['META_AD_HASH_CC1'],            note: 'Réserve · CC slide 01' },
  { file: 'ad_cc2.png',                        vars: ['META_AD_HASH_CC2'],            note: 'Réserve · CC slide 02' },
  { file: 'ad_cc3.png',                        vars: ['META_AD_HASH_CC3'],            note: 'Réserve · CC slide 03' },
];

const ROOT = path.join(__dirname, '..');

async function uploadImage(filePath, filename) {
  const bytes = fs.readFileSync(filePath).toString('base64');

  const res = await fetch(META_API + `?access_token=${TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [filename]: bytes }),
  });

  const json = await res.json();

  if (json.error) {
    throw new Error(`Meta API : ${json.error.message} (code ${json.error.code})`);
  }

  // Réponse : { images: { filename: { hash, url, ... } } }
  const images = json.images || {};
  const entry  = images[filename] || Object.values(images)[0];
  if (!entry || !entry.hash) {
    throw new Error(`Hash introuvable dans la réponse : ${JSON.stringify(json)}`);
  }
  return entry.hash;
}

async function main() {
  console.log(`\n📤  Upload vers Meta Ads — compte ${ACCOUNT_ID}\n`);

  const results = {}; // varName → hash
  const errors  = [];

  for (const { file, vars } of AD_FILES) {
    const filePath = path.join(ROOT, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️   Fichier introuvable, ignoré : ${file}`);
      continue;
    }

    process.stdout.write(`⬆️   ${file.padEnd(48)} `);
    try {
      const hash = await uploadImage(filePath, file);
      console.log(`✅  ${hash}`);
      for (const v of vars) results[v] = hash;
    } catch (e) {
      console.log(`❌  ${e.message}`);
      errors.push({ file, error: e.message });
    }
  }

  // Résumé
  console.log('\n' + '─'.repeat(70));
  console.log('📋  VARIABLES NETLIFY À COPIER-COLLER\n');

  const netlifyLines = [];
  for (const [varName, hash] of Object.entries(results)) {
    const line = `${varName}=${hash}`;
    console.log(line);
    netlifyLines.push(line);
  }

  // Écriture dans un fichier .ad-hashes.env
  const outPath = path.join(ROOT, '.ad-hashes.env');
  fs.writeFileSync(outPath, netlifyLines.join('\n') + '\n', 'utf8');
  console.log(`\n✅  Hashes sauvegardés dans : ${outPath}`);
  console.log('   → Copie ces variables dans Netlify : Site settings → Environment variables\n');

  if (errors.length) {
    console.log(`⚠️   ${errors.length} erreur(s) :`);
    errors.forEach(e => console.log(`   - ${e.file} : ${e.error}`));
  }

  // Instructions Netlify CLI (bonus)
  console.log('─'.repeat(70));
  console.log('💡  Ou via Netlify CLI (si installé) :');
  console.log('   netlify env:set META_AD_HASH_FR_FEED <hash>');
  console.log('   netlify env:import .ad-hashes.env\n');
}

main().catch(e => {
  console.error('Erreur fatale :', e.message);
  process.exit(1);
});
