/**
 * Gestionnaire de session du tunnel conversationnel Robin (WhatsApp).
 * Étapes : AWAITING_CARD → CONFIRM_FLIGHT → CHECK_CONNECTION → ASK_PASSENGERS → CONFIRM_DATE → VERDICT.
 */

import type { FlightData, TunnelStep, Step1FormData } from '../db/robinDb';
import { getSession, upsertSession, updateSessionStep } from '../db/robinDb';

const LIEN_SIGNATURE = 'https://robindesairs.eu/depot-en-ligne.html';

/** Scripts de Robin par étape (message initial ou après réception). */
export const ROBIN_SCRIPTS = {
  /** Étape 0 — Accueil (pas encore de carte). */
  AWAITING_CARD:
    'Bonjour ! Je suis Robin 🏹. Envoyez-moi une photo de votre carte d\'embarquement, je m\'occupe d\'analyser vos droits en 30 secondes.',

  /** Étape 1 — Après OCR : confirmation du vol. */
  CONFIRM_FLIGHT: (flightNumber: string, passengerName?: string | null) =>
    `Je vois le vol *${flightNumber}*, est-ce correct ?${passengerName ? ` (Passager : ${passengerName})` : ''} Répondez OUI ou NON.`,

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

  // ——— Étape 1 (cheminement mandat) ———
  PASSENGER_FIRST: (n: number) => `Prénom du passager ${n} ?`,
  PASSENGER_LAST: (n: number) => `Nom du passager ${n} ?`,
  PASSENGER_ANOTHER: 'Y a-t-il un autre passager ? (Oui / Non)',
  PASSENGERS_CONFIRM: (list: string) => `Passagers : ${list}. Confirmer ? (Oui / Non)`,
  CONFIRM_PHONE: (num: string) => `Est-ce bien le numéro auquel nous pouvons vous joindre pour ce dossier : *${num}* ? (Oui / Non)`,
  ASK_CONTACT_PHONE: 'Quel numéro de téléphone souhaitez-vous utiliser pour ce dossier ?',
  TRAJET_FLIGHT: 'Quel est le numéro de vol ? (ex. AF123) — ou envoyez une photo de votre carte d\'embarquement.',
  TRAJET_DATE: 'Quelle est la date du vol ? (format JJ/MM/AAAA)',
  TRAJET_CONNECTION: 'Y a-t-il une correspondance (autre vol sur la même réservation) ? (Oui / Non)',
  TRAJET_CONFIRM: (summary: string) => `Trajet : ${summary}. Confirmer ? (Oui / Non)`,
  ASK_PNR: 'Quel est votre code PNR (réservation) ? (6 caractères, ex. ABC123)',
  CONFIRM_PNR: (pnr: string) => `PNR saisi : *${pnr}*. Confirmer ? (Oui / Non)`,
  ASK_AIRLINE: 'Quelle est la compagnie aérienne du vol principal ?',
  ASK_ADDRESS: 'Quelle est votre adresse postale ? (ville, code postal, pays)',
  STEP1_DONE: (recap: string) => `Nous avons bien enregistré toutes les informations pour votre dossier.\n\n${recap}\n\nProchaine étape : nous vous enverrons le mandat à signer (Yousign).`,
} as const;

const STEP1_STEPS: TunnelStep[] = [
  'PASSENGER_FIRST', 'PASSENGER_LAST', 'PASSENGER_ANOTHER', 'PASSENGERS_CONFIRM',
  'CONFIRM_PHONE', 'ASK_CONTACT_PHONE', 'TRAJET_FLIGHT', 'TRAJET_DATE', 'TRAJET_CONNECTION', 'TRAJET_CONFIRM',
  'ASK_PNR', 'CONFIRM_PNR', 'ASK_AIRLINE', 'ASK_ADDRESS', 'STEP1_DONE',
];

function isStep1(step: TunnelStep): boolean {
  return STEP1_STEPS.includes(step);
}

function parseStep1Form(flightDataStr: string | null): Step1FormData {
  if (!flightDataStr) return { passengers: [], passengerIndex: 0, flights: [], segmentIndex: 0 };
  try {
    const o = JSON.parse(flightDataStr) as Record<string, unknown>;
    if (!Array.isArray(o.passengers)) o.passengers = [];
    if (!Array.isArray(o.flights)) o.flights = [];
    return o as Step1FormData;
  } catch {
    return { passengers: [], passengerIndex: 0, flights: [], segmentIndex: 0 };
  }
}

export type SessionState = {
  phone_number: string;
  current_step: TunnelStep;
  flight_data: FlightData | null;
  form_data?: Step1FormData;
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
  const step = (session?.current_step || 'AWAITING_CARD') as TunnelStep;
  const flightData = parseFlightData(session?.flight_data ?? null);
  const formData = isStep1(step) ? parseStep1Form(session?.flight_data ?? null) : undefined;
  if (session) {
    return {
      phone_number: session.phone_number,
      current_step: step,
      flight_data: flightData,
      form_data: formData,
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
export function setFlightFromOcr(phoneNumber: string, flightNumber: string, date?: string, passengerName?: string): void {
  const phone = normalizePhone(phoneNumber);
  upsertSession({
    phone_number: phone,
    current_step: 'CONFIRM_FLIGHT',
    flight_data: { flightNumber, date, passengerName },
  });
}

/** Démarre la collecte Étape 1 (mandat). */
export function startStep1Collect(phoneNumber: string): void {
  const phone = normalizePhone(phoneNumber);
  upsertSession({
    phone_number: phone,
    current_step: 'PASSENGER_FIRST',
    flight_data: { passengers: [], passengerIndex: 0, flights: [], segmentIndex: 0 } as unknown as FlightData,
  });
}

/** Remplit le vol dans le formulaire Étape 1 (après saisie ou OCR). */
export function setStep1Flight(phoneNumber: string, flightNumber: string, date?: string): void {
  const phone = normalizePhone(phoneNumber);
  const state = getOrCreateSession(phone);
  const form = state.form_data ?? parseStep1Form(null);
  const segIdx = form.segmentIndex ?? 0;
  const flights = [...(form.flights ?? [])];
  while (flights.length <= segIdx) flights.push({ flightNumber: '', date: '' });
  flights[segIdx] = { flightNumber, date: date || '' };
  let nextStep: TunnelStep = segIdx > 0 ? 'TRAJET_CONFIRM' : (date ? 'TRAJET_CONNECTION' : 'TRAJET_DATE');
  saveStep1Form(phone, { ...form, flights, segmentIndex: segIdx }, nextStep);
}

function saveStep1Form(phone: string, form: Step1FormData, nextStep: TunnelStep): void {
  upsertSession({
    phone_number: phone,
    current_step: nextStep,
    flight_data: form as unknown as FlightData,
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
    // ——— Étape 1 (collecte mandat) ———
    case 'PASSENGER_FIRST': {
      const form = state.form_data ?? parseStep1Form(null);
      const idx = form.passengerIndex ?? 0;
      const passengers = [...(form.passengers ?? [])];
      while (passengers.length <= idx) passengers.push({ firstName: '', lastName: '' });
      passengers[idx] = { ...passengers[idx], firstName: text };
      saveStep1Form(phone, { ...form, passengers, passengerIndex: idx }, 'PASSENGER_LAST');
      const n = idx + 1;
      return { reply: ROBIN_SCRIPTS.PASSENGER_LAST(n), state: getOrCreateSession(phone) };
    }
    case 'PASSENGER_LAST': {
      const form = state.form_data ?? parseStep1Form(null);
      const idx = form.passengerIndex ?? 0;
      const passengers = [...(form.passengers ?? [])];
      while (passengers.length <= idx) passengers.push({ firstName: '', lastName: '' });
      passengers[idx] = { ...passengers[idx], lastName: text };
      saveStep1Form(phone, { ...form, passengers, passengerIndex: idx }, 'PASSENGER_ANOTHER');
      return { reply: ROBIN_SCRIPTS.PASSENGER_ANOTHER, state: getOrCreateSession(phone) };
    }
    case 'PASSENGER_ANOTHER': {
      const form = state.form_data ?? parseStep1Form(null);
      if (/^OUI$/i.test(upper)) {
        const idx = (form.passengerIndex ?? 0) + 1;
        saveStep1Form(phone, { ...form, passengerIndex: idx }, 'PASSENGER_FIRST');
        return { reply: ROBIN_SCRIPTS.PASSENGER_FIRST(idx + 1), state: getOrCreateSession(phone) };
      }
      if (/^NON$/i.test(upper)) {
        const list = (form.passengers ?? []).map((p) => `${p.firstName} ${p.lastName}`.trim()).filter(Boolean).join(', ') || '—';
        saveStep1Form(phone, { ...form }, 'PASSENGERS_CONFIRM');
        return { reply: ROBIN_SCRIPTS.PASSENGERS_CONFIRM(list), state: getOrCreateSession(phone) };
      }
      return { reply: 'Répondez Oui ou Non.', state };
    }
    case 'PASSENGERS_CONFIRM': {
      if (/^OUI$/i.test(upper)) {
        saveStep1Form(phone, state.form_data ?? parseStep1Form(null), 'CONFIRM_PHONE');
        const displayPhone = phone.replace(/^33/, '0');
        return { reply: ROBIN_SCRIPTS.CONFIRM_PHONE(displayPhone), state: getOrCreateSession(phone) };
      }
      if (/^NON$/i.test(upper)) {
        saveStep1Form(phone, { ...parseStep1Form(null), passengers: [], passengerIndex: 0 }, 'PASSENGER_FIRST');
        return { reply: ROBIN_SCRIPTS.PASSENGER_FIRST(1), state: getOrCreateSession(phone) };
      }
      return { reply: 'Répondez Oui ou Non pour confirmer la liste des passagers.', state };
    }
    case 'CONFIRM_PHONE': {
      if (/^OUI$/i.test(upper)) {
        saveStep1Form(phone, state.form_data ?? parseStep1Form(null), 'TRAJET_FLIGHT');
        return { reply: ROBIN_SCRIPTS.TRAJET_FLIGHT, state: getOrCreateSession(phone) };
      }
      if (/^NON$/i.test(upper)) {
        saveStep1Form(phone, state.form_data ?? parseStep1Form(null), 'ASK_CONTACT_PHONE');
        return { reply: ROBIN_SCRIPTS.ASK_CONTACT_PHONE, state: getOrCreateSession(phone) };
      }
      return { reply: 'Répondez Oui ou Non.', state };
    }
    case 'ASK_CONTACT_PHONE': {
      const form = state.form_data ?? parseStep1Form(null);
      const num = text.replace(/\D/g, '');
      if (num.length >= 8) {
        saveStep1Form(phone, { ...form, contactPhone: text }, 'TRAJET_FLIGHT');
        return { reply: ROBIN_SCRIPTS.TRAJET_FLIGHT, state: getOrCreateSession(phone) };
      }
      return { reply: 'Indiquez un numéro de téléphone valide.', state };
    }
    case 'TRAJET_FLIGHT': {
      const flightMatch = text.match(/\b([A-Z]{2}\s*\d{2,4})\b/i);
      if (flightMatch) {
        const flightNumber = flightMatch[1].replace(/\s/g, '').toUpperCase();
        setStep1Flight(phone, flightNumber, '');
        const next = getOrCreateSession(phone);
        return { reply: ROBIN_SCRIPTS.TRAJET_DATE, state: next };
      }
      return { reply: 'Indiquez un numéro de vol (ex. AF123) ou envoyez une photo de la carte d\'embarquement.', state };
    }
    case 'TRAJET_DATE': {
      const dateMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (dateMatch) {
        const [, d, m, y] = dateMatch;
        const dateStr = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
        const form = state.form_data ?? parseStep1Form(null);
        const segIdx = form.segmentIndex ?? 0;
        const flights = [...(form.flights ?? [])];
        while (flights.length <= segIdx) flights.push({ flightNumber: '', date: '' });
        flights[segIdx] = { ...flights[segIdx], date: dateStr };
        saveStep1Form(phone, { ...form, flights }, 'TRAJET_CONNECTION');
        return { reply: ROBIN_SCRIPTS.TRAJET_CONNECTION, state: getOrCreateSession(phone) };
      }
      return { reply: 'Date au format JJ/MM/AAAA.', state };
    }
    case 'TRAJET_CONNECTION': {
      if (/^OUI$/i.test(upper)) {
        const form = state.form_data ?? parseStep1Form(null);
        const flights = [...(form.flights ?? []), { flightNumber: '', date: '' }];
        saveStep1Form(phone, { ...form, flights, segmentIndex: (form.segmentIndex ?? 0) + 1 }, 'TRAJET_FLIGHT');
        return { reply: 'Numéro du vol de correspondance ? (ex. AT456)', state: getOrCreateSession(phone) };
      }
      if (/^NON$/i.test(upper)) {
        const form = state.form_data ?? parseStep1Form(null);
        const summary = (form.flights ?? []).map((f, i) => `Vol ${i + 1} ${f.flightNumber} (${f.date})`).join(', ');
        saveStep1Form(phone, { ...form }, 'TRAJET_CONFIRM');
        return { reply: ROBIN_SCRIPTS.TRAJET_CONFIRM(summary || '—'), state: getOrCreateSession(phone) };
      }
      return { reply: 'Répondez Oui ou Non (correspondance ?).', state };
    }
    case 'TRAJET_CONFIRM': {
      if (/^OUI$/i.test(upper)) {
        saveStep1Form(phone, state.form_data ?? parseStep1Form(null), 'ASK_PNR');
        return { reply: ROBIN_SCRIPTS.ASK_PNR, state: getOrCreateSession(phone) };
      }
      if (/^NON$/i.test(upper)) {
        saveStep1Form(phone, { ...(state.form_data ?? parseStep1Form(null)), segmentIndex: 0 }, 'TRAJET_FLIGHT');
        return { reply: ROBIN_SCRIPTS.TRAJET_FLIGHT, state: getOrCreateSession(phone) };
      }
      return { reply: 'Répondez Oui ou Non.', state };
    }
    case 'ASK_PNR': {
      const pnr = text.replace(/\s/g, '').toUpperCase().slice(0, 6);
      if (pnr.length >= 4) {
        saveStep1Form(phone, { ...(state.form_data ?? parseStep1Form(null)), pnr }, 'CONFIRM_PNR');
        return { reply: ROBIN_SCRIPTS.CONFIRM_PNR(pnr), state: getOrCreateSession(phone) };
      }
      return { reply: 'Code PNR : 6 caractères (ex. ABC123).', state };
    }
    case 'CONFIRM_PNR': {
      if (/^OUI$/i.test(upper)) {
        saveStep1Form(phone, state.form_data ?? parseStep1Form(null), 'ASK_AIRLINE');
        return { reply: ROBIN_SCRIPTS.ASK_AIRLINE, state: getOrCreateSession(phone) };
      }
      if (/^NON$/i.test(upper)) {
        saveStep1Form(phone, { ...(state.form_data ?? parseStep1Form(null)), pnr: undefined }, 'ASK_PNR');
        return { reply: ROBIN_SCRIPTS.ASK_PNR, state: getOrCreateSession(phone) };
      }
      return { reply: 'Répondez Oui ou Non.', state };
    }
    case 'ASK_AIRLINE': {
      saveStep1Form(phone, { ...(state.form_data ?? parseStep1Form(null)), airline: text }, 'ASK_ADDRESS');
      return { reply: ROBIN_SCRIPTS.ASK_ADDRESS, state: getOrCreateSession(phone) };
    }
    case 'ASK_ADDRESS': {
      const form = state.form_data ?? parseStep1Form(null);
      saveStep1Form(phone, { ...form, address: text }, 'STEP1_DONE');
      const recap = [
        `Passagers : ${(form.passengers ?? []).map((p) => `${p.firstName} ${p.lastName}`).join(', ')}`,
        `Vol(s) : ${(form.flights ?? []).map((f) => `${f.flightNumber} (${f.date})`).join(', ')}`,
        `PNR : ${form.pnr ?? '—'}`,
        `Compagnie : ${form.airline ?? '—'}`,
        `Adresse : ${text}`,
      ].join('\n');
      const next = getOrCreateSession(phone);
      return { reply: ROBIN_SCRIPTS.STEP1_DONE(recap), state: next };
    }
    case 'STEP1_DONE':
      return { reply: 'Pour toute question, répondez ici. Pour recommencer un nouveau dossier, tapez NOUVEAU.', state };

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

function getStepPromptInternal(state: SessionState): string {
  const form = state.form_data;
  switch (state.current_step) {
    case 'PASSENGER_FIRST':
      return ROBIN_SCRIPTS.PASSENGER_FIRST((form?.passengerIndex ?? 0) + 1);
    case 'PASSENGER_LAST':
      return ROBIN_SCRIPTS.PASSENGER_LAST((form?.passengerIndex ?? 0) + 1);
    case 'PASSENGER_ANOTHER':
      return ROBIN_SCRIPTS.PASSENGER_ANOTHER;
    case 'PASSENGERS_CONFIRM':
      return ROBIN_SCRIPTS.PASSENGERS_CONFIRM((form?.passengers ?? []).map((p) => `${p.firstName} ${p.lastName}`.trim()).join(', ') || '—');
    case 'CONFIRM_PHONE':
      return ROBIN_SCRIPTS.CONFIRM_PHONE(state.phone_number.replace(/^33/, '0'));
    case 'ASK_CONTACT_PHONE':
      return ROBIN_SCRIPTS.ASK_CONTACT_PHONE;
    case 'TRAJET_FLIGHT':
      return ROBIN_SCRIPTS.TRAJET_FLIGHT;
    case 'TRAJET_DATE':
      return ROBIN_SCRIPTS.TRAJET_DATE;
    case 'TRAJET_CONNECTION':
      return ROBIN_SCRIPTS.TRAJET_CONNECTION;
    case 'TRAJET_CONFIRM':
      return ROBIN_SCRIPTS.TRAJET_CONFIRM((form?.flights ?? []).map((f, i) => `Vol ${i + 1} ${f.flightNumber} (${f.date})`).join(', ') || '—');
    case 'ASK_PNR':
      return ROBIN_SCRIPTS.ASK_PNR;
    case 'CONFIRM_PNR':
      return ROBIN_SCRIPTS.CONFIRM_PNR(form?.pnr ?? '');
    case 'ASK_AIRLINE':
      return ROBIN_SCRIPTS.ASK_AIRLINE;
    case 'ASK_ADDRESS':
      return ROBIN_SCRIPTS.ASK_ADDRESS;
    case 'STEP1_DONE':
      return 'Prochaine étape : envoi du mandat à signer (Yousign).';
    case 'AWAITING_CARD':
      return ROBIN_SCRIPTS.AWAITING_CARD;
    case 'CONFIRM_FLIGHT':
      return state.flight_data?.flightNumber
        ? ROBIN_SCRIPTS.CONFIRM_FLIGHT(state.flight_data.flightNumber, state.flight_data.passengerName)
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

/** Premier message de l'Étape 1 (1.1 passagers). */
export function getStep1WelcomeMessage(): string {
  return ROBIN_SCRIPTS.PASSENGER_FIRST(1);
}

/** Message de rappel pour l'étape en cours (pour réponses hors sujet). */
export function getStepPrompt(state: SessionState): string {
  return getStepPromptInternal(state);
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
export function getConfirmFlightMessage(flightNumber: string, passengerName?: string | null): string {
  return ROBIN_SCRIPTS.CONFIRM_FLIGHT(flightNumber, passengerName);
}
