#!/usr/bin/env node
/**
 * build-en-home.js — Génère index-en.html : la VRAIE page d'accueil anglaise.
 *
 * Pourquoi : aujourd'hui /en sert index.html (français) et i18n.js réécrit la page
 * en anglais côté navigateur. Conséquence : le HTML brut reste français → SEO et
 * surtout les aperçus de lien (WhatsApp, pubs Meta : og:title / og:description)
 * s'affichent en français. Pour les campagnes diaspora anglophone (Gambie, Nigeria,
 * Ghana, Kenya), il faut une page dont l'anglais est FIGÉ dans le HTML.
 *
 * Stratégie « hybride » :
 *   - On fige en dur (pour le SEO, les aperçus et le sans-JS) : <html lang="en">,
 *     le <head> (title, description, og:*, twitter:*, canonical → /en) et tout le
 *     texte porté par [data-i18n] / [data-i18n-html].
 *   - On laisse i18n.js faire le reste au runtime (simulateur, bandeau vols, devises) :
 *     comme la page est servie sur /en (et déclare lang="en"), i18n.js bascule en EN
 *     tout seul. Les deux sont idempotents.
 *
 * Source de vérité = index.html + le dictionnaire EN de i18n.js.
 * REJOUABLE : relancer après toute modif de index.html ou i18n.js.
 * Ne JAMAIS éditer index-en.html à la main.
 *
 *   Usage :  node scripts/build-en-home.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const OUT = path.join(ROOT, 'index-en.html');
const I18N_FILE = path.join(ROOT, 'i18n.js');

const CANONICAL_EN = 'https://robindesairs.eu/en';

/* og:title / og:description / twitter:* n'ont pas de clé dédiée dans i18n.js :
 * traductions fidèles des valeurs FR de index.html (mêmes chiffres, même ton que le dico EN). */
const SOCIAL_EN = {
  'og:title':            "Flight to Africa delayed or cancelled? Up to €600 — Robin des Airs",
  'og:description':      "Paris-Dakar, Paris-Abidjan delayed or cancelled? Get up to €600 per passenger (EU 261). €0 if we don't win. WhatsApp reply in 2 min.",
  'twitter:title':       "Robin des Airs — EU 261 compensation, Europe–Africa",
  'twitter:description': "Air justice for Africa. Up to €600 per passenger, 25% only after success.",
};

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img',
  'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

/* ─────────────────────────────────────────────────────────────────────────
 * 1) Charger le dictionnaire EN en exécutant i18n.js dans un bac à sable
 *    (stubs navigateur). location.pathname = /en → currentLang = 'en' au chargement,
 *    donc I18N.get(clé) renvoie directement l'anglais.
 * ──────────────────────────────────────────────────────────────────────── */
function loadI18n() {
  const code = fs.readFileSync(I18N_FILE, 'utf8');
  const noop = function () {};
  const el = { setAttribute: noop, getAttribute: () => null, appendChild: noop, classList: { toggle: noop, add: noop, remove: noop } };
  const sandbox = {
    console,
    URLSearchParams,
    CustomEvent: function () {},
    localStorage: { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = String(v); } },
    location: { pathname: '/en', search: '', hash: '', href: 'https://robindesairs.eu/en' },
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: noop,
    document: {
      documentElement: { lang: 'en', getAttribute: () => 'en', setAttribute: noop },
      body: null,
      title: '',
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      addEventListener: noop,
      dispatchEvent: noop,
      createElement: () => Object.assign({}, el),
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'i18n.js' });

  const I18N = sandbox.window.I18N;
  if (!I18N || typeof I18N.get !== 'function') {
    throw new Error('i18n.js : window.I18N.get introuvable après chargement.');
  }
  if (typeof I18N.getLang === 'function' && I18N.getLang() !== 'en') {
    if (typeof I18N.setLang === 'function') I18N.setLang('en');
  }
  return I18N;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────────── */
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Repère la balise fermante de `tag` à partir de `from`, en gérant l'imbrication. */
function findClose(html, tag, from) {
  const re = new RegExp('<(/?)' + tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b[^>]*>', 'gi');
  re.lastIndex = from;
  let depth = 1, m;
  while ((m = re.exec(html)) !== null) {
    if (m[1] === '/') { depth--; if (depth === 0) return m.index; }
    else if (!m[0].endsWith('/>')) { depth++; }
  }
  return -1;
}

/** Remplace le contenu interne de chaque élément portant `attr="clé"` via transform(clé, tag). */
function applyI18nAttr(html, attr, transform) {
  const openRe = new RegExp(
    '<([a-zA-Z][\\w-]*)((?:[^>"\']|"[^"]*"|\'[^\']*\')*?)\\b' + attr + '="([^"]*)"((?:[^>"\']|"[^"]*"|\'[^\']*\')*)>',
    'g');
  let out = '', i = 0, m;
  const stats = { applied: 0, missing: [] };
  while ((m = openRe.exec(html)) !== null) {
    const full = m[0], tag = m[1], key = m[3];
    const openEnd = openRe.lastIndex;
    if (full.endsWith('/>') || VOID.has(tag.toLowerCase())) continue;
    const newInner = transform(key, tag);
    if (newInner === null || newInner === undefined) { stats.missing.push(key); continue; }
    const closeStart = findClose(html, tag, openEnd);
    if (closeStart < 0) { stats.missing.push(key + ' (fermeture introuvable)'); continue; }
    out += html.slice(i, openEnd) + newInner;
    i = closeStart;
    openRe.lastIndex = closeStart;
    stats.applied++;
  }
  out += html.slice(i);
  return { html: out, stats };
}

/** Remplace l'attribut `attrName` de la 1re balise correspondant à `tagRe`. */
function setAttr(html, tagRe, attrName, newVal) {
  return html.replace(tagRe, (tag) => {
    const re = new RegExp('(' + attrName + '=")[^"]*(")');
    if (re.test(tag)) return tag.replace(re, (_m, a, b) => a + newVal + b);
    return tag.replace(/\s*(\/?)>$/, ' ' + attrName + '="' + newVal + '"$1>');
  });
}

/* ─────────────────────────────────────────────────────────────────────────
 * 2) Génération
 * ──────────────────────────────────────────────────────────────────────── */
function build() {
  const I18N = loadI18n();
  const tr = (key) => {
    const v = I18N.get(key);
    return (v == null || v === key) ? null : v; // null = pas de trad → on garde le FR d'origine
  };

  let html = fs.readFileSync(SRC, 'utf8');

  // --- <html lang="fr"> → "en"
  html = html.replace(/(<html\b[^>]*\blang=")fr("[^>]*>)/i, (_m, a, b) => a + 'en' + b);

  // --- Indicateur du sélecteur 🌐 figé en EN (i18n.js le resynchronise aussi au runtime,
  //     ceci évite juste un flash « FR » au premier rendu de la page anglaise).
  html = html.replace(/(id="current-lang-code"[^>]*>)FR(<)/i, (_m, a, b) => a + 'EN' + b);
  html = html.replace(/class="lang-option active" data-lang="fr"/g, 'class="lang-option" data-lang="fr"');
  html = html.replace(/class="lang-option" data-lang="en"/g, 'class="lang-option active" data-lang="en"');

  // --- <title>
  const enTitle = tr('page_title');
  if (enTitle) html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>' + escapeHtml(enTitle) + '</title>');

  // --- meta description
  const enDesc = tr('meta_description');
  if (enDesc) html = setAttr(html, /<meta\b[^>]*\bname="description"[^>]*>/i, 'content', escapeHtml(enDesc));

  // --- canonical + og:url → /en
  html = setAttr(html, /<link\b[^>]*\brel="canonical"[^>]*>/i, 'href', CANONICAL_EN);
  html = setAttr(html, /<meta\b[^>]*\bproperty="og:url"[^>]*>/i, 'content', CANONICAL_EN);

  // --- og:* / twitter:* (aperçus de lien)
  html = setAttr(html, /<meta\b[^>]*\bproperty="og:title"[^>]*>/i,        'content', escapeHtml(SOCIAL_EN['og:title']));
  html = setAttr(html, /<meta\b[^>]*\bproperty="og:description"[^>]*>/i,  'content', escapeHtml(SOCIAL_EN['og:description']));
  html = setAttr(html, /<meta\b[^>]*\bname="twitter:title"[^>]*>/i,       'content', escapeHtml(SOCIAL_EN['twitter:title']));
  html = setAttr(html, /<meta\b[^>]*\bname="twitter:description"[^>]*>/i, 'content', escapeHtml(SOCIAL_EN['twitter:description']));

  // --- Corps : [data-i18n] (texte) puis [data-i18n-html] (HTML)
  //     Mirroir exact de i18n.js apply() :
  //       data-i18n      → textContent (saute INPUT/TEXTAREA), \n littéraux → retours ligne
  //       data-i18n-html → innerHTML, retours ligne → <br>
  const r1 = applyI18nAttr(html, 'data-i18n', (key, tag) => {
    const t = tag.toLowerCase();
    if (t === 'input' || t === 'textarea') return null;
    const v = tr(key);
    if (v == null) return null;
    return escapeHtml(v.replace(/\\n/g, '\n'));
  });
  html = r1.html;

  const r2 = applyI18nAttr(html, 'data-i18n-html', (key) => {
    const v = tr(key);
    if (v == null) return null;
    return v.replace(/\n/g, '<br>');
  });
  html = r2.html;

  // --- WhatsApp : texte pré-rempli FR → EN ---------------------------------
  // Le bot détecte la langue sur le 1er message. En servant un texte ANGLAIS depuis /en, le bot démarre
  // directement en anglais (mots "Hello/my flight/delayed/cancelled/compensation" reconnus côté bot).
  const WA_PREFILL_FR_TO_EN = [
    ['text=Bonjour%20Robin%20!%20Je%20veux%20lancer%20mon%20dossier.',
      'text=' + encodeURIComponent('Hello Robin! I want to start my claim.')],
    ['text=Bonjour%20Robin%20%21%20Mon%20vol%20a%20%C3%A9t%C3%A9%20retard%C3%A9%20ou%20annul%C3%A9%20%E2%80%94%20ai-je%20droit%20%C3%A0%20une%20indemnit%C3%A9%20%28jusqu%27%C3%A0%20600%20%E2%82%AC%29%20%3F%0A%E2%9C%88%EF%B8%8F%20N%C2%B0%20de%20vol%20%3A%0A%F0%9F%93%85%20Date%20%3A',
      'text=' + encodeURIComponent('Hello Robin! My flight was delayed or cancelled — am I entitled to compensation (up to €600)?\n✈️ Flight no.:\n📅 Date:')],
    // Variante COURTE (sans le suffixe « ✈️ N° de vol / 📅 Date ») : nav, hero, funnel.
    // À remplacer APRÈS la variante longue ci-dessus (sinon elle matcherait son préfixe).
    ['text=Bonjour%20Robin%20%21%20Mon%20vol%20a%20%C3%A9t%C3%A9%20retard%C3%A9%20ou%20annul%C3%A9%20%E2%80%94%20ai-je%20droit%20%C3%A0%20une%20indemnit%C3%A9%20%28jusqu%27%C3%A0%20600%20%E2%82%AC%29%20%3F',
      'text=' + encodeURIComponent('Hello Robin! My flight was delayed or cancelled — am I entitled to compensation (up to €600)?')],
  ];
  for (const [fr, en] of WA_PREFILL_FR_TO_EN) html = html.split(fr).join(en);

  // --- Bandeau « fichier généré »
  const banner = '<!-- ⚠️ FICHIER GÉNÉRÉ par scripts/build-en-home.js — NE PAS ÉDITER À LA MAIN.\n'
    + '     Source : index.html + dico EN de i18n.js. Régénérer : node scripts/build-en-home.js -->\n';
  html = html.replace(/^<!DOCTYPE html>\s*\n?/i, '<!DOCTYPE html>\n' + banner);

  fs.writeFileSync(OUT, html, 'utf8');

  // --- Rapport
  console.log('✓ index-en.html généré.');
  console.log('  [data-i18n]      appliqués : ' + r1.stats.applied);
  console.log('  [data-i18n-html] appliqués : ' + r2.stats.applied);
  const miss = [...new Set([...r1.stats.missing, ...r2.stats.missing])];
  if (miss.length) {
    console.log('  ⚠️  clés sans traduction EN (FR conservé) : ' + miss.length);
    miss.forEach((k) => console.log('       · ' + k));
  } else {
    console.log('  ✓ toutes les clés du HTML ont une traduction EN.');
  }
  console.log('\n  NB : og:title/description et twitter:* sont des traductions fidèles (pas de clé i18n dédiée).');
  console.log('  NB : les JSON-LD (FAQPage, LegalService) restent en FR — à traduire dans un second temps si besoin.');
}

build();
