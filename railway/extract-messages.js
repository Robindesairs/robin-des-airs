#!/usr/bin/env node
/* Extraction de TOUS les messages utilisateur du bot WhatsApp Robin des Airs.
 * Sortie : messages-bot.md (organisé par source).
 * Approche ciblée : tables de variantes + arguments des fonctions d'envoi. */
const fs = require('fs');
const path = require('path');

const out = [];
const w = (s = '') => out.push(s);
const src = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
const lineOf = pos => src.slice(0, pos).split('\n').length;

// ─── Lecteur de template literal à partir d'une position sur un backtick ──────
function readTemplate(code, i) {
  if (code[i] !== '`') return null;
  const start = i; i++;
  let depth = 0, buf = '';
  while (i < code.length) {
    const c = code[i];
    if (c === '\\') { buf += c + code[i + 1]; i += 2; continue; }
    if (c === '`' && depth === 0) { i++; break; }
    if (c === '$' && code[i + 1] === '{') { depth++; buf += '${'; i += 2; continue; }
    if (c === '}' && depth > 0) { depth--; buf += '}'; i++; continue; }
    buf += c; i++;
  }
  return { text: buf, end: i, pos: start };
}
// saute espaces/commentaires
function skipWs(code, i) {
  while (i < code.length) {
    if (/\s/.test(code[i])) { i++; continue; }
    if (code[i] === '/' && code[i + 1] === '/') { while (i < code.length && code[i] !== '\n') i++; continue; }
    if (code[i] === '/' && code[i + 1] === '*') { i += 2; while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++; i += 2; continue; }
    break;
  }
  return i;
}

// ─── 1. Tables de variantes structurées ──────────────────────────────────────
function dumpTable(title, obj, note = '') {
  w(`\n## ${title}`);
  if (note) w(`_${note}_\n`);
  for (const [key, val] of Object.entries(obj)) {
    const arr = Array.isArray(val) ? val : [val];
    w(`\n### \`${key}\` — ${arr.length} variante${arr.length > 1 ? 's' : ''}`);
    arr.forEach((v, i) => {
      if (typeof v !== 'string') return;
      w(`\n**${i + 1}.** ` + v.replace(/\n/g, '\n> ').replace(/^/, '\n> '));
    });
  }
}
try {
  const { VARIANTS } = require('./lib/bot-variants');
  dumpTable('1 · Variantes de ton (lib/bot-variants.js)', VARIANTS,
    'Choix déterministe par utilisateur via pickVariant(phone, KEY). Anglais = souvent texte fixe séparé.');
} catch (e) { w('\n> ⚠️ bot-variants: ' + e.message); }
try {
  const { RV } = require('./lib/relance-variants');
  dumpTable('2 · Relances & messages documents (lib/relance-variants.js)', RV,
    'Placeholders : {REF} {TOTAL} {URL} {NOMS} {NOM} {PB} {VOL}.');
} catch (e) { w('\n> ⚠️ relance-variants: ' + e.message); }

// ─── 2. Arguments des fonctions d'envoi dans server.js ────────────────────────
// On repère chaque appel L(s, `EN`, `FR`) et LV(...,'KEY', `EN`) et
// send/sendDelayed(phone, `...`) et extrait les templates argument.
const found = []; // {pos, fr, en, kind}

function pushMsg(pos, fr, en, kind) {
  if (!fr && !en) return;
  found.push({ pos, fr: fr || '', en: en || '', kind });
}

// L(s, `EN`, `FR`)
const reL = /\bL\(\s*\w+\s*,/g;
let m;
while ((m = reL.exec(src))) {
  let i = skipWs(src, m.index + m[0].length);
  const t1 = readTemplate(src, i);
  if (!t1) continue;
  i = skipWs(src, t1.end);
  if (src[i] !== ',') continue;
  i = skipWs(src, i + 1);
  const t2 = readTemplate(src, i);
  if (!t2) continue; // 2e arg peut être pickVariant(...) → ignore ici (couvert par tables)
  pushMsg(m.index, t2.text, t1.text, 'L');
}

// send(phone, `...`) et sendDelayed(phone, `...`, ...) — template direct (non-L)
const reSend = /\b(send|sendDelayed)\(\s*\w+\s*,/g;
while ((m = reSend.exec(src))) {
  let i = skipWs(src, m.index + m[0].length);
  const t = readTemplate(src, i);
  if (!t) continue; // souvent send(phone, L(...)) → déjà couvert
  pushMsg(m.index, t.text, '', 'send');
}

// sendButtons/sendList body: L(...) déjà couvert ; on capte les body:`...` directs
const reBody = /\bbody:\s*`/g;
while ((m = reBody.exec(src))) {
  const t = readTemplate(src, m.index + m[0].length - 1);
  if (!t) continue;
  pushMsg(m.index, t.text, '', 'body');
}

// tri par position, dédup
found.sort((a, b) => a.pos - b.pos);
const seen = new Set();
w(`\n## 3 · Messages inline du flux (server.js)`);
w(`_Extraits des appels \`L(s,en,fr)\`, \`send()\`, \`body:\`. FR d'abord, 🇬🇧 EN si présent._\n`);
let count = 0;
for (const f of found) {
  const key = (f.fr || f.en).trim();
  if (key.length < 6) continue;
  if (seen.has(key)) continue;
  seen.add(key);
  count++;
  w(`\n**L${lineOf(f.pos)}** \`${f.kind}\``);
  if (f.fr) w('> ' + f.fr.trim().replace(/\n/g, '\n> '));
  if (f.en) { w('>'); w('> 🇬🇧 ' + f.en.trim().replace(/\n/g, '\n> ')); }
}
w(`\n\n_Total inline unique : ${count}_`);

fs.writeFileSync(path.join(__dirname, 'messages-bot.md'), out.join('\n'));
console.log(`OK → messages-bot.md (${count} messages inline uniques, ${out.length} lignes)`);
