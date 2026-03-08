/**
 * Service WhatsApp — envoi de messages texte, parsing numéro de vol, éligibilité CE 261, menu bienvenue.
 * Utilisé côté backend / scripts ; le webhook Netlify réplique la logique en JS.
 */

import { insertWhatsAppMessage } from '../db/robinDb';

const LONG_HAUL_KM = 3500;
const ELIGIBLE_DELAY_MIN = 180;

/** Menu envoyé quand l’utilisateur dit "Bonjour". */
export const MENU_BIENVENUE = `👋 *Robin des Airs* — Récupérez jusqu’à 600€ si votre vol a été retardé ou annulé.

• Envoyez-nous votre *numéro de vol* (ex: AF718, BA123) pour vérifier votre éligibilité.
• Ou dites *Bonjour* pour ce menu.
• Déposer un dossier : https://robindesairs.eu/depot-en-ligne.html
• Nous contacter : https://wa.me/15557840392`;

/** Lien de dépôt de dossier (à personnaliser si besoin). */
export const LIEN_DEPOT = 'https://robindesairs.eu/depot-en-ligne.html';

/**
 * Extrait un numéro de vol (type AF718, BA123) du texte.
 * Retourne le premier match en majuscules sans espace, ou null.
 */
export function parseFlightNumber(text: string): string | null {
  if (!text || typeof text !== 'string') return null;
  const match = text.replace(/\s+/g, '').match(/\b([A-Z]{2}\d{2,4})\b/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Appelle l’API flight-info (Netlify) pour un vol et détermine si éligible 600€.
 * Retourne { eligible: boolean, amount: 250|400|600|null, dep?, arr?, delayMinutes? }.
 */
export async function getFlightEligibility(flightNumber: string): Promise<{
  eligible: boolean;
  amount: number | null;
  dep?: string;
  arr?: string;
  delayMinutes?: number;
}> {
  const base = process.env.NETLIFY_URL || process.env.ROBIN_SITE_URL || 'https://robindesairs.eu';
  const url = `${base.replace(/\/$/, '')}/.netlify/functions/flight-info?flight=${encodeURIComponent(flightNumber)}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data) || data.length === 0) {
      return { eligible: false, amount: null };
    }
    const first = data[0];
    const dep = (first.departure?.iataCode || first.departure?.airport?.iataCode || '').toUpperCase();
    const arr = (first.arrival?.iataCode || first.arrival?.airport?.iataCode || '').toUpperCase();
    if (!dep || !arr) return { eligible: false, amount: null, dep, arr };

    const delayMinutes =
      first.arrival?.delay != null
        ? Number(first.arrival.delay)
        : first.departure?.delay != null
          ? Number(first.departure.delay)
          : undefined;

    const km = distanceFromAirports(dep, arr);
    const amount = km != null ? distanceKmToAmount(km) : null;
    const eligible =
      amount !== null &&
      amount >= 600 &&
      delayMinutes != null &&
      !isNaN(delayMinutes) &&
      delayMinutes >= ELIGIBLE_DELAY_MIN;

    return { eligible: !!eligible, amount, dep, arr, delayMinutes };
  } catch {
    return { eligible: false, amount: null };
  }
}

function distanceKmToAmount(km: number): 250 | 400 | 600 {
  if (km < 1500) return 250;
  if (km <= LONG_HAUL_KM) return 400;
  return 600;
}

/** Distance approximative (km) entre deux codes IATA (liste partielle France / Afrique). */
const AIRPORT_KM: Record<string, number> = {};
function getApproxKm(dep: string, arr: string): number | null {
  const key = [dep, arr].sort().join('-');
  if (AIRPORT_KM[key] != null) return AIRPORT_KM[key];
  const rev = [arr, dep].sort().join('-');
  if (AIRPORT_KM[rev] != null) return AIRPORT_KM[rev];
  return null;
}
function setApproxKm(dep: string, arr: string, km: number): void {
  const key = [dep, arr].sort().join('-');
  AIRPORT_KM[key] = km;
}
// Quelques lignes France–Afrique (exemples)
[
  ['CDG', 'DSS', 4200],
  ['CDG', 'DKR', 4200],
  ['ORY', 'DSS', 4200],
  ['CDG', 'ABJ', 4650],
  ['CDG', 'BKO', 4100],
  ['CDG', 'CMN', 2300],
  ['CDG', 'DLA', 5150],
  ['CDG', 'FIH', 6100],
  ['MRS', 'DSS', 4000],
  ['LYS', 'DSS', 4100],
].forEach(([a, b, k]) => setApproxKm(a as string, b as string, k as number));

function distanceFromAirports(dep: string, arr: string): number | null {
  const d = getApproxKm(dep, arr);
  if (d != null) return d;
  if (dep && arr) {
    const fr = ['CDG', 'ORY', 'MRS', 'LYS', 'NCE', 'BOD', 'TLS', 'NTE', 'LIL', 'RUN'];
    const af = ['DSS', 'DKR', 'ABJ', 'BKO', 'CMN', 'DLA', 'NSI', 'FIH', 'NBO', 'JNB', 'ADD', 'CAI', 'ALG', 'TUN'];
    const depFr = fr.includes(dep);
    const arrFr = fr.includes(arr);
    const depAf = af.includes(dep);
    const arrAf = af.includes(arr);
    if ((depFr && arrAf) || (depAf && arrFr)) return 4500;
  }
  return null;
}

/**
 * Envoie un message texte WhatsApp via la fonction Netlify send-whatsapp.
 * À utiliser depuis un serveur/script ; le webhook appelle la fonction en interne.
 */
export async function sendTextMessage(to: string, text: string): Promise<{ success: boolean; error?: string }> {
  const base = process.env.NETLIFY_URL || process.env.ROBIN_SITE_URL || 'https://robindesairs.eu';
  const url = `${base.replace(/\/$/, '')}/.netlify/functions/send-whatsapp`;
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  const body: { to: string; text: string; secret?: string } = { to, text };
  if (secret) body.secret = secret;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || data.details || String(res.status) };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Construit le message "Bonne nouvelle ! Votre vol est éligible à 600€…".
 */
export function buildEligibleMessage(flightNumber: string, lienDepot: string = LIEN_DEPOT): string {
  return `Bonne nouvelle ! Votre vol ${flightNumber} est éligible à 600€. Cliquez ici pour signer votre dossier : ${lienDepot}`;
}

/**
 * Enregistre un message entrant dans robin.db (pour le Dashboard).
 * À appeler depuis un contexte où la DB est disponible (serveur local, script).
 */
export function logIncomingMessage(payload: {
  wa_id?: string | null;
  from_phone?: string | null;
  message_id?: string | null;
  message_type?: string | null;
  body_text?: string | null;
  raw_payload?: string | null;
}): void {
  try {
    insertWhatsAppMessage({
      ...payload,
      direction: 'in',
    });
  } catch {
    // DB peut être indisponible (ex. Netlify serverless)
  }
}
