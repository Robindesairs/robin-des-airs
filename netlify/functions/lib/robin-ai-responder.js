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

// Cas sensibles → on bascule vers un humain (rappel expert) plutôt que l'IA.
// (sans accent toléré : "parler a quelqu'un", "etre rappele"…)
const SENSITIVE = /(avocat|tribunal|procès|proc[eè]dure judiciaire|plainte|porter plainte|litige|rembours[eé].*refus|données personnelles|supprim.*donn|réclamation contre robin|remboursez[ -]?moi|parler\s+[àa]\s+(quelqu|un humain|une personne|un conseiller|un agent|un expert)|je veux parler|joindre\s+(quelqu|un humain|un conseiller|un agent)|un (vrai )?humain|[êe]tre rappel|me rappeler|rappelez[ -]?moi|num[ée]ro de t[ée]l)/i;

function isSensitive(text) {
  return SENSITIVE.test(text || '');
}

// Heuristique : est-ce une question libre (hors script) plutôt qu'une sélection ?
// IMPORTANT : les réponses par bouton/liste reviennent sous forme de TITRE multi-mots
// (« D'un aéroport en Europe », « Refus d'embarquement »…). On ne se fie donc PAS au
// nombre de mots — uniquement à « ? » ou à un mot interrogatif en début de message.
// Les titres de boutons n'ont jamais de « ? » et ne commencent pas par un interrogatif.
const INTERROGATIVE = /^\s*(combien|comment|pourquoi|quand|où|est-?ce|c'?est quoi|qu'?est|quel|quelle|quels|quelles|puis-?je|peut-?on|vous prenez|ça coûte|ca coute|c'?est gratuit|j'?ai droit|ai-?je droit|que faire|faut-?il)/i;
// Mots-clés FAQ détectés N'IMPORTE OÙ dans le message (sans risque sur les titres de
// boutons, qui ne contiennent aucun de ces mots).
const FAQ = /(arnaque|escroc|fiable|s[ée]rieux|garantie|confiance|combien|c'?est quoi|fonctionne|(ç|c|s)a\s*marche|(ça|ca)\s*(coûte|coute)|\bprix\b|tarif|gratuit|payer|d[ée]lai|rembours|\bdroit\b|éligib|eligib|comment|pourquoi)/i;
function isClientQuestion(text) {
  const t = (text || '').trim();
  if (!t) return false;
  if (/^\d+$/.test(t)) return false;     // sélection numérique → script
  if (t.length < 5) return false;        // trop court (oui/non)
  if (t.includes('?')) return true;      // question explicite
  if (INTERROGATIVE.test(t)) return true; // mot interrogatif en tête
  if (FAQ.test(t)) return true;          // mot-clé FAQ n'importe où
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
