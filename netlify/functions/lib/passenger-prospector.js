/**
 * Sofia / Malik — découverte de leads passagers via Instagram (Graph API hashtag search).
 *
 * Cherche des posts de PASSAGERS ayant subi un retard/annulation et n'ayant pas été
 * indemnisés. Contrairement à ig-prospector.js (agences), ici on cible des particuliers
 * qui se plaignent en première personne → potentiels clients RDA.
 *
 * LIMITE API : le Graph API renvoie la légende + le permalink mais PAS le @handle de
 * l'auteur. Le contact se fait donc sur le permalink (Malik visite et envoie un DM manuel),
 * sauf si l'auteur cite lui-même son @ ou son WhatsApp dans la légende.
 *
 * Budget hashtags : ~12 ici + ~12 dans ig-prospector = 24/30 par semaine/compte.
 * → Ne jamais dépasser 6 hashtags par run pour garder de la marge.
 */

'use strict';

// Hashtags ciblant les plaintes passagers. 6 max par run (quota 30/7j partagé).
const LEAD_HASHTAGS = [
  'retardavion',
  'volannule',
  'droitspassagers',
  'ce261',
  'airfranceretard',
  'transaviaretard',
  'pasremboursevol',
  'indemnisationvol',
  'ryanairprobleme',
  'flightdelay',
  'flightcancelled',
  'droitspassagers',
];

// Par défaut on en prend 6 (laisse 6 de marge vs quota 30)
const DEFAULT_TAG_LIMIT = 6;

// Signal de vécu personnel (au moins un requis pour être un vrai lead passager)
const FIRST_PERSON =
  /\b(j'ai|j'étais|je suis|mon vol|ma réservation|nous avons|notre vol|on a|on était|my flight|i was|i had|my booking|we were|we had)\b/i;

// Mots-clés d'incident
const INCIDENT_RE =
  /(retard[ée]?|annul[ée]?|delay|cancel|refus|denied|boarding|overbooking|refund|remboursement|indemnisation|compensation)/i;

// Destinations africaines corridors RDA
const AFRICA_RE =
  /(dakar|abidjan|bamako|banjul|lagos|douala|kinshasa|nairobi|accra|lomé|cotonou|ouagadougou|conakry|libreville|sénégal|côte d'ivoire|mali|gambie|nigeria|cameroun|gabon|guinée)/i;

// Détection compagnie
const AIRLINE_MAP = {
  'Air France': /\b(air france|airfrance)\b/i,
  'Transavia': /\b(transavia)\b/i,
  'Ryanair': /\b(ryanair)\b/i,
  'easyJet': /\b(easyjet|easy jet)\b/i,
  'Brussels Airlines': /\b(brussels airlines?|brusselsairlines)\b/i,
  'Air Sénégal': /\b(air sénégal|air senegal|airsénégal)\b/i,
  'Corsair': /\b(corsair)\b/i,
  'Vueling': /\b(vueling)\b/i,
  'Wizz Air': /\b(wizz air|wizzair)\b/i,
};

function detectAirline(caption) {
  for (const [name, re] of Object.entries(AIRLINE_MAP)) {
    if (re.test(caption)) return name;
  }
  return null;
}

function extractDelayHours(caption) {
  const m =
    caption.match(/(\d+)\s*h(?:eures?)?\s*(?:de\s+)?retard/i) ||
    caption.match(/retard\s+(?:de\s+)?(\d+)\s*h/i) ||
    caption.match(/(\d+)\s+hours?\s+(?:delay|late)/i);
  return m ? parseInt(m[1], 10) : null;
}

function extractPhones(caption) {
  const found = new Set();
  for (const m of String(caption || '').matchAll(/(?:wa\.me\/|phone=)(\+?\d[\d]{7,15})/gi)) {
    found.add(m[1].startsWith('+') ? m[1] : '+' + m[1]);
  }
  for (const m of String(caption || '').matchAll(/\+\d[\d\s().\-]{7,16}\d/g)) {
    const p = m[0].replace(/[\s().\-]/g, '');
    if (p.length >= 9) found.add(p);
  }
  return [...found];
}

function extractHandles(caption) {
  const out = new Set();
  for (const m of String(caption || '').matchAll(/@([a-z0-9._]{3,30})/gi)) {
    const h = m[1].toLowerCase().replace(/\.+$/, '');
    if (h.length >= 3 && !['airfrance', 'transavia', 'ryanair', 'easyjet'].includes(h)) out.add(h);
  }
  return [...out];
}

/**
 * Calcule le score d'un lead (0–12).
 * ≥ 7 = HOT · 4–6 = WARM · < 4 = COLD
 */
function scoreLead({ airline, delayHours, hasAfrica, caption }) {
  let s = 0;
  if (airline) s += 2;
  if (delayHours && delayHours >= 3) s += 2;
  else if (delayHours && delayHours >= 2) s += 1;
  if (hasAfrica) s += 2;
  if (/(pas remboursé|pas d'indemnisation|rien reçu|refusent|refused|nothing|no compensation)/i.test(caption)) s += 3;
  if (/(j'attends|je réclame|help|aidez|scandale|honte|inadmissible)/i.test(caption)) s += 1;
  return s;
}

/** Média IG → lead passager, ou null si non pertinent. */
function mediaToLead(media, tag) {
  const caption = String(media.caption || '');
  if (!FIRST_PERSON.test(caption)) return null;
  if (!INCIDENT_RE.test(caption)) return null;

  const airline = detectAirline(caption);
  const delayHours = extractDelayHours(caption);
  const hasAfrica = AFRICA_RE.test(caption);
  const score = scoreLead({ airline, delayHours, hasAfrica, caption });

  if (score < 4) return null; // skip COLD leads

  const handles = extractHandles(caption);
  const phones = extractPhones(caption);
  const snippet = caption.replace(/[\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 220);

  let heat = '🟡';
  if (score >= 7) heat = '🟢';

  return {
    permalink: media.permalink || '',
    snippet,
    airline,
    delayHours,
    hasAfrica,
    score,
    heat,
    handle: handles[0] || null,
    phone: phones[0] || null,
    tag,
    timestamp: media.timestamp || null,
    // contactable via permalink (DM manuel) + phone/handle si dispo
    contactable: true,
  };
}

/** Liste de médias → leads dédupliqués (par permalink). */
function mediaListToLeads(mediaList, tag) {
  const seen = new Set();
  const out = [];
  for (const m of mediaList || []) {
    const lead = mediaToLead(m, tag);
    if (!lead) continue;
    const key = lead.permalink || lead.handle || lead.snippet.slice(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(lead);
  }
  return out;
}

module.exports = {
  LEAD_HASHTAGS,
  DEFAULT_TAG_LIMIT,
  detectAirline,
  extractDelayHours,
  extractPhones,
  extractHandles,
  scoreLead,
  mediaToLead,
  mediaListToLeads,
};
