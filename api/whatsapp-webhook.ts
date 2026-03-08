/**
 * Webhook WhatsApp (360dialog) — réception des messages.
 * Conforme à TUNNEL-ROBIN.md.
 *
 * — Réception : GET (vérification webhook) et POST (messages entrants).
 * — Types gérés : 'text' et 'image'.
 * — OCR des cartes d'embarquement : Gemini 1.5 Flash via visionService (extractBoardingPassFromImage).
 * — Discussion naturelle : Gemini 1.5 Flash via geminiService (answerInTunnel).
 * — Tunnel : handleTunnelMessage (sessionManager + robin.db).
 *
 * Variables : WHATSAPP_API_KEY, WHATSAPP_360DIALOG_API_KEY, GEMINI_API_KEY.
 */

import { handleTunnelMessage } from '../src/webhook/whatsapp-webhook';

const D360_BASE = 'https://waba-v2.360dialog.io';

function normalizeTo(waId: string): string {
  const s = String(waId ?? '').replace(/\D/g, '');
  if (s.startsWith('0')) return '33' + s.slice(1);
  if (s.length <= 9 && !s.startsWith('33')) return '33' + s;
  return s;
}

async function sendWhatsAppText(to: string, text: string, apiKey: string): Promise<boolean> {
  const url = `${D360_BASE}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'D360-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: String(to).replace(/\D/g, ''),
      type: 'text',
      text: { body: text.slice(0, 4096) },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('whatsapp-webhook: send error', res.status, data);
    return false;
  }
  return true;
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
    if (mode === 'subscribe' && token === apiKey && challenge) {
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!d360Key) {
    console.error('whatsapp-webhook: WHATSAPP_360DIALOG_API_KEY manquant');
    return new Response(JSON.stringify({ error: 'Configuration manquante' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: {
    entry?: Array<{
      changes?: Array<{
        field?: string;
        value?: {
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

  const entries = body.entry || [];
  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field !== 'messages') continue;
      const value = change.value || {};
      const messages = value.messages || [];
      for (const msg of messages) {
        const fromId = msg.from ?? '';
        const to = normalizeTo(fromId);
        if (!to) continue;

        const msgType = msg.type || 'text';
        const text = (msg.text?.body ?? '').trim();
        let imageBase64: string | null = null;
        let imageMimeType = 'image/jpeg';

        // Image : téléchargement puis OCR par Gemini 1.5 Flash (visionService) dans handleTunnelMessage
        if (msgType === 'image') {
          const img = await getImageBase64FromMessage(msg, d360Key);
          if (img) {
            imageBase64 = img.base64;
            imageMimeType = img.mimeType;
          }
        }

        try {
          // handleTunnelMessage utilise Gemini 1.5 Flash pour l'OCR (carte d'embarquement) et la discussion (TUNNEL-ROBIN.md)
          const result = await handleTunnelMessage({
            phoneNumber: fromId,
            messageText: text || undefined,
            imageBase64: imageBase64 ?? undefined,
            imageMimeType,
          });
          await sendWhatsAppText(to, result.reply, d360Key);
        } catch (err) {
          console.error('whatsapp-webhook: processing error', (err as Error).message, (err as Error).stack);
          await sendWhatsAppText(
            to,
            'Désolé, un problème technique est survenu. Réessayez dans un instant ou contactez-nous : https://wa.me/33756863630',
            d360Key
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
