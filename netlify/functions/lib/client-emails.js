/**
 * client-emails.js — Templates e-mail CLIENT « grande marque » (logo hibou, navy #0B1F3A, vert).
 *
 * 🔴 LANGAGE CESSION obligatoire (jamais mandataire) : Robin des Airs a RACHETÉ la créance et
 * agit EN SON NOM PROPRE. Mots INTERDITS : « commission », « en votre nom », « votre réclamation »,
 * « délai légal », « votre part ». On dit : « nous récupérons », « vous recevez votre argent ».
 *
 * Chaque type renvoie { subject, html, text }. Données passées via `d` :
 *   { prenom, ref, vol, compagnie, montant }  (montant = ce que le client RECEVRA, en euros)
 *
 * Envoi : via Resend (voir crm-email.js). Expéditeur = MANDAT_EMAIL_FROM.
 */

const LOGO = 'https://robindesairs.eu/favicon.png';
const WA = 'https://wa.me/33756863630';
const TRUSTPILOT = 'https://fr.trustpilot.com/evaluate/robindesairs.eu';
const PARRAINAGE = 'https://robindesairs.eu/parrainage';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));
}

function eur(n) {
  const v = Number(n);
  if (!isFinite(v) || v <= 0) return '';
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}

function suiviUrl(ref) {
  return `https://robindesairs.eu/suivi-dossier.html?r=${encodeURIComponent(ref || '')}`;
}

/** Coquille commune : en-tête hibou, corps, pied. `bodyHtml` = lignes <tr>. */
function shell(bodyHtml) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef1f4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f4;padding:24px 12px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 1px 3px rgba(11,31,58,.06),0 12px 40px rgba(11,31,58,.07);">
  <tr><td style="background:#0B1F3A;padding:15px 26px;" valign="middle">
    <img src="${LOGO}" width="30" height="30" alt="" style="vertical-align:middle;border-radius:7px;">
    <span style="vertical-align:middle;font-size:16px;font-weight:800;color:#ffffff;padding-left:9px;">Robin des Airs</span>
  </td></tr>
  ${bodyHtml}
  <tr><td style="padding:16px 28px 6px;">
    <div style="font-size:12px;color:#8a94a6;line-height:1.6;">Une question&nbsp;? <a href="mailto:expert@robindesairs.eu" style="color:#047857;">expert@robindesairs.eu</a> · <a href="${WA}" style="color:#047857;">WhatsApp</a></div>
  </td></tr>
  <tr><td style="background:#0B1F3A;padding:15px 28px;" align="center"><div style="font-size:12px;color:#9fb0c4;">Robin des Airs — On prend aux compagnies, on rend aux familles.</div></td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function btn(href, label) {
  return `<tr><td style="padding:6px 28px 18px;"><a href="${href}" style="display:inline-block;background:#047857;color:#ffffff;font-size:14.5px;font-weight:800;text-decoration:none;padding:13px 26px;border-radius:11px;">${esc(label)}&nbsp;→</a></td></tr>`;
}

function h1(txt) {
  return `<tr><td style="padding:22px 28px 2px;"><div style="font-size:21px;font-weight:800;color:#0B1F3A;letter-spacing:-.3px;">${esc(txt)}</div></td></tr>`;
}

function p(html) {
  return `<tr><td style="padding:8px 28px;"><div style="font-size:14.5px;color:#3a4658;line-height:1.6;">${html}</div></td></tr>`;
}

/* ─────────────────────────── Templates ─────────────────────────── */

/** Réclamation partie + notification de cession à la compagnie. */
function reclamation(d) {
  const cie = esc(d.compagnie || 'la compagnie');
  const vol = d.vol ? ` (vol ${esc(d.vol)})` : '';
  const body =
    h1('La réclamation est partie') +
    p(`Bonjour ${esc(d.prenom || '')},`) +
    p(`Ça y est : nous avons officiellement réclamé l'indemnité que <strong>${cie}</strong> vous doit${vol}. À partir de maintenant, <strong>c'est nous qui nous en occupons de bout en bout</strong>, et ${cie} sait que c'est à nous qu'elle doit répondre.`) +
    p(`Vous n'avez <strong>rien à faire ni à avancer</strong>. La compagnie dispose d'un temps raisonnable pour se positionner ; si elle traîne ou refuse, on relance, puis on va au juge s'il le faut. On vous tient informé à chaque étape.`) +
    btn(suiviUrl(d.ref), 'Suivre mon dossier');
  return {
    subject: `Votre dossier ${d.ref} — la réclamation est partie`,
    html: shell(body),
    text: `Bonjour ${d.prenom || ''}, nous avons officiellement réclamé l'indemnité que ${d.compagnie || 'la compagnie'} vous doit. On s'occupe de tout, vous n'avancez rien. Suivi : ${suiviUrl(d.ref)}`,
  };
}

/** Argent récupéré, on verse le client (issue amiable). + invitation avis Trustpilot. */
function paye(d) {
  const montant = eur(d.montant);
  const ligneMontant = montant
    ? p(`On a récupéré votre indemnité, et <strong>vous recevez ${montant}</strong> sur votre compte. On vous confirme le virement dès qu'il part.`)
    : p(`On a récupéré votre indemnité, et <strong>votre argent arrive sur votre compte</strong>. On vous confirme le virement dès qu'il part.`);
  const body =
    `<tr><td style="padding:26px 28px 0;text-align:center;"><div style="font-size:34px;line-height:1;">🎉</div></td></tr>` +
    h1('Votre argent est en route') +
    p(`Bonjour ${esc(d.prenom || '')},`) +
    ligneMontant +
    p(`Une dernière chose, si vous avez deux minutes : un petit avis nous aide énormément à faire connaître Robin des Airs auprès d'autres familles qui n'osent pas réclamer.`) +
    btn(TRUSTPILOT, 'Laisser un avis') +
    `<tr><td style="padding:2px 28px 6px;"><div style="border-top:1px solid #edf0f4;"></div></td></tr>` +
    `<tr><td style="padding:14px 28px 4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B1F3A;border-radius:14px;"><tr><td style="padding:16px 18px;">
        <div style="font-size:20px;line-height:1;">🎫</div>
        <div style="font-size:15px;font-weight:800;color:#ffffff;margin:7px 0 4px;">Un proche a aussi galéré avec un vol&nbsp;?</div>
        <div style="font-size:13px;color:#c3d0e0;line-height:1.55;">Recommandez-le. Pour chaque proche dont on gagne le dossier, vous recevez un <strong style="color:#00E5A0;">accès salon lounge VIP</strong> en aéroport, valable 1 an.</div>
        <a href="${PARRAINAGE}" style="display:inline-block;margin-top:12px;background:#ffffff;color:#0B1F3A;font-size:13.5px;font-weight:800;text-decoration:none;padding:11px 22px;border-radius:10px;">Parrainer un proche&nbsp;→</a>
      </td></tr></table>
    </td></tr>`;
  return {
    subject: `${d.ref} — votre argent est en route`,
    html: shell(body),
    text: `Bonjour ${d.prenom || ''}, on a récupéré votre indemnité${montant ? `, vous recevez ${montant}` : ''}. Un avis nous aiderait : ${TRUSTPILOT}`,
  };
}

const TEMPLATES = {
  reclamation,
  paye,
};

/** Construit un e-mail. `type` ∈ Object.keys(TEMPLATES). Renvoie {subject,html,text} ou null. */
function buildClientEmail(type, d) {
  const fn = TEMPLATES[type];
  if (!fn) return null;
  return fn(d || {});
}

module.exports = { buildClientEmail, TEMPLATES: Object.keys(TEMPLATES) };
