/**
 * Filtres et helpers créneaux — appels API via radar.fetchRadarSlot.
 */

const {
  fetchRadarSlot,
  filterImpactedEuAfricaFlights,
  sortImpactedForTicker,
  getCountry,
  isEurope,
  isAfrica,
} = require('../radar');

function filterEuAfternoonDepartures(flights) {
  return (flights || []).filter((f) => {
    if (!f || !f.eligible) return false;
    if (!isEurope(getCountry(f.dep))) return false;
    if (!isAfrica(getCountry(f.arr))) return false;
    return f.cancelled || (f.delayMinutes != null && f.delayMinutes >= 60);
  });
}

function filterAfricaEveningDepartures(flights) {
  return (flights || []).filter((f) => {
    if (!f || !f.eligible) return false;
    if (!isAfrica(getCountry(f.dep))) return false;
    if (!isEurope(getCountry(f.arr))) return false;
    return f.cancelled || (f.delayMinutes != null && f.delayMinutes >= 60);
  });
}

function summarizeFlight(f) {
  const delay = f.cancelled ? 'ANNULÉ' : f.delayMinutes != null ? `+${f.delayMinutes} min` : '—';
  return `${f.flight} ${f.dep}→${f.arr} (${f.scheduledDate || '?'}) ${delay}`;
}

module.exports = {
  fetchRadarSlot,
  filterImpactedEuAfricaFlights,
  filterEuAfternoonDepartures,
  filterAfricaEveningDepartures,
  sortImpactedForTicker,
  summarizeFlight,
};
