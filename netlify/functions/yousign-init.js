/**
 * yousign-init
 * Initialise une demande de signature YouSign pour un dossier Robin des Airs.
 *
 * Variables d'environnement attendues:
 * - YOUSIGN_API_KEY  (obligatoire — clé API Yousign)
 * - YOUSIGN_BASE_URL (optionnel — défaut production v3 ; en sandbox :
 *                    https://api-sandbox.yousign.app/v3)
 *
 * Body POST attendu :
 *   {
 *     first_name, last_name, email, phone, label,
 *     pdf_base64,     // PDF du mandat encodé base64 (obligatoire)
 *     signature_page, // numéro de page de la signature (défaut : dernière)
 *     signature_x,    // coord X (défaut : 350)
 *     signature_y     // coord Y (défaut : 650)
 *   }
 */

const { checkRateLimit } = require("./lib/rate-limit");

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

  // Anti-abus du crédit YouSign (chaque init = appel API payant)
  const rl = await checkRateLimit(event, { key: "yousign-init", max: 3, windowSec: 60 });
  if (!rl.ok) return rl.response;

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

  const pdfBase64 = String(payload.pdf_base64 || "").trim();
  if (!pdfBase64) return json(400, { error: "pdf_base64 requis (PDF du mandat encodé base64)" });

  let pdfBuffer;
  try {
    pdfBuffer = Buffer.from(pdfBase64, "base64");
    if (pdfBuffer.length < 1000) throw new Error("PDF trop petit (< 1 Ko)");
    if (pdfBuffer.length > 10 * 1024 * 1024) throw new Error("PDF trop volumineux (> 10 Mo)");
  } catch (e) {
    return json(400, { error: "PDF base64 invalide", details: String(e.message || e) });
  }

  const sigPage = Number.isFinite(+payload.signature_page) ? +payload.signature_page : 1;
  const sigX = Number.isFinite(+payload.signature_x) ? +payload.signature_x : 350;
  const sigY = Number.isFinite(+payload.signature_y) ? +payload.signature_y : 650;

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

    // 1bis) Upload du PDF du mandat
    const docForm = new FormData();
    docForm.append("file", new Blob([pdfBuffer], { type: "application/pdf" }), "mandat-robin-des-airs.pdf");
    docForm.append("nature", "signable_document");
    docForm.append("parse_anchors", "false");

    const docRes = await fetch(`${baseUrl}/signature_requests/${signatureRequestId}/documents`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` }, // pas de Content-Type : laissé à FormData (boundary)
      body: docForm,
    });

    if (!docRes.ok) {
      const errTxt = await docRes.text();
      return json(502, {
        error: "Echec upload document YouSign",
        signature_request_id: signatureRequestId,
        details: errTxt.slice(0, 600),
      });
    }
    const docJson = await docRes.json();
    const documentId = docJson.id;
    if (!documentId) return json(502, { error: "ID document YouSign absent", signature_request_id: signatureRequestId });

    // 2) Créer un signataire
    // Origin de retour configurable : MANDAT_BASE_URL (sandbox/prod) ou fallback robindesairs.eu
    const returnOrigin = (process.env.MANDAT_BASE_URL || "https://robindesairs.eu").replace(/\/+$/, "");
    const successUrl = `${returnOrigin}/mandat.html?signed=1&ref=${encodeURIComponent(signatureRequestId)}`;
    const cancelUrl = `${returnOrigin}/mandat.html?cancelled=1&ref=${encodeURIComponent(signatureRequestId)}`;

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
        redirect_urls: {
          success: successUrl,
          cancel: cancelUrl,
          error: cancelUrl,
        },
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

    // 2bis) Placer la zone de signature sur le PDF
    const fieldRes = await fetch(`${baseUrl}/signature_requests/${signatureRequestId}/documents/${documentId}/fields`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "signature",
        signer_id: signerId,
        page: sigPage,
        x: sigX,
        y: sigY,
        width: 200,
        height: 60,
      }),
    });

    if (!fieldRes.ok) {
      const errTxt = await fieldRes.text();
      return json(502, {
        error: "Echec placement champ signature YouSign",
        signature_request_id: signatureRequestId,
        document_id: documentId,
        signer_id: signerId,
        details: errTxt.slice(0, 600),
      });
    }

    // 2ter) Activer la signature_request (sinon reste en draft → signing_link KO)
    const activateRes = await fetch(`${baseUrl}/signature_requests/${signatureRequestId}/activate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!activateRes.ok) {
      const errTxt = await activateRes.text();
      return json(502, {
        error: "Echec activation signature_request YouSign",
        signature_request_id: signatureRequestId,
        details: errTxt.slice(0, 600),
      });
    }

    // 3) Récupérer le signature_link via GET sur le signer (Yousign v3 ne l'expose
    //    qu'après activation, dans le payload du signer — pas via /signing_links)
    const linkRes = await fetch(`${baseUrl}/signature_requests/${signatureRequestId}/signers/${signerId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!linkRes.ok) {
      const errTxt = await linkRes.text();
      return json(502, {
        error: "Echec lecture signer YouSign (post-activation)",
        signature_request_id: signatureRequestId,
        signer_id: signerId,
        details: errTxt.slice(0, 600),
      });
    }
    const linkJson = await linkRes.json();
    const signingUrl = linkJson?.signature_link || linkJson?.url || linkJson?.link;
    if (!signingUrl) {
      return json(502, {
        error: "signature_link YouSign absent du payload signer",
        signature_request_id: signatureRequestId,
        signer_id: signerId,
        signer_keys: Object.keys(linkJson || {}),
      });
    }

    return json(200, {
      ok: true,
      provider: "yousign",
      signature_request_id: signatureRequestId,
      document_id: documentId,
      signer_id: signerId,
      signing_url: signingUrl,
    });
  } catch (e) {
    return json(500, { error: "Erreur serveur YouSign", details: String(e && e.message ? e.message : e) });
  }
};

