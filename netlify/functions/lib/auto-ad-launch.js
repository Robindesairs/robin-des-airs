/**
 * auto-ad-launch — déclenche AUTOMATIQUEMENT une pub Meta géolocalisée quand le radar
 * capte un vol éligible en retard/annulé. Réutilise l'endpoint ad-launch existant, qui
 * porte DÉJÀ l'anti-doublon par aéroport + le plafond mensuel de dépense → aucune
 * logique de sécurité dupliquée ici.
 *
 * ⚠️ DÉSACTIVÉ PAR DÉFAUT. Comme cela dépense de l'argent, l'auto-lancement n'agit que
 * si AUTO_AD_LAUNCH=1 est explicitement défini sur Netlify (opt-in). Sans ce flag, la
 * pub reste 100 % manuelle (bouton « Lancer pub » du radar), comportement historique.
 *
 * Variables :
 *   AUTO_AD_LAUNCH=1        active le déclenchement automatique (sinon no-op)
 *   AUTO_AD_MIN_DELAY=180   retard minimal en minutes pour lancer (défaut 180 = 3 h)
 *   AUTO_AD_BUDGET_EUROS    budget € par incident transmis à ad-launch (sinon défaut ad-launch)
 *   ALLOWED_ORIGIN          origine autorisée par ad-launch (défaut robindesairs.eu)
 *
 * Cible = l'aéroport AFRICAIN du vol (départ s'il est africain, sinon arrivée) : c'est là
 * que se trouvent les passagers de la diaspora à toucher.
 */

const { getAirportCoords } = require('./airport-coords');

/** Renvoie le code IATA africain du vol (présent dans le référentiel aéroports), ou null. */
function africanAirport(dep, arr) {
  const d = String(dep || '').toUpperCase();
  const a = String(arr || '').toUpperCase();
  if (d && getAirportCoords(d)) return d;
  if (a && getAirportCoords(a)) return a;
  return null;
}

/**
 * Lance une pub si le flag est actif et le vol qualifie. Idempotent côté Meta grâce à
 * l'anti-doublon d'ad-launch (1 campagne max par aéroport). Ne jette jamais : renvoie un
 * objet de statut pour journalisation.
 * @returns {Promise<{launched?:boolean, skipped?:string, airport?:string, campaignId?:string, detail?:any}>}
 */
async function maybeLaunchAd(flight) {
  if (process.env.AUTO_AD_LAUNCH !== '1') return { skipped: 'disabled' };

  const cancelled = !!flight.cancelled;
  const delay = flight.delayMinutes != null ? Number(flight.delayMinutes) : null;
  const minDelay = parseInt(process.env.AUTO_AD_MIN_DELAY || '180', 10) || 180;
  if (!cancelled && (delay == null || delay < minDelay)) return { skipped: 'below_threshold' };
  if (flight.eligible === false) return { skipped: 'not_eligible' };

  const airport = africanAirport(flight.dep, flight.arr);
  if (!airport) return { skipped: 'no_african_airport' };

  const allowed = process.env.ALLOWED_ORIGIN || 'robindesairs.eu';
  const base = (process.env.URL || process.env.DEPLOY_URL || `https://${allowed}`).replace(/\/$/, '');
  const origin = base.includes(allowed) ? base : `https://${allowed}`;
  const budgetEuros = parseFloat(process.env.AUTO_AD_BUDGET_EUROS || '0') || 0;

  const payload = {
    airport,
    vol: flight.flight || '',
    dep: flight.dep || '',
    arr: flight.arr || '',
    retardMin: cancelled ? 0 : delay,
    statut: cancelled ? 'ANNULE' : 'RETARD',
    ...(budgetEuros > 0 ? { budget: budgetEuros } : {}),
  };

  try {
    const res = await fetch(`${base}/.netlify/functions/ad-launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (json && json.duplicate) return { skipped: 'duplicate', airport };
    if (json && json.ok) return { launched: true, airport, campaignId: json.campaignId };
    return { skipped: json.skipped || 'rejected', airport, detail: json.error || json.message || null };
  } catch (e) {
    return { skipped: 'fetch_error', airport, error: e.message };
  }
}

module.exports = { maybeLaunchAd, africanAirport };
