/**
 * Responder IA "hors-tunnel" pour le bot WhatsApp Robin des Airs.
 * Répond en langage naturel aux questions libres des clients (FAQ, éligibilité,
 * frais, statut) via OpenAI GPT-4o-mini — SANS casser l'entonnoir d'ouverture de
 * dossier. Garde-fous : pas de montant ferme promis, pas de conseil juridique
 * engageant, bascule humaine sur les cas sensibles.
 *
 * Variables : OPENAI_API_KEY (déjà utilisée par whatsapp-gemini-fallback.js).
 */

const MODEL = 'gpt-4o-mini';

const SYSTEM = `Tu es l'assistant WhatsApp de Robin des Airs, service d'indemnisation des passagers aériens au titre du Règlement (CE) n° 261/2004, surtout sur l'axe Europe ↔ Afrique.

CE QUE TU SAIS :
- Indemnisation jusqu'à 600 € par passager pour un vol retardé (+3h à l'arrivée), annulé, ou refus d'embarquement, sur les vols couverts par la loi européenne.
- Zéro frais d'avance. Robin ne prend une commission (25 %) QUE si le dossier est gagné.
- On a 3 ans (parfois plus) pour réclamer.
- Le client ouvre son dossier directement ici, en quelques minutes.

RÈGLES STRICTES :
- Réponds dans la langue du client (français par défaut), de façon courte, chaleureuse et claire (2-4 phrases max, adapté à WhatsApp).
- N'annonce JAMAIS un montant ferme garanti : dis "jusqu'à 600 €" et "selon la distance et la situation".
- Tu n'es pas avocat : ne donne pas de conseil juridique engageant ni de promesse de résultat.
- N'invente aucune donnée de dossier, aucun statut, aucun chiffre.
- Termine en invitant à ouvrir/continuer le dossier (ex : "Voulez-vous que je vous aide à ouvrir votre dossier ? Tapez *menu*.").`;

// Cas sensibles → on bascule vers un humain plutôt que de laisser l'IA répondre.
const SENSITIVE = /(avocat|tribunal|procès|proc[eè]dure judiciaire|plainte|litige|rembours[eé].*refus|données personnelles|RGPD|supprim.*donn|porter plainte|parler à (quelqu'un|un humain|un conseiller|un agent)|réclamation contre robin|remboursez-moi|arnaque|escroquerie)/i;

function isSensitive(text) {
  return SENSITIVE.test(text || '');
}

// Heuristique : est-ce une question libre (hors script) plutôt qu'une sélection ?
// IMPORTANT : les réponses par bouton/liste reviennent sous forme de TITRE multi-mots
// (« D'un aéroport en Europe », « Refus d'embarquement »…). On ne se fie donc PAS au
// nombre de mots — uniquement à « ? » ou à un mot interrogatif en début de message.
// Les titres de boutons n'ont jamais de « ? » et ne commencent pas par un interrogatif.
const INTERROGATIVE = /^\s*(combien|comment|pourquoi|pourquoi|quand|où|ou\b|est-?ce|c'?est quoi|qu'?est|quel|quelle|quels|quelles|puis-?je|peut-?on|vous prenez|ça coûte|ca coute|c'?est gratuit|j'?ai droit|ai-?je droit|que faire|faut-?il)/i;
function isClientQuestion(text) {
  const t = (text || '').trim();
  if (!t) return false;
  if (/^\d+$/.test(t)) return false;     // sélection numérique → script
  if (t.length < 6) return false;        // trop court (oui/non/menu)
  if (t.includes('?')) return true;      // question explicite
  if (INTERROGATIVE.test(t)) return true; // commence par un mot interrogatif
  return false;
}

async function answerClientQuestion(text, apiKey) {
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        temperature: 0.5,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: String(text || '').slice(0, 2000) },
        ],
      }),
    });
    const json = await res.json().catch(() => ({}));
    return json.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error('robin-ai-responder failed', e.message);
    return null;
  }
}

module.exports = { isClientQuestion, isSensitive, answerClientQuestion };
