/**
 * Radar Robin des Airs — Vols Afrique ↔ Europe par aéroport.
 * Priorité affichage : ROUGE (≥ 2h30) → ORANGE (1h à 2h30) → JAUNE (≈ 1h / à surveiller).
 * Variable Netlify : AVIATION_EDGE_KEY
 * Query : airport (ex. CDG), type=departure|arrival
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

// ROUGE ≥ 2h30 (150 min) | ORANGE 1h–2h30 (60–149) | JAUNE ~1h / à surveiller (30–59) | vert < 30 | gris non éligible
function getColor(delayMinutes, eligible) {
  if (!eligible) return 'GREY';
  const d = delayMinutes || 0;
  if (d >= 150) return 'RED';    // ≥ 2h30
  if (d >= 60) return 'ORANGE';   // 1h à 2h30
  if (d >= 30) return 'YELLOW';   // à surveiller (~1h)
  return 'GREEN';
}

exports.handler = async (event) => {
  const apiKey = process.env.AVIATION_EDGE_KEY;
  const airport = (event.queryStringParameters?.airport || 'CDG').trim().toUpperCase();
  let type = (event.queryStringParameters?.type || 'departure').toLowerCase();
  if (type !== 'departure' && type !== 'arrival') type = 'departure';

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Configuration radar manquante' })
    };
  }

  try {
    const url = `https://aviation-edge.com/v2/public/timetable?key=${apiKey}&iataCode=${airport}&type=${type}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!Array.isArray(data)) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ flights: [], airport, type, updatedAt: new Date().toISOString(), error: 'Réponse API invalide' })
      };
    }

    const flights = [];
    for (const f of data) {
      const dep = f.departure || {};
      const arr = f.arrival || {};
      const depIata = (dep.iataCode || '').toUpperCase();
      const arrIata = (arr.iataCode || '').toUpperCase();
      const airlineIata = (f.airline?.iataCode || (f.flight?.iata && f.flight.iata.slice(0, 2)) || '').toUpperCase();
      const flightNumber = f.flight?.iata || f.flight?.number || f.flight?.icao || '—';

      let delayMinutes = 0;
      if (typeof arr.delay === 'number') delayMinutes = arr.delay;
      else if (typeof dep.delay === 'number') delayMinutes = dep.delay;

      const originCountry = type === 'departure' ? getCountry(depIata) : getCountry(arrIata);
      const destCountry = type === 'departure' ? getCountry(arrIata) : getCountry(depIata);
      const eligible = checkEligible(originCountry, destCountry, airlineIata);
      const color = getColor(delayMinutes, eligible);

      flights.push({
        flight: flightNumber,
        airline: airlineIata,
        dep: depIata || '—',
        arr: arrIata || '—',
        delayMinutes,
        eligible,
        color,
        status: f.status || '—'
      });
    }

    // Priorité : ROUGE en haut, puis ORANGE, puis JAUNE, puis VERT, puis GRIS
    const order = { RED: 0, ORANGE: 1, YELLOW: 2, GREEN: 3, GREY: 4 };
    flights.sort((a, b) => (order[a.color] ?? 5) - (order[b.color] ?? 5) || (b.delayMinutes - a.delayMinutes));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        flights,
        airport,
        type,
        updatedAt: new Date().toISOString()
      })
    };
  } catch (err) {
    console.error('radar err:', err);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        flights: [],
        airport,
        type,
        updatedAt: new Date().toISOString(),
        error: err.message || 'Erreur radar'
      })
    };
  }
};
