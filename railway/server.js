'use strict';
/**
 * ⚠️  CE FICHIER N'EST PAS L'ENTRYPOINT RAILWAY — NE PAS Y CODER LE BOT.
 *
 * L'entrypoint réel est `../railway-bot.js` (voir Procfile : `web: node railway-bot.js`).
 * Toute logique du bot (messages, variantes, mandat, dossiers…) vit dans railway-bot.js.
 *
 * Historiquement ce fichier était une copie "parallèle" du webhook, ce qui a créé une
 * divergence (des features committées ici n'étaient jamais déployées). Pour éviter que ça
 * se reproduise, ce fichier ne fait plus que déléguer au bot canonique : si jamais un
 * déploiement pointe ici par erreur, c'est bien le vrai bot qui démarre.
 *
 * Ancienne implémentation : voir l'historique git (commit a661548 et antérieurs).
 */
module.exports = require('../railway-bot.js');
