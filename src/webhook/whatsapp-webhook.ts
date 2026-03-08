/**
 * Handler du tunnel conversationnel Robin (WhatsApp).
 * Utilise sessionManager (robin.db), geminiService (OCR + réponses naturelles), whatsappService (éligibilité).
 * À appeler depuis un serveur Node/TS ayant accès à robin.db et GEMINI_API_KEY.
 */

import { getOrCreateSession, processUserReply, setFlightFromOcr, getConfirmFlightMessage, getWelcomeMessage } from '../services/sessionManager';
import { extractBoardingPass, answerInTunnel } from '../services/geminiService';
import { getFlightEligibility } from '../services/whatsappService';

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

  // Image : OCR Gemini puis passage à CONFIRM_FLIGHT
  if (imageBase64) {
    try {
      const ocr = await extractBoardingPass(imageBase64, imageMimeType || 'image/jpeg');
      if (ocr.flightNumber) {
        setFlightFromOcr(phoneNumber, ocr.flightNumber, ocr.date ?? undefined);
        const reply = getConfirmFlightMessage(ocr.flightNumber);
        return { reply, sessionStep: 'CONFIRM_FLIGHT' };
      }
    } catch (e) {
      console.error('Tunnel OCR error:', e);
      return {
        reply: "Je n'ai pas pu lire la carte d'embarquement. Pouvez-vous renvoyer une photo plus nette ?",
        sessionStep: 'AWAITING_CARD',
      };
    }
    return {
      reply: "Je ne détecte pas de numéro de vol sur cette image. Envoyez une photo claire de votre carte d'embarquement.",
      sessionStep: 'AWAITING_CARD',
    };
  }

  // Pas de texte : renvoyer le message d'accueil ou l'étape en cours
  if (!text) {
    const state = getOrCreateSession(phoneNumber);
    const welcome = state.current_step === 'AWAITING_CARD' ? getWelcomeMessage() : "Répondez à la question ci-dessus pour continuer.";
    return { reply: welcome, sessionStep: state.current_step };
  }

  const state = getOrCreateSession(phoneNumber);

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
  if (!isStructured && text.length > 2) {
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
