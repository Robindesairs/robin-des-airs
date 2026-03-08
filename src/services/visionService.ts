/**
 * Service Vision — OCR carte d'embarquement avec Gemini 1.5 Flash.
 * Extrait : numéro de vol, date du vol, nom du passager.
 * Variable d'environnement : GEMINI_API_KEY
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-1.5-flash';

export interface BoardingPassExtraction {
  flightNumber: string | null;
  date: string | null;
  passengerName: string | null;
  raw?: string;
}

const VISION_PROMPT = `Tu es un assistant OCR. Analyse cette image de carte d'embarquement (boarding pass) et extrais les informations suivantes.

Retourne UNIQUEMENT un objet JSON avec exactement ces clés (sans autre texte, sans markdown) :
- "flightNumber" : numéro du vol (ex: AF718, BA123) — 2 lettres suivies de chiffres
- "date" : date du vol au format JJ/MM/AAAA
- "passengerName" : nom complet du passager tel qu'affiché sur la carte (prénom et nom)

Si tu ne peux pas lire un champ, mets null pour ce champ.
Réponds uniquement par le JSON, rien d'autre.`;

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY manquant');
  return key;
}

/**
 * Envoie l'image à Gemini 1.5 Flash et extrait numéro de vol, date et nom du passager.
 */
export async function extractBoardingPassFromImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<BoardingPassExtraction> {
  const data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const apiKey = getApiKey();
  const url = `${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inlineData: { mimeType: mimeType || 'image/jpeg', data } },
            { text: VISION_PROMPT },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini Vision API error: ${res.status} ${err}`);
  }

  const json = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

  try {
    const clean = text.replace(/```json?\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(clean) as {
      flightNumber?: string | null;
      date?: string | null;
      passengerName?: string | null;
    };
    return {
      flightNumber: parsed.flightNumber ?? null,
      date: parsed.date ?? null,
      passengerName: parsed.passengerName ?? null,
      raw: text,
    };
  } catch {
    const flightMatch = text.match(/\b([A-Z]{2}\s*\d{2,4})\b/i);
    return {
      flightNumber: flightMatch ? flightMatch[1].replace(/\s/g, '') : null,
      date: null,
      passengerName: null,
      raw: text,
    };
  }
}
