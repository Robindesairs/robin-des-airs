#!/usr/bin/env node
/**
 * Crée/soumet les 14 templates WhatsApp de Robin des Airs en UNE fois, via l'API Meta Graph
 * (POST /{WABA_ID}/message_templates). Les templates vivent sur le WABA → WATI les voit ensuite.
 * Référence du contenu : docs/TEMPLATES-WATI.md
 *
 * PRÉREQUIS (à exporter, JAMAIS committer) :
 *   WHATSAPP_WABA_ID         = ID de ton WhatsApp Business Account (Meta Business Manager)
 *   WHATSAPP_ACCESS_TOKEN    = token avec le scope `whatsapp_business_management`
 *                              (System User permanent recommandé — cf. docs/MESSAGE-WATI-CTWA.md)
 *
 * USAGE :
 *   node scripts/meta-create-templates.js            # DRY-RUN : montre ce qui serait soumis
 *   node scripts/meta-create-templates.js --submit   # soumet réellement à Meta (validation 24-48h)
 *   node scripts/meta-create-templates.js --only relance_dossier_a_finaliser,mandat_signe
 *
 * Idempotent côté Meta : un template au même nom déjà existant → l'API renvoie une erreur
 *   « already exists » (loggée, non bloquante) ; les autres continuent.
 */

'use strict';

const GRAPH = (process.env.GRAPH_BASE || 'https://graph.facebook.com/v21.0').replace(/\/$/, '');
const WABA = (process.env.WHATSAPP_WABA_ID || process.env.META_WABA_ID || '').trim();
const TOKEN = (process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN || '').trim();
const LANG = 'fr';
const SLOGAN = 'On prend aux compagnies, on rend aux familles'; // footer signature (45 car.)

// Helpers de composition (Graph API message_templates).
const HEADER = (text) => ({ type: 'HEADER', format: 'TEXT', text });
const BODY = (text, example) => ({ type: 'BODY', text, ...(example ? { example: { body_text: [example] } } : {}) });
const FOOTER = (text) => ({ type: 'FOOTER', text });
const QR = (...texts) => ({ type: 'BUTTONS', buttons: texts.map((t) => ({ type: 'QUICK_REPLY', text: t })) });
const URLBTN = (text, url) => ({ type: 'BUTTONS', buttons: [{ type: 'URL', text, url }] });

// ─── Les 14 templates (1:1 avec docs/TEMPLATES-WATI.md) ───────────────────────
const TEMPLATES = [
  // A — Ré-engagement hors fenêtre (MARKETING). {{1}} prénom · {{2}} vol/voyage · {{3}} montant.
  {
    name: 'relance_dossier_a_finaliser', category: 'MARKETING',
    components: [
      HEADER('Votre dossier est presque prêt ✈️'),
      BODY("Bonjour {{1}} 👋\n\nVotre dossier d'indemnisation pour le vol {{2}} est presque complet — il ne manque qu'une étape pour réclamer jusqu'à {{3}}.\n\nOn s'occupe de tout, et si on ne gagne pas, vous ne payez rien. On reprend là où vous vous étiez arrêté ?", ['Awa', 'AF718', '600 €']),
      FOOTER(SLOGAN),
      QR('Reprendre mon dossier', 'Être rappelé(e)'),
    ],
  },
  {
    name: 'relance_preuve_sociale', category: 'MARKETING',
    components: [
      BODY("Bonjour {{1}}, on revient vers vous 🙂\n\nPlusieurs passagers de votre vol {{2}} ont déjà lancé leur réclamation avec nous. Plus on est nombreux, plus le dossier est solide.\n\nVotre place est gardée — il suffit de reprendre pour viser jusqu'à {{3}} (0 € si on ne gagne pas).", ['Awa', 'AF718', '600 €']),
      FOOTER(SLOGAN),
      QR('Reprendre mon dossier', 'Être rappelé(e)'),
    ],
  },
  {
    name: 'relance_derniere_chance', category: 'MARKETING',
    components: [
      BODY("Bonjour {{1}}, dernier petit rappel pour votre dossier (vol {{2}}) 🙏\n\nVotre indemnisation (jusqu'à {{3}}) peut encore être réclamée — autant qu'elle vous revienne plutôt qu'elle reste à la compagnie.\n\nUne minute suffit pour reprendre, on fait le reste.", ['Awa', 'AF718', '600 €']),
      FOOTER(SLOGAN),
      QR('Reprendre mon dossier', 'Plus tard'),
    ],
  },
  // B — Suivi de dossier (UTILITY).
  {
    name: 'dossier_recu', category: 'UTILITY',
    components: [
      BODY("Bonjour {{1}}, votre dossier {{2}} a bien été enregistré ✅\n\nNous prenons le relais et réclamons jusqu'à {{3}} en votre nom auprès de la compagnie. On vous tient informé(e) à chaque étape — vous n'avez rien à avancer.", ['Awa', 'RDA-260614-1234', '600 €']),
      FOOTER(SLOGAN),
    ],
  },
  {
    name: 'mandat_signe', category: 'UTILITY',
    components: [
      BODY("Merci {{1}} 🙏 Votre mandat pour le dossier {{2}} est bien signé.\n\nVotre réclamation est désormais entre nos mains : on engage la démarche auprès de la compagnie pour récupérer jusqu'à {{3}}. Rappel : 0 € à payer, on se rémunère uniquement en cas de succès (commission 25 %).", ['Awa', 'RDA-260614-1234', '600 €']),
      FOOTER(SLOGAN),
    ],
  },
  {
    name: 'reclamation_envoyee', category: 'UTILITY',
    components: [
      BODY("Bonne nouvelle {{1}} ✈️ Votre réclamation pour le vol {{2}} vient d'être envoyée à la compagnie.\n\nLa loi leur laisse un délai pour répondre. On suit ça de près et on revient vers vous dès qu'il y a du nouveau.", ['Awa', 'AF718']),
    ],
  },
  {
    name: 'relance_compagnie', category: 'UTILITY',
    components: [
      BODY("Point sur votre dossier {{1}}, {{2}} : la compagnie n'a pas encore répondu dans les délais, alors on vient de lui envoyer une relance formelle (mise en demeure).\n\nC'est une étape normale de la procédure. On continue de défendre votre indemnisation.", ['RDA-260614-1234', 'Awa']),
    ],
  },
  {
    name: 'reponse_compagnie_accord', category: 'UTILITY',
    components: [
      BODY("Très bonne nouvelle {{1}} 🎉 La compagnie a accepté d'indemniser votre dossier {{2}}.\n\nUn conseiller revient vers vous très vite pour la suite et le versement de votre indemnité.", ['Awa', 'RDA-260614-1234']),
      QR('Être rappelé(e)'),
    ],
  },
  {
    name: 'escalade_procedure', category: 'UTILITY',
    components: [
      BODY("Point sur votre dossier {{1}}, {{2}} : faute de réponse satisfaisante de la compagnie, on passe à l'étape supérieure (saisine du médiateur, puis procédure si nécessaire).\n\nVous n'avez rien à faire ni à avancer — on porte votre dossier jusqu'au bout.", ['RDA-260614-1234', 'Awa']),
    ],
  },
  {
    name: 'paiement_en_cours', category: 'UTILITY',
    components: [
      BODY("Excellente nouvelle {{1}} 💸 L'indemnité de votre dossier {{2}} a été obtenue.\n\nVotre part, soit {{3}}, part vers vous. Merci de votre confiance — c'est exactement pour ça qu'on existe.", ['Awa', 'RDA-260614-1234', '450 €']),
      FOOTER(SLOGAN),
    ],
  },
  // C — Pièces (UTILITY).
  {
    name: 'piece_manquante', category: 'UTILITY',
    components: [
      BODY("Bonjour {{1}}, votre dossier {{2}} avance bien 🙂 Il nous manque encore une pièce pour le finaliser : {{3}}.\n\nUne simple photo suffit, directement ici dans la conversation. Vos données ne servent qu'à votre réclamation et ne sont jamais revendues 🔒.", ['Awa', 'RDA-260614-1234', "une pièce d'identité (passeport, CNI ou titre de séjour)"]),
      QR('Envoyer maintenant', 'Être rappelé(e)'),
    ],
  },
  {
    name: 'photo_a_reprendre', category: 'UTILITY',
    components: [
      BODY("Merci {{1}} 🙏 Petit souci sur le document reçu pour le dossier {{2}} : il est {{3}} et risque d'être refusé par la compagnie.\n\nPouvez-vous le reprendre à plat, en pleine lumière, les 4 coins bien visibles ? Ça sécurise votre demande.", ['Awa', 'RDA-260614-1234', 'un peu flou']),
      QR('Renvoyer la photo'),
    ],
  },
  // D — Rappel & parrainage.
  {
    name: 'rappel_programme', category: 'UTILITY',
    components: [
      BODY("Bonjour {{1}}, c'est noté 📞 Un conseiller Robin des Airs vous rappelle {{2}} au sujet de votre dossier {{3}}.\n\nVous pouvez aussi nous écrire ici à tout moment, on vous répond.", ['Awa', "aujourd'hui avant 18h", 'RDA-260614-1234']),
    ],
  },
  {
    name: 'parrainage', category: 'MARKETING',
    components: [
      BODY("Bonjour {{1}} 🙌 Content(e) d'avoir récupéré votre indemnité avec vous !\n\nUn proche a vécu un vol retardé (3 h ou plus), annulé ou un refus d'embarquement — même jusqu'à 5 ans en arrière ? Transmettez-lui notre contact : même accompagnement, 0 € à avancer.", ['Awa']),
      FOOTER(SLOGAN),
      URLBTN('Partager Robin des Airs', 'https://robindesairs.eu'),
    ],
  },
];

function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? (process.argv[i + 1] || '') : ''; }
const SUBMIT = process.argv.includes('--submit');
const ONLY = (arg('--only') || '').split(',').map((s) => s.trim()).filter(Boolean);

async function createOne(t) {
  const payload = { name: t.name, language: LANG, category: t.category, allow_category_change: true, components: t.components };
  const res = await fetch(`${GRAPH}/${WABA}/message_templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && !data.error, status: res.status, data };
}

(async () => {
  const list = ONLY.length ? TEMPLATES.filter((t) => ONLY.includes(t.name)) : TEMPLATES;
  console.log(`\n🏹 Robin des Airs — ${list.length} templates · langue ${LANG} · ${SUBMIT ? 'SOUMISSION RÉELLE' : 'DRY-RUN (rien envoyé)'}\n`);

  if (SUBMIT && (!WABA || !TOKEN)) {
    console.error('❌ WHATSAPP_WABA_ID et WHATSAPP_ACCESS_TOKEN requis pour --submit (scope whatsapp_business_management).');
    process.exit(1);
  }

  let ok = 0, ko = 0;
  for (const t of list) {
    const vars = (t.components.find((c) => c.type === 'BODY')?.example?.body_text?.[0] || []).length;
    if (!SUBMIT) {
      console.log(`• ${t.name.padEnd(30)} ${t.category.padEnd(9)} ${vars} var.  → prêt`);
      continue;
    }
    try {
      const r = await createOne(t);
      if (r.ok) { ok++; console.log(`✅ ${t.name.padEnd(30)} soumis (id ${r.data.id || '?'}, statut ${r.data.status || 'PENDING'})`); }
      else { ko++; console.log(`⚠️  ${t.name.padEnd(30)} ${r.status} — ${(r.data.error && r.data.error.error_user_msg) || (r.data.error && r.data.error.message) || JSON.stringify(r.data).slice(0, 160)}`); }
    } catch (e) { ko++; console.log(`🔴 ${t.name.padEnd(30)} ${e.message}`); }
    await new Promise((r) => setTimeout(r, 400)); // throttle léger
  }

  if (SUBMIT) console.log(`\n→ ${ok} soumis, ${ko} en erreur. Validation Meta : 24–48 h (suivre dans WhatsApp Manager / WATI → Templates).\n`);
  else console.log(`\n→ DRY-RUN. Relancer avec --submit pour soumettre réellement (WHATSAPP_WABA_ID + WHATSAPP_ACCESS_TOKEN requis).\n`);
})();
