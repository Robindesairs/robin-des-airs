/**
 * Radar Robin des Airs — Vols Afrique ↔ Europe (tous hubs, sans filtre aéroport).
 * Priorité : ANNULÉ → ROUGE (≥2h30) → ORANGE (1h–2h30) → JAUNE (~1h).
 * Variable Netlify : AVIATION_EDGE_KEY
 * Query : sans param = tous les vols Afrique-Europe (multi-hubs)
 */

const EU_COUNTRIES = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO'];
const AFRICA_COUNTRIES = ['DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CG','CD','CI','DJ','EG','GQ','ER','SZ','ET','GA','GM','GH','GN','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW'];
const EU_AIRLINES_IATA = ['AF','SN','TP','IB','SS','TO','DS','AT','U2','FR','VY','EI','LX','OS','KL'];

const AIRPORT_COUNTRY = {
  CDG:'FR', ORY:'FR', MRS:'FR', LYS:'FR', NCE:'FR', BOD:'FR', TLS:'FR', NTE:'FR', LIL:'FR', SXB:'FR',
  BRU:'BE', GVA:'CH', ZRH:'CH', LHR:'GB', LGW:'GB', AMS:'NL', FRA:'DE', MUC:'DE', MAD:'ES', BCN:'ES',
  LIS:'PT', OPO:'PT', FCO:'IT', MXP:'IT', VIE:'AT', CPH:'DK', OSL:'NO', ARN:'SE', HEL:'FI', DUB:'IE',
  ATH:'GR', IST:'TR', DXB:'AE', DOH:'QA', JFK:'US', EWR:'US', MIA:'US',
  DSS:'SN', DKR:'SN', ABJ:'CI', BKO:'ML', NIM:'NE', OUA:'BF', NDJ:'TD', COO:'BJ', LFW:'TG', CKY:'GN',
  BJL:'GM', CMN:'MA', RAK:'MA', ALG:'DZ', TUN:'TN', CAI:'EG', ADD:'ET', NBO:'KE', DAR:'TZ', JNB:'ZA',
  CPT:'ZA', DLA:'CM', NSI:'CM', LBV:'GA', BZV:'CG', FIH:'CD', RUN:'RE', PTP:'GP', FDF:'MQ', MRU:'MU',
  TNR:'MG', MPM:'MZ', ACC:'GH', LOS:'NG', ABV:'NG'
};

/** Hubs pour scanner tous les vols Afrique ↔ Europe (sans filtre aéroport) */
const HUBS = ['CDG', 'ORY', 'BRU', 'MAD', 'LIS', 'AMS', 'FRA', 'MRS', 'LYS', 'DSS', 'ABJ', 'BKO', 'CMN', 'NCE', 'TLS'];

function getCountry(iata) {
  return AIRPORT_COUNTRY[(iata || '').toUpperCase()] || null;
}

function checkEligible(originCountry, destCountry, airlineIata) {
  const o = (originCountry || '').toUpperCase();
  const d = (destCountry || '').toUpperCase();
  const air = (airlineIata || '').toUpperCase();
  if (EU_COUNTRIES.includes(o)) return true;
  if (AFRICA_COUNTRIES.includes(o) && EU_COUNTRIES.includes(d))
    return EU_AIRLINES_IATA.includes(air);
  return false;
}

function getColor(delayMinutes, eligible) {
  if (!eligible) return 'GREY';
  const d = delayMinutes || 0;
  if (d >= 150) return 'RED';
  if (d >= 60) return 'ORANGE';
  if (d >= 30) return 'YELLOW';
  return 'GREEN';
}

function isEurope(country) {
  return country && EU_COUNTRIES.includes(country.toUpperCase());
}
function isAfrica(country) {
  return country && AFRICA_COUNTRIES.includes(country.toUpperCase());
}

/** Extrait HH:mm d'une chaîne ISO (ex. 2024-01-15T10:30:00) ou "HH:mm" */
function toTimeStr(val) {
  if (!val) return '—';
  const s = String(val).trim();
  const iso = s.match(/T(\d{2}):(\d{2})/);
  if (iso) return iso[1] + ':' + iso[2];
  const hhmm = s.match(/(\d{1,2}):(\d{2})/);
  if (hhmm) return hhmm[1].padStart(2, '0') + ':' + hhmm[2];
  return '—';
}

/** Heure en Zulu (UTC) : "HH:mmZ" exactement à la minute (09:33 → 09:33Z, jamais arrondi à 09:35). */
function toTimeStrZulu(val) {
  if (!val) return '—';
  const s = String(val).trim();
  const tMatch = s.match(/[T\s](\d{1,2}):(\d{2})(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/);
  if (tMatch) return String(parseInt(tMatch[1], 10)).padStart(2, '0') + ':' + tMatch[2] + 'Z';
  const anyHhMm = s.match(/(\d{1,2}):(\d{2})/);
  if (anyHhMm) return String(parseInt(anyHhMm[1], 10)).padStart(2, '0') + ':' + anyHhMm[2] + 'Z';
  let s2 = s;
  if (!/Z$|[+-]\d{2}:?\d{2}$/.test(s2) && /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(s2)) s2 = s2.replace(/\.\d+$/, '') + 'Z';
  const d = new Date(s2);
  if (isNaN(d.getTime())) return '—';
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + 'Z';
}

/** Calcule le retard en minutes = différence (heure effective − heure prévue). Retourne null si impossible. */
function delayMinutesFromTimes(scheduledTime, actualOrEstimatedTime) {
  if (!scheduledTime || !actualOrEstimatedTime) return null;
  const s = new Date(scheduledTime).getTime();
  const a = new Date(actualOrEstimatedTime).getTime();
  if (isNaN(s) || isNaN(a)) return null;
  const diffMs = a - s;
  const diffMin = Math.round(diffMs / 60000);
  return diffMin > 0 ? diffMin : 0;
}

/** Statut vol API → libellé français. Distinction claire : Taxi = au sol ; En vol = en l'air (décollé ou en route). */
function statusToFr(statusRaw) {
  const s = (statusRaw || '').toLowerCase();
  if (s === 'cancelled' || s === 'canceled' || s === 'annulé') return 'Annulé';
  if (s === 'landed' || s === 'arrived') return 'Atterri';
  if (s === 'active' || s === 'in flight' || s === 'en vol' || s === 'departed' || s === 'departure') return 'En vol';
  if (s === 'boarding') return 'Embarquement';
  if (s === 'taxi' || s === 'taxiing') return 'Taxi';
  if (s === 'delayed') return 'Retardé';
  if (s === 'scheduled' || s === 'ontime') return 'Prévu';
  if (s === 'diverted' || s === 'redirected') return 'Dérouté';
  if (s === 'incident') return 'Incident';
  if (s && s !== '—') return s.charAt(0).toUpperCase() + s.slice(1);
  return 'Au sol';
}

/** Traqueur vol compagnie : URL avec numéro de vol si possible. */
const AIRLINE_TRACKER = {
  AF: 'https://www.airfrance.fr/flightstatus/search',
  KL: 'https://www.klm.com/flightstatus',
  SN: 'https://www.brusselsairlines.com/en/flight-status',
  LH: 'https://www.lufthansa.com/flight-status',
  IB: 'https://www.iberia.com/flight-status',
  TP: 'https://www.flytap.com/flight-status',
  FR: 'https://www.ryanair.com/flight-status',
  U2: 'https://www.easyjet.com/en/flight-tracker',
  VY: 'https://www.vueling.com/en/flight-status',
  EI: 'https://www.aerlingus.com/flight-status',
  LX: 'https://www.swiss.com/flight-status',
  OS: 'https://www.austrian.com/flight-status',
  DS: 'https://www.easyjet.com/en/flight-tracker'
};
function getTrackerUrl(airlineIata, flightNumber) {
  const base = AIRLINE_TRACKER[(airlineIata || '').toUpperCase()];
  if (!base) return null;
  const fn = (flightNumber || '').replace(/\s/g, '');
  if (base.includes('airfrance')) return base + '?flightNumber=' + encodeURIComponent(fn);
  if (base.includes('klm.com')) return base + '?searchKey=' + encodeURIComponent(fn);
  return base + (base.includes('?') ? '&' : '?') + 'flight=' + encodeURIComponent(fn);
}

exports.handler = async (event) => {
  const apiKey = process.env.AVIATION_EDGE_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Configuration radar manquante' })
    };
  }

  try {
    const allRaw = [];
    const arrivalRaw = [];
    for (const hub of HUBS) {
      const depUrl = `https://aviation-edge.com/v2/public/timetable?key=${apiKey}&iataCode=${hub}&type=departure`;
      const arrUrl = `https://aviation-edge.com/v2/public/timetable?key=${apiKey}&iataCode=${hub}&type=arrival`;
      const [depRes, arrRes] = await Promise.all([fetch(depUrl), fetch(arrUrl)]);
      const depData = await depRes.json();
      const arrData = await arrRes.json();
      if (Array.isArray(depData)) allRaw.push(...depData);
      if (Array.isArray(arrData)) arrivalRaw.push(...arrData);
    }

    /** Map arrivées : (flightNumber|dep|arr) -> meilleure heure d'arrivée estimée/réelle (pour mise à jour L'heure d'arrivée estimée). */
    const arrivalMap = new Map();
    for (const f of arrivalRaw) {
      const dep = f.departure || {};
      const arr = f.arrival || {};
      const depIata = (dep.iataCode || '').toUpperCase();
      const arrIata = (arr.iataCode || '').toUpperCase();
      const flightNumber = f.flight?.iata || f.flight?.number || f.flight?.icao || '';
      const key = flightNumber + '|' + depIata + '|' + arrIata;
      const est = arr.actualTime || arr.estimatedTime || arr.estTime || arr.revisedTime;
      if (est) arrivalMap.set(key, est);
    }

    /** Code-share : une seule ligne par vol physique = celle opérée par la compagnie (numéro de vol = préfixe compagnie). */
    const routeMap = new Map(); // routeKey -> { data, isOperating }
    for (const f of allRaw) {
      const dep = f.departure || {};
      const arr = f.arrival || {};
      const depIata = (dep.iataCode || '').toUpperCase();
      const arrIata = (arr.iataCode || '').toUpperCase();
      const depCountry = getCountry(depIata);
      const arrCountry = getCountry(arrIata);
      const isAfricaEurope = (isEurope(depCountry) && isAfrica(arrCountry)) || (isAfrica(depCountry) && isEurope(arrCountry));
      if (!isAfricaEurope) continue;

      const airlineIata = (f.airline?.iataCode || (f.flight?.iata && f.flight.iata.slice(0, 2)) || '').toUpperCase();
      const flightNumber = f.flight?.iata || f.flight?.number || f.flight?.icao || '—';
      const flightPrefix = (String(flightNumber).replace(/\s/g, '').match(/^[A-Za-z]{2}/) || [])[0]?.toUpperCase() || '';
      const isOperatingRow = flightPrefix === airlineIata;
      const routeKey = depIata + arrIata + (dep.scheduledTime || '');

      const effectiveTime = dep.actualTime || dep.estimatedTime;
      let delayMinutes = delayMinutesFromTimes(dep.scheduledTime, effectiveTime);
      if (delayMinutes == null) {
        delayMinutes = 0;
        if (typeof arr.delay === 'number') delayMinutes = arr.delay;
        else if (typeof dep.delay === 'number') delayMinutes = dep.delay;
      }

      const statusRaw = (f.status || '').toLowerCase();
      const cancelled = statusRaw === 'cancelled' || statusRaw === 'canceled' || statusRaw === 'annulé';
      const hasActualDep = !!(dep.actualTime);
      const flightStatus = cancelled ? 'cancelled' : (hasActualDep ? 'departed' : 'scheduled');
      const statusFr = cancelled ? 'Annulé' : (statusRaw === 'landed' || statusRaw === 'arrived' ? 'Atterri' : (hasActualDep ? 'En vol' : statusToFr(f.status)));
      const landedAtZulu = (statusRaw === 'landed' || statusRaw === 'arrived') && (arr.actualTime || arr.estimatedTime) ? toTimeStrZulu(arr.actualTime || arr.estimatedTime) : null;
      const cancelledAt = cancelled ? (toTimeStrZulu(dep.estimatedTime || dep.actualTime || f.updatedAt || dep.scheduledTime) || null) : null;
      const trackerUrl = getTrackerUrl(airlineIata, flightNumber);

      const eligible = checkEligible(depCountry, arrCountry, airlineIata);
      const color = cancelled ? 'CANCELLED' : getColor(delayMinutes, eligible);

      const scheduledDeparture = toTimeStrZulu(dep.scheduledTime);
      const estimatedDeparture = toTimeStrZulu(dep.actualTime || dep.estimatedTime || dep.scheduledTime);
      const scheduledArrival = toTimeStrZulu(arr.scheduledTime);
      const arrivalEstFromApi = arrivalMap.get(flightNumber + '|' + depIata + '|' + arrIata);
      const estimatedArrival = toTimeStrZulu(arrivalEstFromApi || arr.actualTime || arr.estimatedTime || arr.estTime || arr.revisedTime || arr.scheduledTime);
      const scheduledDate = (dep.scheduledTime && String(dep.scheduledTime).slice(0, 10)) || null;

      const flightObj = {
        flight: flightNumber,
        airline: airlineIata,
        dep: depIata || '—',
        arr: arrIata || '—',
        scheduledDeparture,
        estimatedDeparture,
        scheduledArrival,
        estimatedArrival,
        delayMinutes: cancelled ? null : delayMinutes,
        eligible,
        color,
        cancelled: !!cancelled,
        status: f.status || '—',
        statusFr,
        landedAtZulu,
        flightStatus,
        cancelledAt,
        scheduledDate,
        trackerUrl
      };

      if (!routeMap.has(routeKey)) {
        routeMap.set(routeKey, { data: flightObj, isOperating: isOperatingRow });
      } else {
        const cur = routeMap.get(routeKey);
        if (cur.isOperating) continue;
        if (isOperatingRow) routeMap.set(routeKey, { data: flightObj, isOperating: true });
      }
    }

    const flights = Array.from(routeMap.values()).map((v) => v.data);

    // Lier les vols retour aux vols aller annulés : marquer en SURVEILLANCE RETOUR
    for (const fl of flights) {
      if (fl.cancelled && fl.dep && fl.arr) {
        const returnFlights = flights.filter(
          (f) => !f.cancelled && f.dep === fl.arr && f.arr === fl.dep
        );
        returnFlights.forEach((r) => {
          r.surveillanceRetour = true;
          r.linkedCancelledFlight = fl.flight;
        });
      }
    }

    const order = { CANCELLED: 0, RED: 1, ORANGE: 2, YELLOW: 3, GREEN: 4, GREY: 5 };
    flights.sort((a, b) => (order[a.color] ?? 6) - (order[b.color] ?? 6) || ((b.delayMinutes || 0) - (a.delayMinutes || 0)));

    const now = new Date();
    const viewDate = now.toISOString().slice(0, 10);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        flights,
        viewDate,
        updatedAt: now.toISOString()
      })
    };
  } catch (err) {
    console.error('radar err:', err);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        flights: [],
        updatedAt: new Date().toISOString(),
        error: err.message || 'Erreur radar'
      })
    };
  }
};
