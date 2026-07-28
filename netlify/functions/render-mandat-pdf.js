/**
 * render-mandat-pdf
 * Rend mandat.html (avec params URL personnalisés) en PDF A4 via Chromium headless.
 *
 * POST /api/render-mandat-pdf
 * Body JSON:
 *   {
 *     n: "Dupont",        // nom
 *     v: "AF1234",        // n° vol
 *     d: "2026-06-30",    // date du vol
 *     r: "CDG-DKR",       // route
 *     pnr: "ABC123",      // PNR
 *     c: "Air France",    // compagnie
 *     email: "client@..", // email du Cédant
 *     phone: "+221...",   // téléphone WhatsApp
 *     indemnite: "600",   // montant indemnité
 *     dob: "1980-01-15",  // date de naissance
 *     birth: "Dakar",     // lieu de naissance
 *     // ...tout param accepté par mandat.html via querystring
 *   }
 *
 * Retour:
 *   { ok: true, pdf_base64: "JVBERi0...", size: 123456, pages: 4 }
 *
 * Consommé par yousign-init.js (chaîne signature complète) ou directement
 * pour téléchargement d'un exemplaire vierge.
 *
 * Variables d'environnement :
 *   MANDAT_BASE_URL  (optionnel — défaut https://robindesairs.eu)
 */

// @sparticuz/chromium ET puppeteer-core sont des ES Modules → import() dynamique
// (dans le handler async). require() classique uniquement pour les libs CJS.
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

// CSS injecté avant le rendu PDF : masque les éléments interactifs
// (boutons, canvas signature vierge, barres, écran succès) sans toucher au contenu juridique.
const PRINT_CSS = `
  .topbar, .progress-wrap, .trust-bar, .sig-clear, .sig-ph,
  #btnSub, #btnAddPax, .ferr, #successScreen, #checkErr, #coPassErr, #sigErr,
  .btn-submit, .toast, .floating-help { display: none !important; }
  #mandatForm { display: block !important; }
  .page { max-width: 100%; padding: 0; margin: 0; box-shadow: none !important; }
  body { background: white !important; }
  input, textarea, select {
    border: none !important;
    border-bottom: 1px solid #888 !important;
    background: transparent !important;
    min-height: 1.4em;
    box-shadow: none !important;
  }
  .single-check { pointer-events: none; }
  .single-check input { display: inline-block !important; width: 14px; height: 14px; }
  /* Forcer les SVG/icônes à rester nets en print */
  svg { max-width: 100%; height: auto; }
`;

function buildMandatUrl(baseUrl, params) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === "") continue;
    qs.set(key, String(value));
  }
  const sep = baseUrl.includes("?") ? "&" : "?";
  // Page rendue : contrat.html (l'ACTE DE CESSION) et non plus mandat.html (le contrat long).
  // Le parcours signe desormais l'acte ; l'apercu doit montrer LE MEME document, sinon le
  // client lit un texte et en signe un autre. Bascule par RDA_RENDER_PAGE si besoin.
  const page = String(process.env.RDA_RENDER_PAGE || "contrat.html").replace(/[^a-z0-9.\-]/gi, "");
  return `${baseUrl}/${page}${qs.toString() ? sep + qs.toString() : ""}`;
}

let genererActeCessionPdf = null;
try { ({ genererActeCessionPdf } = require("./lib/acte-cession-pdf")); } catch (_) {}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS, body: "" };
  if (event.httpMethod !== "POST") return json(405, { error: "Méthode non autorisée" });

  // Anti-abus : rendre 5 PDF max par minute par IP (CPU/RAM lourd)
  const rl = await checkRateLimit(event, { key: "render-mandat-pdf", max: 5, windowSec: 60 });
  if (!rl.ok) return rl.response;

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Corps JSON invalide" });
  }

  // ── Chemin PRINCIPAL : le MÊME générateur que la signature.
  //
  // L'aperçu et le document signé doivent être le même fichier, produit par le même code.
  // Tant qu'ils venaient de deux sources (Chromium rendant contrat.html d'un côté,
  // genererActeCessionPdf de l'autre), ils divergeaient en silence : le client lisait une
  // version d'une seule langue et signait une version bilingue à deux colonnes.
  //
  // Effet de bord bienvenu : plus de Chromium dans le parcours client, donc un aperçu
  // quasi instantané et un point de panne en moins.
  if (genererActeCessionPdf && process.env.RDA_RENDER_PAGE !== "html") {
    try {
      const nomComplet = [payload.fn, payload.n].filter(Boolean).join(" ").trim()
        || payload.name || "";
      const adresse = payload.adresse || payload.address || "";
      const out = await genererActeCessionPdf({
        presign: true,
        ref: String(payload.r || payload.ref || "").slice(0, 64),
        showAddress: true,
        passengers: Array.isArray(payload.passengers) && payload.passengers.length
          ? payload.passengers
          : [{ name: nomComplet, adresse }],
        name: nomComplet,
        airline: payload.compagnie || payload.airline || "",
        flightNum: payload.vol || payload.flightNum || "",
        flightDate: payload.date || payload.flightDate || "",
        pnr: payload.pnr || "",
        depAirport: payload.dep || payload.depAirport || "",
        arrAirport: payload.arr || payload.arrAirport || "",
        route: payload.route || "",
        incident: payload.incident || "",
      });
      const buf = out && out.buffer ? out.buffer : out;
      if (buf && buf.length > 1000) {
        return json(200, { ok: true, pdf_base64: Buffer.from(buf).toString("base64") });
      }
      console.warn("[render-mandat-pdf] acte vide, repli sur le rendu HTML");
    } catch (e) {
      // Repli silencieux sur Chromium : mieux vaut un aperçu que pas d'aperçu.
      console.error("[render-mandat-pdf] generateur acte KO, repli HTML:", e.message);
    }
  }

  const baseUrl = (process.env.MANDAT_BASE_URL || "https://robindesairs.eu").replace(/\/+$/, "");
  const mandatUrl = buildMandatUrl(baseUrl, payload);

  let browser = null;
  try {
    const chromiumMod = await import("@sparticuz/chromium");
    const chromium = chromiumMod.default || chromiumMod;
    const puppeteerMod = await import("puppeteer-core");
    const puppeteer = puppeteerMod.default || puppeteerMod;
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 1800 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Anti-fuite : bloquer les requêtes vers WATI/Airtable/etc. (le PDF n'a pas besoin du backend)
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      if (/wati\.io|airtable\.com|googletagmanager|google-analytics|facebook|connect\.facebook/i.test(url)) {
        return req.abort();
      }
      req.continue();
    });

    const response = await page.goto(mandatUrl, {
      waitUntil: "networkidle2",
      timeout: 20000,
    });

    if (!response || !response.ok()) {
      return json(502, {
        error: "Echec navigation vers la page de l'acte",
        url: mandatUrl,
        status: response ? response.status() : "no_response",
      });
    }

    await page.emulateMediaType("print");
    await page.addStyleTag({ content: PRINT_CSS });

    // Laisser le temps aux scripts inline (i18n, autofill via params, SVG drapeaux) de se stabiliser
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // page.pdf() en puppeteer-core v25 retourne Uint8Array, pas Buffer.
    // Buffer.from() pour avoir un vrai Buffer Node → toString("base64") OK.
    const pdfUint8 = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "14mm", right: "12mm", bottom: "16mm", left: "12mm" },
      preferCSSPageSize: false,
    });
    const pdfBuffer = Buffer.from(pdfUint8);
    const pdfBase64 = pdfBuffer.toString("base64");

    return json(200, {
      ok: true,
      pdf_base64: pdfBase64,
      size: pdfBuffer.length,
      url_rendered: mandatUrl,
    });
  } catch (e) {
    return json(500, {
      error: "Erreur Puppeteer render-mandat-pdf",
      details: String(e && e.message ? e.message : e).slice(0, 600),
    });
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
};
