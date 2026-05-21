/** Host RapidAPI AeroDataBox — rejette les valeurs sans point (ex. fragment de clé). */
const DEFAULT = 'aerodatabox.p.rapidapi.com';

function aerodataboxHost() {
  const raw = (process.env.AERODATABOX_RAPIDAPI_HOST || '').trim();
  if (!raw || raw.indexOf('.') < 0) {
    if (raw) console.warn('AERODATABOX_RAPIDAPI_HOST invalide, défaut:', DEFAULT);
    return DEFAULT;
  }
  return raw;
}

module.exports = { aerodataboxHost, ADB_DEFAULT_HOST: DEFAULT };
