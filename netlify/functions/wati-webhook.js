/**
 * Webhook WATI — Bot Robin des Airs v3.1 + historique CRM
 *
 * URL à configurer dans WATI : Connectors → Webhooks
 *   https://robindesairs.eu/api/wati-webhook
 *
 * Flow complet géré ici (state machine via Netlify Blobs) :
 *   accueil → gate europe → nb passagers → type vol → incident
 *   → durée/correspondance → remboursements → OCR → vérif
 *   → année → passagers → mineurs → email → adresse → langue → FIN A/B/C
 */

const { appendWaMessage, normalizeWaPhone } = require('./lib/wa-convo-store');
const { normalizeWatiPhone, watiCfg, watiSendTyping } = require('./lib/wati-api');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

// ─── Envoi message session WATI ──────────────────────────────────────────────
async function send(phone, text, cfg) {
  if (!cfg) return;
  const wa = normalizeWatiPhone(phone);
  const params = new URLSearchParams({ messageText: text, channelPhoneNumber: cfg.channel });
  const url = `${cfg.base}/api/v1/sendSessionMessage/${encodeURIComponent(wa)}?${params}`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('wati-bot: send failed', e.message);
  }
}

async function sendDelayed(phone, text, cfg, ms = 1000) {
  await new Promise(r => setTimeout(r, ms));
  await send(phone, text, cfg);
}

// ─── État conversation (Netlify Blobs) ───────────────────────────────────────
async function getState(event, phone) {
  try {
    const { getStore } = require('@netlify/blobs');
    const store = getStore({ name: 'robin-bot-state', consistency: 'strong' });
    const key = `state/${phone.replace(/\D/g, '')}`;
    const raw = await store.get(key, { type: 'json' });
    return raw || { step: 'accueil' };
  } catch { return { step: 'accueil' }; }
}

async function setState(event, phone, state) {
  try {
    const { getStore } = require('@netlify/blobs');
    const store = getStore({ name: 'robin-bot-state', consistency: 'strong' });
    const key = `state/${phone.replace(/\D/g, '')}`;
    await store.setJSON(key, { ...state, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('wati-bot: setState failed', e.message);
  }
}

async function clearState(event, phone) {
  try {
    const { getStore } = require('@netlify/blobs');
    const store = getStore({ name: 'robin-bot-state', consistency: 'strong' });
    await store.delete(`state/${phone.replace(/\D/g, '')}`);
  } catch {}
}

// ─── Génération référence dossier ─────────────────────────────────────────────
function genRef() {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RDA-${ymd}-${rand}`;
}

// ─── Calcul montant indicatif ─────────────────────────────────────────────────
function montantIndicatif(pax = 1) {
  const netParPax = 420; // 600€ × 70%
  return netParPax * pax;
}

// ─── Messages du bot ──────────────────────────────────────────────────────────
const MSG = {
  accueil: () => `🟢⚪⚪⚪⚪⚪⚪
👋 Bienvenue chez *Robin des Airs* 🏹

*Vol retardé, annulé ou surbooké sur un trajet Europe ↔ Afrique ?*
La loi vous donne droit à *jusqu'à 600 €* par passager.
Vous avez *3 ans* pour réclamer — pas de frais si on ne gagne pas.

⚖️ *Zéro frais.* On prend 25 % uniquement si vous gagnez.

Répondez *1* pour commencer votre dossier (moins de 10 min).`,

  gate: () => `✈️ *D'où partait votre vol ?*

1 — D'un aéroport en *Europe* (France, Belgique, UK, Suisse…)
2 — D'un aéroport en *Afrique ou ailleurs*`,

  gate_compagnie: () => `Et la compagnie qui opérait ce vol ?

1 — Compagnie *européenne* (Air France, Brussels Airlines, TUI, easyJet…)
2 — Compagnie *africaine ou autre*`,

  rejet_zone: () => `Merci pour ces informations.

Le règlement européen CE 261 couvre uniquement les vols qui *partent d'Europe*, ou qui arrivent en Europe avec une *compagnie européenne*.

Votre situation n'entre malheureusement pas dans ce cadre.

Si vous avez d'autres vols via l'Europe, revenez ici — vous avez *3 ans* pour agir.

_L'équipe Robin 🏹_`,

  nb_pax: () => `🟢⚪⚪⚪⚪⚪⚪
👥 *Pour combien de passagers réclamez-vous ?*

1 — 1 passager
2 — 2 passagers
3 — 3 passagers
4 — 4 passagers
5 — 5 passagers
6 — 6 ou plus`,

  type_vol: (pax) => `✅ *${pax} passager(s) enregistré(s).*

✈️ Sur ce trajet : quel type de vol ?
🟢🟢⚪⚪⚪⚪⚪

1 — Vol *direct* (sans escale)
2 — Vol *avec escale*
3 — *Correspondance ratée*`,

  incident: (montant) => `✅ *C'est noté* — nous visons jusqu'à *${montant} € net* pour votre groupe. 🚀

⚖️ *Que s'est-il passé exactement ?*
🟢🟢🟢⚪⚪⚪⚪

1 — Retard à l'arrivée (+3h)
2 — Vol annulé
3 — Refus d'embarquement / surbooking
4 — Correspondance manquée à cause d'un retard`,

  duree_retard: () => `⏱️ *Environ combien d'heures de retard à l'arrivée ?*

1 — Moins de 3 heures
2 — Entre 3 et 4 heures
3 — Plus de 4 heures
4 — Je ne me souviens plus`,

  rejet_retard_court: () => `Merci. Pour un retard *inférieur à 3 heures* à l'arrivée, la loi européenne CE 261 ne prévoit pas d'indemnité.

Si vous pensez que le retard était plus long, ou si vous avez un autre incident, tapez *menu* pour recommencer.

_L'équipe Robin 🏹_`,

  correspondance: () => `✈️ *Correspondance manquée — précisons le vol concerné.*

1 — Le vol *initial* qui était en retard
2 — Le vol de *correspondance* que j'ai raté
3 — Les deux
4 — Je ne sais plus`,

  remboursements: () => `💡 *Bonne nouvelle — Robin récupère aussi vos avances !*

Si vous avez payé de votre poche à cause de ce vol *(taxi, hôtel, repas, transfert...)* :

🧾 *Conservez toutes vos factures et reçus.*

Robin des Airs les soumet à la compagnie et récupère ces frais *en plus* de l'indemnité légale. *Zéro effort de votre côté.*

Répondez *1* pour continuer.`,

  ocr: () => `📋 *Carte d'embarquement ou e-ticket*
🟢🟢🟢⚪⚪⚪⚪

Envoyez une *photo* de votre carte d'embarquement — le bot lit le numéro de vol, la date et votre nom automatiquement.

📱 Photo nette, bien cadrée, à plat.

Ou tapez les infos à la main :
✍️ Envoyez en un seul message :
Numéro de vol / Date (JJ/MM/AAAA) / PNR / Itinéraire (ex: CDG-ABJ)`,

  annee: (datejm) => `🗓️ *Quelle année pour le ${datejm} ?*

1 — ${new Date().getFullYear()}
2 — ${new Date().getFullYear() - 1}
3 — ${new Date().getFullYear() - 2}
4 — ${new Date().getFullYear() - 3}
5 — ${new Date().getFullYear() - 4} ou avant

_(Date antérieure ? Tapez la date complète ex. 15/03/2021)_
🟢🟢🟢🟢🟢🟢🟢`,

  confirm_ocr: (data) => `📸 *Billet lu ! Vérifiez :*

✈️ *${data.vol || '?'}* — ${data.compagnie || '?'}
🎫 *${data.date || '?'}*
📋 *${data.pnr || '?'}*
🛤️ *${data.route || '?'}*
👤 *${data.nom || '?'}*

1 — ✅ Tout est correct
2 — ✏️ Corriger`,

  mineurs: (noms) => `👶 *Question juridique importante*
🟢🟢🟢🟢🟢🟢🟢

Parmi les passagers suivants, y a-t-il des *mineurs* (moins de 18 ans) ?

${noms}

⚖️ Obligation légale pour préparer le bon mandat.

1 — Non, tous majeurs
2 — Oui, il y a des mineurs`,

  email: () => `📧 *Pour vous envoyer le mandat et le suivi du dossier*
🟢🟢🟢🟢🟢🟢🟢

Quelle est votre adresse email ?
_(Ex. : prenom@gmail.com)_`,

  adresse: () => `📮 *Adresse postale* (pour le mandat officiel)

Rue, ville et pays — ou *ville + pays* si vous préférez.
_(Ex. : 12 rue Léon Blum, Dakar, Sénégal)_`,

  langue: () => `🌍 *Dernière question !*
🟢🟢🟢🟢🟢🟢🟢

Dans quelle langue nos experts doivent-ils vous contacter *(appels, vocaux WhatsApp, suivi)* ?

1 — 🇫🇷 Français
2 — 🇬🇧 English
3 — 🇸🇳 Wolof
4 — 🇲🇱 Bambara
5 — 🇨🇮 Dioula
6 — Autre`,

  fin_a: (s) => `🎉 *Dossier enregistré !*
Réf. *${s.ref}*

👤 ${s.nom || '(passager)'}
✈️ ${s.vol || '?'} — ${s.compagnie || '?'} — ${s.route || '?'}
📅 ${s.date || '?'} · ${s.incident_libelle || '?'}
💵 *Objectif : ${montantIndicatif(s.pax)} € net*

Notre équipe a votre dossier. Prochaine étape : *2 minutes* pour l'activer. ⬇️`,

  fin_b: (s) => `✅ *Dossier ${s.ref} enregistré.*

Pour que Robin des Airs représente *${s.nom || 'votre groupe'}* auprès de *${s.compagnie || 'la compagnie'}*, signez votre *mandat de représentation*.

📋 Lisible avant signature — *aucune info bancaire à cette étape.*

👉 Signez ici (2 min) :
${s.mandat_url || 'https://robindesairs.eu/mandat.html?ref=' + s.ref}

Sans signature, nous ne pouvons pas agir en votre nom.

_L'équipe Robin 🏹_`,

  fin_c: (s) => `📎 *Ensuite — vos justificatifs*

Envoyez ici, en photos :

1. *Passeport ou CNI* (face lisible)
2. *Carte d'embarquement* ou confirmation *(si vous l'avez encore)*

🔒 Pièces réservées au dossier *${s.ref}* uniquement.
Confidentialité : https://robindesairs.eu/politique-confidentialite`,

  incompris: () => `Je n'ai pas compris votre réponse. Tapez le *numéro* correspondant à votre choix, ou tapez *menu* pour recommencer.`,

  menu: () => `🔄 Tapez *1* pour démarrer un nouveau dossier, ou envoyez votre question ici.`,
};

const INCIDENT_LABELS = {
  '1': 'Retard +3h', '2': 'Vol annulé', '3': 'Refus d\'embarquement', '4': 'Correspondance manquée',
};
const LANGUE_LABELS = {
  '1': '🇫🇷 Français', '2': '🇬🇧 English', '3': '🇸🇳 Wolof',
  '4': '🇲🇱 Bambara', '5': '🇨🇮 Dioula', '6': 'Autre',
};

// ─── Parsing message entrant ──────────────────────────────────────────────────
function parseVol(text) {
  // Tente de parser "AF718 / 12/05/2024 / K5FW8B / CDG-ABJ"
  const parts = text.split(/[\/\n|,]/).map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      vol: parts[0]?.toUpperCase() || '',
      date: parts[1] || '',
      pnr: parts[2]?.toUpperCase() || '',
      route: parts[3]?.toUpperCase() || '',
      compagnie: '',
      nom: '',
    };
  }
  return null;
}

function buildMandatUrl(s) {
  const base = 'https://robindesairs.eu/mandat.html';
  const p = new URLSearchParams({
    ref: s.ref || '',
    phone: s.phone || '',
    name: s.nom || '',
    vol: s.vol || '',
    date: s.date || '',
    pnr: s.pnr || '',
    route: s.route || '',
    compagnie: s.compagnie || '',
    motif: s.incident_libelle || '',
    indemnite: '600',
    source: 'wati-bot',
  });
  return `${base}?${p.toString()}`;
}

// ─── Machine à états ──────────────────────────────────────────────────────────
async function handleMessage(phone, text, event, cfg) {
  const input = (text || '').trim();
  const lower = input.toLowerCase();

  // Commandes globales
  if (['menu', 'restart', 'recommencer', 'start', 'bonjour', 'hello', 'hi', 'salut'].includes(lower)) {
    await clearState(event, phone);
    await send(phone, MSG.accueil(), cfg);
    await setState(event, phone, { step: 'gate', phone });
    return;
  }

  let s = await getState(event, phone);

  // ── ACCUEIL ────────────────────────────────────────────────────────────────
  if (s.step === 'accueil' || !s.step) {
    await send(phone, MSG.accueil(), cfg);
    await setState(event, phone, { step: 'gate', phone });
    return;
  }

  // ── GATE EUROPE ────────────────────────────────────────────────────────────
  if (s.step === 'gate') {
    if (input === '1') {
      s.geo = 'eu';
      s.step = 'nb_pax';
      await setState(event, phone, s);
      await send(phone, MSG.nb_pax(), cfg);
    } else if (input === '2') {
      s.step = 'gate_compagnie';
      await setState(event, phone, s);
      await send(phone, MSG.gate_compagnie(), cfg);
    } else {
      await send(phone, MSG.gate(), cfg);
    }
    return;
  }

  if (s.step === 'gate_compagnie') {
    if (input === '1') {
      s.geo = 'eu_carrier';
      s.step = 'nb_pax';
      await setState(event, phone, s);
      await send(phone, MSG.nb_pax(), cfg);
    } else if (input === '2') {
      await clearState(event, phone);
      await send(phone, MSG.rejet_zone(), cfg);
    } else {
      await send(phone, MSG.gate_compagnie(), cfg);
    }
    return;
  }

  // ── NOMBRE PASSAGERS ──────────────────────────────────────────────────────
  if (s.step === 'nb_pax') {
    const n = parseInt(input);
    if (n >= 1 && n <= 6) {
      s.pax = n === 6 ? 6 : n;
      s.step = 'type_vol';
      await setState(event, phone, s);
      await send(phone, MSG.type_vol(s.pax), cfg);
    } else {
      await send(phone, MSG.nb_pax(), cfg);
    }
    return;
  }

  // ── TYPE VOL ──────────────────────────────────────────────────────────────
  if (s.step === 'type_vol') {
    if (['1','2','3'].includes(input)) {
      s.type_vol = input === '1' ? 'direct' : input === '2' ? 'escale' : 'correspondance';
      s.step = 'incident';
      await setState(event, phone, s);
      await send(phone, MSG.incident(montantIndicatif(s.pax)), cfg);
    } else {
      await send(phone, MSG.type_vol(s.pax), cfg);
    }
    return;
  }

  // ── TYPE INCIDENT ─────────────────────────────────────────────────────────
  if (s.step === 'incident') {
    if (['1','2','3','4'].includes(input)) {
      s.incident = input;
      s.incident_libelle = INCIDENT_LABELS[input];
      if (input === '1') {
        s.step = 'duree_retard';
        await setState(event, phone, s);
        await send(phone, MSG.duree_retard(), cfg);
      } else if (input === '4') {
        s.step = 'correspondance';
        await setState(event, phone, s);
        await send(phone, MSG.correspondance(), cfg);
      } else {
        s.step = 'remboursements';
        await setState(event, phone, s);
        await send(phone, MSG.remboursements(), cfg);
      }
    } else {
      await send(phone, MSG.incident(montantIndicatif(s.pax)), cfg);
    }
    return;
  }

  // ── DURÉE RETARD ──────────────────────────────────────────────────────────
  if (s.step === 'duree_retard') {
    if (input === '1') {
      await clearState(event, phone);
      await send(phone, MSG.rejet_retard_court(), cfg);
    } else if (['2','3','4'].includes(input)) {
      s.duree_retard = input === '2' ? '3-4h' : input === '3' ? '4h+' : 'inconnue';
      s.step = 'remboursements';
      await setState(event, phone, s);
      await send(phone, MSG.remboursements(), cfg);
    } else {
      await send(phone, MSG.duree_retard(), cfg);
    }
    return;
  }

  // ── CORRESPONDANCE ────────────────────────────────────────────────────────
  if (s.step === 'correspondance') {
    if (['1','2','3','4'].includes(input)) {
      s.type_correspondance = input;
      s.step = 'remboursements';
      await setState(event, phone, s);
      await send(phone, MSG.remboursements(), cfg);
    } else {
      await send(phone, MSG.correspondance(), cfg);
    }
    return;
  }

  // ── REMBOURSEMENTS (info — répondre 1 pour continuer) ─────────────────────
  if (s.step === 'remboursements') {
    s.step = 'ocr';
    await setState(event, phone, s);
    await send(phone, MSG.ocr(), cfg);
    return;
  }

  // ── OCR / SAISIE MANUELLE ─────────────────────────────────────────────────
  if (s.step === 'ocr') {
    // Si c'est une image → signaler que l'OCR est en cours
    if (input.startsWith('[image]') || input.startsWith('[document]') || input.startsWith('[photo]')) {
      await send(phone, '📸 Image reçue — traitement en cours… Répondez *1* quand vous êtes prêt(e) pour continuer en saisie manuelle, ou attendez quelques secondes.', cfg);
      // En prod: déclencher OCR via Make/Zapier. Pour l'instant, demander saisie manuelle.
      s.step = 'ocr';
      await setState(event, phone, s);
      return;
    }
    // Tenter parsing manuel
    const vol_data = parseVol(input);
    if (vol_data && vol_data.vol) {
      s = { ...s, ...vol_data, step: 'confirm_ocr' };
      await setState(event, phone, s);
      await send(phone, MSG.confirm_ocr(s), cfg);
    } else {
      await send(phone, `Je n'ai pas pu lire les informations. Envoyez en ce format (une ligne chacun) :\n\nNuméro de vol (ex. AF718)\nDate (ex. 12/05/2024)\nPNR (ex. K5FW8B)\nItinéraire (ex. CDG → ABJ)`, cfg);
    }
    return;
  }

  // ── CONFIRMATION OCR ──────────────────────────────────────────────────────
  if (s.step === 'confirm_ocr') {
    if (input === '1') {
      // Vérifier si la date contient l'année
      if (s.date && !/\d{4}/.test(s.date)) {
        s.step = 'annee';
        await setState(event, phone, s);
        await send(phone, MSG.annee(s.date), cfg);
      } else {
        s.step = 'mineurs';
        await setState(event, phone, s);
        const noms = s.nom ? `• ${s.nom}` : '• (passager 1)';
        await send(phone, MSG.mineurs(noms), cfg);
      }
    } else if (input === '2') {
      s.step = 'ocr';
      await setState(event, phone, s);
      await send(phone, MSG.ocr(), cfg);
    } else {
      await send(phone, MSG.confirm_ocr(s), cfg);
    }
    return;
  }

  // ── ANNÉE ─────────────────────────────────────────────────────────────────
  if (s.step === 'annee') {
    const y = new Date().getFullYear();
    const map = { '1': y, '2': y-1, '3': y-2, '4': y-3, '5': y-4 };
    const annee = map[input] || (input.match(/\d{4}/) ? input.match(/\d{4}/)[0] : null);
    if (annee) {
      // Injecter l'année dans la date
      if (s.date && !s.date.includes(String(annee))) {
        s.date = s.date.replace(/\d{4}/, '') + '/' + annee;
        s.date = s.date.replace(/\/+/, '/').replace(/^\/|\/$/g, '');
      } else if (!s.date) {
        s.date = String(annee);
      }
      s.step = 'mineurs';
      await setState(event, phone, s);
      const noms = s.nom ? `• ${s.nom}` : '• (passager 1)';
      await send(phone, MSG.mineurs(noms), cfg);
    } else {
      await send(phone, MSG.annee(s.date || '?'), cfg);
    }
    return;
  }

  // ── MINEURS ───────────────────────────────────────────────────────────────
  if (s.step === 'mineurs') {
    if (input === '1' || input === '2') {
      s.mineurs = input === '2';
      s.step = 'email';
      await setState(event, phone, s);
      await send(phone, MSG.email(), cfg);
    } else {
      const noms = s.nom ? `• ${s.nom}` : '• (passager 1)';
      await send(phone, MSG.mineurs(noms), cfg);
    }
    return;
  }

  // ── EMAIL ─────────────────────────────────────────────────────────────────
  if (s.step === 'email') {
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRx.test(input)) {
      s.email = input;
      s.step = 'adresse';
      await setState(event, phone, s);
      await send(phone, MSG.adresse(), cfg);
    } else {
      await send(phone, `Format email invalide. Envoyez votre adresse email (ex. prenom@gmail.com) :`, cfg);
    }
    return;
  }

  // ── ADRESSE ───────────────────────────────────────────────────────────────
  if (s.step === 'adresse') {
    if (input.length >= 5) {
      s.adresse = input;
      s.step = 'langue';
      await setState(event, phone, s);
      await send(phone, MSG.langue(), cfg);
    } else {
      await send(phone, MSG.adresse(), cfg);
    }
    return;
  }

  // ── LANGUE ────────────────────────────────────────────────────────────────
  if (s.step === 'langue') {
    if (['1','2','3','4','5','6'].includes(input)) {
      s.langue = LANGUE_LABELS[input];
      s.ref = genRef();
      s.mandat_url = buildMandatUrl({ ...s, phone });
      s.step = 'done';
      await setState(event, phone, s);

      // FIN A — immédiat
      await send(phone, MSG.fin_a(s), cfg);
      // FIN B — +3s
      await sendDelayed(phone, MSG.fin_b(s), cfg, 3000);
      // FIN C — +30s
      await sendDelayed(phone, MSG.fin_c(s), cfg, 30000);

      // Sauvegarder le dossier complet dans Airtable via Make (si configuré)
      try {
        const makeUrl = process.env.MAKE_WEBHOOK_NEW_DOSSIER;
        if (makeUrl) {
          await fetch(makeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...s, source: 'wati-bot' }),
          });
        }
      } catch (e) {
        console.error('wati-bot: make webhook failed', e.message);
      }
    } else {
      await send(phone, MSG.langue(), cfg);
    }
    return;
  }

  // ── DOSSIER TERMINÉ ───────────────────────────────────────────────────────
  if (s.step === 'done') {
    await send(phone, `✅ Votre dossier *${s.ref}* est enregistré.\n\n👉 Signez le mandat : ${s.mandat_url}\n\nPour un nouveau dossier : tapez *menu*.`, cfg);
    return;
  }

  // ── PAR DÉFAUT ────────────────────────────────────────────────────────────
  await send(phone, MSG.incompris(), cfg);
}

// ─── Extraction message entrant WATI ─────────────────────────────────────────
function extractInbound(payload) {
  const list = [];
  if (!payload || typeof payload !== 'object') return list;
  const push = (item) => {
    if (!item || typeof item !== 'object') return;
    const waId = item.waId || item.whatsappNumber || item.from;
    const isOutbound = item.owner === true || item.eventType === 'sentMessage' || item.fromMe === true;
    if (isOutbound) return; // on ignore les messages sortants
    const text =
      item.text ||
      (item.finalText && String(item.finalText)) ||
      (item.type && item.type !== 'text' ? `[${item.type}]` : '');
    if (!waId) return;
    const phone = normalizeWaPhone(normalizeWatiPhone(waId));
    list.push({ phone, text: String(text || '').slice(0, 4096) });
  };
  if (Array.isArray(payload)) { payload.forEach(push); return list; }
  push(payload);
  if (Array.isArray(payload.messages)) payload.messages.forEach(push);
  if (payload.data && typeof payload.data === 'object') push(payload.data);
  return list;
}

function verifyWatiSecret(body, headers) {
  const expected = (process.env.WATI_WEBHOOK_SECRET || '').trim();
  if (!expected) return true;
  return (body && body.secret) === expected || (headers['x-wati-secret'] || headers['X-Wati-Secret']) === expected;
}

// ─── Handler principal ────────────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'POST only' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  if (!verifyWatiSecret(body, event.headers || {})) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Secret invalide' }) };
  }

  const cfg = watiCfg();
  const items = extractInbound(body);

  for (const { phone, text } of items) {
    if (!phone) continue;
    // Stocker dans CRM
    try {
      const { appendWaMessage } = require('./lib/wa-convo-store');
      await appendWaMessage(event, phone, { role: 'user', text, source: 'wati' });
    } catch {}
    // Traiter le message avec le bot
    try {
      await handleMessage(phone, text, event, cfg);
    } catch (e) {
      console.error('wati-bot: handleMessage error', e.message);
      if (cfg) await send(phone, 'Une erreur est survenue. Tapez *menu* pour recommencer.', cfg);
    }
  }

  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, processed: items.length }) };
};
