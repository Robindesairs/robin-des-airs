/**
 * /api/ocr-piece — lecture OCR d'une pièce d'identité depuis la VOIE WEB (depot-express.html).
 *
 * Le bot WhatsApp lit les passeports via Claude/GPT-4o (railway/server.js) ; cette fonction
 * offre le MÊME cheminement au tunnel web : le client glisse son passeport, on pré-remplit
 * nom/prénom/date de naissance, il confirme d'un tap. Prompt et normalisation IDENTIQUES
 * au bot (mêmes règles MRZ / passeports anglophones) pour une qualité de lecture égale.
 *
 * POST { dataBase64, mime } (image uniquement — un PDF est déposé sans OCR côté web)
 * → 200 { ok:true, piece:{ name, prenom, nom, dob, expiry, adresse, sexe, lieuNaissance, docType, face } }
 * → 200 { ok:false } si illisible (la page bascule en saisie manuelle — jamais bloquant)
 *
 * Sécurité / coûts : CORS restreint au site (pas de '*'), image ≤ ~4 Mo, aucun stockage ici
 * (la pièce n'est conservée qu'au dépôt final via /api/depot-upload, une fois la réf créée).
 */

const SITE_ORIGINS = ['https://robindesairs.eu', 'https://www.robindesairs.eu'];
const corsFor = (event) => {
  const o = String((event && event.headers && (event.headers.origin || event.headers.Origin)) || '').trim();
  const allow = SITE_ORIGINS.includes(o) ? o : 'https://robindesairs.eu';
  return { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allow, Vary: 'Origin', 'Access-Control-Allow-Headers': 'Content-Type' };
};

// ── Prompt IDENTIQUE au bot (railway/server.js _OCR_PASSPORT_PROMPT) ──
const OCR_PASSPORT_PROMPT = `Tu lis une pièce d'identité (PASSEPORT, carte nationale d'identité, titre de séjour, carte de résident…) — utilise aussi la zone MRZ en bas si présente. La pièce peut être rédigée UNIQUEMENT EN ANGLAIS (ex. passeports nigérian, ghanéen, gambien, sierra-léonais, libérien) ou bilingue français/anglais (ex. cartes CEDEAO/ECOWAS) : les libellés anglais ci-dessous sont donc à traiter EXACTEMENT comme leurs équivalents français, pas comme un repli en cas d'échec. Réponds UNIQUEMENT en JSON :
{"nom":"","prenom":"","date_naissance":"","lieu_naissance":"","date_expiration":"","adresse":"","pays_adresse":"","sexe":"","type_piece":"","face":""}
Règles (libellé FR / EN équivalent) :
- nom : nom de famille en MAJUSCULES. Champ "Nom" / "Surname" / "Name" / "Last name".
- prenom : prénom(s). Champ "Prénom(s)" / "Given name(s)" / "First name(s)" / "Forename(s)".
- date_naissance : format JJ/MM/AAAA. Champ "Né(e) le" / "Date de naissance" / "Date of birth" / "DOB". Convertis depuis la MRZ (AAMMJJ) si besoin, en déduisant le siècle logiquement (une naissance est dans le passé).
- lieu_naissance : UNIQUEMENT le champ explicitement étiqueté "Lieu de naissance" / "Né(e) à" / "Place of birth" / "Birth place" (ville, et pays si indiqué). Recopie tel quel. Si aucun champ n'est étiqueté ainsi, mets "" — ne prends JAMAIS une ville de l'adresse ou du domicile.
- date_expiration : date de fin de validité, format JJ/MM/AAAA. Champ "Date d'expiration" / "Valable jusqu'au" / "Date of expiry" / "Expiration date" / "Valid until" (depuis la MRZ ou le champ imprimé). Si absente, "".
- adresse : UNIQUEMENT le champ explicitement étiqueté "Adresse" / "Domicile" / "Address" / "Residential address" (hors MRZ). Recopie tel quel sur une seule ligne. Si absent, "".
- ATTENTION : lieu_naissance et adresse sont deux champs DIFFÉRENTS — ne mets jamais la même ville dans les deux sauf si les deux champs étiquetés l'indiquent vraiment. Une ville sans étiquette claire = "".
- pays_adresse : le PAYS DE RÉSIDENCE, UNIQUEMENT s'il est écrit DANS le champ Adresse/Domicile (ex. "France", "Belgique", "Sénégal"). N'utilise JAMAIS la nationalité, le pays émetteur du document ni la MRZ (une personne peut être ressortissante d'un pays et résider dans un autre). Si le pays n'est pas écrit dans l'adresse, "".
- sexe : "M" ou "F". Champ "Sexe" / "Sex" / "Gender", ou la lettre de la MRZ : M, F ou X. Si X ou inconnu, "".
- type_piece : "passeport" (Passport), "cni" (carte nationale d'identité / National ID Card / Identity Card), "titre_sejour" (titre de séjour / Residence permit / Residence card) ou "" si incertain.
- face : pour une CNI, "recto" (face avec la photo du titulaire / front), "verso" (face arrière : adresse et/ou MRZ / back), ou "deux" si les deux faces sont visibles sur l'image. Pour un passeport : "recto".
- Champ inconnu = "". Ne JAMAIS inventer, y compris si le document est entièrement en anglais.`;

// ── Normalisation IDENTIQUE au bot (_normalizePassportOcr) ──
function normalizePassportOcr(p) {
  if (!p) return null;
  const prenom = (p.prenom || '').toUpperCase().trim();
  const nom = (p.nom || '').toUpperCase().trim();
  const name = [prenom, nom].filter(Boolean).join(' ').trim();
  const dob = (p.date_naissance || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/) ? p.date_naissance : '';
  const expiry = (p.date_expiration || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/) ? p.date_expiration : '';
  const adresse = (p.adresse || '').trim();
  const sx = (p.sexe || '').trim().toUpperCase().charAt(0);
  const sexe = (sx === 'M' || sx === 'F') ? sx : '';
  let lieuNaissance = (p.lieu_naissance || '').trim();
  if (lieuNaissance && adresse && lieuNaissance.toLowerCase() === adresse.toLowerCase()) lieuNaissance = '';
  const docType = ['passeport', 'cni', 'titre_sejour'].includes((p.type_piece || '').trim().toLowerCase()) ? (p.type_piece || '').trim().toLowerCase() : '';
  const face = ['recto', 'verso', 'deux'].includes((p.face || '').trim().toLowerCase()) ? (p.face || '').trim().toLowerCase() : '';
  const pays = (p.pays_adresse || '').trim();
  return { name, prenom, nom, dob, expiry, adresse, pays, sexe, lieuNaissance, docType, face };
}

async function ocrClaude(b64, mime) {
  const key = (process.env.ANTHROPIC_API_KEY || '').trim(); if (!key) return null;
  try {
    const model = process.env.PASSPORT_CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model, max_tokens: 400, temperature: 0,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } },
          { type: 'text', text: OCR_PASSPORT_PROMPT },
        ] }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const txt = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return normalizePassportOcr(JSON.parse(m[0]));
  } catch (_) { return null; }
}

async function ocrGpt(b64, mime) {
  const key = (process.env.OPENAI_API_KEY || '').trim(); if (!key) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 200, temperature: 0, response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: [
          { type: 'text', text: OCR_PASSPORT_PROMPT },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } },
        ] }],
      }),
    });
    const data = await res.json(); if (!data.choices) return null;
    return normalizePassportOcr(JSON.parse(data.choices[0].message.content));
  } catch (_) { return null; }
}

exports.handler = async (event) => {
  const H = corsFor(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: H, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: H, body: JSON.stringify({ error: 'POST only' }) };
  let b; try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'bad json' }) }; }
  const mime = String(b.mime || '').toLowerCase();
  const data = String(b.dataBase64 || '');
  if (!data) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'image requise' }) };
  if (!/^image\/(jpe?g|png|webp)$/.test(mime)) return { statusCode: 415, headers: H, body: JSON.stringify({ error: 'Envoyez une photo (JPEG/PNG).' }) };
  if (data.length > 5_600_000) return { statusCode: 413, headers: H, body: JSON.stringify({ error: 'Photo trop volumineuse (max ~4 Mo).' }) };
  // Claude primary (meilleur sur MRZ / passeports non-UE), gpt-4o en repli — comme le bot.
  const piece = (await ocrClaude(data, mime)) || (await ocrGpt(data, mime));
  if (!piece || (!piece.name && !piece.dob)) return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false }) };
  return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, piece }) };
};
