/**
 * Sofia — découverte d'agences via Instagram (Graph API hashtag search, token Meta existant).
 *
 * Logique PURE (référentiel hashtags + extraction de contacts depuis les légendes).
 * Le fetch Graph API est dans sofia-prospect.js.
 *
 * LIMITE ASSUMÉE de l'API IG : la recherche par hashtag renvoie les MÉDIAS (légende,
 * permalien, stats) mais PAS le @ du compte propriétaire (restriction Meta). On exploite
 * donc ce que les agences diaspora mettent ELLES-MÊMES dans la légende : numéro
 * WhatsApp/téléphone (réflexe de booking) + éventuel @handle cité. Un prospect IG n'est
 * retenu que s'il a un contact exploitable (téléphone) — sinon non actionnable.
 *
 * Quota Meta : 30 hashtags uniques / 7 j / compte IG → on garde un set restreint et on
 * met en cache les IDs de hashtag (résolution une seule fois). Cron hebdo = aligné.
 */

'use strict';

const { normPhone, normName, COUNTRY_NAMES } = require('./agency-prospector');

// Hashtags ciblés par pays (sans #, minuscules — format attendu par ig_hashtag_search).
// Restreint volontairement (quota 30/7j). On démarre par SN / CI / GM.
const IG_HASHTAGS = {
  SN: { ville: 'Dakar', tags: ['agencedevoyagedakar', 'voyagedakar', 'agencevoyagesenegal', 'billetaviondakar'] },
  CI: { ville: 'Abidjan', tags: ['agencedevoyageabidjan', 'voyageabidjan', 'agencevoyagecotedivoire', 'billetavionabidjan'] },
  GM: { ville: 'Banjul', tags: ['gambiatravel', 'travelagencygambia', 'banjultravel', 'gambiatours'] },
};

/** Pays demandés → liste {pays, ville, tag} à interroger (défaut SN+CI+GM). */
function igTargets(paysArg) {
  const codes = paysArg && paysArg.length ? paysArg : ['SN', 'CI', 'GM'];
  const out = [];
  for (const code of codes) {
    const up = String(code || '').toUpperCase().trim();
    const cfg = IG_HASHTAGS[up];
    if (!cfg) continue;
    for (const tag of cfg.tags) out.push({ pays: up, ville: cfg.ville, tag });
  }
  return out;
}

/** Numéros (WhatsApp / tél) trouvés dans une légende → liste normalisée. */
function extractPhones(caption) {
  const txt = String(caption || '');
  const found = new Set();
  // wa.me / api.whatsapp.com/send?phone=
  for (const m of txt.matchAll(/(?:wa\.me\/|phone=)(\+?\d[\d]{7,15})/gi)) {
    const p = normPhone(m[1]);
    if (p) found.add(p.startsWith('+') ? p : '+' + p);
  }
  // numéros explicites avec indicatif international (+221, +225, +220, +33…)
  for (const m of txt.matchAll(/\+\d[\d\s().\-]{7,16}\d/g)) {
    const p = normPhone(m[0]);
    if (p && p.length >= 9) found.add(p);
  }
  return [...found];
}

/** @handles cités dans la légende (secondaires : souvent des comptes tiers tagués). */
function extractHandles(caption) {
  const out = new Set();
  for (const m of String(caption || '').matchAll(/@([a-z0-9._]{3,30})/gi)) {
    const h = m[1].toLowerCase().replace(/\.+$/, '');
    if (h.length >= 3) out.add(h);
  }
  return [...out];
}

const AGENCY_HINT = /(agence|voyage|travel|tour|tours|ticket|billet|booking|réservation|reservation|hajj|omra|omrah|visa)/i;
function looksLikeAgency(caption) {
  return AGENCY_HINT.test(String(caption || ''));
}

/** Nom « probable » depuis la légende : 1re ligne courte évoquant une agence, sinon handle. */
function guessName(caption, handles) {
  const firstLine = String(caption || '').split(/[\n\r]/)[0].trim();
  if (firstLine && firstLine.length <= 60 && AGENCY_HINT.test(firstLine)) {
    return firstLine.replace(/[#@].*$/, '').replace(/\s{2,}/g, ' ').trim().slice(0, 60) || null;
  }
  if (handles && handles[0]) return '@' + handles[0];
  return null;
}

/**
 * Média IG (hashtag search) → prospect, ou null si non actionnable.
 * @param {object} media { caption, permalink, timestamp, like_count }
 * @param {object} ctx { ville, pays, tag }
 */
function mediaToProspect(media, ctx) {
  const caption = media.caption || '';
  if (!looksLikeAgency(caption)) return null;
  const phones = extractPhones(caption);
  const handles = extractHandles(caption);
  if (!phones.length && !handles.length) return null; // rien pour recontacter
  const name = guessName(caption, handles) || (phones[0] ? `Agence (Instagram) ${phones[0]}` : `@${handles[0]}`);
  return {
    name,
    phone: phones[0] || '',
    website: handles[0] ? `https://instagram.com/${handles[0]}` : (media.permalink || ''),
    email: '',
    address: `${ctx.ville}, ${COUNTRY_NAMES[ctx.pays] || ctx.pays}`,
    ville: ctx.ville,
    pays: ctx.pays,
    paysNom: COUNTRY_NAMES[ctx.pays] || ctx.pays,
    source: 'instagram',
    handle: handles[0] || '',
    permalink: media.permalink || '',
    osm: '',
    lat: null,
    lng: null,
    contactable: !!(phones[0] || handles[0]),
  };
}

/** Liste de médias → prospects nettoyés (dédup interne par tél/handle). */
function mediaListToProspects(mediaList, ctx) {
  const out = [];
  const seen = new Set();
  for (const m of mediaList || []) {
    const p = mediaToProspect(m, ctx);
    if (!p) continue;
    const key = normPhone(p.phone) || p.handle || normName(p.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

module.exports = {
  IG_HASHTAGS,
  igTargets,
  extractPhones,
  extractHandles,
  looksLikeAgency,
  guessName,
  mediaToProspect,
  mediaListToProspects,
};
