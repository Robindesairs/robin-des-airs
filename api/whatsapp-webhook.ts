/**
 * Webhook WhatsApp (360dialog / Meta) — réception des messages.
 * Conforme à TUNNEL-ROBIN.md.
 *
 * — Réception : GET (vérification webhook) et POST (messages entrants).
 * — Types gérés : 'text' et 'image'.
 * — OCR des cartes d'embarquement : Gemini 1.5 Flash via visionService (extractBoardingPassFromImage).
 * — Discussion naturelle : Gemini 1.5 Flash via geminiService (answerInTunnel).
 * — Tunnel : handleTunnelMessage (sessionManager + robin.db).
 *
 * Variables : WHATSAPP_API_KEY, WHATSAPP_360DIALOG_API_KEY, GEMINI_API_KEY.
 * Pour que les réponses partent via un numéro précis :
 *   WHATSAPP_PHONE_NUMBER_ID (ID du numéro WhatsApp Business)
 *   WHATSAPP_BUSINESS_ACCOUNT_ID (optionnel, filtre les entrées webhook)
 * Si envoi via Meta Cloud API : WHATSAPP_ACCESS_TOKEN (les réponses partent via ce Phone Number ID).
 * Sinon envoi via 360dialog (D360-API-KEY). Lien contact erreur : WHATSAPP_CONTACT_NUMBER (ex. 15557840392 pour wa.me).
 */

import { handleTunnelMessage } from '../src/webhook/whatsapp-webhook';

const D360_BASE = 'https://waba-v2.360dialog.io';
const META_GRAPH_BASE = 'https://graph.facebook.com/v18.0';

function normalizeTo(waId: string): string {
  const s = String(waId ?? '').replace(/\D/g, '');
  if (s.startsWith('0')) return '33' + s.slice(1);
  if (s.length <= 9 && !s.startsWith('33')) return '33' + s;
  return s;
}

function getSendConfig(): {
  provider: 'meta' | '360dialog';
  phoneNumberId?: string;
  accessToken?: string;
  d360Key?: string;
} {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const d360Key = process.env.WHATSAPP_360DIALOG_API_KEY;
  if (phoneNumberId && accessToken) {
    return { provider: 'meta', phoneNumberId, accessToken };
  }
  return { provider: '360dialog', d360Key: d360Key || undefined };
}

/** Envoie un message texte. Utilise WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN (Meta) si définis, sinon 360dialog. */
async function sendWhatsAppText(to: string, text: string): Promise<boolean> {
  const config = getSendConfig();
  const toClean = String(to).replace(/\D/g, '');
  if (!toClean || toClean.length < 8) {
    console.error('whatsapp-webhook: send skipped, to invalid', to);
    return false;
  }
  const payload = {
    messaging_product: 'whatsapp' as const,
    recipient_type: 'individual' as const,
    to: toClean,
    type: 'text' as const,
    text: { body: text.slice(0, 4096) },
  };

  if (config.provider === 'meta' && config.phoneNumberId && config.accessToken) {
    const url = `${META_GRAPH_BASE}/${config.phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('whatsapp-webhook: send error (Meta)', res.status, data);
      return false;
    }
    return true;
  }

  if (config.d360Key) {
    const res = await fetch(`${D360_BASE}/messages`, {
      method: 'POST',
      headers: { 'D360-API-KEY': config.d360Key, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('whatsapp-webhook: send error (360dialog)', res.status, data);
      return false;
    }
    return true;
  }

  console.error('whatsapp-webhook: no send config (WHATSAPP_360DIALOG_API_KEY or WHATSAPP_PHONE_NUMBER_ID+WHATSAPP_ACCESS_TOKEN)');
  return false;
}

async function getImageBase64FromMessage(
  msg: { type?: string; image?: { id?: string; url?: string; mime_type?: string } },
  d360Key: string
): Promise<{ base64: string; mimeType: string } | null> {
  if (msg.type !== 'image' || !msg.image) return null;
  const id = msg.image.id;
  const url = msg.image.url;
  const mimeType = msg.image.mime_type || 'image/jpeg';

  if (url) {
    try {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const base64 = Buffer.from(buf).toString('base64');
      return { base64, mimeType };
    } catch (e) {
      console.error('getImageBase64 fetch url', (e as Error).message);
      return null;
    }
  }
  if (id) {
    const mediaUrl = `${D360_BASE}/media/${id}`;
    try {
      const res = await fetch(mediaUrl, { headers: { 'D360-API-KEY': d360Key } });
      const json = (await res.json().catch(() => ({}))) as { url?: string; link?: string };
      const u = json.url || json.link;
      if (u) {
        const r2 = await fetch(u);
        const buf = await r2.arrayBuffer();
        const base64 = Buffer.from(buf).toString('base64');
        return { base64, mimeType };
      }
    } catch (e) {
      console.error('getImageBase64 media id', (e as Error).message);
    }
  }
  return null;
}

/**
 * Handler HTTP : GET (vérification webhook) ou POST (messages entrants).
 */
export async function whatsappWebhookHandler(request: Request): Promise<Response> {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const d360Key = process.env.WHATSAPP_360DIALOG_API_KEY;

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const mode = url.searchParams.get('hub.mode') || url.searchParams.get('hub_mode');
    const token = url.searchParams.get('hub.verify_token') || url.searchParams.get('hub_verify_token');
    const challenge = url.searchParams.get('hub.challenge') || url.searchParams.get('hub_challenge');
    const tokenOk = !apiKey || token === apiKey;
    if (mode === 'subscribe' && tokenOk && challenge) {
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    if (mode === 'subscribe' && apiKey && token != null && token !== '' && token !== apiKey) {
      return new Response('Forbidden', { status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    const base = (process.env.URL || `${url.protocol}//${url.host}`).replace(/\/$/, '');
    return new Response(
      JSON.stringify({
        ok: true,
        service: 'Robin des Airs — WhatsApp webhook',
        message:
          "Cette URL reçoit les événements WhatsApp en POST. L'ouvrir dans un navigateur ne fait qu'afficher cette page : le webhook fonctionne.",
        verification:
          "Meta envoie un GET avec hub.mode=subscribe, hub.verify_token (= WHATSAPP_API_KEY) et hub.challenge pour valider l'abonnement.",
        status_url: `${base}/api/whatsapp-status`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sendConfig = getSendConfig();
  const canSend = sendConfig.provider === 'meta' || (sendConfig.provider === '360dialog' && sendConfig.d360Key);
  if (!canSend) {
    console.error('whatsapp-webhook: configuration manquante (WHATSAPP_360DIALOG_API_KEY ou WHATSAPP_PHONE_NUMBER_ID+WHATSAPP_ACCESS_TOKEN)');
    return new Response(JSON.stringify({ error: 'Configuration manquante' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const phoneNumberIdFilter = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const businessAccountIdFilter = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const contactNumber = process.env.WHATSAPP_CONTACT_NUMBER || '';
  const contactLink = contactNumber ? ` https://wa.me/${contactNumber.replace(/\D/g, '')}` : '';

  let body: {
    entry?: Array<{
      id?: string;
      changes?: Array<{
        field?: string;
        value?: {
          metadata?: { phone_number_id?: string };
          messages?: Array<{
            from?: string;
            id?: string;
            type?: string;
            text?: { body?: string };
            image?: { id?: string; url?: string; mime_type?: string };
          }>;
        };
      }>;
    }>;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const d360KeyForMedia = process.env.WHATSAPP_360DIALOG_API_KEY;

  const entries = body.entry || [];
  for (const entry of entries) {
    if (businessAccountIdFilter && entry.id && entry.id !== businessAccountIdFilter) continue;

    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field !== 'messages') continue;
      const value = change.value || {};
      if (phoneNumberIdFilter && value.metadata?.phone_number_id && value.metadata.phone_number_id !== phoneNumberIdFilter) continue;

      const messages = value.messages || [];
      for (const msg of messages) {
        const fromId = msg.from ?? '';
        const to = normalizeTo(fromId);
        if (!to) continue;

        const msgType = msg.type || 'text';
        const text = (msg.text?.body ?? '').trim();
        let imageBase64: string | null = null;
        let imageMimeType = 'image/jpeg';

        if (msgType === 'image') {
          const img = await getImageBase64FromMessage(msg, d360KeyForMedia || '');
          if (img) {
            imageBase64 = img.base64;
            imageMimeType = img.mimeType;
          }
        }

        try {
          const result = await handleTunnelMessage({
            phoneNumber: fromId,
            messageText: text || undefined,
            imageBase64: imageBase64 ?? undefined,
            imageMimeType,
          });
          await sendWhatsAppText(to, result.reply);
        } catch (err) {
          console.error('whatsapp-webhook: processing error', (err as Error).message, (err as Error).stack);
          await sendWhatsAppText(
            to,
            `Désolé, un problème technique est survenu. Réessayez dans un instant ou contactez-nous.${contactLink}`.trim()
          );
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Export par défaut pour Vercel / Netlify (handler Request → Response). */
export default whatsappWebhookHandler;
