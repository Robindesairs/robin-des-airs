/**
 * Suppression d'UNE pièce d'un dossier — action destructive, donc DOUBLE AUTHENTIFICATION.
 *
 *   POST { ref, key, totp }  → supprime le blob + trace la suppression
 *
 * Garde-fous :
 *  1) Accès CRM valide (checkCrmAccess) — 1er facteur.
 *  2) TOTP frais (Google Authenticator) — 2ᵉ facteur : prouve que la personne a l'appareil EN MAIN
 *     maintenant (protège d'une session CRM laissée ouverte). FAIL-CLOSED : si CRM_TOTP_SECRET n'est
 *     pas configuré, on REFUSE la suppression (jamais de contournement sur une action destructive).
 *  3) Le CONTRAT DE CESSION SIGNÉ (pdf/… , signed/…) est INSUPPRIMABLE : c'est la preuve juridique
 *     de la cession, on ne détruit pas une preuve depuis le CRM.
 *  4) Journal d'audit : deleted/<ref> = [{ key, by, ts }] — qui a supprimé quoi, quand.
 *
 * Le statut éventuel de la pièce (status/<ref>) est nettoyé au passage.
 */
const { getBlobStore } = require('./lib/netlify-blobs-store');
const { checkCrmAccess } = require('./lib/crm-access');
const { getCrmAuthConfig, corsHeaders } = require('./lib/auth-config');
const { verifyTotp } = require('./lib/totp');

const J = (code, obj) => ({
  statusCode: code,
  headers: { ...corsHeaders(), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(), body: '' };
  if (event.httpMethod !== 'POST') return J(405, { error: 'POST uniquement' });

  // 1er facteur : accès CRM
  const auth = checkCrmAccess(event);
  if (!auth.ok) return J(401, { error: auth.error || 'Non autorisé' });

  let b; try { b = JSON.parse(event.body || '{}'); } catch { return J(400, { error: 'bad json' }); }
  const ref = String(b.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  const key = String(b.key || '').replace(/[^A-Za-z0-9._/-]/g, '').slice(0, 200);
  if (!ref || !key) return J(400, { error: 'ref + key requis' });
  // Nom de l'agent OBLIGATOIRE : une suppression de pièce doit être imputable à quelqu'un
  // (checkCrmAccess ne renvoie pas d'identité ; le CRM envoie déjà `agent` via getCrmAgent()).
  const agent = String(b.agent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!agent) return J(400, { error: 'Votre nom est requis pour supprimer une pièce (traçabilité).' });

  // 3) Preuve juridique : le contrat signé n'est jamais supprimable depuis le CRM.
  if (key.indexOf('pdf/') === 0 || key.indexOf('signed/') === 0) {
    return J(403, { error: 'Le contrat de cession signé ne peut pas être supprimé : c’est la preuve de la cession.' });
  }
  // Une pièce du dépôt web doit appartenir au dossier (p/<ref>/…). Les pièces bot sont indexées par
  // téléphone (wa/<tel>/…) : pas de contrôle possible ici, le token du listing fait déjà foi.
  if (key.indexOf('p/') === 0 && key.indexOf('p/' + ref + '/') !== 0) {
    return J(403, { error: 'Cette pièce n’appartient pas à ce dossier.' });
  }

  // 2ᵉ facteur : TOTP frais — FAIL-CLOSED si non configuré.
  const cfg = getCrmAuthConfig();
  if (!cfg || !cfg.totpSecret) {
    return J(503, { error: 'Suppression indisponible : la double authentification (TOTP) n’est pas configurée sur ce CRM.' });
  }
  const totp = String(b.totp || '').replace(/\D/g, '');
  if (!totp || !verifyTotp(cfg.totpSecret, totp)) {
    return J(401, { error: 'Code de double authentification invalide ou expiré.' });
  }

  const pieces = getBlobStore(event, 'pieces');
  if (!pieces) return J(500, { error: 'store indisponible' });

  try {
    // Route la suppression vers le bon store selon le préfixe (mêmes règles que crm-pieces).
    let store = pieces;
    if (key.indexOf('claim/') === 0) store = getBlobStore(event, 'robin-claims') || pieces;

    // La pièce existe-t-elle ? (évite de tracer une suppression fantôme)
    const meta = await store.getMetadata(key).catch(() => null);
    if (!meta) return J(404, { error: 'Pièce introuvable (déjà supprimée ?).' });

    await store.delete(key);

    // 4) Journal d'audit : qui a supprimé quoi, quand.
    try {
      const dkey = 'deleted/' + ref;
      const log = (await pieces.get(dkey, { type: 'json' })) || [];
      log.push({ key, by: agent, ts: new Date().toISOString() });
      await pieces.setJSON(dkey, log);
    } catch (_) { /* la trace ne doit jamais bloquer la suppression déjà faite */ }

    // Nettoyage du statut éventuel de cette pièce.
    try {
      const skey = 'status/' + ref;
      const map = (await pieces.get(skey, { type: 'json' })) || {};
      if (map[key]) { delete map[key]; await pieces.setJSON(skey, map); }
    } catch (_) {}

    return J(200, { ok: true, key });
  } catch (e) {
    return J(500, { error: e.message });
  }
};
