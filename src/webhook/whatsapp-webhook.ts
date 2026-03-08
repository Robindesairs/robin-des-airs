/**
 * Handler du tunnel conversationnel Robin (WhatsApp).
 * Utilise sessionManager (robin.db), geminiService (OCR + réponses naturelles), whatsappService (éligibilité).
 * À appeler depuis un serveur Node/TS ayant accès à robin.db et GEMINI_API_KEY.
 */

import {
  getOrCreateSession,
  processUserReply,
  setFlightFromOcr,
  setStep1Flight,
  getConfirmFlightMessage,
  getWelcomeMessage,
  getStep1WelcomeMessage,
  getStepPrompt,
  startStep1Collect,
} from '../services/sessionManager';
import { extractBoardingPassFromImage } from '../services/visionService';
import { answerInTunnel } from '../services/geminiService';
import { getFlightEligibility } from '../services/whatsappService';

const STEP1_STEPS = [
  'PASSENGER_FIRST', 'PASSENGER_LAST', 'PASSENGER_ANOTHER', 'PASSENGERS_CONFIRM',
  'CONFIRM_PHONE', 'ASK_CONTACT_PHONE', 'TRAJET_FLIGHT', 'TRAJET_DATE', 'TRAJET_CONNECTION', 'TRAJET_CONFIRM',
  'ASK_PNR', 'CONFIRM_PNR', 'ASK_AIRLINE', 'ASK_ADDRESS', 'STEP1_DONE',
];
function isStep1(step: string): boolean {
  return STEP1_STEPS.includes(step);
}
function isBonjourLike(t: string): boolean {
  return /^(bonjour|bonsoir|salut|hello|coucou)\s*[!.]?$/i.test(t.trim());
}

export interface TunnelHandleInput {
  phoneNumber: string;
  messageText?: string | null;
  /** Image en base64 (avec ou sans data URL prefix). */
  imageBase64?: string | null;
  imageMimeType?: string;
}

export interface TunnelHandleResult {
  reply: string;
  sessionStep: string;
}

/**
 * Traite un message entrant (texte ou image) et retourne la réponse à envoyer.
 */
export async function handleTunnelMessage(input: TunnelHandleInput): Promise<TunnelHandleResult> {
  const { phoneNumber, messageText, imageBase64, imageMimeType } = input;
  const text = (messageText || '').trim();
  const state = getOrCreateSession(phoneNumber);

  // Image : si on est en Étape 1 (TRAJET_FLIGHT), OCR et remplir le vol ; sinon flux éligibilité (CONFIRM_FLIGHT)
  if (imageBase64) {
    try {
      const ocr = await extractBoardingPassFromImage(imageBase64, imageMimeType || 'image/jpeg');
      if (ocr.flightNumber) {
        if (state.current_step === 'TRAJET_FLIGHT') {
          setStep1Flight(phoneNumber, ocr.flightNumber, ocr.date ?? undefined);
          const next = getOrCreateSession(phoneNumber);
          return { reply: getStepPrompt(next), sessionStep: next.current_step };
        }
        setFlightFromOcr(phoneNumber, ocr.flightNumber, ocr.date ?? undefined, ocr.passengerName ?? undefined);
        const reply = getConfirmFlightMessage(ocr.flightNumber, ocr.passengerName);
        return { reply, sessionStep: 'CONFIRM_FLIGHT' };
      }
    } catch (e) {
      console.error('Tunnel OCR error:', e);
      return {
        reply: "Je n'ai pas pu lire la carte d'embarquement. Pouvez-vous renvoyer une photo plus nette ?",
        sessionStep: state.current_step,
      };
    }
    return {
      reply: "Je ne détecte pas de numéro de vol sur cette image. Envoyez une photo claire de votre carte d'embarquement.",
      sessionStep: state.current_step,
    };
  }

  // Pas de texte : démarrer Étape 1 (grand 1) si on est au début, sinon rappel de l'étape
  if (!text) {
    if (state.current_step === 'AWAITING_CARD') {
      startStep1Collect(phoneNumber);
      return { reply: getStep1WelcomeMessage(), sessionStep: 'PASSENGER_FIRST' };
    }
    const msg = isStep1(state.current_step) ? getStepPrompt(state) : (state.current_step === 'AWAITING_CARD' ? getWelcomeMessage() : "Répondez à la question ci-dessus pour continuer.");
    return { reply: msg, sessionStep: state.current_step };
  }

  // Premier message type "Bonjour" → démarrer l'Étape 1 (collecte mandat)
  if (state.current_step === 'AWAITING_CARD' && isBonjourLike(text)) {
    startStep1Collect(phoneNumber);
    return { reply: getStep1WelcomeMessage(), sessionStep: 'PASSENGER_FIRST' };
  }

  // Étape CONFIRM_DATE → on a besoin de l'éligibilité pour le verdict
  let flightEligible: boolean | undefined;
  let verdictReason: string | undefined;
  if (state.current_step === 'CONFIRM_DATE' && state.flight_data?.flightNumber) {
    const elig = await getFlightEligibility(state.flight_data.flightNumber);
    flightEligible = elig.eligible && (elig.amount ?? 0) >= 600;
    verdictReason = elig.eligible ? undefined : 'Retard insuffisant ou vol non éligible (météo, grève externe, etc.)';
  }

  // Question naturelle (pas OUI/NON/chiffre/date) → Gemini pour répondre puis ramener à l'étape
  const isStructured =
    /^(OUI|NON)$/i.test(text) ||
    /^\d+$/.test(text) ||
    /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text);
  let geminiSideAnswer: string | undefined;
  if (!isStructured && text.length > 2 && !isStep1(state.current_step)) {
    try {
      const stepInstruction =
        state.current_step === 'AWAITING_CARD'
          ? "Demander d'envoyer une photo de la carte d'embarquement."
          : state.current_step === 'CONFIRM_FLIGHT'
            ? "Demander de confirmer le vol (OUI/NON)."
            : state.current_step === 'CHECK_CONNECTION'
              ? "Demander s'il y avait une correspondance (OUI/NON)."
              : state.current_step === 'ASK_PASSENGERS'
                ? "Demander le nombre de passagers (1-20)."
                : state.current_step === 'CONFIRM_DATE'
                  ? "Demander de confirmer la date ou la corriger (JJ/MM/AAAA)."
                  : "Proposer d'envoyer une nouvelle photo pour un autre vol.";
      geminiSideAnswer = await answerInTunnel(text, state.current_step, stepInstruction);
    } catch (e) {
      console.error('Tunnel Gemini side-answer error:', e);
    }
  }

  const { reply, state: nextState } = processUserReply(phoneNumber, text, {
    flightEligible,
    verdictReason,
    geminiSideAnswer,
  });

  return { reply, sessionStep: nextState.current_step };
}
