#!/usr/bin/env node
'use strict';

const readline = require('readline');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic.default ? new Anthropic.default() : new Anthropic();

// ─── Collecte de l'état du projet ─────────────────────────────────────────────

function getGitLog() {
  try {
    return execSync('git log --oneline -15', { encoding: 'utf8', cwd: path.join(__dirname, '..') }).trim();
  } catch { return 'git log indisponible'; }
}

function getInstagramStatus() {
  try {
    const cal = JSON.parse(fs.readFileSync(path.join(__dirname, '../instagram-content-calendar.json'), 'utf8'));
    const total = cal.posts.length;
    const published = cal.posts.filter(p => p.published).length;
    const today = new Date();
    const overdue = cal.posts.filter(p => !p.published && new Date(p.scheduled_at) <= today);
    return {
      total,
      published,
      pending: total - published,
      overdueCount: overdue.length,
      nextPost: cal.posts.find(p => !p.published),
      imagesExist: false, // images pointent vers robindesairs.eu/instagram-assets/ — jamais uploadées
    };
  } catch { return null; }
}

function getBlogCount() {
  try {
    const blogDir = path.join(__dirname, '../src/content/blog');
    return fs.readdirSync(blogDir).filter(f => f.endsWith('.html') || f.endsWith('.md')).length;
  } catch { return '?'; }
}

function getMarkdownDocs() {
  try {
    const root = path.join(__dirname, '..');
    return fs.readdirSync(root).filter(f => f.endsWith('.md')).join(', ');
  } catch { return ''; }
}

function getServicesState() {
  try {
    const servicesDir = path.join(__dirname, '../src/services');
    return fs.readdirSync(servicesDir).map(f => f.replace('.ts', '')).join(', ');
  } catch { return '?'; }
}

function buildProjectSnapshot() {
  const ig = getInstagramStatus();
  const gitLog = getGitLog();
  const blogCount = getBlogCount();
  const services = getServicesState();
  const docs = getMarkdownDocs();

  return `
=== SNAPSHOT PROJET ROBIN DES AIRS — ${new Date().toLocaleDateString('fr-FR')} ===

GIT (15 derniers commits) :
${gitLog}

INSTAGRAM (@robindesairs) :
- Calendrier : ${ig ? `${ig.published}/${ig.total} publiés, ${ig.pending} en attente, ${ig.overdueCount} en retard` : 'fichier non trouvé'}
- Images slides : NON uploadées (404 sur robindesairs.eu/instagram-assets/)
- Pipeline Make→Meta : scénario inexistant

BLOG :
- ${blogCount} articles HTML dans src/content/blog/

SERVICES ACTIFS :
${services}

DOCS TECHNIQUES :
${docs}

MAKE.COM :
- Plan Free (2 scénarios actifs max)
- 5 scénarios existants, tous inactifs
- Scénarios : WhatsApp automation, B2B prospecting, Gmail→Airtable
- Scénario Instagram : INEXISTANT

STACK :
- Frontend : HTML/CSS/JS statique sur Netlify
- Backend : Node.js + TypeScript (ts-node)
- DB : better-sqlite3 (locale)
- IA : @anthropic-ai/sdk + Amadeus API
- WhatsApp : Wati (webhook)
- CRM : Airtable
- Automatisation : Make.com (Free)
`.trim();
}

// ─── Système de prompt ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es le Chef de Projet stratégique de Robin des Airs, une startup française d'indemnisation de vols perturbés (règlement CE 261/2004).

MISSION DE ROBIN DES AIRS :
Récupérer jusqu'à 600€ par passager pour les vols retardés (+3h), annulés, ou avec correspondance manquée.
Le client envoie sa carte d'embarquement sur WhatsApp → bot analyse → éligibilité → mandat → mise en demeure → paiement.

PLAYBOOK OPÉRATIONNEL :
- J0 : Réception dossier (WhatsApp ou formulaire web)
- J1 : Signature mandat (YouSign) + RIB (SEPA)
- J2-3 : Mise en demeure AR24 à la compagnie
- J+30 : Relance compagnie si silence
- J+60 : Cession créance ou procédure
- J+90-120 : Paiement client (honoraires 30% TTC)

FONDATEUR : Climbie
STACK : Netlify (hosting) + Node/TypeScript + better-sqlite3 + Wati (WhatsApp) + Airtable (CRM) + Make.com (automatisation) + Amadeus API (données vols)
INSTAGRAM : @robindesairs — calendrier éditorial prêt mais pipeline de publication inexistant

TON RÔLE :
1. À chaque session, analyser l'état du projet et donner UNE priorité claire.
2. Répondre aux questions stratégiques, techniques, et opérationnelles.
3. Toujours relier les décisions au business : acquisition client, conversion, paiement.
4. Être direct, concis, francophone. Pas de blabla inutile.
5. Si quelque chose bloque le business, le dire immédiatement.

RÈGLES :
- Ne jamais dire "c'est complexe" sans proposer une solution concrète
- Toujours finir par une action à faire maintenant (< 30 min) et une action à planifier cette semaine
- Si le fondateur est perdu, lui donner UNE SEULE priorité, pas dix`;

// ─── Interface CLI ────────────────────────────────────────────────────────────

const messages = [];

async function sendMessage(userContent) {
  messages.push({ role: 'user', content: userContent });

  process.stdout.write('\n\x1b[36m');

  const stream = await client.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages,
    thinking: { type: 'adaptive' },
  });

  let fullText = '';
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      process.stdout.write(event.delta.text);
      fullText += event.delta.text;
    }
  }

  process.stdout.write('\x1b[0m\n');
  messages.push({ role: 'assistant', content: fullText });
  return fullText;
}

async function main() {
  console.log('\x1b[33m');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     ROBIN DES AIRS — Chef de Projet IA       ║');
  console.log('║     Tapez votre question ou "exit" pour quit ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('\x1b[0m');

  const snapshot = buildProjectSnapshot();
  console.log('\x1b[90m' + snapshot + '\x1b[0m\n');

  console.log('\x1b[33m⏳ Analyse en cours...\x1b[0m');

  await sendMessage(
    `Voici l'état actuel du projet :\n\n${snapshot}\n\nFais-moi un briefing stratégique en 3 parties :\n1. Ce qui bloque le business aujourd'hui\n2. Priorité unique pour cette session (< 2h de travail)\n3. Une action pour cette semaine`
  );

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\n\x1b[32m→ Toi : \x1b[0m',
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }
    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log('\x1b[33mÀ bientôt !\x1b[0m');
      rl.close();
      process.exit(0);
    }

    rl.pause();
    try {
      await sendMessage(input);
    } catch (err) {
      console.error('\x1b[31mErreur API :', err.message, '\x1b[0m');
    }
    rl.resume();
    rl.prompt();
  });

  rl.on('close', () => process.exit(0));
}

main().catch(err => {
  console.error('\x1b[31m', err.message, '\x1b[0m');
  process.exit(1);
});
