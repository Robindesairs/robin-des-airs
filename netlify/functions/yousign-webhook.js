/**
 * yousign-webhook
 * Reçoit les events Yousign en POST :
 *  - signature_request.done       → tous les signataires ont signé → archive PDF + audit trail
 *  - signature_request.declined   → un signataire a refusé
 *  - signature_request.expired    → délai dépassé
 *  - signer.signed                → 1 signataire a signé (multi-signer progress)
 *
 * Vérifie l'authenticité via HMAC-SHA256 du body (X-Yousign-Signature-256).
 *
 * Variables d'env :
 *  - YOUSIGN_API_KEY         (pour télécharger les docs signés)
 *  - YOUSIGN_BASE_URL        (sandbox ou prod)
 *  - YOUSIGN_WEBHOOK_SECRET  (secret HMAC à coller depuis dashboard Yousign)
 *
 * Stockage Blobs (store: robin-signatures) :
 *  - yousign/{sr_id}/event-{event_id}.json   → event Yousign brut
 *  - yousign/{sr_id}/signed.pdf              → PDF signé (base64)
 *  - yousign/{sr_id}/audit-trail.pdf         → audit trail eIDAS (base64)
 *  - yousign/{sr_id}/__meta.json             → métadonnées dossier (label, signers, dates)
 *  - __yousign_index                         → liste chronologique (max 500)
 *
 * Toujours renvoie 200 (sauf HMAC KO → 401) : Yousign retry agressivement,
 * un 500 = stockage Blobs spammé d'events dupliqués.
 */

const crypto = require("crypto");

let netlifyBlobsModule = null;
try { netlifyBlobsModule = require("@netlify/blobs"); } catch (_) {}

const STORE_NAME = "robin-signatures";

const HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function json(statusCode, body) {
  return { statusCode, headers: HEADERS, body: JSON.stringify(body) };
}

// Yousign envoie X-Yousign-Signature-256 = hex HMAC-SHA256 du body raw.
function verifyHmac(rawBody, headerSig, secret) {
  if (!secret) return { ok: false, reason: "no_secret" };
  if (!headerSig) return { ok: false, reason: "no_header" };
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  // Header peut être préfixé "sha256=" selon les fournisseurs — on tolère les 2.
  const candidate = String(headerSig).replace(/^sha256=/, "").trim();
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(candidate, "hex");
    if (a.length !== b.length) return { ok: false, reason: "len_mismatch" };
    return { ok: crypto.timingSafeEqual(a, b), reason: "compared" };
  } catch (_) {
    return { ok: false, reason: "parse_error" };
  }
}

async function getStore(event) {
  if (!netlifyBlobsModule) return null;
  if (netlifyBlobsModule.connectLambda && event) netlifyBlobsModule.connectLambda(event);
  return netlifyBlobsModule.getStore(STORE_NAME);
}

async function downloadAsBase64(url, apiKey) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) {
    const errTxt = await res.text();
    throw new Error(`download ${url} → ${res.status} ${errTxt.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return { base64: buf.toString("base64"), size: buf.length, contentType: res.headers.get("content-type") || "application/octet-stream" };
}

async function archiveSignatureRequest(srId, baseUrl, apiKey, store) {
  // 1) Liste des documents de la signature_request
  const docsRes = await fetch(`${baseUrl}/signature_requests/${srId}/documents`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!docsRes.ok) throw new Error(`liste documents → ${docsRes.status}`);
  const docs = await docsRes.json();
  const docList = Array.isArray(docs) ? docs : (docs.documents || docs.data || []);

  let signedCount = 0;
  for (const d of docList) {
    const docId = d.id;
    if (!docId) continue;
    // Yousign v3 : download du PDF signé via version=completed (ou ?signed_only=true selon doc)
    try {
      const dl = await downloadAsBase64(
        `${baseUrl}/signature_requests/${srId}/documents/${docId}/download?version=completed`,
        apiKey
      );
      await store.setJSON(`yousign/${srId}/signed-${docId}.json`, {
        document_id: docId,
        size: dl.size,
        content_type: dl.contentType,
        base64: dl.base64,
        downloaded_at: new Date().toISOString(),
      });
      signedCount++;
    } catch (e) {
      console.warn(`[yousign-webhook] download signed doc ${docId} failed:`, e.message);
    }
  }

  // 2) Audit trail eIDAS (preuve juridique) — endpoint Yousign v3
  try {
    const at = await downloadAsBase64(
      `${baseUrl}/signature_requests/${srId}/audit_trails/download`,
      apiKey
    );
    await store.setJSON(`yousign/${srId}/audit-trail.json`, {
      size: at.size,
      content_type: at.contentType,
      base64: at.base64,
      downloaded_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn(`[yousign-webhook] audit trail ${srId} failed:`, e.message);
  }

  return { signedCount, docCount: docList.length };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS, body: "" };
  if (event.httpMethod !== "POST") return json(405, { error: "Méthode non autorisée" });

  const rawBody = event.body || "";
  const hdrSig = event.headers?.["x-yousign-signature-256"]
              || event.headers?.["X-Yousign-Signature-256"]
              || event.headers?.["x-yousign-signature"]
              || "";

  const secret = process.env.YOUSIGN_WEBHOOK_SECRET || "";
  const isProd = !!secret;
  if (isProd) {
    const v = verifyHmac(rawBody, hdrSig, secret);
    if (!v.ok) {
      console.warn(`[yousign-webhook] HMAC KO: ${v.reason}`);
      return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: "Invalid HMAC", reason: v.reason }) };
    }
  } else {
    console.warn("[yousign-webhook] YOUSIGN_WEBHOOK_SECRET absent — HMAC SKIP (sandbox dev only)");
  }

  let payload = {};
  try { payload = JSON.parse(rawBody); } catch { return json(400, { error: "JSON invalide" }); }

  const eventName = payload.event_name || payload.event || "";
  const sr = payload.data?.signature_request || payload.signature_request || {};
  const srId = sr.id || payload.signature_request_id || "";
  const eventId = payload.event_id || `evt_${eventName}_${srId}`;

  if (!srId) return json(200, { ok: true, skipped: "no signature_request id" });

  const store = await getStore(event);
  if (!store) return json(200, { ok: true, skipped: "blobs unavailable" });

  // 1) Persiste l'event brut (audit, débogage, retry)
  try {
    await store.setJSON(`yousign/${srId}/event-${eventId}.json`, {
      received_at: new Date().toISOString(),
      event_name: eventName,
      payload,
    });
  } catch (e) {
    console.warn(`[yousign-webhook] persist event failed:`, e.message);
  }

  // 2) Si signature_request.done → on télécharge PDF signés + audit trail
  let archive = null;
  if (eventName === "signature_request.done") {
    const baseUrl = (process.env.YOUSIGN_BASE_URL || "https://api.yousign.app/v3").replace(/\/+$/, "");
    const apiKey = process.env.YOUSIGN_API_KEY || "";
    if (apiKey) {
      try {
        archive = await archiveSignatureRequest(srId, baseUrl, apiKey, store);
        // Index global pour browse rapide depuis bureau.html
        try {
          let index = (await store.getJSON("__yousign_index")) || [];
          index.unshift({
            sr_id: srId,
            name: sr.name || "",
            signed_at: new Date().toISOString(),
            signer_count: (sr.signers || []).length,
            docs_archived: archive.signedCount,
          });
          if (index.length > 500) index = index.slice(0, 500);
          await store.setJSON("__yousign_index", index);
        } catch (e) {
          console.warn(`[yousign-webhook] index update failed:`, e.message);
        }
      } catch (e) {
        console.error(`[yousign-webhook] archive failed for ${srId}:`, e.message);
      }
    }
  }

  return json(200, {
    ok: true,
    event_name: eventName,
    signature_request_id: srId,
    archive,
  });
};
