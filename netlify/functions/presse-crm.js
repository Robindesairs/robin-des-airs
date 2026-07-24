/**
 * presse-crm — Suivi des tribunes envoyées à la presse et pilotage des relances.
 *
 * Le catalogue des médias vit dans ./data/presse-medias.json, versionné mais SERVI PAR CETTE
 * FONCTION et non en statique : c'est une liste de prospection, et tout fichier déposé dans le
 * dossier publié serait lisible par n'importe qui (cf. la denylist `/netlify/*` de _redirects).
 * Le store Blobs `presse-suivi` ne garde QUE l'état de chaque dossier (statut, dates, notes),
 * une entrée par média (clé = id du média).
 *
 * GET    /api/presse-crm            → { medias: [...], items: [...] }  catalogue + état
 * POST   /api/presse-crm            → enregistre un média : { id, statut, ... }
 * DELETE /api/presse-crm?id=m001    → remet un média à zéro
 *
 * Accès réservé au CRM (cookie rda_crm), comme les autres outils internes.
 *
 * Statuts : a_envoyer · envoye · relance1 · relance2 · reponse · accepte · publie · refus · sans_suite
 *
 * Cadence de relance (cf. medias-tribunes-afrique-cibles) : le silence est la réponse par
 * défaut de ces rédactions, une relance polie double en pratique le taux de réponse.
 *   envoye   → relance 1 à J+10
 *   relance1 → relance 2 à J+21
 *   relance2 → classé sans_suite, on n'insiste pas au-delà de deux relances.
 */

const { getStore, connectLambda } = require('@netlify/blobs');
const { checkCrmAccess } = require('./lib/crm-access');

/**
 * Deux jeux de prospection partagent exactement le même moteur (catalogue versionné servi par la
 * fonction + état par entrée dans un store Blobs) : la presse et les associations de la diaspora.
 * Le paramètre ?dataset=presse|assos choisit lequel. Chaque jeu a son préfixe d'id (m### / a###)
 * pour que jamais une écriture presse ne tombe dans le store assos et inversement.
 */
const DATASETS = {
  presse: { medias: require('./data/presse-medias.json'), store: 'presse-suivi', prefixe: 'm' },
  assos:  { medias: require('./data/assos-medias.json'),  store: 'assos-suivi',  prefixe: 'a' },
};
const choisirDataset = (event) => DATASETS[event.queryStringParameters?.dataset] || DATASETS.presse;

// 'a_relever' = association dont l'e-mail reste à trouver (propre au jeu assos, inoffensif pour la presse).
const STATUTS = ['a_relever', 'a_envoyer', 'envoye', 'relance1', 'relance2', 'reponse', 'accepte', 'publie', 'refus', 'sans_suite'];

/** Délais de relance, en jours, depuis la date du dernier contact. */
const DELAI_RELANCE = { envoye: 10, relance1: 11 };

const json = (statusCode, data) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: JSON.stringify(data),
});

/** Date ISO courte du jour, en UTC (les dates de relance n'ont pas besoin de fuseau). */
const aujourdhui = () => new Date().toISOString().slice(0, 10);

/** Ajoute n jours à une date ISO courte. Renvoie '' si l'entrée est vide ou invalide. */
function plusJours(iso, n) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Date de la prochaine relance due, ou '' si aucune n'est attendue.
 * Une réponse reçue (quelle qu'elle soit) arrête définitivement les relances.
 */
function prochaineRelance(item) {
  const delai = DELAI_RELANCE[item.statut];
  if (!delai) return '';
  return plusJours(item.date_contact, delai);
}

exports.handler = async (event) => {
  const access = checkCrmAccess(event);
  if (!access.ok) return json(access.configured === false ? 500 : 401, { error: access.error || 'Non autorisé' });

  // Blobs v7+ : hors runtime auto-configuré, getStore() échoue sans connectLambda(event).
  // Son absence renvoyait un 500 sur le GET → le front rebasculait sur le login (faux « bug de connexion »).
  try { if (connectLambda) connectLambda(event); } catch (_) {}
  const ds = choisirDataset(event);
  const store = getStore(ds.store);
  const idRegex = new RegExp(`^${ds.prefixe}\\d{3}$`);

  try {
    if (event.httpMethod === 'GET') {
      const list = await store.list();
      const items = [];
      for (const b of list.blobs || []) {
        const it = await store.get(b.key, { type: 'json' }).catch(() => null);
        if (it) items.push({ ...it, relance_due: prochaineRelance(it) });
      }
      return json(200, { medias: ds.medias, items, today: aujourdhui() });
    }

    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return json(400, { error: 'JSON invalide' });
      }

      const id = String(body.id || '').trim();
      if (!idRegex.test(id)) return json(400, { error: 'id invalide' });

      const statut = String(body.statut || '').trim();
      if (!STATUTS.includes(statut)) return json(400, { error: `statut inconnu : ${statut}` });

      const ancien = (await store.get(id, { type: 'json' }).catch(() => null)) || {};

      // La date de contact ne bouge qu'aux étapes où l'on écrit réellement.
      const ecritureSortante = ['envoye', 'relance1', 'relance2'].includes(statut);
      const item = {
        id,
        nom: String(body.nom || ancien.nom || '').slice(0, 120),
        statut,
        date_contact: ecritureSortante ? aujourdhui() : (ancien.date_contact || ''),
        date_reponse: ['reponse', 'accepte', 'publie', 'refus'].includes(statut)
          ? (ancien.date_reponse || aujourdhui())
          : '',
        url_publication: String(body.url_publication || ancien.url_publication || '').slice(0, 500),
        lien_dofollow: typeof body.lien_dofollow === 'boolean' ? body.lien_dofollow : (ancien.lien_dofollow ?? null),
        notes: String(body.notes ?? ancien.notes ?? '').slice(0, 2000),
        maj: new Date().toISOString(),
      };

      await store.setJSON(id, item);
      return json(200, { ok: true, item: { ...item, relance_due: prochaineRelance(item) } });
    }

    if (event.httpMethod === 'DELETE') {
      const id = String(event.queryStringParameters?.id || '').trim();
      if (!idRegex.test(id)) return json(400, { error: 'id invalide' });
      await store.delete(id);
      return json(200, { ok: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    console.error('[presse-crm]', e);
    return json(500, { error: 'Erreur serveur' });
  }
};
