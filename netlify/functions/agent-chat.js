/**
 * POST /api/agent-chat
 * Chat IA en direct pour le bureau Robin des Airs (site public robindesairs.eu).
 * Proxy vers l'API Claude — la clé reste côté serveur (process.env.ANTHROPIC_API_KEY).
 *
 * Entrée  : { messages: [{role:"user"|"assistant", content:"..."}], agent?: "veille"|"enquete"|"surveillance" }
 * Sortie  : { ok:true, reply:"..." }  ou  { ok:false, error:"..." }
 *
 * - Cache de prompt sur le system prompt (préfixe stable → ~0.1x sur les requêtes répétées).
 * - Outil serveur web_search activé → l'assistant peut vérifier une info récente (grèves, météo, vol).
 * - Gère pause_turn (boucle serveur des outils) en relançant la requête.
 *
 * Variables Netlify :
 *   ANTHROPIC_API_KEY   — clé API Anthropic (obligatoire, reste côté serveur)
 *   AGENT_CHAT_MODEL    — (optionnel) id de modèle ; défaut claude-opus-4-8.
 *                         Pour réduire le coût/latence d'un chat public : claude-haiku-4-5.
 */

const API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-opus-4-8';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const fail = (error, status = 200) => ({
  statusCode: status,
  headers: HEADERS,
  body: JSON.stringify({ ok: false, error }),
});

const SYSTEM_PROMPT = `Tu es l'assistant IA de **Robin des Airs**, cabinet d'indemnisation aérienne au titre du Règlement (CE) n° 261/2004 (jusqu'à 600 € par passager). Spécialité : vols retardés (+3h à l'arrivée), annulés ou surbookés, principalement sur l'axe Europe ↔ Afrique (de l'Ouest et Maghreb).

RÔLE
- Tu réponds aux questions de l'équipe et de la direction depuis le tableau de bord interne ("le bureau").
- Tu connais le métier : éligibilité CE261, montants forfaitaires (250/400/600 € selon distance), circonstances extraordinaires, prescription, mandat de représentation, mise en demeure, médiation, contentieux.
- Tu peux expliquer le fonctionnement des 3 agents de veille/enquête qui tournent en arrière-plan :
  1. **Veille actu vols** (chaque matin) — scanne grèves (contrôleurs aériens, compagnies, aéroports), météo à fort impact, mouvements sociaux et actualité juridique pouvant affecter les vols.
  2. **Enquêteur retard** (à la demande) — constitue un dossier de preuves sur un vol : statut réel, rotation de l'appareil, autres vols perturbés au même aéroport, cause probable, qualification "circonstance extraordinaire", captures FlightRadar24, témoignages passagers, demande de certificat de retard.
  3. **Surveillance retards** (plusieurs fois par jour) — lit les dossiers du jour dans Airtable, détecte les retards ≥ 1h30 et déclenche une enquête + alerte.

STYLE
- Réponds en français, de façon claire, concise et factuelle. Va droit au but.
- Quand l'info dépend de l'actualité (grève en cours, statut d'un vol, météo, jurisprudence récente), utilise l'outil de recherche web avant de répondre plutôt que de répondre de mémoire, et cite tes sources.
- Tu n'es pas avocat : pour un conseil juridique engageant, recommande la validation par un juriste de Robin des Airs.
- Ne divulgue jamais de données personnelles de passagers et n'invente aucun chiffre de dossier.`;

const AGENT_HINTS = {
  veille: "L'utilisateur consulte le panneau Veille actu vols. Oriente ta réponse vers la veille (grèves, météo, perturbations).",
  enquete: "L'utilisateur consulte l'Enquêteur retard. Oriente ta réponse vers la constitution d'un dossier de preuves sur un vol.",
  surveillance: "L'utilisateur consulte la Surveillance retards. Oriente ta réponse vers le suivi des dossiers du jour et la détection de retards.",
};

// Normalise et borne l'historique reçu du client.
function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  for (const m of raw.slice(-20)) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const content = typeof m.content === 'string' ? m.content.trim() : '';
    if (!content) continue;
    out.push({ role: m.role, content: content.slice(0, 8000) });
  }
  // L'API exige que le 1er message soit "user".
  while (out.length && out[0].role !== 'user') out.shift();
  return out.length ? out : null;
}

async function callClaude(apiKey, model, system, messages) {
  const body = {
    model,
    max_tokens: 1500,
    system,
    messages,
    tools: [{ type: 'web_search_20260209', name: 'web_search' }],
  };
  // effort: réduit latence/coût pour un chat ; non supporté sur Haiku.
  if (!/haiku/i.test(model)) body.output_config = { effort: 'low' };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = (json && json.error && json.error.message) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

// Extrait le texte final (concatène les blocs text de la réponse).
function extractText(content) {
  if (!Array.isArray(content)) return '';
  return content
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('')
    .trim();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return fail('POST uniquement', 405);

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey) return fail('ANTHROPIC_API_KEY manquant côté serveur (à configurer dans Netlify).');

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch { return fail('JSON invalide'); }

  const messages = sanitizeMessages(payload.messages);
  if (!messages) return fail('Aucun message valide (attendu : messages:[{role,content}]).');

  const model = (process.env.AGENT_CHAT_MODEL || DEFAULT_MODEL).trim();

  // System prompt avec cache (préfixe stable) + indice d'agent volatile après le breakpoint.
  const system = [
    { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
  ];
  const hint = AGENT_HINTS[payload.agent];
  if (hint) system.push({ type: 'text', text: hint });

  try {
    let response = await callClaude(apiKey, model, system, messages);

    // Outil serveur (web_search) : la boucle serveur peut rendre pause_turn → on relance.
    let guard = 0;
    const convo = messages.slice();
    while (response.stop_reason === 'pause_turn' && guard < 4) {
      convo.push({ role: 'assistant', content: response.content });
      response = await callClaude(apiKey, model, system, convo);
      guard += 1;
    }

    const reply = extractText(response.content);
    if (!reply) return fail("L'assistant n'a pas produit de réponse exploitable.");

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, reply }) };
  } catch (e) {
    console.error('agent-chat error:', e.message);
    return fail(e.message || 'Erreur inattendue');
  }
};
