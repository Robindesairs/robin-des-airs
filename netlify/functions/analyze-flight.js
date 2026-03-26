// Robin des Airs — Analyse de conversation WhatsApp
// POST /api/analyze-flight
// Body: { conversation: "texte brut de la conversation" }
// Retourne: données passager + éligibilité CE 261/2004 + URL mandat pré-rempli

const BASE_URL = "https://robin-des-airs.netlify.app";

// ─── CE 261/2004 — Règles d'éligibilité ──────────────────────────────────────
// Distance IATA approximée pour les routes fréquentes diaspora africaine
const KNOWN_ROUTES_KM = {
  "CDG-ABJ": 5135, "CDG-DKR": 4120, "CDG-CMN": 1740, "CDG-TUN": 1737,
  "CDG-ALG": 1688, "CDG-LOS": 4983, "CDG-ACC": 5103, "CDG-DLA": 5490,
  "CDG-BKO": 4460, "CDG-OUA": 4515, "CDG-CON": 5665, "CDG-TNR": 8675,
  "CDG-JNB": 9050, "CDG-NIM": 4344, "CDG-LFW": 4984,
  "ORY-ABJ": 5120, "ORY-DKR": 4100, "ORY-CMN": 1740,
  "LHR-LOS": 5000, "LHR-ACC": 5110, "LHR-JNB": 9080,
  "AMS-ABJ": 5189, "AMS-LOS": 5058, "AMS-ACC": 5179,
  "BRU-CMN": 1936, "BRU-ABJ": 5240, "BRU-DKR": 4180,
  "MAD-DKR": 2800, "MAD-CMN": 1710,
  "MRS-ALG": 1340, "MRS-TUN": 1560,
  "NCE-CMN": 1760, "LYS-CMN": 1810,
};

function getDistanceKm(iataFrom, iataTo) {
  const key1 = `${iataFrom}-${iataTo}`;
  const key2 = `${iataTo}-${iataFrom}`;
  return KNOWN_ROUTES_KM[key1] || KNOWN_ROUTES_KM[key2] || null;
}

// Compagnies aériennes UE (liste principale)
const EU_CARRIERS = [
  "AF","TO","VY","FR","U2","LH","KL","IB","AZ","SK","LX","OS","SN","TP",
  "TK","EI","DY","W6","HV","PC","BT","OU","OK","LO","RO","A3","OA","PS"
];

function isEuCarrier(iataCode) {
  return EU_CARRIERS.includes((iataCode || "").toUpperCase());
}

// Aéroports UE (liste principale)
const EU_AIRPORTS = [
  "CDG","ORY","BVA","LYS","MRS","NCE","TLS","BOD","NTE","SXB",
  "LHR","LGW","STN","MAN","BHX","EDI","GLA",
  "AMS","EIN","RTM",
  "FRA","MUC","BER","HAM","DUS","CGN","STR",
  "MAD","BCN","PMI","AGP","ALC","VLC","LPA","TFS",
  "FCO","MXP","LIN","NAP","VCE","BGY","CTA",
  "BRU","CRL",
  "ZRH","GVA","BSL",
  "LIS","OPO","FAO",
  "ATH","HER","SKG","RHO",
  "WAW","KRK","WMI","GDN",
  "PRG","VIE","BUD","BTS",
  "HEL","ARN","OSL","CPH","GOT",
  "DUB","SNN","ORK",
  "RIX","TLL","VNO",
  "BEG","SOF","OTP","SKP"
];

function isEuAirport(iataCode) {
  return EU_AIRPORTS.includes((iataCode || "").toUpperCase());
}

// Calcul indemnité CE 261/2004
function calcIndemnite(distKm, delayHours) {
  if (!distKm) return 600; // défaut si distance inconnue (route longue courante)
  if (distKm <= 1500) return 250;
  if (distKm <= 3500) return 400;
  // > 3500 km
  if (delayHours && delayHours >= 3 && delayHours < 4) return 300; // réduit 50%
  return 600;
}

// ─── Extraction via Claude Haiku (Anthropic API) ─────────────────────────────
async function extractWithClaude(conversation, anthropicKey) {
  const systemPrompt = `Tu es un expert en droits des passagers aériens (CE 261/2004).
Ton rôle : extraire les informations de vol depuis une conversation WhatsApp.
Tu réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte avant ou après.`;

  const userPrompt = `Analyse cette conversation et extrais les informations de vol :

CONVERSATION:
${conversation}

Réponds avec exactement cet objet JSON (champs vides = chaîne vide "") :
{
  "name": "Nom complet passager principal",
  "phone": "Téléphone avec indicatif ex: +33612345678",
  "email": "Email",
  "address": "Adresse postale",
  "vol": "Numéro de vol ex: AF712",
  "date": "Date vol JJ/MM/AAAA",
  "iata_from": "Code IATA départ ex: CDG",
  "iata_to": "Code IATA arrivée ex: ABJ",
  "route": "Route lisible ex: Paris CDG → Abidjan ABJ",
  "compagnie": "Nom complet compagnie ex: Air France",
  "iata_carrier": "Code IATA compagnie ex: AF",
  "pnr": "Code PNR réservation",
  "motif": "Motif en français ex: Retard de 5 heures",
  "motif_en": "Motif en anglais ex: 5-hour delay",
  "delay_hours": 0,
  "problem_type": "delay",
  "nbpax": 1,
  "paxlist": "Autres passagers séparés par virgule",
  "confidence": "high"
}

Valeurs pour problem_type : delay | cancellation | denied_boarding | unknown
Valeurs pour confidence : high | medium | low`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });

  const data = await resp.json();

  if (data.error) throw new Error(`Claude API error: ${data.error.message || JSON.stringify(data.error)}`);
  if (!data.content || data.content.length === 0) throw new Error("Claude: réponse vide");

  const raw = data.content[0]?.text || "";
  if (!raw) throw new Error("Claude: texte vide");

  // Extraire le JSON (Claude respecte généralement le format, mais on sécurise)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Claude: pas de JSON dans: ${raw.substring(0, 200)}`);

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`Claude: JSON invalide: ${e.message}`);
  }

  const filledFields = Object.values(parsed).filter(v => v && v !== "" && v !== "unknown" && v !== 0).length;
  if (filledFields < 2) throw new Error(`Claude: extraction insuffisante (${filledFields} champs)`);

  return parsed;
}

// ─── Fallback extraction par regex ──────────────────────────────────────────
function extractWithRegex(conversation) {
  const result = {};
  const text = conversation;

  // Numéro de vol: AF712, DL4500, EK234, etc.
  const volMatch = text.match(/\b([A-Z]{2}\d{3,4})\b/);
  if (volMatch) result.vol = volMatch[1];

  // Code IATA compagnie depuis le numéro de vol
  if (result.vol) result.iata_carrier = result.vol.substring(0, 2);

  // Codes IATA aéroports (3 lettres majuscules connues)
  const iataPattern = /\b(CDG|ORY|LHR|LGW|AMS|BRU|FRA|MUC|MAD|BCN|FCO|ZRH|GVA|LIS|ATH|DUB|HEL|ARN|CPH|WAW|PRG|VIE|ABJ|DKR|LOS|ACC|CMN|ALG|TUN|DLA|BKO|OUA|CON|FIH|TNR|JNB|NIM|LFW)\b/g;
  const iataCodes = [...text.matchAll(iataPattern)].map(m => m[1]);
  if (iataCodes.length >= 2) {
    result.iata_from = iataCodes[0];
    result.iata_to   = iataCodes[1];
    result.route = `${iataCodes[0]} → ${iataCodes[1]}`;
  } else if (iataCodes.length === 1) {
    // Chercher le contexte : "depuis CDG" ou "vers ABJ"
    const fromMatch = text.match(/(?:depuis|from|départ)\s+([A-Z]{3})/i);
    const toMatch   = text.match(/(?:vers|to|arrivée|destination)\s+([A-Z]{3})/i);
    if (fromMatch) result.iata_from = fromMatch[1];
    if (toMatch)   result.iata_to   = toMatch[1];
    if (!result.iata_from) result.iata_from = iataCodes[0];
  }

  // Nom du passager
  const nameMatch = text.match(/(?:je suis|m'appelle|nom[:\s]+|passager[:\s]+)([A-ZÀÂÉÈÊËÎÏÔÙÛÜÇ][a-zàâéèêëîïôùûüç]+(?:\s+[A-ZÀÂÉÈÊËÎÏÔÙÛÜÇ][a-zàâéèêëîïôùûüç]+)+)/i);
  if (nameMatch) result.name = nameMatch[1];

  // Date: DD/MM/YYYY ou YYYY-MM-DD
  const dateMatch = text.match(/\b(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/);
  if (dateMatch) {
    let d = dateMatch[1];
    if (d.includes("-")) { const [y, m, dd] = d.split("-"); d = `${dd}/${m}/${y}`; }
    result.date = d;
  }

  // Téléphone: +33..., +225..., etc.
  const phoneMatch = text.match(/(\+\d{10,15})/);
  if (phoneMatch) result.phone = phoneMatch[1];

  // PNR: exactement 6 caractères alphanum majuscules (pas un code IATA, pas un numéro de vol)
  const pnrMatch = text.match(/\bPNR[:\s]*([A-Z0-9]{6})\b/i) || text.match(/\b(?:réservation|booking)[:\s]*([A-Z0-9]{6})\b/i);
  if (pnrMatch) result.pnr = pnrMatch[1];

  // Compagnie
  const compMatch = text.match(/(?:Air France|Corsair|Transavia|Air Algérie|Royal Air Maroc|Tunisair|Ethiopian|Kenya Airways|Brussels Airlines|KLM|Lufthansa|Iberia|British Airways|Emirates|Turkish Airlines)/i);
  if (compMatch) { result.compagnie = compMatch[0]; }

  // Retard en heures
  const delayMatch = text.match(/(\d+)\s*h(?:eure|our)?s?\s+(?:de\s+)?(?:retard|delay)/i)
    || text.match(/retard\s+(?:de\s+)?(\d+)\s*h/i);
  if (delayMatch) {
    result.delay_hours = parseInt(delayMatch[1]);
    result.problem_type = "delay";
    result.motif = `Retard de ${delayMatch[1]} heures`;
    result.motif_en = `${delayMatch[1]}-hour delay`;
  }

  // Annulation
  if (/annul[eé]|cancel/i.test(text)) {
    result.problem_type = result.problem_type || "cancellation";
    result.motif = result.motif || "Annulation de vol";
    result.motif_en = result.motif_en || "Flight cancellation";
    result.delay_hours = result.delay_hours || 0;
  }

  // Nombre de passagers
  const paxMatch = text.match(/(\d+)\s+passager/i) || text.match(/(?:nous étions|we were)\s+(\d+)/i);
  result.nbpax = paxMatch ? parseInt(paxMatch[1]) : 1;

  result.confidence = "low";
  return result;
}

// ─── Vérification éligibilité CE 261 ────────────────────────────────────────
function checkEligibility(extracted) {
  const { iata_from, iata_to, iata_carrier, problem_type, delay_hours } = extracted;

  const departEU = isEuAirport(iata_from);
  const arriveEU = isEuAirport(iata_to);
  const carrierEU = isEuCarrier(iata_carrier);

  // Condition géographique CE 261
  const eligible_geo = departEU || (arriveEU && carrierEU);

  // Condition problème
  const delay = parseInt(delay_hours || 0);
  let eligible_problem = false;
  let raison = "";

  if (problem_type === "denied_boarding") {
    eligible_problem = true;
    raison = "Refus d'embarquement";
  } else if (problem_type === "cancellation") {
    eligible_problem = true;
    raison = "Annulation de vol";
  } else if (problem_type === "delay" && delay >= 3) {
    eligible_problem = true;
    raison = `Retard de ${delay}h à destination`;
  } else if (problem_type === "delay" && delay > 0 && delay < 3) {
    eligible_problem = false;
    raison = `Retard de ${delay}h insuffisant (seuil 3h requis)`;
  }

  const eligible = eligible_geo && eligible_problem;

  // Calcul distance et indemnité
  const distKm = getDistanceKm(iata_from, iata_to);
  const indemnite = eligible ? calcIndemnite(distKm, delay) : 0;

  return {
    eligible,
    eligible_geo,
    eligible_problem,
    raison_geo: departEU ? `Départ depuis UE (${iata_from})` : carrierEU ? `Transporteur UE (${iata_carrier})` : `Hors UE`,
    raison_probleme: raison,
    distance_km: distKm,
    indemnite,
    loi: "Règlement CE 261/2004"
  };
}

// ─── Génération URL mandat ───────────────────────────────────────────────────
function buildMandatUrl(extracted, elig) {
  const p = new URLSearchParams();
  if (extracted.name)      p.set("name",      extracted.name);
  if (extracted.phone)     p.set("phone",     extracted.phone);
  if (extracted.email)     p.set("email",     extracted.email);
  if (extracted.address)   p.set("address",   extracted.address);
  if (extracted.vol)       p.set("vol",       extracted.vol);
  if (extracted.date)      p.set("date",      extracted.date);
  if (extracted.route)     p.set("route",     extracted.route);
  if (extracted.motif)     p.set("motif",     extracted.motif);
  if (extracted.motif_en)  p.set("motif_en",  extracted.motif_en);
  if (extracted.pnr)       p.set("pnr",       extracted.pnr);
  if (extracted.compagnie) p.set("compagnie", extracted.compagnie);
  if (extracted.nbpax)     p.set("nbpax",     String(extracted.nbpax));
  if (extracted.paxlist)   p.set("paxlist",   extracted.paxlist);
  if (elig.indemnite)      p.set("indemnite", String(elig.indemnite));

  return `${BASE_URL}/mandat.html?${p.toString()}`;
}

// ─── Handler principal ───────────────────────────────────────────────────────
export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const conversation = (body.conversation || "").trim();
  if (!conversation || conversation.length < 20) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "conversation trop courte ou vide" }) };
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  let extracted;
  let method_used;

  // Tentative extraction Claude, fallback regex
  if (anthropicKey) {
    try {
      extracted = await extractWithClaude(conversation, anthropicKey);
      method_used = "claude";
    } catch (err) {
      console.warn("Claude extraction failed:", err.message);
      extracted = extractWithRegex(conversation);
      method_used = "regex_fallback";
    }
  } else {
    extracted = extractWithRegex(conversation);
    method_used = "regex_no_claude_key";
  }

  // Éligibilité CE 261/2004
  const eligibilite = checkEligibility(extracted);

  // URL mandat pré-rempli
  const mandat_url = eligibilite.eligible ? buildMandatUrl(extracted, eligibilite) : null;

  // Message WhatsApp à renvoyer au client
  let whatsapp_message;
  if (eligibilite.eligible) {
    const nom = extracted.name ? ` ${extracted.name.split(" ")[0]}` : "";
    const vol = extracted.vol || "votre vol";
    const indemnite = eligibilite.indemnite;
    whatsapp_message = `✅ Bonne nouvelle${nom} ! Le vol ${vol} est éligible à une indemnisation de *${indemnite} €* par passager.\n\nPour que nous puissions agir en votre nom, signez votre mandat ici (2 min) :\n${mandat_url}\n\nRobin des Airs — Votre droit, notre mission.`;
  } else {
    const raison = eligibilite.raison_probleme || eligibilite.raison_geo || "critères CE 261/2004 non remplis";
    whatsapp_message = `Après analyse, ce dossier ne remplit pas les critères d'indemnisation CE 261/2004 : ${raison}.\n\nSi vous pensez qu'il y a une erreur, répondez avec plus de détails sur votre vol.`;
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      extracted,
      eligibilite,
      mandat_url,
      whatsapp_message,
      method_used
    })
  };
}
# updated Thu Mar 26 05:16:36 GMT 2026

