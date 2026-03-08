/**
 * Gestionnaire de session du tunnel conversationnel Robin (WhatsApp).
 * Étapes : AWAITING_CARD → CONFIRM_FLIGHT → CHECK_CONNECTION → ASK_PASSENGERS → CONFIRM_DATE → VERDICT.
 */

import type { FlightData, TunnelStep } from '../db/robinDb';
import { getSession, upsertSession, updateSessionStep } from '../db/robinDb';

const LIEN_SIGNATURE = 'https://robindesairs.eu/depot-en-ligne.html';

/** Scripts de Robin par étape (message initial ou après réception). */
export const ROBIN_SCRIPTS = {
  /** Étape 0 — Accueil (pas encore de carte). */
  AWAITING_CARD:
    'Bonjour ! Je suis Robin 🏹. Envoyez-moi une photo de votre carte d\'embarquement, je m\'occupe d\'analyser vos droits en 30 secondes.',

  /** Étape 1 — Après OCR : confirmation du vol. */
  CONFIRM_FLIGHT: (flightNumber: string) =>
    `Merci ! Je vois le vol *${flightNumber}*. Est-ce bien le bon vol ? (Répondez OUI ou NON)`,

  /** Étape 2 — Liaison / correspondance. */
  CHECK_CONNECTION:
    'Y avait-il un autre vol (correspondance) sur cette même réservation ? (OUI/NON)',

  /** Étape 3 — Nombre de passagers. */
  ASK_PASSENGERS:
    'Combien de passagers au total voyageaient avec vous ? (Famille, amis... chaque passager peut toucher 600€ !)',

  /** Étape 4 — Confirmation date. */
  CONFIRM_DATE: (date: string) =>
    `Dernière vérification : s'agit-il bien du vol du *${date}* ? Si c'est faux, tapez la bonne date au format JJ/MM/AAAA.`,

  /** Étape 5 — Verdict éligible. */
  VERDICT_ELIGIBLE: (nbPassengers: number, total: number) =>
    `🎯 EXCELLENTE NOUVELLE ! Pour ${nbPassengers} passager(s), vous pouvez récupérer *${total}€*. Cliquez ici pour signer le mandat et je lance la procédure immédiatement : ${LIEN_SIGNATURE}`,

  /** Étape 5 — Verdict non éligible. */
  VERDICT_NOT_ELIGIBLE: (reason: string) =>
    `Après analyse, ce vol n'est pas éligible (Raison : ${reason}). Voulez-vous vérifier un autre vol ? Envoyez une nouvelle photo de carte d'embarquement pour recommencer.`,
} as const;

export type SessionState = {
  phone_number: string;
  current_step: TunnelStep;
  flight_data: FlightData | null;
  passenger_count: number;
  is_completed: boolean;
  verdict_eligible?: boolean | null;
  verdict_reason?: string | null;
};

function parseFlightData(flightDataStr: string | null): FlightData | null {
  if (!flightDataStr) return null;
  try {
    return JSON.parse(flightDataStr) as FlightData;
  } catch {
    return null;
  }
}

/** Récupère ou crée une session et retourne l’état. */
export function getOrCreateSession(phoneNumber: string): SessionState {
  const session = getSession(phoneNumber);
  if (session) {
    return {
      phone_number: session.phone_number,
      current_step: session.current_step as TunnelStep,
      flight_data: parseFlightData(session.flight_data),
      passenger_count: session.passenger_count ?? 0,
      is_completed: !!session.is_completed,
      verdict_eligible: session.verdict_eligible != null ? !!session.verdict_eligible : null,
      verdict_reason: session.verdict_reason ?? undefined,
    };
  }
  upsertSession({ phone_number: phoneNumber, current_step: 'AWAITING_CARD' });
  return {
    phone_number: normalizePhone(phoneNumber),
    current_step: 'AWAITING_CARD',
    flight_data: null,
    passenger_count: 0,
    is_completed: false,
  };
}

function normalizePhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('0')) return '33' + digits.slice(1);
  if (digits.length <= 9 && !digits.startsWith('33')) return '33' + digits;
  return digits;
}

/** Passe à l’étape CONFIRM_FLIGHT avec les données vol extraites par OCR. */
export function setFlightFromOcr(phoneNumber: string, flightNumber: string, date?: string): void {
  const phone = normalizePhone(phoneNumber);
  upsertSession({
    phone_number: phone,
    current_step: 'CONFIRM_FLIGHT',
    flight_data: { flightNumber, date },
  });
}

/** Traite la réponse utilisateur et retourne le message à envoyer + nouvel état. */
export function processUserReply(
  phoneNumber: string,
  userMessage: string,
  options: {
    flightEligible?: boolean;
    verdictReason?: string;
    geminiSideAnswer?: string;
  } = {}
): { reply: string; state: SessionState } {
  const phone = normalizePhone(phoneNumber);
  const state = getOrCreateSession(phone);
  const text = (userMessage || '').trim();
  const upper = text.toUpperCase();

  // Réponse générique par Gemini (question hors tunnel) : on l’utilise puis on ramène à l’étape.
  if (options.geminiSideAnswer && text.length > 0 && !/^(OUI|NON)$/i.test(upper) && !/^\d+$/.test(text) && !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)) {
    const stepMessage = getStepPrompt(state);
    const reply = `${options.geminiSideAnswer}\n\n---\n${stepMessage}`;
    return { reply, state };
  }

  switch (state.current_step) {
    case 'AWAITING_CARD':
      return {
        reply: ROBIN_SCRIPTS.AWAITING_CARD,
        state,
      };

    case 'CONFIRM_FLIGHT': {
      if (/^OUI$/i.test(upper)) {
        updateSessionStep(phone, 'CHECK_CONNECTION', state.flight_data);
        return { reply: ROBIN_SCRIPTS.CHECK_CONNECTION, state: getOrCreateSession(phone) };
      }
      if (/^NON$/i.test(upper)) {
        updateSessionStep(phone, 'AWAITING_CARD', null);
        return { reply: ROBIN_SCRIPTS.AWAITING_CARD, state: getOrCreateSession(phone) };
      }
      return {
        reply: 'Répondez OUI ou NON pour confirmer le vol.',
        state,
      };
    }

    case 'CHECK_CONNECTION': {
      if (/^OUI$/i.test(upper)) {
        const fd = state.flight_data ? { ...state.flight_data, hasConnection: true } : { hasConnection: true };
        updateSessionStep(phone, 'ASK_PASSENGERS', fd);
        return { reply: ROBIN_SCRIPTS.ASK_PASSENGERS, state: getOrCreateSession(phone) };
      }
      if (/^NON$/i.test(upper)) {
        const fd = state.flight_data ? { ...state.flight_data, hasConnection: false } : { hasConnection: false };
        updateSessionStep(phone, 'ASK_PASSENGERS', fd);
        return { reply: ROBIN_SCRIPTS.ASK_PASSENGERS, state: getOrCreateSession(phone) };
      }
      return { reply: 'Répondez OUI ou NON (correspondance sur la même réservation ?).', state };
    }

    case 'ASK_PASSENGERS': {
      const num = parseInt(text, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= 20) {
        updateSessionStep(phone, 'CONFIRM_DATE', state.flight_data, num);
        const date = state.flight_data?.date || '—';
        return {
          reply: ROBIN_SCRIPTS.CONFIRM_DATE(date),
          state: getOrCreateSession(phone),
        };
      }
      return { reply: 'Indiquez un nombre de passagers (1 à 20).', state };
    }

    case 'CONFIRM_DATE': {
      const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const match = text.match(dateRegex);
      if (/^OUI$/i.test(upper) || text === '') {
        const fd = state.flight_data || {};
        return processVerdict(phone, state.passenger_count, fd, options);
      }
      if (match) {
        const [, d, m, y] = match;
        const dateStr = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
        const fd = { ...(state.flight_data || {}), date: dateStr };
        return processVerdict(phone, state.passenger_count, fd, options);
      }
      return {
        reply: 'Répondez OUI ou tapez la date au format JJ/MM/AAAA.',
        state,
      };
    }

    case 'VERDICT': {
      upsertSession({ phone_number: phone, current_step: 'AWAITING_CARD', is_completed: false });
      return { reply: ROBIN_SCRIPTS.AWAITING_CARD, state: getOrCreateSession(phone) };
    }

    default:
      return { reply: ROBIN_SCRIPTS.AWAITING_CARD, state: getOrCreateSession(phone) };
  }
}

function getStepPrompt(state: SessionState): string {
  switch (state.current_step) {
    case 'AWAITING_CARD':
      return ROBIN_SCRIPTS.AWAITING_CARD;
    case 'CONFIRM_FLIGHT':
      return state.flight_data?.flightNumber
        ? ROBIN_SCRIPTS.CONFIRM_FLIGHT(state.flight_data.flightNumber)
        : ROBIN_SCRIPTS.AWAITING_CARD;
    case 'CHECK_CONNECTION':
      return ROBIN_SCRIPTS.CHECK_CONNECTION;
    case 'ASK_PASSENGERS':
      return ROBIN_SCRIPTS.ASK_PASSENGERS;
    case 'CONFIRM_DATE':
      return state.flight_data?.date ? ROBIN_SCRIPTS.CONFIRM_DATE(state.flight_data.date) : ROBIN_SCRIPTS.ASK_PASSENGERS;
    case 'VERDICT':
      return 'Souhaitez-vous vérifier un autre vol ? Envoyez une photo de carte d\'embarquement.';
    default:
      return ROBIN_SCRIPTS.AWAITING_CARD;
  }
}

function processVerdict(
  phone: string,
  passengerCount: number,
  flightData: FlightData,
  options: { flightEligible?: boolean; verdictReason?: string }
): { reply: string; state: SessionState } {
  const state = getOrCreateSession(phone);
  const eligible = options.flightEligible ?? false;
  const reason = options.verdictReason ?? 'Non éligible (conditions non remplies)';
  const amountPerPax = 600;
  const total = passengerCount * amountPerPax;

  upsertSession({
    phone_number: phone,
    current_step: 'VERDICT',
    is_completed: true,
    verdict_eligible: eligible,
    verdict_reason: reason,
    flight_data: flightData,
    passenger_count: passengerCount,
  });

  const reply = eligible
    ? ROBIN_SCRIPTS.VERDICT_ELIGIBLE(passengerCount, total)
    : ROBIN_SCRIPTS.VERDICT_NOT_ELIGIBLE(reason);

  return { reply, state: getOrCreateSession(phone) };
}

/** Retourne le message d’accueil pour une nouvelle session (étape 0). */
export function getWelcomeMessage(): string {
  return ROBIN_SCRIPTS.AWAITING_CARD;
}

/** Message à envoyer après OCR (étape 1) avec le numéro de vol extrait. */
export function getConfirmFlightMessage(flightNumber: string): string {
  return ROBIN_SCRIPTS.CONFIRM_FLIGHT(flightNumber);
}
