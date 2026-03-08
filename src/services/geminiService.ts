/**
 * Intégration Gemini 1.5 Flash — OCR carte d'embarquement + réponses naturelles dans le tunnel Robin.
 * Variable d'environnement : GEMINI_API_KEY
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-1.5-flash';

export interface BoardingPassOcrResult {
  flightNumber: string | null;
  date: string | null;
  raw?: string;
}

const OCR_SYSTEM_PROMPT = `Tu es un assistant qui extrait des informations d'une photo de carte d'embarquement (boarding pass).
Extrait UNIQUEMENT les champs suivants au format JSON, sans autre texte :
- "flightNumber" : numéro du vol (ex: AF718, BA123) — 2 lettres + chiffres
- "date" : date du vol au format JJ/MM/AAAA

Si tu ne peux pas lire un champ, mets null pour ce champ.
Réponds uniquement avec le JSON, rien d'autre.`;

const TUNNEL_SYSTEM_PREFIX = `Tu es Robin 🏹, l'assistant de Robin des Airs. Tu aides les clients à récupérer leur indemnité (jusqu'à 600€) en cas de vol retardé ou annulé.
Tu es actuellement dans un tunnel conversationnel. Étape actuelle : `;

const TUNNEL_SYSTEM_SUFFIX = `
Règles :
- Réponds brièvement et amicalement aux questions (tarifs, délais, processus).
- Tarifs : 25% de commission en cas de succès, 0€ si on ne gagne pas. Indemnité légale jusqu'à 600€/passager.
- À la fin de ta réponse, ramène TOUJOURS le client vers l'étape en cours (une seule phrase du type "Pour continuer, [instruction de l'étape]").
- Ne sors pas du cadre Robin des Airs.`;

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY manquant');
  return key;
}

/**
 * Envoie une requête à l'API Gemini generateContent.
 */
async function generateContent(parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>, systemInstruction?: string): Promise<string> {
  const apiKey = getApiKey();
  const url = `${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`;
  const body: { contents: Array<{ parts: unknown[] }>; systemInstruction?: { parts: Array<{ text: string }> } } = {
    contents: [{ parts: parts.map((p) => (p.text ? { text: p.text } : { inlineData: p.inlineData })) }],
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  return text;
}

/**
 * OCR d'une image de carte d'embarquement (base64). Retourne flightNumber et date.
 */
export async function extractBoardingPass(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<BoardingPassOcrResult> {
  const data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const text = await generateContent(
    [
      { inlineData: { mimeType: mimeType || 'image/jpeg', data } },
      { text: OCR_SYSTEM_PROMPT },
    ]
  );
  try {
    const json = JSON.parse(text) as { flightNumber?: string | null; date?: string | null };
    return {
      flightNumber: json.flightNumber ?? null,
      date: json.date ?? null,
      raw: text,
    };
  } catch {
    const flightMatch = text.match(/\b([A-Z]{2}\s*\d{2,4})\b/i);
    return {
      flightNumber: flightMatch ? flightMatch[1].replace(/\s/g, '') : null,
      date: null,
      raw: text,
    };
  }
}

/**
 * Répond à une question naturelle du client tout en restant dans le tunnel.
 * currentStep et stepInstruction décrivent l'étape en cours pour ramener le client.
 */
export async function answerInTunnel(userMessage: string, currentStep: string, stepInstruction: string): Promise<string> {
  const systemInstruction = TUNNEL_SYSTEM_PREFIX + currentStep + '.\n' + stepInstruction + TUNNEL_SYSTEM_SUFFIX;
  const reply = await generateContent([{ text: userMessage }], systemInstruction);
  return reply;
}
