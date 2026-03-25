/**
 * ROBIN DES AIRS — Script WhatsApp Auto-Réponse Prospects AF718
 * ============================================================
 * Objectif : répondre automatiquement aux prospects qui cliquent
 * sur la pub Meta (objectif PROSPECTS) ciblant le vol AF718 Dakar-Paris.
 *
 * FLUX COMPLET :
 *   Meta Ads (Lead Form AF718)
 *     → Webhook Make.com
 *       → POST https://robindesairs.eu/.netlify/functions/send-whatsapp
 *         → WhatsApp au prospect (message template approuvé)
 *           → Si prospect répond → whatsapp-webhook.ts (tunnel Robin)
 *
 * PRÉREQUIS NETLIFY :
 *   - WHATSAPP_360DIALOG_API_KEY  (ou WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID)
 *   - WHATSAPP_WEBHOOK_SECRET     (pour sécuriser l'appel depuis Make)
 *   - GEMINI_API_KEY              (pour le tunnel OCR carte d'embarquement)
 *   - ROBIN_TUNNEL_ENABLED=true
 *
 * TEMPLATE META À CRÉER (dans Meta Business Manager → WhatsApp Manager) :
 *   Nom        : robin_af718_prospect
 *   Catégorie  : Utilitaire
 *   Langue     : fr
 *   Corps :
 *     Bonjour {{1}} 👋
 *     Vous avez voyagé sur le vol AF718 (Dakar → Paris) ?
 *     Si votre vol était retardé de plus de 3h, vous pouvez récupérer
 *     *450 €* par personne grâce au règlement européen CE 261/2004.
 *     👉 Vérifiez votre éligibilité en 30 secondes : {{2}}
 *     L'équipe Robin des Airs 🛩️
 */

// ─────────────────────────────────────────────────
//  1. CONFIGURATION (à adapter dans Make.com)
// ─────────────────────────────────────────────────
const CONFIG = {
  netlifyFunctionUrl: 'https://robindesairs.eu/.netlify/functions/send-whatsapp',
  webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET || 'TON_SECRET_ICI',
  templateName: 'robin_af718_prospect',
  templateLanguage: 'fr',
  landingPageAF718: 'https://robindesairs.eu/?vol=AF718&utm_source=meta&utm_medium=lead&utm_campaign=af718',
};

// ─────────────────────────────────────────────────
//  2. FONCTION PRINCIPALE — Envoi message prospect
// ─────────────────────────────────────────────────
/**
 * Appelée par Make.com dès qu'un prospect remplit le formulaire Meta Lead.
 * @param {object} lead - Données du prospect depuis Meta Lead Form
 * @param {string} lead.prenom - Prénom du prospect
 * @param {string} lead.telephone - Numéro WhatsApp (format int. ex: 221771234567)
 * @param {string} lead.email - Email (pour CRM)
 * @param {string} lead.vol - Numéro de vol (ex: AF718)
 * @param {string} lead.date_vol - Date du vol (ex: 2026-03-10)
 */
async function envoyerMessageProspectAF718(lead) {
  const { prenom, telephone, email, vol = 'AF718', date_vol = '' } = lead;

  // Normalisation du numéro (supprime +, espaces, tirets)
  const telNormalise = String(telephone).replace(/[\s\-\+\.]/g, '');

  // Lien personnalisé avec pré-remplissage du formulaire
  const lienPersonnalise = `${CONFIG.landingPageAF718}&name=${encodeURIComponent(prenom)}&tel=${telNormalise}&date=${date_vol}`;

  const payload = {
    secret: CONFIG.webhookSecret,
    to: telNormalise,
    template: CONFIG.templateName,
    templateParams: [
      prenom,           // {{1}} — Prénom
      lienPersonnalise, // {{2}} — Lien vérification
    ],
    language: CONFIG.templateLanguage,
    // Métadonnées pour le CRM Robin (loggées via ROBIN_LOG_WEBHOOK_URL)
    meta: {
      source: 'meta_lead_af718',
      vol,
      date_vol,
      email,
      campagne: 'META_PROSPECTS_AF718',
    },
  };

  try {
    const response = await fetch(CONFIG.netlifyFunctionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[AF718] Erreur envoi WhatsApp:', response.status, result);
      return { success: false, error: result };
    }

    console.log(`[AF718] ✅ Message envoyé à ${prenom} (${telNormalise})`);
    return { success: true, to: telNormalise, prenom };

  } catch (err) {
    console.error('[AF718] Erreur réseau:', err.message);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────
//  3. MESSAGES DE RELANCE (J+1, J+3, J+7)
// ─────────────────────────────────────────────────
/**
 * Templates de relance — à créer et approuver dans Meta Business Manager.
 * Noms suggérés : robin_relance_j1, robin_relance_j3
 */
const TEMPLATES_RELANCE = {
  j1: {
    name: 'robin_relance_j1',
    // Corps : "Bonjour {{1}}, avez-vous pu vérifier votre éligibilité pour AF718 ?
    //         Il vous reste peut-être 450 € à récupérer 💰 → {{2}}"
    params: (prenom, lien) => [prenom, lien],
  },
  j3: {
    name: 'robin_relance_j3',
    // Corps : "{{1}}, votre demande AF718 est encore ouverte.
    //         Les réclamations CE 261 se font jusqu'à 6 ans après le vol. → {{2}}"
    params: (prenom, lien) => [prenom, lien],
  },
};

// ─────────────────────────────────────────────────
//  4. SCÉNARIO MAKE.COM — Instructions JSON
// ─────────────────────────────────────────────────
/**
 * Configuration du scénario Make.com à coller dans votre workspace.
 *
 * MODULE 1 — Déclencheur Meta Lead Ads
 *   App    : Meta Lead Ads
 *   Event  : New Lead
 *   Page   : Robin des Airs (votre Page Facebook)
 *   Form   : "Prospects AF718 — Vol Retardé"
 *
 * MODULE 2 — HTTP POST vers Netlify
 *   URL    : https://robindesairs.eu/.netlify/functions/send-whatsapp
 *   Method : POST
 *   Headers: Content-Type: application/json
 *   Body   :
 *     {
 *       "secret": "{{WHATSAPP_WEBHOOK_SECRET}}",
 *       "to": "{{1.phone}}",
 *       "template": "robin_af718_prospect",
 *       "templateParams": ["{{1.full_name}}", "https://robindesairs.eu/?vol=AF718&name={{1.full_name}}&utm_source=meta"],
 *       "language": "fr"
 *     }
 *
 * MODULE 3 — Google Sheets (Ajouter une ligne CRM)
 *   Sheet  : "Prospects AF718"
 *   Cols   : Date | Prénom | Téléphone | Email | Vol | Source | Statut WhatsApp
 *   Values : {{now}} | {{1.full_name}} | {{1.phone}} | {{1.email}} | AF718 | META_LEAD | {{2.status}}
 *
 * MODULE 4 (optionnel) — Filtre : si WhatsApp échoue → Email de secours
 *   Condition : {{2.success}} = false
 *   Action    : Gmail → Envoyer un email au prospect
 */
const MAKE_SCENARIO_DESCRIPTION = `
Scénario Make.com : Meta Lead AF718 → WhatsApp → CRM Google Sheets
- Déclencheur : nouveau lead Meta Ads (form AF718)
- Action 1    : envoyer WhatsApp template robin_af718_prospect
- Action 2    : logger dans Google Sheets (CRM)
- Action 3    : si échec WhatsApp → email de secours
`;

// ─────────────────────────────────────────────────
//  5. RÉPONSE AUTOMATIQUE IN-TUNNEL (whatsapp-webhook)
// ─────────────────────────────────────────────────
/**
 * Ce bloc décrit le comportement de whatsapp-webhook.ts quand
 * le prospect répond après avoir reçu le message AF718 :
 *
 * Prospect : "Bonjour, mon vol AF718 du 10 mars avait 5h de retard"
 *   → Robin (Gemini) : "Bonne nouvelle ! AF718 le 10/03 → retard 5h
 *     → 600 € brut → vous récupérez 450 € nets 🎉
 *     Envoyez votre carte d'embarquement pour démarrer :"
 *
 * Prospect : [envoie photo carte d'embarquement]
 *   → OCR Gemini extrait : vol, date, nom, PNR
 *   → Robin : "Parfait ! Votre dossier est créé. Signez ici : [lien mandat]"
 *
 * Ce tunnel est déjà codé dans api/whatsapp-webhook.ts.
 * Il suffit que GEMINI_API_KEY et ROBIN_TUNNEL_ENABLED=true soient dans Netlify.
 */

// ─────────────────────────────────────────────────
//  6. VISUELS ADS — Mapping créas vers messages
// ─────────────────────────────────────────────────
/**
 * Les visuels de la campagne AF718 sont dans le dossier racine.
 * Chaque créa correspond à un angle marketing.
 * Utiliser ces angles dans le corps des templates WhatsApp.
 */
const VISUELS_AF718 = {
  'ad_ig_A.png':        'Angle : "600€ → vous récupérez 450€ nets" — Urgence montant',
  'ad_ig_B.png':        'Angle : comparatif cash vs bon d\'achat — Avantage Robin',
  'ad_fb_A.png':        'Angle : famille voyageant, émotion — Diaspora sénégalaise',
  'ad_fb_B.png':        'Angle : preuve sociale "déjà 1200 dossiers traités"',
  'ad_story_A.png':     'Angle : format story — Swipe up vers formulaire AF718',
  'ad_story_B.png':     'Angle : story urgence "Vol retardé ? 48h pour réclamer"',
  'ad_set1_1A_montant_qui_frappe.png': 'Angle : "600€" en gros — Impact visuel immédiat',
  'ad_set2_2A_annulation_choc.png':    'Angle : annulation + choc émotionnel',
  'ad_set3_3A_retroactif_5_ans.png':   'Angle : rétroactivité 5 ans — Vols anciens AF718',
};

// Message WhatsApp adapté à chaque créa (à utiliser dans Make.com selon la créa de la pub)
const MESSAGES_PAR_CREEA = {
  'montant':    'Bonjour {{1}} ! Votre vol AF718 retardé → *450 €* vous attendent 💰 → {{2}}',
  'famille':    'Bonjour {{1}}, vous et votre famille méritez cette indemnité. AF718 → 450€/pers → {{2}}',
  'retroactif': 'Bonjour {{1}}, saviez-vous que vous pouvez réclamer jusqu\'à 6 ans après ? AF718 → {{2}}',
};

module.exports = {
  envoyerMessageProspectAF718,
  CONFIG,
  TEMPLATES_RELANCE,
  VISUELS_AF718,
  MESSAGES_PAR_CREEA,
};
