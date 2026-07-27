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
const { getBlobStore } = require("./lib/netlify-blobs-store");
// Acte de cession (2e document signable de l'enveloppe) — activé par YOUSIGN_SIGN_ACTE=1 uniquement.
let genererActeCessionPdf = null;
try { ({ genererActeCessionPdf } = require("./lib/acte-cession-pdf")); } catch (_) {}

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "https://robindesairs.eu",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

function json(statusCode, body) {
  return { statusCode, headers: HEADERS, body: JSON.stringify(body) };
}

/**
 * Normalise vers un E.164 STRICT (`+` puis 8 à 15 chiffres, premier chiffre 1-9), ou "" si impossible.
 *
 * ⚠️ L'ancienne version préfixait bêtement « + » : « 0756863630 » → « +0756863630 », invalide (E.164
 * interdit le 0 initial). Yousign REJETTE le signataire sur un numéro mal formé → signature impossible.
 * C'est CE bug qui a rendu l'OTP SMS inutilisable et forcé le repli en SES sans authentification :
 * la faiblesse probatoire de la chaîne de signature venait d'un bug de formatage, pas d'un arbitrage.
 *
 * Renvoyer "" plutôt qu'un numéro douteux est volontaire : l'appelant retombe alors proprement en
 * no_otp au lieu de casser toute la demande de signature.
 *
 * DEFAULT_PHONE_CC : indicatif présumé pour un numéro national commençant par 0 (France par défaut ;
 * le formulaire du mandat fournit normalement déjà l'indicatif, ce n'est qu'un filet).
 */
function normalizePhone(raw) {
  let s = String(raw || "").replace(/[^\d+]/g, "");
  if (!s) return "";
  if (s.startsWith("00")) s = "+" + s.slice(2);           // 0033… → +33…
  else if (!s.startsWith("+") && /^0\d{6,}$/.test(s)) {   // national 0X… → +<cc>X…
    const cc = String(process.env.DEFAULT_PHONE_CC || "33").replace(/\D/g, "") || "33";
    s = "+" + cc + s.slice(1);
  } else if (!s.startsWith("+")) s = "+" + s;             // déjà international sans +
  s = "+" + s.slice(1).replace(/\D/g, "");                // un seul + en tête
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : "";            // E.164 strict, sinon rien
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
  // SES + livraison WhatsApp : l'email n'est plus obligatoire. Yousign exige un email dans la fiche signataire,
  // mais avec delivery_mode "none" rien n'y est envoyé → si le signataire n'a pas d'email, placeholder technique.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // ⚠️ Le placeholder ne doit JAMAIS être sur robindesairs.eu : le dossier de preuve Yousign afficherait
  // alors, comme adresse du SIGNATAIRE, une adresse contrôlée par le CESSIONNAIRE. Un adversaire en tire
  // l'apparence que Robin des Airs a signé à la place du passager — argument dévastateur en SES, où la
  // charge de prouver la fiabilité du procédé pèse déjà sur nous (art. 1367 al. 2 C. civ.).
  // `.invalid` est un TLD réservé et non routable (RFC 2606) : aucune ambiguïté sur la propriété, et rien
  // n'y est envoyé de toute façon (delivery_mode "none"). Surchargeable via YOUSIGN_PLACEHOLDER_DOMAIN
  // si Yousign venait à refuser ce TLD.
  const PLACEHOLDER_DOMAIN = String(process.env.YOUSIGN_PLACEHOLDER_DOMAIN || "non-fourni.invalid").trim();
  const techEmail = (ph, idx) => `signataire-${idx}-${String(ph || "").replace(/\D/g, "") || "x"}@${PLACEHOLDER_DOMAIN}`;

  const dossierLabel = String(payload.label || "Dossier Robin des Airs").trim();
  const dossierRef = String(payload.ref || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);

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

  // Nombre de pages du PDF (pdf-lib) → on place la signature sur la DERNIÈRE page,
  // APRÈS le contrat : le signataire lit tout le document, puis signe (aligné sur le
  // message « prenez le temps de le relire, puis signez »). Fallback page 1 si échec.
  let pageCount = 1;
  try {
    const { PDFDocument } = require("pdf-lib");
    const doc = await PDFDocument.load(pdfBuffer, { updateMetadata: false });
    pageCount = doc.getPageCount() || 1;
  } catch (e) {
    console.warn("[yousign-init] comptage de pages échoué, fallback page 1:", e.message);
  }

  // Position de la zone signature. Défaut : DERNIÈRE page (signature_page='last' ou absent).
  // Un numéro explicite reste possible (borné au nombre de pages réel).
  const rawSigPage = payload.signature_page;
  const wantsLast = rawSigPage === undefined || rawSigPage === null
    || String(rawSigPage).toLowerCase() === "last"
    || !Number.isFinite(+rawSigPage);
  const sigPage = wantsLast ? pageCount : Math.max(1, Math.min(+rawSigPage, pageCount));
  // sigX borné pour que le bloc (label le plus large = sigX+400) tienne dans une page A4 (~596 pt).
  const sigX = Number.isFinite(+payload.signature_x) ? +payload.signature_x : 150;

  // Mode TEST sandbox : en sandbox, Yousign EXIGE que l'email du signataire appartienne à l'orga
  // (les vrais emails clients / placeholders techniques sont refusés à l'activation). Si
  // YOUSIGN_SANDBOX_EMAIL est défini ET qu'on est en sandbox, on force l'email de tous les
  // signataires vers cet email d'orga → l'activation passe, on peut tester tout le parcours.
  // En PROD (base non-sandbox), ce bloc est inerte : les vrais emails clients sont utilisés.
  const _isSandbox = /sandbox/i.test(baseUrl);
  const sandboxSignerEmail = (_isSandbox && process.env.YOUSIGN_SANDBOX_EMAIL)
    ? String(process.env.YOUSIGN_SANDBOX_EMAIL).trim() : "";

  // Multi-signataires : payload.signers = [{first_name, last_name, email, phone}, ...]
  // Si absent, fallback sur le signataire unique. Email optionnel (SES) : placeholder technique si absent.
  const rawSigners = Array.isArray(payload.signers) && payload.signers.length > 0
    ? payload.signers
    : [{ first_name: firstName, last_name: lastName, email, phone }];
  const signers = rawSigners.map((s, idx) => {
    const ph = normalizePhone(s.phone || "");
    const em = String(s.email || "").trim();
    return {
      first_name: String(s.first_name || "").trim() || "Client",
      last_name: String(s.last_name || "").trim() || "Robin",
      email: sandboxSignerEmail || (EMAIL_RE.test(em) ? em : techEmail(ph, idx)),
      phone: ph,
    };
  });

  if (signers.length === 0) return json(400, { error: "Aucun signataire" });
  if (signers.length > 6) return json(400, { error: "Maximum 6 signataires par dossier" });

  // sigY : placer le(s) bloc(s) signature EN BAS de la dernière page (le client signe après avoir tout lu).
  // On empile vers le HAUT selon le nombre de signataires pour que le dernier finisse près du bas (~780 pt
  // sur une A4 de 842) sans déborder. 1 signataire → ~640 ; borné à 60 mini pour rester dans la page.
  const sigY = Number.isFinite(+payload.signature_y)
    ? +payload.signature_y
    : Math.max(60, 640 - (signers.length - 1) * 160);

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

    // Lien sr_id → réf du dossier : permet au webhook Yousign (signature terminée) de retrouver LE
    // dossier pour basculer son statut en « Contrat signé » et classer le PDF signé par réf. Best-effort.
    if (dossierRef) {
      try {
        const sigStore = getBlobStore(event, "robin-signatures");
        if (sigStore) await sigStore.setJSON(`map/${signatureRequestId}`, { ref: dossierRef, createdAt: new Date().toISOString() });
      } catch (e) { console.warn("[yousign-init] map sr_id→ref échec:", e.message); }
    }

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
      // Retour post-signature : par défaut l'écran succès mandat.html (flux redirection historique, inchangé).
      // En mode EMBARQUÉ (iframe sur robindesairs.eu, payload.embed) : on renvoie vers signe-ok.html, qui
      // « casse » l'iframe et prévient la page parente (signer.html) → signataire suivant / écran final, sur le site.
      const embedSrc = String(payload.embed_src || payload.source || "").replace(/[^a-z0-9\-]/gi, "");
      const successUrl = payload.embed
        ? `${returnOrigin}/signe-ok.html?ref=${encodeURIComponent(signatureRequestId)}&signer=${i + 1}&total=${signers.length}${embedSrc ? "&src=" + encodeURIComponent(embedSrc) : ""}`
        : `${returnOrigin}/mandat.html?signed=1&ref=${encodeURIComponent(signatureRequestId)}&signer=${i + 1}&total=${signers.length}`;

      // Niveau et mode d'auth configurables via env.
      // Défaut : SES (signature simple) + no_otp — décision fondateur 04/07 : signature simple, pas de code SMS,
      // lien livré par WhatsApp (delivery_mode "none"), aligné sur le standard concurrents (AirHelp/Flightright).
      // Pour repasser en AES + OTP SMS (art. 26) : YOUSIGN_SIGNATURE_LEVEL=advanced_electronic_signature + YOUSIGN_AUTH_MODE=otp_sms.
      const envLevel = process.env.YOUSIGN_SIGNATURE_LEVEL || "electronic_signature";
      const envAuthMode = process.env.YOUSIGN_AUTH_MODE || "no_otp";
      // Fallback no_otp si on demande otp_sms mais qu'on n'a pas de numéro de tel
      // → évite l'erreur "phone_number required" pour un signataire sans tel
      const useOtpSms = envAuthMode === "otp_sms" && !!s.phone;
      const authMode = useOtpSms ? "otp_sms" : (envAuthMode === "otp_sms" ? "no_otp" : envAuthMode);
      const sigLevel = useOtpSms ? envLevel : "electronic_signature";
      // Le repli otp_sms → no_otp dégrade la valeur probatoire (plus aucun facteur de possession) :
      // il doit être VISIBLE. Avant, il était totalement silencieux : on croyait signer en AES+OTP
      // alors que tout le parc retombait en SES sans authentification à cause d'un numéro mal formé.
      if (envAuthMode === "otp_sms" && !useOtpSms) {
        console.warn(`[yousign-init] ⚠️ OTP SMS demandé mais numéro E.164 absent/invalide pour le signataire ${i + 1} → repli SES sans authentification (valeur probatoire dégradée). Vérifier le numéro collecté.`);
      }

      const signerBody = {
        info: {
          first_name: s.first_name,
          last_name: s.last_name,
          email: s.email,
          // ⚠️ N'envoyer le numéro QUE si l'OTP SMS l'exige : en SES sans OTP (défaut prod),
          // Yousign valide quand même le format E.164 et REJETTE tout le signataire si le numéro
          // est local/mal formaté (ex. « 0756… » → « +0756… » invalide) → signature impossible.
          // Le SMS n'étant pas utilisé, on omet simplement le numéro → signature robuste.
          phone_number: useOtpSms ? s.phone : undefined,
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

      // 2b) Placer le bloc complet de chaque signataire :
      // [3 cases à cocher (2 obligatoires + 1 optionnelle)]
      // [label "Signature de Prénom Nom"]
      // [zone signature 200x60]
      // Chaque bloc = 160 pt de haut pile, signataires empilés sur la page.
      // ⚠️ Syntaxe Yousign v3 validée empiriquement (07/07) : checkbox = `size` (PAS width/height),
      // texte statique = type `mention` + attr `mention` + signer_id (PAS type text + content).
      // L'ancienne syntaxe était REJETÉE silencieusement → contrats signés sans aucune case.
      // Espacement 26 pt : les mentions font 24 pt de haut (auto) → 18 pt les faisait se chevaucher.
      const blockTop = sigY + i * 160;
      const cb1Y = blockTop;
      const cb2Y = blockTop + 26;
      const cb3Y = blockTop + 52;
      const labelY = blockTop + 73;
      const fieldY = blockTop + 100;

      // Helper pour poster un field, avec catch silencieux pour les optionnels
      async function postField(body, label) {
        try {
          const r = await fetch(`${baseUrl}/signature_requests/${signatureRequestId}/documents/${documentId}/fields`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!r.ok) {
            const errTxt = await r.text();
            console.warn(`[yousign-init] field ${label} signer ${i + 1} ignored:`, errTxt.slice(0, 200));
            return false;
          }
          return true;
        } catch (e) {
          console.warn(`[yousign-init] field ${label} signer ${i + 1} error:`, e.message);
          return false;
        }
      }

      // Cases 1/2/3 : libellés VOLONTAIREMENT courts et renvoyants ("ci-dessus") — le contrat
      // imprimé (déclaration + case de consentement) porte déjà le détail complet (taux, CGV,
      // sur l'honneur...). Ne PAS y remettre les chiffres/texte en entier : ça créerait un doublon
      // de contenu avec des formulations différentes sur la même page, source de confusion.
      // Chaque case est liée à signer_id : l'attribution ("qui a coché quoi") est correcte même si
      // le texte imprimé plus bas utilise une formulation générique ("Chaque signataire").
      // Case 1 — OBLIGATOIRE : lecture acceptation mandat
      // ⚠️ BLOQUANT : les 2 cases de consentement obligatoires portent l'acceptation du contrat
      // (cession + déclaration sur l'honneur). Sans elles, le PDF signé sort sans consentement
      // matérialisé — c'est l'échec silencieux qui a produit des contrats sans cases (07/07).
      const cb1ok = await postField({
        type: "checkbox",
        signer_id: signerId,
        page: sigPage,
        x: sigX,
        y: cb1Y,
        size: 14,
        optional: false,
        name: `lu_accepte_${i + 1}`,
      }, "checkbox lu_accepte");
      if (!cb1ok) {
        return json(502, { error: `Echec creation case obligatoire lu_accepte (signataire ${i + 1})`, signature_request_id: signatureRequestId });
      }
      await postField({
        type: "mention",
        signer_id: signerId,
        page: sigPage,
        x: sigX + 20,
        y: cb1Y - 3,
        mention: "Je confirme accepter ce contrat de cession et les CGV (voir conditions ci-dessus)",
      }, "label lu_accepte");

      // Case 2 — OBLIGATOIRE : autorisation reversement compte (bloquante, comme la case 1)
      const cb2ok = await postField({
        type: "checkbox",
        signer_id: signerId,
        page: sigPage,
        x: sigX,
        y: cb2Y,
        size: 14,
        optional: false,
        name: `declaration_honneur_${i + 1}`,
      }, "checkbox declaration honneur");
      if (!cb2ok) {
        return json(502, { error: `Echec creation case obligatoire declaration_honneur (signataire ${i + 1})`, signature_request_id: signatureRequestId });
      }
      await postField({
        type: "mention",
        signer_id: signerId,
        page: sigPage,
        x: sigX + 20,
        y: cb2Y - 3,
        mention: "Je confirme ma déclaration sur l'honneur (ci-dessus)",
      }, "label declaration honneur");

      // Case 3 — OPTIONNELLE : renonciation droit de rétractation 14j
      await postField({
        type: "checkbox",
        signer_id: signerId,
        page: sigPage,
        x: sigX,
        y: cb3Y,
        size: 14,
        optional: true,
        name: `demarrage_immediat_${i + 1}`,
      }, "checkbox demarrage immediat");
      await postField({
        type: "mention",
        signer_id: signerId,
        page: sigPage,
        x: sigX + 20,
        y: cb3Y - 3,
        mention: "(Facultatif) Je demande le demarrage immediat, sans attendre les 14 j (L.221-25)",
      }, "label demarrage immediat");

      // Label "Signature de Prénom Nom"
      await postField({
        type: "mention",
        signer_id: signerId,
        page: sigPage,
        x: sigX,
        y: labelY,
        mention: `Signature de ${s.first_name} ${s.last_name}`.trim(),
      }, "label signature");

      // Zone signature (obligatoire — bloquante si échoue)
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

    // 2quater) DEUXIÈME DOCUMENT SIGNABLE : l'acte de cession (notification au débiteur, art. 1324).
    // Objectif : la signature certifiée figure sur les DEUX documents (contrat + acte), sous le même
    // sceau + piste d'audit Yousign. Le webhook archive déjà tous les documents de l'enveloppe.
    // 🔒 Activé UNIQUEMENT si YOUSIGN_SIGN_ACTE=1 (défaut OFF = comportement historique, contrat seul).
    // Best-effort intégral : toute erreur ici est journalisée et n'interrompt PAS la signature du contrat.
    let acteDocId = null;
    if (process.env.YOUSIGN_SIGN_ACTE === "1" && genererActeCessionPdf && dossierRef) {
      try {
        const mandats = getBlobStore(event, "mandats");
        const dossier = (mandats && (await mandats.get("m/" + dossierRef, { type: "json" }))) || {};
        const acte = await genererActeCessionPdf({
          presign: true,
          ref: dossierRef,
          showAddress: true,
          passengers: Array.isArray(dossier.passengers) && dossier.passengers.length
            ? dossier.passengers.map((p) => ({
                name: p.name || "",
                dob: p.dob || "",
                birth: p.birth || p.lieuNaissance || "",
                minor: !!p.minor,
                legalRepName: p.legalRepName || "",
                adresse: p.adresse || p.address || "",
              }))
            : [{ name: dossier.name || "", adresse: dossier.address || "" }],
          name: dossier.name || "",
          airline: dossier.compagnie || dossier.airline || "",
          flightNum: dossier.vol || dossier.flightNum || "",
          flightDate: dossier.date || dossier.flightDate || "",
          pnr: dossier.pnr || "",
          depAirport: dossier.depAirport || "",
          arrAirport: dossier.arrAirport || "",
          route: dossier.route || "",
          incident: dossier.incident || "",
        });
        const acteBuf = acte && acte.buffer;
        const acteZones = (acte && acte.sigZones) || [];
        if (acteBuf && acteBuf.length > 500 && acteZones.length) {
          // Upload de l'acte comme 2e document signable.
          const acteForm = new FormData();
          acteForm.append("file", new Blob([acteBuf], { type: "application/pdf" }), "acte-cession-robin-des-airs.pdf");
          acteForm.append("nature", "signable_document");
          acteForm.append("parse_anchors", "false");
          const acteRes = await fetch(`${baseUrl}/signature_requests/${signatureRequestId}/documents`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: acteForm,
          });
          if (acteRes.ok) {
            const acteJson = await acteRes.json();
            acteDocId = acteJson.id || null;
            // Persiste l'id du doc acte dans la map → le webhook classe la version signée sous pdf-acte/<ref>.
            if (acteDocId && dossierRef) {
              try {
                const sigStore2 = getBlobStore(event, "robin-signatures");
                if (sigStore2) await sigStore2.setJSON(`map/${signatureRequestId}`, { ref: dossierRef, acteDocId, createdAt: new Date().toISOString() });
              } catch (e) { console.warn("[yousign-init] map acteDocId échec:", e.message); }
            }
          } else {
            console.warn("[yousign-init] upload acte (2e doc) ignoré:", (await acteRes.text()).slice(0, 200));
          }
          // Une zone signature par cédant adulte, aux coordonnées EXACTES rapportées par le générateur.
          // Appariement par index : createdSigners (adultes, dans l'ordre) ↔ acteZones (adultes, même ordre).
          if (acteDocId) {
            const nZones = Math.min(createdSigners.length, acteZones.length);
            for (let z = 0; z < nZones; z++) {
              const zone = acteZones[z];
              const sg = createdSigners[z];
              await fetch(`${baseUrl}/signature_requests/${signatureRequestId}/documents/${acteDocId}/fields`, {
                method: "POST",
                headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "signature",
                  signer_id: sg.signer_id,
                  page: zone.page,
                  x: zone.x,
                  y: zone.y,
                  width: zone.w,
                  height: zone.h,
                }),
              }).then((r) => { if (!r || !r.ok) console.warn(`[yousign-init] champ signature acte signataire ${z + 1} ignoré`); })
                .catch((e) => console.warn(`[yousign-init] champ signature acte signataire ${z + 1} erreur:`, e.message));
            }
          }
        }
      } catch (e) {
        console.warn("[yousign-init] acte de cession (2e doc) échoué, on garde le contrat seul:", e.message);
        acteDocId = null;
      }
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
      // Acte de cession signé dans la même enveloppe (null si YOUSIGN_SIGN_ACTE≠1 ou échec best-effort)
      acte_document_id: acteDocId,
    });
  } catch (e) {
    return json(500, { error: "Erreur serveur YouSign", details: String(e && e.message ? e.message : e) });
  }
};

