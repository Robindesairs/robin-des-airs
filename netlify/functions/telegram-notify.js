/**
 * Envoie une notification Telegram : un seul message qui empile tous les vols critiques.
 * Variables Netlify : TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 * POST body : { flights: [...], secret?: "…" } — secret = un des secrets internes Netlify.
 */

const { verifyInternalSecret, publicCorsHeaders } = require('./lib/internal-auth');

function formatOneFlight(f, index) {
  const flight = f.flight || '—';
  const dep = f.dep || '—';
  const arr = f.arr || '—';
  const cancelled = !!f.cancelled;
  const delayMinutes = f.delayMinutes != null ? f.delayMinutes : 0;
  const airline = f.airline || '—';
  const scheduledDep = f.scheduledDeparture || '—';
  const scheduledArr = f.scheduledArrival || '—';
  const statusFr = f.statusFr || '—';
  const num = index != null ? index + 1 + ') ' : '';
  const problem = cancelled ? '❌ Annulé' : `⏱ Retard : ${delayMinutes} min`;
  return [
    `${num}✈️ ${flight} (${airline}) — ${dep} → ${arr}`,
    `   ${problem} | Départ ${scheduledDep} | Arrivée ${scheduledArr}`,
    `   Statut : ${statusFr}`
  ].join('\n');
}

exports.handler = async (event) => {
  const headers = publicCorsHeaders({ 'Cache-Control': 'no-store' });

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const auth = verifyInternalSecret(event, payload);
  if (!auth.ok) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error }) };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  let chatId = process.env.TELEGRAM_CHAT_ID;

  if (payload.chat_id != null) chatId = String(payload.chat_id);
  if (!token || !chatId) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: false, reason: 'Telegram non configuré (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)' })
    };
  }

  const list = Array.isArray(payload.flights) && payload.flights.length > 0
    ? payload.flights
    : (payload.flight != null || payload.dep != null ? [payload] : []);

  if (list.length === 0) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: false, reason: 'Aucun vol' }) };
  }

  const title = list.length === 1
    ? (list[0].cancelled ? '🚨 VOL ANNULÉ' : '🔴 VOL CRITIQUE (retard ≥ 2h30)')
    : `🔴 ${list.length} VOLS CRITIQUES`;
  const blocks = list.map((f, i) => formatOneFlight(f, i));
  const text = [title, '', blocks.join('\n\n'), '', '🏹 Robin des Airs — Radar Elite'].join('\n');

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true
      })
    });
    const data = await res.json();
    if (!data.ok) {
      console.error('Telegram sendMessage error:', data);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: false, error: data.description })
      };
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    console.error('telegram-notify err:', err);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
