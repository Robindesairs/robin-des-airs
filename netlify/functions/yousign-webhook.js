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
const { airtableCfg, airtableFindByRef, airtablePatch } = require("./lib/airtable-robin");
// Alerte WhatsApp propriétaire à CHAQUE contrat signé (best-effort, inerte si CALLMEBOT_* absent en env).
let sendCallMeBot = null;
try { ({ sendCallMeBot } = require("./lib/callmebot")); } catch (_) {}

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

async function archiveSignatureRequest(srId, baseUrl, apiKey, store, ref, acteDocId) {
  // 1) Liste des documents de la signature_request
  const docsRes = await fetch(`${baseUrl}/signature_requests/${srId}/documents`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!docsRes.ok) throw new Error(`liste documents → ${docsRes.status}`);
  const docs = await docsRes.json();
  const docList = Array.isArray(docs) ? docs : (docs.documents || docs.data || []);

  let signedCount = 0;
  let pdfSaved = false;
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
      // Classe l'ACTE de cession signé sous pdf-acte/<ref> (2e document de l'enveloppe, si présent).
      // Identifié par acteDocId (posé par yousign-init dans la map) → robuste quel que soit l'ordre renvoyé.
      if (ref && acteDocId && docId === acteDocId) {
        try {
          await store.set(`pdf-acte/${ref}`, Buffer.from(dl.base64, "base64"), {
            metadata: { contentType: "application/pdf", ref, srId, signedAt: new Date().toISOString(), kind: "acte-cession" },
          });
        } catch (e) { console.warn(`[yousign-webhook] pdf-acte/${ref} write failed:`, e.message); }
      }
      // Classe le CONTRAT signé PAR RÉF (pdf/<ref>) → source de vérité is-signed + affichage dans le dossier.
      // On saute l'acte pour ne pas écraser le contrat par l'acte (le contrat est le 1er doc non-acte).
      else if (ref && !pdfSaved) {
        try {
          await store.set(`pdf/${ref}`, Buffer.from(dl.base64, "base64"), {
            metadata: { contentType: "application/pdf", ref, srId, signedAt: new Date().toISOString() },
          });
          pdfSaved = true;
        } catch (e) { console.warn(`[yousign-webhook] pdf/${ref} write failed:`, e.message); }
      }
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

  // 2) Si signature_request.done → relie la signature AU dossier (statut + PDF par réf) + archive PDF/audit trail.
  let archive = null;
  let dossierRef = "";
  if (eventName === "signature_request.done") {
    // Réf du dossier (posée par yousign-init dans map/<sr_id>) → on sait QUEL dossier mettre à jour.
    let acteDocId = "";
    try { const m = await store.get(`map/${srId}`, { type: "json" }); dossierRef = (m && m.ref) || ""; acteDocId = (m && m.acteDocId) || ""; } catch (_) {}
    const baseUrl = (process.env.YOUSIGN_BASE_URL || "https://api.yousign.app/v3").replace(/\/+$/, "");
    const apiKey = process.env.YOUSIGN_API_KEY || "";
    if (apiKey) {
      try {
        archive = await archiveSignatureRequest(srId, baseUrl, apiKey, store, dossierRef, acteDocId);
        // Index global pour browse rapide depuis bureau.html
        try {
          let index = (await store.get("__yousign_index", { type: "json" })) || [];
          index.unshift({
            sr_id: srId,
            ref: dossierRef,
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
    // Relie la signature au DOSSIER : marqueur signed/<ref> (source de vérité is-signed) + bascule
    // du statut Airtable en « Contrat signé » → le dossier quitte « Signature en attente ».
    if (dossierRef) {
      // Fire-once : si signed/<ref> existe déjà, le client a déjà été confirmé (les retries Yousign ne re-notifient pas).
      let alreadyNotified = false;
      try { const prev = await store.get(`signed/${dossierRef}`, { type: "json" }); alreadyNotified = !!(prev && prev.signedAt); } catch (_) {}
      try { await store.setJSON(`signed/${dossierRef}`, { srId, signedAt: new Date().toISOString() }); } catch (_) {}
      // 🔔 Alerte WhatsApp propriétaire à CHAQUE nouveau contrat signé — fire-once (les retries Yousign ne re-notifient pas).
      // Inerte si CALLMEBOT_PHONE/CALLMEBOT_APIKEY absents en env. Ne bloque JAMAIS le webhook (best-effort).
      if (!alreadyNotified && sendCallMeBot) {
        try {
          const who = sr.name || ("dossier " + dossierRef);
          await sendCallMeBot("🏹 ✅ Nouveau contrat SIGNÉ\n" + who + "\nRéf : " + dossierRef);
        } catch (e) { console.warn(`[yousign-webhook] alerte CallMeBot KO:`, e.message); }
      }
      try {
        let idx = (await store.get("__index", { type: "json" })) || [];
        if (Array.isArray(idx) && !idx.some((e) => e && e.ref === dossierRef)) {
          idx.unshift({ ref: dossierRef, srId, signedAt: new Date().toISOString() });
          if (idx.length > 1000) idx = idx.slice(0, 1000);
          await store.setJSON("__index", idx);
        }
      } catch (_) {}
      try {
        const cfg = airtableCfg();
        if (cfg) {
          const recs = await airtableFindByRef(cfg, dossierRef);
          const rec = recs && recs[0];
          if (rec && rec.id) {
            const patch = { [cfg.labels.statutSuivi]: cfg.statutMandatSigne };
            // Signal MED / rétractation 14 j : le Cédant n'a PAS demandé l'exécution immédiate (case
            // facultative art. L.221-25 non cochée) → NE PAS envoyer la mise en demeure avant J+14.
            // On l'écrit UNE fois (à la 1re signature) dans les Remarques, sans écraser l'existant.
            if (!alreadyNotified && cfg.labels.remarques) {
              try {
                let startNow = false;
                try { const mg = await store.get(`medgate/${dossierRef}`, { type: "json" }); startNow = !!(mg && mg.startNow); } catch (_) {}
                const medIso = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
                const medFr = medIso.split("-").reverse().join("/");
                const note = startNow
                  ? "✅ Démarrage immédiat demandé (art. L.221-25) — mise en demeure possible sans attendre."
                  : `⏳ NE PAS ENVOYER LA MISE EN DEMEURE AVANT LE ${medFr} — démarrage immédiat NON demandé (délai de rétractation 14 j).`;
                const rem = cfg.labels.remarques;
                const cur = (rec.fields && rec.fields[rem]) ? String(rec.fields[rem]).trim() : "";
                patch[rem] = cur ? `${cur}\n${note}` : note;
              } catch (_) {}
            }
            await airtablePatch(cfg, rec.id, patch);
          }
        }
      } catch (e) { console.warn(`[yousign-webhook] statut Airtable → Contrat signé échec:`, e.message); }

      // Confirmation CLIENT par WhatsApp : le bot (/api/mandat-signed) envoie « 🎉 C'est signé, merci de
      // votre confiance… » + préférence de versement, STOPPE les relances, arme le rappel pièces et alerte
      // pour un rappel dans la langue africaine. UNE seule fois (alreadyNotified + garde payoutAskedAt côté bot).
      if (!alreadyNotified) {
        try {
          const botUrl = (process.env.MANDAT_SIGNED_WEBHOOK_URL || "https://robin-bot-v8-production.up.railway.app/api/mandat-signed").trim();
          // Le bot /api/mandat-signed valide UNIQUEMENT WATI_WEBHOOK_SECRET → on l'envoie en priorité
          // (MANDAT_SIGNED_WEBHOOK_SECRET = repli legacy, cf. leads-a-rappeler.js / lead-action.js).
          const botSecret = (process.env.WATI_WEBHOOK_SECRET || process.env.MANDAT_SIGNED_WEBHOOK_SECRET || "").trim();
          if (botUrl && botSecret) {
            let phone = "";
            try {
              const mandats = netlifyBlobsModule && netlifyBlobsModule.getStore("mandats");
              const dj = mandats && (await mandats.get("m/" + dossierRef, { type: "json" }));
              phone = (dj && dj.phone) || "";
            } catch (_) {}
            await fetch(botUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ref: dossierRef, phone, secret: botSecret }),
            });
          } else {
            console.warn("[yousign-webhook] confirmation client WhatsApp SKIP : MANDAT_SIGNED_WEBHOOK_URL/secret absent");
          }
        } catch (e) { console.warn(`[yousign-webhook] notif client signé (WhatsApp) échec:`, e.message); }
      }
    }
  }

  return json(200, {
    ok: true,
    event_name: eventName,
    signature_request_id: srId,
    ref: dossierRef || undefined,
    archive,
  });
};
