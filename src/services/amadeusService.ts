/**
 * Service Amadeus — Référence aéroports (Airport & City Search) et vols (Flight Schedules).
 * - Aéroports : coordonnées et timezone des hubs (stockage robin.db).
 * - Vols : verifyOfficialTime = Vérité de Référence (horaires théoriques) pour comparer à Aviation Edge (Vérité de Terrain).
 *   Retard = Vérité de Terrain − Vérité de Référence.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Amadeus = require('amadeus') as new (c: any) => {
  schedule: { flights: { get: (p: any) => Promise<any> } };
  referenceData: { locations: { get: (p: any) => Promise<any> } };
};

const clientId = process.env.AMADEUS_API_KEY || process.env.AMADEUS_CLIENT_ID;
const clientSecret = process.env.AMADEUS_API_SECRET || process.env.AMADEUS_CLIENT_SECRET;

let amadeus: InstanceType<typeof Amadeus> | null = null;

function getClient(): InstanceType<typeof Amadeus> | null {
  if (!clientId || !clientSecret) return null;
  if (!amadeus) {
    amadeus = new Amadeus({
      clientId,
      clientSecret,
      hostname: process.env.AMADEUS_HOST === 'api.amadeus.com' ? 'production' : 'test',
      logLevel: 'silent',
    });
  }
  return amadeus;
}

/** 44 hubs africains (référence Robin des Airs — vols Europe ↔ Afrique). */
export const AFRICAN_HUBS_IATA = [
  'ABJ', 'ACC', 'ABV', 'ADD', 'ALG', 'BGF', 'BJL', 'BKO', 'BZV', 'CAI', 'CMN', 'COO', 'CPT', 'DAR', 'DKR', 'DLA', 'DSS',
  'FDF', 'FIH', 'FNA', 'JIB', 'JNB', 'KGL', 'LAD', 'LBV', 'LFW', 'LOS', 'MRU', 'NBO', 'NDJ', 'NIM', 'NKC', 'NSI', 'OUA',
  'PNR', 'PTP', 'RAK', 'ROB', 'RUN', 'SSG', 'TNR', 'TUN', 'ZNZ',
];

export interface AirportInfo {
  iataCode: string;
  name: string | null;
  cityCode: string | null;
  cityName: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  timezoneOffset: string | null;
}

export interface FlightVerificationResult {
  confirmed: boolean;
  delayed: boolean;
  cancelled: boolean;
  delayMinutes?: number | null;
  replacementFlight?: string | null;
  status?: string;
  error?: string;
}

/**
 * Extrait le code compagnie (2 lettres) et le numéro du vol depuis une chaîne type "AF718".
 */
function parseFlightNumber(flightNumber: string): { carrierCode: string; number: string } | null {
  const raw = (flightNumber || '').replace(/\s/g, '').toUpperCase();
  const match = raw.match(/^([A-Z0-9]{2})(\d{1,4})$/);
  if (match) return { carrierCode: match[1], number: match[2] };
  const match3 = raw.match(/^([A-Z]{3})(\d{1,4})$/);
  if (match3) return { carrierCode: match3[1].slice(0, 2), number: match3[2] };
  return null;
}

/**
 * Vérifie auprès d'Amadeus si le vol est retardé/annulé et tente de récupérer un éventuel vol de remplacement.
 */
export async function checkFlightVerification(
  flightNumber: string,
  date: string
): Promise<FlightVerificationResult> {
  const parsed = parseFlightNumber(flightNumber);
  if (!parsed) {
    return { confirmed: false, delayed: false, cancelled: false, error: 'Numéro de vol invalide' };
  }

  const client = getClient();
  if (!client) {
    return { confirmed: false, delayed: false, cancelled: false, error: 'Amadeus non configuré' };
  }

  const scheduledDate = (date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
    return { confirmed: false, delayed: false, cancelled: false, error: 'Date invalide' };
  }

  try {
    const response = await client.schedule.flights.get({
      carrierCode: parsed.carrierCode,
      flightNumber: parsed.number,
      scheduledDepartureDate: scheduledDate,
    }) as { data?: unknown[]; result?: { data?: unknown[] } };

    const data = Array.isArray(response?.data) ? response.data : response?.result?.data as unknown[] | undefined;
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { confirmed: false, delayed: false, cancelled: false, status: 'non trouvé' };
    }

    const flight = data[0] as Record<string, unknown>;
    const segments = (flight?.flightDesignator as any)?.segmentInformations || (flight?.segments as unknown[]) || [];
    const firstSegment = Array.isArray(segments) ? segments[0] : null;

    let status: string = (firstSegment as any)?.legs?.[0]?.flightStatus ||
      (flight?.flightStatus as string) ||
      (firstSegment as any)?.flightStatus ||
      '';

    const statusLower = (status || '').toLowerCase();

    const cancelled = statusLower.includes('cancel') || statusLower.includes('cancelled') || statusLower === 'cancelled';
    const delayed = statusLower.includes('delay') || statusLower === 'delayed' || (flight as any).delay !== undefined;

    let delayMinutes: number | null = null;
    const dep = (firstSegment as any)?.departure || flight?.departure;
    const arr = (firstSegment as any)?.arrival || flight?.arrival;
    if (dep?.scheduledTime && (dep.actualTime || dep.estimatedTime)) {
      const s = new Date(dep.scheduledTime).getTime();
      const a = new Date(dep.actualTime || dep.estimatedTime).getTime();
      if (!isNaN(s) && !isNaN(a)) delayMinutes = Math.round((a - s) / 60000);
    }
    if (delayMinutes == null && (flight?.delay as number) != null) {
      delayMinutes = Number(flight.delay);
    }

    let replacementFlight: string | null = null;
    const altFlights = (flight?.alternativeFlights as any[]) || (flight?.rerouting as any)?.flights || [];
    if (Array.isArray(altFlights) && altFlights.length > 0 && altFlights[0]) {
      const alt = altFlights[0];
      replacementFlight = alt.flightDesignator?.carrierCode && alt.flightDesignator?.flightNumber
        ? `${alt.flightDesignator.carrierCode}${alt.flightDesignator.flightNumber}`
        : (alt.carrierCode && alt.flightNumber ? `${alt.carrierCode}${alt.flightNumber}` : null) || (alt.iata || alt.number) || null;
    }

    return {
      confirmed: true,
      delayed: cancelled ? false : delayed,
      cancelled,
      delayMinutes: delayMinutes ?? undefined,
      replacementFlight: replacementFlight || undefined,
      status: status || undefined,
    };
  } catch (err: any) {
    const message = err?.response?.body?.errors?.[0]?.detail || err?.message || 'Erreur Amadeus';
    return {
      confirmed: false,
      delayed: false,
      cancelled: false,
      error: message,
    };
  }
}

// ─── Référence Aéroports (Airport & City Search) ─────────────────────────────

/**
 * Récupère les coordonnées et le timezone d'un aéroport via l'API Amadeus Airport & City Search.
 */
export async function fetchAirportByIata(iataCode: string): Promise<AirportInfo | null> {
  const client = getClient();
  if (!client) return null;
  const iata = (iataCode || '').trim().toUpperCase();
  if (!iata || iata.length !== 3) return null;
  try {
    const response = await (client as any).referenceData.locations.get({
      keyword: iata,
      subType: 'AIRPORT',
      view: 'FULL',
      'page[limit]': 5,
    });
    const data = (response as any)?.data;
    const list = Array.isArray(data) ? data : [];
    const airport = list.find((loc: any) => (loc.iataCode || '').toUpperCase() === iata && (loc.subType || '').toUpperCase() === 'AIRPORT') || list[0];
    if (!airport) return null;
    const geo = airport.geoCode || {};
    const addr = airport.address || {};
    return {
      iataCode: (airport.iataCode || iata).toUpperCase(),
      name: airport.name || airport.detailedName || null,
      cityCode: addr.cityCode || null,
      cityName: addr.cityName || null,
      countryCode: addr.countryCode || null,
      latitude: typeof geo.latitude === 'number' ? geo.latitude : null,
      longitude: typeof geo.longitude === 'number' ? geo.longitude : null,
      timezoneOffset: airport.timeZoneOffset ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Récupère et stocke en base les 44 hubs africains (coordonnées + timezone).
 */
export async function fetchAndStoreAfricanHubs(): Promise<{ stored: number; failed: string[] }> {
  const { upsertAirport } = require('../db/robinDb');
  const failed: string[] = [];
  let stored = 0;
  for (const iata of AFRICAN_HUBS_IATA) {
    const info = await fetchAirportByIata(iata);
    if (info) {
      upsertAirport({
        iata_code: info.iataCode,
        name: info.name,
        city_code: info.cityCode,
        city_name: info.cityName,
        country_code: info.countryCode,
        latitude: info.latitude,
        longitude: info.longitude,
        timezone_offset: info.timezoneOffset,
      });
      stored += 1;
    } else {
      failed.push(iata);
    }
  }
  return { stored, failed };
}

// ─── Référence Vols (Flight Schedules — Vérité de Référence) ─────────────────

export interface OfficialTimeResult {
  scheduledDeparture: string | null;
  scheduledArrival: string | null;
  depIata: string | null;
  arrIata: string | null;
  error?: string;
}

/**
 * Horaires officiels (théoriques) du vol selon Amadeus Flight Schedules.
 * Sert de "juge de paix" : Retard = Vérité de Terrain (Aviation Edge) − Vérité de Référence (cette fonction).
 */
export async function verifyOfficialTime(flightNumber: string, date: string): Promise<OfficialTimeResult> {
  const parsed = parseFlightNumber(flightNumber);
  if (!parsed) {
    return { scheduledDeparture: null, scheduledArrival: null, depIata: null, arrIata: null, error: 'Numéro de vol invalide' };
  }
  const client = getClient();
  if (!client) {
    return { scheduledDeparture: null, scheduledArrival: null, depIata: null, arrIata: null, error: 'Amadeus non configuré' };
  }
  const scheduledDate = (date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
    return { scheduledDeparture: null, scheduledArrival: null, depIata: null, arrIata: null, error: 'Date invalide' };
  }
  try {
    const response = await client.schedule.flights.get({
      carrierCode: parsed.carrierCode,
      flightNumber: parsed.number,
      scheduledDepartureDate: scheduledDate,
    }) as { data?: unknown[]; result?: { data?: unknown[] } };

    const data = Array.isArray((response as any)?.data) ? (response as any).data : (response as any)?.result?.data;
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { scheduledDeparture: null, scheduledArrival: null, depIata: null, arrIata: null, error: 'Vol non trouvé' };
    }

    const flight = data[0] as Record<string, unknown>;
    const segments = (flight?.flightDesignator as any)?.segmentInformations || (flight?.segments as any[]) || [];
    const firstSegment = Array.isArray(segments) ? segments[0] : null;
    if (!firstSegment) {
      return { scheduledDeparture: null, scheduledArrival: null, depIata: null, arrIata: null, error: 'Segment manquant' };
    }

    const dep = (firstSegment as any).departure || (firstSegment as any).dep;
    const arr = (firstSegment as any).arrival || (firstSegment as any).arr;
    const scheduledDeparture = dep?.scheduledTime || dep?.time || null;
    const scheduledArrival = arr?.scheduledTime || arr?.time || null;
    const depIata = (dep?.iataCode || (dep?.airport as any)?.iataCode || '').toString().toUpperCase() || null;
    const arrIata = (arr?.iataCode || (arr?.airport as any)?.iataCode || '').toString().toUpperCase() || null;

    return {
      scheduledDeparture: scheduledDeparture ? String(scheduledDeparture) : null,
      scheduledArrival: scheduledArrival ? String(scheduledArrival) : null,
      depIata: depIata || null,
      arrIata: arrIata || null,
    };
  } catch (err: any) {
    const message = err?.response?.body?.errors?.[0]?.detail || err?.message || 'Erreur Amadeus';
    return {
      scheduledDeparture: null,
      scheduledArrival: null,
      depIata: null,
      arrIata: null,
      error: message,
    };
  }
}
