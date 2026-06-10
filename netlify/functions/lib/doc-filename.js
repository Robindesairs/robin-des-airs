/**
 * Nom de fichier « côté compagnie » pour les pièces envoyées au transporteur
 * (mandat signé + mise en demeure CE 261/2004).
 *
 * Format décidé par panel de 5 sous-agents (gestionnaire compagnie, juridique,
 * RGPD, marque, robustesse) :
 *     <Type>-<NOM>-<Prénom>-<VOL>-<CODE>.pdf
 *   ex.  Mandat-NDIAYE-Awa-AF1234-A3F2.pdf
 *        MiseEnDemeure-NDIAYE-Awa-AF1234-A3F2.pdf
 *
 * Raisons :
 * - NOM + n° de vol → la compagnie rattache la pièce au bon dossier d'un coup d'œil.
 * - prénom + CODE (4 derniers caractères de la réf interne RDA-…) = DOUBLE garantie
 *   d'unicité, indispensable au cas « famille au même nom de famille sur le même vol »
 *   (Diallo, Ndiaye, Ba…), où NOM + vol ne suffit pas (et où le PNR, partagé par la
 *   réservation, ne distingue pas les co-passagers).
 * - PAS de PNR (partagé + donnée sensible), PAS de date (bruit), PAS de préfixe marque
 *   (l'e-mail dit déjà qui écrit).
 * - même squelette pour les 2 pièces → la compagnie les apparie sans les ouvrir.
 *
 * Sécurité de nom : accents translittérés, caractères non alphanumériques retirés.
 */

const PREFIXES = { mandat: 'Mandat', med: 'MiseEnDemeure' };

function toAscii(s) {
  return String(s == null ? '' : s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les diacritiques (é→e, ï→i, ç→c…)
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim();
}

/** NOM, VOL → MAJUSCULES collées (« N'Diaye » → « NDIAYE », « af 718 » → « AF718 »). */
function upperSeg(s) {
  return toAscii(s).replace(/\s+/g, '').toUpperCase();
}

/** Prénom → Capitale par mot, collé (« awa fatou » → « AwaFatou »). */
function capSeg(s) {
  return toAscii(s)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

/** 4 derniers caractères alphanumériques de la réf interne RDA-… (suffixe anti-collision). */
function codeFromRef(ref, n = 4) {
  return String(ref == null ? '' : ref).replace(/[^A-Za-z0-9]/g, '').slice(-n).toUpperCase();
}

/**
 * Construit le nom de fichier d'une pièce destinée à la compagnie.
 * @param {object} d     { nom, prenom, vol, ref } (champs de recordFromAirtableFields)
 * @param {string} type  'mandat' | 'med'
 * @returns {string}     nom de fichier .pdf — caractères sûrs, unique par passager
 */
function nomFichierCompagnie(d = {}, type = 'mandat') {
  const segs = [
    PREFIXES[type] || PREFIXES.mandat,
    upperSeg(d.nom),
    capSeg(d.prenom),
    upperSeg(d.vol),
    codeFromRef(d.ref),
  ].filter(Boolean);
  return `${segs.join('-')}.pdf`;
}

module.exports = { nomFichierCompagnie, codeFromRef };
