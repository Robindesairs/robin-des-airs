/**
 * yousign-init
 * Initialise une demande de signature YouSign pour un dossier Robin des Airs.
 *
 * Variables d'environnement attendues:
 * - YOUSIGN_API_KEY  (obligatoire — clé API Yousign production)
 * - YOUSIGN_BASE_URL (optionnel — défaut : production v3)
 */

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "https://robindesairs.eu",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

function json(statusCode, body) {
  return { statusCode, headers: HEADERS, body: JSON.stringify(body) };
}

function normalizePhone(raw) {
  const digits = String(raw || "").replace(/[^\d+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+")) return digits;
  return `+${digits}`;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS, body: "" };
  if (event.httpMethod !== "POST") return json(405, { error: "Méthode non autorisée" });

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Corps JSON invalide" });
  }

  const apiKey = process.env.YOUSIGN_API_KEY || "";
  const baseUrl = process.env.YOUSIGN_BASE_URL || "https://api.yousign.app/v3";
  if (!apiKey) {
    return json(503, {
      error: "YOUSIGN_API_KEY manquant",
      code: "YOUSIGN_NOT_CONFIGURED",
    });
  }

  const firstName = String(payload.first_name || "").trim() || "Client";
  const lastName = String(payload.last_name || "").trim() || "Robin";
  const email = String(payload.email || "").trim();
  const phone = normalizePhone(payload.phone || "");

  if (!email) return json(400, { error: "Email requis pour YouSign" });

  const dossierLabel = String(payload.label || "Dossier Robin des Airs").trim();

  try {
    // 1) Créer une demande de signature
    const reqRes = await fetch(`${baseUrl}/signature_requests`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: dossierLabel,
        delivery_mode: "none",
      }),
    });

    if (!reqRes.ok) {
      const errTxt = await reqRes.text();
      return json(502, {
        error: "Echec creation signature_request YouSign",
        details: errTxt.slice(0, 600),
      });
    }
    const reqJson = await reqRes.json();
    const signatureRequestId = reqJson.id;
    if (!signatureRequestId) return json(502, { error: "ID signature_request YouSign absent" });

    // 2) Créer un signataire
    const signerRes = await fetch(`${baseUrl}/signature_requests/${signatureRequestId}/signers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        info: {
          first_name: firstName,
          last_name: lastName,
          email,
          phone_number: phone || undefined,
          locale: "fr",
        },
        signature_level: "electronic_signature",
        signature_authentication_mode: "no_otp",
      }),
    });

    if (!signerRes.ok) {
      const errTxt = await signerRes.text();
      return json(502, {
        error: "Echec creation signer YouSign",
        signature_request_id: signatureRequestId,
        details: errTxt.slice(0, 600),
      });
    }
    const signerJson = await signerRes.json();
    const signerId = signerJson.id;
    if (!signerId) return json(502, { error: "ID signer YouSign absent", signature_request_id: signatureRequestId });

    // 3) Récupérer lien de signature
    const linkRes = await fetch(`${baseUrl}/signature_requests/${signatureRequestId}/signers/${signerId}/signing_links`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!linkRes.ok) {
      const errTxt = await linkRes.text();
      return json(502, {
        error: "Echec creation signing_link YouSign",
        signature_request_id: signatureRequestId,
        signer_id: signerId,
        details: errTxt.slice(0, 600),
      });
    }
    const linkJson = await linkRes.json();
    const signingUrl = linkJson?.url || linkJson?.link;
    if (!signingUrl) {
      return json(502, {
        error: "Lien de signature YouSign absent",
        signature_request_id: signatureRequestId,
        signer_id: signerId,
      });
    }

    return json(200, {
      ok: true,
      provider: "yousign",
      signature_request_id: signatureRequestId,
      signer_id: signerId,
      signing_url: signingUrl,
    });
  } catch (e) {
    return json(500, { error: "Erreur serveur YouSign", details: String(e && e.message ? e.message : e) });
  }
};

