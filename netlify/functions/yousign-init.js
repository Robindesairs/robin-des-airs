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

  // Position par défaut : PAGE 1 en haut à droite → le client ouvre le lien
  // et voit "Signer ici" direct, pas besoin de scroller le contrat.
  const sigPage = Number.isFinite(+payload.signature_page) ? +payload.signature_page : 1;
  const sigX = Number.isFinite(+payload.signature_x) ? +payload.signature_x : 380;
  const sigY = Number.isFinite(+payload.signature_y) ? +payload.signature_y : 120;

  // Multi-signataires : payload.signers = [{first_name, last_name, email, phone}, ...]
  // Si absent, fallback sur le signataire unique des champs first_name/last_name/email/phone.
  const signers = Array.isArray(payload.signers) && payload.signers.length > 0
    ? payload.signers.filter(s => s && s.email).map(s => ({
        first_name: String(s.first_name || "").trim() || "Client",
        last_name: String(s.last_name || "").trim() || "Robin",
        email: String(s.email || "").trim(),
        phone: normalizePhone(s.phone || ""),
      }))
    : [{ first_name: firstName, last_name: lastName, email, phone }];

  if (signers.length === 0) return json(400, { error: "Aucun signataire valide (email requis)" });
  if (signers.length > 6) return json(400, { error: "Maximum 6 signataires par dossier" });

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

    // 2) Créer N signataires (1 par adulte) + placer 1 zone signature par signataire
    // Origin de retour configurable : MANDAT_BASE_URL (sandbox/prod) ou fallback robindesairs.eu
    const returnOrigin = (process.env.MANDAT_BASE_URL || "https://robindesairs.eu").replace(/\/+$/, "");

    // Yousign trial/sandbox refuse redirect_urls : "subscription.status_not_compatible".
    // On les ajoute uniquement si pas en sandbox (override possible via YOUSIGN_FORCE_REDIRECTS=1).
    const isSandbox = /sandbox/i.test(baseUrl);
    const forceRedirects = process.env.YOUSIGN_FORCE_REDIRECTS === "1";
    const allowRedirects = !isSandbox || forceRedirects;

    const createdSigners = [];

    for (let i = 0; i < signers.length; i++) {
      const s = signers[i];

      // 2a) Créer le signataire
      const successUrl = `${returnOrigin}/mandat.html?signed=1&ref=${encodeURIComponent(signatureRequestId)}&signer=${i + 1}&total=${signers.length}`;

      // Niveau et mode d'auth configurables via env (fallback no_otp si pas de phone)
      // Défaut prod : AES + OTP SMS (eIDAS art. 26, charge inversée vs compagnie).
      // Sandbox / désactivable via YOUSIGN_SIGNATURE_LEVEL=electronic_signature
      //                          + YOUSIGN_AUTH_MODE=no_otp.
      const envLevel = process.env.YOUSIGN_SIGNATURE_LEVEL || "advanced_electronic_signature";
      const envAuthMode = process.env.YOUSIGN_AUTH_MODE || "otp_sms";
      // Fallback no_otp si on demande otp_sms mais qu'on n'a pas de numéro de tel
      // → évite l'erreur "phone_number required" pour un signataire sans tel
      const useOtpSms = envAuthMode === "otp_sms" && !!s.phone;
      const authMode = useOtpSms ? "otp_sms" : (envAuthMode === "otp_sms" ? "no_otp" : envAuthMode);
      const sigLevel = useOtpSms ? envLevel : "electronic_signature";

      const signerBody = {
        info: {
          first_name: s.first_name,
          last_name: s.last_name,
          email: s.email,
          phone_number: s.phone || undefined,
          locale: "fr",
        },
        signature_level: sigLevel,
        signature_authentication_mode: authMode,
      };
      if (allowRedirects) {
        signerBody.redirect_urls = { success: successUrl };
      }

      const signerRes = await fetch(`${baseUrl}/signature_requests/${signatureRequestId}/signers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(signerBody),
      });
      if (!signerRes.ok) {
        const errTxt = await signerRes.text();
        return json(502, {
          error: `Echec creation signer ${i + 1}/${signers.length} YouSign`,
          signature_request_id: signatureRequestId,
          signer_email: s.email,
          details: errTxt.slice(0, 600),
        });
      }
      const signerJson = await signerRes.json();
      const signerId = signerJson.id;
      if (!signerId) return json(502, { error: `ID signer ${i + 1} YouSign absent`, signature_request_id: signatureRequestId });

      // 2b) Placer la zone signature : signataires empilés verticalement (80 px d'écart)
      // pour qu'ils ne se chevauchent pas sur le PDF. Page 1 par défaut.
      const fieldY = sigY + i * 80;

      // Label statique "Signature de Prénom Nom" — 18 px au-dessus de la zone
      // pour que le PDF montre visuellement qui signe où, même avant signature.
      // Si l'API Yousign refuse le type "text" pour cette config, on log juste
      // un warning et on continue (la zone signature elle-même est obligatoire).
      try {
        const labelRes = await fetch(`${baseUrl}/signature_requests/${signatureRequestId}/documents/${documentId}/fields`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "text",
            page: sigPage,
            x: sigX,
            y: Math.max(20, fieldY - 18),
            width: 220,
            height: 14,
            content: `Signature de ${s.first_name} ${s.last_name}`.trim(),
          }),
        });
        if (!labelRes.ok) {
          const errTxt = await labelRes.text();
          console.warn(`[yousign-init] label text signer ${i + 1} ignored:`, errTxt.slice(0, 200));
        }
      } catch (e) {
        console.warn(`[yousign-init] label text signer ${i + 1} error:`, e.message);
      }

      const fieldRes = await fetch(`${baseUrl}/signature_requests/${signatureRequestId}/documents/${documentId}/fields`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "signature",
          signer_id: signerId,
          page: sigPage,
          x: sigX,
          y: fieldY,
          width: 200,
          height: 60,
        }),
      });
      if (!fieldRes.ok) {
        const errTxt = await fieldRes.text();
        return json(502, {
          error: `Echec placement champ signature ${i + 1} YouSign`,
          signature_request_id: signatureRequestId,
          signer_id: signerId,
          details: errTxt.slice(0, 600),
        });
      }

      createdSigners.push({
        index: i + 1,
        signer_id: signerId,
        first_name: s.first_name,
        last_name: s.last_name,
        email: s.email,
      });
    }

    // signerId pour rétro-compatibilité (premier signataire = principal)
    const signerId = createdSigners[0].signer_id;

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

    // 3) Récupérer le signature_link de chaque signataire via GET signer
    //    (Yousign v3 ne l'expose qu'après activation, dans le payload du signer)
    for (const sg of createdSigners) {
      const linkRes = await fetch(`${baseUrl}/signature_requests/${signatureRequestId}/signers/${sg.signer_id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!linkRes.ok) {
        const errTxt = await linkRes.text();
        return json(502, {
          error: `Echec lecture signer ${sg.index} YouSign (post-activation)`,
          signature_request_id: signatureRequestId,
          signer_id: sg.signer_id,
          details: errTxt.slice(0, 600),
        });
      }
      const linkJson = await linkRes.json();
      sg.signing_url = linkJson?.signature_link || linkJson?.url || linkJson?.link || "";
      if (!sg.signing_url) {
        return json(502, {
          error: `signature_link absent pour signataire ${sg.index}`,
          signature_request_id: signatureRequestId,
          signer_id: sg.signer_id,
          signer_keys: Object.keys(linkJson || {}),
        });
      }
    }

    const signingUrl = createdSigners[0].signing_url; // 1er signataire = principal

    return json(200, {
      ok: true,
      provider: "yousign",
      signature_request_id: signatureRequestId,
      document_id: documentId,
      // Rétro-compat champs principaux (1er signataire)
      signer_id: signerId,
      signing_url: signingUrl,
      // Nouveau : tableau complet des signataires + URLs
      signers: createdSigners,
    });
  } catch (e) {
    return json(500, { error: "Erreur serveur YouSign", details: String(e && e.message ? e.message : e) });
  }
};

