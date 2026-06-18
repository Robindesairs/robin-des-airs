/**
 * Service worker — ESPACE CLIENT « Mon dossier » (PWA).
 *
 * Volontairement PRUDENT : il ne met en cache que le shell de la page de suivi et ses
 * icônes/polices. Tout le reste du site (et surtout /api/) passe en réseau normal, donc
 * ce SW n'altère pas le comportement des autres pages, même s'il est de portée racine.
 *
 * Le statut du dossier n'est JAMAIS mis en cache ici : la fraîcheur est gérée par la page
 * (fetch + repli localStorage). On ne cache que la coquille pour l'ouverture hors-ligne.
 */

const CACHE = 'rda-suivi-v1';
const SHELL = [
  '/suivi-dossier.html',
  '/manifest.webmanifest',
  '/robin-des-airs-logo-profil-1024.png',
  '/favicon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Ne JAMAIS intercepter l'API ni les fonctions : le statut doit rester frais.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) return;

  // Uniquement la même origine : on ne touche pas aux requêtes cross-origin (polices Google,
  // analytics…) — elles passent en réseau natif, ce qui évite tout conflit avec la CSP du site.
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin) return;
  const isShellNav = req.mode === 'navigate' && url.pathname === '/suivi-dossier.html';
  const isShellAsset = SHELL.indexOf(url.pathname) !== -1;

  // Page de suivi : réseau d'abord (dernière version), repli sur le cache hors-ligne.
  if (isShellNav) {
    event.respondWith(
      fetch(req)
        .then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put('/suivi-dossier.html', copy)); return r; })
        .catch(() => caches.match('/suivi-dossier.html'))
    );
    return;
  }

  // Icônes, manifest : cache d'abord, revalidation en arrière-plan.
  if (isShellAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const net = fetch(req)
          .then((r) => { if (r && (r.ok || r.type === 'opaque')) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; })
          .catch(() => cached);
        return cached || net;
      })
    );
    return;
  }

  // Tout le reste : pas d'interception → comportement réseau natif du site.
});
