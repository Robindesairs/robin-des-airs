/**
 * CallMeBot — notifications WhatsApp gratuites.
 *
 * ACTIVATION (1 fois par numéro) :
 *   1. Enregistrer +34 644 59 73 84 dans vos contacts WhatsApp.
 *   2. Envoyer : "I allow callmebot to send me messages"
 *   3. Recevoir votre APIKEY par WhatsApp.
 *
 * Variables Netlify à configurer :
 *   CALLMEBOT_PHONE   = numéro sans + ni 00  (ex : 33612345678 pour +33 6 12 34 56 78)
 *   CALLMEBOT_APIKEY  = clé reçue à l'étape 3
 */

/**
 * Envoie un message WhatsApp via CallMeBot.
 * @param {string} message  Texte brut (max ~1500 chars).
 * @returns {{ ok: boolean, status?: number, error?: string }}
 */
async function sendCallMeBot(message) {
  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;

  if (!phone || !apikey) {
    console.warn('[callmebot] CALLMEBOT_PHONE ou CALLMEBOT_APIKEY absent — alerte ignorée');
    return { ok: false, reason: 'credentials_missing' };
  }

  const text = encodeURIComponent(message);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${text}&apikey=${apikey}`;

  try {
    const res = await fetch(url);
    const body = await res.text().catch(() => '');
    const snippet = body.slice(0, 120).replace(/\n/g, ' ');
    if (res.ok) {
      console.log(`[callmebot] ✅ ${res.status} — ${snippet}`);
    } else {
      console.warn(`[callmebot] ⚠️ ${res.status} — ${snippet}`);
    }
    return { ok: res.ok, status: res.status, body: snippet };
  } catch (e) {
    console.error('[callmebot] fetch error:', e.message);
    return { ok: false, error: e.message };
  }
}

module.exports = { sendCallMeBot };
