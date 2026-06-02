/**
 * Webhook WATI — Bot Robin des Airs v4.0 · Mix v1 (mai) + v3.2
 *
 * URL WATI : Connectors → Webhooks
 *   https://robindesairs.eu/api/wati-webhook
 *
 * Améliorations v4 :
 *   - Pastille progression dynamique sur CHAQUE message
 *   - Saisie manuelle structurée (1 champ à la fois)
 *   - Nom passager principal + compagnie + route demandés
 *   - Confirmation passagers (étape 6) comme v1
 *   - Récap complet avant FIN A/B/C
 *   - Boutons interactifs partout (sendList / sendButtons)
 *   - Commandes globales : menu / restart
 *   - Webhook Make pour création Airtable
 */

const { appendWaMessage, normalizeWaPhone } = require('./lib/wa-convo-store');
const { normalizeWatiPhone, watiCfg } = require('./lib/wati-api');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

// ─── Progress bar dynamique ──────────────────────────────────────────────────
// Chaque step a une position sur 7 cases (comme v1 mai)
const PROGRESS = {
  accueil: 0, gate: 1, gate_compagnie: 1,
  nb_pax: 1,
  type_vol: 2,
  lang_pref: 2, // langue précoce supprimée — on garde la slot pour compat
  incident: 3, duree_retard: 3, correspondance: 3, remboursements: 3,
  ocr: 3, manuel_vol: 3, manuel_compagnie: 3, manuel_date: 3, manuel_pnr: 3, manuel_route: 3, manuel_nom: 3,
  confirm_ocr: 4,
  annee: 5,
  confirm_pax: 6,
  mineurs: 6,
  email: 7, adresse: 7, langue: 7, done: 7,
};
function bar(step) {
  const n = PROGRESS[step] ?? 0;
  return '🟢'.repeat(Math.max(0, n)) + '⚪'.repeat(Math.max(0, 7 - n));
}

// ─── Envoi message texte simple ───────────────────────────────────────────────
async function send(phone, text, cfg) {
  if (!cfg) return;
  const wa = normalizeWatiPhone(phone);
  const params = new URLSearchParams({ messageText: text, channelPhoneNumber: cfg.channel });
  try {
    await fetch(`${cfg.base}/api/v1/sendSessionMessage/${encodeURIComponent(wa)}?${params}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    });
  } catch (e) { console.error('wati-bot: send failed', e.message); }
}

// ─── Liste interactive (jusqu'à 10 options) ──────────────────────────────────
async function sendList(phone, { header, body, footer, buttonText, items }, cfg) {
  if (!cfg) return;
  const wa = normalizeWatiPhone(phone);
  try {
    const res = await fetch(
      `${cfg.base}/api/v1/sendInteractiveListMessage?whatsappNumber=${encodeURIComponent(wa)}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          header: header || '',
          body,
          footer: footer || 'robindesairs.eu',
          buttonText: buttonText || 'Choisir ▾',
          listItems: items.map(i => ({ title: i.title, description: i.description || '' })),
        }),
      }
    );
    const data = await res.json().catch(() => ({}));
    // Succès = HTTP 2xx sans erreur explicite. WATI ne renvoie pas toujours `result`
    // même quand le message interactif part bien → ne pas faire de faux fallback.
    const failed = !res.ok || data.result === false || data.error || data.ok === false;
    if (failed) {
      const txt = (header ? `*${header}*\n\n` : '') + body + '\n\n' +
        items.map((it, idx) => `${idx + 1} — ${it.title}`).join('\n');
      await send(phone, txt, cfg);
    }
  } catch (e) {
    const txt = body + '\n\n' + items.map((it, idx) => `${idx + 1} — ${it.title}`).join('\n');
    await send(phone, txt, cfg);
  }
}

// ─── Boutons rapides (max 3) ─────────────────────────────────────────────────
async function sendButtons(phone, { body, footer, buttons }, cfg) {
  if (!cfg) return;
  const wa = normalizeWatiPhone(phone);
  try {
    const res = await fetch(
      `${cfg.base}/api/v1/sendInteractiveButtonsMessage?whatsappNumber=${encodeURIComponent(wa)}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body,
          footer: footer || 'robindesairs.eu',
          buttons: buttons.slice(0, 3).map(b => ({ text: b.text })),
        }),
      }
    );
    const data = await res.json().catch(() => ({}));
    const failed = !res.ok || data.result === false || data.error || data.ok === false;
    if (failed) {
      const txt = body + '\n\n' + buttons.map((b, i) => `${i + 1} — ${b.text}`).join('\n');
      await send(phone, txt, cfg);
    }
  } catch (e) {
    const txt = body + '\n\n' + buttons.map((b, i) => `${i + 1} — ${b.text}`).join('\n');
    await send(phone, txt, cfg);
  }
}

async function sendDelayed(phone, text, cfg, ms = 1000) {
  await new Promise(r => setTimeout(r, ms));
  await send(phone, text, cfg);
}

// ─── État conversation ───────────────────────────────────────────────────────
async function getState(phone) {
  try {
    const { getStore } = require('@netlify/blobs');
    const store = getStore({ name: 'robin-bot-state', consistency: 'strong' });
    const raw = await store.get(`state/${phone.replace(/\D/g, '')}`, { type: 'json' });
    return raw || { step: 'accueil' };
  } catch { return { step: 'accueil' }; }
}
async function setState(phone, state) {
  try {
    const { getStore } = require('@netlify/blobs');
    const store = getStore({ name: 'robin-bot-state', consistency: 'strong' });
    await store.setJSON(`state/${phone.replace(/\D/g, '')}`, { ...state, updatedAt: new Date().toISOString() });
  } catch (e) { console.error('setState failed', e.message); }
}
async function clearState(phone) {
  try {
    const { getStore } = require('@netlify/blobs');
    const store = getStore({ name: 'robin-bot-state', consistency: 'strong' });
    await store.delete(`state/${phone.replace(/\D/g, '')}`);
  } catch {}
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────
function genRef() {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RDA-${ymd}-${rand}`;
}
function montantNet(pax = 1) { return 420 * pax; }

function normalizeInput(raw, options) {
  const t = (raw || '').trim().toLowerCase();
  if (/^\d+$/.test(t)) return t;
  const idx = options.findIndex(o => t.includes(o.toLowerCase()));
  if (idx >= 0) return String(idx + 1);
  return t;
}

function buildMandatUrl(s, phone) {
  const p = new URLSearchParams({
    ref: s.ref || '',
    phone: phone || '',
    name: s.nom || '',
    vol: s.vol || '',
    date: s.date || '',
    pnr: s.pnr || '',
    route: s.route || '',
    compagnie: s.compagnie || '',
    motif: s.incident_libelle || '',
    indemnite: '600',
    lang: s.langue_code || 'fr',
    source: 'wati-bot',
  });
  return `https://robindesairs.eu/mandat.html?${p.toString()}`;
}

const INCIDENT_LABELS = {
  '1': 'Retard +3h', '2': 'Vol annulé', '3': 'Refus d\'embarquement', '4': 'Correspondance manquée',
};
const LANGUE_LABELS = {
  '1': { name: '🇫🇷 Français', code: 'fr' },
  '2': { name: '🇬🇧 English', code: 'en' },
  '3': { name: '🇸🇳 Wolof', code: 'wo' },
  '4': { name: '🇲🇱 Bambara', code: 'bm' },
  '5': { name: '🇨🇮 Dioula', code: 'dyu' },
  '6': { name: '🌐 Autre', code: 'other' },
};

// ─── Handler principal — state machine ───────────────────────────────────────
async function handleMessage(phone, text, cfg) {
  const input = (text || '').trim();
  const lower = input.toLowerCase();

  // Commandes globales
  if (['menu', 'restart', 'recommencer', 'start', 'bonjour', 'hello', 'hi', 'salut'].includes(lower)) {
    await clearState(phone);
    await sendButtons(phone, {
      body: `${bar('accueil')}\n👋 Bienvenue chez *Robin des Airs* 🏹\n\n*Vol retardé, annulé ou surbooké sur un trajet Europe ↔ Afrique ?*\nLa loi vous donne droit à *jusqu'à 600 €* par passager.\n\n⚖️ *Zéro frais.* On prend 25 % uniquement si vous gagnez.\n\n👥 Déjà +1 200 familles indemnisées.\n⏱️ Moins de 10 min pour ouvrir votre dossier.`,
      footer: 'Vous avez 3 ans pour réclamer',
      buttons: [{ text: '✅ Commencer mon dossier' }],
    }, cfg);
    await setState(phone, { step: 'gate', phone });
    return;
  }

  let s = await getState(phone);

  // ── ACCUEIL ────────────────────────────────────────────────────────────────
  if (s.step === 'accueil' || !s.step) {
    await sendButtons(phone, {
      body: `${bar('accueil')}\n👋 Bienvenue chez *Robin des Airs* 🏹\n\n*Vol retardé, annulé ou surbooké sur un trajet Europe ↔ Afrique ?*\nLa loi vous donne droit à *jusqu'à 600 €* par passager.\n\n⚖️ *Zéro frais.* On prend 25 % uniquement si vous gagnez.\n\n👥 Déjà +1 200 familles indemnisées.\n⏱️ Moins de 10 min pour ouvrir votre dossier.`,
      footer: 'Vous avez 3 ans pour réclamer',
      buttons: [{ text: '✅ Commencer mon dossier' }],
    }, cfg);
    await setState(phone, { step: 'gate', phone });
    return;
  }

  // ── GATE EUROPE ────────────────────────────────────────────────────────────
  if (s.step === 'gate') {
    const norm = normalizeInput(input, ['europe', 'afrique', 'commencer']);
    if (norm === '1' || lower.includes('commencer')) {
      // Premier message = soit "Commencer" soit "Europe"
      if (lower.includes('commencer')) {
        // affiche gate
        await sendButtons(phone, {
          body: `${bar('gate')}\n✈️ *D'où partait votre vol ?*\n\nPour vérifier que vous êtes couvert par la loi européenne (CE 261).`,
          buttons: [{ text: '🇪🇺 D\'un aéroport en Europe' }, { text: '🌍 D\'Afrique ou ailleurs' }],
        }, cfg);
        return;
      }
      s.geo = 'eu'; s.step = 'nb_pax';
      await setState(phone, s);
      await sendList(phone, {
        header: 'Robin des Airs',
        body: `${bar('nb_pax')}\n👥 *Pour combien de passagers réclamez-vous ?*`,
        buttonText: 'Nombre ▾',
        items: [
          { title: '1 passager' }, { title: '2 passagers' }, { title: '3 passagers' },
          { title: '4 passagers' }, { title: '5 passagers' }, { title: '6 ou plus' },
        ],
      }, cfg);
    } else if (norm === '2') {
      s.step = 'gate_compagnie';
      await setState(phone, s);
      await sendButtons(phone, {
        body: `${bar('gate_compagnie')}\nEt la compagnie qui opérait ce vol ?`,
        buttons: [{ text: '🇪🇺 Compagnie européenne' }, { text: '🌍 Africaine ou autre' }],
      }, cfg);
    } else {
      await sendButtons(phone, {
        body: `${bar('gate')}\n✈️ *D'où partait votre vol ?*\n\nPour vérifier que vous êtes couvert par la loi européenne (CE 261).`,
        buttons: [{ text: '🇪🇺 D\'un aéroport en Europe' }, { text: '🌍 D\'Afrique ou ailleurs' }],
      }, cfg);
    }
    return;
  }

  if (s.step === 'gate_compagnie') {
    const norm = normalizeInput(input, ['européenne', 'africaine']);
    if (norm === '1') {
      s.geo = 'eu_carrier'; s.step = 'nb_pax';
      await setState(phone, s);
      await sendList(phone, {
        body: `${bar('nb_pax')}\n👥 *Pour combien de passagers réclamez-vous ?*`,
        buttonText: 'Nombre ▾',
        items: [
          { title: '1 passager' }, { title: '2 passagers' }, { title: '3 passagers' },
          { title: '4 passagers' }, { title: '5 passagers' }, { title: '6 ou plus' },
        ],
      }, cfg);
    } else if (norm === '2') {
      await clearState(phone);
      await send(phone, `Merci pour ces informations.\n\nLa loi européenne CE 261 couvre uniquement les vols qui *partent d'Europe* ou arrivent en Europe avec une *compagnie européenne*.\n\nSi vous avez d'autres vols passés via l'Europe, vous avez *3 ans* pour réclamer — revenez ici.\n\n_L'équipe Robin 🏹_`, cfg);
    } else {
      await sendButtons(phone, {
        body: 'La compagnie qui opérait ce vol ?',
        buttons: [{ text: '🇪🇺 Compagnie européenne' }, { text: '🌍 Africaine ou autre' }],
      }, cfg);
    }
    return;
  }

  // ── NOMBRE PASSAGERS ──────────────────────────────────────────────────────
  if (s.step === 'nb_pax') {
    const norm = normalizeInput(input, ['1 passager', '2 passagers', '3 passagers', '4 passagers', '5 passagers', '6 ou plus']);
    const n = parseInt(norm);
    if (n >= 1 && n <= 6) {
      s.pax = n; s.step = 'type_vol';
      await setState(phone, s);
      await sendList(phone, {
        body: `${bar('type_vol')}\n✅ *${s.pax} passager(s) enregistré(s).*\n\n✈️ Sur ce trajet : quel type de vol ?`,
        buttonText: 'Type de vol ▾',
        items: [
          { title: '✈️ Vol direct', description: 'Sans escale' },
          { title: '🔄 Vol avec escale', description: 'Une ou plusieurs escales' },
          { title: '⚠️ Correspondance ratée', description: 'À cause d\'un retard' },
        ],
      }, cfg);
    } else {
      await sendList(phone, {
        body: `${bar('nb_pax')}\n👥 *Pour combien de passagers ?*`,
        buttonText: 'Nombre ▾',
        items: [
          { title: '1 passager' }, { title: '2 passagers' }, { title: '3 passagers' },
          { title: '4 passagers' }, { title: '5 passagers' }, { title: '6 ou plus' },
        ],
      }, cfg);
    }
    return;
  }

  // ── TYPE VOL ──────────────────────────────────────────────────────────────
  if (s.step === 'type_vol') {
    const norm = normalizeInput(input, ['direct', 'escale', 'correspondance']);
    if (['1','2','3'].includes(norm)) {
      s.type_vol = norm === '1' ? 'direct' : norm === '2' ? 'escale' : 'correspondance';
      s.step = 'incident';
      await setState(phone, s);
      await sendList(phone, {
        body: `${bar('incident')}\n✅ *C'est noté* — objectif jusqu'à *${montantNet(s.pax)} € net* pour votre groupe. 🚀\n\n⚖️ *Que s'est-il passé exactement ?*`,
        buttonText: 'Incident ▾',
        items: [
          { title: '⏱️ Retard à l\'arrivée (+3h)' },
          { title: '❌ Vol annulé' },
          { title: '🚫 Refus d\'embarquement / surbooking' },
          { title: '🔄 Correspondance manquée' },
        ],
      }, cfg);
    } else {
      await sendList(phone, {
        body: `${bar('type_vol')}\n✈️ Sur ce trajet : quel type de vol ?`,
        buttonText: 'Type de vol ▾',
        items: [
          { title: '✈️ Vol direct' }, { title: '🔄 Vol avec escale' }, { title: '⚠️ Correspondance ratée' },
        ],
      }, cfg);
    }
    return;
  }

  // ── INCIDENT ──────────────────────────────────────────────────────────────
  if (s.step === 'incident') {
    const norm = normalizeInput(input, ['retard', 'annulé', 'refus', 'correspondance']);
    if (['1','2','3','4'].includes(norm)) {
      s.incident = norm;
      s.incident_libelle = INCIDENT_LABELS[norm];
      if (norm === '1') {
        s.step = 'duree_retard';
        await setState(phone, s);
        await sendList(phone, {
          body: `${bar('duree_retard')}\n⏱️ *Environ combien d'heures de retard à l'arrivée ?*`,
          buttonText: 'Durée ▾',
          items: [
            { title: 'Moins de 3 heures' },
            { title: 'Entre 3 et 4 heures' },
            { title: 'Plus de 4 heures' },
            { title: 'Je ne me souviens plus' },
          ],
        }, cfg);
      } else if (norm === '4') {
        s.step = 'correspondance';
        await setState(phone, s);
        await sendList(phone, {
          body: `${bar('correspondance')}\n✈️ *Quel vol pose problème ?*`,
          buttonText: 'Préciser ▾',
          items: [
            { title: 'Le vol initial (en retard)' },
            { title: 'Le vol de correspondance (raté)' },
            { title: 'Les deux' },
            { title: 'Je ne sais plus' },
          ],
        }, cfg);
      } else {
        await showRemboursements(phone, s, cfg);
      }
    } else {
      await sendList(phone, {
        body: `${bar('incident')}\n⚖️ *Que s'est-il passé exactement ?*`,
        buttonText: 'Incident ▾',
        items: [
          { title: '⏱️ Retard à l\'arrivée (+3h)' }, { title: '❌ Vol annulé' },
          { title: '🚫 Refus d\'embarquement' }, { title: '🔄 Correspondance manquée' },
        ],
      }, cfg);
    }
    return;
  }

  // ── DURÉE RETARD ──────────────────────────────────────────────────────────
  if (s.step === 'duree_retard') {
    const norm = normalizeInput(input, ['moins de 3', 'entre 3', 'plus de 4', 'souviens']);
    if (norm === '1') {
      await clearState(phone);
      await send(phone, `Merci. Pour un retard *inférieur à 3 heures* à l'arrivée, la loi européenne CE 261 ne prévoit pas d'indemnité forfaitaire.\n\nSi vous pensez que le retard était plus long, ou si vous avez un autre incident, tapez *menu* pour recommencer.\n\n_L'équipe Robin 🏹_`, cfg);
    } else if (['2','3','4'].includes(norm)) {
      s.duree_retard = norm === '2' ? '3-4h' : norm === '3' ? '4h+' : 'inconnue';
      await showRemboursements(phone, s, cfg);
    } else {
      await sendList(phone, {
        body: `${bar('duree_retard')}\n⏱️ *Combien d'heures de retard à l'arrivée ?*`,
        buttonText: 'Durée ▾',
        items: [
          { title: 'Moins de 3 heures' }, { title: 'Entre 3 et 4 heures' },
          { title: 'Plus de 4 heures' }, { title: 'Je ne me souviens plus' },
        ],
      }, cfg);
    }
    return;
  }

  // ── CORRESPONDANCE ────────────────────────────────────────────────────────
  if (s.step === 'correspondance') {
    const norm = normalizeInput(input, ['vol initial', 'vol de correspondance', 'les deux', 'sais']);
    if (['1','2','3','4'].includes(norm)) {
      s.type_correspondance = norm;
      await showRemboursements(phone, s, cfg);
    } else {
      await sendList(phone, {
        body: `${bar('correspondance')}\n✈️ *Quel vol pose problème ?*`,
        buttonText: 'Préciser ▾',
        items: [
          { title: 'Le vol initial (en retard)' }, { title: 'Le vol de correspondance (raté)' },
          { title: 'Les deux' }, { title: 'Je ne sais plus' },
        ],
      }, cfg);
    }
    return;
  }

  // ── REMBOURSEMENTS (info) → OCR ───────────────────────────────────────────
  if (s.step === 'remboursements') {
    s.step = 'ocr';
    await setState(phone, s);
    await sendButtons(phone, {
      body: `${bar('ocr')}\n📋 *Carte d'embarquement ou e-ticket*\n\n👍 *On vous fait gagner du temps* — une photo nette permet de remplir le dossier automatiquement.`,
      footer: 'C\'est le plus rapide',
      buttons: [{ text: '📸 Envoyer une photo' }, { text: '✍️ Saisir à la main' }],
    }, cfg);
    return;
  }

  // ── OCR / SAISIE MANUELLE ─────────────────────────────────────────────────
  if (s.step === 'ocr') {
    const norm = normalizeInput(input, ['photo', 'saisir']);
    if (norm === '1' || input.startsWith('[image]') || input.startsWith('[photo]')) {
      await send(phone, `📸 Envoyez maintenant la *photo* de votre carte d'embarquement ou e-ticket.\n\n_(Photo nette, bien cadrée, à plat — le bot lit automatiquement)_\n\n⏳ Pas de carte sous la main ? Tapez *saisie* pour entrer les infos manuellement.`, cfg);
      // En prod : Make/OCR webhook prend le relais
      s.step = 'ocr_waiting';
      await setState(phone, s);
    } else if (norm === '2' || lower.includes('saisi') || lower.includes('main')) {
      s.step = 'manuel_vol';
      await setState(phone, s);
      await send(phone, `${bar('manuel_vol')}\n✍️ *Saisie manuelle — étape 1/6*\n\n*Numéro de vol*\n_(ex. AF718, SN301, EJU7524)_`, cfg);
    } else {
      await sendButtons(phone, {
        body: `${bar('ocr')}\n📋 *Carte d'embarquement ou e-ticket*\n\nComment souhaitez-vous continuer ?`,
        buttons: [{ text: '📸 Envoyer une photo' }, { text: '✍️ Saisir à la main' }],
      }, cfg);
    }
    return;
  }

  // ── SAISIE MANUELLE — 1 champ à la fois ──────────────────────────────────
  if (s.step === 'manuel_vol') {
    const vol = input.toUpperCase().replace(/\s+/g, '');
    if (/^[A-Z0-9]{3,8}$/.test(vol)) {
      s.vol = vol; s.step = 'manuel_compagnie';
      await setState(phone, s);
      await send(phone, `${bar('manuel_compagnie')}\n✍️ *Étape 2/6 — Compagnie aérienne*\n\nQuelle compagnie opérait le vol ${vol} ?\n_(ex. Air France, Brussels Airlines, easyJet, ASKY…)_`, cfg);
    } else {
      await send(phone, `Numéro de vol non reconnu. Format attendu : *2-3 lettres + chiffres* (ex. AF718, SN301).\n\nRenvoyez le numéro de vol :`, cfg);
    }
    return;
  }

  if (s.step === 'manuel_compagnie') {
    if (input.length >= 2) {
      s.compagnie = input; s.step = 'manuel_date';
      await setState(phone, s);
      await send(phone, `${bar('manuel_date')}\n✍️ *Étape 3/6 — Date du vol*\n\nFormat : *JJ/MM/AAAA*\n_(ex. 12/05/2024)_`, cfg);
    } else {
      await send(phone, `Nom de compagnie trop court. Renvoyez la compagnie aérienne :`, cfg);
    }
    return;
  }

  if (s.step === 'manuel_date') {
    const m = input.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (m) {
      const yy = m[3].length === 2 ? '20' + m[3] : m[3];
      s.date = `${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}/${yy}`;
      s.step = 'manuel_pnr';
      await setState(phone, s);
      await send(phone, `${bar('manuel_pnr')}\n✍️ *Étape 4/6 — Code PNR (réservation)*\n\n6 caractères au-dessus du nom sur la carte d'embarquement.\n_(ex. K5FW8B)_\n\nVous ne l'avez pas ? Tapez *passer*.`, cfg);
    } else {
      await send(phone, `Date non reconnue. Format : *JJ/MM/AAAA* (ex. 12/05/2024).\n\nRenvoyez la date :`, cfg);
    }
    return;
  }

  if (s.step === 'manuel_pnr') {
    if (lower === 'passer' || lower === 'skip') {
      s.pnr = ''; s.step = 'manuel_route';
    } else {
      const pnr = input.toUpperCase().replace(/\s+/g, '');
      if (/^[A-Z0-9]{5,8}$/.test(pnr)) {
        s.pnr = pnr; s.step = 'manuel_route';
      } else {
        await send(phone, `Code PNR invalide. 6 caractères alphanumériques attendus (ex. K5FW8B). Ou tapez *passer*.`, cfg);
        return;
      }
    }
    await setState(phone, s);
    await send(phone, `${bar('manuel_route')}\n✍️ *Étape 5/6 — Itinéraire*\n\n*Aéroport de départ → aéroport d'arrivée*\nCodes IATA 3 lettres préférés.\n_(ex. CDG → ABJ, BRU → DKR, AMS → NBO)_`, cfg);
    return;
  }

  if (s.step === 'manuel_route') {
    const route = input.replace(/[\s\-]+/g, ' ').replace(/→|->/g, ' → ').trim();
    if (route.length >= 5) {
      s.route = route; s.step = 'manuel_nom';
      await setState(phone, s);
      await send(phone, `${bar('manuel_nom')}\n✍️ *Étape 6/6 — Nom du passager principal*\n\nTel qu'écrit sur la carte d'embarquement.\n_(ex. M. SAMIR DRIDI, Mme FATOU DIOP)_`, cfg);
    } else {
      await send(phone, `Itinéraire trop court. Format : *aéroport départ → aéroport arrivée* (ex. CDG → ABJ).`, cfg);
    }
    return;
  }

  if (s.step === 'manuel_nom') {
    if (input.length >= 3) {
      s.nom = input.toUpperCase();
      s.step = 'confirm_ocr';
      await setState(phone, s);
      await sendButtons(phone, {
        body: `${bar('confirm_ocr')}\n📸 *Récapitulatif du vol — vérifiez :*\n\n✈️ *${s.vol}* — ${s.compagnie}\n🎫 *${s.date}*\n📋 *${s.pnr || '—'}*\n🛤️ *${s.route}*\n👤 *${s.nom}*\n\nℹ️ Une info incorrecte ? Touchez *Corriger*.`,
        buttons: [{ text: '✅ Tout est correct' }, { text: '✏️ Corriger' }],
      }, cfg);
    } else {
      await send(phone, `Nom trop court. Renvoyez le nom complet du passager principal :`, cfg);
    }
    return;
  }

  // ── CONFIRMATION VOL ──────────────────────────────────────────────────────
  if (s.step === 'confirm_ocr') {
    const norm = normalizeInput(input, ['correct', 'corriger']);
    if (norm === '1') {
      // Demander année si manquante
      if (s.date && /^(\d{1,2})\/(\d{1,2})$/.test(s.date)) {
        s.step = 'annee';
        await setState(phone, s);
        const y = new Date().getFullYear();
        await sendList(phone, {
          body: `${bar('annee')}\n🗓️ *Quelle année pour le ${s.date} ?*`,
          buttonText: 'Année ▾',
          items: [
            { title: String(y) }, { title: String(y-1) }, { title: String(y-2) },
            { title: String(y-3) }, { title: String(y-4) + ' ou avant' },
          ],
        }, cfg);
        return;
      }
      s.step = 'confirm_pax';
      await setState(phone, s);
      const noms = s.nom ? `1. *${s.nom}*` : '1. (à confirmer)';
      const note_pax_supplementaires = s.pax > 1 ? `\n\n_Pour les ${s.pax - 1} autres passagers, nous reviendrons vers vous avec un lien sécurisé après ouverture du dossier._` : '';
      await sendButtons(phone, {
        body: `${bar('confirm_pax')}\n👥 *Les ${s.pax} passagers — confirmez*\n\n${noms}${note_pax_supplementaires}`,
        buttons: [{ text: '✅ Confirmer' }, { text: '✏️ Modifier' }],
      }, cfg);
    } else if (norm === '2') {
      s.step = 'manuel_vol';
      await setState(phone, s);
      await send(phone, `${bar('manuel_vol')}\n✍️ *Reprise saisie — Étape 1/6*\n\n*Numéro de vol*`, cfg);
    } else {
      await sendButtons(phone, {
        body: `📸 *Récapitulatif du vol — vérifiez :*\n\n✈️ *${s.vol}* — ${s.compagnie}\n🎫 *${s.date}*\n📋 *${s.pnr || '—'}*\n🛤️ *${s.route}*\n👤 *${s.nom}*`,
        buttons: [{ text: '✅ Tout est correct' }, { text: '✏️ Corriger' }],
      }, cfg);
    }
    return;
  }

  // ── ANNÉE ─────────────────────────────────────────────────────────────────
  if (s.step === 'annee') {
    const y = new Date().getFullYear();
    const yearMap = { '1': y, '2': y-1, '3': y-2, '4': y-3, '5': y-4 };
    const norm = normalizeInput(input, [String(y), String(y-1), String(y-2), String(y-3), String(y-4) + ' ou avant']);
    const annee = yearMap[norm] || (input.match(/\d{4}/) ? input.match(/\d{4}/)[0] : null);
    if (annee) {
      if (s.date && /^\d{1,2}\/\d{1,2}$/.test(s.date)) {
        s.date = `${s.date}/${annee}`;
      } else if (!s.date.includes(String(annee))) {
        s.date = s.date + '/' + annee;
      }
      s.step = 'confirm_pax';
      await setState(phone, s);
      const noms = s.nom ? `1. *${s.nom}*` : '1. (à confirmer)';
      const note_pax_supplementaires = s.pax > 1 ? `\n\n_Pour les ${s.pax - 1} autres passagers, nous reviendrons vers vous avec un lien sécurisé après ouverture du dossier._` : '';
      await sendButtons(phone, {
        body: `${bar('confirm_pax')}\n👥 *Les ${s.pax} passagers — confirmez*\n\n${noms}${note_pax_supplementaires}`,
        buttons: [{ text: '✅ Confirmer' }, { text: '✏️ Modifier' }],
      }, cfg);
    } else {
      await sendList(phone, {
        body: `${bar('annee')}\n🗓️ *Quelle année pour le ${s.date || '?'} ?*`,
        buttonText: 'Année ▾',
        items: [
          { title: String(y) }, { title: String(y-1) }, { title: String(y-2) },
          { title: String(y-3) }, { title: String(y-4) + ' ou avant' },
        ],
      }, cfg);
    }
    return;
  }

  // ── CONFIRMATION PASSAGERS ────────────────────────────────────────────────
  if (s.step === 'confirm_pax') {
    const norm = normalizeInput(input, ['confirmer', 'modifier']);
    if (norm === '1') {
      s.step = 'mineurs';
      await setState(phone, s);
      const noms = s.nom ? `• *${s.nom}*` : '• (passager 1)';
      await sendButtons(phone, {
        body: `${bar('mineurs')}\n👶 *Question juridique importante*\n\nParmi les passagers suivants, y a-t-il des *mineurs* (moins de 18 ans) ?\n\n${noms}\n\n⚖️ Obligation légale pour préparer le bon mandat.`,
        buttons: [{ text: '✅ Non, tous majeurs' }, { text: '👶 Oui, il y a des mineurs' }],
      }, cfg);
    } else if (norm === '2') {
      s.step = 'manuel_nom';
      await setState(phone, s);
      await send(phone, `${bar('manuel_nom')}\n✍️ Renvoyez le nom du passager principal :`, cfg);
    } else {
      const noms = s.nom ? `1. *${s.nom}*` : '1. (passager 1)';
      await sendButtons(phone, {
        body: `${bar('confirm_pax')}\n👥 *Les ${s.pax} passagers — confirmez*\n\n${noms}`,
        buttons: [{ text: '✅ Confirmer' }, { text: '✏️ Modifier' }],
      }, cfg);
    }
    return;
  }

  // ── MINEURS ───────────────────────────────────────────────────────────────
  if (s.step === 'mineurs') {
    const norm = normalizeInput(input, ['majeurs', 'mineurs']);
    if (norm === '1' || norm === '2') {
      s.mineurs = norm === '2';
      s.step = 'email';
      await setState(phone, s);
      await send(phone, `${bar('email')}\n📧 *Pour vous envoyer le mandat et le suivi du dossier*\n\nQuelle est votre adresse email ?\n_(Ex. : prenom@gmail.com)_`, cfg);
    } else {
      const noms = s.nom ? `• *${s.nom}*` : '• (passager 1)';
      await sendButtons(phone, {
        body: `${bar('mineurs')}\n👶 *Y a-t-il des mineurs parmi les passagers ?*\n\n${noms}`,
        buttons: [{ text: '✅ Non, tous majeurs' }, { text: '👶 Oui, il y a des mineurs' }],
      }, cfg);
    }
    return;
  }

  // ── EMAIL ─────────────────────────────────────────────────────────────────
  if (s.step === 'email') {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
      s.email = input;
      s.step = 'adresse';
      await setState(phone, s);
      await send(phone, `${bar('adresse')}\n📮 *Adresse postale* (pour le mandat officiel)\n\nRue, ville et pays — ou *ville + pays* si vous préférez.\n_(Ex. : 12 rue Léon Blum, Dakar, Sénégal)_`, cfg);
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
      await setState(phone, s);
      await sendList(phone, {
        header: '🌍 Dernière question !',
        body: `${bar('langue')}\nDans quelle langue nos experts doivent-ils vous contacter *(appels, vocaux WhatsApp, suivi)* ?`,
        buttonText: 'Langue ▾',
        items: [
          { title: '🇫🇷 Français' }, { title: '🇬🇧 English' }, { title: '🇸🇳 Wolof' },
          { title: '🇲🇱 Bambara' }, { title: '🇨🇮 Dioula' }, { title: '🌐 Autre' },
        ],
      }, cfg);
    } else {
      await send(phone, `Adresse trop courte. Renvoyez votre adresse (ville + pays minimum) :`, cfg);
    }
    return;
  }

  // ── LANGUE → FIN A/B/C ────────────────────────────────────────────────────
  if (s.step === 'langue') {
    const norm = normalizeInput(input, ['français', 'english', 'wolof', 'bambara', 'dioula', 'autre']);
    if (['1','2','3','4','5','6'].includes(norm)) {
      const L = LANGUE_LABELS[norm];
      s.langue = L.name;
      s.langue_code = L.code;
      s.ref = genRef();
      s.mandat_url = buildMandatUrl(s, phone);
      s.step = 'done';
      await setState(phone, s);

      // ⚠️ Serverless: PAS de longs setTimeout (Netlify tue la fonction >10-26s).
      // On envoie les 3 messages de fin en séquence rapide (~0.8s entre chaque).
      // FIN A — Récap
      await send(phone, formatFinA(s), cfg);
      // FIN B — Mandat
      await sendDelayed(phone, formatFinB(s), cfg, 800);
      // FIN C — Pièces
      await sendDelayed(phone, formatFinC(s), cfg, 800);

      // Webhook Make → création Airtable (fire, ne pas bloquer si lent)
      try {
        const makeUrl = process.env.MAKE_WEBHOOK_NEW_DOSSIER;
        if (makeUrl) {
          await fetch(makeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...s, phone, source: 'wati-bot-v4' }),
          });
        }
      } catch (e) { console.error('make webhook failed', e.message); }
    } else {
      await sendList(phone, {
        body: `${bar('langue')}\n🌍 Dans quelle langue voulez-vous être contacté ?`,
        buttonText: 'Langue ▾',
        items: [
          { title: '🇫🇷 Français' }, { title: '🇬🇧 English' }, { title: '🇸🇳 Wolof' },
          { title: '🇲🇱 Bambara' }, { title: '🇨🇮 Dioula' }, { title: '🌐 Autre' },
        ],
      }, cfg);
    }
    return;
  }

  // ── DOSSIER TERMINÉ ───────────────────────────────────────────────────────
  if (s.step === 'done') {
    await send(phone, `✅ Votre dossier *${s.ref}* est enregistré.\n\n👉 Signez le mandat : ${s.mandat_url}\n\nPour un nouveau dossier : tapez *menu*.`, cfg);
    return;
  }

  if (s.step === 'ocr_waiting') {
    // Si on reçoit du texte ici, on traite comme une saisie manuelle
    if (input.startsWith('[image]') || input.startsWith('[photo]')) {
      await send(phone, `📸 Photo bien reçue. Notre équipe la traite. En attendant, vous pouvez tout saisir à la main — tapez *saisie*.`, cfg);
    } else if (lower.includes('saisi')) {
      s.step = 'manuel_vol';
      await setState(phone, s);
      await send(phone, `${bar('manuel_vol')}\n✍️ *Saisie manuelle — Étape 1/6*\n\n*Numéro de vol*`, cfg);
    } else {
      await send(phone, `J'attends votre carte d'embarquement en photo. Pas de carte ? Tapez *saisie*.`, cfg);
    }
    return;
  }

  // ── INCOMPRIS ─────────────────────────────────────────────────────────────
  await send(phone, `Je n'ai pas compris votre réponse. Tapez le *numéro* ou utilisez le bouton, ou *menu* pour recommencer.`, cfg);
}

// ─── Helpers messages ────────────────────────────────────────────────────────
async function showRemboursements(phone, s, cfg) {
  s.step = 'remboursements';
  await setState(phone, s);
  await sendButtons(phone, {
    body: `💡 *Bonne nouvelle — Robin récupère aussi vos avances !*\n\nSi vous avez payé de votre poche à cause de ce vol *(taxi, hôtel, repas, transfert...)* :\n\n🧾 *Conservez toutes vos factures et reçus.*\n\nRobin des Airs les soumet à la compagnie et récupère ces frais *en plus* de l'indemnité légale. *Zéro effort de votre côté.*`,
    footer: 'On continue avec votre billet ?',
    buttons: [{ text: '✅ Compris, continuer' }],
  }, cfg);
}

function formatFinA(s) {
  return `🎉 *Dossier prêt à être déposé !*

📋 *Récapitulatif*
👥 *Passagers :* ${s.pax}
🪪 *Nom principal :* ${s.nom || '(à compléter)'}
✈️ *Parcours :* ${s.type_vol === 'direct' ? 'direct' : s.type_vol === 'escale' ? 'avec escale' : 'correspondance'}
📞 *Langue suivi :* ${s.langue}
⚖️ *Incident :* ${s.incident_libelle}${s.duree_retard ? ' (' + s.duree_retard + ')' : ''}
🛫 *Compagnie :* ${s.compagnie || '—'}
🔢 *N° de vol :* ${s.vol || '—'}
📅 *Date :* ${s.date || '—'}
🎫 *PNR :* ${s.pnr || '—'}
🌍 *Itinéraire :* ${s.route || '—'}
📧 ${s.email || '—'}

📁 *Réf. dossier :* *${s.ref}*
💵 *Montant net visé (groupe) :* *${montantNet(s.pax)} €*

⬇️ Prochaine étape : *2 minutes* pour signer.`;
}

function formatFinB(s) {
  return `✅ *Action requise — signature du mandat*

Pour que Robin des Airs représente *${s.nom || 'votre groupe'}* auprès de *${s.compagnie || 'la compagnie'}*, signez votre *mandat de représentation*.

📋 Lisible avant signature — *aucune info bancaire à cette étape.*

👉 *Signez ici* (2 min) :
${s.mandat_url}

Sans signature, nous ne pouvons pas agir en votre nom.

_L'équipe Robin 🏹_`;
}

function formatFinC(s) {
  return `📎 *Ensuite — vos justificatifs*

Envoyez ici, en photos :

1. *Passeport ou CNI* (face lisible)
2. *Carte d'embarquement* ou confirmation _(si vous l'avez encore)_
${s.duree_retard || s.type_correspondance ? '3. *Factures taxi / hôtel / repas* (avances payées de votre poche)' : ''}

🔒 Pièces réservées au dossier *${s.ref}* uniquement.
Confidentialité : https://robindesairs.eu/politique-confidentialite`;
}

// ─── Extraction message entrant WATI ─────────────────────────────────────────
function extractInbound(payload) {
  const list = [];
  const seen = new Set(); // dédup : un même message inbound peut apparaître à la racine ET dans data/messages
  if (!payload || typeof payload !== 'object') return list;
  const push = (item) => {
    if (!item || typeof item !== 'object') return;
    const waId = item.waId || item.whatsappNumber || item.from;
    const isOutbound = item.owner === true || item.eventType === 'sentMessage' || item.fromMe === true;
    if (isOutbound) return;

    // ── Réponses interactives WATI (priorité : un tap de bouton/liste = la sélection) ──
    // WATI envoie : listReply {id,title,description} · interactiveButtonReply {id,text} · buttonReply {text}
    const listReply = item.listReply || item.list_reply || item.interactiveListReply;
    const btnReply  = item.interactiveButtonReply || item.buttonReply || item.button_reply;
    const replyText =
      (listReply && (listReply.title || listReply.id)) ||
      (btnReply  && (btnReply.text || btnReply.title || btnReply.id)) ||
      null;

    // Ignorer le payload de test WATI (placeholders littéraux)
    if (waId === 'senderPhone' || item.text === 'text') return;

    const text =
      replyText ||
      item.text ||
      (item.finalText && String(item.finalText)) ||
      (item.type && item.type !== 'text' ? `[${item.type}]` : '');
    if (!waId) return;
    const phone = normalizeWaPhone(normalizeWatiPhone(waId));
    if (!String(text || '').trim()) return;
    // Clé de dédup : id WATI du message si dispo, sinon téléphone+texte
    const key = item.id || item.messageId || item.whatsappMessageId || `${phone}|${String(text).trim()}`;
    if (seen.has(key)) return;
    seen.add(key);
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
    try { await appendWaMessage(event, phone, { role: 'user', text, source: 'wati' }); } catch {}
    try { await handleMessage(phone, text, cfg); }
    catch (e) {
      console.error('wati-bot: handleMessage error', e.message, e.stack);
      if (cfg) await send(phone, `Une erreur est survenue. Tapez *menu* pour recommencer.`, cfg);
    }
  }

  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, processed: items.length }) };
};
