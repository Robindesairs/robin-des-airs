/**
 * Politique quota AeroDataBox — un seul consommateur actif par défaut :
 * GET /.netlify/functions/radar (scan manuel CRM / radar-vols-v2).
 *
 * Netlify (recommandé après upgrade Ultra) :
 *   RADAR_BACKGROUND_API=0     — crons + bandeau live + snapshot auto (défaut si non défini : off)
 *   RADAR_VEILLE_ENABLED=0     — veille serveur (défaut off)
 *   RADAR_VOL_TICKER_LIVE=0    — bandeau accueil : cache Blobs uniquement (défaut off)
 */

function envTruthy(name) {
  const v = String(process.env[name] || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

/** Crons, monitor, snapshot background, refresh bandeau. */
function isRadarBackgroundApiEnabled() {
  if (envTruthy('RADAR_BACKGROUND_API')) return true;
  const off = String(process.env.RADAR_BACKGROUND_API || '').trim().toLowerCase();
  if (off === '0' || off === 'false' || off === 'off' || off === 'no') return false;
  return false;
}

/** Veille serveur (radar-veille-cron). */
function isRadarVeilleEnabled() {
  return envTruthy('RADAR_VEILLE_ENABLED');
}

/** Scan live bandeau accueil (/api/vol-ticker). */
function isVolTickerLiveScanEnabled() {
  return envTruthy('RADAR_VOL_TICKER_LIVE');
}

module.exports = {
  isRadarBackgroundApiEnabled,
  isRadarVeilleEnabled,
  isVolTickerLiveScanEnabled,
};
