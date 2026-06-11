/**
 * build-mandat-articles.js — extrait le TEXTE INTÉGRAL des articles du mandat
 * depuis la page signée (autorisation.html, source de vérité) vers un JSON que
 * le générateur PDF (netlify/functions/lib/mandat-pdf.js) rend tel quel.
 *
 *   node scripts/build-mandat-articles.js
 *
 * À relancer si le texte du mandat (autorisation.html) change. Garantit que la
 * copie PDF reçue par le client = exactement ce qu'il a signé.
 */
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const SRC = path.join(__dirname, '..', 'autorisation.html');
const OUT = path.join(__dirname, '..', 'netlify', 'functions', 'lib', 'mandat-articles-fr.json');

const html = fs.readFileSync(SRC, 'utf8');
const $ = cheerio.load(html);

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const fragText = (frag) => norm($('<div>' + frag + '</div>').text());

const items = [];
// .clause = un article ; table.fee-table = le barème (Art. 4). Sélecteur combiné = ordre du document.
$('.clause, table.fee-table').each((_, el) => {
  const $el = $(el);
  if (el.tagName === 'table') {
    const rows = [];
    $el.find('tr').each((__, tr) => {
      rows.push($(tr).find('th,td').map((___, c) => norm($(c).text())).get());
    });
    if (rows.length) items.push({ type: 'table', rows });
    return;
  }
  const title = norm($el.find('.cnum').first().text());
  if (!title) return;
  const plain = $el.find('.plain').map((__, p) => norm($(p).text()).replace(/^💡\s*/, '')).get();
  // corps = clause sans le titre ni les "en clair" ; alinéas séparés par <br>
  const $clone = $el.clone();
  $clone.find('.cnum, .plain').remove();
  const body = ($clone.html() || '')
    .split(/(?:<br\s*\/?>\s*)+/i)
    .map(fragText)
    .filter(Boolean);
  items.push({ type: 'article', title, plain, body });
});

fs.writeFileSync(OUT, JSON.stringify({ source: 'autorisation.html', generatedFrom: 'build-mandat-articles.js', items }, null, 2), 'utf8');

const arts = items.filter((i) => i.type === 'article');
console.log(`✅ ${arts.length} articles + ${items.filter(i => i.type === 'table').length} tableau(x) → ${path.relative(process.cwd(), OUT)}`);
console.log('Titres extraits :');
arts.forEach((a) => console.log('  - ' + a.title + '  (' + a.body.length + ' alinéa(s))'));
