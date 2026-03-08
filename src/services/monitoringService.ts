/**
 * Service de monitoring — Radar Aviation Edge + croisement Amadeus pour certification.
 * Flux principal : scan des hubs via l’API radar Netlify (Aviation Edge).
 * Dès qu’un vol a retard > 180 min ou statut annulé : appel Amadeus ; si confirmé → is_certified_amadeus = 1.
 * Amadeus ne doit jamais bloquer le radar (gestion d’erreur robuste, quotas respectés).
 */

import { checkFlightVerification } from './amadeusService';
import { flightKey, setCertified, getCertifiedKeys } from '../db/robinDb';

const RADAR_URL = process.env.RADAR_URL || 'https://robin-des-airs.netlify.app/.netlify/functions/radar';
const SUSPECT_DELAY_MIN = 180;

export interface RadarFlight {
  flight: string;
  dep?: string;
  arr?: string;
  scheduledDate?: string | null;
  delayMinutes?: number | null;
  cancelled?: boolean;
  eligible?: boolean;
  [k: string]: unknown;
}

export interface CertificationRunResult {
  flights: RadarFlight[];
  certifiedCount: number;
  amadeusCheckedCount: number;
  error?: string;
}

/**
 * Récupère les vols depuis le radar (Aviation Edge via Netlify).
 */
export async function fetchRadarFlights(): Promise<RadarFlight[]> {
  const url = `${RADAR_URL}${RADAR_URL.includes('?') ? '&' : '?'}_=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  const text = await res.text();
  if (!res.ok || !text.trim().startsWith('{')) {
    throw new Error('Radar indisponible ou réponse invalide');
  }
  const data = JSON.parse(text);
  const flights = Array.isArray(data?.flights) ? data.flights : [];
  return flights;
}

/**
 * Détermine si un vol doit être vérifié par Amadeus (suspect).
 */
function isSuspect(flight: RadarFlight): boolean {
  if (flight.cancelled) return true;
  const delay = flight.delayMinutes;
  return typeof delay === 'number' && delay >= SUSPECT_DELAY_MIN;
}

/**
 * Exécute un cycle de certification : récupère les vols du radar, pour chaque suspect appelle Amadeus,
 * met à jour robin.db avec is_certified_amadeus = 1 si Amadeus confirme retard/annulation.
 */
export async function runCertification(): Promise<CertificationRunResult> {
  let flights: RadarFlight[] = [];
  try {
    flights = await fetchRadarFlights();
  } catch (e) {
    return {
      flights: [],
      certifiedCount: 0,
      amadeusCheckedCount: 0,
      error: (e as Error).message,
    };
  }

  const suspects = flights.filter(isSuspect);
  let amadeusCheckedCount = 0;

  for (const f of suspects) {
    const fn = (f.flight || '').toString().trim();
    const date = f.scheduledDate || (f.scheduledDeparture as string) || '';
    const scheduledDate = typeof date === 'string' ? date.slice(0, 10) : '';
    if (!fn || !scheduledDate) continue;

    try {
      const result = await checkFlightVerification(fn, scheduledDate);
      amadeusCheckedCount += 1;

      const key = flightKey(fn, f.dep || '', f.arr || '', scheduledDate);
      const confirmed = result.confirmed && (result.cancelled || result.delayed);
      setCertified(key, confirmed);
    } catch {
      // Ne jamais faire échouer le radar si Amadeus échoue
    }
  }

  const allKeys = flights
    .filter((f) => f.flight && (f.scheduledDate || (f.scheduledDeparture as string)))
    .map((f) =>
      flightKey(
        (f.flight || '').toString().trim(),
        f.dep || '',
        f.arr || '',
        typeof f.scheduledDate === 'string' ? f.scheduledDate.slice(0, 10) : String((f.scheduledDeparture as string) || '').slice(0, 10)
      )
    );
  const certifiedMap = getCertifiedKeys(allKeys);
  let certifiedCount = 0;
  flights.forEach((f) => {
    const fn = (f.flight || '').toString().trim();
    const date = f.scheduledDate || (f.scheduledDeparture as string) || '';
    const scheduledDate = typeof date === 'string' ? date.slice(0, 10) : '';
    const key = flightKey(fn, f.dep || '', f.arr || '', scheduledDate);
    const certified = !!certifiedMap[key];
    (f as any).is_certified_amadeus = certified;
    if (certified) certifiedCount += 1;
  });

  return {
    flights,
    certifiedCount,
    amadeusCheckedCount,
  };
}

/**
 * Retourne la map des clés certifiées pour fusion avec une liste de vols (ex. côté API).
 */
export function getCertificationsForFlights(flights: RadarFlight[]): Record<string, boolean> {
  const keys = flights
    .filter((f) => f.flight && (f.scheduledDate || (f.scheduledDeparture as string)))
    .map((f) =>
      flightKey(
        (f.flight || '').toString().trim(),
        f.dep || '',
        f.arr || '',
        typeof f.scheduledDate === 'string' ? f.scheduledDate.slice(0, 10) : String((f.scheduledDeparture as string) || '').slice(0, 10)
      )
    );
  return getCertifiedKeys(keys);
}
